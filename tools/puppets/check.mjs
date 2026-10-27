// THE CHECKS, FOR BULK PICTURES (Phase 2, 26 Oct 2026). The same checks the
// Image Forge puppet maker runs (puppet-core.mjs is bundled from its code),
// applied to pictures that came back from a Vertex batch:
//   1. cut the part out (nothing changed? redrawn? in the wrong place?)
//   2. the free pixel checks (moved, other places changed, background fringe)
//   3. the panel of free vision checkers — strictest vote wins: any fault =
//      no, any doubt or unanswered question = maybe, yes needs every checker
//      that looked to be clean and at least two to have looked
// Each picture's result is appended to <outdir>/checks.jsonl, and its cut
// layers go to <outdir>/cut/. Pictures already in checks.jsonl are skipped,
// so a stopped run picks up where it left off.
//
//   node tools/puppets/check.mjs <jobs.json> <outdir> [--from <picture dir>] [--pixels-only] [--limit N]
// --from: where the batch's <key>.png pictures are, when not in <outdir>.
// --bases: the base job list, for each character's look (lips, eyes, facts)
// when the part jobs don't carry it. Without either, lips are not assumed.
//
// Checkers are free allowances (NVIDIA, OpenRouter free models); keys come from
// the Key Vault and are never printed. At most 35 questions a minute per
// provider, so a full puppet (~60 parts × ~10 questions × 3 checkers) takes
// about an hour — run waves overnight, or with --pixels-only first.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { PNG } from "pngjs";
import * as P from "./puppet-core.mjs";

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const [jobsPath, outDir] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--limit" && args[i - 1] !== "--from" && args[i - 1] !== "--bases");
const fromDir = opt("--from") ?? outDir;
if (!jobsPath || !outDir) {
  console.log("usage: node tools/puppets/check.mjs <jobs.json> <outdir> [--pixels-only] [--limit N]");
  process.exit(1);
}
const limit = Number(opt("--limit") ?? Infinity);
const pixelsOnly = flag("--pixels-only");

const load = (file) => {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
};
const toPng = (img) => {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  return PNG.sync.write(png);
};

/* ---------------- the checkers ---------------- */

const vaultKey = (name) => {
  try {
    return execFileSync("python", [path.join(os.homedir(), ".config", "blacksmith", "vault.py"), "get", name], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

const PER_MINUTE = 35;
const turns = new Map();
async function turnFor(base) {
  const now = Date.now();
  const recent = (turns.get(base) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= PER_MINUTE) await new Promise((ok) => setTimeout(ok, 60_000 - (now - recent[0]) + 50));
  turns.set(base, [...recent.filter((t) => Date.now() - t < 60_000), Date.now()]);
}
const spentUntil = new Map();
const hung = new Map();

function checker(name, base, key, model) {
  return (b64) => ({
    name,
    async answer(question) {
      if ((spentUntil.get(model) ?? 0) > Date.now()) return null;
      const ask = async () => {
        await turnFor(base);
        try {
          const r = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: "user", content: [{ type: "text", text: question }, { type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } }] }] }),
            signal: AbortSignal.timeout(90_000),
          });
          const body = await r.text();
          if (!r.ok) return { ok: false, status: r.status, body };
          return { ok: true, text: JSON.parse(body).choices?.[0]?.message?.content ?? "" };
        } catch {
          return { ok: false };
        }
      };
      let r = await ask();
      if (!r.ok && (r.status === 402 || (r.status === 429 && /per[- ]day|daily|credits/i.test(r.body ?? "")))) {
        spentUntil.set(model, Date.now() + 6 * 3600_000);
        console.log(`  ${name}: free allowance used up — sitting out for 6 hours`);
        return null;
      }
      // A checker that hangs (no answer at all) twice sits out for 30 minutes,
      // so one stuck provider can't hold up the whole run (26 Oct 2026: the
      // OpenRouter free model timed out on every question).
      for (let t = 1; !r.ok && t <= 3 && (r.status === 429 || (r.status ?? 0) >= 500 || r.status === undefined); t++) {
        if (r.status === undefined) {
          hung.set(model, (hung.get(model) ?? 0) + 1);
          if (hung.get(model) >= 2) {
            spentUntil.set(model, Date.now() + 30 * 60_000);
            hung.set(model, 0);
            console.log(`  ${name}: not answering — sitting out for 30 minutes`);
            return null;
          }
        }
        await new Promise((ok) => setTimeout(ok, 8000 * t));
        r = await ask();
      }
      if (r.ok) hung.set(model, 0);
      return r.ok ? r.text : null;
    },
  });
}

