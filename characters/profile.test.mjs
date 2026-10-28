// One character, two forms (#13): shared fields, the form switch, presets,
// describe-it diffs, puppet orders and picks.
// Run: node --test characters/profile.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DRAWN_PRESETS, SUBJECTS, normalizeCard, normalizeShared, formOf, activeCard, cardDiff, applyDiff, describeCard,
  readPuppetPick, puppetPickPrompt, defaultCard, drawCharacter, LOOKS,
} from "./core/index.mjs";
import { RecordingCtx } from "./core/record.mjs";
import { useRecordingCanvases } from "./core/check.mjs";

useRecordingCanvases();
const SUBJECT_IDS = SUBJECTS.map((s) => s.id);

test("every preset is a valid card with no fixes needed, a unique id and real subjects", () => {
  const ids = new Set();
  for (const p of DRAWN_PRESETS) {
    assert.ok(!ids.has(p.id), `two presets are called ${p.id}`); ids.add(p.id);
    const { problems } = normalizeCard({ name: p.name, ...p.card });
    assert.deepEqual(problems, [], p.id);
    assert.ok(p.subjects.length && p.subjects.every((s) => SUBJECT_IDS.includes(s)), p.id);
    assert.ok(p.description.length > 10 && p.description.length <= 300, p.id);
  }
  for (const s of SUBJECT_IDS) assert.ok(DRAWN_PRESETS.some((p) => p.subjects.includes(s)), `no preset for ${s}`);
});

test("every preset draws in every look without bad numbers", () => {
  for (const p of DRAWN_PRESETS) for (const L of LOOKS) {
    const rc = new RecordingCtx(400, 400);
    drawCharacter(rc, normalizeCard({ name: p.name, ...p.card }).card, { look: L, S: 300, x: 200, y: 380 });
    assert.equal(rc.bad, 0, `${p.id} in ${L.id}`);
  }
});

test("the form switch: an explicit form wins only when that form exists; old saves keep working", () => {
  const card = defaultCard();
  assert.equal(formOf({ character: card, puppetPath: "a.rig.json" }), "drawn", "old saves: drawn wins, as before");
  assert.equal(formOf({ form: "puppet", character: card, puppetPath: "a.rig.json" }), "puppet");
  assert.equal(formOf({ form: "puppet", character: card }), "drawn", "no puppet to switch to");
  assert.equal(formOf({ form: "drawn", puppetPath: "a.rig.json" }), "puppet", "no card to switch to");
  assert.equal(formOf({ sheetPath: "s.png" }), "sheet");
  assert.equal(activeCard({ form: "puppet", character: card, puppetPath: "a" }), null);
  assert.equal(activeCard({ character: card }), card);
});

test("shared fields are trimmed, capped and only real subjects kept", () => {
  const { shared, problems } = normalizeShared({ description: "  x ".repeat(200), personality: "calm", subjects: ["dnd", "dnd", "cooking"], character: defaultCard() });
  assert.ok(shared.description.length <= 300);
  assert.deepEqual(shared.subjects, ["dnd"]);
  assert.equal(shared.form, "drawn");
  assert.equal(problems.length, 1);
});

test("describe it: the diff lists only real changes, and accepting some applies only those", () => {
  const a = defaultCard({ name: "A" });
  const b = normalizeCard({ ...a, hair: "afro", beard: "full", build: "round" }).card;
  const d = cardDiff(a, b);
  assert.deepEqual(d.map((x) => x.key).sort(), ["beard", "build", "hair"]);
  const c = applyDiff(a, d, ["hair"]);
  assert.equal(c.hair, "afro");
  assert.equal(c.beard, a.beard);
  // a bad value smuggled into a diff is not applied
  assert.equal(applyDiff(a, [{ key: "hair", to: "wizard" }], ["hair"]).hair, a.hair);
});

test("a drawn character in words, for ordering its puppet: complete and the same every time", () => {
  const p = DRAWN_PRESETS.find((x) => x.id === "dnd-dwarf");
  const card = normalizeCard({ name: p.name, ...p.card }).card;
  const t = describeCard(card, p);
  assert.equal(t, describeCard(card, p));
  assert.match(t, /full red beard/, "a bald dwarf still has a red beard");
  assert.match(t, /helmet/i);
  assert.match(t, /short/);
  assert.match(t, /Personality:/);
});

test("puppet picks only come from the shelf; otherwise an order", () => {
  const shelf = [{ slug: "kaiti", name: "Kaiti", framing: "waist" }];
  assert.ok(puppetPickPrompt("a vet", shelf).system.includes("kaiti"));
  assert.deepEqual(readPuppetPick('{"pick":"kaiti","why":"she fits"}', shelf), { pick: "kaiti", why: "she fits" });
  assert.ok(readPuppetPick('{"pick":"santa"}', shelf).problem);
  assert.equal(readPuppetPick('{"pick":"santa","order":"a jolly man in red"}', shelf).order, "a jolly man in red");
  assert.ok(readPuppetPick("no json here", shelf).problem);
});
