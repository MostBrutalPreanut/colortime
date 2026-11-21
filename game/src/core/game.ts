// Rules, simulation and player actions. Pure functions over GameState, no
// drawing, so the same code runs in the browser, in tests and in the bot.

import { HUES, type Color } from "./colors";
import {
  BACKGROUNDS, COLORS, COMMISSION_GROWTH, HANG_BONUS, MILESTONES, OFFERS, OFFLINE, PAINT_VALUE, PIECES,
  STUDIO, TIN, TUTORIAL, VARIETY, colorDef, type PartDef, type StudioEffect,
} from "./data";
import type { Commission, GameState } from "./state";

// ---------------------------------------------------------------------------
// Studio upgrades

const rank = (s: GameState, effect: StudioEffect) =>
  STUDIO.filter((u) => u.effect === effect).reduce((n, u) => n + (s.studio[u.id] ?? 0), 0);

export function studioCost(s: GameState, id: string): number | null {
  const u = STUDIO.find((x) => x.id === id)!;
  const r = s.studio[id] ?? 0;
  if (u.max !== undefined && r >= u.max) return null;
  return Math.ceil(u.first * u.growth ** r);
}

/** Paintings that can hang at once. None until the Gallery Wall is bought. */
export const hooks = (s: GameState) => rank(s, "hooks");

export const studioVisible = (s: GameState) => STUDIO.filter((u) => s.painted >= u.after);

export function buyStudio(s: GameState, id: string): boolean {
  const cost = studioCost(s, id);
  if (cost === null || s.coins < cost || !studioVisible(s).some((u) => u.id === id)) return false;
  s.coins -= cost;
  s.studio[id] = (s.studio[id] ?? 0) + 1;
  return true;
}

// ---------------------------------------------------------------------------
// Rows

export function turnTime(s: GameState, c: Color): number {
  const row = s.rows[c];
  const milestones = MILESTONES.filter((m) => row.level >= m).length;
  const hung = s.hung.filter((h) => h.colors.includes(c)).length * HANG_BONUS;
  return colorDef(c).turn / 2 ** milestones / (1 + 0.1 * rank(s, "speed") + hung);
}

/** Paint one turn makes. Boosts double it without needing more parent paint. */
export function batchSize(s: GameState, c: Color): number {
  const row = s.rows[c];
  return row.level * colorDef(c).yield * 2 ** row.boosts;
}

/** Parent paint one turn takes, per parent color. */
export function inputPerParent(s: GameState, c: Color): number {
  return s.rows[c].level * colorDef(c).yield;
}

export const nextMilestone = (s: GameState, c: Color) => MILESTONES.find((m) => m > s.rows[c].level) ?? null;

export function tinCap(s: GameState, c: Color): number {
  return TIN.base * TIN.perLevel ** s.rows[c].tin;
}
export const isFull = (s: GameState, c: Color) => s.pigment[c] >= tinCap(s, c) - 1e-9;

/** Can this row start a turn right now? Mixes need their parents' paint in the tin. */
export function canStart(s: GameState, c: Color): boolean {
  const row = s.rows[c];
  if (!row.unlocked || row.running >= 0) return false;
  const need = inputPerParent(s, c);
  return colorDef(c).recipe.every((p) => s.pigment[p] >= need);
}

/** What a mix is waiting for, if anything. */
export function missingParent(s: GameState, c: Color): Color | null {
  const need = inputPerParent(s, c);
  return colorDef(c).recipe.find((p) => s.pigment[p] < need) ?? null;
}

function startTurn(s: GameState, c: Color): boolean {
  if (!canStart(s, c)) return false;
  const need = inputPerParent(s, c);
  for (const p of colorDef(c).recipe) s.pigment[p] -= need;
  const row = s.rows[c];
  row.running = 0;
  row.batch = batchSize(s, c);
  return true;
}

function deliver(s: GameState, c: Color, amount: number): void {
  const room = Math.max(0, tinCap(s, c) - s.pigment[c]);
  const kept = Math.min(room, amount);
  s.pigment[c] += kept;
  s.stats.spilled += amount - kept;
}

