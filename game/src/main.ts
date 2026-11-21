import "./ui/style.css";
import { HUES, isPlaceable, jobOf, SWATCH, type Color } from "./core/colors";
import { BACKGROUNDS, HOOKS, MAX_PIECES, PIECES, TUTORIAL, UPGRADES, type Cost } from "./core/data";
import {
  background, buildWheel, buyLevels, buyTube, buyUpgrade, canAfford, canEverPaint, catchUp, compose, currentLayer,
  easelDone, easelProgress, hang, incomeByColor, isFull, levelCost, maxAffordable, openSlot, paintNext, piece, place,
  ringStats, salePrice, scrape, seams, sell, slotUnlockCost, tap, tick, tinCap, tinCost, tubeCost, tubesForSale,
  unhang, upgradeCost, upgradeTin, upgradeVisible, wheelUnlockCost, type Payout,
} from "./core/game";
import { load, newGame, save, wipe, type Composition, type GameState } from "./core/state";
import { cap, fmt, fmtRate, fmtTime } from "./ui/format";
import { drawWheel, geometry, hitRing } from "./ui/wheel";

// ---------------------------------------------------------------------------
// State

let s: GameState = load() ?? newGame();
let offline = catchUp(s, Date.now());

type Modal = null | "easel" | "workshop" | "tin" | "gallery" | "offline" | "settings";
const ui = {
  screen: "wheel" as "wheel" | "studio",
  wheel: 0,
  selected: 0,
  mode: 1 as 1 | 10 | "max",
  modal: (offline.seconds > 0 ? "offline" : null) as Modal,
  draft: { bg: "paper", pieces: [] as string[] },
};

const app = document.getElementById("app")!;

// ---------------------------------------------------------------------------
// Html helpers

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const dot = (c: Color, size = 14) => `<span class="dot" style="--c:${SWATCH[c]};--s:${size}px"></span>`;
const coin = (size = 14) => `<span class="coin" style="--s:${size}px"></span>`;
const costText = (c: Cost | null) =>
  c ? Object.entries(c).map(([k, n]) => (k === "coins" ? `${fmt(n ?? 0)} coins` : `${fmt(n ?? 0)} ${k}`)).join(" + ") : "";

function shape(el: Element, key: string, html: () => string) {
  const node = el as HTMLElement;
  if (node.dataset.key !== key) {
    node.innerHTML = html();
    node.dataset.key = key;
  }
}

const vals = new Map<string, string>();
const dis = new Map<string, boolean>();
const nums = new Map<string, number>();
const flags = new Map<string, boolean>();
function applyLive() {
  app.querySelectorAll<HTMLElement>("[data-v]").forEach((el) => {
    const v = vals.get(el.dataset.v!);
    if (v !== undefined && el.textContent !== v) el.textContent = v;
  });
  app.querySelectorAll<HTMLElement>("[data-d]").forEach((el) => {
    const d = dis.get(el.dataset.d!);
    if (d !== undefined) el.classList.toggle("off", d);
  });
  app.querySelectorAll<HTMLElement>("[data-n]").forEach((el) => {
    const n = nums.get(el.dataset.n!);
    if (n !== undefined) el.style.setProperty("--p", String(Math.max(0, Math.min(1, n))));
  });
  app.querySelectorAll<HTMLElement>("[data-f]").forEach((el) => {
    const [key, cls] = el.dataset.f!.split("|");
    el.classList.toggle(cls, !!flags.get(key));
  });
}

// ---------------------------------------------------------------------------
// Layout

app.innerHTML = `
  <div class="paper"></div>
  <header class="hud">
    <button class="badge" data-a="studio" aria-label="Studio wall"><span class="badge-n" data-v="wheels"></span><span class="badge-t">STUDIO</span></button>
    <div class="hud-mid">
      <button class="purse" data-a="modal:workshop" aria-label="Coins, open the Workshop">${coin(18)}<b data-v="coins"></b></button>
      <button class="tin" id="tin" data-a="modal:tin" aria-label="Paint tin"></button>
    </div>
    <button class="sheet" data-a="modal:easel" aria-label="Easel" id="sheet"></button>
  </header>
  <main id="screen"></main>
  <nav class="nav">
    <button data-a="studio" class="navb" id="nav-studio"><b>Studio</b></button>
    <button data-a="modal:workshop" class="navb"><b>Workshop</b><i class="pip" data-v="ws-count"></i></button>
    <button data-a="modal:easel" class="navb"><b>Easel</b><i class="pip" data-v="easel-pip"></i></button>
    <button data-a="modal:gallery" class="navb"><b>Gallery</b><i class="pip muted" data-v="hung"></i></button>
    <button data-a="modal:settings" class="navb"><b>More</b></button>
  </nav>
  <div id="modal"></div>
  <div id="toast"></div>
`;
const tinEl = app.querySelector("#tin")!;
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
// Header

