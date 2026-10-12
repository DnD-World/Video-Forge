// ---------------------------------------------------------------------------
// The preview, with sound (plan item A3, 12 Oct 2026).
//
// Before this, the preview ran on a silent clock that looped over the
// narration's length — faces and subtitles moved, but you could not hear what
// the video would sound like, and nothing could be stopped or scrubbed.
//
// Now the narration's own audio IS the clock: while it plays, every overlay
// reads `audio.currentTime`, so lips, subtitles and voices cannot drift apart.
// The music plays under it with the same duck the render applies
// (musicGainAt), recomputed every animation frame. Paused, the clock holds
// still and the scrub bar moves it.
//
// With no narration yet there is nothing to hear, and the old silent loop
// keeps the faces alive so the Cast step still looks like something.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { musicGainAt } from "../audio/ducking";
import type { AudioAnalysis } from "../../store/types";

async function fileUrl(filePath: string, type: string): Promise<string> {
  const buf = await window.byok.storage.readFile(filePath);
  // No declared type: Chromium sniffs WAV and MP3 alike from the bytes.
  void type;
  return URL.createObjectURL(new Blob([buf]));
}

export interface PreviewPlayer {
  timeMs: number;
  durationMs: number;
  playing: boolean;
  hasSound: boolean;
  toggle: () => void;
  seek: (ms: number) => void;
}

export function usePreviewPlayer(opts: {
  voicePath: string | null;
  voiceAnalysis: AudioAnalysis | null;
  musicPath: string | null;
  musicVolume: number;
  musicDuck: number;
}): PreviewPlayer {
  const { voicePath, voiceAnalysis, musicPath, musicVolume, musicDuck } = opts;
  const voice = useRef<HTMLAudioElement | null>(null);
  const music = useRef<HTMLAudioElement | null>(null);
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const durationMs = voiceAnalysis?.durationMs ?? 0;
  const duck = useRef({ voiceAnalysis, musicVolume, musicDuck });
  duck.current = { voiceAnalysis, musicVolume, musicDuck };

  // Load (and unload) the two tracks when the files change.
  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    setReady(false);
    setPlaying(false);
    (async () => {
      if (!voicePath) return;
      try {
        const v = await fileUrl(voicePath, "audio/wav");
        urls.push(v);
        if (!alive) return;
        voice.current = new Audio(v);
        voice.current.onended = () => setPlaying(false);
        if (musicPath) {
          const m = await fileUrl(musicPath, "audio/mpeg");
          urls.push(m);
          if (!alive) return;
          music.current = new Audio(m);
          music.current.loop = true;
        }
        setReady(true);
      } catch {
        /* no sound: the silent loop below keeps the preview moving */
      }
    })();
    return () => {
      alive = false;
      voice.current?.pause();
      music.current?.pause();
      voice.current = null;
      music.current = null;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [voicePath, musicPath]);

  // The clock.
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const v = voice.current;
      if (ready && v) {
        if (!v.paused) {
          const ms = v.currentTime * 1000;
          setTimeMs(ms);
          if (music.current) {
            const d = duck.current;
            music.current.volume = Math.max(0, Math.min(1, musicGainAt(d.voiceAnalysis, ms, d.musicVolume, d.musicDuck)));
          }
        }
      } else {
        // Nothing to play yet: the old silent loop.
        const t = now - start;
        setTimeMs(durationMs > 0 ? t % durationMs : t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, durationMs]);

  const toggle = useCallback(() => {
    const v = voice.current;
    if (!v) return;
    if (v.paused) {
      if (v.ended || v.currentTime >= v.duration - 0.05) v.currentTime = 0;
      void v.play();
      if (music.current) {
        music.current.currentTime = music.current.duration ? v.currentTime % music.current.duration : 0;
        void music.current.play();
      }
      setPlaying(true);
    } else {
      v.pause();
      music.current?.pause();
      setPlaying(false);
    }
  }, []);

  const seek = useCallback((ms: number) => {
    const v = voice.current;
    if (!v) return;
    v.currentTime = ms / 1000;
    if (music.current?.duration) music.current.currentTime = (ms / 1000) % music.current.duration;
    setTimeMs(ms);
  }, []);

  // Space bar plays and pauses, unless the user is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.code !== "Space" || t?.closest("input, textarea, [contenteditable=true], select")) return;
      e.preventDefault();
      toggle();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [toggle]);

  return { timeMs, durationMs, playing, hasSound: ready, toggle, seek };
}
