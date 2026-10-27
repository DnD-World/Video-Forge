import type { AtlasStyle, Format, Hole, Spec, Word } from "../../explainer/types";
export const PROVIDERS: Record<string, { label: string; base: string; hint: string[] }>;
export function listModels(provider: string, key: string): Promise<string[]>;
export function pickModel(provider: string, key: string, wanted?: string): Promise<string>;
export function writeSceneList(o: { provider: string; key: string; model: string; script: string; words?: Word[]; format?: Format; duration?: number; base?: Partial<Spec>; tries?: number; signal?: AbortSignal; onAttempt?: (n: number) => void }): Promise<{ spec: Spec | null; attempts: number; ms: number; problems: string[] }>;
export function rebuildImported(o: { provider: string; key: string; model: string; style: AtlasStyle; content: string; format: Format; words?: Word[]; holes?: Hole[]; duration?: number; signal?: AbortSignal }): Promise<{ html: string; ms: number; usage: unknown }>;
