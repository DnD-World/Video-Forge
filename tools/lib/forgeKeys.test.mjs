// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { putShared, readShared, sharedValues, sharedKeysFile, dpapi } from "./forgeKeys.mjs";

// A stand-in lock so the logic tests run anywhere and fast.
const fake = {
  available: true,
  lock: async (t) => Buffer.from([...Buffer.from(t, "utf8")].map((b) => b ^ 0x5a)),
  unlock: async (b) => Buffer.from([...b].map((x) => x ^ 0x5a)).toString("utf8"),
};
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "forge-keys-")), "Forge", "shared-keys.bin");

test("lives in APPDATA\\Forge", () => {
  assert.equal(sharedKeysFile({ APPDATA: "C:\\X" }), path.join("C:\\X", "Forge", "shared-keys.bin"));
});

test("nothing saved reads as empty", async () => {
  assert.deepEqual(await readShared({ file: tmpFile(), crypt: fake }), {});
});

test("a key saved by one app is read by the other", async () => {
  const file = tmpFile();
  assert.deepEqual(await putShared({ gemini: " abc " }, "video-forge", { file, crypt: fake, now: 5 }), ["gemini"]);
  assert.deepEqual(await sharedValues({ file, crypt: fake }), { gemini: "abc" });
  assert.equal((await readShared({ file, crypt: fake })).gemini.from, "video-forge");
});

test("the file on disk does not contain the key in plain text", async () => {
  const file = tmpFile();
  await putShared({ gemini: "SECRETVALUE" }, "t", { file, crypt: fake });
  assert.ok(!fs.readFileSync(file).toString("utf8").includes("SECRETVALUE"));
});

test("same value is not a change; empty removes; unknown names ignored", async () => {
  const file = tmpFile();
  await putShared({ gemini: "a", nvidia: "b" }, "t", { file, crypt: fake });
  assert.deepEqual(await putShared({ gemini: "a", bogus: "x" }, "t", { file, crypt: fake }), []);
  assert.deepEqual(await putShared({ nvidia: "" }, "t", { file, crypt: fake }), ["nvidia"]);
  assert.deepEqual(await sharedValues({ file, crypt: fake }), { gemini: "a" });
});

test("a damaged file reads as empty instead of failing", async () => {
  const file = tmpFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "not json at all");
  assert.deepEqual(await readShared({ file, crypt: fake }), {});
});

test("no sharing where Windows' lock is missing", async () => {
  const off = { ...fake, available: false };
  assert.deepEqual(await putShared({ gemini: "a" }, "t", { file: tmpFile(), crypt: off }), []);
});

test("real Windows lock round trip", { skip: process.platform !== "win32" }, async () => {
  const file = tmpFile();
  await putShared({ mistral: "real-λ-test" }, "t", { file, crypt: dpapi });
  assert.deepEqual(await sharedValues({ file, crypt: dpapi }), { mistral: "real-λ-test" });
});
