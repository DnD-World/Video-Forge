// ---------------------------------------------------------------------------
// The handful of Remotion pieces our composition uses, re-made for
// HyperFrames (Ak's decision, 11 Oct 2026 — docs/research/hyperframes-trial.md).
//
// The composition (remotion/VideoComposition.tsx and everything it draws from
// src/) is written as a pure function of the frame number. That is exactly
// what HyperFrames can drive: it seeks a "timeline" to a time, we turn the
// time into a frame and redraw. So the composition is kept as it is, and this
// file stands in for `remotion` when the HyperFrames page is bundled
// (esbuild alias, see electron/render/hyperframes/renderHyperframes.ts).
//
// MEDIA IS NOT HERE. Video and audio play as HyperFrames' own clips in the
// page around this React layer — it extracts video frames exactly, which a
// <video> inside React cannot promise — and the soundtrack is mixed by
// ffmpeg before the render. So <Audio> and <OffthreadVideo> render nothing,
// and the composition is told `nativeMedia` so it leaves those layers out.
// ---------------------------------------------------------------------------

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

export interface VideoConfig {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

const FrameCtx = createContext(0);
const ConfigCtx = createContext<VideoConfig>({ width: 1080, height: 1920, fps: 30, durationInFrames: 1 });

export function FrameRoot({ frame, config, children }: { frame: number; config: VideoConfig; children: ReactNode }) {
  return (
    <ConfigCtx.Provider value={config}>
      <FrameCtx.Provider value={frame}>{children}</FrameCtx.Provider>
    </ConfigCtx.Provider>
  );
}

export const useCurrentFrame = () => useContext(FrameCtx);
export const useVideoConfig = () => useContext(ConfigCtx);

export function AbsoluteFill({ style, children, ...rest }: { style?: CSSProperties; children?: ReactNode; [k: string]: unknown }) {
  return (
    <div {...rest} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", ...style }}>
      {children}
    </div>
  );
}

/** Shows its children only inside [from, from + durationInFrames), with the
 *  frame they see counted from their own start — Remotion's semantics. */
export function Sequence({
  from = 0,
  durationInFrames = Infinity,
  layout,
  style,
  children,
}: {
  from?: number;
  durationInFrames?: number;
  layout?: "absolute-fill" | "none";
  name?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const frame = useCurrentFrame();
  if (frame < from || frame >= from + durationInFrames) return null;
  const inner = <FrameCtx.Provider value={frame - from}>{children}</FrameCtx.Provider>;
  return layout === "none" ? inner : <AbsoluteFill style={style}>{inner}</AbsoluteFill>;
}

export function Loop({ durationInFrames, children }: { durationInFrames: number; children?: ReactNode }) {
  const frame = useCurrentFrame();
  return <FrameCtx.Provider value={durationInFrames > 0 ? frame % durationInFrames : frame}>{children}</FrameCtx.Provider>;
}

/** Files sit next to index.html in the page's folder. */
export const staticFile = (name: string) => name;

export function Img(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} />;
}

/** Media is native in the page; see the header. */
export const Audio = (_: unknown) => null;
export const OffthreadVideo = (_: unknown) => null;
export const Video = OffthreadVideo;

// ---- loading gates ---------------------------------------------------------
// The composition holds the first frame until fonts, waveform data and face
// images are in. HyperFrames waits for the page to say it is ready before it
// captures anything, so every open handle is counted and the page entry
// (hfEntry.tsx) waits for the count to reach zero.
let open = 0;
let waiters: (() => void)[] = [];
export function delayRender(_label?: string): number {
  open++;
  return open;
}
export function continueRender(_handle: number) {
  open = Math.max(0, open - 1);
  if (open === 0) {
    const w = waiters;
    waiters = [];
    w.forEach((f) => f());
  }
}
export const allLoaded = () => (open === 0 ? Promise.resolve() : new Promise<void>((r) => waiters.push(r)));

// ---- unused at render time, present so imports resolve ----
export const registerRoot = (_: unknown) => {};
export const Composition = (_: unknown) => null;
export const interpolate = (x: number, inR: number[], outR: number[]) => {
  const t = Math.max(0, Math.min(1, (x - inR[0]) / (inR[1] - inR[0])));
  return outR[0] + (outR[1] - outR[0]) * t;
};
