// ---------------------------------------------------------------------------
// Build a self-contained explainer page in a folder:
//   index.html   the canvas inside a HyperFrames composition
//   ex.js        explainer/stage/page.mjs bundled with the kit
//   fonts/       the chosen font (+ Sora as fallback), so it renders offline
// Used by the checking page (tools/explainer-check.mjs) and the renderer
// (tools/explainer-render.mjs). Same page for both: what is checked is what
// is rendered.
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolveSpec, validateSpec } from "../../explainer/core/spec.mjs";
import { FALLBACK_FONT, fontSlug } from "../../explainer/core/fonts.mjs";
import { fontFiles } from "./explainerFonts.mjs";

const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const COMPOSITION_ID = "video-forge-explainer";

let bundleCache = null;
async function bundle() {
  if (bundleCache) return bundleCache;
  const esbuild = require_("esbuild");
  const out = await esbuild.build({
    entryPoints: [path.join(ROOT, "explainer", "stage", "page.mjs")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome120",
    minify: true,
    write: false,
    logLevel: "silent",
  });
  bundleCache = out.outputFiles[0].text;
  return bundleCache;
}

/** Throws with every problem listed if the scene list is not valid. */
export function checkedResolve(spec) {
  const errs = validateSpec(spec);
  if (errs.length) throw new Error("The scene list has problems:\n- " + errs.join("\n- "));
  return resolveSpec(spec);
}

export async function buildExplainerPage(spec, dir, { audio, fontCache } = {}) {
  const R = checkedResolve(spec);
  await fs.mkdir(path.join(dir, "fonts"), { recursive: true });
  // the chosen font, plus the brand font as the fallback for any missing glyph
  // the chosen font, then Inter for any alphabet it lacks (Sora has no Greek), then Sora
  const families = [...new Set([R.font, FALLBACK_FONT, "Sora"])];
  const faces = [], preloads = [];
  for (const family of families) {
    for (const [i, f] of (await fontFiles(family, { cacheDir: fontCache })).entries()) {
      const name = `${fontSlug(family)}-${f.weight}-${i}.woff2`;
      await fs.copyFile(f.file, path.join(dir, "fonts", name));
      faces.push(`@font-face{font-family:"${family}";font-weight:${f.weight};font-style:normal;font-display:block;src:url("fonts/${name}") format("woff2")${f.range ? `;unicode-range:${f.range}` : ""}}`);
      if (family === R.font && (!f.range || /U\+0000-00FF/i.test(f.range))) preloads.push(`<link rel="preload" href="fonts/${name}" as="font" type="font/woff2" crossorigin>`);
    }
  }
  await fs.writeFile(path.join(dir, "ex.js"), await bundle());
  const T = R.duration.toFixed(4);
  const audioTag = audio ? `<audio id="ex-audio" src="${audio}" data-start="0" data-duration="${T}" data-track-index="1"></audio>` : "";
  const data = { spec, id: COMPOSITION_ID };
  const html = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
${faces.join("\n")}
html,body{margin:0;background:#071C26}
#stage{position:relative;width:${R.W}px;height:${R.H}px;overflow:hidden}
#ex{position:absolute;inset:0;width:${R.W}px;height:${R.H}px}
</style>
${preloads.join("\n")}
</head>
<body>
<div id="stage" data-composition-id="${COMPOSITION_ID}" data-start="0" data-width="${R.W}" data-height="${R.H}" data-duration="${T}" data-fps="${R.fps}">
<div id="ex-clip" class="clip" data-start="0" data-duration="${T}" data-track-index="0" style="position:absolute;inset:0"><canvas id="ex"></canvas></div>
${audioTag}
</div>
<script>window.__EX__ = ${JSON.stringify(data).replace(/</g, "\\u003c")};</script>
<script src="ex.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  window.__timelines["${COMPOSITION_ID}"] = window.__exTimeline;
</script>
</body></html>`;
  await fs.writeFile(path.join(dir, "index.html"), html);
  return R;
}

/** The headless Chrome HyperFrames downloads (newest one found). */
export async function findChrome() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const base = path.join(home, ".cache", "hyperframes", "chrome", "chrome-headless-shell");
  const dirs = (await fs.readdir(base).catch(() => [])).sort().reverse();
  for (const d of dirs) {
    const exe = path.join(base, d, "chrome-headless-shell-win64", "chrome-headless-shell.exe");
    try { await fs.access(exe); return exe; } catch { /* try the next */ }
  }
  throw new Error("No headless Chrome found under " + base + " — run one HyperFrames render first, it downloads it.");
}
