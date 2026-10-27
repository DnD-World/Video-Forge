// ---------------------------------------------------------------------------
// "Mint Meander" — the Stravelakis brand style for explainers (Ak, 20 Oct 2026).
//
// Built from stravelakis.com/DESIGN-TOKENS.md: Sora type, deep navy panels,
// mint accent, 50/40 px rounded bands and cards, pill labels with a round
// arrow. The motion comes from the pattern-tile engine: a slow Truchet field
// breathes in the background, half-circle waves draw on as underlines and links,
// charts are stacked tiles, and scenes change by re-laying the frame tile by
// tile in a diagonal sweep.
//
// Our own code. A kit draws; the scene list (core/spec.mjs) says what and when.
// Every scene draws only inside R.box, the area clear of puppet spots.
// ---------------------------------------------------------------------------

import { clamp, contrast, ease, luminance, mix, rgba, win } from "../core/math.mjs";
import { fontStack } from "../core/fonts.mjs";
import { RULES, arcBand, arcColumn, polyline, sweepDelay, tileField } from "../core/tiles.mjs";
import { drawLines, fit, font, logBox } from "../core/text.mjs";

/** The font stack for this explainer (Sora unless the scene list picks another). */
const fam = (R) => fontStack(R.font ?? "Sora");

// Tokens (DESIGN-TOKENS.md, "current demo palette" and the planned logo pair).
const T = {
  ink: "#071C26", paper: "#FFFFFF",
  p900: "#0B2837", p800: "#11374A", p700: "#1E465B", p600: "#276075", p500: "#1C4F65",
  mint50: "#E9FEF5", mint400: "#76FFC2", hover: "#005A7C", border: "#DFE5E8",
  logoNavy: "#344080", logoMint: "#82D8B7",
};

export const SCHEMES = {
  night: {
    label: "Night (navy + mint)",
    bg0: T.p900, bg1: T.ink, tile: T.p700, tileAlpha: 0.3, glow: T.mint400, glowAlpha: 0.07,
    card: T.p800, cardEdge: T.p700, text: T.paper, textSoft: T.mint50,
    accent: T.mint400, accentInk: T.ink, line: T.mint400, muted: T.p600, tileGround: T.p700,
  },
  day: {
    label: "Day (mint + ink)",
    bg0: T.mint50, bg1: T.paper, tile: mix(T.mint50, T.p600, 0.16), tileAlpha: 0.55, glow: T.mint400, glowAlpha: 0.22,
    card: T.paper, cardEdge: T.border, text: T.ink, textSoft: T.p800,
    accent: T.mint400, accentInk: T.ink, line: T.p500, muted: mix(T.p600, T.paper, 0.45), tileGround: mix(T.mint50, T.p600, 0.1),
  },
  logo: {
    label: "Logo (navy #344080 + mint #82D8B7)",
    bg0: T.logoNavy, bg1: mix(T.logoNavy, "#000000", 0.38), tile: mix(T.logoNavy, T.paper, 0.1), tileAlpha: 0.38, glow: T.logoMint, glowAlpha: 0.08,
    card: mix(T.logoNavy, "#000000", 0.22), cardEdge: mix(T.logoNavy, T.paper, 0.16), text: T.paper, textSoft: mix(T.logoMint, T.paper, 0.6),
    accent: T.logoMint, accentInk: mix(T.logoNavy, "#000000", 0.45), line: T.logoMint, muted: mix(T.logoNavy, T.paper, 0.2), tileGround: mix(T.logoNavy, T.paper, 0.1),
  },
};

/** Hex check for user colours. */
const HEX = /^#[0-9a-f]{6}$/i;

/** Push colour c towards `toward` until it reaches `ratio` contrast with bg. */
function readableOn(c, bg, ratio, toward) {
  for (let k = 0; k <= 1.0001; k += 0.05) {
    const m = mix(c, toward, k);
    if (contrast(m, bg) >= ratio) return m;
  }
  return toward;
}

/**
 * A full scheme from two or three colours the user picks
 * ({ background, accent, text? }). Everything else is derived, and every
 * pairing the scenes use is pushed until it is readable.
 */
export function customScheme(colors) {
  const accent = colors.accent;
  // "dark" = white text reads better than ink on this background
  const dark = contrast("#ffffff", colors.background) >= contrast(T.ink, colors.background);
  const base = dark ? T.paper : T.ink;
  // some mid-tones (bright purple, orange) suit neither ink nor white: nudge the
  // background just far enough that the text reads
  const bg = readableOn(colors.background, base, 4.5, dark ? "#000000" : "#ffffff");
  const text = colors.text && HEX.test(colors.text) ? readableOn(colors.text, bg, 4.5, base) : base;
  const card = dark ? mix(bg, "#ffffff", 0.07) : mix(bg, "#ffffff", 0.75);
  const accentInk = contrast("#071C26", accent) >= contrast("#ffffff", accent) ? "#071C26" : "#ffffff";
  const muted = readableOn(mix(bg, text, 0.28), text, 4.5, bg);
  return {
    label: "Custom",
    bg0: bg, bg1: mix(bg, dark ? "#000000" : "#ffffff", dark ? 0.35 : 0.5), tile: mix(bg, text, 0.14), tileAlpha: dark ? 0.32 : 0.55,
    glow: accent, glowAlpha: dark ? 0.08 : 0.2,
    card: readableOn(card, text, 4.5, bg), cardEdge: mix(card, text, 0.15), text, textSoft: readableOn(mix(text, accent, 0.25), bg, 4.5, text),
    accent, accentInk, line: readableOn(readableOn(accent, bg, 4.5, text), card, 3, text), muted, tileGround: mix(bg, text, 0.09),
  };
}