export interface Delivery {
  color: Color;
  amount: number;
}

/** Advance one row by `dt` seconds. Paint lands only when a turn completes. */
function runRow(s: GameState, c: Color, dt: number, out?: Delivery[]): void {
  const row = s.rows[c];
  if (!row.unlocked) return;
  let left = dt;
  if (row.running < 0) {
    if (!row.apprentice || !startTurn(s, c)) return;
  }
  const turn = turnTime(s, c);
  while (left > 0 && row.running >= 0) {
    const toFinish = turn - row.running;
    if (left < toFinish) {
      row.running += left;
      return;
    }
    left -= toFinish;
    deliver(s, c, row.batch);
    out?.push({ color: c, amount: row.batch });
    row.running = -1;
    if (!row.apprentice) return;
    // Many turns in one step (offline, or very fast rows): settle them in bulk
    const recipe = colorDef(c).recipe;
    const need = inputPerParent(s, c);
    let turns = Math.floor(left / turn);
    if (recipe.length) turns = Math.min(turns, ...recipe.map((p) => Math.floor(s.pigment[p] / need)));
    if (turns > 0) {
      for (const p of recipe) s.pigment[p] -= need * turns;
      const made = batchSize(s, c) * turns;
      deliver(s, c, made);
      out?.push({ color: c, amount: made });
      left -= turns * turn;
    }
    if (!startTurn(s, c)) return;
  }
}

// ---------------------------------------------------------------------------
// Commissions and the easel

const part = (list: PartDef[], id: string) => list.find((p) => p.id === id)!;
export const unlocked = (s: GameState) => HUES.filter((c) => s.rows[c].unlocked);

