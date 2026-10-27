// ---------------------------------------------------------------------------
// The MOTION LIBRARY: moves as data, not code (ultra plan #48, 27 Oct 2026).
//
// A move is a small JSON object — keyframes for the skeleton's joints, hand
// shapes, props in hand, face cues, a walking pattern and a path across the
// scene — so new moves are written (or recorded from a webcam, #37) without
// touching the drawing code, and any character in any look can perform them.
//
//   normalizeMove   any object → a valid move + problems in plain words
//   STYLES          graceful, aggressive, tired, shy, proud, playful, sneaky…
//   playMove        a move at a moment, with style/energy/size/tempo/seed/
//                   mirror → the joint state solveRig takes (state.joints)
//   movesAt         a span list → the blended state at a moment (what the
//                   avatar and every render worker call per frame)
//   readMoveTag     "[gives the box to Maria]" → { move, prop, target, style }
//
// Joint conventions are the skeleton's own (rig.mjs): angles in radians,
// 0 = hanging straight down, positive swings away from the body (in profile:
// forwards). Figure units: standing height = 1, up is negative.
//
// Everything is a pure function of its inputs: the same move, time and seed
// give the same pose in the live preview and in every render worker.
// ---------------------------------------------------------------------------

import { clamp, lerp, smooth, hash } from "./math.mjs";
import { BROWS, LIDS } from "./face.mjs";

export const MOVE_VERSION = 1;

/** The channels a move can key, and how many numbers each holds. */
export const CHANNELS = {
  armF: { n: 2, help: "front arm: [upper arm, forearm] angles" },
  armB: { n: 2, help: "back arm: [upper arm, forearm] angles" },
  legF: { n: 2, help: "front leg: [thigh forwards, knee bend]" },
  legB: { n: 2, help: "back leg: [thigh forwards, knee bend]" },
  root: { n: 2, help: "whole body shift: [x, y] in body heights (y < 0 is up)" },
  lean: { n: 1, help: "upper body lean forwards, radians" },
  head: { n: 2, help: "head: [tilt in degrees, drop as a fraction of the head]" },
  sit: { n: 1, help: "0 standing … 1 sitting" },
  view: { n: 1, help: "0 facing the camera … 2 side profile" },
  open: { n: 1, help: "how open the prop in hand is (a box lid, a door): 0 … 1" },
};
const CHANNEL_KEYS = Object.keys(CHANNELS);

/** The rest pose every move starts from and returns to (matches rig.mjs POSES.rest). */
export const REST = { armF: [0.12, 0.1], armB: [0.12, 0.1], legF: [0, 0], legB: [0, 0], root: [0, 0], lean: [0], head: [0, 0], sit: [0], view: [0], open: [0] };

export const HAND_SHAPES = ["relaxed", "open", "fist", "point", "thumbsUp", "ok", "peace", "grip", "wave"];
export const KINDS = ["gesture", "pose", "travel", "stance", "pair", "idle"];
export const EASES = ["inOut", "linear", "in", "out", "step", "back"];
export const PATH_ENDS = ["here", "left", "right", "partner"];

/**
 * Styles reshape any move, so "walk" alone gives dozens of walks.
 *   tempo   speed of the whole move        size    how far limbs go from rest
 *   snap    overshoot when a key lands      lean    upper body forwards (rad)
 *   headTilt, headDrop                      armsIn  pull arms towards the body
 *   gait    { stride, swing, bounce, knee, crouch } multipliers/adds
 */
