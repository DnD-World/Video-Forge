import type { AtlasStyle, Format, Hole, Word } from "../types";
export function estimateSeconds(script: string): number;
export function sceneListPrompt(o: { script: string; words?: Word[]; format?: Format; duration?: number }): { system: string; user: string };
export function fixPrompt(errors: string[]): string;
export function extractJson(text: string): any;
export function extractHtml(text: string): string;
export function parseAtlasPrompt(text: string): AtlasStyle;
export function styleSlug(name: string): string;
export function rebuildPrompt(style: AtlasStyle, o: { content: string; format?: Format; words?: Word[]; holes?: Hole[]; duration?: number }): string;
