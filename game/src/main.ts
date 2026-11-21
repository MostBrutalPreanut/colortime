import "./ui/style.css";
import { SWATCH, type Color } from "./core/colors";
import { COLORS, HOOKS, STUDIO, TUTORIAL, colorDef, type Tier } from "./core/data";
import {
  accept, batchSize, boostCost, buyBoost, buyCount, buyLevels, buyStudio, catchUp, decline, easelDone,
  fillOffers, hang, hireApprentice, inputPerParent, isFull, levelCost, missingParent, nextMilestone, parentsReady,
  salePrice, sell, studioCost, studioVisible, tapAll, tapRow, tick, tinCap, tinCost, turnTime, unhang, unlockRow,
  upgradeTin, type Delivery,
} from "./core/game";
import { load, newGame, save, wipe, type GameState } from "./core/state";
import { cap, fmt, fmtTime } from "./ui/format";
import { drawWheel } from "./ui/wheel";

let s: GameState = load() ?? newGame();
let offline = catchUp(s, Date.now());
fillOffers(s);

type Modal = null | "studio" | "gallery" | "more" | "offline";
const ui = { tier: 1 as Tier, modal: (offline.seconds > 0 ? "offline" : null) as Modal };
const app = document.getElementById("app")!;

// ---------------------------------------------------------------------------
// Helpers

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const dot = (c: Color, size = 14) => `<span class="dot" style="--c:${SWATCH[c]};--s:${size}px"></span>`;
const coin = (size = 14) => `<span class="coin" style="--s:${size}px"></span>`;
const TIER_NAMES: Record<Tier, string> = { 1: "Primaries", 2: "Mixes", 3: "Paints" };

function shape(el: Element, key: string, html: () => string) {
  const n = el as HTMLElement;
  if (n.dataset.key !== key) { n.innerHTML = html(); n.dataset.key = key; }
}

const vals = new Map<string, string>();
const off = new Map<string, boolean>();
const nums = new Map<string, number>();
const flags = new Map<string, boolean>();
function applyLive() {
  app.querySelectorAll<HTMLElement>("[data-v]").forEach((el) => { const v = vals.get(el.dataset.v!); if (v !== undefined && el.textContent !== v) el.textContent = v; });
  app.querySelectorAll<HTMLElement>("[data-d]").forEach((el) => { const d = off.get(el.dataset.d!); if (d !== undefined) el.classList.toggle("off", d); });
  app.querySelectorAll<HTMLElement>("[data-n]").forEach((el) => { const n = nums.get(el.dataset.n!); if (n !== undefined) el.style.setProperty("--p", String(Math.max(0, Math.min(1, n)))); });
  app.querySelectorAll<HTMLElement>("[data-f]").forEach((el) => { for (const pair of el.dataset.f!.split(" ")) { const [k, c] = pair.split("|"); el.classList.toggle(c, !!flags.get(k)); } });
}

// ---------------------------------------------------------------------------
// Layout: one screen, no scrolling

app.innerHTML = `
  <div class="paper"></div>
  <header class="top">
    <div class="purse">${coin(20)}<b data-v="coins"></b></div>
    <button class="tag" data-a="buymode" aria-label="Buy amount"><small>Buy</small><b data-v="buymode"></b></button>
    <button class="icon" data-a="modal:studio" aria-label="Studio upgrades">Studio<i class="pip" data-v="studio-pip"></i></button>
    <button class="icon" data-a="modal:gallery" aria-label="Gallery">Gallery<i class="pip muted" data-v="hung"></i></button>
    <button class="icon slim" data-a="modal:more" aria-label="More">⋯</button>
  </header>
  <section class="easel" id="easel"></section>
  <section class="wheel-area">
    <canvas class="wheel" id="wheel" aria-label="Color wheel. Tap to start every idle row."></canvas>
    <div class="coach" id="coach" data-v="coach"></div>
  </section>
  <nav class="tiers" id="tiers"></nav>
  <section class="rows" id="rows"></section>
  <div id="modal"></div>
  <div id="toast"></div>
`;
const easelEl = app.querySelector("#easel")!;
const tiersEl = app.querySelector("#tiers")!;
const rowsEl = app.querySelector("#rows")!;
const modalEl = app.querySelector("#modal")!;
const toastEl = app.querySelector("#toast") as HTMLElement;
const canvas = app.querySelector("#wheel") as HTMLCanvasElement;

function toast(text: string) {
  toastEl.textContent = text;
  toastEl.classList.remove("show");
  void toastEl.offsetWidth;
  toastEl.classList.add("show");
}

