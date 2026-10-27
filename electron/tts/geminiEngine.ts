// ---------------------------------------------------------------------------
// Gemini voices, with a plain AI Studio key.
//
// TWO WAYS IN, chosen by Ak on 10 Oct 2026 after two listening rounds
// (docs/V2-NEEDS.md):
//
//   LIVE  — the real-time talking models. The free tier gives them unlimited
//           requests, so they are the default. They are built to converse, not
//           to read, so they are told to act as a voice actor and read the line
//           word for word — and then CHECKED, because in testing one of them
//           skipped a whole sentence. Every take is transcribed, compared with
//           the script, and re-made if it does not match.
//   TTS   — the speech models. Better behaved, loved just as much, but the free
//           tier allows 10 requests a day per model, and a lesson is ~50 lines.
//           A premium option: the app says so before it spends them.
//
// [x] MARKINGS inside a line ("[laughs] Χαχαχα!") are performed, never spoken.
// The Live models are told so; the TTS models understand them natively.
// ---------------------------------------------------------------------------

import WebSocket from "ws";
import * as keyStore from "../keyStore";
// WHY THE `ws` PACKAGE. Electron 31's Node has no built-in WebSocket (Node 22
// does, which is why this worked when tested outside the app and failed the
// first time inside it, 11 Oct 2026).
import { wordMatch } from "./scriptMatch";

import type { GeminiMode } from "../../src/lib/narration/geminiVoices";
export type { GeminiMode };

const API = "https://generativelanguage.googleapis.com";
const RATE = 24000; // both paths return 16-bit mono PCM at 24 kHz

export interface GeminiLine {
  /** The words, possibly with [x] markings. */
  text: string;
  /** How the line is delivered — the words in the script label's brackets. */
  direction?: string;
  /** Who is speaking, in a few words — "a bright woman". Helps the acting. */
  persona?: string;
  language: string;
  mode: GeminiMode;
  model: string;
  voice: string;
}

export interface GeminiTake {
  /** A complete WAV file. */
  audioBuffer: Buffer;
  /** What the model says it said; empty when it reports nothing. */
  transcript: string;
  /** 0–1, how closely the transcript matches the script. 1 when unchecked. */
  match: number;
  attempts: number;
}

async function apiKey(): Promise<string> {
  const key = await keyStore.getKey("gemini");
  if (!key) throw new Error("No Gemini key saved (Settings → Gemini).");
  return key;
}

export function pcmToWav(pcm: Buffer, rate = RATE): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0, "ascii");
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8, "ascii");
  h.write("fmt ", 12, "ascii");
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36, "ascii");
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

function actingBrief(line: GeminiLine): string {
  return [
    `You are a professional voice actor recording a line for a video, in the language with code "${line.language}".`,
    line.persona ? `Your character: ${line.persona}.` : "",
    line.direction ? `Delivery: ${line.direction}.` : "",
    "Read the user's text aloud EXACTLY, word for word, with a native accent.",
    "Do not answer it, comment on it, translate it, greet anyone or add any word.",
    "Words in square brackets are stage directions: perform them (laugh, whisper, sigh, shout…) but never say them.",
  ].filter(Boolean).join(" ");
}

