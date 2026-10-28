// ---------------------------------------------------------------------------
// Hand shapes (motion library, 27 Oct 2026): point, thumbs up, open, fist,
// OK, peace, grip and wave, used by any move in any look.
//
// A hand is a palm plus finger strokes in the hand's own frame: +x carries on
// along the forearm, +y is across it. "relaxed" is the round hand every look
// drew before moves existed, so a character with no move looks as it did.
// Fingers are thick enough to read on a phone: a hand is about a palm and a
// half across, which is cartoon-big on purpose.
// ---------------------------------------------------------------------------

/**
 * Fingers per shape: [angle across the forearm line (rad), length × palm,
 * world-up?]. world-up fingers point up the screen whatever the arm does
 * (a thumbs up stays a thumbs up on a lowered arm).
 */
const FINGERS = {
  open: [[-0.55, 1.5], [-0.18, 1.7], [0.18, 1.65], [0.52, 1.4], [1.35, 1.15]],
  wave: [[-0.6, 1.5], [-0.2, 1.75], [0.2, 1.7], [0.6, 1.45], [1.45, 1.15]],
  point: [[0, 1.9]],
  peace: [[-0.22, 1.75], [0.22, 1.75]],
  thumbsUp: [[0, 1.45, true]],
  ok: [[0.35, 1.6], [0.7, 1.5], [1.05, 1.35]],
  fist: [],
  grip: [],
};

/** A shaped hand's palm radius in px (props use it to sit beside or on the hand). */
export function palmPx({ look, S, sk }) {
  return look.gloves ? 0.03 * S : look.limb === "line" ? 0.016 * S : sk.limbW * 0.95 * S;
}

/**
 * Draw one hand. arm: a skeleton arm { el, ha } (units); shape: a HAND_SHAPES
 * name; mirror: the figure is drawn mirrored (so "up the screen" is still up).
 */
export function drawHand(G, arm, shape, { relaxed }) {
  const { pen, S, sk, look, card, ctx, ink } = G;
  if (!shape || shape === "relaxed" || !FINGERS[shape]) return relaxed(arm);
  const [hx, hy] = [arm.ha[0] * S, arm.ha[1] * S];
  const ang = Math.atan2(arm.ha[1] - arm.el[1], arm.ha[0] - arm.el[0]);
  // a shaped hand is drawn bigger than the round one: a thumb has to read on a phone
  const palm = palmPx(G);
  const fw = look.limb === "line" ? Math.max(1.5, 0.007 * S) : Math.max(2, palm * 0.62);
  const skin = look.gloves ? "#ffffff" : card.skin;
  const lineLook = look.limb === "line";

  const finger = (a, len, worldUp) => {
    const dir = worldUp ? -Math.PI / 2 : ang + a;
    const from = [hx + Math.cos(dir) * palm * 0.5, hy + Math.sin(dir) * palm * 0.5];
    const to = [hx + Math.cos(dir) * palm * len, hy + Math.sin(dir) * palm * len];
    pen.poly([from, to], false);
    if (lineLook) { ctx.strokeStyle = ink; ctx.lineCap = "round"; ctx.lineWidth = fw; ctx.stroke(); return; }
    G.line(skin, fw / S, { role: "skin" });
  };

  // fingers behind the palm first, so the palm's outline sits over their roots
  for (const [a, len, up] of FINGERS[shape]) finger(a, len, up);
  if (shape === "grip") {
    // a C: the palm with a gap where the prop goes
    pen.ellipse(hx, hy, palm * 1.05, palm * 1.05, ang, 0.9, Math.PI * 2 - 0.9);
    if (lineLook) { ctx.strokeStyle = ink; ctx.lineWidth = fw; ctx.stroke(); return; }
    G.line(skin, fw / S, { role: "skin" });
    return;
  }
  pen.circle(hx, hy, palm * (shape === "fist" ? 1.08 : 1));
  if (lineLook) { ctx.fillStyle = ink; ctx.fill(); }
  else G.fill(skin, { role: look.gloves ? "eye" : "skin", noShade: true });
  if (shape === "ok") {
    // the ring made by thumb and first finger
    pen.circle(hx + Math.cos(ang - 0.5) * palm * 1.25, hy + Math.sin(ang - 0.5) * palm * 1.25, palm * 0.55);
    ctx.strokeStyle = lineLook ? ink : skin; ctx.lineWidth = fw * 0.8; ctx.stroke();
  }
}
