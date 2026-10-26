// The app-wide PathGuard (electron/security/pathGuard.ts), wired to this app's
// own folders. Everything in main that takes a path from the window asks here.

import { app } from "electron";
import path from "node:path";
import { PathGuard, looksLikePython } from "./pathGuard";
import { shelfRoot } from "../../tools/lib/forgeShelf.mjs";

let instance: PathGuard | null = null;
const extraReadRoots: string[] = [];

export function guard(): PathGuard {
  if (!instance) {
    instance = new PathGuard({
      // The app's data folder: renders, media, fonts, explainer work.
      ownRoots: () => [app.getPath("userData")],
      // Read-only: the app itself (puppets, music, sfx, brands), the Forge
      // shelf, and whatever the active brand pack points at.
      readOnlyRoots: () => [app.getAppPath(), shelfRoot(), ...extraReadRoots],
      grantsFile: path.join(app.getPath("userData"), "picked-files.json"),
    });
  }
  return instance;
}

/** A folder the app reads from by its own choosing (the brand pack's puppets). */
export function addReadOnlyRoot(dir: string | undefined): void {
  if (dir && !extraReadRoots.includes(dir)) extraReadRoots.push(dir);
}

/**
 * May the window make the app start this program as the Piper voice server?
 * Only a Python interpreter: a bare name looked up on PATH ("python"), or a
 * python file inside a folder the app owns or you picked. Never anything else.
 */
export function pythonAllowed(program: unknown): boolean {
  if (!looksLikePython(program)) return false;
  const p = program as string;
  if (!/[\\/]/.test(p)) return true; // bare command name
  return guard().canRead(p);
}
