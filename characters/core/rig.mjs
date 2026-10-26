// ---------------------------------------------------------------------------
// The skeleton: where every part of a character is at one moment.
//
// Units: standing height = 1 × card.height, feet at y = 0, up is negative.
// The character faces +x (towards the viewer's right); the caller mirrors to
// face left. Nothing here draws — draw.mjs does that — so the checks can ask
// "does the hand leave the frame in the wave pose?" without a canvas.
//
// view (turn): 0 front · 1 three-quarter · 2 side profile, and anything in
// between, so a head turn is a smooth number rather than a cut.
// Arm poses use the names Video Forge's script cues already produce
// (wave, point, shrug, explain) plus a few more for the form.
// ---------------------------------------------------------------------------

import { clamp, lerp, smooth } from "./math.mjs";

/**
 * Arm poses: [upper arm, forearm] angles in radians for the FRONT arm (the one
 * nearer the camera / the other speaker) and the BACK arm. 0 = hanging down;
 * positive swings away from the body (in profile: forwards). A function gets
 * (t, talk) for poses that move.
 */
export const POSES = {
  rest: { f: [0.12, 0.1], b: [0.12, 0.1] },
  explain: { f: (t) => [0.45 + 0.12 * Math.sin(t * 3.1), 1.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2.4))], b: [0.3, 0.8] },
  wave: { f: (t) => [2.5, 0.45 + 0.45 * Math.sin(t * 9)], b: [0.12, 0.1] },
  point: { f: [1.5, 0.05], b: [0.12, 0.1] },
  shrug: { f: [0.55, 1.75], b: [0.55, 1.75] },
  hips: { f: [0.75, -1.75], b: [0.75, -1.75] },
  crossed: { f: [0.15, -2.45], b: [0.1, -2.3] },
  think: { f: [0.22, -2.65], b: [0.12, 0.1] },
  phone: { f: [0.3, 2.75], b: [0.12, 0.1] },
};
export const POSE_NAMES = Object.keys(POSES);

const BUILD = { thin: 0.82, average: 1, round: 1.3 };
const HEAD = { round: [1, 1], oval: [0.88, 1.08], egg: [0.92, 1.05], square: [0.98, 0.98] };

const armAngles = (pose, which, t, talk) => {
  const p = POSES[pose] ?? POSES.rest;
  const v = p[which];
  return typeof v === "function" ? v(t, talk) : v;
};

/**
 * Solve the skeleton.
 * state: { t, view, pose, poseK, head: {rotateDeg, dx, dy}, talk (0–1),
 *          walk: {phase, amount} | null, sitting, sway (0–1) }
 */
