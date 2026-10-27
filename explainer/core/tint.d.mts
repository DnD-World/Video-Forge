export const TINT_PRESETS: Record<string, { dark: string; light: string }>;
export function tintPixels(data: Uint8ClampedArray | Uint8Array, tint: { dark: string; light: string; amount?: number }): void;
export function resolveTint(t: unknown): { dark: string; light: string; amount: number } | null;
