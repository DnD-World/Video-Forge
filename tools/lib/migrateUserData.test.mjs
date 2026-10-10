// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveUserData } from "../../electron/migrateUserData.ts";

function appDataWithOld() {
  const appData = fs.mkdtempSync(path.join(os.tmpdir(), "vf-userdata-"));
  const old = path.join(appData, "byok-vid-creator");
  fs.mkdirSync(path.join(old, "renders"), { recursive: true });
  fs.writeFileSync(path.join(old, "byok.secrets.enc"), "VAULT");
  return { appData, old, neu: path.join(appData, "video-forge") };
}

test("existing install keeps using the old folder, untouched", () => {
  const { appData, old } = appDataWithOld();
  assert.equal(resolveUserData(appData), old);
  assert.equal(fs.readFileSync(path.join(old, "byok.secrets.enc"), "utf8"), "VAULT");
});

test("an empty new scaffold does not win over real old data", () => {
  const { appData, old, neu } = appDataWithOld();
  fs.mkdirSync(neu);
  assert.equal(resolveUserData(appData), old);
});

test("new folder with data wins", () => {
  const { appData, neu } = appDataWithOld();
  fs.mkdirSync(path.join(neu, "Local Storage"), { recursive: true });
  assert.equal(resolveUserData(appData), neu);
});

test("fresh install uses the new folder", () => {
  const appData = fs.mkdtempSync(path.join(os.tmpdir(), "vf-userdata-"));
  assert.equal(resolveUserData(appData), path.join(appData, "video-forge"));
});
