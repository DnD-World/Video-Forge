// ---------------------------------------------------------------------------
// 2D lab (4 Nov 2026): the body solver. A pose (anim.mjs) says where hands
// and feet should be; this works out the elbows and knees the way a body can:
//
//   IK          hands and feet go where asked, elbows and knees follow
//   limits      a knee only bends forwards, an elbow never folds backwards,
//               and neither ever locks dead straight (straight reads robotic)
//   reach       hips can never sit higher than the legs reach: if the feet
//               spread or step, the hips drop instead of the figure floating
//   balance     the hips stay over the feet that are on the floor, so a kick
//               or a reach shifts the weight first, as a person would
//
// The rig (core/rig.mjs) still draws everything; this only hands it joints
// and then moves the solved elbows, knees, hands and feet (draw.mjs `adjust`).
// ---------------------------------------------------------------------------

import { solveRig } from "../core/rig.mjs";
import { clamp, lerp } from "./anim.mjs";

const SOFT = 0.994; // a limb reaches at most this much of its full length (a hint of a soft knee, not a crouch)

/** Two-bone IK: the middle joint for a root, a target and two lengths. pref picks the bend side. */
export function twoBone(root, target, a, b, pref) {
  let dx = target[0] - root[0], dy = target[1] - root[1];
  let d = Math.hypot(dx, dy) || 1e-6;
  const max = (a + b) * SOFT, min = Math.abs(a - b) + 1e-4;
  const dc = clamp(d, min, max);
  if (dc !== d) { dx *= dc / d; dy *= dc / d; d = dc; }
  const end = [root[0] + dx, root[1] + dy];
  const ang = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const base = Math.atan2(dx, dy);
  const cand = [base + ang, base - ang].map((th) => [root[0] + Math.sin(th) * a, root[1] + Math.cos(th) * a]);
  // the side of the line the hint points to
  const side = (p) => (p[0] - root[0]) * pref[0] + (p[1] - root[1]) * pref[1];
  const mid = side(cand[0]) >= side(cand[1]) ? cand[0] : cand[1];
  return { mid, end };
}

const restCache = new Map();
function restOf(card, look, view, sit) {
  const key = look.id + "|" + JSON.stringify(card) + "|" + view.toFixed(2) + "|" + sit.toFixed(2);
  let r = restCache.get(key);
  if (!r) {
    const sk = solveRig(card, look, { joints: { view: [view], sit: [sit], w: 1 } });
    // lengths from the plain standing front view (the turn squeezes x on screen)
    const st = solveRig(card, look, {}), fr = st.arms[1];
    r = {
      hips: sk.legs.map((l) => l.hip), legLen: -st.hy,
      shoulders: sk.arms.map((a) => a.sh), hands: sk.arms.map((a) => [(a.ha[0] - a.sh[0]) * (view >= 1 ? 1 : a.dir), a.ha[1] - a.sh[1]]),
      ua: Math.hypot(fr.el[0] - fr.sh[0], fr.el[1] - fr.sh[1]), fa: Math.hypot(fr.ha[0] - fr.el[0], fr.ha[1] - fr.el[1]),
      feet: sk.legs.map((l) => l.foot), hy: st.hy,
    };
    if (restCache.size > 300) restCache.clear();
    restCache.set(key, r);
  }
  return r;
}

/** The rest pose of a card in the lab's terms (hands from the shoulder, feet on the stage). */
export function restPose(card, look, view = 0) {
  const r = restOf(card, look, view, 0), h = card.height ?? 1;
  return {
    hip: [0, 0], lean: 0, tilt: 0, nod: 0, sit: 0, view, squash: 0, rot: 0,
    hF: [r.hands[1][0] / h, r.hands[1][1] / h], hB: [r.hands[0][0] / h, r.hands[0][1] / h],
    eF: [0.5, 1], eB: [0.5, 1],
    fF: [r.feet[1][0] / h, 0], fB: [r.feet[0][0] / h, 0],
    hands: { F: "relaxed", B: "relaxed" }, face: null,
  };
}

/**
 * Solve a pose (already scaled to the card) into what drawCharacter needs:
 * { joints, adjust, info } — joints for the rig (hips, lean, head, sit,
 * view), adjust to place elbows, hands, knees and feet, info for the page
 * (where things ended up, how the weight is carried).
 * opts: { balance (0–1), planted feet are those with y ≥ −0.004 }
 */
