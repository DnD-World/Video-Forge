// TODAY | + FOLLOW-THROUGH | ACTED BY YOU — three ways to move the same Red
// Flag character (Ak, 3 Nov 2026: "maybe more natural movement?").
//   1 today's engine: the motion layer's springs on the joints
//   2 the same, plus follow-through (follow.mjs): hair, hems, earrings trail
//     the body, swing past and settle; long hair hangs when the head tilts
//   3 a person in front of a camera (or in a video file) drives the figure
//     through a body tracker (acted.mjs), with the follow-through on top
import { SHELF, lookById, stageOf, drawFigure, frameFor, characterState, performAt, movesAt, normalizeCard, followAt, takeAt, normalizeTake, takeNeutral, solveRig } from "../core/index.mjs";
import CAST from "../../brands/redflag/cast.json";

const PEOPLE = ["chloe", "margo", "amber", "rita", "lucas"].map((id) => CAST.people.find((p) => p.id === id)).filter(Boolean);
const GEO_OWN = { ...lookById("geo"), eyes: undefined }; // Ak picked "own white eyes with lids" for geo-minimal
const lookFor = (p) => (p.look === "geo" ? GEO_OWN : lookById(p.look));
const cardFor = (p, outfit = 0) => {
  const face = p.faces.find((f) => f.id === p.chosen?.face) ?? p.faces[0];
  const ids = p.chosen?.outfits ?? [p.outfits[0].id];
  const o = p.outfits.find((x) => x.id === ids[outfit % ids.length]) ?? p.outfits[0];
  return normalizeCard({ ...p.base, ...face.set, form: CAST.form ?? 0, formDetail: CAST.formDetail ?? false, formLimbs: CAST.formLimbs ?? 1, look: p.look, wear: [...o.wear, ...p.accessories] }).card;
};

// ---- the scripted reel: moves that throw the loose parts about ----------------------------
const PLAN = [
  { move: "walk-in", label: "Walk in" },
  { move: "wave", label: "Wave" },
  { pose: "shrug", label: "Shrug" },
  { move: "cheer", label: "Jump and cheer" },
  { move: "dance", label: "Little dance" },
  { move: "facepalm", label: "Facepalm" },
  { move: "bow", label: "Bow" },
  { move: "walk-out", label: "Walk out" },
];
let t0 = 400;
const moveSpans = [], poseSpans = [], marks = [];
for (const p of PLAN) {
  const m = p.move ? SHELF[p.move] : null;
  const len = m ? (m.loop ? m.lengthMs * 3 : m.hold !== null ? m.lengthMs * 1.5 : m.lengthMs) : 1800;
  if (m) moveSpans.push({ startMs: t0, endMs: t0 + len, move: p.move, seed: 2, dist: m.path ? 1.6 : undefined });
  else poseSpans.push({ startMs: t0, endMs: t0 + len, pose: p.pose });
  marks.push({ ...p, startMs: t0, endMs: t0 + len });
  t0 += len + 900;
}
const TOTAL = t0 + 600;
const SRC = { poseSpans, moveSpans, shelf: SHELF };

// talking head motion on top (the script's nods and tilts), so the hair has something to follow
const headAt = (ms) => ({ rotateDeg: Math.sin(ms / 1000 * 1.7) * 5 + Math.sin(ms / 1000 * 4.1) * 1.5, dx: 0, dy: Math.sin(ms / 1000 * 3.3) * 0.012 });
// where the figure stands (stage px → units by the figure's scale)
const travelPx = (mv, W) => {
  if (!mv?.travel) return 0;
  const at = { here: 0, left: -W * 0.72, right: W * 0.72 };
  return at[mv.travel.from] + (at[mv.travel.to] - at[mv.travel.from]) * mv.travel.p;
};
// what the loose parts hang from, cheaply: the move's own targets, no springs (followAt adds its own)
const reelSample = (W, S) => (ms) => {
  const mv = movesAt(moveSpans, SHELF, Math.max(0, ms), { energy: 0.6, seed: 2 });
  const J = mv?.joints, w = J ? J.w ?? 1 : 0;
  const root = J?.root ? [J.root[0] * w, J.root[1] * w] : [0, 0];
  const lean = J?.lean ? J.lean[0] * w : 0;
  const head = (J?.head ? J.head[0] * w : 0) + headAt(ms).rotateDeg;
  const x = root[0] + travelPx(mv, W) / S + Math.sin(lean) * 0.3;
  return { x, y: root[1], rot: (head * Math.PI) / 180, hipX: root[0] + travelPx(mv, W) / S, hipY: root[1] };
};

