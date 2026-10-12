// ---------------------------------------------------------------------------
// The cast that comes with a brand pack.
//
// The app itself ships with NO characters. A creator's characters, voices and
// sample project live in a brand pack — `brands/<id>/brand.json` — and appear
// only on a computer that has switched that pack on (see electron/brand.ts).
// The Skilitsa cast that used to be hardcoded here is now in
// brands/skilitsa/brand.json, unchanged.
//
// Colours are per character rather than one accent for all of them: a
// speaker's outline colour IS their waveform colour, so giving three speakers
// the same one makes the waveforms indistinguishable the moment two of them
// are on screen.
// ---------------------------------------------------------------------------

import type { DramaboxParams } from "../lib/narration/dramaboxParams";

/** A character the app ships with, ready to drop onto the canvas. */
export interface BuiltinCharacter {
  /** Filename inside the brand pack's puppet folder. */
  file: string;
  /** Shown in the UI, and used as the script label the narration parser
   *  matches against — so write it the way the script names them. */
  label: string;
  /** One-line description, for the picker. */
  note: string;
  borderColor: string;
  /** Starting position, 0–1 of the frame. Spread so adding all three doesn't
   *  stack them on top of each other. */
  x: number;
  y: number;
  /** The phrase this character's script blocks open with. How a block finds
   *  its voice — see parseDramaboxScript. */
  openingPhrase: string;
  /** Their DramaBox reference clip, by file name, inside voice-refs/. */
  voiceRef: string;
  /** Engine settings — only what differs from the defaults. */
  dramabox?: Partial<DramaboxParams>;
  /** The character's voice: engine, and for Gemini the model and voice name.
   *  Without it every character gets the same default voice — Σερίφης came
   *  out as a woman (12 Oct 2026). */
  voice?: { engine?: "gemini" | "fish" | "elevenlabs" | "piper"; geminiModel?: string; geminiVoice?: string; pitch?: number };
}

/** A brand's sample project: a whole finished video, in a click. */
export interface BrandSample {
  name: string;
  /** The script, in the same format a real project uses. */
  script: string;
  /** Script language — "el", "en", … Defaults to the app's. */
  language?: string;
}

/** What the renderer is told about the active brand pack. */
export interface BrandInfo {
  id: string;
  name: string;
  /** Absolute folder holding the cast's puppet files. */
  puppetDir: string;
  cast: BuiltinCharacter[];
  sample?: BrandSample;
}

/** Absolute path to a brand puppet, resolved against the pack's puppet folder.
 *
 *  The renderer can't work this out: it has no filesystem and no idea where the
 *  app is installed. Main answers with the folder, and this joins the filename
 *  onto it with whichever separator that path already uses. */
export function builtinPuppetPath(dir: string, file: string): string {
  const sep = dir.includes("\\") ? "\\" : "/";
  return dir.endsWith(sep) ? dir + file : dir + sep + file;
}
