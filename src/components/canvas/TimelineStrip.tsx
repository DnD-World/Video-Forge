// ---------------------------------------------------------------------------
// The strip under the preview (the "B" layout, Ak's pick, 26 Oct 2026): the
// whole video at a glance — who speaks when, which background clip is on —
// with the play head moving along it. Click or drag anywhere to jump there.
//
// Pure display: times come in, a seek goes out. Nothing here owns state.
// ---------------------------------------------------------------------------

import { useRef } from "react";

export interface StripSpan {
  startMs: number;
  endMs: number;
}

export function TimelineStrip({
  durationMs,
  timeMs,
  voices,
  backgrounds,
  colorOf,
  labelOf,
  onSeek,
}: {
  durationMs: number;
  timeMs: number;
  voices: (StripSpan & { speakerId: string; text: string })[];
  backgrounds: StripSpan[];
  colorOf: (speakerId: string) => string;
  labelOf: (speakerId: string) => string;
  onSeek: (ms: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (!durationMs) {
    return (
      <div className="forge-strip empty" data-tip="Once the narration is made (step 2), this strip shows who speaks when and which background is on, and you can click it to jump anywhere.">
        The video's timeline appears here once the narration is made
      </div>
    );
  }
  const pct = (ms: number) => `${Math.max(0, Math.min(100, (100 * ms) / durationMs))}%`;
  const seekAt = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    onSeek(Math.max(0, Math.min(durationMs, ((clientX - r.left) / r.width) * durationMs)));
  };
  return (
    <div
      ref={ref}
      className="forge-strip"
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        seekAt(e.clientX);
      }}
      onPointerMove={(e) => e.buttons === 1 && seekAt(e.clientX)}
      data-tip="The whole video: who speaks when (top, in their colour) and the background clips (bottom). Click or drag to jump to that moment."
    >
      <div className="lane voices" aria-hidden>
        {voices.map((v, i) => (
          <span
            key={i}
            className="blk"
            style={{ left: pct(v.startMs), width: pct(v.endMs - v.startMs), background: colorOf(v.speakerId) }}
            data-tip={`${labelOf(v.speakerId)}: “${v.text.length > 90 ? v.text.slice(0, 88) + "…" : v.text}”`}
          />
        ))}
      </div>
      <div className="lane clips" aria-hidden>
        {backgrounds.map((b, i) => (
          <span key={i} className={`blk ${i % 2 ? "alt" : ""}`} style={{ left: pct(b.startMs), width: pct(b.endMs - b.startMs) }} data-tip={`Background clip ${i + 1}`} />
        ))}
      </div>
      <span className="head" style={{ left: pct(timeMs) }} />
    </div>
  );
}
