// ---------------------------------------------------------------------------
// The React layer of a HyperFrames render.
//
// renderHyperframes.ts writes an index.html with the composition's props in
// `window.__VF__`, this file bundled beside it, and native clips around it.
// HyperFrames seeks `window.__timelines[id]`; that object turns the time into
// a frame and redraws synchronously, so the pixels it captures are exactly
// the composition at that frame.
// ---------------------------------------------------------------------------

import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { VideoComposition } from "../VideoComposition";
import { FrameRoot, allLoaded, type VideoConfig } from "./remotionShim";
import type { RenderProps } from "../types";

declare global {
  interface Window {
    __VF__: { props: RenderProps; config: VideoConfig; id: string };
    __vfTimeline: unknown;
    __vfLoaded: Promise<void>;
  }
}

const { props, config } = window.__VF__;
const root = createRoot(document.getElementById("vf-react")!);
let frame = 0;

const draw = (f: number) => {
  frame = Math.max(0, Math.min(config.durationInFrames - 1, f));
  flushSync(() =>
    root.render(
      <FrameRoot frame={frame} config={config}>
        <VideoComposition {...props} nativeMedia />
      </FrameRoot>
    )
  );
};
draw(0);

// Fonts, waveform data and face images register loading handles on the first
// draw; the page is not "ready" until all of them are in.
window.__vfLoaded = allLoaded().then(() => document.fonts.ready).then(() => draw(frame));

const seconds = () => frame / config.fps;
const duration = config.durationInFrames / config.fps;
const timeline = {
  pause: () => timeline,
  play: () => timeline,
  paused: () => true,
  isActive: () => false,
  duration: () => duration,
  totalDuration: () => duration,
  progress: () => seconds() / duration,
  time(t?: number) {
    if (t === undefined) return seconds();
    draw(Math.round(t * config.fps));
    return timeline;
  },
  totalTime(t?: number) {
    return timeline.time(t);
  },
  seek(t: number) {
    draw(Math.round(t * config.fps));
    return timeline;
  },
};
window.__vfTimeline = timeline;