const customCache = new Map();
/** The scheme for this explainer: custom colours win over a named scheme. */
export function schemeOf(R) {
  if (R.colors?.background && R.colors?.accent) {
    const k = JSON.stringify(R.colors);
    if (!customCache.has(k)) customCache.set(k, customScheme(R.colors));
    return customCache.get(k);
  }
  return SCHEMES[R.scheme] ?? SCHEMES.night;
}

export const meta = {
  id: "stravelakis",
  name: "Mint Meander",
  family: "Pattern tiles",
  brand: "Stravelakis",
  font: "Sora",
  schemes: Object.keys(SCHEMES),
  transition: 0.7,
};

// ---- small pieces ------------------------------------------------------------

const radiusCard = (R) => Math.min(R.W, R.H) * 0.037; // 40 px on a 1080 short side
const unit = (R) => Math.min(R.W, R.H) / 720;

function card(c, x, y, w, h, r, fill, edge, edgeW) {
  c.beginPath();
  c.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2));
  c.fillStyle = fill;
  c.fill();
  if (edge) { c.lineWidth = edgeW; c.strokeStyle = edge; c.stroke(); }
  logBox({ kind: "card", x, y, w, h });
}

/** The site's pill button: rounded text block with a round arrow on the right. */
function pill(c, R, S, text, x, y, { size, bg, fg, align = "left", appear = 1, arrow = true, maxW = Infinity }) {
  if (appear <= 0) return { w: 0, h: 0 };
  const u = unit(R);
  c.save();
  c.font = font(500, size, fam(R));
  // shrink to fit maxW (never below the readable label size); the check reports it if it still can't
  const extra = (s) => s * 0.95 * 2 + (arrow ? s * 2.05 * 0.72 * 0.85 : 0);
  if (c.measureText(text).width + extra(size) > maxW) {
    const min = 28 * u;
    for (let s = size; s >= min; s -= 1) { c.font = font(500, s, fam(R)); size = s; if (c.measureText(text).width + extra(s) <= maxW) break; }
  }
  const tw = c.measureText(text).width;
  const fitsW = tw + extra(size) <= maxW + 0.5;
  const h = size * 2.05, pad = size * 0.95, dot = arrow ? h * 0.72 : 0;
  const w = tw + pad * 2 + (arrow ? dot * 0.85 : 0);
  const x0 = align === "center" ? x - w / 2 : x;
  const k = ease.back(clamp(appear));
  c.translate(x0 + w / 2, y + h / 2);
  c.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
  c.globalAlpha = clamp(appear * 1.6);
  c.translate(-(x0 + w / 2), -(y + h / 2));
  c.beginPath();
  c.roundRect(x0, y, w, h, h / 2);
  c.fillStyle = bg;
  c.fill();
  c.fillStyle = fg;
  c.textBaseline = "middle";
  c.fillText(text, x0 + pad, y + h / 2 + size * 0.04);
  if (arrow) {
    const cx = x0 + w - pad * 0.55 - dot / 2, cy = y + h / 2;
    c.beginPath();
    c.arc(cx, cy, dot / 2, 0, Math.PI * 2);
    c.fillStyle = fg;
    c.fill();
    c.strokeStyle = bg;
    c.lineWidth = Math.max(2, 2.2 * u);
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(cx - dot * 0.2, cy);
    c.lineTo(cx + dot * 0.2, cy);
    c.moveTo(cx + dot * 0.04, cy - dot * 0.16);
    c.lineTo(cx + dot * 0.2, cy);
    c.lineTo(cx + dot * 0.04, cy + dot * 0.16);
    c.stroke();
  }
  c.restore();
  logBox({ kind: "text", role: "label", text, x: x0, y, w, h, px: size / u, fits: fitsW, fg, bg });
  return { w, h };
}

/** A single brand tile as a bullet/icon: Truchet arcs on a rounded square. */
function tileBadge(c, x, y, s, turn, rot, ground, line) {
  c.save();
  c.translate(x + s / 2, y + s / 2);
  c.rotate(rot);
  c.translate(-x - s / 2, -y - s / 2);
  c.beginPath();
  c.roundRect(x, y, s, s, s * 0.22);
  c.fillStyle = ground;
  c.fill();
  c.clip();
  RULES.truchet.draw(c, x, y, s, turn, { line, width: 0.2 });
  c.restore();
}

