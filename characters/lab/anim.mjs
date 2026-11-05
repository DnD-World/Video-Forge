// ---------------------------------------------------------------------------
// 2D lab (4 Nov 2026): pose-to-pose animation with an animator's touch.
//
// A move is a handful of KEY POSES with timing. Between them the engine
// draws smooth curves (they pass through every key without stopping), and
// then adds what an animator would:
//   arcs       hands travel round the shoulder, never in straight lines
//   overlap    hips move first, then chest, head, and the hands arrive last
//   overshoot  hands and head swing a little past a key and settle
//   alive      a character is never frozen: breath, weight drift, tiny head moves
//   feet       a foot stays exactly where it is until a key moves it, and
//              then it lifts on an arc and lands (no sliding, no floating)
//
// Everything is a pure function of time, so a frame can be drawn alone and
// a render gives the same picture every time.
//
// Pose fields (all optional; a key that leaves one out keeps the last value).
// Units are body heights (scaled by the card's height), x forwards, y < 0 up.
//   hip   [x, y]   pelvis shift: x across, y > 0 crouch, y < 0 off the floor
//   lean           upper body forwards (radians)
//   tilt, nod      head tilt (degrees), head drop (fraction of the head)
//   hF, hB [x, y]  front / back hand, from its shoulder
//   eF, eB [x, y]  which way the elbow points (a hint)
//   fF, fB [x, y]  front / back foot on the stage (y < 0 lifted)
//   sit, view      0–1 sitting; 0 front … 2 side
//   squash         + stretched tall, − squashed
//   rot            whole body rotation (a faint, a spin on the floor)
//   hands {F, B}, face {smile, lids, brows}: held from the key they appear in
// ---------------------------------------------------------------------------

import { hash } from "../core/math.mjs";

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;

// ---- smooth noise: wandering, never jumping ----------------------------------------------------
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u);
}
export const fbm = (x, seed = 0) => noise1(x, seed) * 0.6 + noise1(x * 2.13 + 7.1, seed + 1) * 0.28 + noise1(x * 4.7 + 3.3, seed + 2) * 0.12;

// ---- eases ---------------------------------------------------------------------------------------
const EASE = {
  smooth: (p) => p,                          // the curve itself is smooth
  linear: (p) => p,
  snap: (p) => p * p * p,                    // slow start, arrives fast: a strike
  pop: (p) => 1 - (1 - p) ** 3,             // leaves fast, eases in: a reaction
  hold: (p) => (p < 0.8 ? 0 : ((p - 0.8) / 0.2) ** 2),
  inOut: (p) => p * p * (3 - 2 * p),
};

// the channels a pose has, how many numbers each, and how it travels
const VEC = ["hip", "hF", "hB", "eF", "eB", "fF", "fB"];
const SCAL = ["lean", "tilt", "nod", "sit", "view", "squash", "rot"];
const SCALED = new Set(["hip", "hF", "hB", "fF", "fB"]); // lengths: scaled by the card's height

/** A move's keys, filled in: every key has every channel (carried forwards). */
export function compileMove(move, rest) {
  const keys = [...move.keys].sort((a, b) => a.t - b.t);
  const cur = { ...rest };
  const out = [];
  for (const k of keys) {
    for (const c of [...VEC, ...SCAL]) if (k[c] !== undefined) cur[c] = Array.isArray(k[c]) ? k[c].slice() : k[c];
    if (k.hands) cur.hands = { ...cur.hands, ...k.hands };
    if (k.face) cur.face = { ...cur.face, ...k.face };
    const full = {};
    for (const c of [...VEC, ...SCAL]) full[c] = Array.isArray(cur[c]) ? cur[c].slice() : cur[c];
    out.push({ t: k.t, ease: k.ease ?? "smooth", hands: cur.hands ? { ...cur.hands } : null, face: cur.face ? { ...cur.face } : null, ...full });
  }
  return { ...move, keys: out, len: move.len ?? keys[keys.length - 1].t };
}

