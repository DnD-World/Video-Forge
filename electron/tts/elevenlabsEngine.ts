// ---------------------------------------------------------------------------
// ElevenLabs — a third voice, and the first one that costs money per word.
//
// WHY IT IS HERE AT ALL, having been on the cut list. DramaBox acts and costs
// about five dollars of rented card for the whole course, but it lives on a
// machine that has to be started, fed, waited for and switched off. ElevenLabs
// is an HTTP call. Ak is paying for the difference deliberately.
//
// WHAT IT COSTS, measured rather than guessed: lesson 101.1 is 4,640 characters
// of Greek, and a credit is a character. Seventy-two lessons is 334,080 — one
// month of Pro, or three of Creator with no room for second thoughts. Every
// re-render spends it again, which the GPU never does.
//
// RAW PCM, NOT MP3. The app's analysis reads 16-bit PCM: it is what makes a
// waveform move, what lets a music bed loop, and what the aligner needs. An MP3
// would play and analyse as nothing. So the API is asked for pcm_44100 and the
// WAV header is written here — the response is bare samples with no container.
// ---------------------------------------------------------------------------

import * as keyStore from "../keyStore";

const BASE = "https://api.elevenlabs.io/v1";

/** The two models worth offering, and the difference between them.
 *
 *  `eleven_v3` is the one that acts. It reads bracketed tags — `[sighs]`,
 *  `[whispers]`, `[laughs]` — placed in the text, which is the same job the
 *  stage directions do for DramaBox, and `src/lib/narration/elevenTags.ts`
 *  turns one into the other so a script does not have to be written twice.
 *  Greek is on its published list of 70-odd languages, which is more than
 *  could be said for either of the other two engines here.
 *
 *  `eleven_multilingual_v2` is kept because it is the one that has always
 *  been here, it takes a continuous stability and a speed, and it is the
 *  fallback if v3 turns out to hallucinate on Greek. It ignores tags — it
 *  reads them out — so a character on v2 never gets one. */
export const ELEVEN_MODELS = ["eleven_v3", "eleven_multilingual_v2"] as const;
export type ElevenModel = (typeof ELEVEN_MODELS)[number];
const DEFAULT_MODEL: ElevenModel = "eleven_v3";

/** 44.1k PCM IS A PRO-PLAN FEATURE. Documented, and it fails at request time
 *  on anything cheaper — which on Creator is every line of every lesson.
 *
 *  So the first choice is asked for and the second is used if the account is
 *  not entitled to it. 24k is not gated, and nothing downstream cares: every
 *  reader in `electron/audio` takes the rate from the WAV header. What they do
 *  care about is that all of them MATCH, so the rate is returned with the
 *  audio and the header is written from it rather than from a constant. */
const PREFERRED_RATE = 44100;
const FALLBACK_RATE = 24000;

export interface ElevenVoiceSettings {
  /** 0–1. Low wanders and is more expressive; high is steady and flatter.
   *
   *  v3 TAKES ONLY THREE VALUES — 0.0 Creative, 0.5 Natural, 1.0 Robust — and
   *  anything between them is rejected. Snapped, not passed through, so a
   *  slider left at 0.35 does not fail a whole lesson at line one. */
  stability?: number;
  /** 0–1. How closely it holds to the original voice. */
  similarityBoost?: number;
  /** 0–1. Exaggeration. v2 only — v3 has no style and rejects it. */
  style?: number;
  /** 0.7–1.2. v2 only. On v3 speed comes from a tag: `[rushed]`, `[slowly]`. */
  speed?: number;
  useSpeakerBoost?: boolean;
}

export interface ElevenSynthesizeOptions {
  text: string;
  /** From the voice library or a clone. Not a name — the id. */
  voiceId: string;
  modelId?: string;
  settings?: ElevenVoiceSettings;
}

/** The nearest of the three values v3 accepts. */
function snapStability(v: number): number {
  return [0, 0.5, 1].reduce((best, cand) =>
    Math.abs(cand - v) < Math.abs(best - v) ? cand : best
  );
}

/** Bare samples in, a playable file out.
 *
 *  Written by hand rather than pulled from a library because it is forty bytes
 *  of header and one more dependency is not worth it. Mono, 16-bit, little
 *  endian — what the API returns for pcm_*. */
function wrapPcmAsWav(pcm: Buffer, sampleRate: number, channels = 1): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * 2;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);           // fmt chunk size
  header.writeUInt16LE(1, 20);            // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(channels * 2, 32); // block align
  header.writeUInt16LE(16, 34);           // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

/** How many credits a piece of text will cost. A character is a credit. */
export function creditsFor(text: string): number {
  return text.length;
}

