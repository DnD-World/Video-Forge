import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { MIN_GAP_SEC, WHOOSH_AT, SOUNDS, SPEECH_DUCK, countCues, creditsText, densityFor, planSfx, sfxSettings } from "./core/sfx.mjs";
import { resolveSpec, validateSpec } from "./core/spec.mjs";

const sample = JSON.parse(fs.readFileSync(new URL("./samples/how-it-works.json", import.meta.url)));
const kindsAt = (cues, k) => cues.filter((c) => c.kind === k);

test("the plan is deterministic and sorted", () => {
  const a = planSfx(sample), b = planSfx(JSON.parse(JSON.stringify(sample)));
  assert.deepEqual(a, b);
  for (let i = 1; i < a.cues.length; i++) assert.ok(a.cues[i].t >= a.cues[i - 1].t);
  assert.ok(a.cues.length > 8);
});

test("every scene change gets a whoosh in the middle of the transition, except the one into the last scene (a riser)", () => {
  const R = resolveSpec(sample);
  const { cues } = planSfx(sample);
  const whooshes = kindsAt(cues, "whoosh");
  // scenes 2..n-1 have whooshes; the last has a riser that ends exactly at its start
  for (let i = 1; i < R.scenes.length - 1; i++) {
    const w = whooshes.find((c) => c.scene === i);
    assert.ok(w, `scene ${i + 1} has a whoosh`);
    assert.ok(Math.abs(w.t - (R.scenes[i].start + WHOOSH_AT)) < 0.001, "felt early in the 0.7 s transition");
  }
  const last = R.scenes.length - 1;
  const riser = kindsAt(cues, "riser");
  assert.equal(riser.length, 1);
  assert.equal(riser[0].t, R.scenes[last].start);
  assert.ok(!whooshes.some((c) => c.scene === last));
  // and a ding when the closing line lands
  assert.ok(kindsAt(cues, "ding").some((c) => c.scene === last));
});

test("elements get a pop at the moment they appear", () => {
  const R = resolveSpec(sample);
  const { cues } = planSfx(sample);
  const steps = R.scenes.find((s) => s.kind === "steps");
  for (const it of steps.items) assert.ok(cues.some((c) => c.kind === "pop" && Math.abs(c.t - (it.at + 0.05)) < 0.001), `pop for "${it.text}"`);
  assert.ok(cues.some((c) => c.kind === "tick" && c.scene === R.scenes.findIndex((s) => s.kind === "number")));
});

test("no two cues are closer than 250 ms, at any amount, calm or not", () => {
  for (const amount of [0, 0.3, 0.6, 1]) for (const calm of [false, true]) {
    const { cues } = planSfx({ ...sample, calm }, { amount });
    for (let i = 1; i < cues.length; i++) assert.ok(cues[i].t - cues[i - 1].t >= MIN_GAP_SEC - 1e-9, `amount ${amount} calm ${calm}: ${cues[i - 1].t} -> ${cues[i].t}`);
  }
});

test("subtle and calm keep only the big moments; lively has the most", () => {
  const n = (o, calm = false) => planSfx({ ...sample, calm }, o).cues;
  const subtle = n({ amount: 0.1 }), mid = n({ amount: 0.6 }), lively = n({ amount: 1 });
  assert.ok(subtle.length < mid.length && mid.length < lively.length, `${subtle.length} < ${mid.length} < ${lively.length}`);
  assert.ok(subtle.every((c) => ["whoosh", "riser", "ding"].includes(c.kind)));
  assert.deepEqual(n({ amount: 1 }, true).map((c) => c.t), subtle.map((c) => c.t), "calm = the subtle plan whatever the amount");
  assert.equal(densityFor(0.5, true), 0);
});

test("cues are quieter under narration words", () => {
  const R = resolveSpec(sample);
  const w = R.scenes[2].start + WHOOSH_AT; // a whoosh lands here
  const talking = { ...sample, words: [{ text: "x", start: w - 0.2, end: w + 0.3 }] };
  const loud = planSfx(sample).cues.find((c) => Math.abs(c.t - w) < 0.001);
  const quiet = planSfx(talking).cues.find((c) => Math.abs(c.t - w) < 0.001);
  assert.ok(quiet.spoken && !loud.spoken);
  assert.ok(Math.abs(quiet.gain - loud.gain * SPEECH_DUCK) < 0.002);
});

test("off means no cues; amount scales the volume and is validated", () => {
  assert.deepEqual(planSfx({ ...sample, sfx: { on: false } }).cues, []);
  assert.deepEqual(sfxSettings({}), { on: true, amount: 0.6 });
  const soft = planSfx(sample, { amount: 0.4 }).cues.find((c) => c.kind === "whoosh");
  const big = planSfx(sample, { amount: 0.9 }).cues.find((c) => c.kind === "whoosh");
  assert.ok(big.gain > soft.gain);
  assert.deepEqual(validateSpec({ ...sample, sfx: { on: true, amount: 0.5 } }), []);
  assert.ok(validateSpec({ ...sample, sfx: { amount: 3 } }).some((e) => e.includes("sfx.amount")));
  assert.ok(validateSpec({ ...sample, sfx: "loud" }).some((e) => e.includes("sfx must")));
});

test("every cue stays inside the video and uses a known sound; credits list them", () => {
  const p = planSfx(sample, { amount: 1 });
  for (const c of p.cues) { assert.ok(c.t > 0 && c.t < p.duration); assert.equal(c.sound, SOUNDS[c.kind].file); assert.ok(c.gain > 0 && c.gain <= 1); }
  const text = creditsText(p.cues);
  assert.match(text, /Stable Audio Open/);
  assert.match(text, /whoosh-soft/);
  assert.ok(Object.keys(countCues(p.cues)).length >= 4);
});

test("the sounds named by the plan exist in the repo's wanted list", () => {
  const wanted = fs.readFileSync(new URL("../sfx/wanted.csv", import.meta.url), "utf8");
  for (const s of Object.values(SOUNDS)) assert.ok(wanted.includes(`${s.file},`), `${s.file} is in sfx/wanted.csv`);
});
