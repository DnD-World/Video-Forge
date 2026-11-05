// ---------------------------------------------------------------------------
// ACTED TAKES (3 Nov 2026): Ak acts a moment in front of a camera, a body
// tracker (MediaPipe Pose, 33 points per frame) records where the shoulders,
// elbows, wrists, hips, knees, ankles, eyes and ears were, and the drawn
// character moves the same way. Ak: "maybe more natural movement?" — a real
// person's timing beats any hand-tuned spring.
//
// A TAKE keeps the raw points, not joint angles, so a better mapping later
// improves every take already recorded:
//   { v: 1, fps, aspect (w/h), mirrored, neutral?, frames: [{ ms, lm: [[x, y, vis] × 33]
//     (0–1 image coords, y down)] }]
//
// Pure and deterministic: takeAt(take, ms) gives the same joints for the
// same moment in the preview and in every render worker (smoothing is a
// centred average over neighbouring frames, so it has no lag either).
//
//   takeAt(take, ms, { torso }) → { joints, head, view, mirror, follow sample }
// ---------------------------------------------------------------------------

import { clamp } from "./math.mjs";

export const TAKE_VERSION = 1;
const L = { nose: 0, eyeL: 2, eyeR: 5, earL: 7, earR: 8, shL: 11, shR: 12, elL: 13, elR: 14, wrL: 15, wrR: 16, hipL: 23, hipR: 24, knL: 25, knR: 26, anL: 27, anR: 28 };
const SEEN = 0.5;
const SMOOTH_MS = 45; // the smoothing's spread: enough to hide tracker shiver, not a real flick

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** The take's points at ms: a centred, weighted average of the frames around it. */
function pointsAt(take, ms) {
  const F = take.frames;
  if (!F.length) return null;
  // binary search for the frame at ms
  let lo = 0, hi = F.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (F[m].ms <= ms) lo = m; else hi = m - 1; }
  const out = F[lo].lm.map(() => [0, 0, 0]), wsum = F[lo].lm.map(() => 0);
  for (let i = Math.max(0, lo - 6); i <= Math.min(F.length - 1, lo + 6); i++) {
    const d = (F[i].ms - ms) / SMOOTH_MS, g = Math.exp(-0.5 * d * d);
    F[i].lm.forEach((p, k) => {
      const w = g * Math.max(0.05, p[2] ?? 1);
      out[k][0] += p[0] * w; out[k][1] += p[1] * w; out[k][2] += (p[2] ?? 1) * g; wsum[k] += w;
    });
  }
  let gs = 0;
  for (let i = Math.max(0, lo - 6); i <= Math.min(F.length - 1, lo + 6); i++) { const d = (F[i].ms - ms) / SMOOTH_MS; gs += Math.exp(-0.5 * d * d); }
  return out.map((p, k) => [p[0] / (wsum[k] || 1), p[1] / (wsum[k] || 1), p[2] / (gs || 1)]);
}

/** Screen space: x across in units of image height (so angles are true), mirrored like a mirror if asked. */
function toScreen(take, lm) {
  const a = take.aspect ?? 16 / 9;
  return lm.map(([x, y, v]) => [(take.mirrored ? 1 - x : x) * a, y, v]);
}

/** The standing reference ("neutral"): where the hips and feet were at the start (median of the first frames). */
export function reference(take) {
  if (take._ref) return take._ref;
  // a take cut from a longer session keeps the neutral measured at its start
  if (take.neutral) return (take._ref = take.neutral);
  const n = Math.min(take.frames.length, 15), hipY = [], hipX = [], floor = [], torso = [];
  for (let i = 0; i < n; i++) {
    const p = toScreen(take, take.frames[i].lm);
    const mh = mid(p[L.hipL], p[L.hipR]), ms = mid(p[L.shL], p[L.shR]);
    hipY.push(mh[1]); hipX.push(mh[0]); torso.push(Math.hypot(mh[0] - ms[0], mh[1] - ms[1]));
    if (p[L.anL][2] > SEEN && p[L.anR][2] > SEEN) floor.push(Math.max(p[L.anL][1], p[L.anR][1]));
  }
  const med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : null);
  take._ref = { hipY: med(hipY), hipX: med(hipX), floor: med(floor), torso: med(torso) || 0.25 };
  return take._ref;
}
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.min(a[2], b[2])];

