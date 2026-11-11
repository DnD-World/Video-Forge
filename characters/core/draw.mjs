// ---------------------------------------------------------------------------
// Draw one character at one moment.
//
//   drawCharacter(ctx, card, { look, S, x, y, mirror, state })
//       the figure, feet at (x, y), S px per unit of height
//   drawFigure(ctx, card, opts)
//       the same, plus the look's whole-figure treatment (sticker edge, chalk
//       dust, paper shadow, print offset, neon glow, lamp halo)
//   frameFor(card, look, framing, box)
//       where to put the figure so "head", "waist" or "full" fills a box
//
// Same contract as the explainers: a pure function of its inputs. The same
// card, look and state draw the same pixels in the live preview, in every
// Remotion render worker, and in the checks.
// ---------------------------------------------------------------------------

import { clamp, lerp, shade } from "./math.mjs";
import { TAU, makePen, spline } from "./pen.mjs";
import { inkFor, newCanvas, paint, strokeLine, toneColor, hatchPattern, dotPattern } from "./paint.mjs";
import { lookById } from "./looks.mjs";
import { solveRig, anchors, figureExtent } from "./rig.mjs";
import { ITEMS, itemById, barefoot, ankle } from "./wardrobe.mjs";
import { EXPRESSION_REST, EXPRESSION_SMILE, browShape, lidAmount, mouthShape } from "./face.mjs";
import { applyLayer } from "./fx.mjs";
import { RecordingCtx } from "./record.mjs";
import { capHem } from "./follow.mjs";
import { drawHand, palmPx } from "./hands.mjs";
import { drawFaceMarks, drawNeckMarks, drawArmMarks } from "./marks.mjs";
import { hairContactShadow, faceClay, torsoCreases } from "./clay.mjs";
import { drawProp, drawSeat, PROPS } from "./props.mjs";

// ---- hair ----------------------------------------------------------------------------------
// Each style: back (behind the head) and/or front (on top), head-centred px.

