// ---------------------------------------------------------------------------
// Sound effects — a bark, a whistle, a clicker, pinned to a moment.
//
// Two sources, one list: a file from your own disk, or a CC0 search of
// Freesound. They are the same thing once added, because the point is placing
// a sound at a time, not where it came from.
//
// The time is typed in seconds rather than dragged on a timeline. There is no
// timeline in this app, and inventing one for a handful of barks would be a
// week of work to replace a number that a user can already read off the
// subtitle they want it to land on.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { ErrorLine } from "../ui/ErrorLine";
import { plainError } from "../../lib/plainError";
import { Empty } from "../ui/Empty";
import { NumberField } from "../ui/NumberField";
import { HudButton } from "../ui/HudButton";
import { useProjectStore } from "../../store/useProjectStore";

type Hit = Awaited<ReturnType<typeof window.byok.sound.search>>["hits"][number];

export function SfxPanel() {
  const sfx = useProjectStore((s) => s.sfx);
  const addSfx = useProjectStore((s) => s.addSfx);
  const updateSfx = useProjectStore((s) => s.updateSfx);
  const removeSfx = useProjectStore((s) => s.removeSfx);
  const narration = useProjectStore((s) => s.narration);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Where a newly added effect lands: the end of the narration, or 0. Adding
   *  everything at 0s and making the user move each one is the worse default —
   *  the end is at least somewhere you can hear it. */
  const nextAtMs = narration?.segments.at(-1)?.endMs
    ? Math.round(narration.segments.at(-1)!.endMs / 2)
    : 0;

  async function addFromDisk() {
    const p = await window.byok.dialog.openFile([
      { name: "Audio", extensions: ["wav", "mp3", "m4a", "ogg", "flac"] },
    ]);
    if (!p) return;
    addSfx({
      filePath: p,
      label: p.split(/[\\/]/).pop() ?? "sound",
      atMs: nextAtMs,
      volume: 0.8,
    });
  }

  async function runSearch() {
    if (!query.trim()) return;
    setBusy("Searching…");
    setError(null);
    try {
      const res = await window.byok.sound.search(query.trim());
      setHits(res.hits);
      setNotes(res.notes);
    } catch (e) {
      setError(plainError(e, "Check your internet, then search again."));
    } finally {
      setBusy(null);
    }
  }

  async function useHit(hit: Hit) {
    setBusy("Fetching…");
    setError(null);
    try {
      const filePath = await window.byok.media.download(hit.id, hit.url);
      addSfx({ filePath, label: hit.name, atMs: nextAtMs, volume: 0.8 });
    } catch (e) {
      setError(plainError(e, "Pick a different sound, or search again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <HudButton onClick={addFromDisk} disabled={!!busy} data-tip="Pick a sound file from your computer to add as a sound effect.">
          Add from disk
        </HudButton>
      </div>

      {/* Stated plainly because the obvious question is "why isn't Pixabay
          here too, like it is for backgrounds". */}
      <p data-tip="Where the sound search looks: only Freesound sounds that are free to use without credit." className="text-sm text-neutral-500">
        Search covers <strong data-tip="Freesound is a free sound library. CC0 means anyone may use the sound for anything, no credit needed." className="text-neutral-300">Freesound, CC0 only</strong> — nothing
        found here needs crediting or a licence. Pixabay and Envato have no public
        audio API, so their sounds can't be searched from inside the app; download
        them in a browser and bring them in with <em data-tip="Use a sound file already on your computer.">Add from disk</em>.
      </p>

      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="dog bark"
          data-tip="Type the sound you want, in English, like dog bark, then press Enter to search."
          className="flex-1 min-w-0 bg-black/60 px-3 py-2 text-neutral-200 outline-none border border-accent/25"
        />
        <HudButton onClick={runSearch} disabled={!!busy} data-tip="Looks for free sound effects that match your words.">
          Search
        </HudButton>
      </div>
      <p className="text-sm text-neutral-500">
        Freesound, restricted to CC0 — no attribution, commercial use, no strings. The
        other licences there need per-sound credit this app has nowhere to put, so they
        aren't offered.
      </p>

      {busy && <p data-tip="What the app is doing right now. Wait for it to finish." className="label-etched text-accent-bright">{busy}</p>}
      {error && <ErrorLine tip="The sound search did not work. Check your internet and your Freesound key in Settings, then search again." className="text-sm text-red-400" text={error} />}
      {notes.map((n, i) => (
        <p data-tip="A heads-up from the search. It did not stop it." key={i} className="text-sm text-amber-400">{n}</p>
      ))}

      {hits.length > 0 && (
        <div className="space-y-1 max-h-56 overflow-y-auto border border-accent/15 p-2">
          {hits.map((h) => (
            <button
              key={h.id}
              onClick={() => useHit(h)}
              disabled={!!busy}
              className="w-full text-left px-2 py-1 hover:bg-accent/10"
              title={`${h.author} · ${h.license}`}
            >
              <span className="text-sm text-neutral-300">{h.name}</span>
              <span className="text-sm text-neutral-600"> · {h.durationSec}s</span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3 border-t border-accent/15 pt-3">
        {sfx.length === 0 && (
          <Empty>
            No effects yet. Each one plays once, at the second you give it, over
            everything else — effects don't get quieter when someone talks.
          </Empty>
        )}
        {sfx.map((c) => (
          <div key={c.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-300 truncate flex-1" title={c.filePath}>
                {c.label}
              </span>
              <button
                onClick={() => removeSfx(c.id)}
                className="label-etched underline hover:text-red-400 shrink-0"
                data-tip="Takes this sound effect out of the video."
              >
                remove
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5">
                <span data-tip="At what second of the video the sound plays." className="label-etched">at</span>
                <NumberField
                  aria-label={`Seconds into the video for ${c.label}`}
                  data-tip="When the sound plays, counted in seconds from the start of the video."
                  className="w-28"
                  min={0}
                  step={0.1}
                  value={Number((c.atMs / 1000).toFixed(1))}
                  onChange={(secs) =>
                    updateSfx(c.id, { atMs: Math.max(0, Math.round(secs * 1000)) })
                  }
                />
                <span data-tip="Seconds." className="label-etched">s</span>
              </label>
              <label className="flex items-center gap-1.5 flex-1">
                <span data-tip="Volume of this sound. Further right is louder." className="label-etched">vol</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={c.volume}
                  onChange={(e) => updateSfx(c.id, { volume: parseFloat(e.target.value) })}
                  className="flex-1"
                  data-tip="How loud this sound effect is."
                />
                <span className="text-sm text-neutral-500 w-9 text-right">
                  {Math.round(c.volume * 100)}%
                </span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
