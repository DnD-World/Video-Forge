// ---------------------------------------------------------------------------
// The stage: draws one frame of an explainer at time t.
//
//   background  → the kit's background (also what shows in puppet spots)
//   scene       → the current scene, or during a scene change both scenes
//                 composited tile by tile by the kit's transition
//   spots       → the puppet spots are painted back to pure background, so
//                 nothing the story draws can ever sit under a face
//
// mode "background" draws the background only: the checking page compares
// the spots of a full frame against it, pixel for pixel.
// ---------------------------------------------------------------------------

import { holePath } from "../core/frame.mjs";
import { resolveSpec } from "../core/spec.mjs";
import { drawLog } from "../core/text.mjs";
import { tintPixels } from "../core/tint.mjs";
import * as stravelakis from "../kits/stravelakis.mjs";

export const KITS = { stravelakis };

/**
 * makeLayer(W, H) -> a canvas-like object with getContext("2d").
 * The browser passes () => document.createElement("canvas") sized; tests can pass a fake.
 */
export function createStage(spec, makeLayer) {
  const R = resolveSpec(spec);
  const kit = KITS[R.style] ?? stravelakis;
  const TR = kit.meta.transition;
  const A = makeLayer(R.W, R.H), B = makeLayer(R.W, R.H), BG = makeLayer(R.W, R.H);

  const sceneAt = (t) => {
    let i = 0;
    for (let k = 0; k < R.scenes.length; k++) if (t >= R.scenes[k].start) i = k;
    return i;
  };

  function drawScene(ctx, i, t) {
    const s = R.scenes[i];
    const fn = kit.scenes[s.kind];
    ctx.save();
    fn(ctx, R, s, t);
    ctx.restore();
  }

  function clearSpots(ctx, t) {
    if (!R.holes.length) return;
    const g = BG.getContext("2d");
    g.clearRect(0, 0, R.W, R.H);
    kit.background(g, R, R.calm ? 0 : t);
    ctx.save();
    ctx.beginPath();
    for (const h of R.holes) holePath(ctx, h);
    ctx.clip();
    ctx.drawImage(BG, 0, 0);
    ctx.restore();
  }

  /** Draw frame t into ctx. Returns the draw log for this frame. */
  function draw(ctx, t, { mode = "full" } = {}) {
    t = Math.max(0, Math.min(R.duration, t));
    drawLog.items = [];
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, R.W, R.H);
    kit.background(ctx, R, R.calm ? 0 : t);
    if (mode !== "background") {
      const i = sceneAt(t);
      const s = R.scenes[i];
      const inTransition = i > 0 && t < s.start + TR;
      if (inTransition) {
        const prev = R.scenes[i - 1];
        const a = A.getContext("2d"), b = B.getContext("2d");
        a.clearRect(0, 0, R.W, R.H);
        b.clearRect(0, 0, R.W, R.H);
        drawLog.on = false; // the outgoing scene is already checked at its own times
        drawScene(a, i - 1, Math.min(t, prev.end - 1e-3));
        drawLog.on = true;
        drawScene(b, i, t);
        kit.transition(ctx, R, A, B, (t - s.start) / TR);
      } else drawScene(ctx, i, t);
      clearSpots(ctx, t);
    }
    ctx.restore();
    // the tint goes over everything, background included, in both modes, so
    // the empty-spot comparison still compares like with like
    if (R.tint) {
      const img = ctx.getImageData(0, 0, R.W, R.H);
      tintPixels(img.data, R.tint);
      ctx.putImageData(img, 0, 0);
    }
    return drawLog.items.slice();
  }

  return { R, draw, kit, sceneAt, transitionSec: TR };
}
