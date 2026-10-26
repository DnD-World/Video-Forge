// Types for the drawn-character engine (characters/core/index.mjs).

export interface WornItem { id: string; slot?: string; colors: string[]; pattern?: "none" | "stripes" | "checks" | "dots" | "corduroy"; }

export interface CharacterCard {
  v: number;
  seed?: number;
  name: string;
  look: string;
  framing: "full" | "waist" | "head";
  boil: number;
  height: number;
  build: "thin" | "average" | "round";
  muscle: number;
  headSize: number;
  posture: "upright" | "slouch" | "hunch";
  armLength: number;
  skin: string;
  headShape: "round" | "oval" | "egg" | "square";
  eyes: string;
  eyeSpacing: number;
  brows: "line" | "thick" | "arched" | "none";
  nose: "none" | "dot" | "line" | "button" | "long";
  mouth: "plain" | "overbite";
  lips: boolean;
  lipColor: string;
  ears: "none" | "small" | "round" | "big";
  cheeks: boolean;
  freckles: boolean;
  beard: string;
  moustache: string;
  hair: string;
  hairColor: string;
  highlight: string;
  wear: WornItem[];
  expression: "neutral" | "smile" | "serious" | "grumpy";
  blinkRate: number;
  energy: number;
  sway: number;
}

export interface Look { id: string; name: string; blurb: string; profile?: boolean; [k: string]: unknown; }
export interface Field {
  key: keyof CharacterCard; group: string; label: string; kind: "text" | "choice" | "number" | "color" | "bool" | "wear";
  options?: string[]; min?: number; max?: number; step?: number; default: unknown; help: string; examples: unknown[]; optional?: boolean;
}
export interface HeadPose { rotateDeg: number; dx: number; dy: number; }
export interface PoseSpan { startMs: number; endMs: number; pose: string; }

export interface CharacterState {
  t: number; view: number; pose: string; poseK: number; head: HeadPose | null; talk: number;
  mouth: { from: number; to: number; mix: number };
  lid: { from: string; to: string; mix: number };
  brows: { left: string; right: string };
  gaze?: number; walk?: { phase: number; amount: number } | null; sitting?: boolean;
}

export interface Signals {
  timeMs: number; viseme: number; prevViseme?: number; mix?: number;
  lidFrom?: string; lidTo?: string; lidMix?: number;
  browLeft?: string; browRight?: string; head?: HeadPose; poseSpans?: PoseSpan[]; pose?: string;
  view?: number; active?: boolean; sitting?: boolean;
}

export interface DrawInfo {
  head: { x: number; y: number; r: number };
  mouth: { x: number; y: number; w: number; h: number };
  eyes: { x: number; y: number; r: number; visible: boolean }[];
  hands: { x: number; y: number }[];
  ink: string;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const LOOKS: Look[];
export const LOOK_IDS: string[];
export function lookById(id: string): Look;
export const FIELDS: Field[];
export const WARDROBE: { id: string; label: string; slot: string; colors: number; patterns: boolean }[];
export const CARD_VERSION: number;
export function defaultCard(over?: Partial<CharacterCard>): CharacterCard;
export function normalizeCard(input: unknown): { card: CharacterCard; problems: string[] };
export function checkField(f: Field, value: unknown): [unknown, string | null];
export function fieldByKey(k: string): Field | undefined;
export const ITEMS: { id: string; label: string; slot: string; colors: string[] }[];
export const SLOTS: string[];
export const PATTERNS: string[];
export function itemById(id: string): unknown;
export function normalizeWear(list: unknown): { wear: WornItem[]; problems: string[] };
export const POSES: Record<string, unknown>;
export const POSE_NAMES: string[];
export function solveRig(card: CharacterCard, look: Look, state?: Partial<CharacterState>): unknown;
export function anchors(sk: unknown): unknown;
export function figureExtent(card: CharacterCard, look: Look): { top: number; bottom: number; shoulders: number; hips: number; headCentre: number; R: number };
export const MOUTHS: Record<number, Record<string, number>>;
export const LIDS: Record<string, number>;
export const BROWS: Record<string, { lift: number; tilt: number; arch: number }>;
export function mouthShape(from: number, to: number, k?: number): Record<string, number>;
export const HAIR_STYLES: string[];
export function frameFor(card: CharacterCard, look: Look | string, framing: "full" | "waist" | "head", box: { x: number; y: number; w: number; h: number }): { S: number; x: number; y: number };
export function drawCharacter(ctx: Ctx, card: CharacterCard, opts: { look?: Look | string; S: number; x?: number; y?: number; mirror?: boolean; state?: Partial<CharacterState> }): DrawInfo;
export function drawFigure(ctx: Ctx, card: CharacterCard, opts: { look?: Look | string; S: number; x?: number; y?: number; mirror?: boolean; state?: Partial<CharacterState>; layerSize?: { w: number; h: number }; layerCanvas?: HTMLCanvasElement | OffscreenCanvas }): DrawInfo;
export function applyScene(look: Look, ctx: Ctx, o: { w: number; h: number; t?: number; fps?: number }): void;
export function characterState(sig: Signals): CharacterState;
export function poseBlendAt(spans: PoseSpan[] | undefined, timeMs: number): { pose: string; poseK: number };
export function facingView(facing: "camera" | "left" | "right" | "auto" | undefined, me: { x: number }, others?: { x: number }[], o?: { dialogue?: number }): { view: number; mirror: boolean };
export function autoPerformance(t: number, o?: { seed?: number; talking?: boolean; pose?: string; poseK?: number; view?: number; blinkRate?: number }): CharacterState;
export function cardPrompt(o: { description?: string; picture?: boolean; look?: string }): { system: string; user: string };
export function suggestPrompt(card: CharacterCard, o?: { purpose?: string }): { system: string; user: string };
export function readCardAnswer(text: string, base?: Partial<CharacterCard>): { card: CharacterCard; problems: string[] };
export function readSuggestions(text: string, card: CharacterCard): { field: string; label: string; value: unknown; why: string }[];
export function cardSchemaText(): string;
export function setCanvasFactory(fn: (w: number, h: number) => HTMLCanvasElement | OffscreenCanvas): void;
