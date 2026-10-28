// ---------------------------------------------------------------------------
// RIGHT PANEL — the scene: everything that isn't tied to one sound source.
// Frame settings, subtitles, render, and presets.
// ---------------------------------------------------------------------------

import { ManyVideosPointer } from "../render/ManyVideos";
import { plainError } from "../../lib/plainError";
import { useState } from "react";
import { HudButton } from "../ui/HudButton";
import { MediaLibrary } from "./MediaLibrary";
import { Slider } from "../ui/Slider";
import { Toggle } from "../ui/Toggle";
import { Tabs } from "../ui/Tabs";
import { BackgroundPanel } from "./BackgroundPanel";
import { SetPicker } from "./SetPicker";
import { SubtitleFontPicker } from "./SubtitleFontPicker";
import { CAPTION_STYLES, type CaptionStyle } from "../../lib/subtitles/captionStyles";
import { RenderBar } from "../render/RenderBar";
import { PresetsPanel } from "./PresetsPanel";
import { MusicPanel } from "./MusicPanel";
import { SfxPanel } from "./SfxPanel";
import { RoadmapSection } from "../canvas/RoadmapSection";
import { useProjectStore } from "../../store/useProjectStore";
import { buildCues } from "../../lib/subtitles/wordTiming";
import { toSrt } from "../../lib/subtitles/srt";
import type { Fps, SubtitleConfig } from "../../store/types";

export type SceneTab = "extras" | "shape" | "motion" | "background" | "subtitles" | "music" | "sfx" | "render" | "presets" | "many";
type Tab = SceneTab;

const TAB_LABELS: Record<Tab, string> = {
  presets: "Templates",
  extras: "Intro & outro",
  shape: "Shape",
  motion: "Motion",
  music: "Music",
  sfx: "Sounds",
  background: "Background",
  subtitles: "Subtitles",
  render: "Render",
  many: "Many videos",
};

const FPS_OPTIONS: Fps[] = [10, 24, 30, 60];
const SUB_POS: SubtitleConfig["position"][] = ["top", "center", "bottom"];

/** The four-step layout (11 Oct 2026) shows a different slice of this panel
 *  in each step: Look gets templates, frame, background and subtitles; Make
 *  gets render. `tabs` picks the slice; the first one opens. */
