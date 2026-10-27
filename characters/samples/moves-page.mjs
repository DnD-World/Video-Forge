// The motion library page: every move on the shelf, played live by the real
// engine (characters/core), side by side in every style — "walk" next to a
// tired walk, a proud walk, a sneaky walk. Built into moves.html by
// tools/moves-page.mjs.
import { LOOKS, SHELF, STYLES, STYLE_IDS, drawFigure, frameFor, autoPerformance, movesAt } from "../core/index.mjs";
import { sampleCards } from "../core/check.mjs";

const cards = sampleCards();
const ui = { look: "sticker", who: 0, styles: "all", move: "all", playing: true, t0: performance.now(), paused: 0, energy: 0.6 };
const grid = document.getElementById("grid");
const $ = (id) => document.getElementById(id);

const STAGE = { sticker: ["#ffe6f2", "#f7c6dc"], stick: ["#efe2cf", "#d9c6a8"], sitcom: ["#c7a6e8", "#a985cf"], hose: ["#cfc6b4", "#b3a88f"], geo: ["#1f1a4a", "#2c2668"], corp: ["#fbf4ec", "#eadbc8"], pop: ["#ffd400", "#f0b800"] };
const stage = () => STAGE[ui.look] ?? ["#1b2c44", "#24395a"];

let rows = [];
function build() {
  grid.innerHTML = "";
  const moves = Object.values(SHELF).filter((m) => ui.move === "all" || m.id === ui.move);
  const styles = ui.styles === "all" ? STYLE_IDS : [ui.styles];
  rows = moves.map((m) => {
    const fig = document.createElement("figure");
    const cap = document.createElement("figcaption");
    cap.innerHTML = `<b></b> <code></code><br><small></small>`;
    cap.querySelector("b").textContent = m.name;
    cap.querySelector("code").textContent = `[${m.phrases[0] ?? m.id}]`;
    cap.querySelector("small").textContent = m.help;
    const cv = document.createElement("canvas");
    const labels = document.createElement("div");
    labels.className = "labels";
    labels.innerHTML = styles.map((s) => `<span>${STYLES[s].label}</span>`).join("");
    fig.append(cap, cv, labels);
    grid.append(fig);
    const row = { m, cv, styles, visible: true, layers: [] };
    new IntersectionObserver(([e]) => { row.visible = e.isIntersecting; }, { rootMargin: "200px" }).observe(cv);
    return row;
  });
}

/** A span that replays the move with a short rest around it, so blends show. */
function loopSpan(m, styleId) {
  const len = m.lengthMs / STYLES[styleId].tempo;
  const span = m.hold !== null ? len * 1.8 : m.loop ? len * 3 : len;
  const cycle = span + 1200;
  return { span, cycle };
}

function draw(row, tMs) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.round(row.cv.clientWidth * dpr), H = Math.round(W * (row.styles.length > 1 ? 0.2 : 0.45));
  if (W < 32) return;
  if (row.cv.width !== W || row.cv.height !== H) { row.cv.width = W; row.cv.height = H; }
  const ctx = row.cv.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const [bg, floor] = stage();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, bg); g.addColorStop(0.82, bg); g.addColorStop(0.82, floor); g.addColorStop(1, floor);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cell = W / row.styles.length;
  const pair = row.m.kind === "pair";
  row.styles.forEach((styleId, i) => {
    const { span, cycle } = loopSpan(row.m, styleId);
    const local = tMs % cycle;
    const spans = [{ startMs: 600, endMs: 600 + span, move: row.m.id, style: styleId, seed: i + 1 }];
    const mv = movesAt(spans, SHELF, local, { energy: ui.energy });
    ctx.save();
    ctx.beginPath(); ctx.rect(i * cell, 0, cell, H); ctx.clip();
    if (i) { ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(i * cell, 0, 1, H); }
    const who = pair ? [0, 1] : [0];
    who.forEach((k) => {
      const card = { ...cards[(ui.who + k) % cards.length], look: ui.look };
      const box = { x: i * cell + cell * 0.25, y: H * 0.06, w: cell * 0.5, h: H * 0.82 };
      const fr = frameFor(card, ui.look, "full", box);
      let x = fr.x;
      if (pair) x = i * cell + cell * (k ? 0.68 : 0.32);
      // the partner plays the matching move at the same moment
      const m2 = pair && k ? movesAt([{ ...spans[0], move: row.m.pair.partner }], SHELF, local, { energy: ui.energy }) : mv;
      let mirror = pair ? k === 1 : false;
      if (m2?.travel) {
        const at = { here: x, left: i * cell - cell * 0.25, right: i * cell + cell * 1.25 };
        x = at[m2.travel.from] + (at[m2.travel.to] - at[m2.travel.from]) * m2.travel.p;
        if (m2.facing) mirror = m2.facing === "left";
      }
      const talk = !m2 && Math.floor(local / 1500) % 2 === 0;
      const base = autoPerformance(local / 1000, { seed: i, talking: talk });
      const state = {
        ...base,
        view: pair ? 1 : base.view,
        joints: m2?.joints ?? null, hands: m2?.hands ?? null, props: m2?.props ?? [], smile: m2?.face?.smile ?? 0,
        brows: m2?.face?.brows ? { left: m2.face.brows, right: m2.face.brows } : base.brows,
        lid: m2?.face?.lids && base.lid.to !== "closed" ? { from: m2.face.lids, to: m2.face.lids, mix: 1 } : base.lid,
      };
      // a soft floor shadow that shrinks as they leave the ground
      const lift = Math.min(0, m2?.joints?.root?.[1] ?? 0) * (m2?.joints?.w ?? 0);
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.beginPath(); ctx.ellipse(x, fr.y, fr.S * 0.11 * (1 + lift * 3), fr.S * 0.018, 0, 0, Math.PI * 2); ctx.fill();
      if (!row.layers[i * 2 + k]) row.layers[i * 2 + k] = document.createElement("canvas");
      drawFigure(ctx, card, { look: ui.look, S: fr.S, x, y: fr.y, mirror, state, layerSize: { w: W, h: H }, layerCanvas: row.layers[i * 2 + k] });
    });
    ctx.restore();
  });
}

