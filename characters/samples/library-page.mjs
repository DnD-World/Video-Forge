// The motion library: every move copied from a real person in a free clip,
// played by a Red Flag character, beside the clip it came from. Ak keeps or
// drops each one; "Copy my picks" gives the list back (3 Nov 2026).
import { SHELF, lookById, stageOf, drawFigure, frameFor, characterState, performAt, normalizeCard, followAt, movesAt } from "../core/index.mjs";
import CLIPS from "../moves/acted/clips.json";
import CAST from "../../brands/redflag/cast.json";
import PREVIEW from "../moves/acted/preview.json";

const PEOPLE = ["chloe", "jake", "margo", "lucas", "rita", "arthur"].map((id) => CAST.people.find((p) => p.id === id)).filter(Boolean);
const GEO_OWN = { ...lookById("geo"), eyes: undefined };
const lookFor = (p) => (p.look === "geo" ? GEO_OWN : lookById(p.look));
const cardFor = (p) => {
  const face = p.faces.find((f) => f.id === p.chosen?.face) ?? p.faces[0];
  const o = p.outfits.find((x) => x.id === p.chosen?.outfits?.[0]) ?? p.outfits[0];
  return normalizeCard({ ...p.base, ...face.set, form: CAST.form ?? 0, formDetail: CAST.formDetail ?? false, formLimbs: CAST.formLimbs ?? 1, look: p.look, wear: [...o.wear, ...p.accessories] }).card;
};
const KEY = "rf-motion-picks-v2"; // v1 held the rejected stock-clip moves
const store = (() => { try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; } })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} };

const MOVES = CLIPS.map((c) => ({ clip: c, id: c.move ?? c.id })).filter((m) => SHELF[m.id]).map((m) => ({ ...m, move: SHELF[m.id] }));
const ui = { who: 0 };
const $ = (id) => document.getElementById(id);
const scratch = document.createElement("canvas");

const SRC = { cmu: "CMU motion capture", quaternius: "Quaternius CC0" };
function cardHtml({ clip, id, move }) {
  const pick = store[id];
  return `<article class="mv ${pick === "keep" ? "keep" : pick === "drop" ? "drop" : ""}" data-id="${id}">
    <div class="pair"><canvas class="fig"></canvas><canvas class="src"></canvas></div>
    <header><b>${clip.name}</b><span>${(move.lengthMs / 1000).toFixed(1)} s${move.tracks.sit ? " · chair" : move.tracks.footF ? " · legs" : ""}</span></header>
    <p><span class="tag ${clip.source}">${SRC[clip.source] ?? clip.source}</span> ${clip.trial ?? clip.anim ?? ""} <a href="${clip.page}" target="_blank" rel="noopener">source</a></p>
    <div class="btns"><button data-v="keep">Keep</button><button data-v="drop">Drop</button></div>
  </article>`;
}

function render() {
  $("grid").innerHTML = MOVES.map(cardHtml).join("");
  $("count").textContent = MOVES.length;
  progress();
}
function progress() {
  const k = Object.values(store).filter((v) => v === "keep").length, d = Object.values(store).filter((v) => v === "drop").length;
  $("progress").innerHTML = `<b>${k}</b> kept · <b>${d}</b> dropped · ${MOVES.length - k - d} to go`;
}
$("grid").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-v]"); if (!b) return;
  const art = b.closest(".mv"), id = art.dataset.id, v = b.dataset.v;
  store[id] = store[id] === v ? undefined : v; save();
  art.classList.toggle("keep", store[id] === "keep"); art.classList.toggle("drop", store[id] === "drop");
  progress();
});
$("who").innerHTML = PEOPLE.map((p, i) => `<option value="${i}">${p.name}</option>`).join("");
$("who").onchange = (e) => { ui.who = +e.target.value; };
$("copy").onclick = () => {
  const text = "RF-MOTION2 " + JSON.stringify(Object.fromEntries(Object.entries(store).filter(([, v]) => v)));
  navigator.clipboard?.writeText(text).catch(() => {});
  $("copiedtext").value = text; $("copied").hidden = false;
};
$("copiedclose").onclick = () => { $("copied").hidden = true; };

