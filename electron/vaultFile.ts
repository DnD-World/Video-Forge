// ---------------------------------------------------------------------------
// The key vault's file, handled so that no accident can empty it.
//
// What used to happen: reading returned {} on ANY error (a locked file, a bad
// decrypt, a half-written file), and saving one new key then wrote back only
// that key — every other key gone. Writing went straight over the file, so a
// power cut mid-save left it broken.
//
// The rules now:
//   * "no file yet" and "a file we cannot read" are different answers. The
//     second one REFUSES to save — nothing is overwritten.
//   * A readable vault is never replaced by an empty one by accident (deleting
//     the last key on purpose is allowed).
//   * Saves go to a temp file, then replace the real one in one step, so the
//     vault is whole or untouched. The version before the save is kept as
//     <file>.bak, and reading falls back to it if the main file is damaged.
//
// No electron import on purpose: tools/lib/vaultFile.test.mjs runs this file.
// The caller supplies encode/decode (the OS keychain in the app).
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";

export type Vault = Record<string, string>;

export interface Codec {
  encode: (json: string) => Buffer;
  /** Returns the JSON text, or throws if this is not something it can read. */
  decode: (buf: Buffer) => string;
}

export type ReadResult =
  | { state: "missing" }
  | { state: "ok"; vault: Vault; fromBackup: boolean }
  /** `open`: the file is there but cannot be opened (locked) — it may be perfectly
   *  good, so no backup may stand in for it. `content`: opened, but is not a vault. */
  | { state: "unreadable"; reason: string; kind: "open" | "content" };

export const backupOf = (file: string) => `${file}.bak`;

function parse(buf: Buffer, codec: Codec): Vault {
  const v = JSON.parse(codec.decode(buf));
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("not a key list");
  for (const val of Object.values(v)) if (typeof val !== "string") throw new Error("not a key list");
  return v as Vault;
}

/** Read one file: missing, ok, or unreadable — never "empty because it failed". */
function readOne(file: string, codec: Codec): ReadResult {
  let buf: Buffer;
  try {
    buf = fs.readFileSync(file);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { state: "missing" };
    return { state: "unreadable", reason: `cannot open the file (${code ?? "error"})`, kind: "open" };
  }
  try {
    return { state: "ok", vault: parse(buf, codec), fromBackup: false };
  } catch (e) {
    return { state: "unreadable", reason: e instanceof Error ? e.message : String(e), kind: "content" };
  }
}

/** The vault, falling back to the last good copy when the main file is damaged. */
export function readVaultFile(file: string, codec: Codec): ReadResult {
  const main = readOne(file, codec);
  if (main.state === "ok") return main;
  // A locked file may be the newest, best copy: never answer from an older one.
  if (main.state === "unreadable" && main.kind === "open") return main;
  const bak = readOne(backupOf(file), codec);
  if (bak.state === "ok") return { ...bak, fromBackup: true };
  // Nothing readable anywhere. If the main file was merely absent and so is the
  // backup, this is a first run; otherwise something is wrong and we say so.
  if (main.state === "missing") return bak.state === "missing" ? { state: "missing" } : bak;
  return main;
}

export class VaultRefusal extends Error {}

/**
 * Save the vault. Throws VaultRefusal (and changes nothing) when the file on
 * disk exists but cannot be read, or when this would replace keys with nothing.
 *
 * `allowEmpty`: set only when the user deliberately deleted the last key.
 */
export function writeVaultFile(file: string, next: Vault, codec: Codec, opts: { allowEmpty?: boolean } = {}): void {
  const current = readVaultFile(file, codec);
  if (current.state === "unreadable") {
    throw new VaultRefusal(
      `The saved keys file can't be read right now (${current.reason}), so nothing was saved and your other keys were not touched. ` +
        `Close any other copy of Video Forge and try again. A backup copy is kept next to the file (byok.secrets.enc.bak).`
    );
  }
  if (!opts.allowEmpty && Object.keys(next).length === 0 && current.state === "ok" && Object.keys(current.vault).length > 0) {
    throw new VaultRefusal("Refusing to replace your saved keys with an empty list. Nothing was changed.");
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  const fd = fs.openSync(tmp, "w", 0o600);
  try {
    fs.writeSync(fd, codec.encode(JSON.stringify(next)));
    fs.fsyncSync(fd); // on the disk, not just in the cache, before it replaces anything
  } finally {
    fs.closeSync(fd);
  }
  // Keep the version we are about to replace, if it was a good one.
  if (current.state === "ok" && !current.fromBackup) {
    try {
      fs.copyFileSync(file, backupOf(file));
    } catch {
      /* no backup is worse than one, but not worth failing the save for */
    }
  }
  fs.renameSync(tmp, file); // replaces the old file in one step
}
