// Every tunable number lives here. Starting points for playtesting.
//
// The studio as a production chain (docs/economy.md):
//   each color is a fixed row that grinds paint in turns -> mixed colors take
//   their parent colors from the tin at the start of each turn -> paint lands
//   in the tin only when a turn completes -> the easel takes paint from the tin
//   for the commission you accepted -> sell it for coins or hang it -> coins
//   buy levels, rows, apprentices, wells and boosts.

import type { Color } from "./colors";

export type Tier = 1 | 2 | 3;

export interface ColorDef {
  color: Color;
  tier: Tier;
  /** Parent colors taken from the tin at the start of every turn, per level */
  recipe: Color[];
  /** Seconds per turn before milestones */
  turn: number;
  /** Paint made per turn, per level */
  yield: number;
  /** Coins to unlock the row */
  unlock: number;
  /** Coins for the next level: levelBase * growth ^ (level - 1) */
  levelBase: number;
  growth: number;
  /** Coins to hire this row's apprentice, who keeps it turning */
  apprentice: number;
  /** One-time boosts: each doubles this row's output */
  boosts: number[];
}

export const COLORS: ColorDef[] = [
  { color: "red", tier: 1, recipe: [], turn: 1.5, yield: 1, unlock: 0, levelBase: 4, growth: 1.07, apprentice: 60, boosts: [500, 20_000, 1e6] },
  { color: "yellow", tier: 1, recipe: [], turn: 3, yield: 1, unlock: 25, levelBase: 20, growth: 1.08, apprentice: 300, boosts: [2_000, 60_000, 3e6] },
  { color: "blue", tier: 1, recipe: [], turn: 4.5, yield: 1, unlock: 200, levelBase: 120, growth: 1.09, apprentice: 1_500, boosts: [8_000, 250_000, 1e7] },
  { color: "orange", tier: 2, recipe: ["red", "yellow"], turn: 8, yield: 1, unlock: 800, levelBase: 500, growth: 1.1, apprentice: 6_000, boosts: [40_000, 1.2e6, 5e7] },
  { color: "green", tier: 2, recipe: ["yellow", "blue"], turn: 10, yield: 1, unlock: 2_500, levelBase: 1_500, growth: 1.1, apprentice: 15_000, boosts: [120_000, 4e6, 1.5e8] },
  { color: "violet", tier: 2, recipe: ["blue", "red"], turn: 12, yield: 1, unlock: 7_000, levelBase: 4_000, growth: 1.1, apprentice: 40_000, boosts: [350_000, 1.2e7, 4e8] },
  { color: "vermilion", tier: 3, recipe: ["red", "orange"], turn: 18, yield: 1, unlock: 25_000, levelBase: 15_000, growth: 1.12, apprentice: 150_000, boosts: [1.5e6, 5e7, 2e9] },
  { color: "amber", tier: 3, recipe: ["orange", "yellow"], turn: 21, yield: 1, unlock: 60_000, levelBase: 35_000, growth: 1.12, apprentice: 350_000, boosts: [3.5e6, 1.2e8, 5e9] },
  { color: "chartreuse", tier: 3, recipe: ["yellow", "green"], turn: 24, yield: 1, unlock: 150_000, levelBase: 90_000, growth: 1.12, apprentice: 900_000, boosts: [9e6, 3e8, 1.2e10] },
  { color: "teal", tier: 3, recipe: ["green", "blue"], turn: 27, yield: 1, unlock: 400_000, levelBase: 240_000, growth: 1.12, apprentice: 2.4e6, boosts: [2.4e7, 8e8, 3e10] },
  { color: "indigo", tier: 3, recipe: ["blue", "violet"], turn: 30, yield: 1, unlock: 1e6, levelBase: 600_000, growth: 1.12, apprentice: 6e6, boosts: [6e7, 2e9, 8e10] },
  { color: "magenta", tier: 3, recipe: ["violet", "red"], turn: 33, yield: 1, unlock: 2.5e6, levelBase: 1.5e6, growth: 1.12, apprentice: 1.5e7, boosts: [1.5e8, 5e9, 2e11] },
];

export const colorDef = (c: Color) => COLORS.find((d) => d.color === c)!;

/** Each milestone halves a row's turn time. */
export const MILESTONES = [25, 50, 100, 200, 300, 400, 500];

export const OFFLINE = { capHours: 2, efficiency: 0.5 };

// ---------------------------------------------------------------------------
// Tin: one capped well per color. Paint that doesn't fit is lost.

export const TIN = { base: 50, perLevel: 2, first: 15, growth: 2.4 };

// ---------------------------------------------------------------------------
// Commissions

