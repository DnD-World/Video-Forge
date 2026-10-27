// Hearing the planned sound effects in the live preview (WebAudio).
//
// The cues come from explainer/core/sfx.mjs (the same list the render mixes).
// The sounds are the library files main hands over once; the riser is the
// whoosh played backwards, exactly as the render does it.

import { SOUNDS, type SfxCue } from "../../../explainer/core/sfx.mjs";

export interface SfxAudio { ctx: AudioContext; buffers: Map<string, AudioBuffer>; reversed: Map<string, AudioBuffer> }

let loading: Promise<SfxAudio | null> | null = null;

/** Load the library sounds once. Resolves null when there are none (no library on this computer) or no audio. */
export function loadSfxAudio(): Promise<SfxAudio | null> {
  loading ??= (async () => {
    try {
      const files = await window.byok.explainer.sfxData();
      if (!files.length) return null;
      const ctx = new AudioContext();
      const buffers = new Map<string, AudioBuffer>();
      for (const f of files) buffers.set(f.file, await ctx.decodeAudioData(new Uint8Array(f.data).buffer as ArrayBuffer));
      const reversed = new Map<string, AudioBuffer>();
      for (const [name, b] of buffers) {
        const r = ctx.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
        for (let c = 0; c < b.numberOfChannels; c++) r.copyToChannel(Float32Array.from(b.getChannelData(c)).reverse(), c);
        reversed.set(name, r);
      }
      return { ctx, buffers, reversed };
    } catch {
      return null;
    }
  })();
  return loading;
}

/** Play one cue now (its sound starts `lead` seconds before the cue's time, so call this at cue.t - lead). */
export function playCue(a: SfxAudio, cue: SfxCue, master = 1) {
  const snd = SOUNDS[cue.kind];
  const buf = (snd.reverse ? a.reversed : a.buffers).get(snd.file);
  if (!buf) return;
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const g = a.ctx.createGain();
  const now = a.ctx.currentTime;
  const level = cue.gain * master;
  const len = snd.maxLen ?? buf.duration;
  g.gain.setValueAtTime(snd.reverse ? 0.0001 : level, now);
  if (snd.reverse) g.gain.linearRampToValueAtTime(level, now + 0.5);
  if (snd.maxLen) { g.gain.setValueAtTime(level, now + Math.max(0, len - 0.2)); g.gain.linearRampToValueAtTime(0.0001, now + len); }
  src.connect(g).connect(a.ctx.destination);
  // the reversed file's first `skip` seconds are the whoosh's tail rubble: leave them out, like the render
  src.start(now, snd.skip ?? 0, len);
}
