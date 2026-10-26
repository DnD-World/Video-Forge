import { contextBridge, ipcRenderer } from "electron";

// ---------------------------------------------------------------------------
// Video Forge — Preload bridge
// Exposes a small, whitelisted, type-safe API as window.byok
// contextIsolation MUST be true (set in main.ts) for this to work.
// ---------------------------------------------------------------------------

const api = {
  keys: {
    list: (): Promise<string[]> => ipcRenderer.invoke("keys:list"),
    set: (provider: string, value: string): Promise<boolean> =>
      ipcRenderer.invoke("keys:set", provider, value),
    remove: (provider: string): Promise<boolean> =>
      ipcRenderer.invoke("keys:delete", provider),
    encryptionAvailable: (): Promise<boolean> =>
      ipcRenderer.invoke("keys:encryptionAvailable"),
    test: (
      provider: string,
      opts?: { azureRegion?: string }
    ): Promise<{ ok: boolean; message: string }> =>
      ipcRenderer.invoke("keys:test", provider, opts),
  },

  dialog: {
    openFile: (filters?: Electron.FileFilter[]): Promise<string | null> =>
      ipcRenderer.invoke("dialog:openFile", filters),
    saveFile: (
      defaultName: string,
      filters?: Electron.FileFilter[]
    ): Promise<string | null> =>
      ipcRenderer.invoke("dialog:saveFile", defaultName, filters),
  },

  audio: {
    analyzeFile: (
      filePath: string,
      /** Who speaks when, and the speakers in drawing order. Without these every
       *  frame is "unknown speaker" and every waveform animates at once. */
      segments?: { speakerId: string; startMs: number; endMs: number }[],
      speakerOrder?: string[]
    ): Promise<{ hz: number; durationMs: number; amp: number[]; speaker: number[] } | null> =>
      ipcRenderer.invoke("audio:analyzeFile", filePath, segments, speakerOrder),
  },

  media: {
    searchVideos: (query: string, providers?: ("pixabay" | "pexels")[], orientation?: "portrait" | "landscape") =>
      ipcRenderer.invoke("media:searchVideos", query, providers, orientation),
    download: (id: string, url: string): Promise<string> =>
      ipcRenderer.invoke("media:download", id, url),
    autoBackgrounds: (opts: unknown) => ipcRenderer.invoke("media:autoBackgrounds", opts),
    /** Everything already downloaded to this machine. */
    library: (): Promise<{
      fileName: string; filePath: string; kind: "video" | "audio";
      bytes: number; modifiedMs: number; source?: string;
    }[]> => ipcRenderer.invoke("media:library"),
  },

  sound: {
    /** Freesound, hard-filtered to CC0. Downloading uses media.download. */
    search: (query: string) => ipcRenderer.invoke("sound:search", query),
  },

  fonts: {
    list: () => ipcRenderer.invoke("fonts:list"),
    /** Downloads on first use, then reads from the cache. Returns the files
     *  and, honestly, whether the family really has Greek. */
    ensure: (family: string, weight: number) =>
      ipcRenderer.invoke("fonts:ensure", family, weight),
  },

  storage: {
    outputDir: (): Promise<string> => ipcRenderer.invoke("storage:outputDir"),
    openPath: (p: string): Promise<boolean> => ipcRenderer.invoke("storage:openPath", p),
    openOutputDir: (): Promise<boolean> =>
      ipcRenderer.invoke("storage:openOutputDir"),
    readFile: (filePath: string): Promise<ArrayBuffer> =>
      ipcRenderer.invoke("storage:readFile", filePath),
    writeFile: (filePath: string, data: ArrayBuffer): Promise<boolean> =>
      ipcRenderer.invoke("storage:writeFile", filePath, data),
  },

  brand: {
    /** The brand pack switched on for this computer, or null for none. */
    active: () => ipcRenderer.invoke("brand:active"),
  },

  music: {
    /** The loops that ship with the app. */
    list: (): Promise<{ name: string; filePath: string }[]> =>
      ipcRenderer.invoke("music:list"),
  },

  dramabox: {
    /** Write blocks.json and align.json for the current script and cast.
     *  The settings on each speaker travel with them. */
    writeBlocks: (
      scriptText: string,
      speakers: unknown[],
      outDir: string
    ): Promise<{
      ok: boolean;
      errors: string[];
      count?: number;
      summary: string[];
    }> => ipcRenderer.invoke("dramabox:writeBlocks", scriptText, speakers, outDir),
  },

  render: {
    start: (
      job: unknown
    ): Promise<
      | { ok: true; jobId: string; outputPath: string; durationSec: number; frames: number }
      | { ok: false; jobId: string; error: string }
    > => ipcRenderer.invoke("render:start", job),
    /** Stop the video being made. Whatever is half made is removed. */
    cancel: (): Promise<boolean> => ipcRenderer.invoke("render:cancel"),
    onProgress: (cb: (payload: { jobId: string; pct: number; note?: string }) => void) => {
      const listener = (_e: unknown, payload: any) => cb(payload);
      ipcRenderer.on("render:progress", listener);
      // return an unsubscribe function
      return () => ipcRenderer.removeListener("render:progress", listener);
    },
  },

  tts: {
    listPiperVoices: (voicesDir: string): Promise<{ id: string; name: string; onnxPath: string }[]> =>
      ipcRenderer.invoke("tts:listPiperVoices", voicesDir),
    synthesizePiper: (
      pythonPath: string,
      onnxPath: string,
      text: string
    ): Promise<{ audioBuffer: ArrayBuffer; durationMs: number }> =>
      ipcRenderer.invoke("tts:synthesizePiper", pythonPath, onnxPath, text),

    /** The voices on the saved ElevenLabs account. Empty when there is no key. */
    listElevenVoices: (): Promise<{ id: string; name: string; labels?: string }[]> =>
      ipcRenderer.invoke("tts:listElevenVoices"),

    generateNarration: (
      segments: import("./tts/buildNarration").NarrationInput[],
      speakerOrder: string[],
      pauses?: { sameMs: number; turnMs: number },
      /** The user's ElevenLabs price per 1,000 characters (Settings). */
      paid?: { pricePer1000?: number }
    ): Promise<{
      filePath: string;
      segments: { speakerId: string; speakerLabel: string; text: string; startMs: number; endMs: number }[];
      analysis: unknown;
    }> => ipcRenderer.invoke("tts:generateNarration", segments, speakerOrder, pauses, paid),
    /** One line made again and spliced into the narration; later lines move. */
    remakeLine: (
      req: {
        narrationPath: string;
        segments: import("./tts/buildNarration").BuiltNarration["segments"];
        index: number;
        input: import("./tts/buildNarration").NarrationInput;
        speakerOrder: string[];
      },
      paid?: { pricePer1000?: number }
    ): Promise<{ filePath: string; segments: import("./tts/buildNarration").BuiltNarration["segments"]; analysis: unknown }> =>
      ipcRenderer.invoke("tts:remakeLine", req, paid),
    /** The last narration again, translated and spoken in `target` ("el", "en"). */
    twinNarration: (target: string, paid?: { pricePer1000?: number }): Promise<{
      filePath: string;
      segments: { speakerId: string; speakerLabel: string; text: string; startMs: number; endMs: number }[];
      analysis: unknown;
    }> => ipcRenderer.invoke("tts:twinNarration", target, paid),
  },

  project: {
    /** The project named with --project on the command line, or null. */
    startup: (): Promise<unknown> => ipcRenderer.invoke("project:startup"),
  },

  mediaCache: {
    stats: (): Promise<{ dir: string; files: number; bytes: number }> => ipcRenderer.invoke("media:cacheStats"),
    cleanUp: (limitBytes: number, keep: string[]): Promise<{ removed: number; freedBytes: number; left: { files: number; bytes: number } }> =>
      ipcRenderer.invoke("media:cleanUp", limitBytes, keep),
  },
  /** Explainers — see electron/explainer/explainerIpc.ts for what each does. */
  explainer: {
    styles: (): Promise<{ imported: any[] }> => ipcRenderer.invoke("explainer:styles"),
    importStyle: (text: string): Promise<any> => ipcRenderer.invoke("explainer:importStyle", text),
    removeStyle: (id: string): Promise<boolean> => ipcRenderer.invoke("explainer:removeStyle", id),
    googleFonts: (): Promise<{ family: string; category: string }[]> => ipcRenderer.invoke("explainer:googleFonts"),
    fontData: (family: string): Promise<{ weight: number; range: string | null; data: Uint8Array }[]> => ipcRenderer.invoke("explainer:fontData", family),
    providers: (): Promise<{ id: string; label: string; hasKey: boolean }[]> => ipcRenderer.invoke("explainer:providers"),
    writeScenes: (req: unknown): Promise<any> => ipcRenderer.invoke("explainer:writeScenes", req),
    validate: (spec: unknown): Promise<string[]> => ipcRenderer.invoke("explainer:validate", spec),
    check: (spec: unknown): Promise<any> => ipcRenderer.invoke("explainer:check", spec),
    render: (req: unknown): Promise<{ made: string[]; spots?: string }> => ipcRenderer.invoke("explainer:render", req),
    importedPrompt: (req: unknown): Promise<{ file: string; chars: number }> => ipcRenderer.invoke("explainer:importedPrompt", req),
    importedGenerate: (req: unknown): Promise<any> => ipcRenderer.invoke("explainer:importedGenerate", req),
    importedLoad: (htmlPath: string): Promise<any> => ipcRenderer.invoke("explainer:importedLoad", htmlPath),
    importedRender: (req: unknown): Promise<{ made: string[] }> => ipcRenderer.invoke("explainer:importedRender", req),
    reveal: (file: string): Promise<boolean> => ipcRenderer.invoke("explainer:reveal", file),
    spotsFor: (mp4: string): Promise<{ format: string; width: number; height: number; slots: { x: number; y: number; size: number; outlineShape?: string }[] } | null> => ipcRenderer.invoke("explainer:spotsFor", mp4),
    cancel: (): Promise<boolean> => ipcRenderer.invoke("explainer:cancel"),
    onProgress: (cb: (p: { job: string; pct: number; note: string }) => void) => {
      const listener = (_e: unknown, payload: any) => cb(payload);
      ipcRenderer.on("explainer:progress", listener);
      return () => ipcRenderer.removeListener("explainer:progress", listener);
    },
  },

  /** Drawn characters' AI helper — see electron/characters/characterIpc.ts. */
  characters: {
    providers: (): Promise<{ id: string; label: string; hasKey: boolean; seesPictures: boolean }[]> => ipcRenderer.invoke("character:providers"),
    pickPicture: (): Promise<string | null> => ipcRenderer.invoke("character:pickPicture"),
    fromDescription: (req: unknown): Promise<any> => ipcRenderer.invoke("character:fromDescription", req),
    fromPicture: (req: unknown): Promise<any> => ipcRenderer.invoke("character:fromPicture", req),
    suggest: (req: unknown): Promise<any> => ipcRenderer.invoke("character:suggest", req),
    cancel: (): Promise<boolean> => ipcRenderer.invoke("character:cancel"),
  },

  forge: {
    /** Open Image Forge. False when it is not installed on this computer. */
    openImageForge: (): Promise<boolean> => ipcRenderer.invoke("forge:openImageForge"),
    removePuppet: (slug: string): Promise<{ ok: boolean; problem?: string }> => ipcRenderer.invoke("forge:removePuppet", slug),
    shelfPuppets: (): Promise<{ slug: string; name: string; rigPath: string; basePath: string; framing: "head" | "waist" | "full"; madeAt: string }[]> =>
      ipcRenderer.invoke("forge:shelfPuppets"),
    orderPuppet: (
      order: { name: string; description: string; style: string; framing: "head" | "waist" | "full"; auto: boolean },
      pictures: string[]
    ): Promise<{ ok: boolean; id?: string; opened?: boolean; problem?: string }> => ipcRenderer.invoke("forge:orderPuppet", order, pictures),
    orderResult: (id: string): Promise<{ slug: string | null; problem: string | null } | null> => ipcRenderer.invoke("forge:orderResult", id),
  },
  voice: {
    pronunciations: (): Promise<{ word: string; say: string }[]> => ipcRenderer.invoke("voice:pronunciations"),
    savePronunciations: (list: { word: string; say: string }[]): Promise<void> => ipcRenderer.invoke("voice:savePronunciations", list),
  },
  local: {
    models: (base: string): Promise<{ ok: boolean; models?: string[]; problem?: string }> => ipcRenderer.invoke("local:models", base),
  },
  batch: {
    readSheet: (source: { url?: string; file?: string }): Promise<Record<string, string>[]> => ipcRenderer.invoke("batch:readSheet", source),
    runMany: (req: unknown): Promise<{ ok: boolean; problem?: string }> => ipcRenderer.invoke("batch:runMany", req),
    stopMany: (): Promise<boolean> => ipcRenderer.invoke("batch:stopMany"),
    onEvent: (cb: (e: unknown) => void) => {
      const h = (_e: Electron.IpcRendererEvent, ev: unknown) => cb(ev);
      ipcRenderer.on("batch:event", h);
      return () => ipcRenderer.removeListener("batch:event", h);
    },
  },
  llm: {
    draftScript: (opts: {
      topic: string;
      speakerLabels: string[];
      languageName: string;
      tone?: string;
      characters?: string[];
    }): Promise<string> => ipcRenderer.invoke("llm:draftScript", opts),
  },
};

contextBridge.exposeInMainWorld("byok", api);

// Global typing so the renderer gets autocomplete for window.byok
export type ByokApi = typeof api;
