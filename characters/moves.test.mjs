// Motion library (#48): the move format, the player, the skeleton taking
// joints, hands/props drawing without errors, and script tags.
// Run: node --test characters/moves.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SHELF, STYLE_IDS, LOOKS, PROP_NAMES, normalizeMove, playMove, movesAt, buildShelf, readMoveTag,
  solveRig, drawCharacter, defaultCard, lookById,
} from "./core/index.mjs";
import { SHELF_DATA } from "./moves/shelf.mjs";
import { RecordingCtx } from "./core/record.mjs";
import { useRecordingCanvases } from "./core/check.mjs";

useRecordingCanvases();
const card = defaultCard({ name: "Test" });
const look = lookById("sticker");
const finite = (sk) => {
  const pts = [sk.head, sk.neck, ...sk.arms.flatMap((a) => [a.sh, a.el, a.ha]), ...sk.legs.flatMap((l) => [l.hip, l.knee, l.foot]), sk.root];
  return pts.every((p) => p.every(Number.isFinite));
};

test("the starter shelf is clean: no problems, unique ids, no phrase used twice", () => {
  const { problems } = buildShelf(SHELF_DATA);
  assert.deepEqual(problems, []);
  assert.ok(Object.keys(SHELF).length >= 20);
  const seen = new Map();
  for (const m of Object.values(SHELF)) for (const p of m.phrases) {
    assert.ok(!seen.has(p), `"${p}" is a phrase of both ${seen.get(p)} and ${m.id}`);
    seen.set(p, m.id);
  }
});

test("normalizeMove fixes and reports, never throws", () => {
  for (const bad of [null, 42, "x", {}, { id: "Bad Id!", tracks: { elbow: [] } }, { id: "a", tracks: { armF: [[0.5, [1]]] } }, { id: "b", loop: true, hold: 0.3, tracks: { lean: [[0, 0.1]] } }]) {
    const { move, problems } = normalizeMove(bad);
    assert.ok(move && typeof move.id === "string");
    assert.ok(problems.length > 0, JSON.stringify(bad));
  }
  const { move } = normalizeMove({ id: "ok", lengthMs: 1000, tracks: { lean: [[0.5, 0.2], [0.1, 0.1]] } });
  assert.deepEqual(move.tracks.lean.map((k) => k[0]), [0.1, 0.5], "keys are sorted by time");
});

test("every move, in every style and mirrored, gives a finite skeleton with feet on or above the floor", () => {
  for (const m of Object.values(SHELF)) for (const style of STYLE_IDS) for (const mirror of [false, true]) {
    for (let i = 0; i <= 20; i++) {
      const r = playMove(m, (m.lengthMs * i) / 20, { style, mirror, energy: 0.8, seed: 3 });
      for (const view of [0, 1, 2]) {
        const sk = solveRig(card, look, { t: i / 10, view, joints: { ...r.joints, w: 1 } });
        assert.ok(finite(sk), `${m.id} ${style} ${mirror} @${i}/20 view ${view}`);
        for (const l of sk.legs) assert.ok(l.foot[1] <= 1e-9, `${m.id} ${style}: a foot went through the floor (${l.foot[1]})`);
        // the hands stay within reach of the body: about a body height from the shoulders at most
        for (const a of sk.arms) assert.ok(Math.hypot(a.ha[0] - a.sh[0], a.ha[1] - a.sh[1]) < 0.6, `${m.id}: a hand flew off`);
      }
    }
  }
});

test("without a move the skeleton is exactly as before (joints at weight 0 change nothing)", () => {
  for (const view of [0, 1, 2]) for (const pose of ["rest", "wave", "shrug"]) {
    const a = solveRig(card, look, { t: 1.3, view, pose, poseK: 1, walk: { phase: 1, amount: 0.5 } });
    const b = solveRig(card, look, { t: 1.3, view, pose, poseK: 1, walk: { phase: 1, amount: 0.5 }, joints: { ...playMove(SHELF.cheer, 500).joints, w: 0 } });
    assert.deepEqual(b, a);
  }
});

test("a crouch keeps the feet where they were; a jump lifts the whole body", () => {
  const stand = solveRig(card, look, { view: 2 });
  const crouch = solveRig(card, look, { view: 2, joints: { root: [0, 0.06], w: 1 } });
  assert.ok(crouch.hy > stand.hy + 0.05, "the hips drop");
  for (let i = 0; i < 2; i++) assert.ok(Math.abs(crouch.legs[i].foot[1] - stand.legs[i].foot[1]) < 1e-6, "feet stay on the floor");
  const jump = solveRig(card, look, { view: 2, joints: { root: [0, -0.12], w: 1 } });
  assert.equal(jump.root[1], -0.12);
});