// ---- page state --------------------------------------------------------------------------------
const ui = { who: 0, outfit: 0, slow: 1, legs: true, turn: false };
const $ = (id) => document.getElementById(id);
const stages = [$("s0"), $("s1"), $("s2")];
const layers = stages.map(() => document.createElement("canvas"));

function room(ctx, W, H, look) {
  const [wall, floor] = stageOf(look);
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = floor; ctx.fillRect(0, H * 0.86, W, H * 0.14);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, W * 0.75);
  g.addColorStop(0, "rgba(255,255,255,0.2)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function fit(cv) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (W < 16 || H < 16) return null;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext("2d"); ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { ctx, W, H };
}
const shadow = (ctx, x, y, S) => { ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.ellipse(x, y, S * 0.1, S * 0.016, 0, 0, Math.PI * 2); ctx.fill(); };
const talkMouth = (ms) => { const k = Math.floor(ms / 110); return { viseme: [1, 2, 3, 0, 10, 12, 5, 7][k % 8], prev: [1, 2, 3, 0, 10, 12, 5, 7][(k + 7) % 8] }; };

function drawReel(k, ms, card, look) {
  const f = fit(stages[k]); if (!f) return;
  const { ctx, W, H } = f;
  room(ctx, W, H, look);
  const first = moveSpans[0], last = moveSpans[moveSpans.length - 1];
  if (ms < first.startMs || ms > last.endMs + 300) return;
  const fr = frameFor(card, look, "full", { x: W * 0.2, y: H * 0.1, w: W * 0.6, h: H * 0.8 });
  const perf = performAt(SRC, ms, { view: 0, energy: 0.6, seed: 2 });
  const m = talkMouth(ms);
  const state = characterState({ timeMs: ms, viseme: m.viseme, prevViseme: m.prev, mix: 1, head: headAt(ms), active: true, poseSpans, view: 0, move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props: perf.props, face: perf.faceCue }, breath: perf.breath });
  if (k === 1) state.follow = followAt(reelSample(W, fr.S), ms);
  const x = W / 2 + travelPx(perf, W);
  const mirror = perf.facing ? perf.facing === "left" : false;
  shadow(ctx, x, fr.y, fr.S);
  drawFigure(ctx, card, { look, S: fr.S, x, y: fr.y, mirror, state, layerSize: { w: W, h: H }, layerCanvas: layers[k] });
}

// ---- acted: camera or video → body tracker → take --------------------------------------------
const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
const act = { tracker: null, video: $("video"), on: false, take: null, recording: null, last: null, status: "" };
const say = (s) => { act.status = s; $("actstatus").textContent = s; };

