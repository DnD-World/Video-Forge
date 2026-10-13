// The text-only half of greekAccents.ts, kept apart so tests can load it
// without the app (tools/lib/greekAccents.test.mjs).
//
// THE GREEK STRESS FIXER (13 Oct 2026). In Greek the stress mark (τόνος)
// changes the meaning — πότε "when" / ποτέ "never", νόμος / νομός — and a voice
// given a word without one has to guess. Two kinds of word get one before the
// voice reads them:
//  · CAPITALS, where Greek typography drops the mark («ΕΝΣΤΙΚΤΟ»);
//  · words typed without it (quick typing: «καλημερα»), two syllables or more —
//    one-syllable words take none.
// Plus the user's own "say it like this" list. SPOKEN ONLY: the subtitles keep
// exactly what the script says.

const ACCENTED = /[ΆΈΉΊΌΎΏάέήίόύώΐΰ]/;
/** Two or more Greek capitals, outside [x] markings. */
export const CAPS_WORD = /[Α-ΩΆΈΉΊΌΎΏΪΫ]{2,}/g;
/** Any Greek word. */
export const GREEK_WORD = /[Α-Ωα-ωΆΈΉΊΌΎΏάέήίόύώϊϋΐΰΪΫς]+/g;

/** Vowel groups, a diphthong counting once — near enough to syllables for this. */
export function syllables(word: string): number {
  const w = word.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return (w.match(/(αι|ει|οι|ου|υι|αυ|ευ|ηυ|[αεηιουω])/g) ?? []).length;
}

const outsideMarks = (text: string) => text.replace(/\[[^\]]*\]/g, " ");

/** Capitalised Greek words that carry no accent — the ones a voice may stress wrongly. */
export function unaccentedCaps(text: string): string[] {
  return [...new Set((outsideMarks(text).match(CAPS_WORD) ?? []).filter((w) => !ACCENTED.test(w)))];
}

/** Every Greek word of two syllables or more with no stress mark, capitals or not. */
export function unaccentedWords(text: string): string[] {
  return [...new Set((outsideMarks(text).match(GREEK_WORD) ?? []).filter((w) => !ACCENTED.test(w) && syllables(w) >= 2))];
}

/** The text the voice gets: each listed word swapped for its accented form. */
export function withAccents(text: string, map: Map<string, string>): string {
  if (!map.size) return text;
  // Leave [x] markings alone.
  return text
    .split(/(\[[^\]]*\])/)
    .map((part) => (part.startsWith("[") ? part : part.replace(GREEK_WORD, (w) => map.get(w) ?? w)))
    .join("");
}

/** Same letters once the marks are gone — so a lookup can only add a τόνος, never change a word. */
export const sameWord = (a: string, b: string) => {
  const plain = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  return plain(a) === plain(b);
};

/** The user's own list: "say it like this" (whole words, any case). */
export function applyPronunciations(text: string, list: { word: string; say: string }[] = []): string {
  let out = text;
  for (const { word, say } of list) {
    const w = word.trim();
    if (!w || !say.trim()) continue;
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, "giu"), say.trim());
  }
  return out;
}