function checkMark(c, x, y, s, progress, color, lw) {
  polyline(c, [[x, y + s * 0.55], [x + s * 0.38, y + s * 0.9], [x + s, y + s * 0.12]], progress, { line: color, lineWidth: lw, cap: "round", join: "round" });
}
function crossMark(c, x, y, s, progress, color, lw) {
  polyline(c, [[x, y], [x + s, y + s]], clamp(progress * 2), { line: color, lineWidth: lw, cap: "round" });
  polyline(c, [[x + s, y], [x, y + s]], clamp(progress * 2 - 1), { line: color, lineWidth: lw, cap: "round" });
}

const headline = (R, max = 96) => ({ weight: 600, family: fam(R), max: max * unit(R), min: 44 * unit(R) });
const labelF = (R, max = 40) => ({ weight: 500, family: fam(R), max: max * unit(R), min: 28 * unit(R) });

// ---- background (identical with or without content: the puppet spots show it) ----

export function background(c, R, t) {
  const S = schemeOf(R);
  const { W, H } = R, u = unit(R);
  const g = c.createLinearGradient(0, 0, W * 0.35, H);
  g.addColorStop(0, S.bg0);
  g.addColorStop(1, S.bg1);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // a soft mint glow that drifts slowly across the content area
  const B = R.box, gx = B.x + B.w * (0.35 + 0.15 * Math.sin(t * 0.21)), gy = B.y + B.h * (0.4 + 0.1 * Math.cos(t * 0.17));
  const rg = c.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.6);
  rg.addColorStop(0, rgba(S.glow, S.glowAlpha));
  rg.addColorStop(1, rgba(S.glow, 0));
  c.fillStyle = rg;
  c.fillRect(0, 0, W, H);
  tileField(c, W, H, {
    rule: "truchet", cell: Math.round(58 * u), seed: 11, t,
    ink: { line: S.tile, width: 0.14 }, alpha: S.tileAlpha,
    flips: { every: 11, dur: 0.9 }, ox: t * 5 * u, oy: t * 2.5 * u,
  });
  // keep the edges calm so the eye goes to the middle
  const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, rgba(S.bg1, 0));
  v.addColorStop(1, rgba(S.bg1, 0.55));
  c.fillStyle = v;
  c.fillRect(0, 0, W, H);
}

// ---- scenes ------------------------------------------------------------------
// Each: (c, R, scene, t). Draws the scene's state at time t, inside R.box.

function sceneTitle(c, R, s, t) {
  const S = schemeOf(R), B = R.box, u = unit(R), lt = t - s.start;
  const f = fit(c, s.text, { ...headline(R, 104), maxW: B.w * 0.94, maxH: B.h * 0.55, maxLines: 3 });
  const kickH = s.kicker ? 30 * u * 2.05 + 26 * u : 0;
  const bandH = 26 * u;
  const total = kickH + f.lines.length * f.lineH + 34 * u + bandH;
  const top = B.y + (B.h - total) / 2, cx = B.x + B.w / 2;
  if (s.kicker) pill(c, R, S, s.kicker, cx, top, { size: 30 * u, bg: S.accent, fg: S.accentInk, align: "center", appear: win(lt, 0.05, 0.4), maxW: B.w });
  const ty = top + kickH;
  drawLines(c, f, cx, ty, { weight: 600, family: fam(R), color: S.text, align: "center", reveal: ease.out(win(lt, 0.3, 1.2)), role: "headline", unit: u, bg: S.bg0 });
  const bw = Math.min(B.w * 0.8, Math.max(f.width, B.w * 0.4));
  arcBand(c, cx - bw / 2, ty + f.lines.length * f.lineH + 34 * u, bw, bandH, ease.inOut(win(lt, 0.9, 2.1)), { line: S.line, lineWidth: 4.5 * u });
}

function scenePoints(c, R, s, t) {
  const S = schemeOf(R), B = R.box, u = unit(R), lt = t - s.start;
  let y = B.y, th = 0;
  const gap = 20 * u;
  let ft = null;
  if (s.title) {
    ft = fit(c, s.title, { ...headline(R, 68), maxW: B.w, maxH: B.h * 0.26, maxLines: 2 });
    th = ft.lines.length * ft.lineH + 26 * u;
  }
  const n = s.items.length;
  const rowH = Math.min((B.h - th - gap * (n - 1)) / n, 132 * u);
  const total = th + n * rowH + (n - 1) * gap;
  y = B.y + (B.h - total) / 2;
  if (ft) drawLines(c, ft, B.x, y, { weight: 600, family: fam(R), color: S.text, reveal: ease.out(win(lt, 0.05, 0.6)), role: "headline", unit: u, bg: S.bg0 });
  y += th;
  const active = s.items.reduce((a, it, i) => (t >= it.at ? i : a), -1);
  s.items.forEach((it, i) => {
    const k = win(t, it.at, it.at + 0.55);
    if (k <= 0) return;
    const ry = y + i * (rowH + gap);
    const slide = (1 - ease.out(k)) * 70 * u;
    c.save();
    c.globalAlpha = clamp(k * 2.2);
    c.translate(-slide, 0);
    const r = radiusCard(R);
    card(c, B.x, ry, B.w, rowH, r, S.card, i === active ? S.accent : S.cardEdge, (i === active ? 3 : 1.5) * u);
    const bs = rowH * 0.56, pad = (rowH - bs) / 2;
    tileBadge(c, B.x + pad, ry + pad, bs, i, (1 - ease.out(k)) * Math.PI / 2, S.accent, S.accentInk);
    const tx = B.x + pad * 2 + bs, tw = B.w - (tx - B.x) - pad * 1.4;
    const fl = fit(c, it.text, { ...labelF(R, 42), maxW: tw, maxH: rowH - pad * 0.8, maxLines: 2 });
    drawLines(c, fl, tx, ry + (rowH - fl.lines.length * fl.lineH) / 2, { weight: 500, family: fam(R), color: S.text, reveal: ease.out(win(t, it.at + 0.12, it.at + 0.7)), role: "label", unit: u, bg: S.card });
    c.restore();
  });
}