test("a loop joins up, a hold holds, a walk travels from start to end", () => {
  const d = SHELF.dance;
  assert.deepEqual(playMove(d, 0, { energy: 0 }).joints.armF, playMove(d, d.lengthMs, { energy: 0 }).joints.armF);
  const p = SHELF.point;
  const mid1 = playMove(p, 2000, { spanMs: 5000, energy: 0 }).joints.armF, mid2 = playMove(p, 3000, { spanMs: 5000, energy: 0 }).joints.armF;
  assert.deepEqual(mid1.map((x) => +x.toFixed(2)), mid2.map((x) => +x.toFixed(2)), "a long point is held");
  const w = SHELF["walk-in"];
  assert.equal(playMove(w, 0).travel.p, 0);
  assert.equal(playMove(w, w.lengthMs).travel.p, 1);
  assert.equal(playMove(w, w.lengthMs * 0.4).facing, "right", "walking in from the left faces right");
});

test("styles really change a walk; the same seed gives the same take", () => {
  const w = SHELF["walk-in"];
  const at = (style) => JSON.stringify(playMove(w, 900, { style, seed: 1 }).joints);
  const all = new Set(STYLE_IDS.map(at));
  assert.equal(all.size, STYLE_IDS.length);
  assert.equal(at("tired"), at("tired"));
  assert.notEqual(JSON.stringify(playMove(w, 900, { seed: 1 }).joints), JSON.stringify(playMove(w, 900, { seed: 2 }).joints));
});

test("mirroring hands the move to the other arm", () => {
  const r = playMove(SHELF.wave, 500), m = playMove(SHELF.wave, 500, { mirror: true });
  assert.deepEqual(m.joints.armB, r.joints.armF);
  assert.equal(m.hands.B, r.hands.F);
});

test("spans blend in and out; a stance carries on; a travel does not ease back", () => {
  const spans = [{ startMs: 1000, endMs: 2700, move: "wave" }, { startMs: 4000, endMs: 5300, move: "sit-down" }];
  assert.equal(movesAt(spans, SHELF, 0), null);
  assert.ok(movesAt(spans, SHELF, 900).joints.w > 0 && movesAt(spans, SHELF, 900).joints.w < 1);
  assert.equal(movesAt(spans, SHELF, 1800).joints.w, 1);
  assert.equal(movesAt(spans, SHELF, 3500), null);
  assert.equal(movesAt(spans, SHELF, 9000).joints.sit[0], 1, "still sitting long after");
  assert.deepEqual(movesAt(spans, SHELF, 9000).props.map((p) => p.id), ["chair"], "on the chair it brought");
  assert.deepEqual(movesAt([...spans, { startMs: 9500, endMs: 11000, move: "wave" }], SHELF, 10000).props.map((p) => p.id), ["chair"], "waving while seated keeps the chair");
  const walk = [{ startMs: 0, endMs: 2600, move: "walk-in" }];
  assert.equal(movesAt(walk, SHELF, 2700).joints.w, 1);
});

test("script tags pick the move, its style, its prop and who it is for", () => {
  const cast = [{ id: "s1", label: "Maria" }, { id: "s2", label: "Nikos" }];
  const read = (t) => readMoveTag(t, SHELF, { props: PROP_NAMES, cast });
  assert.deepEqual(read("[waves]"), { move: "wave", style: undefined, prop: undefined, target: undefined });
  assert.equal(read("[walks in proudly]").style, "proud");
  assert.equal(read("[walks in from the right]").move, "walk-in-right");
  assert.deepEqual(read("[gives the flowers to Maria]"), { move: "give", style: undefined, prop: "flowers", target: "s1" });
  assert.equal(read("[drinks his coffee]").prop, "cup");
  assert.equal(read("[hands on hips]").move, "hands-on-hips");
  assert.equal(read("[κάθεται]").move, "sit-down");
  assert.equal(read("[laughs]"), null);
});

test("every move draws in every look without bad numbers (hands, props, lifted bodies)", () => {
  for (const L of LOOKS) for (const m of Object.values(SHELF)) for (const u of [0.3, 0.6]) {
    const r = playMove(m, m.lengthMs * u, { energy: 1 });
    const rc = new RecordingCtx(600, 600);
    const props = r.props.length ? r.props : m.id === "wave" ? [{ id: "flowers", hand: "B", open: 0 }] : [];
    drawCharacter(rc, card, { look: L, S: 500, x: 300, y: 560, state: { t: u, view: m.id.startsWith("walk") ? 2 : 0, joints: { ...r.joints, w: 1 }, hands: r.hands, props, smile: r.face?.smile ?? 0 } });
    assert.equal(rc.bad, 0, `${L.id} ${m.id}: drew a NaN`);
  }
});
