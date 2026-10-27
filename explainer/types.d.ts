// Shared types for the explainer modules (plain .mjs files with .d.mts beside them).

export type Format = "16:9" | "9:16" | "1:1" | "4:5";
export type SpotShape = "circle" | "rounded" | "square";
export interface Word { text: string; start: number; end: number }
export interface Slot { x: number; y: number; size: number; outlineShape?: string; shape?: string }
export interface Hole { shape: string; cx: number; cy: number; w: number; h: number; r: number; box: { x: number; y: number; w: number; h: number } }
export interface Scene { kind: string; at?: number | { word: number }; [k: string]: unknown }
export interface Spec {
  style?: string; scheme?: string; format: Format; fps?: number; duration?: number;
  font?: string; colors?: { background: string; accent: string; text?: string } | null;
  tint?: string | { dark?: string; light?: string; amount?: number; preset?: string } | null;
  calm?: boolean; sfx?: { on?: boolean; amount?: number }; puppets?: { count: number; shape?: SpotShape }; slots?: Slot[];
  words?: Word[]; scenes: Scene[]; _note?: string;
}
export interface Resolved {
  W: number; H: number; fps: number; duration: number; scenes: (Scene & { start: number; end: number; index: number })[];
  slots: Slot[]; holes: Hole[]; box: { x: number; y: number; w: number; h: number };
  scheme: string; style: string; words: Word[]; font: string; colors: Spec["colors"]; tint: { dark: string; light: string; amount: number } | null; calm: boolean; sfx?: Spec["sfx"];
}
export interface Issue { level: "error" | "warn"; msg: string; t: number | null; count?: number }
export interface CheckResult {
  W: number; H: number; holes: Hole[]; box?: Resolved["box"]; slots?: Slot[]; duration: number; frames?: number; msAvg?: number; msMax: number;
  errors: Issue[]; warnings: Issue[]; storyboard: { kind?: string; t: number; file: string }[]; changes?: { t: number; file: string }[];
}
export interface AtlasStyle { name: string; family: string; look: string; motion: string; explains: string; fontLinks: string[]; fontFamilies: string[]; size: number; raw: string }
