// ---------------------------------------------------------------------------
// Where ffmpeg and ffprobe are.
//
// WHY NOT JUST "ffmpeg". Spawning the bare name finds whatever is on PATH, and
// on the machine this was written on that is a winget install. On anyone
// else's machine — which is the point of an installer — there is usually no
// ffmpeg at all, and the first thing to fail would be joining an intro onto a
// finished video, after the whole render had already been paid for in time.
//
// Remotion already ships both programs for its own use, inside
// @remotion/compositor-win32-x64-msvc, and the packaged app carries that
// folder anyway. Using them means the app needs nothing installed beside it.
// PATH stays as the fallback for platforms where that package is absent.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);

function bundled(exe: "ffmpeg" | "ffprobe"): string | null {
  if (process.platform !== "win32") return null;
  try {
    const pkg = require.resolve("@remotion/compositor-win32-x64-msvc/package.json");
    const file = path.join(path.dirname(pkg), `${exe}.exe`);
    return fs.existsSync(file) ? file : null;
  } catch {
    return null;
  }
}

/** Is this ffmpeg a full build, or Remotion's cut-down one?
 *
 *  REMOTION SHIPS A STRIPPED FFMPEG: 42 filters where a normal build has 576,
 *  and the three missing ones happen to be exactly what welding a card needs —
 *  `pad`, `setsar` and `fps`. Preferring it over the machine's own ffmpeg cost
 *  every one of the 69 lessons its outro (20 Sep 2026): the step failed, said
 *  so in one line, and the line scrolled past inside a twelve-minute render.
 *
 *  So: a PATH ffmpeg is used when it has `pad`, and the bundled one is the
 *  fallback that keeps the app working on a machine with no ffmpeg at all.
 *  Checked once per run by asking the binary what filters it has. */
function hasPadFilter(bin: string): boolean {
  try {
    const out = spawnSync(bin, ["-hide_banner", "-filters"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 15000,
    });
    if (out.status !== 0 || !out.stdout) return false;
    return /^\s*\S+\s+pad\s/m.test(out.stdout);
  } catch {
    return false;
  }
}

let cache: Record<string, string> = {};

function pick(exe: "ffmpeg" | "ffprobe"): string {
  const onPath = exe;
  const bundledBin = bundled(exe);
  // ffprobe only reads; the stripped build is fine for that. ffmpeg has to
  // filter, so it is the one that must be complete.
  if (exe === "ffprobe") return bundledBin ?? onPath;
  if (hasPadFilter(onPath)) return onPath;
  if (bundledBin && hasPadFilter(bundledBin)) return bundledBin;
  // Neither is complete. The full one on PATH is still the better bet, and the
  // card step reports what it could not do rather than failing the render.
  return bundledBin ?? onPath;
}

export function ffmpegBin(): string {
  return (cache.ffmpeg ??= pick("ffmpeg"));
}

export function ffprobeBin(): string {
  return (cache.ffprobe ??= pick("ffprobe"));
}
