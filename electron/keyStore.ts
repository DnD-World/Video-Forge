import { app, safeStorage } from "electron";
import path from "path";
import { readVaultFile, writeVaultFile, VaultRefusal, type Codec, type Vault } from "./vaultFile";
import { SHARED_NAMES, putShared, sharedValues } from "../tools/lib/forgeKeys.mjs";

// ---------------------------------------------------------------------------
// Encrypted key vault — the ONLY place API keys are read/written from disk.
// Raw key values never leave the main process except when a caller in the
// main process explicitly asks for one (e.g. to make an outgoing API call).
// ---------------------------------------------------------------------------

const vaultFile = () => path.join(app.getPath("userData"), "byok.secrets.enc");

// Vault = { azure: "xxx", nvidia: "xxx", ... }. The file handling (atomic
// saves, the .bak copy, refusing to overwrite what it cannot read) lives in
// electron/vaultFile.ts, where it has tests.

export interface WriteResult {
  ok: boolean;
  /** Why nothing was saved, in plain words, when ok is false. */
  problem?: string;
  /** true if the OS keychain wasn't available and we fell back to a
   *  plaintext (but still 0600-permissioned) file on disk. The UI should
   *  warn the user when this is true. */
  plaintextFallback: boolean;
}

const codec: Codec = {
  encode: (json) =>
    // No OS keychain (e.g. some Linux setups without a keyring running): fail
    // soft with a plain file rather than crashing, and tell the caller.
    safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(json) : Buffer.from(json, "utf-8"),
  decode: (buf) => {
    if (!safeStorage.isEncryptionAvailable()) return buf.toString("utf-8");
    try {
      return safeStorage.decryptString(buf);
    } catch {
      // Vault may have been written before encryption was available on this
      // machine (or vice versa) — fall back to reading it as plain JSON
      // rather than losing the user's keys.
      return buf.toString("utf-8");
    }
  },
};

/** For READING keys. A vault that cannot be read looks empty here (there is
 *  nothing to show), but it is said out loud and — see updateVault — never
 *  written over. */
async function readVault(): Promise<Vault> {
  const r = readVaultFile(vaultFile(), codec);
  if (r.state === "ok") {
    if (r.fromBackup) console.log("[video-forge] the key file was damaged; keys were read from its backup copy.");
    return r.vault;
  }
  if (r.state === "unreadable") console.log(`[video-forge] the key file cannot be read (${r.reason}); saving is paused so nothing is overwritten.`);
  return {};
}

/** Change the vault: read what is really there, change it, save it atomically.
 *  Refuses (and says why) rather than ever writing over keys it could not read. */
async function updateVault(change: (v: Vault) => { next: Vault; allowEmpty?: boolean }): Promise<WriteResult> {
  const plaintextFallback = !safeStorage.isEncryptionAvailable();
  try {
    const r = readVaultFile(vaultFile(), codec);
    if (r.state === "unreadable") {
      // writeVaultFile gives the plain-words refusal.
      writeVaultFile(vaultFile(), {}, codec);
    }
    const { next, allowEmpty } = change(r.state === "ok" ? r.vault : {});
    writeVaultFile(vaultFile(), next, codec, { allowEmpty });
    return { ok: true, plaintextFallback };
  } catch (e) {
    if (e instanceof VaultRefusal) return { ok: false, plaintextFallback, problem: e.message };
    throw e;
  }
}

// --- Shared with Image Forge (tools/lib/forgeKeys.mjs, 12 Oct 2026) -------
// Keys both apps use (Gemini, OpenRouter, NVIDIA…) also go to a file both can
// read, locked by Windows for this user only. The shared copy wins when
// reading, because whichever app saved last wrote it there. Reading it starts
// PowerShell (~0.4 s), so it is remembered for half a minute.
let sharedCache: { at: number; values: Record<string, string> } | null = null;
async function shared(): Promise<Record<string, string>> {
  if (sharedCache && Date.now() - sharedCache.at < 30_000) return sharedCache.values;
  const values = await sharedValues().catch(() => ({}));
  sharedCache = { at: Date.now(), values };
  return values;
}
async function share(provider: string, value: string): Promise<void> {
  if (!SHARED_NAMES.includes(provider)) return;
  sharedCache = null;
  await putShared({ [provider]: value }, "video-forge").catch((e) =>
    console.log(`[video-forge] could not share the ${provider} key: ${e instanceof Error ? e.message : e}`)
  );
}

/** At start-up: hand Image Forge any shared-kind key it does not have yet. */
export async function syncShared(): Promise<void> {
  const v = await readVault();
  const have = await shared();
  const missing = Object.fromEntries(Object.entries(v).filter(([k, val]) => SHARED_NAMES.includes(k) && val && !have[k]));
  console.log(`[video-forge] shared keys: ${Object.keys(have).length} there already, ${Object.keys(missing).length} to add`);
  if (Object.keys(missing).length) {
    sharedCache = null;
    await putShared(missing, "video-forge").catch((e) =>
      console.log(`[video-forge] could not share keys: ${e instanceof Error ? e.message : e}`)
    );
  }
}

export async function listKeys(): Promise<string[]> {
  return [...new Set([...Object.keys(await readVault()), ...Object.keys(await shared())])];
}

export async function getKey(provider: string): Promise<string | null> {
  if (SHARED_NAMES.includes(provider)) {
    const s = (await shared())[provider];
    if (s) return s;
  }
  const v = await readVault();
  return v[provider] ?? null;
}

export async function setKey(provider: string, value: string): Promise<WriteResult> {
  const r = await updateVault((v) => ({ next: { ...v, [provider]: value } }));
  if (r.ok) await share(provider, value);
  return r;
}

export async function deleteKey(provider: string): Promise<WriteResult> {
  const r = await updateVault((v) => {
    const { [provider]: _gone, ...rest } = v;
    // Deleting the last key on purpose is the one way to end up with none.
    return { next: rest, allowEmpty: provider in v };
  });
  if (r.ok) await share(provider, "");
  return r;
}

/** For the UI: whether a key exists + a masked hint. Never the raw value. */
export async function getKeyStatus(): Promise<Record<string, string>> {
  const v = { ...(await readVault()), ...(await shared()) };
  const out: Record<string, string> = {};
  for (const [p, k] of Object.entries(v)) {
    out[p] = k.length > 4 ? `••••${k.slice(-4)}` : "••••";
  }
  return out;
}

export function encryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}
