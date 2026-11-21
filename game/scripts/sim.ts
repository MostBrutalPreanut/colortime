// Headless balance check: an idle player who checks in constantly and buys
// greedily. Prints when each milestone happens.
//   npm run sim            (3 hours, no tapping)
//   npm run sim -- 24 2    (24 hours, 2 taps per second)

import type { Color } from "../src/core/colors";
import { PAINTINGS, UPGRADES, type Cost } from "../src/core/data";
import {
  buildWheel, buyColor, buyLevels, buyUpgrade, canAfford, colorUnlockCost, colorsForSale, currentPainting,
  incomeByColor, levelCost, openSlot, paint, place, slotUnlockCost, tap, tick, upgradeCost, upgradeVisible,
  wheelUnlockCost,
} from "../src/core/game";
import { newGame, type GameState } from "../src/core/state";

const hours = Number(process.argv[2] ?? 3);
const tapsPerSecond = Number(process.argv[3] ?? 0);

/** Ring layout the bot aims for on each wheel, outer to inner. */
const PLAN: Color[] = ["red", "yellow", "blue", "green", "blue", "violet"];

const s: GameState = newGame(0);
const log: string[] = [];
const fmtT = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = Math.floor(sec % 60);
  return h ? `${h}h${String(m).padStart(2, "0")}m` : `${m}m${String(x).padStart(2, "0")}s`;
};
const note = (t: number, msg: string) => log.push(`${fmtT(t).padStart(7)}  ${msg}`);

/** Seconds of income this cost represents; lower is a better buy. */
function weight(cost: Cost): number {
  const inc = incomeByColor(s);
  return Math.max(...Object.entries(cost).map(([c, n]) => (n ?? 0) / Math.max(1e-9, inc[c as Color] ?? 0)));
}

let t = 0;
const seenOwned = new Set(s.owned);
const end = hours * 3600;
let purchases = 0;
while (t < end) {
  tick(s, 1);
  for (let k = 0; k < tapsPerSecond; k++) tap(s, 0);
  t++;

  for (const c of s.owned) if (!seenOwned.has(c)) { seenOwned.add(c); note(t, `discovered ${c}`); }

  // Big goals first: colors, slots, wheels, paintings
  for (const c of colorsForSale(s)) if (buyColor(s, c)) note(t, `bought ${c}`);
  s.wheels.forEach((w, wi) => {
    if (slotUnlockCost(s, wi) && canAfford(s, slotUnlockCost(s, wi)!) && openSlot(s, wi)) note(t, `wheel ${wi + 1}: opened slot ${w.slots.length}`);
    w.slots.forEach((slot, i) => {
      const want = PLAN[i];
      if (slot.color !== want && s.owned.includes(want)) place(s, wi, i, want);
      else if (!slot.color) {
        const fallback = [...s.owned].reverse().find((c) => c !== w.slots[i - 1]?.color);
        if (fallback) place(s, wi, i, fallback);
      }
    });
  });
  const wc = wheelUnlockCost(s);
  if (wc && canAfford(s, wc) && buildWheel(s)) note(t, `built wheel ${s.wheels.length}`);
  const p = currentPainting(s);
  if (p && canAfford(s, p.cost) && paint(s)) note(t, `painted "${p.name}" (${s.painting}/${PAINTINGS.length})`);

  // Reserve for the next big goal so small buys don't starve it
  const goals: Cost[] = [];
  const nextColor = colorsForSale(s)[0];
  if (nextColor) goals.push(colorUnlockCost(nextColor)!);
  s.wheels.forEach((_, wi) => { const c = slotUnlockCost(s, wi); if (c) goals.push(c); });
  if (p) goals.push(p.cost);
  const reserved = (color: Color) => goals.some((g) => (g[color] ?? 0) > 0 && weight(g) < 600);

  // Then the cheapest small buy, measured in seconds of income
  for (let guard = 0; guard < 50; guard++) {
    let best: { w: number; run: () => boolean } | null = null;
    s.wheels.forEach((wheel, wi) => wheel.slots.forEach((slot, i) => {
      const c = levelCost(s, wi, i);
      if (c && slot.color && canAfford(s, c) && !reserved(slot.color)) {
        const w = weight(c);
        if (!best || w < best.w) best = { w, run: () => buyLevels(s, wi, i, 1) };
      }
    }));
    for (const u of UPGRADES) {
      const c = upgradeCost(s, u);
      if (c && upgradeVisible(s, u) && canAfford(s, c) && !u.pay.some(reserved)) {
        const w = weight(c) * 0.8;
        if (!best || w < best.w) best = { w, run: () => buyUpgrade(s, u.id) };
      }
    }
    if (!best || !(best as { run: () => boolean }).run()) break;
    purchases++;
  }
}

console.log(`Idle bot, ${hours} h, ${tapsPerSecond} taps/s, ${purchases} small purchases\n`);
console.log(log.join("\n"));
console.log("\nWheel 1 at the end:");
s.wheels[0].slots.forEach((sl, i) => console.log(`  slot ${i + 1}: ${sl.color ?? "-"} level ${sl.level}`));
console.log("\nWorkshop:", JSON.stringify(s.workshop));
