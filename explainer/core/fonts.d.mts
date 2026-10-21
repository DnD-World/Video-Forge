export const WEIGHTS: number[];
export const BUNDLED_FONTS: { family: string; pkg: string; feel: string }[];
export const FALLBACK_FONT: string;
export function isBundled(family: string): boolean;
export function fontStack(family: string): string;
export function fontSlug(family: string): string;
