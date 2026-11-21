// Headless balance check: a player who checks in constantly and buys greedily.
//   npm run sim              (3 hours, taps every row once a second until apprentices)
//   npm run sim -- 6 0       (6 hours, never taps: only apprentices work)

import { COLORS, STUDIO } from "../src/core/data";
import {
  accept, boostCost, buyBoost, buyLevels, buyStudio, easelDone, hireApprentice, isFull, levelCost, parentsReady,
  rowRate, sell, studioCost, studioVisible, tapAll, tick, tinCost, upgradeTin, unlockRow,
} from "../src/core/game";
import { newGame } from "../src/core/state";

const hours = Number(process.argv[2] ?? 3);
const taps = Number(process.argv[3] ?? 1);
const s = newGame(0);
const log: string[] = [];
const fmtT = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = Math.floor(sec % 60);
  return h ? `${h}h${String(m).padStart(2, "0")}m` : `${m}m${String(x).padStart(2, "0")}s`;
};
const note = (t: number, m: string) => log.push(`${fmtT(t).padStart(7)}  ${m}`);

let t = 0;
let small = 0;
while (t < hours * 3600) {
  if (taps) tapAll(s);
  tick(s, 1);
  t++;

  if (easelDone(s.easel)) {
    const title = s.easel!.title;
    const p = sell(s);
    if (s.stats.sold <= 5 || s.stats.sold % 50 === 0) note(t, `sold "${title}" for ${p} (#${s.stats.sold})`);
  }
  if (!s.easel && s.offers.length) {
    // Best coins per second of the slowest color it needs
    const score = (o: (typeof s.offers)[number]) =>
      o.price / Math.max(1, ...o.layers.map((l) => l.amount / Math.max(1e-9, rowRate(s, l.color))));
    accept(s, [...s.offers].sort((a, b) => score(b) - score(a))[0].id);
  }

  // Big things first
  for (const d of COLORS) {
    const c = d.color;
    if (!s.rows[c].unlocked && parentsReady(s, c) && s.coins >= d.unlock && unlockRow(s, c)) note(t, `unlocked ${c}`);
    if (s.rows[c].unlocked && !s.rows[c].apprentice && s.coins >= d.apprentice && hireApprentice(s, c)) note(t, `hired the ${c} apprentice`);
  }
  for (const u of studioVisible(s)) {
    const c = studioCost(s, u.id);
    if (c !== null && s.coins >= c * 3 && buyStudio(s, u.id)) note(t, `bought ${u.name} ${s.studio[u.id]}`);
  }
  const nextUnlock = COLORS.find((d) => !s.rows[d.color].unlocked && parentsReady(s, d.color));
  const reserve = nextUnlock && nextUnlock.unlock < s.stats.coinsEarned * 0.5 ? nextUnlock.unlock : 0;

  for (let g = 0; g < 40; g++) {
    const options: { cost: number; run: () => boolean }[] = [];
    for (const d of COLORS) {
      const c = d.color;
      if (!s.rows[c].unlocked) continue;
      options.push({ cost: levelCost(s, c, 1), run: () => { const b = s.buy; s.buy = 1; const ok = buyLevels(s, c); s.buy = b; return ok; } });
      const bc = boostCost(s, c);
      if (bc !== null) options.push({ cost: bc * 0.5, run: () => buyBoost(s, c) });
      if (isFull(s, c)) options.push({ cost: tinCost(s, c), run: () => upgradeTin(s, c) });
    }
    const best = options.filter((o) => o.cost <= s.coins - reserve).sort((a, b) => a.cost - b.cost)[0];
    if (!best || !best.run()) break;
    small++;
  }
}

console.log(`Bot, ${hours} h, taps ${taps ? "on" : "off"}: ${s.stats.sold} sold, ${small} small buys\n`);
console.log(log.join("\n"));
console.log("\nRows:", COLORS.filter((d) => s.rows[d.color].unlocked).map((d) => `${d.color}:${s.rows[d.color].level}${s.rows[d.color].apprentice ? "A" : ""}`).join("  "));
console.log("Studio:", JSON.stringify(s.studio), " coins earned", Math.round(s.stats.coinsEarned));
void STUDIO;
