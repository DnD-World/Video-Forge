// One-time carry-over of saved data from the app's old name.
//
// Video Forge was called BYOK-Vid-Creator. Electron keeps everything the app
// saves (key vault, settings, localStorage, downloaded footage, finished
// videos) in a folder named after the app, so a rename would make all of it
// look gone. This copies the old folder into the new one on first start.
//
// Rules this follows:
//   - COPY only. The old folder is never moved, edited or deleted.
//   - Never overwrites anything already in the new folder.
//   - Two stages. Stage 1 (small: vault, settings, localStorage) is copied
//     synchronously before the app starts. Stage 2 (media + renders, tens of
//     GB on the maintainer's machine) is copied in the background so the
//     window is not frozen for minutes; it resumes on the next start if it
//     was interrupted.
//   - Regenerable caches are skipped.
//
// Pure Node on purpose (no electron import) so tools/lib/migrateUserData.test.mjs
// can exercise it against temp folders.

import fs from "node:fs";
import path from "node:path";

export const NEW_APP_NAME = "video-forge";
/** Folder names the app has used before. Windows folder names are
 *  case-insensitive; the duplicate-looking entry covers case-sensitive systems. */
export const OLD_APP_NAMES = ["byok-vid-creator", "BYOK-Vid-Creator"];

const STAGE1_MARKER = ".migrated-from-byok-vid-creator";
const STARTED_MARKER = ".migration-started-from-byok-vid-creator";
const STAGE2_MARKER = ".migrated-media-from-byok-vid-creator";

/** Large content folders, copied in the background (stage 2). */
const BULK_DIRS = ["renders", "media"];

/** Chromium caches and per-run lock files: regenerated, not worth copying. */
const SKIP = new Set([
  "cache",
  "code cache",
  "gpucache",
  "dawngraphitecache",
  "dawnwebgpucache",
  "shadercache",
  "grshadercache",
  "graphitedawncache",
  "component_crx_cache",
  "crashpad",
  "singletonlock",
  "singletoncookie",
  "singletonsocket",
  "lockfile",
  "devtoolsactiveport",
  "child-processes.json", // PIDs of last session's helpers — meaningless in a new one
]);

type Log = (message: string) => void;

/** Does this folder already hold the user's data (not just Chromium scaffolding)? */
function hasUserData(dir: string): boolean {
  return ["byok.secrets.enc", "Local Storage", "renders"].some((n) =>
    fs.existsSync(path.join(dir, n))
  );
}

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** First old folder that exists and holds something. */
export function findOldUserData(appData: string): string | null {
  const seen = new Set<string>();
  for (const name of OLD_APP_NAMES) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const dir = path.join(appData, name);
    if (isDir(dir)) return dir;
  }
  return null;
}

/** Skip caches; skip a file already present at the destination with the same
 *  size (so a resumed copy neither re-copies nor trusts a half-written file). */
function keep(src: string, dest: string): boolean {
  if (SKIP.has(path.basename(src).toLowerCase())) return false;
  try {
    const s = fs.statSync(src);
    if (s.isDirectory()) return true;
    const d = fs.statSync(dest);
    return d.size !== s.size;
  } catch {
    return true; // destination missing → copy
  }
}

export interface MigrationResult {
  /** "none": nothing to do. "copied": stage 1 ran. */
  status: "none" | "copied";
  from: string | null;
  to: string;
  /** Resolves when the background media/renders copy has finished. */
  bulk: Promise<void>;
}

/**
 * Call once, early, before anything reads the user-data folder.
 * `appData` is %APPDATA% (app.getPath("appData")).
 */
export function migrateUserData(appData: string, log: Log = console.log): MigrationResult {
  const to = path.join(appData, NEW_APP_NAME);
  const from = findOldUserData(appData);
  const done: MigrationResult = { status: "none", from, to, bulk: Promise.resolve() };
  if (!from) return done;
  // Same folder (case-insensitive FS, or somehow aliased): nothing to copy.
  if (path.resolve(from).toLowerCase() === path.resolve(to).toLowerCase()) return done;

  try {
    fs.mkdirSync(to, { recursive: true });

    if (!fs.existsSync(path.join(to, STAGE1_MARKER))) {
      if (hasUserData(to) && !fs.existsSync(path.join(to, STARTED_MARKER))) {
        // The new folder already has real data (the app has been used under
        // its new name). Do not mix old data into it.
        log(`[video-forge] user data already present in ${to}; not importing from ${from}`);
        fs.writeFileSync(path.join(to, STAGE1_MARKER), `skipped: new folder already had data\n`);
        fs.writeFileSync(path.join(to, STAGE2_MARKER), `skipped\n`);
        return done;
      }
      log(`[video-forge] first start under the new name: copying settings from ${from}`);
      // Written first so an interrupted copy is resumed, not mistaken for real use.
      fs.writeFileSync(path.join(to, STARTED_MARKER), `${new Date().toISOString()}
`);
      for (const entry of fs.readdirSync(from)) {
        if (BULK_DIRS.includes(entry)) continue;
        fs.cpSync(path.join(from, entry), path.join(to, entry), {
          recursive: true,
          force: false,
          errorOnExist: false,
          filter: keep,
        });
      }
      fs.writeFileSync(
        path.join(to, STAGE1_MARKER),
        `copied from ${from} at ${new Date().toISOString()}\n`
      );
      done.status = "copied";
    }

    if (!fs.existsSync(path.join(to, STAGE2_MARKER))) {
      done.bulk = (async () => {
        for (const entry of BULK_DIRS) {
          const src = path.join(from, entry);
          if (!isDir(src)) continue;
          log(`[video-forge] copying ${entry} from the old folder in the background…`);
          await fs.promises.cp(src, path.join(to, entry), {
            recursive: true,
            force: false,
            errorOnExist: false,
            filter: keep,
          });
        }
        await fs.promises.writeFile(
          path.join(to, STAGE2_MARKER),
          `copied from ${from} at ${new Date().toISOString()}\n`
        );
        log(`[video-forge] background copy of media and renders finished.`);
      })().catch((e) => {
        // Not fatal: the old folder is untouched; the copy resumes next start.
        log(`[video-forge] background copy stopped (${e}); it will resume next start.`);
      });
    }
  } catch (e) {
    log(`[video-forge] could not import data from ${from}: ${e}. The old folder was left untouched.`);
  }
  return done;
}
