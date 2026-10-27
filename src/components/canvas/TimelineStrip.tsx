// ---------------------------------------------------------------------------
// The strip under the preview (the "B" layout, Ak's pick, 26 Oct 2026): the
// whole video at a glance in two rows — for a puppet video who speaks when and
// the background clips; for an explainer its scenes and the narration's words
// — with the play head moving along it. Click or drag anywhere to jump there.
//
// Pure display: times come in, a seek goes out. Nothing here owns state.
// ---------------------------------------------------------------------------

import { useRef } from "react";

export interface StripBlock {
  startMs: number;
  endMs: number;
  /** a colour for the block; none = the row's own alternating shades */
  color?: string;
  /** the hover help for this block */
  tip: string;
}

export function TimelineStrip({
  durationMs,
  timeMs,
  top,
  bottom,
  tip,
  emptyText,
  emptyTip,
  onSeek,
}: {
  durationMs: number;
  timeMs: number;
  top: StripBlock[];
  bottom: StripBlock[];
  /** what the strip shows, for its hover help */
  tip: string;
  emptyText: string;
  emptyTip: string;
  onSeek: (ms: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (!durationMs) {
    return (
      <div className="forge-strip empty" data-tip={emptyTip}>
        {emptyText}
      </div>
    );
  }
  const pct = (ms: number) => `${Math.max(0, Math.min(100, (100 * ms) / durationMs))}%`;
  const seekAt = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    onSeek(Math.max(0, Math.min(durationMs, ((clientX - r.left) / r.width) * durationMs)));
  };
  const row = (blocks: StripBlock[]) =>
    blocks.map((b, i) => (
      <span
        key={i}
        className={`blk ${!b.color && i % 2 ? "alt" : ""}`}
        style={{ left: pct(b.startMs), width: pct(b.endMs - b.startMs), ...(b.color ? { background: b.color } : {}) }}
        data-tip={b.tip}
      />
    ));
  return (
    <div
      ref={ref}
      className="forge-strip"
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        seekAt(e.clientX);
      }}
      onPointerMove={(e) => e.buttons === 1 && seekAt(e.clientX)}
      data-tip={tip}
    >
      <div className="lane voices" aria-hidden>{row(top)}</div>
      <div className="lane clips" aria-hidden>{row(bottom)}</div>
      <span className="head" style={{ left: pct(timeMs) }} />
    </div>
  );
}
