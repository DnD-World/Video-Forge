// Types for tools/lib/characterFiles.mjs (the character creator's files on disk).
export interface CharacterRoots { app: string; user: string }
export function listCharacterFiles(roots: CharacterRoots): { brand: string; title: string; settings: Record<string, unknown>; characters: { id: string; raw: unknown; where: "app" | "user" }[] }[];
export function saveCharacterFile(roots: CharacterRoots, brand: string, raw: unknown, o?: { now?: Date }): { ok: true; file: string; where: "app" | "user"; unchanged?: boolean } | { ok: false; problems: string[] };
