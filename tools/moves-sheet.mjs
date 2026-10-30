#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Contact sheets of the motion library, on a real canvas (Electron, hidden).
//
//   npm run moves:sheet -- [--moves wave,drink] [--look sticker] [--style tired]
//                          [--framing full|waist|head] [--view 0..2] [--out name]
//   npm run moves:sheet -- --presets [--look sticker] --out presets   (the prepared characters)
//
// Writes characters/checks/moves-<name>.png: each row a move, each column a
// moment through it. Proof pictures: what a move really looks like, drawn by
// the same code the app and every render use.
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
  await fs.mkdir(OUT, { recursive: true });
  const js = (await build({ entryPoints: [path.join(ROOT, "characters/samples/moves-sheet-page.mjs")], bundle: true, write: false, format: "iife", target: "es2022", logLevel: "warning" })).outputFiles[0].text;
  const page = path.join(OUT, "moves-sheet.html");
  await fs.writeFile(page, `<!doctype html><meta charset="utf-8"><body><script>${js.replaceAll("</script", "<\\/script")}</script>`);
  const p = await openPage(page, 800, 600);
  try {
    const opts = {
      moves: arg("moves", "") ? arg("moves").split(",") : null,
      look: arg("look", "sticker"), style: arg("style", "neutral"), framing: arg("framing", "full"),
      view: arg("view") !== undefined ? Number(arg("view")) : null, cols: Number(arg("cols", 6)), cell: Number(arg("cell", 220)), preset: arg("preset", null),
    };
    if (process.argv.includes("--flicker")) {
      const r = await p.js(`window.__flicker(${JSON.stringify({ preset: arg("preset", "dnd-dwarf"), looks: arg("looks") ? arg("looks").split(",") : null, ...(arg("moves") !== undefined ? { moves: arg("moves") ? arg("moves").split(",") : [] } : {}) })})`);
      for (const x of r) console.log(x.look.padEnd(10), "flash pixels", String(x.flashPixels).padStart(6), " worst frame", x.worstFrame, "(" + x.worstPixels + ")");
      return;
    }
    if (process.argv.includes("--pat2")) { const r = await p.js("window.__pat2()"); console.log(r.light); await fs.writeFile(path.join(OUT, "pat2.png"), Buffer.from(r.url.split(",")[1], "base64")); return; }
    if (process.argv.includes("--pat")) { console.log(JSON.stringify(await p.js("window.__pat()"))); return; }
    if (process.argv.includes("--frames")) {
      const url = await p.js(`window.__frames(${JSON.stringify({ move: arg("moves", "drink"), look: arg("look", "sticker"), preset: arg("preset", "dnd-dwarf"), from: Number(arg("from", 0)), n: Number(arg("n", 12)), step: Number(arg("step", 1)) })})`);
      const file = path.join(OUT, `moves-${arg("out", "frames")}.png`);
      await fs.writeFile(file, Buffer.from(url.split(",")[1], "base64"));
      console.log("wrote", path.relative(ROOT, file));
      return;
    }
    const fn = process.argv.includes("--presets") ? "__presets" : process.argv.includes("--faces") ? "__faces" : process.argv.includes("--shoes") ? "__shoes" : process.argv.includes("--icons") ? "__icons" : process.argv.includes("--costumes") ? "__costumes" : "__sheet";
    const url = await p.js(`window.${fn}(${JSON.stringify(opts)})`);
    const file = path.join(OUT, `moves-${arg("out", "sheet")}.png`);
    await fs.writeFile(file, Buffer.from(url.split(",")[1], "base64"));
    if (p.consoleErrors.length) { console.error(p.consoleErrors.join("\n")); process.exitCode = 1; }
    console.log("wrote", path.relative(ROOT, file));
  } finally {
    p.close();
  }
}

app.on("window-all-closed", () => {});
app.whenReady().then(main).catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => app.quit());