const shownColors = () => HUES.filter((c) => s.owned.includes(c) || s.earned[c] > 0);

/** Name of each layer on the easel: "Sky", "Apple"… */
function layerNames(comp: Composition): string[] {
  const parts = [background(comp.bg), ...comp.pieces.map(piece)];
  return parts.flatMap((p) => p.layers.map(() => p.name));
}

function renderHeader() {
  const colors = shownColors();
  shape(tinEl, colors.join(","), () =>
    colors.map((c) => `<span class="pan ${jobOf(c)}" data-f="full:${c}|full"><span class="well" data-n="tin:${c}" style="--c:${SWATCH[c]}"></span><b data-v="pig:${c}"></b></span>`).join(""),
  );
  const e = s.easel;
  shape(sheet, e ? `${e.comp.title}|${e.layers.length}` : "empty", () =>
    e
      ? `<span class="tape"></span><span class="sheet-art">${e.layers.map((l, i) => `<span class="band" style="--c:${SWATCH[l.color]}" data-n="layer:${i}"></span>`).join("")}</span><span class="sheet-name">${esc(e.comp.title)}</span><span class="sheet-pct" data-v="easel-status"></span>`
      : `<span class="tape"></span><span class="sheet-art blank"></span><span class="sheet-name">Easel empty</span><span class="sheet-pct">choose a painting</span>`,
  );
}

function headerValues() {
  vals.set("coins", fmt(s.coins));
  for (const c of HUES) {
    vals.set(`pig:${c}`, fmt(s.pigment[c]));
    nums.set(`tin:${c}`, s.pigment[c] / tinCap(s, c));
    flags.set(`full:${c}`, isFull(s, c));
  }
  vals.set("wheels", String(s.wheels.length));
  const e = s.easel;
  if (e) {
    e.layers.forEach((l, i) => nums.set(`layer:${i}`, l.done / l.amount));
    const layer = currentLayer(e);
    vals.set("easel-status", easelDone(e) ? "done!" : layer && s.pigment[layer.color] < 1 ? `needs ${layer.color}` : `${Math.floor(easelProgress(e) * 100)}%`);
    vals.set("easel-pip", easelDone(e) ? "!" : "");
  } else vals.set("easel-pip", s.painted >= TUTORIAL.length ? "!" : "");
  const affordable = UPGRADES.filter((u) => upgradeVisible(s, u)).filter((u) => { const c = upgradeCost(s, u); return c && canAfford(s, c); }).length;
  vals.set("ws-count", affordable ? String(affordable) : "");
  vals.set("hung", s.hung.length ? String(s.hung.length) : "");
}

// ---------------------------------------------------------------------------
// Wheel screen

let canvas: HTMLCanvasElement | null = null;
let floaters: HTMLElement | null = null;

