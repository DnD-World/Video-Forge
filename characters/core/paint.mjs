// ---------------------------------------------------------------------------
// Colour and fill: how a look turns "this shape is the character's blue
// jacket" into pixels.
//
//   toneColor  the look's colour treatment (black & white film, spot inks …)
//   paint      fill + shading + outline of the current path, in the look's way
//
// Patterns (hatching, halftone dots, light holes, grain) need a small canvas.
// The browser makes one with document/OffscreenCanvas; tests hand in a fake
// with setCanvasFactory. Nothing here reads the clock or Math.random.
// ---------------------------------------------------------------------------

import { hash, hexToRgb, luminance, mix, nearest, shade, toHex } from "./math.mjs";
import { TAU } from "./pen.mjs";

let makeCanvas = (w, h) => {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
};
/** Swap how small helper canvases are made (tests, workers). */
export function setCanvasFactory(fn) { makeCanvas = fn; patterns.clear(); }
export const newCanvas = (w, h) => makeCanvas(w, h);

// One cache per kind of canvas: the recording canvas that measures a figure
// (record.mjs) hands out a stand-in pattern, and sharing one cache let that
// stand-in be reused on real canvases, where it draws nothing (28 Oct 2026:
// every punched hole, halftone dot and hatch after the first measuring).
const caches = new Map();
const patterns = { clear: () => caches.clear() };
function pattern(ctx, key, size, draw) {
  let cache = caches.get(ctx.constructor);
  if (!cache) caches.set(ctx.constructor, (cache = new Map()));
  let p = cache.get(key);
  if (!p) {
    const c = makeCanvas(size, size);
    draw(c.getContext("2d"), size);
    p = ctx.createPattern(c, "repeat");
    cache.set(key, p);
  }
  return p;
}
export const hatchPattern = (ctx, ink) => pattern(ctx, "hatch" + ink, 9, (g) => {
  g.strokeStyle = ink; g.globalAlpha = 0.55; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(-1, 10); g.lineTo(10, -1); g.stroke();
});
export const dotPattern = (ctx, a) => pattern(ctx, "dots" + a, 8, (g) => {
  g.fillStyle = `rgba(0,0,0,${a})`; g.beginPath(); g.arc(4, 4, 1.7, 0, TAU); g.fill();
});
export const holePattern = (ctx) => pattern(ctx, "holes", 11, (g) => {
  g.fillStyle = "rgba(255,244,210,0.95)"; g.beginPath(); g.arc(5.5, 5.5, 1.2, 0, TAU); g.fill();
});
/**
 * Karagiozis ornaments: the rows of small holes punched in the leather, with
 * a tiny star of holes between them; `light` is the screen showing through.
 */
export const punchPattern = (ctx, light, big = false) => pattern(ctx, "punch" + light + big, big ? 22 : 16, (g, n) => {
  g.fillStyle = light;
  const r = big ? 2.8 : 1.9;
  const dot = (x, y, rr = r) => { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); };
  dot(n * 0.25, n * 0.25); dot(n * 0.75, n * 0.75);
  if (big) { for (const [dx, dy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) dot(n * 0.75 + dx, n * 0.25 + dy, 1.3); dot(n * 0.75, n * 0.25, 1.6); }
  else dot(n * 0.75, n * 0.25, 0.9);
});
export const grainPattern = (ctx) => pattern(ctx, "grain", 160, (g, n) => {
  const d = g.createImageData(n, n);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = hash(i, 77) * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = hash(i, 78) > 0.55 ? 255 : 0;
  }
  g.putImageData(d, 0, 0);
});

// ---- colour treatments ---------------------------------------------------------------

const grey = (c) => luminance(toHex(c));
const levels = (c, list) => list[Math.min(list.length - 1, Math.floor(grey(c) ** 0.6 * list.length))];
function vivid(c) {
  const [r, g, b] = hexToRgb(toHex(c)), m = (r + g + b) / 3;
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(m + (v - m) * 1.3))).toString(16).padStart(2, "0")).join("");
}
const TWO_STRIP = ["#a8322b", "#2f4a3a", "#3f6b4f", "#5a3622", "#f1e3c4", "#2b1d16", "#c9a46e"];
const PRIMARY = ["#e2231a", "#1f5fd1", "#ffd400", "#1b1b1b", "#ffffff", "#1e9e4a"];

/**
 * A character colour as this look shows it. role: "skin" | "hair" | "cloth" |
 * "shoe" | "eye" (whites) | "feature" (pupils, mouth inside) | "lip".
 */
export function toneColor(look, c, role = "cloth") {
  if (!c) return c;
  switch (look.tone) {
    case "mono": return look.mono;
    case "bw":
      if (role === "skin" || role === "eye") return "#f4ecdc";
      return levels(c, ["#1a1a1a", "#3a3a3a", "#6b6b6b", "#d9d4c8"]);
    case "twostrip":
      if (role === "skin") return "#f1d7b0";
      if (role === "eye") return "#f1e3c4";
      return nearest(c, TWO_STRIP);
    case "noir": {
      if (role === "skin" || role === "eye") return "#e8e2d6";
      const [r, g, b] = hexToRgb(toHex(c));
      if (r > g + 60 && r > b + 60) return "#d7261e";
      return levels(c, ["#0d0d0d", "#202020", "#3a3a3a", "#8a8a8a", "#f2f2f2"]);
    }
    case "primary":
      if (role === "skin") return mix(toHex(c), "#ffd2b0", 0.5);
      if (role === "eye") return "#ffffff";
      return nearest(c, PRIMARY);
    case "spot": return role === "eye" ? "#f3efe4" : nearest(c, look.spot);
    case "vivid": return role === "skin" || role === "eye" ? c : vivid(c);
    default: return c;
  }
}

