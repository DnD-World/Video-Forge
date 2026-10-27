// Live review: the photoreal puppet bent by the skeleton (skin.mjs, mixing an
// A-pose and a T-pose picture per arm: multi.mjs) next to a drawn character,
// the same moves at the same moment through the same motion layer.
// tools/photoreal-review.mjs builds it with the pictures inside.
import { SHELF, performAt, characterState, solveRig, defaultCard, lookById, drawFigure, frameFor, normalizeCard, DRAWN_PRESETS } from "../core/index.mjs";
import { buildSkin } from "./skin.mjs";
import { makePuppet } from "./multi.mjs";

const { sources } = window.__REVIEW;
const MOVES = ["wave", "point", "shrug", "cheer", "explain", "thumbs-up", "facepalm", "dance", "arms-crossed"];
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
  const perf = performAt({ moveSpans: spans, shelf: SHELF }, ms, { view: 0, energy: 0.5, seed: 2 });
  const state = characterState({ timeMs: ms, viseme: 0, view: 0, move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props: perf.props, face: perf.faceCue }, breath: perf.breath });
  stages.forEach((cv, k) => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (k === 0) {
      const sk = solveRig(rigCard, rigLook, state);
      puppet.draw(ctx, sk, rest, { x: W / 2, y: H * 0.95, h: H * 0.72 });
    } else {
      const fr = frameFor(drawn, "sticker", "full", { x: W * 0.2, y: H * 0.14, w: W * 0.6, h: H * 0.8 });
      drawFigure(ctx, drawn, { look: "sticker", S: fr.S, x: fr.x, y: fr.y, state, layerSize: { w: W, h: H }, layerCanvas: layer });
    }
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
