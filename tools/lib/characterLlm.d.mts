import type { CharacterCard } from "../../characters/core/index.mjs";

interface Ask { provider: string; key: string; model: string; signal?: AbortSignal; }
export function pictureDataUrl(file: string): Promise<string>;
export function cardFromDescription(o: Ask & { description: string; look?: string }): Promise<{ card: CharacterCard; problems: string[]; ms: number }>;
export function cardFromPicture(o: Ask & { file?: string; dataUrl?: string; description?: string; look?: string }): Promise<{ card: CharacterCard; problems: string[]; ms: number }>;
export function suggestForCard(o: Ask & { card: CharacterCard; purpose?: string }): Promise<{ suggestions: { field: string; label: string; value: unknown; why: string }[]; ms: number }>;
