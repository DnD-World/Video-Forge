// ---------------------------------------------------------------------------
// Font files for explainer pages: bundled ones from node_modules, Google Fonts
// downloaded once into a cache folder.
//
// GOOGLE FONTS, WITHOUT AN API KEY. The family list is Google's public
// metadata file (fonts.google.com/metadata/fonts); the files come from the
// CSS2 API, asked for with a desktop browser's User-Agent so it answers with
// WOFF2. Every alphabet (subset) is kept, each with its unicode-range. Fonts are free (OFL / Apache) to embed.
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { BUNDLED_FONTS, WEIGHTS, fontSlug } from "../../explainer/core/fonts.mjs";

const require_ = createRequire(import.meta.url);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

/**
 * The font faces for a family: [{ weight, file (absolute), range (unicode-range) }].
 * Every alphabet the family has is included (Latin, Greek, Cyrillic…), each
 * with its unicode-range, so Greek lesson text uses the font's own Greek.
 * Weights a family lacks fall back to the nearest one it has.
 */
export async function fontFiles(family, { cacheDir } = {}) {
  const b = BUNDLED_FONTS.find((f) => f.family === family);
  if (b) return bundledFaces(b.pkg);
  if (!cacheDir) throw new Error(`"${family}" is not a bundled font and no font cache folder was given`);
  return ensureGoogleFont(family, cacheDir);
}

/** Read @fontsource's own CSS (one file per weight) for files and ranges. */
async function bundledFaces(pkg) {
  const dir = path.dirname(require_.resolve(`@fontsource/${pkg}/package.json`));
  const have = new Map();
  for (const w of [100, 200, 300, 400, 500, 600, 700, 800, 900]) {
    let css;
    try { css = await fs.readFile(path.join(dir, `${w}.css`), "utf8"); } catch { continue; }
    have.set(w, parseFaces(css, (u) => path.join(dir, u.replace(/^\.\//, ""))));
  }
  return pickWeights(have);
}

/** @font-face blocks -> [{ file, range }] (normal style, woff2 only). */
function parseFaces(css, resolve) {
  const out = [];
  for (const m of css.matchAll(/@font-face\s*{([^}]*)}/g)) {
    const b = m[1];
    if ((/font-style:\s*(\w+)/.exec(b)?.[1] ?? "normal") !== "normal") continue;
    const url = /url\(([^)]+?\.woff2)\)/.exec(b)?.[1]?.replace(/['"]/g, "");
    if (!url) continue;
    out.push({ file: resolve(url), range: /unicode-range:\s*([^;]+)/.exec(b)?.[1]?.trim() ?? null, weight: Number(/font-weight:\s*(\d+)/.exec(b)?.[1] ?? 400) });
  }
  return out;
}

function pickWeights(have) {
  if (!have.size) throw new Error("no font files found");
  const out = [];
  for (const w of WEIGHTS) {
    const best = [...have.keys()].sort((a, b) => Math.abs(a - w) - Math.abs(b - w) || b - a)[0];
    for (const f of have.get(best)) out.push({ weight: w, file: f.file, range: f.range });
  }
  return out;
}

/** Download (once) a Google family's Latin WOFF2 files for our four weights. */
export async function ensureGoogleFont(family, cacheDir) {
  const dir = path.join(cacheDir, fontSlug(family));
  const manifest = path.join(dir, "faces.json");
  try {
    const m = JSON.parse(await fs.readFile(manifest, "utf8"));
    if (m.length) return m.map((x) => ({ ...x, file: path.join(dir, x.file) }));
  } catch { /* not cached yet */ }
  const fam = encodeURIComponent(family).replace(/%20/g, "+");
  let css = "";
  for (const query of [`wght@${WEIGHTS.join(";")}`, "wght@400;700", ""]) {
    const res = await fetch(`https://fonts.googleapis.com/css2?family=${fam}${query ? ":" + query : ""}&display=block`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) });
    if (res.ok) { css = await res.text(); break; }
  }
  if (!css) throw new Error(`Google Fonts has no family called "${family}"`);
  const faces = parseFaces(css, (u) => u);
  if (!faces.length) throw new Error(`Google Fonts returned no usable files for "${family}"`);
  await fs.mkdir(dir, { recursive: true });
  const have = new Map();
  for (const [i, f] of faces.entries()) {
    const res = await fetch(f.file, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) continue;
    const name = `${fontSlug(family)}-${f.weight}-${i}.woff2`;
    await fs.writeFile(path.join(dir, name), Buffer.from(await res.arrayBuffer()));
    if (!have.has(f.weight)) have.set(f.weight, []);
    have.get(f.weight).push({ file: name, range: f.range });
  }
  const picked = pickWeights(have);
  await fs.writeFile(manifest, JSON.stringify(picked, null, 2));
  return picked.map((x) => ({ ...x, file: path.join(dir, x.file) }));
}

let listCache = null;
/** Every Google Fonts family name (cached for the session). Empty when offline. */
export async function googleFontList() {
  if (listCache) return listCache;
  try {
    const res = await fetch("https://fonts.google.com/metadata/fonts", { signal: AbortSignal.timeout(20000) });
    const text = (await res.text()).replace(/^\)\]\}'\s*/, "");
    const data = JSON.parse(text);
    listCache = (data.familyMetadataList ?? []).map((f) => ({ family: f.family, category: f.category }));
  } catch {
    listCache = [];
  }
  return listCache;
}
