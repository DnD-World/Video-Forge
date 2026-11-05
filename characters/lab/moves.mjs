// ---------------------------------------------------------------------------
// 2D lab (4 Nov 2026): the lab's moves. Each is a few strong key poses with
// timing (anim.mjs fills in the life), or a GENERATOR that writes its keys
// from a rule: a jump from real flight, a dance from the beat, a faint from
// a falling body. Keys are written for a figure 1 tall facing right; hands
// are measured from their shoulder (x = away from the body from the front,
// forwards in profile), feet are places on the stage.
//
// Modesty (Ak, 3 Nov 2026): no hip swaying, no wide stances in a skirt, no
// high kicks in a dress — the kick is done by someone in trousers.
// ---------------------------------------------------------------------------

import { GRAVITY, toppleCurve } from "./physics.mjs";

const HAPPY = { smile: 0.8, brows: "happy" };
const k = (t, pose = {}) => ({ t, ...pose });

// ---- talking and greeting ----------------------------------------------------------------------
export function wave(r) {
  // the elbow stays out at shoulder height and the forearm swings about it
  const up = [0.25, -0.1], up2 = [0.16, -0.17];
  return {
    id: "wave", label: "Wave", view: 0.3, len: 3400,
    keys: [
      k(0, { ...r }),
      // anticipation: the weight goes to the back foot, the hand dips before it rises
      k(260, { hip: [-0.012, 0], hF: [0.07, 0.3], tilt: -2, ease: "inOut" }),
      k(620, { hip: [-0.008, 0], hF: up, eF: [1, 0.9], tilt: 5, hands: { F: "wave" }, face: HAPPY, ease: "pop" }),
      k(860, { hF: up2 }), k(1100, { hF: up }), k(1340, { hF: up2 }), k(1580, { hF: up, tilt: 7 }),
      k(1820, { hF: up2 }), k(2080, { hF: up }),
      // the arm drops with weight and swings a little past rest before it settles
      k(2500, { hF: [0.04, 0.29], eF: [0.5, 1], hip: [0, 0], tilt: 2, hands: { F: "relaxed" }, ease: "inOut" }),
      k(3400, { tilt: 0, face: { smile: 0.4, brows: "serious" } }),
    ],
  };
}

// ---- sitting down and getting up (a person leans forwards to sit and to rise) -------------------
export function sitStand(r) {
  // from the side, so the knees and the lean read; the seat is behind her (x = −0.17)
  const v = 1.15, seat = -0.17; // near three-quarter (Ak, 5 Nov 2026: profile only for walks, hugs, handshakes)
  return {
    id: "sit", label: "Sit down, get up", view: v, chair: { x: seat }, len: 6400,
    keys: [
      k(0, { ...r, view: v }),
      k(350, { tilt: -7, nod: -0.04 }), // a glance back at the chair
      // the hips go back and down while the chest leans forwards to balance
      k(950, { lean: 0.48, hip: [seat * 0.4, 0.07], sit: 0.32, hF: [0.15, 0.1], hB: [0.13, 0.13], tilt: 0, nod: 0.04, ease: "inOut" }),
      k(1500, { lean: 0.22, sit: 1, hip: [seat, 0], hF: [0.16, 0.17], hB: [0.15, 0.18], ease: "inOut" }),
      // seated: upright, a small settle, hands on the lap
      k(1850, { lean: -0.05, nod: 0 }),
      k(2200, { lean: 0 }),
      k(3300, { tilt: 5, face: { smile: 0.55, brows: "happy" } }),
      // to rise: lean well forwards, hands push on the knees
      k(3850, { lean: 0.55, hF: [0.21, 0.19], hB: [0.2, 0.2], nod: 0.05, tilt: 0, ease: "inOut" }),
      k(4350, { lean: 0.42, sit: 0.35, hip: [seat * 0.45, 0.06], hF: [0.17, 0.17], ease: "inOut" }),
      k(4900, { lean: -0.05, sit: 0, hip: [0, 0], hF: r.hF, hB: r.hB, nod: 0, ease: "inOut" }),
      k(5300, { lean: 0.01 }),
      k(6400, { face: { smile: 0.35 } }),
    ],
  };
}

