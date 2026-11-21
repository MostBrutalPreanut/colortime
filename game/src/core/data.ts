// Every tunable number lives here. Values are starting points for playtesting,
// taken from docs/design.md and docs/upgrades.md.

import type { Color } from "./colors";

export type Cost = Partial<Record<Color, number>>;

export interface SlotDef {
  /** Seconds per full turn at level 1 with no upgrades */
  turn: number;
  /** Pigment paid per turn, per level */
  yieldPerLevel: number;
  /** Price of the next level: levelBase * growth ^ level */
  levelBase: number;
  growth: number;
  /** Price to open this slot; slot 1 is open from the start */
  unlock: Cost;
}

export const SLOTS: SlotDef[] = [
  { turn: 2, yieldPerLevel: 1, levelBase: 4, growth: 1.07, unlock: {} },
  { turn: 8, yieldPerLevel: 8, levelBase: 40, growth: 1.08, unlock: { red: 30 } },
  { turn: 40, yieldPerLevel: 80, levelBase: 600, growth: 1.09, unlock: { red: 400, yellow: 150 } },
  { turn: 240, yieldPerLevel: 960, levelBase: 9_000, growth: 1.11, unlock: { green: 300 } },
  { turn: 1_800, yieldPerLevel: 14_400, levelBase: 160_000, growth: 1.13, unlock: { green: 6_000, orange: 2_000 } },
  { turn: 14_400, yieldPerLevel: 230_400, levelBase: 3_000_000, growth: 1.15, unlock: { green: 120_000, violet: 40_000 } },
];

/** Buying a primary lets you place it in a ring. Red is free. */
export const COLOR_UNLOCKS: Partial<Record<Color, Cost>> = {
  yellow: { red: 20 },
  blue: { red: 80, yellow: 40 },
};

/** Blended pigment needed before a secondary can be placed in a ring. */
export const DISCOVER_AT = 25;

/** A seam trickles this share of the slower neighbour's pigment per second. */
export const BLEND_SHARE = 0.2;

export const CHIME_EVERY = 12;
export const CHIME_MULT = 3;
export const CONTRAST_CHIME_MULT = 6;

/** Each milestone doubles the ring's speed. */
export const MILESTONES = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

/** Seconds each ring advances on a tap. */
export const TAP_SECONDS = 1;

export const OFFLINE = { capHours: 2, efficiency: 0.5 };

export const WHEELS: { unlock: Cost }[] = [
  { unlock: {} },
  { unlock: { orange: 400, green: 400 } },
  { unlock: { orange: 8_000, green: 8_000, violet: 2_000 } },
  { unlock: { orange: 150_000, green: 150_000, violet: 60_000 } },
];

// ---------------------------------------------------------------------------
// Workshop: repeatable upgrades paid in primaries (docs/upgrades.md)

export type UpgradeEffect =
  | { kind: "colorYield"; color: Color; per: number }
  | { kind: "allYield"; per: number }
  | { kind: "slotYield"; slot: "inner"; per: number }
  | { kind: "chime"; per: number }
  | { kind: "slotSpeed"; slot: "outer"; per: number }
  | { kind: "colorSpeed"; color: Color; per: number }
  | { kind: "tap"; per: number }
  | { kind: "headStart"; per: number }
  | { kind: "levelDiscount"; per: number }
  | { kind: "offlineCap"; perMinutes: number }
  | { kind: "colorOffline"; color: Color; per: number }
  | { kind: "workshopDiscount"; per: number }
  | { kind: "blendShare"; per: number };

export interface UpgradeDef {
  id: string;
  name: string;
  text: string;
  pay: Color[];
  first: number;
  growth: number;
  max?: number;
  effect: UpgradeEffect;
  /** Needs this many ranks in each listed upgrade first */
  needs?: Record<string, number>;
}

