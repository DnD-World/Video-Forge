#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Make a photoreal presenter (half body, talking) from a puppet workshop.
//
//   node tools/make-photoreal.mjs --workshop <Image Forge workshop folder>
//                                 --armsout <arms-out picture.png> --out <folder> [--name "Nikos"]
//
// The workshop folder is Image Forge's puppet maker output: base.png (the
// arms-down picture), meta.json (where every face part sits) and the parts
// (<name>.layer.png). The arms-out picture is one more Image Forge picture of
// the same person with the arms straight out (about 2 US cents).
// Writes into <out>: the two pictures with only the person kept, their
// joints (MediaPipe, on this computer), the face parts, and photoreal.json,
// which the app and the render read (characters/photoreal/*).
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const ws = arg("workshop"), armsOut = arg("armsout"), out = arg("out");
if (!ws || !armsOut || !out) throw new Error("Give --workshop, --armsout and --out.");
const meta = JSON.parse(fs.readFileSync(path.join(ws, "meta.json"), "utf8"));
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(ws, "base.png"), path.join(out, "armsdown.png"));
fs.copyFileSync(armsOut, path.join(out, "armsout.png"));

// joints and the person's outline, for both pictures
const electron = path.join(ROOT, "node_modules/electron/dist", process.platform === "win32" ? "electron.exe" : "electron");
execFileSync(electron, [path.join(ROOT, "tools/detect-pose.mjs"), path.join(out, "armsdown.png"), path.join(out, "armsout.png")], { stdio: "inherit" });

// the front-view face parts (mouths, lids, brows) and where they sit
const boxes = {};
for (const [name, box] of Object.entries(meta.boxes ?? {})) {
  if (!/^(mouth|lid|brow)_/.test(name)) continue;
  // the keyed copy (background taken out) when the workshop has one
  const keyed = path.join(ws, `${name}.keyed.png`), layer = path.join(ws, `${name}.layer.png`);
  const file = fs.existsSync(keyed) ? keyed : layer;
  if (!fs.existsSync(file)) continue;
  fs.copyFileSync(file, path.join(out, `${name}.png`));
  boxes[name] = box;
}
const manifest = {
  v: 1,
  kind: "photoreal",
  name: arg("name", meta.name ?? path.basename(ws)),
  framing: "half",
  sources: [
    { image: "armsdown.keyed.png", pose: "armsdown.pose.json", armEdges: false },
    { image: "armsout.keyed.png", pose: "armsout.pose.json", armEdges: true },
  ],
  face: { parts: Object.fromEntries(Object.entries(boxes).map(([n, box]) => [n, { file: `${n}.png`, box }])) },
};
fs.writeFileSync(path.join(out, "photoreal.json"), JSON.stringify(manifest, null, 1));
console.log("wrote", path.join(out, "photoreal.json"), `(${Object.keys(boxes).length} face parts)`);
