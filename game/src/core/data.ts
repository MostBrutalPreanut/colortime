// Every tunable number lives here. Starting points for playtesting.
//
// The economy is a painter's studio:
//   wheels grind paint -> the tin stores it (capped) -> the easel paints the
//   picture you chose, layer by layer, using paint from the tin -> you sell
//   the painting for money, or hang it for a bonus -> money buys tools.
// Paint is never spent on tools. Money is never turned into paint.

import type { Color } from "./colors";

/** A price. Keys are paint colors or "coins". */
export type Cost = Partial<Record<Color | "coins", number>>;

export interface SlotDef {
  /** Seconds per full turn at level 1 with no upgrades */
  turn: number;
  /** Paint ground per turn, per level */
  yieldPerLevel: number;
  /** Coins for the next level: levelBase * growth ^ level */
  levelBase: number;
  growth: number;
  /** Coins to open this ring; ring 1 is open from the start */
  unlock: number;
}

export const SLOTS: SlotDef[] = [
  { turn: 2, yieldPerLevel: 1, levelBase: 3, growth: 1.07, unlock: 0 },
  { turn: 8, yieldPerLevel: 8, levelBase: 40, growth: 1.08, unlock: 15 },
  { turn: 40, yieldPerLevel: 80, levelBase: 700, growth: 1.09, unlock: 300 },
  { turn: 240, yieldPerLevel: 960, levelBase: 12_000, growth: 1.11, unlock: 40_000 },
  { turn: 1_800, yieldPerLevel: 14_400, levelBase: 220_000, growth: 1.13, unlock: 2_000_000 },
  { turn: 14_400, yieldPerLevel: 230_400, levelBase: 4_000_000, growth: 1.15, unlock: 80_000_000 },
];

/** Later wheels cost this much more per wheel for rings and levels. */
export const WHEEL_SCALE = 10;
export const WHEELS: { unlock: number }[] = [{ unlock: 0 }, { unlock: 12_000 }, { unlock: 1_500_000 }, { unlock: 150_000_000 }];

/** Primaries arrive as tubes: from commissions, or bought at the art shop. */
export const TUBES: Partial<Record<Color, number>> = { yellow: 40, blue: 250 };

/** Blended paint needed before a secondary can be placed in a ring. */
export const DISCOVER_AT = 25;

/** A seam trickles this share of the slower neighbour's paint per second. */
export const BLEND_SHARE = 0.2;

export const CHIME_EVERY = 12;
export const CHIME_MULT = 3;
export const CONTRAST_CHIME_MULT = 6;
export const MILESTONES = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
export const TAP_SECONDS = 1;
export const OFFLINE = { capHours: 2, efficiency: 0.5 };

// ---------------------------------------------------------------------------
// Tin: every color has its own capped well. Paint past the cap is lost.

export const TIN = {
  /** Capacity at tin level 0 */
  base: 100,
  /** Each level multiplies capacity */
  perLevel: 2,
  /** Coins for the next level: first * growth ^ level */
  first: 25,
  growth: 2.6,
};

// ---------------------------------------------------------------------------
// Easel and paintings

/** Paint per second the easel pours into the current layer. */
export const BRUSH_RATE = 25;
/** What one unit of paint adds to a painting's price, by color job. */
export const PAINT_VALUE = { grow: 1, research: 3, paint: 8 };
/** Richer paintings sell for more: each extra color and each piece adds to the price. */
export const VARIETY = { perExtraColor: 0.3, perPiece: 0.25 };
/** Bigger Canvas: each level multiplies paint needed and price. */
export const CANVAS = { paint: 3, price: 4 };
/** Paintings that can hang at once; each boosts the colors in it. */
export const HOOKS = 3;
export const HANG_BONUS = 0.1;

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
  { id: "paper", name: "Bare paper", layers: [] },
  { id: "warm", name: "Warm wash", layers: [{ color: "yellow", amount: 30 }] },
  { id: "sky", name: "Blue sky", layers: [{ color: "blue", amount: 40 }] },
  { id: "dawn", name: "Dawn", layers: [{ color: "orange", amount: 30 }, { color: "yellow", amount: 20 }] },
  { id: "meadow", name: "Meadow", layers: [{ color: "green", amount: 40 }, { color: "blue", amount: 20 }] },
  { id: "dusk", name: "Dusk", layers: [{ color: "violet", amount: 30 }, { color: "orange", amount: 20 }] },
  { id: "sea", name: "Open sea", layers: [{ color: "teal", amount: 30 }, { color: "blue", amount: 40 }] },
];

export const PIECES: PartDef[] = [
  { id: "apple", name: "Apple", layers: [{ color: "red", amount: 20 }] },
  { id: "lemon", name: "Lemon", layers: [{ color: "yellow", amount: 20 }] },
  { id: "sun", name: "Sun", layers: [{ color: "yellow", amount: 25 }, { color: "red", amount: 5 }] },
  { id: "kite", name: "Kite", layers: [{ color: "red", amount: 15 }, { color: "blue", amount: 10 }] },
  { id: "pumpkin", name: "Pumpkin", layers: [{ color: "orange", amount: 30 }, { color: "green", amount: 5 }] },
  { id: "tree", name: "Tree", layers: [{ color: "green", amount: 25 }, { color: "chartreuse", amount: 10 }] },
  { id: "house", name: "Cottage", layers: [{ color: "vermilion", amount: 15 }, { color: "yellow", amount: 15 }] },
  { id: "boat", name: "Rowboat", layers: [{ color: "vermilion", amount: 12 }, { color: "blue", amount: 10 }] },
  { id: "heron", name: "Heron", layers: [{ color: "teal", amount: 15 }, { color: "blue", amount: 10 }] },
  { id: "plum", name: "Plums", layers: [{ color: "violet", amount: 20 }, { color: "magenta", amount: 10 }] },
  { id: "field", name: "Wheat", layers: [{ color: "amber", amount: 25 }] },
  { id: "moon", name: "Moon", layers: [{ color: "indigo", amount: 15 }, { color: "yellow", amount: 10 }] },
];

