// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
// Only the pure parts — the lookup itself calls Gemini.
import { test } from "node:test";
import assert from "node:assert/strict";

const mod = await import("../../electron/tts/greekAccentsPure.ts");

test("finds unaccented capitalised Greek words, ignoring markings and accented ones", () => {
  assert.deepEqual(mod.unaccentedCaps("[SHOUTS] ΑΥΤΟ ΕΙΝΑΙ ΤΟ ΕΝΣΤΙΚΤΟ! ΈΝΑ"), ["ΑΥΤΟ", "ΕΙΝΑΙ", "ΤΟ", "ΕΝΣΤΙΚΤΟ"]);
});

test("puts the accented capitals back, leaving markings alone", () => {
  const map = new Map([["ΕΝΣΤΙΚΤΟ", "ΈΝΣΤΙΚΤΟ"], ["ΕΙΝΑΙ", "ΕΊΝΑΙ"]]);
  assert.equal(mod.withAccents("[shouts] ΑΥΤΟ ΕΙΝΑΙ ΤΟ ΕΝΣΤΙΚΤΟ!", map), "[shouts] ΑΥΤΟ ΕΊΝΑΙ ΤΟ ΈΝΣΤΙΚΤΟ!");
});

test("an accented lowercase answer becomes accented capitals", () => {
  assert.equal("ένστικτο".toUpperCase(), "ΈΝΣΤΙΚΤΟ");
});

test("finds Greek words typed without their stress mark, not one-syllable ones", () => {
  assert.deepEqual(mod.unaccentedWords("καλημερα σε ολους, το σκυλί και η γάτα ΠΟΤΕ"), ["καλημερα", "ολους", "ΠΟΤΕ"]);
  assert.equal(mod.syllables("καλημερα"), 4);
  assert.equal(mod.syllables("και"), 1);
});

test("puts the marks back in lowercase words too, and keeps markings", () => {
  const map = new Map([["καλημερα", "καλημέρα"]]);
  assert.equal(mod.withAccents("[happy] καλημερα!", map), "[happy] καλημέρα!");
});

test("the say-it-like-this list replaces whole words only", () => {
  const list = [{ word: "Skroutz", say: "Σκρουτζ" }, { word: "AI", say: "έι άι" }];
  assert.equal(mod.applyPronunciations("Το Skroutz και το AI, όχι το AIR", list), "Το Σκρουτζ και το έι άι, όχι το AIR");
});

test("a lookup may only add a mark, never change the word", () => {
  assert.ok(mod.sameWord("καλημέρα", "ΚΑΛΗΜΕΡΑ"));
  assert.ok(!mod.sameWord("καληνύχτα", "καλημερα"));
});
