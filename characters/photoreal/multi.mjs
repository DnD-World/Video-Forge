// ---------------------------------------------------------------------------
// SEVERAL REST PICTURES, ONE PUPPET (27 Oct 2026).
//
// Any one picture bends well only near its own pose: an A-pose's arms come
// down and cross the body cleanly but tear the shoulder when raised high; a
// T-pose's arms rise and spread cleanly but fold at the armpit when lowered.
// Animators fix this with several rest poses, and so does this: every frame,
// each arm is taken from the picture whose arm is nearest the angle wanted
// (cross-fading over a few degrees), and the body from the picture nearest
// both arms — so no picture is ever bent far from what it shows.
//
//   makePuppet(sources)   sources: [{ image, skin }] (skin.mjs buildSkin)
//   puppet.draw(ctx, sk, rest, { x, y, h })   feet at (x, y), h px tall
// ---------------------------------------------------------------------------

import { poseSkin } from "./skin.mjs";
import { makeMeshRenderer } from "./glmesh.mjs";
import { drawFace, faceParts } from "./face.mjs";

// radians over which two pictures cross-fade. Narrow: two different hands
// laid half over each other read as a mess of fingers (Ak, 28 Oct 2026)
const FADE = 0.07;

export function makePuppet(sources, { size = 512 } = {}) {
  const srcs = sources.map((s) => ({ ...s, R: makeMeshRenderer(s.image, s.skin, size, size) }));
  /** Weights over the pictures for an arm raised by `a` radians. */
  const weightsFor = (a, k) => {
    const d = srcs.map((s) => Math.abs(s.skin.armAngle[k] - a));
    const order = d.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]);
    const w = srcs.map(() => 0);
    const [best, next] = order;
    if (!next) { w[best[1]] = 1; return w; }
    // the nearest picture, fading towards the second as the angle nears halfway
    const mid = (best[0] + next[0]) / 2, t = Math.max(0, Math.min(1, (best[0] - (mid - FADE / 2)) / FADE));
    w[best[1]] = 1 - t * 0.5; w[next[1]] = t * 0.5;
    return w;
  };
  const r0 = srcs[0].skin.rig;
  return {
    /** Where the hips are, as a share of the full height up from the feet (to seat the person). */
    hipShare: (r0.floor - r0.torso[0][1]) / (r0.floor - r0.top),
    /** face (optional): { viseme, prevViseme, mix, lid, brow } — talks with the arms-down picture's face parts */
    draw(ctx, sk, rest, { x, y, h, face = null }) {
      const raised = (i) => Math.abs(Math.atan2(sk.arms[i].el[0] - sk.arms[i].sh[0], sk.arms[i].el[1] - sk.arms[i].sh[1]));
      const armW = [weightsFor(raised(0), 0), weightsFor(raised(1), 1)];
      // the body always from the picture with the arms lowest: its sleeves hang
      // down, while an arms-out picture's sleeves stick out sideways and show
      // as stubs once its arms are moved (Ak, 28 Oct 2026: torn sleeve)
      const lowest = srcs.reduce((b, s, i) => (s.skin.armAngle[0] + s.skin.armAngle[1] < srcs[b].skin.armAngle[0] + srcs[b].skin.armAngle[1] ? i : b), 0);
      const bodyW = srcs.map((_, i) => (i === lowest ? 1 : 0));
      const posed = srcs.map((s) => poseSkin(s.skin, sk, rest));
      const front = posed[0].front;
      const layer = (name, weights) => {
        // the heavier picture first and in full, the lighter one over it, faded
        const order = weights.map((w, i) => [w, i]).filter(([w]) => w > 0.02).sort((p, q) => q[0] - p[0]);
        order.forEach(([w, i], n) => {
          const s = srcs[i], rig = s.skin.rig, bodyH = rig.floor - rig.top;
          const side = bodyH * 1.25, cx = (rig.torso[0][0] + rig.torso[1][0]) / 2;
          const view = [cx - side / 2, rig.floor - side + bodyH * 0.06, side, side];
          const gl = s.R.draw(posed[i], view, [name]);
          const px = h * 1.25; // the view is 1.25 body heights square
          ctx.save();
          ctx.globalAlpha = n === 0 ? 1 : Math.min(1, w * 2);
          ctx.drawImage(gl, x - px / 2, y - px + h * 0.06 * 1, px, px);
          ctx.restore();
        });
      };
      for (const i of [0, 1]) if (!front[i]) layer("arm" + i, armW[i]);
      // under the body: another picture's bare torso, to fill the shirt the
      // body picture's arms were hiding (else a ragged edge shows as they move)
      const under = srcs.findIndex((_, i) => i !== lowest);
      if (under >= 0) layer("core", srcs.map((_, i) => (i === under ? 1 : 0)));
      layer("body", bodyW);
      // the face, on the body picture's head (its parts were made on that picture)
      const fs = srcs[lowest];
      if (face && fs.face) {
        const rig = fs.skin.rig, bodyH = rig.floor - rig.top, side = bodyH * 1.25, cx = (rig.torso[0][0] + rig.torso[1][0]) / 2;
        const px = h * 1.25, sc = px / side;
        ctx.save();
        ctx.translate(x - px / 2, y - px + h * 0.06);
        ctx.scale(sc, sc);
        ctx.translate(-(cx - side / 2), -(rig.floor - side + bodyH * 0.06));
        drawFace(ctx, fs.face, posed[lowest].head, faceParts(fs.face, face));
        ctx.restore();
      }
      for (const i of [0, 1]) if (front[i]) layer("arm" + i, armW[i]);
    },
  };
}
