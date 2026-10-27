// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cleanUp, cacheStats } from "../../electron/media/mediaCache.ts";

function folder() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vf-media-"));
  // five 100-byte clips, a.mp4 used longest ago … e.mp4 most recently
  ["a", "b", "c", "d", "e"].forEach((n, i) => {
    const f = path.join(dir, `${n}.mp4`);
    fs.writeFileSync(f, Buffer.alloc(100));
    const t = new Date(Date.now() - (5 - i) * 86400000);
    fs.utimesSync(f, t, t);
  });
  fs.writeFileSync(path.join(dir, "notes.txt"), "not a clip");
  return dir;
}

test("under the limit nothing is removed", async () => {
  const dir = folder();
  const r = await cleanUp(dir, 1000);
  assert.equal(r.removed, 0);
});

test("over the limit the longest-unused go first, down to 80%", async () => {
  const dir = folder();
  const r = await cleanUp(dir, 400); // 500 bytes > 400 → down to 320
  assert.equal(r.removed, 2);
  assert.ok(!fs.existsSync(path.join(dir, "a.mp4")) && !fs.existsSync(path.join(dir, "b.mp4")));
  assert.ok(fs.existsSync(path.join(dir, "e.mp4")));
});

test("clips the project uses are never removed", async () => {
  const dir = folder();
  await cleanUp(dir, 0, [path.join(dir, "a.mp4")]);
  assert.ok(fs.existsSync(path.join(dir, "a.mp4")));
  assert.equal((await cacheStats(dir)).files, 1);
});

test("only video files are touched", async () => {
  const dir = folder();
  await cleanUp(dir, 0);
  assert.ok(fs.existsSync(path.join(dir, "notes.txt")));
});
