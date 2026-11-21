// The painter's 12-hue wheel. Even positions can sit in a ring (primaries and
// secondaries); odd positions are paint colors that only appear in seams.

export const HUES = [
  "red", "vermilion", "orange", "amber", "yellow", "chartreuse",
  "green", "teal", "blue", "indigo", "violet", "magenta",
] as const;

export type Color = (typeof HUES)[number];

export const PRIMARIES: Color[] = ["red", "yellow", "blue"];
export const SECONDARIES: Color[] = ["orange", "green", "violet"];
export const PAINTS: Color[] = ["vermilion", "amber", "chartreuse", "teal", "indigo", "magenta"];

export type ColorJob = "grow" | "research" | "paint";

export function jobOf(c: Color): ColorJob {
  if (PRIMARIES.includes(c)) return "grow";
  if (SECONDARIES.includes(c)) return "research";
  return "paint";
}

export const isPlaceable = (c: Color) => HUES.indexOf(c) % 2 === 0;

/** Stand-in swatches, taken from the chosen mockups' muted palette. */
export const SWATCH: Record<Color, string> = {
  red: "#C2503C",
  vermilion: "#CF6A3F",
  orange: "#D98A45",
  amber: "#DDA143",
  yellow: "#E2B84A",
  chartreuse: "#A9B356",
  green: "#6F9A5C",
  teal: "#4E8C88",
  blue: "#4F78AE",
  indigo: "#4F5A9C",
  violet: "#7C5A9A",
  magenta: "#A9507E",
};

function hueDistance(a: Color, b: Color): number {
  const d = Math.abs(HUES.indexOf(a) - HUES.indexOf(b));
  return Math.min(d, 12 - d);
}

function midpoint(a: Color, b: Color): Color {
  const ia = HUES.indexOf(a);
  const ib = HUES.indexOf(b);
  // Walk the short way round from a to b
  const forward = (ib - ia + 12) % 12;
  const step = forward <= 6 ? forward / 2 : -(12 - forward) / 2;
  return HUES[(ia + step + 12) % 12];
}

export type Seam =
  | { kind: "blend"; color: Color }
  | { kind: "contrast" }
  | { kind: "none" };

/**
 * What two touching rings make:
 * - two primaries make the secondary between them (red + yellow = orange)
 * - a primary next to its neighbouring secondary makes a paint color (blue + green = teal)
 * - opposites contrast instead (red + green), which makes both chime harder
 */
export function seamBetween(a: Color, b: Color): Seam {
  const d = hueDistance(a, b);
  if (d === 6) return { kind: "contrast" };
  const bothPrimary = PRIMARIES.includes(a) && PRIMARIES.includes(b);
  if (d === 4 && bothPrimary) return { kind: "blend", color: midpoint(a, b) };
  const onePrimary = PRIMARIES.includes(a) !== PRIMARIES.includes(b);
  if (d === 2 && onePrimary) return { kind: "blend", color: midpoint(a, b) };
  return { kind: "none" };
}
