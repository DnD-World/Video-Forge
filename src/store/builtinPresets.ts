// ---------------------------------------------------------------------------
// The nine looks that ship with the app.
//
// WHY NINE AND NOT THREE. A preset is not just how the avatars are dressed. It
// decides subtitle size, how dark the background is, how much blur sits behind
// the text, and where everyone stands — and every one of those wants a
// different answer for one talking head than for three. Three styles with a
// layout knob would mean editing a layout inside a style; nine flat entries
// means editing one entry.
//
// WHY THEY LIVE HERE AND NOT IN THE PANEL. They used to be a hardcoded array
// inside PresetsPanel.tsx, which is why they could not be edited. As ordinary
// ProjectPreset objects they are seeded into the store on first run, after
// which there is exactly one kind of preset: editing a built-in edits a stored
// preset, and "Reset to default" copies the version below back over it.
//
// WHAT A BUILT-IN MUST NEVER DO is replace the cast. Slots carry placement and
// dress and no identity at all, so applying one restyles the speakers already
// there and leaves their faces, names and voices alone.
// ---------------------------------------------------------------------------

import { defaultTrackWaveform } from "../lib/waveform/buildTracks";
import { defaultSubtitleTransition, defaultSurface } from "./types";
import type { OutlineShape, Surface, SubtitleConfig, TrackWaveform } from "./types";
import type { ProjectPreset, SpeakerSlot } from "./templatesTypes";

/** Where speakers stand, by how many of them there are.
 *
 *  The solo row is the fix for a real complaint: one speaker used to inherit a
 *  three-speaker position and stand off-centre with nothing to balance her. */
const LAYOUTS: Record<1 | 2 | 3, { x: number; y: number; size: number }[]> = {
  1: [{ x: 0.5, y: 0.4, size: 0.42 }],
  2: [
    { x: 0.27, y: 0.42, size: 0.34 },
    { x: 0.73, y: 0.42, size: 0.34 },
  ],
  // ONE ABOVE, TWO BELOW — measured off the arrangement Ak set by hand on
  // 19 Aug 2026, not invented. The human presenter takes the upper position
  // and the two dogs sit under her, which leaves the middle of the frame clear
  // for the subtitles now that they sit centred.
  3: [
    { x: 0.55, y: 0.20, size: 0.26 },
    { x: 0.31, y: 0.73, size: 0.26 },
    { x: 0.76, y: 0.73, size: 0.26 },
  ],
};

interface Style {
  name: string;
  description: string;
  outlineShape: OutlineShape;
  waveform: (i: number) => Partial<TrackWaveform>;
  surface: Partial<Surface>;
  subtitles: Partial<SubtitleConfig>;
  backgroundDim: number;
  backgroundBlur: number;
  /** Where the speakers stand, per cast size. Falls back to LAYOUTS. */
  layout?: Partial<Record<1 | 2 | 3, { x: number; y: number; size: number }[]>>;
}