function seeded(n: number) {
  let x = (n * 2654435761) >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function makeCommission(s: GameState, bg: PartDef, pieces: PartDef[]): Commission {
  const scale = (1 + COMMISSION_GROWTH * s.painted) * 3 ** rank(s, "canvas");
  const merged = new Map<Color, number>();
  for (const l of [bg, ...pieces].flatMap((p) => p.layers)) merged.set(l.color, (merged.get(l.color) ?? 0) + l.amount);
  const layers = [...merged].map(([color, amount]) => ({ color, amount: Math.ceil(amount * scale), done: 0 }));
  const value = layers.reduce((v, l) => v + l.amount * PAINT_VALUE[colorDef(l.color).tier], 0);
  const variety = (1 + VARIETY.perExtraColor * Math.max(0, layers.length - 1)) * (1 + VARIETY.perPiece * pieces.length);
  const names = pieces.map((p) => p.name);
  const title = names.join(" and ") + (bg.name ? ` on ${bg.name}` : "");
  return { id: s.nextId++, title, layers, pieces: pieces.length, price: Math.ceil(value * variety * (4 / 3) ** rank(s, "canvas")) };
}

/** Keep the board full: a fixed lesson early on, then random commissions using colors you have. */
export function fillOffers(s: GameState): void {
  stock(s);
  rescue(s);
}

function stock(s: GameState): void {
  if (s.painted < TUTORIAL.length) {
    if (!s.easel && s.offers.length === 0) {
      const t = TUTORIAL[s.painted];
      s.offers.push(makeCommission(s, part(BACKGROUNDS, t.bg), t.pieces.map((p) => part(PIECES, p))));
    }
    return;
  }
  const have = new Set(unlocked(s));
  const ok = (p: PartDef) => p.layers.every((l) => have.has(l.color));
  const bgs = BACKGROUNDS.filter(ok);
  const pcs = PIECES.filter(ok);
  const rand = seeded(s.nextId);
  let guard = 0;
  while (s.offers.length < OFFERS && guard++ < 20) {
    // Favour the newest colors so new rows feel useful right away
    const pick = <T extends PartDef>(list: T[]) => {
      const sorted = [...list].sort((a, b) => newest(b) - newest(a));
      return sorted[Math.floor(rand() ** 1.6 * sorted.length)];
    };
    const bg = pick(bgs);
    const first = pick(pcs);
    const second = rand() < 0.5 ? pick(pcs.filter((p) => p !== first)) : undefined;
    const c = makeCommission(s, bg, second ? [first, second] : [first]);
    if (c.layers.length && !s.offers.some((o) => o.title === c.title)) s.offers.push(c);
  }
}

/**
 * Never strand the player: if nothing is on the easel, no offer can be painted
 * with unlocked colors, and they can't afford to unlock what's missing, swap in
 * an apple, which red alone can paint.
 */
function rescue(s: GameState): void {
  if (s.easel || s.offers.length === 0) return;
  const paintable = (o: Commission) => o.layers.every((l) => s.rows[l.color].unlocked);
  const affordable = (o: Commission) =>
    o.layers.every((l) => s.rows[l.color].unlocked || (parentsReady(s, l.color) && s.coins >= colorDef(l.color).unlock));
  if (s.offers.some((o) => paintable(o) || affordable(o))) return;
  s.offers.unshift(makeCommission(s, part(BACKGROUNDS, "paper"), [part(PIECES, "apple")]));
}

const tierOf = (c: Color) => COLORS.findIndex((d) => d.color === c);
const newest = (p: PartDef) => Math.max(-1, ...p.layers.map((l) => tierOf(l.color)));

export function accept(s: GameState, id: number): boolean {
  if (s.easel) return false;
  const i = s.offers.findIndex((o) => o.id === id);
  if (i < 0) return false;
  s.easel = s.offers.splice(i, 1)[0];
  fillOffers(s);
  return true;
}

/** Swap an offer for a new one. */
export function decline(s: GameState, id: number): void {
  if (s.painted < TUTORIAL.length) return;
  s.offers = s.offers.filter((o) => o.id !== id);
  fillOffers(s);
}

export const easelDone = (e: Commission | null) => !!e && e.layers.every((l) => l.done >= l.amount);

export function easelProgress(e: Commission | null): number {
  if (!e) return 0;
  const total = e.layers.reduce((n, l) => n + l.amount, 0);
  return e.layers.reduce((n, l) => n + l.done, 0) / total;
}

/** The easel takes whatever paint it still needs from the tin, all colors at once. */
function feedEasel(s: GameState): void {
  const e = s.easel;
  if (!e) return;
  for (const l of e.layers) {
    const take = Math.min(s.pigment[l.color], l.amount - l.done);
    if (take > 0) {
      s.pigment[l.color] -= take;
      l.done += take;
    }
  }
}

export function salePrice(s: GameState, e: Commission): number {
  return Math.ceil(e.price * (1 + 0.2 * rank(s, "price")));
}

function finish(s: GameState): void {
  s.painted++;
  s.easel = null;
  fillOffers(s);
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
  if (!easelDone(s.easel) || s.hung.length >= hooks(s)) return false;
  s.hung.push({ title: s.easel!.title, colors: s.easel!.layers.map((l) => l.color) });
  finish(s);
  return true;
}

export function unhang(s: GameState, i: number): void {
  s.hung.splice(i, 1);
}

/** The Art Agent sells finished work and takes the best-paying commission. */
function agent(s: GameState): void {
  if (rank(s, "agent") === 0) return;
  if (easelDone(s.easel)) sell(s);
  if (!s.easel && s.offers.length) {
    const best = [...s.offers].sort((a, b) => b.price - a.price)[0];
    accept(s, best.id);
  }
}

// ---------------------------------------------------------------------------
// Time

export function tick(s: GameState, seconds: number, out?: Delivery[], offline = false): void {
  if (seconds <= 0) return;
  fillOffers(s);
  const STEP = 2;
  let left = seconds;
  while (left > 0) {
    const dt = Math.min(STEP, left);
    for (const d of COLORS) runRow(s, d.color, dt, out);
    feedEasel(s);
    agent(s);
    left -= dt;
  }
  if (!offline) s.stats.playSeconds += seconds;
}

export function catchUp(s: GameState, now: number) {
  const away = Math.max(0, (now - s.lastSeen) / 1000);
  s.lastSeen = now;
  const cap = OFFLINE.capHours * 3600 + 1800 * rank(s, "offline");
  const seconds = Math.min(away, cap);
  const result = { seconds: 0, coins: 0, paintings: 0, gained: {} as Partial<Record<Color, number>> };
  if (seconds < 30) return result;
  const before = { ...s.pigment };
  const coins = s.coins;
  const painted = s.painted;
  tick(s, seconds * OFFLINE.efficiency, undefined, true);
  for (const c of HUES) if (s.pigment[c] > before[c]) result.gained[c] = s.pigment[c] - before[c];
  return { ...result, seconds, coins: s.coins - coins, paintings: s.painted - painted };
}

/** Tap a row to start one turn by hand. */
export function tapRow(s: GameState, c: Color): boolean {
  const ok = startTurn(s, c);
  if (ok) s.stats.taps++;
  return ok;
}

/** Tap the big wheel: start every idle row that can start. */
export function tapAll(s: GameState): number {
  let n = 0;
  for (const d of COLORS) if (startTurn(s, d.color)) n++;
  if (n) s.stats.taps++;
  return n;
}

// ---------------------------------------------------------------------------
// Purchases

export function levelCost(s: GameState, c: Color, count: number): number {
  const d = colorDef(c);
  const g = d.growth;
  return Math.ceil(d.levelBase * g ** (s.rows[c].level - 1) * ((g ** count - 1) / (g - 1)));
}

export function maxAffordable(s: GameState, c: Color): number {
  const d = colorDef(c);
  const g = d.growth;
  const first = d.levelBase * g ** (s.rows[c].level - 1);
  return Math.max(0, Math.floor(Math.log((s.coins * (g - 1)) / first + 1) / Math.log(g)));
}

/** How many levels the current buy setting means for this row. Max buys at least one. */
export function buyCount(s: GameState, c: Color): number {
  if (s.buy === "max") return Math.max(1, maxAffordable(s, c));
  if (s.buy === 1) return 1;
  // ×10 and ×100 round up to the next multiple, as AdVenture Capitalist does
  const lvl = s.rows[c].level;
  return s.buy - (lvl % s.buy) || s.buy;
}

export function buyLevels(s: GameState, c: Color): boolean {
  const row = s.rows[c];
  if (!row.unlocked) return false;
  const n = buyCount(s, c);
  const cost = levelCost(s, c, n);
  if (s.coins < cost) return false;
  s.coins -= cost;
  row.level += n;
  return true;
}

export const parentsReady = (s: GameState, c: Color) => colorDef(c).recipe.every((p) => s.rows[p].unlocked);

export function unlockRow(s: GameState, c: Color): boolean {
  const row = s.rows[c];
  const cost = colorDef(c).unlock;
  if (row.unlocked || !parentsReady(s, c) || s.coins < cost) return false;
  s.coins -= cost;
  row.unlocked = true;
  row.level = 1;
  return true;
}

export function hireApprentice(s: GameState, c: Color): boolean {
  const row = s.rows[c];
  const cost = colorDef(c).apprentice;
  if (!row.unlocked || row.apprentice || s.coins < cost) return false;
  s.coins -= cost;
  row.apprentice = true;
  return true;
}

export function boostCost(s: GameState, c: Color): number | null {
  return colorDef(c).boosts[s.rows[c].boosts] ?? null;
}

export function buyBoost(s: GameState, c: Color): boolean {
  const cost = boostCost(s, c);
  if (cost === null || !s.rows[c].unlocked || s.coins < cost) return false;
  s.coins -= cost;
  s.rows[c].boosts++;
  return true;
}

export const tinCost = (s: GameState, c: Color) => Math.ceil(TIN.first * TIN.growth ** s.rows[c].tin);

export function upgradeTin(s: GameState, c: Color): boolean {
  const cost = tinCost(s, c);
  if (s.coins < cost) return false;
  s.coins -= cost;
  s.rows[c].tin++;
  return true;
}

/** Paint per second a row makes when kept turning. */
export const rowRate = (s: GameState, c: Color) => (s.rows[c].unlocked ? batchSize(s, c) / turnTime(s, c) : 0);
