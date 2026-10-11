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
      prev[j] = sameWord(a[i - 1], b[j - 1]) ? diag + 1 : Math.max(prev[j], prev[j - 1]);
      diag = up;
    }
  }
  return prev[b.length] / Math.max(a.length, b.length);
}

/** Two words count as the same when they differ by at most a third of their
 *  letters. The recogniser that checks each take mishears rare words — it
 *  wrote «σκηλίτσα» and «λίτσα» for «σκυλίτσα» — and treating those as missing
 *  re-made good takes for nothing (11 Oct 2026). A skipped sentence is still
 *  caught: whole words are absent, not misspelt. */
export function sameWord(x: string, y: string): boolean {
  if (x === y) return true;
  const longest = Math.max(x.length, y.length);
  if (longest < 4) return false;
  return editDistance(x, y) <= Math.floor(longest / 3);
}

function editDistance(x: string, y: string): number {
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[y.length];
}
