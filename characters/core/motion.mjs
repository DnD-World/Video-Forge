// ---------------------------------------------------------------------------
// THE MOTION LAYER (27 Oct 2026): what turns poses into movement.
//
// Ak: "for coded characters I expect really good movement, nothing
// marionette-like, nothing choppy unless deliberate." Puppet-like motion
// comes from every joint gliding to its next pose on its own, at the same
// rhythm, with no weight. This layer sits between the targets (talking
// poses, motion-library moves) and the skeleton, and adds what animators add:
//
//   springs       every joint has mass: it accelerates, overshoots a touch
//                 and settles, instead of gliding and stopping dead
//   overlap       the forearm trails the upper arm, the head trails the body
//   anticipation  a small counter-move before a big one (a dip before a jump,
//                 the arm drawing back before it rises)
//   weight        a slow shift of the hips over one leg while standing
//   breathing     the chest rises and falls, so nobody is ever frozen
//
// DETERMINISM. Every render worker draws frames on its own and in any order,
// so a frame may not depend on the frame before. The springs are therefore
// re-run over a short window (WINDOW_MS) ending at the frame, from the
// target at the window's start: the same frame always gives the same pose,
// in the preview and in every worker.
//
//   performAt(card, look, src, timeMs, opts) → the state drawCharacter takes
// ---------------------------------------------------------------------------

import { clamp, lerp, hash } from "./math.mjs";
import { poseArms } from "./rig.mjs";
import { poseBlendAt } from "./perform.mjs";
import { movesAt } from "./moves.mjs";

const WINDOW_MS = 900;
const DT = 1000 / 120;

/**
 * Per channel and number: natural frequency w (rad/s: higher is snappier),
 * damping z (1 = no overshoot, lower = more bounce), and lag (ms: overlap —
 * a joint further down the chain follows a little later).
 */
const SPRINGS = {
  armF: [{ w: 15, z: 0.62, lag: 0 }, { w: 17, z: 0.55, lag: 60 }],
  armB: [{ w: 15, z: 0.62, lag: 0 }, { w: 17, z: 0.55, lag: 60 }],
  legF: [{ w: 26, z: 0.8, lag: 0 }, { w: 28, z: 0.75, lag: 20 }],
  legB: [{ w: 26, z: 0.8, lag: 0 }, { w: 28, z: 0.75, lag: 20 }],
  footF: [{ w: 0, z: 1, lag: 0 }, { w: 0, z: 1, lag: 0 }], // not sprung (see below)
  footB: [{ w: 0, z: 1, lag: 0 }, { w: 0, z: 1, lag: 0 }],
  root: [{ w: 16, z: 0.75, lag: 0 }, { w: 18, z: 0.5, lag: 0 }],
  lean: [{ w: 9, z: 0.72, lag: 40 }],
  head: [{ w: 9, z: 0.6, lag: 90 }, { w: 10, z: 0.7, lag: 90 }],
  sit: [{ w: 10, z: 0.9, lag: 0 }],
  view: [{ w: 8, z: 0.85, lag: 0 }],
  open: [{ w: 14, z: 0.5, lag: 0 }],
};
const CHANNELS = Object.keys(SPRINGS);

/** How much a channel's target dips the other way before a big change. */
const ANTICIPATE = { armF: [0.16, 0], armB: [0.16, 0], root: [0, 0.35], lean: [0.2], head: [0.1, 0] };
const LOOK_AHEAD_MS = 140;

/**
 * Every channel's TARGET at a moment: the talking pose's arms, with whatever
 * move is playing laid over it by its weight. Returns { ch: {name: number[]},
 * mv } (mv: the move state, for hands, props, face, travel).
 */
