// ---------------------------------------------------------------------------
// Keeping downloaded background clips from filling the disk.
//
// Every render downloads stock clips into the app's media folder, and nothing
// ever removed them: by 12 Oct 2026 it held 450 clips, 2.7 GB, from the
// course alone. Ak: "we do not have enough storage for this to keep
// happening — we need a way to remind or automate this."
//
// THE RULE. A size limit (Settings, default 2 GB). Over it, clips are removed
// starting with the one used longest ago, until the folder is back under 80%
// of the limit. A clip is "used" when a render or the open project needs it —
// its file date is refreshed then — so what you are working on now always
// survives, and so do clips you re-use. A clip can be downloaded again any
// time it is needed; a removed clip never breaks a project, it re-downloads.
//
// Only video files in the app's own media folder are touched. Sound effects,
// music and anything you chose from elsewhere live in other folders.
// ---------------------------------------------------------------------------

import fsp from "node:fs/promises";
import path from "node:path";

const VIDEO = /\.(mp4|webm|mov|m4v|mkv)$/i;

export interface CacheStats {
  dir: string;
  files: number;
  bytes: number;
}

async function list(dir: string) {
  let names: string[] = [];
  try {
    names = await fsp.readdir(dir);
  } catch {
    return [];
  }
  const out: { file: string; bytes: number; usedMs: number }[] = [];
  for (const n of names) {
    if (!VIDEO.test(n)) continue;
    try {
      const st = await fsp.stat(path.join(dir, n));
      if (st.isFile()) out.push({ file: path.join(dir, n), bytes: st.size, usedMs: st.mtimeMs });
    } catch {
      /* vanished between readdir and stat — nothing to count */
    }
  }
  return out;
}

export async function cacheStats(dir: string): Promise<CacheStats> {
  const files = await list(dir);
  return { dir, files: files.length, bytes: files.reduce((a, f) => a + f.bytes, 0) };
}

/** Mark clips as just used, so a clean-up keeps them. */
export async function touch(paths: string[]) {
  const now = new Date();
  await Promise.all(paths.map((p) => fsp.utimes(p, now, now).catch(() => {})));
}

/**
 * Bring the folder under `limitBytes` (to 80% of it, so it is not trimmed
 * again on the very next render). `keep` paths are never removed.
 * `limitBytes: 0` empties it except for `keep` — the "Clean up now" button.
 */
export async function cleanUp(dir: string, limitBytes: number, keep: string[] = []): Promise<{ removed: number; freedBytes: number; left: CacheStats }> {
  const protect = new Set(keep.map((p) => path.resolve(p).toLowerCase()));
  const files = (await list(dir)).sort((a, b) => a.usedMs - b.usedMs); // longest unused first
  let total = files.reduce((a, f) => a + f.bytes, 0);
  const target = limitBytes > 0 ? limitBytes * 0.8 : 0;
  if (limitBytes > 0 && total <= limitBytes) return { removed: 0, freedBytes: 0, left: await cacheStats(dir) };
  let removed = 0, freed = 0;
  for (const f of files) {
    if (total <= target) break;
    if (protect.has(path.resolve(f.file).toLowerCase())) continue;
    try {
      await fsp.unlink(f.file);
      total -= f.bytes;
      freed += f.bytes;
      removed++;
    } catch {
      /* in use by something right now — leave it for next time */
    }
  }
  return { removed, freedBytes: freed, left: await cacheStats(dir) };
}
