// ---------------------------------------------------------------------------
// Subtitle FILES beside every video (Ak, 13 Oct 2026): .srt for YouTube,
// Facebook and most editors, .vtt for the web. The same cues the video burns
// in, so the file and the picture never disagree.
// ---------------------------------------------------------------------------

import type { SubtitleCue } from "./wordTiming";

const pad = (n: number, w = 2) => String(Math.max(0, Math.floor(n))).padStart(w, "0");

function stamp(ms: number, sep: "," | "."): string {
  const t = Math.max(0, Math.round(ms));
  return `${pad(t / 3600000)}:${pad((t / 60000) % 60)}:${pad((t / 1000) % 60)}${sep}${pad(t % 1000, 3)}`;
}

const textOf = (c: SubtitleCue) => c.words.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();

/** SubRip. `offsetMs` shifts every line — an intro card joined in front. */
export function toSrt(cues: SubtitleCue[], offsetMs = 0): string {
  return (
    cues
      .filter((c) => textOf(c))
      .map((c, i) => `${i + 1}\n${stamp(c.startMs + offsetMs, ",")} --> ${stamp(c.endMs + offsetMs, ",")}\n${textOf(c)}\n`)
      .join("\n") + "\n"
  );
}

/** WebVTT, with the speaker's name as a voice tag so players can show it. */
export function toVtt(cues: SubtitleCue[], offsetMs = 0): string {
  const body = cues
    .filter((c) => textOf(c))
    .map((c) => `${stamp(c.startMs + offsetMs, ".")} --> ${stamp(c.endMs + offsetMs, ".")}\n${c.speakerLabel ? `<v ${c.speakerLabel.replace(/[<>]/g, "")}>` : ""}${textOf(c)}\n`)
    .join("\n");
  return `WEBVTT\n\n${body}`;
}
