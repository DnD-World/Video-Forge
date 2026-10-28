// The motion layer (motion.mjs): springs, overlap, anticipation, planted feet.
// Run: node --test characters/motion.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF, performAt, movesAt, solveRig, defaultCard, lookById } from "./core/index.mjs";

const card = defaultCard({ name: "M" });
const look = lookById("sticker");
const src = (moveSpans, poseSpans) => ({ moveSpans, poseSpans, shelf: SHELF });

test("the same frame always gives the same pose, in any order (render workers)", () => {
  const s = src([{ startMs: 500, endMs: 2200, move: "wave" }, { startMs: 3000, endMs: 4300, move: "cheer" }]);
  const times = [3700, 900, 3700, 100, 2500, 900];
  const got = times.map((t) => JSON.stringify(performAt(s, t, { seed: 4 }).joints));
  assert.equal(got[0], got[2]);
  assert.equal(got[1], got[5]);
});

test("smoother than the targets: no sudden changes of speed (the snaps that read as choppy)", () => {
  const spans = [{ startMs: 400, endMs: 2100, move: "wave" }, { startMs: 2600, endMs: 3900, move: "cheer" }, { startMs: 4400, endMs: 6400, move: "explain" }];
  const s = src(spans);
  const raw = [], perf = [];
  for (let t = 0; t < 7000; t += 1000 / 30) {
    const J = movesAt(spans, SHELF, t)?.joints;
    raw.push(J ? lerpArm(J) : 0.12);
    perf.push(performAt(s, t).joints.armF[0]);
  }
  // the biggest change of speed from one frame to the next
  const snap = (a) => Math.max(...a.slice(2).map((v, i) => Math.abs(v - 2 * a[i + 1] + a[i])));
  assert.ok(snap(perf) < snap(raw) * 0.6, `largest change of speed: targets ${snap(raw).toFixed(3)}, performed ${snap(perf).toFixed(3)}`);
});
const lerpArm = (J) => 0.12 + ((J.armF?.[0] ?? 0.12) - 0.12) * (J.w ?? 1);

test("a walk plants its feet: a foot on the ground does not slide", () => {
  const dist = 2.4;
  const spans = [{ startMs: 0, endMs: 2600, move: "walk-in", dist }];
  const s = src(spans);
  const m = SHELF["walk-in"];
  let worst = 0, prev = null;
  for (let t = 300; t < 2000; t += 1000 / 60) {
    const perf = performAt(s, t);
    const sk = solveRig(card, look, { view: 2, joints: perf.joints });
    const u = t / m.lengthMs, { t0, t1 } = m.path;
    const k = Math.min(1, Math.max(0, (u - t0) / (t1 - t0)));
    const covered = k * k * (3 - 2 * k) * dist; // body heights walked
    const planted = sk.legs.map((l) => (Math.abs(l.foot[1]) < 1e-4 ? covered + l.foot[0] : null));
    if (prev) for (let i = 0; i < 2; i++) if (planted[i] !== null && prev[i] !== null) worst = Math.max(worst, Math.abs(planted[i] - prev[i]));
    prev = planted;
  }
  assert.ok(worst < 0.004, `a planted foot moved ${worst.toFixed(4)} body heights in one frame`);
});

test("anticipation: before a jump the body dips first", () => {
  const s = src([{ startMs: 1000, endMs: 2300, move: "cheer" }]);
  const ys = [];
  for (let t = 700; t < 1700; t += 20) ys.push(performAt(s, t, { energy: 0.8 }).joints.root[1]);
  const firstUp = ys.findIndex((y) => y < -0.02);
  assert.ok(firstUp > 0, "it jumps");
  assert.ok(Math.max(...ys.slice(0, firstUp)) > 0.01, "a crouch comes before the jump");
});

test("talking poses and idle are performed too, with breathing and no bad numbers", () => {
  const poseSpans = [{ startMs: 500, endMs: 2100, pose: "shrug" }];
  for (let t = 0; t < 4000; t += 50) {
    const p = performAt(src(undefined, poseSpans), t, { talk: 1 });
    for (const v of Object.values(p.joints)) if (Array.isArray(v)) assert.ok(v.every(Number.isFinite));
    assert.ok(Math.abs(p.breath) <= 1);
  }
  const mid = performAt(src(undefined, poseSpans), 1300).joints.armF;
  assert.ok(mid[1] > 1.2, "the shrug is reached");
});
