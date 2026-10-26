// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readVaultFile, writeVaultFile, backupOf, VaultRefusal } from "../../electron/vaultFile.ts";

// A stand-in for the OS keychain: "locked:" in front of the JSON, so a file
// that is not locked that way is "undecryptable" (like a damaged real vault).
const codec = {
  encode: (json) => Buffer.from("locked:" + json, "utf8"),
  decode: (buf) => {
    const s = buf.toString("utf8");
    if (!s.startsWith("locked:")) throw new Error("cannot decrypt");
    return s.slice(7);
  },
};

const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), "vf-vault-"));

test("a first run has no vault, and saving the first key creates one", () => {
  const d = dir();
  const f = path.join(d, "v.enc");
  assert.deepEqual(readVaultFile(f, codec), { state: "missing" });
  writeVaultFile(f, { gemini: "g" }, codec);
  assert.deepEqual(readVaultFile(f, codec), { state: "ok", vault: { gemini: "g" }, fromBackup: false });
  assert.deepEqual(fs.readdirSync(d).filter((n) => n.endsWith(".tmp")), [], "no temp file left behind");
});

test("saving keeps the previous version as .bak", () => {
  const f = path.join(dir(), "v.enc");
  writeVaultFile(f, { a: "1" }, codec);
  writeVaultFile(f, { a: "1", b: "2" }, codec);
  assert.deepEqual(JSON.parse(codec.decode(fs.readFileSync(backupOf(f)))), { a: "1" });
  assert.deepEqual(readVaultFile(f, codec).vault, { a: "1", b: "2" });
});

test("a file that cannot be read is NOT replaced by one new key", () => {
  const f = path.join(dir(), "v.enc");
  writeVaultFile(f, { a: "1", b: "2", c: "3" }, codec);
  // simulate a damaged main file and no usable backup
  fs.rmSync(backupOf(f), { force: true });
  fs.writeFileSync(f, "garbage");
  assert.throws(() => writeVaultFile(f, { d: "4" }, codec), VaultRefusal);
  assert.equal(fs.readFileSync(f, "utf8"), "garbage", "the file was left exactly as it was");
});

test("a damaged main file is recovered from the backup, and the next save repairs it", () => {
  const f = path.join(dir(), "v.enc");
  writeVaultFile(f, { a: "1" }, codec);
  writeVaultFile(f, { a: "1", b: "2" }, codec); // .bak now holds {a}
  fs.writeFileSync(f, "half-writ"); // crash in the middle of something else
  const r = readVaultFile(f, codec);
  assert.equal(r.state, "ok");
  assert.equal(r.fromBackup, true);
  assert.deepEqual(r.vault, { a: "1" });
  writeVaultFile(f, { ...r.vault, c: "3" }, codec);
  assert.deepEqual(readVaultFile(f, codec), { state: "ok", vault: { a: "1", c: "3" }, fromBackup: false });
});

test("a file that is locked (cannot be opened) is never answered from an older backup", () => {
  const f = path.join(dir(), "v.enc");
  writeVaultFile(f, { a: "1" }, codec);
  writeVaultFile(f, { a: "1", b: "2" }, codec);
  // make "the main file" a directory: opening it fails the way a locked file does
  fs.rmSync(f);
  fs.mkdirSync(f);
  const r = readVaultFile(f, codec);
  assert.equal(r.state, "unreadable");
  assert.equal(r.kind, "open");
  assert.throws(() => writeVaultFile(f, { z: "9" }, codec), VaultRefusal);
});

test("a readable vault is never replaced by an empty one, unless the last key is deleted on purpose", () => {
  const f = path.join(dir(), "v.enc");
  writeVaultFile(f, { a: "1" }, codec);
  assert.throws(() => writeVaultFile(f, {}, codec), /empty list/);
  assert.deepEqual(readVaultFile(f, codec).vault, { a: "1" });
  writeVaultFile(f, {}, codec, { allowEmpty: true });
  assert.deepEqual(readVaultFile(f, codec).vault, {});
});

test("a crash between writing the temp file and the swap leaves the vault whole", () => {
  const f = path.join(dir(), "v.enc");
  writeVaultFile(f, { a: "1" }, codec);
  // what a power cut mid-save leaves: a half-written temp file beside a good vault
  fs.writeFileSync(`${f}.tmp`, "locked:{\"a\":");
  assert.deepEqual(readVaultFile(f, codec).vault, { a: "1" });
  writeVaultFile(f, { a: "1", b: "2" }, codec); // the next save simply overwrites the temp
  assert.deepEqual(readVaultFile(f, codec).vault, { a: "1", b: "2" });
});

test("something that decodes but is not a key list is unreadable, not empty", () => {
  const f = path.join(dir(), "v.enc");
  fs.writeFileSync(f, codec.encode(JSON.stringify(["not", "a", "vault"])));
  assert.equal(readVaultFile(f, codec).state, "unreadable");
  fs.writeFileSync(f, codec.encode(JSON.stringify({ a: 5 })));
  assert.equal(readVaultFile(f, codec).state, "unreadable");
});