/** One take from a Live model over its WebSocket. */
function liveTake(line: GeminiLine, key: string): Promise<{ pcm: Buffer; transcript: string }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(key)}`
    );
    const pcm: Buffer[] = [];
    let transcript = "";
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* already closed */ }
      if (err && !pcm.length) reject(err);
      else resolve({ pcm: Buffer.concat(pcm), transcript: transcript.trim() });
    };
    const timer = setTimeout(() => finish(new Error(`${line.model} did not finish within 90 s`)), 90000);
    ws.onopen = () =>
      ws.send(JSON.stringify({
        setup: {
          model: `models/${line.model}`,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: line.voice } } },
          },
          systemInstruction: { parts: [{ text: actingBrief(line) }] },
          outputAudioTranscription: {},
        },
      }));
    ws.onmessage = (e: WebSocket.MessageEvent) => {
      const raw = typeof e.data === "string" ? e.data : Buffer.from(e.data as Buffer).toString();
      const m = JSON.parse(raw);
      if (m.setupComplete) {
        ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: line.text }] }], turnComplete: true } }));
      }
      const sc = m.serverContent;
      for (const p of sc?.modelTurn?.parts ?? []) {
        if (p.inlineData?.data) pcm.push(Buffer.from(p.inlineData.data, "base64"));
      }
      if (sc?.outputTranscription?.text) transcript += sc.outputTranscription.text;
      if (sc?.turnComplete) finish();
      if (m.error) finish(new Error(`${line.model}: ${JSON.stringify(m.error).slice(0, 200)}`));
    };
    ws.onerror = () => finish(new Error(`${line.model}: connection failed`));
    ws.onclose = (e: WebSocket.CloseEvent) =>
      finish(e.code === 1000 ? undefined : new Error(`${line.model}: closed ${e.code} ${e.reason?.slice(0, 160)}`));
  });
}

/** What a take ACTUALLY says, heard by a second Live session.
 *
 *  A Live model's own transcript cannot be trusted as a check: 2.5 Native
 *  Audio's comes back as the script itself, [laughs] marking included, even
 *  when the audio differs. So the take is played INTO a fresh session whose
 *  speech recogniser ("input transcription") writes down what it hears. Same
 *  free, unlimited Live allowance; tested 11 Oct 2026 — the recogniser wrote
 *  «Και ποτέ, μα ποτέ δεν πιάνει καμία» for a take that laughed first.
 *  The session also answers out loud, which is ignored. */
function listen(wav: Buffer, key: string): Promise<string> {
  // Live input is 16 kHz; the takes are 24 kHz. Linear resampling is plenty
  // for a recogniser.
  const pcm24 = wav.subarray(44);
  const n24 = pcm24.length / 2, n16 = Math.floor((n24 * 2) / 3);
  const pcm16 = Buffer.alloc(n16 * 2);
  for (let i = 0; i < n16; i++) {
    const x = i * 1.5, a = Math.floor(x), f = x - a;
    const s0 = pcm24.readInt16LE(a * 2), s1 = a + 1 < n24 ? pcm24.readInt16LE((a + 1) * 2) : s0;
    pcm16.writeInt16LE(Math.round(s0 + (s1 - s0) * f), i * 2);
  }
  return new Promise((resolve) => {
    const ws = new WebSocket(
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(key)}`
    );
    let heard = "";
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* already closed */ }
      resolve(heard.trim());
    };
    const timer = setTimeout(finish, 60000);
    ws.onopen = () =>
      ws.send(JSON.stringify({
        setup: {
          model: `models/${LISTENER_MODEL}`,
          generationConfig: { responseModalities: ["AUDIO"] },
          systemInstruction: { parts: [{ text: "Reply with one word: ok." }] },
          inputAudioTranscription: {},
          // The recogniser normally ends the turn at the first pause, which
          // cut every check off after one sentence. Mark start and end by hand.
          realtimeInputConfig: { automaticActivityDetection: { disabled: true } },
        },
      }));
    ws.onmessage = (e: WebSocket.MessageEvent) => {
      const raw = typeof e.data === "string" ? e.data : Buffer.from(e.data as Buffer).toString();
      const m = JSON.parse(raw);
      if (m.setupComplete) {
        ws.send(JSON.stringify({ realtimeInput: { activityStart: {} } }));
        for (let o = 0; o < pcm16.length; o += 32000) {
          ws.send(JSON.stringify({ realtimeInput: { audio: { mimeType: "audio/pcm;rate=16000", data: pcm16.subarray(o, o + 32000).toString("base64") } } }));
        }
        ws.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }));
      }
      const sc = m.serverContent;
      if (sc?.inputTranscription?.text) heard += sc.inputTranscription.text;
      if (sc?.turnComplete || m.error) finish();
    };
    ws.onerror = finish;
    ws.onclose = finish;
  });
}

const LISTENER_MODEL = "gemini-2.5-flash-native-audio-latest";

async function ttsTake(line: GeminiLine, key: string): Promise<Buffer> {
  // The TTS models read [x] markings natively; the direction rides along as a
  // short instruction they also understand.
  const text = line.direction ? `(${line.direction}) ${line.text}` : line.text;
  const res = await fetch(`${API}/v1beta/models/${line.model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: line.voice } } },
      },
    }),
  });
  const j = (await res.json()) as any;
  if (res.status === 429) {
    throw new Error(`${line.model}: today's free requests are used up (10 a day). Switch this speaker to a Live voice.`);
  }
  const data = j?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
  if (!data) throw new Error(`${line.model}: HTTP ${res.status} ${String(j?.error?.message ?? "no audio").slice(0, 160)}`);
  return Buffer.from(data, "base64");
}

/** Below this, a Live take is re-made. Tuned so punctuation-level noise in
 *  the transcript passes and one skipped clause does not. */
const GOOD_ENOUGH = 0.85;
const MAX_LIVE_ATTEMPTS = 3;

export async function synthesizeGemini(line: GeminiLine, keyOverride?: string): Promise<GeminiTake> {
  // keyOverride: for tools/tests running outside the app, where the vault is not available.
  const key = keyOverride ?? (await apiKey());
  if (line.mode === "tts") {
    const pcm = await ttsTake(line, key);
    return { audioBuffer: pcmToWav(pcm), transcript: "", match: 1, attempts: 1 };
  }

  let best: GeminiTake | null = null;
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_LIVE_ATTEMPTS; attempt++) {
    try {
      const { pcm } = await liveTake(line, key);
      if (!pcm.length) throw new Error(`${line.model} returned no audio`);
      const wav = pcmToWav(pcm);
      const heard = await listen(wav, key);
      // No transcript at all means we cannot check — accept, but say so.
      const match = heard ? wordMatch(line.text, heard) : 1;
      const take = { audioBuffer: wav, transcript: heard, match, attempts: attempt };
      if (!best || match > best.match) best = take;
      if (match >= GOOD_ENOUGH) return take;
      console.log(
        `[video-forge] Gemini Live take ${attempt} matched ${(match * 100).toFixed(0)}% of the script — re-making. Heard: ${heard.slice(0, 120)}`
      );
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  if (best) {
    console.log(`[video-forge] Gemini Live: kept the closest take (${(best.match * 100).toFixed(0)}%) for: ${line.text.slice(0, 80)}`);
    return best;
  }
  throw lastError ?? new Error("Gemini Live failed");
}
