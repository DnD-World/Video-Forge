#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Model bake-off for explainer scene lists (plan step A3).
//
//   npm run explainer:bakeoff -- [script.txt] [--format 9:16] [--out dir]
//
// The same narration goes to each candidate model; each writes a scene list
// for the brand style (problems are sent back, max 3 tries); every list then
// goes through the checking page. Result: bakeoff.html, the candidates side
// by side, scene by scene, with tries, time and problems.
//
// Keys come from the Key Vault on the minipc (`vault.py get NAME`) and are
// never printed. Developer tool: the app itself uses the user's own keys.
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { app } from "electron";
import { ROOT, checkSpec } from "./lib/explainerRun.mjs";
import { pickModel, writeSceneList } from "./lib/explainerLlm.mjs";

const FONT_CACHE = path.join(ROOT, "explainer", "checks", ".fonts");

// Chosen 21 Oct 2026 from what each key could actually call that day: Gemini
// keys mostly out of credit (one works), Cerebras needs payment, NVIDIA's free
// queue took over 3 minutes, OpenRouter's credit was used up, Mistral rate-limited.
// Dropped: OmniRoute's DeepSeek route runs through a website login (deepseek-web),
// not an API key — not something to build on.
const CANDIDATES = [
  { label: "Gemini 3.5 Flash", provider: "gemini", vault: "AK1_GEMINI_API_KEY", want: "gemini-3.5-flash" },
  { label: "GPT-OSS 120B (Groq)", provider: "groq", vault: "GROQ_API_KEY", want: "openai/gpt-oss-120b" },
  { label: "Qwen 3.8 27B (Groq)", provider: "groq", vault: "GROQ_API_KEY", want: "qwen/qwen3.8-27b" },
];

function vaultKey(name) {
  return execFileSync("python", [path.join(os.homedir(), ".config", "blacksmith", "vault.py"), "get", name], { encoding: "utf8", windowsHide: true }).trim();
}

/** A lesson script without speaker names, stage directions or sound cues. */
function cleanScript(text, maxWords = 120) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^[A-Z]+\s*\|\s*/, "").replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const words = lines.join(" ").split(" ");
  return words.slice(0, maxWords).join(" ");
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

async function main() {
  const a = process.argv.slice(2);
  const scriptFile = a.find((x) => !x.startsWith("--")) ?? path.join(ROOT, "..", "lms", "scripts", "102.1.txt");
  const format = a.includes("--format") ? a[a.indexOf("--format") + 1] : "9:16";
  const out = a.includes("--out") ? path.resolve(a[a.indexOf("--out") + 1]) : path.join(ROOT, "explainer", "checks", "bakeoff");
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  const script = cleanScript(await fs.readFile(scriptFile, "utf8"));
  await fs.writeFile(path.join(out, "script.txt"), script);
  const results = [];
  for (const c of CANDIDATES) {
    const r = { ...c, ok: false };
    try {
      const key = vaultKey(c.vault);
      r.model = c.noList ? c.want : await pickModel(c.provider, key, c.want);
      const w = await writeSceneList({ provider: c.provider, key, model: r.model, script, format, base: { style: "stravelakis", scheme: "night" } });
      Object.assign(r, { attempts: w.attempts, ms: w.ms, problems: w.problems, spec: w.spec });
      if (w.spec) await fs.writeFile(path.join(out, `${c.label.replace(/\W+/g, "-")}.json`), JSON.stringify(w.spec, null, 2));
      if (!w.problems.length) {
        r.check = await checkSpec(w.spec, path.join(out, c.label.replace(/\W+/g, "-")), { fontCache: FONT_CACHE });
        r.ok = r.check.errors.length === 0;
      }
    } catch (e) {
      r.failure = String(e.message || e).slice(0, 300);
    }
    console.log(`${c.label.padEnd(22)} ${r.model ?? "-"} · ${r.failure ? "FAILED: " + r.failure : `${r.attempts} tries, ${(r.ms / 1000).toFixed(1)} s, ${r.problems.length ? "invalid: " + r.problems[0] : `${r.spec.scenes.length} scenes, check ${r.ok ? "passes" : r.check.errors.length + " problems"}`}`}`);
    results.push(r);
  }
  const maxScenes = Math.max(0, ...results.map((r) => r.check?.storyboard.length ?? 0));
  const col = (r) => {
    const dir = r.label.replace(/\W+/g, "-");
    const head = `<div class="head"><b>${esc(r.label)}</b><div class="dim">${esc(r.model ?? "")}</div>${r.failure ? `<span class="chip bad">failed</span><p class="dim">${esc(r.failure)}</p>` : r.problems?.length ? `<span class="chip bad">invalid after ${r.attempts} tries</span><p class="dim">${esc(r.problems.join("; "))}</p>` : `<span class="chip ${r.ok ? "ok" : "bad"}">${r.ok ? "valid · all checks pass" : `${r.check.errors.length} check problems`}</span><div class="dim">${r.attempts} ${r.attempts === 1 ? "try" : "tries"} · ${(r.ms / 1000).toFixed(1)} s · ${r.spec.scenes.length} scenes · ${r.spec.scenes.map((s) => s.kind).join(", ")}</div>${(r.check?.errors ?? []).map((x) => `<p class="dim">✕ ${esc(x.msg)}</p>`).join("")}`}</div>`;
    const shots = Array.from({ length: maxScenes }, (_, i) => {
      const sb = r.check?.storyboard[i];
      return sb ? `<figure><img src="${dir}/${sb.file}" loading="lazy"><figcaption>${i + 1}. ${esc(sb.kind)}</figcaption></figure>` : `<div></div>`;
    }).join("");
    return `<div class="col">${head}${shots}</div>`;
  };
  await fs.writeFile(path.join(out, "bakeoff.html"), `<!doctype html><html><head><meta charset="utf-8"><title>Model bake-off</title>
<style>body{margin:0;padding:24px 16px;background:#071C26;color:#fff;font:15px/1.5 Segoe UI,sans-serif}h1{font-weight:600;margin:0 0 4px}.dim{color:#9fc3cf;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(${results.length},minmax(0,1fr));gap:16px;margin-top:20px}.col{display:flex;flex-direction:column;gap:12px}
.head{background:#11374A;border:1px solid #1E465B;border-radius:24px;padding:12px 16px;min-height:150px}.chip{display:inline-block;border-radius:50px;padding:2px 12px;font-size:12px;font-weight:600;margin:6px 0;color:#071C26}
.ok{background:#76FFC2}.bad{background:#FF8A7A}figure{margin:0}img{width:100%;border-radius:14px;display:block}figcaption{font-size:12px;color:#9fc3cf;margin-top:4px}
pre{white-space:pre-wrap;background:#0B2837;border-radius:16px;padding:12px;font-size:13px}</style></head><body>
<h1>Model bake-off — which model writes the best scene lists</h1><div class="dim">Same script to every model · format ${esc(format)} · style Mint Meander · ${new Date().toLocaleString("en-GB")}</div>
<details><summary class="dim">The script</summary><pre>${esc(script)}</pre></details>
<div class="grid">${results.map(col).join("")}</div></body></html>`);
  console.log("\nReport: " + path.join(out, "bakeoff.html"));
}

app.on("window-all-closed", () => {});
app.whenReady().then(main).then(() => app.exit(0), (e) => { console.error(e.stack || e); app.exit(1); });