// ---------------------------------------------------------------------------
// Easel strip: the current commission, or the offers to choose from

function renderEasel() {
  const e = s.easel;
  if (e) {
    const done = easelDone(e);
    shape(easelEl, `e|${e.id}|${done}|${s.hung.length}`, () => `
      <div class="thumb">${e.layers.map((l, i) => `<span class="band" style="--c:${SWATCH[l.color]}" data-n="layer:${i}"></span>`).join("")}</div>
      <div class="e-mid">
        <div class="e-title">${esc(e.title)}</div>
        ${done
          ? `<div class="e-actions"><button class="btn gold" data-a="sell">Sell <span data-v="price"></span></button><button class="btn" data-a="hang" data-d="hang">Hang ${s.hung.length}/${HOOKS}</button></div>`
          : `<div class="needs">${e.layers.map((l, i) => `<span class="need" data-f="short:${i}|short">${dot(l.color, 12)}<b data-v="need:${i}"></b></span>`).join("")}</div>`}
      </div>`);
    return;
  }
  shape(easelEl, `o|${s.offers.map((o) => o.id).join(",")}`, () => `
    <div class="offers">${s.offers.map((o) => `
      <div class="offer">
        <button class="offer-main" data-a="accept:${o.id}">
          <span class="o-title">${esc(o.title)}</span>
          <span class="o-needs">${o.layers.map((l) => `${dot(l.color, 10)}${fmt(l.amount)}`).join(" ")}</span>
          <span class="o-price">${coin(12)} ${fmt(salePrice(s, o))}</span>
        </button>
        ${s.painted >= TUTORIAL.length ? `<button class="o-skip" data-a="decline:${o.id}" aria-label="Swap this commission">↻</button>` : ""}
      </div>`).join("")}
    </div>`);
}

function easelValues() {
  const e = s.easel;
  if (!e) return;
  e.layers.forEach((l, i) => {
    nums.set(`layer:${i}`, l.done / l.amount);
    vals.set(`need:${i}`, `${fmt(l.done)}/${fmt(l.amount)}`);
    flags.set(`short:${i}`, l.done < l.amount && s.pigment[l.color] < 1 && s.rows[l.color].running < 0);
  });
  vals.set("price", `${fmt(salePrice(s, e))}`);
  off.set("hang", s.hung.length >= HOOKS);
}

// ---------------------------------------------------------------------------
// Color rows

const visibleTiers = (): Tier[] =>
  ([1, 2, 3] as Tier[]).filter((t) => t === 1 || COLORS.some((d) => d.tier === t && (s.rows[d.color].unlocked || parentsReady(s, d.color))));

type Extra = { kind: "hire" | "boost" | "well"; cost: number; label: string } | null;

/** The one contextual action a row offers besides leveling up. */
function extraFor(c: Color): Extra {
  const row = s.rows[c];
  if (!row.unlocked) return null;
  if (!row.apprentice) return { kind: "hire", cost: colorDef(c).apprentice, label: "Hire" };
  if (isFull(s, c)) return { kind: "well", cost: tinCost(s, c), label: "Well ×2" };
  const b = boostCost(s, c);
  if (b !== null && s.coins >= b * 0.3) return { kind: "boost", cost: b, label: "×2" };
  return null;
}