export async function synthesize(
  opts: ElevenSynthesizeOptions
): Promise<{
  audioBuffer: ArrayBuffer;
  durationMs: number;
  credits: number;
  /** What the account was actually entitled to — see PREFERRED_RATE. */
  sampleRate: number;
}> {
  const apiKey = await keyStore.getKey("elevenlabs");
  if (!apiKey) {
    throw new Error(
      "No ElevenLabs API key saved — add one in Backend Settings first."
    );
  }
  if (!opts.voiceId) {
    throw new Error(
      "This speaker has no ElevenLabs voice id. Pick one in the Cast panel — " +
        "it is the id from your voice library, not the voice's name."
    );
  }

  const s = opts.settings ?? {};
  const model = (opts.modelId ?? DEFAULT_MODEL) as ElevenModel;
  const isV3 = model.startsWith("eleven_v3");

  // ONE SETTINGS OBJECT PER MODEL, not one with fields the model will reject.
  // v3 has no `style` and no `speed` — speed is a tag — and its stability is
  // three positions rather than a slider. Sending v2's shape to it is a 422 on
  // the first line of the lesson, which is the whole lesson.
  const voiceSettings = isV3
    ? {
        stability: snapStability(s.stability ?? 0.5),
        similarity_boost: s.similarityBoost ?? 0.75,
        use_speaker_boost: s.useSpeakerBoost ?? true,
      }
    : {
        stability: s.stability ?? 0.5,
        similarity_boost: s.similarityBoost ?? 0.75,
        style: s.style ?? 0,
        speed: s.speed ?? 1,
        use_speaker_boost: s.useSpeakerBoost ?? true,
      };

  const body = JSON.stringify({
    text: opts.text,
    model_id: model,
    voice_settings: voiceSettings,
  });

  const ask = (rate: number) =>
    fetch(
      `${BASE}/text-to-speech/${encodeURIComponent(opts.voiceId)}` +
        `?output_format=pcm_${rate}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/pcm",
        },
        body,
      }
    );

  let sampleRate = PREFERRED_RATE;
  let res = await ask(sampleRate);

  // The plan, not the request, is what was wrong. 44.1k PCM is Pro and above;
  // below that the same call at 24k succeeds. Retried once and said out loud,
  // because silently dropping the rate would be a quality change nobody asked
  // for and nobody was told about.
  if (!res.ok && (res.status === 401 || res.status === 403)) {
    const first = await res.text();
    if (/tier|subscription|plan|pro/i.test(first)) {
      console.warn(
        `[elevenlabs] 44.1kHz PCM needs the Pro plan — falling back to ${FALLBACK_RATE}Hz ` +
          `for this account. Audio is fine; it is simply not 44.1k.`
      );
      sampleRate = FALLBACK_RATE;
      res = await ask(sampleRate);
    } else {
      throw new Error("ElevenLabs refused the key. Check it in Backend Settings.");
    }
  }

  if (!res.ok) {
    // Translated where it is worth translating. A quota message that reads
    // "unusual activity" has cost people hours of looking in the wrong place.
    const text = await res.text();
    if (res.status === 401) {
      throw new Error("ElevenLabs refused the key. Check it in Backend Settings.");
    }
    if (res.status === 422) {
      throw new Error(
        `ElevenLabs could not use that request — usually a voice id that does not ` +
          `exist on this account. ${text.slice(0, 200)}`
      );
    }
    if (res.status === 429) {
      throw new Error(
        `ElevenLabs says: too many requests, or the monthly credits are gone. ` +
          `${text.slice(0, 200)}`
      );
    }
    throw new Error(`ElevenLabs ${res.status} ${res.statusText} — ${text.slice(0, 300)}`);
  }

  const pcm = Buffer.from(await res.arrayBuffer());
  const wav = wrapPcmAsWav(pcm, sampleRate);
  const durationMs = (pcm.length / 2 / sampleRate) * 1000;

  return {
    audioBuffer: wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer,
    durationMs,
    credits: creditsFor(opts.text),
    sampleRate,
  };
}

/** The voices on this account, so the Cast panel can offer a list rather than
 *  asking someone to paste an id they have to go and find. */
export async function listVoices(): Promise<{ id: string; name: string; labels?: string }[]> {
  const apiKey = await keyStore.getKey("elevenlabs");
  if (!apiKey) return [];
  const res = await fetch(`${BASE}/voices`, { headers: { "xi-api-key": apiKey } });
  if (!res.ok) return [];
  const body = (await res.json()) as {
    voices?: { voice_id: string; name: string; labels?: Record<string, string> }[];
  };
  return (body.voices ?? []).map((v) => ({
    id: v.voice_id,
    name: v.name,
    labels: v.labels ? Object.values(v.labels).join(", ") : undefined,
  }));
}