export const UPGRADES: UpgradeDef[] = [
  // Red: strength
  { id: "heavy-stroke", name: "Heavy Stroke", text: "Red rings pay +25%", pay: ["red"], first: 100, growth: 1.6, effect: { kind: "colorYield", color: "red", per: 0.25 } },
  { id: "thick-paint", name: "Thick Paint", text: "Every ring pays +10%", pay: ["red"], first: 2_000, growth: 2.2, effect: { kind: "allYield", per: 0.1 } },
  { id: "hub-weight", name: "Hub Weight", text: "Innermost ring pays +20%", pay: ["red"], first: 5_000, growth: 2.5, effect: { kind: "slotYield", slot: "inner", per: 0.2 } },
  { id: "bold-chime", name: "Bold Chime", text: "Chimes pay +0.5×", pay: ["red"], first: 5_000, growth: 3, max: 10, effect: { kind: "chime", per: 0.5 } },
  // Yellow: speed
  { id: "rim-runner", name: "Rim Runner", text: "Outer ring +10% speed", pay: ["yellow"], first: 50, growth: 2, effect: { kind: "slotSpeed", slot: "outer", per: 0.1 } },
  { id: "quick-yellow", name: "Quick Yellow", text: "Yellow rings +10% speed", pay: ["yellow"], first: 300, growth: 1.8, effect: { kind: "colorSpeed", color: "yellow", per: 0.1 } },
  { id: "light-touch", name: "Light Touch", text: "A tap advances rings 0.5 s more", pay: ["yellow"], first: 1_000, growth: 2.5, max: 10, effect: { kind: "tap", per: 0.5 } },
  { id: "head-start", name: "Head Start", text: "Every turn begins 2% filled", pay: ["yellow"], first: 8_000, growth: 3, max: 15, effect: { kind: "headStart", per: 0.02 } },
  // Blue: thrift
  { id: "thin-coats", name: "Thin Coats", text: "Ring levels cost 3% less", pay: ["blue"], first: 200, growth: 2.4, max: 20, effect: { kind: "levelDiscount", per: 0.03 } },
  { id: "deep-wells", name: "Deep Wells", text: "Offline cap +15 minutes", pay: ["blue"], first: 500, growth: 2, max: 24, effect: { kind: "offlineCap", perMinutes: 15 } },
  { id: "blue-reserve", name: "Blue Reserve", text: "Blue rings earn +10% offline", pay: ["blue"], first: 1_000, growth: 1.8, effect: { kind: "colorOffline", color: "blue", per: 0.1 } },
  { id: "cool-head", name: "Cool Head", text: "Red and yellow upgrades cost 2% less", pay: ["blue"], first: 10_000, growth: 3, max: 15, effect: { kind: "workshopDiscount", per: 0.02 } },
  // Chord: two primaries
  { id: "wet-on-wet", name: "Wet on Wet", text: "Blends carry +2% more", pay: ["yellow", "blue"], first: 3_000, growth: 2.5, max: 10, effect: { kind: "blendShare", per: 0.02 }, needs: { "rim-runner": 3, "thin-coats": 3 } },
];

/** Every tenth rank doubles that upgrade's total bonus. */
export const LANDMARK_EVERY = 10;

// ---------------------------------------------------------------------------
// Paintings: placeholders until the paintings pipeline exists

export interface PaintingDef {
  id: string;
  name: string;
  cost: Cost;
  renown: number;
  /** Bonus while hung: this color's rings and seams pay more */
  bonus: { color: Color; per: number };
}

export const PAINTINGS: PaintingDef[] = [
  { id: "p1", name: "First Light", cost: { red: 60, yellow: 20 }, renown: 5, bonus: { color: "red", per: 0.1 } },
  { id: "p2", name: "Orange Grove", cost: { orange: 15, yellow: 150 }, renown: 6, bonus: { color: "yellow", per: 0.1 } },
  { id: "p3", name: "Quiet Heron", cost: { teal: 20, blue: 400 }, renown: 8, bonus: { color: "teal", per: 0.15 } },
  { id: "p4", name: "Red Boats", cost: { vermilion: 60, orange: 200 }, renown: 10, bonus: { color: "orange", per: 0.15 } },
  { id: "p5", name: "Golden Field", cost: { amber: 150, chartreuse: 80 }, renown: 12, bonus: { color: "yellow", per: 0.2 } },
  { id: "p6", name: "Night Garden", cost: { indigo: 300, magenta: 120 }, renown: 15, bonus: { color: "violet", per: 0.2 } },
];
