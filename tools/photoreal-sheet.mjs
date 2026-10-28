#!/usr/bin/env node
// Photoreal bending, as a picture (Electron, hidden window, WebGL):
//   electron tools/photoreal-sheet.mjs --image <keyed full-body png> --pose <its .pose.json> [--out name] [--moves a,b]
// Writes characters/checks/photoreal-<name>.png (ignored folder: the picture
// may be a private character).
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "electron";
import { build } from "esbuild";
import { openPage } from "./lib/explainerRun.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };

async function main() {
  const js = (await build({ entryPoints: [path.join(ROOT, "characters/photoreal/sheet-page.mjs")], bundle: true, write: false, format: "iife", target: "es2022", logLevel: "warning" })).outputFiles[0].text;
  const page = path.join(ROOT, "characters/checks/photoreal-sheet.html");
  await fs.writeFile(page, `<!doctype html><meta charset="utf-8"><body><script>${js.replaceAll("</script", "<\\/script")}</script>`);
  const p = await openPage(page, 800, 600);
  try {
    // --multi a.png~a.pose.json,t.png~t.pose.json~edges  several rest pictures mixed per arm
    // (no colons: Electron reads an argument with a colon as something to open)
    let fn = process.argv.includes("--layers") ? "__layers" : "__sheet", opts;
    const moves = arg("moves") ? { moves: arg("moves").split(",") } : {};
    if (arg("multi")) {
      fn = "__multi";
      const sources = [];
      for (const part of arg("multi").split(",")) {
        const [img, pose, flag] = part.split("~");
        sources.push({ image: "data:image/png;base64," + (await fs.readFile(img)).toString("base64"), pose: JSON.parse(await fs.readFile(pose, "utf8")), armEdges: flag === "edges" });
      }
      opts = { sources, ...moves };
    } else {
      const image = "data:image/png;base64," + (await fs.readFile(arg("image"))).toString("base64");
      const pose = JSON.parse(await fs.readFile(arg("pose"), "utf8"));
      opts = { image, pose, ...moves, view: Number(arg("view", 0)) };
    }
    const r = await p.js(`window.${fn}(${JSON.stringify(opts)})`);
    const file = path.join(ROOT, "characters/checks", `photoreal-${arg("out", "sheet")}.png`);
    await fs.writeFile(file, Buffer.from(r.url.split(",")[1], "base64"));
    console.log("wrote", path.relative(ROOT, file), JSON.stringify(r.stats ?? {}));
    if (p.consoleErrors.length) { console.error(p.consoleErrors.join("\n")); process.exitCode = 1; }
  } finally {
    p.close();
  }
}

app.on("window-all-closed", () => {});
app.whenReady().then(main).catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => app.quit());
