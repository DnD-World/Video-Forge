// ---------------------------------------------------------------------------
// Explainers in the app (Ak, 21 Oct 2026): the main-process side.
//
// Everything heavy lives in tools/lib/explainerRun.mjs (shared with the
// command-line tools, so the app checks and renders exactly like they do);
// this file wires it to the window: keys from the app's own vault, files in
// the app's data folder, progress back to the screen.
//
// Folders (inside the app's data folder):
//   explainer/styles/<id>/    imported atlas styles (card.json + prompt.txt) —
//                             the user's own copies, never shipped with the app
//   explainer/generated/      HTML pages a model wrote in an imported style
//   explainer/work/           checks and storyboards (cleared per run)
//   explainer/fonts/          Google Fonts downloaded once
// ---------------------------------------------------------------------------

import { app, ipcMain, shell, type BrowserWindow } from "electron";
import fsp from "node:fs/promises";
import path from "node:path";
import * as keyStore from "../keyStore";
import {
  captionCues, chapters, checkImported, checkSpec, extractClip, gifFromSpec, renderImported, renderSpec, stillPng, thumbnails, toSrt, toVtt,
} from "../../tools/lib/explainerRun.mjs";
import { PROVIDERS, pickModel, rebuildImported, writeSceneList } from "../../tools/lib/explainerLlm.mjs";
import { ensureGoogleFont, fontFiles, googleFontList } from "../../tools/lib/explainerFonts.mjs";
import { parseAtlasPrompt, rebuildPrompt, styleSlug } from "../../explainer/core/prompts.mjs";
import { resolveSpec, validateSpec } from "../../explainer/core/spec.mjs";
import { holesFor, explainerSpots, FORMATS } from "../../explainer/core/frame.mjs";
import type { AtlasStyle, Format, Spec, Word, SpotShape } from "../../explainer/types";

const base = () => path.join(app.getPath("userData"), "explainer");
const dirs = {
  styles: () => path.join(base(), "styles"),
  generated: () => path.join(base(), "generated"),
  work: () => path.join(base(), "work"),
  fonts: () => path.join(base(), "fonts"),
  prompts: () => path.join(app.getPath("documents"), "Video Forge", "explainer prompts"),
};

/** Which models to try first, per job. Families, matched against the key's own list. */
const SCENE_HINTS: Record<string, string[]> = {
  // bake-off 21 Oct 2026 (Greek lesson 102.1): Gemini 3.5 Flash wrote the best
  // Greek and structure but is often overloaded; GPT-OSS 120B was clean and
  // fast but added a step the script didn't say; Qwen 3.8 stuck to the words
  // but scattered "takeaway" scenes. So on Groq: GPT-OSS first, Qwen second.
  groq: ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"],
  gemini: ["gemini-3.5-flash", "gemini-flash-latest"],
  openrouter: ["qwen/qwen3.8", "google/gemini-3.5-flash", "openai/gpt-oss-120b"],
  nvidia: ["deepseek-v4", "glm-5", "qwen3"],
  cerebras: ["qwen-3.8", "gpt-oss-120b"],
  openai: ["gpt-5.5-mini", "gpt-5-mini", "gpt-5"],
  mistral: ["mistral-medium", "mistral-small"],
};
/** Imported styles need a top model: it writes a whole drawing program. */
const REBUILD_HINTS: Record<string, string[]> = {
  openai: ["gpt-5.5", "gpt-5"],
  gemini: ["gemini-3.1-pro", "gemini-3.5-pro", "gemini-3.5-flash"],
  openrouter: ["anthropic/claude-opus", "openai/gpt-5.5", "google/gemini-3.1-pro"],
};

async function keyFor(provider: string): Promise<string> {
  const key = await keyStore.getKey(provider);
  if (!key) throw new Error(`No ${PROVIDERS[provider]?.label ?? provider} key saved. Add it in Settings → keys.`);
  return key;
}

async function chooseModel(provider: string, key: string, hints: string[], wanted?: string): Promise<string> {
  if (wanted) return wanted;
  for (const h of hints) {
    try { return await pickModel(provider, key, h); } catch { /* next hint */ }
  }
  return pickModel(provider, key);
}

