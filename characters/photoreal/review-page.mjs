// Live review: the photoreal puppet bent by the skeleton (skin.mjs, mixing an
// A-pose and a T-pose picture per arm: multi.mjs) next to a drawn character,
// the same moves at the same moment through the same motion layer — upper
// body only, behind a news desk (Ak, 28 Oct 2026: "lets focus on the upper
// body. so sitting on a news desk with the bottom half hidden would be fine").
// tools/photoreal-review.mjs builds it with the pictures inside.
import { SHELF, performAt, characterState, solveRig, defaultCard, lookById, drawFigure, frameFor, normalizeCard, DRAWN_PRESETS } from "../core/index.mjs";
import { buildSkin } from "./skin.mjs";
import { makePuppet } from "./multi.mjs";

const { sources } = window.__REVIEW;
const MOVES = ["wave", "point", "shrug", "explain", "thumbs-up", "facepalm", "cheer", "arms-crossed", "bow"];

/** Upper body only: the legs and the body's height stay put (they are under the desk). */
const seated = (perf) => {
  const j = { ...perf.joints };
  delete j.legF; delete j.legB; delete j.footF; delete j.footB;
  j.root = [0, 0]; j.sit = [0];
  return { ...perf, joints: j };
};

/** A news desk across the lower part of the frame, and a studio behind. */
function studio(ctx, W, H, deskTop) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0e2340"); g.addColorStop(1, "#06111f");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // soft screens of light behind the presenter
  for (const [x, w, c] of [[0.12, 0.22, "rgba(91,227,181,0.10)"], [0.68, 0.22, "rgba(127,211,255,0.10)"]]) {
    ctx.fillStyle = c; ctx.fillRect(W * x, H * 0.1, W * w, H * 0.42);
    ctx.strokeStyle = c.replace("0.10", "0.35"); ctx.lineWidth = 2; ctx.strokeRect(W * x, H * 0.1, W * w, H * 0.42);
  }
}
function desk(ctx, W, H, deskTop) {
  const top = ctx.createLinearGradient(0, deskTop - H * 0.03, 0, deskTop + H * 0.03);
  top.addColorStop(0, "#e9eef4"); top.addColorStop(1, "#a9b6c4");
  ctx.fillStyle = top;
  ctx.beginPath(); ctx.moveTo(W * 0.04, deskTop); ctx.lineTo(W * 0.96, deskTop); ctx.lineTo(W, deskTop + H * 0.035); ctx.lineTo(0, deskTop + H * 0.035); ctx.closePath(); ctx.fill();
  const front = ctx.createLinearGradient(0, deskTop, 0, H);
  front.addColorStop(0, "#1b3556"); front.addColorStop(1, "#0b1a2e");
  ctx.fillStyle = front; ctx.fillRect(0, deskTop + H * 0.035, W, H);
  ctx.fillStyle = "#5be3b5"; ctx.fillRect(0, deskTop + H * 0.06, W, H * 0.008);
  ctx.globalAlpha = 0.5; ctx.fillRect(0, deskTop + H * 0.07, W, H * 0.025); ctx.globalAlpha = 1;
}
const loadImg = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });

const built = [];
for (const s of sources) {
  const img = await loadImg(s.image);
  const pc = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height }).getContext("2d");
  pc.drawImage(img, 0, 0);
  const d = pc.getImageData(0, 0, img.width, img.height).data;
  const alpha = new Uint8Array(img.width * img.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = d[i * 4 + 3];
  built.push({ image: img, skin: buildSkin(alpha, img.width, img.height, s.pose.points, { armEdges: s.armEdges }) });
}
const puppet = makePuppet(built, { size: 900 });
const rigCard = defaultCard({ name: "Rig", look: "corp" });
const rigLook = lookById("corp");
const rest = solveRig(rigCard, rigLook, { view: 0 });
const drawn = normalizeCard({ ...DRAWN_PRESETS.find((p) => p.id === "dogs-trainer").card, name: "Trainer", look: "sticker" }).card;

let t = 400;
const spans = MOVES.map((id) => {
  const m = SHELF[id];
  const len = m.loop ? m.lengthMs * 3 : m.hold !== null ? m.lengthMs * 1.6 : m.lengthMs;
  const s = { startMs: t, endMs: t + len, move: id, seed: 2 };
  t += len + 900;
  return s;
});
const TOTAL = t + 300;
const $ = (id) => document.getElementById(id);
const stages = [$("photo"), $("drawn")];
const layer = document.createElement("canvas");
const ui = { slow: 1 };
$("slow").onchange = (e) => { ui.slow = +e.target.value; };

function frame(now) {
  const ms = window.__freeze ?? (now * ui.slow) % TOTAL;
  const cur = spans.find((s) => ms < s.endMs + 900) ?? spans[0];
  $("now").textContent = SHELF[cur.move].name;
  const perf = seated(performAt({ moveSpans: spans, shelf: SHELF }, ms, { view: 0, energy: 0.5, seed: 2 }));
  const state = characterState({ timeMs: ms, viseme: 0, view: 0, move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props: perf.props, face: perf.faceCue }, breath: perf.breath });
  stages.forEach((cv, k) => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const deskTop = H * 0.7;
    studio(ctx, W, H, deskTop);
    if (k === 0) {
      const sk = solveRig(rigCard, rigLook, state);
      // the hips sit just below the desk top; the rest of the body is under it
      const h = H * 1.2;
      puppet.draw(ctx, sk, rest, { x: W / 2, y: deskTop + h * 0.46, h });
    } else {
      const fr = frameFor(drawn, "sticker", "waist", { x: W * 0.15, y: H * 0.08, w: W * 0.7, h: H * 0.72 });
      drawFigure(ctx, drawn, { look: "sticker", S: fr.S, x: fr.x, y: fr.y, state, layerSize: { w: W, h: H }, layerCanvas: layer });
    }
    desk(ctx, W, H, deskTop);
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
