// ---------------------------------------------------------------------------
// Clips already on this computer (rebuilt 12 Oct 2026).
//
// Ak couldn't tell why the library was there — it was a list of file names
// with nothing to do. Now it says what it is, shows only clips in the video's
// own shape (a vertical video is never offered a wide clip), shows them as
// moving thumbnails, and has one clear action: use a clip as the background
// for the whole video. Using a clip already here costs no search quota and no
// download. Sounds have their own tab.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";

interface MediaItem {
  fileName: string;
  filePath: string;
  kind: "video" | "audio";
  bytes: number;
  modifiedMs: number;
  source?: string;
}

interface Props {
  /** Called with the chosen clip. Without it the library only shows. */
  onPick?: (filePath: string, info: { width: number; height: number; durationSec: number }) => void;
  /** Only clips of this shape are offered. */
  shape?: "portrait" | "landscape";
}

export function MediaLibrary({ onPick, shape }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Measured from each clip as its thumbnail loads — the library itself does
  // not store sizes.
  const [dims, setDims] = useState<Record<string, { w: number; h: number; d: number }>>({});

  const load = () => {
    setLoading(true);
    window.byok?.media
      ?.library()
      .then((all) => setItems(all.filter((i) => i.kind === "video").sort((a, b) => b.modifiedMs - a.modifiedMs)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const fits = (p: string) => {
    const d = dims[p];
    if (!d || !shape) return true; // not measured yet: show, then hide if wrong
    return shape === "portrait" ? d.h >= d.w : d.w >= d.h;
  };
  const shown = useMemo(() => items.filter((i) => fits(i.filePath)), [items, dims, shape]);
  const gb = items.reduce((a, i) => a + i.bytes, 0) / 1e9;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="label-etched" data-tip="Background clips already downloaded for earlier videos. Re-using one is instant and free.">
          Clips on this computer
        </div>
        <button onClick={load} className="btn" data-tip="Look again for downloaded clips.">
          Refresh
        </button>
      </div>
      <p className="text-sm text-neutral-500">
        {loading
          ? "Looking…"
          : `${shown.length} ${shape === "portrait" ? "vertical" : shape === "landscape" ? "wide" : ""} clip(s) that fit this video · ${items.length} in all, ${gb.toFixed(1)} GB. Hover to play; “Use” makes it the background of the whole video. Old clips are cleared automatically (Settings).`}
      </p>

      <div className="forge-clips">
        {shown.map((item) => (
          <div key={item.filePath} className={`clip ${shape === "landscape" ? "wide" : ""}`} title={item.fileName}>
            <video
              src={`file://${item.filePath.replace(/\\/g, "/")}`}
              muted
              loop
              preload="metadata"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setDims((d) => ({ ...d, [item.filePath]: { w: v.videoWidth, h: v.videoHeight, d: v.duration } }));
              }}
              onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
              onMouseLeave={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0;
              }}
            />
            {onPick && (
              <button
                className="btn use"
                onClick={() => {
                  const d = dims[item.filePath];
                  onPick(item.filePath, { width: d?.w ?? 0, height: d?.h ?? 0, durationSec: d?.d ?? 0 });
                }}
                data-tip="Use this clip as the background for the whole video."
              >
                Use
              </button>
            )}
          </div>
        ))}
      </div>
      {!loading && shown.length === 0 && (
        <p className="text-sm text-neutral-500">
          {items.length === 0
            ? "Nothing downloaded yet. Clips arrive here when you choose backgrounds automatically or by search."
            : "None of the downloaded clips has this video's shape."}
        </p>
      )}
    </div>
  );
}