const cap = (sk, S, k = 1) => {
  const { rx, ry } = sk, b = -sk.side * rx * 0.12;
  return [[-rx * 1.03 + b, -ry * 0.05], [-rx * 0.99 + b, -ry * 0.6], [-rx * 0.5 + b, -ry * 1.05 * k], [rx * 0.3, -ry * 1.08 * k], [rx * 0.92, -ry * 0.68], [rx * 1.02, -ry * 0.22], [rx * 0.6, -ry * 0.52], [rx * 0.05, -ry * 0.6], [-rx * 0.6, -ry * 0.42]].map(([x, y]) => [x * S, y * S]);
};
// cap styles: drawn as a cap over the front, with no back piece of their own
// (and the long styles: their hair also covers the back of the skull once it turns into view)
const CAP_STYLES = new Set(["short", "buzz", "sidepart", "spiky", "curly", "messy", "shaggy", "undercut", "long", "bob", "ponytail", "pigtails", "bun", "braid"]);
const LONG_BACK = new Set(["long", "bob"]);
const HAIR = {
  bald: {},
  tuft: { front: (G, sk, S, c) => { G.pen.curve([[-sk.rx * 0.1 * S, -sk.ry * 0.95 * S], [0, -sk.ry * 1.35 * S], [sk.rx * 0.3 * S, -sk.ry * 1.3 * S], [sk.rx * 0.22 * S, -sk.ry * 1.12 * S]]); G.line(c, 0.012); } },
  buzz: { front: (G, sk, S, c) => { G.pen.ellipse(-sk.side * sk.rx * 0.1 * S, -sk.ry * 0.12 * S, sk.rx * 1.02 * S, sk.ry * 0.94 * S, 0, Math.PI * 1.06, Math.PI * 1.94); G.fill(c, { role: "hair", noShade: true }); } },
  short: { front: (G, sk, S, c) => { G.pen.blob(cap(sk, S)); G.fill(c, { role: "hair", noShade: true }); } },
  sidepart: { front: (G, sk, S, c) => {
    const { rx, ry } = sk, b = -sk.side * rx * 0.12;
    // swept up and over from a clear part on one side, so it never reads as plain "short" (Ak, 2 Nov)
    G.pen.blob([[-rx * 1.02 + b, -ry * 0.05], [-rx * 0.98 + b, -ry * 0.62], [-rx * 0.6 + b, -ry * 1.0], [rx * 0.1, -ry * 1.24], [rx * 0.9, -ry * 0.92], [rx * 1.06, -ry * 0.36], [rx * 0.7, -ry * 0.5], [rx * 0.1, -ry * 0.72], [-rx * 0.45 + b, -ry * 0.62], [-rx * 0.72 + b, -ry * 0.42]].map(([x, y]) => [x * S, y * S]));
    G.fill(c, { role: "hair", noShade: true });
    G.pen.curve([[-rx * 0.5 + b, -ry * 1.0], [-rx * 0.52 + b, -ry * 0.8], [-rx * 0.48 + b, -ry * 0.62]].map(([x, y]) => [x * S, y * S]));
    G.line(shade(c, -0.35), 0.006);
  } },
  spiky: { front: (G, sk, S, c) => {
    const { rx, ry } = sk, pts = [[-rx * 1.02, -ry * 0.1]];
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.05 + i * 0.1125), r = i % 2 ? 1.0 : 1.38; pts.push([Math.cos(a) * rx * r, Math.sin(a) * ry * r - ry * 0.05]); }
    pts.push([rx * 1.02, -ry * 0.15], [0, -ry * 0.55]);
    G.pen.poly(pts.map(([x, y]) => [x * S, y * S])); G.fill(c, { role: "hair", noShade: true });
  } },
  curly: { front: (G, sk, S, c) => {
    G.pen.blob(cap(sk, S, 0.95)); G.fill(c, { role: "hair", noShade: true });
    for (let i = 0; i < 9; i++) { const a = Math.PI * (1.02 + i * 0.12); G.pen.circle(Math.cos(a) * sk.rx * 0.98 * S, (Math.sin(a) * sk.ry * 0.98 - sk.ry * 0.05) * S, sk.R * 0.2 * S); G.fill(c, { role: "hair", noShade: true }); }
  } },
  afro: {
    back: (G, sk, S, c) => { G.pen.circle(-sk.side * sk.rx * 0.2 * S, -sk.ry * 0.3 * S, sk.R * 1.5 * S); G.fill(c, { role: "hair", noShade: true }); },
    front: (G, sk, S, c) => { G.pen.ellipse(0, -sk.ry * 0.45 * S, sk.rx * 1.05 * S, sk.ry * 0.62 * S, 0, Math.PI, TAU); G.fill(c, { role: "hair", noShade: true }); },
  },
  bob: {
    back: (G, sk, S, c) => { const { rx, ry } = sk, b = -sk.side * rx * 0.25; G.pen.rpoly([[(-rx * 1.18 + b) * S, -ry * 0.9 * S], [(rx * 1.18 + b * 0.3) * S, -ry * 0.9 * S], [(rx * 1.2) * S, ry * 0.75 * S], [(-rx * 1.2 + b) * S, ry * 0.75 * S]], sk.R * 0.5 * S); G.fill(c, { role: "hair", noShade: true }); },
    front: (G, sk, S, c) => { G.pen.blob(cap(sk, S)); G.fill(c, { role: "hair", noShade: true }); },
  },
  // long: two curtains falling over the shoulders with the neck showing between them
  // (one solid mass under the chin read as a bib, Ak 2 Nov 2026), locks framing the face in front
  long: {
    hidesEars: true, // ears poking out of the curtains read as headphones
    back: (G, sk, S, c) => {
      const { rx, ry } = sk, b = -sk.side * rx * 0.3;
      G.pen.ellipse(b * 0.5 * S, -ry * 0.12 * S, rx * 1.12 * S, ry * 1.0 * S); G.fill(c, { role: "hair", noShade: true });
      for (const s of [-1, 1]) {
        if (sk.side > 0.6 && s > 0) continue;
        const o = s < 0 ? b : b * 0.3;
        G.pen.blob([[-1.1, -0.3], [-0.72, -0.15], [-0.74, 0.9], [-0.6, 1.5], [-0.82, 1.78], [-1.08, 1.66], [-1.3, 1.35], [-1.24, 0.4]].map(([x, y]) => [(s * -x * rx + o) * S, y * ry * S]));
        G.fill(c, { role: "hair", noShade: true });
      }
    },
    front: (G, sk, S, c) => {
      const { rx, ry } = sk, b = -sk.side * rx * 0.12;
      G.pen.blob(cap(sk, S)); G.fill(c, { role: "hair", noShade: true });
      for (const s of [-1, 1]) {
        if (sk.side > 0.6 && s > 0) continue;
        const o = s < 0 ? b : 0;
        G.pen.blob([[-1.08, -0.55], [-0.8, -0.42], [-0.84, 0.15], [-0.92, 0.72], [-1.16, 0.5]].map(([x, y]) => [(s * -x * rx + o) * S, y * ry * S]));
        G.fill(c, { role: "hair", noShade: true });
      }
    },
  },
  ponytail: {
    back: (G, sk, S, c, t) => {
      const R = sk.R, swing = Math.sin(t * 3 + 1) * 0.12, b = -sk.side * sk.rx * 0.4;
      const spine = [[-R * 0.7 + b, -R * 0.75], [-R * 1.25 + b, -R * 0.2 + swing * R], [-R * 1.2 + b, R * 0.7], [-R * 0.95 + b, R * 1.25 + swing * R * 0.5]];
      tail(G, spine.map(([x, y]) => [x * S, y * S]), R * 0.27 * S, c);
    },
    front: (G, sk, S, c) => { G.pen.blob(cap(sk, S)); G.fill(c, { role: "hair", noShade: true }); },
  },
  pigtails: {
    back: (G, sk, S, c, t) => {
      const R = sk.R;
      for (const s of [-1, 1]) {
        if (sk.side > 0.6 && s > 0) continue;
        const sw = Math.sin(t * 3 + s) * 0.08;
        tail(G, [[s * R * 0.85, -R * 0.35], [s * R * 1.3, R * 0.1 + sw * R], [s * R * 1.3, R * 0.8]].map(([x, y]) => [x * S, y * S]), R * 0.2 * S, c);
      }
    },
    front: (G, sk, S, c) => { G.pen.blob(cap(sk, S)); G.fill(c, { role: "hair", noShade: true }); },
  },
  bun: {
    back: (G, sk, S, c) => { G.pen.circle((-sk.side * sk.rx * 0.55) * S, -sk.ry * 1.05 * S, sk.R * 0.42 * S); G.fill(c, { role: "hair", noShade: true }); },
    front: (G, sk, S, c) => { G.pen.blob(cap(sk, S)); G.fill(c, { role: "hair", noShade: true }); },
  },
  braid: {
    back: (G, sk, S, c, t) => {
      const R = sk.R, b = -sk.side * sk.rx * 0.6, sw = Math.sin(t * 2.5) * 0.06;
      for (let i = 0; i < 6; i++) { G.pen.ellipse((b - R * 0.1 + Math.sin(i * 1.7) * R * 0.05 + sw * R * i * 0.3) * S, (R * 0.3 + i * R * 0.28) * S, R * 0.17 * S, R * 0.2 * S); G.fill(c, { role: "hair", noShade: true }); }
    },
    front: (G, sk, S, c) => { G.pen.blob(cap(sk, S)); G.fill(c, { role: "hair", noShade: true }); },
  },
  mohawk: { front: (G, sk, S, c) => { G.pen.blob([[-sk.rx * 0.6, -sk.ry * 0.75], [-sk.rx * 0.4, -sk.ry * 1.45], [sk.rx * 0.25, -sk.ry * 1.55], [sk.rx * 0.6, -sk.ry * 0.8], [0, -sk.ry * 0.88]].map(([x, y]) => [x * S, y * S])); G.fill(c, { role: "hair", noShade: true }); } },
  // bald on top, fluffy tufts over the ears (Schopenhauer, Korczak, Uncle Gary; 2 Nov 2026)
  sides: { front: (G, sk, S, c) => {
    const { rx, ry } = sk;
    for (const s of [-1, 1]) {
      if (sk.side > 0.6 && s > 0) continue;
      for (const [dx, dy, r] of [[0.96, -0.36, 0.15], [1.05, -0.14, 0.19], [1.0, 0.1, 0.15]]) { G.pen.circle(s * dx * rx * S, dy * ry * S, sk.R * r * S); G.fill(c, { role: "hair", noShade: true }); }
    }
  } },
  // messy teen cut: uneven tufts on top, a few locks dropping onto the forehead (Ak, 2 Nov 2026)
  messy: { front: (G, sk, S, c) => {
    const { rx, ry } = sk, b = -sk.side * rx * 0.12, tips = [1.12, 1.0, 1.24, 1.03, 1.17, 0.99, 1.22, 1.02, 1.1];
    const pts = [[-rx * 1.05 + b, -ry * 0.02]];
    tips.forEach((r, i) => { const a = Math.PI * (1.04 + i * 0.115); pts.push([Math.cos(a) * rx * r + (i < 4 ? b : 0), Math.sin(a) * ry * r - ry * 0.06]); });
    pts.push([rx * 1.05, -ry * 0.08], [rx * 0.82, -ry * 0.32], [rx * 0.68, -ry * 0.52], [rx * 0.46, -ry * 0.36], [rx * 0.3, -ry * 0.56], [rx * 0.06, -ry * 0.38],
      [-rx * 0.14, -ry * 0.58], [-rx * 0.4 + b, -ry * 0.4], [-rx * 0.58 + b, -ry * 0.54], [-rx * 0.86 + b, -ry * 0.3]);
    G.pen.poly(pts.map(([x, y]) => [x * S, y * S])); G.fill(c, { role: "hair", noShade: true });
  } },
  // shaggy fringe: full, ear-covering, pointed locks swept to one side across the forehead
  shaggy: {
    back: (G, sk, S, c) => { const { rx, ry } = sk, b = -sk.side * rx * 0.3; G.pen.blob([[(-rx * 1.16 + b) * S, -ry * 0.75 * S], [rx * 1.16 * S, -ry * 0.75 * S], [rx * 1.22 * S, ry * 0.32 * S], [rx * 0.9 * S, ry * 0.55 * S], [(-rx * 0.9 + b) * S, ry * 0.55 * S], [(-rx * 1.22 + b) * S, ry * 0.32 * S]]); G.fill(c, { role: "hair", noShade: true }); },
    front: (G, sk, S, c) => {
      const { rx, ry } = sk, b = -sk.side * rx * 0.12, pts = [[-rx * 1.12 + b, ry * 0.22], [-rx * 1.1 + b, -ry * 0.3]];
      for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.08 + i * 0.105); pts.push([Math.cos(a) * rx * 1.08 + (i < 4 ? b : 0), Math.sin(a) * ry * 1.1 - ry * 0.04]); }
      pts.push([rx * 1.1, -ry * 0.3], [rx * 1.12, ry * 0.22], [rx * 0.9, -ry * 0.05], [rx * 0.86, -ry * 0.36],
        [rx * 0.62, -ry * 0.28], [rx * 0.5, -ry * 0.55], [rx * 0.28, -ry * 0.34], [rx * 0.12, -ry * 0.6], [-rx * 0.12, -ry * 0.38],
        [-rx * 0.28, -ry * 0.62], [-rx * 0.52 + b, -ry * 0.42], [-rx * 0.66 + b, -ry * 0.62], [-rx * 0.86 + b, -ry * 0.36], [-rx * 0.9 + b, -ry * 0.05]);
      G.pen.poly(pts.map(([x, y]) => [x * S, y * S])); G.fill(c, { role: "hair", noShade: true });
    },
  },
  // undercut: clipped sides (the hair colour faded towards the skin) under a long top that flops to one side
  undercut: { front: (G, sk, S, c) => {
    const { rx, ry } = sk, b = -sk.side * rx * 0.12;
    G.pen.ellipse(-sk.side * rx * 0.1 * S, -ry * 0.1 * S, rx * 1.01 * S, ry * 0.92 * S, 0, Math.PI * 1.04, Math.PI * 1.96); G.fill(shade(c, 0.22), { role: "hair", noShade: true });
    G.pen.blob([[-rx * 0.72 + b, -ry * 0.62], [-rx * 0.7 + b, -ry * 1.2], [-rx * 0.1, -ry * 1.5], [rx * 0.7, -ry * 1.38], [rx * 1.12, -ry * 0.9],
      [rx * 1.0, -ry * 0.42], [rx * 0.66, -ry * 0.44], [rx * 0.3, -ry * 0.72], [-rx * 0.3 + b, -ry * 0.78]].map(([x, y]) => [x * S, y * S]));
    G.fill(c, { role: "hair", noShade: true });
  } },
};
export const HAIR_STYLES = Object.keys(HAIR);

/** A tapering lock of hair along `spine` (px points), as one closed shape. */
function tail(G, spine0, width, c) {
  const pts = [];
  const sp = splineLike(spine0);
  const L = [], Rr = [];
  sp.forEach((q, i) => {
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
    const u = i / (sp.length - 1), w = width * Math.sin(Math.min(1, 0.25 + u) * Math.PI * 0.9) * (1 - u * 0.55);
    L.push([q[0] - (dy / n) * w, q[1] + (dx / n) * w]); Rr.push([q[0] + (dy / n) * w, q[1] - (dx / n) * w]);
  });
  G.pen.blob([...L.filter((_, i) => i % 3 === 0), ...Rr.reverse().filter((_, i) => i % 3 === 0)]);
  G.fill(c, { role: "hair", noShade: true });
  return pts;
}
function splineLike(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 10; k++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], u = k / 10, u2 = u * u, u3 = u2 * u;
    out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3)));
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// ---- the figure -----------------------------------------------------------------------------

const extents = new Map();
/**
 * The figure's real extent in units, measured by drawing it (unseen) in the
 * poses that reach furthest: big hair, a top hat and a raised hand all count.
 * Cached per card and look.
 */
