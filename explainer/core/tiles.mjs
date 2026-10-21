// ---------------------------------------------------------------------------
// The pattern-tile engine (Ak's idea, 20 Oct 2026).
//
// A pattern is one small tile drawn in a few sizes and colours and turned by
// quarter turns. Change the tile's RULE and the same engine gives a different
// family: Truchet arcs, Greek key, diagonal fishbone, and later Arabic stars,
// Celtic knots, hexagons (docs/EXPLAINER-PLAN.md §2b).
//
// What the engine gives a style:
//   RULES[name].draw(ctx, x, y, s, o, ink)   one tile at quarter-turn o (0–3)
//   tileField(...)        a whole frame of tiles that can sweep in and flip
//   meanderBand(...)      a continuous Greek-key border that draws on
//   sweepDelay(...)       the diagonal order used for scene changes
// Our own code, written for Video Forge; nothing copied.
// ---------------------------------------------------------------------------

import { clamp, ease, rand2 } from "./math.mjs";

/**
 * ink: { line, width (as a fraction of s), fill? (tile ground) }.
 * Every rule draws inside its own square. Truchet joins its neighbours at the
 * middle of each edge and diagonal at the corners, so any mix of turns makes
 * continuous lines; key tiles are separate hooks (the continuous Greek key is
 * meanderBand below).
 */
export const RULES = {
  /** Two quarter-circle arcs about opposite corners. Turns: 2 distinct. */
  truchet: {
    turns: 2,
    draw(c, x, y, s, o, ink) {
      ground(c, x, y, s, ink);
      c.lineWidth = s * ink.width;
      c.strokeStyle = ink.line;
      c.lineCap = "butt";
      c.beginPath();
      if (o % 2 === 0) {
        c.moveTo(x + s / 2, y);
        c.arc(x, y, s / 2, 0, Math.PI / 2);
        c.moveTo(x + s / 2, y + s);
        c.arc(x + s, y + s, s / 2, Math.PI, Math.PI * 1.5);
      } else {
        c.moveTo(x + s, y + s / 2);
        c.arc(x + s, y, s / 2, Math.PI / 2, Math.PI);
        c.moveTo(x, y + s / 2);
        c.arc(x, y + s, s / 2, -Math.PI / 2, 0);
      }
      c.stroke();
    },
  },
  /** A small square spiral (one Greek-key hook). Turns: 4. */
  key: {
    turns: 4,
    draw(c, x, y, s, o, ink) {
      ground(c, x, y, s, ink);
      const g = s / 4;
      // hook drawn for o = 0, then turned about the tile centre
      const pts = [[0, 2], [0, 0], [3, 0], [3, 3], [1, 3], [1, 1.6], [2, 1.6]];
      c.save();
      c.translate(x + s / 2, y + s / 2);
      c.rotate((o % 4) * Math.PI / 2);
      c.translate(-s / 2, -s / 2);
      c.lineWidth = s * ink.width;
      c.strokeStyle = ink.line;
      c.lineJoin = "miter";
      c.lineCap = "square";
      c.beginPath();
      pts.forEach(([px, py], i) => (i ? c.lineTo(px * g + g / 2, py * g + g / 2) : c.moveTo(px * g + g / 2, py * g + g / 2)));
      c.stroke();
      c.restore();
    },
  },
  /** One diagonal: in rows of alternating turns it reads as fishbone/herringbone. Turns: 2. */
  diagonal: {
    turns: 2,
    draw(c, x, y, s, o, ink) {
      ground(c, x, y, s, ink);
      c.lineWidth = s * ink.width;
      c.strokeStyle = ink.line;
      c.lineCap = "round";
      c.beginPath();
      if (o % 2 === 0) { c.moveTo(x, y + s); c.lineTo(x + s, y); }
      else { c.moveTo(x, y); c.lineTo(x + s, y + s); }
      c.stroke();
    },
  },
};

function ground(c, x, y, s, ink) {
  if (!ink.fill) return;
  c.fillStyle = ink.fill;
  c.fillRect(x, y, s, s);
}

/** Diagonal order, 0 (top-left first) → 1 (bottom-right last), for sweeps. */
export const sweepDelay = (i, j, cols, rows) => clamp((i / Math.max(1, cols - 1)) * 0.68 + (j / Math.max(1, rows - 1)) * 0.32);

/**
 * A frame-filling field of tiles.
 *   rule      RULES key
 *   cell      tile size in px
 *   seed      which pattern
 *   ink       see RULES
 *   t         time
 *   build     { start, dur }  tiles sweep in diagonally (each pops from 0.6 → 1 scale)
 *   flips     { every, dur }  a few tiles quarter-turn now and then (alive, not busy)
 *   alpha     overall opacity
 *   ox, oy    offset (slow drift)
 */
