// ---------------------------------------------------------------------------
// WARDROBE: clothes and accessories that hang on the skeleton.
//
// An item knows WHERE it goes (a slot, and points from rig.anchors), never how
// a look draws: it builds shapes and calls G.fill / G.line, and the look
// decides outline, shading, hatching, glow. So one hoodie works on the stick
// figure, the sticker, the Greek vase and the neon look alike, in front, 3/4
// and side view.
//
// Each item draws in one or more PHASES, called by draw.mjs in this order:
//   back → arm (back arm) → legs → feet → torso → outer → neck →
//   [head group: hairBack → (head, face, hair) → head → face] → arm (front arm)
//
// G (from draw.mjs): { ctx, pen, look, S, ink, sk, A, U(pts) → px, fill(color,
// opts), line(color, width, opts), card }. Coordinates are figure units
// (height 1, feet at 0, up negative); head phases are relative to the head
// centre (the head group rotates).
//
// This is the first, proving set (Oct 2026); the full catalogue and costume
// packs are listed in docs/CHARACTER-BUILDER-PLAN.md.
// ---------------------------------------------------------------------------

import { shade } from "./math.mjs";

/** Slots: one item each, except the ones in MULTI. "full" fills top + bottom. */
export const SLOTS = ["top", "outer", "full", "bottom", "feet", "neck", "head", "hair", "eyes", "ears"];
const MULTI = new Set(["hair"]);
export const PATTERNS = ["none", "stripes", "checks", "dots", "corduroy"];

// ---- shoes ------------------------------------------------------------------------------
// Drawn for the way the figure faces (Ak, 25 + 27 Oct 2026: "shoes need real
// design"; the old ovals pointed sideways even from the front). Facing the
// camera a shoe is a rounded toe box seen from the front, splayed a little
// outwards; side on it is a profile — heel, ankle, instep, rounded toe — and
// in between the two outlines blend point for point. Each kind is that same
// outline with its own proportions and details.
/** A leg's end lifted by a stroke's radius, so its round cap sits on the floor. */
export const ankle = (p, r) => [p[0], p[1] - r];
const lerpP = (a, b, k) => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * k, p[1] + (b[i][1] - p[1]) * k]);
const smoothK = (k) => k * k * (3 - 2 * k);

function shoe(G, foot, s, o, colors) {
  const { S, sk, look, pen } = G;
  const big = look.bigShoes ? 1.9 : 1;
  const k = smoothK(Math.min(1, Math.max(0, Math.max(sk.side, sk.turn * 0.65))));
  // sized from the leg: a shoe is always wider than the trouser leg above it
  const lw = Math.max(0.026, sk.legW);
  const L = lw * 2.7 * big * (o.len ?? 1), H = lw * 1.05 * big * (o.high ?? 1), W = lw * 1.85 * big * (o.wide ?? 1);
  const front = [[-W / 2, 0], [-W / 2, -H * 0.45], [-W * 0.38, -H * 0.86], [-W * 0.13, -H], [W * 0.13, -H], [W * 0.38, -H * 0.86], [W / 2, -H * 0.45], [W / 2, 0]];
  const hb = lw * 0.62 * big; // heel behind the ankle
  const side = [[-hb, 0], [-hb * 1.1, -H * 0.78], [-hb * 0.45, -H * 1.12], [hb * 0.45, -H * 1.12], [L * 0.45, -H * 0.72], [L * 0.74, -H * 0.56], [L * 0.94, -H * 0.3], [L * 0.97, 0]];
  const splay = s * 0.004 * (1 - k);
  const ox = foot[0] + splay, oy = foot[1];
  const at = (pts) => pts.map(([x, y]) => [(ox + x) * S, (oy + y) * S]);
  const shape = lerpP(front, side, k);
  // a boot's shaft first, behind the foot part
  if (o.shaft) {
    const sw = (W * 0.78) * (1 - k) + lw * 1.35 * big * k, sx = (-hb * 0.2) * k;
    pen.rpoly(at([[sx - sw / 2, -H * 0.6], [sx + sw / 2, -H * 0.6], [sx + sw / 2, -H - o.shaft], [sx - sw / 2, -H - o.shaft]]), sw * 0.25 * S);
    G.fill(colors[0], { noShade: true });
  }
  pen.blob(at(shape));
  G.fill(o.upper ?? colors[0], o.upper === G.card.skin ? { role: "skin", noShade: true } : { noShade: true });
  // the sole: a band along the bottom of the outline
  const xs = shape.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), th = o.sole * big;
  pen.rpoly(at([[x0 - 0.002, -th], [x1 + 0.002, -th], [x1 + 0.002, 0.002], [x0 - 0.002, 0.002]]), th * 0.45 * S);
  G.fill(o.soleColor ?? shade(colors[0], -0.45), { noShade: true });
  o.detail?.(G, at, { W, H, L, k, big }, colors);
}

