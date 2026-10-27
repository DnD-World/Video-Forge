// ---------------------------------------------------------------------------
// Script text + cast -> the lines the voices are asked for.
//
// Shared by "Make the narration" (all lines) and "Remake" (one line), so a
// remade line is asked for with exactly the voice and settings the first
// make used.
// ---------------------------------------------------------------------------

import type { NarrationInput } from "../../../electron/tts/buildNarration";
import type { SpeakerConfig as Speaker } from "../../store/types";
import { engineOf, geminiModeOf, DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_VOICE } from "./geminiVoices";
import { parseScript, type ScriptSegment } from "./parseScript";
import { parseDramaboxScript } from "./parseDramaboxScript";

/** "Name: words" lines, or the prose style where a character is found by the
 *  phrase they open with. */
export function parseAnyScript(script: string, speakers: Speaker[]): { segments: ScriptSegment[]; unmatchedLines: string[] } {
  let { segments, unmatchedLines } = parseScript(script, speakers);
  if (segments.length === 0) {
    const prose = parseDramaboxScript(
      script,
      speakers.map((sp, i) => ({ id: sp.id, label: sp.label, openingPhrase: sp.openingPhrase ?? `Speaker ${i + 1}` }))
    );
    if (prose.segments.length > 0) ({ segments, unmatchedLines } = prose);
  }
  return { segments, unmatchedLines };
}

/** One script line with its speaker's voice and settings resolved. */
export function narrationInputFor(
  seg: { speakerId: string; speakerLabel: string; text: string; direction?: string },
  sp: Speaker,
  language: string,
  piperPythonPath: string
): NarrationInput {
  const engine = engineOf(sp);
  return {
    speakerId: seg.speakerId,
    speakerLabel: seg.speakerLabel,
    text: seg.text,
    language,
    engine,
    pitch: sp.pitch ?? 0,
    speed: sp.speed ?? 1,
    breathMs: sp.breathMs,
    direction: seg.direction,
    piperPythonPath,
    piperOnnxPath: sp.voiceId,
    elevenVoiceId: sp.elevenVoiceId,
    elevenModel: sp.elevenModel,
    eleven: sp.eleven,
    gemini:
      engine === "gemini"
        ? {
            mode: geminiModeOf(sp.geminiModel ?? DEFAULT_GEMINI_MODEL),
            model: sp.geminiModel ?? DEFAULT_GEMINI_MODEL,
            voice: sp.geminiVoice ?? DEFAULT_GEMINI_VOICE,
            persona: sp.openingPhrase,
          }
        : undefined,
  };
}

/** The script line behind narration line `index`, when the script still lines
 *  up with the narration (same number of lines, same speaker at that place).
 *  null when the script was edited since — the caller then falls back to the
 *  words the narration itself holds. */
export function scriptLineFor(
  script: string,
  speakers: Speaker[],
  narration: { speakerId: string }[],
  index: number
): ScriptSegment | null {
  const { segments } = parseAnyScript(script, speakers);
  if (segments.length !== narration.length) return null;
  const s = segments[index];
  return s && s.speakerId === narration[index].speakerId ? s : null;
}
