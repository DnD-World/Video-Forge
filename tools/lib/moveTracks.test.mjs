// Run: npm test. Script tags → motion-library moves per speaker, and where a
// speaker stands while walking in/out (27 Oct 2026, #48/#49a).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSpeakerMoveTracks, moveAt, stagePlacement } from "../../src/lib/motion/moveTracks.ts";

const cast = [{ id: "m", label: "Maria", x: 0.3, size: 0.3 }, { id: "n", label: "Nikos", x: 0.7, size: 0.3 }];
const seg = (speakerId, startMs, endMs, tags, text = "…") => ({ speakerId, speakerLabel: speakerId, startMs, endMs, text, tags });

test("tags become moves on the speaker's own track, with style and prop", () => {
  const t = buildSpeakerMoveTracks([seg("m", 1000, 4000, ["walks in proudly"]), seg("n", 5000, 9000, ["drinks his coffee"]), seg("m", 9000, 12000, ["laughs"])], cast);
  assert.equal(t.m.length, 1);
  assert.equal(t.m[0].move, "walk-in");
  assert.equal(t.m[0].style, "proud");
  assert.equal(t.n[0].move, "drink");
  assert.equal(t.n[0].prop, "cup");
});

test("a held move lasts the whole line; a gesture its own length", () => {
  const t = buildSpeakerMoveTracks([seg("m", 1000, 9000, ["crosses arms"]), seg("n", 1000, 9000, ["waves"])], cast);
  assert.equal(t.m[0].endMs, 9000);
  assert.ok(t.n[0].endMs < 3500);
});

test("a gift goes to the named partner, or the only other speaker", () => {
  const named = buildSpeakerMoveTracks([seg("m", 1000, 4000, ["gives the flowers to Nikos"])], cast);
  assert.equal(named.n[0].move, "receive");
  assert.equal(named.n[0].prop, "flowers");
  assert.equal(named.n[0].startMs, named.m[0].startMs, "both halves at the same moment");
  const unnamed = buildSpeakerMoveTracks([seg("n", 1000, 4000, ["gives the box"])], cast);
  assert.equal(unnamed.m[0].move, "receive");
});

test("off stage before walking in, part way across while walking, home after", () => {
  const t = buildSpeakerMoveTracks([seg("m", 2000, 5000, ["walks in"])], cast);
  const at = (ms) => stagePlacement(t.m, moveAt(t.m, ms), cast[0], cast, ms);
  assert.equal(at(0).hidden, true);
  assert.ok(at(0).dx < -0.3, "waiting off the left edge");
  const mid = at(2000 + 1100);
  assert.equal(mid.hidden, false);
  assert.ok(mid.dx < 0 && mid.dx > -0.45, `part way in (${mid.dx})`);
  assert.equal(mid.facing, "right");
  assert.equal(at(8000).dx, 0);
  assert.equal(at(8000).hidden, false);
});

test("gone after walking out, until they walk in again", () => {
  const t = buildSpeakerMoveTracks([seg("n", 1000, 3000, ["walks out"]), seg("n", 9000, 12000, ["walks in from the right"])], cast);
  const at = (ms) => stagePlacement(t.n, moveAt(t.n, ms), cast[1], cast, ms);
  assert.equal(at(500).hidden, false, "there at the start");
  assert.equal(at(6000).hidden, true, "gone in between");
  assert.equal(at(14000).hidden, false, "back after walking in");
});

test("no tags, no moves: nobody is moved or hidden", () => {
  const t = buildSpeakerMoveTracks([seg("m", 0, 3000, ["serious"])], cast);
  assert.deepEqual(t, {});
  assert.deepEqual(stagePlacement(undefined, null, cast[0], cast, 1000), { dx: 0, hidden: false, facing: null });
});
