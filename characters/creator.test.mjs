// Character creator phase 1 (6 Nov 2026): the rules of parts, locks, voice and the character file.
// The Red Flag files themselves are checked in data.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIELDS, PARTS, PART_IDS, partOf, allLocked, normalizeLocks, keepLocked, normalizeVoice, normalizeCard, defaultCard,
} from "./core/card.mjs";
import { CHARACTER_KIND, normalizeCharacter, cardFor, characterToFile, castFrom } from "./core/character.mjs";
import { cardSchemaText } from "./core/ai.mjs";
import { cardDiff } from "./core/profile.mjs";

test("the twelve parts are the agreed ones, and every part field is a real card field, in one part only", () => {
  assert.deepEqual(PART_IDS, ["body", "head", "eyes", "brows", "nose", "mouth", "ears", "hair", "skin", "facialHair", "outfits", "marks"]);
  const keys = new Set(FIELDS.map((f) => f.key)), seen = new Set();
  for (const p of PARTS) for (const k of p.fields) {
    assert.ok(keys.has(k), `${p.id}: "${k}" isn't a card field`);
    assert.ok(!seen.has(k), `"${k}" is in two parts`);
    seen.add(k);
  }
  assert.equal(partOf("hair"), "hair");
  assert.equal(partOf("beard"), "facialHair");
  assert.equal(partOf("wear"), "outfits");
  assert.equal(partOf("name"), null);
});

test("locks: missing = locked; only true/false; unknown parts are reported", () => {
  assert.deepEqual(normalizeLocks(undefined).locks, allLocked());
  assert.ok(Object.values(allLocked()).every((v) => v === true));
  const r = normalizeLocks({ eyes: false, wings: false, hair: "no" });
  assert.equal(r.locks.eyes, false);
  assert.equal(r.locks.hair, true, "a lock that isn't true/false stays locked");
  assert.equal(r.locks.body, true);
  assert.equal(r.problems.length, 2);
  assert.deepEqual(normalizeLocks("open").locks, allLocked());
});

test("keepLocked: only unlocked parts take a proposal; who they are never changes", () => {
  const before = defaultCard({ name: "Rita", hair: "bun", eyes: "oval", signature: "#2f8f7a", voice: { engine: "gemini", voiceId: "Kore" }, expression: "smile" });
  const proposal = { ...before, name: "Other", hair: "curly", eyes: "googly", signature: "#ff0000", voice: null, expression: "grumpy", beard: "full" };
  const out = keepLocked(before, proposal, { ...allLocked(), eyes: false });
  assert.equal(out.eyes, "googly", "eyes were unlocked");
  assert.equal(out.hair, "bun", "hair was locked");
  assert.equal(out.beard, "none", "facial hair was locked");
  assert.equal(out.name, "Rita");
  assert.equal(out.signature, "#2f8f7a");
  assert.equal(out.voice.voiceId, "Kore");
  assert.equal(out.expression, "smile", "fields outside the parts are never changed by a proposal");
  assert.deepEqual(keepLocked(before, proposal, allLocked()), normalizeCard(before).card, "all locked: nothing changes");
});

test("voice: the speaker's shape (engine, voice, pitch, speed), checked", () => {
  assert.deepEqual(normalizeVoice(null), [null, []]);
  const [v, p] = normalizeVoice({ engine: "gemini", voiceId: "Charon", model: "gemini-live", pitch: -2, speed: 1.1 });
  assert.deepEqual(v, { engine: "gemini", voiceId: "Charon", model: "gemini-live", pitch: -2, speed: 1.1 });
  assert.deepEqual(p, []);
  assert.equal(normalizeVoice({ engine: "chatterbox" })[0], null, "an engine the app doesn't have");
  const [w, q] = normalizeVoice({ engine: "piper", pitch: 9, speed: 3, colour: "red" });
  assert.equal(w.pitch, 6);
  assert.equal(w.speed, 1.25);
  assert.equal(q.length, 3);
  // on the card
  const { card, problems } = normalizeCard({ name: "Jake", voice: { engine: "elevenlabs", voiceId: "abc123" }, signature: "#24365C" });
  assert.deepEqual(problems, []);
  assert.equal(card.voice.engine, "elevenlabs");
  assert.equal(card.signature, "#24365c");
  assert.equal(defaultCard().voice, null);
  assert.equal(defaultCard().signature, "");
});

