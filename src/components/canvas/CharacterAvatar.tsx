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
import { SHELF, characterState, drawFigure, frameFor, lookById, performAt, type CharacterCard, type HeadPose, type MoveSpan, type MoveState, type PoseSpan } from "../../../characters/core/index.mjs";
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
  /** A move from the motion library playing now (moveTracks.ts), or null. */
  move?: MoveState | null;
  /** All of this speaker's moves (moveTracks.ts): the motion layer springs
   *  between them and the talking poses (characters/core/motion.mjs). */
  moveSpans?: MoveSpan[];
  /** Seated in a set (src/lib/motion/seats.ts): draw on a canvas the size of
   *  the frame, at this scale and feet point, instead of fitting a box. */
  stage?: { w: number; h: number; S: number; x: number; y: number };
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
  poseSpans, view = 0, mirror: mirror0 = false, active = false, move = null, moveSpans, stage,
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
    const cw = stage ? Math.max(8, Math.round(stage.w * dpr)) : px, ch = stage ? Math.max(8, Math.round(stage.h * dpr)) : px;
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const look = lookById(card.look);
    const { S, x, y } = stage ? { S: stage.S * dpr, x: stage.x * dpr, y: stage.y * dpr } : frameFor(card, look, card.framing, { x: 0, y: 0, w: px, h: px });
    // THE MOTION LAYER: springs, overlap, anticipation, weight and breath
    // between every pose and move — the same pose for the same frame in the
    // preview and in every render worker
    const perf = performAt({ poseSpans, moveSpans, shelf: SHELF }, timeMs, { view, talk: active ? 1 : 0, energy: card.energy ?? 0.5, seed: card.seed ?? 0 });
    const state = characterState({
      timeMs, viseme, prevViseme, mix, lidFrom, lidTo, lidMix, browLeft, browRight, head, poseSpans, view, active,
      move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props: perf.props, face: perf.faceCue, facing: perf.facing, travel: perf.travel },
      breath: perf.breath,
    });
    // walking across the picture faces the way they walk
    const facing = perf.facing ?? move?.facing;
    const mirror = facing ? facing === "left" : mirror0;
    if (!layer.current && typeof document !== "undefined") layer.current = document.createElement("canvas");
    drawFigure(ctx, card, { look, S, x, y, mirror, state, layerSize: { w: cw, h: ch }, layerCanvas: layer.current ?? undefined });
  });

  const framed = outlineShape !== "none";
  const lineW =
    frameWidth !== undefined && sizeFraction ? Math.max(0, (frameWidth * size) / (sizeFraction * 1080)) : Math.max(1, size * 0.015);
  return (
    <div
      style={stage ? { width: stage.w, height: stage.h, position: "relative" } : {
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
