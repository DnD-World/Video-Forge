// ---------------------------------------------------------------------------
// Concatenates multiple WAV buffers (must share sample rate/channels/bit
// depth — true for consecutive calls to the same TTS engine/voice) into one
// combined WAV, and returns each segment's start/end time within it. That
// timing is essential later for viseme/subtitle sync against the combined
// narration track, so it's returned now rather than recomputed later.
// ---------------------------------------------------------------------------

export interface ConcatResult {
  buffer: Buffer;
  segments: { startMs: number; endMs: number }[];
}

interface WavInfo {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
  dataStart: number;
  dataSize: number;
}

function readWavInfo(buf: Buffer): WavInfo {
  const numChannels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const bitsPerSample = buf.readUInt16LE(34);

  let offset = 12;
  let dataStart = 44;
  let dataSize = Math.max(0, buf.length - 44);
  while (offset < buf.length - 8) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") {
      dataStart = offset + 8;
      dataSize = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }

  return { numChannels, sampleRate, bitsPerSample, dataStart, dataSize };
}

function buildWavHeader(
  dataLength: number,
  numChannels: number,
  sampleRate: number,
  bitsPerSample: number
): Buffer {
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const buf = Buffer.alloc(44);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataLength, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataLength, 40);
  return buf;
}

/**
 * @param gapsMs Silence to insert BEFORE each segment, same length as
 *   `buffers`. The first entry is normally 0 — leading silence just delays the
 *   video. A returned segment's start time is after its own gap, so subtitles
 *   and visemes stay tied to the audio rather than to the pause in front of it.
 */
/** Any 16-bit PCM WAV → mono 16-bit at `rate`, by linear interpolation.
 *  Speech only needs to sound right, not survive a mastering engineer. */
function toMono16(buf: Buffer, info: WavInfo, rate: number): Buffer {
  if (info.bitsPerSample !== 16) {
    throw new Error(`Can't mix a ${info.bitsPerSample}-bit voice with the others — only 16-bit audio is supported.`);
  }
  const ch = info.numChannels;
  const frames = Math.floor(info.dataSize / (2 * ch));
  const at = (f: number) => {
    let sum = 0;
    for (let c = 0; c < ch; c++) sum += buf.readInt16LE(info.dataStart + (f * ch + c) * 2);
    return sum / ch;
  };
  const outFrames = Math.floor((frames * rate) / info.sampleRate);
  const step = info.sampleRate / rate;
  const pcm = Buffer.alloc(outFrames * 2);
  for (let i = 0; i < outFrames; i++) {
    const x = i * step, a = Math.floor(x), f = x - a;
    const s0 = at(a), s1 = a + 1 < frames ? at(a + 1) : s0;
    pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s0 + (s1 - s0) * f))), i * 2);
  }
  return Buffer.concat([buildWavHeader(pcm.length, 1, rate, 16), pcm]);
}

export function concatWavBuffers(buffers: Buffer[], gapsMs: number[] = []): ConcatResult {
  if (buffers.length === 0) {
    throw new Error("No audio segments to concatenate.");
  }

  let infos = buffers.map(readWavInfo);
  // A cast can mix engines — Piper speaks at 22.05 kHz, Gemini at 24 kHz — and
  // raw samples at two rates cannot simply be laid end to end. When the
  // formats differ, everything is brought to 24 kHz mono 16-bit first.
  const mixed = infos.some(
    (i) =>
      i.numChannels !== infos[0].numChannels ||
      i.sampleRate !== infos[0].sampleRate ||
      i.bitsPerSample !== infos[0].bitsPerSample
  );
  if (mixed) {
    buffers = buffers.map((b, k) => toMono16(b, infos[k], 24000));
    infos = buffers.map(readWavInfo);
  }
  const { numChannels, sampleRate, bitsPerSample } = infos[0];

  const bytesPerSecond = sampleRate * numChannels * (bitsPerSample / 8);
  const segments: { startMs: number; endMs: number }[] = [];
  const pcmChunks: Buffer[] = [];
  let cursorMs = 0;

  const blockAlign = numChannels * (bitsPerSample / 8);

  for (let i = 0; i < buffers.length; i++) {
    // Digital silence, block-aligned so a gap can never shift the following
    // samples off their frame boundary and turn the rest of the file to noise.
    const gapMs = Math.max(0, gapsMs[i] ?? 0);
    if (gapMs > 0) {
      const bytes = Math.round((gapMs / 1000) * bytesPerSecond / blockAlign) * blockAlign;
      if (bytes > 0) {
        pcmChunks.push(Buffer.alloc(bytes));
        cursorMs += (bytes / bytesPerSecond) * 1000;
      }
    }

    const { dataStart, dataSize } = infos[i];
    pcmChunks.push(buffers[i].subarray(dataStart, dataStart + dataSize));
    const durMs = (dataSize / bytesPerSecond) * 1000;
    segments.push({ startMs: cursorMs, endMs: cursorMs + durMs });
    cursorMs += durMs;
  }

  const pcmData = Buffer.concat(pcmChunks);
  const header = buildWavHeader(pcmData.length, numChannels, sampleRate, bitsPerSample);
  return { buffer: Buffer.concat([header, pcmData]), segments };
}
