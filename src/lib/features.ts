// ---------------------------------------------------------------------------
// Engines that exist in the code but are switched off in the app.
//
// Both are future features, decided 3 Oct 2026:
//
//   Chatterbox — ran once, was rejected on sound, and its server was
//                uninstalled on 14 Aug. Offering it can only produce an error.
//   DramaBox   — the preferred voice, but it needs a 24 GB card and runs on a
//                rented machine from tools/. There is no in-app path yet.
//
// Switched off rather than deleted: the code paths stay, and turning one back
// on is a one-word change here. The headless batch runner (`npm run job`) is
// deliberately NOT gated — lesson jobs already narrated with DramaBox must keep
// rendering.
//
// Every engine picker shows both as "coming soon" instead of hiding them, so
// nobody goes looking for a voice they read about in the docs.
// ---------------------------------------------------------------------------

export const FEATURES = {
  chatterbox: false,
  dramabox: false,
} as const;

export type TtsEngine = "piper" | "chatterbox";

/** The engine a speaker actually uses. A speaker saved while Chatterbox was on
 *  (or one with no engine set, which used to mean Chatterbox) falls back to
 *  Piper, so nothing ever asks for a server that isn't there. */
export function engineOf(sp: { ttsEngine?: TtsEngine }): TtsEngine {
  if (sp.ttsEngine === "chatterbox" && FEATURES.chatterbox) return "chatterbox";
  if (sp.ttsEngine === undefined && FEATURES.chatterbox) return "chatterbox";
  return "piper";
}

/** Options for every voice-engine picker. Disabled entries are shown, dimmed,
 *  with the reason on the right. */
export const ENGINE_OPTIONS: { value: string; label: string; note?: string; disabled?: boolean }[] = [
  { value: "piper", label: "Piper — free, on this computer" },
  FEATURES.chatterbox
    ? { value: "chatterbox", label: "Chatterbox — higher quality" }
    : { value: "chatterbox", label: "Chatterbox", note: "coming soon", disabled: true },
  { value: "dramabox", label: "DramaBox — studio quality", note: "coming soon", disabled: true },
];
