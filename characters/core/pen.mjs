// ---------------------------------------------------------------------------
// The pen: every shape a character is made of goes through here.
//
// Two reasons it exists instead of calling the canvas directly:
//   1. LINE BOIL. When it is on, every point is nudged a little, and the nudge
//      changes a few times a second (like hand-drawn animation "on twos"). One
//      place to do it means the hair, the clothes and the face all boil alike.
//   2. THE LAST PATH. Some looks paint a shape twice (1950s off-register
//      colour, glass highlights); the pen remembers the last outline so they
//      can redraw it moved, without the caller building it again.
//
// Pure: the wobble comes from a hash of (time step, point number), never from
// Math.random, so frame 240 looks the same in the preview and in every render
// worker.
// ---------------------------------------------------------------------------

import { hash } from "./math.mjs";

export const TAU = Math.PI * 2;

/** Points along a smooth curve through `pts` (Catmull-Rom), `per` per span. */
export function spline(pts, per = 10) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) out.push(cr(p0, p1, p2, p3, k / per));
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function cr(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u;
  return [0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3));
}

/** Points along a closed smooth curve through `pts`. */
export function loop(pts, per = 8) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < per; k++) out.push(cr(p0, p1, p2, p3, k / per));
  }
  return out;
}

/** A polygon's points with its corners rounded off (radius in the same units). */
export function rounded(pts, rad) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const la = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, lc = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1;
    const r = Math.min(rad, la / 2.2, lc / 2.2);
    const p = [b[0] + ((a[0] - b[0]) * r) / la, b[1] + ((a[1] - b[1]) * r) / la];
    const q = [b[0] + ((c[0] - b[0]) * r) / lc, b[1] + ((c[1] - b[1]) * r) / lc];
    for (let k = 0; k <= 6; k++) {
      const u = k / 6;
      out.push([(1 - u) * (1 - u) * p[0] + 2 * (1 - u) * u * b[0] + u * u * q[0], (1 - u) * (1 - u) * p[1] + 2 * (1 - u) * u * b[1] + u * u * q[1]]);
    }
  }
  return out;
}

/** Points around an ellipse (optionally an arc of it). */
export function ellipsePts(cx, cy, rx, ry, rot = 0, a0 = 0, a1 = TAU, k = 32) {
  const pts = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= k; i++) {
    const a = a0 + ((a1 - a0) * i) / k, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return pts;
}

/**
 * A pen bound to one canvas.
 * boil: wobble size in px (0 = none); rate: wobble changes per second.
 */
export function makePen(ctx, { t = 0, boil = 0, rate = 8 } = {}) {
  const step = boil ? Math.floor(t * rate) : 0;
  let n = 0;
  const jit = boil
    ? ([x, y]) => [x + (hash(step, n++) - 0.5) * boil * 2, y + (hash(step + 999, n++) - 0.5) * boil * 2]
    : (p) => p;
  const pen = {
    ctx,
    last: null,
    /** Optional point warp (head-local px → px), e.g. hair wrapping round a turning head. */
    warp: null,
    /** Start a fresh path from points (closed by default). */
    poly(pts, closed = true) {
      const q = (pen.warp ? pts.map(pen.warp) : pts).map(jit);
      pen.last = { q, closed };
      pen.trace(q, closed);
      return pen;
    },
    /** Rebuild a path from already-wobbled points, optionally moved. */
    trace(q, closed, dx = 0, dy = 0) {
      ctx.beginPath();
      q.forEach(([a, b], i) => (i ? ctx.lineTo(a + dx, b + dy) : ctx.moveTo(a + dx, b + dy)));
      if (closed) ctx.closePath();
      return pen;
    },
    ellipse(cx, cy, rx, ry, rot = 0, a0 = 0, a1 = TAU) {
      return pen.poly(ellipsePts(cx, cy, rx, ry, rot, a0, a1), a1 - a0 >= TAU - 1e-6);
    },
    circle(cx, cy, r) { return pen.ellipse(cx, cy, r, r); },
    /** Open smooth curve through the points. */
    curve(pts) { return pen.poly(spline(pts), false); },
    /** Closed smooth shape through the points. */
    blob(pts) { return pen.poly(loop(pts), true); },
    /** Polygon with rounded corners. */
    rpoly(pts, rad) { return pen.poly(rounded(pts, rad), true); },
    /** Bounds of the last path (after wobble), for gradients. */
    bounds() {
      if (!pen.last) return null;
      const xs = pen.last.q.map((p) => p[0]), ys = pen.last.q.map((p) => p[1]);
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    },
  };
  return pen;
}
