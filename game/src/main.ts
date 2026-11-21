import "./ui/style.css";
import { HUES, isPlaceable, jobOf, SWATCH, type Color } from "./core/colors";
import { PAINTINGS, UPGRADES, type Cost } from "./core/data";
import {
  buildWheel, buyColor, buyLevels, buyUpgrade, canAfford, catchUp, colorUnlockCost, colorsForSale, currentPainting,
  incomeByColor, levelCost, maxAffordable, openSlot, paint, paintingProgress, place, ringStats, seams, slotUnlockCost,
  tap, tick, upgradeCost, upgradeVisible, wheelUnlockCost, type Payout,
} from "./core/game";
import { load, newGame, save, wipe, type GameState } from "./core/state";
import { cap, fmt, fmtRate, fmtTime } from "./ui/format";
import { drawWheel, geometry, hitRing } from "./ui/wheel";

// ---------------------------------------------------------------------------
// State

let s: GameState = load() ?? newGame();
const offline = catchUp(s, Date.now());

type Modal = null | "workshop" | "painting" | "offline" | "settings" | { painted: string };
const ui = {
  screen: "wheel" as "wheel" | "studio",
  wheel: 0,
  selected: 0 as number,
  mode: 1 as 1 | 10 | "max",
  modal: (offline.seconds > 0 ? "offline" : null) as Modal,
};

const app = document.getElementById("app")!;

// ---------------------------------------------------------------------------
// Small html helpers

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const dot = (c: Color, size = 14) => `<span class="dot" style="--c:${SWATCH[c]};--s:${size}px"></span>`;
const costHtml = (cost: Cost | null) =>
  cost ? Object.entries(cost).map(([c, n]) => `<span class="cost">${dot(c as Color, 12)}${fmt(n ?? 0)}</span>`).join("") : "";

/** Replace an element's contents only when its shape changes, so taps aren't lost. */
function shape(el: Element, key: string, html: () => string) {
  const node = el as HTMLElement;
  if (node.dataset.key !== key) {
    node.innerHTML = html();
    node.dataset.key = key;
  }
}

// Live values: elements with data-v get text, data-d get disabled, data-w get a width
const vals = new Map<string, string>();
const dis = new Map<string, boolean>();
const widths = new Map<string, number>();
function applyLive() {
  app.querySelectorAll<HTMLElement>("[data-v]").forEach((el) => {
    const v = vals.get(el.dataset.v!);
    if (v !== undefined && el.textContent !== v) el.textContent = v;
  });
  app.querySelectorAll<HTMLButtonElement>("[data-d]").forEach((el) => {
    const d = dis.get(el.dataset.d!);
    if (d !== undefined) el.classList.toggle("off", d);
  });
  app.querySelectorAll<HTMLElement>("[data-w]").forEach((el) => {
    const w = widths.get(el.dataset.w!);
    if (w !== undefined) el.style.setProperty("--p", String(w));
  });
}

// ---------------------------------------------------------------------------
// Layout

app.innerHTML = `
  <div class="paper"></div>
  <header class="hud">
    <button class="badge" data-a="studio" aria-label="Studio wall"><span class="badge-n" data-v="wheels"></span><span class="badge-t">STUDIO</span></button>
    <div class="tin" id="tin"></div>
    <button class="sheet" data-a="modal:painting" aria-label="Current painting" id="sheet"></button>
  </header>
  <main id="screen"></main>
  <nav class="nav">
    <button data-a="studio" class="navb" id="nav-studio"><b>Studio</b></button>
    <button data-a="modal:workshop" class="navb" id="nav-workshop"><b>Workshop</b><i class="pip" data-v="ws-count"></i></button>
    <button data-a="modal:painting" class="navb"><b>Easel</b></button>
    <button data-a="gallery" class="navb"><b>Gallery</b><i class="pip muted" data-v="hung"></i></button>
    <button data-a="modal:settings" class="navb"><b>More</b></button>
  </nav>
  <div id="modal"></div>
  <div id="toast"></div>
`;
const tin = app.querySelector("#tin")!;
const sheet = app.querySelector("#sheet")!;
const screenEl = app.querySelector("#screen")!;
const modalEl = app.querySelector("#modal")!;
const toastEl = app.querySelector("#toast") as HTMLElement;

