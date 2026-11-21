import { HUES, type Color } from "./colors";

export interface Slot {
  color: Color | null;
  level: number;
  /** Turns completed so far, with the fraction of the current turn */
  turns: number;
}

export interface Wheel {
  slots: Slot[];
}

export interface GameState {
  version: 1;
  /** Real time of the last update, ms since epoch */
  lastSeen: number;
  pigment: Record<Color, number>;
  /** Pigment ever earned, used for discovery and stats */
  earned: Record<Color, number>;
  /** Colors the player can place in rings */
  owned: Color[];
  wheels: Wheel[];
  workshop: Record<string, number>;
  /** Index into PAINTINGS of the current goal */
  painting: number;
  hung: string[];
  renown: number;
  stats: { taps: number; chimes: number; playSeconds: number };
}

const zero = () => Object.fromEntries(HUES.map((h) => [h, 0])) as Record<Color, number>;

export function newSlot(color: Color | null = null): Slot {
  return { color, level: 1, turns: 0 };
}

export function newGame(now = Date.now()): GameState {
  return {
    version: 1,
    lastSeen: now,
    pigment: zero(),
    earned: zero(),
    owned: ["red"],
    wheels: [{ slots: [newSlot("red")] }],
    workshop: {},
    painting: 0,
    hung: [],
    renown: 0,
    stats: { taps: 0, chimes: 0, playSeconds: 0 },
  };
}

const KEY = "colortime.save.v1";

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
    if (s.version !== 1) return null;
    // Fill in fields added after the save was written
    const fresh = newGame(s.lastSeen);
    return { ...fresh, ...s, pigment: { ...fresh.pigment, ...s.pigment }, earned: { ...fresh.earned, ...s.earned } };
  } catch {
    return null;
  }
}

export function wipe(storage: Storage = localStorage): void {
  try {
    storage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
