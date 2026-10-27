// ---------------------------------------------------------------------------
// Fonts an explainer can use.
//
// BUNDLED: shipped with the app (npm @fontsource packages, free OFL licences),
// so they work offline. GOOGLE: any family from the Google Fonts library,
// downloaded on first use and kept in a local cache, so a project that used it
// once re-renders offline too (tools/lib/explainerFonts.mjs).
// Every explainer uses four weights: 400 text, 500 labels, 600 headlines, 700 numbers.
// ---------------------------------------------------------------------------

export const WEIGHTS = [400, 500, 600, 700];

export const BUNDLED_FONTS = [
  { family: "Sora", pkg: "sora", feel: "Stravelakis brand · geometric" },
  { family: "Inter", pkg: "inter", feel: "Neutral, very readable" },
  { family: "Manrope", pkg: "manrope", feel: "Friendly geometric" },
  { family: "DM Sans", pkg: "dm-sans", feel: "Soft, modern" },
  { family: "Space Grotesk", pkg: "space-grotesk", feel: "Techy, quirky" },
  { family: "Nunito", pkg: "nunito", feel: "Rounded, warm" },
  { family: "Lora", pkg: "lora", feel: "Book serif" },
  { family: "Merriweather", pkg: "merriweather", feel: "Sturdy serif" },
  { family: "Playfair Display", pkg: "playfair-display", feel: "Elegant headline serif" },
  { family: "Caveat", pkg: "caveat", feel: "Handwritten" },
  { family: "IBM Plex Mono", pkg: "ibm-plex-mono", feel: "Typewriter / code" },
];

export const isBundled = (family) => BUNDLED_FONTS.some((f) => f.family === family);

/** Covers alphabets a chosen font lacks (Greek, Cyrillic, Vietnamese…). */
export const FALLBACK_FONT = "Inter";

/** CSS font-family list for drawing: the chosen family, then the fallback, then the system. */
export const fontStack = (family) => `"${family}", "${FALLBACK_FONT}", "Sora", "Segoe UI", sans-serif`;

/** File-system-safe slug for a family name: "Playfair Display" -> "playfair-display". */
export const fontSlug = (family) => family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
