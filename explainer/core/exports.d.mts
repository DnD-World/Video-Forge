import type { Spec, Resolved, Word } from "../types";
export interface Cue { start: number; end: number; text: string }
export function stamp(sec: number, sep: string): string;
export function captionCues(words: Word[] | undefined, opts?: { maxChars?: number; maxSec?: number }): Cue[];
export function toSrt(cues: Cue[]): string;
export function toVtt(cues: Cue[]): string;
export function chapters(spec: Spec, resolved: Resolved): string;
