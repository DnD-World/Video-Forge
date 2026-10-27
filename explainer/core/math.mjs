// ---------------------------------------------------------------------------
// Small, dependency-free helpers for explainer pages (browser and Node).
//
// Every explainer frame is a pure function of time: the same t always draws
// the same pixels. So nothing here touches Math.random — randomness comes from
// seeded generators, and animation comes from time windows and easings.
// Written for Video Forge (Oct 2026); no third-party code.
// ---------------------------------------------------------------------------

export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, k) => a + (b - a) * k;

/** 0 before `a`, 1 after `b`, linear in between. */
export const win = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));

export const ease = {
  linear: (k) => k,
  out: (k) => 1 - (1 - k) ** 3,
  in: (k) => k ** 3,
  inOut: (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  /** Overshoots a little, then settles — for things that "land". */
  back: (k) => {
    const c = 1.6;
    return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2;
  },
};

/** FNV-1a: a stable 32-bit hash of a string (seeds from names). */
export function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded generator (mulberry32). rng() -> [0,1). */
export function seeded(seed) {
  let a = (typeof seed === "string" ? hash32(seed) : seed >>> 0) || 1;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + r() * (hi - lo);
  r.int = (lo, hi) => Math.floor(lo + r() * (hi - lo + 1));
  r.bit = () => (r() < 0.5 ? 0 : 1);
  return r;
}

/** A cell's own random number, without walking a generator: rand2(seed, i, j). */
export function rand2(seed, i, j) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgba = (hex, a = 1) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

/** Mix two hex colours; returns a hex string. */
export function mix(h1, h2, k) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return "#" + a.map((v, i) => Math.round(lerp(v, b[i], k)).toString(16).padStart(2, "0")).join("");
}

/** WCAG relative luminance and contrast ratio (for the readability check). */
export function luminance(hex) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(h1, h2) {
  const a = luminance(h1), b = luminance(h2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