async function tracker() {
  if (act.tracker) return act.tracker;
  say("Loading the body tracker…");
  const url = MP + "/vision_bundle.mjs";
  const mod = await import(/* @vite-ignore */ url);
  const files = await mod.FilesetResolver.forVisionTasks(MP + "/wasm");
  act.tracker = await mod.PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate: "GPU" }, runningMode: "VIDEO", numPoses: 1 });
  return act.tracker;
}
function newTake(mirrored) {
  const v = act.video;
  return { v: 1, fps: 30, aspect: (v.videoWidth || 16) / (v.videoHeight || 9), mirrored, frames: [], _t0: performance.now() };
}
async function startCamera() {
  try {
    await tracker();
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
    act.video.srcObject = stream; act.video.src = ""; act.video.loop = false;
    await act.video.play();
    act.take = newTake(true); act.on = true; act.file = false;
    say("Live. Stand back so your whole body shows, stand still for a second, then move.");
  } catch (e) { say("Camera did not start: " + (e.message || e)); }
}
async function startVideo(src) {
  try {
    await tracker();
    act.video.srcObject = null; act.video.crossOrigin = "anonymous"; act.video.src = src; act.video.loop = true; act.video.muted = true;
    await act.video.play();
    act.take = newTake(false); act.on = true; act.file = true;
    say("Tracking the video. It loops; the figure copies it.");
  } catch (e) { say("Video did not play: " + (e.message || e)); }
}
let lastVT = -1;
function track() {
  if (!act.on || !act.tracker || act.video.readyState < 2) return;
  const v = act.video, now = performance.now();
  // a video file: its own clock (loops start a fresh take); the camera: the page clock
  const ms = act.file ? v.currentTime * 1000 : now - act.take._t0;
  if (act.file && v.currentTime * 1000 < lastVT - 200) { act.take = newTake(false); }
  if (act.file && Math.abs(v.currentTime * 1000 - lastVT) < 1) return;
  lastVT = v.currentTime * 1000;
  const r = act.tracker.detectForVideo(v, now);
  const lm = r?.landmarks?.[0];
  if (!lm) return;
  const frame = { ms, lm: lm.map((p) => [+p.x.toFixed(4), +p.y.toFixed(4), +(p.visibility ?? 1).toFixed(2)]) };
  act.take.frames.push(frame);
  if (act.take.frames.length > 900 && !act.recording) { act.take.frames.splice(0, 300); }
  if (act.recording) act.recording.frames.push({ ...frame, ms: now - act.recording._t0 });
  act.last = lm;
}

function drawActed(ms, card, look) {
  const f = fit(stages[2]); if (!f) return;
  const { ctx, W, H } = f;
  room(ctx, W, H, look);
  const take = act.playback ?? act.take;
  const fr = frameFor(card, look, "full", { x: W * 0.2, y: H * 0.1, w: W * 0.6, h: H * 0.8 });
  if (!take || take.frames.length < 5) {
    shadow(ctx, W / 2, fr.y, fr.S);
    const m = talkMouth(ms);
    const state = characterState({ timeMs: ms, viseme: m.viseme, prevViseme: m.prev, mix: 1, head: headAt(ms), active: false, view: 0, breath: Math.sin(ms / 600) });
    ctx.globalAlpha = 0.35;
    drawFigure(ctx, card, { look, S: fr.S, x: W / 2, y: fr.y, state, layerSize: { w: W, h: H }, layerCanvas: layers[2] });
    ctx.globalAlpha = 1;
    return;
  }
  const sk = solveRig(card, look, {}), torso = sk.hy - sk.sy;
  // a playback take loops on its own clock; a live one is drawn a moment behind, so smoothing sees both sides
  const end = take.frames[take.frames.length - 1].ms, start = take.frames[0].ms;
  const at = act.playback ? start + ((ms * ui.slow) % Math.max(1, end - start)) : end - 70;
  const a = takeAt(take, at, { torso, legs: ui.legs });
  if (!a) return;
  const m = talkMouth(ms);
  const view = ui.turn ? Math.min(1, Math.abs(a.yaw) * 1.3) : 0;
  const mirror = ui.turn && a.yaw < -0.25;
  const state = characterState({ timeMs: ms, viseme: m.viseme, prevViseme: m.prev, mix: 1, head: a.head, active: true, view, move: { joints: a.joints, hands: { F: "relaxed", B: "relaxed" }, props: [] }, breath: Math.sin(ms / 600) });
  state.follow = followAt((t) => takeAt(take, t, { torso, legs: false })?.sample ?? a.sample, at);
  const x = W / 2;
  shadow(ctx, x + a.joints.root[0] * fr.S, fr.y, fr.S);
  drawFigure(ctx, card, { look, S: fr.S, x, y: fr.y, mirror, state, layerSize: { w: W, h: H }, layerCanvas: layers[2] });
}

