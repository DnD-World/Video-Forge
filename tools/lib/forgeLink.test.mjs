// node --test tools/lib/forgeLink.test.mjs
//
// Our half of the link to Image Forge. The forge's half is tested in its own
// repository (tests/link.test.ts); these pin that what we write is what it
// accepts, and that we read its answers correctly.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  checkRequest,
  collectPictures,
  findForge,
  forgeDataDir,
  newRequestId,
  sendRequest,
  styleSlug,
  visemeRows,
  waitForRequest,
} from "./forgeLink.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "vid-forge-link-"));

test("finds the forge's data folder where Electron puts it", () => {
  assert.equal(forgeDataDir({ APPDATA: "C:\\Users\\a\\AppData\\Roaming" }, "win32"), path.join("C:\\Users\\a\\AppData\\Roaming", "image-forge"));
});

test("says absent, installed or running", () => {
  const root = tmp();
  const dir = path.join(root, "image-forge", "link");
  assert.equal(findForge(dir).state, "absent");
  fs.mkdirSync(dir, { recursive: true });
  assert.equal(findForge(dir).state, "installed");
  fs.writeFileSync(path.join(dir, "presence.json"), JSON.stringify({ app: "image-forge", version: "1.0.2", port: 47821 }));
  assert.deepEqual({ ...findForge(dir), dir: undefined }, { state: "running", version: "1.0.2", port: 47821, dir: undefined });
});

test("request ids are the shape the forge accepts", () => {
  // Image Forge: /^[a-z0-9][a-z0-9-]{5,63}$/
  for (let i = 0; i < 20; i++) assert.match(newRequestId(), /^[a-z0-9][a-z0-9-]{5,63}$/);
});

test("drops a request atomically into the inbox", () => {
  const dir = tmp();
  const { id, file } = sendRequest({ rows: [{ filename: "a.png", prompt: "x" }] }, dir);
  assert.ok(fs.existsSync(file));
  assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).id, id);
  assert.equal(fs.readdirSync(path.join(dir, "inbox")).filter((f) => f.endsWith(".tmp")).length, 0);
  assert.equal(checkRequest(id, dir).state, "waiting");
});

test("refuses to send an empty request", () => {
  assert.throws(() => sendRequest({ rows: [] }, tmp()), /at least one picture/);
});

test("reads the forge's answers: working, rejected, done", async () => {
  const dir = tmp();
  const { id } = sendRequest({ rows: [{ filename: "a.png", prompt: "x" }] }, dir);
  fs.mkdirSync(path.join(dir, "processing"), { recursive: true });
  fs.renameSync(path.join(dir, "inbox", `${id}.json`), path.join(dir, "processing", `${id}.json`));
  assert.equal(checkRequest(id, dir).state, "working");

  const out = path.join(dir, "outbox", id);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "a.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  fs.writeFileSync(path.join(out, "done.json"), JSON.stringify({ done: ["a.png"], failed: [] }));
  const result = await waitForRequest(id, { dir, everyMs: 5 });
  assert.equal(result.state, "done");

  const into = tmp();
  assert.equal(collectPictures(result, into).length, 1);
  assert.ok(fs.existsSync(path.join(into, "a.png")));

  const dir2 = tmp();
  fs.mkdirSync(path.join(dir2, "inbox", "rejected"), { recursive: true });
  fs.writeFileSync(path.join(dir2, "inbox", "rejected", "vid-creator-x1y2z3.why.txt"), "no pictures");
  assert.deepEqual(checkRequest("vid-creator-x1y2z3", dir2), { state: "rejected", reason: "no pictures" });
});

test("stops waiting after the timeout rather than hanging", async () => {
  const dir = tmp();
  const { id } = sendRequest({ rows: [{ filename: "a.png", prompt: "x" }] }, dir);
  const r = await waitForRequest(id, { dir, timeoutMs: 20, everyMs: 5 });
  assert.equal(r.state, "timeout");
});

test("viseme rows are named the way forge-to-sheets expects", () => {
  const rows = visemeRows("kaiti", { style: "stop-motion-clay" });
  assert.deepEqual(rows.map((r) => r.filename), ["sheet_kaiti_clay_neutral.png", "sheet_kaiti_clay_happy.png", "sheet_kaiti_clay_serious.png"]);
  // forge-to-sheets: /^sheet_[a-z0-9]+_[a-z0-9]+_[a-z]+\.(png|jpg|jpeg)$/i
  for (const r of rows) assert.match(r.filename, /^sheet_[a-z0-9]+_[a-z0-9]+_[a-z]+\.png$/);
  // Image Forge: /^[a-z0-9][a-z0-9_]{0,80}\.(png|jpg|jpeg|webp)$/
  for (const r of rows) assert.match(r.filename, /^[a-z0-9][a-z0-9_]{0,80}\.(png|jpg|jpeg|webp)$/);
  assert.ok(rows.every((r) => r.category === "sheet" && r.aspect_ratio === "1:1"));
});

test("a style name never breaks the sheet filename", () => {
  assert.equal(styleSlug("stop-motion-clay"), "clay");
  assert.equal(styleSlug("animated-feature-3d"), "3d");
  assert.equal(styleSlug("anime-chibi"), "animechibi");
  assert.equal(styleSlug(""), "plain");
});

test("an unknown character needs a description", () => {
  assert.throws(() => visemeRows("nobody"), /--describe/);
  assert.equal(visemeRows("nobody", { describe: "a robot", moods: ["neutral"] }).length, 1);
});
