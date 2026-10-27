// ---------------------------------------------------------------------------
// Which hidden browser HyperFrames draws the frames in.
//
// HyperFrames downloads "chrome-headless-shell" into ~/.cache/puppeteer and
// uses the newest copy. On 26 Oct 2026 both copies on Ak's laptop had lost
// icudtl.dat — the file with the browser's language data, most likely taken
// by the antivirus — and every puppet render died with "Invalid file
// descriptor to ICU data". A copy is only usable with that file beside it, so
// we look through every copy on the machine and hand HyperFrames a complete
// one. No download, no install: only copies that are already there.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const EXE = "chrome-headless-shell.exe";

/** Newest first, by the version number in the folder name. */
function versionsIn(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map((d) => path.join(dir, d));
  } catch {
    return [];
  }
}

/** Every headless browser copy we know where to find, best first. */
export function browserCandidates(home = os.homedir(), localAppData = process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local")): string[] {
  const out: string[] = [];
  if (process.env.HYPERFRAMES_BROWSER_PATH) out.push(process.env.HYPERFRAMES_BROWSER_PATH);
  for (const v of versionsIn(path.join(home, ".cache", "puppeteer", "chrome-headless-shell"))) out.push(path.join(v, "chrome-headless-shell-win64", EXE));
  const pw = path.join(localAppData, "ms-playwright");
  for (const v of versionsIn(pw).filter((d) => path.basename(d).startsWith("chromium_headless_shell"))) out.push(path.join(v, "chrome-headless-shell-win64", EXE));
  return out;
}

/** A copy is complete when the program and its language data are both there. */
export const isComplete = (exe: string) => fs.existsSync(exe) && fs.existsSync(path.join(path.dirname(exe), "icudtl.dat"));

/**
 * The browser to render with: a complete copy, or null when none is (the
 * caller then lets HyperFrames try its own, and its error is explained).
 */
export function pickRenderBrowser(): string | null {
  return browserCandidates().find(isComplete) ?? null;
}

/** Plain words for the "no complete browser" case. */
export const NO_BROWSER_HELP =
  "The hidden browser that draws the video's frames is damaged (a file called icudtl.dat is missing — antivirus programs sometimes remove it). " +
  "Delete the folder %USERPROFILE%\\.cache\\puppeteer\\chrome-headless-shell and render again: a fresh copy is downloaded once.";