// only the cards on screen animate (and their clips play)
const visible = new Set();
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); }), { rootMargin: "100px" });

// the motion capture itself, as a stick figure: what the character is copying
const BONES = [[1, 2], [1, 3], [3, 5], [2, 4], [4, 6], [1, 7], [2, 8], [7, 8], [7, 9], [9, 11], [8, 10], [10, 12]];
function drawSource(art, now) {
  const p = PREVIEW[art.dataset.id], cv = art.querySelector("canvas.src");
  if (!p) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (W < 16) return;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext("2d"); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#0b0709"; ctx.fillRect(0, 0, W, H);
  const f = p.f[Math.floor(now / (1000 / 15)) % p.f.length];
  // fit the standing figure: about 1.1 image heights tall, centred
  // kept centred on the hips (the captured person may wander across the room)
  const hx = (f[7][0] + f[8][0]) / 2000, s = H / 1.25, ox = W / 2 - hx * s * p.aspect, oy = H * 0.04;
  const X = (q) => ox + (q[0] / 1000) * s * p.aspect, Y = (q) => oy + (q[1] / 1000) * s * 0.92;
  ctx.strokeStyle = "#ff4d57"; ctx.lineWidth = Math.max(2, W / 60); ctx.lineCap = "round";
  for (const [a, b] of BONES) { ctx.beginPath(); ctx.moveTo(X(f[a]), Y(f[a])); ctx.lineTo(X(f[b]), Y(f[b])); ctx.stroke(); }
  ctx.fillStyle = "#ffb36b"; ctx.beginPath(); ctx.arc(X(f[0]), Y(f[0]), W / 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c2aeb0"; ctx.font = `${Math.round(12 * dpr)}px Sora, sans-serif`; ctx.fillText("source", 8 * dpr, H - 8 * dpr);
}

function draw(art, now) {
  const id = art.dataset.id, move = SHELF[id], cv = art.querySelector("canvas.fig");
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (W < 16) return;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext("2d"); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const p = PEOPLE[ui.who], card = cardFor(p), look = lookFor(p);
  const [wall, floor] = stageOf(look);
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H); ctx.fillStyle = floor; ctx.fillRect(0, H * 0.88, W, H * 0.12);
  const len = move.lengthMs, cycle = len + 900, ms = now % cycle;
  const spans = [{ startMs: 300, endMs: 300 + len, move: id, seed: 1 }];
  const perf = performAt({ moveSpans: spans, shelf: SHELF }, ms, { view: 0, energy: 0.6, seed: 1 });
  const state = characterState({ timeMs: ms, viseme: 0, active: false, view: 0, move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props: perf.props, face: perf.faceCue }, breath: perf.breath });
  const fr = frameFor(card, look, "full", { x: W * 0.1, y: H * 0.06, w: W * 0.8, h: H * 0.86 });
  state.follow = followAt((t) => {
    const mv = movesAt(spans, SHELF, Math.max(0, t), {}), J = mv?.joints, w = J ? J.w ?? 1 : 0;
    const r = J?.root ? [J.root[0] * w, J.root[1] * w] : [0, 0];
    return { x: r[0], y: r[1], rot: ((J?.head ? J.head[0] * w : 0) * Math.PI) / 180, hipX: r[0], hipY: r[1] };
  }, ms);
  drawFigure(ctx, card, { look, S: fr.S, x: fr.x, y: fr.y, state, layerSize: { w: W, h: H }, layerCanvas: scratch });
}
let t0 = performance.now();
function frame(now) {
  for (const art of visible) { draw(art, now - t0); drawSource(art, now - t0); }
  requestAnimationFrame(frame);
}
render();
document.querySelectorAll(".mv").forEach((a) => io.observe(a));
requestAnimationFrame(frame);
window.__moves = MOVES.map((m) => m.id);