export function tileField(c, W, H, o) {
  const rule = RULES[o.rule] ?? RULES.truchet;
  const s = o.cell;
  const cols = Math.ceil(W / s) + 2, rows = Math.ceil(H / s) + 2;
  const ox = ((o.ox ?? 0) % s) - s, oy = ((o.oy ?? 0) % s) - s;
  c.save();
  c.globalAlpha = o.alpha ?? 1;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = ox + i * s, y = oy + j * s;
      let turn = Math.floor(rand2(o.seed, i, j) * 4);
      let scale = 1, rot = 0;
      if (o.build) {
        const k = clamp((o.t - o.build.start - sweepDelay(i, j, cols, rows) * o.build.dur * 0.75) / (o.build.dur * 0.25));
        if (k <= 0) continue;
        scale = 0.6 + 0.4 * ease.back(k);
      }
      if (o.flips) {
        // each tile has its own clock; about one tile in eight is mid-turn at any moment
        const period = o.flips.every * (0.7 + rand2(o.seed + 7, i, j) * 0.9);
        const phase = rand2(o.seed + 3, i, j) * period;
        const local = (o.t + phase) % period;
        const n = Math.floor((o.t + phase) / period);
        turn += n;
        if (local < o.flips.dur) rot = (ease.inOut(local / o.flips.dur) - 1) * Math.PI / 2;
      }
      if (scale !== 1 || rot !== 0) {
        c.save();
        c.translate(x + s / 2, y + s / 2);
        c.rotate(rot);
        c.scale(scale, scale);
        c.translate(-x - s / 2, -y - s / 2);
        rule.draw(c, x, y, s, turn % rule.turns, o.ink);
        c.restore();
      } else rule.draw(c, x, y, s, turn % rule.turns, o.ink);
    }
  }
  c.restore();
}

/**
 * A continuous Greek key (running meander) along a horizontal band, drawing on
 * from left to right as `progress` goes 0 → 1. Height h; units of width 1.5h.
 * Returns the x where the drawn line currently ends (for a leading spark).
 */
export function meanderBand(c, x, y, w, h, progress, ink) {
  const g = h / 4;
  const unit = [[0, 4], [0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [6, 4]];
  const units = Math.max(1, Math.floor(w / (6 * g)));
  const x0 = x + (w - units * 6 * g) / 2;
  const pts = [];
  for (let u = 0; u < units; u++) for (let k = u ? 1 : 0; k < unit.length; k++) pts.push([x0 + (u * 6 + unit[k][0]) * g, y + unit[k][1] * g]);
  return polyline(c, pts, progress, ink);
}

/** Same Greek key, running down a vertical band (for portrait layouts). */
export function meanderColumn(c, x, y, w, h, progress, ink) {
  c.save();
  c.translate(x + w, y);
  c.rotate(Math.PI / 2);
  const end = meanderBand(c, 0, 0, h, w, progress, ink);
  c.restore();
  return end;
}

/** Stroke the first `progress` (0–1) of a polyline by length. Returns the tip point. */
export function polyline(c, pts, progress, ink) {
  if (pts.length < 2 || progress <= 0) return null;
  let total = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let left = total * clamp(progress);
  c.save();
  c.lineWidth = ink.lineWidth;
  c.strokeStyle = ink.line;
  c.lineJoin = ink.join ?? "miter";
  c.lineCap = ink.cap ?? "square";
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  let tip = pts[0];
  for (let i = 1; i < pts.length && left > 0; i++) {
    const k = Math.min(1, left / seg[i - 1]);
    tip = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    c.lineTo(tip[0], tip[1]);
    left -= seg[i - 1];
  }
  c.stroke();
  c.restore();
  return tip;
}

/** Points of an orthogonal (right-angle) route a→b, turning once in the middle. */
export function elbow(a, b, horizontalFirst = true) {
  if (horizontalFirst) {
    const mx = (a[0] + b[0]) / 2;
    return [a, [mx, a[1]], [mx, b[1]], b];
  }
  const my = (a[1] + b[1]) / 2;
  return [a, [a[0], my], [b[0], my], b];
}

/**
 * A wave of half circles along a horizontal band — the Truchet arc read as a
 * line, drawing on left to right. Height h; each half circle is h wide.
 * (Ak, 20 Oct 2026: the brand's own curve, used where a Greek key looked foreign.)
 */
export function arcBand(c, x, y, w, h, progress, ink) {
  const r = h / 2;
  const n = Math.max(1, Math.floor(w / (2 * r)));
  const x0 = x + (w - n * 2 * r) / 2, cy = y + r;
  const pts = [];
  const steps = 14;
  for (let k = 0; k < n; k++) {
    const up = k % 2 === 0;
    for (let i = k ? 1 : 0; i <= steps; i++) {
      const a = Math.PI - (Math.PI * i) / steps;
      pts.push([x0 + k * 2 * r + r + Math.cos(a) * r, cy + (up ? -1 : 1) * Math.sin(a) * r * 0.9]);
    }
  }
  return polyline(c, pts, progress, { ...ink, cap: "round", join: "round" });
}

/** The same half-circle wave running down a vertical band. */
export function arcColumn(c, x, y, w, h, progress, ink) {
  c.save();
  c.translate(x + w, y);
  c.rotate(Math.PI / 2);
  const end = arcBand(c, 0, 0, h, w, progress, ink);
  c.restore();
  return end;
}
