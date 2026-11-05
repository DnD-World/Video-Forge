// ---------------------------------------------------------------------------
// 2D lab (4 Nov 2026): the shot around the characters.
//   room        a stage in depth layers (wall, window, shelf, plant, a
//               blurred foreground leaf) that slide at different speeds
//               when the camera moves: real parallax
//   camera      push-ins, reaction zooms with a little shake, whip pans
//   shadows     a soft contact shadow, and a cast shadow on the floor
//   smears      fast hands and feet leave a stretched smear and speed lines
//   dust        puffs where feet land
//   impact      the RED FLAG frame: freeze, red and black, speed lines, an
//               inked figure and a cloth flag that whips in on the wind
// ---------------------------------------------------------------------------

import { stageOf } from "../core/looks.mjs";
import { clamp, fbm, lerp } from "./anim.mjs";

export const TAU = Math.PI * 2;

/** World (stage units) → screen px for a camera {x, y, zoom, rot, shake}. */
export function view(W, H, cam, unit) {
  const S = unit * (cam.zoom ?? 1);
  const cx = W / 2 + (cam.shakeX ?? 0), cy = H * (cam.floor ?? 0.86) + (cam.shakeY ?? 0);
  return { S, toScreen: ([x, y]) => [cx + (x - (cam.x ?? 0)) * S, cy + (y - (cam.y ?? 0)) * S], cx, cy };
}

// ---- the room, in depth layers ------------------------------------------------------------------------
export function room(ctx, W, H, look, cam, unit, { t = 0, mood = 0, warm = "#ffd9a8" } = {}) {
  const [wall0, floor0] = stageOf(look);
  const V = view(W, H, cam, unit);
  const layer = (depth, fn) => { // depth 0 = far wall, 1 = the characters' plane
    ctx.save();
    const k = lerp(0.35, 1, depth);
    const S = V.S * k;
    ctx.translate(V.cx - (cam.x ?? 0) * S, V.cy - (cam.y ?? 0) * S * 0.6);
    fn(S);
    ctx.restore();
  };
  // wall with a light falling across it
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, shadeHex(wall0, -0.12 - mood * 0.2)); g.addColorStop(0.8, shadeHex(wall0, 0.04 - mood * 0.15));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  layer(0.1, (S) => {
    // a window with soft daylight and a pool of light on the wall
    const wx = -0.95, wy = -1.35, ww = 0.55, wh = 0.62;
    const pool = ctx.createRadialGradient(wx * S + ww * S * 0.5, wy * S + wh * S, 0, wx * S + ww * S * 0.5, wy * S + wh * S, S * 1.3);
    pool.addColorStop(0, hexA(mood > 0.5 ? "#8fb4ff" : warm, 0.35)); pool.addColorStop(1, hexA(warm, 0));
    ctx.fillStyle = pool; ctx.fillRect(-S * 3, -S * 3, S * 6, S * 4);
    ctx.fillStyle = shadeHex(wall0, -0.25); round(ctx, wx * S - S * 0.03, wy * S - S * 0.03, ww * S + S * 0.06, wh * S + S * 0.06, S * 0.02); ctx.fill();
    const sky = ctx.createLinearGradient(0, wy * S, 0, (wy + wh) * S);
    sky.addColorStop(0, mood > 0.5 ? "#2c3b6e" : "#9fd3ff"); sky.addColorStop(1, mood > 0.5 ? "#5a4c7a" : "#fde3c2");
    ctx.fillStyle = sky; ctx.fillRect(wx * S, wy * S, ww * S, wh * S);
    // a far rooftop line and a tree that sways with the wind
    ctx.fillStyle = hexA("#3b4d6a", 0.55);
    ctx.beginPath(); ctx.moveTo(wx * S, (wy + wh) * S);
    for (let i = 0; i <= 8; i++) ctx.lineTo((wx + (ww * i) / 8) * S, (wy + wh - 0.1 - ((i * 37) % 5) * 0.025) * S);
    ctx.lineTo((wx + ww) * S, (wy + wh) * S); ctx.fill();
    ctx.strokeStyle = shadeHex(wall0, -0.3); ctx.lineWidth = S * 0.018;
    ctx.beginPath(); ctx.moveTo((wx + ww / 2) * S, wy * S); ctx.lineTo((wx + ww / 2) * S, (wy + wh) * S); ctx.moveTo(wx * S, (wy + wh / 2) * S); ctx.lineTo((wx + ww) * S, (wy + wh / 2) * S); ctx.stroke();
    // a picture frame
    ctx.fillStyle = shadeHex(wall0, -0.32); round(ctx, 0.55 * S, -1.42 * S, 0.34 * S, 0.26 * S, S * 0.01); ctx.fill();
    ctx.fillStyle = "#ff5f7a"; ctx.globalAlpha = 0.8; round(ctx, 0.58 * S, -1.39 * S, 0.28 * S, 0.2 * S, S * 0.006); ctx.fill(); ctx.globalAlpha = 1;
  });
  // the floor, with boards that converge (perspective)
  // the floor reaches back behind the feet (a horizon above them), so shadows land on it
  const fy = V.cy - (cam.y ?? 0) * V.S * 0.6 - V.S * 0.2;
  const fg = ctx.createLinearGradient(0, fy, 0, H);
  fg.addColorStop(0, shadeHex(floor0, -0.05 - mood * 0.15)); fg.addColorStop(1, shadeHex(floor0, -0.2 - mood * 0.2));
  ctx.fillStyle = fg; ctx.fillRect(0, fy, W, H - fy);
  ctx.strokeStyle = hexA("#000000", 0.07); ctx.lineWidth = 1.2;
  for (let i = -12; i <= 12; i++) {
    const x0 = V.cx + (i * 0.25 - (cam.x ?? 0)) * V.S * 0.55, x1 = V.cx + (i * 0.25 - (cam.x ?? 0)) * V.S * 1.6;
    ctx.beginPath(); ctx.moveTo(x0, fy); ctx.lineTo(x1, H); ctx.stroke();
  }
  ctx.fillStyle = hexA("#000000", 0.08); ctx.fillRect(0, fy - 2, W, 4);
  // a plant on a stool, half way back
  layer(0.6, (S) => {
    ctx.translate(0, -V.S * 0.12);
    const px = 1.05, sway = fbm(t * 0.4, 9) * 0.04;
    ctx.fillStyle = shadeHex(floor0, -0.35); round(ctx, (px - 0.09) * S, -0.22 * S, 0.18 * S, 0.22 * S, S * 0.02); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const a = -1.2 + i * 0.4 + sway * (1 + i * 0.2);
      ctx.save(); ctx.translate(px * S, -0.22 * S); ctx.rotate(a);
      ctx.fillStyle = i % 2 ? "#3f8f6a" : "#2f7756";
      ctx.beginPath(); ctx.ellipse(0, -0.17 * S, 0.045 * S, 0.17 * S, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  });
}

