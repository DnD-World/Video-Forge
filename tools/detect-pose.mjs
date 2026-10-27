#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Find a person's joints in pictures (MediaPipe pose, on this computer).
//
//   electron tools/detect-pose.mjs <picture.png> [more.png …]
//
// Writes, next to each picture, <name>.pose.json (33 points in pixels, with
// how sure the model is of each) and <name>.pose.png (the joints drawn on the
// picture, to check by eye) and <name>.keyed.png (only the person, the rest
// see-through, from the model's own outline). The model file lives in tools/models/ (ignored by
// git); fetch it once from Google's MediaPipe model page if it is missing.
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { app } from "electron";
import { build } from "esbuild";
import { openPage } from "./lib/explainerRun.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = path.join(ROOT, "tools/models/pose_landmarker_full.task");
const WASM = path.join(ROOT, "node_modules/@mediapipe/tasks-vision/wasm");

async function main() {
  const files = process.argv.slice(2).filter((a) => /\.(png|jpe?g|webp)$/i.test(a));
  if (!files.length) throw new Error("Give one or more pictures.");
  const js = (await build({ entryPoints: [path.join(ROOT, "characters/photoreal/pose-page.mjs")], bundle: true, write: false, format: "esm", target: "es2022", logLevel: "warning" })).outputFiles[0].text;
  const dir = path.join(ROOT, "characters/checks");
  await fs.mkdir(dir, { recursive: true });
  const page = path.join(dir, "pose-page.html");
  await fs.writeFile(page, `<!doctype html><meta charset="utf-8"><body><script type="module">${js.replaceAll("</script", "<\\/script")}</script>`);
  const p = await openPage(page, 800, 600);
  try {
    await new Promise((r) => setTimeout(r, 400));
    console.log(await p.js(`window.__init(${JSON.stringify(pathToFileURL(WASM).href)}, ${JSON.stringify(pathToFileURL(MODEL).href)})`));
    for (const f of files) {
      const data = "data:image/png;base64," + (await fs.readFile(f)).toString("base64");
      const r = await p.js(`window.__detect(${JSON.stringify(data)})`);
      const base = f.replace(/\.(png|jpe?g|webp)$/i, "");
      await fs.writeFile(base + ".pose.json", JSON.stringify({ w: r.w, h: r.h, points: r.points }, null, 1));
      await fs.writeFile(base + ".pose.png", Buffer.from(r.overlay.split(",")[1], "base64"));
      // the picture with everything but the person see-through (the model's outline)
      if (r.keyed) await fs.writeFile(base + ".keyed.png", Buffer.from(r.keyed.split(",")[1], "base64"));
      console.log(path.basename(f), r.points.length ? `${r.points.length} points` : "no person found");
    }
    if (p.consoleErrors.length) console.error(p.consoleErrors.join("\n"));
  } finally {
    p.close();
  }
}

app.on("window-all-closed", () => {});
app.whenReady().then(main).catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => app.quit());
