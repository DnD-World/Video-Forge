// ---------------------------------------------------------------------------
// Background clips — chosen by the model, or by hand.
//
// The automatic path is the headline, but it is deliberately not a black box:
// every scene shows the QUERY the model wrote and its REASON for it. A bad
// background is then diagnosable — you can see whether the model misread the
// line or whether the library simply had nothing — instead of being a mystery
// you can only fix by rerolling.
//
// Every scene can be overridden by hand, and the manual search opens in a
// panel that can be expanded to fill the window, because judging stock footage
// from postage stamps is how you end up with the wrong clip.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { ErrorLine } from "../ui/ErrorLine";
import { plainError } from "../../lib/plainError";
import { createPortal } from "react-dom";
import { Empty } from "../ui/Empty";
import { HudButton } from "../ui/HudButton";
import { Slider } from "../ui/Slider";
import { COLOR_LOOKS } from "../../lib/background/colorLook";
import { useProjectStore } from "../../store/useProjectStore";

type Hit = Awaited<ReturnType<typeof window.byok.media.searchVideos>>["hits"][number];
type Scene = Awaited<ReturnType<typeof window.byok.media.autoBackgrounds>>["scenes"][number];

const LANGUAGE_NAMES: Record<string, string> = { el: "Greek", en: "English" };

