// ---------------------------------------------------------------------------
// Render with HyperFrames instead of Remotion (Ak, 11 Oct 2026).
//
// WHY. Remotion is source-available and paid for companies of four or more
// that build video tools; HyperFrames is Apache-2.0. A trial
// (docs/research/hyperframes-trial.md) showed our frame-driven React plugs
// straight in.
//
// THE SHAPE OF A RENDER. renderVideo.ts stages every asset into one folder
// and builds the composition's props exactly as it always has. This file
// turns that folder into a HyperFrames project and renders it:
//
//   bg-track.mp4   the background clips, looped and crossfaded by ffmpeg —
//                  native video, because HyperFrames extracts video frames
//                  exactly and a <video> inside React cannot promise that
//   banner.mp4     the banner, looped to the video's length, likewise
//   mix.wav        the whole soundtrack — narration, music ducked under the
//                  voices by the same musicGainAt the Remotion path used,
//                  and every sound effect at its own volume
//   vf.js          the React composition (remotion/hf/hfEntry.tsx) bundled
//                  with a stand-in for `remotion` (remotion/hf/remotionShim.tsx)
//   index.html     the layers in order: footage, React (faces, waveforms,
//                  subtitles), intro clip, banner, logo; plus the soundtrack
//
// HyperFrames' CLI does the rest. It runs on the app's own Node (Electron 43
// carries Node 24) and with its usage telemetry switched OFF.
// ---------------------------------------------------------------------------

import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { ffmpegBin } from "../../process/ffmpegPath";
import { childEnv } from "../../net/childEnv";
import { backgroundTiming } from "../../../src/lib/background/backgroundTiming";
import { musicGainAt } from "../../../src/lib/audio/ducking";
import { colorLookCss } from "../../../src/lib/background/colorLook";
import type { RenderProps } from "../../../remotion/types";

const require_ = createRequire(import.meta.url);

export interface HyperframesInput {
  /** Folder already holding every asset the props name (renderVideo stages it). */
  dir: string;
  props: RenderProps;
  /** Where the entry lives in the app: <appRoot>/remotion/hf/hfEntry.tsx. */
  appRoot: string;
  crf: number;
  outputPath: string;
  onProgress: (fraction: number, note: string) => void;
  signal?: AbortSignal;
}

const ID = "video-forge";