// the camera picture with the tracked skeleton, so it is clear what the figure is copying
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [7, 2], [2, 5], [5, 8]];
function drawPip() {
  const cv = $("pip"), v = act.video;
  if (!act.on || v.readyState < 2) { cv.style.opacity = 0; return; }
  cv.style.opacity = 1;
  const W = cv.width = 320, H = cv.height = Math.round(320 * (v.videoHeight / v.videoWidth || 0.5625));
  const ctx = cv.getContext("2d");
  ctx.save();
  if (!act.file) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  ctx.drawImage(v, 0, 0, W, H);
  if (act.last) {
    ctx.strokeStyle = "#ff4d57"; ctx.lineWidth = 3; ctx.lineCap = "round";
    for (const [a, b] of BONES) { const p = act.last[a], q = act.last[b]; if ((p.visibility ?? 1) < 0.5 || (q.visibility ?? 1) < 0.5) continue; ctx.beginPath(); ctx.moveTo(p.x * W, p.y * H); ctx.lineTo(q.x * W, q.y * H); ctx.stroke(); }
  }
  ctx.restore();
}

// ---- the loop -------------------------------------------------------------------------------------
let clock = 0, prev = performance.now();
function frame(now) {
  clock += (now - prev) * ui.slow; prev = now;
  const ms = window.__freeze ?? clock % TOTAL;
  const cur = marks.find((m) => ms < m.endMs + 900) ?? marks[0];
  $("now").textContent = cur.label;
  const p = PEOPLE[ui.who], card = cardFor(p, ui.outfit), look = lookFor(p);
  drawReel(0, ms, card, look);
  drawReel(1, ms, card, look);
  track();
  drawActed(clock, card, look);
  drawPip();
  requestAnimationFrame(frame);
}

// ---- controls -------------------------------------------------------------------------------------
$("who").innerHTML = PEOPLE.map((p, i) => `<option value="${i}">${p.name} (${p.look === "geo" ? "geo-minimal" : p.look === "paper" ? "paper cut-out" : p.look})</option>`).join("");
$("who").onchange = (e) => { ui.who = +e.target.value; ui.outfit = 0; };
$("outfit").onclick = () => { ui.outfit++; };
$("slow").onchange = (e) => { ui.slow = +e.target.value; };
$("legs").onchange = (e) => { ui.legs = e.target.checked; };
$("turn").onchange = (e) => { ui.turn = e.target.checked; };
$("cam").onclick = startCamera;
$("file").onchange = (e) => { const f = e.target.files?.[0]; if (f) { act.playback = null; startVideo(URL.createObjectURL(f)); } };
$("neutral").onclick = () => { if (act.take) { act.take = newTake(act.take.mirrored); say("Neutral reset: stand still a second."); } };
$("rec").onclick = () => {
  if (!act.on) { say("Start the camera or a video first."); return; }
  if (!act.recording) { act.recording = newTake(act.take.mirrored); act.recording.frames = []; $("rec").textContent = "■ Stop"; $("rec").classList.add("live"); say("Recording a take…"); return; }
  const neutral = act.take.frames.length >= 5 ? { ...takeNeutral(act.take) } : undefined;
  const take = normalizeTake({ ...act.recording, neutral }).take; act.recording = null;
  $("rec").textContent = "● Record a take"; $("rec").classList.remove("live");
  act.playback = take; act.on = false;
  act.video.srcObject?.getTracks?.().forEach((t) => t.stop());
  const secs = take.frames.length ? (take.frames[take.frames.length - 1].ms - take.frames[0].ms) / 1000 : 0;
  say(`Take recorded: ${secs.toFixed(1)} s. It now loops; save it to keep it.`);
};
$("save").onclick = () => {
  const take = act.playback ?? act.take; if (!take) return;
  const { _t0, _ref, ...clean } = take;
  if (!clean.neutral && _ref) clean.neutral = _ref;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(clean)], { type: "application/json" }));
  a.download = `take-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`; a.click();
};
$("load").onchange = async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  const { take, problems } = normalizeTake(JSON.parse(await f.text()));
  if (!take) { say("Not a take: " + problems.join("; ")); return; }
  act.playback = take; act.on = false; say(`Loaded a ${((take.frames.at(-1).ms - take.frames[0].ms) / 1000).toFixed(1)} s take.` + (problems.length ? " " + problems.join("; ") : ""));
};
// testing hook: ?video=URL tracks a video straight away
const qv = new URLSearchParams(location.search).get("video");
if (qv) startVideo(qv);

requestAnimationFrame(frame);
window.__act = act; window.__marks = marks;