function renderWheelScreen() {
  const w = s.wheels[ui.wheel];
  const slot = w.slots[ui.selected];
  const key = ["wheel", ui.wheel, ui.selected, ui.mode, w.slots.map((x) => x.color ?? "-").join("/"), s.owned.join(","), tubesForSale(s).join(","), slot ? "" : "locked"].join("|");
  shape(screenEl, key, () => {
    const i = ui.selected;
    const placeable = s.owned.filter(isPlaceable);
    const tube = tubesForSale(s)[0];
    const tabs = w.slots.map((x, k) => `<button class="tab ${k === i ? "on" : ""}" data-a="ring:${k}" aria-label="Ring ${k + 1}${x.color ? ", " + x.color : ", empty"}">${x.color ? dot(x.color, 16) : "<span class='empty-dot'></span>"}<i>${k + 1}</i></button>`).join("")
      + (w.slots.length < 6 ? `<button class="tab ${i === w.slots.length ? "on" : ""}" data-a="ring:${w.slots.length}" aria-label="Locked ring ${w.slots.length + 1}"><span class="lock">+</span><i>${w.slots.length + 1}</i></button>` : "");
    let panel: string;
    if (!slot) {
      panel = `
        <div class="ring-title">Ring ${i + 1} · locked</div>
        <p class="hint">Open the next ring inward. Inner rings turn slower and grind much more.</p>
        <button class="big" data-a="open" data-d="open">Open ring ${w.slots.length + 1} <span data-v="open-cost"></span></button>`;
    } else {
      const chips = placeable
        .map((c) => `<button class="chip ${slot.color === c ? "on" : ""}" data-a="place:${c}" aria-label="Grind ${c} in this ring">${dot(c, 30)}<i>${cap(c)}</i></button>`)
        .join("");
      const shop = tube
        ? `<button class="chip buy" data-a="tube:${tube}" data-d="tube" aria-label="Buy a ${tube} tube">${dot(tube, 30)}<i>${cap(tube)} tube</i><span class="chip-cost" data-v="tube-cost"></span></button>`
        : "";
      panel = slot.color
        ? `
        <div class="ring-title">${cap(slot.color)} · level <span data-v="lvl"></span></div>
        <div class="hint"><span data-v="rate"></span> · turn <span data-v="turn"></span> · <span data-v="milestone"></span></div>
        <div class="buyrow">
          <div class="modes">${([1, 10, "max"] as const).map((m) => `<button data-a="mode:${m}" class="${ui.mode === m ? "on" : ""}">${m === "max" ? "Max" : "×" + m}</button>`).join("")}</div>
          <button class="big" data-a="level" data-d="level">Level up <span data-v="level-cost"></span></button>
        </div>
        <div class="chips-label">What this ring grinds</div>
        <div class="chips">${chips}${shop}</div>`
        : `
        <div class="ring-title">Ring ${i + 1} · empty</div>
        <p class="hint">Pick a color to grind. Moving colors is free, and the ring keeps its level.</p>
        <div class="chips">${chips}${shop}</div>`;
    }
    return `
      <div class="wheel-wrap">
        <canvas class="wheel" id="wheel" aria-label="Wheel ${ui.wheel + 1}. Tap to turn the rings faster."></canvas>
        <div class="floaters" id="floaters"></div>
        <div class="seams" id="seams"></div>
        ${s.wheels.length > 1 ? `<div class="wheel-tag">Wheel ${ui.wheel + 1}</div>` : ""}
      </div>
      <section class="panel"><div class="tabs">${tabs}</div>${panel}</section>`;
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
    vals.set("open-cost", c ? `· ${costText(c)}` : "");
    dis.set("open", !c || !canAfford(s, c));
  } else if (slot.color) {
    const st = ringStats(s, ui.wheel, i)!;
    vals.set("lvl", String(slot.level));
    vals.set("rate", fmtRate(st.rate));
    vals.set("turn", st.turn < 1 ? `${st.turn.toFixed(2)}s` : fmtTime(st.turn));
    vals.set("milestone", st.nextMilestone ? `×2 speed at ${st.nextMilestone}` : "max milestones");
    const n = ui.mode === "max" ? Math.max(1, maxAffordable(s, ui.wheel, i)) : ui.mode;
    const c = levelCost(s, ui.wheel, i, n)!;
    vals.set("level-cost", `${ui.mode === "max" ? `×${n} ` : ""}· ${costText(c)}`);
    dis.set("level", !canAfford(s, c));
  }
  const tube = tubesForSale(s)[0];
  if (tube) {
    const c = tubeCost(tube)!;
    vals.set("tube-cost", costText(c));
    dis.set("tube", !canAfford(s, c));
  }
}

// ---------------------------------------------------------------------------
// Studio wall

function renderStudio() {
  const key = `studio|${s.wheels.length}|${s.wheels.map((w) => w.slots.map((x) => x.color).join("/")).join(";")}`;
  shape(screenEl, key, () => {
    const cards = s.wheels
      .map((_, w) => `<button class="mini" data-a="wheel:${w}"><canvas class="mini-wheel" data-wheel="${w}"></canvas><span class="label">Wheel ${w + 1}</span></button>`)
      .join("");
    const next = wheelUnlockCost(s);
    const build = next
      ? `<button class="mini build" data-a="build" data-d="build"><span class="ghost"></span><span class="label">Build wheel ${s.wheels.length + 1}</span><span class="label small" data-v="build-cost"></span></button>`
      : "";
    return `<h2 class="hand">Studio</h2><div class="grid">${cards}${build}</div>`;
  });
}

function studioValues() {
  const c = wheelUnlockCost(s);
  if (c) {
    vals.set("build-cost", costText(c));
    dis.set("build", !canAfford(s, c));
  }
}

// ---------------------------------------------------------------------------
// Modals

function hintFor(c: Color): string {
  const recipes: Partial<Record<Color, string>> = {
    orange: "red beside yellow", green: "yellow beside blue", violet: "blue beside red",
    teal: "blue beside green", vermilion: "red beside orange", amber: "orange beside yellow",
    chartreuse: "yellow beside green", indigo: "blue beside violet", magenta: "violet beside red",
  };
  if (recipes[c]) return `make it with ${recipes[c]}`;
  if (!s.owned.includes(c)) return `buy a ${c} tube`;
  return `put ${c} in a ring`;
}

function easelHtml(): string {
  const e = s.easel;
  const tutorialLeft = s.painted < TUTORIAL.length;
  let top = "";
  if (e) {
    const names = layerNames(e.comp);
    const lesson = e.tutorial >= 0 ? TUTORIAL[e.tutorial] : null;
    const rows = e.layers
      .map((l, i) => `<div class="need">${dot(l.color, 18)}<b>${esc(names[i])}</b><span class="bar"><span data-n="layer:${i}" style="--c:${SWATCH[l.color]}"></span></span><i data-v="layer-note:${i}"></i></div>`)
      .join("");
    const done = easelDone(e);
    top = `
      <h3 class="hand">${esc(e.comp.title)}</h3>
      ${lesson ? `<p class="hint center">Lesson ${e.tutorial + 1} of ${TUTORIAL.length}${lesson.reward ? ` · pays a ${lesson.reward} tube too` : ""}</p>` : ""}
      <div class="easel">${e.layers.map((l, i) => `<span class="band" style="--c:${SWATCH[l.color]}" data-n="layer:${i}"></span>`).join("")}<span class="placeholder">painting placeholder</span></div>
      <p class="hint">The easel paints one layer at a time, using paint from your tin.</p>
      <div class="needs">${rows}</div>
      ${done
        ? `<div class="buyrow"><button class="big" data-a="sell">Sell · <span data-v="price"></span></button><button class="big ghostbtn" data-a="hang" data-d="hang">Hang · ${s.hung.length}/${HOOKS}</button></div>
           <p class="hint">A hung painting makes its colors grind 10% faster for good. Selling pays coins now.</p>`
        : e.tutorial < 0 ? `<button class="big ghostbtn" data-a="scrape">Scrape it off (paint is lost)</button>` : ""}`;
  }
  if (tutorialLeft) return top + `<button class="big ghostbtn" data-a="close">Close</button>`;

  const bgs = BACKGROUNDS.map((b) => partChip("bg", b.id, b.name, b.layers.map((l) => l.color), ui.draft.bg === b.id)).join("");
  const pcs = PIECES.map((p) => partChip("piece", p.id, p.name, p.layers.map((l) => l.color), ui.draft.pieces.includes(p.id))).join("");
  const draft = compose(s, { ...ui.draft, title: "" });
  const needs: Partial<Record<Color, number>> = {};
  for (const l of draft.layers) needs[l.color] = (needs[l.color] ?? 0) + l.amount;
  const needList = (Object.entries(needs) as [Color, number][])
    .map(([c, n]) => `<span class="cost ${canEverPaint(s, c) ? "" : "missing"}">${dot(c, 12)}${fmt(n)}</span>`)
    .join("");
  return `${top}
    <h3 class="hand">${e ? "Paint next" : "Choose a painting"}</h3>
    <div class="chips-label">Background</div><div class="parts">${bgs}</div>
    <div class="chips-label">Pieces · up to ${MAX_PIECES}</div><div class="parts">${pcs}</div>
    <div class="draft"><div class="draft-needs">${needList || "<span class='hint'>Nothing to paint yet</span>"}</div><b>Sells for ${fmt(salePrice(s, draft))}</b></div>
    <button class="big" data-a="paintnext" ${draft.layers.length ? "" : "disabled"}>${e ? "Paint this next" : "Paint this"}</button>
    <button class="big ghostbtn" data-a="close">Close</button>`;
}

function partChip(kind: "bg" | "piece", id: string, name: string, colors: Color[], on: boolean) {
  const missing = colors.some((c) => !canEverPaint(s, c));
  return `<button class="part ${on ? "on" : ""} ${missing ? "dim" : ""}" data-a="${kind}:${id}"><span class="part-dots">${colors.map((c) => dot(c, 12)).join("") || "·"}</span>${esc(name)}</button>`;
}

function easelValues() {
  const e = s.easel;
  if (!e) return;
  const cur = currentLayer(e);
  e.layers.forEach((l, i) => {
    let note = `${fmt(l.done)} / ${fmt(l.amount)}`;
    if (l === cur && s.pigment[l.color] < 1) note = hintFor(l.color);
    vals.set(`layer-note:${i}`, note);
  });
  vals.set("price", `${fmt(salePrice(s, e))} coins`);
  dis.set("hang", s.hung.length >= HOOKS);
}

function workshopHtml() {
  const groups = (["Easel", "Wheels"] as const).map((g) => {
    const rows = UPGRADES.filter((u) => u.group === g && upgradeVisible(s, u)).map((u) => {
      const r = s.workshop[u.id] ?? 0;
      const cost = upgradeCost(s, u);
      return `<div class="up">
        <div class="up-text"><b>${esc(u.name)} ${r ? `<span class="rank">${r}${u.max ? "/" + u.max : ""}</span>` : ""}</b><span>${esc(u.text)}</span></div>
        ${cost ? `<button class="buy" data-a="up:${u.id}" data-d="up:${u.id}">${coin(14)}${fmt(cost.coins ?? 0)}</button>` : `<span class="maxed">Max</span>`}
      </div>`;
    }).join("");
    return rows ? `<div class="chips-label">${g}</div>${rows}` : "";
  }).join("");
  return `<h3 class="hand">Workshop</h3><p class="hint">Tools bought with coins from selling paintings. Every tenth rank doubles one.</p><div class="ups">${groups || `<p class="hint">Sell your first painting to open the Workshop.</p>`}</div><button class="big ghostbtn" data-a="close">Close</button>`;
}

function tinHtml() {
  const inc = incomeByColor(s);
  const rows = shownColors().map((c) => `<div class="up">
      ${dot(c, 22)}
      <div class="up-text"><b>${cap(c)} <span class="rank">${jobOf(c) === "grow" ? "primary" : jobOf(c) === "research" ? "mixed" : "paint"}</span></b>
      <span><span data-v="pig:${c}"></span> / <span data-v="cap:${c}"></span> · ${inc[c] ? fmtRate(inc[c]!) : "not grinding"}</span>
      <span class="bar"><span data-n="tin:${c}" style="--c:${SWATCH[c]}"></span></span></div>
      <button class="buy" data-a="tin:${c}" data-d="tin:${c}">×2 ${coin(14)}<span data-v="tincost:${c}"></span></button>
    </div>`).join("");
  return `<h3 class="hand">Paint tin</h3><p class="hint">Each color has its own well. Paint that doesn't fit is lost, so widen the wells of colors you want to save up.</p><div class="ups">${rows}</div><button class="big ghostbtn" data-a="close">Close</button>`;
}

function tinValues() {
  for (const c of HUES) {
    vals.set(`cap:${c}`, fmt(tinCap(s, c)));
    const cost = tinCost(s, c);
    vals.set(`tincost:${c}`, fmt(cost.coins ?? 0));
    dis.set(`tin:${c}`, !canAfford(s, cost));
  }
}

function galleryHtml() {
  const rows = s.hung.map((h, i) => `<div class="up"><div class="up-text"><b>${esc(h.title)}</b><span>${h.colors.map((c) => dot(c, 12)).join(" ")} grind 10% faster</span></div><button class="buy ghost-buy" data-a="unhang:${i}">Take down</button></div>`).join("");
  return `<h3 class="hand">Gallery</h3><p class="hint">${s.hung.length} of ${HOOKS} hooks used · ${s.painted} paintings made · ${s.stats.sold} sold</p><div class="ups">${rows || `<p class="hint">Hang a finished painting from the easel to boost its colors.</p>`}</div><button class="big ghostbtn" data-a="close">Close</button>`;
}

function offlineHtml() {
  const rows = (Object.entries(offline.gained) as [Color, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `<span class="pan">${dot(c, 14)}<b>+${fmt(n)}</b></span>`)
    .join("");
  return `<h3 class="hand">While you were away</h3>
    <p class="center">${fmtTime(offline.seconds)} at half speed${offline.paintings ? ` · ${offline.paintings} painting${offline.paintings > 1 ? "s" : ""} made` : ""}${offline.coins ? ` · ${fmt(offline.coins)} coins` : ""}.</p>
    <div class="tin center-tin">${rows}</div><button class="big" data-a="close">Collect</button>`;
}

function settingsHtml() {
  return `<h3 class="hand">Prototype</h3>
    <p class="hint">Colortime prototype: stand-in art, placeholder paintings. Progress saves on this device.</p>
    <p class="hint">Played ${Math.round(s.stats.playSeconds / 60)} min · ${s.stats.taps} taps · ${s.painted} paintings · ${fmt(s.stats.coinsEarned)} coins earned · ${fmt(s.stats.spilled)} paint spilled</p>
    <button class="big ghostbtn" data-a="cheat">Skip 1 hour (testing)</button>
    <button class="big danger" data-a="reset">Start over</button>
    <button class="big" data-a="close">Close</button>`;
}

function renderModal() {
  const m = ui.modal;
  let key = "none";
  if (m === "easel") {
    const e = s.easel;
    key = `easel|${e?.comp.title}|${e?.layers.length}|${easelDone(e)}|${s.painted}|${s.hung.length}|${ui.draft.bg}|${ui.draft.pieces.join(",")}|${s.owned.join(",")}|${s.workshop["bigger-canvas"] ?? 0}`;
  } else if (m === "workshop") key = `ws|${UPGRADES.filter((u) => upgradeVisible(s, u)).map((u) => `${u.id}:${s.workshop[u.id] ?? 0}`).join(",")}`;
  else if (m === "tin") key = `tin|${shownColors().join(",")}`;
  else if (m === "gallery") key = `gallery|${s.hung.length}`;
  else if (m) key = m;
  shape(modalEl, key, () => {
    if (!m) return "";
    const body = { easel: easelHtml, workshop: workshopHtml, tin: tinHtml, gallery: galleryHtml, offline: offlineHtml, settings: settingsHtml }[m]();
    return `<div class="scrim" data-a="close"></div><div class="card" role="dialog">${body}</div>`;
  });
}

// ---------------------------------------------------------------------------
// Actions

app.addEventListener("click", (ev) => {
  const el = (ev.target as Element).closest<HTMLElement>("[data-a]");
  if (!el || el.hasAttribute("disabled")) return;
  const [a, arg] = el.dataset.a!.split(":");
  const w = ui.wheel;
  const short = () => toast("Not enough coins yet");
  switch (a) {
    case "studio": ui.screen = "studio"; ui.modal = null; break;
    case "wheel": ui.screen = "wheel"; ui.wheel = Number(arg); ui.selected = 0; break;
    case "ring": ui.selected = Number(arg); break;
    case "mode": ui.mode = arg === "max" ? "max" : (Number(arg) as 1 | 10); break;
    case "level": if (!buyLevels(s, w, ui.selected, ui.mode === "max" ? maxAffordable(s, w, ui.selected) : ui.mode)) short(); break;
    case "place": place(s, w, ui.selected, arg as Color); break;
    case "tube": if (buyTube(s, arg as Color)) { place(s, w, ui.selected, arg as Color); toast(`${cap(arg)} tube bought`); } else short(); break;
    case "open": if (openSlot(s, w)) toast(`Ring ${s.wheels[w].slots.length} open. Pick what it grinds.`); else short(); break;
    case "build": if (buildWheel(s)) { ui.screen = "wheel"; ui.wheel = s.wheels.length - 1; ui.selected = 0; } else short(); break;
    case "up": if (!buyUpgrade(s, arg)) short(); break;
    case "tin": if (upgradeTin(s, arg as Color)) toast(`${cap(arg)} well holds ${fmt(tinCap(s, arg as Color))}`); else short(); break;
    case "modal": ui.modal = arg as Modal; break;
    case "close": ui.modal = null; break;
    case "sell": { const p = sell(s); if (p) toast(`Sold for ${fmt(p)} coins`); break; }
    case "hang": if (hang(s)) toast("Hung in the Gallery"); else toast(`All ${HOOKS} hooks are full`); break;
    case "unhang": unhang(s, Number(arg)); break;
    case "scrape": scrape(s); break;
    case "bg": ui.draft.bg = arg; break;
    case "piece": {
      const p = ui.draft.pieces;
      if (p.includes(arg)) ui.draft.pieces = p.filter((x) => x !== arg);
      else if (p.length < MAX_PIECES) p.push(arg);
      else toast(`Up to ${MAX_PIECES} pieces`);
      break;
    }
    case "paintnext": {
      const title = [background(ui.draft.bg), ...ui.draft.pieces.map(piece)].filter((x) => x.layers.length).map((x) => x.name).join(" & ") || "Study";
      if (paintNext(s, { ...ui.draft, pieces: [...ui.draft.pieces], title })) {
        toast(s.easel?.comp.title === title ? `Painting ${title}` : `${title} is next`);
        ui.modal = null;
      }
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

app.addEventListener("pointerdown", (ev) => {
  const c = (ev.target as Element).closest("canvas.wheel") as HTMLCanvasElement | null;
  if (!c) return;
  const r = c.getBoundingClientRect();
  const ring = hitRing(geometry(r.width), ev.clientX - r.left, ev.clientY - r.top, 6);
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
// Floating numbers

const lastFloat = new Map<number, number>();
function spawn(payouts: Payout[]) {
  if (!floaters || !canvas || ui.screen !== "wheel") return;
  const g = geometry(canvas.clientWidth);
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
    el.textContent = isFull(s, p.color) ? "full" : `+${fmt(p.amount)}`;
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

function render() {
  renderHeader();
  if (ui.screen === "wheel") renderWheelScreen();
  else renderStudio();
  renderModal();
  app.querySelector("#nav-studio")!.classList.toggle("on", ui.screen === "studio");
  vals.clear(); dis.clear(); nums.clear(); flags.clear();
  headerValues();
  if (ui.screen === "wheel") wheelValues();
  else studioValues();
  if (ui.modal === "easel") easelValues();
  if (ui.modal === "tin") tinValues();
  if (ui.modal === "workshop") for (const u of UPGRADES) { const c = upgradeCost(s, u); if (c) dis.set(`up:${u.id}`, !canAfford(s, c)); }
  applyLive();
}

let last = performance.now();
let uiClock = 0;
let saveClock = 0;
let lastCoins = s.coins;
function frame(now: number) {
  const dt = Math.min(1, (now - last) / 1000);
  last = now;
  const payouts: Payout[] = [];
  const wasDone = easelDone(s.easel);
  tick(s, dt, payouts);
  s.lastSeen = Date.now();
  spawn(payouts);
  if (!wasDone && easelDone(s.easel)) toast(`${s.easel!.comp.title} is finished. Sell or hang it.`);
  if (s.coins > lastCoins + 0.5 && ui.modal !== "easel") toast(`+${fmt(s.coins - lastCoins)} coins`);
  lastCoins = s.coins;

  if (ui.screen === "wheel" && canvas) drawWheel(canvas, s, ui.wheel, { selected: ui.selected, time: now / 1000 });
  if (ui.screen === "studio") {
    screenEl.querySelectorAll<HTMLCanvasElement>("canvas.mini-wheel").forEach((c) => drawWheel(c, s, Number(c.dataset.wheel), { mini: true, time: now / 1000 }));
  }
  uiClock += dt;
  if (uiClock > 0.2) { uiClock = 0; render(); }
  saveClock += dt;
  if (saveClock > 5) { saveClock = 0; save(s); }
  requestAnimationFrame(frame);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) save(s);
  else {
    const res = catchUp(s, Date.now());
    lastCoins = s.coins;
    if (res.seconds > 0) { offline = res; ui.modal = "offline"; render(); }
  }
});

render();
requestAnimationFrame(frame);
