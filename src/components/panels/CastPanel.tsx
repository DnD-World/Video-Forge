// ---------------------------------------------------------------------------
// STEP 1 — the cast. One tab per speaker (Ak, 12 Oct 2026), and inside it
// everything that belongs to that speaker alone: who they are, their voice
// (with pitch, speed and breath), their look, their waveform and their place
// in the frame. Music and sound effects belong to the whole video and live
// in the Look step.
//
// The colour rule worth knowing: a speaker's outline colour IS their waveform
// colour. There is no second control, because two controls would drift.
// ---------------------------------------------------------------------------

import { useEffect, useState, type ReactNode } from "react";
import { Empty } from "../ui/Empty";
import { Picker } from "../ui/Picker";
import { HudButton } from "../ui/HudButton";
import { Slider } from "../ui/Slider";
import { Tabs } from "../ui/Tabs";
import { WaveformControls } from "./WaveformControls";
import { VoiceControls } from "./VoiceControls";
import { SfxPanel } from "./SfxPanel";
import { useProjectStore } from "../../store/useProjectStore";
import { useVoicesStore } from "../../store/useVoicesStore";
import { PuppetShelf } from "./PuppetShelf";
import { resolveAssetDir } from "../../lib/puppets/puppetAssets";
import { useSpeakerLibraryStore } from "../../store/useSpeakerLibraryStore";
import { usePuppetDefs } from "../../lib/puppets/usePuppets";
import { LiveFace } from "./LiveFace";
import { builtinPuppetPath, type BrandInfo, type BuiltinCharacter } from "../../store/builtinCast";
import { defaultTrackWaveform } from "../../lib/waveform/buildTracks";
import type { OutlineShape } from "../../store/types";
import { GEMINI_MODELS, GEMINI_VOICES, DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_VOICE, geminiModeOf, engineOf } from "../../lib/narration/geminiVoices";

/** DramaBox was retired on 10 Oct 2026 (it needed a rented Google Cloud GPU).
 *  Its per-character knobs stay in the code — the Narration tab can still
 *  write its block files — but are no longer shown. */
const SHOW_RETIRED_DRAMABOX = false;

const SHAPES: { id: OutlineShape; label: string }[] = [
  { id: "circle", label: "Circle" },
  { id: "rounded", label: "Rounded" },
  { id: "square", label: "Square" },
  { id: "none", label: "No frame" },
];

