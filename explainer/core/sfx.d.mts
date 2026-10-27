import type { Spec, Resolved } from "../types";
export type SfxKind = "whoosh" | "riser" | "pop" | "tick" | "ding";
export interface SfxCue { t: number; kind: SfxKind; sound: string; gain: number; scene: number; why: string; spoken: boolean }
export interface SfxPlan { on: boolean; amount: number; level: 0 | 1 | 2; duration: number; cues: SfxCue[] }
export interface SfxSound { file: string; lead: number; gain: number; maxLen?: number; reverse?: boolean; skip?: number; label: string }
export const MIN_GAP_SEC: number;
export const DEFAULT_AMOUNT: number;
export const SPEECH_DUCK: number;
export const WHOOSH_AT: number;
export const SOUNDS: Record<SfxKind, SfxSound>;
export const SFX_CREDITS: { source: string; made: string; licence: string; attribution: string };
export function sfxSettings(spec: { sfx?: { on?: boolean; amount?: number } } | Spec | Resolved): { on: boolean; amount: number };
export function densityFor(amount: number, calm?: boolean): 0 | 1 | 2;
export function volumeFor(amount: number): number;
export function planSfx(spec: Spec | Resolved, over?: { on?: boolean; amount?: number }): SfxPlan;
export function countCues(cues: SfxCue[]): Partial<Record<SfxKind, number>>;
export function creditsText(cues: SfxCue[]): string;
