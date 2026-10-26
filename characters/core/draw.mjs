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
import { TAU, makePen } from "./pen.mjs";
import { inkFor, newCanvas, paint, strokeLine, toneColor, hatchPattern, dotPattern } from "./paint.mjs";
import { lookById } from "./looks.mjs";
import { solveRig, anchors, figureExtent } from "./rig.mjs";
import { ITEMS, itemById } from "./wardrobe.mjs";
import { EXPRESSION_REST, EXPRESSION_SMILE, browShape, lidAmount, mouthShape } from "./face.mjs";
import { applyLayer } from "./fx.mjs";
import { RecordingCtx } from "./record.mjs";

// ---- hair ----------------------------------------------------------------------------------
// Each style: back (behind the head) and/or front (on top), head-centred px.

const cap = (sk, S, k = 1) => {
  const { rx, ry } = sk, b = -sk.side * rx * 0.12;
  return [[-rx * 1.03 + b, -ry * 0.05], [-rx * 0.99 + b, -ry * 0.6], [-rx * 0.5 + b, -ry * 1.05 * k], [rx * 0.3, -ry * 1.08 * k], [rx * 0.92, -ry * 0.68], [rx * 1.02, -ry * 0.22], [rx * 0.6, -ry * 0.52], [rx * 0.05, -ry * 0.6], [-rx * 0.6, -ry * 0.42]].map(([x, y]) => [x * S, y * S]);
};
const HAIR = {
  bald: {},
  tuft: { front: (G, sk, S, c) => { G.pen.curve([[-sk.rx * 0.1 * S, -sk.ry * 0.95 * S], [0, -sk.ry * 1.35 * S], [sk.rx * 0.3 * S, -sk.ry * 1.3 * S], [sk.rx * 0.22 * S, -sk.ry * 1.12 * S]]); G.line(c, 0.012); } },
  buzz: { front: (G, sk, S, c) => { G.pen.ellipse(-sk.side * sk.rx * 0.1 * S, -sk.ry * 0.12 * S, sk.rx * 1.02 * S, sk.ry * 0.94 * S, 0, Math.PI * 1.06, Math.PI * 1.94); G.fill(c, { role: "hair", noShade: true }); } },
  short: { front: (G, sk, S, c) => { G.pen.blob(cap(sk, S)); G.fill(c, { role: "hair", noShade: true }); } },
  sidepart: { front: (G, sk, S, c) => {
    const { rx, ry } = sk, b = -sk.side * rx * 0.12;
    G.pen.blob([[-rx * 1.02 + b, -ry * 0.05], [-rx * 0.98 + b, -ry * 0.62], [-rx * 0.55 + b, -ry * 1.02], [rx * 0.2, -ry * 1.1], [rx * 0.85, -ry * 0.78], [rx * 1.02, -ry * 0.32], [rx * 0.55, -ry * 0.58], [-rx * 0.1, -ry * 0.62], [-rx * 0.7 + b, -ry * 0.45]].map(([x, y]) => [x * S, y * S]));
    G.fill(c, { role: "hair", noShade: true });
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
  long: {
    back: (G, sk, S, c) => { const { rx, ry } = sk, b = -sk.side * rx * 0.35; G.pen.blob([[(-rx * 1.15 + b) * S, -ry * 0.6 * S], [(rx * 1.1) * S, -ry * 0.6 * S], [(rx * 1.2) * S, ry * 1.2 * S], [(rx * 0.6) * S, ry * 1.9 * S], [(-rx * 0.8 + b) * S, ry * 1.95 * S], [(-rx * 1.3 + b) * S, ry * 1.1 * S]]); G.fill(c, { role: "hair", noShade: true }); },
    front: (G, sk, S, c) => { G.pen.blob(cap(sk, S)); G.fill(c, { role: "hair", noShade: true }); },
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
export function drawCharacter(ctx, card, { look: look0 = card.look, S, x = 0, y = 0, mirror = false, state = {} } = {}) {
  const look = typeof look0 === "string" ? lookById(look0) : look0;
  const t = state.t ?? 0;
  const sk = solveRig(card, look, state);
  const A = anchors(sk);
  const boil = (card.boil ?? look.boil ?? 0) * (S / 300);
  const pen = makePen(ctx, { t, boil, rate: look.boilRate ?? 8 });
  const ink = inkFor(look, card);
  const wear = (card.wear ?? []).map((w) => ({ ...w, item: itemById(w.id) })).filter((w) => w.item);
  const tone = (c, role) => toneColor(look, c, role);

  const G = {
    ctx, pen, look, S, ink, sk, A, card, t, tone,
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

  // limb colours: rubber-hose limbs are one bendy tube in the colour that covers them
  const longTop = wear.find((w) => ["top", "outer", "full"].includes(w.slot) && ["shirt", "hoodie", "hoodie_up", "sweater", "blazer"].includes(w.id));
  const legCover = wear.find((w) => ["trousers", "jeans"].includes(w.id));
  const armColor = look.limb === "hose" && longTop ? longTop.colors[0] : card.skin;
  const legColor = look.limb === "hose" && legCover ? legCover.colors[0] : card.skin;

  const limb = (pts, color, w, role) => {
    const p = G.U(pts);
    if (look.limb === "line") { pen.poly(p, false); ctx.strokeStyle = ink; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = w * S; ctx.stroke(); return; }
    if (look.limb === "hose") {
      const a = p[0], b = p[2], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
      const k = role === "leg" ? 0.16 : 0.32;
      // bow away from the body: the hip/shoulder's side of the centre line
      const sgn = -(Math.sign(pts[0][0] - sk.neck[0]) || 1);
      pen.curve([a, [mx - dy * k * sgn, my + dx * k * sgn], b]);
    } else pen.poly(p, false);
    G.line(color, w, { role: role === "leg" || role === "arm" ? (color === card.skin ? "skin" : "cloth") : "cloth" });
  };
  const hand = (arm) => {
    const [hx, hy] = [arm.ha[0] * S, arm.ha[1] * S];
    if (look.gloves) { pen.circle(hx, hy, 0.028 * S); G.fill("#ffffff", { role: "eye", noShade: true }); return; }
    if (look.limb === "line") { pen.circle(hx, hy, 0.012 * S); G.fill(card.skin, { role: "skin", noShade: true }); return; }
    pen.circle(hx, hy, sk.limbW * 0.62 * S); G.fill(card.skin, { role: "skin", noShade: true });
  };
  const drawArm = (arm) => {
    limb([arm.sh, arm.el, arm.ha], look.limb === "line" ? ink : armColor, sk.limbW, "arm");
    if (look.limb !== "hose") phase("arm", arm);
    hand(arm);
  };

  // ---- behind everything
  phase("back");
  drawArm(sk.arms[0]);

  // ---- legs and feet
  for (const leg of sk.legs) {
    limb([leg.hip, leg.knee, leg.foot], look.limb === "line" ? ink : legColor, sk.legW, "leg");
  }
  if (look.limb !== "hose") phase("legs");
  for (const leg of sk.legs) {
    if (has("feet")) phase("feet", leg.foot, leg.front ? 1 : -1);
    else { pen.ellipse((leg.foot[0] + 0.012) * S, (leg.foot[1] - 0.006) * S, 0.024 * S, 0.01 * S); G.fill(card.skin, { role: "skin", noShade: true }); }
  }

  // ---- torso: bare skin first, then clothes in layers
  pen.rpoly(G.U(sk.torso), 0.025 * S);
  G.fill(covers(["top", "full"]) ? null : card.skin, { role: "skin" });
  phase("torso");
  phase("outer");
  if (!look.noNeck) {
    const l = sk.neck[0], nw = sk.R * 0.16;
    pen.poly(G.U([[l - nw, sk.sy - 0.03], [l + nw, sk.sy - 0.03], [l + nw, sk.sy + 0.004], [l - nw, sk.sy + 0.004]]));
    G.fill(card.skin, { role: "skin", noShade: true, outline: 0 });
  }
  phase("neck");

  // ---- head group (rotates as one)
  // a raised hood hides the hair (only a fringe would show; the hood draws its own edge)
  const hooded = wear.some((w) => w.id === "hoodie_up");
  const hair = hooded ? {} : HAIR[card.hair] ?? HAIR.short;
  const hairColor = card.hairColor ?? "#262a33";
  ctx.save();
  ctx.translate(sk.head[0] * S, sk.head[1] * S);
  ctx.rotate(sk.rot);
  phase("hairBack");
  hair.back?.(G, sk, S, hairColor, t);
  const ears = sk.face.ears.filter((e) => e.visible && card.ears !== "none");
  const earR = { small: 0.14, round: 0.18, big: 0.24 }[card.ears] ?? 0.14;
  const drawEar = (e) => { pen.ellipse(e.x * S, e.y * S, sk.R * earR * 0.8 * S, sk.R * earR * 1.15 * S); G.fill(card.skin, { role: "skin", noShade: true }); };
  ears.filter((e) => Math.abs(e.x) > sk.rx * 0.8).forEach(drawEar);
  // the head
  const headPts = () => {
    if (card.headShape === "square") return pen.rpoly([[-sk.rx * S, -sk.ry * S], [sk.rx * S, -sk.ry * S], [sk.rx * S, sk.ry * S], [-sk.rx * S, sk.ry * S]], sk.R * 0.45 * S);
    if (card.headShape === "egg") return pen.blob([[0, -sk.ry * S], [sk.rx * 0.9 * S, -sk.ry * 0.45 * S], [sk.rx * S, sk.ry * 0.35 * S], [0, sk.ry * S], [-sk.rx * S, sk.ry * 0.35 * S], [-sk.rx * 0.9 * S, -sk.ry * 0.45 * S]]);
    return pen.ellipse(0, 0, sk.rx * S, sk.ry * S);
  };
  headPts();
  G.fill(card.skin, { role: "skin" });
  ears.filter((e) => Math.abs(e.x) <= sk.rx * 0.8).forEach(drawEar);
  const face = drawFace(G, state);
  hair.front?.(G, sk, S, hairColor, t);
  if (card.highlight) highlight(G, sk, S, card.highlight);
  phase("head");
  phase("face");
  ctx.restore();

  // ---- front arm last
  drawArm(sk.arms[1]);
  if (look.rivets) {
    for (const q of [sk.arms[1].sh, sk.arms[1].el, sk.arms[0].el, sk.legs[0].hip, sk.legs[1].hip, sk.legs[0].knee, sk.legs[1].knee]) {
      pen.circle(q[0] * S, q[1] * S, S * 0.006); ctx.fillStyle = look.rivets; ctx.fill();
      pen.circle(q[0] * S - S * 0.0015, q[1] * S - S * 0.0015, S * 0.002); ctx.fillStyle = "rgba(255,230,180,0.6)"; ctx.fill();
    }
  }
  ctx.restore();

  // measurements in canvas px (head rotation ignored: it is a few degrees)
  const flip = mirror ? -1 : 1;
  const hx = x + flip * sk.head[0] * S, hy = y + sk.head[1] * S;
  return {
    head: { x: hx, y: hy, r: sk.R * S },
    mouth: { x: hx + flip * face.mouth.x * S, y: hy + face.mouth.y * S, w: face.mouth.w * S, h: face.mouth.h * S },
    eyes: face.eyes.map((e) => ({ x: hx + flip * e.x * S, y: hy + e.y * S, r: e.r * S, visible: e.visible })),
    hands: sk.arms.map((a) => ({ x: x + flip * a.ha[0] * S, y: y + a.ha[1] * S })),
    ink,
  };
}

/** Stripes, checks, dots or corduroy ribs over the current path. */
function overlayPattern(G, color, kind) {
  const { ctx, pen, S } = G;
  const b = pen.bounds();
  if (!b) return;
  const c = shade(G.tone(color), -0.28);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = c; ctx.fillStyle = c;
  const step = S * (kind === "corduroy" ? 0.008 : 0.022);
  ctx.lineWidth = kind === "corduroy" ? Math.max(1, S * 0.0025) : S * 0.007;
  if (kind === "stripes" || kind === "corduroy" || kind === "checks") {
    ctx.beginPath();
    for (let xx = b.x0; xx <= b.x1; xx += step) { ctx.moveTo(xx, b.y0); ctx.lineTo(xx, b.y1); }
    if (kind === "checks") for (let yy = b.y0; yy <= b.y1; yy += step) { ctx.moveTo(b.x0, yy); ctx.lineTo(b.x1, yy); }
    ctx.globalAlpha = kind === "checks" ? 0.45 : 0.6;
    ctx.stroke();
  } else if (kind === "dots") {
    ctx.beginPath();
    for (let yy = b.y0; yy <= b.y1; yy += step) for (let xx = b.x0 + ((Math.round((yy - b.y0) / step) % 2) * step) / 2; xx <= b.x1; xx += step) { ctx.moveTo(xx + step * 0.18, yy); ctx.arc(xx, yy, step * 0.18, 0, TAU); }
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

function drawFace(G, state) {
  const { ctx, pen, look, S, sk, card, ink } = G;
  const R = sk.R, F = sk.face;
  const eyesStyle = look.eyes ?? card.eyes ?? "dot";
  const lid0 = state.lid ? lidAmount(state.lid.from, state.lid.to, state.lid.mix) : 0;
  const lid = eyesStyle === "sleepy" ? Math.max(lid0, 0.45) : lid0;
  const gaze = (state.gaze ?? 0.4) * R * 0.04;
  const mono = look.tone === "mono";
  const featureInk = ink;
  const eyesOut = [];

  // eyes
  for (const e of F.eyes) {
    const ex = e.x * S, ey = e.y * S, sx = e.scaleX;
    const r0 = { dot: 0.085, small: 0.07, oval: 0.15, lash: 0.15, googly: 0.22, pie: 0.16, sleepy: 0.15 }[eyesStyle] ?? 0.085;
    eyesOut.push({ x: e.x, y: e.y, r: R * r0, visible: e.visible });
    if (!e.visible || eyesStyle === "none") continue;
    if (lid > 0.85) { // shut: a line
      pen.poly([[ex - R * 0.12 * sx * S, ey], [ex + R * 0.12 * sx * S, ey]], false);
      ctx.strokeStyle = featureInk; ctx.lineWidth = Math.max(1.5, R * 0.06 * S); ctx.lineCap = "round"; ctx.stroke();
      continue;
    }
    const open = 1 - Math.max(0, lid);
    const wide = lid < 0 ? 1 - lid * 0.5 : 1;
    if (eyesStyle === "dot" || eyesStyle === "small") {
      pen.ellipse(ex + gaze * S, ey, R * r0 * sx * S * wide, R * r0 * S * Math.max(0.25, open) * wide);
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
      pen.circle(ex + gaze * S * 2, ecy + R * 0.02 * S, pr * S); G.fill(mono ? featureInk : "#1b1b2a", { feature: true, outline: 0 });
      pen.circle(ex + gaze * S * 2 + pr * 0.35 * S, ecy - pr * 0.3 * S, pr * 0.33 * S); G.fill("#ffffff", { feature: true, outline: 0 });
    }
    if (lid > 0.02) { // the lid
      ctx.fillStyle = toneColor(look, card.skin, "skin");
      ctx.fillRect(ex - rx * S * 1.2, ecy - ry * S * 1.2, rx * S * 2.4, ry * S * (0.2 + 2 * lid));
      ctx.beginPath(); ctx.moveTo(ex - rx * S * 1.1, ecy - ry * S + ry * S * 2 * lid); ctx.lineTo(ex + rx * S * 1.1, ecy - ry * S + ry * S * 2 * lid);
      ctx.strokeStyle = featureInk; ctx.lineWidth = Math.max(1.2, R * 0.04 * S); ctx.stroke();
    }
    ctx.restore();
    if (eyesStyle === "lash") { pen.poly([[ex + rx * 0.9 * S, ecy - ry * 0.8 * S], [ex + rx * 1.5 * S, ecy - ry * 1.25 * S]], false); ctx.strokeStyle = featureInk; ctx.lineWidth = R * 0.05 * S; ctx.stroke(); }
  }

  // brows
  const browStyle = card.brows ?? "line";
  if (browStyle !== "none" && eyesStyle !== "none") {
    const names = [state.brows?.left ?? "serious", state.brows?.right ?? state.brows?.left ?? "serious"];
    // "confused" lifts one brow only: the other stays at rest
    if (names[0] === "confused" && names[1] === "confused") names[0] = "serious";
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
    const len = nose === "long" ? 0.4 : nose === "none" ? 0.13 : 0.22;
    pen.blob([[sk.rx * 0.82 * S, -R * 0.08 * S], [(sk.rx + R * len) * S, R * 0.18 * S], [sk.rx * 0.86 * S, R * 0.27 * S]]);
    G.fill(card.skin, { role: "skin", noShade: true });
  } else if (nose === "dot") { pen.circle(nx, ny, R * 0.045 * S); G.fill(shade(toneColor(look, card.skin, "skin"), -0.25), { feature: true, outline: 0 }); }
  else if (nose === "line") { pen.poly([[nx, ny - R * 0.12 * S], [nx + R * 0.05 * S, ny + R * 0.04 * S], [nx - R * 0.02 * S, ny + R * 0.05 * S]], false); ctx.strokeStyle = featureInk; ctx.lineWidth = Math.max(1.2, R * 0.035 * S); ctx.stroke(); }
  else if (nose === "button" || nose === "long") { pen.ellipse(nx, ny, R * (nose === "long" ? 0.1 : 0.09) * S, R * (nose === "long" ? 0.18 : 0.07) * S); G.fill(card.skin, { role: "skin", noShade: true }); }

  // cheeks, freckles
  if (card.cheeks && !mono && look.fill !== "none") for (const e of F.eyes) if (e.visible) { pen.ellipse((e.x + R * 0.02) * S, (e.y + R * 0.28) * S, R * 0.1 * e.scaleX * S, R * 0.06 * S); ctx.fillStyle = "rgba(230,90,90,0.28)"; ctx.fill(); }
  if (card.freckles && !mono) for (let i = 0; i < 10; i++) { const e = F.eyes[i % 2]; if (!e.visible) continue; pen.circle((e.x + (i % 5 - 2) * R * 0.05) * S, (e.y + R * (0.18 + (i % 3) * 0.04)) * S, R * 0.012 * S); ctx.fillStyle = featureInk; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1; }

  // beard and moustache (before the mouth, so the mouth opens through them)
  const hairC = card.hairColor ?? "#262a33";
  const mx = F.mouth.x * S, my = F.mouth.y * S;
  if (card.beard && card.beard !== "none") {
    if (card.beard === "stubble") { ctx.save(); pen.ellipse(mx, my + R * 0.15 * S, R * 0.62 * S, R * 0.42 * S); ctx.clip(); ctx.fillStyle = dotPattern(ctx, 0.35); ctx.fillRect(mx - R * S, my - R * 0.3 * S, R * 2 * S, R * S); ctx.restore(); }
    else if (card.beard === "goatee") { pen.blob([[mx - R * 0.18 * S, my + R * 0.1 * S], [mx + R * 0.18 * S, my + R * 0.1 * S], [mx + R * 0.1 * S, my + R * 0.5 * S], [mx, my + R * 0.62 * S], [mx - R * 0.1 * S, my + R * 0.5 * S]]); G.fill(hairC, { role: "hair", noShade: true }); }
    else {
      const big = card.beard === "full" ? 1 : 0.75;
      // the beard turns with the face: its far side tucks in towards the jaw line
      const back = lerp(-sk.rx * 0.95, -sk.rx * 0.1, sk.side), backLow = lerp(-sk.rx * 0.6, sk.rx * 0.05, sk.side);
      pen.blob([[back * S, -R * 0.05 * S], [backLow * S, R * 0.55 * big * S], [mx, R * (0.95 + 0.25 * big) * S], [sk.rx * 0.75 * S, R * 0.55 * big * S], [sk.rx * 0.97 * S, -R * 0.02 * S], [mx + R * 0.3 * S, my - R * 0.05 * S], [mx - R * 0.3 * S, my - R * 0.05 * S]]);
      G.fill(hairC, { role: "hair", noShade: true });
    }
  }

  // the mouth
  const rest = EXPRESSION_REST[card.expression] ?? 0;
  const mfrom = state.mouth?.from ?? rest, mto = state.mouth?.to ?? rest;
  const m = mouthShape(mfrom === 0 ? rest : mfrom, mto === 0 ? rest : mto, state.mouth?.mix ?? 1);
  const smile = m.smile + (EXPRESSION_SMILE[card.expression] ?? 0);
  const ms = look.mouthScale ?? 1;
  const w = m.w * R * F.mouth.w * S * ms, h = m.h * R * S * ms;
  const mouthStyle = look.mouth ?? card.mouth ?? "plain";
  const lipC = card.lips ? toneColor(look, card.lipColor ?? "#c2575c", "lip") : null;
  const lineW = Math.max(1.6, R * 0.055 * S);
  if (h < R * 0.03 * S) {
    const press = m.press;
    pen.curve([[mx - w / 2, my - smile * R * 0.1 * S], [mx, my + smile * R * 0.08 * S], [mx + w / 2, my - smile * R * 0.1 * S]]);
    if (lipC) { ctx.strokeStyle = lipC; ctx.lineWidth = lineW * (2.2 + press); ctx.lineCap = "round"; ctx.stroke(); }
    ctx.strokeStyle = featureInk; ctx.lineWidth = lineW * (1 + press * 0.5); ctx.lineCap = "round"; ctx.stroke();
  } else {
    // open: a superellipse between a flat oval (round 0) and a circle (round 1),
    // flatter on top like an upper lip
    const ex = lerp(3.2, 2, m.round), pts = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU, c = Math.cos(a), s = Math.sin(a);
      const px = Math.sign(c) * Math.abs(c) ** (2 / ex) * (w / 2);
      const py = Math.sign(s) * Math.abs(s) ** (2 / ex) * (h / 2) * (s < 0 ? 0.7 : 1);
      pts.push([mx + px, my + py - smile * R * 0.05 * S * Math.abs(c)]);
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
    if (lipC) { ctx.strokeStyle = lipC; ctx.lineWidth = lineW * 1.8; ctx.stroke(); }
    ctx.strokeStyle = featureInk; ctx.lineWidth = Math.max(1.2, lineW * 0.75); ctx.lineJoin = "round"; ctx.stroke();
    if (m.tuck > 0.3) { pen.poly([[mx - w * 0.45, my + h * 0.25], [mx + w * 0.45, my + h * 0.25]], false); ctx.strokeStyle = featureInk; ctx.lineWidth = lineW * 0.8; ctx.stroke(); }
  }
  if (mouthStyle === "overbite") { pen.ellipse(mx, my - R * 0.06 * S, w * 0.75 + R * 0.06 * S, R * 0.1 * S, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.strokeStyle = featureInk; ctx.lineWidth = Math.max(1.6, R * 0.05 * S); ctx.stroke(); }

  // moustache over the top lip
  if (card.moustache && card.moustache !== "none") {
    const k = { thin: 0.5, thick: 1, handlebar: 0.8 }[card.moustache] ?? 0.8;
    const hb = card.moustache === "handlebar";
    pen.blob([[mx - R * 0.32 * S, my - R * 0.06 * S], [mx - R * (hb ? 0.42 : 0.3) * S, my - R * (hb ? 0.2 : 0.02) * S], [mx, my - R * (0.12 + 0.08 * k) * S], [mx + R * (hb ? 0.42 : 0.3) * S, my - R * (hb ? 0.2 : 0.02) * S], [mx + R * 0.32 * S, my - R * 0.06 * S], [mx, my - R * 0.07 * S]]);
    G.fill(hairC, { role: "hair", noShade: true });
  }

  return { eyes: eyesOut, mouth: { x: F.mouth.x, y: F.mouth.y, w: Math.max(m.w * R * F.mouth.w * ms, R * 0.2), h: Math.max(m.h * R * ms, R * 0.04) } };
}

/** The character with its look's whole-figure treatment, via a layer canvas. */
export function drawFigure(ctx, card, opts) {
  const look = typeof (opts.look ?? card.look) === "string" ? lookById(opts.look ?? card.look) : opts.look;
  if (!look.layer || !opts.layerSize) return drawCharacter(ctx, card, { ...opts, look });
  const { w, h } = opts.layerSize;
  const L = opts.layerCanvas ?? newCanvas(w, h);
  if (L.width !== w || L.height !== h) { L.width = w; L.height = h; }
  const lc = L.getContext("2d");
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, w, h);
  const info = drawCharacter(lc, card, { ...opts, look });
  applyLayer(look, ctx, L, lc, { w, h, S: opts.S, ink: info.ink });
  return info;
}