function renderRows() {
  const tiers = visibleTiers();
  if (!tiers.includes(ui.tier)) ui.tier = 1;
  shape(tiersEl, tiers.join(",") + ui.tier, () =>
    tiers.length > 1 ? tiers.map((t) => `<button class="tier ${t === ui.tier ? "on" : ""}" data-a="tier:${t}">${TIER_NAMES[t]}<i class="pip" data-v="tierpip:${t}"></i></button>`).join("") : "");
  const list = COLORS.filter((d) => d.tier === ui.tier);
  const key = list.map((d) => `${d.color}:${s.rows[d.color].unlocked ? 1 : parentsReady(s, d.color) ? 0 : -1}`).join(",");
  shape(rowsEl, key, () => list.map((d) => {
    const c = d.color;
    const row = s.rows[c];
    const recipe = d.recipe.length ? `${d.recipe.map((p) => dot(p, 10)).join("+")}` : "";
    if (!row.unlocked) {
      const ready = parentsReady(s, c);
      return `<div class="row locked ${ready ? "" : "hidden"}">
        <span class="dial">${dot(c, 26)}</span>
        <div class="row-mid"><div class="row-name">${cap(c)} ${recipe}</div><div class="row-sub">${ready ? "a new color" : "unlock its parents first"}</div></div>
        ${ready ? `<button class="buy" data-a="unlock:${c}" data-d="unlock:${c}"><small>Unlock</small><b>${coin(11)}${fmt(d.unlock)}</b></button>` : ""}
      </div>`;
    }
    return `<div class="row" data-color="${c}">
      <button class="dial" data-a="tap:${c}" style="--c:${SWATCH[c]}" data-n="turn:${c}" data-f="idle:${c}|idle" aria-label="Turn ${c}"><b data-v="lvl:${c}"></b></button>
      <div class="row-mid">
        <div class="row-name">${cap(c)} ${recipe} <span class="row-sub" data-v="sub:${c}"></span></div>
        <div class="tinbar" data-f="full:${c}|full"><span style="--c:${SWATCH[c]}" data-n="tin:${c}"></span><em data-v="tin:${c}"></em></div>
      </div>
      <button class="pill" data-a="extra:${c}" data-d="extra:${c}" data-f="noextra:${c}|gone"><small data-v="xl:${c}"></small><b data-v="xc:${c}"></b></button>
      <button class="buy" data-a="buy:${c}" data-d="buy:${c}"><small data-v="bn:${c}"></small><b data-v="bc:${c}"></b></button>
    </div>`;
  }).join(""));
}

function rowValues() {
  for (const d of COLORS) {
    const c = d.color;
    const row = s.rows[c];
    if (!row.unlocked) { off.set(`unlock:${c}`, s.coins < d.unlock || !parentsReady(s, c)); continue; }
    const turn = turnTime(s, c);
    nums.set(`turn:${c}`, row.running < 0 ? 0 : turn < 0.3 ? 1 : row.running / turn);
    flags.set(`idle:${c}`, row.running < 0 && !row.apprentice);
    vals.set(`lvl:${c}`, String(row.level));
    const miss = missingParent(s, c);
    const ms = nextMilestone(s, c);
    vals.set(`sub:${c}`, row.running < 0 && miss
      ? `needs ${fmt(inputPerParent(s, c))} ${miss}`
      : `+${fmt(batchSize(s, c))} / ${turn < 1 ? turn.toFixed(1) + "s" : fmtTime(turn)}${ms ? ` · ×2 at ${ms}` : ""}`);
    nums.set(`tin:${c}`, s.pigment[c] / tinCap(s, c));
    vals.set(`tin:${c}`, `${fmt(s.pigment[c])}/${fmt(tinCap(s, c))}`);
    flags.set(`full:${c}`, isFull(s, c));
    const n = buyCount(s, c);
    const cost = levelCost(s, c, n);
    vals.set(`bn:${c}`, `Buy ×${n}`);
    vals.set(`bc:${c}`, fmt(cost));
    off.set(`buy:${c}`, s.coins < cost);
    const x = extraFor(c);
    flags.set(`noextra:${c}`, !x);
    if (x) { vals.set(`xl:${c}`, x.label); vals.set(`xc:${c}`, fmt(x.cost)); off.set(`extra:${c}`, s.coins < x.cost); }
  }
  for (const t of [1, 2, 3] as Tier[]) {
    const n = COLORS.filter((d) => d.tier === t).filter((d) => {
      const r = s.rows[d.color];
      if (!r.unlocked) return parentsReady(s, d.color) && s.coins >= d.unlock;
      const x = extraFor(d.color);
      return x !== null && s.coins >= x.cost;
    }).length;
    vals.set(`tierpip:${t}`, n && t !== ui.tier ? String(n) : "");
  }
}

// ---------------------------------------------------------------------------
// Coach: one line telling a new player what to do next

function coach(): string {
  const r = s.rows;
  if (s.easel && !easelDone(s.easel)) {
    const need = s.easel.layers.find((l) => l.done < l.amount);
    if (need && !r[need.color].apprentice && r[need.color].running < 0 && s.pigment[need.color] < 1) return `Tap ${need.color} (or the wheel) to make paint`;
  }
  if (easelDone(s.easel)) return "Painting done: sell it for coins, or hang it";
  if (s.easel) {
    const waiting = s.easel.layers.find((l) => l.done < l.amount);
    const full = s.easel.layers.find((l) => l.done >= l.amount && isFull(s, l.color));
    if (waiting && full && !r[waiting.color].apprentice) return `${cap(full.color)} is full: the painting is waiting on ${waiting.color}`;
  }
  if (!s.easel && s.painted < 2) return "Pick a commission above";
  if (!r.yellow.unlocked && s.coins >= colorDef("yellow").unlock) return "Unlock yellow";
  if (!r.red.apprentice && s.coins >= colorDef("red").apprentice) return "Hire the red apprentice: red keeps turning by itself";
  return "";
}

