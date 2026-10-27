// ---------------------------------------------------------------------------
// From Video Forge's performance signals to a drawn character's state.
//
// Video Forge already works out, per speaker and per frame, the mouth (two
// shape ids and a mix), the blink (two lid states and a mix), the brows, the
// head tilt/nod and the arm pose (src/lib/motion/facePerformance.ts). Picture
// puppets swap drawings with those; a drawn character simply takes the same
// numbers. So the timing is identical and nothing new has to be scripted.
//
//   characterState   the signals → the state drawCharacter reads
//   poseBlendAt      a pose span list → which pose and how far in (eased)
//   facingView       "camera" | "left" | "right" | "auto" → turn + mirror
//   autoPerformance  a believable talk/listen loop, for previews and samples
// ---------------------------------------------------------------------------

import { hash } from "./math.mjs";

const POSE_EASE_MS = 260;

/** Which pose is on at timeMs and how far it has come in or gone out (0–1). */
export function poseBlendAt(spans, timeMs) {
  if (!spans?.length) return { pose: "rest", poseK: 0 };
  for (const s of spans) {
    if (timeMs >= s.startMs - POSE_EASE_MS && timeMs < s.endMs + POSE_EASE_MS) {
      const kin = Math.min(1, (timeMs - (s.startMs - POSE_EASE_MS)) / POSE_EASE_MS);
      const kout = Math.min(1, (s.endMs + POSE_EASE_MS - timeMs) / POSE_EASE_MS);
      return { pose: s.pose, poseK: Math.max(0, Math.min(kin, kout)) };
    }
  }
  return { pose: "rest", poseK: 0 };
}

/**
 * Turn and mirror for a facing choice. The figure is drawn facing the viewer's
 * right; "left" mirrors it. `dialogue` is how far a talking pair turn to each
 * other (1 = three-quarter; 2 = full profile for profile looks).
 */
export function facingView(facing, me, others = [], { dialogue = 1 } = {}) {
  let f = facing ?? "auto";
  if (f === "auto") {
    if (!others.length) return { view: 0, mirror: false };
    const nearest = others.reduce((a, b) => (Math.abs(b.x - me.x) < Math.abs(a.x - me.x) ? b : a));
    f = nearest.x < me.x ? "left" : "right";
  }
  if (f === "camera") return { view: 0, mirror: false };
  return { view: dialogue, mirror: f === "left" };
}

/**
 * Video Forge's signals → drawCharacter state.
 * sig: { timeMs, viseme, prevViseme, mix, lidFrom, lidTo, lidMix, browLeft,
 *        browRight, head, poseSpans | pose, view, mirror, active }
 */
export function characterState(sig) {
  const t = (sig.timeMs ?? 0) / 1000;
  const pb = sig.poseSpans ? poseBlendAt(sig.poseSpans, sig.timeMs ?? 0) : { pose: sig.pose ?? "rest", poseK: sig.pose ? 1 : 0 };
  return {
    t,
    view: sig.view ?? 0,
    pose: pb.pose,
    poseK: pb.poseK,
    head: sig.head ?? null,
    talk: sig.active ? 1 : 0,
    mouth: { from: sig.prevViseme ?? sig.viseme ?? 0, to: sig.viseme ?? 0, mix: sig.mix ?? 1 },
    lid: { from: sig.lidFrom ?? "open", to: sig.lidTo ?? sig.lidFrom ?? "open", mix: sig.lidMix ?? 1 },
    brows: { left: sig.browLeft ?? "serious", right: sig.browRight ?? sig.browLeft ?? "serious" },
    gaze: 0.4,
    walk: sig.walk ?? null,
    sitting: !!sig.sitting,
  };
}

// ---- a standalone loop (samples, the form's preview) ---------------------------------

const TALK_SHAPES = [1, 2, 3, 0, 10, 12, 5, 7, 11, 1, 8, 6, 2, 4];

/**
 * A talk/listen performance with no narration: mouth shapes from a seeded
 * sequence, natural blinks, brow lifts on "emphasis", the given pose.
 */
export function autoPerformance(t, { seed = 0, talking = true, pose = "rest", poseK = 1, view = 0, blinkRate = 1 } = {}) {
  const slot = Math.floor(t / 0.11);
  const pause = (t % 3.2) > 2.6;
  const pick = (k) => TALK_SHAPES[Math.floor(hash(k, 7 + seed) * TALK_SHAPES.length)];
  const to = talking && !pause ? pick(slot) : 0;
  const from = talking && !pause ? pick(slot - 1) : 0;
  const mix = Math.min(1, ((t % 0.11) / 0.11) * 2.2);
  // blinks every ~3.4 s (scaled), three frames down, three up
  const period = 3.4 / blinkRate, p = ((t + seed * 1.3) % period);
  const lid = p < 0.04 ? "half" : p < 0.1 ? "closed" : p < 0.14 ? "half" : "open";
  const lift = talking && slot % 9 < 3 ? "raised" : "serious";
  return {
    t, view, pose, poseK,
    head: { rotateDeg: talking ? Math.sin(t * 2.3 + seed) * 2.5 : Math.sin(t * 0.9 + seed) * 1.2, dx: 0, dy: talking ? Math.sin(t * 5) * 0.01 : 0 },
    talk: talking ? 1 : 0,
    mouth: { from, to, mix },
    lid: { from: lid, to: lid, mix: 1 },
    brows: { left: lift, right: lift },
    gaze: 0.4,
  };
}
