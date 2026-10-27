// ---------------------------------------------------------------------------
// Frame shapes, the readable-size rules, and the puppet spots.
//
// SIZES. Every explainer works in four shapes. Text rules are written for a
// 720-pixel-tall landscape frame (where phone viewers were measured) and scale
// with the frame's SHORT side, so a portrait video gets the same physical
// readability as a landscape one.
//
// PUPPET SPOTS. When puppets talk over an explainer, the explainer leaves
// their spots empty and is used as the puppet video's background. A spot is
// exactly where Video Forge draws a face: centre (x*W, y*H), a square of side
// size*W (remotion/VideoComposition.tsx), plus padding for the halo around
// the face. The explainer lays its content out in what is left.
// ---------------------------------------------------------------------------

export const FORMATS = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
};

/** One "rule pixel": 1 px of a 720-high landscape frame, scaled to this frame. */
export const unitFor = (W, H) => Math.min(W, H) / 720;

/** Minimum sizes from the readability rules (in rule pixels). */
export const MIN_SIZE = { headline: 44, label: 28, number: 64 };

/** Safe margin: nothing important closer to the edge than this. */
export const safeMargin = (W, H) => Math.round(Math.min(W, H) * 0.06);

/**
 * Puppet spots for explainers, per shape and cast size, in Video Forge's own
 * speaker-slot units ({x, y, size} with size a fraction of the WIDTH).
 * Kept to an edge (a side column in landscape, a bottom row otherwise) so the
 * explainer keeps one big clear rectangle for its story.
 */
export const EXPLAINER_SPOTS = {
  "16:9": {
    1: [{ x: 0.855, y: 0.62, size: 0.22 }],
    2: [{ x: 0.865, y: 0.29, size: 0.18 }, { x: 0.865, y: 0.73, size: 0.18 }],
    3: [{ x: 0.88, y: 0.19, size: 0.14 }, { x: 0.88, y: 0.5, size: 0.14 }, { x: 0.88, y: 0.81, size: 0.14 }],
  },
  "9:16": {
    1: [{ x: 0.5, y: 0.85, size: 0.4 }],
    2: [{ x: 0.28, y: 0.865, size: 0.36 }, { x: 0.72, y: 0.865, size: 0.36 }],
    3: [{ x: 0.18, y: 0.88, size: 0.26 }, { x: 0.5, y: 0.88, size: 0.26 }, { x: 0.82, y: 0.88, size: 0.26 }],
  },
  "1:1": {
    1: [{ x: 0.83, y: 0.8, size: 0.28 }],
    2: [{ x: 0.27, y: 0.83, size: 0.26 }, { x: 0.73, y: 0.83, size: 0.26 }],
    3: [{ x: 0.19, y: 0.85, size: 0.23 }, { x: 0.5, y: 0.85, size: 0.23 }, { x: 0.81, y: 0.85, size: 0.23 }],
  },
  "4:5": {
    1: [{ x: 0.81, y: 0.83, size: 0.3 }],
    2: [{ x: 0.27, y: 0.85, size: 0.28 }, { x: 0.73, y: 0.85, size: 0.28 }],
    3: [{ x: 0.19, y: 0.87, size: 0.25 }, { x: 0.5, y: 0.87, size: 0.25 }, { x: 0.81, y: 0.87, size: 0.25 }],
  },
};

/** Shape name -> Video Forge's OutlineShape values. */
export const SPOT_SHAPES = ["circle", "rounded", "square"];

/** Halo padding around a face, as a fraction of its size. */
export const SPOT_PAD = 0.1;

/**
 * Turn speaker slots into the empty areas the explainer must leave.
 * Each hole: { shape, cx, cy, w, h, r (corner radius), box: {x,y,w,h} incl. padding }.
 */
