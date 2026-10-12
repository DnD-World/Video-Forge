// ---------------------------------------------------------------------------
// Raise or lower a voice by semitones, keeping its speed.
//
// Ak asked for it on 12 Oct 2026: Σερίφης' chosen voice (Gemini "Charon")
// was right, just not quite deep enough, and the voice models have no pitch
// control of their own. So the line is shifted after it is made.
//
// HOW. Play the samples at a different rate (asetrate) — pitch and speed both
// move — then stretch the timing back (atempo). Every ffmpeg build has both
// filters, unlike rubberband, so it works in the bundled one too.
// ---------------------------------------------------------------------------

import { spawn } from "node:child_process";
import { ffmpegBin } from "../process/ffmpegPath";

export function pitchShift(wav: Buffer, semitones: number): Promise<Buffer> {
  if (!semitones) return Promise.resolve(wav);
  const rate = wav.readUInt32LE(24);
  const f = Math.pow(2, semitones / 12);
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegBin(), [
      "-v", "error", "-i", "pipe:0",
      "-af", `asetrate=${Math.round(rate * f)},aresample=${rate},atempo=${(1 / f).toFixed(6)}`,
      "-ac", "1", "-c:a", "pcm_s16le", "-f", "wav", "pipe:1",
    ], { windowsHide: true });
    const out: Buffer[] = [];
    let err = "";
    p.stdout.on("data", (d) => out.push(d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`pitch shift failed: ${err.slice(0, 200)}`))));
    p.stdin.end(wav);
  });
}