const STYLES: Style[] = [
  {
    name: "Halo",
    description:
      "Bars ringing each speaker's own face. Calm, symmetrical, the house look.",
    outlineShape: "circle",
    // "speaker", not "circular" — this is the halo, and it is why the setting
    // exists. A ring in the middle of the frame belongs to nobody, which is
    // exactly how it read on screen.
    waveform: () => ({
      enabled: true,
      style: "bars",
      position: "speaker",
      scale: 1.1,
      density: 64,
      thickness: 1,
      smoothing: 0.2,
    }),
    surface: { style: "none" },
    subtitles: { position: "center", fontSize: 0.09, strokeWidth: 0.23, activeGlow: 0.25, activeEmphasis: "lift" as const, maxChars: 30, uppercase: false },
    backgroundDim: 0.45,
    backgroundBlur: 0,
  },
  {
    name: "Broadcast",
    description:
      "Flat bars along the bottom, bold caps on a frosted slab. Reads as news or explainer.",
    outlineShape: "rounded",
    waveform: (i) => ({
      enabled: true,
      style: "bars",
      position: "speaker",
      scale: 0.8,
      density: 96,
      thickness: 0.7,
      smoothing: 0.2,
      edgeFlush: true,
      lane: i === 0 ? 0 : i % 2 === 1 ? 1 : -1,
    }),
    surface: { style: "solid", color: "#0b0b0d", opacity: 0.5 },
    subtitles: {
      position: "center",
      fontSize: 0.09,
      strokeWidth: 0.23,
      activeGlow: 0.25,
      activeEmphasis: "lift" as const,
      maxChars: 30,
      // All-caps reads as shouting, and a lesson is not shouting. Kept as a
      // setting for the line where a character actually raises their voice;
      // never the default. When it IS used, toUpperGreek drops the accent and
      // keeps the dialytika, which is what Greek orthography asks for.
      uppercase: false,
    },
    // Brighter footage than Halo, because the text carries its own surface and
    // no longer needs the whole frame darkened to stay readable.
    backgroundDim: 0.3,
    backgroundBlur: 0,
  },
  {
    name: "Orbit",
    description:
      "Bloom behind frameless avatars on blurred footage. The most cinematic of the three.",
    outlineShape: "none",
    waveform: () => ({
      enabled: true,
      // Was "rings", then "orbits". Both were attempts at the loops in
      // "inspiration looks/look just at the waveforms.jpeg" and neither got
      // near it. bloomBars is one Ak has actually said he likes, so the preset
      // points at that rather than at a look nobody wants.
      style: "bloomBars",
      position: "speaker",
      scale: 1.4,
      density: 48,
      thickness: 1.4,
      smoothing: 0.5,
      ringInnerRadius: 0.28,
      ringSize: 1.1,
    }),
    // A real refracting disc behind each face now, not a tinted circle.
    surface: { style: "glass", color: "#0b0b0d", opacity: 0.28, blur: 0.01, borderOpacity: 0.3 },
    subtitles: { position: "center", fontSize: 0.09, strokeWidth: 0.23, activeGlow: 0.25, activeEmphasis: "lift" as const, maxChars: 30, uppercase: false, emoji: true },
    // The background is pushed back with blur rather than darkness, so the
    // footage stays legible as footage.
    backgroundDim: 0.3,
    backgroundBlur: 0.012,
  },
  // ---- added 12 Oct 2026 (Ak: "the templates are too few") ----
  {
    name: "News desk",
    description: "Anchors side by side low in the frame, subtitles on a solid lower-third strip. Reads as news.",
    outlineShape: "rounded",
    waveform: (i) => ({ enabled: true, style: "bars", position: "speaker", scale: 0.75, density: 96, thickness: 0.7, smoothing: 0.25, edgeFlush: true, lane: i === 0 ? 0 : i % 2 === 1 ? 1 : -1 }),
    surface: { style: "solid", color: "#071C26", opacity: 0.7 },
    subtitles: { position: "bottom", fontSize: 0.07, strokeWidth: 0.12, activeGlow: 0.15, activeEmphasis: "lift" as const, maxChars: 34, uppercase: false },
    backgroundDim: 0.25,
    backgroundBlur: 0,
    layout: {
      1: [{ x: 0.5, y: 0.52, size: 0.46 }],
      2: [{ x: 0.28, y: 0.55, size: 0.36 }, { x: 0.72, y: 0.55, size: 0.36 }],
      3: [{ x: 0.5, y: 0.47, size: 0.32 }, { x: 0.2, y: 0.62, size: 0.26 }, { x: 0.8, y: 0.62, size: 0.26 }],
    },
  },
  {
    name: "Podcast",
    description: "Big faces, one above the other, with large word-by-word captions between them. For conversations.",
    outlineShape: "circle",
    waveform: () => ({ enabled: true, style: "bars", position: "speaker", scale: 1.2, density: 72, thickness: 1.1, smoothing: 0.3 }),
    surface: { style: "none" },
    subtitles: { position: "center", fontSize: 0.1, strokeWidth: 0.25, activeGlow: 0.35, activeEmphasis: "lift" as const, maxChars: 22, uppercase: false, emoji: true },
    backgroundDim: 0.55,
    backgroundBlur: 0.015,
    layout: {
      1: [{ x: 0.5, y: 0.3, size: 0.5 }],
      2: [{ x: 0.5, y: 0.22, size: 0.4 }, { x: 0.5, y: 0.78, size: 0.4 }],
      3: [{ x: 0.5, y: 0.2, size: 0.34 }, { x: 0.27, y: 0.8, size: 0.3 }, { x: 0.73, y: 0.8, size: 0.3 }],
    },
  },
  {
    name: "Promo",
    description: "Small faces along the top, big bold captions in the middle, punchy footage. For ads and shorts.",
    outlineShape: "circle",
    waveform: () => ({ enabled: true, style: "bloomBars", position: "speaker", scale: 1.2, density: 48, thickness: 1.2, smoothing: 0.4, ringInnerRadius: 0.28, ringSize: 1.05 }),
    surface: { style: "none" },
    subtitles: { position: "center", fontSize: 0.12, strokeWidth: 0.3, activeGlow: 0.45, activeEmphasis: "lift" as const, maxChars: 16, uppercase: true, emoji: true },
    backgroundDim: 0.2,
    backgroundBlur: 0,
    layout: {
      1: [{ x: 0.5, y: 0.15, size: 0.3 }],
      2: [{ x: 0.3, y: 0.15, size: 0.26 }, { x: 0.7, y: 0.15, size: 0.26 }],
      3: [{ x: 0.2, y: 0.14, size: 0.22 }, { x: 0.5, y: 0.14, size: 0.22 }, { x: 0.8, y: 0.14, size: 0.22 }],
    },
  },
  {
    name: "Interview",
    description: "Speakers on a diagonal, as if facing each other. Questions and answers, guests and hosts.",
    outlineShape: "rounded",
    waveform: () => ({ enabled: true, style: "bars", position: "speaker", scale: 1, density: 64, thickness: 1, smoothing: 0.25 }),
    surface: { style: "none" },
    subtitles: { position: "center", fontSize: 0.085, strokeWidth: 0.22, activeGlow: 0.25, activeEmphasis: "lift" as const, maxChars: 28, uppercase: false },
    backgroundDim: 0.4,
    backgroundBlur: 0.008,
    layout: {
      1: [{ x: 0.35, y: 0.35, size: 0.44 }],
      2: [{ x: 0.28, y: 0.25, size: 0.36 }, { x: 0.72, y: 0.72, size: 0.36 }],
      3: [{ x: 0.25, y: 0.22, size: 0.3 }, { x: 0.72, y: 0.45, size: 0.3 }, { x: 0.3, y: 0.76, size: 0.3 }],
    },
  },
  {
    // DIALOGUE (Ak, 14 Oct 2026): characters standing side by side and turned
    // to each other — two fill a SQUARE video, three a WIDE one. No frames:
    // the puppets stand in the scene. Faces turn by themselves when the puppet
    // was made with Image Forge's "Also side-facing".
    name: "Dialogue",
    description: "Characters side by side, turned to each other — for scenes and mini dramas. Two for a square video, three for a wide one.",
    outlineShape: "none",
    waveform: () => ({ enabled: false, style: "bars", position: "speaker", scale: 1, density: 48, thickness: 1, smoothing: 0.25 }),
    surface: { style: "none" },
    subtitles: { position: "bottom", fontSize: 0.06, strokeWidth: 0.2, activeGlow: 0.3, activeEmphasis: "lift" as const, maxChars: 34, uppercase: false },
    backgroundDim: 0.15,
    backgroundBlur: 0.004,
    layout: {
      1: [{ x: 0.5, y: 0.6, size: 0.6 }],
      2: [{ x: 0.29, y: 0.6, size: 0.52 }, { x: 0.71, y: 0.6, size: 0.52 }],
      3: [{ x: 0.2, y: 0.6, size: 0.38 }, { x: 0.5, y: 0.6, size: 0.38 }, { x: 0.8, y: 0.6, size: 0.38 }],
    },
  },
];

