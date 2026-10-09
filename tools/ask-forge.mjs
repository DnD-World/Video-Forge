// ---------------------------------------------------------------------------
// Ask Image Forge, installed on this computer, to make pictures for us.
//
//   npm run ask-forge -- status
//   npm run ask-forge -- visemes kaiti [--style stop-motion-clay]
//                        [--moods neutral,happy,serious] [--describe "..."]
//                        [--out forge-pictures] [--sheets viseme-sheets-v2]
//   npm run ask-forge -- csv my-pictures.csv [--out forge-pictures]
//
// "visemes" asks for one 3x3 mouth-shape grid per mood, waits, copies the
// pictures here, and with --sheets turns them into the sheets the avatars read.
//
// If the forge is closed the request waits in its inbox and is made the next
// time it opens. Paid engines still stop and ask in Image Forge first.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { collectPictures, findForge, sendRequest, visemeRows, waitForRequest } from "./lib/forgeLink.mjs";
import { loadBrand } from "./lib/brand.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const [cmd, arg] = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));

function say(s) {
  process.stdout.write(`${s}\n`);
}

function describeForge() {
  const f = findForge();
  if (f.state === "running") return `Image Forge ${f.version} is open — requests start within seconds.`;
  if (f.state === "installed") return "Image Forge is installed but not open — a request will wait until you open it.";
  return "Image Forge was not found on this computer. Install it from https://github.com/Stravelakis/image-forge/releases/latest";
}

/** A tiny CSV reader for filename,prompt[,style,aspect_ratio] files. */
function rowsFromCsv(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(",").map((h) => h.trim());
  const col = (name) => head.indexOf(name);
  return lines.map((line) => {
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'));
    const get = (n) => (col(n) >= 0 ? cells[col(n)] || "" : "");
    return {
      filename: get("filename"),
      prompt: get("prompt"),
      negative_prompt: get("negative_prompt"),
      style: get("style"),
      aspect_ratio: get("aspect_ratio") || "1:1",
      category: get("category") || "image",
    };
  });
}

async function ask(rows, note) {
  const forge = findForge();
  say(describeForge());
  if (forge.state === "absent") process.exit(1);

  const { id } = sendRequest({ rows, note });
  say(`Asked for ${rows.length} picture${rows.length === 1 ? "" : "s"} (request ${id}).`);

  let last = "";
  const result = await waitForRequest(id, {
    onTick: (s) => {
      if (s.state !== last) {
        last = s.state;
        if (s.state === "waiting") say("· waiting for Image Forge to pick it up…");
        if (s.state === "working") say("· Image Forge is making them…");
      }
    },
  });

  if (result.state === "rejected") {
    say(`✗ Image Forge refused the request: ${result.reason}`);
    process.exit(1);
  }
  if (result.state !== "done") {
    say("✗ Gave up waiting. The request is still in Image Forge's queue; run this again later to collect it.");
    process.exit(1);
  }

  const out = path.resolve(flag("out", "forge-pictures"));
  const copied = collectPictures(result, out);
  say(`✓ ${copied.length} picture${copied.length === 1 ? "" : "s"} copied to ${out}`);
  for (const f of result.failed) say(`  ✗ ${f.filename}: ${f.error}`);
  return { out, copied };
}

async function main() {
  if (!cmd || cmd === "status") {
    say(describeForge());
    return;
  }
  if (cmd === "visemes") {
    if (!arg) throw new Error('say which character: visemes robin   (add --describe "..." unless the brand pack describes them)');
    const moods = String(flag("moods", "neutral,happy,serious")).split(",").map((m) => m.trim()).filter(Boolean);
    const rows = visemeRows(arg, { style: flag("style", "stop-motion-clay"), moods, describe: flag("describe"), characters: loadBrand()?.forgeCharacters });
    const { out } = await ask(rows, `mouth shapes for ${arg}`);
    // Seen on a real run (25 Sep 2026): free SDXL asked for a 3x3 grid painted
    // ONE portrait. The slicer cannot tell, so say it plainly every time.
    say("⚠ Check each grid by eye before using it. Free engines often draw one picture instead of nine panels;");
    say("  a Google model in Image Forge follows the grid far more reliably.");
    const sheets = flag("sheets");
    if (sheets) {
      say(`· turning the grids into sheets in ${sheets}…`);
      const r = spawnSync(process.execPath, [path.join(HERE, "forge-to-sheets.mjs"), out, "--out", sheets], { stdio: "inherit" });
      if (r.status !== 0) process.exit(r.status ?? 1);
    }
    return;
  }
  if (cmd === "csv") {
    if (!arg) throw new Error("say which CSV file: csv my-pictures.csv");
    await ask(rowsFromCsv(arg), `from ${path.basename(arg)}`);
    return;
  }
  throw new Error(`unknown command "${cmd}" — use status, visemes or csv`);
}

main().catch((e) => {
  say(`✗ ${e.message || e}`);
  process.exit(1);
});
