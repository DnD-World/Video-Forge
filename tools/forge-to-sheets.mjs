// ---------------------------------------------------------------------------
// Turns Image Forge output into the viseme sheets this app renders from.
//
//   node tools/forge-to-sheets.mjs <forgeOutputDir> [--out viseme-sheets-v2]
//
// Expects files named  sheet_<character>_<style>_<mood>.<ext>  — exactly what
// viseme-grids.csv asks the forge to make — where each one is a 3x3 grid of
// nine head-and-shoulders panels in the app's own viseme order.
//
// For each grid it slices the nine panels, squares them, and writes one
// 3x3 sheet named <character>-<style>-<mood>.png. That is the file you point a
// speaker's sheetPath at. Mood is a separate sheet rather than a rig feature,
// which is the whole reason this works without transparency: nothing is ever
// composited, so nothing needs an alpha channel and nothing needs to register
// against anything else.
//
// The forge writes JPEG whenever the engine returns JPEG — Cloudflare and
// Google both do — so both extensions are accepted.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const GRID = 3;

const argv = process.argv.slice(2);
const inputDir = argv.find((a) => !a.startsWith("--")) ?? ".";
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const outDir = flag("out", "viseme-sheets-v2");

/** Decode a PNG, or tell the user plainly that a JPEG needs converting. */
function readPng(file) {
  const buf = fs.readFileSync(file);
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  if (!isPng) {
    throw new Error(
      `${path.basename(file)} is not a PNG. The engine returned JPEG — re-run that row on ` +
        `an engine that returns PNG (your own machine does), or convert it first.`
    );
  }
  return PNG.sync.read(buf);
}

/** The largest centred square that fits a panel, so cells come out square. */
function squareCrop(src, x0, y0, w, h) {
  const side = Math.min(w, h);
  const ox = x0 + Math.floor((w - side) / 2);
  const oy = y0 + Math.floor((h - side) / 2);
  const out = new PNG({ width: side, height: side });
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const s = ((oy + y) * src.width + (ox + x)) * 4;
      const d = (y * side + x) * 4;
      out.data[d] = src.data[s];
      out.data[d + 1] = src.data[s + 1];
      out.data[d + 2] = src.data[s + 2];
      out.data[d + 3] = src.data[s + 3];
    }
  }
  return out;
}

/** Nine squared cells, then re-laid as one 3x3 sheet of equal cells. */
function regrid(src) {
  const pw = Math.floor(src.width / GRID);
  const ph = Math.floor(src.height / GRID);
  const cells = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      cells.push(squareCrop(src, c * pw, r * ph, pw, ph));
    }
  }
  // Every cell is the same size by construction, so the sheet is exact.
  const side = cells[0].width;
  const sheet = new PNG({ width: side * GRID, height: side * GRID });
  cells.forEach((cell, i) => {
    const ox = (i % GRID) * side;
    const oy = Math.floor(i / GRID) * side;
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const s = (y * side + x) * 4;
        const d = ((oy + y) * sheet.width + (ox + x)) * 4;
        sheet.data[d] = cell.data[s];
        sheet.data[d + 1] = cell.data[s + 1];
        sheet.data[d + 2] = cell.data[s + 2];
        sheet.data[d + 3] = cell.data[s + 3];
      }
    }
  });
  return { sheet, cellSize: side };
}

const files = fs
  .readdirSync(inputDir)
  .filter((f) => /^sheet_[a-z0-9]+_[a-z0-9]+_[a-z]+\.(png|jpg|jpeg)$/i.test(f));

if (files.length === 0) {
  console.error(`No sheet_<character>_<style>_<mood>.png files in ${inputDir}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
let made = 0;
const failed = [];

for (const f of files) {
  const [, character, style, mood] = f.replace(/\.[^.]+$/, "").split("_");
  try {
    const src = readPng(path.join(inputDir, f));
    const { sheet, cellSize } = regrid(src);
    const outName = `${character}-${style}-${mood}.png`;
    fs.writeFileSync(path.join(outDir, outName), PNG.sync.write(sheet));
    console.log(`✓ ${outName}  ${sheet.width}x${sheet.height}  (cells ${cellSize}px)`);
    made++;
  } catch (e) {
    // One bad grid must not stop the other seventeen.
    failed.push(`${f}: ${e.message}`);
  }
}

console.log(`\n${made} sheet${made === 1 ? "" : "s"} written to ${outDir}`);
// It slices whatever it is given. A single portrait cut in nine looks like
// success here and like nonsense on screen (seen 25 Sep 2026), so it says so.
if (made) console.log("Look at each sheet before using it: this tool cannot tell a real 3x3 grid from one picture cut into nine.");
if (failed.length) {
  console.log(`\n${failed.length} could not be used:`);
  for (const m of failed) console.log(`  ✗ ${m}`);
}
