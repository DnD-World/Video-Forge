import type { Spec, Resolved } from "../types";
export const KINDS: Record<string, { need: string[]; optional: string[]; items?: [number, number] }>;
export const MIN_SCENE_SEC: number;
export function validateSpec(spec: unknown): string[];
export function resolveSpec(spec: Spec): Resolved;