export function measureFigure(card, look) {
  const key = look.id + JSON.stringify(card);
  let e = extents.get(key);
  if (!e) {
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const pose of ["rest", "wave", "point", "shrug"]) for (const view of [0, 2]) {
      // measured at a realistic size: minimum line widths are in px, and at 1 px
      // per unit they would swamp the figure
      const M = 600, rc = new RecordingCtx();
      drawCharacter(rc, card, { look, S: M, state: { t: 0, pose, poseK: 1, view } });
      b.x0 = Math.min(b.x0, rc.box.x0 / M); b.y0 = Math.min(b.y0, rc.box.y0 / M); b.x1 = Math.max(b.x1, rc.box.x1 / M); b.y1 = Math.max(b.y1, rc.box.y1 / M);
    }
    const ext = figureExtent(card, look);
    e = { ...ext, top: b.y0, half: Math.max(-b.x0, b.x1) };
    if (extents.size > 200) extents.clear();
    extents.set(key, e);
  }
  return e;
}

/** Where to draw so the framing fills the box: returns { S, x, y } (feet point). */
export function frameFor(card, look0, framing = "full", box) {
  const look = typeof look0 === "string" ? lookById(look0) : look0;
  const ext = measureFigure(card, look);
  const bottom = framing === "head" ? ext.shoulders + 0.1 : framing === "waist" ? ext.hips + 0.06 : 0.02;
  const span = bottom - ext.top;
  const fill = framing === "full" ? 0.92 : 0.94;
  // fit the height, and for the full body also the width (arms out, hair wide)
  const S = Math.min((box.h * fill) / span, framing === "full" ? (box.w * 0.96) / (2 * ext.half) : Infinity);
  // the top of the framed region sits a small margin below the box's top
  const y = box.y + (box.h - span * S) / 2 - ext.top * S;
  return { S, x: box.x + box.w / 2, y };
}

/**
 * Draw the character. Returns measurements for the checks (px, canvas space,
 * before the caller's own transforms): { mouth, eyes, head }.
 */
