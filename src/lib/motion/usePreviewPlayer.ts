// ---------------------------------------------------------------------------
// The preview, with sound (plan item A3, 12 Oct 2026; ▶ per line, #16).
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
// `playSpan` is what a ▶ on one line uses: jump there, play, stop at the end.
//
// With no narration yet there is nothing to hear, and the old silent loop
// keeps the faces alive so the Cast step still looks like something.
// ---------------------------------------------------------------------------

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
  /** Why there is no sound, in plain words, when a narration file exists but could not be opened. */
  soundProblem: string | null;
  /** The stretch being played on its own (a ▶ on a line), or null. */
  span: { startMs: number; endMs: number } | null;
  toggle: () => void;
  seek: (ms: number) => void;
  /** Jump to `startMs`, play, and stop by itself at `endMs`. */
  playSpan: (startMs: number, endMs: number) => void;
  stop: () => void;
}

/** The preview's player, handed down to the steps so a ▶ in the Script or Cast
 *  step plays through the same audio the preview shows. */
export const PreviewPlayerContext = createContext<PreviewPlayer | null>(null);
export const usePlayer = () => useContext(PreviewPlayerContext);

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
  const [soundProblem, setSoundProblem] = useState<string | null>(null);
  const [span, setSpan] = useState<{ startMs: number; endMs: number } | null>(null);
  const spanRef = useRef<{ startMs: number; endMs: number } | null>(null);
  const [audioMs, setAudioMs] = useState(0);
  // Where we were when the file changed (a line was remade), so the preview
  // stays where the person was looking instead of jumping to the start.
  const keepAt = useRef(0);
  // After a project loads the analysis is not there yet (it is rebuilt from the
  // file); the audio's own length stands in so the scrub bar works at once.
  const durationMs = voiceAnalysis?.durationMs || audioMs;
  const duck = useRef({ voiceAnalysis, musicVolume, musicDuck });
  duck.current = { voiceAnalysis, musicVolume, musicDuck };

  const setSpanBoth = useCallback((v: { startMs: number; endMs: number } | null) => {
    spanRef.current = v;
    setSpan(v);
  }, []);

  /** The music's loudness for this moment: the same duck the render applies. */
  const applyMusicGain = useCallback((ms: number) => {
    const m = music.current;
    if (!m) return;
    const d = duck.current;
    m.volume = Math.max(0, Math.min(1, musicGainAt(d.voiceAnalysis, ms, d.musicVolume, d.musicDuck)));
  }, []);

  // Load (and unload) the two tracks when the files change.
  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    keepAt.current = voice.current ? voice.current.currentTime * 1000 : 0;
    setReady(false);
    setPlaying(false);
    setSpanBoth(null);
    setSoundProblem(null);
    setAudioMs(0);
    (async () => {
      if (!voicePath) return;
      try {
        const v = await fileUrl(voicePath, "audio/wav");
        urls.push(v);
        if (!alive) return;
        const a = new Audio(v);
        a.preload = "auto";
        a.onended = () => {
          setPlaying(false);
          setSpanBoth(null);
          music.current?.pause();
        };
        a.onloadedmetadata = () => {
          if (!alive || !Number.isFinite(a.duration)) return;
          setAudioMs(a.duration * 1000);
          if (keepAt.current > 0 && keepAt.current < a.duration * 1000) a.currentTime = keepAt.current / 1000;
          keepAt.current = 0;
        };
        voice.current = a;
      } catch (e) {
        if (alive) setSoundProblem(e instanceof Error ? e.message : "The narration file could not be opened.");
        return;
      }
      // The music is a nice-to-have: if it cannot be opened the narration still plays.
      if (musicPath) {
        try {
          const m = await fileUrl(musicPath, "audio/mpeg");
          urls.push(m);
          if (!alive) return;
          music.current = new Audio(m);
          music.current.loop = true;
        } catch {
          /* no music in the preview */
        }
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
      voice.current?.pause();
      music.current?.pause();
      voice.current = null;
      music.current = null;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [voicePath, musicPath, setSpanBoth]);

  const stop = useCallback(() => {
    voice.current?.pause();
    music.current?.pause();
    setSpanBoth(null);
    setPlaying(false);
  }, [setSpanBoth]);

  // The clock.
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const v = voice.current;
      if (ready && v) {
        if (!v.paused) {
          const ms = v.currentTime * 1000;
          // A ▶ on one line: stop where the line ends.
          const sp = spanRef.current;
          if (sp && ms >= sp.endMs) {
            stop();
            setTimeMs(sp.endMs);
          } else {
            setTimeMs(ms);
            applyMusicGain(ms);
          }
        }
      } else {
        // Nothing to play yet: the old silent loop.
        const t = now - start;
        // With no narration at all, loop 4.5 s so the sample subtitle line
        // (App.tsx) keeps coming round.
        setTimeMs(t % (durationMs > 0 ? durationMs : 4500));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, durationMs, stop, applyMusicGain]);

  const startPlaying = useCallback(() => {
    const v = voice.current;
    if (!v) return;
    const m = music.current;
    if (m) {
      m.currentTime = m.duration ? v.currentTime % m.duration : 0;
      applyMusicGain(v.currentTime * 1000);
    }
    v.play().then(
      () => {
        if (m && !v.paused) void m.play().catch(() => undefined);
      },
      () => setPlaying(false)
    );
    setPlaying(true);
  }, [applyMusicGain]);

  const toggle = useCallback(() => {
    const v = voice.current;
    if (!v) return;
    if (v.paused) {
      setSpanBoth(null);
      if (v.ended || v.currentTime >= v.duration - 0.05) v.currentTime = 0;
      startPlaying();
    } else {
      stop();
    }
  }, [startPlaying, stop, setSpanBoth]);

  const seek = useCallback((ms: number) => {
    const v = voice.current;
    if (!v) return;
    v.currentTime = ms / 1000;
    if (music.current?.duration) music.current.currentTime = (ms / 1000) % music.current.duration;
    setTimeMs(ms);
  }, []);

  const playSpan = useCallback(
    (startMs: number, endMs: number) => {
      const v = voice.current;
      if (!v) return;
      v.currentTime = startMs / 1000;
      setTimeMs(startMs);
      const mine = { startMs, endMs };
      setSpanBoth(mine);
      startPlaying();
      // The frame loop stops it at the end; this is the belt for a window
      // whose frames are paused (hidden, minimised).
      window.setTimeout(() => {
        if (spanRef.current === mine) {
          stop();
          setTimeMs(endMs);
        }
      }, endMs - startMs + 250);
    },
    [startPlaying, setSpanBoth, stop]
  );

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

  return { timeMs, durationMs, playing, hasSound: ready, soundProblem, span, toggle, seek, playSpan, stop };
}