export function holesFor(slots, W, H, shape = "circle", pad = SPOT_PAD) {
  return (slots ?? []).map((s) => {
    const side = Math.max(8, s.size * W);
    const p = side * (1 + 2 * pad);
    const sh = s.shape ?? s.outlineShape ?? shape;
    const r = sh === "square" ? 0 : sh === "rounded" ? p * 0.18 : p / 2;
    const cx = s.x * W, cy = s.y * H;
    return { shape: sh === "none" ? "circle" : sh, cx, cy, w: p, h: p, r, box: { x: cx - p / 2, y: cy - p / 2, w: p, h: p } };
  });
}

/** Trace a hole's outline into a canvas path (for clipping and outlines). */
export function holePath(ctx, h) {
  if (h.shape === "circle") {
    ctx.moveTo(h.cx + h.w / 2, h.cy);
    ctx.arc(h.cx, h.cy, h.w / 2, 0, Math.PI * 2);
    return;
  }
  const x = h.box.x, y = h.box.y, w = h.w, hh = h.h, r = Math.min(h.r, w / 2, hh / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + hh, r);
  ctx.arcTo(x + w, y + hh, x, y + hh, r);
  ctx.arcTo(x, y + hh, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Does a rectangle touch a hole (its true shape, not just its box)? */
export function rectHitsHole(rect, h) {
  const bx = h.box;
  if (rect.x >= bx.x + bx.w || rect.x + rect.w <= bx.x || rect.y >= bx.y + bx.h || rect.y + rect.h <= bx.y) return false;
  if (h.shape !== "circle") return true; // corners of a rounded square are a few pixels; treat the box as the hole
  const nx = clampN(h.cx, rect.x, rect.x + rect.w), ny = clampN(h.cy, rect.y, rect.y + rect.h);
  return (nx - h.cx) ** 2 + (ny - h.cy) ** 2 < (h.w / 2) ** 2;
}
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * The biggest clear rectangle for content: inside the safe margins, clear of
 * every hole (by its padded box) with a gap. Candidates are the regions above,
 * below, left of and right of all holes; the biggest usable one wins, with a
 * mild preference for a landscape-ish box when areas are close.
 */
export function contentBox(W, H, holes) {
  const m = safeMargin(W, H);
  const safe = { x: m, y: m, w: W - 2 * m, h: H - 2 * m };
  if (!holes.length) return safe;
  const gap = Math.round(Math.min(W, H) * 0.03);
  const top = Math.min(...holes.map((h) => h.box.y)) - gap;
  const bottom = Math.max(...holes.map((h) => h.box.y + h.box.h)) + gap;
  const left = Math.min(...holes.map((h) => h.box.x)) - gap;
  const right = Math.max(...holes.map((h) => h.box.x + h.box.w)) + gap;
  const cands = [
    { x: safe.x, y: safe.y, w: safe.w, h: Math.min(top, safe.y + safe.h) - safe.y },
    { x: safe.x, y: Math.max(bottom, safe.y), w: safe.w, h: safe.y + safe.h - Math.max(bottom, safe.y) },
    { x: safe.x, y: safe.y, w: Math.min(left, safe.x + safe.w) - safe.x, h: safe.h },
    { x: Math.max(right, safe.x), y: safe.y, w: safe.x + safe.w - Math.max(right, safe.x), h: safe.h },
  ].filter((c) => c.w > 0 && c.h > 0);
  if (!cands.length) return { x: safe.x, y: safe.y, w: 0, h: 0 };
  // lines of text read better wide, so a wide box wins when areas are close
  const score = (c) => c.w * c.h * Math.min(1, (Math.min(c.w, c.h) / Math.max(c.w, c.h)) * 2.2) * (c.w >= c.h ? 1.12 : 1);
  return cands.sort((a, b) => score(b) - score(a))[0];
}

/** Spots for a shape + cast size, in Video Forge's slot form (with the outline shape). */
export function explainerSpots(format, count, shape = "circle") {
  const rows = EXPLAINER_SPOTS[format]?.[count];
  if (!rows) return [];
  return rows.map((s) => ({ ...s, outlineShape: shape }));
}
