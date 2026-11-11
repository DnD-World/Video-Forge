// Character creator phase 3 (7 Nov 2026): marks (tattoos, scars, freckles, birthmarks, moles)
// and eye quirks: the rules, and every one drawn in every look, view and pose.
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultCard, normalizeCard, PARTS } from "./core/card.mjs";
import { normalizeMarks, MARK_KINDS, MARK_SPOTS, MAX_MARKS } from "./core/marks.mjs";
import { runChecks, RecordingCtx, useRecordingCanvases } from "./core/check.mjs";
import { drawCharacter, frameFor } from "./core/draw.mjs";
import { lookById } from "./core/looks.mjs";
import { cardSchemaText } from "./core/ai.mjs";

test("marks: kinds, places, sizes and colours are checked; at most six", () => {
  const { marks, problems } = normalizeMarks([
    { kind: "tattoo", on: "forearmR", shape: "anchor", size: 1.4, color: "#2E3F66", angle: 20 },
    { kind: "scar", on: "browL" },
    { kind: "tattoo", on: "cheekL", shape: "band" },
    { kind: "tattoo", on: "chest" },
    { kind: "glitter", on: "chin" },
    { kind: "mole", on: "chin", size: 9 },
  ]);
  assert.deepEqual(marks[0], { kind: "tattoo", on: "forearmR", shape: "anchor", size: 1.4, color: "#2e3f66", angle: 20 });
  assert.equal(marks[1].color, MARK_KINDS.scar.color, "a scar gets a scar colour by default");
  assert.equal(marks[2].shape, "star", "a band only goes round a forearm");
  assert.equal(marks.length, 4, "no marks on the body under the clothes, no unknown kinds");
  assert.equal(marks[3].size, 2, "size clamped");
  assert.equal(problems.length, 4);
  const many = normalizeMarks(Array.from({ length: 9 }, () => ({ kind: "mole", on: "chin" })));
  assert.equal(many.marks.length, MAX_MARKS);
  assert.ok(!("chest" in MARK_SPOTS) && !("leg" in MARK_SPOTS), "strict modesty: only face, neck, forearms and hands");
});

test("eye quirks and marks are card fields, in the eyes and marks parts", () => {
  const { card, problems } = normalizeCard({ name: "Q", lazyEye: "left", lazyAmount: 0.4, hazyEye: "right", maxOpen: 0.5, irisLeft: "#3A78C2", irisRight: "#4e8a3e", marks: [{ kind: "scar", on: "cheekR" }] });
  assert.deepEqual(problems, []);
  assert.equal(card.irisLeft, "#3a78c2");
  assert.equal(card.marks.length, 1);
  assert.equal(defaultCard().maxOpen, 1);
  assert.deepEqual(defaultCard().marks, []);
  assert.ok(PARTS.find((p) => p.id === "eyes").fields.includes("lazyEye"));
  assert.ok(PARTS.find((p) => p.id === "marks").fields.includes("marks"));
  assert.match(normalizeCard({ lazyEye: "middle" }).problems.join(), /Lazy eye/);
  assert.match(cardSchemaText(), /"marks": a list/, "the AI is told what marks may be");
});

const marked = (over = {}) => defaultCard({
  name: "Marked", eyes: "oval", lazyEye: "left", lazyAmount: 1, hazyEye: "both", maxOpen: 0.5, irisLeft: "#3a78c2", irisRight: "#8a5a2b",
  wear: [{ id: "tshirt" }, { id: "jeans" }, { id: "sneakers" }],
  marks: [
    { kind: "tattoo", on: "forearmR", shape: "band" }, { kind: "tattoo", on: "handL", shape: "star" }, { kind: "scar", on: "browL", angle: 30 },
    { kind: "freckles", on: "cheekR" }, { kind: "birthmark", on: "neck" }, { kind: "mole", on: "chin" },
  ],
  ...over,
});

test("every look, view and pose draws marks and eye quirks inside the frame, the same each time", () => {
  const { problems, frames } = runChecks({ cards: [marked(), marked({ eyes: "dot", build: "round" })] });
  assert.ok(frames > 300);
  assert.deepEqual(problems.filter((p) => p.level === "error").map((p) => p.msg), []);
});

test("marks are actually drawn: more drawing with marks than without", () => {
  useRecordingCanvases();
  const look = lookById("paper");
  const count = (card) => { const ctx = new RecordingCtx(400, 400); const { S, x, y } = frameFor(card, look, "full", { x: 0, y: 0, w: 400, h: 400 }); drawCharacter(ctx, card, { look, S, x, y, state: { t: 0 } }); return ctx.log.length; };
  assert.ok(count(marked()) > count(marked({ marks: [] })) + 20);
});
