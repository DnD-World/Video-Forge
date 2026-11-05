// ---------------------------------------------------------------------------
// 2D lab (5 Nov 2026): words on screen and scene transitions, all drawn in
// code, deterministic (the same t always gives the same picture).
//
//   TEXT STYLES   clean   a lower third: a bar slides in, the words rise behind a mask
//                 kinetic kinetic type: word by word, overshoot and settle, the key words big and red
//                 pop     cartoon call-to-action: letters pop with a squash, a sticker edge, a wiggle
//                 marker  hand-written: a pen writes the line, then rings the key words
//   TRANSITIONS   flag (a red cloth sweeps across), eye (a match cut through the eyes), shatter, memory (a film burn into a flashback)
//
// Timings follow common motion-design practice (docs/research/pro-2d-techniques-2026-11.md);
// where no source gave a number, they are our choice, tuned by eye.
// ---------------------------------------------------------------------------

import { hash } from "../core/math.mjs";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const outCubic = (k) => 1 - (1 - k) ** 3;
const inOut = (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);
const outBack = (k, s = 1.9) => 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2;
// a spring settling on 1 (overshoot, then smaller and smaller wobbles)
const settle = (k, f = 3.2, d = 5) => (k <= 0 ? 0 : 1 - Math.exp(-d * k) * Math.cos(f * Math.PI * k));

export const RED = "#e0233a", CREAM = "#fff3e6", INK = "#1a0d12";

/** The line, split into words; `hot` words carry the emphasis. */
export const LINE = { words: ["That's", "a", "red", "flag."], hot: [2, 3] };

export const TEXT_LEN = 4200;

function backdrop(ctx, W, H, t, hue = 0) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, hue ? "#20323f" : "#3b1a22"); g.addColorStop(1, hue ? "#0e171f" : "#170a0e");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // soft drifting bokeh, so motion reads against something
  for (let i = 0; i < 9; i++) {
    const x = ((hash(i, 3) * 1.4 + t * 0.00002 * (1 + hash(i, 5))) % 1.2 - 0.1) * W, y = hash(i, 7) * H, r = (0.04 + hash(i, 9) * 0.09) * H;
    const b = ctx.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, `rgba(255,${hue ? 220 : 160},${hue ? 200 : 140},0.10)`); b.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = b; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

// ---- 1 · clean lower third ------------------------------------------------------------------------------
function clean(ctx, W, H, t) {
  const u = H / 100, x0 = W * 0.07, y0 = H * 0.62;
  const inK = outCubic(clamp(t / 500)), out = inOut(clamp((t - 3300) / 450));
  ctx.save();
  ctx.translate(-out * W * 0.12, 0); ctx.globalAlpha = 1 - out;
  // the accent bar grows first, then the panel
  const bw = W * 0.62 * outCubic(clamp((t - 120) / 520));
  ctx.fillStyle = "rgba(12,6,9,0.78)"; ctx.fillRect(x0, y0, bw, u * 22);
  ctx.fillStyle = RED; ctx.fillRect(x0, y0, u * 1.4, u * 22 * inK);
  // the words rise into place behind a mask, one after the other
  ctx.beginPath(); ctx.rect(x0, y0, bw, u * 22); ctx.clip();
  // a soft sheen crosses the bar once it is in
  const sh = (t - 900) / 700;
  if (sh > 0 && sh < 1) { const gx = x0 + bw * lerp(-0.3, 1.3, sh), g = ctx.createLinearGradient(gx - u * 12, 0, gx + u * 12, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.10)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(x0, y0, bw, u * 22); }
  ctx.font = `700 ${u * 9.5}px Sora, system-ui`; ctx.textBaseline = "alphabetic";
  let x = x0 + u * 4;
  LINE.words.forEach((w, i) => {
    const k = outCubic(clamp((t - 380 - i * 70) / 420));
    ctx.fillStyle = LINE.hot.includes(i) ? "#ff5d6e" : CREAM;
    ctx.fillText(w, x, y0 + u * 13 + (1 - k) * u * 14);
    x += ctx.measureText(w + " ").width;
  });
  ctx.font = `600 ${u * 4.2}px Sora, system-ui`; ctx.fillStyle = "rgba(255,243,230,0.6)";
  ctx.fillText("CHLOE · SUNDAY", x0 + u * 4, y0 + u * 19 + (1 - outCubic(clamp((t - 700) / 400))) * u * 8);
  ctx.restore();
}