// ---------------------------------------------------------------------------
// Modals

function studioHtml() {
  const rows = studioVisible(s).map((u) => {
    const cost = studioCost(s, u.id);
    const r = s.studio[u.id] ?? 0;
    return `<div class="up"><div class="up-text"><b>${esc(u.name)} ${r ? `<span class="rank">${r}</span>` : ""}</b><span>${esc(u.text)}</span></div>
      ${cost !== null ? `<button class="buy" data-a="studio:${u.id}" data-d="studio:${u.id}"><b>${coin(11)}${fmt(cost)}</b></button>` : `<span class="maxed">Done</span>`}</div>`;
  }).join("");
  const next = STUDIO.filter((u) => s.painted < u.after).sort((a, b) => a.after - b.after)[0];
  return `<h3 class="hand">Studio</h3><div class="ups">${rows || ""}</div>
    ${next ? `<p class="hint">More after ${next.after} paintings.</p>` : ""}
    <button class="btn wide" data-a="close">Close</button>`;
}

function galleryHtml() {
  const rows = s.hung.map((h, i) => `<div class="up"><div class="up-text"><b>${esc(h.title)}</b><span>${h.colors.map((c) => dot(c, 12)).join(" ")} turn 10% faster</span></div><button class="buy" data-a="unhang:${i}"><b>Take down</b></button></div>`).join("");
  return `<h3 class="hand">Gallery</h3><p class="hint">${s.hung.length}/${HOOKS} hooks · ${s.painted} painted · ${s.stats.sold} sold</p><div class="ups">${rows || `<p class="hint">Hang a finished painting to make its colors turn faster for good.</p>`}</div><button class="btn wide" data-a="close">Close</button>`;
}

function moreHtml() {
  return `<h3 class="hand">Prototype</h3>
    <p class="hint">Stand-in art, placeholder paintings. Saves on this device. Played ${Math.round(s.stats.playSeconds / 60)} min · ${s.stats.taps} taps · ${fmt(s.stats.coinsEarned)} coins earned · ${fmt(s.stats.spilled)} paint spilled.</p>
    <button class="btn wide" data-a="cheat">Skip 10 minutes (testing)</button>
    <button class="btn wide danger" data-a="reset">Start over</button>
    <button class="btn wide gold" data-a="close">Close</button>`;
}

function offlineHtml() {
  const rows = (Object.entries(offline.gained) as [Color, number][]).map(([c, n]) => `<span class="need">${dot(c, 12)}<b>+${fmt(n)}</b></span>`).join("");
  return `<h3 class="hand">While you were away</h3>
    <p class="hint">${fmtTime(offline.seconds)} at half speed${offline.paintings ? ` · ${offline.paintings} paintings` : ""}${offline.coins ? ` · ${fmt(offline.coins)} coins` : ""}</p>
    <div class="needs">${rows || "<span class='hint'>Hire apprentices so rows keep turning while you're away.</span>"}</div>
    <button class="btn wide gold" data-a="close">Collect</button>`;
}

function renderModal() {
  const m = ui.modal;
  const key = m === "studio" ? `studio|${studioVisible(s).map((u) => `${u.id}:${s.studio[u.id] ?? 0}`).join(",")}` : m === "gallery" ? `g|${s.hung.length}` : String(m);
  shape(modalEl, key, () => {
    if (!m) return "";
    const body = { studio: studioHtml, gallery: galleryHtml, more: moreHtml, offline: offlineHtml }[m]();
    return `<div class="scrim" data-a="close"></div><div class="card" role="dialog">${body}</div>`;
  });
}

// ---------------------------------------------------------------------------
// Input

