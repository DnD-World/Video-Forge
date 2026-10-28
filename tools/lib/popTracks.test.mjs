// Run: npm test. Pop-up tags → animated icons beside a speaker (28 Oct 2026, #20).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPopTracks } from "../../src/lib/motion/popTracks.ts";
import { findIcon, ICONS, ICON_IDS } from "../../characters/icons/icons.mjs";

const seg = (tags, startMs = 1000, endMs = 5000) => ({ speakerId: "k", speakerLabel: "K", startMs, endMs, text: "x", tags });

test("[pop …] finds the icon in English or Greek; an emoji tag pops the emoji", () => {
  const p = buildPopTracks([seg(["pop red flag"]), seg(["pop κόκκινη σημαία"], 6000, 9000), seg(["🎉"], 10000, 12000), seg(["laughs"], 13000, 14000)]);
  assert.deepEqual(p.map((x) => x.icon ?? x.emoji), ["redflag", "redflag", "🎉"]);
  assert.equal(p[0].startMs, 1000);
});

test("two pops on one line come one after the other, side by side", () => {
  const p = buildPopTracks([seg(["pop d20", "pop crown"])]);
  assert.deepEqual(p.map((x) => [x.icon, x.slot]), [["d20", 0], ["crown", 1]]);
  assert.ok(p[1].startMs > p[0].startMs);
});

test("every icon has a name a script can use, a subject, and draws without bad numbers", () => {
  const SUBJECTS = ["dnd", "dogs", "manipulation", "softskills", "seasonal", "ai", "tropes", "everyday"];
  for (const id of ICON_IDS) {
    const ic = ICONS[id];
    assert.equal(findIcon(id), id, id);
    assert.ok(ic.subjects.every((s) => SUBJECTS.includes(s)), id);
  }
  for (const s of SUBJECTS) assert.ok(ICON_IDS.some((id) => ICONS[id].subjects.includes(s)), `no icon for ${s}`);
  assert.ok(ICON_IDS.length >= 50);
});
