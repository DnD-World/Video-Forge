// ---------------------------------------------------------------------------
// Music — the bed under the voices. Moved out of the Cast step (12 Oct 2026):
// it belongs to the whole video, not to one speaker, so it lives in Look.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { HudButton } from "../ui/HudButton";
import { Slider } from "../ui/Slider";
import { WaveformControls } from "./WaveformControls";
import { useProjectStore } from "../../store/useProjectStore";

export function MusicPanel() {
  const music = useProjectStore((s) => s.music);
  const setMusic = useProjectStore((s) => s.setMusic);
  const musicVolume = useProjectStore((s) => s.musicVolume);
  const musicDuck = useProjectStore((s) => s.musicDuck);
  const setMusicMix = useProjectStore((s) => s.setMusicMix);
  const musicColor = useProjectStore((s) => s.musicColor);
  const setMusicColor = useProjectStore((s) => s.setMusicColor);
  const musicWaveform = useProjectStore((s) => s.musicWaveform);
  const setMusicWaveform = useProjectStore((s) => s.setMusicWaveform);
  const [musicBusy, setMusicBusy] = useState(false);
  const [musicNote, setMusicNote] = useState<string | null>(null);
  const [musicLibrary, setMusicLibrary] = useState<{ name: string; filePath: string }[]>([]);
  useEffect(() => {
    window.byok?.music?.list().then(setMusicLibrary).catch(() => setMusicLibrary([]));
  }, []);

  /** Load one track and analyse it: an unanalysed bed plays once and then
   *  leaves silence, and its waveform cannot follow it. */
  const loadMusicFile = async (p: string) => {
    setMusicBusy(true);
    setMusicNote(null);
    try {
      const analysis = await window.byok.audio.analyzeFile(p);
      setMusic({ filePath: p, analysis });
      if (!analysis) {
        setMusicNote(
          "Loaded. It will play, but it couldn't be analysed — the music sound bars " +
            "won't follow it and it won't repeat if it's shorter than the video. " +
            "A 16-bit PCM .wav does both."
        );
      }
    } catch (e) {
      setMusic({ filePath: p, analysis: null });
      setMusicNote(`Loaded, but analysing it failed (${e instanceof Error ? e.message : String(e)}). It will still play; to make the sound bars follow it, pick a 16-bit WAV file.`);
    } finally {
      setMusicBusy(false);
    }
  };

  const pickMusic = async () => {
    const p = await window.byok.dialog.openFile([{ name: "Audio", extensions: ["wav", "mp3", "m4a", "ogg", "flac"] }]);
    if (p) await loadMusicFile(p);
  };

  return (
    <div className="space-y-5">
            {/* The loops that ship with the app. A batch picks from these by
          itself; this is for choosing one by hand on a single video. */}
      {musicLibrary.length > 0 && (
        <div className="space-y-2">
          <div data-tip="Music that comes with the app. Click one to use it." className="label-etched">Library</div>
          <div className="flex flex-wrap gap-2">
            {musicLibrary.map((t) => (
              <HudButton
                key={t.filePath}
                active={music?.filePath === t.filePath}
                onClick={() => loadMusicFile(t.filePath)}
                data-tip={`Use the music loop "${t.name.replace(/.wav$/i, "").replace(/[_-]+/g, " ")}" as your background music.`}
              >
                {t.name.replace(/\.wav$/i, "").replace(/[_-]+/g, " ").slice(0, 28)}
              </HudButton>
            ))}
          </div>
          <p className="text-sm text-neutral-500">
            All of these can repeat smoothly and are cleared for use. A batch gives each lesson one
            of these on rotation, so the same lesson always gets the same
            bed and the next one gets the next track along.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <HudButton onClick={pickMusic} disabled={musicBusy} data-tip="Pick a music file from your computer to play quietly under the voice.">
          {musicBusy ? "Analysing…" : music ? "Change Track" : "Load Music"}
        </HudButton>
        {music && (
          <button
            onClick={() => {
              setMusic(null);
              setMusicNote(null);
            }}
            className="label-etched underline hover:text-red-400"
            data-tip="Takes the music out of the video."
          >
            remove
          </button>
        )}
      </div>
      {music && (
        <p className="text-xs text-neutral-500 break-all">
          {music.filePath.split(/[\\/]/).pop()}
          {music.analysis
            ? ` · ${Math.round(music.analysis.durationMs / 1000)}s`
            : " · not analysed"}
        </p>
      )}
      {musicNote && <p data-tip="A message about the music file. Read it, then pick another file if it says the file is a problem." className="text-sm text-amber-400">{musicNote}</p>}

      <Slider
        data-tip="How loud the music is. Lower it so people can hear the voice clearly."
        label="Music level"
        value={musicVolume}
        min={0} max={1} step={0.02}
        format={(v) => (v === 0 ? "silent" : `${Math.round(v * 100)}%`)}
        onChange={(volume) => setMusicMix({ volume })}
      />
      <Slider
        data-tip="Makes the music get quieter while someone is talking, then come back. Higher = quieter during speech."
        label="Lower music when someone talks"
        value={musicDuck}
        min={0} max={1} step={0.05}
        format={(v) => (v === 0 ? "off" : `−${Math.round(v * 100)}%`)}
        onChange={(duck) => setMusicMix({ duck })}
      />
      <p className="text-sm text-neutral-500">
        The bed drops out of the way just before each line and comes back
        slowly after it — early, because lowering it only when the voice starts
        always sounds late. A track shorter than the video repeats.
      </p>

      <div className="flex items-center gap-3 border-t border-accent/15 pt-4">
        <input
          type="color" value={musicColor}
          onChange={(e) => setMusicColor(e.target.value)}
          className="h-9 w-9 border border-accent/30 bg-transparent p-0"
          data-tip="The colour of the music's sound bars. Click to pick another."
        />
        <span data-tip="The colour of the little moving picture that dances to the music." className="text-sm text-neutral-400">Music colour</span>
      </div>
      <p className="text-sm text-neutral-500">
        The music track always animates — music doesn't take turns the way
        speakers do. With a track loaded it animates to the music itself;
        without one it borrows the narration. Its sound bars are on the
        Sound bars tab.
      </p>

      <section className="space-y-3 border-t border-accent/15 pt-4">
        <div data-tip="The moving picture that dances to the music. Turn it on or change how it looks here." className="label-etched">Music sound bars</div>
        <WaveformControls
          label="Show music sound bars"
          value={musicWaveform}
          onChange={setMusicWaveform}
          canAnchorToFace={false}
        />
      </section>
    </div>
  );
}