function targetsAt(src, ms, o) {
  const pb = src.poseSpans ? poseBlendAt(src.poseSpans, ms) : { pose: "rest", poseK: 0 };
  const arms = poseArms(pb.pose, pb.poseK, ms / 1000, o.talk);
  const mv = src.moveSpans?.length ? movesAt(src.moveSpans, src.shelf, ms, { energy: o.energy, seed: o.seed }) : null;
  const J = mv?.joints ?? null, w = J ? clamp(J.w ?? 1) : 0;
  const mix = (name, base) => (J?.[name] ? base.map((b, i) => lerp(b, J[name][i], w)) : base);
  const ch = {
    armF: mix("armF", arms.armF), armB: mix("armB", arms.armB),
    legF: mix("legF", [0, 0]), legB: mix("legB", [0, 0]),
    root: mix("root", [0, 0]), lean: mix("lean", [0]), head: mix("head", [0, 0]),
    sit: mix("sit", [o.sitting ? 1 : 0]), view: mix("view", [o.view]), open: mix("open", [0]),
  };
  // a walk's placed feet only count while the walk is on (they are positions, not angles)
  if (J?.footF) { ch.footF = J.footF.slice(); ch.footB = J.footB.slice(); }
  return { ch, mv, footW: J?.footF ? w : 0 };
}

/**
 * The performed state at timeMs.
 * src: { poseSpans?, moveSpans?, shelf }    o: { view, talk (0–1), energy, seed, sitting, mirror? }
 * Returns a drawCharacter state's motion part: { joints (w 1), hands, props,
 * smile, faceCue, breath, facing, travel, move }.
 */
export function performAt(src, timeMs, o = {}) {
  const opts = { view: 0, talk: 0, energy: 0.5, seed: 0, sitting: false, ...o };
  // the targets along the window (and a little ahead, for anticipation)
  const n = Math.ceil(WINDOW_MS / DT), ahead = Math.ceil(LOOK_AHEAD_MS / DT);
  const t0 = timeMs - n * DT;
  const samples = [];
  for (let i = 0; i <= n + ahead; i++) samples.push(targetsAt(src, Math.max(0, t0 + i * DT), opts).ch);
  const now = targetsAt(src, timeMs, opts);
  const antic = 0.4 + opts.energy * 0.8;

  const out = {};
  for (const name of CHANNELS) {
    const springs = SPRINGS[name];
    if (!samples[n][name]) continue;
    // placed feet are positions on the ground: springing them would let them slide
    if (name === "footF" || name === "footB") { out[name] = samples[n][name].slice(); continue; }
    const vals = [];
    for (let j = 0; j < springs.length; j++) {
      const { w, z, lag } = springs[j];
      const lagN = Math.round(lag / DT);
      const target = (i) => {
        const k = Math.max(0, Math.min(samples.length - 1, i - lagN));
        const here = samples[k][name]?.[j] ?? samples[n][name][j];
        // anticipation: lean a little away from where the target is heading
        const a = ANTICIPATE[name]?.[j] ?? 0;
        if (!a) return here;
        const fut = samples[Math.min(samples.length - 1, k + ahead)][name]?.[j] ?? here;
        return here - a * antic * (fut - here);
      };
      let y = target(0), v = 0;
      for (let i = 1; i <= n; i++) {
        const acc = w * w * (target(i) - y) - 2 * z * w * v;
        v += acc * (DT / 1000);
        y += v * (DT / 1000);
      }
      vals.push(y);
    }
    out[name] = vals;
  }
  if (!now.footW) { delete out.footF; delete out.footB; }

  // standing weight: the hips drift slowly over one leg, then the other
  const t = timeMs / 1000, seed = opts.seed ?? 0;
  const still = 1 - Math.min(1, now.footW + (now.mv?.travel ? 1 : 0));
  out.root = [(out.root?.[0] ?? 0) + Math.sin(t * 0.55 + hash(seed, 3) * 6.28) * 0.0045 * still, out.root?.[1] ?? 0];
  out.lean = [(out.lean?.[0] ?? 0) + Math.sin(t * 0.55 + hash(seed, 3) * 6.28 + 1.2) * 0.012 * still];

  const mv = now.mv;
  return {
    joints: { ...out, w: 1 },
    hands: mv?.hands ?? null,
    props: mv?.props ?? [],
    smile: mv?.face?.smile ?? 0,
    faceCue: mv?.face ?? null,
    breath: Math.sin(t * (2 * Math.PI / (3.6 + hash(seed, 9))) + hash(seed, 11) * 6.28),
    facing: mv?.facing ?? null,
    travel: mv?.travel ?? null,
    move: mv?.move ?? null,
  };
}
