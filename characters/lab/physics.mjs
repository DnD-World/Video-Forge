// ---------------------------------------------------------------------------
// 2D lab (4 Nov 2026): gravity and wind on hair and clothes.
//
// Hair and hems are short chains of points (Verlet: each point remembers
// where it was, so speed and swing come for free). Gravity pulls them down,
// the scene's wind pushes them, a soft "shape memory" keeps cartoon hair
// looking like its drawing, and the drawn shapes are bent along the chains
// (draw.mjs hairField / hemField) — so hair stays a readable cartoon shape.
//
// MODESTY IS BUILT IN: a hem can swing sideways and trail, but its lift is
// capped (HEM_LIFT_MAX) and every frame reports how high it went, for the
// automatic check. No chest movement exists anywhere.
//
// Deterministic: fixed 120 steps a second from frame 0; the same clip gives
// the same frames.
// ---------------------------------------------------------------------------

import { clamp, fbm, lerp, noise1 } from "./anim.mjs";

export const STEP = 1 / 120;
export const GRAVITY = 2.6;             // body heights per s² (a cartoon is a little floaty)
export const HEM_LIFT_MAX = 0.01;       // a hem may rise at most 1% of the body height
// and swing at most this far sideways: a dress never slides off the hips and legs under it
// (5 Nov 2026: at 0.075 the handshake's step-in swung the skirt clear of her hips)
export const HEM_SWAY_MAX = 0.02;

// ---- wind: a steady push, slow gusts, and swirls that drift with it ------------------------------
export function windAt(w, x, y, t) {
  if (!w || !w.strength) return [0, 0];
  const gust = clamp(0.55 + 0.45 * noise1(t * 0.32, 41) + 0.5 * Math.max(0, noise1(t * 0.7, 43)) * (w.gusty ?? 0.6), 0, 1.6);
  const s = w.strength * gust;
  const tx = fbm(x * 1.6 - t * 0.8 * (w.dir ?? 1), 51), ty = fbm(y * 1.4 + t * 0.6, 53);
  return [(w.dir ?? 1) * s + tx * s * 0.55, ty * s * 0.35 - s * 0.06];
}

