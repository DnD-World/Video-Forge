// Grapheme → Viseme index (0-8), Greek + English aware.
// Fidelity target ~85%. Deterministic: same text = same visemes.

export const VISEME = {
  NEUTRAL: 0, AH: 1, EE: 2, OH: 3, OO: 4,
  MBP: 5, FV: 6, L: 7, CH_SH: 8,
} as const;

export type VisemeId = typeof VISEME[keyof typeof VISEME];

/** The closed smile: a RESTING mouth, not a sound.
 *
 *  Outside 0-8 on purpose. No letter can produce it, so nothing that turns
 *  text into visemes can ever ask for it by accident; the performance code
 *  swaps it in for NEUTRAL between words on a happy line. A puppet without the
 *  drawing simply falls back to its neutral mouth. */
export const SMILE_VISEME = 9;

/**
 * HALF-OPEN SHAPES (13 Oct 2026): a smaller AH, OH and EE. Used for short,
 * unstressed vowels, and as the step between two open shapes — L→O, OO→L,
 * EE→AH — so the mouth flows instead of snapping (Ak). Puppets made before
 * have none: fullShape() gives the full one back, so nothing breaks.
 */
export const HALF = { AH: 10, OH: 11, EE: 12 } as const;
export type HalfId = typeof HALF[keyof typeof HALF];
export type MouthId = VisemeId | HalfId;
export function fullShape(v: number): VisemeId {
  return (v === HALF.AH ? VISEME.AH : v === HALF.OH ? VISEME.OH : v === HALF.EE ? VISEME.EE : v) as VisemeId;
}

// Order matters: check multi-char digraphs BEFORE single chars.
const DIGRAPHS: [RegExp, VisemeId][] = [
  [/^ου/i, VISEME.OO],
  [/^τσ|^τζ/i, VISEME.CH_SH],
  [/^sh|^ch|^ph/i, VISEME.CH_SH],
  [/^oo|^ou/i, VISEME.OO],
  [/^th/i, VISEME.L],
];

const SINGLES: Record<string, VisemeId> = {
  // Vowels — Greek
  α: VISEME.AH, ά: VISEME.AH,
  ε: VISEME.EE, έ: VISEME.EE, η: VISEME.EE, ή: VISEME.EE,
  ι: VISEME.EE, ί: VISEME.EE, υ: VISEME.EE, ύ: VISEME.EE,
  ο: VISEME.OH, ό: VISEME.OH, ω: VISEME.OH, ώ: VISEME.OH,
  // Vowels — English
  a: VISEME.AH, e: VISEME.EE, i: VISEME.EE, y: VISEME.EE,
  o: VISEME.OH, u: VISEME.OO, w: VISEME.OO,
  // Bilabials
  μ: VISEME.MBP, π: VISEME.MBP, β: VISEME.FV,
  m: VISEME.MBP, b: VISEME.MBP, p: VISEME.MBP,
  // Labiodentals
  φ: VISEME.FV, f: VISEME.FV, v: VISEME.FV,
  // Tongue-forward
  λ: VISEME.L, ρ: VISEME.L, ν: VISEME.L, δ: VISEME.L, θ: VISEME.L,
  τ: VISEME.L, l: VISEME.L, r: VISEME.L, n: VISEME.L,
  d: VISEME.L, t: VISEME.L,
  // Sibilants
  σ: VISEME.CH_SH, ς: VISEME.CH_SH, ξ: VISEME.CH_SH, ψ: VISEME.CH_SH,
  ζ: VISEME.CH_SH, s: VISEME.CH_SH, z: VISEME.CH_SH,
  j: VISEME.CH_SH, x: VISEME.CH_SH, c: VISEME.CH_SH,
  κ: VISEME.CH_SH, γ: VISEME.CH_SH, χ: VISEME.CH_SH,
  k: VISEME.CH_SH, g: VISEME.CH_SH, h: VISEME.CH_SH, q: VISEME.CH_SH,
};

export function graphemeToViseme(text: string): VisemeId[] {
  const out: VisemeId[] = [];
  let s = text.toLowerCase();
  while (s.length) {
    let matched = false;
    for (const [rx, v] of DIGRAPHS) {
      const m = s.match(rx);
      if (m) { out.push(v); s = s.slice(m[0].length); matched = true; break; }
    }
    if (matched) continue;
    const ch = s[0];
    if (SINGLES[ch] !== undefined) out.push(SINGLES[ch]);
    else if (/\s|[.,;·!?]/.test(ch)) out.push(VISEME.NEUTRAL);
    s = s.slice(1);
  }
  return out.length ? out : [VISEME.NEUTRAL];
}
