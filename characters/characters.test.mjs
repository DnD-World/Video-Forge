// node --test characters/characters.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultCard, normalizeCard, FIELDS } from "./core/card.mjs";
import { normalizeWear, ITEMS } from "./core/wardrobe.mjs";
import { LOOKS } from "./core/looks.mjs";
import { mouthShape, MOUTHS } from "./core/face.mjs";
import { solveRig, POSE_NAMES } from "./core/rig.mjs";
import { poseBlendAt, facingView, characterState, autoPerformance } from "./core/perform.mjs";
import { readCardAnswer, readSuggestions, cardPrompt, cardSchemaText } from "./core/ai.mjs";
import { runChecks, readableSize, sampleCards, RecordingCtx, useRecordingCanvases } from "./core/check.mjs";
import { drawCharacter, drawFigure, frameFor } from "./core/draw.mjs";

useRecordingCanvases();

test("a default card is valid and complete", () => {
  const c = defaultCard();
  const { problems } = normalizeCard(c);
  assert.deepEqual(problems, []);
  for (const f of FIELDS) assert.ok(f.key in c, f.key);
  assert.equal(typeof c.seed, "number");
});

test("normalizeCard fixes and explains bad input, never throws", () => {
  const { card, problems } = normalizeCard({ name: "", look: "pixel", height: 9, skin: "pink", hair: "dreadlocks", wear: [{ id: "cape" }, { id: "tshirt" }], foo: 1 });
  assert.equal(card.look, "stick");
  assert.equal(card.height, 1.15);
  assert.equal(card.skin, "#f3d6bd");
  assert.equal(card.hair, "short");
  assert.deepEqual(card.wear.map((w) => w.id), ["tshirt"]);
  assert.ok(problems.length >= 6, problems.join(" | "));
  assert.doesNotThrow(() => normalizeCard(null));
  assert.doesNotThrow(() => normalizeCard("nonsense"));
});