// ---- a jump with real flight: the keys during the air come from gravity ---------------------------
export function jump(r, { height = 0.16, view = 0.2 } = {}) {
  const v0 = Math.sqrt(2 * GRAVITY * height), T = (2 * v0) / GRAVITY * 1000;
  const t0 = 700; // leaves the floor
  const keys = [
    k(0, { ...r, view }),
    // anticipation: crouch, arms swing back and down
    k(450, { hip: [0, 0.075], lean: 0.12, hF: [0.12, 0.22], hB: [0.12, 0.22], squash: -0.08, nod: 0.06, ease: "inOut" }),
    k(t0, { hip: [0, 0], lean: -0.04, hF: [0.13, -0.24], hB: [0.13, -0.24], squash: 0.14, nod: -0.06, face: HAPPY, hands: { F: "open", B: "open" }, ease: "pop" }),
  ];
  for (let i = 1; i <= 8; i++) {
    const tt = (T * i) / 9, s = tt / 1000;
    const y = -(v0 * s - 0.5 * GRAVITY * s * s);
    const tuck = Math.sin((Math.PI * i) / 9) * 0.07;
    keys.push(k(t0 + tt, { hip: [0, y], fF: [r.fF[0] + 0.01, y + 0.0 - tuck], fB: [r.fB[0] - 0.01, y - tuck], squash: i < 4 ? 0.1 - i * 0.03 : 0.02, ease: "linear" }));
  }
  const land = t0 + T;
  keys.push(
    k(land, { hip: [0, 0], fF: r.fF, fB: r.fB, squash: 0.02, ease: "linear" }),
    // landing: squash, the knees take the weight, arms come down, a small bounce back
    k(land + 110, { hip: [0, 0.09], squash: -0.1, lean: 0.14, hF: [0.16, 0.12], hB: [0.16, 0.12], nod: 0.06, ease: "pop" }),
    k(land + 330, { hip: [0, 0.01], squash: 0.04, lean: 0, hF: [0.1, 0.25], hB: [0.1, 0.25], nod: -0.02 }),
    k(land + 560, { hip: [0, 0], squash: 0, hF: r.hF, hB: r.hB, nod: 0, hands: { F: "relaxed", B: "relaxed" } }),
    k(land + 1200, {}),
  );
  return { id: "jump", label: "Jump", view, keys, len: land + 1200, events: [{ t: land, kind: "dust" }] };
}

// ---- a kick (in trousers), seen from the side --------------------------------------------------------
export function kick(r) {
  // three-quarter, not profile (Ak, 5 Nov 2026: side views only for walking in and out, hugs and
  // handshakes); the balancing arms move little and do not spring (they wobbled)
  const v = 1, stand = { fF: [0.06, 0], fB: [-0.07, 0] };
  return {
    id: "kick", label: "Kick", view: v, len: 3000, springs: { hF: [20, 1], hB: [20, 1] },
    keys: [
      k(0, { ...r, view: v, ...stand }),
      k(300, { ...stand, hip: [0, 0.02], hF: [0.12, 0.18], hB: [0.1, 0.2], hands: { F: "fist", B: "fist" }, face: { brows: "angry", smile: -0.2 } }),
      // chamber: the knee comes up, the body leans back, the arms balance
      k(700, { fF: [0.12, -0.17], lean: -0.18, hF: [0.02, 0.17], hB: [0.13, 0.13], ease: "inOut" }),
      // the strike: fast, the foot at full reach
      k(800, { fF: [0.36, -0.3], lean: -0.34, hF: [-0.03, 0.16], hB: [0.15, 0.1], ease: "snap" }),
      k(1080, { fF: [0.35, -0.29], ease: "hold" }),
      // back to chamber, then down in front
      k(1300, { fF: [0.13, -0.15], lean: -0.12, ease: "inOut" }),
      k(1600, { fF: [0.1, 0], lean: 0, hF: [0.12, 0.18], hB: [0.1, 0.2], ease: "inOut" }),
      k(2200, { ...stand, hF: r.hF, hB: r.hB, hip: [0, 0], hands: { F: "relaxed", B: "relaxed" }, face: { brows: "happy", smile: 0.6 } }),
      k(3000, {}),
    ],
    events: [{ t: 800, kind: "whoosh" }],
  };
}

