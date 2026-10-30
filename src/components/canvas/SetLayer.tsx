// ---------------------------------------------------------------------------
// A set (characters/sets/sets.mjs) behind or in front of the speakers: the
// studio wall and screens behind, the desk / table / podium in front. The
// same component in the preview and the render, a pure function of the
// frame's time, so both draw the same pixels.
//
// Relative imports only (no "@/"): Remotion's own webpack renders this too.
// ---------------------------------------------------------------------------

import { useLayoutEffect, useRef } from "react";
import { SETS } from "../../../characters/sets/sets.mjs";
import type { SceneSetting } from "../../lib/motion/seats";

type SetDef = { back: (ctx: CanvasRenderingContext2D, W: number, H: number, o: object) => void; front: (ctx: CanvasRenderingContext2D, W: number, H: number, o: object) => void };

export function SetLayer({ scene, part, width, height, timeMs }: { scene: SceneSetting | null | undefined; part: "back" | "front"; width: number; height: number; timeMs: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const set = scene ? (SETS as Record<string, SetDef>)[scene.id] : null;
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv || !set) return;
    const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const W = Math.max(2, Math.round(width * dpr)), H = Math.max(2, Math.round(height * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    set[part](ctx, W, H, { t: timeMs / 1000, title: scene?.title ?? "", names: scene?.names ?? [] });
  });
  if (!set) return null;
  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: part === "front" ? 10 : undefined }}
    />
  );
}