/** Bare feet: the shoe outline, lower, in skin, with no sole. */
export const barefoot = (G, foot, s) => shoe(G, foot, s, { high: 0.62, wide: 0.9, sole: 0.0001, soleColor: G.card.skin, upper: G.card.skin }, [G.card.skin]);

const laces = (G, at, { W, H, L, k }, c) => {
  for (let i = 0; i < 3; i++) {
    const fx = (i - 1) * W * 0.16, fy = -H * (0.92 - i * 0.04);
    const sx = L * (0.28 + i * 0.1), sy = -H * (0.86 - i * 0.07);
    const x = fx + (sx - fx) * k, y = fy + (sy - fy) * k;
    G.pen.poly(at([[x - 0.006, y + 0.002], [x + 0.006, y - 0.002]]), false);
    G.line(c, 0.003, { feature: true });
  }
};

// ---- shape helpers ----------------------------------------------------------------------

const vNotch = (sk, depth = 0.45, open = 0.42) => {
  const vb = sk.sy + (sk.hy - sk.sy) * depth;
  return { vb, open: sk.sx * open };
};
/** The torso, from the shoulders down to `bottomY`, flaring a little. */
function torsoShape(sk, bottomY = sk.hy, flare = 1.05, notch = null) {
  const lean = sk.neck[0];
  const sway = sk.torso[2][0] - sk.hx * 1.05;
  const k = (bottomY - sk.sy) / (sk.hy - sk.sy);
  const bx = sk.sx + (sk.hx * flare - sk.sx) * k;
  const pts = [[-sk.sx + lean, sk.sy]];
  if (notch) pts.push([lean - notch.open, sk.sy], [lean, notch.vb], [lean + notch.open, sk.sy]);
  pts.push([sk.sx + lean, sk.sy], [bx + sway, bottomY], [-bx + sway, bottomY]);
  return pts;
}
/** A point part-way along an arm or leg (0 = shoulder/hip, 1 = elbow/knee, 2 = hand/foot). */
function along(a, b, c, k) {
  if (k <= 1) return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const j = k - 1;
  return [b[0] + (c[0] - b[0]) * j, b[1] + (c[1] - b[1]) * j];
}
function armPath(arm, upTo) {
  const pts = [arm.sh];
  if (upTo > 1) pts.push(arm.el, along(arm.sh, arm.el, arm.ha, upTo)); else pts.push(along(arm.sh, arm.el, arm.ha, upTo));
  return pts;
}
function legPath(leg, upTo) {
  const pts = [leg.hip];
  if (upTo > 1) pts.push(leg.knee, along(leg.hip, leg.knee, leg.foot, upTo)); else pts.push(along(leg.hip, leg.knee, leg.foot, upTo));
  return pts;
}

// shared garment pieces
const sleeve = (len) => (G, c, arm) => {
  if (G.look.limb === "line") return; // stick limbs carry no sleeves
  G.pen.poly(G.U(armPath(arm, len)), false);
  G.line(c[0], G.sk.limbW * 1.28);
};
const trouserLegs = (len) => (G, c) => {
  for (const leg of G.sk.legs) {
    const w = G.sk.legW * (G.look.limb === "line" ? 2.8 : 1.3);
    // stop at the ankle: the stroke's round end must not poke below the floor
    const pts = legPath(leg, len);
    if (len > 1.5) pts[pts.length - 1] = ankle(pts[pts.length - 1], w / 2);
    G.pen.poly(G.U(pts), false);
    G.line(c[0], w);
  }
};
const crew = (G, c) => { // a round neckline
  const { sk } = G, w = sk.sx * 0.38;
  G.pen.ellipse(sk.neck[0] * G.S, sk.sy * G.S, w * G.S, w * 0.45 * G.S, 0, 0, Math.PI);
  G.ctx.strokeStyle = shade(G.tone(c[0]), -0.35); G.ctx.lineWidth = Math.max(1, G.S * 0.004); G.ctx.stroke();
};
const buttons = (G, n, fromK = 0.5) => {
  const { sk } = G;
  for (let i = 0; i < n; i++) {
    const y = sk.sy + (sk.hy - sk.sy) * (fromK + (i * (0.9 - fromK)) / Math.max(1, n));
    G.pen.circle((sk.neck[0] + 0.004) * G.S, y * G.S, G.S * 0.0045);
    G.fill(G.ink, { feature: true, outline: 0 });
  }
};

