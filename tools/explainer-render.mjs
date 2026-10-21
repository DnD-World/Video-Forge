#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Render an explainer, and make its extras.
//
//   npm run explainer:render -- scene-list.json [--format 9:16] [--puppets 2]
//        [--shape circle] [--scheme day] [--tint sepia] [--audio narration.wav] [--out file.mp4]
//        [--faces]               also <out>-faces.mp4 with sample faces in the spots
//        [--gif FROM-TO]         also a GIF of that range, e.g. --gif 3-9
//        [--clip FROM-TO]        also a short MP4 of that range
//        [--still SECONDS]       also a PNG of that moment
//        [--thumbs]              also three 1280×720 thumbnails
//        [--captions]            also .srt and .vtt (needs "words" in the scene list)
//        [--chapters]            also a YouTube chapter list (.chapters.txt)
//   npm run explainer:render -- --imported page.html [--tint sepia] [--out file.mp4]
//
// Runs in Electron; the work is in tools/lib/explainerRun.mjs (shared with the app).
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import { ROOT, captionCues, chapters, extractClip, gifFromSpec, renderImported, renderSpec, stillPng, thumbnails, toSrt, toVtt, withSampleFaces } from "./lib/explainerRun.mjs";
import { holesFor } from "../explainer/core/frame.mjs";
import { resolveSpec } from "../explainer/core/spec.mjs";

/** Google Fonts downloaded by these tools are kept here (the app uses its own data folder). */
const FONT_CACHE = path.join(ROOT, "explainer", "checks", ".fonts");

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { spec: null, imported: null, format: null, puppets: null, shape: "circle", scheme: null, tint: null, audio: null, out: null, faces: false, gif: null, clip: null, still: null, thumbs: false, captions: false, chapters: false };
  const range = (v) => { const [f, t] = v.split("-").map(Number); return { from: f, to: t }; };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (!k.startsWith("--")) { o.spec = path.resolve(k); continue; }
    if (["--faces", "--thumbs", "--captions", "--chapters"].includes(k)) { o[k.slice(2)] = true; continue; }
    const v = a[++i];
    if (k === "--format") o.format = v;
    else if (k === "--puppets") o.puppets = Number(v);
    else if (k === "--shape") o.shape = v;
    else if (k === "--scheme") o.scheme = v;
    else if (k === "--tint") o.tint = v;
    else if (k === "--audio") o.audio = path.resolve(v);
    else if (k === "--out") o.out = path.resolve(v);
    else if (k === "--imported") o.imported = path.resolve(v);
    else if (k === "--gif") o.gif = range(v);
    else if (k === "--clip") o.clip = range(v);
    else if (k === "--still") o.still = Number(v);
  }
  if (!o.imported) o.spec ??= path.join(ROOT, "explainer", "samples", "how-it-works.json");
  return o;
}

const progress = (f) => process.stdout.write(`\r${Math.round(f * 100)}%  `);

async function main() {
  const o = parseArgs();
  if (o.imported) {
    o.out ??= path.join(ROOT, "explainer", "checks", "renders", path.basename(o.imported, ".html") + ".mp4");
    await fs.mkdir(path.dirname(o.out), { recursive: true });
    await renderImported(o.imported, o.out, { tint: o.tint, audio: o.audio, onProgress: progress });
    console.log("\nVideo: " + o.out);
    return;
  }
  const spec = JSON.parse(await fs.readFile(o.spec, "utf8"));
  if (o.format) spec.format = o.format;
  if (o.scheme) spec.scheme = o.scheme;
  if (o.tint) spec.tint = o.tint;
  if (o.puppets != null) spec.puppets = o.puppets ? { count: o.puppets, shape: o.shape } : undefined;
  const name = `${path.basename(o.spec, ".json")}-${spec.format.replace(":", "x")}${spec.puppets?.count ? `-p${spec.puppets.count}` : ""}`;
  o.out ??= path.join(ROOT, "explainer", "checks", "renders", `${name}.mp4`);
  await fs.mkdir(path.dirname(o.out), { recursive: true });
  const t0 = Date.now();
  const R = await renderSpec(spec, o.out, { fontCache: FONT_CACHE, audio: o.audio, onProgress: progress });
  console.log(`\nVideo: ${o.out} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  const base = o.out.replace(/\.mp4$/i, "");
  if (o.faces && R.holes.length) { await withSampleFaces(o.out, holesFor(R.slots, R.W, R.H), `${base}-faces.mp4`); console.log(`With sample faces: ${base}-faces.mp4`); }
  if (o.gif) { await gifFromSpec(spec, `${base}.gif`, { fontCache: FONT_CACHE, ...o.gif }); console.log(`GIF: ${base}.gif`); }
  if (o.clip) { await extractClip(o.out, `${base}-clip.mp4`, o.clip); console.log(`Clip: ${base}-clip.mp4`); }
  if (o.still != null) { await stillPng(spec, o.still, `${base}-${o.still}s.png`, { fontCache: FONT_CACHE }); console.log(`Still: ${base}-${o.still}s.png`); }
  if (o.thumbs) for (const f of await thumbnails(spec, path.dirname(o.out), { fontCache: FONT_CACHE, prefix: path.basename(base) })) console.log(`Thumbnail: ${f}`);
  if (o.captions) {
    const cues = captionCues(spec.words);
    if (!cues.length) console.log("Captions: skipped — the scene list has no word times");
    else { await fs.writeFile(`${base}.srt`, toSrt(cues)); await fs.writeFile(`${base}.vtt`, toVtt(cues)); console.log(`Captions: ${base}.srt, .vtt`); }
  }
  if (o.chapters) {
    const ch = chapters(spec, resolveSpec(spec));
    if (!ch) console.log("Chapters: skipped — YouTube needs at least 3 chapters of 10 s or more");
    else { await fs.writeFile(`${base}.chapters.txt`, ch + "\n"); console.log(`Chapters: ${base}.chapters.txt`); }
  }
}

app.on("window-all-closed", () => { /* the render keeps going */ });
app.whenReady().then(main).then(() => app.exit(0), (e) => { console.error(e.stack || e); app.exit(1); });