/**
 * The character's motion at ms from a take.
 * torso: the drawn figure's shoulder-to-hip length (figure units), so a
 * performer's step of one torso is the figure's step of one torso.
 * Returns { joints (for drawCharacter's state.joints), head ({rotateDeg, dx, dy}),
 * yaw (−1 left … 1 right), sample ({x, y, rot, hipX, hipY} for followAt) } or null.
 */
export function takeAt(take, ms, { torso = 0.3, legs = true } = {}) {
  const raw = pointsAt(take, ms);
  if (!raw) return null;
  const p = toScreen(take, raw), ref = reference(take), k = torso / ref.torso;
  const shL = p[L.shL], shR = p[L.shR];
  // the arm on screen right is the figure's front arm (it faces +x)
  const [sF, sB] = shL[0] > shR[0] ? ["L", "R"] : ["R", "L"];
  const arm = (s, dir) => {
    const sh = p[L["sh" + s]], el = p[L["el" + s]], wr = p[L["wr" + s]];
    if (el[2] < SEEN) return [0.12, 0.1];
    const a1 = Math.atan2(dir * (el[0] - sh[0]), el[1] - sh[1]);
    if (wr[2] < SEEN) return [a1, 0.1];
    const a12 = Math.atan2(dir * (wr[0] - el[0]), wr[1] - el[1]);
    return [a1, wrap(a12 - a1)];
  };
  const joints = { armF: arm(sF, 1), armB: arm(sB, -1), w: 1 };

  const mh = mid(p[L.hipL], p[L.hipR]), ms0 = mid(shL, shR);
  // the whole body: a step aside, a crouch (hips lower) or a jump (hips higher)
  const rootX = (mh[0] - ref.hipX) * k;
  const rootY = mh[2] > SEEN ? (mh[1] - ref.hipY) * k : 0;
  joints.root = [rootX, clamp(rootY, -0.25, 0.3)];

  // feet: placed where the performer's are, relative to their hip (front view shows 0.3 of it)
  if (legs && ref.floor !== null && p[L.anL][2] > SEEN && p[L.anR][2] > SEEN) {
    const [aF, aB] = p[L.hipL][0] > p[L.hipR][0] ? ["L", "R"] : ["R", "L"];
    const foot = (s) => {
      const hip = p[L["hip" + s]], an = p[L["an" + s]];
      return [((an[0] - hip[0]) * k) / 0.3, Math.min(0, (an[1] - ref.floor) * k - Math.max(0, rootY))];
    };
    joints.footF = foot(aF); joints.footB = foot(aB);
  }

  // the head: tilt from the eye line, nod from the nose against the ears, turn from the nose between the ears
  const eL = p[L.eyeL], eR = p[L.eyeR], [e1, e2] = eL[0] < eR[0] ? [eL, eR] : [eR, eL];
  const roll = Math.atan2(e2[1] - e1[1], e2[0] - e1[0]);
  const earL = p[L.earL], earR = p[L.earR], em = mid(earL, earR), earW = Math.abs(earL[0] - earR[0]) || 0.05;
  const nose = p[L.nose];
  const yaw = clamp(((nose[0] - em[0]) / (earW / 2)) * 1.1, -1, 1);
  const nod = clamp(((nose[1] - em[1]) / earW - 0.15) * 0.5, -0.12, 0.12);
  // the body's own sideways tip shows as the head carried off-centre over the hips
  const head = { rotateDeg: clamp((roll * 180) / Math.PI, -30, 30), dx: clamp((ms0[0] - mh[0]) * k * 0.6, -0.15, 0.15), dy: nod };

  // what the loose parts hang from (follow.mjs): the head's position and tilt
  const headX = rootX + head.dx * 0.5, headY = joints.root[1];
  return { joints, head, yaw, sample: { x: headX, y: headY, rot: roll, hipX: rootX, hipY: joints.root[1] } };
}

/** Check a loaded take; returns { take, problems }. */
export function normalizeTake(t) {
  const problems = [];
  if (!t || !Array.isArray(t.frames)) return { take: null, problems: ["not a take (no frames)"] };
  const frames = t.frames.filter((f) => Number.isFinite(f.ms) && Array.isArray(f.lm) && f.lm.length >= 29);
  if (frames.length < t.frames.length) problems.push(`${t.frames.length - frames.length} frames dropped (bad shape)`);
  if (!frames.length) problems.push("no usable frames");
  const neutral = t.neutral && Number.isFinite(t.neutral.torso) ? t.neutral : undefined;
  return { take: { v: TAKE_VERSION, fps: t.fps ?? 30, aspect: t.aspect ?? 16 / 9, mirrored: !!t.mirrored, neutral, frames }, problems };
}