function run(cmd: string, args: string[], opts: { env?: NodeJS.ProcessEnv; onLine?: (l: string) => void; signal?: AbortSignal } = {}) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { env: opts.env ?? process.env, windowsHide: true });
    let tail = "";
    const eat = (d: Buffer) => {
      const s = d.toString();
      tail = (tail + s).slice(-4000);
      if (opts.onLine) for (const l of s.split(/\r?\n/)) if (l.trim()) opts.onLine(l);
    };
    p.stdout.on("data", eat);
    p.stderr.on("data", eat);
    opts.signal?.addEventListener("abort", () => p.kill());
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} failed (${code}): ${tail.slice(-800)}`))));
  });
}

// ---- background track --------------------------------------------------------
async function buildBackgroundTrack(input: HyperframesInput): Promise<{ file: string; startSec: number; durSec: number } | null> {
  const { props, dir } = input;
  const timing = backgroundTiming(props.backgrounds ?? [], props.backgroundCrossfadeMs ?? 0, props.fps);
  if (timing.slots.length === 0) return null;
  const W = props.width, H = props.height, fps = props.fps;
  const first = timing.slots[0];
  const args: string[] = ["-y", "-v", "error"];
  const chains: string[] = [];
  timing.slots.forEach((slot, i) => {
    if (slot.loopInFrames > 0) args.push("-stream_loop", "-1");
    args.push("-i", path.join(dir, props.backgrounds[slot.index].fileName));
    const d = (slot.durationInFrames / fps).toFixed(4);
    // object-fit: cover, at the composition's own size and frame rate
    chains.push(
      `[${i}:v]fps=${fps},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,` +
        `trim=duration=${d},setpts=PTS-STARTPTS,format=yuv420p[v${i}]`
    );
  });
  let last = "v0";
  const T = timing.transitionInFrames / fps;
  for (let i = 1; i < timing.slots.length; i++) {
    const offset = ((timing.slots[i].startFrame - first.startFrame) / fps).toFixed(4);
    const out = `x${i}`;
    chains.push(
      T > 0
        ? `[${last}][v${i}]xfade=transition=fade:duration=${T.toFixed(4)}:offset=${offset}[${out}]`
        : `[${last}][v${i}]concat=n=2:v=1:a=0[${out}]`
    );
    last = out;
  }
  const lastSlot = timing.slots[timing.slots.length - 1];
  const durSec = (lastSlot.startFrame + lastSlot.durationInFrames - first.startFrame) / fps;
  const file = "bg-track.mp4";
  args.push("-filter_complex", chains.join(";"), "-map", `[${last}]`, "-an", "-c:v", "libx264", "-crf", "16", "-preset", "veryfast", "-r", String(fps), path.join(dir, file));
  await run(ffmpegBin(), args, { signal: input.signal });
  return { file, startSec: first.startFrame / fps, durSec };
}

// ---- banner ------------------------------------------------------------------
async function buildBanner(input: HyperframesInput, totalSec: number): Promise<string | null> {
  const b = input.props.bannerVideo;
  if (!b) return null;
  const file = "banner-loop.mp4";
  await run(ffmpegBin(), ["-y", "-v", "error", "-stream_loop", "-1", "-i", path.join(input.dir, b.fileName),
    "-t", totalSec.toFixed(3), "-an", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-r", String(input.props.fps),
    path.join(input.dir, file)], { signal: input.signal });
  return file;
}

// ---- soundtrack -------------------------------------------------------------
async function buildMix(input: HyperframesInput, totalSec: number): Promise<string | null> {
  const { props, dir } = input;
  const inputs: string[] = [];
  const parts: string[] = [];
  const labels: string[] = [];
  let n = 0;
  const RATE = 48000;

  if (props.audioFileName) {
    inputs.push("-i", path.join(dir, props.audioFileName));
    parts.push(`[${n}:a]aresample=${RATE},aformat=channel_layouts=stereo[a${n}]`);
    labels.push(`[a${n}]`);
    n++;
  }

  if (props.musicFileName && (props.musicVolume ?? 0) > 0) {
    // The duck, as an envelope: one gain value per frame, written as a tiny
    // mono track and multiplied into the music — the same musicGainAt the
    // Remotion path evaluated frame by frame.
    const ENV_RATE = 4000;
    const samples = Math.ceil(totalSec * ENV_RATE);
    const env = Buffer.alloc(samples * 4);
    for (let i = 0; i < samples; i++) {
      env.writeFloatLE(musicGainAt(props.analysis, (i / ENV_RATE) * 1000, props.musicVolume, props.musicDuck ?? 0), i * 4);
    }
    const envFile = path.join(dir, "duck-envelope.f32");
    await fsp.writeFile(envFile, env);
    inputs.push("-stream_loop", "-1", "-i", path.join(dir, props.musicFileName));
    const m = n++;
    inputs.push("-f", "f32le", "-ar", String(ENV_RATE), "-ac", "1", "-i", envFile);
    const e = n++;
    parts.push(
      `[${m}:a]aresample=${RATE},aformat=channel_layouts=stereo,atrim=duration=${totalSec.toFixed(3)}[m${m}]`,
      `[${e}:a]aresample=${RATE},aformat=channel_layouts=stereo[e${e}]`,
      `[m${m}][e${e}]amultiply[a${m}]`
    );
    labels.push(`[a${m}]`);
  }

  for (const s of props.sfx ?? []) {
    inputs.push("-i", path.join(dir, s.fileName));
    const ms = Math.max(0, Math.round(s.atMs));
    parts.push(`[${n}:a]aresample=${RATE},aformat=channel_layouts=stereo,volume=${s.volume},adelay=${ms}|${ms}[a${n}]`);
    labels.push(`[a${n}]`);
    n++;
  }

  if (labels.length === 0) return null;
  const file = "mix.wav";
  parts.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=duration=${totalSec.toFixed(3)}[out]`);
  await run(ffmpegBin(), ["-y", "-v", "error", ...inputs, "-filter_complex", parts.join(";"), "-map", "[out]", "-c:a", "pcm_s16le", path.join(dir, file)], { signal: input.signal });
  return file;
}