function slotsFor(style: Style, count: 1 | 2 | 3): SpeakerSlot[] {
  return (style.layout?.[count] ?? LAYOUTS[count]).map((place, i) => ({
    ...place,
    outlineShape: style.outlineShape,
    waveform: { ...defaultTrackWaveform(i), ...style.waveform(i) } as TrackWaveform,
    surface: { ...defaultSurface(), ...style.surface },
  }));
}

/** The nine, built fresh each call so nothing can hand out a shared object that
 *  a later edit mutates underneath everyone else. */
export function builtinPresets(): (ProjectPreset & { name: string })[] {
  const out: (ProjectPreset & { name: string })[] = [];
  for (const count of [1, 2, 3] as const) {
    for (const style of STYLES) {
      const noun = count === 1 ? "solo" : count === 2 ? "duo" : "trio";
      out.push({
        name: `${style.name} · ${noun}`,
        description: style.description,
        speakerCount: count,
        builtIn: true,
        slots: slotsFor(style, count),
        // Partial on purpose, and NOT cast to a full SubtitleConfig.
        //
        // A preset is partial by contract — anything it omits falls back to the
        // app's defaults. An `as SubtitleConfig` here claimed otherwise, and
        // the claim was believed: the batch runner used the object whole, so
        // every render made from a built-in got `enabled: undefined` and no
        // colours. The cast did not create the bug, but it is why nothing
        // caught it. Consumers merge over defaults; the type now says so.
        subtitles: {
          ...style.subtitles,
          // NO GLASS UNDER THE CAPTION. Called as a failure on 15 Aug after a
          // day of attempts — see docs/GLASS.md. The disc works; the caption
          // pane never got past a grey slab, and the final filter-only version
          // broke rendering outright. Left off rather than shipped bad.
          surface: { ...defaultSurface(), style: "none" },
          transition: defaultSubtitleTransition(),
        },
        backgroundDim: style.backgroundDim,
        backgroundBlur: style.backgroundBlur,
        savedAt: 0,
      });
    }
  }
  return out;
}
