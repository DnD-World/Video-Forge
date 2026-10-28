// ---------------------------------------------------------------------------
// Animated pop-ups beside the speakers (src/lib/motion/popTracks.ts), one
// full-frame canvas over the stage. Placed above the speaker's head, to the
// side away from the frame's edge; a second pop on the same line sits beside
// the first. The same component in the preview and the render.
//
// Relative imports only (no "@/"): Remotion's own webpack renders this too.
// ---------------------------------------------------------------------------

import { useLayoutEffect, useRef } from "react";
import { drawPop } from "../../../characters/icons/icons.mjs";
import type { SpeakerPop } from "../../lib/motion/popTracks";

interface Placed { id: string; x: number; y: number; size: number }

export function PopLayer({ pops, speakers, width, height, timeMs }: { pops: SpeakerPop[]; speakers: Placed[]; width: number; height: number; timeMs: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = pops.filter((p) => timeMs >= p.startMs && timeMs < p.endMs);
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const W = Math.max(2, Math.round(width * dpr)), H = Math.max(2, Math.round(height * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const p of live) {
      const sp = speakers.find((s) => s.id === p.speakerId);
      if (!sp) continue;
      const box = sp.size * W;
      const side = sp.x < 0.5 ? 1 : -1; // towards the middle of the frame
      const size = Math.max(W * 0.06, box * 0.32);
      const x = sp.x * W + side * (box * 0.42 + p.slot * size * 1.15);
      const y = sp.y * H - box * 0.42;
      drawPop(ctx, p, Math.min(W - size * 0.7, Math.max(size * 0.7, x)), Math.max(size * 0.7, y), size, timeMs);
    }
  });
  if (!pops.length) return null;
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 11 }} />;
}