// ---- the page ----------------------------------------------------------------
async function bundleEntry(input: HyperframesInput) {
  const esbuild = require_("esbuild") as typeof import("esbuild");
  const hf = path.join(input.appRoot, "remotion", "hf");
  await esbuild.build({
    entryPoints: [path.join(hf, "hfEntry.tsx")],
    bundle: true,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    minify: true,
    outfile: path.join(input.dir, "vf.js"),
    define: { "process.env.NODE_ENV": '"production"' },
    alias: {
      remotion: path.join(hf, "remotionShim.tsx"),
      "@remotion/transitions": path.join(hf, "transitionsShim.tsx"),
      "@remotion/transitions/fade": path.join(hf, "transitionsShim.tsx"),
    },
    logLevel: "silent",
  });
}

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function writePage(input: HyperframesInput, parts: { bg: Awaited<ReturnType<typeof buildBackgroundTrack>>; banner: string | null; mix: string | null; totalSec: number }) {
  const { props } = input;
  const W = props.width, H = props.height, T = parts.totalSec.toFixed(4);
  const band = props.backgroundBand;
  const blurPx = (props.backgroundBlur ?? 0) * W;
  const bgFilter = [blurPx > 0 ? `blur(${blurPx}px)` : "", colorLookCss(props.backgroundColorLook)].filter(Boolean).join(" ");
  const bgWrap = band
    ? `top:${band.top * 100}%;height:${(band.bottom - band.top) * 100}%;bottom:auto;overflow:hidden;` +
      `-webkit-mask-image:linear-gradient(to bottom,transparent 0%,black 12%,black 88%,transparent 100%);mask-image:linear-gradient(to bottom,transparent 0%,black 12%,black 88%,transparent 100%);`
    : "";
  const layers: string[] = [];
  if (parts.bg) {
    // The React layer draws the dim over this exactly as BackgroundLayer did.
    layers.push(
      `<div class="vf-layer" style="${bgWrap}"><video id="vf-bg" class="clip" src="${parts.bg.file}" data-start="${parts.bg.startSec.toFixed(4)}" data-duration="${parts.bg.durSec.toFixed(4)}" data-track-index="0" muted playsinline ` +
        `style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;${bgFilter ? `filter:${bgFilter};` : ""}${blurPx > 0 ? "transform:scale(1.1);" : ""}"></video></div>`
    );
  }
  layers.push(`<div id="vf-react-clip" class="clip" data-start="0" data-duration="${T}" data-track-index="1"><div id="vf-react" style="position:absolute;inset:0"></div></div>`);
  const intro = props.introOverlay;
  if (intro) {
    layers.push(
      `<video id="vf-intro" class="clip" src="${attr(intro.fileName)}" data-start="0" data-duration="${(intro.durationMs / 1000).toFixed(4)}" data-track-index="2" muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000"></video>`
    );
  }
  const b = props.bannerVideo;
  if (b && parts.banner) {
    const keep = 1 - b.cropTop - b.cropBottom;
    const sourceH = W * (9 / 16);
    layers.push(
      `<div class="vf-layer" style="top:auto;height:${sourceH * keep}px;overflow:hidden"><video id="vf-banner" class="clip" src="${parts.banner}" data-start="0" data-duration="${T}" data-track-index="3" muted playsinline ` +
        `style="position:absolute;left:0;width:100%;height:${sourceH}px;top:${-sourceH * b.cropTop}px;object-fit:cover"></video></div>`
    );
  }
  const logo = props.logo;
  if (logo) {
    const m = logo.margin * W;
    // Same placement rules as the composition's own <Img>.
    const pos =
      logo.position === "watermark"
        ? "left:50%;top:50%;transform:translate(-50%,-50%);"
        : logo.position === "bottom-center"
        ? `left:50%;bottom:${m}px;transform:translateX(-50%);`
        : `${logo.position.startsWith("top") ? `top:${m}px;` : `bottom:${m}px;`}${logo.position.endsWith("left") ? `left:${m}px;` : `right:${m}px;`}`;
    layers.push(`<img id="vf-logo" src="${attr(logo.fileName)}" alt="" style="position:absolute;width:${W * logo.size}px;opacity:${logo.opacity};${pos}">`);
  }
  if (parts.mix) layers.push(`<audio id="vf-mix" src="${parts.mix}" data-start="0" data-duration="${T}" data-track-index="4"></audio>`);

  const data = { props: { ...props, nativeMedia: true }, config: { width: W, height: H, fps: props.fps, durationInFrames: Math.max(1, Math.round(props.durationSec * props.fps)) }, id: ID };
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  html,body{margin:0;background:#0b0b0d}
  #stage{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#0b0b0d}
  .vf-layer{position:absolute;left:0;right:0;top:0;bottom:0}
  #vf-react-clip{position:absolute;inset:0}
</style></head>
<body>
<div id="stage" data-composition-id="${ID}" data-start="0" data-width="${W}" data-height="${H}" data-duration="${T}" data-fps="${props.fps}">
${layers.join("\n")}
</div>
<script>window.__VF__ = ${JSON.stringify(data).replace(/</g, "\\u003c")};</script>
<script src="vf.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  window.__timelines["${ID}"] = window.__vfTimeline;
</script>
</body></html>`;
}

// ---- the render --------------------------------------------------------------
export async function renderHyperframes(input: HyperframesInput): Promise<void> {
  const { props, onProgress } = input;
  const totalSec = Math.max(1, Math.round(props.durationSec * props.fps)) / props.fps;

  onProgress(0.02, "Building the background track…");
  const bg = await buildBackgroundTrack(input);
  onProgress(0.08, "Looping the banner…");
  const banner = await buildBanner(input, totalSec);
  onProgress(0.12, "Mixing the soundtrack…");
  const mix = await buildMix(input, totalSec);
  onProgress(0.16, "Building the page…");
  await bundleEntry(input);
  await fsp.writeFile(path.join(input.dir, "index.html"), writePage(input, { bg, banner, mix, totalSec }));

  onProgress(0.2, "Rendering frames…");
  const cli = require_.resolve("hyperframes/bin/hyperframes.mjs");
  await run(process.execPath, [cli, "render", input.dir, "--output", input.outputPath, "--fps", String(props.fps), "--crf", String(input.crf), "--quiet"], {
    // childEnv() carries the no-update / no-telemetry switches (it is the one
    // place engine environments are set).
    env: childEnv({ ELECTRON_RUN_AS_NODE: "1" }),
    signal: input.signal,
    onLine: (l) => {
      const m = l.match(/@hf-progress (\{.*\})/);
      if (m) {
        try {
          const p = JSON.parse(m[1]);
          onProgress(0.2 + 0.8 * Math.min(1, (p.pct ?? 0) / 100), p.code === "assemble" ? "Assembling…" : "Rendering frames…");
        } catch { /* a malformed progress line is not worth failing a render for */ }
      }
    },
  });
}
