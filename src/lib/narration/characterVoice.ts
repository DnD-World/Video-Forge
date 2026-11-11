// ---------------------------------------------------------------------------
// Whose voice a speaker speaks with (character creator phase 1, 6 Nov 2026).
//
// A drawn character can carry their own voice on their card (`character.voice`:
// engine, voice, model, pitch, speed). It travels with them into every project.
//
// The speaker's own voice fields (ttsEngine, geminiVoice, voiceId, elevenVoiceId,
// pitch, speed …) are the PROJECT'S voice for them. They are used when:
//   · the character has no voice of their own (every speaker before this, and
//     every puppet), or
//   · the project overrides it: `voiceOverride: true` ("in this project only").
// Otherwise the character's own voice is used, and the speaker's fields are
// ignored. Changing the voice in a project sets the override and writes only the
// speaker's fields; the character's voice is never touched from here.
//
// Every place that asks "what does this speaker sound like" goes through
// voicedSpeaker(), so the narration, a remade line, the ▶ sample and the batch
// can never disagree.
// ---------------------------------------------------------------------------

import type { SpeakerConfig } from "../../store/types";
import type { CharacterVoice } from "../../../characters/core/index.mjs";
import { DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_VOICE, engineOf } from "./geminiVoices.ts";

type VoiceFields = Pick<SpeakerConfig, "ttsEngine" | "geminiModel" | "geminiVoice" | "voiceId" | "elevenVoiceId" | "elevenModel" | "pitch" | "speed">;

/** The speaker fields that say "this voice". Engines that don't use a field leave it unset. */
export function speakerFieldsOf(v: CharacterVoice): VoiceFields {
  const id = v.voiceId || undefined, model = v.model || undefined;
  const base: VoiceFields = {
    ttsEngine: v.engine, pitch: v.pitch, speed: v.speed,
    geminiModel: undefined, geminiVoice: undefined, voiceId: undefined, elevenVoiceId: undefined, elevenModel: undefined,
  };
  if (v.engine === "gemini") return { ...base, geminiVoice: id, geminiModel: model };
  if (v.engine === "piper") return { ...base, voiceId: id };
  if (v.engine === "elevenlabs") {
    const m = model === "eleven_v3" || model === "eleven_multilingual_v2" ? model : undefined;
    return { ...base, elevenVoiceId: id, elevenModel: m };
  }
  return base; // fish: one voice
}

/** The character's own voice, when this speaker is a drawn character that has one. */
export function characterVoiceOf(sp: Pick<SpeakerConfig, "character">): CharacterVoice | null {
  const v = sp.character?.voice;
  return v && typeof v === "object" && typeof v.engine === "string" ? v : null;
}

/** Is the project using its own voice for this speaker instead of the character's? */
export function usesProjectVoice(sp: Pick<SpeakerConfig, "character" | "voiceOverride">): boolean {
  return !characterVoiceOf(sp) || sp.voiceOverride === true;
}

/** The speaker as they will sound: with the character's own voice in place, unless the project overrides it. */
export function voicedSpeaker<T extends SpeakerConfig>(sp: T): T {
  const v = characterVoiceOf(sp);
  if (!v || sp.voiceOverride === true) return sp;
  return { ...sp, ...speakerFieldsOf(v) };
}

/**
 * The patch for changing one voice setting in THIS PROJECT ONLY. The first change copies the
 * character's voice into the speaker (so nothing else moves) and switches the override on.
 */
export function projectVoicePatch(sp: SpeakerConfig, change: Partial<SpeakerConfig>): Partial<SpeakerConfig> {
  const v = characterVoiceOf(sp);
  if (!v || sp.voiceOverride === true) return change;
  return { ...speakerFieldsOf(v), ...change, voiceOverride: true };
}

/** The speaker's current voice as a character voice (to give a drawn character a voice of their own). */
export function voiceFromSpeaker(sp: SpeakerConfig): CharacterVoice {
  const engine = engineOf(sp);
  const voiceId = engine === "gemini" ? sp.geminiVoice ?? DEFAULT_GEMINI_VOICE : engine === "piper" ? sp.voiceId ?? "" : engine === "elevenlabs" ? sp.elevenVoiceId ?? "" : "";
  const model = engine === "gemini" ? sp.geminiModel ?? DEFAULT_GEMINI_MODEL : engine === "elevenlabs" ? sp.elevenModel ?? "" : "";
  return { engine, voiceId, model, pitch: sp.pitch ?? 0, speed: sp.speed ?? 1 };
}

/** Back to the character's own voice. The project's settings are left in place for next time. */
export const characterVoicePatch = (): Partial<SpeakerConfig> => ({ voiceOverride: false });
