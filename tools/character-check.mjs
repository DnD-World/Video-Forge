#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Real-canvas checks for drawn characters (Electron, a hidden window).
//
//   npm run characters:check
//
// The code checks (node --test characters/characters.test.mjs) cover the
// geometry without a browser. This one draws on a REAL canvas:
//   · every look drawn twice gives the same pixels, byte for byte
//   · every look draws something, fast enough for a render (< 40 ms a figure)
// and writes characters/checks/sheet.png + report.html: every look × the test
// characters, front / 3/4 / side. Exit code 1 if anything failed.
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "electron";
import { build } from "esbuild";
import { openPage } from "./lib/explainerRun.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "characters", "checks");
const SLOW_MS = 40;

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const js = (await build({ entryPoints: [path.join(ROOT, "characters/samples/check-page.mjs")], bundle: true, write: false, format: "iife", target: "es2022", logLevel: "warning" })).outputFiles[0].text;
  const page = path.join(OUT, "check.html");
  await fs.writeFile(page, `<!doctype html><meta charset="utf-8"><body><script>${js.replaceAll("</script", "<\\/script")}</script>`);
  const p = await openPage(page, 800, 600);
  try {
    const results = await p.js("window.__check()");
    const sheet = await p.js("window.__sheet(150)");
    await fs.writeFile(path.join(OUT, "sheet.png"), Buffer.from(sheet.split(",")[1], "base64"));
    const problems = [];
    for (const r of results) {
      if (r.diff) problems.push(`${r.name}: drawing the same frame twice changed ${r.diff} bytes`);
      if (r.ink < 2000) problems.push(`${r.name}: almost nothing was drawn (${r.ink} pixels)`);
      if (r.ms / 2 > SLOW_MS) problems.push(`${r.name}: ${(r.ms / 2).toFixed(0)} ms a figure (limit ${SLOW_MS})`);
    }
    problems.push(...p.consoleErrors.map((e) => `page error: ${e}`));
    const rows = results.map((r) => `<tr><td>${r.name}</td><td>${r.diff === 0 ? "✓ identical" : `✗ ${r.diff} bytes differ`}</td><td>${r.ink}</td><td>${(r.ms / 2).toFixed(1)} ms</td></tr>`).join("");
    await fs.writeFile(path.join(OUT, "report.html"), `<!doctype html><meta charset="utf-8"><title>Character checks</title>
<style>body{font:14px Sora,system-ui;background:#0d1b2a;color:#e8f1f2;margin:16px}h1{color:#5be3b5}td,th{padding:4px 10px;border-bottom:1px solid #22344a;text-align:left}img{max-width:100%;border-radius:8px;margin-top:12px}</style>
<h1>Drawn characters — real-canvas checks</h1><p>${problems.length ? `<b>${problems.length} problem(s):</b><br>${problems.join("<br>")}` : "All looks pass: identical pixels when drawn twice, something drawn, fast enough."}</p>
<table><tr><th>Look</th><th>Same pixels twice</th><th>Pixels drawn</th><th>Time per figure</th></tr>${rows}</table>
<p>Every look × the four test characters, front / 3/4 / side:</p><img src="sheet.png">`);
    console.log(problems.length ? `${problems.length} problem(s):\n- ${problems.join("\n- ")}` : `all ${results.length} looks pass`);
    console.log("report:", path.relative(ROOT, path.join(OUT, "report.html")));
    process.exitCode = problems.length ? 1 : 0;
  } finally {
    p.close();
  }
}

app.on("window-all-closed", () => {});
app.whenReady().then(main).catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => app.quit());