export const STYLES = {
  neutral: { label: "Neutral", tempo: 1, size: 1, snap: 0.08, lean: 0, headTilt: 0, headDrop: 0, armsIn: 0, gait: {} },
  graceful: { label: "Graceful", tempo: 0.85, size: 1.15, snap: 0.02, lean: -0.02, headTilt: 3, headDrop: -0.02, armsIn: 0, gait: { stride: 1.15, swing: 1.3, bounce: 0.4, knee: 1.2 } },
  aggressive: { label: "Aggressive", tempo: 1.3, size: 1.2, snap: 0.22, lean: 0.12, headTilt: 0, headDrop: 0.06, armsIn: 0, gait: { stride: 1.2, swing: 1.1, bounce: 0.6 } },
  tired: { label: "Tired", tempo: 0.7, size: 0.7, snap: 0, lean: 0.1, headTilt: -4, headDrop: 0.14, armsIn: 0.05, gait: { stride: 0.7, swing: 0.5, bounce: 0.3, knee: 0.6 } },
  shy: { label: "Shy", tempo: 0.9, size: 0.65, snap: 0.02, lean: 0.04, headTilt: 6, headDrop: 0.1, armsIn: 0.12, gait: { stride: 0.65, swing: 0.4, bounce: 0.5 } },
  proud: { label: "Proud", tempo: 0.95, size: 1.1, snap: 0.1, lean: -0.08, headTilt: -2, headDrop: -0.06, armsIn: 0, gait: { stride: 1.15, swing: 1.4, bounce: 0.8, knee: 1.1 } },
  playful: { label: "Playful", tempo: 1.15, size: 1.1, snap: 0.25, lean: 0, headTilt: 5, headDrop: 0, armsIn: 0, gait: { stride: 1, swing: 1.3, bounce: 2.2, knee: 1.3 } },
  sneaky: { label: "Sneaky", tempo: 0.8, size: 0.9, snap: 0.02, lean: 0.14, headTilt: 0, headDrop: 0.04, armsIn: 0, gait: { stride: 0.8, swing: 0.3, bounce: 0.2, knee: 1.8, crouch: 0.05 } },
};
export const STYLE_IDS = Object.keys(STYLES);

/** Words a script uses for a style: "[walks in proudly]", "[waves shyly]". */
const STYLE_WORDS = {
  graceful: /^(graceful(ly)?|elegant(ly)?|gently|smooth(ly)?|softly)$/,
  aggressive: /^(aggressive(ly)?|angr(y|ily)|furious(ly)?|stomp(s|ing)?)$/,
  tired: /^(tired(ly)?|wear(y|ily)|exhausted|sleep(y|ily)|slowly)$/,
  shy: /^(sh(y|yly)|nervous(ly)?|timid(ly)?|awkward(ly)?)$/,
  proud: /^(proud(ly)?|confident(ly)?|bold(ly)?|triumphant(ly)?)$/,
  playful: /^(playful(ly)?|happ(y|ily)|cheerful(ly)?|bouncy|excited(ly)?)$/,
  sneaky: /^(sneak(y|ily)|quiet(ly)?|careful(ly)?|on tiptoe)$/,
};

// ---- checking a move ------------------------------------------------------------------------

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const ID = /^[a-z0-9][a-z0-9-]{0,40}$/;