function sceneSteps(c, R, s, t) {
  const S = schemeOf(R), B = R.box, u = unit(R), lt = t - s.start;
  const n = s.items.length;
  let top = B.y, avail = B.h;
  if (s.title) {
    const ft = fit(c, s.title, { ...headline(R, 64), maxW: B.w, maxH: B.h * 0.22, maxLines: 2 });
    drawLines(c, ft, B.x, B.y, { weight: 600, family: fam(R), color: S.text, reveal: ease.out(win(lt, 0.05, 0.6)), role: "headline", unit: u, bg: S.bg0 });
    const th = ft.lines.length * ft.lineH + 34 * u;
    top += th; avail -= th;
  }
  const horizontal = B.w >= avail * 1.25;
  const nodeR = Math.min(40 * u, (horizontal ? B.w / n : avail / n) * 0.24);
  const lineW = 5 * u;
  const node = (cx, cy, i, k) => {
    const it = s.items[i];
    const pop = ease.back(k);
    c.save();
    c.translate(cx, cy);
    c.scale(pop, pop);
    // the newest step glows
    const live = clamp(1 - (t - it.at) / 1.2);
    if (live > 0) {
      c.beginPath();
      c.arc(0, 0, nodeR * (1.25 + 0.35 * (1 - live)), 0, Math.PI * 2);
      c.strokeStyle = rgba(S.accent, live * 0.8);
      c.lineWidth = 3 * u;
      c.stroke();
    }
    c.beginPath();
    c.arc(0, 0, nodeR, 0, Math.PI * 2);
    c.fillStyle = S.accent;
    c.fill();
    c.fillStyle = S.accentInk;
    c.font = font(700, nodeR * 1.05, fam(R));
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(String(i + 1), 0, nodeR * 0.06);
    c.restore();
    if (k > 0) logBox({ kind: "text", role: "label", text: String(i + 1), x: cx - nodeR, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2, px: (nodeR * 1.05) / u, fits: true, fg: S.accentInk, bg: S.accent });
  };
  if (horizontal) {
    const step = B.w / n;
    // measure the tallest label so node row + labels sit centred in the space
    const labelFits = s.items.map((it) => fit(c, it.text, { ...labelF(R, 36), maxW: step * 0.9, maxH: avail * 0.6, maxLines: 3 }));
    const groupH = nodeR * 2 + nodeR * 0.7 + Math.max(...labelFits.map((f) => f.lines.length * f.lineH));
    const cy = top + Math.max(nodeR * 1.3, (avail - groupH) / 2 + nodeR);
    s.items.forEach((it, i) => {
      const cx = B.x + step * (i + 0.5);
      if (i > 0) {
        const px = B.x + step * (i - 0.5) + nodeR * 1.45, w = cx - nodeR * 1.45 - px;
        arcBand(c, px, cy - 9 * u, w, 18 * u, ease.inOut(win(t, it.at - 0.55, it.at)), { line: S.line, lineWidth: lineW * 0.7 });
      }
      const k = win(t, it.at, it.at + 0.4);
      if (k <= 0) return;
      node(cx, cy, i, k);
      const fl = labelFits[i];
      drawLines(c, fl, cx, cy + nodeR * 1.7, { weight: 500, family: fam(R), color: S.text, align: "center", reveal: ease.out(win(t, it.at + 0.15, it.at + 0.7)), role: "label", unit: u, bg: S.bg0 });
    });
  } else {
    const step = avail / n, cx = B.x + nodeR * 1.3;
    s.items.forEach((it, i) => {
      const cy = top + step * (i + 0.5);
      if (i > 0) {
        const py = top + step * (i - 0.5) + nodeR * 1.45, h = cy - nodeR * 1.45 - py;
        arcColumn(c, cx - 9 * u, py, 18 * u, h, ease.inOut(win(t, it.at - 0.55, it.at)), { line: S.line, lineWidth: lineW * 0.7 });
      }
      const k = win(t, it.at, it.at + 0.4);
      if (k <= 0) return;
      node(cx, cy, i, k);
      const tx = cx + nodeR * 1.9;
      const fl = fit(c, it.text, { ...labelF(R, 40), maxW: B.x + B.w - tx, maxH: step * 0.95, maxLines: 2 });
      drawLines(c, fl, tx, cy - (fl.lines.length * fl.lineH) / 2, { weight: 500, family: fam(R), color: S.text, reveal: ease.out(win(t, it.at + 0.15, it.at + 0.7)), role: "label", unit: u, bg: S.bg0 });
    });
  }
}