export function drawCharacter(ctx, card, { look: look0 = card.look, S, x = 0, y = 0, mirror = false, state = {}, headless = false } = {}) {
  const look1 = typeof look0 === "string" ? lookById(look0) : look0;
  // the card's hint of 3D (paint.mjs form), unless the look already says how much
  const look0b = look1.form === undefined && card.form > 0 ? { ...look1, form: card.form } : look1;
  // clay details ride on the hint of 3D (core/clay.mjs)
  const look1b = look0b.form && look0b.formDetail === undefined && card.formDetail ? { ...look0b, formDetail: true } : look0b;
  // arms, hands, legs and feet may take less of the 3D than the body (Ak, 5 Nov 2026)
  const look = look1b.form && look1b.formLimbs === undefined && card.formLimbs != null && card.formLimbs !== 1 ? { ...look1b, formLimbs: card.formLimbs } : look1b;
  const t = state.t ?? 0;
  // adjust (2D lab, 4 Nov 2026): a body solver may move the solved joints
  // (feet planted, knees from IK, hands on a partner) before anything is drawn
  const sk0 = solveRig(card, look, state);
  const sk = state.adjust ? state.adjust(sk0, card, look) ?? sk0 : sk0;
  const A = anchors(sk);
  const boil = (card.boil ?? look.boil ?? 0) * (S / 300);
  const pen = makePen(ctx, { t, boil, rate: look.boilRate ?? 8 });
  const ink = inkFor(look, card);
  const wear = (card.wear ?? []).map((w) => ({ ...w, item: itemById(w.id) })).filter((w) => w.item);
  const tone = (c, role) => toneColor(look, c, role);

  // follow-through (follow.mjs): hair, hems and earrings trail the body
  const follow = state.follow ?? null, fsx = mirror ? -1 : 1;
  const G = {
    ctx, pen, look, S, ink, sk, A, card, t, tone, follow, fsx,
    U: (pts) => pts.map(([a, b]) => [a * S, b * S]),
    fill: (color, o = {}) => {
      paint(G, color, o);
      if (o.pattern && o.pattern !== "none") overlayPattern(G, color, o.pattern);
    },
    line: (color, width, o = {}) => {
      if (o.ink && (look.incise || look.fill === "none")) { ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, width * S); ctx.lineCap = "round"; ctx.stroke(); return; }
      if (o.feature) { ctx.strokeStyle = look.fill === "none" ? ink : color; ctx.lineWidth = Math.max(1, width * S); ctx.lineCap = "round"; ctx.stroke(); return; }
      strokeLine(G, color, width, { role: o.role ?? "cloth" });
      if (look.inner && look.fill !== "none") { ctx.strokeStyle = shade(tone(color), 0.4); ctx.lineWidth = width * S * 0.28; ctx.stroke(); }
    },
  };
  const phase = (name, ...args) => { for (const w of wear) w.item[name]?.(G, Object.assign([...w.colors], { pattern: w.pattern }), ...args); };
  const has = (slot) => wear.find((w) => w.slot === slot);
  const covers = (slots) => wear.find((w) => slots.includes(w.slot));

  ctx.save();
  ctx.translate(x, y);
  if (mirror) ctx.scale(-1, 1);
  // a move's whole-body shift: a step aside, or off the floor in a jump
  ctx.translate((sk.root?.[0] ?? 0) * S, (sk.root?.[1] ?? 0) * S);

  // limb colours: rubber-hose limbs are one bendy tube in the colour that covers them
  const longTop = wear.find((w) => ["top", "outer", "full"].includes(w.slot) && ["shirt", "hoodie", "hoodie_up", "sweater", "blazer"].includes(w.id));
  const legCover = wear.find((w) => ["trousers", "jeans"].includes(w.id));
  const armColor = look.limb === "hose" && longTop ? longTop.colors[0] : card.skin;
  const legColor = look.limb === "hose" && legCover ? legCover.colors[0] : card.skin;

  const limb = (pts, color, w, role) => {
    const p = G.U(pts);
    if (look.limb === "line") { pen.poly(p, false); ctx.strokeStyle = ink; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = w * S; ctx.stroke(); return; }
    if (look.limb === "hose") {
      // one smooth tube THROUGH the elbow or knee (Ak, 28 Oct 2026: the
      // straight bow ignored the joint, so arms and legs never bent); with
      // the joint nearly straight it still bows a little, the rubber-hose way
      const a = p[0], e = p[1], b = p[2], dx = b[0] - a[0], dy = b[1] - a[1];
      const sgn = -(Math.sign(pts[0][0] - sk.neck[0]) || 1);
      const len = Math.hypot(dx, dy) || 1;
      const straight = Math.abs(((e[0] - a[0]) * dy - (e[1] - a[1]) * dx) / len) < len * 0.06;
      const k = straight ? (role === "leg" ? 0.08 : 0.16) : 0;
      pen.curve([a, [e[0] - dy * k * sgn, e[1] + dx * k * sgn], b]);
    } else pen.poly(p, false);
    G.line(color, w, { role: role === "leg" || role === "arm" ? (color === card.skin ? "skin" : "cloth") : "cloth" });
  };
  const relaxedHand = (arm) => {
    const [hx, hy] = [arm.ha[0] * S, arm.ha[1] * S];
    if (look.gloves) { pen.circle(hx, hy, 0.028 * S); G.fill("#ffffff", { role: "eye", noShade: true }); return; }
    if (look.limb === "line") { pen.circle(hx, hy, 0.012 * S); G.fill(card.skin, { role: "skin", noShade: true }); return; }
    pen.circle(hx, hy, sk.limbW * 0.62 * S); G.fill(card.skin, { role: "skin", noShade: true });
  };
  // hand shapes and props come from a move (moves.mjs); without one: the round hand
  const which = (arm) => (arm.front ? "F" : "B");
  const drawArm = (arm) => {
    G.limbPass = true;
    limb([arm.sh, arm.el, arm.ha], look.limb === "line" ? ink : armColor, sk.limbW, "arm");
    // marks on bare skin only, before the sleeve (a long sleeve covers a forearm tattoo)
    const armMarks = card.marks?.length && look.limb !== "line" && armColor === card.skin;
    if (armMarks) drawArmMarks(G, arm, card.marks, "forearm", { ink: look.tone === "mono" ? ink : null });
    if (look.limb !== "hose") phase("arm", arm);
    const held = (state.props ?? []).filter((p) => PROPS[p.id] && PROPS[p.id].hold !== "seat" && p.hand === which(arm));
    const palm = palmPx(G);
    // an open hand under what rests on it; a fist in front of the handle it holds
    const under = held.filter((p) => PROPS[p.id].hold === "under"), fist = held.filter((p) => PROPS[p.id].hold !== "under");
    if (under.length && !fist.length) drawHand(G, arm, "open", { relaxed: relaxedHand });
    for (const p of [...under, ...fist]) drawProp(G, arm, p.id, { ...p, palm });
    if (fist.length) drawHand(G, arm, "fist", { relaxed: relaxedHand });
    else if (!held.length) drawHand(G, arm, state.hands?.[which(arm)], { relaxed: relaxedHand });
    if (card.marks?.length && !look.gloves && look.limb !== "line") drawArmMarks(G, arm, card.marks, "hand", { ink: look.tone === "mono" ? ink : null });
    G.limbPass = false;
  };

  // Which arms go behind the body (Ak, 27 Oct 2026). Facing the camera, both
  // arms hang BEHIND the body, so the shoulders are clean and the two sides
  // match; an arm comes in front only while its hand is across the body (a cup
  // at the mouth, a thumbs up, arms folded). Turned or side-on, the near arm
  // is in front and the far one behind, as a body really overlaps.
  const facingFront = sk.side < 0.5 && sk.turn < 0.5;
  const crossing = (arm) => {
    const half = Math.abs(arm.sh[0] - sk.neck[0]);
    const reach = (arm.ha[0] - sk.neck[0]) * Math.sign(arm.sh[0] - sk.neck[0]); // < half: towards the middle
    // in front as soon as the hand reaches the body's edge, before any of it would be hidden
    // (later, the hand first slid behind the body and then jumped in front)
    // (counting the hand's own size), and only while the forearm folds inward,
    // so arms hanging at rest stay behind
    const side = Math.sign(arm.sh[0] - sk.neck[0]);
    const inward = (arm.el[0] - arm.ha[0]) * side > 0;
    // a hand above the chin (a wave) stays behind: it flipped over the hair (Ak, 5 Nov 2026)
    return inward && reach < half * 1.02 + sk.limbW * 1.3 && arm.ha[1] > sk.head[1] + sk.R * 0.25 && arm.ha[1] < sk.hy + 0.22;
  };
  // two people touching (2D lab): a hug draws the body without the arm that
  // goes round the partner (armsSkip), the partner, then that arm alone (armsOnly)
  const skip = state.armsSkip ?? [], keep = (a) => !skip.includes(which(a));
  // turned towards +x the near arm is the −x one (arms[0]): it comes towards the camera and is
  // drawn over the chest; the far arm goes behind it (Ak, 5 Nov 2026: the near shoulder hid)
  // A far arm whose hand crosses the chest (a cup at the mouth, a facepalm) also comes in front,
  // drawn under the near arm (code review, 5 Nov 2026: in two-person scenes these hid behind the body)
  const inFront = (facingFront ? sk.arms.filter(crossing) : [...sk.arms.slice(1).filter(crossing), sk.arms[0]]).filter(keep);
  // armsFront: a far arm reaching across the chest in a three-quarter view is in front of it (a handshake)
  for (const a of sk.arms) if ((state.armsFront ?? []).includes(which(a)) && keep(a) && !inFront.includes(a)) inFront.unshift(a);
  const behind = sk.arms.filter((a) => !inFront.includes(a)).filter(keep);
  if (state.armsOnly) {
    for (const arm of sk.arms) if (state.armsOnly.includes(which(arm))) drawArm(arm);
    ctx.restore();
    return { sk, ink, hands: [], eyes: [], mouth: { x: 0, y: 0, w: 0, h: 0 }, head: { x, y, r: 0 } };
  }

  // ---- behind everything: a seat a move brought along, then the back of the clothes
  for (const p of state.props ?? []) if (PROPS[p.id]?.hold === "seat") drawSeat(G, sk, p.id, p);
  phase("back");
  for (const arm of behind) drawArm(arm);

  // ---- legs and feet
  // turned, the near leg (the −x one, legs[0]) goes over the far one, like the near arm
  const legOrder = facingFront ? sk.legs : [sk.legs[1], sk.legs[0]];
  G.limbPass = true;
  for (const leg of legOrder) {
    limb([leg.hip, leg.knee, ankle(leg.foot, sk.legW / 2)], look.limb === "line" ? ink : legColor, sk.legW, "leg");
  }
  if (look.limb !== "hose") phase("legs");
  for (const leg of legOrder) {
    if (has("feet")) phase("feet", leg.foot, leg.front ? 1 : -1);
    else barefoot(G, leg.foot, leg.front ? 1 : -1);
  }  G.limbPass = false;


  // ---- torso: bare skin first, then clothes in layers
  pen.rpoly(G.U(sk.torso), 0.025 * S);
  G.fill(covers(["top", "full"]) ? null : card.skin, { role: "skin" });
  // hems swing: nothing at the waist, most at the floor
  // a physics hem (2D lab) bends the clothes below the waist itself
  if (follow?.hemField) pen.warp = (p) => follow.hemField(p, sk, S, fsx);
  else if (follow?.hem) pen.warp = ([px, py]) => {
    const w = clamp((py / S - sk.waistY) / -sk.waistY) ** 1.5;
    // the same modesty cap as the physics hem, per point (code review, 5 Nov 2026)
    const [dx, dy] = capHem(follow.hem[0] * fsx * w, follow.hem[1] * w);
    return [px + dx * S, py + dy * S];
  };
  phase("torso");
  if (look.formDetail && covers(["top"]) && !covers(["full"])) torsoCreases(G, sk);
  phase("outer");
  pen.warp = null;
  if (!look.noNeck) {
    const l = sk.neck[0], nw = sk.R * 0.16;
    pen.poly(G.U([[l - nw, sk.sy - 0.03], [l + nw, sk.sy - 0.03], [l + nw, sk.sy + 0.004], [l - nw, sk.sy + 0.004]]));
    // fake 3D: the neck sits in the head's shadow
    G.fill(look.form ? shade(card.skin, -0.14) : card.skin, { role: "skin", noShade: true, outline: look.fill === "glass" ? look.outline : 0 });
    if (card.marks?.length) drawNeckMarks(G, sk, card.marks, { ink: look.tone === "mono" ? ink : null });
  }
  phase("neck");

  // ---- head group (rotates as one). headless: the body only, for a
  // picture puppet's own head on top (experiment #49c)
  let face = { mouth: { x: 0, y: 0, w: 0, h: 0 }, eyes: [] };
  if (!headless) {
    // headView (2D lab, 4 Nov 2026): the head may turn less than the body, the
    // cartoon way: body in profile, face cheated towards the camera (the engine's
    // three-quarter and profile faces read badly: Ak, 4 Nov). Only the head's turn
    // changes; where the head sits and how it tilts stay the body's.
    let hs = sk;
    if (state.headView != null && Math.abs(state.headView - sk.v) > 0.01) {
      const h = solveRig(card, look, { ...state, joints: state.joints ? { ...state.joints, view: [state.headView] } : null, view: state.headView });
      hs = { ...sk, v: h.v, turn: h.turn, side: h.side, rx: h.rx, face: h.face };
    }
    G.sk = hs; G.A = anchors(hs);
    // a raised hood hides the hair (only a fringe would show; the hood draws its own edge)
    const hooded = wear.some((w) => w.id === "hoodie_up");
    const hair = hooded ? {} : HAIR[card.hair] ?? HAIR.short;
    const hairColor = card.hairColor ?? "#262a33";
    ctx.save();
    ctx.translate(sk.head[0] * S, sk.head[1] * S);
    ctx.rotate(sk.rot);
    // HAIR AND HATS TURN WITH THE HEAD (Ak, 28 Oct 2026). They are drawn for a
    // face looking at the camera; as the head turns, every point slides round
    // the head like a point on a ball: the front hairline goes towards the
    // forehead, the back of the hair comes into view behind.
    const yaw = (Math.min(hs.v, 2) / 2) * Math.PI * 0.42;
    const rxS = hs.rx * S;
    const capWrap = (x) => {
      const u = x / rxS;
      if (u <= -1 || u >= 1) return x;
      const th = Math.asin(u), w = (th + Math.PI / 2) / Math.PI; // 0 at the back edge, 1 at the front
      return rxS * Math.sin(Math.min(Math.PI / 2, th + yaw * w * (1 - w) * 2.2));
    };
    // HAIR BESIDE THE HEAD TURNS WITH IT (5 Nov 2026: "the long hair is not following the head
    // turning"). The cap hugs the skull (capWrap above keeps its outline). Hair hanging beside the
    // head sits on a ring round it: on the near side (−x) it swings in towards the face as the
    // head turns (behind the ear for the back curtains, at the cheek for the front locks); on the
    // far side it tucks in behind the far edge, leaving a thin sliver.
    let hairLayer = "front";
    const wrapRound = ([x, y]) => {
      if (yaw <= 0) return [x, y];
      const u = x / rxS, base = capWrap(x);
      if (u < 0) {
        const a = hairLayer === "back" ? Math.PI / 2 + 0.25 : Math.PI / 2;
        const rot = (x * Math.sin(a - yaw)) / Math.sin(a), m = clamp((-u - 0.75) / 0.25);
        return [lerp(base, rot, m), y];
      }
      if (u < 1) return [base, y];
      return [rxS + (x - rxS) * (1 - 0.75 * clamp(yaw / 0.66)), y];
    };
    // follow-through: the further down the hair, the more it trails the head
    // and hangs towards the floor when the head tilts (the scalp stays put)
    // physics hair (2D lab): chains with gravity and wind bend the hair, in head space
    const hairWarp = follow?.hairField ? (p) => follow.hairField(wrapRound(p), hs, S, fsx) : follow?.hair ? (p) => {
      const [x, y] = wrapRound(p), ryS = hs.ry * S, pivot = -ryS * 0.35;
      const d = y - pivot, w = clamp(d / (ryS * 2.2)) ** 1.3;
      const s = follow.hair[0] * fsx - sk.rot * (follow.tilt?.hair ?? 0.5);
      return [x + s * d * w, y - Math.abs(s) * d * w * 0.15 + follow.hair[1] * w * S];
    } : wrapRound;
    pen.warp = hairWarp;
    hairLayer = "back";
    phase("hairBack");
    hair.back?.(G, hs, S, hairColor, t);
    hairLayer = "front";
    pen.warp = null;
    const ears = hs.face.ears.filter((e) => e.visible && card.ears !== "none" && !hair.hidesEars);
    const earR = { small: 0.14, round: 0.18, big: 0.24 }[card.ears] ?? 0.14;
    const drawEar = (e) => { pen.ellipse(e.x * S, e.y * S, hs.R * earR * 0.8 * S, hs.R * earR * 1.15 * S); G.fill(card.skin, { role: "skin", noShade: true }); };
    ears.filter((e) => Math.abs(e.x) > hs.rx * 0.8).forEach(drawEar);
    // the head
    const headPts = () => {
      if (card.headShape === "square") return pen.rpoly([[-hs.rx * S, -hs.ry * S], [hs.rx * S, -hs.ry * S], [hs.rx * S, hs.ry * S], [-hs.rx * S, hs.ry * S]], hs.R * 0.45 * S);
      if (card.headShape === "egg") return pen.blob([[0, -hs.ry * S], [hs.rx * 0.9 * S, -hs.ry * 0.45 * S], [hs.rx * S, hs.ry * 0.35 * S], [0, hs.ry * S], [-hs.rx * S, hs.ry * 0.35 * S], [-hs.rx * 0.9 * S, -hs.ry * 0.45 * S]]);
      return pen.ellipse(0, 0, hs.rx * S, hs.ry * S);
    };
    headPts();
    G.fill(card.skin, { role: "skin" });
    // SHORT HAIR COVERS THE BACK OF THE HEAD (5 Nov 2026, the slow-turn check: turned, Lucas
    // looked bald behind his hairline). Cap styles are drawn for the front; as the head turns the
    // back of the skull comes into view, so it gets hair down to behind the ear.
    if (CAP_STYLES.has(card.hair) && !hooded && hs.v > 0.15) {
      const k = clamp((hs.v - 0.15) / 0.85), ear = hs.face.ears[0], R = hs.R;
      const xb = lerp(-hs.rx * 1.05, ear.x + R * 0.14, k);
      ctx.save(); headPts(); ctx.clip();
      pen.poly(G.U([[-hs.rx * 1.4, -hs.ry * 1.4], [xb + R * 0.4 * k, -hs.ry * 1.4], [xb + R * 0.18 * k, -hs.ry * 0.25], [xb, ear.y + R * 0.18], [xb - R * 0.25 * k, hs.ry * (LONG_BACK.has(card.hair) ? 1.1 : 0.62)], [-hs.rx * 1.4, hs.ry * (LONG_BACK.has(card.hair) ? 1.1 : 0.62)]]));
      G.fill(hairColor, { role: "hair", noShade: true });
      ctx.restore();
      // the ear sits on top of the short hair, not under it
      ears.filter((e) => Math.abs(e.x) > hs.rx * 0.8).forEach(drawEar);
    }
    ears.filter((e) => Math.abs(e.x) <= hs.rx * 0.8).forEach(drawEar);
    face = drawFace(G, state);
    // clay: the fringe shades the forehead under it
    if (look.formDetail && hair.front) hairContactShadow(G, headPts, () => { pen.warp = hairWarp; hair.front(G, hs, S, hairColor, t); pen.warp = null; });
    pen.warp = hairWarp;
    hair.front?.(G, hs, S, hairColor, t);
    if (card.highlight) highlight(G, hs, S, card.highlight);
    // hats, hoods and helmets only slide round the skull (the cap wrap): the ring swing, the
    // tuck and the follow-through are for hair (code review, 5 Nov 2026: a cap's brim shrank)
    pen.warp = yaw > 0 ? ([px, py]) => [capWrap(px), py] : null;
    phase("head");
    pen.warp = null;
    phase("face");
    ctx.restore();
    G.sk = sk; G.A = A;
  }

  // ---- arms in front last
  for (const arm of inFront) drawArm(arm);
  // turning out of the front view, the near arm comes round in front over a short stretch
  // instead of jumping there in one frame (5 Nov 2026, the slow-turn check)
  const nearK = facingFront && sk.side < 0.5 ? clamp((sk.turn - 0.3) / 0.2) : 0;
  if (nearK > 0 && !inFront.includes(sk.arms[0]) && keep(sk.arms[0])) {
    ctx.save(); ctx.globalAlpha *= nearK; drawArm(sk.arms[0]); ctx.restore();
  }
  if (look.rivets) {
    for (const q of [sk.arms[1].sh, sk.arms[1].el, sk.arms[0].el, sk.legs[0].hip, sk.legs[1].hip, sk.legs[0].knee, sk.legs[1].knee]) {
      pen.circle(q[0] * S, q[1] * S, S * 0.006); ctx.fillStyle = look.rivets; ctx.fill();
      pen.circle(q[0] * S - S * 0.0015, q[1] * S - S * 0.0015, S * 0.002); ctx.fillStyle = "rgba(255,230,180,0.6)"; ctx.fill();
    }
  }
  ctx.restore();

  // measurements in canvas px (head rotation ignored: it is a few degrees)
  const flip = mirror ? -1 : 1;
  const hx = x + flip * (sk.head[0] + (sk.root?.[0] ?? 0)) * S, hy = y + (sk.head[1] + (sk.root?.[1] ?? 0)) * S;
  return {
    head: { x: hx, y: hy, r: sk.R * S },
    mouth: { x: hx + flip * face.mouth.x * S, y: hy + face.mouth.y * S, w: face.mouth.w * S, h: face.mouth.h * S },
    eyes: face.eyes.map((e) => ({ x: hx + flip * e.x * S, y: hy + e.y * S, r: e.r * S, visible: e.visible })),
    hands: sk.arms.map((a) => ({ x: x + flip * (a.ha[0] + (sk.root?.[0] ?? 0)) * S, y: y + (a.ha[1] + (sk.root?.[1] ?? 0)) * S })),
    ink, sk,
  };
}