function panel() {
  const nv = vaultKey("NVIDIA_API_KEY");
  const or = vaultKey("OPENROUTER_API_KEY");
  const NV = "https://integrate.api.nvidia.com/v1";
  const OR = "https://openrouter.ai/api/v1";
  // The same three as Image Forge's pageInspect (scored 16 Oct 2026).
  const list = [
    ...(nv ? [checker("C1 Step 5", NV, nv, "stepfun-ai/step-5-preview")] : []),
    ...(or ? [checker("C2 Nemotron VL", OR, or, "nvidia/nemotron-3.5-super-vl:free")] : nv ? [checker("C2 Nemotron VL", NV, nv, "nvidia/nemotron-3.5-super-vl-120b-a12b")] : []),
    ...(nv ? [checker("TB Nemotron Omni", NV, nv, "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning")] : []),
  ];
  return list;
}

/* ---------------- the run ---------------- */

const jobs = JSON.parse(fs.readFileSync(jobsPath, "utf8")).filter((j) => j.part && j.part !== "base");
fs.mkdirSync(path.join(outDir, "cut"), { recursive: true });
const checksFile = path.join(outDir, "checks.jsonl");
const done = new Set(
  fs.existsSync(checksFile)
    ? fs.readFileSync(checksFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).key)
    : []
);
const checkers = pixelsOnly ? [] : panel();
if (!pixelsOnly && checkers.length < 2) console.log(`Only ${checkers.length} checker(s) reachable — every part will come out "maybe" at best.`);

const parts = new Map(P.PUPPET_PARTS.map((p) => [p.id, p]));
const baseJobs = opt("--bases") ? JSON.parse(fs.readFileSync(opt("--bases"), "utf8")) : [];
const lookOf = (j) =>
  j.look ??
  baseJobs.find((b) => b.slug === j.slug && b.look)?.look ??
  // unknown: say nothing about lips rather than guess (a wrong guess fails every mouth)
  { key: { name: "key", hex: j.keyHex ?? "#FF00FF" }, lips: undefined };
// Views are made from the full-body picture, so their bands are full-body bands.
const bandFraming = (f) => (f === "side" || f === "sit" ? "full" : f);

const tally = { yes: 0, maybe: 0, no: 0, "not checked": 0, missing: 0 };
let n = 0;
for (const j of jobs) {
  if (n >= limit) break;
  if (done.has(j.key)) continue;
  const editFile = path.join(fromDir, `${j.key}.png`);
  const part = parts.get(j.part);
  const rec = { key: j.key, slug: j.slug, part: j.part, framing: j.framing, at: new Date().toISOString() };
  if (!part || !fs.existsSync(editFile) || !j.refs?.[0] || !fs.existsSync(j.refs[0])) {
    if (!fs.existsSync(editFile)) {
      tally.missing++;
      continue; // not made yet: no record, so a later run checks it
    }
    Object.assign(rec, { cut: "cannot check", level: "maybe", why: !part ? `unknown part ${j.part}` : "the base picture is missing" });
  } else {
    n++;
    const base = load(j.refs[0]);
    const edit = P.resize(load(editFile), base.width, base.height);
    const look = lookOf(j);
    const cut = P.cutPart(base, edit, { kind: part.kind, framing: bandFraming(j.framing) });
    if (!cut.ok) {
      Object.assign(rec, { cut: cut.detail, level: "no", why: cut.detail });
    } else {
      fs.writeFileSync(path.join(outDir, "cut", `${j.key}.layer.png`), toPng(cut.layer));
      fs.writeFileSync(path.join(outDir, "cut", `${j.key}.keyed.png`), toPng(cut.keyed));
      const seen = P.pixelChecks(base, edit, cut, part.kind);
      const pic = P.reviewPicture(base, part, { ...cut, ...(part.kind === "arms" ? { full: edit } : {}) });
      fs.writeFileSync(path.join(outDir, "cut", `${j.key}.pair.png`), toPng(pic));
      const b64 = toPng(pic).toString("base64");
      const v = checkers.length ? await P.panelVerdict(part, look, checkers.map((c) => c(b64))) : null;
      const level = !v ? null : v.level === "yes" && seen.length ? "maybe" : v.level;
      Object.assign(rec, {
        cut: "ok",
        box: cut.box,
        level,
        why: v ? (seen.length && v.level === "yes" ? `maybe no: ${seen.join(", ")} — the checkers saw nothing` : v.why) : seen.length ? `not checked; pixels: ${seen.join(", ")}` : "not checked",
        ...(v ? { votes: v.votes, checkers: v.detail } : {}),
        ...(seen.length ? { pixels: seen } : {}),
      });
    }
  }
  tally[rec.level ?? "not checked"]++;
  fs.appendFileSync(checksFile, JSON.stringify(rec) + "\n");
  console.log(`${rec.key}: ${rec.level ?? "not checked"} — ${rec.why}`);
}
console.log(`\nchecked ${n}: yes ${tally.yes}, maybe ${tally.maybe}, no ${tally.no}, not checked ${tally["not checked"]}; not made yet ${tally.missing}`);
