export const SCHEMES: Record<string, { label: string; bg0: string; accent: string; text: string; [k: string]: string | number }>;
export function customScheme(colors: { background: string; accent: string; text?: string }): Record<string, string | number>;
export const meta: { id: string; name: string; family: string; brand: string; font: string; schemes: string[]; transition: number };