// ---- 2 · kinetic typography -----------------------------------------------------------------------------
function kinetic(ctx, W, H, t) {
  const u = H / 100;
  // each word lands with an overshoot; the key words are huge and the frame pushes in on them
  const push = 1 + 0.06 * inOut(clamp((t - 1200) / 2000));
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.rotate(-0.03 * inOut(clamp((t - 1200) / 2000)));
  const rows = [[0, 1], [2, 3]];
  const size = (i) => (LINE.hot.includes(i) ? u * 21 : u * 9);
  const out = clamp((t - 3550) / 350);
  rows.forEach((row, r) => {
    ctx.font = `900 ${size(row[0])}px Fraunces, Georgia, serif`;
    const widths = row.map((i) => { ctx.font = `900 ${size(i)}px Fraunces, Georgia, serif`; return ctx.measureText(LINE.words[i]).width; });
    const gap = u * 2.4, total = widths.reduce((a, b) => a + b, 0) + gap * (row.length - 1);
    let x = -total / 2;
    row.forEach((i, j) => {
      const start = 150 + i * 260, k = clamp((t - start) / 520);
      if (k <= 0) { x += widths[j] + gap; return; }
      const s = settle(k), y = r === 0 ? -u * 14 : u * 12;
      ctx.save();
      ctx.translate(x + widths[j] / 2, y + (1 - outCubic(k)) * u * 8 - out * u * 40 * (r ? -1 : 1));
      ctx.rotate((1 - s) * (i % 2 ? 0.25 : -0.2));
      ctx.scale(lerp(1.7, 1, s) * (1 - out * 0.4), lerp(1.7, 1, s) * (1 - out * 0.4));
      ctx.globalAlpha = clamp(k * 3) * (1 - out);
      ctx.font = `900 ${size(i)}px Fraunces, Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (LINE.hot.includes(i)) {
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillText(LINE.words[i], u * 0.8, u * 1.1);
        ctx.fillStyle = RED;
      } else ctx.fillStyle = CREAM;
      ctx.fillText(LINE.words[i], 0, 0);
      ctx.restore();
      x += widths[j] + gap;
    });
  });
  // a quick underline slash under the key words
  const lk = outCubic(clamp((t - 1100) / 300)) * (1 - out);
  if (lk > 0) { ctx.strokeStyle = CREAM; ctx.lineWidth = u * 1.1; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-W * 0.3, u * 25); ctx.lineTo(-W * 0.3 + W * 0.6 * lk, u * 23); ctx.stroke(); }
  ctx.restore();
}

// ---- 3 · cartoon pop (a call to action) -----------------------------------------------------------------
function pop(ctx, W, H, t) {
  const u = H / 100, text = "THAT'S A RED FLAG!", size = u * 19;
  ctx.save(); ctx.translate(W / 2, H / 2);
  ctx.font = `${size}px Bangers, Impact, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const chars = [...text], widths = chars.map((c) => ctx.measureText(c).width + u * 0.2);
  const total = widths.reduce((a, b) => a + b, 0);
  const out = clamp((t - 3600) / 300);
  // a burst behind, once the line has landed
  const bk = outBack(clamp((t - 750) / 380)) * (1 - out);
  if (bk > 0) {
    ctx.save(); ctx.rotate(t * 0.0003); ctx.scale(bk, bk);
    ctx.beginPath();
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, r = (i % 2 ? 0.26 : 0.36) * W; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.55); }
    ctx.closePath(); ctx.fillStyle = "#ffcf33"; ctx.fill();
    ctx.lineWidth = u * 1.2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  }
  let x = -total / 2;
  chars.forEach((c, i) => {
    const k = clamp((t - 80 - i * 38) / 360);
    const w = widths[i];
    if (k > 0 && c !== " ") {
      const s = outBack(k, 2.4) * (1 - out);
      // a squash on landing, then a gentle idle wiggle
      const sq = Math.max(0, Math.sin(k * Math.PI)) * 0.18;
      const wig = Math.sin(t * 0.008 + i * 0.9) * 0.05 * clamp((t - 1400) / 300);
      ctx.save();
      ctx.translate(x + w / 2, Math.sin(t * 0.006 + i * 0.7) * u * 0.8 * clamp((t - 1400) / 300));
      ctx.rotate((hash(i, 4) - 0.5) * 0.22 + wig);
      ctx.scale(s * (1 + sq), s * (1 - sq));
      const hot = i >= 9;
      ctx.lineJoin = "round";
      ctx.lineWidth = u * 3.2; ctx.strokeStyle = "#ffffff"; ctx.strokeText(c, 0, 0); // the sticker edge
      ctx.fillStyle = "rgba(26,13,18,0.55)"; ctx.fillText(c, u * 0.9, u * 1.2); // a drop shadow
      ctx.lineWidth = u * 1.2; ctx.strokeStyle = INK; ctx.strokeText(c, 0, 0);
      ctx.fillStyle = hot ? RED : "#2b6cff"; ctx.fillText(c, 0, 0);
      ctx.restore();
    }
    x += w;
  });
  ctx.restore();
}

// ---- 4 · marker write-on --------------------------------------------------------------------------------
function marker(ctx, W, H, t) {
  const u = H / 100;
  // paper
  ctx.fillStyle = "#f6efe2"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = "rgba(120,160,200,0.18)"; ctx.fillRect(0, H * (0.2 + i * 0.13), W, Math.max(1, u * 0.25)); }
  ctx.fillStyle = "rgba(224,35,58,0.3)"; ctx.fillRect(W * 0.1, 0, Math.max(1, u * 0.3), H);
  const text = "That's a red flag.", size = u * 16;
  ctx.font = `${size}px "Permanent Marker", "Comic Sans MS", cursive`; ctx.textBaseline = "alphabetic";
  const tw = ctx.measureText(text).width, x0 = (W - tw) / 2, y0 = H * 0.56;
  const out = clamp((t - 3700) / 350);
  ctx.save(); ctx.globalAlpha = 1 - out;
  // the pen moves at a writing pace, a little uneven (people slow down on round letters)
  const w = clamp((t - 200) / 1700), pace = w + Math.sin(w * 22) * 0.012;
  const reveal = tw * clamp(pace);
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - u * 2, 0, reveal + u * 2, H); ctx.clip();
  ctx.fillStyle = "#1b2440"; ctx.fillText(text, x0, y0);
  const hotX = x0 + ctx.measureText("That's a ").width;
  ctx.restore();
  // re-ink the key words red once they are written
  if (reveal > tw * 0.98) {
    ctx.save(); ctx.globalAlpha = (1 - out) * clamp((t - 2000) / 200); ctx.fillStyle = RED;
    ctx.fillText("red flag.", hotX, y0); ctx.restore();
  }
  // a hand-drawn ring round "red flag", drawn on like a stroke
  const rk = inOut(clamp((t - 2200) / 650));
  if (rk > 0) {
    const cx = hotX + ctx.measureText("red flag.").width * 0.5, cy = y0 - size * 0.3, rx = ctx.measureText("red flag.").width * 0.58, ry = size * 0.66;
    ctx.beginPath();
    const n = 60;
    for (let i = 0; i <= n * rk; i++) {
      const a = -2.6 + (i / n) * Math.PI * 2.15, wob = 1 + (hash(i >> 3, 2) - 0.5) * 0.06;
      ctx.lineTo(cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob);
    }
    ctx.strokeStyle = RED; ctx.lineWidth = u * 1.3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
  }
  // the pen nib, while writing
  if (w > 0 && w < 1) {
    const nx = x0 + reveal, ny = y0 - size * 0.25 + Math.sin(t * 0.05) * u * 2;
    ctx.save(); ctx.translate(nx, ny); ctx.rotate(-0.7);
    ctx.fillStyle = "#1b2440"; ctx.fillRect(0, -u * 1.6, u * 22, u * 3.2);
    ctx.fillStyle = RED; ctx.fillRect(u * 22, -u * 1.6, u * 6, u * 3.2);
    ctx.restore();
  }
  ctx.restore();
}

