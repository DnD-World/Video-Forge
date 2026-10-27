// Small helpers for drawn characters. The colour maths is shared with the
// explainers (one definition of "readable"); the hash is the wobble/grain noise.
export { clamp, lerp, ease, hexToRgb, mix, contrast, luminance, seeded, hash32 } from "../../explainer/core/math.mjs";

/** A stable number in [0,1) for two integers — noise without a generator. */
export const hash = (a, b = 0) => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Any CSS colour this code writes (#rgb, #rrggbb, rgb(...)) as #rrggbb. */
export function toHex(c) {
  const s = String(c).trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(s)) return "#" + s.slice(1).split("").map((x) => x + x).join("").toLowerCase();
  const m = s.match(/\d+(\.\d+)?/g);
  if (m && m.length >= 3) return "#" + m.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(+v))).toString(16).padStart(2, "0")).join("");
  return "#000000";
}

/** Lighten (k > 0) or darken (k < 0) a colour; returns #rrggbb. */
export function shade(c, k) {
  const h = toHex(c);
  const n = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return "#" + n.map((v) => f(v).toString(16).padStart(2, "0")).join("");
}

/** The colour in `list` closest to `c` (for spot-ink looks). */
export function nearest(c, list) {
  const h = toHex(c), v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  let best = list[0], bd = Infinity;
  for (const q of list) {
    const w = [1, 3, 5].map((i) => parseInt(toHex(q).slice(i, i + 2), 16));
    const d = (v[0] - w[0]) ** 2 * 0.3 + (v[1] - w[1]) ** 2 * 0.59 + (v[2] - w[2]) ** 2 * 0.11;
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

export const smooth = (k) => k * k * (3 - 2 * k);
