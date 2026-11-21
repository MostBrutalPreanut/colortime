import { HUES, type Color } from "./colors";
import type { Layer } from "./data";

export interface Slot {
  color: Color | null;
  level: number;
  /** Turns completed so far, with the fraction of the current turn */
  turns: number;
}

export interface Wheel {
  slots: Slot[];
}

export interface Composition {
  bg: string;
  pieces: string[];
  title: string;
}

export interface Easel {
  comp: Composition;
  /** Layers in painting order: background first, then each piece */
  layers: (Layer & { done: number })[];
  /** Index into TUTORIAL, or -1 for the player's own composition */
  tutorial: number;
  price: number;
}

export interface Hung {
  title: string;
  colors: Color[];
}

export interface GameState {
  version: 2;
  /** Real time of the last update, ms since epoch */
  lastSeen: number;
  coins: number;
  /** Paint in the tin */
  pigment: Record<Color, number>;
  /** Tin upgrade level per color */
  tin: Record<Color, number>;
  /** Paint ever ground, used for discovery and stats */
  earned: Record<Color, number>;
  /** Colors the player can place in rings */
  owned: Color[];
  wheels: Wheel[];
  workshop: Record<string, number>;
  easel: Easel | null;
  /** Last composition the player chose, for the Apprentice to repeat */
  lastComp: Composition | null;
  painted: number;
  hung: Hung[];
  stats: { taps: number; chimes: number; playSeconds: number; sold: number; coinsEarned: number; spilled: number };
}

const zero = () => Object.fromEntries(HUES.map((h) => [h, 0])) as Record<Color, number>;

export function newSlot(color: Color | null = null): Slot {
  return { color, level: 1, turns: 0 };
}

export function newGame(now = Date.now()): GameState {
  return {
    version: 2,
    lastSeen: now,
    coins: 0,
    pigment: zero(),
    tin: zero(),
    earned: zero(),
    owned: ["red"],
    wheels: [{ slots: [newSlot("red")] }],
    workshop: {},
    easel: null,
    lastComp: null,
    painted: 0,
    hung: [],
    stats: { taps: 0, chimes: 0, playSeconds: 0, sold: 0, coinsEarned: 0, spilled: 0 },
  };
}

const KEY = "colortime.save.v2";

export function save(state: GameState, storage: Storage = localStorage): void {
  try {
    storage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the game keeps running, progress just isn't kept
  }
}

export function load(storage: Storage = localStorage): GameState | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (s.version !== 2) return null;
    const fresh = newGame(s.lastSeen);
    return {
      ...fresh, ...s,
      pigment: { ...fresh.pigment, ...s.pigment },
      tin: { ...fresh.tin, ...s.tin },
      earned: { ...fresh.earned, ...s.earned },
      stats: { ...fresh.stats, ...s.stats },
    };
  } catch {
    return null;
  }
}

export function wipe(storage: Storage = localStorage): void {
  try {
    storage.removeItem(KEY);
    storage.removeItem("colortime.save.v1");
  } catch {
    /* ignore */
  }
}
