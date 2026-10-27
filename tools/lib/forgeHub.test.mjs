import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { recordMade, listMade, cleanMade } from "./forgeHub.mjs";

const root = () => fs.mkdtempSync(path.join(os.tmpdir(), "hub-"));

test("records finished things and lists them newest first", () => {
  const r = root();
  assert.ok(recordMade(r, { app: "video-forge", kind: "video", file: "C:/v/a.mp4", width: 1080, height: 1920, language: "el", durationSec: 30 }).ok);
  assert.ok(recordMade(r, { app: "image-forge", kind: "puppet", file: "C:/p/fox.rig.json", title: "Foxy" }).ok);
  const all = listMade(r);
  assert.equal(all.length, 2);
  assert.equal(all[0].title, "Foxy");
  assert.equal(listMade(r, { kind: "video" })[0].language, "el");
});

test("refuses what it does not understand, and keeps going past a broken line", () => {
  const r = root();
  assert.equal(cleanMade({ app: "nope", kind: "video", file: "x" }).ok, false);
  assert.equal(cleanMade({ app: "video-forge", kind: "hologram", file: "x" }).ok, false);
  recordMade(r, { app: "video-forge", kind: "video", file: "a.mp4" });
  fs.appendFileSync(path.join(r, "made", "register.jsonl"), "{not json\n");
  recordMade(r, { app: "video-forge", kind: "video", file: "b.mp4" });
  assert.equal(listMade(r).length, 2);
});

test("AI-made unless said otherwise, for the honest label", () => {
  const c = cleanMade({ app: "video-forge", kind: "video", file: "a.mp4" });
  assert.equal(c.entry.aiMade, true);
});