// Catmull-Rom through the keys (non-uniform times); tangents flatten at a
// "hold" so the pose really rests there
function curve(keys, get, t) {
  const n = keys.length;
  if (t <= keys[0].t) return get(keys[0]);
  if (t >= keys[n - 1].t) return get(keys[n - 1]);
  let i = 0;
  while (i < n - 2 && t > keys[i + 1].t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const dt = k2.t - k1.t || 1;
  const p = EASE[k2.ease]?.((t - k1.t) / dt) ?? (t - k1.t) / dt;
  const v0 = get(k0), v1 = get(k1), v2 = get(k2), v3 = get(k3);
  // tangents (per unit of this segment); a key the move holds, or a snap, has none
  const flat1 = k1.ease === "hold" || k2.ease === "snap" || k2.ease === "linear";
  const flat2 = k2.ease === "hold" || k2.ease === "linear" || k3 === k2;
  const m1 = flat1 || k1 === k0 ? 0 : ((v2 - v0) / (k2.t - k0.t || 1)) * dt * 0.9;
  const m2 = flat2 ? 0 : ((v3 - v1) / (k3.t - k1.t || 1)) * dt * 0.9;
  const p2 = p * p, p3 = p2 * p;
  return (2 * p3 - 3 * p2 + 1) * v1 + (p3 - 2 * p2 + p) * m1 + (-2 * p3 + 3 * p2) * v2 + (p3 - p2) * m2;
}

// a hand travels on an arc: its angle round the shoulder and its distance
const polar = ([x, y]) => [Math.atan2(x, y), Math.hypot(x, y)];
const unpolar = ([a, r]) => [Math.sin(a) * r, Math.cos(a) * r];

// how late each part follows the hips (ms), scaled by the move's looseness
const DELAY = { hip: 0, squash: 0, rot: 0, sit: 0, view: 40, lean: 35, tilt: 80, nod: 70, hF: 95, hB: 110, eF: 95, eB: 110, fF: 0, fB: 0 };
// springs on top (overshoot and settle): angular speed, damping
const SPRING = { hF: [17, 0.5], hB: [16, 0.52], tilt: [13, 0.42], nod: [14, 0.5], lean: [15, 0.62] };

function rawAt(m, t, opts) {
  const keys = m.keys, loose = opts.loose ?? 1;
  const at = (c) => clamp(t - DELAY[c] * loose, 0, m.len);
  const out = {};
  for (const c of SCAL) out[c] = curve(keys, (k) => k[c], at(c));
  for (const c of ["hip", "eF", "eB"]) out[c] = [0, 1].map((i) => curve(keys, (k) => k[c][i], at(c)));
  for (const c of ["hF", "hB"]) {
    // unwrap angles key to key so a hand never spins the long way round
    let prev = null;
    const P = keys.map((k) => { const p = polar(k[c]); if (prev !== null) { while (p[0] - prev > Math.PI) p[0] -= 2 * Math.PI; while (p[0] - prev < -Math.PI) p[0] += 2 * Math.PI; } prev = p[0]; return p; });
    const idx = new Map(keys.map((k, i) => [k, i]));
    out[c] = unpolar([curve(keys, (k) => P[idx.get(k)][0], at(c)), curve(keys, (k) => P[idx.get(k)][1], at(c))]);
  }
  // feet: planted until a key moves them, then a lifted arc (no overshoot, no lag)
  for (const c of ["fF", "fB"]) {
    let i = 0;
    while (i < keys.length - 1 && t > keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(keys.length - 1, i + 1)];
    const p = b === a ? 1 : EASE.inOut(clamp((t - a.t) / (b.t - a.t || 1)));
    const d = Math.hypot(b[c][0] - a[c][0], b[c][1] - a[c][1]);
    const lift = a[c][1] === 0 && b[c][1] === 0 && d > 0.004 ? Math.sin(Math.PI * p) * Math.min(0.05, d * 0.55) : 0;
    out[c] = [lerp(a[c][0], b[c][0], p), lerp(a[c][1], b[c][1], p) - lift];
  }
  return out;
}

/**
 * The pose at time t (ms into the move). opts: { seed, alive (0–1),
 * loose (overlap 0–2), springs (true) }. Returns a pose with every channel,
 * plus hands and face from the last key passed.
 */
export function poseAt(m, t, opts = {}) {
  const loop = m.loop ? ((t % m.len) + m.len) % m.len : clamp(t, 0, m.len);
  const sample = (tt) => rawAt(m, m.loop ? ((tt % m.len) + m.len) % m.len : clamp(tt, 0, m.len), opts);
  const out = sample(loop);
  // springs: re-run a short window ending now, so any frame stands alone
  if (opts.springs !== false) {
    const DT = 1000 / 200, N = 90;
    const win = [];
    for (let k = 0; k <= N; k++) win.push(k === N ? out : sample(t - (N - k) * DT));
    // a move may calm its springs (a kick's balancing arms must not wobble)
    for (const [c, [w, z]] of Object.entries({ ...SPRING, ...(m.springs ?? {}) })) {
      const dims = Array.isArray(out[c]) ? 2 : 1;
      for (let d = 0; d < dims; d++) {
        const tgt = (k) => { const v = win[k][c]; return dims === 2 ? v[d] : v; };
        let y = tgt(0), v = 0;
        for (let k = 1; k <= N; k++) {
          const a = w * w * (tgt(k) - y) - 2 * z * w * v;
          v += a * (DT / 1000); y += v * (DT / 1000);
        }
        if (dims === 2) out[c][d] = y; else out[c] = y;
      }
    }
  }
  // alive: weight drift, breath, a head that is never quite still
  const alive = opts.alive ?? 1, s = (opts.seed ?? 0) * 13.7, ts = t / 1000;
  if (alive > 0) {
    out.hip[0] += fbm(ts * 0.35 + s, 3) * 0.006 * alive;
    out.lean += fbm(ts * 0.3 + s, 4) * 0.012 * alive;
    out.tilt += fbm(ts * 0.45 + s, 5) * 2.2 * alive;
    out.nod += fbm(ts * 0.5 + s, 6) * 0.025 * alive;
    for (const [c, sd] of [["hF", 7], ["hB", 9]]) { out[c][0] += fbm(ts * 0.4 + s, sd) * 0.007 * alive; out[c][1] += fbm(ts * 0.37 + s, sd + 1) * 0.006 * alive; }
  }
  out.breath = Math.sin(ts * (2 * Math.PI / 3.8) + s);
  let i = 0;
  while (i < m.keys.length - 1 && loop >= m.keys[i + 1].t) i++;
  out.hands = m.keys[i].hands ?? { F: "relaxed", B: "relaxed" };
  out.face = m.keys[i].face ?? null;
  return out;
}

/** Scale a pose's lengths by the card's height (keys are written for height 1). */
export function scalePose(p, h) {
  for (const c of SCALED) p[c] = [p[c][0] * h, p[c][1] * h];
  return p;
}

/** Mix two poses (a move blending into the next). */
export function mixPose(a, b, k) {
  const o = { ...b };
  for (const c of VEC) o[c] = [lerp(a[c][0], b[c][0], k), lerp(a[c][1], b[c][1], k)];
  for (const c of SCAL) o[c] = lerp(a[c], b[c], k);
  o.hands = k < 0.5 ? a.hands : b.hands; o.face = k < 0.5 ? a.face : b.face;
  o.breath = b.breath;
  return o;
}