export function solvePose(card, look, pose, opts = {}) {
  const view = clamp(pose.view, 0, 2), sit = clamp(pose.sit);
  const r = restOf(card, look, view, sit);
  const side = view > 1.5;
  const down = (f) => f[1] >= -0.004;
  const feet = [pose.fB, pose.fF];

  // balance: the hips drift over the feet that carry the weight
  let hipX = pose.hip[0];
  const planted = feet.filter(down);
  // sitting, the chair takes the weight: balance lets go on the way down
  const bal = (opts.balance ?? 1) * (1 - clamp((sit - 0.15) / 0.4));
  if (planted.length && bal > 0) {
    const xs = planted.map((f) => f[0]);
    const lo = Math.min(...xs), hi = Math.max(...xs), margin = planted.length === 2 ? 0.02 : 0.012;
    // the upper body's lean moves the weight forwards: the hips go back to carry it
    const com = hipX + Math.sin(pose.lean) * 0.12;
    const want = clamp(com, lo - margin, hi + margin) - Math.sin(pose.lean) * 0.12;
    hipX = lerp(hipX, want, bal);
  }

  // reach: the hips drop until every planted foot can be reached with a soft knee
  let crouch = Math.max(0, pose.hip[1]);
  const lift = Math.min(0, pose.hip[1]);
  if (sit < 0.5) for (let i = 0; i < 2; i++) {
    const f = feet[i];
    if (!down(f)) continue;
    const hipP = [r.hips[i][0] + hipX, r.hy + lift];
    const dx = f[0] - hipP[0];
    const reach = r.legLen * SOFT;
    if (Math.abs(dx) >= reach) continue;
    const need = (f[1] - hipP[1]) - Math.sqrt(reach * reach - dx * dx);
    crouch = Math.max(crouch, need);
  }

  const joints = { root: [hipX, crouch > 0 ? crouch : lift], lean: [pose.lean], head: [pose.tilt, pose.nod], sit: [sit], view: [view], w: 1 };
  // a lifted body (a jump) is drawn moved up; feet are on the stage, so in body terms they move down
  const shift = [hipX, lift];
  const info = { crouch, hipX, lift, feet: feet.map((f) => f.slice()), planted: feet.map(down) };

  const adjust = (sk) => {
    // arms: the hand where the pose puts it, from the shoulder the rig placed
    const hands = [pose.hB, pose.hF], hints = [pose.eB, pose.eF];
    sk.arms.forEach((arm, i) => {
      const ua = r.ua, fa = r.fa;
      // facing the camera, x is away from the body; turned (three-quarter or profile)
      // it is forwards for BOTH arms, so the far hand can reach the person in front
      const xs = view >= 1 ? 1 : arm.dir;
      const tgt = [arm.sh[0] + hands[i][0] * xs, arm.sh[1] + hands[i][1]];
      // turned, an elbow bends the way an elbow can: the forearm folds towards the front of the
      // upper arm, so the elbow sits a little BEHIND the shoulder-to-hand line (Ak, 5 Nov 2026:
      // an elbow poking forwards made the body read as turned the other way). That side is the
      // shoulder-to-hand direction turned a quarter towards the back.
      const dh = [tgt[0] - arm.sh[0], tgt[1] - arm.sh[1]];
      const pref = view >= 1 ? [-dh[1] + hints[i][0] * 0.05, dh[0]] : [hints[i][0] * xs, hints[i][1]];
      const { mid, end } = twoBone(arm.sh, tgt, ua, fa, pref);
      arm.el = mid; arm.ha = end;
    });
    // legs: each foot where the stage says (less the body's own shift), the knee from IK
    sk.legs.forEach((leg, i) => {
      if (sk.sitting && sit >= 1) return;
      const f = feet[i];
      const tgt = [f[0] - shift[0], f[1] - shift[1]];
      const L = r.legLen / 2;
      const s = leg.front ? 1 : -1;
      // knees bend forwards in profile; from the front, a little outwards
      // turned or in profile both knees bend forwards; from the front, a little outwards
      const pref = view >= 1 ? [1, 0.05] : [s * 0.55 + (view > 0.5 ? (view - 0.5) * 0.6 : 0), 0.15];
      let { mid, end } = twoBone(leg.hip, tgt, L, L, pref);
      if (!side) {
        // from the front a bent knee points at the camera: it stays on the hip-to-foot
        // line, and only a deep bend opens it outwards (no bow legs when standing)
        const dx = end[0] - leg.hip[0], dy = end[1] - leg.hip[1], d = Math.hypot(dx, dy) || 1;
        const bend = clamp(0.97 - d / (2 * L), 0, 1);
        const open = [leg.hip[0] + dx / 2 + s * bend * L * 0.9, leg.hip[1] + dy / 2];
        const k3 = clamp(view - 0.5); // turning: towards the side-view knee
        mid = [lerp(open[0], mid[0], k3), lerp(open[1], mid[1], k3)];
      }
      const k = sit > 0 ? 1 - sit : 1;
      leg.knee = [lerp(leg.knee[0], mid[0], k), lerp(leg.knee[1], mid[1], k)];
      leg.foot = [lerp(leg.foot[0], end[0], k), lerp(leg.foot[1], end[1], k)];
    });
    info.sk = sk;
    return sk;
  };
  return { joints, adjust, info };
}
