// ---------------------------------------------------------------------------
// The video itself.
//
// Intentionally plain: background, waveform, speaker placeholders, audio.
// This exists to prove the pipeline end to end — script -> narration ->
// frames -> MP4 — not to look good yet. Visual work belongs on top of a
// pipeline that is already known to work.
//
// Note the styling here is all inline. The Remotion bundle is built by
// Remotion's own webpack config and does NOT run Tailwind, so any Tailwind
// class names in shared components are inert during a render. Anything
// layout-critical has to be an inline style.
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import { AbsoluteFill, Audio, Img, Loop, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { WaveformScene } from "../src/components/canvas/WaveformScene";
import { SubtitleScene } from "../src/components/canvas/SubtitleScene";
import { SpeakerAvatar } from "../src/components/canvas/SpeakerAvatar";
import { PuppetAvatar } from "../src/components/canvas/PuppetAvatar";
import { BackgroundLayer } from "./BackgroundLayer";
import { MusicTrack } from "./MusicTrack";
import { SubtitleFont } from "./SubtitleFont";
import { GlassPanel, defaultGlass } from "../src/components/canvas/GlassPanel";
import { buildCues, cueAt } from "../src/lib/subtitles/wordTiming";
import { buildTracks } from "../src/lib/waveform/buildTracks";
import { buildSpeakerVisemeTracks } from "../src/lib/visemes/speakerTracks";
import { visemeBlendAt } from "../src/lib/visemes/timeline";
import { VISEME, SMILE_VISEME } from "../src/lib/visemes/visemeMap";
import { useWaitForImages } from "./useWaitForImages";
import { useSpectrumFile } from "./useSpectrumFile";
import { headMotion, motionTransform } from "../src/lib/motion/idleMotion";
import {
  blinkAt, blinkBlendAt, browAt, buildSpeakerBrowTracks,
  buildSpeakerMoodTracks, moodAt, moodFace,
  buildSpeakerHeadTracks, headPoseAt, buildSpeakerPoseTracks, poseAt,
} from "../src/lib/motion/facePerformance";
import { sampleAnalysis } from "../src/lib/waveform/audioAnalysis";
import type { RenderProps } from "./types";

/** Apply an alpha to a #rgb/#rrggbb color. Speakers carry their fill and
 *  border opacity separately, and the default speaker is a deliberately
 *  invisible disk (bgOpacity 0) with only its border showing — so these two
 *  cannot collapse into a single element-level `opacity`. */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(n)) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function VideoComposition({
  musicWaveform,
  musicColor,
  speakers,
  audioFileName,
  analysis,
  spectrumFileName,
  spectrumBandCount,
  musicFileName,
  musicAnalysis,
  musicSpectrumFileName,
  musicSpectrumBandCount,
  musicVolume,
  musicDuck,
  sfx,
  backgrounds,
  backgroundDim,
  backgroundBlur,
  backgroundColorLook,
  backgroundBand = null,
  glass,
  backgroundCrossfadeMs,
  subtitles,
  subtitleFont,
  visemeFadeMs,
  idleMotion,
  narrationSegments,
  narrationPauses = [],
  logo = null,
  introOverlay = null,
  topScrim = null,
  bannerVideo = null,
  nativeMedia = false,
}: RenderProps) {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();

  // Must resolve before any frame is captured — the hook holds the render.
  const spectrum = useSpectrumFile(
    spectrumFileName ? staticFile(spectrumFileName) : null,
    spectrumBandCount
  );
  // The music's own spectrum, by the same road and for the same size reason.
  const musicSpectrum = useSpectrumFile(
    musicSpectrumFileName ? staticFile(musicSpectrumFileName) : null,
    musicSpectrumBandCount
  );

  // Cue layout depends only on the script and the wrap width, so it's computed
  // once per worker rather than on every one of thousands of frames.
  const cues = useMemo(
    () => buildCues(narrationSegments, subtitles.maxChars, narrationPauses),
    [narrationSegments, subtitles.maxChars, narrationPauses]
  );

  // Also once per worker, not per frame — the tracks are thousands of keyframes.
  const visemeTracks = useMemo(
    () => buildSpeakerVisemeTracks(narrationSegments, fps, narrationPauses),
    [narrationSegments, fps]
  );

  // Brows come off the script's punctuation, so they are derived once from the
  // same segments the subtitles and the mouth use.
  const browTracks = useMemo(
    () => buildSpeakerBrowTracks(narrationSegments),
    [narrationSegments]
  );
  // What each speaker's line FEELS, moment to moment. Drives the things a brow
  // track cannot: how wide the eyes rest, and whether the mouth rests in a
  // smile between words.
  const moodTracks = useMemo(
    () => buildSpeakerMoodTracks(narrationSegments),
    [narrationSegments]
  );
  // Arm poses from [waves], [points]… and greetings (12 Oct 2026).
  const poseTracks = useMemo(() => buildSpeakerPoseTracks(narrationSegments), [narrationSegments]);
  const headTracks = useMemo(
    () => buildSpeakerHeadTracks(narrationSegments),
    [narrationSegments]
  );

  // Every image any avatar might draw: a flattened sheet, or every layer of a
  // layered puppet. Resolved to public-dir URLs here, once, and handed to the
  // avatars below rather than recomputed per speaker per frame.
  const puppetUrls = useMemo(
    () =>
      speakers.map((sp) =>
        Object.fromEntries(
          Object.entries(sp.puppetFiles).map(([file, name]) => [file, staticFile(name)])
        )
      ),
    [speakers]
  );

  const faceUrls = useMemo(
    () => [
      ...speakers.map((sp) => (sp.sheetFileName ? staticFile(sp.sheetFileName) : "")).filter(Boolean),
      ...puppetUrls.flatMap((m) => Object.values(m)),
    ],
    [speakers, puppetUrls]
  );
  // Must run before any frame is captured — see the hook for why. A puppet
  // makes this matter more, not less: twenty layers that pop in over the first
  // few frames is twenty chances to ship a frame with half a face.
  useWaitForImages(faceUrls);

  const tracks = useMemo(
    () => buildTracks(speakers, musicWaveform, musicColor),
    [speakers, musicWaveform, musicColor]
  );

  const speakerColors = useMemo(
    () => Object.fromEntries(speakers.map((sp) => [sp.id, sp.borderColor])),
    [speakers]
  );

  // The single line that makes the export deterministic: time comes from the
  // frame index, never from a wall clock. Frame 240 at 30fps is 8000ms on
  // every worker, in any order, on every machine.
  const timeMs = (frame / fps) * 1000;

  // Same source as the waveform's active-speaker gate, so the head that moves
  // more is always the head whose waveform is lit.
  const moment = sampleAnalysis(analysis, timeMs, spectrum);
  const activeSpeakerId =
    moment && moment.speaker >= 0 ? speakers[moment.speaker]?.id ?? null : null;

  // Built once and rendered in two places — plainly, and again inside the
  // glass filter. It is an element rather than a component so both copies are
  // identical by construction: a pane that refracted a slightly different
  // scene from the one beside it would be worse than no pane at all.
  const behindGlass = (
    <>
      <BackgroundLayer
        backgrounds={backgrounds ?? []}
        fps={fps}
        crossfadeMs={backgroundCrossfadeMs}
        dim={backgroundDim}
        blur={backgroundBlur ?? 0}
        colorLook={backgroundColorLook}
        width={width}
        band={backgroundBand}
      />
      {/* UNDER THE WORDS, OVER THE FOOTAGE. Full-frame footage put a sunny
          park behind white subtitles; this band is only as tall as the text
          needs and fades out below it, so the picture is untouched elsewhere. */}
      {topScrim && (
        <AbsoluteFill
          style={{
            height: `${topScrim.height * 100}%`,
            bottom: "auto",
            background: `linear-gradient(to bottom, rgba(0,0,0,${topScrim.opacity}) 0%, rgba(0,0,0,${topScrim.opacity}) 55%, rgba(0,0,0,0) 100%)`,
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0 }}>
        <WaveformScene
          tracks={tracks}
          width={width}
          height={height}
          timeMs={timeMs}
          analysis={analysis}
          spectrum={spectrum}
          musicAnalysis={musicAnalysis}
          musicSpectrum={musicSpectrum}
        />
      </div>
    </>
  );

  // The caption's pane, as a rectangle, or null when there is nothing to draw.
  //
  // Derived, never measured: fontSize and maxChars are both known, so the line
  // count and a close-enough line width follow from the cue's own text. 0.52 em
  // per character is a rough average for Greek at this weight — generous rather
  // than tight, because a pane slightly wider than its text still looks like a
  // pane and one slightly narrower clips a letter.
  const captionGlass = (() => {
    if (!subtitles.enabled || subtitles.surface?.style !== "glass") return null;
    const cue = cueAt(cues, timeMs);
    if (!cue) return null;

    const fontSize = Math.max(8, width * subtitles.fontSize);
    const text = cue.words.map((w) => w.text).join(" ");
    const maxChars = Math.max(8, subtitles.maxChars);
    const lines = Math.max(1, Math.ceil(text.length / maxChars));
    const longest = Math.min(text.length, maxChars);

    const padX = fontSize * 0.9;
    const padY = fontSize * 0.42;
    const w = Math.min(width * 0.92, longest * fontSize * 0.52 + padX * 2);
    const h = lines * fontSize * 1.25 + padY * 2;

    // Matches SubtitleScene's own bottom placement, so the text lands inside
    // the pane rather than beside it.
    const bottom = height * 0.1;
    return { x: (width - w) / 2, y: height - bottom - h, w, h };
  })();

  return (
    // Under HyperFrames the footage is a native layer BELOW this one and the
    // page supplies the same dark ground, so this must be see-through.
    <AbsoluteFill style={{ backgroundColor: nativeMedia ? "transparent" : "#0b0b0d" }}>
      {audioFileName ? <Audio src={staticFile(audioFileName)} /> : null}

      <MusicTrack
        fileName={musicFileName}
        musicAnalysis={musicAnalysis}
        narrationAnalysis={analysis}
        volume={musicVolume}
        duck={musicDuck}
        durationInFrames={durationInFrames}
      />

      {/* Each effect is its own one-shot sequence. `layout="none"` because
          these draw nothing — a Sequence would otherwise wrap them in an
          AbsoluteFill and stack invisible divs over the picture. */}
      {(sfx ?? []).map((s, i) => (
        <Sequence
          key={`${s.fileName}-${i}`}
          from={Math.max(0, Math.round((s.atMs / 1000) * fps))}
          layout="none"
          name={`SFX ${i + 1}`}
        >
          <Audio src={staticFile(s.fileName)} volume={s.volume} />
        </Sequence>
      ))}

      {behindGlass}

      {/* GLASS GOES HERE, and the position in this file is the feature.
          backdrop-filter bends only what has already been painted, so a pane
          drawn after the background and before the faces refracts the footage
          and leaves the face sharp on top of it.

          A disc is sized to the avatar and no larger, so the waveform bars —
          which radiate beyond it — fall outside the pane and keep their edge. */}
      {speakers.map((sp) => {
        if (sp.surface?.style !== "glass") return null;
        const size = Math.max(8, sp.size * width);
        return (
          <GlassPanel
            key={`glass-${sp.id}`}
            id={sp.id}
            glass={{
              ...(glass ?? defaultGlass()),
              // "none" means no drawn outline, not a square face — the art
              // is round either way, so it gets a disc. Only an explicitly
              // square or rounded frame gets a rectangular pane.
              shape:
                sp.outlineShape === "square" || sp.outlineShape === "rounded"
                  ? "rect"
                  : "circle",
            }}
            rect={{ x: sp.x * width - size / 2, y: sp.y * height - size / 2, w: size, h: size }}
            frameWidth={width}
            frameHeight={height}
            scene={behindGlass}
          />
        );
      })}

      {speakers.map((sp, i) => {
        const track = visemeTracks[sp.id];
        const blend = track
          ? visemeBlendAt(track, timeMs / 1000, visemeFadeMs / 1000)
          : { from: VISEME.NEUTRAL, to: VISEME.NEUTRAL, mix: 1 };
        // THE RESTING FACE FOLLOWS THE FEELING. Between words a mouth returns
        // to NEUTRAL and the eyes to open; on a fond or delighted line it
        // should return to a smile instead, and on an astonished one the eyes
        // should rest wide. Only the resting shapes are touched — every spoken
        // viseme is left exactly as the words produced it.
        const face = moodFace(moodAt(moodTracks[sp.id], timeMs));
        const rest = (v: number) => (face?.smile && v === VISEME.NEUTRAL ? SMILE_VISEME : v);
        const mouth = { from: rest(blend.from), to: rest(blend.to), mix: blend.mix };
        // size is a fraction of frame width, so this resolves identically in
        // the preview and here — no scaling factor to get wrong.
        const size = Math.max(8, sp.size * width);
        const motion = headMotion(
          sp.id,
          timeMs,
          activeSpeakerId === sp.id,
          idleMotion
        );
        return (
          <div
            key={sp.id}
            style={{
              position: "absolute",
              left: `${sp.x * 100}%`,
              top: `${sp.y * 100}%`,
              transform: "translate(-50%, -50%)" + motionTransform(motion, size),
            }}
          >
            {/* The very same components the preview draws. Duplicating the disk
                markup here is what let the border width and glow drift apart
                once already — there is only one implementation now. */}
            {sp.puppet ? (
              <PuppetAvatar
                puppet={sp.puppet}
                urls={puppetUrls[i]}
                viseme={mouth.to}
                prevViseme={mouth.from}
                mix={mouth.mix}
                // Both eyes blink together. Per-eye lids exist for the wink,
                // which is a directed choice rather than something an
                // automatic track should ever produce on its own.
                // Crossfaded, not swapped. A blink is under four frames long,
                // so three hard-swapped drawings stutter in a face that is
                // otherwise moving on continuous curves — which is what Ak kept
                // seeing as choppy. Computed once and spread, because calling
                // it five times would be five binary searches per eye per frame.
                {...(() => {
                  const b = blinkBlendAt(sp.id, timeMs, idleMotion);
                  // "open" is where a blink starts and ends, and on a startled
                  // line that resting state is wide eyes rather than ordinary
                  // ones. The blink itself is untouched: it still closes.
                  const at = (state: string) =>
                    state === "open" && face?.lid ? face.lid : state;
                  return {
                    lidLeft: at(b.from), lidRight: at(b.from),
                    lidLeftTo: at(b.to), lidRightTo: at(b.to), lidMix: b.mix,
                  };
                })()}
                browLeft={browAt(browTracks[sp.id], timeMs)}
                browRight={browAt(browTracks[sp.id], timeMs)}
                head={headPoseAt(sp.id, headTracks[sp.id], timeMs, idleMotion)}
                      pose={poseAt(poseTracks[sp.id], timeMs)}
                size={size}
                bgOpacity={sp.bgOpacity}
                borderOpacity={sp.borderOpacity}
                bgColor={sp.bgColor}
                borderColor={sp.borderColor}
                outlineShape={sp.outlineShape}
              />
            ) : (
              <SpeakerAvatar
                sheetUrl={sp.sheetFileName ? staticFile(sp.sheetFileName) : ""}
                viseme={blend.to}
                prevViseme={blend.from}
                mix={blend.mix}
                size={size}
                bgOpacity={sp.bgOpacity}
                borderOpacity={sp.borderOpacity}
                bgColor={sp.bgColor}
                borderColor={sp.borderColor}
                outlineShape={sp.outlineShape}
              />
            )}
          </div>
        );
      })}

      <SubtitleFont font={subtitleFont} />

      {/* Last, so subtitles sit above the waveform and the avatars. */}
      {/* THE CAPTION'S PANE, and it lives here rather than inside SubtitleScene
          for one reason: this is where the scene is. A pane only refracts if it
          can redraw what is behind it, and the subtitle component has never had
          access to the background or the waveform — which is why every attempt
          to make the pill glass from in there produced a tinted slab instead.

          The box is COMPUTED rather than measured. A caption is sized by its own
          text, and there is no measuring in a render that has to be a pure
          function of the clock — so its width and height are derived from the
          font size, the wrap width and the number of lines, all of which are
          already known. Slightly generous is fine; a pane a little wider than
          its text still reads as a pane. */}
      {captionGlass && (
        <GlassPanel
          id="caption"
          // STRIPPED TO THE FILTER AND NOTHING ELSE, which is the whole
          // experiment. GlassSurface bends the pixels already painted beneath
          // it and draws NOTHING over them. Every version of this that added a
          // tint, a rim, or a re-rendered copy of the scene stacked opaque
          // layers on top and produced a grey slab — an overlay where the
          // reference is a lens. So: no scene copy, no tint, no frost, no
          // shadows. If their filter cannot carry it alone over video, then it
          // cannot, and that is the answer.
          glass={{
            ...(glass ?? defaultGlass()),
            shape: "rect",
            radius: 0.5,
            magnify: 1,
            tintOpacity: 0,
            frost: 0,
            edge: 0,
          }}
          rect={captionGlass}
          frameWidth={width}
          frameHeight={height}
        />
      )}

      <SubtitleScene
        cues={cues}
        config={subtitles}
        width={width}
        height={height}
        timeMs={timeMs}
        speakerColors={speakerColors}
        glass={glass}
        externalPane={!!captionGlass}
      />

      {/* THE INTRO, over the lesson's own opening silence rather than welded
          in front of it. Nothing underneath moves, so the mouths stay in sync
          with the voices to the frame; the lesson's audio — including the
          music swell this covers — plays underneath throughout. Muted, because
          the clip's own sound was stripped and the lesson owns the soundtrack. */}
      {introOverlay && !nativeMedia && (
        <Sequence
          from={0}
          durationInFrames={Math.max(1, Math.round((introOverlay.durationMs / 1000) * fps))}
        >
          <AbsoluteFill style={{ backgroundColor: "#000" }}>
            <OffthreadVideo
              src={staticFile(introOverlay.fileName)}
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* THE BANNER. The source is 16:9 with the brand in its middle half; the
          box below is exactly the kept strip's shape at full frame width, and
          the video inside is scaled to the frame width and shifted up by the
          cut, so only the middle shows. Looped for the whole lesson, muted —
          the lesson owns the soundtrack. */}
      {bannerVideo && !nativeMedia && (() => {
        const keep = 1 - bannerVideo.cropTop - bannerVideo.cropBottom;
        const sourceHeight = width * (9 / 16);
        const boxHeight = sourceHeight * keep;
        return (
          <div
            style={{
              position: "absolute", left: 0, right: 0, bottom: 0,
              height: boxHeight, overflow: "hidden",
            }}
          >
            <Loop durationInFrames={Math.round(10 * fps)}>
              <OffthreadVideo
                src={staticFile(bannerVideo.fileName)}
                muted
                style={{
                  position: "absolute", left: 0, width: "100%",
                  height: sourceHeight, top: -sourceHeight * bannerVideo.cropTop,
                  objectFit: "cover",
                }}
              />
            </Loop>
          </div>
        );
      })()}

      {/* ABOVE EVERYTHING, including the subtitles. A logo that a caption can
          cover is not a logo — the one thing it has to do is be present in
          every frame it is asked for. */}
      {logo && !nativeMedia && (
        <Img
          src={staticFile(logo.fileName)}
          style={{
            position: "absolute",
            width: width * logo.size,
            opacity: logo.opacity,
            // A watermark sits in the middle and is meant to be ignored; the
            // four corners are meant to be read.
            ...(logo.position === "watermark"
              ? {
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }
              : logo.position === "bottom-center"
              ? {
                  // Centred on the bottom edge — a banner, not a corner mark.
                  bottom: width * logo.margin,
                  left: "50%",
                  transform: "translateX(-50%)",
                }
              : {
                  [logo.position.startsWith("top") ? "top" : "bottom"]:
                    width * logo.margin,
                  [logo.position.endsWith("left") ? "left" : "right"]:
                    width * logo.margin,
                }),
          }}
        />
      )}
    </AbsoluteFill>
  );
}
