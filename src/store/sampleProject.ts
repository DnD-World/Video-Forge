// ---------------------------------------------------------------------------
// The sample project — a brand pack's whole finished video, in a click.
//
// WHAT IT IS FOR. Someone opening this app for the first time has an empty
// canvas, no script, no cast and no idea what a finished video looks like. A
// brand pack can carry a sample: its characters, a written script, the house
// look, subtitles, music. They press Render and get a video.
//
// The app itself carries no sample, because it carries no characters. With no
// brand pack switched on, the Presets tab simply does not offer one.
//
// WHAT IT DELIBERATELY AVOIDS. It names no file that might not exist. Puppets
// are attached at load time from the brand pack's folder, because their
// absolute path is different on every machine. The music comes from the
// library that ships with the app, and the backgrounds are left on "auto" so
// the sample does not depend on 200MB of clips being committed.
// ---------------------------------------------------------------------------

import type { ProjectState } from "./types";
import { defaultProject } from "./defaults";
import { defaultTrackWaveform } from "../lib/waveform/buildTracks";
import { builtinPuppetPath, type BrandInfo } from "./builtinCast";

/**
 * The brand's sample, built fresh. Null when the brand has none.
 *
 * Without a puppet folder the cast still loads — they simply have no faces,
 * which is a sample with a missing picture rather than one that fails to open.
 */
export function sampleProject(brand: BrandInfo): Partial<ProjectState> | null {
  if (!brand.sample) return null;
  // One above, two below — the arrangement settled for three speakers, which
  // leaves the middle of the frame clear for the centred subtitles.
  const places = [
    { x: 0.55, y: 0.2 },
    { x: 0.31, y: 0.73 },
    { x: 0.76, y: 0.73 },
  ];

  const speakers = brand.cast.slice(0, places.length).map((c, i) => ({
    id: `sample-${i + 1}`,
    label: c.label,
    puppetPath: brand.puppetDir ? builtinPuppetPath(brand.puppetDir, c.file) : undefined,
    openingPhrase: c.openingPhrase,
    voiceRef: c.voiceRef,
    ttsEngine: (c.voice?.engine ?? "gemini") as "gemini",
    geminiModel: c.voice?.geminiModel,
    geminiVoice: c.voice?.geminiVoice,
    ...(c.dramabox ? { dramabox: c.dramabox } : {}),
    borderColor: c.borderColor,
    bgColor: "#1a1a1a",
    bgOpacity: 0,
    borderOpacity: 1,
    outlineShape: "none" as const,
    size: 0.26,
    x: places[i].x,
    y: places[i].y,
    waveform: {
      ...defaultTrackWaveform(i === 0 ? 0 : i % 2 === 1 ? 1 : -1),
      enabled: true,
      style: "bloomBars" as const,
      position: "speaker" as const,
    },
  }));

  return {
    ...defaultProject,
    speakers,
    script: brand.sample.script,
    language: brand.sample.language ?? defaultProject.language,
    // Left for the render to fetch. Committing the clips would put hundreds of
    // megabytes in the repository to save one search.
    backgrounds: [],
    narration: null,
    music: null,
  };
}
