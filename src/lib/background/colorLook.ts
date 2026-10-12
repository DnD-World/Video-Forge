// Colour effects on the background footage (Ak, 12 Oct 2026: "dimness,
// blurry, other colour effects… sepia"). One CSS filter per look, used the
// same way by the preview, the Remotion path and the HyperFrames page, so
// what you choose is what renders.

export interface ColorLook {
  id: string;
  label: string;
  /** Plain-words hover help. */
  tip: string;
  css: string;
}

export const COLOR_LOOKS: ColorLook[] = [
  { id: "none", label: "Natural", tip: "The footage as it was filmed.", css: "" },
  { id: "sepia", label: "Sepia", tip: "Old-photo brown tones. Calm, nostalgic.", css: "sepia(0.75) saturate(1.1)" },
  { id: "bw", label: "Black & white", tip: "No colour, so the characters stand out more.", css: "grayscale(1) contrast(1.05)" },
  { id: "warm", label: "Warm", tip: "A little more orange: cosy, friendly.", css: "sepia(0.25) saturate(1.2) hue-rotate(-8deg)" },
  { id: "cool", label: "Cool", tip: "A little more blue: calm, clean, techy.", css: "saturate(0.9) hue-rotate(12deg) brightness(0.98)" },
  { id: "vivid", label: "Vivid", tip: "Stronger colours: energetic, for promos.", css: "saturate(1.45) contrast(1.08)" },
  { id: "faded", label: "Faded", tip: "Washed-out, soft colours that stay in the background.", css: "saturate(0.55) contrast(0.85) brightness(1.08)" },
];

export function colorLookCss(id: string | null | undefined): string {
  return COLOR_LOOKS.find((l) => l.id === id)?.css ?? "";
}
