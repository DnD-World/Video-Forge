// Where saved data lives after the rename to Video Forge.
//
// Video Forge was called BYOK-Vid-Creator. Electron keeps everything the app
// saves (key vault, settings, localStorage, downloaded footage, finished
// videos) in a folder named after the app, so a rename would make all of it
// look gone.
//
// WHY NOT COPY OR MOVE. On the maintainer's laptop the old folder is 35 GB,
// almost all finished renders, and queue state files name paths inside it.
// Copying doubles the disk use; moving breaks those paths. So a computer that
// already has the old folder simply keeps using it, in place, untouched.
// A fresh install (every public user) gets `%APPDATA%/video-forge`.
//
// Pure Node on purpose (no electron import) so tools/lib/migrateUserData.test.mjs
// can exercise it against temp folders.

import fs from "node:fs";
import path from "node:path";

export const NEW_APP_NAME = "video-forge";
/** Folder names the app has used before. */
export const OLD_APP_NAMES = ["byok-vid-creator", "BYOK-Vid-Creator"];

/** Does this folder hold the user's data (not just Chromium scaffolding)? */
function hasUserData(dir: string): boolean {
  return ["byok.secrets.enc", "Local Storage", "renders"].some((n) => fs.existsSync(path.join(dir, n)));
}

/**
 * The folder the app should use for userData: the new one if it already holds
 * data or no old folder exists; otherwise the old folder, in place.
 */
export function resolveUserData(appData: string): string {
  const neu = path.join(appData, NEW_APP_NAME);
  if (fs.existsSync(neu) && hasUserData(neu)) return neu;
  const old = OLD_APP_NAMES.map((n) => path.join(appData, n)).find(
    (p) => fs.existsSync(p) && hasUserData(p)
  );
  return old ?? neu;
}
