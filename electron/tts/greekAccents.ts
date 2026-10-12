// ---------------------------------------------------------------------------
// Greek words in capitals, given back their accent before they are spoken.
//
// Greek typography drops the accent (τόνος) in all-caps — «ΕΝΣΤΙΚΤΟ» — and a
// voice reading that cannot know which syllable to stress. Ak heard it get it
// wrong (12 Oct 2026). So before a line goes to the voice, every capitalised
// Greek word without an accent is looked up once per narration (Gemini, one
// small request for the whole script) and sent as «ΈΝΣΤΙΚΤΟ»: still in
// capitals, so it is still shouted, but with the stress marked.
//
// SPOKEN ONLY. The subtitle keeps exactly what the script says.
// If the lookup fails, the line is spoken as written — never blocked.
// ---------------------------------------------------------------------------

import { geminiJson } from "../llm/geminiText";
import { unaccentedCaps } from "./greekAccentsPure";
export { unaccentedCaps, withAccents } from "./greekAccentsPure";

/** Look up the accent for every such word in the script, in one request. */
export async function accentMap(texts: string[]): Promise<Map<string, string>> {
  const words = [...new Set(texts.flatMap(unaccentedCaps))];
  const map = new Map<string, string>();
  if (!words.length) return map;
  try {
    const reply = await geminiJson(
      "You restore Greek accents. For each Greek word given in capitals, return the correctly accented lowercase form " +
        "(monotonic system, one τόνος where Greek spelling puts it; words of one syllable usually take none). " +
        'Answer only JSON: {"words": {"CAPS": "accented lowercase", ...}}.',
      JSON.stringify(words)
    );
    const parsed = JSON.parse(reply) as { words?: Record<string, string> };
    for (const [caps, lower] of Object.entries(parsed.words ?? {})) {
      // Only accept an answer that is the same word: same letters once the
      // accents are taken away. Anything else is the model rewriting the script.
      const plain = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
      if (typeof lower === "string" && plain(lower) === plain(caps)) map.set(caps, lower.toUpperCase());
    }
  } catch (e) {
    console.log(`[video-forge] couldn't restore accents on capitalised words (${e instanceof Error ? e.message : e}); spoken as written.`);
  }
  return map;
}