// ---- from a take to a move on the shelf (motion library from free clips, 3 Nov 2026) --------

/**
 * Where the action is: the stretch of the take where the arms, head and body
 * move most, padded a little, at most maxMs long. Returns { inMs, outMs }.
 */
export function activeSpan(take, { maxMs = 6000, padMs = 350, torso = 0.3 } = {}) {
  const F = take.frames;
  if (F.length < 3) return { inMs: F[0]?.ms ?? 0, outMs: F.at(-1)?.ms ?? 0 };
  const step = 66, t0 = F[0].ms, t1 = F.at(-1).ms, e = [];
  let prev = takeAt(take, t0, { torso });
  for (let t = t0 + step; t <= t1; t += step) {
    const a = takeAt(take, t, { torso });
    const d = (x, y) => x.reduce((s, v, i) => s + Math.abs(v - y[i]), 0);
    e.push({ t, v: d(a.joints.armF, prev.joints.armF) + d(a.joints.armB, prev.joints.armB) + d(a.joints.root, prev.joints.root) * 8 + Math.abs(a.head.rotateDeg - prev.head.rotateDeg) / 30 });
    prev = a;
  }
  // the best window of up to maxMs by total motion
  const n = Math.max(1, Math.round(maxMs / step));
  let best = 0, bi = 0, sum = 0;
  for (let i = 0; i < e.length; i++) { sum += e[i].v; if (i >= n) sum -= e[i - n].v; if (sum > best) { best = sum; bi = i; } }
  const win = e.slice(Math.max(0, bi - n + 1), bi + 1);
  // trim the quiet ends inside the window
  const peak = Math.max(...win.map((x) => x.v)), on = win.filter((x) => x.v > peak * 0.18);
  const inMs = Math.max(t0, (on[0]?.t ?? win[0].t) - padMs), outMs = Math.min(t1, (on.at(-1)?.t ?? win.at(-1).t) + padMs);
  return { inMs, outMs };
}

/**
 * A take's stretch as a move (moves.mjs format): dense linear keys every
 * 50 ms between an ease in from rest and an ease back to rest, so it plays,
 * blends, mirrors and takes styles like any hand-made move. The body's start
 * position is the zero: a gesture stays where the character stands.
 * meta: { id, name, help, kind, tags, phrases, hands, face, source }.
 */
