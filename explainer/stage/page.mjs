// ---------------------------------------------------------------------------
// Browser entry for an explainer page (bundled to ex.js by tools/lib/explainerPage.mjs).
//
// Exposes, for the renderer and the checking page:
//   window.seek(t), window.DURATION         draw any frame (pure function of t)
//   window.__timelines[id]                  HyperFrames' seekable timeline
//   window.__exReady                        resolves when the fonts are in
//   window.__exCheck(t)                     { ms, log, spotDiff } for the checks
// ---------------------------------------------------------------------------

import { createStage } from "./stage.mjs";
import { holePath } from "../core/frame.mjs";

const { spec, id } = window.__EX__;
// Every layer is drawn by the same (software) rasteriser as the main canvas.
// Mixing GPU and CPU canvases gives edges a shade apart, which made the
// "spots stay empty" check see differences that were not there (20 Oct 2026),
// and would make two renders of the same frame differ.
const layer = (W, H) => {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  cv.getContext("2d", { willReadFrequently: true });
  return cv;
};
const stage = createStage(spec, layer);
const { R } = stage;
const canvas = document.getElementById("ex");
canvas.width = R.W;
canvas.height = R.H;
const ctx = canvas.getContext("2d", { willReadFrequently: true });

let now = 0;
let lastLog = [];
const draw = (t) => {
  now = t;
  lastLog = stage.draw(ctx, t);
};

window.DURATION = R.duration;
window.seek = (t) => draw(t);
window.__exResolved = { font: R.font, W: R.W, H: R.H, fps: R.fps, duration: R.duration, holes: R.holes, box: R.box, slots: R.slots, scenes: R.scenes.map((s) => ({ kind: s.kind, start: s.start, end: s.end })) };

// Load every face the text needs: each alphabet is its own file (unicode-range),
// so the sample is the actual characters of this explainer.
const sampleText = [...new Set(JSON.stringify(spec.scenes) + "0123456789AaΩω")].join("");
window.__exReady = Promise.all([400, 500, 600, 700].flatMap((w) => [R.font, "Inter"].map((f) => document.fonts.load(`${w} 40px "${f}"`, sampleText))))
  .then(() => document.fonts.ready)
  .then(() => draw(now));
draw(0);

// ---- checks ---------------------------------------------------------------------
const bgCanvas = layer(R.W, R.H);
const bgCtx = bgCanvas.getContext("2d", { willReadFrequently: true });

/** Share of puppet-spot pixels that differ from pure background (0 = spots empty). */
function spotDiff(t) {
  if (!R.holes.length) return 0;
  stage.draw(bgCtx, t, { mode: "background" });
  const mask = layer(R.W, R.H), m = mask.getContext("2d", { willReadFrequently: true });
  m.beginPath();
  for (const h of R.holes) holePath(m, h);
  m.fillStyle = "#fff";
  m.fill();
  // shrink the mask by a few pixels: the clip edge itself is anti-aliased
  m.globalCompositeOperation = "destination-out";
  m.lineWidth = 6;
  m.stroke();
  const a = ctx.getImageData(0, 0, R.W, R.H).data, b = bgCtx.getImageData(0, 0, R.W, R.H).data, mk = m.getImageData(0, 0, R.W, R.H).data;
  let n = 0, bad = 0;
  const badAt = (window.__exSpotBad = []);
  for (let i = 0; i < a.length; i += 4) {
    if (mk[i + 3] < 250) continue; // skip the anti-aliased rim
    n++;
    if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 12) {
      if (bad < 40) badAt.push([(i / 4) % R.W, Math.floor(i / 4 / R.W), a[i], a[i + 1], a[i + 2], b[i], b[i + 1], b[i + 2]]);
      bad++;
    }
  }
  return n ? bad / n : 0;
}

window.__exCheck = (t) => {
  const t0 = performance.now();
  draw(t);
  const ms = performance.now() - t0;
  return { t, ms, log: lastLog, spotDiff: spotDiff(t) };
};
/** Raw RGBA pixels of frame t, for the renderer (tools/explainer-render.mjs). */
window.__exRGBA = (t) => {
  draw(t);
  return new Uint8Array(ctx.getImageData(0, 0, R.W, R.H).data.buffer);
};
window.__exFrame = (t) => {
  draw(t);
  return canvas.toDataURL("image/jpeg", 0.86);
};

// ---- HyperFrames timeline (same contract as remotion/hf/hfEntry.tsx) -----------
const fps = R.fps, duration = R.duration;
const timeline = {
  pause: () => timeline,
  play: () => timeline,
  paused: () => true,
  isActive: () => false,
  duration: () => duration,
  totalDuration: () => duration,
  progress: () => now / duration,
  time(t) {
    if (t === undefined) return now;
    draw(Math.round(t * fps) / fps);
    return timeline;
  },
  totalTime(t) {
    return timeline.time(t);
  },
  seek(t) {
    draw(Math.round(t * fps) / fps);
    return timeline;
  },
};
window.__exTimeline = timeline;
window.__timelines = window.__timelines || {};
window.__timelines[id] = timeline;
