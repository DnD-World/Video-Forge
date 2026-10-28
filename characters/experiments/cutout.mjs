// ---------------------------------------------------------------------------
// EXPERIMENT (#49b, 27 Oct 2026): a picture puppet cut into limbs, moved by
// the same skeleton as the drawn characters, so every move in the motion
// library works on a picture puppet too. Paper cut-out animation: each limb
// is a capsule cut from one full-body picture and turned at its joint.
//
// The picture keeps its own proportions; only the ANGLES come from the
// skeleton: for every bone, the turn is the difference between the bone's
// direction in the solved skeleton (rig.mjs, front view) and its direction in
// the picture. Joints may show — this is judged on an A/B page before going
// further (ultra plan §7).
//
// limbs: a small JSON of points measured on the picture (pixels):
//   { joints: { neck, head, shoulderL, elbowL, wristL, handL, shoulderR, …,
//               hipL, kneeL, ankleL, footL, hipR, … }, widths: { arm, forearm,
//               thigh, shin }, top, bottom }   (L = the picture's left side)
// ---------------------------------------------------------------------------

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const rot = (v, t) => [v[0] * Math.cos(t) - v[1] * Math.sin(t), v[0] * Math.sin(t) + v[1] * Math.cos(t)];
const ang = (v) => Math.atan2(v[1], v[0]);

/** Clip to a capsule from p0 to p1 (picture pixels), width w, round ends. */
function capsule(ctx, p0, p1, w) {
  const a = ang(sub(p1, p0)), n = [-Math.sin(a) * w / 2, Math.cos(a) * w / 2];
  ctx.beginPath();
  ctx.moveTo(p0[0] + n[0], p0[1] + n[1]);
  ctx.lineTo(p1[0] + n[0], p1[1] + n[1]);
  ctx.arc(p1[0], p1[1], w / 2, a + Math.PI / 2, a - Math.PI / 2, true);
  ctx.lineTo(p0[0] - n[0], p0[1] - n[1]);
  ctx.arc(p0[0], p0[1], w / 2, a - Math.PI / 2, a + Math.PI / 2, true);
  ctx.closePath();
}

/**
 * Draw the cut-out figure. sk: a solved skeleton (solveRig, front view) for
 * the move's pose; rest: the skeleton at rest (to measure the turns from).
 * Places the picture so its feet are at (x, y) and its height is h px.
 */
export function drawCutout(ctx, img, limbs, sk, rest, { x, y, h, mirror = false }) {
  const J = limbs.joints, Wd = limbs.widths;
  const k = h / (limbs.bottom - limbs.top);
  const foot = [(J.ankleL[0] + J.ankleR[0]) / 2, limbs.bottom];
  // the skeleton's bone turn relative to rest, for skeleton arm/leg i
  const boneTurn = (a, b, a0, b0) => ang(sub(b, a)) - ang(sub(b0, a0));
  const bodyH = limbs.bottom - limbs.top;
  const lift = sk.root ? [sk.root[0] * bodyH, sk.root[1] * bodyH] : [0, 0];
  // crouch/sit/lean drop the hips: measure from the skeleton's hip height change
  const hipDrop = (sk.hy - rest.hy) * bodyH;
  const shoulderShift = (sk.neck[0] - rest.neck[0]) * bodyH;

  ctx.save();
  ctx.translate(x, y);
  if (mirror) ctx.scale(-1, 1);
  ctx.scale(k, k);
  ctx.translate(-foot[0] + lift[0], -foot[1] + lift[1]);

  // a limb piece: cut from the picture between its two joints, then placed so
  // its first joint lands on `at` and turned by `turn`
  const piece = (p0, p1, w, at, turn) => {
    ctx.save();
    ctx.translate(at[0], at[1]);
    ctx.rotate(turn);
    ctx.translate(-p0[0], -p0[1]);
    capsule(ctx, p0, p1, w);
    ctx.clip();
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  };

  // skeleton arms/legs: index 0 = screen left (the picture's L), 1 = screen right
  const side = (i) => (i === 0 ? "L" : "R");
  const hipOf = (i) => add(J["hip" + side(i)], [0, hipDrop]);

  // ---- legs (behind the torso)
  for (const i of [0, 1]) {
    const s = side(i), L = sk.legs[i], L0 = rest.legs[i];
    const t1 = boneTurn(L.hip, L.knee, L0.hip, L0.knee);
    const hip = hipOf(i);
    const knee = add(hip, rot(sub(J["knee" + s], J["hip" + s]), t1));
    const t2 = boneTurn(L.knee, L.foot, L0.knee, L0.foot);
    piece(J["knee" + s], J["foot" + s], Wd.shin, knee, t2);
    piece(J["hip" + s], J["knee" + s], Wd.thigh, hip, t1);
  }

  // ---- torso and head, moved down with the hips and over with the lean
  const torsoShift = [shoulderShift, hipDrop];
  ctx.save();
  ctx.translate(torsoShift[0], torsoShift[1]);
  ctx.beginPath();
  for (const [i, p] of limbs.torso.entries()) (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  // the head turns at the neck
  const neck = add(J.neck, torsoShift);
  ctx.save();
  ctx.translate(neck[0], neck[1]);
  ctx.rotate(sk.rot ?? 0);
  ctx.translate(-J.neck[0], -J.neck[1] + (sk.head[1] - rest.head[1] - (sk.sy - rest.sy)) * bodyH);
  ctx.beginPath();
  for (const [i, p] of limbs.head.entries()) (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, 0, 0);
  ctx.restore();

  // ---- arms (in front)
  for (const i of [0, 1]) {
    const s = side(i), A = sk.arms[i], A0 = rest.arms[i];
    const t1 = boneTurn(A.sh, A.el, A0.sh, A0.el);
    const sh = add(J["shoulder" + s], torsoShift);
    const el = add(sh, rot(sub(J["elbow" + s], J["shoulder" + s]), t1));
    const t2 = boneTurn(A.el, A.ha, A0.el, A0.ha);
    piece(J["elbow" + s], J["hand" + s], Wd.forearm, el, t2);
    piece(J["shoulder" + s], J["elbow" + s], Wd.arm, sh, t1);
  }
  ctx.restore();
}
