#!/usr/bin/env node
// ---------------------------------------------------------------------------
// The checking page for explainers.
//
//   npm run explainer:check -- [scene-list.json] [--formats 16:9,9:16,1:1,4:5]
//        [--puppets 0,2] [--shape circle] [--scheme night] [--step 0.5] [--out dir]
//
// Runs in Electron (the app's own runtime; a hidden window per shape).
// For every shape × puppet count it builds the real page (the same one the
// renderer uses), opens it in a hidden window, and walks through time:
//   - every text is big enough for a phone (headline 44, label 28, number 64
//     rule pixels — 1 rule px = 1 px of a 720-high frame)
//   - every text fits its space, stays inside the frame, and doesn't sit on
//     other text once the scene has settled
//   - text has enough contrast with what is behind it
//   - nothing is drawn in a puppet spot (pixel comparison with pure background)
//   - each frame draws fast enough to render
// Then it writes report.html: the scenes of every shape side by side, puppet
// spots outlined (with sample faces on a switch), and every problem listed.
// Exit code 1 if anything failed, so scripts can rely on it.
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "electron";
import { checkSpec } from "./lib/explainerRun.mjs";
import { FORMATS } from "../explainer/core/frame.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Google Fonts downloaded by these tools are kept here (the app uses its own data folder). */
const FONT_CACHE = path.join(ROOT, "explainer", "checks", ".fonts");

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { spec: path.join(ROOT, "explainer", "samples", "how-it-works.json"), formats: Object.keys(FORMATS), puppets: [0, 2], shape: "circle", scheme: null, step: 0.5, out: null };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (!k.startsWith("--")) { o.spec = path.resolve(k); continue; }
    const v = a[++i];
    if (k === "--formats") o.formats = v.split(",");
    else if (k === "--puppets") o.puppets = v.split(",").map(Number);
    else if (k === "--shape") o.shape = v;
    else if (k === "--scheme") o.scheme = v;
    else if (k === "--step") o.step = Number(v);
    else if (k === "--out") o.out = path.resolve(v);
  }
  o.out ??= path.join(ROOT, "explainer", "checks", path.basename(o.spec, ".json"));
  return o;
}

// ---- report -----------------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function reportHtml(o, results, faces) {
  const byPuppets = new Map();
  for (const r of results) {
    const key = r.puppets;
    if (!byPuppets.has(key)) byPuppets.set(key, []);
    byPuppets.get(key).push(r);
  }
  const total = { errors: results.reduce((n, r) => n + r.errors.length, 0), warnings: results.reduce((n, r) => n + r.warnings.length, 0) };
  const sceneCount = results[0].storyboard.length;
  const spotSvg = (r) => r.holes.length
    ? `<svg class="spots" viewBox="0 0 ${r.W} ${r.H}" preserveAspectRatio="none">${r.holes.map((h, i) => {
        const face = faces[i % faces.length];
        const clip = h.shape === "circle" ? `<circle cx="${h.cx}" cy="${h.cy}" r="${h.w / 2 / 1.2}"/>` : `<rect x="${h.cx - h.w / 2.4}" y="${h.cy - h.h / 2.4}" width="${h.w / 1.2}" height="${h.h / 1.2}" rx="${h.r / 1.2}"/>`;
        const outline = h.shape === "circle" ? `<circle cx="${h.cx}" cy="${h.cy}" r="${h.w / 2}"/>` : `<rect x="${h.box.x}" y="${h.box.y}" width="${h.w}" height="${h.h}" rx="${h.r}"/>`;
        return `<clipPath id="c${r.id}-${i}">${clip}</clipPath><g class="face"><image href="${face}" x="${h.cx - h.w / 2.4}" y="${h.cy - h.h / 2.4}" width="${h.w / 1.2}" height="${h.h / 1.2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#c${r.id}-${i})"/></g><g class="outline">${outline}</g>`;
      }).join("")}</svg>`
    : "";
  const chip = (r) => r.errors.length ? `<span class="chip bad">${r.errors.length} problem${r.errors.length > 1 ? "s" : ""}</span>` : `<span class="chip ok">all checks pass</span>`;
  const sections = [...byPuppets.entries()].map(([n, rs]) => `
  <section>
    <h2>${n ? `${n} puppet${n > 1 ? "s" : ""} on top <small>(${esc(o.shape)} spots)</small>` : "No puppets"}</h2>
    <div class="grid" style="--cols:${rs.length}">
      ${rs.map((r) => `<div class="head"><b>${esc(r.format)}</b> <span class="dim">${r.W}×${r.H}</span> ${chip(r)}<div class="dim">${r.frames} frames checked · ${r.msAvg.toFixed(0)} ms avg, ${r.msMax.toFixed(0)} ms slowest</div></div>`).join("")}
      ${Array.from({ length: sceneCount }, (_, si) => rs.map((r) => {
        const sb = r.storyboard[si];
        return `<figure><div class="shot" style="aspect-ratio:${r.W}/${r.H}"><img src="${esc(r.dir)}/${esc(sb.file)}" loading="lazy" alt="">${spotSvg(r)}</div><figcaption>${si + 1}. ${esc(sb.kind)} <span class="dim">at ${sb.t.toFixed(1)} s</span></figcaption></figure>`;
      }).join("")).join("")}
      ${rs.map((r) => `<div class="issues">${r.errors.concat(r.warnings).map((x) => `<div class="${x.level}">${x.level === "error" ? "✕" : "!"} ${esc(x.msg)}${x.t != null ? ` <span class="dim">(first at ${x.t.toFixed(2)} s${x.count > 1 ? `, ${x.count}×` : ""})</span>` : ""}</div>`).join("") || `<div class="okline">✓ nothing to fix</div>`}</div>`).join("")}
    </div>
  </section>`).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Explainer check</title>
