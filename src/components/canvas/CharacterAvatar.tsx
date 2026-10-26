// ---------------------------------------------------------------------------
// A drawn character as a speaker: the third kind of face, next to the viseme
// sheet (SpeakerAvatar) and the layered picture puppet (PuppetAvatar).
//
// It takes the SAME performance signals the puppet does — mouth ids and mix,
// blink states and mix, brows, head pose, pose spans, facing — so its timing
// is identical and nothing new is scripted. Instead of swapping pictures it
// draws the figure on a canvas with characters/core, which is a pure function
// of those inputs: the live preview and every Remotion render worker draw the
// same pixels for the same frame.
//
// Relative imports only (no "@/"): Remotion's own webpack renders this too.
// ---------------------------------------------------------------------------

import { useLayoutEffect, useRef } from "react";
import { characterState, drawFigure, frameFor, lookById, type CharacterCard, type HeadPose, type PoseSpan } from "../../../characters/core/index.mjs";
import type { OutlineShape } from "../../store/types";

interface Props {
  card: CharacterCard;
  /** The box's side in px (a speaker's size is a fraction of frame width). */
  size: number;
  timeMs: number;
  viseme: number;
  prevViseme?: number;
  mix?: number;
  lidFrom?: string;
  lidTo?: string;
  lidMix?: number;
  browLeft?: string;
  browRight?: string;
  head?: HeadPose;
  poseSpans?: PoseSpan[];
  /** 0 front · 1 three-quarter · 2 side profile. */
  view?: number;
  mirror?: boolean;
  /** This speaker is the one talking now (their hands move more). */
  active?: boolean;
  bgOpacity: number;
  borderOpacity: number;
  bgColor?: string;
  borderColor?: string;
  outlineShape?: OutlineShape;
  frameWidth?: number;
  sizeFraction?: number;
}

const SHAPE_RADIUS: Record<OutlineShape, string> = { circle: "50%", rounded: "18%", square: "0%", none: "0%" };

export function CharacterAvatar({
  card, size, timeMs, viseme, prevViseme, mix = 1, lidFrom, lidTo, lidMix, browLeft, browRight, head,
  poseSpans, view = 0, mirror = false, active = false,
  bgOpacity, borderOpacity, bgColor = "#1a1a1a", borderColor = "#d98a3d", outlineShape = "none",
  frameWidth, sizeFraction,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLCanvasElement | null>(null);

  useLayoutEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const px = Math.max(8, Math.round(size * dpr));
    if (cv.width !== px || cv.height !== px) { cv.width = px; cv.height = px; }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    const look = lookById(card.look);
    const { S, x, y } = frameFor(card, look, card.framing, { x: 0, y: 0, w: px, h: px });
    const state = characterState({
      timeMs, viseme, prevViseme, mix, lidFrom, lidTo, lidMix, browLeft, browRight, head, poseSpans, view, active,
    });
    if (!layer.current && typeof document !== "undefined") layer.current = document.createElement("canvas");
    drawFigure(ctx, card, { look, S, x, y, mirror, state, layerSize: { w: px, h: px }, layerCanvas: layer.current ?? undefined });
  });

  const framed = outlineShape !== "none";
  const lineW =
    frameWidth !== undefined && sizeFraction ? Math.max(0, (frameWidth * size) / (sizeFraction * 1080)) : Math.max(1, size * 0.015);
  return (
    <div
      style={{
        width: size, height: size, position: "relative",
        borderRadius: SHAPE_RADIUS[outlineShape],
        overflow: framed ? "hidden" : "visible",
        background: framed ? hexA(bgColor, bgOpacity) : "transparent",
        border: framed ? `${lineW.toFixed(2)}px solid ${hexA(borderColor, borderOpacity)}` : "none",
        boxSizing: "border-box",
      }}
    >
      <canvas ref={canvas} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
