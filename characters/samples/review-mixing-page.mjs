// A live A/B/C review page for experiments #49b/#49c: the same moves, looping,
// on three stages side by side. tools/review-mixing.mjs builds it into one
// HTML file with the puppet picture inside (in characters/checks/, never
// committed — the picture may be a private character).
import { SHELF, drawFigure, drawCharacter, frameFor, autoPerformance, movesAt, solveRig, lookById, normalizeCard } from "../core/index.mjs";
import { drawCutout } from "../experiments/cutout.mjs";

const { image, limbs, card: card0, look } = window.__REVIEW;
const MOVES = ["wave", "point", "shrug", "cheer", "dance", "explain", "thumbs-up", "facepalm"];
const img = new Image();
img.src = image;
await new Promise((ok) => (img.onload = ok));

const probe = document.createElement("canvas"); probe.width = img.width; probe.height = img.height;
probe.getContext("2d").drawImage(img, 0, 0);
const [r, g, b] = probe.getContext("2d").getImageData(limbs.face[0], limbs.face[1] + 25, 1, 1).data;
const skin = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
const card = normalizeCard({ ...card0, skin, look }).card;
const L = lookById(look);
const rest = solveRig(card, L, { view: 0 });
const stages = [...document.querySelectorAll("canvas.stage")];
const layers = stages.map(() => document.createElement("canvas"));
const moveName = document.getElementById("move");

// one long loop: every move in turn with a breath between
const plan = [];
let t = 0;
for (const id of MOVES) {
  const m = SHELF[id];
  const span = m.hold !== null ? m.lengthMs * 1.6 : m.loop ? m.lengthMs * 3 : m.lengthMs;
  plan.push({ id, startMs: t + 500, endMs: t + 500 + span });
  t += span + 1300;
}
const total = t;

function frame(now) {
  const ms = now % total;
  const cur = plan.find((p) => ms < p.endMs + 1300) ?? plan[0];
  moveName.textContent = SHELF[cur.id].name;
  const mv = movesAt(plan.map((p) => ({ startMs: p.startMs, endMs: p.endMs, move: p.id })), SHELF, ms, { energy: 0.4, seed: 3 });
  const base = autoPerformance(ms / 1000, { talking: false });
  const state = { ...base, view: 0, joints: mv?.joints ?? null, hands: mv?.hands ?? null, props: mv?.props ?? [], smile: mv?.face?.smile ?? 0 };
  stages.forEach((cv, k) => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const fr = frameFor(card, L, "full", { x: W * 0.12, y: H * 0.12, w: W * 0.76, h: H * 0.8 });
    if (k === 0) drawFigure(ctx, card, { look: L, S: fr.S, x: fr.x, y: fr.y, state, layerSize: { w: W, h: H }, layerCanvas: layers[k] });
    else if (k === 1) drawCutout(ctx, img, limbs, solveRig(card, L, state), rest, { x: fr.x, y: fr.y, h: H * 0.78 });
    else {
      const info = drawCharacter(ctx, card, { look: L, S: fr.S, x: fr.x, y: fr.y, state, headless: true });
      const hp = limbs.head, top = Math.min(...hp.map((p) => p[1])), bottom = Math.max(...hp.map((p) => p[1]));
      const s = (info.head.r * 2.55) / (bottom - top);
      ctx.save();
      ctx.translate(info.head.x, info.head.y + info.head.r * 0.15);
      ctx.rotate(((state.head?.rotateDeg ?? 0) + (state.joints?.head?.[0] ?? 0) * (state.joints?.w ?? 0)) * Math.PI / 180);
      ctx.scale(s, s);
      ctx.translate(-limbs.face[0], -(top + bottom) / 2);
      ctx.beginPath(); hp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip();
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