const STYLES = { clean, kinetic, pop, marker };

/** A text-style scene for the lab page's Stage. */
export function textScene(style) {
  return {
    len: TEXT_LEN,
    draw(ctx, W, H, t) {
      if (style !== "marker") backdrop(ctx, W, H, t, style === "clean" ? 1 : 0);
      STYLES[style](ctx, W, H, t);
    },
  };
}

// ---- transitions (round 2, 5 Nov 2026: Ak found the first four "meh") ------------------------------------
// Four that carry meaning in a drama, not just a wipe:
//   flag     a red cloth sweeps across the frame, rippling, the "!" on it (the show's own mark)
//   eye      a match cut through the eyes: into one person's eye, out of the other's
//   shatter  the frame cracks and falls apart in shards (a moment that breaks something)
//   memory   a warm film burn into a flashback: light leaks, burnt edges, the new shot in sepia
export const TRANSITIONS = ["flag", "eye", "shatter", "memory"];
const HOLD = 1400, MOVES = { flag: 1250, eye: 1200, shatter: 1500, memory: 1500 };
const SLOTS = TRANSITIONS.map((k) => HOLD + MOVES[k]);
const SLOT_T0 = SLOTS.map((_, i) => SLOTS.slice(0, i).reduce((a, b) => a + b, 0));

/** Shots A and B with a transition between them, the four kinds in turn. A shot draws itself and returns drawCharacter's info. */
export function transitionScene(shotA, shotB) {
  const cache = {};
  const canvasFor = (name, W, H) => {
    let c = cache[name];
    if (!c || c.width !== W || c.height !== H) { c = cache[name] = document.createElement("canvas"); c.width = W; c.height = H; }
    const g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.filter = "none"; g.globalAlpha = 1;
    return [c, g];
  };
  const total = SLOTS.reduce((a, b) => a + b, 0);
  return {
    len: total,
    label: (t) => TRANSITIONS[SLOT_T0.findLastIndex((s) => t >= s)],
    draw(ctx, W, H, t) {
      const i = Math.max(0, SLOT_T0.findLastIndex((s) => t >= s)), kind = TRANSITIONS[i], lt = t - SLOT_T0[i];
      const [from, to] = i % 2 ? [shotB, shotA] : [shotA, shotB];
      const k = clamp((lt - HOLD) / MOVES[kind]);
      if (k <= 0) { from(ctx, W, H, t); return; }
      if (k >= 1) { to(ctx, W, H, t); return; }
      const [a, ac] = canvasFor("a", W, H), [b, bc] = canvasFor("b", W, H);
      const ia = from(ac, W, H, t), ib = to(bc, W, H, t);
      ({ flag: flagSweep, eye: eyeCut, shatter, memory })[kind](ctx, W, H, t, k, a, b, ia, ib, from, to);
    },
  };
}

