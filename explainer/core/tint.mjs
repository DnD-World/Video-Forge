// ---------------------------------------------------------------------------
// Tint: recolour a finished frame onto a light→dark ramp of chosen colours.
// Works on any style, built-in or imported (Ak, 20 Oct 2026: "even noir can
// be more sepia or more maroon"). amount 0 = untouched, 1 = fully tinted.
// ---------------------------------------------------------------------------

import { hexToRgb } from "./math.mjs";

export const TINT_PRESETS = {
  sepia: { dark: "#2b1a0e", light: "#f3e3c3" },
  maroon: { dark: "#2a0710", light: "#f6d9d4" },
  ink: { dark: "#071C26", light: "#E9FEF5" },
  mint: { dark: "#0B2837", light: "#76FFC2" },
};

/** Tint RGBA pixel data in place. */
export function tintPixels(data, tint) {
  const d = hexToRgb(tint.dark), l = hexToRgb(tint.light), k = Math.max(0, Math.min(1, tint.amount ?? 1));
  if (k <= 0) return;
  for (let i = 0; i < data.length; i += 4) {
    const y = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    data[i] += (d[0] + (l[0] - d[0]) * y - data[i]) * k;
    data[i + 1] += (d[1] + (l[1] - d[1]) * y - data[i + 1]) * k;
    data[i + 2] += (d[2] + (l[2] - d[2]) * y - data[i + 2]) * k;
  }
}

/** Resolve "sepia" or { dark, light, amount } into a tint object (or null). */
export function resolveTint(t) {
  if (!t) return null;
  if (typeof t === "string") return TINT_PRESETS[t] ? { ...TINT_PRESETS[t], amount: 1 } : null;
  const base = t.preset ? TINT_PRESETS[t.preset] : null;
  const out = { dark: t.dark ?? base?.dark, light: t.light ?? base?.light, amount: t.amount ?? 1 };
  return out.dark && out.light ? out : null;
}