// ---- the catalogue -------------------------------------------------------------------------

export const ITEMS = [
  // tops
  { id: "tshirt", label: "T-shirt", slot: "top", colors: ["#3a6fb0"], patterns: true,
    torso: (G, c) => { G.pen.rpoly(G.U(torsoShape(G.sk)), 0.02 * G.S); G.fill(c[0], { pattern: c.pattern }); crew(G, c); },
    arm: sleeve(0.55) },
  { id: "polo", label: "Polo shirt", slot: "top", colors: ["#2f8f6a"], patterns: true,
    torso: (G, c) => {
      const { sk } = G;
      G.pen.rpoly(G.U(torsoShape(sk)), 0.02 * G.S); G.fill(c[0], { pattern: c.pattern });
      for (const s of [-1, 1]) { G.pen.poly(G.U([[sk.neck[0], sk.sy], [sk.neck[0] + s * sk.sx * 0.45, sk.sy - 0.005], [sk.neck[0] + s * sk.sx * 0.3, sk.sy + 0.04]])); G.fill(shade(c[0], 0.15), { noShade: true }); }
      buttons(G, 2, 0.1);
    },
    arm: sleeve(0.55) },
  { id: "shirt", label: "Dress shirt", slot: "top", colors: ["#ffffff"], patterns: true,
    torso: (G, c) => {
      const { sk } = G;
      G.pen.rpoly(G.U(torsoShape(sk)), 0.02 * G.S); G.fill(c[0], { pattern: c.pattern });
      for (const s of [-1, 1]) { G.pen.poly(G.U([[sk.neck[0], sk.sy + 0.01], [sk.neck[0] + s * sk.sx * 0.4, sk.sy - 0.008], [sk.neck[0] + s * sk.sx * 0.22, sk.sy + 0.035]])); G.fill(c[0], { noShade: true }); }
    },
    arm: sleeve(1.95) },
  { id: "tank", label: "Tank top", slot: "top", colors: ["#e8e4da"], patterns: true,
    torso: (G, c) => {
      const { sk } = G, l = sk.neck[0];
      G.pen.rpoly(G.U([[-sk.sx * 0.55 + l, sk.sy], [-sk.sx * 0.25 + l, sk.sy], [l, sk.sy + 0.05], [sk.sx * 0.25 + l, sk.sy], [sk.sx * 0.55 + l, sk.sy], [sk.sx * 0.95 + l, sk.sy + 0.07], [sk.hx * 1.05, sk.hy], [-sk.hx * 1.05, sk.hy], [-sk.sx * 0.95 + l, sk.sy + 0.07]]), 0.012 * G.S);
      G.fill(c[0], { pattern: c.pattern });
    } },
  { id: "hoodie", label: "Hoodie (hood down)", slot: "top", colors: ["#7a5cc0"], patterns: false,
    back: (G, c) => { const { sk } = G; G.pen.ellipse(sk.neck[0] * G.S, (sk.sy - 0.01) * G.S, sk.sx * 0.75 * G.S, 0.04 * G.S); G.fill(shade(c[0], -0.12)); },
    torso: (G, c) => {
      const { sk } = G;
      G.pen.rpoly(G.U(torsoShape(sk, sk.hy + 0.01)), 0.025 * G.S); G.fill(c[0]);
      G.pen.rpoly(G.U([[-sk.sx * 0.55, sk.hy - 0.07], [sk.sx * 0.55, sk.hy - 0.07], [sk.sx * 0.65, sk.hy - 0.005], [-sk.sx * 0.65, sk.hy - 0.005]]), 0.01 * G.S); G.fill(shade(c[0], -0.08), { noShade: true });
      for (const s of [-0.18, 0.18]) { G.pen.poly(G.U([[sk.neck[0] + s * sk.sx, sk.sy + 0.01], [sk.neck[0] + s * sk.sx * 1.2, sk.sy + 0.09]]), false); G.line("#f2f2f2", 0.004, { feature: true }); }
    },
    arm: sleeve(1.95) },
  { id: "hoodie_up", label: "Hoodie (hood up)", slot: "top", colors: ["#7a5cc0"], patterns: false,
    hairBack: (G, c) => { const { sk } = G; G.pen.ellipse(0, -sk.ry * 0.05 * G.S, sk.rx * 1.28 * G.S, sk.ry * 1.25 * G.S); G.fill(shade(c[0], -0.12)); },
    head: (G, c) => { const { sk } = G; G.pen.ellipse(0, -sk.ry * 0.12 * G.S, sk.rx * 1.22 * G.S, sk.ry * 1.18 * G.S, 0, Math.PI * 0.95, Math.PI * 2.05); G.line(c[0], 0.03); },
    torso: (G, c) => { const { sk } = G; G.pen.rpoly(G.U(torsoShape(sk, sk.hy + 0.01)), 0.025 * G.S); G.fill(c[0]); },
    arm: sleeve(1.95) },
  { id: "sweater", label: "Pullover", slot: "top", colors: ["#b5462f"], patterns: true,
    torso: (G, c) => {
      const { sk } = G;
      G.pen.rpoly(G.U(torsoShape(sk, sk.hy + 0.01)), 0.025 * G.S); G.fill(c[0], { pattern: c.pattern });
      G.pen.poly(G.U([[-sk.hx * 1.05, sk.hy - 0.025], [sk.hx * 1.05, sk.hy - 0.025]]), false); G.line(shade(c[0], -0.3), 0.003, { feature: true });
      crew(G, c);
    },
    arm: sleeve(1.9) },
  // outer layers
  { id: "vest", label: "Waistcoat", slot: "outer", colors: ["#3a6fb0"], patterns: true,
    torso: (G, c) => { const { sk } = G; G.pen.rpoly(G.U(torsoShape(sk, sk.hy, 1.05, vNotch(sk))), 0.015 * G.S); G.fill(c[0], { pattern: c.pattern }); buttons(G, 3, 0.55); } },
  { id: "blazer", label: "Suit jacket", slot: "outer", colors: ["#2d3446"], patterns: true,
    torso: (G, c) => {
      const { sk } = G, n = vNotch(sk, 0.55, 0.48);
      G.pen.rpoly(G.U(torsoShape(sk, sk.hy + 0.02, 1.1, n)), 0.015 * G.S); G.fill(c[0], { pattern: c.pattern });
      for (const s of [-1, 1]) { G.pen.poly(G.U([[sk.neck[0] + s * n.open, sk.sy], [sk.neck[0] + s * n.open * 0.55, sk.sy + 0.06], [sk.neck[0] + s * 0.004, n.vb]]), false); G.line(shade(c[0], -0.35), 0.003, { feature: true }); }
      buttons(G, 2, 0.7);
    },
    arm: sleeve(1.95) },
  // neck
  { id: "tie", label: "Tie", slot: "neck", colors: ["#1d2433"], patterns: true,
    neck: (G, c) => { const { sk } = G, l = sk.neck[0], vb = vNotch(sk).vb; G.pen.poly(G.U([[l - 0.008, sk.sy + 0.012], [l + 0.008, sk.sy + 0.012], [l + 0.013, vb - 0.01], [l, vb + 0.012], [l - 0.013, vb - 0.01]])); G.fill(c[0], { noShade: true, outline: (G.look.outline ?? 0) * 0.6, pattern: c.pattern }); } },
  { id: "bowtie", label: "Bow tie", slot: "neck", colors: ["#c0392b"], patterns: true,
    neck: (G, c) => { const { sk } = G, l = sk.neck[0], y = sk.sy + 0.012; for (const s of [-1, 1]) { G.pen.poly(G.U([[l, y], [l + s * 0.03, y - 0.014], [l + s * 0.03, y + 0.014]])); G.fill(c[0], { noShade: true }); } G.pen.circle(l * G.S, y * G.S, 0.006 * G.S); G.fill(shade(c[0], -0.2), { noShade: true }); } },
  { id: "scarf", label: "Scarf", slot: "neck", colors: ["#d4a537"], patterns: true,
    neck: (G, c) => { const { sk } = G, l = sk.neck[0]; G.pen.rpoly(G.U([[l - sk.sx * 0.6, sk.sy - 0.02], [l + sk.sx * 0.6, sk.sy - 0.02], [l + sk.sx * 0.55, sk.sy + 0.025], [l - sk.sx * 0.55, sk.sy + 0.025]]), 0.012 * G.S); G.fill(c[0], { pattern: c.pattern }); G.pen.rpoly(G.U([[l + 0.01, sk.sy], [l + 0.035, sk.sy], [l + 0.04, sk.sy + 0.14], [l + 0.015, sk.sy + 0.14]]), 0.008 * G.S); G.fill(c[0], { pattern: c.pattern }); } },
  // bottoms
  { id: "trousers", label: "Trousers", slot: "bottom", colors: ["#2d3446"], patterns: true, legs: (G, c) => trouserLegs(1.92)(G, c) },
  { id: "jeans", label: "Jeans", slot: "bottom", colors: ["#3b5b8a"], patterns: false, legs: (G, c) => trouserLegs(1.92)(G, c) },
  { id: "shorts", label: "Shorts", slot: "bottom", colors: ["#c9a46e"], patterns: true, legs: (G, c) => trouserLegs(0.75)(G, c) },
  { id: "skirt", label: "Skirt", slot: "bottom", colors: ["#8cc6f0"], patterns: true,
    torso: (G, c) => { const { sk } = G, w = sk.hx; G.pen.rpoly(G.U([[-w * 1.1, sk.hy - 0.04], [w * 1.1, sk.hy - 0.04], [w * 1.6, sk.hy * 0.62], [-w * 1.6, sk.hy * 0.62]]), 0.02 * G.S); G.fill(c[0], { pattern: c.pattern }); } },
  // full-length
  { id: "dress", label: "Dress", slot: "full", colors: ["#d35a7a"], patterns: true,
    torso: (G, c) => { const { sk } = G, w = sk.hx; G.pen.rpoly(G.U([...torsoShape(sk, sk.hy - 0.02, 1).slice(0, 2), [w * 1.7, sk.hy * 0.55], [-w * 1.7, sk.hy * 0.55]]), 0.02 * G.S); G.fill(c[0], { pattern: c.pattern }); crew(G, c); },
    arm: sleeve(0.45) },
  { id: "chiton", label: "Chiton (ancient Greek tunic)", slot: "full", colors: ["#efe6d2", "#a8322b"], patterns: false,
    torso: (G, c) => {
      const { sk } = G, w = sk.hx, l = sk.neck[0];
      const shape = [[-sk.sx * 1.05 + l, sk.sy - 0.005], [sk.sx * 1.05 + l, sk.sy - 0.005], [w * 1.25, sk.hy * 0.4], [w * 1.45, -0.05], [-w * 1.45, -0.05], [-w * 1.25, sk.hy * 0.4]];
      G.pen.rpoly(G.U(shape), 0.015 * G.S); G.fill(c[0]);
      // the folds: a few long lines, drawn in the look's line colour
      for (let i = -2; i <= 2; i++) { G.pen.curve(G.U([[i * w * 0.32, sk.waistY], [i * w * 0.42, sk.hy * 0.6], [i * w * 0.5, -0.06]])); G.line(shade(G.tone(c[0]), -0.3), 0.0025, { feature: !G.look.incise, ink: true }); }
      G.pen.poly(G.U([[-w * 1.1, sk.waistY], [w * 1.1, sk.waistY]]), false); G.line(c[1] ?? "#a8322b", 0.007);
      G.pen.poly(G.U([[-w * 1.42, -0.06], [w * 1.42, -0.06]]), false); G.line(c[1] ?? "#a8322b", 0.006);
    },
    arm: sleeve(0.4) },
  { id: "himation", label: "Himation / toga (draped cloak)", slot: "outer", colors: ["#a8322b"], patterns: false,
    torso: (G, c) => {
      const { sk } = G, l = sk.neck[0], w = sk.hx;
      // over the back shoulder, across the chest, down past the front hip
      G.pen.blob(G.U([[-sk.sx * 1.1 + l, sk.sy - 0.01], [-sk.sx * 0.2 + l, sk.sy + 0.02], [sk.sx * 0.9, sk.waistY - 0.05], [w * 1.3, sk.hy * 0.5], [w * 0.5, sk.hy * 0.25], [-w * 1.1, sk.hy * 0.7], [-sk.sx * 1.2 + l, sk.sy + 0.12]]));
      G.fill(c[0]);
      for (let i = 0; i < 3; i++) { G.pen.curve(G.U([[-sk.sx * (0.7 - i * 0.3) + l, sk.sy + 0.02 + i * 0.01], [sk.sx * (0.2 + i * 0.2), sk.waistY - 0.02 + i * 0.03], [w * (0.9 + i * 0.15), sk.hy * (0.55 - i * 0.05)]])); G.line(shade(G.tone(c[0]), -0.35), 0.0025, { feature: !G.look.incise, ink: true }); }
    } },
  // feet (shoe() above: front, side and everything between)
  { id: "sneakers", label: "Sneakers", slot: "feet", colors: ["#f2f2f2", "#d7261e"],
    feet: (G, c, foot, s) => shoe(G, foot, s, { high: 1.12, wide: 1.06, sole: 0.011, soleColor: "#ffffff",
      detail: (G, at, d, c) => {
        laces(G, at, d, shade(c[0], -0.35));
        // the side stripe shows as the foot turns
        if (d.k > 0.25) { G.pen.curve(at([[d.L * 0.15, -d.H * 0.3], [d.L * 0.45, -d.H * 0.55], [d.L * 0.72, -d.H * 0.42]])); G.line(c[1] ?? "#d7261e", 0.006, { feature: true }); }
        else { G.pen.poly(at([[-d.W * 0.42, -d.H * 0.25], [d.W * 0.42, -d.H * 0.25]]), false); G.line(c[1] ?? "#d7261e", 0.004, { feature: true }); }
      } }, c) },
  { id: "shoes", label: "Shoes", slot: "feet", colors: ["#16181d"],
    feet: (G, c, foot, s) => shoe(G, foot, s, { high: 0.86, len: 1.05, sole: 0.005, soleColor: shade(c[0], -0.3),
      detail: (G, at, d) => { G.pen.ellipse(...at([[d.k * d.L * 0.62, -d.H * 0.62]])[0], (0.009 + 0.006 * d.k) * G.S, 0.0035 * G.S); G.ctx.fillStyle = "rgba(255,255,255,0.35)"; G.ctx.fill(); } }, c) },
  { id: "boots", label: "Boots", slot: "feet", colors: ["#5a3622"],
    feet: (G, c, foot, s) => shoe(G, foot, s, { high: 1.05, wide: 1.08, sole: 0.009, shaft: 0.05, soleColor: "#2b1d12", detail: laces }, [c[0], c[0]]) },
  { id: "sandals", label: "Sandals", slot: "feet", colors: ["#7a4a24"],
    feet: (G, c, foot, s) => shoe(G, foot, s, { high: 0.75, sole: 0.006, soleColor: c[0], upper: G.card.skin,
      detail: (G, at, d, cc) => {
        for (const t of [0.35, 0.65]) {
          const fy = -d.H * (0.45 + t * 0.4), sxx = d.L * t;
          const a = [[-d.W * 0.48 * (1 - d.k) + (sxx - 0.012) * d.k, fy * (1 - d.k) + -d.H * 0.7 * d.k], [d.W * 0.48 * (1 - d.k) + (sxx + 0.012) * d.k, fy * (1 - d.k) + -d.H * 0.35 * d.k]];
          G.pen.poly(at(a), false); G.line(c[0], 0.005, { feature: true });
        }
      } }, c) },
  // head
  { id: "cap", label: "Cap", slot: "head", colors: ["#d7261e"],
    head: (G, c) => { const { sk } = G, S = G.S; G.pen.ellipse(0, -sk.ry * 0.38 * S, sk.rx * 1.02 * S, sk.ry * 0.72 * S, 0, Math.PI, Math.PI * 2); G.fill(c[0]); G.pen.rpoly([[sk.rx * 0.2 * S, -sk.ry * 0.42 * S], [sk.rx * 1.45 * S, -sk.ry * 0.36 * S], [sk.rx * 1.35 * S, -sk.ry * 0.28 * S], [sk.rx * 0.2 * S, -sk.ry * 0.3 * S]], 0.01 * S); G.fill(shade(c[0], -0.15), { noShade: true }); } },
  { id: "beanie", label: "Beanie", slot: "head", colors: ["#2f8f8a"],
    head: (G, c) => { const { sk } = G, S = G.S; G.pen.ellipse(0, -sk.ry * 0.4 * S, sk.rx * 1.04 * S, sk.ry * 0.78 * S, 0, Math.PI, Math.PI * 2); G.fill(c[0]); G.pen.rpoly([[-sk.rx * 1.06 * S, -sk.ry * 0.5 * S], [sk.rx * 1.06 * S, -sk.ry * 0.5 * S], [sk.rx * 1.06 * S, -sk.ry * 0.32 * S], [-sk.rx * 1.06 * S, -sk.ry * 0.32 * S]], 0.012 * S); G.fill(shade(c[0], -0.12)); } },
  { id: "tophat", label: "Top hat", slot: "head", colors: ["#1a1a1a", "#a8322b"],
    head: (G, c) => { const { sk } = G, S = G.S; G.pen.rpoly([[-sk.rx * 0.7 * S, -sk.ry * 2.05 * S], [sk.rx * 0.7 * S, -sk.ry * 2.05 * S], [sk.rx * 0.75 * S, -sk.ry * 0.62 * S], [-sk.rx * 0.75 * S, -sk.ry * 0.62 * S]], 0.012 * S); G.fill(c[0]); G.pen.poly([[-sk.rx * 0.75 * S, -sk.ry * 0.85 * S], [sk.rx * 0.75 * S, -sk.ry * 0.85 * S], [sk.rx * 0.75 * S, -sk.ry * 0.72 * S], [-sk.rx * 0.75 * S, -sk.ry * 0.72 * S]]); G.fill(c[1] ?? "#a8322b", { noShade: true }); G.pen.ellipse(0, -sk.ry * 0.62 * S, sk.rx * 1.15 * S, sk.ry * 0.1 * S); G.fill(c[0]); } },
  { id: "fez", label: "Fez", slot: "head", colors: ["#a3202a", "#1a1a1a"],
    head: (G, c) => { const { sk } = G, S = G.S; G.pen.rpoly([[-sk.rx * 0.55 * S, -sk.ry * 1.45 * S], [sk.rx * 0.55 * S, -sk.ry * 1.45 * S], [sk.rx * 0.72 * S, -sk.ry * 0.6 * S], [-sk.rx * 0.72 * S, -sk.ry * 0.6 * S]], 0.01 * S); G.fill(c[0]); G.pen.curve([[0, -sk.ry * 1.45 * S], [-sk.rx * 0.5 * S, -sk.ry * 1.3 * S], [-sk.rx * 0.65 * S, -sk.ry * 0.9 * S]]); G.line(c[1] ?? "#1a1a1a", 0.006, { feature: true }); } },
  { id: "wreath", label: "Laurel wreath", slot: "head", colors: ["#4f7a3a"],
    head: (G, c) => { const { sk } = G, S = G.S; for (let i = 0; i < 9; i++) { const a = Math.PI * (1.05 + i * 0.11); const x = Math.cos(a) * sk.rx * 1.02, y = Math.sin(a) * sk.ry * 0.95 - sk.ry * 0.05; G.pen.ellipse(x * S, y * S, sk.rx * 0.16 * S, sk.rx * 0.07 * S, a + Math.PI / 2 + 0.6); G.fill(c[0], { noShade: true }); } } },
  { id: "helmet", label: "Ancient Greek helmet", slot: "head", colors: ["#b8873a", "#a8322b"],
    head: (G, c) => { const { sk } = G, S = G.S; G.pen.ellipse(0, -sk.ry * 0.25 * S, sk.rx * 1.08 * S, sk.ry * 0.95 * S, 0, Math.PI * 0.95, Math.PI * 2.05); G.fill(c[0]); G.pen.blob([[-sk.rx * 0.9 * S, -sk.ry * 1.1 * S], [-sk.rx * 0.2 * S, -sk.ry * 1.75 * S], [sk.rx * 0.7 * S, -sk.ry * 1.55 * S], [sk.rx * 0.2 * S, -sk.ry * 1.05 * S]]); G.fill(c[1] ?? "#a8322b"); } },
  { id: "headband", label: "Headband", slot: "hair", colors: ["#e86a50"],
    head: (G, c) => { const { sk } = G, S = G.S; G.pen.ellipse(0, -sk.ry * 0.05 * S, sk.rx * 1.02 * S, sk.ry * 0.62 * S, 0, Math.PI * 1.08, Math.PI * 1.92); G.line(c[0], 0.012); } },
  { id: "bow", label: "Hair bow", slot: "hair", colors: ["#4a8fe0"],
    head: (G, c) => { const { sk } = G, S = G.S, x = -sk.rx * 0.72, y = -sk.ry * 0.8; for (const s of [-1, 1]) { G.pen.ellipse((x + s * sk.rx * 0.17) * S, y * S, sk.rx * 0.17 * S, sk.ry * 0.11 * S, s * 0.5); G.fill(c[0], { noShade: true }); } G.pen.circle(x * S, y * S, sk.rx * 0.07 * S); G.fill(shade(c[0], -0.2), { noShade: true }); } },
  // face
  { id: "glasses", label: "Glasses", slot: "eyes", colors: ["#1a1a1a"],
    face: (G, c) => { const { sk } = G, S = G.S; const [e0, e1] = sk.face.eyes; const r = sk.R * 0.2; for (const e of [e0, e1]) if (e.visible) { G.pen.ellipse(e.x * S, e.y * S, r * e.scaleX * S, r * S); G.line(c[0], 0.004, { feature: true }); } if (e0.visible) { G.pen.poly([[(e0.x + r * e0.scaleX) * S, e0.y * S], [(e1.x - r) * S, e1.y * S]], false); G.line(c[0], 0.003, { feature: true }); } } },
  { id: "sunglasses", label: "Sunglasses", slot: "eyes", colors: ["#141414"],
    face: (G, c) => { const { sk } = G, S = G.S; const [e0, e1] = sk.face.eyes; const r = sk.R * 0.22; for (const e of [e0, e1]) if (e.visible) { G.pen.rpoly([[(e.x - r * e.scaleX) * S, (e.y - r * 0.7) * S], [(e.x + r * e.scaleX) * S, (e.y - r * 0.7) * S], [(e.x + r * 0.85 * e.scaleX) * S, (e.y + r * 0.75) * S], [(e.x - r * 0.85 * e.scaleX) * S, (e.y + r * 0.75) * S]], r * 0.4 * S); G.fill(c[0], { feature: true }); } if (e0.visible) { G.pen.poly([[(e0.x + r * e0.scaleX) * S, (e0.y - r * 0.4) * S], [(e1.x - r) * S, (e1.y - r * 0.4) * S]], false); G.line(c[0], 0.004, { feature: true }); } } },
  { id: "earrings", label: "Earrings", slot: "ears", colors: ["#e0b040"],
    face: (G, c) => { const { sk } = G, S = G.S; for (const e of sk.face.ears) if (e.visible) { G.pen.circle(e.x * S, (e.y + sk.R * 0.24) * S, sk.R * 0.06 * S); G.fill(c[0], { feature: true }); } } },
];

