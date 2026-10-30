// ---------------------------------------------------------------------------
// Where speakers sit in a set (characters/sets/sets.mjs), in the preview and
// the render alike. With a set chosen, every speaker is seated by the set
// (their own x/y/size are kept for when the set is turned off): the furniture
// hides them from the waist down.
//
// Relative imports only (no "@/"): Remotion's own webpack renders this too.
// ---------------------------------------------------------------------------

import { SETS } from "../../../characters/sets/sets.mjs";
import { activeCard, frameFor, lookById, normalizeCard } from "../../../characters/core/index.mjs";

export interface SceneSetting { id: string; title?: string; names?: string[] }
export interface Seat { x: number; y: number; h: number; face: "camera" | "left" | "right" }

export function seatsFor(scene: SceneSetting | null | undefined, n: number, W: number, H: number): Seat[] | null {
  const set = scene && (SETS as Record<string, { seats: (n: number, W: number, H: number) => Seat[]; max: number }>)[scene.id];
  if (!set || n === 0) return null;
  return set.seats(Math.min(n, set.max), W, H);
}

/** A drawn character in a seat: a stage the size of the frame, hips on the seat line. */
export function drawnStage(seat: Seat, look: string, W: number, H: number) {
  // a little shorter above the furniture than a photoreal person: cartoon heads are bigger
  const S = seat.h * 0.72;
  const p = lookById(look).p as { hy: number };
  return { w: W, h: H, S, x: seat.x, y: seat.y - p.hy * S };
}

/** A picture puppet in a seat: its box centred above the seat, the lower part behind the furniture. */
export function puppetBox(seat: Seat, W: number) {
  const size = seat.h * 0.6;
  // the puppet's own picture is waist up: its bottom edge just below the furniture top
  return { x: seat.x / W, yPx: seat.y - size * 0.58, size };
}

/** Which way a seat makes a speaker face. */
export const seatFacing = (seat: Seat) => (seat.face === "camera" ? "camera" : seat.face) as "camera" | "left" | "right";



/**
 * The speakers as a set seats them: each copy's place, size and facing come
 * from its seat, so everything that reads x / y / size (the avatar, its
 * glass, its sound bars, a walk-in) follows without knowing about sets. A
 * drawn character is sized so its hips land on the seat line; a picture
 * puppet's box sits above it. Speakers beyond the set's seats are left out.
 */
export function seatSpeakers<T extends { x: number; y: number; size: number; facing?: string; character?: unknown; form?: string; puppetPath?: string; sheetPath?: string }>(
  speakers: T[], scene: SceneSetting | null | undefined, W: number, H: number,
): T[] {
  const seats = seatsFor(scene, speakers.length, W, H);
  if (!seats) return speakers;
  return speakers.slice(0, seats.length).map((sp, i) => {
    const seat = seats[i];
    const card = activeCard(sp as never) as { look: string; framing: string } | null;
    if (card) {
      const b = seat.h * 0.82;
      const full = normalizeCard({ ...card, framing: "full" }).card;
      const fr = frameFor(full, full.look, "full", { x: 0, y: 0, w: b, h: b });
      const hy = (lookById(full.look).p as { hy: number }).hy;
      // hips a little above the seat line: a cartoon torso is shorter than a person's
      const cy = seat.y - seat.h * 0.1 + b / 2 - fr.y - hy * fr.S;
      return { ...sp, character: full, x: seat.x / W, y: cy / H, size: b / W, facing: seatFacing(seat) };
    }
    const box = puppetBox(seat, W);
    return { ...sp, x: box.x, y: box.yPx / H, size: box.size / W, facing: seatFacing(seat) };
  });
}