export function ScenePanel({
  title = "Scene",
  tabs = ["presets", "background", "subtitles", "music", "sfx", "motion", "render", "extras", "shape"],
}: { title?: string; tabs?: Tab[] } = {}) {
  const [picked, setTab] = useState<Tab>(tabs[0]);
  const tab = tabs.includes(picked) ? picked : tabs[0];

  const fps = useProjectStore((s) => s.fps);
  const setFps = useProjectStore((s) => s.setFps);
  const render = useProjectStore((s) => s.render);
  const setRender = useProjectStore((s) => s.setRender);
  const cards = useProjectStore((s) => s.cards);
  const setCards = useProjectStore((s) => s.setCards);
  const logo = useProjectStore((s) => s.logo);
  const setLogo = useProjectStore((s) => s.setLogo);
  const subtitles = useProjectStore((s) => s.subtitles);
  const setSubtitles = useProjectStore((s) => s.setSubtitles);
  const narration = useProjectStore((s) => s.narration);
  const setBackgrounds = useProjectStore((s) => s.setBackgrounds);
  const backgroundsNow = () => useProjectStore.getState().backgrounds;
  const visemeFadeMs = useProjectStore((s) => s.visemeFadeMs);
  const setVisemeFadeMs = useProjectStore((s) => s.setVisemeFadeMs);
  const idleMotion = useProjectStore((s) => s.idleMotion);
  const setIdleMotion = useProjectStore((s) => s.setIdleMotion);
  const [srtNote, setSrtNote] = useState<string | null>(null);

  const exportSrt = async () => {
    if (!narration) return;
    setSrtNote(null);
    const target = await window.byok.dialog.saveFile("subtitles.srt", [
      { name: "SubRip subtitles", extensions: ["srt"] },
    ]);
    if (!target) return;
    try {
      // Built through buildCues with the SAME maxChars the video uses, so the
      // file breaks its lines exactly where the picture does.
      const text = toSrt(buildCues(narration.segments, subtitles.maxChars));
      await window.byok.storage.writeFile(
        target,
        new TextEncoder().encode(text).buffer as ArrayBuffer
      );
      setSrtNote(`Saved ${target.split(/[\\/]/).pop()}`);
    } catch (e) {
      setSrtNote(`Couldn't save it: ${plainError(e, "Pick another folder and press Export again.")}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h2 data-tip="The name of the page you are on." className="title-deco uppercase text-lg mb-3">{title}</h2>

      {tabs.length > 1 && (
        <Tabs tabs={tabs.map((id) => ({ id, label: TAB_LABELS[id] }))} active={tab} onChange={setTab} data-tip="Switch between the groups of settings on this panel." />
      )}

      <div className="flex-1 overflow-y-auto pr-1 space-y-6">
        {tab === "extras" && (
          <>
            {/* Joined on AFTER the render, so nothing inside the lesson moves.
                A card placed in the composition would shift the narration and
                every subtitle by its own length. */}
            <section className="space-y-2">
              <div data-tip="A short clip before your video starts, and one after it ends." className="label-etched">Intro &amp; outro</div>
              {(["intro", "outro"] as const).map((which) => {
                const key = which === "intro" ? "introPath" : "outroPath";
                const value = cards[key];
                return (
                  <div key={which} className="flex items-center gap-2">
                    <HudButton
                      data-tip={`Pick a short video file from your computer to play ${which === "intro" ? "before" : "after"} your video.`}
                      onClick={async () => {
                        const p = await window.byok.dialog.openFile([
                          { name: "Video", extensions: ["mp4", "mov", "webm", "mkv", "m4v"] },
                        ]);
                        if (p) setCards({ [key]: p });
                      }}
                    >
                      {value ? `Change ${which}` : `Choose ${which}…`}
                    </HudButton>
                    <span data-tip="The file you picked. “none” means you have not picked one." className="text-sm text-neutral-400 truncate flex-1">
                      {value ? value.split(/[\/]/).pop() : "none"}
                    </span>
                    {value && (
                      <button
                        className="text-sm text-neutral-500 hover:text-red-400"
                        data-tip={`Takes the ${which} out. Your video plays on its own.`}
                        onClick={() => setCards({ [key]: null })}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
              <p className="text-sm text-neutral-500">
                Two or three seconds each. Any video file. It is scaled to fit
                the frame, and it keeps whatever sound it came with — a card
                with no sound is fine. It is joined on after the lesson is
                rendered, so nothing inside the lesson moves by a frame.
              </p>
            </section>

            {/* Drawn over everything, subtitles included. */}
            <section className="space-y-2">
              <div data-tip="A small picture, like your logo, shown on top of the whole video." className="label-etched">Logo</div>
              <div className="flex items-center gap-2">
                <HudButton
                  data-tip="Pick a picture (like your logo) to show on top of the whole video."
                  onClick={async () => {
                    const p = await window.byok.dialog.openFile([
                      { name: "Image", extensions: ["png", "jpg", "jpeg", "webp", "svg"] },
                    ]);
                    if (p) setLogo({ filePath: p });
                  }}
                >
                  {logo.filePath ? "Change logo" : "Choose logo…"}
                </HudButton>
                <span data-tip="The picture you picked. “none” means you have not picked one." className="text-sm text-neutral-400 truncate flex-1">
                  {logo.filePath ? logo.filePath.split(/[\/]/).pop() : "none"}
                </span>
                {logo.filePath && (
                  <button
                    className="text-sm text-neutral-500 hover:text-red-400"
                    data-tip="Takes the logo off the video."
                    onClick={() => setLogo({ filePath: null })}
                  >
                    Remove
                  </button>
                )}
              </div>
              {logo.filePath && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["top-left", "top left"],
                      ["top-right", "top right"],
                      ["bottom-left", "bottom left"],
                      ["bottom-right", "bottom right"],
                      ["watermark", "centred"],
                    ] as const).map(([id, label]) => (
                      <HudButton
                        key={id}
                        data-tip={`Puts the logo ${label} of the picture.`}
                        active={logo.position === id}
                        onClick={() => setLogo({ position: id })}
                      >
                        {label}
                      </HudButton>
                    ))}
                  </div>
                  <Slider
                    data-tip="How big the logo is, as a share of the video width." label="Logo size" value={logo.size} min={0.03} max={0.5} step={0.01}
                    onChange={(v) => setLogo({ size: v })}
                    format={(v) => `${Math.round(v * 100)}% of width`}
                  />
                  <Slider
                    data-tip="How see-through the logo is. Lower = fainter." label="Logo opacity" value={logo.opacity} min={0.05} max={1} step={0.05}
                    onChange={(v) => setLogo({ opacity: v })}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                  {logo.position !== "watermark" && (
                    <Slider
                      data-tip="How far the logo sits from the edge of the picture." label="Distance from edge" value={logo.margin} min={0} max={0.15} step={0.005}
                      onChange={(v) => setLogo({ margin: v })}
                      format={(v) => `${Math.round(v * 100)}%`}
                    />
                  )}
                </>
              )}
            </section>

          </>
        )}

        {tab === "shape" && (
          <>
            {/* MAKE TEMPLATES ("where is it going?") — one click sets the shape
                and smoothness for the place the video will live. */}
            <section>
              <div className="label-etched mb-2" data-tip="Pick where the video is going; it sets the shape and smoothness for you.">Made for</div>
              <div className="flex flex-wrap gap-2">
                {([
                  { id: "shorts", label: "Shorts · TikTok · Reels", tip: "Vertical (9:16), 30 pictures a second — phones.", format: "9:16" as const, w: 1080, h: 1920, fps: 30 as Fps },
                  { id: "youtube", label: "YouTube", tip: "Wide (16:9), 30 pictures a second — computers and TVs.", format: "16:9" as const, w: 1920, h: 1080, fps: 30 as Fps },
                  { id: "lesson", label: "Course lesson", tip: "Vertical (9:16), 24 pictures a second — like the 70 lessons. Smaller files, faster renders.", format: "9:16" as const, w: 1080, h: 1920, fps: 24 as Fps },
                  { id: "feed", label: "Instagram feed", tip: "4:5 (1080×1350), 30 pictures a second — the tallest post Instagram's feed shows, bigger than square.", format: "4:5" as const, w: 1080, h: 1350, fps: 30 as Fps },
                ]).map((m) => (
                  <HudButton
                    key={m.id}
                    title={m.tip}
                    active={render.format === m.format && fps === m.fps}
                    onClick={() => {
                      setRender({ format: m.format, width: m.w, height: m.h });
                      setFps(m.fps);
                    }}
                  >
                    {m.label}
                  </HudButton>
                ))}
              </div>
            </section>
            <section>
              <div data-tip="The shape of your video: tall for phones, wide for TV, square for feeds." className="label-etched mb-2">Aspect Ratio</div>
              <div className="flex gap-2">
                <HudButton
                  data-tip="Tall, phone-style picture. Good for Shorts, TikTok and Reels."
                  active={render.format === "9:16"}
                  onClick={() => setRender({ format: "9:16", width: 1080, height: 1920 })}
                >
                  9:16 vertical
                </HudButton>
                <HudButton
                  data-tip="Wide, TV-style picture. Good for YouTube and computer screens."
                  active={render.format === "16:9"}
                  onClick={() => setRender({ format: "16:9", width: 1920, height: 1080 })}
                >
                  16:9 wide
                </HudButton>
                <HudButton
                  data-tip="Square picture. Good for feeds on Instagram, Facebook and LinkedIn."
                  active={render.format === "1:1"}
                  onClick={() => setRender({ format: "1:1", width: 1080, height: 1080 })}
                >
                  1:1 square
                </HudButton>
                <HudButton
                  data-tip="4:5, a little taller than square — the biggest a post shows in Instagram's feed."
                  active={render.format === "4:5"}
                  onClick={() => setRender({ format: "4:5", width: 1080, height: 1350 })}
                >
                  4:5 feed
                </HudButton>
              </div>
            </section>

            <section>
              <div data-tip="Pictures per second. More means smoother movement but a bigger file and a slower make." className="label-etched mb-2">Frame Rate</div>
              <div className="flex gap-2">
                {FPS_OPTIONS.map((f) => (
                  <HudButton key={f} active={fps === f} onClick={() => setFps(f)} data-tip={`Draws ${f} pictures every second. More = smoother but slower to make.`}>
                    {f} fps
                  </HudButton>
                ))}
              </div>
              <p className="text-sm text-neutral-500 mt-2">
                Higher is smoother and slower to render. 30 is a good default; 60 makes moving characters silky, and takes about twice as long.
              </p>
            </section>

          </>
        )}

        {tab === "motion" && (
          <>
            <section>
              <div data-tip="How the mouths move with the voice." className="label-etched mb-2">Lip-sync</div>
              <Slider
                data-tip="How smoothly one mouth shape melts into the next while someone talks. 0 = sudden jumps." label="Mouth blending" value={visemeFadeMs} min={0} max={200} step={5}
                onChange={(v) => setVisemeFadeMs(Math.round(v))}
                format={(v) => (v === 0 ? "hard cut" : `${Math.round(v)} ms`)}
              />
              <p className="text-sm text-neutral-500 mt-2">
                Blends one mouth shape into the next instead of cutting. At {fps}
                {" "}fps a frame is {Math.round(1000 / fps)}ms, so anything under
                that lands on a single frame and won't read.
              </p>
              <div className="mt-4">
                <Slider
                  data-tip="How much the characters gently breathe and sway when still. 0 = frozen like a photo." label="Idle Motion" value={idleMotion} min={0} max={1} step={0.05}
                  onChange={setIdleMotion}
                  format={(v) => (v === 0 ? "still" : `${Math.round(v * 100)}%`)}
                />
                <p className="text-sm text-neutral-500 mt-2">
                  Breathing and a slow drift, so a head isn't a photograph with a
                  moving mouth. Whoever is speaking moves slightly more.
                </p>
              </div>
            </section>

          </>
        )}

        {tab === "music" && <MusicPanel />}

        {tab === "sfx" && <SfxPanel />}

        {tab === "background" && (
          <>
            <SetPicker />
            <BackgroundPanel />
            {/* The clips already on this machine. Sits under the search on
                purpose: reaching for what is already here should be the first
                thing offered, not a thing you have to know about. */}
            <div className="border-t border-accent/15 pt-5">
              <MediaLibrary
                shape={render.height > render.width ? "portrait" : "landscape"}
                onPick={(filePath, info) => {
                  const endMs = Math.max(1000, (narration?.analysis?.durationMs ?? 60000));
                  if (backgroundsNow().length && !window.confirm("Replace the planned backgrounds with this one clip for the whole video?")) return;
                  setBackgrounds([
                    {
                      startMs: 0,
                      endMs,
                      query: "chosen by hand",
                      reason: "Picked from the clips on this computer",
                      filePath,
                      hit: { id: filePath, provider: "pexels", url: "", thumbUrl: "", width: info.width, height: info.height, durationSec: info.durationSec },
                    } as never,
                  ]);
                }}
              />
            </div>
          </>
        )}

        {tab === "subtitles" && (
          <section className="space-y-4">
            <Toggle
              data-tip="Turns the words on screen on or off while the narration plays."
              label="Show subtitles"
              checked={subtitles.enabled}
              onChange={(v) => setSubtitles({ enabled: v })}
            />
            {subtitles.enabled && (
              <>
                <div>
                  <div data-tip="One click sets every control below to a caption look. You can still change anything afterwards." className="label-etched mb-2">Caption style</div>
                  <div className="flex flex-wrap gap-2">
                    {CAPTION_STYLES.map((cs: CaptionStyle) => (
                      <HudButton
                        key={cs.id}
                        data-tip={cs.tip}
                        onClick={() => {
                          setSubtitles(cs.set);
                          // the font downloads in the background; the look applies either way
                          if (cs.font) {
                            const { family, weight } = cs.font;
                            window.byok.fonts.ensure(family, weight)
                              .then(() => setSubtitles({ fontFamily: family, fontWeight: weight }))
                              .catch(() => {});
                          }
                        }}
                      >
                        {cs.signature ? `★ ${cs.label}` : cs.label}
                      </HudButton>
                    ))}
                  </div>
                  <p className="text-sm text-neutral-500 mt-2">★ = our own looks. The rest are the styles that already work on short videos.</p>
                </div>
                <div>
                  <div data-tip="Which words are on screen: the whole line, only the words said so far, or one big word at a time." className="label-etched mb-2">Words shown</div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["all", "whole line"],
                      ["spoken", "as they are said"],
                      ["word", "one at a time"],
                    ] as const).map(([id, label]) => (
                      <HudButton
                        key={id}
                        data-tip={`Shows ${label === "whole line" ? "the whole line at once" : label === "one at a time" ? "one big word at a time" : "each word only once it is said"}.`}
                        active={(subtitles.reveal ?? "all") === id}
                        onClick={() => setSubtitles({ reveal: id })}
                      >
                        {label}
                      </HudButton>
                    ))}
                  </div>
                </div>
                <Toggle
                  data-tip="Words already said keep the highlight colour, like karaoke."
                  label="Keep said words coloured"
                  checked={!!subtitles.keepSpoken}
                  onChange={(v) => setSubtitles({ keepSpoken: v })}
                />
                <SubtitleFontPicker />

                <div>
                  <div data-tip="Where the subtitles sit on the picture." className="label-etched mb-2">Position</div>
                  <div className="flex flex-wrap gap-2">
                    {SUB_POS.map((p) => (
                      <HudButton
                        key={p}
                        data-tip={`Puts the subtitles at the ${p} of the picture.`}
                        active={subtitles.position === p}
                        onClick={() => setSubtitles({ position: p })}
                      >
                        {p}
                      </HudButton>
                    ))}
                  </div>
                </div>
                <Slider
                  data-tip="How big the subtitle letters are." label="Text Size" value={subtitles.fontSize} min={0.02} max={0.14} step={0.002}
                  onChange={(v) => setSubtitles({ fontSize: v })}
                  format={(v) => `${(v * 100).toFixed(1)}%`}
                />
                <Slider
                  data-tip="How thick the dark edge around the subtitle letters is. It helps them stand out on busy pictures." label="Outline" value={subtitles.strokeWidth} min={0} max={0.35} step={0.01}
                  onChange={(v) => setSubtitles({ strokeWidth: v })}
                  format={(v) => (v === 0 ? "none" : `${Math.round(v * 100)}%`)}
                />
                <div>
                  <div data-tip="How the word being spoken right now is shown in the subtitles." className="label-etched mb-2">Mark the spoken word</div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["glow", "glow"],
                      ["stroke", "hard edge"],
                      ["halo", "strong halo"],
                      ["box", "highlight box"],
                      ["lift", "lift & grow"],
                      ["sweep", "★ marker sweep"],
                      ["burst", "★ comic sticker"],
                      ["ink", "★ ink fill"],
                    ] as const).map(([id, label]) => (
                      <HudButton
                        key={id}
                        data-tip={`Marks the word being spoken with "${label}" so viewers can follow along.`}
                        active={(subtitles.activeEmphasis ?? "glow") === id}
                        onClick={() => setSubtitles({ activeEmphasis: id })}
                      >
                        {label}
                      </HudButton>
                    ))}
                  </div>
                  <p className="text-sm text-neutral-500 mt-2">
                    Glow is the letter's own colour spread outwards, so over bright
                    or busy footage it has little to push against. The others work
                    by contrast at the letter's edge and survive any background.
                  </p>
                </div>
                <Slider
                  data-tip="How strong the glow is around the word being spoken. 0 = no glow." label="Glow Strength" value={subtitles.activeGlow} min={0} max={1.5} step={0.05}
                  onChange={(v) => setSubtitles({ activeGlow: v })}
                  format={(v) => (v === 0 ? "off" : `${v.toFixed(2)}x`)}
                />
                <Slider
                  data-tip="The most letters allowed on one subtitle line before it wraps to the next." label="Line Length" value={subtitles.maxChars} min={14} max={80} step={1}
                  onChange={(v) => setSubtitles({ maxChars: Math.round(v) })}
                  format={(v) => `${Math.round(v)} chars`}
                />
                <Toggle
                  data-tip="The word being spoken lights up in that speaker's own colour."
                  label="Active word takes the speaker's colour"
                  checked={subtitles.activeFromSpeaker}
                  onChange={(v) => setSubtitles({ activeFromSpeaker: v })}
                />
                <Toggle
                  data-tip="Shows all subtitle letters as CAPITALS."
                  label="UPPERCASE"
                  checked={subtitles.uppercase}
                  onChange={(v) => setSubtitles({ uppercase: v })}
                />
                <div className="flex items-center gap-4">
                  {(
                    [
                      ["color", "Text"],
                      // Hidden rather than disabled while the speaker drives it:
                      // a control that visibly does nothing is worse than one
                      // that isn't there.
                      ...(subtitles.activeFromSpeaker
                        ? []
                        : ([["activeColor", "Active"]] as const)),
                      ["strokeColor", "Outline"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex flex-col items-center gap-1.5">
                      <input
                        type="color" value={subtitles[key]}
                        data-tip={`The colour of the ${label.toLowerCase()} part of the subtitles. Click to pick another.`}
                        onChange={(e) => setSubtitles({ [key]: e.target.value })}
                        className="h-9 w-9 border border-accent/30 bg-transparent p-0"
                      />
                      <span data-tip="Which part of the subtitles this colour is for. Click the colour box next to it to change it." className="text-sm text-neutral-400">{label}</span>
                    </label>
                  ))}
                </div>
                {!narration && (
                  <p className="text-sm text-neutral-500">
                    Generate narration to see real subtitles on the canvas.
                  </p>
                )}

                <div className="border-t border-accent/15 pt-4 space-y-2">
                  <HudButton onClick={exportSrt} disabled={!narration} data-tip="Saves the words and their timing as a subtitle file (.srt) for sites that add their own captions.">
                    Export subtitle file (.srt)
                  </HudButton>
                  <p className="text-sm text-neutral-500">
                    The same lines and the same timing the video burns in, as a subtitle
                    file — for platforms that want their own captions. Styling isn't
                    carried: an .srt is text and timing, and the player draws it.
                  </p>
                  {srtNote && <p data-tip="What happened when the subtitle file was made. If it says something went wrong, try the button again." className="text-sm text-accent-bright">{srtNote}</p>}
                </div>
              </>
            )}
          </section>
        )}

        {tab === "render" && <RenderBar />}
        {tab === "many" && <ManyVideosPointer onOpen={() => window.dispatchEvent(new Event("forge:open-many"))} />}

        {tab === "presets" && <PresetsPanel />}
      </div>
    </div>
  );
}
