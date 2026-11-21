// Rules, simulation and player actions. Pure functions over GameState, with no
// drawing, so the same code runs in the browser, in tests and in the balance
// simulator.

import { isPlaceable, PRIMARIES, SECONDARIES, seamBetween, type Color } from "./colors";
import {
  BLEND_SHARE, CHIME_EVERY, CHIME_MULT, COLOR_UNLOCKS, CONTRAST_CHIME_MULT, DISCOVER_AT,
  LANDMARK_EVERY, MILESTONES, OFFLINE, PAINTINGS, SLOTS, TAP_SECONDS, UPGRADES, WHEELS,
  type Cost, type UpgradeDef, type UpgradeEffect,
} from "./data";
import { newSlot, type GameState } from "./state";

// ---------------------------------------------------------------------------
// Costs

export function canAfford(s: GameState, cost: Cost): boolean {
  return Object.entries(cost).every(([c, n]) => s.pigment[c as Color] >= (n ?? 0));
}

function pay(s: GameState, cost: Cost): boolean {
  if (!canAfford(s, cost)) return false;
  for (const [c, n] of Object.entries(cost)) s.pigment[c as Color] -= n ?? 0;
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

function paintingBonus(s: GameState, color: Color): number {
  let b = 0;
  for (const id of s.hung) {
    const p = PAINTINGS.find((x) => x.id === id);
    if (p && p.bonus.color === color) b += p.bonus.per;
  }
  return b;
}

// ---------------------------------------------------------------------------
// Ring stats

export interface RingStats {
  /** Seconds per turn */
  turn: number;
  /** Pigment paid by an ordinary turn */
  pay: number;
  /** Multiplier on every twelfth turn */
  chime: number;
  /** Average pigment per second, chimes included */
  rate: number;
  /** Next milestone level, or null when past the last */
  nextMilestone: number | null;
}

function milestonesPassed(level: number): number {
  return MILESTONES.filter((m) => level >= m).length;
}

export function ringStats(s: GameState, w: number, i: number, offline = false): RingStats | null {
  const wheel = s.wheels[w];
  const slot = wheel?.slots[i];
  if (!slot || !slot.color) return null;
  const color = slot.color;
  const def = SLOTS[i];
  const innermost = i === wheel.slots.length - 1 && i > 0;

  const speed =
    2 ** milestonesPassed(slot.level) *
    (1 + (i === 0 ? sumEffects(s, (e) => (e.kind === "slotSpeed" ? e.per : null)) : 0)) *
    (1 + sumEffects(s, (e) => (e.kind === "colorSpeed" && e.color === color ? e.per : null)));
  const headStart = Math.min(0.5, sumEffects(s, (e) => (e.kind === "headStart" ? e.per : null)));
  let turn = (def.turn / speed) * (1 - headStart);

  let payPerTurn =
    slot.level * def.yieldPerLevel *
    (1 + sumEffects(s, (e) => (e.kind === "colorYield" && e.color === color ? e.per : null)) + paintingBonus(s, color)) *
    (1 + sumEffects(s, (e) => (e.kind === "allYield" ? e.per : null))) *
    (1 + (innermost ? sumEffects(s, (e) => (e.kind === "slotYield" ? e.per : null)) : 0));

  // Past four turns a second, extra speed is paid out as extra pigment
  const FLOW = 0.25;
  if (turn < FLOW) {
    payPerTurn *= FLOW / turn;
    turn = FLOW;
  }

  if (offline) {
    payPerTurn *= OFFLINE.efficiency + sumEffects(s, (e) => (e.kind === "colorOffline" && e.color === color ? e.per : null));
  }

  const contrast = [wheel.slots[i - 1], wheel.slots[i + 1]].some(
    (n) => n?.color && seamBetween(color, n.color).kind === "contrast",
  );
  const chime = (contrast ? CONTRAST_CHIME_MULT : CHIME_MULT) + sumEffects(s, (e) => (e.kind === "chime" ? e.per : null));
  const rate = (payPerTurn / turn) * (1 + (chime - 1) / CHIME_EVERY);
  const nextMilestone = MILESTONES.find((m) => m > slot.level) ?? null;
  return { turn, pay: payPerTurn, chime, rate, nextMilestone };
}

export interface SeamInfo {
  /** Index of the outer ring of the pair */
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
    out.push({ outer: i, color: seam.color, rate: share * Math.min(ra, rb) * (1 + paintingBonus(s, seam.color)) });
  }
  return out;
}

/** Pigment per second of each color across every wheel. */
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

function gain(s: GameState, color: Color, amount: number): void {
  s.pigment[color] += amount;
  s.earned[color] += amount;
  if (SECONDARIES.includes(color) && !s.owned.includes(color) && s.earned[color] >= DISCOVER_AT) {
    s.owned.push(color);
  }
}

/** Advance rings by `seconds` of their own time and pay what they complete. */
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
  if (payouts && turns <= 3) {
    payouts.push({ wheel: w, slot: i, color: slot.color, amount, chime: chimes > 0 });
  }
}

