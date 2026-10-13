// ---------------------------------------------------------------------------
// THE TWIN VIDEO (Ak, 13 Oct 2026): one script, a Greek and an English video,
// the same cast. The last narration's lines are kept; for the twin each line
// is translated (Gemini, one request for the whole script, the delivery notes
// in [brackets] kept as they are) and spoken again in the other language by
// the same characters.
//
// Piper voices speak one language each, so a Piper character speaks the twin
// with the default Gemini voice. Gemini, ElevenLabs and Fish voices are
// multilingual and keep their own voice.
// ---------------------------------------------------------------------------
import fsp from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import { geminiJson } from "../llm/geminiText";
import { buildNarration, type NarrationInput } from "./buildNarration";
import { DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_VOICE, geminiModeOf } from "../../src/lib/narration/geminiVoices";

interface LastNarration {
  segments: NarrationInput[];
  speakerOrder: string[];
  pauses: { sameMs: number; turnMs: number };
}

const file = () => path.join(app.getPath("userData"), "last-narration.json");

/** Called every time a narration is made, so the twin always follows the latest script. */
export async function rememberNarration(n: LastNarration): Promise<void> {
  await fsp.writeFile(file(), JSON.stringify(n), "utf8").catch(() => {});
}

const NAMES: Record<string, string> = { el: "Greek", en: "English" };

export async function twinNarration(target: string, outputDir: string) {
  let last: LastNarration;
  try {
    last = JSON.parse(await fsp.readFile(file(), "utf8")) as LastNarration;
  } catch {
    throw new Error("Make the narration in the Script step first — the twin is made from it.");
  }
  const lang = NAMES[target] ?? target;
  const reply = await geminiJson(
    `You translate a video script into ${lang}. Translate each line naturally, for speaking aloud, keeping the meaning, tone and length close. ` +
      "Keep anything in [square brackets] exactly as it is. Keep names of people and brands. " +
      `${target === "el" ? "Write Greek with every stress mark (τόνος). " : ""}` +
      'Answer only JSON: {"lines": ["…", "…"]}, the same number of lines, in the same order.',
    JSON.stringify(last.segments.map((s) => s.text))
  );
  const lines = (JSON.parse(reply) as { lines?: unknown }).lines;
  if (!Array.isArray(lines) || lines.length !== last.segments.length) {
    throw new Error(`The translation came back with ${Array.isArray(lines) ? lines.length : 0} lines for ${last.segments.length}; nothing was made.`);
  }
  const segments: NarrationInput[] = last.segments.map((s, i) => {
    const text = String(lines[i] ?? s.text);
    if (s.engine === "piper" || !s.engine) {
      return {
        ...s,
        text,
        language: target,
        engine: "gemini",
        gemini: { mode: geminiModeOf(DEFAULT_GEMINI_MODEL), model: DEFAULT_GEMINI_MODEL, voice: DEFAULT_GEMINI_VOICE, persona: s.gemini?.persona },
      };
    }
    return { ...s, text, language: target };
  });
  return buildNarration(segments, last.speakerOrder, last.pauses, outputDir);
}