// ---- dance: built from the beat ------------------------------------------------------------------------
// 8-count phrases; the hips bounce down on every beat (a groove, not a sway),
// the head nods a little after, feet step out and close on the beat.
export function dance(r, { bpm = 116, bars = 4 } = {}) {
  const beat = 60000 / bpm, keys = [k(0, { ...r, view: 0.15, face: HAPPY })];
  const L = r.fF[0], R = r.fB[0];
  const phrases = [
    // step-touch with claps
    (b) => ({ fF: b % 4 === 0 ? [L + 0.06, 0] : b % 4 === 1 ? [L, 0] : r.fF, fB: b % 4 === 2 ? [R - 0.06, 0] : b % 4 === 3 ? [R, 0] : r.fB, hF: b % 2 ? [-0.1, 0.12] : [0.1, 0.15], hB: b % 2 ? [-0.1, 0.12] : [0.1, 0.15], hands: { F: "open", B: "open" } }),
    // disco point: up across, down
    (b) => ({ fF: r.fF, fB: r.fB, hF: b % 2 ? [0.06, 0.26] : [0.12, -0.26], hB: b % 2 ? [0.1, 0.22] : [-0.02, 0.22], eF: [1, 0.3], hands: { F: "point", B: "relaxed" } }),
    // raise the roof
    (b) => ({ fF: r.fF, fB: r.fB, hF: b % 2 ? [0.17, -0.1] : [0.19, -0.2], hB: b % 2 ? [0.17, -0.1] : [0.19, -0.2], eF: [1, 0.5], eB: [1, 0.5], hands: { F: "open", B: "open" } }),
    // side to side, arms swinging low
    (b) => ({ fF: b % 2 ? [L + 0.05, 0] : r.fF, fB: b % 2 ? r.fB : [R - 0.05, 0], hF: b % 2 ? [0.16, 0.18] : [-0.04, 0.24], hB: b % 2 ? [-0.04, 0.24] : [0.16, 0.18], hands: { F: "relaxed", B: "relaxed" } }),
  ];
  let t = 0;
  for (let bar = 0; bar < bars; bar++) {
    const ph = phrases[bar % phrases.length];
    for (let b = 0; b < 8; b++) {
      const p = ph(b);
      // down on the beat, up in between
      keys.push(k(t + beat * 0.02 + 1, { ...p, hip: [0, 0.03], squash: -0.03, nod: 0.06, ease: "pop" }));
      keys.push(k(t + beat * 0.55, { hip: [0, 0.004], squash: 0.02, nod: -0.02, ease: "inOut" }));
      t += beat;
    }
  }
  keys.push(k(t + 300, { ...r, view: 0.15, hip: [0, 0], squash: 0, nod: 0, face: HAPPY }), k(t + 900, {}));
  return { id: "dance", label: "Dance to the beat", view: 0.15, keys, len: t + 900, beat, bpm };
}

