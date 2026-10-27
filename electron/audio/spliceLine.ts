// ---------------------------------------------------------------------------
// Re-making ONE line of a finished narration (plan item #16).
//
// The narration is one WAV with a list of segments (start/end in ms). To
// replace line N we cut that line's samples out of the file, put the new
// line's samples in, and move every later line by the difference in length.
// The gaps between lines are left exactly as they were.
//
// Pure on purpose: no electron, no file access, no relative imports, so
// tools/lib/spliceLine.test.mjs runs it with plain node and synthetic WAVs.
// ---------------------------------------------------------------------------

interface WavInfo {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
  dataStart: number;
  dataSize: number;
}

function readWav(buf: Buffer): WavInfo {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF") throw new Error("That is not a WAV file.");
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
      dataSize = Math.min(size, buf.length - dataStart);
      break;
    }
    offset += 8 + size + (size % 2);
  }
  return { numChannels, sampleRate, bitsPerSample, dataStart, dataSize };
}

function header(dataLength: number, ch: number, rate: number, bits: number): Buffer {
  const blockAlign = ch * (bits / 8);
  const b = Buffer.alloc(44);
  b.write("RIFF", 0, "ascii");
  b.writeUInt32LE(36 + dataLength, 4);
  b.write("WAVE", 8, "ascii");
  b.write("fmt ", 12, "ascii");
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(ch, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * blockAlign, 28);
  b.writeUInt16LE(blockAlign, 32);
  b.writeUInt16LE(bits, 34);
  b.write("data", 36, "ascii");
  b.writeUInt32LE(dataLength, 40);
  return b;
}

/** The new line's samples in the file's own format (rate and channel count). */
function pcmInFormat(line: Buffer, to: WavInfo): Buffer {
  const from = readWav(line);
  if (from.numChannels === to.numChannels && from.sampleRate === to.sampleRate && from.bitsPerSample === to.bitsPerSample) {
    return line.subarray(from.dataStart, from.dataStart + from.dataSize);
  }
  if (from.bitsPerSample !== 16 || to.bitsPerSample !== 16) {
    throw new Error("Only 16-bit voices can be mixed into a finished narration.");
  }
  const frames = Math.floor(from.dataSize / (2 * from.numChannels));
  const at = (f: number) => {
    let sum = 0;
    for (let c = 0; c < from.numChannels; c++) sum += line.readInt16LE(from.dataStart + (f * from.numChannels + c) * 2);
    return sum / from.numChannels;
  };
  const outFrames = Math.floor((frames * to.sampleRate) / from.sampleRate);
  const step = from.sampleRate / to.sampleRate;
  const out = Buffer.alloc(outFrames * to.numChannels * 2);
  for (let i = 0; i < outFrames; i++) {
    const x = i * step;
    const a = Math.floor(x);
    const fr = x - a;
    const s0 = at(a);
    const s1 = a + 1 < frames ? at(a + 1) : s0;
    const v = Math.max(-32768, Math.min(32767, Math.round(s0 + (s1 - s0) * fr)));
    for (let c = 0; c < to.numChannels; c++) out.writeInt16LE(v, (i * to.numChannels + c) * 2);
  }
  return out;
}

export interface Spliced {
  buffer: Buffer;
  /** What the line now lasts, measured from the samples that went in. */
  newDurationMs: number;
  /** How much longer (+) or shorter (-) the whole narration became, measured
   *  from the samples that came out and went in. */
  deltaMs: number;
}

/** Replace the samples between `startMs` and `endMs` with `line`'s samples. */
export function spliceWav(file: Buffer, startMs: number, endMs: number, line: Buffer): Spliced {
  const info = readWav(file);
  const blockAlign = info.numChannels * (info.bitsPerSample / 8);
  const bytesPerSecond = info.sampleRate * blockAlign;
  const toByte = (ms: number) => {
    const b = Math.round(((ms / 1000) * bytesPerSecond) / blockAlign) * blockAlign;
    return Math.max(0, Math.min(info.dataSize, b));
  };
  const a = toByte(startMs);
  const b = Math.max(a, toByte(endMs));
  const pcm = pcmInFormat(line, info);
  const aligned = pcm.subarray(0, pcm.length - (pcm.length % blockAlign));
  if (aligned.length === 0) throw new Error("The new line came back empty.");
  const data = file.subarray(info.dataStart, info.dataStart + info.dataSize);
  const out = Buffer.concat([data.subarray(0, a), aligned, data.subarray(b)]);
  const toMs = (bytes: number) => (bytes / bytesPerSecond) * 1000;
  return {
    buffer: Buffer.concat([header(out.length, info.numChannels, info.sampleRate, info.bitsPerSample), out]),
    newDurationMs: toMs(aligned.length),
    deltaMs: toMs(aligned.length) - toMs(b - a),
  };
}

export interface TimedSegment {
  startMs: number;
  endMs: number;
  words?: { text: string; startMs: number; endMs: number }[];
}

/** The segment list after line `index` became `newDurationMs` long: that line
 *  ends where its new audio ends, every later line (and its words) moves by
 *  the difference. `replacement` overlays the remade line's own fields. The
 *  remade line's word times are dropped — they described the old audio.
 *  `deltaMs` (from spliceWav) is exact to the sample; without it the delta is
 *  worked out from the old and new lengths. */
export function retimeSegments<T extends TimedSegment>(
  segments: T[],
  index: number,
  newDurationMs: number,
  replacement: Partial<T> = {},
  deltaMs?: number
): T[] {
  if (index < 0 || index >= segments.length) throw new Error("There is no such line.");
  const old = segments[index];
  const delta = deltaMs ?? newDurationMs - (old.endMs - old.startMs);
  return segments.map((s, i) => {
    if (i < index) return s;
    if (i === index) {
      const { words: _dropped, ...rest } = s;
      void _dropped;
      return { ...rest, ...replacement, startMs: s.startMs, endMs: s.startMs + newDurationMs } as T;
    }
    return {
      ...s,
      startMs: s.startMs + delta,
      endMs: s.endMs + delta,
      ...(s.words ? { words: s.words.map((w) => ({ ...w, startMs: w.startMs + delta, endMs: w.endMs + delta })) } : {}),
    };
  });
}