/** Pieces allowed on one painting. A third slot can come from the Gallery later. */
export const MAX_PIECES = 2;

/** The first paintings are set, to teach the loop. Each pays a new tube. */
export const TUTORIAL: { bg: string; pieces: string[]; reward?: Color; title: string }[] = [
  { bg: "paper", pieces: ["apple"], reward: "yellow", title: "First Apple" },
  { bg: "warm", pieces: ["lemon"], reward: "blue", title: "Lemon Light" },
  { bg: "sky", pieces: ["kite"], title: "Kite Day" },
];

// ---------------------------------------------------------------------------
// Workshop: tools bought with coins (docs/upgrades.md, reworked for coins)

export type UpgradeEffect =
  | { kind: "colorYield"; color: Color; per: number }
  | { kind: "allYield"; per: number }
  | { kind: "chime"; per: number }
  | { kind: "slotSpeed"; slot: "outer"; per: number }
  | { kind: "colorSpeed"; color: Color; per: number }
  | { kind: "tap"; per: number }
  | { kind: "headStart"; per: number }
  | { kind: "levelDiscount"; per: number }
  | { kind: "offlineCap"; perMinutes: number }
  | { kind: "blendShare"; per: number }
  | { kind: "brush"; per: number }
  | { kind: "canvas"; per: 1 }
  | { kind: "price"; per: number }
  | { kind: "apprentice"; per: 1 };

export interface UpgradeDef {
  id: string;
  name: string;
  text: string;
  group: "Wheels" | "Easel";
  first: number;
  growth: number;
  max?: number;
  effect: UpgradeEffect;
  /** Shown once the player has made this many paintings */
  after?: number;
}

export const UPGRADES: UpgradeDef[] = [
  { id: "wide-brush", name: "Wide Brush", text: "Easel paints 50% faster", group: "Easel", first: 30, growth: 1.9, effect: { kind: "brush", per: 0.5 } },
  { id: "good-frames", name: "Good Frames", text: "Paintings sell for 15% more", group: "Easel", first: 80, growth: 2, effect: { kind: "price", per: 0.15 }, after: 2 },
  { id: "apprentice", name: "Apprentice", text: "Repeats your last painting and sells it for you", group: "Easel", first: 600, growth: 1, max: 1, effect: { kind: "apprentice", per: 1 }, after: 3 },
  { id: "bigger-canvas", name: "Bigger Canvas", text: "Paintings take 3× the paint and sell for 4×", group: "Easel", first: 2_500, growth: 40, max: 12, effect: { kind: "canvas", per: 1 }, after: 4 },
  { id: "rim-runner", name: "Rim Runner", text: "Outer ring turns 10% faster", group: "Wheels", first: 20, growth: 2, effect: { kind: "slotSpeed", slot: "outer", per: 0.1 } },
  { id: "heavy-stroke", name: "Heavy Stroke", text: "Red rings grind 25% more", group: "Wheels", first: 60, growth: 1.6, effect: { kind: "colorYield", color: "red", per: 0.25 } },
  { id: "quick-yellow", name: "Quick Yellow", text: "Yellow rings turn 10% faster", group: "Wheels", first: 150, growth: 1.8, effect: { kind: "colorSpeed", color: "yellow", per: 0.1 } },
  { id: "thin-coats", name: "Thin Coats", text: "Ring levels cost 3% less", group: "Wheels", first: 200, growth: 2.4, max: 20, effect: { kind: "levelDiscount", per: 0.03 } },
  { id: "light-touch", name: "Light Touch", text: "A tap turns rings 0.5 s more", group: "Wheels", first: 400, growth: 2.5, max: 10, effect: { kind: "tap", per: 0.5 } },
  { id: "thick-paint", name: "Thick Paint", text: "Every ring grinds 10% more", group: "Wheels", first: 1_000, growth: 2.2, effect: { kind: "allYield", per: 0.1 } },
  { id: "wet-on-wet", name: "Wet on Wet", text: "Seams blend 2% more", group: "Wheels", first: 1_500, growth: 2.5, max: 10, effect: { kind: "blendShare", per: 0.02 } },
  { id: "deep-wells", name: "Deep Wells", text: "Offline time +15 minutes", group: "Wheels", first: 500, growth: 2, max: 24, effect: { kind: "offlineCap", perMinutes: 15 } },
  { id: "bold-chime", name: "Bold Chime", text: "Chimes pay +0.5×", group: "Wheels", first: 3_000, growth: 3, max: 10, effect: { kind: "chime", per: 0.5 } },
  { id: "head-start", name: "Head Start", text: "Every turn begins 2% done", group: "Wheels", first: 6_000, growth: 3, max: 15, effect: { kind: "headStart", per: 0.02 } },
];

/** Every tenth rank doubles that upgrade's total bonus. */
export const LANDMARK_EVERY = 10;