// ---- a faint: knees go, the body falls like a plank, a bounce, then a cartoon "plank" rise ----------
export function faint(r) {
  const v = 1, fall = toppleCurve({ height: 1 }); // three-quarter (Ak, 5 Nov 2026)
  const keys = [
    k(0, { ...r, view: v }),
    k(400, { face: { lids: "half", brows: "worried", smile: -0.3 }, tilt: -8 }),
    // the knees give, the head rolls, the arms hang
    k(900, { hip: [0, 0.05], tilt: -18, nod: 0.08, hF: [0.03, 0.29], hB: [0.0, 0.29], ease: "inOut" }),
    k(1150, { face: { lids: "closed", brows: "worried", smile: -0.7 }, hip: [0, 0.02], tilt: -25 }),
  ];
  // the fall itself, from physics (rotation about the feet; backwards is negative)
  for (let i = 1; i <= 14; i++) {
    const tt = i * 70;
    keys.push(k(1150 + tt, { rot: -fall(tt), hip: [0, 0], hF: [-0.05 - i * 0.008, 0.27], hB: [-0.05 - i * 0.009, 0.27], ease: "linear" }));
  }
  const down = 1150 + 14 * 70;
  keys.push(
    k(down + 1300, { rot: -Math.PI / 2, tilt: -10 }),
    // out cold on the floor: no smile at all (Ak, 5 Nov 2026), a dazed flat mouth as she comes round
    k(down + 1600, { face: { lids: "half", brows: "confused", smile: -0.6 } }),
    // the cartoon rise: stiff as a board, back up about the heels
    k(down + 2300, { rot: -0.05, hF: r.hF, hB: r.hB, tilt: 6, ease: "inOut" }),
    k(down + 2500, { rot: 0.03, face: { lids: "open", brows: "raised", smile: -0.3 } }),
    k(down + 2700, { rot: 0, tilt: 0 }),
    k(down + 3300, {}),
  );
  return { id: "faint", label: "Faint (and a cartoon get-up)", view: v, keys, len: down + 3300, events: [{ t: down - 60, kind: "dust" }] };
}

// ---- standing in the wind: a shiver, holding the arms -------------------------------------------------
export function windStand(r) {
  return {
    id: "wind", label: "Standing in the wind", view: 0.35, loop: true, len: 6000,
    keys: [
      k(0, { ...r, view: 0.35 }),
      k(1500, { tilt: 4, hF: [0.06, 0.28] }),
      k(3000, { hF: [-0.1, 0.12], hB: [-0.1, 0.13], eF: [1, 0.3], eB: [1, 0.3], lean: 0.05, tilt: -3, face: { brows: "worried", smile: -0.1 } }),
      k(4500, { tilt: 2 }),
      k(6000, { ...r, view: 0.35 }),
    ],
  };
}

// ---- a slow turn: front, profile, back to front (to see how faces turn) ---------------------------
// a slow full turn for checking a look from every side (5 Nov 2026): front → three-quarter →
// profile, a hold at each, and back
export function turnSlow(r) {
  return {
    id: "turnSlow", label: "Slow turn", view: 0, loop: true, len: 16000,
    keys: [
      k(0, { ...r, view: 0, face: { smile: 0.4 } }), k(1200, { view: 0 }),
      k(3600, { view: 1, ease: "inOut" }), k(4800, { view: 1 }),
      k(7200, { view: 2, ease: "inOut" }), k(8800, { view: 2 }),
      k(11200, { view: 1, ease: "inOut" }), k(12400, { view: 1 }),
      k(14800, { view: 0, ease: "inOut" }), k(16000, { view: 0 }),
    ],
  };
}

export function turn(r) {
  return {
    id: "turn", label: "Turn to profile", view: 0, loop: true, len: 7000,
    keys: [
      k(0, { ...r, view: 0, face: { smile: 0.5 } }), k(600, { view: 0 }),
      k(2600, { view: 2, ease: "inOut" }), k(3900, { view: 2, tilt: 3 }),
      k(5900, { view: 0, tilt: 0, ease: "inOut" }), k(7000, { view: 0 }),
    ],
  };
}

/** Everything the variety reel plays, in order. */
export const REEL = [jump, kick, dance, faint];
