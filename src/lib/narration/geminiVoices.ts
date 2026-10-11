// The Gemini voice choices, shared by the engine (electron/tts/geminiEngine.ts)
// and the pickers in the app. Ak's picks, 10 Oct 2026 — docs/V2-NEEDS.md.

export type GeminiMode = "live" | "tts";

export interface GeminiModelChoice {
  id: string;
  mode: GeminiMode;
  label: string;
}

/** Live first: unlimited on the free tier, and Ak loved both. */
export const GEMINI_MODELS: GeminiModelChoice[] = [
  { id: "gemini-2.5-flash-native-audio-latest", mode: "live", label: "Gemini 2.5 Native Audio — free, unlimited" },
  { id: "gemini-3.1-flash-live-preview", mode: "live", label: "Gemini 3.1 Flash Live — free, unlimited" },
  { id: "gemini-3.8-flash-tts", mode: "tts", label: "Gemini 3.8 Flash TTS — 10 lines a day free" },
  { id: "gemini-3.1-flash-tts-preview", mode: "tts", label: "Gemini 3.1 Flash TTS — 10 lines a day free" },
  { id: "gemini-3.8-flash-lite-tts", mode: "tts", label: "Gemini 3.8 Flash-Lite TTS — 10 lines a day free" },
];

export const DEFAULT_GEMINI_MODEL = GEMINI_MODELS[0].id;
export const DEFAULT_GEMINI_VOICE = "Kore";

/** Google's prebuilt voices, by how they come across (Google's own words). */
export const GEMINI_VOICES: { name: string; feel: string }[] = [
  { name: "Kore", feel: "firm" }, { name: "Aoede", feel: "breezy" }, { name: "Leda", feel: "youthful" },
  { name: "Zephyr", feel: "bright" }, { name: "Callirrhoe", feel: "easy-going" }, { name: "Autonoe", feel: "bright" },
  { name: "Despina", feel: "smooth" }, { name: "Erinome", feel: "clear" }, { name: "Laomedeia", feel: "upbeat" },
  { name: "Achernar", feel: "soft" }, { name: "Gacrux", feel: "mature" }, { name: "Pulcherrima", feel: "forward" },
  { name: "Vindemiatrix", feel: "gentle" }, { name: "Sulafat", feel: "warm" },
  { name: "Puck", feel: "upbeat" }, { name: "Charon", feel: "informative" }, { name: "Fenrir", feel: "excitable" },
  { name: "Orus", feel: "firm" }, { name: "Enceladus", feel: "breathy" }, { name: "Iapetus", feel: "clear" },
  { name: "Umbriel", feel: "easy-going" }, { name: "Algieba", feel: "smooth" }, { name: "Algenib", feel: "gravelly" },
  { name: "Rasalgethi", feel: "informative" }, { name: "Alnilam", feel: "firm" }, { name: "Schedar", feel: "even" },
  { name: "Achird", feel: "friendly" }, { name: "Zubenelgenubi", feel: "casual" }, { name: "Sadachbia", feel: "lively" },
  { name: "Sadaltager", feel: "knowledgeable" },
];

export function geminiModeOf(modelId: string | undefined): GeminiMode {
  return GEMINI_MODELS.find((m) => m.id === modelId)?.mode ?? "live";
}

export type VoiceEngine = "gemini" | "elevenlabs" | "piper";

/** Which engine a speaker really uses. DramaBox was retired on 10 Oct 2026
 *  (it needed a rented Google Cloud GPU), so old projects that still say
 *  "dramabox" — or say nothing — get the free default instead. */
export function engineOf(sp: { ttsEngine?: string }): VoiceEngine {
  return sp.ttsEngine === "elevenlabs" || sp.ttsEngine === "piper" ? sp.ttsEngine : "gemini";
}
