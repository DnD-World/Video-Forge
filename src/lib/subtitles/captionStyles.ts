// ---------------------------------------------------------------------------
// CAPTION STYLES (28 Oct 2026, batch 3 item 5). One click sets the subtitle
// controls to a look that already works on short-form video — Ak: "lets not
// reinvent the wheel" — plus no more than three signature looks of our own.
// Every style only sets fields SubtitleConfig already has; a style is a
// starting point and every control stays editable afterwards.
// ---------------------------------------------------------------------------
import type { SubtitleConfig } from "../../store/types";

export interface CaptionStyle {
  id: string;
  label: string;
  /** Plain words for the hover help. */
  tip: string;
  signature?: boolean;
  /** A font from the curated list in electron/net/fonts.ts, all with Greek;
   *  the style still applies if the fetch fails. */
  font?: { family: string; weight: number };
  set: Partial<SubtitleConfig>;
}

const noSurface = { style: "none", blur: 0.008, color: "#000000", opacity: 0.6, borderOpacity: 0, radius: 0.3 } as const;

export const CAPTION_STYLES: CaptionStyle[] = [
  {
    id: "bold-box",
    label: "Bold box",
    tip: "Big white capitals; the word being said sits on a coloured block. The look of most business and coaching shorts.",
    font: { family: "Noto Sans", weight: 900 },
    set: {
      uppercase: true, maxChars: 22, fontSize: 0.058, color: "#ffffff", activeColor: "#7c3aed",
      strokeColor: "#000000", strokeWidth: 0.14, activeEmphasis: "box", reveal: "all", keepSpoken: false,
      activeFromSpeaker: false, position: "bottom", surface: { ...noSurface }, transition: { style: "pop", durationMs: 200, overshoot: 1.08, blur: 0.3 },
    },
  },
  {
    id: "karaoke",
    label: "Karaoke",
    tip: "The whole line shows; words turn yellow as they are said and stay yellow. Easy to read along.",
    font: { family: "Open Sans", weight: 800 },
    set: {
      uppercase: false, maxChars: 32, fontSize: 0.05, color: "#ffffff", activeColor: "#ffd400",
      strokeColor: "#000000", strokeWidth: 0.16, activeEmphasis: "stroke", reveal: "all", keepSpoken: true,
      activeFromSpeaker: false, position: "bottom", surface: { ...noSurface }, transition: { style: "crossBlur", durationMs: 180, overshoot: 1, blur: 0.4 },
    },
  },
  {
    id: "one-word",
    label: "One word",
    tip: "One huge word at a time, popping in on the beat. Fast, punchy, made for phones.",
    font: { family: "Roboto Condensed", weight: 900 },
    set: {
      uppercase: true, maxChars: 18, fontSize: 0.07, color: "#ffffff", activeColor: "#ffffff",
      strokeColor: "#000000", strokeWidth: 0.12, activeEmphasis: "lift", reveal: "word", keepSpoken: false,
      activeFromSpeaker: false, position: "center",  surface: { ...noSurface }, transition: { style: "pop", durationMs: 160, overshoot: 1.12, blur: 0.2 },
    },
  },
  {
    id: "clean-outline",
    label: "Clean outline",
    tip: "White words with a black edge, the spoken word in the speaker's colour. The everyday phone-video look.",
    font: { family: "Inter", weight: 900 },
    set: {
      uppercase: false, maxChars: 30, fontSize: 0.046, color: "#ffffff", activeColor: "#00e0ff",
      strokeColor: "#000000", strokeWidth: 0.2, activeEmphasis: "stroke", reveal: "all", keepSpoken: false,
      activeFromSpeaker: true, position: "bottom", surface: { ...noSurface }, transition: { style: "pop", durationMs: 180, overshoot: 1.04, blur: 0.3 },
    },
  },
  {
    id: "lesson",
    label: "Lesson bar",
    tip: "Calm sentence-case words on a soft dark bar at the bottom. For lessons and longer videos.",
    font: { family: "Source Sans 3", weight: 700 },
    set: {
      uppercase: false, maxChars: 44, fontSize: 0.036, color: "#ffffff", activeColor: "#ffd166",
      strokeColor: "#000000", strokeWidth: 0, activeEmphasis: "glow", activeGlow: 0.35, reveal: "all", keepSpoken: false,
      activeFromSpeaker: false, position: "bottom",
      surface: { style: "solid", blur: 0.01, color: "#0b1020", opacity: 0.62, borderOpacity: 0.2, radius: 0.35 },
      transition: { style: "crossBlur", durationMs: 260, overshoot: 1, blur: 0.5 },
    },
  },
  // ---- our three signature looks ----
  {
    id: "forge-sweep",
    label: "Forge sweep",
    signature: true,
    tip: "Ours: words appear as they are said and a marker stroke slides under each one. Lively but tidy.",
    font: { family: "Manrope", weight: 800 },
    set: {
      uppercase: false, maxChars: 28, fontSize: 0.05, color: "#ffffff", activeColor: "#ff2e88",
      strokeColor: "#000000", strokeWidth: 0.08, activeEmphasis: "sweep", reveal: "spoken", keepSpoken: false,
      activeFromSpeaker: true, position: "bottom", surface: { ...noSurface }, transition: { style: "pop", durationMs: 200, overshoot: 1.06, blur: 0.3 },
    },
  },
  {
    id: "comic-burst",
    label: "Comic burst",
    signature: true,
    tip: "Ours: the spoken word jumps out on a tilted comic sticker. For D&D, tropes and anything funny.",
    font: { family: "Play", weight: 700 },
    set: {
      uppercase: true, maxChars: 24, fontSize: 0.06, color: "#ffffff", activeColor: "#ffd400",
      strokeColor: "#171310", strokeWidth: 0.18, activeEmphasis: "burst", reveal: "all", keepSpoken: false,
      activeFromSpeaker: false, position: "bottom", surface: { ...noSurface }, transition: { style: "pop", durationMs: 180, overshoot: 1.14, blur: 0.2 },
    },
  },
  {
    id: "ink-drop",
    label: "Ink drop",
    signature: true,
    tip: "Ours: soft words that fill with colour as they are said and keep it. Quiet, for dog training and soft skills.",
    font: { family: "Alegreya Sans", weight: 800 },
    set: {
      uppercase: false, maxChars: 36, fontSize: 0.05, color: "#f4efe6", activeColor: "#ffb703",
      strokeColor: "#1b1b1b", strokeWidth: 0.16, activeEmphasis: "ink", reveal: "all", keepSpoken: true,
      activeFromSpeaker: false, position: "bottom", surface: { ...noSurface }, transition: { style: "crossBlur", durationMs: 240, overshoot: 1, blur: 0.5 },
    },
  },
];
