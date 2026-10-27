// ---------------------------------------------------------------------------
// Running explainer pages: check, render, and every export.
//
// Used by the command-line tools (tools/explainer-check.mjs, -render.mjs) AND
// by the app's main process (electron/explainer/explainerIpc.ts), so a check
// in the app is exactly the check on the command line. Needs Electron: pages
// open in hidden windows and frames are read straight off the canvas.
//
// Two kinds of page:
//   built-in  a scene list drawn by a style kit (full checks: sizes, fit,
//             overlaps, contrast, empty puppet spots, speed)
//   imported  a whole HTML explainer a model wrote in an atlas style
//             (checks: loads, no errors, seek works, speed; frames by eye)
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { BrowserWindow, session } from "electron";
import { buildExplainerPage } from "./explainerPage.mjs";
import { MIN_SIZE, safeMargin, rectHitsHole } from "../../explainer/core/frame.mjs";
import { contrast } from "../../explainer/core/math.mjs";
import { resolveTint, tintPixels } from "../../explainer/core/tint.mjs";
import { planSfx, creditsText, SOUNDS } from "../../explainer/core/sfx.mjs";
export { captionCues, chapters, toSrt, toVtt } from "../../explainer/core/exports.mjs";

const require_ = createRequire(import.meta.url);
// Two folders up: from tools/lib in the repo, and from out/main once the app's
// main process is bundled — both land on the app root.
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const SPOT_LIMIT = 0.0005; // share of spot pixels allowed to differ (normally exactly 0)
export const SLOW_MS = 150;
const MIN_CONTRAST = { label: 4.5, headline: 3, number: 3 };

// ---- pages ------------------------------------------------------------------------

const UNTRUSTED_PARTITION = "explainer-untrusted";
let untrustedReady = false;

/**
 * A locked-down session for pages a model wrote (imported styles): no network
 * except Google Fonts, no permissions (camera, mic, notifications…), no
 * downloads. The page still runs its own drawing code — that is the point —
 * but it cannot reach anything else.
 */
function lockUntrustedSession() {
  if (untrustedReady) return;
  const ses = session.fromPartition(UNTRUSTED_PARTITION);
  ses.webRequest.onBeforeRequest((d, cb) => {
    const ok = /^(file|data|blob|devtools):/i.test(d.url) || /^https:\/\/fonts\.(googleapis|gstatic)\.com\//i.test(d.url);
    cb({ cancel: !ok });
  });
  ses.setPermissionRequestHandler((_wc, _p, cb) => cb(false));
  ses.on("will-download", (e) => e.preventDefault());
  untrustedReady = true;
}

/**
 * Open a built page in a hidden window. Returns { js, win, consoleErrors, close }.
 * untrusted: true for pages a model wrote (see lockUntrustedSession).
 */
export async function openPage(indexHtml, W = 1920, H = 1080, { untrusted = false } = {}) {
  if (untrusted) lockUntrustedSession();
  const win = new BrowserWindow({
    show: false, width: Math.min(W, 1920), height: Math.min(H, 1920),
    webPreferences: { offscreen: true, backgroundThrottling: false, sandbox: true, contextIsolation: true, nodeIntegration: false, ...(untrusted ? { partition: UNTRUSTED_PARTITION } : {}) },
  });
  const consoleErrors = [];
  win.webContents.on("console-message", (e) => { if (e.level === "error") consoleErrors.push(e.message); });
  win.webContents.on("render-process-gone", (_e, d) => consoleErrors.push(`the page crashed (${d.reason})`));
  // nothing a page does may open windows or leave this file
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  await win.loadFile(indexHtml);
  return { win, consoleErrors, js: (code) => win.webContents.executeJavaScript(code), close: () => { if (!win.isDestroyed()) win.destroy(); } };
}