function toast(text: string) {
  toastEl.textContent = text;
  toastEl.classList.remove("show");
  void toastEl.offsetWidth;
  toastEl.classList.add("show");
}

// ---------------------------------------------------------------------------
// Header: pigment tin and painting sheet

function shownColors(): Color[] {
  return HUES.filter((c) => s.owned.includes(c) || s.earned[c] > 0);
}

function renderHeader() {
  const colors = shownColors();
  shape(tin, colors.join(","), () =>
    colors.map((c) => `<span class="pan ${jobOf(c)}" title="${cap(c)}">${dot(c, 14)}<b data-v="pig:${c}"></b></span>`).join(""),
  );
  const p = currentPainting(s);
  shape(sheet, p?.id ?? "done", () =>
    p
      ? `<span class="tape"></span><span class="sheet-art"><span class="sheet-fill" data-w="paint"></span></span><span class="sheet-name">${esc(p.name)}</span><span class="sheet-pct" data-v="paint-pct"></span>`
      : `<span class="tape"></span><span class="sheet-name">All painted</span>`,
  );
}

// ---------------------------------------------------------------------------
// Wheel screen

let canvas: HTMLCanvasElement | null = null;
let floaters: HTMLElement | null = null;

function wheelKey() {
  const w = s.wheels[ui.wheel];
  const slot = w.slots[ui.selected];
  return [
    "wheel", ui.wheel, ui.selected, ui.mode, w.slots.map((x) => x.color ?? "-").join("/"),
    s.owned.join(","), colorsForSale(s).join(","), slot ? "" : "locked",
  ].join("|");
}

function renderWheelScreen() {
  shape(screenEl, wheelKey(), () => {
    const w = s.wheels[ui.wheel];
    const i = ui.selected;
    const slot = w.slots[i];
    const placeable = s.owned.filter(isPlaceable);
    const forSale = colorsForSale(s)[0];
    const nextSlot = w.slots.length;
    let panel: string;
    if (!slot) {
      panel = `
        <div class="ring-title">Ring ${i + 1} · locked</div>
        <p class="hint">Open the next ring inward. Inner rings turn slower and pay much more.</p>
        <button class="big" data-a="open" data-d="open">Open ring ${nextSlot + 1} <span data-v="open-cost"></span></button>`;
    } else {
      const chips = placeable
        .map((c) => `<button class="chip ${slot.color === c ? "on" : ""}" data-a="place:${c}" aria-label="Place ${c}">${dot(c, 30)}<i>${cap(c)}</i></button>`)
        .join("");
      const sale = forSale
        ? `<button class="chip buy" data-a="buycolor:${forSale}" data-d="buycolor" aria-label="Buy ${forSale}">${dot(forSale, 30)}<i>Buy ${cap(forSale)}</i><span class="chip-cost" data-v="buycolor-cost"></span></button>`
        : "";
      panel = slot.color
        ? `
        <div class="ring-head">
          <div><div class="ring-title">${cap(slot.color)} · level <span data-v="lvl"></span></div>
          <div class="hint"><span data-v="rate"></span> · turn <span data-v="turn"></span> · <span data-v="milestone"></span></div></div>
        </div>
        <div class="buyrow">
          <div class="modes">${([1, 10, "max"] as const).map((m) => `<button data-a="mode:${m}" class="${ui.mode === m ? "on" : ""}">${m === "max" ? "Max" : "×" + m}</button>`).join("")}</div>
          <button class="big" data-a="level" data-d="level">Level up <span data-v="level-cost"></span></button>
        </div>
        <div class="chips-label">Paint this ring</div>
        <div class="chips">${chips}${sale}</div>`
        : `
        <div class="ring-title">Ring ${i + 1} · empty</div>
        <p class="hint">Pick a color. Moving colors is free, and the ring keeps its level.</p>
        <div class="chips">${chips}${sale}</div>`;
    }
    return `
      <div class="wheel-wrap">
        <canvas class="wheel" id="wheel" aria-label="Wheel ${ui.wheel + 1}. Tap to turn the rings faster."></canvas>
        <div class="floaters" id="floaters"></div>
        <div class="seams" id="seams"></div>
        ${s.wheels.length > 1 ? `<div class="wheel-tag">Wheel ${ui.wheel + 1}</div>` : ""}
      </div>
      <section class="panel">${panel}</section>`;
  });
  canvas = screenEl.querySelector("#wheel");
  floaters = screenEl.querySelector("#floaters");
  const seamEl = screenEl.querySelector("#seams")!;
  const list = seams(s, ui.wheel);
  shape(seamEl, list.map((x) => x.color).join(","), () =>
    list.map((x) => `<span class="seam">${dot(x.color, 10)}${cap(x.color)} <b data-v="seam:${x.outer}"></b></span>`).join(""),
  );
}

