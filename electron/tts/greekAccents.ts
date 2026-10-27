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
import { sameWord, unaccentedWords } from "./greekAccentsPure";
export { unaccentedCaps, unaccentedWords, withAccents, applyPronunciations } from "./greekAccentsPure";

/**
 * Look up the stress for every unmarked Greek word in the script — capitals
 * and words typed without their τόνος — in one request. A word keeps its own
 * case: «ΕΝΣΤΙΚΤΟ» comes back «ΈΝΣΤΙΚΤΟ», «καλημερα» comes back «καλημέρα».
 */
export async function accentMap(texts: string[]): Promise<Map<string, string>> {
  const words = [...new Set(texts.flatMap(unaccentedWords))];
  const map = new Map<string, string>();
  if (!words.length) return map;
  try {
    const reply = await geminiJson(
      "You restore Greek stress marks. For each Greek word given (capitals or lowercase, typed without its τόνος), return the correctly accented lowercase form " +
        "(monotonic system, one τόνος where Greek spelling puts it). Keep the letters exactly; only add the mark. " +
        'Answer only JSON: {"words": {"AS GIVEN": "accented lowercase", ...}}.',
      JSON.stringify(words)
    );
    const parsed = JSON.parse(reply) as { words?: Record<string, string> };
    for (const [given, lower] of Object.entries(parsed.words ?? {})) {
      // Only accept an answer that is the same word: same letters once the
      // accents are taken away. Anything else is the model rewriting the script.
      if (typeof lower !== "string" || !sameWord(lower, given) || !words.includes(given)) continue;
      const caps = given === given.toUpperCase();
      map.set(given, caps ? lower.toUpperCase() : given[0] === given[0].toUpperCase() ? lower[0].toUpperCase() + lower.slice(1) : lower);
    }
  } catch (e) {
    console.log(`[video-forge] couldn't restore Greek stress marks (${e instanceof Error ? e.message : e}); spoken as written.`);
  }
  return map;
}