const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const itemById = (id) => BY_ID[id];

/**
 * Clean up a list of worn items: unknown ids dropped, colours filled in, one
 * item per slot (the later one wins), a "full" item replaces top and bottom.
 * Returns { wear, problems }.
 */
export function normalizeWear(list) {
  const problems = [];
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const id = typeof raw === "string" ? raw : raw?.id;
    const item = BY_ID[id];
    if (!item) { problems.push(`"${id}" is not in the wardrobe`); continue; }
    const colors = item.colors.map((d, i) => (/^#[0-9a-f]{6}$/i.test(raw?.colors?.[i] ?? "") ? raw.colors[i].toLowerCase() : d));
    const pattern = PATTERNS.includes(raw?.pattern) && item.patterns ? raw.pattern : "none";
    if (raw?.pattern && raw.pattern !== "none" && pattern === "none") problems.push(`${item.label} can't have the pattern "${raw.pattern}"`);
    if (!MULTI.has(item.slot)) {
      const clashes = (w) => w.slot === item.slot || (item.slot === "full" && (w.slot === "top" || w.slot === "bottom")) || ((item.slot === "top" || item.slot === "bottom") && w.slot === "full");
      for (let k = out.length - 1; k >= 0; k--) if (clashes(out[k])) { problems.push(`${item.label} replaces ${BY_ID[out[k].id].label}`); out.splice(k, 1); }
    }
    out.push({ id, slot: item.slot, colors, pattern });
  }
  return { wear: out, problems };
}
