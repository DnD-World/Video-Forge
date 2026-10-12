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
