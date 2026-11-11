// Run: npm test   (Node 22.18+ strips the TypeScript types itself)
// The character creator's editing rules (phase 2, 7 Nov 2026): src/lib/creator/edit.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  setField, randomise, cardOf, copyOutfit, newOutfit, deleteOutfit, renameOutfit, toggleChosenOutfit, setWearColor, setMainPiece,
  addWear, removeWear, outfitsWithoutMain, setMainColor, setUsualFace, setLock, changed, randomValue, faceIdOf, outfitIdOf,
} from "../../src/lib/creator/edit.ts";
import { normalizeCharacter, allLocked, PARTS, FIELDS } from "../../characters/core/index.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const load = (id) => normalizeCharacter(JSON.parse(fs.readFileSync(path.join(REPO, `brands/redflag/characters/${id}.json`), "utf8"))).character;
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

test("a face-part change goes into the face being edited; the other faces keep theirs", () => {
  const jake = load("jake");
  const [c, problem] = setField(jake, "B", "eyes", "sleepy");
  assert.equal(problem, null);
  assert.equal(cardOf(c, "B").eyes, "sleepy");
  assert.equal(cardOf(c, "A").eyes, jake.base.eyes, "face A unchanged");
  assert.equal(jake.faces.find((f) => f.id === "B").set.eyes, undefined, "the original object is never changed");
  // back to the base value: dropped from the face
  const [c2] = setField(c, "B", "eyes", jake.base.eyes);
  assert.equal("eyes" in c2.faces.find((f) => f.id === "B").set, false);
});

test("a body change goes into the base, for every face", () => {
  const [c] = setField(load("jake"), "C", "height", 0.9);
  for (const f of c.faces) assert.equal(cardOf(c, f.id).height, 0.9);
  assert.equal(c.base.height, 0.9);
});