export function solveRig(card, look, state = {}) {
  const { t = 0, view = 0, pose = "rest", poseK = 1, head = null, talk = 0, walk = null, sitting = false } = state;
  const sway = (state.sway ?? card.sway ?? 0.5) * Math.sin(t * 1.6 + (card.seed ?? 0)) * 0.006;
  const P = look.p, h = card.height ?? 1;
  const build = BUILD[card.build] ?? 1;
  const muscle = card.muscle ?? 0;
  const v = clamp(view, 0, 2);
  const turn = Math.min(v, 1), side = Math.max(0, v - 1); // 0–1 each
  const wf = lerp(1, 0.72, turn) * lerp(1, 0.62, side); // body width as it turns
  const headR = P.headR * (card.headSize ?? 1);

  // walking: a bob and a lean; sitting: hips drop to stool height
  const wAmt = walk?.amount ?? 0, ph = walk?.phase ?? 0;
  const bob = -Math.abs(Math.sin(ph)) * 0.012 * wAmt;
  const sitDrop = sitting ? -P.hy * h - 0.27 : 0; // hips from hy down to 0.27 above the floor
  const lean = (card.posture === "hunch" ? 0.03 : card.posture === "slouch" ? 0.012 : 0) + sway;

  const hy = P.hy * h + sitDrop + bob;
  const sy = P.sy * h + sitDrop + bob + (card.posture === "hunch" ? 0.02 : 0);
  const sx = P.sw * build * (1 + muscle * 0.25) * wf, hx = P.hw * build * wf;
  const shoulderLean = lean;

  // ---- arms
  const reach = (P.hy - P.sy) * h * (card.armLength ?? 1);
  const ua = reach * 0.62, fa = reach * 0.6;
  const k = smooth(clamp(poseK));
  const talkBob = (which) => (pose === "rest" || !pose) && talk > 0 && which === "f" ? [0.05 * talk, 0.12 * talk * (0.5 + 0.5 * Math.sin(t * 4.3))] : [0, 0];
  const arm = (which) => {
    const rest = armAngles("rest", which, t, talk), want = armAngles(pose || "rest", which, t, talk), tb = talkBob(which);
    const a1 = lerp(rest[0], want[0], k) + tb[0], a2 = lerp(rest[1], want[1], k) + tb[1];
    const front = which === "f";
    // which way "away from the body" points on screen: in profile both arms
    // swing forwards (+x); otherwise the front arm swings right, the back left
    const dir = side > 0.5 ? 1 : front ? 1 : -1;
    const xs = side > 0.5 ? 1 : front ? 1 : lerp(1, 0.8, turn);
    const shX = side > 0.5 ? (front ? 0.004 : -0.004) : (front ? sx * 0.95 : -sx * 0.95 * lerp(1, 0.85, turn));
    const sh = [shX + shoulderLean, sy + 0.02];
    const el = [sh[0] + dir * Math.sin(a1) * ua * xs, sh[1] + Math.cos(a1) * ua];
    const ha = [el[0] + dir * Math.sin(a1 + a2) * fa * xs, el[1] + Math.cos(a1 + a2) * fa];
    return { which, front, sh, el, ha, dir };
  };
  const arms = [arm("b"), arm("f")];

  // ---- legs
  const legLen = -P.hy * h, upper = legLen * 0.5, lower = legLen * 0.5;
  const leg = (which) => {
    const front = which === "f";
    const s = front ? 1 : -1;
    const hipX = side > 0.5 ? (front ? 0.004 : -0.004) : s * hx * 0.55;
    const hip = [hipX + sway * 0.5, hy];
    if (sitting) { // thighs forward, shins down to the floor
      const fwd = side > 0.5 ? 1 : 0.25;
      const knee = [hip[0] + upper * 0.95 * fwd + (side > 0.5 ? 0 : s * 0.01), hy + 0.02];
      const foot = [knee[0] + 0.01, 0];
      return { which, front, hip, knee, foot };
    }
    const swing = Math.sin(ph + (front ? 0 : Math.PI)) * 0.42 * wAmt;
    const bend = Math.max(0, Math.sin(ph + (front ? 0 : Math.PI) + 0.9)) * 0.7 * wAmt;
    // standing legs spread a little in the front view, none in profile
    const spread = side > 0.5 ? 0 : s * 0.06 * (1 - turn * 0.5);
    const th = spread + (side > 0.5 ? swing : swing * 0.25);
    const knee = [hip[0] + Math.sin(th) * upper, hip[1] + Math.cos(th) * upper];
    const sh2 = th - bend;
    const foot = [knee[0] + Math.sin(sh2) * lower, Math.min(0, knee[1] + Math.cos(sh2) * lower)];
    return { which, front, hip, knee, foot };
  };
  const legs = [leg("b"), leg("f")];

  // ---- head
  const [fx, fy] = HEAD[card.headShape] ?? HEAD.round;
  const rot = ((head?.rotateDeg ?? 0) * Math.PI) / 180;
  const neck = [shoulderLean + (card.posture === "hunch" ? 0.02 : 0), sy - 0.03 * h];
  const hc = [
    neck[0] + side * headR * 0.1 + (head?.dx ?? 0) * headR * 2,
    sy - headR * fy * 1.05 - 0.025 * h + (head?.dy ?? 0) * headR * 2 + (card.posture === "hunch" ? 0.015 : 0),
  ];
  const R = headR;
  const faceDX = R * (0.08 + 0.22 * turn + 0.32 * side);
  const ex = R * 0.33 * (card.eyeSpacing ?? 1);
  // eyes relative to the head centre; the far eye squeezes and then hides
  const eyes = [
    { x: faceDX - ex * lerp(1, 0.62, turn) * (1 - side), y: -R * 0.02, scaleX: lerp(1, 0.75, turn), visible: side < 0.55, far: true },
    { x: faceDX + ex * (1 - side * 0.55), y: -R * 0.02, scaleX: 1, visible: true, far: false },
  ];
  const face = {
    eyes,
    mouth: { x: faceDX + R * 0.05 * side, y: R * 0.45, w: 1 - side * 0.45 },
    nose: { x: faceDX + R * (0.02 + 0.35 * side), y: R * 0.18 },
    ears: [
      // the far ear stays in view as the head turns (in profile it is the one ear we see)
      { x: -R * 0.98 * lerp(1, 0.8, turn) + R * 0.75 * side, y: R * 0.05, visible: true, far: true },
      { x: R * 0.98, y: R * 0.05, visible: turn < 0.5, far: false },
    ],
    faceDX,
  };

  // torso outline (clothes are drawn on top of it, see wardrobe.mjs)
  const waistY = sy + (hy - sy) * 0.75;
  const torso = [[-sx + shoulderLean, sy], [sx + shoulderLean, sy], [hx * 1.05 + sway, hy], [-hx * 1.05 + sway, hy]];

  return {
    h, v, turn, side, R, rx: R * fx * lerp(1, 0.94, turn), ry: R * fy, rot,
    head: hc, neck, sy, hy, sx, hx, waistY, torso, arms, legs, face, sitting,
    limbW: look.limbW * (1 + muscle * 0.8), legW: (look.legW ?? look.limbW) * (1 + muscle * 0.4),
  };
}

/**
 * Named points clothes and accessories hang on, in figure units (not yet
 * scaled). Head points are given relative to the head centre in `head.*`,
 * because the head rotates as a group.
 */
export function anchors(sk) {
  const { R, rx, ry } = sk;
  return {
    head: {
      top: [0, -ry], crown: [0, -ry * 0.55], brow: [sk.face.faceDX, -R * 0.32], eyes: [sk.face.faceDX, -R * 0.02],
      nose: [sk.face.nose.x, sk.face.nose.y], mouth: [sk.face.mouth.x, sk.face.mouth.y], chin: [sk.face.faceDX * 0.6, ry],
      earFar: [sk.face.ears[0].x, sk.face.ears[0].y], earNear: [sk.face.ears[1].x, sk.face.ears[1].y], rx, ry,
    },
    neck: sk.neck, collar: [sk.neck[0], sk.sy], chest: [sk.neck[0], sk.sy + (sk.hy - sk.sy) * 0.3],
    waist: [0, sk.waistY], hips: [0, sk.hy],
    hands: sk.arms.map((a) => a.ha), elbows: sk.arms.map((a) => a.el), shoulders: sk.arms.map((a) => a.sh),
    knees: sk.legs.map((l) => l.knee), feet: sk.legs.map((l) => l.foot),
  };
}

/** The figure's extent in units (for framing): top of head to feet. */
export function figureExtent(card, look) {
  const sk = solveRig(card, look, {});
  const top = sk.head[1] - sk.ry * 1.25; // room for hair and hats
  return { top, bottom: 0, shoulders: sk.sy, hips: sk.hy, headCentre: sk.head[1], R: sk.R };
}