export function BackgroundPanel() {
  const narration = useProjectStore((s) => s.narration);
  const render = useProjectStore((s) => s.render);
  const language = useProjectStore((s) => s.language);
  const backgrounds = useProjectStore((s) => s.backgrounds);
  const setBackgrounds = useProjectStore((s) => s.setBackgrounds);
  const backgroundDim = useProjectStore((s) => s.backgroundDim);
  const backgroundCrossfadeMs = useProjectStore((s) => s.backgroundCrossfadeMs);
  const setBackgroundStyle = useProjectStore((s) => s.setBackgroundStyle);
  const backgroundBlur = useProjectStore((s) => s.backgroundBlur);
  const backgroundColorLook = useProjectStore((s) => s.backgroundColorLook);
  const speakers = useProjectStore((s) => s.speakers);
  const updateSpeaker = useProjectStore((s) => s.updateSpeaker);
  const setRender = useProjectStore((s) => s.setRender);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [look, setLook] = useState<string>("");

  // Manual search state.
  const [searchOpen, setSearchOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  /** Which scene a manual pick will replace; null means "append as a new one". */
  const [targetScene, setTargetScene] = useState<number | null>(null);

  const portrait = render.height > render.width;
  const segments = narration?.segments ?? [];

  /** An explainer video as the whole background, with the faces moved into the
   *  spots it left empty (its .spots.json, written when it was rendered). */
  async function useExplainer() {
    const file = await window.byok.dialog.openFile([{ name: "Explainer video", extensions: ["mp4"] }]);
    if (!file) return;
    setError(null);
    const spots = await window.byok.explainer.spotsFor(file);
    const endMs = Math.max(1000, narration?.analysis?.durationMs ?? 600000);
    setBackgrounds([{ startMs: 0, endMs, query: "explainer", reason: "Explainer video (made in Explainer)", filePath: file, hit: null } as Scene]);
    setBackgroundStyle({ dim: 0, blur: 0 });
    if (!spots) {
      setError("Background set. No puppet-spot map was found next to that video, so the faces were not moved.");
      return;
    }
    if (spots.width && spots.height) setRender({ format: spots.format as typeof render.format, width: spots.width, height: spots.height });
    spots.slots.forEach((slot, i) => {
      const sp = speakers[i];
      if (sp) updateSpeaker(sp.id, { x: slot.x, y: slot.y, size: slot.size, ...(slot.outlineShape ? { outlineShape: slot.outlineShape as typeof sp.outlineShape } : {}) });
    });
    if (spots.slots.length !== speakers.length) setError(`The explainer has ${spots.slots.length} puppet spot(s) and this project has ${speakers.length} speaker(s). The first ${Math.min(spots.slots.length, speakers.length)} were placed; render the explainer again with the right number to match.`);
  }

  async function chooseAutomatically() {
    if (segments.length === 0) {
      setError("Generate narration first — there is no script to read.");
      return;
    }
    setBusy("Reading the script…");
    setError(null);
    try {
      const res = await window.byok.media.autoBackgrounds({
        segments: segments.map((s) => ({
          text: s.text,
          startMs: s.startMs,
          endMs: s.endMs,
          speakerLabel: s.speakerLabel,
        })),
        languageName: LANGUAGE_NAMES[language] ?? "Greek",
        portrait,
      });
      setLook(res.look);
      // Download as we go rather than all at once, so the list fills in and a
      // single failed clip doesn't take the whole batch with it.
      const withFiles: Scene[] = [];
      for (let i = 0; i < res.scenes.length; i++) {
        const sc = res.scenes[i];
        if (sc.hit) {
          setBusy(`Fetching clip ${i + 1} of ${res.scenes.length}…`);
          try {
            const filePath = await window.byok.media.download(sc.hit.id, sc.hit.url);
            withFiles.push({ ...sc, filePath } as Scene);
            continue;
          } catch (e) {
            withFiles.push({ ...sc, note: `Download failed: ${e instanceof Error ? e.message : e}. Swap this clip with the button on the right.` });
            continue;
          }
        }
        withFiles.push(sc);
      }
      setBackgrounds(withFiles);
    } catch (e) {
      setError(plainError(e, "Press Choose automatically to try again."));
    } finally {
      setBusy(null);
    }
  }

  async function runSearch() {
    if (!query.trim()) return;
    setBusy("Searching…");
    setError(null);
    try {
      const res = await window.byok.media.searchVideos(query.trim(), undefined, portrait ? "portrait" : "landscape");
      setHits(res.hits);
      setNotes(res.notes);
    } catch (e) {
      setError(plainError(e, "Check your internet, then search again."));
    } finally {
      setBusy(null);
    }
  }

  async function useHit(hit: Hit) {
    setBusy("Fetching clip…");
    try {
      const filePath = await window.byok.media.download(hit.id, hit.url);
      const next = [...backgrounds];
      if (targetScene !== null && next[targetScene]) {
        next[targetScene] = { ...next[targetScene], hit, filePath, note: undefined };
      } else {
        // A hand-picked clip with no scene to attach to covers the whole video.
        next.push({
          startMs: 0,
          endMs: narration?.segments.at(-1)?.endMs ?? 0,
          query: query.trim(),
          reason: "Chosen by hand.",
          hit,
          filePath,
        } as Scene);
      }
      setBackgrounds(next);
      setSearchOpen(false);
    } catch (e) {
      setError(plainError(e, "Pick a different clip, or search again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <HudButton onClick={chooseAutomatically} disabled={!!busy} data-tip="Reads your narration and picks a stock video for each scene for you. You can swap any pick afterwards.">
          Choose automatically
        </HudButton>
        <HudButton onClick={useExplainer} disabled={!!busy} data-tip="Use an explainer you made (Explainer, top right) as the whole background. The puppets move into the spots it left empty for them.">
          Use an explainer
        </HudButton>
        <HudButton
          onClick={() => {
            setTargetScene(null);
            setSearchOpen(true);
          }}
          disabled={!!busy}
          data-tip="Type what you want to see, like dog running in park, and choose a video yourself."
        >
          Search by hand
        </HudButton>
        {backgrounds.length > 0 && (
          <button
            onClick={() => setBackgrounds([])}
            data-tip="Removes all the background videos so you can start over."
            className="label-etched underline text-neutral-500 hover:text-red-400"
          >
            clear
          </button>
        )}
      </div>

      {busy && <p className="label-etched text-accent-bright" data-tip="What the app is doing right now. Wait for it to finish.">{busy}</p>}
      {error && <ErrorLine tip="The background step did not work. Read the message, fix the cause, and press the button again." text={error} />}
      {look && (
        <p className="text-sm text-neutral-400" data-tip="One look the picked clips share, so the whole video feels like one piece.">
          <span className="label-etched">Shared look</span> — {look}
        </p>
      )}

      {/* How the clips are treated, as opposed to which ones they are. Shown
          whether or not any are chosen yet: both settings apply to a hand-picked
          clip exactly as they do to a planned one. */}
      <div className="space-y-3 border-t border-accent/15 pt-3">
        <Slider
          data-tip="Darkens the background video so the words and bars on top are easy to read. Higher = darker."
          label="Dim"
          value={backgroundDim}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(dim) => setBackgroundStyle({ dim })}
        />
        <div data-tip="Softens the footage so faces and words stand out. 0 = sharp.">
          <Slider
            label="Blur"
            value={backgroundBlur}
            min={0}
            max={0.03}
            step={0.002}
            format={(v) => (v === 0 ? "sharp" : `${Math.round((v / 0.03) * 100)}%`)}
            onChange={(blur) => setBackgroundStyle({ blur })}
          />
        </div>
        <div className="label-etched" data-tip="A colour mood for the footage. The preview shows it.">Colour</div>
        <div className="forge-looks">
          {COLOR_LOOKS.map((l) => (
            <button
              key={l.id}
              className={`look ${((backgroundColorLook ?? "none") === l.id) ? "on" : ""}`}
              onClick={() => setBackgroundStyle({ colorLook: l.id })}
              data-tip={l.tip}
            >
              <i style={{ filter: l.css || undefined }} />
              <span>{l.label}</span>
            </button>
          ))}
        </div>
        <Slider
          data-tip="How long one background video melts into the next one. 0 = a sudden cut."
          label="Blend between clips"
          value={backgroundCrossfadeMs}
          min={0}
          max={2000}
          step={50}
          format={(v) => (v === 0 ? "cut" : `${(v / 1000).toFixed(2)}s`)}
          onChange={(crossfadeMs) => setBackgroundStyle({ crossfadeMs })}
        />
        <p className="text-sm text-neutral-500">
          Everything else draws over the background, so some dimming is what keeps the
          sound bars and the subtitles readable. A blend longer than half the shortest
          scene is trimmed to fit.
        </p>
      </div>

      {backgrounds.length === 0 && !busy && (
        <Empty>
          No backgrounds yet. “Choose automatically” reads your narration and picks a clip
          per scene; everything it picks can be swapped by hand afterwards.
        </Empty>
      )}

      <div className="space-y-2">
        {backgrounds.map((sc, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="w-24 h-14 shrink-0 bg-black/60 overflow-hidden cut-sm" data-tip="A small picture of the clip chosen for this part of the video. Empty means none was found.">
              {sc.hit?.thumbUrl ? (
                <img src={sc.hit.thumbUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center label-etched text-xs">none</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="label-etched truncate" data-tip="The words used to find this clip.">{sc.query}</p>
              <p className="text-sm text-neutral-500 truncate" title={sc.reason}>
                {sc.reason}
              </p>
              <p className="text-sm text-neutral-600" data-tip="When this clip plays (in seconds), where it came from, and who made it.">
                {(sc.startMs / 1000).toFixed(1)}s–{(sc.endMs / 1000).toFixed(1)}s
                {sc.hit && ` · ${sc.hit.provider} · ${sc.hit.author}`}
              </p>
              {sc.note && <p className="text-sm text-amber-400" data-tip="Something to know about this clip. Swap it with the button on the right if you do not like it.">{sc.note}</p>}
            </div>
            <button
              onClick={() => {
                setTargetScene(i);
                setQuery(sc.query);
                setSearchOpen(true);
              }}
              className="label-etched underline hover:text-accent-bright shrink-0"
              data-tip="Pick a different background video for this scene."
            >
              swap
            </button>
          </div>
        ))}
      </div>

      {/* PORTALLED TO document.body, and that is not a detail.
          This lives inside a .panel-hud, which is chamfered with clip-path —
          and a clip-path clips EVERY descendant, including position:fixed ones.
          Rendered in place, the search panel was sliced down to the rail's own
          width: a half-visible input you could neither read nor reliably click.
          A portal is the only way out of an ancestor's clip. */}
      {searchOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] grid place-items-center p-6"
            style={{ background: "rgba(0,0,0,.72)", backdropFilter: "blur(3px)" }}
            onMouseDown={(e) => e.target === e.currentTarget && setSearchOpen(false)}
          >
            <div
              className={`panel-hud flex flex-col p-5 ${
                expanded ? "w-[96vw] h-[92vh]" : "w-[min(1100px,88vw)] h-[min(760px,82vh)]"
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <h3 className="title-deco uppercase text-lg" data-tip="Search free stock videos and pick one by hand.">Find a background</h3>
                <div className="flex-1" />
                <HudButton onClick={() => setExpanded((v) => !v)} data-tip="Makes this search window bigger, or back to normal size.">
                  {expanded ? "Restore" : "Maximize"}
                </HudButton>
                <HudButton onClick={() => setSearchOpen(false)} data-tip="Closes the search without choosing anything.">Close</HudButton>
              </div>
              <p className="text-sm text-neutral-500 mb-3">
                Searches Pixabay and Pexels together. English terms work best — both
                libraries are indexed in English.
              </p>

              <div className="flex items-center gap-2 mb-4">
                <div className="frame cut-sm inwrap flex-1">
                  <div className="bevel cut-sm">
                    <div className="face cut-sm">
                      <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") runSearch();
                          if (e.key === "Escape") setSearchOpen(false);
                        }}
                        placeholder="dog running in park"
                        data-tip="Type what you want to see, in English, then press Enter to search."
                        className="input"
                      />
                    </div>
                  </div>
                </div>
                <HudButton onClick={runSearch} disabled={!!busy} data-tip="Looks for stock videos that match your words.">
                  {busy ? "Searching…" : "Search"}
                </HudButton>
              </div>

              {notes.map((n, i) => (
                <p key={i} className="text-sm text-amber-400 mb-1" data-tip="A heads-up from the search. It did not stop the search.">{n}</p>
              ))}
              {error && <ErrorLine className="text-sm text-red-400 mb-1" tip="The search did not work. Check your internet and your Pixabay and Pexels keys in Settings, then search again." text={error} />}
              {!busy && hits.length === 0 && (
                <p data-tip="Nothing searched yet. Type a few words above and press Enter." className="text-sm text-neutral-500">
                  Type a search and press Enter.
                </p>
              )}

              <div className="flex-1 overflow-y-auto grid content-start grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 pr-1">
                {hits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => useHit(h)}
                    className="text-left group"
                    title={`${h.provider} · ${h.author} · ${h.width}×${h.height}`}
                  >
                    <div className="aspect-video bg-black/60 overflow-hidden cut-sm">
                      {h.thumbUrl && (
                        <img
                          src={h.thumbUrl}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover transition-opacity group-hover:opacity-75"
                        />
                      )}
                    </div>
                    <p className="label-etched truncate mt-1">
                      {Math.round(h.durationSec)}s · {h.provider}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