// ---- checks -------------------------------------------------------------------------

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Judge one frame of a built-in page. settled = the scene has finished animating. */
export function judge(frame, R, settled) {
  const out = [];
  const add = (level, msg) => out.push({ level, msg, t: frame.t });
  const texts = frame.log.filter((e) => e.kind === "text");
  const m = safeMargin(R.W, R.H);
  for (const e of texts) {
    const min = MIN_SIZE[e.role] ?? MIN_SIZE.label;
    const what = `${e.role} "${e.text.slice(0, 40)}"`;
    if (e.px < min - 0.5) add("error", `${what} is ${e.px.toFixed(0)} rule px; must be at least ${min}`);
    if (e.fits === false) add("error", `${what} does not fit its space at the smallest allowed size`);
    if (e.fg && e.bg && /^#/.test(e.fg) && /^#/.test(e.bg)) {
      const cr = contrast(e.fg, e.bg);
      if (cr < (MIN_CONTRAST[e.role] ?? 4.5)) add("error", `${what} contrast ${cr.toFixed(1)}:1 (needs ${MIN_CONTRAST[e.role] ?? 4.5})`);
    }
    for (const h of R.holes) if (rectHitsHole(e, h)) add("error", `${what} is inside a puppet spot`);
    if (settled) {
      if (e.x < -1 || e.y < -1 || e.x + e.w > R.W + 1 || e.y + e.h > R.H + 1) add("error", `${what} leaves the frame`);
      else if (e.x < m - 1 || e.y < m - 1 || e.x + e.w > R.W - m + 1 || e.y + e.h > R.H - m + 1) add("warn", `${what} is inside the safe margin`);
    }
  }
  if (settled) {
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      if (overlaps(a, b) && a.text !== b.text) add("error", `"${a.text.slice(0, 24)}" overlaps "${b.text.slice(0, 24)}"`);
    }
  }
  if (frame.spotDiff > SPOT_LIMIT) add("error", `something is drawn in a puppet spot (${(frame.spotDiff * 100).toFixed(2)}% of its pixels)`);
  if (frame.ms > SLOW_MS) add("warn", `frame took ${frame.ms.toFixed(0)} ms to draw (aim: under ${SLOW_MS})`);
  return out;
}

function summarise(issues) {
  const seen = new Map();
  for (const it of issues) {
    const k = it.level + it.msg;
    if (!seen.has(k)) seen.set(k, { ...it, count: 1 });
    else seen.get(k).count++;
  }
  const list = [...seen.values()];
  return { errors: list.filter((x) => x.level === "error"), warnings: list.filter((x) => x.level === "warn") };
}

const dataUrlToFile = (url, file) => fs.writeFile(file, Buffer.from(url.split(",")[1], "base64"));

/**
 * Check a scene list in `dir` (page/ and frames/ are written there).
 * Returns { W, H, holes, box, duration, frames, msAvg, msMax, errors, warnings,
 * storyboard: [{ kind, t, file }], changes: [{ t, file }] }.
 */
