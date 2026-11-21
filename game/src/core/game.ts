// Rules, simulation and player actions. Pure functions over GameState, with no
// drawing, so the same code runs in the browser, in tests and in the balance
// simulator.

import { isPlaceable, jobOf, PRIMARIES, SECONDARIES, seamBetween, type Color } from "./colors";
import {
  BACKGROUNDS, VARIETY, BLEND_SHARE, BRUSH_RATE, CANVAS, CHIME_EVERY, CHIME_MULT, CONTRAST_CHIME_MULT, DISCOVER_AT,
  HANG_BONUS, HOOKS, LANDMARK_EVERY, MAX_PIECES, MILESTONES, OFFLINE, PAINT_VALUE, PIECES, SLOTS, TAP_SECONDS,
  TIN, TUBES, TUTORIAL, UPGRADES, WHEEL_SCALE, WHEELS, type Cost, type UpgradeDef, type UpgradeEffect,
} from "./data";
import { newSlot, type Composition, type Easel, type GameState } from "./state";

// ---------------------------------------------------------------------------
// Costs

const have = (s: GameState, k: string) => (k === "coins" ? s.coins : s.pigment[k as Color]);

export function canAfford(s: GameState, cost: Cost): boolean {
  return Object.entries(cost).every(([k, n]) => have(s, k) >= (n ?? 0));
}

