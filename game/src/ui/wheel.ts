// The color wheel: one ring per unlocked color, filling as that row's turn
// runs. A picture of the studio, and a big button that starts every idle row.

import { SWATCH } from "../core/colors";
import { COLORS } from "../core/data";
import { turnTime } from "../core/game";
import type { GameState } from "../core/state";

function wobble(seed: number, a: number) {
  return Math.sin(a * 3 + seed) * 0.6 + Math.sin(a * 7 + seed * 2) * 0.4;
}

function paintArc(ctx: CanvasRenderingContext2D, cx: number, r: number, from: number, to: number, color: string, width: number, seed: number) {
  if (to - from <= 0.001) return;
  const steps = Math.max(8, Math.ceil((to - from) * 40));
  const path = (dr: number) => {
    ctx.beginPath();
    for (let k = 0; k <= steps; k++) {
      const a = from + ((to - from) * k) / steps;
      const rr = r + wobble(seed, a) * dr;
      k ? ctx.lineTo(cx + rr * Math.cos(a), cx + rr * Math.sin(a)) : ctx.moveTo(cx + rr * Math.cos(a), cx + rr * Math.sin(a));
    }
  };
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = width * 1.6;
  path(2);
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = width;
  path(1);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawWheel(canvas: HTMLCanvasElement, s: GameState, time: number): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  // Keep the wheel round: size it to the smaller side of the space it sits in
  const area = canvas.parentElement!;
  const size = Math.floor(Math.min(area.clientWidth, area.clientHeight));
  if (size <= 0) return;
  if (canvas.style.width !== `${size}px`) {
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
  }
  if (canvas.width !== Math.round(size * dpr)) {
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const top = -Math.PI / 2;

  ctx.fillStyle = "#FBF7EE";
  ctx.strokeStyle = "#3B2A1E";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cx, size / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 12; k++) {
    const a = top + (k * Math.PI) / 6;
    const r1 = size / 2 - 7, r2 = size / 2 - (k % 3 === 0 ? 13 : 10);
    ctx.beginPath();
    ctx.moveTo(cx + r1 * Math.cos(a), cx + r1 * Math.sin(a));
    ctx.lineTo(cx + r2 * Math.cos(a), cx + r2 * Math.sin(a));
    ctx.stroke();
  }

  const rings = COLORS.filter((d) => s.rows[d.color].unlocked);
  const outer = size / 2 - 20;
  const inner = size * 0.1;
  const slots = Math.max(3, rings.length);
  const step = (outer - inner) / slots;
  const band = Math.min(step * 0.72, size * 0.06);
  rings.forEach((d, i) => {
    const r = outer - step * i - step / 2;
    const row = s.rows[d.color];
    ctx.strokeStyle = "#E6DCC8";
    ctx.lineWidth = band;
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.stroke();
    if (row.running < 0) return;
    const turn = turnTime(s, d.color);
    const frac = turn < 0.3 ? 1 : row.running / turn;
    paintArc(ctx, cx, r, top, top + frac * Math.PI * 2, SWATCH[d.color], band, i * 1.7 + 1);
  });

  // Hand follows the fastest running row; wooden hub
  const lead = rings.find((d) => s.rows[d.color].running >= 0);
  const a = lead ? top + (s.rows[lead.color].running / turnTime(s, lead.color)) * Math.PI * 2 : top + Math.sin(time) * 0.05;
  ctx.strokeStyle = "#3B2A1E";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cx);
  ctx.lineTo(cx + outer * Math.cos(a), cx + outer * Math.sin(a));
  ctx.stroke();
  const hub = size * 0.07;
  const grad = ctx.createRadialGradient(cx - hub / 3, cx - hub / 3, 1, cx, cx, hub);
  grad.addColorStop(0, "#C79669");
  grad.addColorStop(1, "#7A4E2E");
  ctx.fillStyle = grad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cx, hub, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
