import type { Spec, Resolved } from "../types";
export interface Stage { R: Resolved; draw(ctx: CanvasRenderingContext2D, t: number, o?: { mode?: "full" | "background" }): unknown[]; kit: any; sceneAt(t: number): number; transitionSec: number }
export const KITS: Record<string, any>;
export function createStage(spec: Spec, makeLayer: (W: number, H: number) => HTMLCanvasElement): Stage;
