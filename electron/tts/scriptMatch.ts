// Did a voice say what the script says? Word-level, forgiving of punctuation,
// accents, case, [x] markings and laughs written as words. Pure, so it can be
// tested without the app (tools/lib/scriptMatch.test.mjs).

/** Words only: no markings, punctuation, accents or case. */
export function normalizeWords(s: string): string[] {
  return s
    .replace(/\[[^\]]*\]/g, " ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !SOUNDS.test(w));
}

/** Laughs, hums and sighs written as words — «Χαχαχα», "Mmm". The recogniser
 *  hears them as sounds and writes nothing, so they must not count as missing. */
const SOUNDS = /^(χα|χε|χι|χο|ha|he|hi|ho|μ|m|α|a|ω|o|ου|σ|s|ψιτ|psst|ουφ|ugh|χμ|hm)+$/;

/** How much of the script the transcript covers, 0–1 — word-level overlap
 *  (longest common subsequence over the longer of the two), so a skipped
 *  sentence and an added greeting both pull it down. */
export function wordMatch(script: string, heard: string): number {
  const a = normalizeWords(script), b = normalizeWords(heard);
  if (!a.length) return 1;
  if (!b.length) return 0;
  const prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let diag = 0;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? diag + 1 : Math.max(prev[j], prev[j - 1]);
      diag = up;
    }
  }
  return prev[b.length] / Math.max(a.length, b.length);
}
