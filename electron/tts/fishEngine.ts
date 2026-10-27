// ---------------------------------------------------------------------------
// Fish Audio S2.1, through OpenRouter's free endpoint.
//
// WHY IT IS HERE. Not as a main voice: in Ak's two listening rounds (10 Oct
// 2026) it speaks Greek with a foreign accent, and he liked exactly that — "a
// funny foreigner speaking Greek". It is the character voice for a tourist, a
// visitor, a confused guest. It acts well and reads [x] markings natively.
//
// FREE, WITH CAVEATS. `fish-audio/s2.1-pro-free:free` costs nothing but is
// rate limited with no published numbers and no uptime promise
// (openrouter.ai/fish-audio/s2.1-pro-free:free, checked 10 Oct 2026).
// ---------------------------------------------------------------------------

import { spawn } from "node:child_process";
import * as keyStore from "../keyStore";
import { ffmpegBin } from "../process/ffmpegPath";

export const FISH_MODEL = "fish-audio/s2.1-pro-free:free";

/** MP3 in, 24 kHz mono 16-bit WAV out — the format the rest of the narration uses. */
function mp3ToWav(mp3: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegBin(), ["-v", "error", "-i", "pipe:0", "-ac", "1", "-ar", "24000", "-f", "wav", "pipe:1"]);
    const out: Buffer[] = [];
    let err = "";
    p.stdout.on("data", (d) => out.push(d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`ffmpeg: ${err.slice(0, 200)}`))));
    p.stdin.end(mp3);
  });
}

export async function synthesizeFish(text: string, direction?: string, keyOverride?: string): Promise<Buffer> {
  const key = keyOverride ?? (await keyStore.getKey("openrouter"));
  if (!key) throw new Error("No OpenRouter key saved (Settings → OpenRouter) — Fish Audio needs one. It's free.");
  // Fish reads a bracketed direction as acting, like the [x] markings.
  const input = direction ? `[${direction}] ${text}` : text;
  const res = await fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({ model: FISH_MODEL, input, response_format: "mp3" }),
  });
  if (res.status === 429) throw new Error("Fish Audio's free allowance is busy right now — try again in a minute, or use a Gemini voice.");
  if (!res.ok) throw new Error(`Fish Audio: HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
  return mp3ToWav(Buffer.from(await res.arrayBuffer()));
}