test("the AI helper never sees or changes the main colour or the voice", () => {
  const schema = cardSchemaText();
  assert.ok(!/"signature"|"voice"/.test(schema));
  const a = defaultCard({ signature: "#24365c", voice: { engine: "gemini", voiceId: "Kore" } });
  assert.deepEqual(cardDiff(a, { ...a, signature: "", voice: null }), []);
});

const sample = () => ({
  kind: CHARACTER_KIND, v: 1, id: "tess", roster: 3, name: "Tess", group: "main", role: "A test.", look: "paper", framing: "full",
  signature: "#24365c", signatureName: "navy", voice: { engine: "gemini", voiceId: "Kore", pitch: 1, speed: 1 },
  base: { name: "Tess", hair: "bob", form: 1 },
  accessories: [{ id: "glasses", colors: ["#111111"] }],
  faces: [{ id: "A", label: "As written", set: {} }, { id: "B", label: "bun", set: { hair: "bun" } }],
  chosen: { face: "B", outfits: ["o2"] },
  outfits: [
    { id: "o1", label: "Tee", wear: [{ id: "tshirt", colors: ["#24365c"] }, { id: "jeans", colors: ["#2f3b52"] }] },
    { id: "o2", label: "Hoodie", wear: [{ id: "hoodie", colors: ["#24365c"] }, { id: "jeans", colors: ["#2f3b52"] }] },
  ],
});

test("character file: a good one loads clean, opens locked, and saves back the same", () => {
  const { character, problems } = normalizeCharacter(sample());
  assert.deepEqual(problems, []);
  assert.deepEqual(character.locks, allLocked(), "no locks in the file = every part locked");
  const text = characterToFile(character);
  assert.equal(characterToFile(JSON.parse(text)), text);
  assert.match(text, /\{"id": "tshirt", "colors": \["#24365c"\]\}/, "short things on one line");
});

test("character file: problems are reported in plain words, nothing thrown", () => {
  const bad = sample();
  bad.kind = "something";
  bad.id = "Tess Smith";
  bad.signature = "navy";
  bad.outfits.push({ id: "o1", label: "again", wear: [{ id: "tshirt", colors: ["#ff0000"] }] });
  bad.chosen.face = "Z";
  bad.base.signature = "#000000";
  const all = normalizeCharacter(bad).problems.join("\n");
  for (const m of [/not a character file/, /id "Tess Smith"/, /main colour "navy"/, /outfit "o1" twice/, /chosen face "Z"/, /belongs on the character/]) assert.match(all, m);
  assert.doesNotThrow(() => normalizeCharacter(null));
  assert.ok(normalizeCharacter(null).problems.length > 0);
  const lost = sample();
  lost.outfits[0].wear = [{ id: "tshirt", colors: ["#ff0000"] }];
  assert.match(normalizeCharacter(lost).problems.join(), /o1: no piece is in the main colour/);
});

test("cardFor: the chosen face and first chosen outfit, accessories, main colour and voice", () => {
  const { character } = normalizeCharacter(sample());
  const card = cardFor(character);
  assert.equal(card.hair, "bun", "chosen face B");
  assert.deepEqual(card.wear.map((w) => w.id), ["hoodie", "jeans", "glasses"], "chosen outfit o2 + accessories");
  assert.equal(card.signature, "#24365c");
  assert.equal(card.voice.voiceId, "Kore");
  assert.equal(card.form, 1);
  assert.equal(cardFor(character, { face: "A", outfit: "o1", look: "geo" }).hair, "bob");
  assert.equal(cardFor(character, { look: "geo" }).look, "geo");
});

test("castFrom: settings plus people in roster order", () => {
  const cast = castFrom({ groups: [] }, [{ id: "b", roster: 2 }, { id: "a", roster: 1 }, { id: "z", roster: null }]);
  assert.deepEqual(cast.people.map((p) => p.id), ["a", "b", "z"]);
});
