#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Experiments #49b/#49c as a picture (Electron, hidden window):
//
//   electron tools/mixing-sheet.mjs --image <full-body puppet, background keyed out>.png
//                                   --limbs <joint points>.json [--look sticker] [--out name]
//
// Writes characters/checks/mixing-<name>.png (that folder is never committed:
// a puppet picture may be a private character). Rows: moves; columns: moments;
// in each: A drawn, B the puppet cut into limbs, C the puppet's head on a
// drawn body.
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "electron";
import { build } from "esbuild";
import { openPage } from "./lib/explainerRun.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "characters", "checks");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };

async function main() {
  const image = arg("image"), limbsFile = arg("limbs");
  if (!image || !limbsFile) throw new Error("Give --image and --limbs.");
  await fs.mkdir(OUT, { recursive: true });
  const js = (await build({ entryPoints: [path.join(ROOT, "characters/samples/mixing-page.mjs")], bundle: true, write: false, format: "iife", target: "es2022", logLevel: "warning" })).outputFiles[0].text;
  const page = path.join(OUT, "mixing-sheet.html");
  await fs.writeFile(page, `<!doctype html><meta charset="utf-8"><body><script>${js.replaceAll("</script", "<\\/script")}</script>`);
  const p = await openPage(page, 800, 600);
  try {
    const dataUrl = "data:image/png;base64," + (await fs.readFile(image)).toString("base64");
    const limbs = JSON.parse(await fs.readFile(limbsFile, "utf8"));
    const card = {
      name: "Body", build: "average", hair: "bald",
      wear: [{ id: "tshirt", colors: ["#f4f4f4"] }, { id: "vest", colors: ["#1f5e45"] }, { id: "trousers", colors: ["#16181d"] }, { id: "shoes", colors: ["#16181d"] }],
    };
    const url = await p.js(`window.__mixing(${JSON.stringify({ image: dataUrl, limbs, card, look: arg("look", "sticker") })})`);
    const file = path.join(OUT, `mixing-${arg("out", "sheet")}.png`);
    await fs.writeFile(file, Buffer.from(url.split(",")[1], "base64"));
    if (p.consoleErrors.length) { console.error(p.consoleErrors.join("\n")); process.exitCode = 1; }
    console.log("wrote", path.relative(ROOT, file));
  } finally {
    p.close();
  }
}

app.on("window-all-closed", () => {});
app.whenReady().then(main).catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => app.quit());