function frame(now) {
  const t = ui.playing ? now - ui.t0 : ui.paused;
  if (ui.playing) ui.paused = t;
  for (const r of rows) if (r.visible) draw(r, t);
  requestAnimationFrame(frame);
}

$("look").innerHTML = LOOKS.map((l) => `<option value="${l.id}">${l.name}</option>`).join("");
$("look").value = ui.look;
$("look").onchange = (e) => { ui.look = e.target.value; rows.forEach((r) => (r.layers = [])); };
$("who").innerHTML = cards.map((c, i) => `<option value="${i}">${c.name}</option>`).join("");
$("who").onchange = (e) => { ui.who = +e.target.value; };
$("styles").innerHTML = `<option value="all">All side by side</option>` + STYLE_IDS.map((s) => `<option value="${s}">${STYLES[s].label}</option>`).join("");
$("styles").onchange = (e) => { ui.styles = e.target.value; build(); };
$("move").innerHTML = `<option value="all">Every move</option>` + Object.values(SHELF).map((m) => `<option value="${m.id}">${m.name}</option>`).join("");
$("move").onchange = (e) => { ui.move = e.target.value; build(); };
$("energy").oninput = (e) => { ui.energy = +e.target.value; };
$("play").onclick = () => { ui.playing = !ui.playing; if (ui.playing) ui.t0 = performance.now() - ui.paused; $("play").textContent = ui.playing ? "Pause" : "Play"; };
$("count").textContent = `${Object.keys(SHELF).length} moves × ${STYLE_IDS.length} styles`;
window.__seek = (ms) => { ui.playing = false; ui.paused = ms; for (const r of rows) draw(r, ms); };
window.__set = (o) => { Object.assign(ui, o); build(); };
build();
requestAnimationFrame(frame);

// close-up for checking hands and props: one figure, big, at one moment
window.__closeup = (id, ms, { style = "neutral", view = 0, framing = "waist", px = 760 } = {}) => {
  let cv = document.getElementById("closeup");
  if (!cv) { cv = document.createElement("canvas"); cv.id = "closeup"; cv.style.cssText = "position:fixed;inset:0;margin:auto;z-index:9;width:min(96vw,96vh);height:min(96vw,96vh);border-radius:14px"; document.body.append(cv); }
  cv.width = px; cv.height = px;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = stage()[0]; ctx.fillRect(0, 0, px, px);
  const card = { ...cards[ui.who], look: ui.look };
  const fr = frameFor(card, ui.look, framing, { x: 0, y: 0, w: px, h: px });
  const mv = movesAt([{ startMs: 0, endMs: SHELF[id].lengthMs * 1.8, move: id, style }], SHELF, ms, { energy: 0 });
  const base = autoPerformance(ms / 1000, { talking: false });
  drawFigure(ctx, card, { look: ui.look, S: fr.S, x: fr.x, y: fr.y, state: { ...base, view, joints: mv?.joints ?? null, hands: mv?.hands, props: mv?.props ?? [], smile: mv?.face?.smile ?? 0 }, layerSize: { w: px, h: px }, layerCanvas: document.createElement("canvas") });
  return mv ? { hands: mv.hands, props: mv.props } : null;
};
window.__closeupOff = () => document.getElementById("closeup")?.remove();