// ---- chains ----------------------------------------------------------------------------------------
function chain(n, len) {
  return { n, seg: len / (n - 1), p: Array.from({ length: n }, () => [0, 0]), q: Array.from({ length: n }, () => [0, 0]), init: false };
}
function stepChain(c, anchor, down, o) {
  // stiff: how hard each link springs back to the drawing's direction (per s², root → tip)
  const { wind, t, stiff = [300, 60], damp = 0.03, drag = 2.2, gravity = GRAVITY, colliders = [] } = o;
  if (!c.init) {
    for (let i = 0; i < c.n; i++) { c.p[i] = [anchor[0] + down[0] * c.seg * i, anchor[1] + down[1] * c.seg * i]; c.q[i] = c.p[i].slice(); }
    c.init = true;
  }
  const dt = STEP, calm = wind?.strength ? 1 : 0.25;
  c.q[0] = c.p[0]; c.p[0] = anchor.slice();
  for (let i = 1; i < c.n; i++) {
    const p = c.p[i], q = c.q[i], a = c.p[i - 1];
    const vx = (p[0] - q[0]) / dt, vy = (p[1] - q[1]) / dt;
    const wv = windAt(wind, p[0], p[1], t);
    // shape memory is a spring towards where the drawing puts this point, so wind and gravity can win it
    const K = lerp(stiff[0], stiff[1], (i - 1) / Math.max(1, c.n - 2));
    const mx = (a[0] + down[0] * c.seg - p[0]) * K, my = (a[1] + down[1] * c.seg - p[1]) * K;
    const ax = (wv[0] - vx) * drag * calm + mx, ay = gravity + (wv[1] - vy) * drag * calm + my;
    c.q[i] = p.slice();
    p[0] += (p[0] - q[0]) * (1 - damp) + ax * dt * dt;
    p[1] += (p[1] - q[1]) * (1 - damp) + ay * dt * dt;
  }
  for (let it = 0; it < 4; it++) {
    for (let i = 1; i < c.n; i++) {
      const a = c.p[i - 1], b = c.p[i];
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6, e = (d - c.seg) / d;
      if (i === 1) { b[0] -= dx * e; b[1] -= dy * e; } else { a[0] += dx * e * 0.5; a[1] += dy * e * 0.5; b[0] -= dx * e * 0.5; b[1] -= dy * e * 0.5; }
    }
    for (const col of colliders) for (let i = 1; i < c.n; i++) pushOut(c.p[i], col);
  }
}
// keep a point outside a capsule (a leg) {a, b, r}
function pushOut(p, { a, b, r }) {
  const abx = b[0] - a[0], aby = b[1] - a[1], L = abx * abx + aby * aby || 1e-9;
  const k = clamp(((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / L);
  const cx = a[0] + abx * k, cy = a[1] + aby * k, dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy);
  if (d < r && d > 1e-6) { p[0] = cx + (dx / d) * r; p[1] = cy + (dy / d) * r; }
}
// the point a distance s along a chain
function along(c, s) {
  const f = clamp(s / c.seg, 0, c.n - 1.0001), i = Math.floor(f), k = f - i;
  return [lerp(c.p[i][0], c.p[i + 1][0], k), lerp(c.p[i][1], c.p[i + 1][1], k)];
}

// how long and how stiff each hairstyle is (head heights; stiffness root → tip)
const HAIR = {
  long: { len: 2.5, stiff: [260, 45], drag: 4.5 }, ponytail: { len: 2.3, stiff: [220, 35], drag: 4.5 }, pigtails: { len: 1.9, stiff: [260, 50], drag: 4.5 },
  bob: { len: 1.25, stiff: [420, 140], drag: 4 }, curly: { len: 1.3, stiff: [500, 180], drag: 3.5 }, bun: { len: 0.6, stiff: [1400, 800], drag: 2 },
  default: { len: 0.7, stiff: [1100, 500], drag: 3 },
};

/**
 * One character's loose parts. new Loose(card) then, every step,
 * loose.step(world, t) with world = { head: {x, y, rot, rx, ry}, waist: {x, y, hx},
 * legs: [[hip, knee, foot] × 2] (stage units), mirror, wind, view }.
 * fields() gives the hairField / hemField for draw.mjs.
 */
export class Loose {
  constructor(card) {
    this.card = card;
    const h = HAIR[card.hair] ?? HAIR.default;
    this.hairSpec = h;
    this.hair = null; this.hem = null;
    this.maxLift = 0; this.lift = 0;
    this.readLift = () => 0; this.readSway = () => 0;
  }
  step(W, t) {
    const { head, waist, mirror, wind } = W;
    const m = mirror ? -1 : 1, c = Math.cos(head.rot * m), s = Math.sin(head.rot * m);
    const toWorld = ([lx, ly]) => [head.x + (lx * m) * c - ly * s, head.y + (lx * m) * s + ly * c];
    const down = [-s, c];
    if (!this.hair) {
      const len = this.hairSpec.len * head.ry;
      this.hairX = [-0.8, 0, 0.8].map((k) => k * head.rx);
      this.pivotY = -0.3 * head.ry;
      this.hair = this.hairX.map(() => chain(6, len));
    }
    this.hair.forEach((ch, j) => stepChain(ch, toWorld([this.hairX[j], this.pivotY]), down, { wind, t, stiff: this.hairSpec.stiff, drag: this.hairSpec.drag }));
    // the hem: three chains from the waist down to the floor
    if (!this.hem) {
      this.hemX = [-1.15, 0, 1.15].map((k) => k * waist.hx);
      this.hemLen = Math.min(0.32, -waist.y0); // a dress or skirt, not a gown
      this.hem = this.hemX.map(() => chain(5, this.hemLen));
    }
    const legCaps = (W.view ?? 0) > 1.2 ? (W.legs ?? []).flatMap(([hip, knee, foot]) => [{ a: hip, b: knee, r: W.legR }, { a: knee, b: foot, r: W.legR }]) : [];
    this.hem.forEach((ch, j) => stepChain(ch, [waist.x + this.hemX[j] * m, waist.y], [0, 1], { wind, t, stiff: [700, 160], damp: 0.05, drag: 3, colliders: legCaps }));
    this.headNow = { ...head, m, c, s }; this.waistNow = { ...waist, m };
  }
  fields() {
    if (!this.hair) return {};
    const H = this.headNow, Wt = this.waistNow, hairX = this.hairX, pivotY = this.pivotY;
    const toLocal = ([wx, wy]) => {
      const dx = wx - H.x, dy = wy - H.y;
      return [(dx * H.c + dy * H.s) * H.m, -dx * H.s + dy * H.c];
    };
    // displacement of each chain at depth d below its root, in head space (units)
    const hairDisp = (j, d) => { const w = toLocal(along(this.hair[j], d)); return [w[0] - hairX[j], w[1] - (pivotY + d)]; };
    const interp = (xs, x, f) => {
      if (x <= xs[0]) return f(0);
      if (x >= xs[2]) return f(2);
      const j = x < xs[1] ? 0 : 1, k = (x - xs[j]) / (xs[j + 1] - xs[j]);
      const a = f(j), b = f(j + 1);
      return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
    };
    const hairField = ([px, py], sk, S) => {
      const x = px / S, y = py / S, d = y - pivotY;
      if (d <= 0) return [px, py];
      const w = clamp(d / (sk.ry * 0.7)) ** 1.4;
      const v = interp(hairX, x, (j) => hairDisp(j, d));
      return [px + v[0] * w * S, py + v[1] * w * S];
    };
    // the hem: sideways sway capped, lift capped hard (modesty)
    let lift = 0, sway = 0;
    const hemDisp = (j, d) => {
      const p = along(this.hem[j], d);
      return [(p[0] - Wt.x) * Wt.m - this.hemX[j], p[1] - (Wt.y + d)];
    };
    const hemField = ([px, py], sk, S) => {
      const x = px / S, y = py / S, d = y - sk.waistY;
      if (d <= 0) return [px, py];
      const w = clamp(d / (this.hemLen * 0.7)) ** 1.3;
      const v = interp(this.hemX, x, (j) => hemDisp(j, d));
      const dx = clamp(v[0] * w, -HEM_SWAY_MAX, HEM_SWAY_MAX);
      const dy = Math.max(-HEM_LIFT_MAX, v[1] * w);
      lift = Math.max(lift, -dy);
      sway = Math.max(sway, Math.abs(dx));
      return [px + dx * S, py + dy * S];
    };
    this.readLift = () => lift;
    this.readSway = () => sway;
    return { hairField, hemField };
  }
}

// ---- leaves and petals: the wind made visible -------------------------------------------------------
export class Leaves {
  constructor(n = 28, seed = 1, box = [-1.6, -1.4, 1.6, 0]) { this.n = n; this.seed = seed; this.box = box; this.reset(); }
  reset() {
    const [x0, y0, x1, y1] = this.box;
    this.p = Array.from({ length: this.n }, (_, i) => ({
      x: lerp(x0, x1, ((i * 0.618 + this.seed * 0.37) % 1)), y: lerp(y0, y1 - 0.1, ((i * 0.377 + 0.2) % 1)),
      vx: 0, vy: 0, a: i * 1.7, va: 0, size: 0.02 + ((i * 0.53) % 1) * 0.02, hue: i % 3,
    }));
  }
  step(wind, t) {
    const [x0, y0, x1, y1] = this.box;
    for (const l of this.p) {
      const w = windAt(wind, l.x, l.y, t);
      // a leaf falls slowly and flutters: drag towards the wind, a sideways wobble
      l.vx += ((w[0] - l.vx) * 2.4 + Math.sin(t * 5 + l.a) * 0.25) * STEP;
      l.vy += ((0.22 - l.vy) * 1.6 + w[1] * 1.5) * STEP;
      l.x += l.vx * STEP; l.y += l.vy * STEP;
      l.a += (2 + Math.abs(l.vx) * 6) * STEP * (l.hue === 1 ? -1 : 1);
      if (l.y > y1) { l.y = y1; l.vy = 0; l.vx *= 0.9; if (Math.abs(w[0]) > 0.5) l.vy = -0.4 * Math.abs(w[0]); }
      if (l.x > x1 + 0.1) { l.x = x0 - 0.1; l.y = lerp(y0, y1 - 0.4, (l.a * 0.13) % 1); }
      if (l.x < x0 - 0.1) { l.x = x1 + 0.1; }
    }
  }
}

// ---- a cloth flag on a pole (the Red Flag sting) ----------------------------------------------------
export class Flag {
  constructor(cols = 12, rows = 8, w = 0.9, h = 0.55) {
    this.cols = cols; this.rows = rows; this.dx = w / (cols - 1); this.dy = h / (rows - 1);
    this.p = []; this.q = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { this.p.push([c * this.dx, r * this.dy]); this.q.push([c * this.dx, r * this.dy]); }
  }
  step(pole, wind, t) {
    const { cols, rows } = this;
    for (let i = 0; i < this.p.length; i++) {
      const c = i % cols, p = this.p[i], q = this.q[i];
      if (c === 0) { const r = Math.floor(i / cols); this.q[i] = p.slice(); this.p[i] = [pole[0], pole[1] + r * this.dy]; continue; }
      const w = windAt(wind, p[0], p[1], t);
      const vx = (p[0] - q[0]) / STEP, vy = (p[1] - q[1]) / STEP;
      // cloth in a strong wind flutters: a ripple runs from the pole to the free edge
      const k = c / (cols - 1);
      const ax = (w[0] - vx) * 1.8 + Math.sin(c * 0.9 - t * 15) * 14 * k, ay = GRAVITY * 0.5 + (w[1] - vy) * 1.8 + Math.sin(c * 0.75 - t * 13 + Math.floor(i / cols) * 0.3) * 48 * k;
      this.q[i] = p.slice();
      p[0] += (p[0] - q[0]) * 0.99 + ax * STEP * STEP; p[1] += (p[1] - q[1]) * 0.99 + ay * STEP * STEP;
    }
    const link = (i, j, L) => {
      const a = this.p[i], b = this.p[j], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6, e = ((d - L) / d) * 0.5;
      const fa = i % cols === 0 ? 0 : 1, fb = j % cols === 0 ? 0 : 1, sum = fa + fb || 1;
      a[0] += dx * e * (2 * fa / sum); a[1] += dy * e * (2 * fa / sum); b[0] -= dx * e * (2 * fb / sum); b[1] -= dy * e * (2 * fb / sum);
    };
    for (let it = 0; it < 6; it++) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (c < cols - 1) link(i, i + 1, this.dx);
      if (r < rows - 1) link(i, i + cols, this.dy);
      if (c < cols - 1 && r < rows - 1) link(i, i + cols + 1, Math.hypot(this.dx, this.dy));
    }
  }
}

/** A body falling like a plank about its feet: angle over time, with a bounce. Precomputed. */
export function toppleCurve({ height = 1, start = 0.04, restitution = 0.22, ms = 2200 } = {}) {
  const out = [];
  let th = start, w = 0.4;
  const k = (1.5 * GRAVITY * 3.2) / height;
  for (let t = 0; t <= ms; t += 1000 / 240) {
    w += k * Math.sin(th) * (1 / 240);
    th += w * (1 / 240);
    if (th >= Math.PI / 2) { th = Math.PI / 2; w = -w * restitution; if (Math.abs(w) < 0.3) w = 0; }
    out.push(th);
  }
  return (ms2) => out[clamp(Math.round(ms2 / (1000 / 240)), 0, out.length - 1)];
}