export async function checkSpec(spec, dir, { fontCache, step = 0.5, onProgress } = {}) {
  const R0 = await buildExplainerPage(spec, path.join(dir, "page"), { fontCache });
  const p = await openPage(path.join(dir, "page", "index.html"), R0.W, R0.H);
  try {
    await p.js("window.__exReady.then(() => true)");
    const info = await p.js("window.__exResolved");
    const fontOk = await p.js(`document.fonts.check('600 40px ${JSON.stringify(info.font)}')`);
    const times = new Set();
    for (let t = 0; t <= info.duration; t += step) times.add(+t.toFixed(3));
    const settledTimes = new Set();
    const storyboard = [];
    info.scenes.forEach((s, i) => {
      if (i > 0) times.add(+(s.start + 0.35).toFixed(3));
      const settled = +Math.max(s.start + 0.8, s.end - 0.25).toFixed(3);
      times.add(settled);
      settledTimes.add(settled);
      storyboard.push({ kind: s.kind, t: settled });
    });
    const issues = [], ms = [];
    const sorted = [...times].sort((a, b) => a - b);
    for (const [k, t] of sorted.entries()) {
      const f = await p.js(`window.__exCheck(${t})`);
      ms.push(f.ms);
      issues.push(...judge(f, info, settledTimes.has(t)));
      onProgress?.(k / sorted.length);
    }
    for (const e of p.consoleErrors) issues.push({ level: "error", msg: `page error: ${e}`, t: null });
    if (!fontOk) issues.push({ level: "error", msg: `the font "${info.font}" did not load`, t: null });
    await fs.mkdir(path.join(dir, "frames"), { recursive: true });
    for (const [i, sb] of storyboard.entries()) {
      sb.file = `frames/${String(i + 1).padStart(2, "0")}-${sb.kind}.jpg`;
      await dataUrlToFile(await p.js(`window.__exFrame(${sb.t})`), path.join(dir, sb.file));
    }
    const changes = [];
    for (const [i, sc] of info.scenes.entries()) {
      if (i === 0) continue;
      const t = +(sc.start + 0.3).toFixed(3);
      const file = `frames/change-${String(i + 1).padStart(2, "0")}.jpg`;
      await dataUrlToFile(await p.js(`window.__exFrame(${t})`), path.join(dir, file));
      changes.push({ t, file });
    }
    return {
      W: info.W, H: info.H, holes: info.holes, box: info.box, slots: info.slots, duration: info.duration,
      frames: times.size, msAvg: ms.reduce((a, b) => a + b, 0) / ms.length, msMax: Math.max(...ms),
      ...summarise(issues), storyboard, changes,
    };
  } finally {
    p.close();
  }
}

// ---- imported (atlas) pages -------------------------------------------------------

/**
 * Look inside an HTML explainer written in an atlas style: the canvas, its
 * size, DURATION and seek(). The page is loaded from its own folder only.
 */
export async function openImportedPage(htmlFile) {
  const p = await openPage(htmlFile, 1920, 1080, { untrusted: true });
  // give fonts and setup a moment; atlas pages await document.fonts.load first
  await p.js("new Promise((r) => setTimeout(r, 600)).then(() => document.fonts.ready).then(() => true)");
  const info = await p.js(`(() => {
    const cs = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height);
    const c = cs[0];
    return { ok: !!c && typeof window.seek === "function", W: c ? c.width : 0, H: c ? c.height : 0, duration: Number(window.DURATION) || 0, hasSound: typeof window.scoreSound === "function" };
  })()`);
  return { ...p, info };
}

/** Checks for an imported page: loads, seek works, draws fast enough, frames differ over time. */
export async function checkImported(htmlFile, dir, { tint } = {}) {
  const p = await openImportedPage(htmlFile);
  try {
    const issues = [];
    const { info } = p;
    if (!info.ok) issues.push({ level: "error", msg: "the page has no canvas or no window.seek(t)", t: null });
    if (!(info.duration > 0)) issues.push({ level: "error", msg: "the page does not set window.DURATION", t: null });
    const frames = [];
    let msMax = 0;
    if (info.ok && info.duration > 0) {
      await fs.mkdir(path.join(dir, "frames"), { recursive: true });
      const n = 4;
      for (let i = 0; i < n; i++) {
        const t = +((info.duration * (i + 0.6)) / (n + 0.2)).toFixed(2);
        const r = await p.js(`(() => { const t0 = performance.now(); window.seek(${t}); const ms = performance.now() - t0;
          const c = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0];
          return { ms, url: c.toDataURL("image/jpeg", 0.86) }; })()`);
        msMax = Math.max(msMax, r.ms);
        const file = `frames/${String(i + 1).padStart(2, "0")}.jpg`;
        await dataUrlToFile(r.url, path.join(dir, file));
        frames.push({ t, file });
      }
      if (msMax > SLOW_MS * 2) issues.push({ level: "warn", msg: `slowest frame took ${msMax.toFixed(0)} ms (rendering will be slow)`, t: null });
    }
    for (const e of p.consoleErrors) issues.push({ level: "error", msg: `page error: ${e}`, t: null });
    return { W: info.W, H: info.H, duration: info.duration, msMax, ...summarise(issues), storyboard: frames, tint: resolveTint(tint) };
  } finally {
    p.close();
  }
}

