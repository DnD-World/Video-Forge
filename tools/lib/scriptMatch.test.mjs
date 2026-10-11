// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import { wordMatch, normalizeWords } from "../../electron/tts/scriptMatch.ts";

test("markings, punctuation, accents and case don't count", () => {
  assert.deepEqual(normalizeWords("[laughs] Το ΕΊΔΕΣ αυτό;!"), ["το", "ειδες", "αυτο"]);
});

test("laughs written as words are ignored", () => {
  assert.equal(wordMatch("[laughs] Χαχαχα! Και ποτέ, μα ποτέ, δεν πιάνει καμία.", "Και ποτέ μα ποτέ δεν πιάνει καμία"), 1);
});

test("a skipped sentence fails the 0.85 bar", () => {
  const script = "Δεν κυνηγάει πεταλούδες. Κυνηγάει κάτι που κινείται. Αυτό είναι το ένστικτο.";
  assert.ok(wordMatch(script, "Δεν κυνηγάει πεταλούδες.") < 0.85);
});

test("one misheard word still passes", () => {
  const script = "Η σκυλίτσα μου κυνηγάει πεταλούδες. Κάθε μία. Κάθε φορά.";
  assert.ok(wordMatch(script, "Η σκηλίτσα μου κυνηγάει πεταλούδες. Κάθε μία, κάθε φορά.") >= 0.85);
});

test("an added greeting pulls the match down", () => {
  assert.ok(wordMatch("Καλημέρα σας.", "Γεια σας! Είμαι εδώ για να σας πω: Καλημέρα σας.") < 0.85);
});
