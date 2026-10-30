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
  gaze?: number; walk?: { phase: number; amount: number } | null; sitting?: boolean | number;
  joints?: Joints | null; hands?: { F: string; B: string } | null; props?: HeldProp[]; smile?: number; breath?: number;
}

export interface Signals {
  timeMs: number; viseme: number; prevViseme?: number; mix?: number;
  lidFrom?: string; lidTo?: string; lidMix?: number;
  browLeft?: string; browRight?: string; head?: HeadPose; poseSpans?: PoseSpan[]; pose?: string;
  view?: number; active?: boolean; sitting?: boolean; move?: MoveState | null; breath?: number;
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
export function stageOf(look: Look | string): [string, string];
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

// ---- motion library (moves.mjs, hands.mjs, props.mjs) -------------------------------------
export type Key = [number, number[], ("inOut" | "linear" | "in" | "out" | "step" | "back")?];
export interface Move {
  v: number; id: string; name: string; help: string;
  kind: "gesture" | "pose" | "travel" | "stance" | "pair" | "idle";
  tags: string[]; phrases: string[]; lengthMs: number; loop: boolean; hold: number | null;
  tracks: Partial<Record<"armF" | "armB" | "legF" | "legB" | "root" | "lean" | "head" | "sit" | "view" | "open", Key[]>>;
  hands: { F: [number, string][]; B: [number, string][] };
  face: [number, { brows?: string; lids?: string; smile?: number }][];
  props: { id: string; hand: "F" | "B"; t0: number; t1: number }[];
  gait: { t0: number; t1: number; cadence: number; stride: number; swing: number; bounce: number; knee: number; crouch: number; skip: boolean; run: boolean } | null;
  path: { from: PathEnd; to: PathEnd; t0: number; t1: number } | null;
  stance: "sit" | "stand" | null;
  pair: { role: string; partner: string; contact: number } | null;
}
export type PathEnd = "here" | "left" | "right" | "partner";
export interface Joints { w?: number; armF?: number[]; armB?: number[]; legF?: number[]; legB?: number[]; root?: number[]; lean?: number[]; head?: number[]; sit?: number[]; view?: number[]; open?: number[] }
export interface HeldProp { id: string; hand: "F" | "B"; open: number }
export interface MoveSpan { startMs: number; endMs: number; move: string; style?: string; prop?: string; target?: string; seed?: number; /** a walk's length in body heights */ dist?: number }
export interface MoveState {
  joints: Joints; hands: { F: string; B: string }; face: { brows?: string; lids?: string; smile?: number } | null;
  props: HeldProp[]; travel: { from: PathEnd; to: PathEnd; p: number } | null; facing: "left" | "right" | null;
  target?: string | null; move?: string; sit?: number;
}
export interface MoveStyle { label: string; tempo: number; size: number; snap: number; lean: number; headTilt: number; headDrop: number; armsIn: number; gait: Record<string, number> }
export const MOVE_VERSION: number;
export const CHANNELS: Record<string, { n: number; help: string }>;
export const REST: Record<string, number[]>;
export const HAND_SHAPES: string[];
export const KINDS: string[];
export const STYLES: Record<string, MoveStyle>;
export const STYLE_IDS: string[];
export const SHELF: Record<string, Move>;
export function normalizeMove(input: unknown): { move: Move; problems: string[] };
export function buildShelf(list: unknown[]): { shelf: Record<string, Move>; problems: string[] };
export function playMove(move: Move, ms: number, opts?: { style?: string; energy?: number; size?: number; tempo?: number; seed?: number; mirror?: boolean; spanMs?: number; travelBodies?: number }): MoveState & { u: number; stance: string | null };
export function movesAt(spans: MoveSpan[] | undefined, shelf: Record<string, Move>, timeMs: number, opts?: { energy?: number; seed?: number; style?: string; mirror?: boolean }): MoveState | null;
export function moveProgress(move: Move, spanMs: number, ms: number, tempo?: number): { u: number; wall: number };
export function moveLengthMs(move: Move, o?: { style?: string; tempo?: number }): number;
export function readMoveTag(tag: string, shelf: Record<string, Move>, o?: { props?: Record<string, string[]>; cast?: { id: string; label: string }[] }): { move: string; style?: string; prop?: string; target?: string } | null;
export const PROPS: Record<string, { label: string; names: string[]; size: number; hold: "fist" | "under" | "seat"; upright: boolean; colors: string[] }>;
export const PROP_IDS: string[];
export const PROP_NAMES: Record<string, string[]>;
export function drawProp(G: unknown, arm: unknown, prop: string, o?: { open?: number; colors?: string[]; palm?: number }): void;
export function drawHand(G: unknown, arm: unknown, shape: string, o: { relaxed: (arm: unknown) => void }): void;
export interface Performance {
  joints: Joints; hands: { F: string; B: string } | null; props: HeldProp[]; smile: number;
  faceCue: { brows?: string; lids?: string; smile?: number } | null; breath: number;
  facing: "left" | "right" | null; travel: { from: PathEnd; to: PathEnd; p: number } | null; move: string | null;
}
export function performAt(src: { poseSpans?: PoseSpan[]; moveSpans?: MoveSpan[]; shelf: Record<string, Move> }, timeMs: number, o?: { view?: number; talk?: number; energy?: number; seed?: number; sitting?: boolean }): Performance;
export function poseArms(pose?: string, poseK?: number, t?: number, talk?: number): { armF: number[]; armB: number[] };

// ---- one character, two forms (profile.mjs, presets/drawn.mjs) --------------------------------
export interface Shared { form: "puppet" | "drawn"; description: string; personality: string; subjects: string[] }
interface FormSource { form?: "puppet" | "drawn"; character?: CharacterCard | null; puppetPath?: string; sheetPath?: string }
export const SUBJECTS: { id: string; label: string }[];
export const FORMS: ("puppet" | "drawn")[];
export const SHARED_FIELDS: { key: "description" | "personality"; label: string; max: number; help: string; examples: string[] }[];
export function normalizeShared(src?: unknown): { shared: Shared; problems: string[] };
export function formOf(sp?: FormSource): "drawn" | "puppet" | "sheet" | "none";
export function activeCard(sp?: FormSource): CharacterCard | null;
export interface CardChange { key: string; label: string; from: unknown; to: unknown }
export function cardDiff(before: CharacterCard, after: CharacterCard): CardChange[];
export function applyDiff(card: CharacterCard, diff: CardChange[], acceptedKeys: string[]): CharacterCard;
export function describeCard(card: CharacterCard, shared?: { description?: string; personality?: string }): string;
export function puppetPickPrompt(description: string, shelf: { slug: string; name: string; framing: string }[]): { system: string; user: string };
export function readPuppetPick(text: string, shelf: { slug: string }[]): { pick: string; why: string } | { order: string; why: string } | { problem: string };
export interface DrawnPreset { id: string; subjects: string[]; name: string; description: string; personality: string; card: Partial<CharacterCard> }
export const DRAWN_PRESETS: DrawnPreset[];
export interface Costume { id: string; label: string; subjects: string[]; wear: WornItem[]; beard?: string; hairColor?: string }
export const COSTUMES: Costume[];