function pay(s: GameState, cost: Cost): boolean {
  if (!canAfford(s, cost)) return false;
  for (const [k, n] of Object.entries(cost)) {
    if (k === "coins") s.coins -= n ?? 0;
    else s.pigment[k as Color] -= n ?? 0;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Upgrade bonuses

/** Total bonus of one upgrade: ranks add up, and every tenth rank doubles it. */
function upgradeTotal(s: GameState, u: UpgradeDef, per: number): number {
  const r = s.workshop[u.id] ?? 0;
  return r * per * 2 ** Math.floor(r / LANDMARK_EVERY);
}

function sumEffects(s: GameState, match: (e: UpgradeEffect) => number | null): number {
  let total = 0;
  for (const u of UPGRADES) {
    const per = match(u.effect);
    if (per !== null) total += upgradeTotal(s, u, per);
  }
  return total;
}

const rank = (s: GameState, kind: UpgradeEffect["kind"]) =>
  UPGRADES.filter((u) => u.effect.kind === kind).reduce((n, u) => n + (s.workshop[u.id] ?? 0), 0);

/** Hung paintings boost every color they contain. */
function hangBonus(s: GameState, color: Color): number {
  return s.hung.filter((h) => h.colors.includes(color)).length * HANG_BONUS;
}

// ---------------------------------------------------------------------------
// Tin

export function tinCap(s: GameState, c: Color): number {
  return TIN.base * TIN.perLevel ** s.tin[c];
}

export function tinCost(s: GameState, c: Color): Cost {
  return { coins: Math.ceil(TIN.first * TIN.growth ** s.tin[c]) };
}

export function upgradeTin(s: GameState, c: Color): boolean {
  if (!pay(s, tinCost(s, c))) return false;
  s.tin[c]++;
  return true;
}

// ---------------------------------------------------------------------------
// Ring stats

export interface RingStats {
  turn: number;
  pay: number;
  chime: number;
  rate: number;
  nextMilestone: number | null;
}

const milestonesPassed = (level: number) => MILESTONES.filter((m) => level >= m).length;

export function ringStats(s: GameState, w: number, i: number, offline = false): RingStats | null {
  const wheel = s.wheels[w];
  const slot = wheel?.slots[i];
  if (!slot || !slot.color) return null;
  const color = slot.color;
  const def = SLOTS[i];

  const speed =
    2 ** milestonesPassed(slot.level) *
    (1 + (i === 0 ? sumEffects(s, (e) => (e.kind === "slotSpeed" ? e.per : null)) : 0)) *
    (1 + sumEffects(s, (e) => (e.kind === "colorSpeed" && e.color === color ? e.per : null)));
  const headStart = Math.min(0.5, sumEffects(s, (e) => (e.kind === "headStart" ? e.per : null)));
  let turn = (def.turn / speed) * (1 - headStart);

  let payPerTurn =
    slot.level * def.yieldPerLevel *
    (1 + sumEffects(s, (e) => (e.kind === "colorYield" && e.color === color ? e.per : null)) + hangBonus(s, color)) *
    (1 + sumEffects(s, (e) => (e.kind === "allYield" ? e.per : null)));

  // Past four turns a second, extra speed is paid out as extra paint
  const FLOW = 0.25;
  if (turn < FLOW) {
    payPerTurn *= FLOW / turn;
    turn = FLOW;
  }
  if (offline) payPerTurn *= OFFLINE.efficiency;

  const contrast = [wheel.slots[i - 1], wheel.slots[i + 1]].some(
    (n) => n?.color && seamBetween(color, n.color).kind === "contrast",
  );
  const chime = (contrast ? CONTRAST_CHIME_MULT : CHIME_MULT) + sumEffects(s, (e) => (e.kind === "chime" ? e.per : null));
  const rate = (payPerTurn / turn) * (1 + (chime - 1) / CHIME_EVERY);
  const nextMilestone = MILESTONES.find((m) => m > slot.level) ?? null;
  return { turn, pay: payPerTurn, chime, rate, nextMilestone };
}

export interface SeamInfo {
  outer: number;
  color: Color;
  rate: number;
}

export function seams(s: GameState, w: number, offline = false): SeamInfo[] {
  const wheel = s.wheels[w];
  const share = BLEND_SHARE + sumEffects(s, (e) => (e.kind === "blendShare" ? e.per : null));
  const out: SeamInfo[] = [];
  for (let i = 0; i < wheel.slots.length - 1; i++) {
    const a = wheel.slots[i].color;
    const b = wheel.slots[i + 1].color;
    if (!a || !b) continue;
    const seam = seamBetween(a, b);
    if (seam.kind !== "blend") continue;
    const ra = ringStats(s, w, i, offline)!.rate;
    const rb = ringStats(s, w, i + 1, offline)!.rate;
    out.push({ outer: i, color: seam.color, rate: share * Math.min(ra, rb) * (1 + hangBonus(s, seam.color)) });
  }
  return out;
}

/** Paint per second of each color across every wheel. */
export function incomeByColor(s: GameState): Partial<Record<Color, number>> {
  const out: Partial<Record<Color, number>> = {};
  s.wheels.forEach((wheel, w) => {
    wheel.slots.forEach((slot, i) => {
      const st = ringStats(s, w, i);
      if (st && slot.color) out[slot.color] = (out[slot.color] ?? 0) + st.rate;
    });
    for (const seam of seams(s, w)) out[seam.color] = (out[seam.color] ?? 0) + seam.rate;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Simulation

export interface Payout {
  wheel: number;
  slot: number;
  color: Color;
  amount: number;
  chime: boolean;
}

/** Put paint in the tin. Whatever doesn't fit is spilled. */
function gain(s: GameState, color: Color, amount: number): void {
  s.earned[color] += amount;
  const room = Math.max(0, tinCap(s, color) - s.pigment[color]);
  const kept = Math.min(room, amount);
  s.pigment[color] += kept;
  s.stats.spilled += amount - kept;
  if (SECONDARIES.includes(color) && !s.owned.includes(color) && s.earned[color] >= DISCOVER_AT) {
    s.owned.push(color);
  }
}

export const isFull = (s: GameState, c: Color) => s.pigment[c] >= tinCap(s, c) - 1e-9;

function advance(s: GameState, w: number, i: number, seconds: number, offline: boolean, payouts?: Payout[]): void {
  const slot = s.wheels[w].slots[i];
  const st = ringStats(s, w, i, offline);
  if (!st || !slot.color) return;
  const before = slot.turns;
  const after = before + seconds / st.turn;
  const turns = Math.floor(after) - Math.floor(before);
  const chimes = Math.floor(after / CHIME_EVERY) - Math.floor(before / CHIME_EVERY);
  slot.turns = after;
  if (turns <= 0) return;
  const amount = st.pay * (turns + chimes * (st.chime - 1));
  gain(s, slot.color, amount);
  s.stats.chimes += chimes;
  if (payouts && turns <= 3) payouts.push({ wheel: w, slot: i, color: slot.color, amount, chime: chimes > 0 });
}

function step(s: GameState, seconds: number, payouts: Payout[] | undefined, offline: boolean): void {
  s.wheels.forEach((wheel, w) => {
    const flows = seams(s, w, offline);
    wheel.slots.forEach((_, i) => advance(s, w, i, seconds, offline, payouts));
    for (const f of flows) gain(s, f.color, f.rate * seconds);
  });
  pour(s, seconds);
}

/** Run the game forward. Long spans run in small steps so the easel keeps up with the wheels. */
export function tick(s: GameState, seconds: number, payouts?: Payout[], offline = false): void {
  if (seconds <= 0) return;
  const CHUNK = 5;
  let left = seconds;
  while (left > 0) {
    const dt = Math.min(CHUNK, left);
    step(s, dt, payouts, offline);
    left -= dt;
  }
  if (!offline) s.stats.playSeconds += seconds;
}

/** Paint made while the game was closed. Returns what changed. */
export function catchUp(s: GameState, now: number) {
  const away = Math.max(0, (now - s.lastSeen) / 1000);
  s.lastSeen = now;
  const cap = OFFLINE.capHours * 3600 + sumEffects(s, (e) => (e.kind === "offlineCap" ? e.perMinutes * 60 : null));
  const seconds = Math.min(away, cap);
  const result = { seconds: 0, gained: {} as Partial<Record<Color, number>>, coins: 0, paintings: 0 };
  if (seconds < 30) return result;
  const before = { ...s.pigment };
  const coins = s.coins;
  const painted = s.painted;
  tick(s, seconds, undefined, true);
  for (const c of Object.keys(before) as Color[]) {
    const d = s.pigment[c] - before[c];
    if (d > 0) result.gained[c] = d;
  }
  return { ...result, seconds, coins: s.coins - coins, paintings: s.painted - painted };
}

export function tap(s: GameState, w: number, payouts?: Payout[]): void {
  const seconds = TAP_SECONDS + sumEffects(s, (e) => (e.kind === "tap" ? e.per : null));
  s.wheels[w].slots.forEach((_, i) => advance(s, w, i, seconds, false, payouts));
  s.stats.taps++;
}

// ---------------------------------------------------------------------------
// Easel

export const background = (id: string) => BACKGROUNDS.find((b) => b.id === id)!;
export const piece = (id: string) => PIECES.find((p) => p.id === id)!;

export function brushRate(s: GameState): number {
  return BRUSH_RATE * CANVAS.paint ** rank(s, "canvas") * (1 + sumEffects(s, (e) => (e.kind === "brush" ? e.per : null)));
}

/** Build an easel from a composition. Amounts and price grow with Bigger Canvas. */
export function compose(s: GameState, comp: Composition, tutorial = -1): Easel {
  const size = rank(s, "canvas");
  const parts = [background(comp.bg), ...comp.pieces.map(piece)];
  const layers = parts.flatMap((p) => p.layers).map((l) => ({ ...l, amount: l.amount * CANVAS.paint ** size, done: 0 }));
  const paint = layers.reduce((v, l) => v + l.amount * PAINT_VALUE[jobOf(l.color)], 0);
  const colors = new Set(layers.map((l) => l.color)).size;
  const variety = (1 + VARIETY.perExtraColor * Math.max(0, colors - 1)) * (1 + VARIETY.perPiece * comp.pieces.length);
  return { comp, layers, tutorial, price: Math.ceil(paint * variety * (CANVAS.price / CANVAS.paint) ** size) };
}

export function salePrice(s: GameState, e: Easel): number {
  return Math.ceil(e.price * (1 + sumEffects(s, (x) => (x.kind === "price" ? x.per : null))));
}

export const easelDone = (e: Easel | null) => !!e && e.layers.every((l) => l.done >= l.amount - 1e-9);

/** The layer being painted, or null when finished. */
export function currentLayer(e: Easel | null) {
  return e?.layers.find((l) => l.done < l.amount - 1e-9) ?? null;
}

export function easelProgress(e: Easel | null): number {
  if (!e) return 0;
  const total = e.layers.reduce((n, l) => n + l.amount, 0);
  if (total === 0) return 1;
  return e.layers.reduce((n, l) => n + l.done, 0) / total;
}

/** Colors the player can make or has, so the composer can mark pieces they can't paint yet. */
export function canEverPaint(s: GameState, c: Color): boolean {
  return s.owned.includes(c) || s.earned[c] > 0;
}

/** Move paint from the tin into the current painting, layer by layer. */
function pour(s: GameState, seconds: number): void {
  if (!s.easel) {
    if (s.painted < TUTORIAL.length) setTutorial(s);
    else if (s.lastComp && rank(s, "apprentice") > 0) s.easel = compose(s, s.lastComp);
    if (!s.easel) return;
  }
  let budget = brushRate(s) * seconds;
  while (budget > 0) {
    const layer = currentLayer(s.easel);
    if (!layer) break;
    const take = Math.min(budget, s.pigment[layer.color], layer.amount - layer.done);
    if (take <= 0) break;
    s.pigment[layer.color] -= take;
    layer.done += take;
    budget -= take;
  }
  if (easelDone(s.easel) && rank(s, "apprentice") > 0 && s.easel.tutorial < 0) sell(s);
}

function setTutorial(s: GameState): void {
  const t = TUTORIAL[s.painted];
  if (t) s.easel = compose(s, { bg: t.bg, pieces: t.pieces, title: t.title }, s.painted);
}

/** Start the player's own painting. Replaces nothing: the easel must be empty. */
export function startPainting(s: GameState, comp: Composition): boolean {
  if (s.easel || s.painted < TUTORIAL.length) return false;
  if (!background(comp.bg) || comp.pieces.length > MAX_PIECES || comp.pieces.some((p) => !piece(p))) return false;
  s.easel = compose(s, comp);
  s.lastComp = comp;
  return true;
}

/** Choose what to paint after the current painting. Starts now if the easel is free. */
export function paintNext(s: GameState, comp: Composition): boolean {
  if (s.painted < TUTORIAL.length) return false;
  if (!background(comp.bg) || comp.pieces.length > MAX_PIECES || comp.pieces.some((p) => !piece(p))) return false;
  s.lastComp = comp;
  if (!s.easel) s.easel = compose(s, comp);
  return true;
}

/** Take the painting off the easel unfinished. The paint already used is lost. */
export function scrape(s: GameState): void {
  if (s.easel && s.easel.tutorial < 0) s.easel = null;
}

function finish(s: GameState): void {
  const e = s.easel!;
  const t = e.tutorial >= 0 ? TUTORIAL[e.tutorial] : null;
  if (t?.reward && !s.owned.includes(t.reward)) s.owned.push(t.reward);
  s.painted++;
  s.easel = null;
  if (s.painted < TUTORIAL.length) setTutorial(s);
  else if (s.lastComp && rank(s, "apprentice") > 0) s.easel = compose(s, s.lastComp);
}

export function sell(s: GameState): number {
  if (!easelDone(s.easel)) return 0;
  const price = salePrice(s, s.easel!);
  s.coins += price;
  s.stats.coinsEarned += price;
  s.stats.sold++;
  finish(s);
  return price;
}

export function hang(s: GameState): boolean {
  if (!easelDone(s.easel) || s.hung.length >= HOOKS) return false;
  const e = s.easel!;
  s.hung.push({ title: e.comp.title, colors: [...new Set(e.layers.map((l) => l.color))] });
  finish(s);
  return true;
}

export function unhang(s: GameState, index: number): void {
  s.hung.splice(index, 1);
}

// ---------------------------------------------------------------------------
// Wheels: levels, rings, colors

const wheelScale = (w: number) => WHEEL_SCALE ** w;

export function levelCost(s: GameState, w: number, i: number, count = 1): Cost | null {
  const slot = s.wheels[w]?.slots[i];
  if (!slot) return null;
  const def = SLOTS[i];
  const discount = 1 - Math.min(0.6, sumEffects(s, (e) => (e.kind === "levelDiscount" ? e.per : null)));
  const g = def.growth;
  const total = def.levelBase * wheelScale(w) * g ** slot.level * ((g ** count - 1) / (g - 1)) * discount;
  return { coins: Math.ceil(total) };
}

export function maxAffordable(s: GameState, w: number, i: number): number {
  let n = 0;
  while (n < 1000) {
    const c = levelCost(s, w, i, n + 1);
    if (!c || !canAfford(s, c)) break;
    n++;
  }
  return n;
}

export function buyLevels(s: GameState, w: number, i: number, count: number): boolean {
  if (count < 1) return false;
  const cost = levelCost(s, w, i, count);
  if (!cost || !pay(s, cost)) return false;
  s.wheels[w].slots[i].level += count;
  return true;
}

export function slotUnlockCost(s: GameState, w: number): Cost | null {
  const next = s.wheels[w].slots.length;
  if (next >= SLOTS.length) return null;
  return { coins: SLOTS[next].unlock * wheelScale(w) };
}

export function openSlot(s: GameState, w: number): boolean {
  const cost = slotUnlockCost(s, w);
  if (!cost || !pay(s, cost)) return false;
  s.wheels[w].slots.push(newSlot());
  return true;
}

/** Move a color into a ring. Free, and the ring keeps its level. */
export function place(s: GameState, w: number, i: number, color: Color | null): boolean {
  const slot = s.wheels[w]?.slots[i];
  if (!slot) return false;
  if (color && (!s.owned.includes(color) || !isPlaceable(color))) return false;
  slot.color = color;
  slot.turns = Math.floor(slot.turns);
  return true;
}

/** Primaries the art shop sells as tubes, in order. */
export function tubesForSale(s: GameState): Color[] {
  return PRIMARIES.filter((c) => !s.owned.includes(c) && TUBES[c] !== undefined);
}

export function tubeCost(c: Color): Cost | null {
  const n = TUBES[c];
  return n === undefined ? null : { coins: n };
}

export function buyTube(s: GameState, c: Color): boolean {
  const cost = tubeCost(c);
  if (!cost || s.owned.includes(c) || !pay(s, cost)) return false;
  s.owned.push(c);
  return true;
}

export function wheelUnlockCost(s: GameState): Cost | null {
  const w = WHEELS[s.wheels.length];
  return w ? { coins: w.unlock } : null;
}

export function buildWheel(s: GameState): boolean {
  const cost = wheelUnlockCost(s);
  if (!cost || !pay(s, cost)) return false;
  s.wheels.push({ slots: [newSlot()] });
  return true;
}

// ---------------------------------------------------------------------------
// Workshop

export function upgradeCost(s: GameState, u: UpgradeDef): Cost | null {
  const r = s.workshop[u.id] ?? 0;
  if (u.max !== undefined && r >= u.max) return null;
  return { coins: Math.ceil(u.first * u.growth ** r) };
}

export const upgradeVisible = (s: GameState, u: UpgradeDef) => s.painted >= (u.after ?? 1);

export function buyUpgrade(s: GameState, id: string): boolean {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || !upgradeVisible(s, u)) return false;
  const cost = upgradeCost(s, u);
  if (!cost || !pay(s, cost)) return false;
  s.workshop[id] = (s.workshop[id] ?? 0) + 1;
  return true;
}
