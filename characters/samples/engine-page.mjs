// The engine test page: every look, four test characters, live, drawn by the
// real engine (characters/core) — not the hand-made sample page. Built into
// engine.html by tools/character-sheet.mjs.
import { LOOKS, drawFigure, frameFor, autoPerformance, POSE_NAMES, normalizeCard } from "../core/index.mjs";
import { sampleCards } from "../core/check.mjs";

const cards = sampleCards();
const ui = { view: 0, pose: "auto", boil: null, framing: "full", playing: true, t0: performance.now(), paused: 0 };
const grid = document.getElementById("grid");
const rows = LOOKS.map((look) => {
  const fig = document.createElement("figure");
  const cv = document.createElement("canvas");
  const cap = document.createElement("figcaption");
  cap.innerHTML = "<b></b> <small></small>";
  cap.querySelector("b").textContent = look.name;
  cap.querySelector("small").textContent = look.blurb;
  fig.append(cv, cap);
  grid.append(fig);
  const row = { look, cv, visible: true, layers: [] };
  new IntersectionObserver(([e]) => { row.visible = e.isIntersecting; }, { rootMargin: "200px" }).observe(cv);
  return row;
});

const BG = { stick: "#efe2cf", geo: "#1f1a4a", corp: "#fbf4ec", sticker: "#ffe6f2", pop: "#ffd400", hose: "#cfc6b4", hose2: "#e8cfa0", sitcom: "#c7a6e8",
  vase: "#c4642e", shadow: "#d2445e", karag: "#f6e3b4", mid: "#efe3c8", chalk: "#2f4a3a", paper: "#bfe3f2", riso: "#f3efe4", neon: "#0a0820",
  noir: "#2a2a2a", glass: "#3a302a", notebook: "#fbfaf3", blueprint: "#1d4e89" };

function draw(row, t) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.round(row.cv.clientWidth * dpr), H = Math.round(W * 0.34);
  if (W < 32) return;
  if (row.cv.width !== W || row.cv.height !== H) { row.cv.width = W; row.cv.height = H; }
  const ctx = row.cv.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BG[row.look.id] ?? "#333"; ctx.fillRect(0, 0, W, H);
  const cell = W / cards.length;
  cards.forEach((c0, i) => {
    const card = { ...c0, look: row.look.id, ...(ui.boil != null ? { boil: ui.boil } : {}) };
    const box = { x: i * cell + cell * 0.04, y: H * 0.03, w: cell * 0.92, h: H * 0.94 };
    const { S, x, y } = frameFor(card, row.look, ui.framing, box);
    const talking = Math.floor(t / 3 + i) % 2 === 0;
    const pose = ui.pose === "auto" ? POSE_NAMES[(Math.floor(t / 3) + i * 2) % POSE_NAMES.length] : ui.pose;
    const k = ui.pose === "auto" ? Math.min(1, (t % 3) / 0.4, (3 - (t % 3)) / 0.4) : 1;
    const state = autoPerformance(t, { seed: i, talking, pose, poseK: k, view: ui.view });
    const mirror = i % 2 === 1;
    if (!row.layers[i]) row.layers[i] = document.createElement("canvas");
    ctx.save();
    ctx.beginPath(); ctx.rect(i * cell, 0, cell, H); ctx.clip();
    drawFigure(ctx, card, { look: row.look, S, x, y, mirror, state, layerSize: { w: W, h: H }, layerCanvas: row.layers[i] });
    ctx.restore();
  });
}

function frame(now) {
  const t = ui.playing ? (now - ui.t0) / 1000 : ui.paused;
  if (ui.playing) ui.paused = t;
  for (const r of rows) if (r.visible) draw(r, t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// controls
const $ = (id) => document.getElementById(id);
$("view").oninput = (e) => { ui.view = +e.target.value; $("viewv").textContent = ["front", "", "3/4", "", "side"][Math.round(ui.view * 2)] || ui.view.toFixed(1); };
$("pose").innerHTML = ["auto", ...POSE_NAMES].map((p) => `<option>${p}</option>`).join("");
$("pose").onchange = (e) => { ui.pose = e.target.value; };
$("framing").onchange = (e) => { ui.framing = e.target.value; };
$("boil").oninput = (e) => { ui.boil = +e.target.value || null; $("boilv").textContent = (+e.target.value).toFixed(1); };
$("play").onclick = () => { ui.playing = !ui.playing; if (ui.playing) ui.t0 = performance.now() - ui.paused * 1000; $("play").textContent = ui.playing ? "Pause" : "Play"; };
window.__seek = (t) => { ui.playing = false; ui.paused = t; for (const r of rows) draw(r, t); };
window.__set = (o) => Object.assign(ui, o);
window.__normalize = normalizeCard;