function wheelValues() {
  const w = s.wheels[ui.wheel];
  const i = ui.selected;
  const slot = w.slots[i];
  for (const x of seams(s, ui.wheel)) vals.set(`seam:${x.outer}`, fmtRate(x.rate));
  if (!slot) {
    const c = slotUnlockCost(s, ui.wheel);
    vals.set("open-cost", c ? stripCost(c) : "");
    dis.set("open", !c || !canAfford(s, c));
  } else if (slot.color) {
    const st = ringStats(s, ui.wheel, i)!;
    vals.set("lvl", String(slot.level));
    vals.set("rate", fmtRate(st.rate));
    vals.set("turn", st.turn < 1 ? `${st.turn.toFixed(2)}s` : fmtTime(st.turn));
    vals.set("milestone", st.nextMilestone ? `×2 speed at ${st.nextMilestone}` : "max milestones");
    const n = ui.mode === "max" ? Math.max(1, maxAffordable(s, ui.wheel, i)) : ui.mode;
    const c = levelCost(s, ui.wheel, i, n)!;
    vals.set("level-cost", `${ui.mode === "max" ? `×${n} ` : ""}· ${stripCost(c)}`);
    dis.set("level", !canAfford(s, c));
  }
  const sale = colorsForSale(s)[0];
  if (sale) {
    const c = colorUnlockCost(sale)!;
    vals.set("buycolor-cost", stripCost(c));
    dis.set("buycolor", !canAfford(s, c));
  }
}

const stripCost = (c: Cost) => Object.entries(c).map(([k, n]) => `${fmt(n ?? 0)} ${k}`).join(" + ");

// ---------------------------------------------------------------------------
// Studio wall

function renderStudio() {
  const key = `studio|${s.wheels.length}|${s.wheels.map((w) => w.slots.map((x) => x.color).join("/")).join(";")}`;
  shape(screenEl, key, () => {
    const cards = s.wheels
      .map((_, w) => `<button class="mini" data-a="wheel:${w}"><canvas class="mini-wheel" data-wheel="${w}"></canvas><span class="label">Wheel ${w + 1} · <b data-v="wrate:${w}"></b></span></button>`)
      .join("");
    const next = wheelUnlockCost(s);
    const build = next
      ? `<button class="mini build" data-a="build" data-d="build"><span class="ghost"></span><span class="label">Build wheel ${s.wheels.length + 1}</span><span class="label small" data-v="build-cost"></span></button>`
      : "";
    return `<h2 class="hand">Studio</h2><div class="grid">${cards}${build}</div>`;
  });
}

function studioValues() {
  s.wheels.forEach((wheel, w) => {
    let total = 0;
    wheel.slots.forEach((_, i) => (total += ringStats(s, w, i)?.rate ?? 0));
    for (const x of seams(s, w)) total += x.rate;
    vals.set(`wrate:${w}`, fmtRate(total));
  });
  const c = wheelUnlockCost(s);
  if (c) {
    vals.set("build-cost", stripCost(c));
    dis.set("build", !canAfford(s, c));
  }
}