export function CastPanel() {
  const speakers = useProjectStore((s) => s.speakers);
  const addSpeaker = useProjectStore((s) => s.addSpeaker);
  const removeSpeaker = useProjectStore((s) => s.removeSpeaker);
  const updateSpeaker = useProjectStore((s) => s.updateSpeaker);
  const setSpeakerWaveform = useProjectStore((s) => s.setSpeakerWaveform);
  const musicWaveform = useProjectStore((s) => s.musicWaveform);
  const setMusicWaveform = useProjectStore((s) => s.setMusicWaveform);
  const musicColor = useProjectStore((s) => s.musicColor);
  const setMusicColor = useProjectStore((s) => s.setMusicColor);
  const music = useProjectStore((s) => s.music);
  const setMusic = useProjectStore((s) => s.setMusic);
  const musicVolume = useProjectStore((s) => s.musicVolume);
  const musicDuck = useProjectStore((s) => s.musicDuck);
  const setMusicMix = useProjectStore((s) => s.setMusicMix);
  const [musicBusy, setMusicBusy] = useState(false);
  const [elevenVoices, setElevenVoices] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    window.byok?.tts?.listElevenVoices?.().then(setElevenVoices).catch(() => setElevenVoices([]));
  }, []);
  const [musicLibrary, setMusicLibrary] = useState<{ name: string; filePath: string }[]>([]);
  useEffect(() => {
    window.byok?.music?.list().then(setMusicLibrary).catch(() => setMusicLibrary([]));
  }, []);
  const [musicNote, setMusicNote] = useState<string | null>(null);
  const voices = useVoicesStore((s) => s.voices);
  // Definitions only, no art: this panel needs to know whether a puppet file
  // is valid, not what it looks like.
  const { errors: puppetErrors } = usePuppetDefs(speakers.map((sp) => sp.puppetPath));

  /** Load one track and analyse it. Shared by the library buttons and the file
   *  dialog, because an unanalysed bed plays once and then leaves silence —
   *  which is the whole reason the analysis is not optional here. */
  const loadMusicFile = async (p: string) => {
    setMusicBusy(true);
    setMusicNote(null);
    try {
      const analysis = await window.byok.audio.analyzeFile(p);
      setMusic({ filePath: p, analysis });
      if (!analysis) {
        setMusicNote(
          "Loaded. It will play, but it couldn't be analysed — the music waveform " +
            "won't follow it and it won't repeat if it's shorter than the video. " +
            "A 16-bit PCM .wav does both."
        );
      }
    } catch (e) {
      setMusic({ filePath: p, analysis: null });
      setMusicNote(
        `Loaded, but analysing it failed (${e instanceof Error ? e.message : String(e)}). ` +
          "It will still play."
      );
    } finally {
      setMusicBusy(false);
    }
  };

  const pickMusic = async () => {
    const p = await window.byok.dialog.openFile([
      { name: "Audio", extensions: ["wav", "mp3", "m4a", "ogg", "flac"] },
    ]);
    if (p) await loadMusicFile(p);
  };

  const addSpeakerFrom = useProjectStore((s) => s.addSpeakerFrom);
  const library = useSpeakerLibraryStore((s) => s.speakers);
  const saveToLibrary = useSpeakerLibraryStore((s) => s.save);
  const removeFromLibrary = useSpeakerLibraryStore((s) => s.remove);

  const [active, setActive] = useState<string>("");
  // The "+" menu, and which speaker should open with the puppet order form.
  const [adding, setAdding] = useState(false);
  const [orderFor, setOrderFor] = useState<string | null>(null);
  const [shelf, setShelf] = useState<Awaited<ReturnType<NonNullable<Window["byok"]>["forge"]["shelfPuppets"]>>>([]);
  useEffect(() => {
    if (adding) void window.byok?.forge?.shelfPuppets().then(setShelf).catch(() => setShelf([]));
  }, [adding]);
  const [saved, setSaved] = useState<string | null>(null);

  // Never leave the panel pointing at a speaker that has just been deleted.
  useEffect(() => {
    if (speakers.length > 0 && !speakers.some((s) => s.id === active)) {
      setActive(speakers[0].id);
    }
  }, [speakers, active]);

  useEffect(() => {
    if (orderFor !== "__new__" || !speakers.length) return;
    const newest = speakers[speakers.length - 1];
    setActive(newest.id);
    setOrderFor(newest.id);
  }, [speakers, orderFor]);

  const speaker = speakers.find((s) => s.id === active);

  // The brand pack's cast and where its puppets live, or null with no pack
  // switched on. Asked for once — it cannot change while the app is running,
  // and it is a round trip to the main process.
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [castError, setCastError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Optional-chained because `window.byok` only exists inside Electron. An
    // unguarded call threw during mount and took the ENTIRE app down when the
    // built renderer was served over http for a screenshot — a blank page, and
    // a bug that looked like a styling failure for far longer than it should
    // have. The bridge being absent should cost the built-in cast, nothing else.
    window.byok?.brand
      ?.active()
      .then((b) => !cancelled && setBrand(b))
      .catch(() => !cancelled && setCastError("Couldn't read the brand pack's characters."));
    return () => {
      cancelled = true;
    };
  }, []);

  /** Add a brand pack character, with their puppet already assigned. */
  function addBuiltin(c: BuiltinCharacter) {
    if (!brand) return;
    setCastError(null);
    // Same defaults a blank speaker gets, so a built-in character differs only
    // in the things that actually make them that character: name, face, colour.
    addSpeakerFrom({
      label: c.label,
      puppetPath: builtinPuppetPath(brand.puppetDir, c.file),
      borderColor: c.borderColor,
      // The voice comes with the character. Adding one used to give you the
      // face and none of the voice — no opening phrase, no reference clip, no
      // settings — so every project re-typed all three by hand, or shipped
      // without them.
      openingPhrase: c.openingPhrase,
      voiceRef: c.voiceRef,
      ttsEngine: c.voice?.engine ?? "gemini",
      geminiModel: c.voice?.geminiModel,
      geminiVoice: c.voice?.geminiVoice,
      pitch: c.voice?.pitch,
      ...(c.dramabox ? { dramabox: c.dramabox } : {}),
      bgColor: "#1a1a1a",
      bgOpacity: 0,
      borderOpacity: 1,
      outlineShape: "none",
      size: 0.28,
      waveform: defaultTrackWaveform(speakers.length === 0 ? 0 : speakers.length % 2 === 1 ? 1 : -1),
    });
  }

  const sp = speaker;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="title-deco text-lg">Cast</h2>
        {library.length > 0 && (
          <Picker
            aria-label="Add a saved character"
            className="w-44"
            value=""
            placeholder="From library…"
            options={[{ value: "", label: "From library…" }, ...library.map((l) => ({ value: l.savedId, label: l.label }))]}
            onChange={(v) => {
              const entry = library.find((l) => l.savedId === v);
              if (!entry) return;
              const { savedId: _s, savedAt: _a, ...rest } = entry;
              addSpeakerFrom(rest);
            }}
          />
        )}
      </div>
      {castError && <p className="text-sm text-red-400 mb-2">{castError}</p>}

      {/* ONE TAB PER SPEAKER, in their own colour, and a + for a new one. */}
      <div className="forge-who" role="tablist" aria-label="Speakers">
        {speakers.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={s.id === active}
            className={`who ${s.id === active ? "on" : ""}`}
            style={{ ["--c" as string]: s.borderColor }}
            onClick={() => setActive(s.id)}
            data-tip={`Everything about ${s.label}: voice, look, waveform and place.`}
          >
            <i />
            {s.label}
          </button>
        ))}
        <button className={`who add ${adding ? "on" : ""}`} onClick={() => setAdding((v) => !v)} data-tip="Add a speaker: a ready-made puppet, or a new one." aria-expanded={adding}>
          +
        </button>
      </div>
      {adding && (
        <div className="forge-add">
          {/* Every character this computer has, each with its own face,
              blinking — hover and it talks (Ak, 13 Oct 2026). */}
          {(brand?.cast.length ?? 0) > 0 && (
            <>
              <div className="label-etched" data-tip="Characters that come with this app's brand pack, voice and all.">Ready-made</div>
              <div className="forge-shelf">
                {brand!.cast.map((c) => (
                  <button
                    key={c.file}
                    className="shelf-face"
                    onClick={() => {
                      addBuiltin(c);
                      setAdding(false);
                    }}
                    data-tip={`Add ${c.label}, with their face and voice. ${c.note}`}
                  >
                    <LiveFace path={builtinPuppetPath(brand!.puppetDir, c.file)} label={c.label} color={c.borderColor} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {shelf.length > 0 && (
            <>
              <div className="label-etched" data-tip="Puppets made by Image Forge's puppet maker on this computer.">Made in Image Forge</div>
              <div className="forge-shelf">
                {shelf.map((p) => (
                  <button
                    key={p.slug}
                    className="shelf-face"
                    onClick={() => {
                      addSpeakerFrom({ label: p.name, puppetPath: p.rigPath, borderColor: "#76FFC2", bgColor: "#1a1a1a", bgOpacity: 0, borderOpacity: 1, outlineShape: "circle", size: 0.28, waveform: defaultTrackWaveform(speakers.length % 2 === 1 ? 1 : -1) });
                      setAdding(false);
                    }}
                    data-tip={`Add ${p.name}${p.framing === "waist" ? " (waist up, with hands)" : ""}, made in Image Forge. Choose a voice in Voice.`}
                  >
                    <LiveFace path={p.rigPath} label={p.name} />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {library.length > 0 && (
            <>
              <div className="label-etched" data-tip="Speakers you saved with 'Save to library': face, voice and frame together.">My library</div>
              <div className="forge-shelf">
                {library.map((l) => (
                  <button
                    key={l.savedId}
                    className="shelf-face"
                    onClick={() => {
                      const { savedId: _s, savedAt: _a, ...rest } = l;
                      addSpeakerFrom(rest);
                      setAdding(false);
                    }}
                    data-tip={`Add ${l.label} from your library, voice and all.`}
                  >
                    {l.puppetPath ? (
                      <LiveFace path={l.puppetPath} label={l.label} color={l.borderColor} />
                    ) : (
                      <span className="initial" style={{ borderColor: l.borderColor }}>{l.label.slice(0, 1)}</span>
                    )}
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="label-etched pt-1" data-tip="A character nobody has made yet.">Someone new</div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-primary"
              onClick={() => {
                addSpeaker();
                setOrderFor("__new__");
                setAdding(false);
              }}
              data-tip="Add a new speaker and describe their puppet here; Image Forge makes it and it arrives on the shelf by itself."
            >
              Order it from Image Forge
            </button>
            <button
              className="btn"
              onClick={() => void window.byok.forge.openImageForge()}
              data-tip="Open Image Forge to make the puppet yourself there (Wizards → Make a puppet). It appears here when it is done."
            >
              Open Image Forge
            </button>
            <button className="btn" onClick={() => setAdding(false)} data-tip="Close this menu without adding anyone.">
              Never mind
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 mt-3">
        {!sp ? (
          <Empty>No speakers yet. Press + to give your video a voice.</Empty>
        ) : (
          <>
            <Section title="Who" tip="The name and the character behind it.">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sp.label}
                  onChange={(e) => updateSpeaker(sp.id, { label: e.target.value })}
                  className="flex-1 min-w-0"
                  aria-label="Speaker name"
                  data-tip="The name you write in the script before their lines, e.g. «Καίτη: …»."
                />
                <button className="btn" onClick={() => removeSpeaker(sp.id)} data-tip="Take this speaker out of the video. A saved copy in the library stays.">
                  Remove
                </button>
              </div>
              <label className="block" data-tip="How the script introduces them, e.g. «A grave man». Lets story-style scripts find the right voice, and tells the voice who to be.">
                <span className="label-etched">Character</span>
                <input
                  type="text"
                  className="w-full mt-1"
                  placeholder="A grave man"
                  value={sp.openingPhrase ?? ""}
                  onChange={(e) => updateSpeaker(sp.id, { openingPhrase: e.target.value || undefined })}
                />
              </label>
              <div className="flex items-center gap-3">
                <button
                  className="btn"
                  onClick={() => {
                    saveToLibrary(sp);
                    setSaved(sp.label);
                    window.setTimeout(() => setSaved(null), 2000);
                  }}
                  data-tip="Keep this character (face, voice, colours, waveform) to reuse in other videos."
                >
                  Save to library
                </button>
                {saved === sp.label && <span className="text-sm text-emerald-400">saved ✓</span>}
              </div>
            </Section>

            <Section title="Puppet" tip="Their face — a ready-made puppet or a new one — and the frame around it.">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  className="btn"
                  onClick={async () => {
                    const p = await window.byok.dialog.openFile([{ name: "Puppet", extensions: ["json"] }]);
                    if (p) updateSpeaker(sp.id, { puppetPath: p });
                  }}
                  data-tip="The talking face: a puppet file (.puppet.json) with mouths, eyes and brows."
                >
                  {sp.puppetPath ? "Change face" : "Choose face…"}
                </button>
                <span className="text-sm text-neutral-500 truncate flex-1" title={sp.puppetPath ?? sp.sheetPath}>
                  {fileName(sp.puppetPath ?? sp.sheetPath) ?? "no face"}
                  {sp.puppetPath && puppetErrors[sp.puppetPath] && <span className="text-red-400"> — {puppetErrors[sp.puppetPath]}</span>}
                </span>
              </div>
              <PuppetShelf current={sp.puppetPath} startOrdering={orderFor === sp.id} onPick={(rigPath) => updateSpeaker(sp.id, { puppetPath: rigPath })} />
              <div className="label-etched" data-tip="The shape around the face. The waveform follows it.">
                Frame
              </div>
              <div className="forge-shapes">
                {SHAPES.map((sh) => (
                  <button
                    key={sh.id}
                    className={`shape ${sp.outlineShape === sh.id ? "on" : ""}`}
                    onClick={() => updateSpeaker(sp.id, { outlineShape: sh.id })}
                    aria-label={sh.label}
                    style={{ ["--c" as string]: sp.borderColor }}
                  >
                    <i className={sh.id} />
                    <span>{sh.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2" data-tip="Their colour: the frame and their waveform use it.">
                  <input type="color" value={sp.borderColor} onChange={(e) => updateSpeaker(sp.id, { borderColor: e.target.value })} className="forge-swatch" />
                  <span className="text-sm text-neutral-400">Colour</span>
                </label>
                <label className="flex items-center gap-2" data-tip="The colour inside the frame, behind the face.">
                  <input type="color" value={sp.bgColor} onChange={(e) => updateSpeaker(sp.id, { bgColor: e.target.value })} className="forge-swatch" />
                  <span className="text-sm text-neutral-400">Fill</span>
                </label>
              </div>
              <div data-tip="How often their hands move by themselves: on questions (a shrug), on words like 'this' or 'here' (pointing), and while explaining. None = only when the script asks, like [waves]. Only puppets made waist-up have hands.">
                <Slider
                  label="How much they gesture"
                  value={sp.gestures ?? 0.5}
                  min={0}
                  max={1}
                  step={0.25}
                  onChange={(v) => updateSpeaker(sp.id, { gestures: v })}
                  format={(v) => (v === 0 ? "only when asked" : v <= 0.25 ? "a little" : v <= 0.5 ? "some" : v <= 0.75 ? "a lot" : "lively")}
                />
              </div>
              <div data-tip="How thick the frame line is, in pixels on a 1080-wide video. 0 hides it.">
                <Slider
                  label="Frame thickness"
                  value={sp.frameWidth ?? Math.round(sp.size * 1080 * 0.015)}
                  min={0}
                  max={24}
                  step={1}
                  onChange={(v) => updateSpeaker(sp.id, { frameWidth: Math.round(v) })}
                  format={(v) => `${Math.round(v)} px`}
                />
              </div>
              <div data-tip="How strongly the frame line shows.">
                <Slider label="Frame strength" value={sp.borderOpacity} min={0} max={1} step={0.05} onChange={(v) => updateSpeaker(sp.id, { borderOpacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
              </div>
              <div data-tip="How solid the fill behind the face is. 0 lets the background show through.">
                <Slider label="Fill strength" value={sp.bgOpacity} min={0} max={1} step={0.05} onChange={(v) => updateSpeaker(sp.id, { bgOpacity: v })} format={(v) => (v === 0 ? "see-through" : `${Math.round(v * 100)}%`)} />
              </div>
            </Section>

            <Section title="Voice" tip="How they sound.">
              <div data-tip="Which voice service speaks for them. Gemini and Fish are free.">
                <Picker
                  aria-label="Voice engine"
                  className="w-full"
                  value={engineOf(sp)}
                  options={[
                    { value: "gemini", label: "Gemini — free, acts, many languages" },
                    { value: "fish", label: "Fish Audio — free, a funny foreign accent" },
                    { value: "elevenlabs", label: "ElevenLabs — charged per character" },
                    { value: "piper", label: "Piper — offline, flat" },
                  ]}
                  onChange={(v) => updateSpeaker(sp.id, { ttsEngine: v as "gemini" | "fish" | "elevenlabs" | "piper" })}
                />
              </div>
              {engineOf(sp) === "gemini" && (
                <>
                  <div data-tip="Live models are free with no daily limit. TTS models sound a little better, but only 10 lines a day are free.">
                    <Picker
                      aria-label="Gemini model"
                      className="w-full"
                      value={sp.geminiModel ?? DEFAULT_GEMINI_MODEL}
                      options={GEMINI_MODELS.map((m) => ({ value: m.id, label: m.label }))}
                      onChange={(v) => updateSpeaker(sp.id, { geminiModel: v, geminiMode: geminiModeOf(v) })}
                    />
                  </div>
                  <div data-tip="Which of Google's voices. The word after the name is how Google describes it.">
                    <Picker
                      aria-label="Gemini voice"
                      className="w-full"
                      value={sp.geminiVoice ?? DEFAULT_GEMINI_VOICE}
                      options={GEMINI_VOICES.map((v) => ({ value: v.name, label: `${v.name} — ${v.feel}` }))}
                      onChange={(v) => updateSpeaker(sp.id, { geminiVoice: v })}
                    />
                  </div>
                </>
              )}
              {engineOf(sp) === "piper" && (
                <Picker
                  aria-label="Piper voice"
                  className="w-full"
                  placeholder={voices.length === 0 ? "No voices — scan in Settings" : "Saved voice not found — pick another"}
                  value={sp.voiceId ?? ""}
                  options={[
                    { value: "", label: voices.length === 0 ? "No voices — scan in Settings" : "No voice assigned" },
                    ...voices.map((v) => ({ value: v.onnxPath, label: v.name })),
                  ]}
                  onChange={(v) => updateSpeaker(sp.id, { voiceId: v || undefined })}
                />
              )}
              {engineOf(sp) === "elevenlabs" && (
                <Picker
                  aria-label="ElevenLabs voice"
                  className="w-full"
                  placeholder={elevenVoices.length === 0 ? "No voices — save a key in Settings" : "Pick a voice"}
                  value={sp.elevenVoiceId ?? ""}
                  options={[{ value: "", label: "No voice chosen" }, ...elevenVoices.map((v) => ({ value: v.id, label: v.name }))]}
                  onChange={(v) => updateSpeaker(sp.id, { elevenVoiceId: v || undefined })}
                />
              )}
              <div data-tip="Higher or lower voice, without changing how fast they talk.">
                <Slider
                  label="Pitch"
                  value={sp.pitch ?? 0}
                  min={-6} max={6} step={1}
                  format={(v) => (v === 0 ? "as is" : `${v > 0 ? "+" : "−"}${Math.abs(v)} step${Math.abs(v) === 1 ? "" : "s"}`)}
                  onChange={(pitch) => updateSpeaker(sp.id, { pitch })}
                />
              </div>
              <div data-tip="How fast they talk. 1× is as the voice made it.">
                <Slider
                  label="Speed"
                  value={sp.speed ?? 1}
                  min={0.8} max={1.25} step={0.05}
                  format={(v) => `${v.toFixed(2)}×`}
                  onChange={(speed) => updateSpeaker(sp.id, { speed })}
                />
              </div>
              <div data-tip="The little pause when they say two lines in a row. Until you move it, the video's own setting (Script step) is used.">
                <Slider
                  label="Breath between their lines"
                  value={sp.breathMs ?? 120}
                  min={0} max={800} step={20}
                  format={(v) => (sp.breathMs === undefined ? "video's setting" : `${(v / 1000).toFixed(2)} s`)}
                  onChange={(breathMs) => updateSpeaker(sp.id, { breathMs })}
                />
              </div>
              {engineOf(sp) === "gemini" && (
                <p className="text-sm text-neutral-500">
                  Write [laughs], [whispers], [sighs] inside a line to have it acted, never read out. Each line is
                  checked word by word and re-made if it drifts from the script.
                </p>
              )}
            </Section>

            <Section title="Waveform" tip="The moving bars that show when they speak." open={false}>
              <WaveformControls label={`Show ${sp.label}'s waveform`} value={sp.waveform} onChange={(patch) => setSpeakerWaveform(sp.id, patch)} face={{ color: sp.borderColor, shape: sp.outlineShape }} />
            </Section>

            <Section title="Place" tip="Where they stand in the picture. You can also drag them on the preview." open={false}>
              <div data-tip="How big their face is, compared with the width of the video.">
                <Slider label="Size" value={sp.size} min={0.05} max={0.9} step={0.01} onChange={(v) => updateSpeaker(sp.id, { size: v })} format={(v) => `${Math.round(v * 100)}%`} />
              </div>
              <div data-tip="Left (0%) to right (100%).">
                <Slider label="Across" value={sp.x} min={0} max={1} step={0.01} onChange={(v) => updateSpeaker(sp.id, { x: v })} format={(v) => `${Math.round(v * 100)}%`} />
              </div>
              <div data-tip="Top (0%) to bottom (100%).">
                <Slider label="Up / down" value={sp.y} min={0} max={1} step={0.01} onChange={(v) => updateSpeaker(sp.id, { y: v })} format={(v) => `${Math.round(v * 100)}%`} />
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

const fileName = (p?: string) => (p ? p.split(/[\\/]/).pop() : undefined);

/** A collapsible section of a speaker's tab. */
function Section({ title, tip, open = true, children }: { title: string; tip: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="forge-sec" open={open}>
      <summary data-tip={tip}>{title}</summary>
      <div className="space-y-3 pt-3">{children}</div>
    </details>
  );
}

/** A built-in character's face for the "+" menu: the base picture their own
 *  puppet file names, or their initial when it cannot be read. */
function BuiltinFace({ dir, file, label, color }: { dir: string; file: string; label: string; color?: string }) {
  const path = builtinPuppetPath(dir, file);
  const { defs } = usePuppetDefs([path]);
  const def = defs[path];
  const [broken, setBroken] = useState(false);
  if (!def || broken) {
    return (
      <span className="initial" style={{ borderColor: color }}>
        {label.slice(0, 1)}
      </span>
    );
  }
  const base = `${resolveAssetDir(path, def.dir)}/${def.base}`.split("\\").join("/");
  return <img src={`file:///${base.replace(/^[/]+/, "")}`} alt="" onError={() => setBroken(true)} style={{ borderColor: color }} />;
}