test("values are checked: out of range is clamped and said, unknown is refused", () => {
  const [c, p] = setField(load("jake"), "A", "height", 5);
  assert.equal(c.base.height, 1.15);
  assert.match(p, /outside/);
  assert.match(setField(load("jake"), "A", "wings", 1)[1], /isn't a card field/);
  assert.match(setField(load("jake"), "A", "signature", "#000000")[1], /isn't changed here/);
});

test("the randomiser changes only unlocked parts", () => {
  const jake = load("jake");
  const all = allLocked();
  assert.deepEqual(randomise(jake, "A", "o1", all, seeded(3)), jake, "everything locked: nothing changes");
  const locks = { ...all, hair: false, eyes: false };
  const before = cardOf(jake, "A", "o1");
  let differs = 0;
  for (let s = 1; s < 12; s++) {
    const after = cardOf(randomise(jake, "A", "o1", locks, seeded(s)), "A", "o1");
    for (const p of PARTS) for (const k of p.fields) {
      if (p.id === "hair" || p.id === "eyes") { if (JSON.stringify(after[k]) !== JSON.stringify(before[k])) differs++; continue; }
      assert.deepEqual(after[k], before[k], `${k} (${p.id}) is locked`);
    }
    for (const k of ["name", "signature", "voice", "expression", "blinkRate", "energy", "sway", "look", "form"]) assert.deepEqual(after[k], before[k], `${k} never changes`);
    assert.notEqual(after.eyes, "none", "never no eyes");
  }
  assert.ok(differs > 10, "unlocked parts do change");
});

test("randomised outfits keep the main colour piece and the same clothes", () => {
  const jake = load("jake");
  const c = randomise(jake, "A", "o1", { ...allLocked(), outfits: false }, seeded(5));
  const a = jake.outfits.find((o) => o.id === "o1"), b = c.outfits.find((o) => o.id === "o1");
  assert.deepEqual(b.wear.map((w) => w.id), a.wear.map((w) => w.id), "same pieces");
  assert.deepEqual(outfitsWithoutMain(c), []);
  assert.notDeepEqual(b.wear, a.wear, "colours changed");
});

test("random numbers stay inside the field's range, away from the ends", () => {
  for (const f of FIELDS.filter((x) => x.kind === "number")) for (let s = 1; s < 30; s++) {
    const v = randomValue(f.key, seeded(s));
    assert.ok(v >= f.min && v <= f.max, `${f.key} ${v}`);
  }
});

test("outfit sets: copy, new, rename, delete (never the last), chosen list", () => {
  const rita = load("rita");
  const n = rita.outfits.length;
  const [c1, copyId] = copyOutfit(rita, rita.outfits[0].id);
  assert.equal(c1.outfits.length, n + 1);
  assert.equal(c1.outfits[1].id, copyId, "the copy sits right after");
  assert.match(c1.outfits[1].label, /\(copy\)$/);
  assert.deepEqual(c1.outfits[1].wear, rita.outfits[0].wear);
  const [c2, newId] = newOutfit(c1);
  assert.deepEqual(outfitsWithoutMain(c2), [], "a new outfit starts with the main colour on top");
  const c3 = renameOutfit(c2, newId, "  Gala  ");
  assert.equal(c3.outfits.find((o) => o.id === newId).label, "Gala");
  assert.equal(renameOutfit(c3, newId, "   "), c3, "an empty name is ignored");
  const chosen = rita.chosen.outfits[0];
  const c4 = deleteOutfit(c3, chosen);
  assert.ok(!c4.chosen.outfits.includes(chosen), "a deleted outfit leaves the chosen list");
  let one = rita;
  while (one.outfits.length > 1) one = deleteOutfit(one, one.outfits[0].id);
  assert.equal(deleteOutfit(one, one.outfits[0].id), one, "the last outfit stays");
  const c5 = toggleChosenOutfit(rita, rita.outfits[rita.outfits.length - 1].id);
  assert.notDeepEqual(c5.chosen.outfits, rita.chosen.outfits);
  assert.equal(normalizeCharacter(c4).problems.length, 0, "still a valid character");
});

test("the main colour: losing it is reported, putting it back fixes it, changing it moves it everywhere", () => {
  const jake = load("jake");
  const o = jake.outfits[0];
  const idx = o.wear.findIndex((w) => w.colors.includes(jake.signature));
  const lost = setWearColor(jake, o.id, idx, 0, "#ff0000");
  assert.deepEqual(outfitsWithoutMain(lost), [o.id]);
  assert.deepEqual(outfitsWithoutMain(setMainPiece(lost, o.id, 0)), []);
  const navyToRed = setMainColor(jake, "#B03030", "red");
  assert.equal(navyToRed.signature, "#b03030");
  assert.deepEqual(outfitsWithoutMain(navyToRed), [], "every outfit keeps the (new) main colour");
  assert.equal(normalizeCharacter(navyToRed).problems.length, 0);
});

test("adding a piece replaces what sat in its place; removing keeps at least one", () => {
  const jake = load("jake");
  const o = jake.outfits[0];
  const [c, problems] = addWear(jake, o.id, "hoodie", ["#24365c"]);
  const tops = c.outfits[0].wear.filter((w) => ["tshirt", "polo", "shirt", "hoodie", "sweater", "tank"].includes(w.id));
  assert.deepEqual(tops.map((w) => w.id), ["hoodie"]);
  assert.ok(problems.length >= 1, "the replaced piece is said");
  assert.equal(addWear(jake, o.id, "jetpack")[1].length, 1);
  let one = jake;
  while (one.outfits[0].wear.length > 1) one = removeWear(one, o.id, 0);
  assert.equal(removeWear(one, o.id, 0), one);
});

test("usual face, locks, and the changed check", () => {
  const young = load("young_amber");
  assert.ok(young.chosen.faceNote);
  const c = setUsualFace(young, "B");
  assert.equal(c.chosen.face, "B");
  assert.equal(c.chosen.faceNote, undefined, "picking a face answers the note");
  assert.equal(faceIdOf(c), "B");
  assert.equal(outfitIdOf(c), c.chosen.outfits[0]);
  const l = setLock(young, "hair", false);
  assert.equal(l.locks.hair, false);
  assert.equal(young.locks.hair, true);
  assert.equal(changed(young, young), false);
  assert.equal(changed(young, l), true);
});