/** A blurred leaf right in front of the lens: sells the depth on camera moves. */
export function foreground(ctx, W, H, cam, unit, t) {
  const V = view(W, H, cam, unit), S = V.S * 1.9;
  ctx.save();
  ctx.filter = `blur(${Math.max(2, S * 0.012)}px)`;
  ctx.translate(V.cx - (cam.x ?? 0) * S - S * 1.15, V.cy + S * 0.02);
  ctx.rotate(-0.5 + fbm(t * 0.5, 31) * 0.05);
  ctx.fillStyle = "#1f3b2c"; ctx.globalAlpha = 0.85;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(i * S * 0.05, -S * 0.12 * i, S * 0.05, S * 0.2, 0.3 * i, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// ---- shadows ------------------------------------------------------------------------------------------
export function contactShadow(ctx, V, x, lift, width = 0.12) {
  const [sx, sy] = V.toScreen([x, 0]);
  const k = clamp(1 + lift * 3, 0.35, 1);
  ctx.fillStyle = `rgba(0,0,0,${0.2 * k})`;
  ctx.beginPath(); ctx.ellipse(sx, sy, V.S * width * k, V.S * 0.018 * k, 0, 0, TAU); ctx.fill();
}
/** The figure layer laid on the floor as a shadow, stretched away from the light. */
export function castShadow(ctx, layer, lx, ly, feetY, { alpha = 0.22, skew = 1.1, squash = 0.17 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.filter = "brightness(0) blur(3px)";
  ctx.translate(0, feetY);
  ctx.transform(1, 0, -skew, squash, 0, 0);
  ctx.drawImage(layer, lx, ly - feetY);
  ctx.restore();
}

// ---- smears and speed lines --------------------------------------------------------------------------
/** trail: screen points, oldest first, for a fast hand or foot. */
export function smear(ctx, trail, color, width) {
  if (trail.length < 2) return;
  const a = trail[0], b = trail[trail.length - 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (d < width * 2.2) return;
  const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
  ctx.save();
  // the stretched limb: wide at the hand, a thread at the tail
  const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
  g.addColorStop(0, hexA(color, 0)); g.addColorStop(1, hexA(color, 0.85));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  for (let i = 1; i < trail.length; i++) { const k = i / (trail.length - 1), p = trail[i]; ctx.lineTo(p[0] + nx * width * k * 0.5, p[1] + ny * width * k * 0.5); }
  for (let i = trail.length - 1; i >= 1; i--) { const k = i / (trail.length - 1), p = trail[i]; ctx.lineTo(p[0] - nx * width * k * 0.5, p[1] - ny * width * k * 0.5); }
  ctx.closePath(); ctx.fill();
  // speed lines behind it
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineCap = "round";
  for (let i = -2; i <= 2; i++) {
    const o = i * width * 0.7, L = d * (0.5 + 0.12 * Math.abs(i));
    ctx.lineWidth = Math.max(1, width * 0.12);
    ctx.beginPath(); ctx.moveTo(b[0] + nx * o - (b[0] - a[0]) / d * width, b[1] + ny * o - (b[1] - a[1]) / d * width);
    ctx.lineTo(b[0] + nx * o - (b[0] - a[0]) / d * (width + L), b[1] + ny * o - (b[1] - a[1]) / d * (width + L)); ctx.stroke();
  }
  ctx.restore();
}

// ---- dust puffs -----------------------------------------------------------------------------------------
export function dust(ctx, V, x, age, color = "#ffffff") {
  if (age < 0 || age > 700) return;
  const k = age / 700;
  for (let i = 0; i < 9; i++) {
    const dir = (i / 8 - 0.5) * 2, r = (0.02 + 0.02 * (i % 3)) * (0.6 + k);
    const [sx, sy] = V.toScreen([x + dir * (0.05 + k * 0.22), -0.015 - Math.abs(Math.sin(i * 1.7)) * k * 0.06]);
    ctx.fillStyle = hexA(color, 0.55 * (1 - k));
    ctx.beginPath(); ctx.arc(sx, sy, r * V.S, 0, TAU); ctx.fill();
  }
}

// ---- the Red Flag impact frame ------------------------------------------------------------------------------
/** Draw over a frozen picture: k 0→1 in, 1→0 out. figureMask: the figure layer (inked here). */
export function impact(ctx, W, H, k, { t = 0, figure = null, fx = 0, fy = 0, flag = null, flagAt = [0, 0], unit = 300 } = {}) {
  if (k <= 0) return;
  ctx.save();
  // the colours flip: red and black
  ctx.globalAlpha = clamp(k * 1.4);
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.75);
  g.addColorStop(0, "#ff2d3d"); g.addColorStop(0.6, "#a3001a"); g.addColorStop(1, "#1a0004");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // radial speed lines, jittering on twos
  const fr = Math.floor(t * 12);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * TAU + Math.sin(i * 12.9 + fr) * 0.03, w = 0.012 + ((i * 7 + fr) % 5) * 0.004;
    const r0 = Math.min(W, H) * (0.22 + ((i * 13 + fr) % 7) * 0.025), r1 = Math.max(W, H);
    ctx.beginPath();
    ctx.moveTo(W / 2 + Math.cos(a - w) * r1, H * 0.45 + Math.sin(a - w) * r1);
    ctx.lineTo(W / 2 + Math.cos(a) * r0, H * 0.45 + Math.sin(a) * r0);
    ctx.lineTo(W / 2 + Math.cos(a + w) * r1, H * 0.45 + Math.sin(a + w) * r1);
    ctx.fill();
  }
  // the figure as a black-ink cut-out with a white edge
  if (figure) {
    ctx.globalAlpha = clamp(k * 1.6);
    ctx.filter = "brightness(0) invert(1) blur(0.5px)";
    for (const [ox, oy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) ctx.drawImage(figure, fx + ox, fy + oy);
    ctx.filter = "brightness(0)";
    ctx.drawImage(figure, fx, fy);
    ctx.filter = "none";
  }
  // the flag on its pole, cloth on the wind
  if (flag) { ctx.globalAlpha = 1; flagMast(ctx, flag, flagAt, unit); }
  // the words
  const s = 1 + (1 - clamp(k * 1.3)) * 0.6;
  ctx.globalAlpha = clamp(k * 1.5);
  ctx.translate(W / 2, H * 0.86); ctx.scale(s, s); ctx.rotate(-0.06);
  ctx.font = `900 ${Math.round(Math.min(W, H) * 0.13)}px Fraunces, Georgia, serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = Math.min(W, H) * 0.02; ctx.strokeStyle = "#000"; ctx.lineJoin = "round";
  ctx.strokeText("RED FLAG", 0, 0);
  ctx.fillStyle = "#fff4e6"; ctx.fillText("RED FLAG", 0, 0);
  ctx.restore();
}

/**
 * The red flag flying from a red exclamation mark, at [px, py] (the top of the mark), S px
 * per unit. hoist 0–1: how far up the mast the flag has been raised (1 = at the top).
 */
export function flagMast(ctx, flag, [px, py], S, hoist = 1) {
  ctx.save();
    // the mast is a red exclamation mark (Ak, 4 Nov): a tapered bar the flag flies from, and its dot
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = S * 0.06; ctx.shadowOffsetY = S * 0.025;
    const top = py - S * 0.05, bot = py + S * 0.78, wT = S * 0.1, wB = S * 0.055;
    ctx.beginPath();
    ctx.moveTo(px - wT, top); ctx.lineTo(px + wT, top); ctx.lineTo(px + wB, bot); ctx.quadraticCurveTo(px, bot + S * 0.04, px - wB, bot); ctx.closePath();
    ctx.moveTo(px + S * 0.09, py + S * 0.98); ctx.arc(px, py + S * 0.98, S * 0.09, 0, TAU);
    ctx.fillStyle = "#ff2338"; ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = S * 0.022; ctx.strokeStyle = "#14000a"; ctx.lineJoin = "round"; ctx.stroke();
    // a cream shine down the bar
    ctx.strokeStyle = "rgba(255,240,220,0.7)"; ctx.lineWidth = S * 0.012; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(px - wT * 0.45, top + S * 0.06); ctx.lineTo(px - wB * 0.4, bot - S * 0.12); ctx.stroke();
    ctx.restore();
    const { cols, rows, p } = flag;
    const lower = (1 - hoist) * S * 0.62; // raised from low on the bar to its top
    const at = (q) => [px + (q[0] - p[0][0]) * S, py + lower + (q[1] - p[0][1]) * S];
    // the flag's outline (all four edges), drawn black and thick first so it reads on red
    const edge = [];
    for (let c = 0; c < cols; c++) edge.push(at(p[c]));
    for (let r = 1; r < rows; r++) edge.push(at(p[r * cols + cols - 1]));
    for (let c = cols - 2; c >= 0; c--) edge.push(at(p[(rows - 1) * cols + c]));
    ctx.beginPath(); edge.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath();
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = S * 0.08; ctx.shadowOffsetY = S * 0.03;
    ctx.fillStyle = "#14000a"; ctx.fill(); ctx.restore();
    ctx.lineWidth = S * 0.03; ctx.strokeStyle = "#14000a"; ctx.lineJoin = "round"; ctx.stroke();
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const a = p[r * cols + c], b = p[r * cols + c + 1], d = p[(r + 1) * cols + c + 1], e = p[(r + 1) * cols + c];
      // shade each cell by how it faces: a slope towards the light is bright, away is deep red
      const dx = b[0] - a[0], dy = b[1] - a[1], f = clamp(0.78 - (dy / (Math.hypot(dx, dy) + 1e-6)) * 2.2, 0.35, 1.25);
      const hi = Math.max(0, f - 1) * 2.4;
      ctx.fillStyle = `rgb(${Math.round(Math.min(255, 235 * f + hi * 40))},${Math.round(28 * f + hi * 70)},${Math.round(44 * f + hi * 60)})`;
      ctx.beginPath();
      [a, b, d, e].forEach((q, i) => { const s2 = at(q); i ? ctx.lineTo(s2[0], s2[1]) : ctx.moveTo(s2[0], s2[1]); });
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
}

// ---- helpers --------------------------------------------------------------------------------------------
export function round(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function hexA(c, a) { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
export function shadeHex(c, k) {
  const n = parseInt(c.slice(1), 16), f = (v) => Math.round(clamp(k < 0 ? v * (1 + k) : v + (255 - v) * k, 0, 255));
  return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`;
}