/** The look's line colour for one character (neon takes it from the clothes). */
export function inkFor(look, card) {
  if (look.inkFrom === "top") {
    // what you see most of: the outer layer, else a full-length item, else the top
    const pick = (slot) => card.wear?.find((w) => w.slot === slot)?.colors?.[0];
    const top = pick("outer") ?? pick("full") ?? pick("top") ?? "#3ef0ff";
    // a neon tube is bright: push the clothes colour towards full brightness
    return shade(vivid(top), 0.35);
  }
  return look.ink ?? "#141414";
}

// ---- painting ----------------------------------------------------------------------------

/**
 * Fill and outline the pen's current path the look's way.
 * G = { ctx, pen, look, S, ink }. opts:
 *   role      for toneColor
 *   feature   pupils, mouth inside, buttons: drawn as given, never hatched/hidden
 *   outline   override (fraction of height); noShade: skip shading
 */
export function paint(G, fill0, { role = "cloth", feature = false, outline, noShade = false, dotAlpha = 0.28 } = {}) {
  const { ctx, pen, look, S } = G;
  const ink = G.ink;
  const ow = outline ?? look.outline ?? 0;
  let fill = feature ? fill0 : toneColor(look, fill0, role);
  if (!feature && look.fill === "none") {
    // line art still has a front and a back: the shape erases what is behind
    // it (a braid behind the head, a helmet strap behind the face), then
    // only its outline is drawn. drawFigure always gives these looks a layer.
    if (fill0 && pen.last?.closed) { ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "#000"; ctx.fill(); ctx.restore(); }
    fill = null;
  }
  if (fill) {
    if (look.fill === "hatch" && !feature) {
      // ballpoint: faces stay clean paper, everything else is hatched
      // paper first, so what is behind the shape does not show between the hatch lines
      ctx.fillStyle = look.paper ?? "#fbfaf3"; ctx.fill();
      if (role !== "skin" && role !== "eye") { ctx.fillStyle = hatchPattern(ctx, ink); ctx.fill(); }
    } else if (look.offset && !feature && pen.last) {
      pen.trace(pen.last.q, pen.last.closed, look.offset[0] * S, look.offset[1] * S);
      ctx.fillStyle = fill; ctx.fill();
      pen.trace(pen.last.q, pen.last.closed);
    } else if (look.translucent && !feature) {
      // painted see-through leather, punched with rows of holes the light shines through
      ctx.save();
      ctx.globalAlpha = 0.86; ctx.fillStyle = fill; ctx.fill();
      ctx.globalAlpha = 1;
      if (role !== "skin" && role !== "eye") { ctx.fillStyle = punchPattern(ctx, look.light ?? "#fff4d2", !!look.cutouts); ctx.fill(); }
      ctx.restore();
    } else {
      ctx.fillStyle = fill; ctx.fill();
    }
    if (look.fill === "glass" && !feature) {
      const b = pen.bounds();
      if (b) {
        const w = b.x1 - b.x0, h = b.y1 - b.y0;
        const g = ctx.createRadialGradient(b.x0 + w * 0.35, b.y0 + h * 0.3, 1, b.x0 + w / 2, b.y0 + h / 2, Math.max(w, h) * 0.7);
        g.addColorStop(0, "rgba(255,255,255,0.45)"); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.fill();
      }
    }
    const shading = !noShade && !feature && (look.shade || look.halftone || look.inner);
    if (shading) {
      ctx.save(); ctx.clip();
      const b = pen.bounds();
      const cx = b ? (b.x0 + b.x1) / 2 : 0;
      if (look.inner) { ctx.strokeStyle = shade(fill, 0.45); ctx.lineWidth = ow * S * 2.6; ctx.stroke(); }
      if (look.shade && role !== "skin") { ctx.fillStyle = `rgba(20,10,40,${look.shade})`; ctx.fillRect(cx, -1e5, 2e5, 2e5); }
      if (look.halftone) { ctx.fillStyle = dotPattern(ctx, role === "skin" ? 0.07 : dotAlpha); ctx.fillRect(cx, -1e5, 2e5, 2e5); }
      ctx.restore();
    }
  }
  if (ow > 0) {
    ctx.strokeStyle = ink; ctx.lineWidth = ow * S; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.stroke();
    // shadow-theatre figures have a second thin line just inside the edge
    if (look.doubleLine && fill && !feature && role !== "eye") {
      ctx.save(); ctx.clip();
      ctx.lineWidth = ow * S * 3.6; ctx.strokeStyle = ink; ctx.stroke();
      ctx.lineWidth = ow * S * 2.6; ctx.strokeStyle = fill; ctx.stroke();
      ctx.restore();
      ctx.lineWidth = ow * S; ctx.strokeStyle = ink; ctx.stroke(); // the main edge again, on top
    }
  }
}

/** Stroke a limb or line in the look's way (tube with outline, or a plain line). */
export function strokeLine(G, color, width, { role = "cloth", outline } = {}) {
  const { ctx, look, S } = G;
  const ow = outline ?? look.outline ?? 0;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const c = look.fill === "none" ? G.ink : toneColor(look, color, role);
  if (ow > 0 && look.fill !== "none") {
    ctx.strokeStyle = G.ink; ctx.lineWidth = (width + ow * 2) * S; ctx.stroke();
  }
  if (look.fill === "none") { ctx.strokeStyle = G.ink; ctx.lineWidth = Math.max(ow, width * 0.5) * S; ctx.stroke(); return; }
  ctx.strokeStyle = look.fill === "hatch" ? G.ink : c; ctx.lineWidth = width * S; ctx.stroke();
}