// ---- 1 · the red flag sweeps across ----------------------------------------------------------------------
function flagSweep(ctx, W, H, t, k, a, b) {
  // the cloth: from its trailing edge to its leading edge; a travelling ripple runs through it
  const e = inOut(k), clothW = W * 1.05;
  const lead = lerp(-0.05 * W, W + clothW, e), trail = lead - clothW;
  const edge = (x0, y, ph) => x0 + Math.sin(y / H * 5.5 + ph) * W * 0.035 + Math.sin(y / H * 13 + ph * 1.7) * W * 0.012;
  const ph = t * 0.012;
  ctx.drawImage(b, 0, 0);
  // the old shot, up to the leading edge
  ctx.save(); ctx.beginPath(); ctx.moveTo(W + 10, -10); ctx.lineTo(W + 10, H + 10);
  for (let y = H + 10; y >= -10; y -= H / 24) ctx.lineTo(edge(lead, y, ph + 2) - 1, y);
  ctx.closePath(); ctx.clip(); ctx.drawImage(a, 0, 0); ctx.restore();
  // the cloth in vertical strips, each lit by the fold it sits on
  const N = 70;
  for (let s = 0; s < N; s++) {
    const u0 = s / N, u1 = (s + 1) / N, xa = lerp(trail, lead, u0), xb = lerp(trail, lead, u1);
    if (xb < -W * 0.1 || xa > W * 1.1) continue;
    const fold = Math.sin(u0 * 18 - t * 0.02) * 0.5 + Math.sin(u0 * 7 + t * 0.008) * 0.5;
    const light = 0.62 + 0.38 * fold, r = Math.round(lerp(120, 236, light)), g = Math.round(lerp(10, 40, light)), bl = Math.round(lerp(22, 58, light));
    ctx.beginPath();
    for (let y = -10; y <= H + 10; y += H / 24) ctx.lineTo(edge(xa, y, ph + u0 * 2), y);
    for (let y = H + 10; y >= -10; y -= H / 24) ctx.lineTo(edge(xb, y, ph + u1 * 2) + 1, y);
    ctx.closePath(); ctx.fillStyle = `rgb(${r},${g},${bl})`; ctx.fill();
  }
  // a soft shadow the cloth throws on the new shot just behind it
  const sg = ctx.createLinearGradient(trail - W * 0.12, 0, trail, 0);
  sg.addColorStop(0, "rgba(0,0,0,0)"); sg.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = sg; ctx.fillRect(trail - W * 0.12, 0, W * 0.12, H);
  // the show's "!" printed on the cloth, riding the ripple
  const mx = lerp(trail, lead, 0.5), u = H / 100;
  if (mx > -W * 0.2 && mx < W * 1.2) {
    ctx.save(); ctx.translate(edge(mx, H * 0.45, ph + 1), H * 0.45); ctx.rotate(Math.sin(t * 0.01) * 0.05); ctx.globalAlpha = 0.9;
    ctx.fillStyle = CREAM; ctx.beginPath(); ctx.roundRect(-u * 3.2, -u * 22, u * 6.4, u * 30, u * 3.2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, u * 15, u * 3.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ---- 2 · the match cut through the eyes ------------------------------------------------------------------
function eyeCut(ctx, W, H, t, k, a, b, ia, ib, from, to) {
  const eyeOf = (info) => { const e = info?.eyes?.find((q) => q.visible) ?? null; return e ? [e.x, e.y, Math.max(4, e.r)] : [W / 2, H * 0.4, H * 0.03]; };
  const half = k < 0.5, kk = half ? k / 0.5 : (k - 0.5) / 0.5;
  const [ex, ey, er] = eyeOf(half ? ia : ib), img = half ? a : b;
  // into the first eye: a push that speeds up; out of the second: one that slows down
  const z = half ? 1 + (W / er) * 0.9 * kk ** 3 : 1 + (W / er) * 0.9 * (1 - kk) ** 3;
  ctx.fillStyle = "#07040a"; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(z, z);
  // the eye drifts to the centre as we go in
  const c = half ? kk : 1 - kk;
  ctx.translate(-lerp(W / 2, ex, Math.min(1, c * 1.6)), -lerp(H / 2, ey, Math.min(1, c * 1.6)));
  (half ? from : to)(ctx, W, H, t);
  ctx.restore();
  // the dark of the pupil takes the frame at the cut, and lets go of it after
  const dark = half ? clamp((kk - 0.55) / 0.45) : 1 - clamp(kk / 0.4);
  if (dark > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
    g.addColorStop(0, `rgba(7,4,10,${dark})`); g.addColorStop(lerp(0.2, 1, dark), `rgba(7,4,10,${dark})`); g.addColorStop(1, `rgba(7,4,10,${Math.min(1, dark * 1.6)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

// ---- 3 · the frame shatters --------------------------------------------------------------------------------
function shatter(ctx, W, H, t, k, a, b) {
  const cx = W * 0.56, cy = H * 0.42; // the point of impact
  // shards: a fan of wedges round the impact, cut again in rings (deterministic)
  const rings = [0, 0.12, 0.3, 0.6, 1.6], spokes = 13, shards = [];
  const ang = Array.from({ length: spokes }, (_, i) => (i / spokes) * Math.PI * 2 + (hash(i, 31) - 0.5) * 0.35);
  const ringR = (r, i) => rings[r] * Math.hypot(W, H) * (r ? 0.85 + hash(i * 7 + r, 33) * 0.3 : 0);
  const P = (r, i) => { const a0 = ang[i % spokes], R = ringR(r, i % spokes); return [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R]; };
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < spokes; i++) shards.push({ pts: [P(r, i), P(r, i + 1), P(r + 1, i + 1), P(r + 1, i)], r, i });
  ctx.drawImage(b, 0, 0);
  const pat = ctx.createPattern(a, "no-repeat");
  // the crack: a white flash of lines first, then the pieces fall
  const crack = clamp(k / 0.14), fall = clamp((k - 0.14) / 0.86);
  for (const s of shards) {
    const c = s.pts.reduce((m, p) => [m[0] + p[0] / 4, m[1] + p[1] / 4], [0, 0]);
    const delay = (s.r * 0.12 + hash(s.i, s.r + 40) * 0.18), f = clamp((fall - delay) / (1 - delay));
    const g = f * f, dx = (c[0] - cx) / W, dy = (c[1] - cy) / H;
    const tx = dx * W * 0.25 * f, ty = dy * H * 0.15 * f + g * H * 1.4, rot = (hash(s.i, s.r) - 0.5) * 2.4 * f, sc = 1 - f * 0.08;
    ctx.save();
    ctx.translate(c[0] + tx, c[1] + ty); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-c[0], -c[1]);
    ctx.beginPath(); s.pts.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    if (f > 0) { ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = H * 0.03; ctx.shadowOffsetY = H * 0.015; }
    ctx.fillStyle = pat; ctx.fill(); ctx.shadowColor = "transparent";
    ctx.save(); ctx.clip();
    // a glassy sheen on each falling piece
    if (f > 0) { const gl = ctx.createLinearGradient(c[0] - W * 0.1, c[1] - H * 0.1, c[0] + W * 0.1, c[1] + H * 0.1); gl.addColorStop(0, `rgba(255,255,255,${0.18 * f})`); gl.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gl; ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = `rgba(255,255,255,${0.75 * crack * (1 - f * 0.6)})`; ctx.lineWidth = Math.max(1, H * 0.003); ctx.stroke();
    ctx.restore();
  }
  // the hit itself: a quick white flash at the impact
  const flash = Math.max(0, 1 - k / 0.1);
  if (flash > 0) { const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.5); fg.addColorStop(0, `rgba(255,255,255,${0.8 * flash})`); fg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H); }
}

// ---- 4 · a film burn into a memory -----------------------------------------------------------------------------
function memory(ctx, W, H, t, k, a, b) {
  const burn = clamp(k / 0.55), out = clamp((k - 0.45) / 0.55);
  // the old shot, warming and over-exposing
  ctx.save(); ctx.filter = `sepia(${0.55 * burn}) saturate(${1 + burn * 0.6}) brightness(${1 + burn * 0.35})`; ctx.drawImage(a, 0, 0); ctx.restore();
  // the new one comes up as a faded old print
  if (out > 0) {
    ctx.save(); ctx.globalAlpha = inOut(out); ctx.filter = `sepia(${0.75 * (1 - out * 0.4)}) contrast(1.08) brightness(${1.25 - out * 0.25})`; ctx.drawImage(b, 0, 0); ctx.restore();
  }
  // light leaks: big soft orange and red blooms drifting in from the edge
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const leak = Math.sin(Math.PI * k);
  for (const [x, y, r, col] of [[0.1, 0.3, 0.7, "255,120,40"], [0.85, 0.75, 0.6, "255,60,40"], [0.5, -0.1, 0.5, "255,200,120"]]) {
    const px = W * (x + Math.sin(t * 0.002 + x * 9) * 0.06), py = H * y, R = Math.max(W, H) * r * (0.6 + leak * 0.6);
    const g = ctx.createRadialGradient(px, py, 0, px, py, R); g.addColorStop(0, `rgba(${col},${0.42 * leak})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  // burn holes: the film melts through from a ragged spot, a charred rim round an orange glow and a
  // white-hot middle, spreading unevenly
  const holes = [[0.3, 0.58, 0, 4], [0.68, 0.34, 0.12, 9]];
  for (const [x, y, d, sd] of holes) {
    const h = clamp((k - 0.12 - d) / 0.4) * (1 - clamp((k - 0.62 - d * 0.5) / 0.28));
    if (h <= 0) continue;
    const R0 = H * 0.42 * h ** 1.3, px = W * x, py = H * y;
    const ragged = (sc) => {
      ctx.beginPath();
      for (let i = 0; i <= 36; i++) {
        const an = (i / 36) * Math.PI * 2, n = 0.84 + 0.09 * Math.sin(an * 3 + sd) + 0.06 * Math.sin(an * 7 + sd * 2.3 + t * 0.003) + 0.03 * Math.sin(an * 13 + sd);
        ctx.lineTo(px + Math.cos(an) * R0 * sc * n, py + Math.sin(an) * R0 * sc * n * 0.86);
      }
      ctx.closePath();
    };
    ctx.save(); ctx.filter = `blur(${Math.max(1, H * 0.006)}px)`;
    ragged(1.12); ctx.fillStyle = `rgba(45,14,4,${0.85 * h})`; ctx.fill();
    ragged(1.0); ctx.fillStyle = `rgba(214,92,24,${0.95 * h})`; ctx.fill();
    ragged(0.82); ctx.fillStyle = `rgba(255,196,96,${h})`; ctx.fill();
    ragged(0.6); ctx.fillStyle = `rgba(255,250,232,${h})`; ctx.fill();
    ctx.restore();
  }
  // grain and a flicker, so it reads as film
  const fr = Math.floor(t / 42);
  ctx.save(); ctx.globalAlpha = 0.12 * Math.sin(Math.PI * k);
  for (let i = 0; i < 160; i++) { ctx.fillStyle = hash(fr, i) > 0.5 ? "#fff" : "#000"; ctx.fillRect(hash(fr, i + 500) * W, hash(fr, i + 900) * H, 2, 2); }
  ctx.restore();
}

// ---- subtitles (5 Nov 2026: Ak, "the text we need it more for subtitles than for call to action") ----------
// A short exchange, word-timed. Speakers keep their signature colour; *stars* mark the words
// that carry the line; an inner thought is shown differently from speech.
export const DIALOGUE = [
  { who: "chloe", name: "CHLOE", color: "#ff6fae", text: "I'm not upset. I'm just *tired* of pretending it's fine." },
  { who: "lucas", name: "LUCAS", color: "#7fb2ff", text: "You *always* make everything about you." },
  { who: "chloe", name: "CHLOE", color: "#ff6fae", text: "He always says that when *he's* wrong.", thought: true },
];
const WORD_MS = (w) => Math.max(200, 62 * w.replace(/[^a-z']/gi, "").length + 90);
function timed() {
  let t = 300;
  return DIALOGUE.map((l) => {
    const words = l.text.split(" ").map((raw) => {
      const hot = raw.includes("*"), w = raw.replace(/\*/g, ""), d = WORD_MS(w) + (/[.,?]$/.test(w) ? 220 : 0);
      const o = { w, hot, t0: t, t1: t + d };
      t += d;
      return o;
    });
    const line = { ...l, words, t0: words[0].t0, t1: t + 500 };
    t += 900;
    return line;
  });
}
const LINES = timed();
export const SUB_LEN = LINES[LINES.length - 1].t1 + 400;

const lineAt = (t) => LINES.find((l) => t >= l.t0 - 150 && t < l.t1) ?? null;

// one rounded box with soft edges behind text
function pill(ctx, x, y, w, h, a = 0.55) {
  ctx.save(); ctx.fillStyle = `rgba(8,4,10,${a})`; ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = h * 0.4;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h * 0.28); ctx.fill(); ctx.restore();
}
// break words into rows that fit
function wrap(ctx, words, maxW0) {
  // balanced rows: no single word left alone on the last line
  const total = ctx.measureText(words.map((o) => o.w).join(" ")).width;
  const maxW = Math.min(maxW0, total / Math.ceil(total / maxW0) * 1.12);
  const rows = [[]];
  let w = 0;
  for (const o of words) {
    const ww = ctx.measureText(o.w + " ").width;
    if (w + ww > maxW && rows[rows.length - 1].length) { rows.push([]); w = 0; }
    rows[rows.length - 1].push(o); w += ww;
  }
  return rows;
}
const fadeOf = (t, L) => clamp((t - L.t0 + 150) / 150) * (1 - clamp((t - L.t1 + 200) / 200));

const SUBS = {
  // 1 · classic: the whole phrase, white on a soft box, a short fade in and out
  classic(ctx, W, H, t, L) {
    const u = H / 100;
    ctx.font = `${L.thought ? "italic 500" : "600"} ${u * 5.6}px Sora, system-ui`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const rows = wrap(ctx, L.words, W * 0.78), lh = u * 7.4, y0 = H * 0.86 - (rows.length - 1) * lh;
    ctx.globalAlpha = fadeOf(t, L);
    rows.forEach((r, i) => {
      const txt = r.map((o) => o.w).join(" "), tw = ctx.measureText(txt).width, x = (W - tw) / 2, y = y0 + i * lh;
      pill(ctx, x - u * 2, y - lh * 0.48, tw + u * 4, lh * 0.96);
      ctx.fillStyle = L.thought ? "rgba(255,243,230,0.8)" : CREAM; ctx.fillText(txt, x, y);
    });
    ctx.globalAlpha = 1;
  },
  // 2 · karaoke: words light up as they are said, the current one in the speaker's colour with a small lift
  karaoke(ctx, W, H, t, L) {
    const u = H / 100;
    ctx.font = `700 ${u * 6}px Sora, system-ui`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const rows = wrap(ctx, L.words, W * 0.8), lh = u * 8, y0 = H * 0.85 - (rows.length - 1) * lh;
    ctx.globalAlpha = fadeOf(t, L);
    rows.forEach((r, i) => {
      const sp = ctx.measureText(" ").width, tw = r.reduce((s, o) => s + ctx.measureText(o.w).width, 0) + sp * (r.length - 1);
      let x = (W - tw) / 2;
      const y = y0 + i * lh;
      pill(ctx, x - u * 2.2, y - lh * 0.5, tw + u * 4.4, lh, 0.45);
      for (const o of r) {
        const ww = ctx.measureText(o.w).width, on = t >= o.t0, cur = on && t < o.t1;
        const pop = cur ? outBack(clamp((t - o.t0) / 160), 2.2) : 1;
        ctx.save(); ctx.translate(x + ww / 2, y - (cur ? u * 0.5 * pop : 0));
        if (cur) ctx.scale(1 + 0.08 * pop, 1 + 0.08 * pop);
        ctx.textAlign = "center";
        ctx.fillStyle = cur ? L.color : on ? CREAM : "rgba(255,243,230,0.42)";
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = u * 0.8; ctx.fillText(o.w, 0, 0);
        ctx.restore();
        x += ww + sp;
      }
    });
    ctx.globalAlpha = 1;
  },
  // 3 · kinetic (round 2, Ak 5 Nov: "on an invisible flipbox with 4 sides rotating on the long axis,
  // the word spoken always in the colour of the character"): each chunk of 2–3 words sits on one face
  // of an unseen box; at every new chunk the box rolls forward a quarter turn about its long axis,
  // with a small overshoot. On the face, the word being said lights up in the speaker's colour.
  kinetic(ctx, W, H, t, L) {
    const u = H / 100, chunks = [];
    for (const o of L.words) {
      const c = chunks[chunks.length - 1];
      if (!c || c.length >= 3 || /[.,?]$/.test(c[c.length - 1].w)) chunks.push([o]); else c.push(o);
    }
    const ci = chunks.findLastIndex((ch) => t >= ch[0].t0 - 140);
    if (ci < 0 || t > L.t1 - 120) return;
    const size = u * 9.5, r = size * 0.78, cy = H * 0.8, ROLL = 300;
    const k = clamp((t - chunks[ci][0].t0 + 140) / ROLL), e = outBack(k, 1.5);
    const font = `900 ${size}px Fraunces, Georgia, serif`;
    const face = (ch, phi) => {
      // a face of the box at angle phi (0 = facing us); its top and bottom edges on the circle round the axis
      if (!ch || Math.cos(phi) <= 0.02) return;
      const R = r * Math.SQRT2, top = R * Math.sin(phi - Math.PI / 4), bot = R * Math.sin(phi + Math.PI / 4), sy = (bot - top) / (2 * r);
      ctx.save();
      ctx.translate(W / 2, cy + (top + bot) / 2);
      // a touch of perspective: the face narrows a little as it turns away
      ctx.scale(1 - (1 - Math.cos(phi)) * 0.12, sy);
      ctx.font = font; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      const sp = ctx.measureText(" ").width, tw = ch.reduce((a, o) => a + ctx.measureText(o.w).width, 0) + sp * (ch.length - 1);
      let x = -tw / 2;
      // the face darkens as it turns away from us
      const shadeK = 1 - Math.cos(phi);
      if (shadeK > 0.01) ctx.filter = `brightness(${1 - Math.min(0.65, shadeK * 0.8)})`;
      for (const o of ch) {
        const ww = ctx.measureText(o.w).width, now = t >= o.t0 && t < o.t1, said = t >= o.t1;
        ctx.lineJoin = "round"; ctx.lineWidth = u * 1.5; ctx.strokeStyle = "rgba(10,4,8,0.88)"; ctx.strokeText(o.w, x, 0);
        ctx.fillStyle = now ? L.color : said ? CREAM : "rgba(255,243,230,0.55)";
        if (L.thought && !now) ctx.fillStyle = said ? "#e9dcff" : "rgba(233,220,255,0.5)";
        ctx.fillText(o.w, x, 0);
        // a key word carries a short underline in the speaker's colour
        if (o.hot) { ctx.fillStyle = L.color; ctx.fillRect(x, size * 0.42, ww, size * 0.07); }
        x += ww + sp;
      }
      ctx.restore();
    };
    // the old chunk rolls up and away, the new one comes up from below
    face(chunks[ci - 1], -e * Math.PI / 2);
    face(chunks[ci], (1 - e) * Math.PI / 2);
  },
  // 4 · drama: the speaker's name in their colour on their side of the frame; an inner thought is
  // italic, softer, drifts in out of a blur and is tagged THINKS
  drama(ctx, W, H, t, L) {
    const u = H / 100, left = L.who === "chloe";
    const body = `${L.thought ? "italic 500" : "600"} ${u * 5.4}px ${L.thought ? "Fraunces, Georgia, serif" : "Sora, system-ui"}`;
    ctx.font = body; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const rows = wrap(ctx, L.words, W * 0.6), lh = u * 7, y0 = H * 0.8 - (rows.length - 1) * lh;
    const bw = Math.max(...rows.map((r) => ctx.measureText(r.map((o) => o.w).join(" ")).width)) + u * 6;
    const x0 = left ? W * 0.05 : W * 0.95 - bw, slide = (1 - outCubic(clamp((t - L.t0 + 150) / 300))) * u * 4 * (left ? -1 : 1);
    ctx.save(); ctx.globalAlpha = fadeOf(t, L); ctx.translate(slide, 0);
    if (L.thought) ctx.filter = `blur(${Math.max(0, (1 - clamp((t - L.t0 + 150) / 350)) * u * 0.8)}px)`;
    pill(ctx, x0, y0 - lh * 0.75, bw, rows.length * lh + lh * 0.5, L.thought ? 0.35 : 0.6);
    ctx.fillStyle = L.color; ctx.fillRect(left ? x0 : x0 + bw - u * 0.8, y0 - lh * 0.6, u * 0.8, rows.length * lh + lh * 0.2);
    ctx.font = `700 ${u * 3}px Sora, system-ui`; ctx.fillStyle = L.color; ctx.textAlign = left ? "left" : "right";
    ctx.fillText(L.thought ? L.name + " · THINKS" : L.name, left ? x0 + u * 3 : x0 + bw - u * 3, y0 - lh * 1.15);
    ctx.font = body; ctx.textAlign = "left";
    const sp = ctx.measureText(" ").width;
    rows.forEach((r, i) => {
      const rw = r.reduce((a, o) => a + ctx.measureText(o.w).width, 0) + sp * (r.length - 1);
      let x = left ? x0 + u * 3 : x0 + bw - u * 3 - rw;
      for (const o of r) {
        const ww = ctx.measureText(o.w).width;
        if (o.hot && !L.thought) { ctx.save(); ctx.fillStyle = L.color; ctx.globalAlpha *= 0.35; ctx.fillRect(x - u * 0.4, y0 + i * lh + u * 1.2, ww + u * 0.8, u * 1.6); ctx.restore(); }
        ctx.fillStyle = o.hot ? (L.thought ? "#ffd0e4" : "#ffffff") : L.thought ? "rgba(255,243,230,0.78)" : "rgba(255,243,230,0.92)";
        ctx.fillText(o.w, x, y0 + i * lh);
        x += ww + sp;
      }
    });
    ctx.restore();
  },
};

/** A subtitle scene: the talking shot cuts with the speaker, subtitles over it. shots: { chloe, lucas } */
export function subtitleScene(style, shots) {
  return {
    len: SUB_LEN,
    draw(ctx, W, H, t) {
      const L = lineAt(t) ?? LINES.findLast((l) => t >= l.t0) ?? LINES[0];
      shots[L.who](ctx, W, H, t, !L.thought && t >= L.t0 && t < L.t1 - 400);
      // a soft dark band at the bottom keeps any subtitle readable on a bright shot
      const g = ctx.createLinearGradient(0, H * 0.6, 0, H);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = g; ctx.fillRect(0, H * 0.6, W, H * 0.4);
      const cur = lineAt(t);
      if (cur) SUBS[style](ctx, W, H, t, cur);
    },
  };
}
