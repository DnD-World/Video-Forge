// ---------------------------------------------------------------------------
// Put the outro on lessons that were rendered without one.
//
//   npm run outros                    says what it would do
//   npm run outros -- --apply         does it
//   npm run outros -- --apply --only 103.3
//
// WHY IT IS NEEDED. All 69 lessons rendered with no outro. The welding step ran
// Remotion's bundled ffmpeg, which is a cut-down build — 42 filters where a
// normal one has 576, and missing exactly the three that step uses: pad, setsar
// and fps. Every lesson failed the same way, reported it in one line, and that
// line scrolled past inside a twelve-minute render. The choice of ffmpeg is
// fixed in electron/process/ffmpegPath.ts; this repairs the videos already made.
//
// RE-JOINING, NOT RE-RENDERING. The lesson itself is right; joining copies it
// untouched and re-encodes only the seconds of outro. About a minute each
// rather than twelve.
//
// THE SAME OUTRO IT WOULD HAVE HAD: lessons in name order, outros in turn — the
// rule in electron/batch/runJob.ts — so running this twice cannot reshuffle
// which lesson gets which ending.
// ---------------------------------------------------------------------------

import fsp from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { joinCards } from "./joinCards";
import { ffmpegBin, ffprobeBin } from "../process/ffmpegPath";

/** Seconds, or 0 when the file cannot be read. */
function durationOf(file: string): number {
  const out = spawnSync(
    ffprobeBin(),
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8", windowsHide: true, timeout: 20000 }
  );
  return Number((out.stdout ?? "").trim()) || 0;
}

export interface AddOutrosOptions {
  /** Where the finished lessons are. */
  videosDir: string;
  /** The course folder whose subfolders give the lesson order. */
  lessonsSrc: string;
  outrosDir: string;
  apply: boolean;
  only?: string;
  /** Must match the videos: these renders are 24fps, not 30. */
  fps: number;
}

/** How long the lesson's own audio is, from its cue sheet. */
function lessonLengthSec(lessonsSrc: string, name: string): number {
  try {
    const sheet = JSON.parse(
      readFileSync(path.join(lessonsSrc, name, `${name}-cues.json`), "utf8")
    ) as { totalMs?: number };
    return (sheet.totalMs ?? 0) / 1000;
  } catch {
    return 0;
  }
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

export async function addOutros(o: AddOutrosOptions): Promise<void> {
  console.log(`ffmpeg in use: ${ffmpegBin()}`);

  const lessons = (await fsp.readdir(o.lessonsSrc, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort(byName);
  const outros = (await fsp.readdir(o.outrosDir))
    .filter((f) => /\.(mp4|mov|webm)$/i.test(f))
    .sort();
  if (outros.length === 0) throw new Error(`No outro clips in ${o.outrosDir}`);

  const videos = (await fsp.readdir(o.videosDir)).filter((f) => f.endsWith(".mp4")).sort(byName);
  let done = 0;
  let skipped = 0;

  for (const file of videos) {
    const name = file.replace(/\.mp4$/, "");
    if (o.only && name !== o.only) continue;

    const n = lessons.indexOf(name);
    if (n < 0) {
      console.log(`SKIP ${name}: no lesson folder of that name`);
      skipped++;
      continue;
    }
    const outroPath = path.join(o.outrosDir, outros[n % outros.length]);
    const mainPath = path.join(o.videosDir, file);

    // ALREADY DONE? A repaired lesson must never be welded twice — that would
    // play the outro, then play it again. The lesson's own audio says how long
    // it should be without one; anything more than a few seconds past that is
    // an outro already in place.
    const lessonSec = lessonLengthSec(o.lessonsSrc, name);
    const videoSec = durationOf(mainPath);
    if (lessonSec > 0 && videoSec > lessonSec + 5) {
      console.log(`skip ${name}: already ends with an outro (${videoSec.toFixed(1)}s vs ${lessonSec.toFixed(1)}s of lesson)`);
      skipped++;
      continue;
    }

    if (!o.apply) {
      console.log(`would add ${path.basename(outroPath)} to ${name}`);
      done++;
      continue;
    }

    const tempDir = path.join(o.videosDir, `.join-${name}`);
    try {
      const res = await joinCards({
        mainPath,
        outroPath,
        width: 1080,
        height: 1920,
        fps: o.fps,
        crf: 20,
        tempDir,
      });
      for (const w of res.warnings) console.log(`   ${w}`);
      if (res.outputPath === mainPath) {
        console.log(`FAILED ${name}: nothing was joined`);
        skipped++;
        continue;
      }
      // Replace the original ONLY once the joined file exists and is bigger.
      // A truncated join must never overwrite a good video.
      const before = (await fsp.stat(mainPath)).size;
      const after = (await fsp.stat(res.outputPath)).size;
      if (after <= before) {
        console.log(`FAILED ${name}: joined file is not larger (${after} vs ${before})`);
        await fsp.rm(res.outputPath, { force: true });
        skipped++;
        continue;
      }
      await fsp.rm(mainPath, { force: true });
      await fsp.rename(res.outputPath, mainPath);
      console.log(`ok ${name}  +${res.outroSec.toFixed(1)}s (${path.basename(outroPath)})`);
      done++;
    } catch (e) {
      console.log(`FAILED ${name}: ${e instanceof Error ? e.message : String(e)}`);
      skipped++;
    } finally {
      await fsp.rm(tempDir, { recursive: true, force: true });
    }
  }

  console.log(`\n${o.apply ? "done" : "would do"} ${done}, skipped ${skipped}`);
}
