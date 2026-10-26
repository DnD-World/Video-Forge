export {};

// The real shape, not a hand-copied approximation of it. This file used to
// re-declare the analysis inline, which meant adding `spectrum` to
// AudioAnalysis left the renderer's view of the IPC boundary silently stale.
import type { AudioAnalysis } from "./store/types";
import type { BrandInfo } from "./store/builtinCast";

/** The vendored Deco Noir behaviour layer (src/styles/deco-noir.js). It is a
 *  plain IIFE that attaches to window rather than an ES module, because the
 *  same file has to run unchanged in a WordPress admin page and a browser
 *  extension popup — neither of which can rely on a bundler. */
interface DecoNoirApi {
  init: (opts?: {
    /** There is ONE ground now and its colour derives from --accent, so it
     *  follows the accent picker automatically. The old named grounds
     *  ("steel" / "gold") are gone. */
    ground?: "on" | "off";
    grain?: boolean;
    glow?: boolean;
    spark?: boolean;
    reveal?: boolean;
    glowSensitivity?: number;
  }) => void;
  /** Re-scan for `.dialwrap` elements mounted after init. */
  dials: () => void;
  setColorway: (name: string) => void;
  setDress: (name: string) => void;
  setGround: (name: "on" | "off") => void;
  /** Writes --accent, --accent-hi, --accent-lo and --accent-rgb from one hex,
   *  deriving the shades. One call replaces four hand-written properties, so
   *  the channel and colour forms cannot drift apart. */
  setAccent: (hex: string, opts?: { hi?: string; lo?: string }) => void;
}

export interface ImportedStyleCard { id: string; name: string; family: string; look: string; motion: string; explains: string; fontFamilies: string[]; importedAt?: string }
export interface ExWord { text: string; start: number; end: number }
export interface ExIssue { level: "error" | "warn"; msg: string; t: number | null; count?: number }
export interface ExCheck { W: number; H: number; duration: number; msMax: number; msAvg?: number; frames?: number; errors: ExIssue[]; warnings: ExIssue[]; storyboard: { kind?: string; t: number; file: string; url: string }[] }