test("wardrobe: one item per place, a full item replaces top and bottom, colours filled in", () => {
  const { wear, problems } = normalizeWear([{ id: "tshirt" }, { id: "shirt" }, { id: "trousers" }, { id: "chiton" }, { id: "bow" }, { id: "headband" }]);
  assert.deepEqual(wear.map((w) => w.id), ["chiton", "bow", "headband"]);
  assert.ok(problems.some((p) => /replaces/.test(p)));
  for (const w of wear) assert.ok(w.colors.every((c) => /^#[0-9a-f]{6}$/.test(c)));
  for (const i of ITEMS) assert.ok(i.label && i.slot && i.colors.length, i.id);
});

test("mouth shapes exist for every Video Forge mouth id and blend smoothly", () => {
  for (let id = 0; id <= 12; id++) assert.ok(MOUTHS[id], `mouth ${id}`);
  const half = mouthShape(0, 1, 0.5);
  assert.ok(half.h > 0 && half.h < MOUTHS[1].h);
  assert.deepEqual(mouthShape(99, 99), MOUTHS[0]);
});

test("the skeleton is finite in every look, view and pose", () => {
  const card = defaultCard();
  for (const look of LOOKS) for (const view of [0, 0.5, 1, 1.5, 2]) for (const pose of POSE_NAMES) {
    const sk = solveRig(card, look, { view, pose, t: 0.7, talk: 1 });
    for (const a of sk.arms) for (const p of [a.sh, a.el, a.ha]) assert.ok(p.every(Number.isFinite), `${look.id} ${view} ${pose}`);
    for (const l of sk.legs) assert.ok(l.foot[1] <= 1e-9, "feet on or above the floor");
  }
  const sit = solveRig(card, LOOKS[0], { sitting: true });
  assert.ok(sit.hy > solveRig(card, LOOKS[0], {}).hy, "sitting lowers the hips");
});

test("every look, card, view and pose passes the checks", () => {
  const r = runChecks();
  assert.equal(r.frames, LOOKS.length * sampleCards().length * 3 * POSE_NAMES.length);
  assert.deepEqual(r.problems, []);
});

test("readable size: a head-and-shoulders framing reads smaller than a full body", () => {
  const card = sampleCards()[0];
  const look = LOOKS[0];
  assert.ok(readableSize(card, look, "head") < readableSize(card, look, "full"));
  assert.ok(readableSize(card, look, "full") < 0.6);
});

test("the same frame drawn twice is identical (no clock, no randomness)", () => {
  const card = sampleCards()[1];
  for (const look of LOOKS) {
    const box = { x: 0, y: 0, w: 300, h: 300 };
    const f = frameFor(card, look, "full", box);
    const st = autoPerformance(2.37, { seed: 1, talking: true, pose: "wave", view: 1 });
    const a = new RecordingCtx(300, 300), b = new RecordingCtx(300, 300);
    drawFigure(a, card, { look, ...f, state: st, layerSize: { w: 300, h: 300 } });
    drawFigure(b, card, { look, ...f, state: st, layerSize: { w: 300, h: 300 } });
    assert.equal(a.log.join("|"), b.log.join("|"), look.id);
  }
});

test("performance signals map onto the drawing state", () => {
  const spans = [{ startMs: 1000, endMs: 2000, pose: "wave" }];
  assert.deepEqual(poseBlendAt(spans, 500), { pose: "rest", poseK: 0 });
  assert.equal(poseBlendAt(spans, 1500).poseK, 1);
  assert.ok(poseBlendAt(spans, 900).poseK > 0 && poseBlendAt(spans, 900).poseK < 1, "eases in");
  assert.deepEqual(facingView("auto", { x: 0.3 }, [{ x: 0.7 }]), { view: 1, mirror: false });
  assert.deepEqual(facingView("auto", { x: 0.7 }, [{ x: 0.3 }], { dialogue: 2 }), { view: 2, mirror: true });
  assert.deepEqual(facingView("camera", { x: 0.5 }), { view: 0, mirror: false });
  const st = characterState({ timeMs: 1500, viseme: 1, prevViseme: 0, mix: 0.5, lidFrom: "half", poseSpans: spans, active: true });
  assert.equal(st.pose, "wave"); assert.equal(st.talk, 1); assert.equal(st.mouth.to, 1); assert.equal(st.lid.from, "half");
});

test("AI answers go through the same checks as typed input", () => {
  const reply = '```json\n{"name":"Pirate Pete","hair":"curly","hairColor":"#5a3825","skin":"#c68b5e","beard":"full","wear":[{"id":"shirt"},{"id":"eyepatch"},{"id":"boots"}],"wings":true}\n```';
  const { card, problems } = readCardAnswer(reply);
  assert.equal(card.name, "Pirate Pete");
  assert.equal(card.beard, "full");
  assert.deepEqual(card.wear.map((w) => w.id), ["shirt", "boots"]);
  assert.ok(problems.some((p) => /eyepatch/.test(p)) && problems.some((p) => /wings/.test(p)));
  assert.throws(() => readCardAnswer("I can't help with that"));
});

test("suggestions: only valid, different values survive", () => {
  const card = defaultCard();
  const reply = JSON.stringify({ suggestions: [
    { field: "headSize", value: 1.25, why: "Bigger head reads better on a phone." },
    { field: "hair", value: "dreadlocks", why: "not allowed" },
    { field: "eyes", value: card.eyes, why: "same as now" },
    { field: "colour", value: "#fff", why: "no such field" },
  ] });
  const s = readSuggestions(reply, card);
  assert.deepEqual(s.map((x) => x.field), ["headSize"]);
});

test("the prompt shows the model every field and every wardrobe item", () => {
  const text = cardSchemaText();
  for (const f of FIELDS) assert.ok(text.includes(`"${f.key}"`), f.key);
  for (const i of ITEMS) assert.ok(text.includes(i.id), i.id);
  const { system, user } = cardPrompt({ description: "a tired dad", picture: true, look: "sitcom" });
  assert.match(system, /"look": "sitcom"/);
  assert.match(user, /picture/);
});

test("drawing returns measurements in canvas pixels", () => {
  const card = sampleCards()[0];
  const ctx = new RecordingCtx(400, 400);
  const info = drawCharacter(ctx, card, { look: "stick", S: 300, x: 200, y: 380, state: { mouth: { from: 1, to: 1, mix: 1 } } });
  assert.ok(info.head.y < 200 && info.head.r > 10);
  assert.ok(info.mouth.y > info.head.y && info.mouth.w > 5);
  const mirrored = drawCharacter(new RecordingCtx(400, 400), card, { look: "stick", S: 300, x: 200, y: 380, mirror: true });
  assert.ok(Math.abs((info.head.x - 200) + (mirrored.head.x - 200)) < 1e-6, "mirror flips around the feet");
});
