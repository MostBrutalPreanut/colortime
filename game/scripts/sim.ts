// Headless balance check: a player who checks in constantly and buys greedily.
//   npm run sim            (3 hours, no tapping)
//   npm run sim -- 24 2    (24 hours, 2 taps per second)

import { isPlaceable, type Color } from "../src/core/colors";
import { BACKGROUNDS, PIECES, UPGRADES, type Cost } from "../src/core/data";
import {
  brushRate, buildWheel, buyLevels, currentLayer, ringStats, buyTube, buyUpgrade, canAfford, compose, easelDone, incomeByColor, isFull, levelCost,
  openSlot, place, paintNext, salePrice, sell, slotUnlockCost, tap, tick, tinCost, tubeCost, tubesForSale,
  upgradeCost, upgradeTin, upgradeVisible, wheelUnlockCost,
} from "../src/core/game";
import { newGame, type GameState } from "../src/core/state";

const hours = Number(process.argv[2] ?? 3);
const tapsPerSecond = Number(process.argv[3] ?? 0);
const PLAN: Color[] = ["red", "yellow", "blue", "green", "blue", "violet"];

const s: GameState = newGame(0);
const log: string[] = [];
const fmtT = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = Math.floor(sec % 60);
  return h ? `${h}h${String(m).padStart(2, "0")}m` : `${m}m${String(x).padStart(2, "0")}s`;
};
const note = (t: number, msg: string) => log.push(`${fmtT(t).padStart(7)}  ${msg}`);
const coins = (c: Cost | null) => c?.coins ?? Infinity;

/** Best composition the bot can paint with colors it is making: coins per second of painting. */
function bestComposition() {
  const inc = incomeByColor(s);
  let best: { bg: string; pieces: string[]; score: number } | null = null;
  const ok = (layers: { color: Color }[]) => layers.every((l) => (inc[l.color] ?? 0) > 0);
  for (const bg of BACKGROUNDS) {
    if (!ok(bg.layers)) continue;
    for (const a of PIECES) for (const b of [null, ...PIECES]) {
      if (b && b.id <= a.id) continue;
      const pieces = b ? [a.id, b.id] : [a.id];
      const e = compose(s, { bg: bg.id, pieces, title: "" });
      if (!ok(e.layers)) continue;
      // Time limited by the slowest color's supply
      const need: Partial<Record<Color, number>> = {};
      for (const l of e.layers) need[l.color] = (need[l.color] ?? 0) + l.amount;
      const total = e.layers.reduce((n, l) => n + l.amount, 0);
      const secs = Math.max(total / brushRate(s), ...Object.entries(need).map(([c, n]) => n! / (inc[c as Color] ?? 1e-9)));
      const score = salePrice(s, e) / secs;
      if (!best || score > best.score) best = { bg: bg.id, pieces, score };
    }
  }
  return best;
}

let t = 0;
const seen = new Set(s.owned);
let small = 0;
let sold = 0;
while (t < hours * 3600) {
  tick(s, 1);
  for (let k = 0; k < tapsPerSecond; k++) tap(s, 0);
  t++;
  for (const c of s.owned) if (!seen.has(c)) { seen.add(c); note(t, `got ${c}`); }

  if (easelDone(s.easel)) {
    const title = s.easel!.comp.title;
    const p = sell(s);
    sold++;
    if (sold <= 4 || sold % 100 === 0) note(t, `sold "${title}" for ${p} (#${sold})`);
  }
  if (s.painted >= 3 && (t % 30 === 0 || !s.easel)) {
    const b = bestComposition();
    if (b) paintNext(s, { bg: b.bg, pieces: b.pieces, title: `${b.bg}+${b.pieces.join("+")}` });
  }

  for (const c of tubesForSale(s)) if (canAfford(s, tubeCost(c)!) && buyTube(s, c)) note(t, `bought a ${c} tube`);
  s.wheels.forEach((w, wi) => {
    const oc = slotUnlockCost(s, wi);
    if (oc && canAfford(s, oc) && openSlot(s, wi)) note(t, `wheel ${wi + 1}: opened ring ${w.slots.length}`);
    w.slots.forEach((slot, i) => {
      const want = PLAN[i];
      const busy = currentLayer(s.easel);
      const keep = busy && slot.color === busy.color && !(incomeByColor(s)[busy.color]! > (ringStats(s, wi, i)?.rate ?? 0));
      if (slot.color !== want && s.owned.includes(want) && !keep) place(s, wi, i, want);
      else if (!slot.color) {
        const fallback = [...s.owned].reverse().find((c) => c !== w.slots[i - 1]?.color && ["red", "yellow", "blue", "orange", "green", "violet"].includes(c));
        if (fallback) place(s, wi, i, fallback);
      }
    });
  });
  // Like a player would: if the easel waits on a color nothing grinds, swap a ring to it
  const waiting = currentLayer(s.easel);
  const inc = incomeByColor(s);
  if (waiting && !(inc[waiting.color] ?? 0) && s.owned.includes(waiting.color) && isPlaceable(waiting.color)) {
    const needed = new Set(s.easel!.layers.filter((l) => l.done < l.amount).map((l) => l.color));
    const w0 = s.wheels[0].slots;
    const i = w0.findIndex((x) => !x.color || !needed.has(x.color));
    if (i >= 0) { place(s, 0, i, waiting.color); note(t, `swapped ring ${i + 1} to ${waiting.color}`); }
  }
  const wc = wheelUnlockCost(s);
  if (wc && canAfford(s, wc) && buildWheel(s)) note(t, `built wheel ${s.wheels.length}`);

  // Save for the next big goal before spending on small things
  const goals = [
    ...tubesForSale(s).map((c) => coins(tubeCost(c))),
    ...s.wheels.map((_, wi) => coins(slotUnlockCost(s, wi))),
    coins(wheelUnlockCost(s)),
  ].filter(isFinite);
  const reserve = goals.length ? Math.min(...goals) : 0;
  const income = s.stats.coinsEarned / Math.max(1, t);
  const spendable = () => (reserve / Math.max(income, 1e-9) < 300 ? s.coins - reserve : s.coins);

  for (let guard = 0; guard < 50; guard++) {
    const options: { c: number; run: () => boolean }[] = [];
    s.wheels.forEach((wheel, wi) => wheel.slots.forEach((slot, i) => {
      if (slot.color) options.push({ c: coins(levelCost(s, wi, i)), run: () => buyLevels(s, wi, i, 1) });
    }));
    for (const u of UPGRADES) if (upgradeVisible(s, u)) options.push({ c: coins(upgradeCost(s, u)) * 0.7, run: () => buyUpgrade(s, u.id) });
    for (const c of s.owned) if (isFull(s, c)) options.push({ c: coins(tinCost(s, c)) * 1.5, run: () => upgradeTin(s, c) });
    const best = options.filter((o) => o.c <= spendable()).sort((a, b) => a.c - b.c)[0];
    if (!best || !best.run()) break;
    small++;
  }
}

console.log(`Bot, ${hours} h, ${tapsPerSecond} taps/s: ${sold} paintings sold, ${small} small purchases\n`);
console.log(log.join("\n"));
console.log("\nWheel 1:", s.wheels[0].slots.map((x) => `${x.color}:${x.level}`).join("  "));
console.log("Workshop:", JSON.stringify(s.workshop));
console.log("Tin levels:", JSON.stringify(Object.fromEntries(Object.entries(s.tin).filter(([, v]) => v))));
console.log(`Coins earned ${Math.round(s.stats.coinsEarned)}, paint spilled ${Math.round(s.stats.spilled)}`);