declare global {
  interface Window {
    DecoNoir?: DecoNoirApi;
    byok: {
      keys: {
        list: () => Promise<string[]>;
        set: (provider: string, value: string) => Promise<boolean>;
        remove: (provider: string) => Promise<boolean>;
        encryptionAvailable: () => Promise<boolean>;
        test: (
          provider: string,
          opts?: { azureRegion?: string }
        ) => Promise<{ ok: boolean; message: string }>;
      };
      dialog: {
        openFile: (filters?: unknown) => Promise<string | null>;
        saveFile: (defaultName: string, filters?: unknown) => Promise<string | null>;
      };
      audio: {
        analyzeFile: (
          filePath: string,
          segments?: { speakerId: string; startMs: number; endMs: number }[],
          speakerOrder?: string[]
        ) => Promise<AudioAnalysis | null>;
      };
      media: {
        searchVideos: (
          query: string,
          providers?: ("pixabay" | "pexels")[],
          orientation?: "portrait" | "landscape"
        ) => Promise<{
          hits: {
            id: string;
            provider: "pixabay" | "pexels";
            url: string;
            thumbUrl: string;
            width: number;
            height: number;
            durationSec: number;
            author: string;
            pageUrl: string;
          }[];
          notes: string[];
        }>;
        /** Returns the absolute path the clip was saved to. */
        download: (id: string, url: string) => Promise<string>;
        library: () => Promise<{
          fileName: string;
          filePath: string;
          kind: "video" | "audio";
          bytes: number;
          modifiedMs: number;
          source?: string;
        }[]>;
        /** Reads the script, plans a query per scene and picks a clip for each. */
        autoBackgrounds: (opts: {
          segments: { text: string; startMs: number; endMs: number; speakerLabel: string }[];
          languageName: string;
          portrait: boolean;
          topic?: string;
          minSceneMs?: number;
        }) => Promise<{
          look: string;
          scenes: {
            startMs: number;
            endMs: number;
            query: string;
            reason: string;
            note?: string;
            hit: {
              id: string;
              provider: "pixabay" | "pexels";
              url: string;
              thumbUrl: string;
              width: number;
              height: number;
              durationSec: number;
              author: string;
              pageUrl: string;
            } | null;
          }[];
        }>;
      };
      sound: {
        search: (query: string) => Promise<{
          hits: {
            id: string;
            name: string;
            url: string;
            durationSec: number;
            author: string;
            pageUrl: string;
            license: string;
          }[];
          notes: string[];
        }>;
      };
      fonts: {
        list: () => Promise<
          { family: string; weights: number[]; greek: boolean }[]
        >;
        ensure: (
          family: string,
          weight: number
        ) => Promise<{
          family: string;
          weight: number;
          /** False means the family genuinely has no Greek subset. */
          hasGreek: boolean;
          faces: { path: string; fileName: string; unicodeRange: string }[];
        }>;
      };
      storage: {
        outputDir: () => Promise<string>;
        openOutputDir: () => Promise<boolean>;
        openPath: (p: string) => Promise<boolean>;
        readFile: (filePath: string) => Promise<ArrayBuffer>;
        writeFile: (filePath: string, data: ArrayBuffer) => Promise<boolean>;
      };
      brand: {
        /** The brand pack switched on for this computer, or null for none. */
        active: () => Promise<BrandInfo | null>;
      };
      music: {
        list: () => Promise<{ name: string; filePath: string }[]>;
      };
      dramabox: {
        /** Write blocks.json and align.json for a script and cast, carrying
         *  each speaker's voice settings with them. */
        writeBlocks: (
          scriptText: string,
          speakers: unknown[],
          outDir: string
        ) => Promise<{
          ok: boolean;
          errors: string[];
          count?: number;
          summary: string[];
        }>;
      };
      render: {
        start: (
          job: unknown
        ) => Promise<
          | {
              ok: true;
              jobId: string;
              outputPath: string;
              durationSec: number;
              frames: number;
            }
          | { ok: false; jobId: string; error: string }
        >;
        onProgress: (
          cb: (payload: { jobId: string; pct: number; note?: string }) => void
        ) => () => void;
      };
      tts: {
        listPiperVoices: (voicesDir: string) => Promise<{ id: string; name: string; onnxPath: string }[]>;
        synthesizePiper: (
          pythonPath: string,
          onnxPath: string,
          text: string
        ) => Promise<{ audioBuffer: ArrayBuffer; durationMs: number }>;
        listElevenVoices: () => Promise<{ id: string; name: string; labels?: string }[]>;
        generateNarration: (
          segments: import("../electron/tts/buildNarration").NarrationInput[],
          speakerOrder: string[],
          pauses?: { sameMs: number; turnMs: number }
        ) => Promise<{
          filePath: string;
          segments: { speakerId: string; speakerLabel: string; text: string; startMs: number; endMs: number }[];
          analysis: AudioAnalysis | null;
        }>;
        twinNarration: (target: string) => Promise<{
          filePath: string;
          segments: { speakerId: string; speakerLabel: string; text: string; startMs: number; endMs: number }[];
          analysis: AudioAnalysis | null;
        }>;
      };
      project: {
        startup: () => Promise<unknown>;
      };
      mediaCache: {
        stats: () => Promise<{ dir: string; files: number; bytes: number }>;
        cleanUp: (limitBytes: number, keep: string[]) => Promise<{ removed: number; freedBytes: number; left: { files: number; bytes: number } }>;
      };
      /** Explainers — electron/explainer/explainerIpc.ts */
      explainer: {
        styles: () => Promise<{ imported: ImportedStyleCard[] }>;
        importStyle: (text: string) => Promise<ImportedStyleCard>;
        removeStyle: (id: string) => Promise<boolean>;
        googleFonts: () => Promise<{ family: string; category: string }[]>;
        fontData: (family: string) => Promise<{ weight: number; range: string | null; data: Uint8Array }[]>;
        providers: () => Promise<{ id: string; label: string; hasKey: boolean }[]>;
        writeScenes: (req: { script: string; words?: ExWord[]; format: string; provider: string; model?: string; base?: Record<string, unknown> }) => Promise<{ spec: any; attempts: number; ms: number; problems: string[]; model: string }>;
        validate: (spec: unknown) => Promise<string[]>;
        check: (spec: unknown) => Promise<ExCheck>;
        render: (req: { spec: unknown; out: string; audio?: string; extras?: Record<string, unknown> }) => Promise<{ made: string[]; spots?: string }>;
        importedPrompt: (req: Record<string, unknown>) => Promise<{ file: string; chars: number }>;
        importedGenerate: (req: Record<string, unknown>) => Promise<ExCheck & { id: string; file: string; model: string; ms: number }>;
        importedLoad: (htmlPath: string) => Promise<ExCheck & { id: string; file: string }>;
        importedRender: (req: { id: string; out: string; tint?: unknown; audio?: string }) => Promise<{ made: string[] }>;
        reveal: (file: string) => Promise<boolean>;
        spotsFor: (mp4: string) => Promise<{ format: string; width: number; height: number; slots: { x: number; y: number; size: number; outlineShape?: string }[] } | null>;
        cancel: () => Promise<boolean>;
        onProgress: (cb: (p: { job: string; pct: number; note: string }) => void) => () => void;
      };
      /** Drawn characters' AI helper — electron/characters/characterIpc.ts */
      characters: {
        providers: () => Promise<{ id: string; label: string; hasKey: boolean; seesPictures: boolean }[]>;
        pickPicture: () => Promise<string | null>;
        fromDescription: (req: { description: string; look?: string; provider: string; model?: string }) => Promise<{ card: import("../characters/core/index.mjs").CharacterCard; problems: string[]; ms: number; model: string }>;
        fromPicture: (req: { file: string; description?: string; look?: string; provider: string; model?: string }) => Promise<{ card: import("../characters/core/index.mjs").CharacterCard; problems: string[]; ms: number; model: string }>;
        suggest: (req: { card: import("../characters/core/index.mjs").CharacterCard; purpose?: string; provider: string; model?: string }) => Promise<{ suggestions: { field: string; label: string; value: unknown; why: string }[]; ms: number; model: string }>;
        cancel: () => Promise<boolean>;
      };
      forge: {
        openImageForge: () => Promise<boolean>;
        removePuppet: (slug: string) => Promise<{ ok: boolean; problem?: string }>;
        shelfPuppets: () => Promise<{ slug: string; name: string; rigPath: string; basePath: string; framing: "head" | "waist" | "full"; madeAt: string }[]>;
        orderPuppet: (
          order: { name: string; description: string; style: string; framing: "head" | "waist" | "full"; auto: boolean },
          pictures: string[]
        ) => Promise<{ ok: boolean; id?: string; opened?: boolean; problem?: string }>;
        orderResult: (id: string) => Promise<{ slug: string | null; problem: string | null } | null>;
      };
      voice: {
        pronunciations: () => Promise<{ word: string; say: string }[]>;
        savePronunciations: (list: { word: string; say: string }[]) => Promise<void>;
      };
      local: {
        models: (base: string) => Promise<{ ok: boolean; models?: string[]; problem?: string }>;
      };
      batch: {
        readSheet: (source: { url?: string; file?: string }) => Promise<Record<string, string>[]>;
        runMany: (req: unknown) => Promise<{ ok: boolean; problem?: string }>;
        stopMany: () => Promise<boolean>;
        onEvent: (cb: (e: unknown) => void) => () => void;
      };
      llm: {
        draftScript: (opts: {
          topic: string;
          speakerLabels: string[];
          languageName: string;
          tone?: string;
          characters?: string[];
        }) => Promise<string>;
      };
    };
  }
}