<style>
@font-face{font-family:Sora;font-weight:400;src:url("${esc(results[0].dir)}/page/fonts/sora-latin-400-normal.woff2")}
@font-face{font-family:Sora;font-weight:600;src:url("${esc(results[0].dir)}/page/fonts/sora-latin-600-normal.woff2")}
:root{--ink:#071C26;--p900:#0B2837;--p800:#11374A;--p700:#1E465B;--mint:#76FFC2;--mint50:#E9FEF5;--bad:#FF8A7A;--warn:#FFD27A}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 700px at 20% -10%,#14435a 0%,var(--p900) 45%,var(--ink) 100%) fixed;color:#fff;font:400 15px/1.5 Sora,system-ui,sans-serif;padding:28px 16px 80px}
header{max-width:1600px;margin:0 auto 26px;display:flex;flex-wrap:wrap;gap:18px;align-items:end;justify-content:space-between}
h1{font-weight:600;font-size:34px;margin:0 0 6px;letter-spacing:-.01em}
h2{font-weight:600;font-size:22px;margin:34px 0 14px}
h2 small,.dim{color:#9fc3cf;font-weight:400;font-size:13px}
.summary{display:flex;gap:10px;flex-wrap:wrap}
.chip{display:inline-block;border-radius:50px;padding:3px 12px;font-size:12px;font-weight:600;vertical-align:middle}
.chip.ok{background:var(--mint);color:var(--ink)} .chip.bad{background:var(--bad);color:var(--ink)}
.big{border-radius:50px;padding:10px 20px;font-weight:600;background:var(--p800);border:1px solid var(--p700)}
.big.ok{background:var(--mint);color:var(--ink);border:0} .big.bad{background:var(--bad);color:var(--ink);border:0}
label{display:inline-flex;gap:8px;align-items:center;background:var(--p800);border:1px solid var(--p700);border-radius:50px;padding:8px 16px;cursor:pointer;user-select:none}
section{max-width:1600px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:14px 16px;align-items:start}
.head{background:var(--p800);border:1px solid var(--p700);border-radius:24px;padding:12px 16px}
figure{margin:0}
.shot{position:relative;border-radius:18px;overflow:hidden;background:#000;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.shot img{display:block;width:100%;height:100%;object-fit:cover}
.spots{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.spots .outline *{fill:none;stroke:var(--mint);stroke-width:6;stroke-dasharray:18 12}
.spots .face{display:none}
body.faces .spots .face{display:inline} body.faces .spots .outline{display:none}
body.nospots .spots{display:none}
figcaption{font-size:13px;margin:6px 4px 0}
.issues{background:rgba(7,28,38,.6);border:1px solid var(--p700);border-radius:20px;padding:10px 14px;font-size:13px}
.issues .error{color:var(--bad)} .issues .warn{color:var(--warn)} .okline{color:var(--mint)}
@media (max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style></head>
<body>
<header>
  <div><h1>Explainer check — ${esc(path.basename(o.spec))}</h1>
  <div class="dim">Style: Mint Meander (Stravelakis) · scheme ${esc(o.scheme ?? "from the scene list")} · checked ${new Date().toLocaleString("en-GB")}</div></div>
  <div class="summary">
    <span class="big ${total.errors ? "bad" : "ok"}">${total.errors ? `${total.errors} problem${total.errors > 1 ? "s" : ""}` : "Every check passes"}</span>
    <span class="big">${total.warnings} note${total.warnings === 1 ? "" : "s"}</span>
    <label><input type="checkbox" id="faces"> Show sample faces in the spots</label>
    <label><input type="checkbox" id="nospots"> Hide spot outlines</label>
  </div>
</header>
${sections}
<script>
document.getElementById("faces").onchange=(e)=>document.body.classList.toggle("faces",e.target.checked);
document.getElementById("nospots").onchange=(e)=>document.body.classList.toggle("nospots",e.target.checked);
</script>
</body></html>`;
}

// ---- main ---------------------------------------------------------------------------
// Electron emits "ready" only after this module finishes loading, so the work
// runs from whenReady() rather than a top-level await.
async function main() {
  const o = parseArgs();
  const base = JSON.parse(await fs.readFile(o.spec, "utf8"));
  await fs.rm(o.out, { recursive: true, force: true });
  await fs.mkdir(o.out, { recursive: true });

  // sample faces for the "show faces" switch (Video Forge's own design art)
  const faces = [];
  for (const f of ["face-kaiti.png", "face-serifis.png", "face-tsika.png"]) {
    try { await fs.copyFile(path.join(ROOT, "docs", "design", f), path.join(o.out, f)); faces.push(f); } catch { /* optional */ }
  }

  const results = [];
  let id = 0;
  try {
    for (const n of o.puppets) {
      for (const format of o.formats) {
        const spec = { ...base, format, puppets: n ? { count: n, shape: o.shape } : undefined, ...(o.scheme ? { scheme: o.scheme } : {}) };
        const dirName = `${format.replace(":", "x")}-p${n}`;
        const r = await checkSpec(spec, path.join(o.out, dirName), { fontCache: FONT_CACHE, step: o.step });
      r.label = `${format} · ${n} puppets`;
        Object.assign(r, { format, puppets: n, dir: dirName, id: id++ });
        results.push(r);
        console.log(`${r.label.padEnd(18)} ${r.errors.length ? `${r.errors.length} problems` : "pass"}${r.warnings.length ? `, ${r.warnings.length} notes` : ""} · ${r.frames} frames · ${r.msAvg.toFixed(0)} ms avg / ${r.msMax.toFixed(0)} ms max`);
        for (const e of r.errors) console.log(`   ✕ ${e.msg}${e.t != null ? ` (t=${e.t.toFixed(2)})` : ""}`);
      }
    }
  } catch (e) {
    console.error(e.stack || e);
    app.exit(2);
  }
  await fs.writeFile(path.join(o.out, "report.json"), JSON.stringify(results, null, 2));
  await fs.writeFile(path.join(o.out, "report.html"), reportHtml(o, results, faces));
  console.log("\nReport: " + path.join(o.out, "report.html"));
  app.exit(results.some((r) => r.errors.length) ? 1 : 0);
}

app.on("window-all-closed", () => { /* keep going between shapes */ });
app.whenReady().then(main);
