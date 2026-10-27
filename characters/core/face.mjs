// ---------------------------------------------------------------------------
// The face as numbers: mouth shapes, eyelids, eyebrows.
//
// Video Forge already turns narration into mouth ids (src/lib/visemes):
//   0 rest · 1 AH · 2 EE · 3 OH · 4 OO · 5 M/B/P · 6 F/V · 7 L · 8 SH
//   9 closed smile · 10 half AH · 11 half OH · 12 half EE
// A picture puppet needs a drawing for each; a drawn character needs only a
// few numbers per shape, and can BLEND between any two of them, so the mouth
// flows instead of cutting. Same for lids (open → half → closed, or wide) and
// brows (the names Image Forge uses: serious, happy, raised, worried,
// confused, plus angry).
// ---------------------------------------------------------------------------

import { clamp, lerp } from "./math.mjs";

/**
 * w width, h opening (both × head radius), round 0–1 (oval → circle),
 * teeth 0–1 upper teeth showing, tuck lower lip under the teeth (F/V),
 * tongue 0–1, smile −1–1 corner curve, press lips pressed (M/B/P).
 */
export const MOUTHS = {
  0: { w: 0.42, h: 0, round: 0, teeth: 0, tuck: 0, tongue: 0, smile: 0, press: 0 },
  1: { w: 0.5, h: 0.4, round: 0.15, teeth: 0.35, tuck: 0, tongue: 0.25, smile: 0, press: 0 },
  2: { w: 0.62, h: 0.15, round: 0, teeth: 1, tuck: 0, tongue: 0, smile: 0.25, press: 0 },
  3: { w: 0.34, h: 0.36, round: 1, teeth: 0, tuck: 0, tongue: 0.15, smile: 0, press: 0 },
  4: { w: 0.2, h: 0.2, round: 1, teeth: 0, tuck: 0, tongue: 0, smile: 0, press: 0 },
  5: { w: 0.4, h: 0, round: 0, teeth: 0, tuck: 0, tongue: 0, smile: 0, press: 1 },
  6: { w: 0.44, h: 0.06, round: 0, teeth: 0.9, tuck: 1, tongue: 0, smile: 0, press: 0 },
  7: { w: 0.44, h: 0.17, round: 0.2, teeth: 0.6, tuck: 0, tongue: 1, smile: 0, press: 0 },
  8: { w: 0.4, h: 0.13, round: 0.45, teeth: 1, tuck: 0, tongue: 0, smile: 0, press: 0 },
  9: { w: 0.5, h: 0, round: 0, teeth: 0, tuck: 0, tongue: 0, smile: 1, press: 0 },
  10: { w: 0.46, h: 0.2, round: 0.15, teeth: 0.2, tuck: 0, tongue: 0.1, smile: 0, press: 0 },
  11: { w: 0.28, h: 0.24, round: 1, teeth: 0, tuck: 0, tongue: 0, smile: 0, press: 0 },
  12: { w: 0.55, h: 0.08, round: 0, teeth: 0.7, tuck: 0, tongue: 0, smile: 0.15, press: 0 },
};

const blend = (a, b, k) => Object.fromEntries(Object.keys(a).map((key) => [key, lerp(a[key], b[key], k)]));

/** The mouth between two ids, k = how far into the second (0–1). */
export function mouthShape(from, to, k = 1) {
  const a = MOUTHS[from] ?? MOUTHS[0], b = MOUTHS[to] ?? MOUTHS[0];
  return blend(a, b, clamp(k));
}

/** Lid closure per state: 0 open, 1 shut, negative = wider than open. */
export const LIDS = { open: 0, half: 0.55, closed: 1, wide: -0.3 };
export const lidAmount = (from = "open", to = from, k = 1) => lerp(LIDS[from] ?? 0, LIDS[to] ?? 0, clamp(k));

/** Brow shape per side: lift (× head radius), tilt (+ = inner end down, angry), arch. */
export const BROWS = {
  serious: { lift: 0, tilt: 0, arch: 0.15 },
  happy: { lift: 0.08, tilt: -0.1, arch: 0.6 },
  raised: { lift: 0.16, tilt: 0, arch: 0.35 },
  worried: { lift: 0.07, tilt: -0.4, arch: 0.1 },
  confused: { lift: 0.13, tilt: 0.15, arch: 0.2 }, // one side; the other is "serious"
  angry: { lift: -0.05, tilt: 0.45, arch: 0 },
};
export const browShape = (name) => BROWS[name] ?? BROWS.serious;

/** The resting mouth for a character's chosen expression. */
export const EXPRESSION_REST = { neutral: 0, smile: 9, serious: 0, grumpy: 0 };
/** Corner curve the expression adds on top of any shape (grumpy turns down). */
export const EXPRESSION_SMILE = { neutral: 0, smile: 0.25, serious: -0.05, grumpy: -0.45 };