function fmtNumber(v, ref) {
  const decimals = Number.isInteger(ref) ? 0 : 1;
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function sceneNumber(c, R, s, t) {
  const S = schemeOf(R), B = R.box, u = unit(R), lt = t - s.start;
  const from = s.from ?? 0;
  // counted on a 12-per-second grid, so the digits tick like a counter, not a blur
  const p = ease.out(win(Math.floor(t * 12) / 12, s.start + 0.35, s.start + 1.6));
  const v = from + (s.value - from) * p;
  const shown = (s.prefix ?? "") + fmtNumber(p >= 1 ? s.value : v, s.value) + (s.suffix ?? "");
  const finalText = (s.prefix ?? "") + fmtNumber(s.value, s.value) + (s.suffix ?? "");
  const ts = Math.min(30 * u, B.w * 0.032), ring_gap = ts * 0.45, ringPad = ts + ring_gap;
  const padX = Math.min(60 * u, B.w * 0.05);
  const fn = fit(c, finalText, { weight: 700, family: fam(R), max: 230 * u, min: 64 * u, maxW: B.w - 2 * (ringPad + padX), maxH: B.h * 0.45, maxLines: 1, leading: 1.05 });
  const fl = fit(c, s.label, { ...labelF(R, 44), maxW: B.w * 0.86, maxH: B.h * 0.25, maxLines: 2 });
  const padY = 40 * u;
  const cardH = fn.lineH + padY * 2, cardW = Math.min(B.w - 2 * ringPad, Math.max(fn.width + 2 * padX, B.w * 0.6));
  const total = ringPad + cardH + ringPad + 26 * u + fl.lines.length * fl.lineH;
  const top = B.y + ringPad + (B.h - total) / 2, cx = B.x + B.w / 2;
  const appear = ease.back(win(lt, 0, 0.45));
  // tiles around the card light up as the count rises
  const x0 = cx - cardW / 2 - ts - ring_gap, y0 = top - ts - ring_gap;
  const spanW = cardW + 2 * (ts + ring_gap), spanH = cardH + 2 * (ts + ring_gap);
  const cols = Math.max(2, Math.round(spanW / ts)), rows = Math.max(2, Math.round(spanH / ts));
  const ring = [];
  for (let i = 0; i < cols; i++) ring.push([i, 0]);
  for (let j = 1; j < rows; j++) ring.push([cols - 1, j]);
  for (let i = cols - 2; i >= 0; i--) ring.push([i, rows - 1]);
  for (let j = rows - 2; j > 0; j--) ring.push([0, j]);
  const sx = (spanW - ts) / (cols - 1), sy = (spanH - ts) / (rows - 1);
  c.save();
  c.globalAlpha = clamp(appear);
  ring.forEach(([i, j], k) => {
    const lit = k / ring.length < p;
    RULES.truchet.draw(c, x0 + i * sx, y0 + j * sy, ts, (i + j) % 2, { line: lit ? S.line : S.muted, width: 0.16 });
  });
  c.restore();
  const punch = p >= 1 ? 1 + 0.1 * Math.exp(-(lt - 1.6) * 7) : 1;
  c.save();
  c.translate(cx, top + cardH / 2);
  c.scale(appear * punch, appear * punch);
  c.translate(-cx, -(top + cardH / 2));
  card(c, cx - cardW / 2, top, cardW, cardH, radiusCard(R) * 1.25, S.card, S.cardEdge, 1.5 * u);
  c.font = font(700, fn.size, fam(R));
  c.fillStyle = S.line;
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillText(shown, cx, top + padY + fn.size * 0.9);
  c.restore();
  logBox({ kind: "text", role: "number", text: finalText, x: cx - fn.width / 2, y: top + padY, w: fn.width, h: fn.lineH, px: fn.size / u, fits: fn.fits, fg: S.line, bg: S.card });
  drawLines(c, fl, cx, top + cardH + ringPad + 26 * u, { weight: 500, family: fam(R), color: S.textSoft, align: "center", reveal: ease.out(win(lt, 0.5, 1.2)), role: "label", unit: u, bg: S.bg0 });
}

function sceneBars(c, R, s, t) {
  const S = schemeOf(R), B = R.box, u = unit(R), lt = t - s.start;
  let top = B.y;
  if (s.title) {
    const ft = fit(c, s.title, { ...headline(R, 60), maxW: B.w, maxH: B.h * 0.2, maxLines: 2 });
    drawLines(c, ft, B.x, B.y, { weight: 600, family: fam(R), color: S.text, reveal: ease.out(win(lt, 0.05, 0.6)), role: "headline", unit: u, bg: S.bg0 });
    top += ft.lines.length * ft.lineH + 30 * u;
  }
  const n = s.items.length;
  // columns need room for their labels; otherwise the chart lies on its side
  c.font = font(500, 28 * u, fam(R));
  const longestWord = Math.max(...s.items.flatMap((it) => it.label.split(/\s+/).map((w) => c.measureText(w).width)));
  if (longestWord > (B.w / n) * 0.9) return barsSideways(c, R, s, t, top);
  const labelH = 28 * u * 1.18 * 2 + 16 * u, valueH = 34 * u * 1.4;
  const chartH = B.y + B.h - top - labelH - valueH;
  const slot = B.w / n;
  const ts = Math.min(slot * 0.62, 72 * u);
  const maxTiles = Math.max(2, Math.floor(chartH / ts));
  const maxV = Math.max(...s.items.map((it) => it.value), 1e-9);
  const base = top + valueH + maxTiles * ts;
  const best = s.items.reduce((a, it, i) => (it.value > s.items[a].value ? i : a), 0);
  let lastLanded = s.start;
  s.items.forEach((it, i) => {
    const count = Math.max(1, Math.round((it.value / maxV) * maxTiles));
    const x = B.x + slot * (i + 0.5) - ts / 2;
    const t0 = s.start + 0.45 + i * 0.22;
    let laid = 0;
    for (let k = 0; k < count; k++) {
      const tk = t0 + k * 0.045;
      const a = win(t, tk, tk + 0.16);
      if (a <= 0) break;
      laid = k + 1;
      const y = base - (k + 1) * ts;
      const hot = i === best && t >= t0 + count * 0.045 + 0.3;
      c.save();
      c.globalAlpha = a;
      c.translate(x + ts / 2, y + ts / 2);
      c.scale(0.5 + 0.5 * ease.back(a), 0.5 + 0.5 * ease.back(a));
      c.translate(-x - ts / 2, -y - ts / 2);
      c.fillStyle = hot ? S.accent : S.tileGround;
      c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
      RULES.truchet.draw(c, x, y, ts, (i + k) % 2, { line: hot ? S.accentInk : S.line, width: 0.17 });
      c.restore();
    }
    if (laid) logBox({ kind: "card", x, y: base - laid * ts, w: ts, h: laid * ts });
    const done = t0 + count * 0.045 + 0.2;
    lastLanded = Math.max(lastLanded, done);
    const fv = fit(c, String(it.value) + (s.unit ? " " + s.unit : ""), { weight: 600, family: fam(R), max: 34 * u, min: 28 * u, maxW: slot * 0.96, maxH: valueH, maxLines: 1 });
    drawLines(c, fv, x + ts / 2, base - count * ts - valueH * 0.98, { weight: 600, family: fam(R), color: i === best ? S.line : S.text, align: "center", reveal: win(t, done, done + 0.3), role: "label", unit: u, bg: S.bg0 });
    const fl = fit(c, it.label, { ...labelF(R, 32), maxW: slot * 0.94, maxH: labelH, maxLines: 2 });
    drawLines(c, fl, x + ts / 2, base + 14 * u, { weight: 500, family: fam(R), color: S.textSoft, align: "center", reveal: win(t, t0, t0 + 0.4), role: "label", unit: u, bg: S.bg0 });
  });
  c.fillStyle = S.muted;
  c.fillRect(B.x, base + 3 * u, B.w * ease.out(win(lt, 0.2, 0.7)), 3 * u);
}

/** Bars as rows: label on the left, a run of tiles to the right, the value at its end. */
function barsSideways(c, R, s, t, top) {
  const S = schemeOf(R), B = R.box, u = unit(R), lt = t - s.start;
  const n = s.items.length, avail = B.y + B.h - top;
  const rowH = Math.min(avail / n, 110 * u), ts = rowH * 0.62;
  const labelW = Math.min(B.w * 0.42, Math.max(...s.items.map((it) => fit(c, it.label, { ...labelF(R, 32), maxW: B.w * 0.42, maxH: rowH, maxLines: 2 }).width)));
  const valueW = 140 * u;
  const x0 = B.x + labelW + 24 * u;
  const maxTiles = Math.max(2, Math.floor((B.x + B.w - valueW - x0) / ts));
  const maxV = Math.max(...s.items.map((it) => it.value), 1e-9);
  const best = s.items.reduce((a, it, i) => (it.value > s.items[a].value ? i : a), 0);
  const y0 = top + (avail - n * rowH) / 2;
  s.items.forEach((it, i) => {
    const y = y0 + i * rowH + (rowH - ts) / 2;
    const count = Math.max(1, Math.round((it.value / maxV) * maxTiles));
    const t0 = s.start + 0.45 + i * 0.22;
    const fl = fit(c, it.label, { ...labelF(R, 32), maxW: labelW, maxH: rowH, maxLines: 2 });
    drawLines(c, fl, B.x, y0 + i * rowH + (rowH - fl.lines.length * fl.lineH) / 2, { weight: 500, family: fam(R), color: S.textSoft, reveal: win(t, t0, t0 + 0.4), role: "label", unit: u, bg: S.bg0 });
    let laid = 0;
    for (let k = 0; k < count; k++) {
      const a = win(t, t0 + k * 0.035, t0 + k * 0.035 + 0.16);
      if (a <= 0) break;
      laid = k + 1;
      const x = x0 + k * ts;
      const hot = i === best && t >= t0 + count * 0.035 + 0.3;
      c.save();
      c.globalAlpha = a;
      c.fillStyle = hot ? S.accent : S.tileGround;
      c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
      RULES.truchet.draw(c, x, y, ts, (i + k) % 2, { line: hot ? S.accentInk : S.line, width: 0.17 });
      c.restore();
    }
    if (laid) logBox({ kind: "card", x: x0, y, w: laid * ts, h: ts });
    const done = t0 + count * 0.035 + 0.2;
    const fv = fit(c, String(it.value) + (s.unit ? " " + s.unit : ""), { weight: 600, family: fam(R), max: 34 * u, min: 28 * u, maxW: valueW, maxH: rowH, maxLines: 1 });
    drawLines(c, fv, x0 + count * ts + 14 * u, y0 + i * rowH + (rowH - fv.lineH) / 2, { weight: 600, family: fam(R), color: i === best ? S.line : S.text, reveal: win(t, done, done + 0.3), role: "label", unit: u, bg: S.bg0 });
  });
  c.fillStyle = S.muted;
  c.fillRect(x0 - 3 * u, y0, 3 * u, n * rowH * ease.out(win(lt, 0.2, 0.7)));
}

/**
 * Lay out the two compare cards. Tries, in order: side by side, stacked, and
 * a tight side-by-side; takes the first where every line fits at a readable size.
 */
function compareLayout(c, R, s, top, avail) {
  const B = R.box, u = unit(R), gap = 28 * u;
  const modes = [
    { side: true, pad: 30 * u, max: 34 },
    { side: false, pad: 26 * u, max: 34 },
    { side: true, pad: 18 * u, max: 30 },
    { side: false, pad: 16 * u, max: 30 },
  ];
  let fallback = null;
  for (const m of modes) {
    const cw = m.side ? (B.w - gap) / 2 : B.w, ch = m.side ? avail : (avail - gap) / 2;
    if (cw <= 0 || ch <= 0) continue;
    const pillH = 30 * u * 2.05;
    const rowsOk = ["left", "right"].map((key) => {
      const v = s[key];
      const iy = m.pad + pillH + 18 * u;
      const rowH = Math.min((ch - iy - m.pad) / v.items.length, 118 * u);
      const ms = Math.min(34 * u, rowH * 0.45);
      const fits = v.items.map((it) => fit(c, typeof it === "string" ? it : it.text, { ...labelF(R, m.max), maxW: cw - m.pad * 2.6 - ms, maxH: rowH * 0.95, maxLines: 2 }));
      // the side's title pill must fit too, at the smallest readable size at worst
      c.font = font(500, 28 * u, fam(R));
      const pillOk = c.measureText(v.title).width + 28 * u * 1.9 <= cw - 2 * m.pad;
      return { iy, rowH, ms, fits, ok: rowH > 0 && pillOk && fits.every((f) => f.fits) };
    });
    const L = { ...m, cw, ch, gap, rows: rowsOk };
    if (rowsOk.every((r) => r.ok)) return L;
    fallback ??= L;
  }
  return fallback;
}

function sceneCompare(c, R, s, t) {
  const S = schemeOf(R), B = R.box, u = unit(R), lt = t - s.start;
  let top = B.y, avail = B.h;
  if (s.title) {
    const ft = fit(c, s.title, { ...headline(R, 60), maxW: B.w, maxH: B.h * 0.2, maxLines: 2 });
    drawLines(c, ft, B.x, B.y, { weight: 600, family: fam(R), color: S.text, reveal: ease.out(win(lt, 0.05, 0.6)), role: "headline", unit: u, bg: S.bg0 });
    const th = ft.lines.length * ft.lineH + 28 * u;
    top += th; avail -= th;
  }
  const L = compareLayout(c, R, s, top, avail);
  if (!L) return;
  const tRight = s.start + Math.max(1.2, (s.end - s.start) * 0.42);
  [["left", s.start + 0.15, false], ["right", tRight, true]].forEach(([key, t0, good], idx) => {
    const v = s[key], row = L.rows[idx];
    const k = win(t, t0, t0 + 0.5);
    if (k <= 0) return;
    const x = L.side ? B.x + idx * (L.cw + L.gap) : B.x, y = L.side ? top : top + idx * (L.ch + L.gap);
    const fill = good ? S.accent : S.card, ink = good ? S.accentInk : S.text;
    c.save();
    c.globalAlpha = clamp(k * 2);
    c.translate(0, (1 - ease.out(k)) * 50 * u);
    card(c, x, y, L.cw, L.ch, radiusCard(R), fill, good ? null : S.cardEdge, 1.5 * u);
    pill(c, R, S, v.title, x + L.pad, y + L.pad, { size: 30 * u, bg: good ? S.accentInk : S.muted, fg: good ? S.accent : S.text, appear: win(t, t0 + 0.1, t0 + 0.45), arrow: false, maxW: L.cw - 2 * L.pad });
    v.items.forEach((it, j) => {
      const ti = t0 + 0.35 + j * 0.3;
      const fl = row.fits[j];
      const my = y + row.iy + j * row.rowH + (row.rowH - row.ms) / 2;
      if (good) checkMark(c, x + L.pad, my, row.ms, ease.out(win(t, ti, ti + 0.35)), ink, 5 * u);
      else crossMark(c, x + L.pad, my, row.ms, ease.out(win(t, ti, ti + 0.35)), mix(S.text, S.card, 0.35), 4.5 * u);
      drawLines(c, fl, x + L.pad * 1.6 + row.ms, y + row.iy + j * row.rowH + (row.rowH - fl.lines.length * fl.lineH) / 2, { weight: 500, family: fam(R), color: ink, reveal: ease.out(win(t, ti, ti + 0.5)), role: "label", unit: u, bg: fill });
    });
    c.restore();
  });
}

function sceneTakeaway(c, R, s, t) {
  const S = schemeOf(R), B = R.box, u = unit(R), lt = t - s.start;
  const pad = Math.min(54 * u, R.box.w * 0.06);
  const kickH0 = s.kicker ? 30 * u * 2.05 + 26 * u : 0;
  const f = fit(c, s.text, { ...headline(R, 84), maxW: B.w * 0.9 - pad * 2, maxH: B.h - kickH0 - 88 * u - pad * 2, maxLines: 4 });
  const cw = Math.min(B.w * 0.94, f.width + pad * 2.4), ch = f.lines.length * f.lineH + pad * 2;
  const kickH = s.kicker ? 30 * u * 2.05 + 26 * u : 0;
  const bandH = 22 * u, bandGap = 22 * u;
  const total = kickH + bandH * 2 + bandGap * 2 + ch;
  const top = B.y + (B.h - total) / 2, cx = B.x + B.w / 2;
  if (s.kicker) pill(c, R, S, s.kicker, cx, top, { size: 30 * u, bg: S.card, fg: S.text, align: "center", appear: win(lt, 0.05, 0.4), maxW: B.w });
  const by = top + kickH;
  const draw = ease.inOut(win(lt, 0.2, 1.4));
  arcBand(c, cx - cw / 2, by, cw, bandH, draw, { line: S.line, lineWidth: 4 * u });
  const cy = by + bandH + bandGap;
  const k = ease.back(win(lt, 0.35, 0.85));
  c.save();
  c.translate(cx, cy + ch / 2);
  c.scale(k, k);
  c.translate(-cx, -(cy + ch / 2));
  card(c, cx - cw / 2, cy, cw, ch, radiusCard(R) * 1.25, S.accent, null, 0);
  c.restore();
  drawLines(c, f, cx, cy + pad, { weight: 600, family: fam(R), color: S.accentInk, align: "center", reveal: ease.out(win(lt, 0.6, 1.4)), role: "headline", unit: u, bg: S.accent });
  arcBand(c, cx - cw / 2, cy + ch + bandGap, cw, bandH, draw, { line: S.line, lineWidth: 4 * u });
}

export const scenes = { title: sceneTitle, points: scenePoints, steps: sceneSteps, number: sceneNumber, bars: sceneBars, compare: sceneCompare, takeaway: sceneTakeaway };

// ---- scene change: the frame is re-laid tile by tile ---------------------------

/**
 * Composite the outgoing layer A and incoming layer B onto c. Tiles turn over
 * in a diagonal wave: each cell folds away the old scene, shows a solid brand
 * tile (card colour, mint Truchet arcs) as it passes edge-on, and unfolds the
 * new scene. A cell is mid-turn for only a short window, so at any moment a
 * clean band of tiles crosses the frame instead of a field of torn text.
 * k = 0..1 across the transition.
 */
export function transition(c, R, A, B, k) {
  const S = schemeOf(R), u = unit(R);
  const s = Math.round(72 * u);
  const cols = Math.ceil(R.W / s), rows = Math.ceil(R.H / s);
  const WINDOW = 0.3;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const d = sweepDelay(i, j, cols, rows);
      const local = clamp((k - d * (1 - WINDOW)) / WINDOW);
      const x = i * s, y = j * s;
      if (local <= 0 || local >= 1) {
        c.drawImage(local <= 0 ? A : B, x, y, s, s, x, y, s, s);
        continue;
      }
      // fold: the scene squeezes to the cell's centre line and back
      const fold = Math.abs(Math.cos(local * Math.PI));
      const src = local < 0.5 ? A : B;
      c.save();
      c.translate(x + s / 2, y + s / 2);
      c.scale(Math.max(0.02, fold), 1);
      c.drawImage(src, x, y, s, s, -s / 2, -s / 2, s, s);
      c.restore();
      // the tile face, strongest when the cell is edge-on
      const face = 1 - fold;
      c.save();
      c.globalAlpha = face;
      c.fillStyle = S.card;
      c.fillRect(x, y, s, s);
      RULES.truchet.draw(c, x, y, s, (i + j) % 2, { line: S.line, width: 0.13 });
      c.restore();
    }
  }
}
