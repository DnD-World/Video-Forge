// BULK PUPPETS INTO IMAGE FORGE'S REVIEW (#10, 26 Oct 2026). Turns a batch
// run (job lists + pictures + check results) into Image Forge workshop
// puppets, so Ak reviews them in the review workbench like any other puppet.
//
//   node tools/puppets/to-workshop.mjs --jobs a.json,b.json --bases bases.json
//        --pictures <dir of <key>.png> --checks <check outdir> --to <workshop dir> [--tag nb21]
//
// One workshop puppet per character and framing: "<slug>-<tag>-head",
// "<slug>-<tag>-full" (its 3/4 view inside it as "side_" parts). NEW folders
// only — an existing folder is never overwritten (pass a new --tag instead).
// Later job lists win: a redo's prompt replaces the first one for that key.
// Private characters (job.private) are marked private in their meta.
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import * as P from "./puppet-core.mjs";

const args = process.argv.slice(2);
const opt = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const jobsFiles = (opt("--jobs") ?? "").split(",").filter(Boolean);
const [basesFile, picDir, checkDir, to] = [opt("--bases"), opt("--pictures"), opt("--checks"), opt("--to")];
const tag = opt("--tag") ?? "batch";
if (!jobsFiles.length || !basesFile || !picDir || !to) {
  console.log("usage: node tools/puppets/to-workshop.mjs --jobs a.json,b.json --bases bases.json --pictures <dir> --checks <dir> --to <workshop dir> [--tag t]");
  process.exit(1);
}

const load = (f) => {
  const png = PNG.sync.read(fs.readFileSync(f));
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
};
const toPng = (img) => {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  return PNG.sync.write(png);
};

const jobs = new Map();
// Older job lists stored some paths URL-style ("/C:/...%20..."): read them as plain paths.
const plainPath = (p) => (typeof p === "string" ? decodeURIComponent(p).replace(/^\/(\w:)/, "$1") : p);
for (const f of jobsFiles) for (const j of JSON.parse(fs.readFileSync(f, "utf8"))) if (j.part && j.part !== "base") jobs.set(j.key, { ...j, refs: (j.refs ?? []).map(plainPath), from: path.basename(f) });
const bases = JSON.parse(fs.readFileSync(basesFile, "utf8"));
const checks = new Map();
const checksFile = checkDir && path.join(checkDir, "checks.jsonl");
if (checksFile && fs.existsSync(checksFile)) for (const l of fs.readFileSync(checksFile, "utf8").split("\n").filter(Boolean)) checks.set(JSON.parse(l).key, JSON.parse(l));
const parts = new Map(P.PUPPET_PARTS.map((p) => [p.id, p]));

// group: slug + workshop framing (side views live inside the full puppet)
const groups = new Map();
for (const j of jobs.values()) {
  const wf = j.framing === "side" || j.framing === "sit" ? "full" : j.framing;
  const g = `${j.slug}|${wf}`;
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(j);
}

const now = new Date().toISOString();
let made = 0, skipped = 0;
for (const [g, list] of groups) {
  const [slug, framing] = g.split("|");
  const ws = `${slug}-${tag}-${framing}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60);
  const dir = path.join(to, ws);
  if (fs.existsSync(dir)) {
    console.log(`${ws}: already there — left alone`);
    skipped++;
    continue;
  }
  const baseJob = bases.find((b) => b.slug === slug && b.framing === framing);
  const frontBase = list.find((j) => j.framing === framing)?.refs?.[0];
  if (!frontBase || !fs.existsSync(frontBase)) {
    console.log(`${ws}: no base picture — skipped`);
    skipped++;
    continue;
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(frontBase, path.join(dir, "base.png"));
  const views = [];
  const reports = [], boxes = {}, tries = [];
  for (const j of list.sort((a, b) => a.key.localeCompare(b.key))) {
    const part = parts.get(j.part);
    if (!part) continue;
    const pre = j.framing === framing ? "" : `${j.framing}_`;
    if (pre && !views.includes(j.framing)) {
      views.push(j.framing);
      if (j.refs?.[0] && fs.existsSync(j.refs[0])) fs.copyFileSync(j.refs[0], path.join(dir, `${j.framing}_base.png`));
    }
    const id = pre + j.part;
    const pic = path.join(picDir, `${j.key}.png`);
    const c = checks.get(j.key);
    if (!fs.existsSync(pic)) {
      reports.push({ id, label: part.label, status: "missing", tries: 0, why: "no picture came back" });
      continue;
    }
    // the cut: from the check run when there is one, else cut it here
    let box = c?.box;
    const cutLayer = checkDir && path.join(checkDir, "cut", `${j.key}.layer.png`);
    if (box && fs.existsSync(cutLayer)) {
      fs.copyFileSync(cutLayer, path.join(dir, `${id}.layer.png`));
      fs.copyFileSync(path.join(checkDir, "cut", `${j.key}.keyed.png`), path.join(dir, `${id}.keyed.png`));
    } else {
      const base = load(j.refs[0]);
      const cut = P.cutPart(base, P.resize(load(pic), base.width, base.height), { kind: part.kind, framing: framing === "head" ? "head" : "full" });
      if (cut.ok) {
        box = cut.box;
        fs.writeFileSync(path.join(dir, `${id}.layer.png`), toPng(cut.layer));
        fs.writeFileSync(path.join(dir, `${id}.keyed.png`), toPng(cut.keyed));
      }
    }
    if (part.kind === "arms") fs.copyFileSync(pic, path.join(dir, `${id}.full.png`));
    // the file name the review screen looks for (workshop.ts tryFile): part, try, the record's time
    const at = c?.at ?? now;
    fs.copyFileSync(pic, path.join(dir, `${id}.try1-${at.replace(/\D/g, "").slice(0, 14)}.png`));
    const level = c ? c.level : null;
    tries.push({
      part: id, try: 1, at, engine: "Nano Banana 2.1 (Vertex batch)", prompt: j.prompt, negative: j.negative ?? "", seed: 0,
      cut: c?.cut ?? (box ? "ok" : "the cut failed"), level, why: c?.why ?? "not checked yet",
      ...(c?.votes ? { votes: c.votes, checkers: c.checkers } : {}), ...(c?.pixels ? { pixels: c.pixels } : {}),
    });
    if (box) boxes[id] = box;
    reports.push({
      id, label: part.label, tries: 1,
      status: !box ? "missing" : level === "yes" ? "ok" : "unsure",
      why: !box ? "the cut failed" : c ? c.why : "not checked yet — look at it yourself",
    });
  }
  const meta = {
    v: 1, slug: ws, name: `${slug} (${framing}, ${tag})`, description: baseJob?.description ?? "", style: baseJob?.style ?? "",
    framing, look: baseJob?.look ?? list[0].look ?? { key: { name: "key", hex: list[0].keyHex ?? "#FF00FF" }, lips: true },
    faceEngine: "Nano Banana 2.1 (Vertex batch)", partEngine: "Nano Banana 2.1 (Vertex batch)",
    createdAt: now, updatedAt: now, status: "review", reports, boxes,
    ...(views.length ? { views } : {}), ...(list[0].private ? { private: true } : {}),
  };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 1));
  fs.writeFileSync(path.join(dir, "tries.json"), JSON.stringify(tries, null, 1));
  const n = (s) => reports.filter((r) => r.status === s).length;
  console.log(`${ws}: ${reports.length} parts — green ${n("ok")}, for you ${n("unsure")}, missing ${n("missing")}${list[0].private ? " (private)" : ""}`);
  made++;
}
console.log(`\n${made} puppets written to ${to}, ${skipped} left alone`);
