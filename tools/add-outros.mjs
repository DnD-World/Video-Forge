/**
 * Weld the outro onto lessons that were rendered without one.
 *
 *   node tools/add-outros.mjs                 # says what it would do
 *   node tools/add-outros.mjs --apply         # does it
 *   node tools/add-outros.mjs --apply --only 103.3
 *
 * WHY THIS EXISTS. All 69 lessons rendered with no outro: the welding step used
 * Remotion's bundled ffmpeg, which is a cut-down build with 42 filters instead
 * of 576 and none of the three that step needs (pad, setsar, fps). It failed
 * per lesson, said so in one line, and that line scrolled past inside a
 * twelve-minute render. Fixed in electron/process/ffmpegPath.ts on 20 Sep 2026.
 *
 * RE-JOINING RATHER THAN RE-RENDERING. The lesson itself is already correct, and
 * joining copies it untouched while re-encoding only the few seconds of outro —
 * about a minute per lesson instead of twelve.
 *
 * THE SAME OUTRO IT WOULD HAVE HAD: lessons in name order, outros in turn, which
 * is the rule in electron/batch/runJob.ts. Re-running this cannot change which
 * outro a lesson gets.
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LESSONS_SRC = "C:/Users/strav/Documents/CLAUDE SPACE/lms/tts/out";
const VIDEOS = path.join(process.env.APPDATA ?? "", "byok-vid-creator", "renders", "lessons");
const OUTROS = path.join(ROOT, "outros", "cut");

const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const only = argv[argv.indexOf("--only") + 1];

const { joinCards } = await import("file://" + path.join(ROOT, "electron/render/joinCards.ts"));
const { ffmpegBin } = await import("file://" + path.join(ROOT, "electron/process/ffmpegPath.ts"));
console.log(`ffmpeg in use: ${ffmpegBin()}`);

const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const lessons = fs.readdirSync(LESSONS_SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name).sort(byName);
const outros = fs.readdirSync(OUTROS).filter((f) => /\.(mp4|mov|webm)$/i.test(f)).sort();

let done = 0, skipped = 0;
for (const file of fs.readdirSync(VIDEOS).filter((f) => f.endsWith(".mp4")).sort(byName)) {
  const name = file.replace(/\.mp4$/, "");
  if (only && name !== only) continue;

  const n = lessons.indexOf(name);
  if (n < 0) { console.log(`SKIP ${name}: no lesson folder of that name`); skipped++; continue; }
  const outro = path.join(OUTROS, outros[n % outros.length]);
  const main = path.join(VIDEOS, file);

  if (!apply) {
    console.log(`would add ${path.basename(outro)} to ${name}`);
    done++;
    continue;
  }

  const tempDir = path.join(VIDEOS, `.join-${name}`);
  try {
    const res = await joinCards({
      mainPath: main, outroPath: outro,
      // 24, because that is what these renders are: the presets never set a
      // frame rate, so every lesson took the app's default. A card encoded at
      // 30 against a 24fps lesson is a concat that plays at the wrong speed.
      width: 1080, height: 1920, fps: 24, crf: 20,
      tempDir,
    });
    for (const w of res.warnings) console.log(`   ${w}`);
    if (res.outputPath === main) { console.log(`FAILED ${name}: nothing was joined`); skipped++; continue; }
    // Replace the original only once the joined file exists and is bigger than
    // the lesson alone — a truncated join must never overwrite a good video.
    const before = (await fsp.stat(main)).size;
    const after = (await fsp.stat(res.outputPath)).size;
    if (after <= before) { console.log(`FAILED ${name}: joined file is not larger (${after} vs ${before})`); skipped++; continue; }
    await fsp.rm(main, { force: true });
    await fsp.rename(res.outputPath, main);
    console.log(`ok ${name}  +${res.outroSec.toFixed(1)}s (${path.basename(outro)})`);
    done++;
  } catch (e) {
    console.log(`FAILED ${name}: ${e instanceof Error ? e.message : String(e)}`);
    skipped++;
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
}
console.log(`\n${apply ? "done" : "would do"} ${done}, skipped ${skipped}`);
