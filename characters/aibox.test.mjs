// The AI box (character creator phase 3, 7 Nov 2026): plain words → changes to OPEN fields only,
// every value checked. These use made-up model replies; the real call is checked in the app.
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultCard, allLocked, keepLocked, PARTS } from "./core/card.mjs";
import { partsPrompt, readPartsAnswer } from "./core/ai.mjs";

const card = defaultCard({ name: "Rita", eyes: "oval", hair: "bun", signature: "#2f8f7a" });
const eyeKeys = PARTS.find((p) => p.id === "eyes").fields;

test("the prompt shows only the open fields, their values now, and the words", () => {
  const { system, user } = partsPrompt(card, eyeKeys, "left eye a bit lazy, eyes at most 50% open", { scope: "the eyes" });
  assert.match(system, /"lazyEye":/);
  assert.match(system, /"maxOpen":/);
  assert.ok(!/"hair":/.test(system), "a locked or other part's field isn't offered");
  assert.ok(!/"signature"|"voice"|"wear"/.test(system));
  assert.match(system, /Left and right mean as you look at the character/);
  assert.equal(user, "left eye a bit lazy, eyes at most 50% open");
});

test("a good answer becomes checked changes", () => {
  const reply = '```json\n{"changes": {"lazyEye": "left", "lazyAmount": 0.3, "maxOpen": 0.5}, "note": "Left eye a little lazy; eyes half open at most."}\n```';
  const r = readPartsAnswer(reply, card, eyeKeys);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.changes.map((c) => [c.key, c.to]), [["lazyEye", "left"], ["lazyAmount", 0.3], ["maxOpen", 0.5]]);
  assert.equal(r.card.maxOpen, 0.5);
  assert.match(r.note, /half open/);
});

test("anything outside the open fields is refused and said; bad values are fixed and said", () => {
  const reply = JSON.stringify({ changes: { hair: "afro", signature: "#000000", voice: { engine: "gemini" }, wings: true, maxOpen: 0.05, lazyEye: "middle" } });
  const r = readPartsAnswer(reply, card, eyeKeys);
  assert.equal(r.card.hair, "bun", "hair is not open");
  assert.equal(r.card.signature, "#2f8f7a", "never the main colour");
  assert.equal(r.card.voice, null, "never the voice");
  assert.equal(r.card.maxOpen, 0.3, "clamped to the smallest allowed");
  assert.equal(r.card.lazyEye, "none", "an unknown value keeps the default");
  assert.ok(r.problems.length >= 5);
  assert.match(r.problems.join("\n"), /Hair style isn't open to change/);
});

test("locks hold even if the model is told the wrong fields: keepLocked is the last word", () => {
  const reply = JSON.stringify({ changes: { hair: "afro", eyes: "googly" } });
  const r = readPartsAnswer(reply, card, ["hair", "eyes"]); // pretend the screen offered too much
  const kept = keepLocked(card, r.card, { ...allLocked(), eyes: false });
  assert.equal(kept.eyes, "googly");
  assert.equal(kept.hair, "bun");
});

test("a reply with no JSON is an error, not a silent nothing", () => {
  assert.throws(() => readPartsAnswer("Sorry, I can't help with that.", card, eyeKeys));
});
