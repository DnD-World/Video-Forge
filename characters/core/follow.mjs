// ---------------------------------------------------------------------------
// FOLLOW-THROUGH (3 Nov 2026): the loose parts — hair, hems, earrings — that
// are carried by the body but are not the body. They lag when it moves, swing
// past where it stopped and settle, and long hair hangs down when the head
// tilts. Ak: "maybe more natural movement?"
//
// The motion layer (motion.mjs) gives the joints weight; this gives the
// things hanging off them weight. Same rule: a frame may not depend on the
// frame before (render workers draw in any order), so the pendulums are
// re-run over a short window ending at the frame.
//
//   followAt(sample, timeMs) → state.follow for drawCharacter
//   sample(ms) → { x, y, rot }: the head's position (figure units, x across,
//   y down) and tilt (radians) at that moment, from whatever drives the
//   figure: moves, a talking loop, or a filmed take.
// ---------------------------------------------------------------------------

import { clamp } from "./math.mjs";

// MODESTY (Ak, 5 Nov 2026), for every hem the engine draws: a hem may rise at most 1% of the
// body height and swing at most 2% sideways, so a dress never slides off the hips and legs
// under it (at 0.075 sideways the handshake's step-in swung the skirt clear of her hips).
export const HEM_LIFT_MAX = 0.01;
export const HEM_SWAY_MAX = 0.02;
/** A hem point's sideways and up/down shift (body heights; up is negative) after the modesty cap. */
export const capHem = (dx, dy) => [clamp(dx, -HEM_SWAY_MAX, HEM_SWAY_MAX), Math.max(-HEM_LIFT_MAX, dy)];

const WINDOW_MS = 1400;
const DT = 1000 / 120;

/**
 * Each loose part is a mass on a spring hung from the head or hips:
 * w natural frequency (rad/s), z damping (lower swings longer), gain
 * (how far a lag of one unit throws it).
 */
const PARTS = {
  hair: { w: 7, z: 0.18, gain: 6.5, tilt: 0.7 },
  hem: { w: 9, z: 0.25, gain: 1.8 },
  ear: { w: 8, z: 0.1, gain: 12, tilt: 1 },
};

function pendulum(samples, { w, z }, pick) {
  let y = pick(samples[0]), v = 0;
  for (let i = 1; i < samples.length; i++) {
    const acc = w * w * (pick(samples[i]) - y) - 2 * z * w * v;
    v += acc * (DT / 1000);
    y += v * (DT / 1000);
  }
  return y - pick(samples[samples.length - 1]); // how far it trails (and overshoots) the body
}

/**
 * The follow state at timeMs: { hair: [swing, lift units], hem: [dx, dy]
 * units, ear: swing rad, tilt }. Swings are in screen space.
 */
export function followAt(sample, timeMs) {
  const P = PARTS, n = Math.ceil(WINDOW_MS / DT), t0 = timeMs - n * DT;
  // the hanger's path over the window, sampled once for every part
  const S = [];
  for (let i = 0; i <= n; i++) S.push(sample(Math.max(0, t0 + i * DT)));
  const hx = pendulum(S, P.hair, (s) => s.x);
  const hy = pendulum(S, P.hair, (s) => s.y);
  const hr = pendulum(S, P.hair, (s) => s.rot);
  const mx = pendulum(S, P.hem, (s) => s.hipX ?? s.x);
  const my = pendulum(S, P.hem, (s) => s.hipY ?? s.y);
  const ex = pendulum(S, P.ear, (s) => s.x);
  const er = pendulum(S, P.ear, (s) => s.rot);
  // positive = the loose end out towards +x. Trailing the head's sideways
  // move throws it the way it trails; trailing a head turn leaves it behind
  // the turn (a head tipping clockwise leaves the ends to the right)
  return {
    hair: [clamp(hx * P.hair.gain - hr * 1.1, -0.7, 0.7), clamp(hy * 1.2, -0.08, 0.08)],
    hem: [clamp(mx * P.hem.gain, -0.1, 0.1), clamp(my * 0.8, -0.05, 0.05)],
    ear: clamp(ex * P.ear.gain - er * 1.2, -0.9, 0.9),
    tilt: { hair: P.hair.tilt, ear: P.ear.tilt },
  };
}
