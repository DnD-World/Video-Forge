// Types for characters/icons/icons.mjs.
type Ctx = CanvasRenderingContext2D;
export interface IconDef { label: string; subjects: string[]; names: string[]; draw(ctx: Ctx, t: number, r: number, k: number): void }
export interface Pop { icon?: string; emoji?: string; startMs: number; endMs: number }
export const ICONS: Record<string, IconDef>;
export const ICON_IDS: string[];
export function findIcon(words: string): string | null;
export function isEmoji(s: string): boolean;
export function drawPop(ctx: Ctx, pop: Pop, x: number, y: number, size: number, ms: number): void;