// ---- ffmpeg -------------------------------------------------------------------------

/** A full ffmpeg (PATH) when there is one, else the one Remotion ships (see electron/process/ffmpegPath.ts). */
export function ffmpegBin() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const r = spawnSync("ffmpeg", ["-version"], { windowsHide: true });
  if (r.status === 0) return "ffmpeg";
  try {
    return path.join(path.dirname(require_.resolve("@remotion/compositor-win32-x64-msvc/package.json")), "ffmpeg.exe");
  } catch {
    throw new Error("No ffmpeg found");
  }
}

export function runFfmpeg(args, signal) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegBin(), ["-y", "-v", "error", ...args], { windowsHide: true });
    let err = "";
    p.stderr.on("data", (d) => (err = (err + d).slice(-3000)));
    signal?.addEventListener("abort", () => p.kill());
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg failed (${c}): ${err}`))));
  });
}

/** Pipe frames (RGBA Uint8Arrays from getFrame(t)) into an MP4. */
async function encodeFrames({ W, H, fps, frames, getFrame, out, crf = 18, onProgress, signal }) {
  const enc = spawn(ffmpegBin(), ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(fps), "-i", "-",
    "-c:v", "libx264", "-crf", String(crf), "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] });
  let encErr = "";
  enc.stderr.on("data", (d) => (encErr = (encErr + d).slice(-3000)));
  const done = new Promise((res, rej) => enc.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg failed: " + encErr)))));
  for (let f = 0; f < frames; f++) {
    if (signal?.aborted) { enc.kill(); throw new Error("cancelled"); }
    const px = await getFrame(f / fps);
    if (!enc.stdin.write(Buffer.from(px.buffer, px.byteOffset, px.byteLength))) await new Promise((r) => enc.stdin.once("drain", r));
    if (f % 15 === 0) onProgress?.(f / frames);
  }
  enc.stdin.end();
  await done;
}

async function muxAudio(video, audio, out) {
  await runFfmpeg(["-i", video, "-i", audio, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out]);
}

// ---- sound effects -------------------------------------------------------------------

/** Where the shipped sound-effects library is (VIDEOFORGE_SFX_DIR overrides, for tests and other installs). */
export function sfxLibraryDir() {
  return process.env.VIDEOFORGE_SFX_DIR || path.join(ROOT, "sfx", "library");
}

/**
 * Mix the planned cues into one stereo track as long as the video: each cue's
 * file is started `lead` seconds before the cue time, so the sound is felt AT
 * the cue. Returns the wav path, or null when no cue's sound file exists.
 * (amix divides by its input count; volume=N undoes that, so each cue keeps
 * its own gain on every ffmpeg version.)
 */
export async function mixSfxTrack(cues, { dir = sfxLibraryDir(), duration, out }) {
  const usable = [];
  for (const c of cues) {
    const file = path.join(dir, `${c.sound}.wav`);
    try { await fs.access(file); usable.push({ ...c, file }); } catch { /* sound missing: skipped */ }
  }
  if (!usable.length) return null;
  const args = ["-f", "lavfi", "-t", String(duration), "-i", "anullsrc=r=44100:cl=stereo"];
  const parts = [];
  usable.forEach((c, i) => {
    const snd = SOUNDS[c.kind];
    args.push("-i", c.file);
    const startAt = c.t - snd.lead;
    const chain = ["aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo"];
    if (snd.reverse) chain.push("areverse");
    if (snd.skip) chain.push(`atrim=start=${snd.skip}`, "asetpts=PTS-STARTPTS");
    if (startAt < 0) chain.push(`atrim=start=${(-startAt).toFixed(3)}`, "asetpts=PTS-STARTPTS");
    if (snd.maxLen) chain.push(`atrim=end=${snd.maxLen}`, "asetpts=PTS-STARTPTS", `afade=t=out:st=${Math.max(0, snd.maxLen - 0.2)}:d=0.2`);
    if (snd.reverse) chain.push("afade=t=in:d=0.5");
    chain.push(`volume=${c.gain}`);
    const ms = Math.max(0, Math.round(startAt * 1000));
    chain.push(`adelay=${ms}|${ms}`);
    parts.push(`[${i + 1}:a]${chain.join(",")}[c${i}]`);
  });
  const ins = ["[0:a]", ...usable.map((_, i) => `[c${i}]`)].join("");
  parts.push(`${ins}amix=inputs=${usable.length + 1}:duration=first:dropout_transition=0,volume=${usable.length + 1},alimiter=limit=0.92[mix]`);
  args.push("-filter_complex", parts.join(";"), "-map", "[mix]", "-c:a", "pcm_s16le", out);
  await runFfmpeg(args);
  return out;
}

/** Narration (optional) and sound effects (optional) onto a silent video. */
async function muxTracks(video, { narration, effects, out }) {
  if (!effects) return muxAudio(video, narration, out);
  const args = ["-i", video, "-i", effects];
  if (narration) {
    args.push("-i", narration, "-filter_complex", "[1:a]volume=0.85[fx];[fx][2:a]amix=inputs=2:duration=longest:dropout_transition=0,volume=2[a]", "-map", "0:v", "-map", "[a]");
  } else args.push("-map", "0:v", "-map", "1:a");
  args.push("-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out);
  await runFfmpeg(args);
}

/**
 * Render a scene list to MP4. Also writes <out>.spots.json (where a puppet
 * render must put each face). Returns the resolved frame info.
 */
export async function renderSpec(spec, out, { fontCache, audio, crf, onProgress, signal, workDir } = {}) {
  const work = workDir ?? path.join(path.dirname(out), `.work-${path.basename(out, ".mp4")}`);
  await fs.mkdir(work, { recursive: true });
  const R = await buildExplainerPage(spec, path.join(work, "page"), { fontCache });
  const p = await openPage(path.join(work, "page", "index.html"), R.W, R.H);
  try {
    await p.js("window.__exReady.then(() => true)");
    const silent = path.join(work, "video.mp4");
    await encodeFrames({ W: R.W, H: R.H, fps: R.fps, frames: Math.round(R.duration * R.fps), getFrame: (t) => p.js(`window.__exRGBA(${t})`), out: silent, crf, onProgress, signal });
    // sound effects: planned from the scene list, mixed from the shipped library
    const plan = planSfx(spec);
    let effects = null, creditsFile = null;
    if (plan.cues.length) effects = await mixSfxTrack(plan.cues, { duration: R.duration, out: path.join(work, "sfx.wav") });
    if (effects) {
      await muxTracks(silent, { narration: audio, effects, out });
      creditsFile = out.replace(/\.mp4$/i, ".sound-credits.txt");
      await fs.writeFile(creditsFile, creditsText(plan.cues));
    } else if (audio) await muxAudio(silent, audio, out);
    else await fs.copyFile(silent, out);
    await fs.writeFile(out.replace(/\.mp4$/i, ".spots.json"), JSON.stringify({ format: spec.format, width: R.W, height: R.H, slots: R.slots }, null, 2));
    return { ...R, sfx: { planned: plan.cues.length, mixed: effects ? plan.cues.length : 0, on: plan.on, cues: plan.cues, creditsFile, libraryMissing: plan.cues.length > 0 && !effects } };
  } finally {
    p.close();
    await fs.rm(work, { recursive: true, force: true });
  }
}

/** Render an imported (atlas-style) page to MP4, with an optional tint. */
export async function renderImported(htmlFile, out, { fps = 30, tint, audio, crf, onProgress, signal } = {}) {
  const p = await openImportedPage(htmlFile);
  try {
    const { info } = p;
    if (!info.ok || !(info.duration > 0)) throw new Error("This page has no canvas, seek() or DURATION, so it cannot be rendered");
    const T = resolveTint(tint);
    const silent = out.replace(/\.mp4$/i, ".silent.mp4");
    await encodeFrames({
      W: info.W, H: info.H, fps, frames: Math.round(info.duration * fps), out: silent, crf, onProgress, signal,
      getFrame: async (t) => {
        const px = await p.js(`(() => { window.seek(${t}); const c = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0];
          return new Uint8Array(c.getContext("2d").getImageData(0, 0, c.width, c.height).data.buffer); })()`);
        if (T) tintPixels(px, T);
        return px;
      },
    });
    if (audio) await muxAudio(silent, audio, out);
    else await fs.rename(silent, out);
    await fs.rm(silent, { force: true });
    return info;
  } finally {
    p.close();
  }
}

// ---- exports --------------------------------------------------------------------------

/** One frame as a PNG. */
export async function stillPng(spec, t, out, { fontCache } = {}) {
  const work = out + ".work";
  const R = await buildExplainerPage(spec, work, { fontCache });
  const p = await openPage(path.join(work, "index.html"), R.W, R.H);
  try {
    await p.js("window.__exReady.then(() => true)");
    const url = await p.js(`(() => { window.seek(${t}); return document.getElementById("ex").toDataURL("image/png"); })()`);
    await dataUrlToFile(url, out);
  } finally {
    p.close();
    await fs.rm(work, { recursive: true, force: true });
  }
}

/** A short clip cut from a rendered MP4 (re-encoded so it starts on any frame). */
export async function extractClip(mp4, out, { from, to }) {
  if (!(to > from)) throw new Error("the clip must end after it starts");
  await runFfmpeg(["-ss", String(from), "-to", String(to), "-i", mp4, "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", out]);
}

export const GIF_LIMITS = { maxSeconds: 15, maxWidth: 720, fps: 12 };

/**
 * A GIF drawn straight from the scene list, with the background held still:
 * a moving background changes every pixel of every frame, which made a 5 s GIF
 * 18 MB (20 Oct 2026). Held still, only the story moves and the file shrinks.
 */
export async function gifFromSpec(spec, out, { fontCache, from = 0, to, width = 540, fps = 12 } = {}) {
  const calm = { ...spec, calm: true };
  const work = out + ".work";
  await fs.mkdir(work, { recursive: true });
  const R = await buildExplainerPage(calm, path.join(work, "page"), { fontCache });
  const p = await openPage(path.join(work, "page", "index.html"), R.W, R.H);
  try {
    await p.js("window.__exReady.then(() => true)");
    const end = Math.min(to ?? from + GIF_LIMITS.maxSeconds, from + GIF_LIMITS.maxSeconds, R.duration);
    const f = Math.min(fps, 20);
    const mid = path.join(work, "range.mp4");
    await encodeFrames({ W: R.W, H: R.H, fps: f, frames: Math.max(1, Math.round((end - from) * f)), getFrame: (t) => p.js(`window.__exRGBA(${from + t})`), out: mid, crf: 12 });
    await makeGif(mid, out, { from: 0, to: end - from, width, fps: f });
  } finally {
    p.close();
    await fs.rm(work, { recursive: true, force: true });
  }
}

/** A GIF from a range of a rendered MP4: two-pass palette so colours stay clean. */
export async function makeGif(mp4, out, { from = 0, to, width = 720, fps = 15 } = {}) {
  const len = Math.min((to ?? from + GIF_LIMITS.maxSeconds) - from, GIF_LIMITS.maxSeconds);
  const w = Math.min(width, GIF_LIMITS.maxWidth);
  const f = Math.min(fps, 20);
  await runFfmpeg(["-ss", String(from), "-t", String(len), "-i", mp4, "-filter_complex",
    `fps=${f},scale=${w}:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`, "-loop", "0", out]);
}

/**
 * Three thumbnails (1280×720 JPGs) for YouTube: the title, the key number (or
 * first chart) and the takeaway, drawn at 16:9 whatever the video's shape.
 */
export async function thumbnails(spec, dir, { fontCache, prefix = "thumbnail" } = {}) {
  const wide = { ...spec, format: "16:9", puppets: undefined, slots: undefined };
  const work = path.join(dir, ".thumbs-work");
  const R = await buildExplainerPage(wide, work, { fontCache });
  const p = await openPage(path.join(work, "index.html"), R.W, R.H);
  const pick = (kinds) => R.scenes.find((s) => kinds.includes(s.kind));
  const chosen = [pick(["title"]), pick(["number", "bars"]), pick(["takeaway"])].filter(Boolean);
  const files = [];
  try {
    await p.js("window.__exReady.then(() => true)");
    for (const [i, s] of chosen.entries()) {
      const t = Math.max(s.start + 0.8, s.end - 0.25);
      const url = await p.js(`(() => { window.seek(${t}); const src = document.getElementById("ex");
        const c = document.createElement("canvas"); c.width = 1280; c.height = 720; c.getContext("2d").drawImage(src, 0, 0, 1280, 720);
        return c.toDataURL("image/jpeg", 0.9); })()`);
      const file = path.join(dir, `${prefix}-thumbnail-${i + 1}-${s.kind}.jpg`);
      await dataUrlToFile(url, file);
      files.push(file);
    }
  } finally {
    p.close();
    await fs.rm(work, { recursive: true, force: true });
  }
  return files;
}

// ---- puppet-spot demo -------------------------------------------------------------------

/** A PNG mask (white = keep) for a face in a spot, using pngjs. */
async function maskPng(file, size, shape) {
  const { PNG } = require_("pngjs");
  const png = new PNG({ width: size, height: size });
  const r = shape === "rounded" ? size * 0.18 : 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let inside;
    if (shape === "circle") inside = (x + 0.5 - size / 2) ** 2 + (y + 0.5 - size / 2) ** 2 <= (size / 2) ** 2;
    else {
      const dx = Math.max(r - x, 0, x - (size - 1 - r)), dy = Math.max(r - y, 0, y - (size - 1 - r));
      inside = dx * dx + dy * dy <= r * r;
    }
    const i = (y * size + x) * 4;
    png.data[i] = png.data[i + 1] = png.data[i + 2] = inside ? 255 : 0;
    png.data[i + 3] = 255;
  }
  await fs.writeFile(file, PNG.sync.write(png));
}

/** Demo only: sample faces laid into the spots, to show how puppets sit on the explainer. */
export async function withSampleFaces(video, holes, out) {
  const work = out + ".work";
  await fs.mkdir(work, { recursive: true });
  const faces = ["face-kaiti.png", "face-serifis.png", "face-tsika.png"].map((f) => path.join(ROOT, "docs", "design", f));
  const args = ["-i", video];
  const chain = [];
  let last = "0:v";
  for (const [i, h] of holes.entries()) {
    const size = Math.round(h.w / 1.2); // the face itself, inside the halo padding
    const mask = path.join(work, `mask-${i}.png`);
    await maskPng(mask, size, h.shape);
    args.push("-i", faces[i % faces.length], "-i", mask);
    const f = 1 + i * 2, m = 2 + i * 2;
    // keep the face's own transparency AND cut it to the spot's shape: multiply the two alphas
    chain.push(`[${f}:v]scale=${size}:${size}:force_original_aspect_ratio=increase,crop=${size}:${size},format=rgba,split[fc${i}][fx${i}]`);
    chain.push(`[fx${i}]alphaextract[fa0${i}]`, `[${m}:v]format=gray[m${i}]`, `[fa0${i}][m${i}]blend=all_mode=multiply[al${i}]`, `[fc${i}][al${i}]alphamerge[fa${i}]`);
    chain.push(`[${last}][fa${i}]overlay=${Math.round(h.cx - size / 2)}:${Math.round(h.cy - size / 2)}[v${i}]`);
    last = `v${i}`;
  }
  args.push("-filter_complex", chain.join(";"), "-map", `[${last}]`, "-map", "0:a?", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy", out);
  try { await runFfmpeg(args); } finally { await fs.rm(work, { recursive: true, force: true }); }
}
