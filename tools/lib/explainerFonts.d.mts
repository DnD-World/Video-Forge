export function fontFiles(family: string, o?: { cacheDir?: string }): Promise<{ weight: number; file: string; range: string | null }[]>;
export function ensureGoogleFont(family: string, cacheDir: string): Promise<{ weight: number; file: string; range: string | null }[]>;
export function googleFontList(): Promise<{ family: string; category: string }[]>;