/** Coins per unit of paint in a painting, by tier. */
export const PAINT_VALUE: Record<Tier, number> = { 1: 3, 2: 15, 3: 60 };
/** Richer paintings pay more: per extra color and per piece. */
export const VARIETY = { perExtraColor: 0.3, perPiece: 0.25 };
/** Paintings that can hang at once; each makes its colors' rows 10% faster. */
export const HOOKS = 3;
export const HANG_BONUS = 0.1;
/** Commissions on offer at once */
export const OFFERS = 3;

export interface Layer {
  color: Color;
  amount: number;
}

export interface PartDef {
  id: string;
  name: string;
  layers: Layer[];
}

export const BACKGROUNDS: PartDef[] = [
  { id: "paper", name: "", layers: [] },
  { id: "warm", name: "warm wash", layers: [{ color: "yellow", amount: 10 }] },
  { id: "sky", name: "blue sky", layers: [{ color: "blue", amount: 12 }] },
  { id: "dawn", name: "dawn", layers: [{ color: "orange", amount: 6 }, { color: "yellow", amount: 6 }] },
  { id: "meadow", name: "meadow", layers: [{ color: "green", amount: 8 }, { color: "blue", amount: 6 }] },
  { id: "dusk", name: "dusk", layers: [{ color: "violet", amount: 6 }, { color: "orange", amount: 4 }] },
  { id: "sea", name: "open sea", layers: [{ color: "teal", amount: 4 }, { color: "blue", amount: 10 }] },
  { id: "field", name: "wheat field", layers: [{ color: "amber", amount: 4 }, { color: "chartreuse", amount: 3 }] },
];

export const PIECES: PartDef[] = [
  { id: "apple", name: "Apple", layers: [{ color: "red", amount: 8 }] },
  { id: "lemon", name: "Lemon", layers: [{ color: "yellow", amount: 8 }] },
  { id: "kite", name: "Kite", layers: [{ color: "red", amount: 6 }, { color: "blue", amount: 4 }] },
  { id: "sun", name: "Sun", layers: [{ color: "yellow", amount: 10 }, { color: "red", amount: 3 }] },
  { id: "pumpkin", name: "Pumpkin", layers: [{ color: "orange", amount: 6 }, { color: "green", amount: 2 }] },
  { id: "tree", name: "Tree", layers: [{ color: "green", amount: 8 }] },
  { id: "plums", name: "Plums", layers: [{ color: "violet", amount: 6 }] },
  { id: "house", name: "Cottage", layers: [{ color: "vermilion", amount: 3 }, { color: "yellow", amount: 6 }] },
  { id: "boat", name: "Rowboat", layers: [{ color: "vermilion", amount: 3 }, { color: "blue", amount: 4 }] },
  { id: "heron", name: "Heron", layers: [{ color: "teal", amount: 3 }, { color: "blue", amount: 4 }] },
  { id: "moon", name: "Moon", layers: [{ color: "indigo", amount: 3 }, { color: "yellow", amount: 4 }] },
  { id: "rose", name: "Roses", layers: [{ color: "magenta", amount: 3 }, { color: "green", amount: 3 }] },
];

/** The first commissions are fixed, to teach the loop. */
export const TUTORIAL: { bg: string; pieces: string[] }[] = [
  { bg: "paper", pieces: ["apple"] },
  { bg: "paper", pieces: ["lemon"] },
  { bg: "warm", pieces: ["apple"] },
];

/** Commissions grow with how many paintings you have made: amounts × (1 + this × painted). */
export const COMMISSION_GROWTH = 0.12;

// ---------------------------------------------------------------------------
// Studio upgrades: one-time and repeatable, bought with coins

export type StudioEffect = "price" | "speed" | "offline" | "agent" | "canvas";

export interface StudioUpgrade {
  id: string;
  name: string;
  text: string;
  effect: StudioEffect;
  first: number;
  growth: number;
  max?: number;
  /** Shown once the player has made this many paintings */
  after: number;
}

export const STUDIO: StudioUpgrade[] = [
  { id: "frames", name: "Good Frames", text: "Paintings sell for 20% more", effect: "price", first: 150, growth: 2.2, after: 3 },
  { id: "oil", name: "Oiled Wheels", text: "Every row turns 10% faster", effect: "speed", first: 1_000, growth: 2.5, after: 4 },
  { id: "agent", name: "Art Agent", text: "Sells finished paintings and takes the best commission for you", effect: "agent", first: 5_000, growth: 1, max: 1, after: 6 },
  { id: "canvas", name: "Bigger Canvas", text: "Commissions need 3× the paint and pay 4×", effect: "canvas", first: 20_000, growth: 30, max: 10, after: 8 },
  { id: "wells", name: "Deep Wells", text: "Offline time +30 minutes", effect: "offline", first: 2_000, growth: 2, max: 20, after: 5 },
];
