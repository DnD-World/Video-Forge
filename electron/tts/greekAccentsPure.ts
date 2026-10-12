// The text-only half of greekAccents.ts, kept apart so tests can load it
// without the app (tools/lib/greekAccents.test.mjs).

const ACCENTED = /[ΆΈΉΊΌΎΏ]/;
/** Two or more Greek capitals, outside [x] markings. */
export const CAPS_WORD = /[Α-ΩΆΈΉΊΌΎΏΪΫ]{2,}/g;

/** Capitalised Greek words that carry no accent — the ones a voice may stress wrongly. */
export function unaccentedCaps(text: string): string[] {
  const outside = text.replace(/\[[^\]]*\]/g, " ");
  return [...new Set((outside.match(CAPS_WORD) ?? []).filter((w) => !ACCENTED.test(w)))];
}


/** The text the voice gets: capitalised words with their accent back. */
export function withAccents(text: string, map: Map<string, string>): string {
  if (!map.size) return text;
  // Leave [x] markings alone.
  return text
    .split(/(\[[^\]]*\])/)
    .map((part) => (part.startsWith("[") ? part : part.replace(CAPS_WORD, (w) => map.get(w) ?? w)))
    .join("");
}