// ---------------------------------------------------------------------------
// Modals

function renderModal() {
  const m = ui.modal;
  const key = m === null ? "none" : typeof m === "string" ? `${m}|${m === "workshop" ? workshopKey() : ""}|${s.painting}` : `painted|${m.painted}`;
  shape(modalEl, key, () => {
    if (m === null) return "";
    let body = "";
    if (m === "workshop") body = workshopHtml();
    if (m === "painting") body = paintingHtml();
    if (m === "offline") body = offlineHtml();
    if (m === "settings") body = settingsHtml();
    if (typeof m === "object") {
      const p = PAINTINGS.find((x) => x.id === m.painted)!;
      body = `<h3 class="hand big-title">Painted!</h3><p class="center"><b>${esc(p.name)}</b> is hung in the Gallery.</p>
        <p class="center">+${p.renown} Renown · ${cap(p.bonus.color)} pays +${Math.round(p.bonus.per * 100)}% while it hangs.</p>
        <button class="big" data-a="close">Next painting</button>`;
    }
    return `<div class="scrim" data-a="close"></div><div class="card" role="dialog">${body}</div>`;
  });
}

function workshopKey() {
  return UPGRADES.filter((u) => upgradeVisible(s, u)).map((u) => `${u.id}:${s.workshop[u.id] ?? 0}`).join(",");
}

function workshopHtml() {
  const rows = UPGRADES.filter((u) => upgradeVisible(s, u))
    .map((u) => {
      const rank = s.workshop[u.id] ?? 0;
      const cost = upgradeCost(s, u);
      return `<div class="up">
        <div class="up-text"><b>${esc(u.name)} ${rank ? `<span class="rank">${rank}${u.max ? "/" + u.max : ""}</span>` : ""}</b><span>${esc(u.text)}</span></div>
        ${cost ? `<button class="buy" data-a="up:${u.id}" data-d="up:${u.id}">${costHtml(cost)}</button>` : `<span class="maxed">Max</span>`}
      </div>`;
    })
    .join("");
  return `<h3 class="hand">Workshop</h3><p class="hint">Small upgrades you can buy again and again. Every tenth rank doubles one.</p><div class="ups">${rows || `<p class="hint">Buy yellow to open the Workshop.</p>`}</div><button class="big ghostbtn" data-a="close">Close</button>`;
}

function paintingHtml() {
  const p = currentPainting(s);
  if (!p) return `<h3 class="hand">All painted</h3><p class="hint">That's every placeholder painting. The real collection comes with the paintings pipeline.</p><button class="big" data-a="close">Close</button>`;
  const inc = incomeByColor(s);
  const rows = Object.entries(p.cost)
    .map(([c, n]) => {
      const color = c as Color;
      const have = s.pigment[color];
      const need = n ?? 0;
      const rate = inc[color] ?? 0;
      const eta = have >= need ? "ready" : rate > 0 ? fmtTime((need - have) / rate) : hintFor(color);
      return `<div class="need">${dot(color, 18)}<b>${cap(color)}</b><span>${fmt(Math.min(have, need))} / ${fmt(need)}</span><i>${eta}</i></div>`;
    })
    .join("");
  return `<h3 class="hand">${esc(p.name)}</h3>
    <div class="easel"><span class="sheet-fill" data-w="paint"></span><span class="placeholder">painting placeholder</span></div>
    <div class="needs">${rows}</div>
    <button class="big" data-a="paint" data-d="paint">Paint it</button>`;
}

function hintFor(c: Color): string {
  if (c === "orange") return "red beside yellow";
  if (c === "green") return "yellow beside blue";
  if (c === "violet") return "blue beside red";
  if (c === "teal") return "blue beside green";
  if (c === "vermilion") return "red beside orange";
  if (c === "amber") return "orange beside yellow";
  if (c === "chartreuse") return "yellow beside green";
  if (c === "indigo") return "blue beside violet";
  if (c === "magenta") return "violet beside red";
  return "not made yet";
}

