// ---------------------------------------------------------------------------
// A photoreal presenter's face: the puppet pipeline's own face parts (mouth
// shapes, eyelids, brows — made on the arms-down picture) drawn over the bent
// body, carried by the head bone, so the presenter talks and blinks with the
// same timing as every other puppet.
//
// parts: { name: { img, box: {x, y, w, h} } } in the arms-down picture's
// pixels (Image Forge's workshop meta.json "boxes"; the part pictures are
// <name>.layer.png). Mouth ids are the app's (src/lib/visemes/visemeMap.ts).
// ---------------------------------------------------------------------------

/** The app's mouth ids → the workshop's mouth parts (0 and 5 are the closed base mouth). */
export const MOUTH_PART = { 1: "mouth_AH", 2: "mouth_EE", 3: "mouth_OH", 4: "mouth_OO", 6: "mouth_FV", 7: "mouth_L", 8: "mouth_CHSH", 9: "mouth_SMILE", 10: "mouth_halfAH", 11: "mouth_halfOH", 12: "mouth_halfEE" };
const HALF_TO_FULL = { 10: 1, 11: 3, 12: 2 };
const LID_PART = { half: "lid_half", closed: "lid_closed", wide: "lid_wide" };
const BROW_PART = { happy: "brow_happy", raised: "brow_raised", worried: "brow_worried", confused: "brow_confused", serious: null };

/** Which parts to draw for a moment: [{ name, alpha }] (mouths cross-fade like the puppet's). */
export function faceParts(parts, { viseme = 0, prevViseme = viseme, mix = 1, lid = "open", brow = "serious" } = {}) {
  const mouth = (v) => {
    const n = MOUTH_PART[v];
    if (n && parts[n]) return n;
    const full = MOUTH_PART[HALF_TO_FULL[v]];
    return full && parts[full] ? full : null;
  };
  const out = [];
  const a = mouth(prevViseme), b = mouth(viseme);
  if (a && a !== b) out.push({ name: a, alpha: 1 - mix });
  if (b) out.push({ name: b, alpha: a === b ? 1 : mix });
  if (BROW_PART[brow] && parts[BROW_PART[brow]]) out.push({ name: BROW_PART[brow], alpha: 1 });
  if (LID_PART[lid] && parts[LID_PART[lid]]) out.push({ name: LID_PART[lid], alpha: 1 });
  return out;
}

/**
 * Draw the parts on a canvas already set up in the picture's own pixels
 * (the caller's transform maps picture px → screen), carried by the head:
 * head = { start, turn, a } from poseSkin (the head bone's joint, where it
 * moved to, and how far it turned).
 */
export function drawFace(ctx, parts, head, list) {
  ctx.save();
  ctx.translate(head.start[0], head.start[1]);
  ctx.rotate(head.turn);
  ctx.translate(-head.a[0], -head.a[1]);
  for (const { name, alpha } of list) {
    const p = parts[name];
    if (!p?.img || alpha <= 0.01) continue;
    ctx.globalAlpha = alpha;
    ctx.drawImage(p.img, p.box.x, p.box.y, p.box.w, p.box.h);
  }
  ctx.restore();
}