/** Stripes, checks, dots or corduroy ribs over the current path. */
function overlayPattern(G, color, kind) {
  // FABRIC, NOT WALLPAPER (Ak, 5 Nov 2026: "the dots seem part of the background"). The grid is
  // pinned to the body (the neck), not to the shape's box, and every dot and stripe goes through
  // the same bend as the cloth (pen.warp: the physics hem), so the print swings with the skirt.
  const { ctx, pen, S, sk } = G;
  const b = pen.bounds();
  if (!b) return;
  const W = pen.warp ?? ((p) => p);
  const c = shade(G.tone(color), -0.28);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = c; ctx.fillStyle = c;
  const step = S * (kind === "corduroy" ? 0.008 : 0.022);
  ctx.lineWidth = kind === "corduroy" ? Math.max(1, S * 0.0025) : S * 0.007;
  // the grid's origin on the body, and enough grid to cover the bent shape
  const ox = sk.neck[0] * S, oy = sk.sy * S, pad = S * 0.12;
  const from = (v, o) => o + Math.floor((v - pad - o) / step) * step;
  const x0 = from(b.x0, ox), y0 = from(b.y0, oy), x1 = b.x1 + pad, y1 = b.y1 + pad;
  const line = (pts) => { const q = pts.map(W); ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]); };
  const seg = (a, z) => { const n = 8, pts = []; for (let i = 0; i <= n; i++) pts.push([a[0] + (z[0] - a[0]) * i / n, a[1] + (z[1] - a[1]) * i / n]); return pts; };
  if (kind === "stripes" || kind === "corduroy" || kind === "checks") {
    ctx.beginPath();
    for (let xx = x0; xx <= x1; xx += step) line(seg([xx, y0], [xx, y1]));
    if (kind === "checks") for (let yy = y0; yy <= y1; yy += step) line(seg([x0, yy], [x1, yy]));
    ctx.globalAlpha = kind === "checks" ? 0.45 : 0.6;
    ctx.stroke();
  } else if (kind === "dots") {
    ctx.beginPath();
    for (let yy = y0; yy <= y1; yy += step) {
      const row = Math.round((yy - oy) / step);
      for (let xx = x0 + ((((row % 2) + 2) % 2) * step) / 2; xx <= x1; xx += step) {
        const [px, py] = W([xx, yy]);
        ctx.moveTo(px + step * 0.18, py); ctx.arc(px, py, step * 0.18, 0, TAU);
      }
    }
    ctx.fill();
  }
  ctx.restore();
}

function highlight(G, sk, S, color) {
  const { ctx, pen } = G;
  for (let i = 0; i < 3; i++) {
    pen.curve([[(-sk.rx * 0.5 + i * sk.rx * 0.25) * S, -sk.ry * 0.95 * S], [(-sk.rx * 0.25 + i * sk.rx * 0.28) * S, -sk.ry * 0.75 * S], [(-sk.rx * 0.05 + i * sk.rx * 0.3) * S, -sk.ry * 0.62 * S]]);
    ctx.strokeStyle = G.tone(color, "hair"); ctx.lineWidth = Math.max(1, sk.R * 0.05 * S); ctx.lineCap = "round"; ctx.stroke();
  }
}

// ---- the face ------------------------------------------------------------------------------

// how far the upper lid rests over each eye style (0 = fully round, 1 = shut)
const LID_REST = { oval: 0.22, lash: 0.22, googly: 0.2, pie: 0.12, sleepy: 0.45 };