/** One channel's keys, checked: [[t, value(s), ease?], …] sorted by t. */
function checkTrack(name, keys, problems) {
  const n = CHANNELS[name].n;
  if (!Array.isArray(keys)) { problems.push(`track "${name}" isn't a list of keys`); return null; }
  const out = [];
  for (const k of keys) {
    if (!Array.isArray(k) || !isNum(k[0])) { problems.push(`track "${name}": a key needs [time, value]`); continue; }
    const t = clamp(k[0]);
    const raw = n === 1 ? (Array.isArray(k[1]) ? k[1] : [k[1]]) : k[1];
    if (!Array.isArray(raw) || raw.length !== n || !raw.every(isNum)) { problems.push(`track "${name}" at ${t}: needs ${n} number${n > 1 ? "s" : ""}`); continue; }
    const e = k[2] === undefined ? "inOut" : k[2];
    if (!EASES.includes(e)) problems.push(`track "${name}" at ${t}: ease "${e}" isn't one of ${EASES.join(", ")}`);
    out.push([t, raw.map(Number), EASES.includes(e) ? e : "inOut"]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out.length ? out : null;
}

/** Step keys (hands, face): [[t, value], …]. */
function checkSteps(label, keys, ok, problems) {
  if (!Array.isArray(keys)) return [];
  const out = [];
  for (const k of keys) {
    if (!Array.isArray(k) || !isNum(k[0])) { problems.push(`${label}: a key needs [time, value]`); continue; }
    if (!ok(k[1])) { problems.push(`${label} at ${k[0]}: "${JSON.stringify(k[1])}" isn't allowed`); continue; }
    out.push([clamp(k[0]), k[1]]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

const FACE_KEYS = { brows: Object.keys(BROWS), lids: Object.keys(LIDS), smile: "number" };
const okFace = (f) => f && typeof f === "object" && Object.entries(f).every(([k, v]) => FACE_KEYS[k] && (FACE_KEYS[k] === "number" ? isNum(v) : FACE_KEYS[k].includes(v)));

/**
 * Bring any object (a shelf entry, a recorded move, a hand edit) to a valid
 * move. Never throws. Returns { move, problems } — problems in plain words;
 * a move with no usable tracks, gait or path is still returned (it rests).
 */
export function normalizeMove(input) {
  const src = input && typeof input === "object" ? input : {};
  const problems = [];
  const id = typeof src.id === "string" && ID.test(src.id) ? src.id : (problems.push(`id "${src.id}" must be lowercase letters, digits and dashes`), "move");
  const move = {
    v: MOVE_VERSION,
    id,
    name: typeof src.name === "string" && src.name.trim() ? src.name.trim().slice(0, 60) : id,
    help: typeof src.help === "string" ? src.help.slice(0, 230) : "",
    kind: KINDS.includes(src.kind) ? src.kind : (src.kind !== undefined && problems.push(`kind "${src.kind}" isn't one of ${KINDS.join(", ")}`), "gesture"),
    tags: Array.isArray(src.tags) ? src.tags.filter((t) => typeof t === "string").map((t) => t.toLowerCase()) : [],
    phrases: Array.isArray(src.phrases) ? src.phrases.filter((t) => typeof t === "string").map((t) => t.toLowerCase().trim()) : [],
    lengthMs: isNum(src.lengthMs) ? clamp(src.lengthMs, 200, 20000) : (problems.push("lengthMs is missing; used 1500"), 1500),
    loop: !!src.loop,
    hold: isNum(src.hold) ? clamp(src.hold) : null,
    tracks: {},
    hands: { F: [], B: [] },
    face: [],
    props: [],
    gait: null,
    path: null,
    stance: src.stance === "sit" || src.stance === "stand" ? src.stance : null,
    pair: null,
  };
  for (const [k, keys] of Object.entries(src.tracks ?? {})) {
    if (!CHANNELS[k]) { problems.push(`"${k}" isn't a joint; use ${CHANNEL_KEYS.join(", ")}`); continue; }
    const tr = checkTrack(k, keys, problems);
    if (tr) move.tracks[k] = tr;
  }
  for (const h of ["F", "B"]) move.hands[h] = checkSteps(`hand ${h}`, src.hands?.[h], (v) => HAND_SHAPES.includes(v), problems);
  move.face = checkSteps("face", src.face, okFace, problems);
  for (const p of Array.isArray(src.props) ? src.props : []) {
    if (!p || typeof p.id !== "string") { problems.push("a prop needs an id"); continue; }
    move.props.push({ id: p.id, hand: p.hand === "B" ? "B" : "F", t0: isNum(p.t0) ? clamp(p.t0) : 0, t1: isNum(p.t1) ? clamp(p.t1) : 1 });
  }
  if (src.gait && typeof src.gait === "object") {
    const g = src.gait;
    move.gait = {
      t0: isNum(g.t0) ? clamp(g.t0) : 0, t1: isNum(g.t1) ? clamp(g.t1) : 1,
      cadence: isNum(g.cadence) ? clamp(g.cadence, 0.3, 5) : 1.8, // steps per second
      stride: isNum(g.stride) ? clamp(g.stride, 0, 2) : 1,
      swing: isNum(g.swing) ? clamp(g.swing, 0, 2) : 1,
      bounce: isNum(g.bounce) ? clamp(g.bounce, 0, 4) : 1,
      knee: isNum(g.knee) ? clamp(g.knee, 0, 3) : 1,
      crouch: isNum(g.crouch) ? clamp(g.crouch, 0, 0.2) : 0,
      skip: !!g.skip, run: !!g.run,
    };
  }
  if (src.path && typeof src.path === "object") {
    const p = src.path;
    const end = (v, d) => (PATH_ENDS.includes(v) ? v : (v !== undefined && problems.push(`path end "${v}" isn't one of ${PATH_ENDS.join(", ")}`), d));
    move.path = { from: end(p.from, "here"), to: end(p.to, "here"), t0: isNum(p.t0) ? clamp(p.t0) : 0, t1: isNum(p.t1) ? clamp(p.t1) : 1 };
  }
  if (src.pair && typeof src.pair === "object") {
    move.pair = {
      role: typeof src.pair.role === "string" ? src.pair.role : "a",
      partner: typeof src.pair.partner === "string" ? src.pair.partner : id,
      contact: isNum(src.pair.contact) ? clamp(src.pair.contact) : 0.5,
    };
  }
  if (move.hold !== null && move.loop) { problems.push("a move can hold or loop, not both; kept the loop"); move.hold = null; }
  if (!Object.keys(move.tracks).length && !move.gait && !move.path && !move.stance) problems.push("this move has no tracks, walk or path, so nothing moves");
  for (const k of Object.keys(src)) if (!(k in move) && k !== "v") problems.push(`"${k}" isn't a move field, ignored`);
  return { move, problems };
}

// ---- playing a move -------------------------------------------------------------------------

/** Eased progress k (0–1) for a segment that lands on a key with this ease. */
function eased(k, e, snap) {
  switch (e) {
    case "linear": return k;
    case "in": return k * k;
    case "out": return 1 - (1 - k) * (1 - k);
    case "step": return k < 1 ? 0 : 1;
    case "back": return smooth(k) + 0.35 * Math.sin(Math.PI * k) * k * k;
    default: return smooth(k) + snap * Math.sin(Math.PI * k) * k * k; // a little overshoot as it lands
  }
}

/** A channel's value at u (0–1 of the move), from rest before the first key. */
function sample(track, u, rest, snap, loop) {
  if (!track) return null;
  const first = track[0], last = track[track.length - 1];
  if (u <= first[0]) {
    if (loop) return last[1]; // a loop's start joins its end
    if (first[0] <= 0) return first[1];
    return mixV(rest, first[1], eased(u / first[0], first[2], snap));
  }
  if (u >= last[0]) return last[1];
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1], b = track[i];
    if (u <= b[0]) return mixV(a[1], b[1], eased((u - a[0]) / Math.max(1e-6, b[0] - a[0]), b[2], snap));
  }
  return last[1];
}
const mixV = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
const stepAt = (steps, u, d) => { let v = d; for (const [t, x] of steps) if (u >= t) v = x; return v; };

/** Small seeded wobble: two slow sines per channel, so no two takes are identical. */
const wobble = (seed, ch, t, amp) => amp * (Math.sin(t * (1.3 + hash(seed, ch) * 1.7) + hash(seed, ch + 50) * 6.28) * 0.6 + Math.sin(t * (2.9 + hash(seed, ch + 9)) + hash(seed, ch + 77) * 6.28) * 0.4);

/**
 * The walk cycle at time ts (seconds into the walk): legs, an arm swing
 * opposite to the legs, a bob and a crouch. Style multiplies it.
 */
function gaitAt(g, ts, fade, st) {
  const sg = st.gait ?? {};
  // style tempo already speeds the whole move (and so the steps); cadence is the move's own
  const cadence = g.cadence * (g.run ? 1.6 : 1);
  const stride = g.stride * (sg.stride ?? 1) * (g.run ? 1.35 : 1) * fade;
  const knee = g.knee * (sg.knee ?? 1);
  const ph = Math.PI * cadence * ts; // one step per half cycle
  const legs = (off) => {
    const s = Math.sin(ph + off);
    const th = s * 0.42 * stride;
    const bend = Math.max(0, Math.sin(ph + off + 0.9)) * 0.7 * stride * knee + (g.skip ? Math.max(0, s) * 0.5 * fade : 0);
    return [th, bend];
  };
  const swing = 0.32 * g.swing * (sg.swing ?? 1) * stride;
  const arm = (off) => [0.12 + Math.sin(ph + off) * swing * (g.run ? 1.4 : 1), 0.12 + (g.run ? 1.3 : 0.25) * fade + Math.max(0, Math.sin(ph + off)) * 0.2 * stride];
  const bounce = g.bounce * (sg.bounce ?? 1);
  const bob = -Math.abs(Math.sin(ph)) * 0.012 * stride * bounce - (g.skip ? Math.abs(Math.sin(ph)) * 0.03 * fade : 0);
  const crouch = (g.crouch + (sg.crouch ?? 0)) * fade;
  return {
    legF: legs(0), legB: legs(Math.PI),
    // the front arm swings with the BACK leg, as people walk
    armF: arm(Math.PI), armB: arm(0),
    root: [0, bob + crouch], lean: [g.run ? 0.14 * fade : 0],
  };
}

/**
 * Where in the move (0–1) a span is at time ms. A span longer than the move
 * either loops, or plays up to `hold`, holds, and plays the rest at the end.
 */
export function moveProgress(move, spanMs, ms, tempo = 1) {
  const len = move.lengthMs / Math.max(0.2, tempo);
  if (move.loop) return { u: (ms % len) / len, wall: ms };
  if (move.hold !== null && spanMs > len) {
    const inMs = len * move.hold, outMs = len - inMs;
    if (ms < inMs) return { u: ms / len, wall: ms };
    if (ms > spanMs - outMs) return { u: move.hold + (ms - (spanMs - outMs)) / len, wall: ms };
    return { u: move.hold, wall: ms };
  }
  return { u: clamp(ms / len), wall: ms };
}

/**
 * One move at ms milliseconds into its span.
 * opts: { style, energy (0–1), size (0.3–1.6), tempo (0.4–2), seed, mirror,
 *         spanMs (how long the span lasts, for holds) }
 * Returns { joints, hands, face, props, travel, facing, stance } — joints in
 * the skeleton's own conventions, unweighted (movesAt does the blending).
 */
export function playMove(move, ms, opts = {}) {
  const st = STYLES[opts.style] ?? STYLES.neutral;
  const energy = clamp(opts.energy ?? 0.5);
  const size = clamp(opts.size ?? 1, 0.3, 1.6) * st.size;
  const tempo = clamp(opts.tempo ?? 1, 0.4, 2) * st.tempo;
  const seed = opts.seed ?? 0;
  const snap = st.snap * (0.5 + energy);
  const spanMs = opts.spanMs ?? move.lengthMs / tempo;
  const { u } = moveProgress(move, spanMs, ms, tempo);
  const t = ms / 1000;

  const joints = {};
  for (const k of CHANNEL_KEYS) {
    const v = sample(move.tracks[k], u, REST[k], snap, move.loop);
    if (!v) continue;
    // size scales how far a joint goes from rest (not the root, view or sit)
    joints[k] = ["armF", "armB", "legF", "legB", "lean", "head"].includes(k) ? v.map((x, i) => REST[k][i] + (x - REST[k][i]) * size) : v.slice();
  }

  // walking: generated, unless the move keys that channel itself (a walk with a cup)
  if (move.gait && u >= move.gait.t0 && u <= move.gait.t1) {
    const span = Math.max(1e-3, move.gait.t1 - move.gait.t0);
    const g = (u - move.gait.t0) / span;
    const fade = Math.min(1, g / 0.12, (1 - g) / 0.12);
    const wt = (u - move.gait.t0) * (move.lengthMs / 1000); // seconds walked, in the move's own time
    const gj = gaitAt(move.gait, wt, smooth(clamp(fade)), st);
    for (const [k, v] of Object.entries(gj)) {
      if (move.tracks[k]) continue;
      joints[k] = k === "root" && joints.root ? [joints.root[0] + v[0], joints.root[1] + v[1]] : v;
    }
  }

  // style on top: lean, head, arms in, and a seeded wobble that grows with energy
  joints.lean = [(joints.lean?.[0] ?? 0) + st.lean];
  joints.head = [(joints.head?.[0] ?? 0) + st.headTilt + wobble(seed, 1, t, 1.5 * energy), (joints.head?.[1] ?? 0) + st.headDrop];
  for (const a of ["armF", "armB"]) {
    if (!joints[a] && st.armsIn) joints[a] = REST[a].slice();
    if (joints[a]) joints[a] = [joints[a][0] - st.armsIn + wobble(seed, a === "armF" ? 3 : 5, t, 0.04 * energy), joints[a][1] + wobble(seed, a === "armF" ? 4 : 6, t, 0.05 * energy)];
  }

  // mirroring: the other arm and leg do it
  if (opts.mirror) {
    [joints.armF, joints.armB] = [joints.armB, joints.armF];
    [joints.legF, joints.legB] = [joints.legB, joints.legF];
    for (const k of ["armF", "armB", "legF", "legB"]) if (!joints[k]) delete joints[k];
  }
  const hands = {
    F: stepAt(move.hands[opts.mirror ? "B" : "F"], u, "relaxed"),
    B: stepAt(move.hands[opts.mirror ? "F" : "B"], u, "relaxed"),
  };
  const face = stepAt(move.face, u, null);
  const props = move.props.filter((p) => u >= p.t0 && u <= p.t1).map((p) => ({ id: p.id, hand: opts.mirror ? (p.hand === "F" ? "B" : "F") : p.hand, open: joints.open?.[0] ?? 0 }));
  let travel = null, facing = null;
  if (move.path) {
    const { from, to, t0, t1 } = move.path;
    const p = smooth(clamp((u - t0) / Math.max(1e-3, t1 - t0)));
    travel = { from, to, p };
    if (from !== to && u >= t0 && u <= t1) facing = to === "left" || from === "right" ? "left" : to === "right" || from === "left" ? "right" : null;
  }
  return { joints, hands, face, props, travel, facing, stance: move.stance && u >= 0.5 ? move.stance : null, u };
}

// ---- spans: what the avatar asks per frame ----------------------------------------------------

export const MOVE_EASE_MS = 260;

/**
 * The blended state at timeMs from a span list
 *   [{ startMs, endMs, move: id, style?, prop?, target?, seed? }]
 * with a shelf (id → move). Returns { joints: {...channels, w}, hands, face,
 * props, travel, facing, sit } or null when no move is on. `w` is how far
 * the move has come in (eased), so the skeleton blends from whatever the
 * talking pose was. A stance (sitting) carries on after its span.
 */
export function movesAt(spans, shelf, timeMs, opts = {}) {
  if (!spans?.length) return null;
  let sit = 0, seat = [];
  let out = null;
  for (const s of spans) {
    const move = shelf[s.move];
    if (!move) continue;
    // what a stance leaves behind: sitting, and whatever it ended holding (the chair)
    if (move.stance && timeMs >= s.endMs) {
      sit = move.stance === "sit" ? 1 : 0;
      seat = sit ? move.props.filter((p) => p.t1 >= 1).map((p) => ({ id: s.prop ?? p.id, hand: p.hand, open: 0 })) : [];
    }
    if (timeMs < s.startMs - MOVE_EASE_MS || timeMs >= s.endMs + MOVE_EASE_MS) continue;
    const ms = Math.max(0, timeMs - s.startMs);
    const r = playMove(move, Math.min(ms, s.endMs - s.startMs), { ...opts, style: s.style ?? opts.style, seed: s.seed ?? opts.seed, spanMs: s.endMs - s.startMs });
    const kin = clamp((timeMs - (s.startMs - MOVE_EASE_MS)) / MOVE_EASE_MS);
    const kout = clamp((s.endMs + MOVE_EASE_MS - timeMs) / MOVE_EASE_MS);
    // travel and stances must not ease back out: a walk-in ends where it arrives
    const w = smooth(move.path || move.stance ? kin : Math.min(kin, kout));
    if (s.prop) for (const p of r.props) p.id = s.prop;
    out = { ...r, joints: { ...r.joints, w }, target: s.target ?? null, move: move.id };
  }
  if (!out) return sit ? { joints: { sit: [1], w: 1 }, hands: { F: "relaxed", B: "relaxed" }, face: null, props: seat, travel: null, facing: null, sit } : null;
  if (out.joints.sit === undefined && sit) { out.joints.sit = [1]; out.props = [...seat, ...out.props]; }
  return out;
}

/** How long a span for this move should last, in ms, at this tempo/style. */
export function moveLengthMs(move, { style, tempo = 1 } = {}) {
  return Math.round(move.lengthMs / (clamp(tempo, 0.4, 2) * (STYLES[style] ?? STYLES.neutral).tempo));
}

// ---- script tags ---------------------------------------------------------------------------

const FILLER = /^(the|a|an|his|her|their|my|your|its|τον|την|το|ένα|μια)$/;

/**
 * "[walks in proudly]" / "[gives the box to Maria]" → { move, style, prop,
 * target } using the shelf's phrases, the prop catalogue's names and the
 * cast's labels. Longest phrase wins; returns null when no move matches.
 */
export function readMoveTag(tag, shelf, { props = {}, cast = [] } = {}) {
  const words = String(tag).toLowerCase().replace(/[[\]]/g, "").replace(/[.,!;:]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const text = words.join(" ");
  let best = null;
  for (const m of Object.values(shelf)) {
    for (const p of m.phrases) {
      if ((text === p || text.startsWith(p + " ")) && (!best || p.length > best.p.length)) best = { m, p };
    }
  }
  if (!best) return null;
  const rest = text.slice(best.p.length).trim().split(" ").filter((w) => w && !FILLER.test(w));
  let style, prop, target;
  for (let i = 0; i < rest.length; i++) {
    const w = rest[i];
    const s = Object.entries(STYLE_WORDS).find(([, re]) => re.test(w));
    if (s) { style = s[0]; continue; }
    const p = Object.entries(props).find(([id, names]) => id === w || names.includes(w));
    if (p) { prop = p[0]; continue; }
    if ((w === "to" || w === "σε" || w === "στον" || w === "στην") && rest[i + 1]) {
      const who = rest.slice(i + 1).join(" ");
      const c = cast.find((c) => who.startsWith(c.label.toLowerCase()));
      if (c) { target = c.id; break; }
    }
  }
  return { move: best.m.id, style, prop, target };
}

/** A list of move objects → { shelf: id → checked move, problems: ["id: …"] }. */
export function buildShelf(list) {
  const shelf = {}, problems = [];
  for (const src of list ?? []) {
    const { move, problems: p } = normalizeMove(src);
    for (const x of p) problems.push(`${move.id}: ${x}`);
    if (shelf[move.id]) problems.push(`${move.id}: there are two moves with this id; kept the first`);
    else shelf[move.id] = move;
  }
  return { shelf, problems };
}
