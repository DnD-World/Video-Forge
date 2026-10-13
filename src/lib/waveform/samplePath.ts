import { shapeRadius } from "./superellipse";
import type { TrackWaveform } from "../../store/types";

export interface PathPoint {
  x: number;
  y: number;
  /** Unit normal — the direction amplitude extends toward. */
  nx: number;
  ny: number;
}

/**
 * Evenly spaced anchor points along the waveform's path for a given
 * position, plus the outward-facing unit normal at each point (the
 * direction bars/dots/lines extend toward as amplitude increases).
 * Coordinates are in the 0..w / 0..h box the waveform renders into.
 *
 * `edgeFlush` toggles between hugging the literal edge (0% margin) and the
 * default inset (8% margin) — this is deliberately a toggle, not free-drag
 * positioning, since that's all that was actually needed.
 */
export interface RingOverride {
  cx: number;
  cy: number;
  r: number;
}

export function samplePath(
  position: TrackWaveform["position"],
  w: number,
  h: number,
  count: number,
  edgeFlush = false,
  /** Explicit centre and radius for a closed ring, used by the "speaker"
   *  position so a halo can sit around a face instead of the frame. */
  ring?: RingOverride,
  /** Superellipse exponent of the speaker's frame (superellipse.ts): 2 is a
   *  circle. Bars, wave, mirror and dots took their ring from here and it was
   *  always a circle — round bars round a square frame (Ak, 12 Oct 2026). */
  exponent = 2
): PathPoint[] {
  const pts: PathPoint[] = [];
  const margin = edgeFlush ? 0.01 : 0.08;

  if (position === "circular" || position === "speaker") {
    const cx = ring ? ring.cx : w / 2;
    const cy = ring ? ring.cy : h / 2;
    const r = ring ? ring.r : Math.min(w, h) * (edgeFlush ? 0.48 : 0.34);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2;
      const k = shapeRadius(a, exponent);
      pts.push({
        x: cx + Math.cos(a) * r * k,
        y: cy + Math.sin(a) * r * k,
        nx: Math.cos(a),
        ny: Math.sin(a),
      });
    }
    return pts;
  }

  if (position === "frame") {
    for (let i = 0; i < count; i++) pts.push(frameEdgeAt(i / count, w, h, edgeFlush));
    return pts;
  }

  if (position === "top" || position === "bottom") {
    const y = position === "top" ? h * margin : h * (1 - margin);
    const ny = position === "top" ? 1 : -1; // bars grow inward, toward center
    for (let i = 0; i < count; i++) {
      const x = w * (margin + (i / (count - 1)) * (1 - margin * 2));
      pts.push({ x, y, nx: 0, ny });
    }
    return pts;
  }

  // left / right
  const x = position === "left" ? w * margin : w * (1 - margin);
  const nx = position === "left" ? 1 : -1;
  for (let i = 0; i < count; i++) {
    const y = h * (margin + (i / (count - 1)) * (1 - margin * 2));
    pts.push({ x, y, nx, ny: 0 });
  }
  return pts;
}

/**
 * A point on the edge of the whole video, `t` = 0–1 once round (clockwise from
 * the top-left), with its normal pointing INTO the picture — the "around the
 * video" position: bars, bubbles and sparks come from the frame's edge and
 * reach inward (Ak, 13 Oct 2026). Spaced by distance along the edge, so the
 * long sides of a vertical video get more of them than the short ones.
 */
export function frameEdgeAt(t: number, w: number, h: number, edgeFlush = false): PathPoint {
  const m = Math.min(w, h) * (edgeFlush ? 0.004 : 0.022);
  const iw = w - 2 * m;
  const ih = h - 2 * m;
  const per = 2 * (iw + ih);
  let d = (((t % 1) + 1) % 1) * per;
  if (d < iw) return { x: m + d, y: m, nx: 0, ny: 1 };
  d -= iw;
  if (d < ih) return { x: w - m, y: m + d, nx: -1, ny: 0 };
  d -= ih;
  if (d < iw) return { x: w - m - d, y: h - m, nx: 0, ny: -1 };
  d -= iw;
  return { x: m, y: h - m - d, nx: 1, ny: 0 };
}
