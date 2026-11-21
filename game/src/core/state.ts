import { HUES, type Color } from "./colors";
import type { Layer } from "./data";

export interface Row {
  unlocked: boolean;
  level: number;
  /** Seconds into the current turn, or -1 when idle */
  running: number;
  /** Paint the current turn will deliver (fixed when the turn starts) */
  batch: number;
  apprentice: boolean;
  boosts: number;
  tin: number;
}

export interface Commission {
  id: number;
  title: string;
  layers: (Layer & { done: number })[];
  pieces: number;
  price: number;
}

export interface GameState {
  version: 3;
  lastSeen: number;
  coins: number;
  pigment: Record<Color, number>;
  rows: Record<Color, Row>;
  offers: Commission[];
  easel: Commission | null;
  nextId: number;
  painted: number;
  hung: { title: string; colors: Color[] }[];
  studio: Record<string, number>;
  /** Buy amount for row levels */
  buy: 1 | 10 | 100 | "max";
  stats: { taps: number; playSeconds: number; sold: number; coinsEarned: number; spilled: number };
}

function newRow(unlocked = false): Row {
  return { unlocked, level: unlocked ? 1 : 0, running: -1, batch: 0, apprentice: false, boosts: 0, tin: 0 };
}

export function newGame(now = Date.now()): GameState {
  return {
    version: 3,
    lastSeen: now,
    coins: 0,
    pigment: Object.fromEntries(HUES.map((h) => [h, 0])) as Record<Color, number>,
    rows: Object.fromEntries(HUES.map((h) => [h, newRow(h === "red")])) as Record<Color, Row>,
    offers: [],
    easel: null,
    nextId: 1,
    painted: 0,
    hung: [],
    studio: {},
    buy: 1,
    stats: { taps: 0, playSeconds: 0, sold: 0, coinsEarned: 0, spilled: 0 },
  };
}

const KEY = "colortime.save.v3";

export function save(state: GameState, storage: Storage = localStorage): void {
  try {
    storage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked: the game keeps running */
  }
}

export function load(storage: Storage = localStorage): GameState | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (s.version !== 3) return null;
    const fresh = newGame(s.lastSeen);
    return { ...fresh, ...s, pigment: { ...fresh.pigment, ...s.pigment }, rows: { ...fresh.rows, ...s.rows }, stats: { ...fresh.stats, ...s.stats } };
  } catch {
    return null;
  }
}

export function wipe(storage: Storage = localStorage): void {
  try {
    for (const k of ["colortime.save.v1", "colortime.save.v2", KEY]) storage.removeItem(k);
  } catch {
    /* ignore */
  }
}
