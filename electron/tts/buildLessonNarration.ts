// ---------------------------------------------------------------------------
// Open a finished course lesson exactly as it is.
//
// The narration for the 69 lessons was made elsewhere, checked, mixed with
// music and approved. Nothing here re-times it, re-cuts it or re-mixes it: the
// lesson folder already holds every fact the video needs, and this reads them.
//
//   <lesson>-full.wav    the voices, dry
//   <lesson>-bed.wav     the music alone, already ducked  (tts/add-music.mjs --bed-only)
//   <lesson>-cues.json   every turn: who, when, how long, what was said
//   <lesson>-words.json  every word: when it started and ended
//   NNN_<character>.wav  one file per turn
//
// WHY THE VOICES AND THE MUSIC ARRIVE SEPARATELY, when a finished mix exists.
// Each speaker's waveform is drawn from the narration, and their mouths and the
// active-speaker gate read the same signal. Handed the mix, a waveform would
// jump to the pizzicato in the intro while nobody is talking. Summed on the way
// out, the two files reproduce <lesson>-music.wav to within rounding.
//
// WHAT IS NOT HERE. No silence trimming and no re-stitching. Those exist for
// engine output nobody has listened to; this audio has been listened to, and
// every word time in words.json is measured against THESE samples. Touching one
// would invalidate the other.
// ---------------------------------------------------------------------------

import fsp from "node:fs/promises";
import path from "node:path";
import { analyzeNarration } from "../audio/analyzeNarration";
import type { BuiltNarration } from "./buildNarration";

interface SpeechCue {
  at: number;
  n: number;
  character: string;
  ms: number;
  text: string;
}
interface SfxCue {
  at: number;
  sfx: string;
}
interface CueSheet {
  lesson: string;
  sampleRate: number;
  headMs: number;
  tailMs: number;
  totalMs: number;
  cues: (SpeechCue | SfxCue)[];
}

export interface LessonNarration {
  narration: BuiltNarration;
  /** The music alone, or null when the bed has not been written yet. */
  musicPath: string | null;
  /** Sound cues as the lesson recorded them — names still the script's own. */
  sfx: { name: string; atMs: number }[];
  headMs: number;
  tailMs: number;
  totalMs: number;
}

const TAG = /\[([^\]]+)\]/g;

/** Tags that say how a line is delivered rather than how it feels. Pace and
 *  pauses are already IN the audio — it was spoken from these scripts — so
 *  they carry no information for a face. */
const NOT_A_MOOD = new Set([
  "short pause", "long pause", "pause tag", "pacing tag", "slow", "very slow",
  "fast", "very fast", "gabble", "whispers", "shouting",
]);

/** Tags that are a sound the voice makes, not a manner of speaking. */
const SOUNDS = new Set(["laughs", "giggles", "sighs", "gasp", "yawn", "speaking through a yawn"]);

function readTags(text: string): { clean: string; mood?: string; openingSound?: string } {
  const tags: { tag: string; at: number }[] = [];
  for (const m of text.matchAll(TAG)) tags.push({ tag: m[1].trim().toLowerCase(), at: m.index ?? 0 });
  const clean = text.replace(TAG, " ").replace(/\s+/g, " ").trim();

  // A sound only counts as an OPENING one when it is before any speech — a
  // laugh in the middle of a line is inside the audio, but the words around it
  // are timed already and nothing needs to be held back for it.
  const first = tags[0];
  const openingSound =
    first && SOUNDS.has(first.tag) && text.slice(0, first.at).trim() === "" ? first.tag : undefined;
  const mood = tags.find((t) => !NOT_A_MOOD.has(t.tag) && !SOUNDS.has(t.tag))?.tag
    ?? (openingSound ? "amusement" : undefined);
  return { clean, mood, openingSound };
}

const isSpeech = (c: SpeechCue | SfxCue): c is SpeechCue => "n" in c;

export async function buildLessonNarration(
  lessonDir: string,
  /** "kaiti" -> the speaker id the render will use. */
  speakerIdByCharacter: Record<string, string>,
  speakerLabelById: Record<string, string>,
  speakerOrder: string[]
): Promise<LessonNarration> {
  const files = await fsp.readdir(lessonDir);
  const cuesFile = files.find((f) => f.endsWith("-cues.json"));
  if (!cuesFile) throw new Error(`No <lesson>-cues.json in ${lessonDir} — is that a lesson folder?`);
  const sheet: CueSheet = JSON.parse(await fsp.readFile(path.join(lessonDir, cuesFile), "utf8"));
  const lesson = sheet.lesson;

  const fullPath = path.join(lessonDir, `${lesson}-full.wav`);
  await fsp.access(fullPath).catch(() => {
    throw new Error(`${lesson}-full.wav is missing from ${lessonDir}.`);
  });

  const bedPath = path.join(lessonDir, `${lesson}-bed.wav`);
  const musicPath = await fsp.access(bedPath).then(() => bedPath, () => null);

  // Word times are measured per turn, against that turn's own file; the video
  // plays them end to end, so each one moves by where its turn starts.
  const wordsPath = path.join(lessonDir, `${lesson}-words.json`);
  const words: Record<string, { w: string; start: number; end: number }[]> = await fsp
    .readFile(wordsPath, "utf8")
    .then((t) => JSON.parse(t))
    .catch(() => ({}));

  const unknown = new Set<string>();
  const segments: BuiltNarration["segments"] = [];
  for (const cue of sheet.cues) {
    if (!isSpeech(cue)) continue;
    const speakerId = speakerIdByCharacter[cue.character.toLowerCase()];
    if (!speakerId) { unknown.add(cue.character); continue; }
    const { clean, mood, openingSound } = readTags(cue.text);
    const turnWords = words[String(cue.n).padStart(3, "0")];
    segments.push({
      speakerId,
      speakerLabel: speakerLabelById[speakerId] ?? cue.character,
      text: clean,
      startMs: cue.at,
      endMs: cue.at + cue.ms,
      mood,
      openingSound,
      words: turnWords?.map((w) => ({
        text: w.w,
        startMs: Math.round(cue.at + w.start * 1000),
        endMs: Math.round(cue.at + w.end * 1000),
      })),
    });
  }
  if (unknown.size) {
    throw new Error(
      `The lesson has lines for ${[...unknown].join(", ")}, and the job's cast has no one by ` +
        `that name. Give each speaker an alias matching the lesson's character names.`
    );
  }

  const sfx = sheet.cues
    .filter((c): c is SfxCue => !isSpeech(c))
    .map((c) => ({ name: c.sfx, atMs: c.at }));

  const analysis = analyzeNarration(
    await fsp.readFile(fullPath),
    segments.map((s) => ({ speakerId: s.speakerId, startMs: s.startMs, endMs: s.endMs })),
    speakerOrder
  );

  return {
    narration: { filePath: fullPath, segments, analysis },
    musicPath,
    sfx,
    headMs: sheet.headMs ?? 0,
    tailMs: sheet.tailMs ?? 0,
    totalMs: sheet.totalMs ?? 0,
  };
}