/** Run the game forward. Seams trickle continuously; rings pay per turn. */
export function tick(s: GameState, seconds: number, payouts?: Payout[], offline = false): void {
  if (seconds <= 0) return;
  s.wheels.forEach((wheel, w) => {
    const flows = seams(s, w, offline);
    wheel.slots.forEach((_, i) => advance(s, w, i, seconds, offline, payouts));
    for (const f of flows) gain(s, f.color, f.rate * seconds);
  });
  if (!offline) s.stats.playSeconds += seconds;
}

/** Pigment earned while the game was closed. Returns what was gained. */
export function catchUp(s: GameState, now: number): { seconds: number; gained: Partial<Record<Color, number>> } {
  const away = Math.max(0, (now - s.lastSeen) / 1000);
  s.lastSeen = now;
  const cap = OFFLINE.capHours * 3600 + sumEffects(s, (e) => (e.kind === "offlineCap" ? e.perMinutes * 60 : null));
  const seconds = Math.min(away, cap);
  if (seconds < 30) return { seconds: 0, gained: {} };
  const before = { ...s.pigment };
  tick(s, seconds, undefined, true);
  const gained: Partial<Record<Color, number>> = {};
  for (const c of Object.keys(before) as Color[]) {
    const d = s.pigment[c] - before[c];
    if (d > 0) gained[c] = d;
  }
  return { seconds, gained };
}

export function tap(s: GameState, w: number, payouts?: Payout[]): void {
  const seconds = TAP_SECONDS + sumEffects(s, (e) => (e.kind === "tap" ? e.per : null));
  s.wheels[w].slots.forEach((_, i) => advance(s, w, i, seconds, false, payouts));
  s.stats.taps++;
}

// ---------------------------------------------------------------------------
// Actions

/** Later wheels cost more to open slots in. */
const wheelScale = (w: number) => 6 ** w;

export function levelCost(s: GameState, w: number, i: number, count = 1): Cost | null {
  const slot = s.wheels[w]?.slots[i];
  if (!slot?.color) return null;
  const def = SLOTS[i];
  const discount = 1 - Math.min(0.6, sumEffects(s, (e) => (e.kind === "levelDiscount" ? e.per : null)));
  const g = def.growth;
  // Sum of a geometric series from the current level
  const total = def.levelBase * wheelScale(w) * g ** slot.level * ((g ** count - 1) / (g - 1)) * discount;
  return { [slot.color]: Math.ceil(total) };
}

/** How many levels the player can afford right now. */
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
  const scale = wheelScale(w);
  return Object.fromEntries(Object.entries(SLOTS[next].unlock).map(([c, n]) => [c, (n ?? 0) * scale]));
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

export function colorUnlockCost(color: Color): Cost | null {
  return COLOR_UNLOCKS[color] ?? null;
}

export function buyColor(s: GameState, color: Color): boolean {
  const cost = COLOR_UNLOCKS[color];
  if (!cost || s.owned.includes(color) || !pay(s, cost)) return false;
  s.owned.push(color);
  return true;
}

/** Primaries the player can buy next, in order. */
export function colorsForSale(s: GameState): Color[] {
  return PRIMARIES.filter((c) => !s.owned.includes(c) && COLOR_UNLOCKS[c]);
}

export function wheelUnlockCost(s: GameState): Cost | null {
  return WHEELS[s.wheels.length]?.unlock ?? null;
}

export function buildWheel(s: GameState): boolean {
  const cost = wheelUnlockCost(s);
  if (!cost || !pay(s, cost)) return false;
  s.wheels.push({ slots: [newSlot()] });
  return true;
}

// Workshop ------------------------------------------------------------------

export function upgradeCost(s: GameState, u: UpgradeDef): Cost | null {
  const rank = s.workshop[u.id] ?? 0;
  if (u.max !== undefined && rank >= u.max) return null;
  const discount = u.pay.some((c) => c === "red" || c === "yellow")
    ? 1 - Math.min(0.3, sumEffects(s, (e) => (e.kind === "workshopDiscount" ? e.per : null)))
    : 1;
  const price = Math.ceil(u.first * u.growth ** rank * discount);
  return Object.fromEntries(u.pay.map((c) => [c, price]));
}

export function upgradeVisible(s: GameState, u: UpgradeDef): boolean {
  if (!u.pay.every((c) => s.owned.includes(c))) return false;
  return Object.entries(u.needs ?? {}).every(([id, n]) => (s.workshop[id] ?? 0) >= n);
}

export function buyUpgrade(s: GameState, id: string): boolean {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || !upgradeVisible(s, u)) return false;
  const cost = upgradeCost(s, u);
  if (!cost || !pay(s, cost)) return false;
  s.workshop[id] = (s.workshop[id] ?? 0) + 1;
  return true;
}

// Paintings -----------------------------------------------------------------

export function currentPainting(s: GameState) {
  return PAINTINGS[s.painting] ?? null;
}

/** 0 to 1: how much of the current painting's pigment the player holds. */
export function paintingProgress(s: GameState): number {
  const p = currentPainting(s);
  if (!p) return 1;
  const parts = Object.entries(p.cost).map(([c, n]) => Math.min(1, s.pigment[c as Color] / (n ?? 1)));
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

export function paint(s: GameState): boolean {
  const p = currentPainting(s);
  if (!p || !pay(s, p.cost)) return false;
  s.hung.push(p.id);
  s.renown += p.renown;
  s.painting++;
  return true;
}
