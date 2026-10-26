// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openPartWriter, partName, haveFile } from "../../electron/net/partFile.ts";

const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), "vf-part-"));
const chunk = (n, v = 1) => Buffer.alloc(n, v);

test("a complete download appears under its real name, with no .part left", async () => {
  const dest = path.join(dir(), "clip.mp4");
  const w = openPartWriter(dest, 300);
  w.write(chunk(100));
  w.write(chunk(200, 2));
  assert.equal(haveFile(dest), false, "nothing under the real name while it is still coming");
  await w.finish();
  assert.equal(fs.statSync(dest).size, 300);
  assert.equal(fs.existsSync(partName(dest)), false);
});

test("a download that stops early leaves nothing under the real name and no .part", async () => {
  const dest = path.join(dir(), "clip.mp4");
  const w = openPartWriter(dest, 1000); // the server promised 1000
  w.write(chunk(400));
  await assert.rejects(() => w.finish(), /stopped early \(400 of 1000 bytes\)/);
  assert.equal(fs.existsSync(dest), false);
  assert.equal(fs.existsSync(partName(dest)), false);
});

test("an aborted download (timeout, dropped connection) is cleaned up", async () => {
  const dest = path.join(dir(), "clip.mp4");
  const w = openPartWriter(dest, null);
  w.write(chunk(50));
  await w.abort();
  assert.equal(fs.existsSync(dest), false);
  assert.equal(fs.existsSync(partName(dest)), false);
});

test("an empty download is a failure, not a file", async () => {
  const dest = path.join(dir(), "clip.mp4");
  const w = openPartWriter(dest, null);
  await assert.rejects(() => w.finish(), /empty/);
  assert.equal(fs.existsSync(dest), false);
});

test("with no promised size the bytes are accepted as they are", async () => {
  const dest = path.join(dir(), "clip.mp4");
  const w = openPartWriter(dest, null);
  w.write(chunk(77));
  await w.finish();
  assert.equal(fs.statSync(dest).size, 77);
});

test("a leftover .part from a crash is cleared before a new download starts", async () => {
  const dest = path.join(dir(), "clip.mp4");
  fs.writeFileSync(partName(dest), "old junk");
  const w = openPartWriter(dest, 10);
  w.write(chunk(10, 9));
  await w.finish();
  assert.deepEqual(fs.readFileSync(dest), chunk(10, 9));
});

test("a retry after a failed download starts clean and the old broken file never existed", async () => {
  const dest = path.join(dir(), "clip.mp4");
  const first = openPartWriter(dest, 500);
  first.write(chunk(120));
  await assert.rejects(() => first.finish());
  assert.equal(haveFile(dest), false); // so the next render downloads it again
  const second = openPartWriter(dest, 500);
  second.write(chunk(500, 3));
  await second.finish();
  assert.equal(haveFile(dest), true);
});

test("the app's downloader and its 'already have it' checks use this", () => {
  const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
  const http = read("electron/net/http.ts");
  assert.match(http, /openPartWriter\(destPath/);
  assert.ok(!/createWriteStream/.test(http), "nothing writes straight to the final name any more");
  assert.match(read("electron/main.ts"), /haveFile\(dest\)/);
  assert.match(read("electron/batch/runJob.ts"), /haveFile\(dest\)/);
});

test("a zero-byte file does not count as 'already have it'", () => {
  const dest = path.join(dir(), "clip.mp4");
  fs.writeFileSync(dest, "");
  assert.equal(haveFile(dest), false);
  assert.equal(haveFile(path.join(dir(), "nope.mp4")), false);
});