function offlineHtml() {
  const rows = (Object.entries(offline.gained) as [Color, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `<span class="pan">${dot(c, 14)}<b>+${fmt(n)}</b></span>`)
    .join("");
  return `<h3 class="hand">While you were away</h3><p class="center">${fmtTime(offline.seconds)} of painting at half speed.</p><div class="tin center-tin">${rows}</div><button class="big" data-a="close">Collect</button>`;
}

function settingsHtml() {
  const playMin = Math.round(s.stats.playSeconds / 60);
  return `<h3 class="hand">Prototype</h3>
    <p class="hint">Colortime prototype. Stand-in art, placeholder paintings. Progress saves on this device.</p>
    <p class="hint">Played ${playMin} min · ${s.stats.taps} taps · ${s.stats.chimes} chimes · ${s.hung.length} paintings</p>
    <button class="big ghostbtn" data-a="cheat">Skip 1 hour (testing)</button>
    <button class="big danger" data-a="reset">Start over</button>
    <button class="big" data-a="close">Close</button>`;
}

function modalValues() {
  if (ui.modal === "workshop") {
    for (const u of UPGRADES) {
      const c = upgradeCost(s, u);
      if (c) dis.set(`up:${u.id}`, !canAfford(s, c));
    }
  }
  const p = currentPainting(s);
  dis.set("paint", !p || !canAfford(s, p.cost));
}

// ---------------------------------------------------------------------------
// Actions

app.addEventListener("click", (e) => {
  const el = (e.target as Element).closest<HTMLElement>("[data-a]");
  if (!el) return;
  const [a, arg] = el.dataset.a!.split(":");
  const w = ui.wheel;
  switch (a) {
    case "studio": ui.screen = "studio"; ui.modal = null; break;
    case "wheel": ui.screen = "wheel"; ui.wheel = Number(arg); ui.selected = 0; break;
    case "gallery": toast(`${s.hung.length} painting${s.hung.length === 1 ? "" : "s"} hung · ${s.renown} Renown. The Gallery comes later.`); break;
    case "mode": ui.mode = arg === "max" ? "max" : (Number(arg) as 1 | 10); break;
    case "level": {
      const n = ui.mode === "max" ? maxAffordable(s, w, ui.selected) : ui.mode;
      if (!buyLevels(s, w, ui.selected, n)) toast("Not enough pigment yet");
      break;
    }
    case "place": place(s, w, ui.selected, arg as Color); break;
    case "buycolor": if (buyColor(s, arg as Color)) { place(s, w, ui.selected, arg as Color); toast(`${cap(arg)} unlocked`); } else toast("Not enough pigment yet"); break;
    case "open": if (openSlot(s, w)) toast(`Ring ${s.wheels[w].slots.length} open. Pick its color.`); else toast("Not enough pigment yet"); break;
    case "build": if (buildWheel(s)) { ui.screen = "wheel"; ui.wheel = s.wheels.length - 1; ui.selected = 0; } else toast("Not enough pigment yet"); break;
    case "up": if (!buyUpgrade(s, arg)) toast("Not enough pigment yet"); break;
    case "modal": ui.modal = arg as Modal; break;
    case "close": ui.modal = null; break;
    case "paint": {
      const p = currentPainting(s);
      if (p && paint(s)) ui.modal = { painted: p.id };
      break;
    }
    case "cheat": tick(s, 3600); toast("Skipped 1 hour"); break;
    case "reset":
      if (confirm("Start over? This wipes your progress on this device.")) {
        wipe();
        s = newGame();
        Object.assign(ui, { screen: "wheel", wheel: 0, selected: 0, modal: null });
      }
      break;
  }
  save(s);
  render();
});

// Tapping the wheel turns every ring forward and selects the ring under the finger
app.addEventListener("pointerdown", (e) => {
  const c = (e.target as Element).closest("canvas.wheel") as HTMLCanvasElement | null;
  if (!c) return;
  const r = c.getBoundingClientRect();
  const g = geometry(r.width);
  const ring = hitRing(g, e.clientX - r.left, e.clientY - r.top, 6);
  if (ring >= 0) ui.selected = ring;
  const payouts: Payout[] = [];
  tap(s, ui.wheel, payouts);
  spawn(payouts);
  c.classList.remove("bump");
  void c.offsetWidth;
  c.classList.add("bump");
  render();
});

// ---------------------------------------------------------------------------
// Floating "+N" and chime banner

const lastFloat = new Map<number, number>();
function spawn(payouts: Payout[]) {
  if (!floaters || !canvas || ui.screen !== "wheel") return;
  const size = canvas.clientWidth;
  const g = geometry(size);
  const now = performance.now();
  for (const p of payouts) {
    if (p.wheel !== ui.wheel) continue;
    if (!p.chime && now - (lastFloat.get(p.slot) ?? 0) < 350) continue;
    lastFloat.set(p.slot, now);
    const el = document.createElement("div");
    el.className = "float" + (p.chime ? " chime" : "");
    el.style.color = SWATCH[p.color];
    el.style.left = `${g.center + 26}px`;
    el.style.top = `${g.center - g.radius(p.slot) - 14}px`;
    el.textContent = `+${fmt(p.amount)}`;
    floaters.appendChild(el);
    setTimeout(() => el.remove(), 1300);
    if (p.chime) {
      const b = document.createElement("div");
      b.className = "banner";
      b.textContent = "CHIME ×" + Math.round(ringStats(s, p.wheel, p.slot)?.chime ?? 3);
      floaters.appendChild(b);
      setTimeout(() => b.remove(), 1400);
    }
  }
}

// ---------------------------------------------------------------------------
// Frame loop

function computeValues() {
  vals.clear();
  dis.clear();
  widths.clear();
  for (const c of HUES) vals.set(`pig:${c}`, fmt(s.pigment[c]));
  vals.set("wheels", String(s.wheels.length));
  const visible = UPGRADES.filter((u) => upgradeVisible(s, u));
  const affordable = visible.filter((u) => { const c = upgradeCost(s, u); return c && canAfford(s, c); }).length;
  vals.set("ws-count", affordable ? String(affordable) : "");
  vals.set("hung", s.hung.length ? String(s.hung.length) : "");
  const prog = paintingProgress(s);
  widths.set("paint", prog);
  vals.set("paint-pct", `${Math.floor(prog * 100)}%`);
  if (ui.screen === "wheel") wheelValues();
  else studioValues();
  modalValues();
}

function render() {
  renderHeader();
  if (ui.screen === "wheel") renderWheelScreen();
  else renderStudio();
  renderModal();
  app.querySelector("#nav-studio")!.classList.toggle("on", ui.screen === "studio");
  computeValues();
  applyLive();
}

let last = performance.now();
let uiClock = 0;
let saveClock = 0;
function frame(now: number) {
  const dt = Math.min(1, (now - last) / 1000);
  last = now;
  const payouts: Payout[] = [];
  tick(s, dt, payouts);
  s.lastSeen = Date.now();
  spawn(payouts);

  if (ui.screen === "wheel" && canvas) drawWheel(canvas, s, ui.wheel, { selected: ui.selected, time: now / 1000 });
  if (ui.screen === "studio") {
    screenEl.querySelectorAll<HTMLCanvasElement>("canvas.mini-wheel").forEach((c) =>
      drawWheel(c, s, Number(c.dataset.wheel), { mini: true, time: now / 1000 }));
  }

  uiClock += dt;
  if (uiClock > 0.2) {
    uiClock = 0;
    render();
  }
  saveClock += dt;
  if (saveClock > 5) {
    saveClock = 0;
    save(s);
  }
  requestAnimationFrame(frame);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) save(s);
  else {
    const res = catchUp(s, Date.now());
    if (res.seconds > 0) {
      Object.assign(offline, res);
      ui.modal = "offline";
      render();
    }
  }
});

render();
requestAnimationFrame(frame);