function drawFace(G, state) {
  const { ctx, pen, look, S, sk, card, ink } = G;
  const R = sk.R, F = sk.face;
  const eyesStyle = look.eyes ?? card.eyes ?? "dot";
  const lid0 = state.lid ? lidAmount(state.lid.from, state.lid.to, state.lid.mix) : 0;
  const lidAll = eyesStyle === "sleepy" ? Math.max(lid0, 0.45) : lid0;
  const gaze = (state.gaze ?? 0.4) * R * 0.04;
  const mono = look.tone === "mono";
  const featureInk = ink;
  const eyesOut = [];

  // dark circles and bruises go on the skin BEFORE the eyes, so the eyeball stays white on top
  // (a black eye was painted over the eyeball, Ak 2 Nov 2026); makeup uses eyeAt too, after
  const eyeAt = (e) => {
    const ry0 = eyesStyle === "googly" ? 0.22 : eyesStyle === "pie" ? 0.32 : eyesStyle === "dot" || eyesStyle === "small" ? 0.1 : 0.21;
    const cy = eyesStyle === "googly" ? e.y - R * 0.12 : eyesStyle === "pie" ? e.y - R * 0.08 : e.y;
    return { x: e.x, cy, ry: R * ry0, rx: R * (eyesStyle === "googly" ? 0.22 : 0.15) * e.scaleX };
  };
  if (card.darkCircles && eyesStyle !== "none") for (const e of F.eyes) if (e.visible) {
    const a = eyeAt(e), y = a.cy + a.ry + R * 0.015;
    ctx.beginPath(); ctx.ellipse(a.x * S, (y - R * 0.04) * S, a.rx * 1.15 * S, R * 0.1 * S, 0, Math.PI * 0.12, Math.PI * 0.88);
    ctx.ellipse(a.x * S, (y - R * 0.09) * S, a.rx * 0.95 * S, R * 0.04 * S, 0, Math.PI * 0.85, Math.PI * 0.15, true); ctx.closePath();
    ctx.fillStyle = mono ? featureInk : shade(toneColor(look, card.skin, "skin"), -0.45); ctx.globalAlpha = mono ? 0.4 : 0.85; ctx.fill(); ctx.globalAlpha = 1;
  }
  // a bruise on one side: purple middle fading to a yellow-green edge, soft so it reads as skin, not paint
  if (card.bruise && card.bruise !== "none") {
    // always the near eye (never hidden), so the bruise stays on one side through a head turn
    const e = F.eyes.find((x) => !x.far) ?? F.eyes[0];
    if (e?.visible) {
      const a = eyeAt(e), eye = card.bruise === "eye";
      const cx = (a.x + (eye ? 0 : R * 0.05 * Math.sign(e.x || 1))) * S, cy = (eye ? a.cy + R * 0.02 : e.y + R * 0.32) * S;
      const rx = (eye ? a.rx + R * 0.15 : R * 0.17 * e.scaleX) * S, ry = (eye ? a.ry + R * 0.13 : R * 0.12) * S;
      const mid = mono ? featureInk : toneColor(look, "#6a4a86", "lip"), edge = mono ? featureInk : toneColor(look, "#a7a35a", "lip");
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx);
      g.addColorStop(0, mid); g.addColorStop(eye ? 0.78 : 0.6, mid); g.addColorStop(eye ? 0.92 : 0.85, edge); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fillStyle = g; ctx.globalAlpha = mono ? 0.35 : 0.62; ctx.fill(); ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  // eyes (with the quirks: a lazy eye, a hazy eye, a cap on how far they open, an iris colour)
  const capLid = 1 - (card.maxOpen ?? 1);
  for (const e of F.eyes) {
    const which = F.eyes.indexOf(e) === 0 ? "left" : "right"; // as you look at them
    const lazy = card.lazyEye === which ? (card.lazyAmount ?? 0.5) : 0;
    const drift = Math.sign(e.x - F.faceDX || (which === "left" ? -1 : 1)) * lazy * R * 0.075;
    let lid = lidAll;
    if (capLid > 0.001) lid = Math.max(lid, capLid);
    const iris = which === "left" ? card.irisLeft : card.irisRight;
    const hazy = card.hazyEye === which || card.hazyEye === "both";
    const ex = e.x * S, ey = e.y * S, sx = e.scaleX;
    const r0 = { dot: 0.085, small: 0.07, oval: 0.15, lash: 0.15, googly: 0.22, pie: 0.16, sleepy: 0.15 }[eyesStyle] ?? 0.085;
    eyesOut.push({ x: e.x, y: e.y, r: R * r0, visible: e.visible });
    if (!e.visible || eyesStyle === "none") continue;
    if (lid > 0.85) { // shut: a line
      pen.poly([[ex - R * 0.12 * sx * S, ey], [ex + R * 0.12 * sx * S, ey]], false);
      ctx.strokeStyle = featureInk; ctx.lineWidth = Math.max(1.5, R * 0.06 * S); ctx.lineCap = "round"; ctx.stroke();
      continue;
    }
    const open = Math.max(0.1, 1 - Math.max(0, lid) - lazy * 0.15);
    const wide = lid < 0 ? 1 - lid * 0.5 : 1;
    if (eyesStyle === "dot" || eyesStyle === "small") {
      pen.ellipse(ex + (gaze + drift * 0.6) * S, ey, R * r0 * sx * S * wide, R * r0 * S * Math.max(0.25, open) * wide);
      G.fill(featureInk, { feature: true, outline: 0 });
      continue;
    }
    // eyes with whites: white, pupil, then a skin-coloured lid closing from the top
    const ry = (eyesStyle === "googly" ? R * 0.22 : eyesStyle === "pie" ? R * 0.32 : R * 0.21) * wide;
    const rx = (eyesStyle === "googly" ? R * 0.22 : eyesStyle === "pie" ? R * 0.16 : R * 0.15) * sx * wide;
    const ecy = eyesStyle === "googly" ? ey - R * 0.12 * S : eyesStyle === "pie" ? ey - R * 0.08 * S : ey;
    pen.ellipse(ex, ecy, rx * S, ry * S);
    G.fill("#ffffff", { role: "eye", noShade: true, outline: (look.outline ?? 0) * 0.6 });
    ctx.save(); ctx.clip();
    if (eyesStyle === "pie") {
      pen.ellipse(ex + R * 0.03 * S, ecy + R * 0.06 * S, R * 0.1 * sx * S, R * 0.2 * S); G.fill(mono ? featureInk : "#111111", { feature: true, outline: 0 });
      ctx.fillStyle = toneColor(look, "#ffffff", "eye"); ctx.beginPath(); ctx.moveTo(ex + R * 0.03 * S, ecy + R * 0.06 * S); ctx.lineTo(ex + R * 0.16 * S, ecy - R * 0.12 * S); ctx.lineTo(ex + R * 0.16 * S, ecy + R * 0.02 * S); ctx.closePath(); ctx.fill();
    } else {
      const pr = eyesStyle === "googly" ? R * 0.06 : R * 0.09;
      const px = ex + gaze * S * 2 + drift * S, py = ecy + R * 0.02 * S + Math.abs(drift) * 0.25 * S;
      if (iris && !mono) { pen.circle(px, py, pr * 1.55 * S); G.fill(toneColor(look, iris, "eye"), { feature: true, outline: 0 }); }
      pen.circle(px, py, pr * (iris && !mono ? 0.78 : 1) * S); G.fill(mono ? featureInk : "#1b1b2a", { feature: true, outline: 0 });
      if (hazy && !mono) { pen.circle(px, py, pr * 1.75 * S); ctx.fillStyle = "rgba(226,234,242,0.62)"; ctx.fill(); }
      pen.circle(px + pr * 0.35 * S, py - pr * 0.32 * S, pr * 0.33 * S); G.fill("#ffffff", { feature: true, outline: 0 });
    }
    // the lid: always a little over the eye at rest (fully round eyes read as shock,
    // Ak 2 Nov 2026); only a wide look ("surprised") opens it all the way
    const lidE = Math.min(0.8, (lid < 0 ? 0 : Math.max(lid, LID_REST[eyesStyle] ?? 0.2)) + lazy * 0.16);
    if (lidE > 0.02) {
      const edge = ecy - ry * S + ry * S * 2 * lidE, sag = ry * S * 0.18 * (1 - lidE);
      ctx.beginPath(); ctx.moveTo(ex - rx * S * 1.2, ecy - ry * S * 1.3); ctx.lineTo(ex + rx * S * 1.2, ecy - ry * S * 1.3);
      ctx.lineTo(ex + rx * S * 1.2, edge - sag); ctx.quadraticCurveTo(ex, edge + sag * 1.6, ex - rx * S * 1.2, edge - sag); ctx.closePath();
      ctx.fillStyle = toneColor(look, card.skin, "skin"); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ex - rx * S * 1.1, edge - sag * 0.9); ctx.quadraticCurveTo(ex, edge + sag * 1.6, ex + rx * S * 1.1, edge - sag * 0.9);
      // looks without outlines (paper cut-out) crease the lid in a darker skin tone; a dark line there reads as eyeliner (Ak, 2 Nov)
      const bare = !(look.outline > 0) && !mono && (card.makeup ?? "none") === "none";
      ctx.strokeStyle = bare ? shade(toneColor(look, card.skin, "skin"), -0.3) : featureInk; ctx.lineWidth = Math.max(1.2, R * 0.04 * S); ctx.stroke();
    }
    ctx.restore();
    if (eyesStyle === "lash") { pen.poly([[ex + rx * 0.9 * S, ecy - ry * 0.8 * S], [ex + rx * 1.5 * S, ecy - ry * 1.25 * S]], false); ctx.strokeStyle = featureInk; ctx.lineWidth = R * 0.05 * S; ctx.stroke(); }
  }

  // brows
  const browStyle = card.brows ?? "line";
  if (browStyle !== "none" && eyesStyle !== "none") {
    const names = [state.brows?.left ?? "serious", state.brows?.right ?? state.brows?.left ?? "serious"];
    // "confused" lifts one brow only: the other stays at rest
    // (the far brow rests, so the lifted one is the near one and still shows in profile)
    if (names[0] === "confused" && names[1] === "confused") names[Math.max(0, F.eyes.findIndex((e) => e.far))] = "serious";
    const bc = mono || look.incise || look.fill === "none" ? featureInk : look.id === "hose" || look.id === "hose2" ? featureInk : toneColor(look, shade(card.hairColor ?? "#262a33", -0.2), "hair");
    F.eyes.forEach((e, i) => {
      if (!e.visible) return;
      const b = browShape(names[i]);
      const inward = i === 0 ? 1 : -1; // the inner end is towards the nose
      const ex = e.x * S, by = (e.y - R * 0.32 - b.lift * R) * S, half = R * 0.14 * e.scaleX * S;
      const innerX = ex + inward * half, outerX = ex - inward * half;
      const innerY = by + b.tilt * R * 0.25 * S, outerY = by - b.tilt * R * 0.1 * S;
      const arch = (b.arch + (browStyle === "arched" ? 0.5 : 0)) * R * 0.08 * S;
      pen.curve([[outerX, outerY], [(innerX + outerX) / 2, (innerY + outerY) / 2 - arch], [innerX, innerY]]);
      ctx.strokeStyle = bc; ctx.lineCap = "round";
      ctx.lineWidth = Math.max(1.6, R * (browStyle === "thick" ? 0.11 : 0.065) * S);
      ctx.stroke();
    });
  }

  // nose
  const nose = card.nose ?? "none";
  const nx = F.nose.x * S, ny = F.nose.y * S;
  if (sk.side > 0.55) { // in profile every nose shows, even one that is "none" from the front
    // a small knob below the eye line (Ak, 5 Nov 2026: the side noses were far too big and hid the eye)
    const len = nose === "long" ? 0.13 : nose === "none" ? 0.05 : 0.08;
    pen.blob([[sk.rx * 0.9 * S, R * 0.08 * S], [(sk.rx + R * len) * S, R * 0.2 * S], [sk.rx * 0.93 * S, R * 0.28 * S]]);
    G.fill(card.skin, { role: "skin", noShade: true });
  } else if (nose === "dot") { pen.circle(nx, ny, R * 0.045 * S); G.fill(shade(toneColor(look, card.skin, "skin"), -0.25), { feature: true, outline: 0 }); }
  else if (nose === "line") { pen.poly([[nx, ny - R * 0.12 * S], [nx + R * 0.05 * S, ny + R * 0.04 * S], [nx - R * 0.02 * S, ny + R * 0.05 * S]], false); ctx.strokeStyle = featureInk; ctx.lineWidth = Math.max(1.2, R * 0.035 * S); ctx.stroke(); }
  else if (nose === "button" || nose === "long") { pen.ellipse(nx, ny, R * (nose === "long" ? 0.1 : 0.09) * S, R * (nose === "long" ? 0.18 : 0.07) * S); G.fill(card.skin, { role: "skin", noShade: true }); }

  // cheeks, freckles
  if (card.cheeks && !mono && look.fill !== "none") for (const e of F.eyes) if (e.visible) { pen.ellipse((e.x + R * 0.02) * S, (e.y + R * 0.28) * S, R * 0.1 * e.scaleX * S, R * 0.06 * S); ctx.fillStyle = "rgba(230,90,90,0.28)"; ctx.fill(); }
  if (card.makeup && card.makeup !== "none" && eyesStyle !== "none") for (const e of F.eyes) if (e.visible) {
    const a = eyeAt(e), lift = card.makeup === "bold" ? 0.11 : 0.075;
    ctx.beginPath(); ctx.ellipse(a.x * S, a.cy * S, (a.rx + R * 0.035) * S, (a.ry + R * lift) * S, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.ellipse(a.x * S, a.cy * S, a.rx * S, a.ry * S, 0, Math.PI * 1.95, Math.PI * 1.05, true); ctx.closePath();
    ctx.fillStyle = mono ? featureInk : toneColor(look, card.makeupColor ?? "#9a7aa8", "lip"); ctx.globalAlpha = mono ? 0.35 : card.makeup === "bold" ? 0.85 : 0.6; ctx.fill(); ctx.globalAlpha = 1;
    if (card.makeup === "bold") { ctx.beginPath(); ctx.ellipse(a.x * S, a.cy * S, a.rx * 1.02 * S, a.ry * 1.02 * S, 0, Math.PI * 1.08, Math.PI * 1.98); ctx.strokeStyle = featureInk; ctx.lineWidth = Math.max(1.4, R * 0.04 * S); ctx.stroke(); }
  }
  if (card.freckles && !mono) for (let i = 0; i < 10; i++) { const e = F.eyes[i % 2]; if (!e.visible) continue; pen.circle((e.x + (i % 5 - 2) * R * 0.05) * S, (e.y + R * (0.18 + (i % 3) * 0.04)) * S, R * 0.012 * S); ctx.fillStyle = featureInk; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1; }
  if (card.marks?.length) drawFaceMarks(G, F, R, card.marks, { ink: mono ? featureInk : null });

  // beard and moustache (before the mouth, so the mouth opens through them)
  const hairC = card.hairColor ?? "#262a33";
  const mx = F.mouth.x * S, my = F.mouth.y * S;
  if (card.beard && card.beard !== "none") {
    if (card.beard === "goatee") {
      pen.blob([[mx - R * 0.17 * S, my + R * 0.12 * S], [mx + R * 0.17 * S, my + R * 0.12 * S], [mx + R * 0.13 * S, my + R * 0.42 * S], [mx, my + R * 0.6 * S], [mx - R * 0.13 * S, my + R * 0.42 * S]]);
      G.fill(hairC, { role: "hair", noShade: true });
    } else {
      jawBeard(G, card.beard, hairC, mx, my);
    }
  }

  // the mouth
  // a move may take away the card's resting smile (fainted, worried, hurt: Ak, 5 Nov 2026)
  const rest = state.mouthRest ?? EXPRESSION_REST[card.expression] ?? 0;
  const mfrom = state.mouth?.from ?? rest, mto = state.mouth?.to ?? rest;
  const m = mouthShape(mfrom === 0 ? rest : mfrom, mto === 0 ? rest : mto, state.mouth?.mix ?? 1);
  const smile = m.smile + (EXPRESSION_SMILE[card.expression] ?? 0) + (state.smile ?? 0);
  const ms = look.mouthScale ?? 1;
  const w = m.w * R * F.mouth.w * S * ms, h = m.h * R * S * ms;
  const mouthStyle = look.mouth ?? card.mouth ?? "plain";
  const lipC = card.lips ? toneColor(look, card.lipColor ?? "#c2575c", "lip") : null;
  // with lipstick the ink line is thinner: the colour carries the lips (Ak, 5 Nov 2026)
  const lineW = Math.max(1.6, R * 0.055 * S) * (card.lips ? 0.72 : 1);
  if (h < R * 0.03 * S) {
    const press = m.press;
    // a smooth shallow arc, never a V (Ak, 27 Oct 2026): a circle through the
    // two corners whose dip is at most a third of the width; the mouth widens
    // a little as the smile grows, the way a real one does
    const arc = [];
    const half = (w / 2) * (1 + Math.min(0.35, Math.abs(smile) * 0.3));
    const sag = Math.sign(smile) * Math.min(Math.abs(smile) * R * 0.16 * S, half * 0.55);
    const cy = my - sag * 0.45; // the corners rise as the middle drops
    for (let i = 0; i <= 16; i++) {
      const u = i / 16 * 2 - 1;
      arc.push([mx + u * half, cy + sag * Math.sqrt(Math.max(0, 1 - u * u * 0.92)) - sag * Math.sqrt(0.08)]);
    }
    pen.poly(arc, false);
    if (lipC) { ctx.strokeStyle = lipC; ctx.lineWidth = lineW * (2.9 + press); ctx.lineCap = "round"; ctx.stroke(); }
    ctx.strokeStyle = featureInk; ctx.lineWidth = lineW * (1 + press * 0.5); ctx.lineCap = "round"; ctx.stroke();
  } else if (sk.side > 0.55) {
    // open, side on: a wedge cut in from the front edge of the face, not a
    // front-view oval stuck on the cheek (Ak, 3 Nov 2026: "the mouth when she
    // is looking to the side is all wrong")
    const rxS = sk.rx * S * (card.headShape === "square" ? 1.04 : 1), ryS = sk.ry * S;
    const edge = rxS * Math.sqrt(Math.max(0.05, 1 - (my / ryS) ** 2));
    const depth = Math.max(w * 0.6, R * 0.16 * S), open = h * (0.85 + m.round * 0.25);
    const back = [edge - depth, my - smile * R * 0.03 * S];
    const top = [edge + R * 0.1 * S, my - open * 0.4], bot = [edge + R * 0.1 * S, my + open * 0.6];
    const pts = spline([top, [lerp(back[0], top[0], 0.45), lerp(back[1], top[1], 0.75)], back, [lerp(back[0], bot[0], 0.45), lerp(back[1], bot[1], 0.8)], bot], 6);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 0, rxS, ryS, 0, 0, TAU); ctx.clip();
    pen.poly(pts);
    const inside = look.fill === "none" ? null : mono ? featureInk : "#5b1f2a";
    if (inside) { ctx.fillStyle = inside; ctx.fill(); }
    ctx.save(); ctx.clip();
    if (!mono && look.fill !== "none") {
      if (m.teeth > 0.05) { ctx.fillStyle = "#ffffff"; ctx.fillRect(back[0], top[1], depth * 2, open * 0.22 * m.teeth + R * 0.02 * S); }
      if (m.tongue > 0.05) { ctx.fillStyle = "#e0707a"; pen.ellipse(back[0] + depth * 0.55, bot[1] - open * 0.12, depth * 0.45, open * 0.22 * m.tongue); ctx.fill(); }
    }
    ctx.restore();
    // the lips' inner edges only: the front is open to the air
    pen.poly(pts, false);
    if (lipC) { ctx.strokeStyle = lipC; ctx.lineWidth = lineW * 2.4; ctx.stroke(); }
    ctx.strokeStyle = featureInk; ctx.lineWidth = Math.max(1.2, lineW * 0.75); ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
    ctx.restore();
  } else {
    // open: a superellipse between a flat oval (round 0) and a circle (round 1),
    // flatter on top like an upper lip
    const ex = lerp(3.2, 2, m.round), pts = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU, c = Math.cos(a), s = Math.sin(a);
      const px = Math.sign(c) * Math.abs(c) ** (2 / ex) * (w / 2);
      const py = Math.sign(s) * Math.abs(s) ** (2 / ex) * (h / 2) * (s < 0 ? 0.7 : 1);
      pts.push([mx + px, my + py - smile * R * 0.05 * S * c * c]); // corners lift smoothly
    }
    pen.poly(pts);
    const inside = look.fill === "none" ? null : mono ? featureInk : "#5b1f2a";
    if (inside) { ctx.fillStyle = inside; ctx.fill(); }
    ctx.save(); ctx.clip();
    if (!mono && look.fill !== "none") {
      if (m.teeth > 0.05) { ctx.fillStyle = "#ffffff"; ctx.fillRect(mx - w, my - h * 0.36, w * 2, h * 0.34 * m.teeth + R * 0.02 * S); }
      if (m.tongue > 0.05) { ctx.fillStyle = "#e0707a"; pen.ellipse(mx, m.teeth > 0.5 && m.tongue > 0.5 ? my - h * 0.05 : my + h * 0.38, w * 0.32, h * 0.32 * m.tongue); ctx.fill(); }
    }
    ctx.restore();
    pen.trace(pts, true);
    if (lipC) { ctx.strokeStyle = lipC; ctx.lineWidth = lineW * 2.4; ctx.stroke(); }
    ctx.strokeStyle = featureInk; ctx.lineWidth = Math.max(1.2, lineW * 0.75); ctx.lineJoin = "round"; ctx.stroke();
    if (m.tuck > 0.3) { pen.poly([[mx - w * 0.45, my + h * 0.25], [mx + w * 0.45, my + h * 0.25]], false); ctx.strokeStyle = featureInk; ctx.lineWidth = lineW * 0.8; ctx.stroke(); }
  }
  if (mouthStyle === "overbite") { pen.ellipse(mx, my - R * 0.06 * S, w * 0.75 + R * 0.06 * S, R * 0.1 * S, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.strokeStyle = featureInk; ctx.lineWidth = Math.max(1.6, R * 0.05 * S); ctx.stroke(); }

  if (look.formDetail && look.fill !== "none") faceClay(G, { R, nx, ny, mx, my, mw: w, eyes: F.eyes, side: sk.side, lips: !!lipC });

  // moustache over the top lip
  if (card.moustache && card.moustache !== "none") {
    const k = { thin: 0.5, thick: 1, handlebar: 0.8 }[card.moustache] ?? 0.8;
    const hb = card.moustache === "handlebar";
    pen.blob([[mx - R * 0.32 * S, my - R * 0.06 * S], [mx - R * (hb ? 0.42 : 0.3) * S, my - R * (hb ? 0.2 : 0.02) * S], [mx, my - R * (0.12 + 0.08 * k) * S], [mx + R * (hb ? 0.42 : 0.3) * S, my - R * (hb ? 0.2 : 0.02) * S], [mx + R * 0.32 * S, my - R * 0.06 * S], [mx, my - R * 0.07 * S]]);
    // a thin outline: thick-line looks (stained glass) filled the whole small shape with ink, so a grey moustache came out black (Ak, 2 Nov)
    G.fill(hairC, { role: "hair", noShade: true, outline: (look.outline ?? 0) * 0.3 });
  }

  return { eyes: eyesOut, mouth: { x: F.mouth.x, y: F.mouth.y, w: Math.max(m.w * R * F.mouth.w * ms, R * 0.2), h: Math.max(m.h * R * ms, R * 0.04) } };
}

