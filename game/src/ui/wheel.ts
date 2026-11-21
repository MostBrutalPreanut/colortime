// Draws one wheel on a canvas. Stand-in art: soft layered strokes in the
// mockup palette until the real watercolor ring textures exist.

import { SWATCH } from "../core/colors";
import { SLOTS } from "../core/data";
import { ringStats, seams } from "../core/game";
import type { GameState } from "../core/state";

export interface WheelGeometry {
  size: number;
  center: number;
  radius: (slot: number) => number;
  band: number;
}

export function geometry(size: number): WheelGeometry {
  const outer = size / 2 - 18;
  const band = Math.max(8, size * 0.05);
  const step = (outer - size * 0.12) / (SLOTS.length - 0.5);
  return { size, center: size / 2, radius: (i) => outer - band / 2 - i * step, band };
}

/** Which ring a point (in css px, relative to the canvas) is on, or -1. */
export function hitRing(g: WheelGeometry, x: number, y: number, rings: number): number {
  const d = Math.hypot(x - g.center, y - g.center);
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < rings; i++) {
    const dist = Math.abs(d - g.radius(i));
    if (dist < bestDist && dist < g.band * 1.4) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}

function wobble(seed: number, a: number): number {
  return Math.sin(a * 3 + seed) * 0.6 + Math.sin(a * 7 + seed * 2) * 0.4;
}

/** A hand-painted looking arc: a pale wide wash under a slightly uneven stroke. */
function paintArc(ctx: CanvasRenderingContext2D, cx: number, r: number, from: number, to: number, color: string, width: number, seed: number) {
  if (to - from <= 0.001) return;
  const steps = Math.max(8, Math.ceil((to - from) * 40));
  const path = (dr: number) => {
    ctx.beginPath();
    for (let k = 0; k <= steps; k++) {
      const a = from + ((to - from) * k) / steps;
      const rr = r + wobble(seed, a) * dr;
      const x = cx + rr * Math.cos(a);
      const y = cx + rr * Math.sin(a);
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
  };
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = width * 1.6;
  path(2.5);
  ctx.stroke();
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = width;
  path(1.2);
  ctx.stroke();
  // darker pooled edge where the wash stops
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = width * 0.35;
  ctx.beginPath();
  const ea = to;
  ctx.arc(cx, cx, r, Math.max(from, ea - 0.08), ea);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawWheel(
  canvas: HTMLCanvasElement,
  s: GameState,
  w: number,
  opts: { selected?: number; mini?: boolean; time: number },
): WheelGeometry {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = canvas.clientWidth;
  if (canvas.width !== Math.round(size * dpr)) {
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const g = geometry(size);
  const cx = g.center;
  const wheel = s.wheels[w];
  const top = -Math.PI / 2;

  // Paper disc with an ink outline and clock ticks
  ctx.fillStyle = "#FBF7EE";
  ctx.strokeStyle = "#3B2A1E";
  ctx.lineWidth = opts.mini ? 2 : 3;
  ctx.beginPath();
  ctx.arc(cx, cx, size / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (!opts.mini) {
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 12; k++) {
      const a = top + (k * Math.PI) / 6;
      const r1 = size / 2 - 7, r2 = size / 2 - (k % 3 === 0 ? 14 : 11);
      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.cos(a), cx + r1 * Math.sin(a));
      ctx.lineTo(cx + r2 * Math.cos(a), cx + r2 * Math.sin(a));
      ctx.stroke();
    }
  }

  for (let i = 0; i < SLOTS.length; i++) {
    const r = g.radius(i);
    const slot = wheel.slots[i];
    if (!slot) {
      // Locked slot: pencil dashes
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = "#B9A684";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cx, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    // Track
    ctx.strokeStyle = "#E6DCC8";
    ctx.lineWidth = g.band;
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.stroke();
    if (!slot.color) continue;
    const st = ringStats(s, w, i)!;
    // Fast rings become a solid glowing band instead of strobing
    const frac = st.turn <= 0.3 ? 1 : slot.turns % 1;
    paintArc(ctx, cx, r, top, top + frac * Math.PI * 2, SWATCH[slot.color], g.band, i * 1.7 + 1);
    if (opts.selected === i) {
      ctx.strokeStyle = "#3B2A1E";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cx, r + g.band / 2 + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Blend seams: dotted lines of the color they make, drifting slowly
  for (const seam of seams(s, w)) {
    const r = (g.radius(seam.outer) + g.radius(seam.outer + 1)) / 2;
    ctx.strokeStyle = SWATCH[seam.color];
    ctx.lineWidth = opts.mini ? 2 : 4;
    ctx.lineCap = "round";
    ctx.setLineDash([0.5, opts.mini ? 6 : 9]);
    ctx.lineDashOffset = -opts.time * 6;
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  // Hand follows the rim ring; wooden hub
  const rim = wheel.slots[0];
  if (rim?.color) {
    const a = top + (rim.turns % 1) * Math.PI * 2;
    ctx.strokeStyle = "#3B2A1E";
    ctx.lineWidth = opts.mini ? 2.5 : 4.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, cx);
    ctx.lineTo(cx + (g.radius(0) + 4) * Math.cos(a), cx + (g.radius(0) + 4) * Math.sin(a));
    ctx.stroke();
  }
  const hub = size * 0.065;
  const grad = ctx.createRadialGradient(cx - hub / 3, cx - hub / 3, 1, cx, cx, hub);
  grad.addColorStop(0, "#C79669");
  grad.addColorStop(1, "#7A4E2E");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "#3B2A1E";
  ctx.lineWidth = opts.mini ? 2 : 3;
  ctx.beginPath();
  ctx.arc(cx, cx, hub, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  return g;
}
