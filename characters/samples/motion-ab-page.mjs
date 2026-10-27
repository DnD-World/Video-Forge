// BEFORE | AFTER for the motion layer (motion.mjs): the same character, the
// same moves, at the same moment — left as the targets alone (how it moved
// until 27 Oct 2026), right through springs, overlap, anticipation, weight,
// breathing and planted feet. Built into motion-ab.html by tools/motion-ab.mjs.
import { SHELF, LOOKS, drawFigure, frameFor, characterState, movesAt, performAt, normalizeCard, DRAWN_PRESETS } from "../core/index.mjs";

const PLAN = [
  { move: "walk-in", label: "Walk in" },
  { move: "wave", label: "Wave" },
  { pose: "shrug", label: "Shrug (a talking pose)" },
  { move: "cheer", label: "Jump and cheer" },
  { move: "explain", label: "Explain" },
  { move: "thumbs-up", label: "Thumbs up" },
  { move: "dance", label: "Little dance" },
  { move: "sit-down", label: "Sit down" },
  { move: "stand-up", label: "Stand up" },
  { move: "walk-out", label: "Walk out" },
];

let t = 400;
const moveSpans = [], poseSpans = [], marks = [];
for (const p of PLAN) {
  const m = p.move ? SHELF[p.move] : null;
  const len = m ? (m.loop ? m.lengthMs * 3 : m.hold !== null ? m.lengthMs * 1.5 : m.lengthMs) : 1800;
  if (m) moveSpans.push({ startMs: t, endMs: t + len, move: p.move, seed: 2, dist: m.path ? 1.6 : undefined });
  else poseSpans.push({ startMs: t, endMs: t + len, pose: p.pose });
  marks.push({ ...p, startMs: t, endMs: t + len });
  t += len + 900;
}
const TOTAL = t + 600;

const ui = { look: "sticker", who: 0, slow: 1 };
const $ = (id) => document.getElementById(id);
const stages = [$("before"), $("after")];
const layers = stages.map(() => document.createElement("canvas"));

function stageX(st, mv, w) {
  if (!mv?.travel) return w / 2;
  const at = { here: w / 2, left: -w * 0.2, right: w * 1.2 };
  return at[mv.travel.from] + (at[mv.travel.to] - at[mv.travel.from]) * mv.travel.p;
}

function frame(now) {
  const ms = window.__freeze ?? ((now * ui.slow) % TOTAL);
  const cur = marks.find((m) => ms < m.endMs + 900) ?? marks[0];
  $("now").textContent = cur.label;
  const preset = DRAWN_PRESETS[ui.who];
  const card = normalizeCard({ ...preset.card, name: preset.name, look: ui.look }).card;
  // off stage before the walk in and after the walk out
  const first = moveSpans[0], last = moveSpans[moveSpans.length - 1];
  const away = ms < first.startMs || ms > last.endMs + 300;
  stages.forEach((cv, k) => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (away) return;
    const fr = frameFor(card, ui.look, "full", { x: W * 0.25, y: H * 0.08, w: W * 0.5, h: H * 0.8 });
    let state, mv = null;
    if (k === 0) {
      mv = movesAt(moveSpans, SHELF, ms, {});
      state = characterState({ timeMs: ms, viseme: 0, poseSpans, view: 0, move: mv });
    } else {
      const perf = performAt({ poseSpans, moveSpans, shelf: SHELF }, ms, { view: 0, energy: 0.6, seed: 2 });
      mv = perf;
      state = characterState({ timeMs: ms, viseme: 0, poseSpans, view: 0, move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props: perf.props, face: perf.faceCue }, breath: perf.breath });
    }
    const x = stageX(cv, mv, W);
    const mirror = mv?.facing ? mv.facing === "left" : false;
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.beginPath(); ctx.ellipse(x, fr.y, fr.S * 0.1, fr.S * 0.016, 0, 0, Math.PI * 2); ctx.fill();
    drawFigure(ctx, card, { look: ui.look, S: fr.S, x, y: fr.y, mirror, state, layerSize: { w: W, h: H }, layerCanvas: layers[k] });
  });
  requestAnimationFrame(frame);
}

$("look").innerHTML = LOOKS.map((l) => `<option value="${l.id}">${l.name}</option>`).join("");
$("look").value = ui.look;
$("look").onchange = (e) => { ui.look = e.target.value; };
$("who").innerHTML = DRAWN_PRESETS.map((p, i) => `<option value="${i}">${p.name}</option>`).join("");
$("who").onchange = (e) => { ui.who = +e.target.value; };
$("slow").onchange = (e) => { ui.slow = +e.target.value; };
requestAnimationFrame(frame);

window.__marks = marks;