const toDataUrl = async (file: string) => `data:image/jpeg;base64,${(await fsp.readFile(file)).toString("base64")}`;

async function freshDir(name: string) {
  const d = path.join(dirs.work(), name);
  await fsp.rm(d, { recursive: true, force: true });
  await fsp.mkdir(d, { recursive: true });
  return d;
}

/** Styles the user imported: [{ id, name, family, look, ... }] (no raw prompt). */
async function listImported() {
  const out: (Omit<AtlasStyle, "raw"> & { id: string; importedAt: string })[] = [];
  let names: string[] = [];
  try { names = await fsp.readdir(dirs.styles()); } catch { return out; }
  for (const id of names) {
    try { out.push({ id, ...JSON.parse(await fsp.readFile(path.join(dirs.styles(), id, "card.json"), "utf8")) }); } catch { /* not a style folder */ }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function loadImported(id: string): Promise<AtlasStyle> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("bad style id");
  const card = JSON.parse(await fsp.readFile(path.join(dirs.styles(), id, "card.json"), "utf8"));
  const raw = await fsp.readFile(path.join(dirs.styles(), id, "prompt.txt"), "utf8");
  return { ...card, raw };
}

/** Puppet spots for an imported page (same geometry as the built-in style). */
function holesForRequest(format: Format, puppets?: { count: number; shape?: SpotShape }) {
  if (!puppets?.count) return [];
  const { width, height } = FORMATS[format];
  return holesFor(explainerSpots(format, puppets.count, puppets.shape ?? "circle"), width, height, puppets.shape ?? "circle");
}

const safeName = (s: string) => s.replace(/[^\w\- .]+/g, "").slice(0, 60).trim() || "explainer";

export function registerExplainerIpc(getWindow: () => BrowserWindow | null) {
  const progress = (job: string, pct: number, note: string) => getWindow()?.webContents.send("explainer:progress", { job, pct, note });
  let busy: AbortController | null = null;
  const run = async <T>(job: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    if (busy) throw new Error("Another explainer job is running — wait for it or cancel it.");
    busy = new AbortController();
    try { return await fn(busy.signal); } finally { busy = null; progress(job, 1, "done"); }
  };

  ipcMain.handle("explainer:cancel", () => { busy?.abort(); return true; });

  // ---- styles ----------------------------------------------------------------------
  ipcMain.handle("explainer:styles", async () => ({ imported: await listImported() }));

  ipcMain.handle("explainer:importStyle", async (_e, text: string) => {
    const st = parseAtlasPrompt(String(text ?? "").slice(0, 2_000_000));
    const id = styleSlug(st.name);
    const dir = path.join(dirs.styles(), id);
    await fsp.mkdir(dir, { recursive: true });
    const { raw, ...card } = st;
    await fsp.writeFile(path.join(dir, "prompt.txt"), raw);
    await fsp.writeFile(path.join(dir, "card.json"), JSON.stringify({ ...card, importedAt: new Date().toISOString() }, null, 2));
    return { id, ...card };
  });

  ipcMain.handle("explainer:removeStyle", async (_e, id: string) => {
    if (!/^atlas-[a-z0-9-]+$/.test(id)) throw new Error("bad style id");
    await fsp.rm(path.join(dirs.styles(), id), { recursive: true, force: true });
    return true;
  });

  // ---- fonts ------------------------------------------------------------------------
  ipcMain.handle("explainer:googleFonts", () => googleFontList());

  /** Font bytes for the live preview in the window (FontFace API). Downloads Google fonts once. */
  ipcMain.handle("explainer:fontData", async (_e, family: string) => {
    const faces = await fontFiles(String(family), { cacheDir: dirs.fonts() });
    return Promise.all(faces.map(async (f) => ({ weight: f.weight, range: f.range, data: new Uint8Array(await fsp.readFile(f.file)) })));
  });

  ipcMain.handle("explainer:ensureGoogleFont", async (_e, family: string) => { await ensureGoogleFont(String(family), dirs.fonts()); return true; });

  // ---- models -----------------------------------------------------------------------
  ipcMain.handle("explainer:providers", async () => {
    const out: { id: string; label: string; hasKey: boolean }[] = [];
    for (const [id, p] of Object.entries(PROVIDERS)) out.push({ id, label: p.label, hasKey: !!(await keyStore.getKey(id)) });
    return out;
  });

  ipcMain.handle("explainer:writeScenes", (_e, req: { script: string; words?: Word[]; format: Format; provider: string; model?: string; base?: Partial<Spec> }) =>
    run("write", async (signal) => {
      const key = await keyFor(req.provider);
      progress("write", 0.05, "Choosing a model…");
      const model = await chooseModel(req.provider, key, SCENE_HINTS[req.provider] ?? [], req.model);
      const r = await writeSceneList({
        provider: req.provider, key, model, script: req.script, words: req.words, format: req.format, base: req.base, signal,
        onAttempt: (n) => progress("write", 0.2 + n * 0.2, n === 1 ? `${model} is writing the scenes…` : `Fixing problems (try ${n})…`),
      });
      return { ...r, model };
    })
  );

  ipcMain.handle("explainer:validate", (_e, spec: Spec) => validateSpec(spec));

  // ---- built-in style: check, storyboard, render, exports -----------------------------
  ipcMain.handle("explainer:check", (_e, spec: Spec) =>
    run("check", async () => {
      const dir = await freshDir("check");
      const r = await checkSpec(spec, dir, { fontCache: dirs.fonts(), onProgress: (f) => progress("check", f * 0.9, "Checking every frame…") });
      const frames = await Promise.all(r.storyboard.map(async (s) => ({ ...s, url: await toDataUrl(path.join(dir, s.file)) })));
      return { ...r, storyboard: frames, changes: undefined };
    })
  );

  ipcMain.handle("explainer:render", (_e, req: { spec: Spec; out: string; audio?: string; extras?: { gif?: { from: number; to: number }; clip?: { from: number; to: number }; still?: number; thumbs?: boolean; captions?: boolean; chapters?: boolean } }) =>
    run("render", async (signal) => {
      const problems = validateSpec(req.spec);
      if (problems.length) throw new Error("The scene list has problems:\n" + problems.join("\n"));
      const out = req.out.toLowerCase().endsWith(".mp4") ? req.out : req.out + ".mp4";
      const made: string[] = [];
      await renderSpec(req.spec, out, { fontCache: dirs.fonts(), audio: req.audio, signal, onProgress: (f) => progress("render", f * 0.85, "Drawing frames…") });
      made.push(out);
      const stem = out.replace(/\.mp4$/i, "");
      const x = req.extras ?? {};
      if (x.gif) { progress("render", 0.88, "Making the GIF…"); await gifFromSpec(req.spec, `${stem}.gif`, { fontCache: dirs.fonts(), ...x.gif }); made.push(`${stem}.gif`); }
      if (x.clip) { progress("render", 0.9, "Cutting the clip…"); await extractClip(out, `${stem}-clip.mp4`, x.clip); made.push(`${stem}-clip.mp4`); }
      if (x.still != null) { await stillPng(req.spec, x.still, `${stem}-still.png`, { fontCache: dirs.fonts() }); made.push(`${stem}-still.png`); }
      if (x.thumbs) { progress("render", 0.93, "Thumbnails…"); made.push(...(await thumbnails(req.spec, path.dirname(out), { fontCache: dirs.fonts(), prefix: path.basename(stem) }))); }
      if (x.captions) {
        const cues = captionCues(req.spec.words);
        if (cues.length) { await fsp.writeFile(`${stem}.srt`, toSrt(cues)); await fsp.writeFile(`${stem}.vtt`, toVtt(cues)); made.push(`${stem}.srt`, `${stem}.vtt`); }
      }
      if (x.chapters) {
        const ch = chapters(req.spec, resolveSpec(req.spec));
        if (ch) { await fsp.writeFile(`${stem}.chapters.txt`, ch + "\n"); made.push(`${stem}.chapters.txt`); }
      }
      return { made, spots: out.replace(/\.mp4$/i, ".spots.json") };
    })
  );

  // ---- imported styles ------------------------------------------------------------------
  /** "Hand to Claude": write the full prompt to a file and show it in Explorer. */
  ipcMain.handle("explainer:importedPrompt", async (_e, req: { styleId: string; content: string; format: Format; words?: Word[]; puppets?: { count: number; shape?: SpotShape }; duration?: number }) => {
    const style = await loadImported(req.styleId);
    const prompt = rebuildPrompt(style, { content: req.content, format: req.format, words: req.words, holes: holesForRequest(req.format, req.puppets), duration: req.duration });
    await fsp.mkdir(dirs.prompts(), { recursive: true });
    const file = path.join(dirs.prompts(), `${safeName(style.name)} - ${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.md`);
    await fsp.writeFile(file, prompt);
    shell.showItemInFolder(file);
    return { file, chars: prompt.length };
  });

  ipcMain.handle("explainer:importedGenerate", (_e, req: { styleId: string; content: string; format: Format; words?: Word[]; puppets?: { count: number; shape?: SpotShape }; provider: string; model?: string; duration?: number }) =>
    run("generate", async (signal) => {
      const style = await loadImported(req.styleId);
      const key = await keyFor(req.provider);
      const model = await chooseModel(req.provider, key, REBUILD_HINTS[req.provider] ?? SCENE_HINTS[req.provider] ?? [], req.model);
      progress("generate", 0.1, `${model} is writing the whole explainer — this can take several minutes…`);
      const { html, ms } = await rebuildImported({ provider: req.provider, key, model, style, content: req.content, format: req.format, words: req.words, holes: holesForRequest(req.format, req.puppets), duration: req.duration, signal });
      return { ...(await saveAndCheckGenerated(html, style.name)), model, ms };
    })
  );

  /** A page the user got from Claude (Hand to Claude) or elsewhere. */
  ipcMain.handle("explainer:importedLoad", (_e, htmlPath: string) =>
    run("check", async () => saveAndCheckGenerated(await fsp.readFile(htmlPath, "utf8"), path.basename(htmlPath, path.extname(htmlPath))))
  );

  ipcMain.handle("explainer:importedRender", (_e, req: { id: string; out: string; tint?: unknown; audio?: string }) =>
    run("render", async (signal) => {
      const file = generatedFile(req.id);
      const out = req.out.toLowerCase().endsWith(".mp4") ? req.out : req.out + ".mp4";
      await renderImported(file, out, { tint: req.tint, audio: req.audio, signal, onProgress: (f) => progress("render", f, "Drawing frames…") });
      return { made: [out] };
    })
  );

  /** The puppet-spot map rendered beside an explainer video (name.spots.json), or null. */
  ipcMain.handle("explainer:spotsFor", async (_e, mp4: string) => {
    try {
      const j = JSON.parse(await fsp.readFile(String(mp4).replace(/\.mp4$/i, ".spots.json"), "utf8"));
      return { format: j.format, width: j.width, height: j.height, slots: Array.isArray(j.slots) ? j.slots : [] };
    } catch { return null; }
  });

  ipcMain.handle("explainer:reveal", (_e, file: string) => { shell.showItemInFolder(file); return true; });
}

function generatedFile(id: string) {
  if (!/^[\w-]+$/.test(id)) throw new Error("bad page id");
  return path.join(dirs.generated(), `${id}.html`);
}

async function saveAndCheckGenerated(html: string, name: string) {
  if (!/<canvas/i.test(html)) throw new Error("That page has no <canvas> — it isn't an atlas-style explainer.");
  const id = `${safeName(name).replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`;
  await fsp.mkdir(dirs.generated(), { recursive: true });
  const file = generatedFile(id);
  await fsp.writeFile(file, html);
  const dir = await freshDir("imported-check");
  const r = await checkImported(file, dir);
  const frames = await Promise.all(r.storyboard.map(async (s) => ({ ...s, url: await toDataUrl(path.join(dir, s.file)) })));
  return { id, file, ...r, storyboard: frames };
}