/**
 * A beard that follows the jaw (Ak, 25 + 27 Oct 2026: "beards don't follow the
 * round lower jawline"). The outer edge IS the head's own outline, a touch
 * outside it, from one sideburn round the chin to the other, hanging below
 * the chin by the beard's length; the inner edge runs from each sideburn down
 * the cheek to the mouth corners and under the lower lip, so the mouth always
 * shows. It turns with the head: the sideburns sit at the ears, wherever the
 * turn has put them. Stubble is the same shape as a soft shadow.
 */
function jawBeard(G, kind, hairC, mx, my) {
  const { ctx, pen, S, sk, look } = G;
  const R = sk.R, F = sk.face;
  const rx = sk.rx * 1.04, ry = sk.ry * 1.04;
  const len = { full: 0.32, short: 0.08, stubble: 0 }[kind] ?? 0.2;
  const low = kind === "full" ? 0 : 0.06; // a short beard keeps more cheek bare
  const farEar = F.ears[0], nearEar = F.ears[1];
  const nearSide = nearEar.visible && sk.turn < 0.5; // the near sideburn shows
  const hw = R * 0.36 * F.mouth.w;
  const angleAt = (x) => Math.acos(Math.max(-1, Math.min(1, x / rx)));
  // the jaw, from the far ear round the chin to the near ear (or, turned, to
  // the front of the chin just below the mouth)
  const aFar = angleAt(farEar.x);
  const aNear = nearSide ? angleAt(nearEar.x) : angleAt(Math.min(rx * 0.9, mx / S + hw * 1.6));
  const jaw = [];
  for (let i = 0; i <= 24; i++) {
    const t = aNear + (aFar - aNear) * (i / 24);
    const down = Math.max(0, Math.sin(t));
    jaw.push([Math.cos(t) * rx * S, Math.max(Math.sin(t) * ry, 0) * (1 + len * down ** 4) * S]);
  }
  const earY = (e) => (e.y + R * 0.08) * S;
  const strip = R * 0.15; // sideburn width
  // the inner edge, back from the near side to the far side: down the near
  // sideburn, low across the cheek to the mouth corner, under the lower lip,
  // and up the far side the same way
  const inner = [];
  if (nearSide) inner.push([nearEar.x * S, earY(nearEar)], [(nearEar.x - strip) * S, earY(nearEar)], [(nearEar.x - strip * 1.1) * S, (R * (0.34 + low)) * S]);
  inner.push([mx + hw * S, my + R * (0.06 + low) * S], [mx, my + R * (0.2 + low * 0.5) * S], [mx - hw * S, my + R * (0.06 + low) * S]);
  inner.push([(farEar.x + strip * 1.1) * S, (R * (0.34 + low)) * S], [(farEar.x + strip) * S, earY(farEar)], [farEar.x * S, earY(farEar)]);
  const pts = [...jaw, ...spline(inner.reverse(), 5)];
  pen.poly(pts);
  if (kind === "stubble") {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = toneColor(look, hairC, "hair");
    ctx.fill();
    ctx.restore();
    return;
  }
  G.fill(hairC, { role: "hair", noShade: true });
}

/** The character with its look's whole-figure treatment, via a layer canvas. */
export function drawFigure(ctx, card, opts) {
  const look = typeof (opts.look ?? card.look) === "string" ? lookById(opts.look ?? card.look) : opts.look;
  // line-art looks erase what is behind each shape, so they always need their own layer
  if ((!look.layer && look.fill !== "none") || !opts.layerSize) return drawCharacter(ctx, card, { ...opts, look });
  const { w, h } = opts.layerSize;
  const L = opts.layerCanvas ?? newCanvas(w, h);
  if (L.width !== w || L.height !== h) { L.width = w; L.height = h; }
  const lc = L.getContext("2d");
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, w, h);
  const info = drawCharacter(lc, card, { ...opts, look });
  applyLayer(look, ctx, L, lc, { w, h, S: opts.S, ink: info.ink, at: [(opts.x ?? 0) + (info.sk?.root?.[0] ?? 0) * opts.S * (opts.mirror ? -1 : 1), (opts.y ?? 0) + (info.sk?.root?.[1] ?? 0) * opts.S] });
  return info;
}