app.addEventListener("click", (ev) => {
  const el = (ev.target as Element).closest<HTMLElement>("[data-a]");
  if (!el) return;
  const [a, arg] = el.dataset.a!.split(":");
  const c = arg as Color;
  const short = () => toast("Not enough coins yet");
  switch (a) {
    case "tap": if (!tapRow(s, c)) { const m = missingParent(s, c); toast(s.rows[c].running >= 0 ? `${cap(c)} is already turning` : m ? `Needs ${m} in the tin` : ""); } break;
    case "buy": if (!buyLevels(s, c)) short(); break;
    case "unlock": if (unlockRow(s, c)) toast(`${cap(c)} unlocked`); else short(); break;
    case "extra": {
      const x = extraFor(c);
      if (!x) break;
      const ok = x.kind === "hire" ? hireApprentice(s, c) : x.kind === "well" ? upgradeTin(s, c) : buyBoost(s, c);
      if (!ok) short();
      else toast(x.kind === "hire" ? `${cap(c)} apprentice hired: it keeps turning` : x.kind === "well" ? `${cap(c)} well holds ${fmt(tinCap(s, c))}` : `${cap(c)} makes twice as much`);
      break;
    }
    case "tier": ui.tier = Number(arg) as Tier; break;
    case "buymode": s.buy = s.buy === 1 ? 10 : s.buy === 10 ? 100 : s.buy === 100 ? "max" : 1; break;
    case "accept": accept(s, Number(arg)); break;
    case "decline": decline(s, Number(arg)); break;
    case "sell": { const p = sell(s); if (p) toast(`Sold for ${fmt(p)} coins`); break; }
    case "hang": if (hang(s)) toast("Hung in the Gallery"); else toast(`All ${HOOKS} hooks are full`); break;
    case "unhang": unhang(s, Number(arg)); break;
    case "studio": if (!buyStudio(s, arg)) short(); break;
    case "modal": ui.modal = arg as Modal; break;
    case "close": ui.modal = null; break;
    case "cheat": tick(s, 600); toast("Skipped 10 minutes"); break;
    case "reset":
      if (confirm("Start over? This wipes your progress on this device.")) { wipe(); s = newGame(); fillOffers(s); ui.modal = null; ui.tier = 1; }
      break;
  }
  save(s);
  render();
});

canvas.addEventListener("pointerdown", () => {
  tapAll(s);
  canvas.classList.remove("bump");
  void canvas.offsetWidth;
  canvas.classList.add("bump");
  render();
});

// ---------------------------------------------------------------------------
// Floating "+N" on the row that delivered

function spawn(out: Delivery[]) {
  const seen = new Set<Color>();
  for (const d of out) {
    if (seen.has(d.color)) continue;
    seen.add(d.color);
    const dial = rowsEl.querySelector<HTMLElement>(`.row[data-color="${d.color}"] .dial`);
    if (!dial) continue;
    const f = document.createElement("span");
    f.className = "float";
    f.style.color = SWATCH[d.color];
    f.textContent = isFull(s, d.color) ? "full" : `+${fmt(d.amount)}`;
    dial.appendChild(f);
    setTimeout(() => f.remove(), 1000);
  }
}

// ---------------------------------------------------------------------------
// Loop

function render() {
  renderEasel();
  renderRows();
  renderModal();
  vals.clear(); off.clear(); nums.clear(); flags.clear();
  vals.set("coins", fmt(s.coins));
  vals.set("buymode", s.buy === "max" ? "Max" : `×${s.buy}`);
  const sp = studioVisible(s).filter((u) => { const c = studioCost(s, u.id); return c !== null && s.coins >= c; }).length;
  vals.set("studio-pip", sp ? String(sp) : "");
  vals.set("hung", s.hung.length ? String(s.hung.length) : "");
  vals.set("coach", coach());
  easelValues();
  rowValues();
  if (ui.modal === "studio") for (const u of STUDIO) { const c = studioCost(s, u.id); if (c !== null) off.set(`studio:${u.id}`, s.coins < c); }
  applyLive();
}

let last = performance.now();
let uiClock = 0;
let saveClock = 0;
function frame(now: number) {
  const dt = Math.min(1, (now - last) / 1000);
  last = now;
  const out: Delivery[] = [];
  const wasDone = easelDone(s.easel);
  const sold = s.stats.sold;
  tick(s, dt, out);
  s.lastSeen = Date.now();
  spawn(out);
  if (!wasDone && easelDone(s.easel)) toast(`${s.easel!.title} is finished`);
  if (s.stats.sold > sold && rankAgent()) toast("Your agent sold a painting");
  drawWheel(canvas, s, now / 1000);
  uiClock += dt;
  if (uiClock > 0.1 || out.length) { uiClock = 0; render(); }
  saveClock += dt;
  if (saveClock > 5) { saveClock = 0; save(s); }
  requestAnimationFrame(frame);
}
const rankAgent = () => (s.studio.agent ?? 0) > 0;

document.addEventListener("visibilitychange", () => {
  if (document.hidden) save(s);
  else {
    const r = catchUp(s, Date.now());
    if (r.seconds > 0) { offline = r; ui.modal = "offline"; render(); }
  }
});

render();
requestAnimationFrame(frame);
