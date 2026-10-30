// Types for characters/sets/sets.mjs.
type Ctx = CanvasRenderingContext2D;
export interface SetSeat { x: number; y: number; h: number; face: "camera" | "left" | "right" }
export interface SetDef {
  label: string;
  help: string;
  max: number;
  back(ctx: Ctx, W: number, H: number, o?: { t?: number; title?: string; names?: string[]; accent?: string; scores?: number[] }): void;
  front(ctx: Ctx, W: number, H: number, o?: { t?: number; title?: string; names?: string[]; accent?: string; scores?: number[] }): void;
  seats(n: number, W: number, H: number): SetSeat[];
  clip?(i: number, W: number, H: number): [number, number, number, number];
}
export const SETS: Record<string, SetDef>;
export const SET_IDS: string[];
