// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { migrateUserData } from "../../electron/migrateUserData.ts";

const quiet = () => {};
function fixture() {
  const appData = fs.mkdtempSync(path.join(os.tmpdir(), "vf-migrate-"));
  const old = path.join(appData, "byok-vid-creator");
  fs.mkdirSync(path.join(old, "Local Storage", "leveldb"), { recursive: true });
  fs.mkdirSync(path.join(old, "Cache"), { recursive: true });
  fs.mkdirSync(path.join(old, "renders", "lessons"), { recursive: true });
  fs.mkdirSync(path.join(old, "media"), { recursive: true });
  fs.writeFileSync(path.join(old, "byok.secrets.enc"), "VAULT");
  fs.writeFileSync(path.join(old, "Local Storage", "leveldb", "000003.log"), "SETTINGS");
  fs.writeFileSync(path.join(old, "Cache", "junk"), "x");
  fs.writeFileSync(path.join(old, "renders", "lessons", "101.mp4"), "VIDEO");
  fs.writeFileSync(path.join(old, "media", "clip.mp4"), "CLIP");
  return { appData, old, neu: path.join(appData, "video-forge") };
}
const read = (...p) => fs.readFileSync(path.join(...p), "utf8");

test("copies settings now and media/renders in the background; old folder untouched", async () => {
  const { appData, old, neu } = fixture();
  const r = migrateUserData(appData, quiet);
  assert.equal(r.status, "copied");
  assert.equal(read(neu, "byok.secrets.enc"), "VAULT");
  assert.equal(read(neu, "Local Storage", "leveldb", "000003.log"), "SETTINGS");
  assert.ok(!fs.existsSync(path.join(neu, "Cache")), "caches are skipped");
  await r.bulk;
  assert.equal(read(neu, "renders", "lessons", "101.mp4"), "VIDEO");
  assert.equal(read(neu, "media", "clip.mp4"), "CLIP");
  // old folder intact
  assert.equal(read(old, "byok.secrets.enc"), "VAULT");
  assert.equal(read(old, "renders", "lessons", "101.mp4"), "VIDEO");
});

test("runs once: a second start changes nothing", async () => {
  const { appData, neu } = fixture();
  await migrateUserData(appData, quiet).bulk;
  fs.writeFileSync(path.join(neu, "byok.secrets.enc"), "NEWER");
  const r = migrateUserData(appData, quiet);
  await r.bulk;
  assert.equal(r.status, "none");
  assert.equal(read(neu, "byok.secrets.enc"), "NEWER");
});

test("never overwrites a new folder that already has data", async () => {
  const { appData, neu } = fixture();
  fs.mkdirSync(neu, { recursive: true });
  fs.writeFileSync(path.join(neu, "byok.secrets.enc"), "MINE");
  const r = migrateUserData(appData, quiet);
  await r.bulk;
  assert.equal(r.status, "none");
  assert.equal(read(neu, "byok.secrets.enc"), "MINE");
  assert.ok(!fs.existsSync(path.join(neu, "renders")));
});

test("no old folder: nothing happens", () => {
  const appData = fs.mkdtempSync(path.join(os.tmpdir(), "vf-migrate-"));
  const r = migrateUserData(appData, quiet);
  assert.equal(r.status, "none");
  assert.ok(!fs.existsSync(path.join(appData, "video-forge")));
});

test("an interrupted copy resumes instead of being mistaken for real use", async () => {
  const { appData, old, neu } = fixture();
  // simulate: stage 1 started, vault copied, then the app died
  fs.mkdirSync(neu, { recursive: true });
  fs.writeFileSync(path.join(neu, ".migration-started-from-byok-vid-creator"), "x");
  fs.writeFileSync(path.join(neu, "byok.secrets.enc"), "VAULT");
  const r = migrateUserData(appData, quiet);
  await r.bulk;
  assert.equal(r.status, "copied");
  assert.equal(read(neu, "Local Storage", "leveldb", "000003.log"), "SETTINGS");
  assert.equal(read(old, "byok.secrets.enc"), "VAULT");
});