export function takeToMove(take, { inMs, outMs, torso = 0.3, legs = "auto", sit = "auto", keyMs = 66, ...meta } = {}) {
  const span = activeSpan(take, { torso });
  const a = inMs ?? span.inMs, b = outMs ?? span.outMs;
  const len = Math.max(300, b - a), lead = 0.1, tail = 0.12;
  const lengthMs = Math.round(len / (1 - lead - tail));
  const start = takeAt(take, a, { torso });
  const rows = [];
  for (let t = a; t <= b + 1; t += keyMs) rows.push({ u: lead + ((t - a) / len) * (1 - lead - tail), s: takeAt(take, Math.min(t, b), { torso }) });
  const r3 = (x) => Math.round(x * 500) / 500; // 0.002 steps: finer than a pixel at any size we draw
  const key = (u, v, i, n) => [r3(u), v.map(r3), i === 0 ? "inOut" : "linear"];
  const tracks = { armF: [], armB: [], root: [], head: [] };
  // hips dropping a long way is a person sitting down: the rig's own sit (onto a
  // chair) instead of a squat. SIT_DROP is how far the rig's hips drop to sit.
  const SIT_DROP = 0.16;
  // measured from the standing neutral, so a clip that starts seated reads as seated
  const sitK = (r) => clamp(r.s.joints.root[1] / SIT_DROP);
  // really sitting: low for over half a second (a scared crouch or a lunge dips, then rises)
  const seated = sit === true || (sit !== false && rows.filter((r) => sitK(r) > 0.85).length * keyMs > 600);
  if (seated) tracks.sit = [];
  rows.forEach((r, i) => {
    const { u, s } = r;
    tracks.armF.push(key(u, s.joints.armF, i));
    tracks.armB.push(key(u, s.joints.armB, i));
    const k = seated ? sitK(r) : 0, dy = seated ? s.joints.root[1] : s.joints.root[1] - start.joints.root[1];
    tracks.root.push(key(u, [s.joints.root[0] - start.joints.root[0], dy - k * SIT_DROP], i));
    tracks.head.push(key(u, [s.head.rotateDeg, s.head.dy], i));
    if (seated) tracks.sit.push(key(u, [k], i));
  });
  // the legs only when they really do something (a step, a stamp, a dance), never while sitting
  const feet = !seated && rows.every((r) => r.s.joints.footF);
  if (feet) {
    const f0 = start.joints.footF, b0 = start.joints.footB;
    const spread = 0.09; // the standing feet's own width (rig.mjs: 0.06 rad of spread, seen at 0.3)
    const moved = Math.max(...rows.map((r) => Math.abs(r.s.joints.footF[0] - f0[0]) + Math.abs(r.s.joints.footF[1]) + Math.abs(r.s.joints.footB[0] - b0[0]) + Math.abs(r.s.joints.footB[1])));
    if (legs === true || (legs === "auto" && moved > 0.12)) {
      tracks.footF = rows.map(({ u, s }, i) => key(u, [s.joints.footF[0] - f0[0] + spread, s.joints.footF[1]], i));
      tracks.footB = rows.map(({ u, s }, i) => key(u, [s.joints.footB[0] - b0[0] - spread, s.joints.footB[1]], i));
    }
  }
  // back to rest
  // back to rest; a move that ends seated stays seated (like sit-down), one that ends standing stands
  const endSit = seated ? (sitK(rows.at(-1)) > 0.5 ? 1 : 0) : 0;
  const REST = { armF: [0.12, 0.1], armB: [0.12, 0.1], root: [0, 0], head: [0, 0], footF: [0.09, 0], footB: [-0.09, 0], sit: [endSit] };
  for (const k of Object.keys(tracks)) tracks[k].push([1, REST[k], "inOut"]);
  const { id, name, help = "", kind = "gesture", tags = [], phrases = [], hands, face } = meta;
  return {
    id, name: name ?? id, help, kind: seated ? "stance" : kind, tags: [...tags, "acted", ...(seated ? ["sit"] : [])], phrases, lengthMs, tracks,
    ...(seated ? { props: [{ id: "chair", hand: "F", t0: 0, t1: 1 }], stance: endSit ? "sit" : "stand" } : {}),
    ...(hands ? { hands } : {}), ...(face ? { face } : {}),
  };
}

// ---- which recorded clips become shelf moves (one rule for tools/acted-shelf.mjs and the data test)
/** Arms must be seen in at least this share of a take's frames for it to become a move. */
export const MIN_ARMS_SEEN = 0.5;
/** The shelf id a clip's move gets. */
export const clipMoveId = (clip) => clip.move ?? clip.id;
/** Whether a clip gets a quality entry at all (a dropped clip is left out entirely). */
export const clipTracked = (clip) => !clip.drop;
/** Whether a clip with this quality entry becomes a shelf move (and a preview). */
export const clipOnShelf = (clip, quality) => !clip.drop && !!quality && quality.arms >= MIN_ARMS_SEEN;

// Sounds a voice makes. In a script, "[laughs]" is for the voice, not the body (moves.test.mjs).
const VOICE_SOUNDS = new Set(["laughs", "cries", "sobs", "gasps", "sighs", "γελάει", "κλαίει"]);
/**
 * Recorded moves join the starter shelf without changing what any script tag
 * already does (code review, 5 Nov 2026): a recorded move drops each phrase that
 * is a voice sound, is already a starter phrase, or starts or ends where a starter
 * phrase does ("points at" would beat the starter "points" in [points at Maria]).
 * Returns the recorded moves with their phrases trimmed; ids are left alone.
 */
export function trimActedPhrases(starter, acted) {
  const taken = starter.flatMap((m) => m.phrases ?? []).map((p) => p.toLowerCase().trim());
  const clash = (p) => VOICE_SOUNDS.has(p) || taken.some((s) => s === p || p.startsWith(s + " ") || s.startsWith(p + " "));
  return acted.map((m) => ({ ...m, phrases: (m.phrases ?? []).filter((p) => !clash(p.toLowerCase().trim())) }));
}
