// Writes a "Flow job file" for the Flow Prompt Feeder browser extension, so
// pictures can be re-made by hand in Google Flow after the Google credit ends.
//
//   node tools/puppets/flow-export.mjs <jobs.json | records.jsonl> <out.json>
//
// jobs.json     a job list like pilot.json (key, prompt, negative, refs, ...)
// records.jsonl what vrun.py writes next to the pictures (one JSON per line)
//
// The format is the same as Image Forge's src/lib/flowExport.ts and is written
// down in the extension's README (the "flow" folder). No dependencies.
import fs from "node:fs";

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error("Use: node tools/puppets/flow-export.mjs <jobs.json | records.jsonl> <out.json>");
  process.exit(1);
}

const baseName = (p) => String(p ?? "").split(/[\\/]/).pop() ?? "";
const safeName = (raw) =>
  String(raw ?? "")
    .replace(/\.[A-Za-z0-9]{2,4}$/, "")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 80) || "picture";

function readEntries(file) {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  if (/\.jsonl$/i.test(file)) {
    return text
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((l, i) => {
        try {
          return JSON.parse(l);
        } catch {
          throw new Error(`line ${i + 1} of ${file} is not valid JSON`);
        }
      });
  }
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.jobs)) return data.jobs;
  throw new Error(`${file} is not a list of jobs`);
}

function toJob(e) {
  const out = {
    name: safeName(e.name ?? e.key),
    prompt: String(e.prompt ?? "").trim(),
    refs: (Array.isArray(e.refs) ? e.refs : []).map(baseName).filter(Boolean),
  };
  if (String(e.negative ?? "").trim()) out.negative = String(e.negative).trim();
  out.aspect = e.aspect || "1:1"; // puppet pictures are square
  const notes = [];
  if (e.description) notes.push(String(e.description));
  if (e.style) notes.push(`style ${e.style}`);
  if (e.framing) notes.push(`${e.framing} framing`);
  if (e.look?.key?.name) notes.push(`${e.look.key.name} background`);
  if (e.model) notes.push(`first made with ${e.model}${e.at ? ` on ${e.at}` : ""}`);
  if (e.notes) notes.push(String(e.notes));
  if (notes.length) out.notes = notes.join("; ");
  return out;
}

let entries;
try {
  entries = readEntries(inFile);
} catch (err) {
  console.error(`Could not read ${inFile}: ${err.message}`);
  process.exit(1);
}

const seen = new Map();
const jobs = [];
let skipped = 0;
for (const e of entries) {
  const job = toJob(e);
  if (!job.prompt) {
    skipped++;
    continue;
  }
  const n = (seen.get(job.name) ?? 0) + 1;
  seen.set(job.name, n);
  if (n > 1) job.name = `${job.name}_${n}`;
  jobs.push(job);
}

const file = { format: "flow-jobs", version: 1, made: new Date().toISOString(), source: `Video Forge ${inFile.split(/[\\/]/).pop()}`, jobs };
fs.writeFileSync(outFile, JSON.stringify(file, null, 2) + "\n");
console.log(`Wrote ${jobs.length} job${jobs.length === 1 ? "" : "s"} to ${outFile}${skipped ? ` (${skipped} without a prompt skipped)` : ""}.`);
