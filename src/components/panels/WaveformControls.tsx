// ---------------------------------------------------------------------------
// Controls for ONE waveform track — used by both a speaker's tab and the
// music tab, so the two can never end up with different capabilities.
//
// Deliberately wider ranges and finer steps than the old global panel had.
// The previous version felt untweakable because Size was capped at 1.8x with a
// 0.05 step and there was no control at all over bar thickness or smoothing —
// the two things that most change how a waveform reads.
// ---------------------------------------------------------------------------

import { HudButton } from "../ui/HudButton";
import { Slider } from "../ui/Slider";
import { Toggle } from "../ui/Toggle";
import { WAVEFORM_STYLES, type TrackWaveform, type OutlineShape } from "../../store/types";
import { useEffect, useState } from "react";
import { WaveformScene } from "../canvas/WaveformScene";
import { buildTracks } from "../../lib/waveform/buildTracks";

// Read from the one list in types.ts rather than repeated here. The lab styles
// rendered correctly for a week and could not be selected, because the union
// was extended and this panel was not — a second copy of the list is exactly
// how that happens again.
const STYLES = WAVEFORM_STYLES;

/** Plain names, where the code's name would not do. "bloomBars" is camelCase
 *  and "boil" is a verb; nobody choosing a look should have to read either. */
const STYLE_LABEL: Partial<Record<TrackWaveform["style"], string>> = {
  bloomBars: "bloom bars",
  boil: "boiling",
  mesh: "mesh",
};

/** Looks that draw round a centre rather than sampling a path along an edge.
 *  They hide the edge controls. Only the mesh is left, and nothing uses it. */
const isOrbit = (style: string) => style === "mesh";
const POSITIONS: TrackWaveform["position"][] = [
  "speaker", "frame", "circular", "top", "bottom", "left", "right",
];
const POSITION_LABEL: Record<TrackWaveform["position"], string> = {
  speaker: "around face",
  frame: "around the video",
  circular: "circular",
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
};

interface Props {
  value: TrackWaveform;
  onChange: (patch: Partial<TrackWaveform>) => void;
  /** Shown next to the enable toggle, e.g. "Καίτη's waveform". */
  label: string;
  /** Music has no face to ring, so it doesn't get the "around face" option. */
  canAnchorToFace?: boolean;
  /** The speaker's colour and frame shape: when given, styles are chosen from
   *  live picture tiles drawn on that frame, not from a list of names (Ak,
   *  12 Oct 2026: "the visuals are the way to understand which to choose"). */
  face?: { color: string; shape: OutlineShape };
}

/** One clock for all the tiles, so they move together and cost one loop. */
function useTileClock() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT(now - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

const TILE = 96;

function StyleTiles({ value, onChange, face }: { value: TrackWaveform; onChange: (p: Partial<TrackWaveform>) => void; face: { color: string; shape: OutlineShape } }) {
  const t = useTileClock();
  return (
    <div className="forge-waves">
      {STYLES.filter((s) => !isOrbit(s)).map((s) => {
        const tracks = buildTracks(
          [{ borderColor: face.color, outlineShape: face.shape, x: 0.5, y: 0.5, size: 0.42, waveform: { ...value, style: s, enabled: true, position: "speaker" } }],
          { ...value, enabled: false },
          face.color
        );
        return (
          <button key={s} className={`wave ${value.style === s ? "on" : ""}`} onClick={() => onChange({ style: s })} aria-label={STYLE_LABEL[s] ?? s}>
            <span className="pic" style={{ width: TILE, height: TILE }}>
              <i className={`frame ${face.shape}`} style={{ borderColor: face.shape === "none" ? "transparent" : face.color }} />
              <WaveformScene tracks={tracks} width={TILE} height={TILE} timeMs={t} analysis={null} musicAnalysis={null} />
            </span>
            <span className="name">{STYLE_LABEL[s] ?? s}</span>
          </button>
        );
      })}
    </div>
  );
}

export function WaveformControls({ value, onChange, label, canAnchorToFace = true, face }: Props) {
  return (
    <div className="space-y-4">
      <Toggle label={label} checked={value.enabled} onChange={(v) => onChange({ enabled: v })} />

      {value.enabled && (
        <>
          <div>
            <div className="label-etched mb-2" data-tip="How the moving bars look. Each picture is drawn on this speaker's own frame.">Style</div>
            {face ? (
              <StyleTiles value={value} onChange={onChange} face={face} />
            ) : (
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <HudButton key={s} active={value.style === s} onClick={() => onChange({ style: s })}>
                    {STYLE_LABEL[s] ?? s}
                  </HudButton>
                ))}
              </div>
            )}
          </div>

          {!isOrbit(value.style) && (
            <div>
              <div className="label-etched mb-2">Position</div>
              <div className="flex flex-wrap gap-2">
                {POSITIONS.filter((p) => p !== "speaker" || canAnchorToFace).map((p) => (
                  <HudButton key={p} active={value.position === p} onClick={() => onChange({ position: p })}>
                    {POSITION_LABEL[p]}
                  </HudButton>
                ))}
              </div>
              {value.position === "speaker" && (
                <p className="text-sm text-neutral-500 mt-2">
                  A halo on this speaker's own face — it moves with them. Ring
                  Size pushes it out from the artwork.
                </p>
              )}
            </div>
          )}

          {value.position === "speaker" && !isOrbit(value.style) && (
            <Slider
              label="Ring Size" value={value.ringSize} min={0.6} max={3} step={0.02}
              onChange={(v) => onChange({ ringSize: v })} format={(v) => `${v.toFixed(2)}x`}
            />
          )}

          <Slider
            label="Height" value={value.scale} min={0.2} max={2.5} step={0.02}
            onChange={(v) => onChange({ scale: v })} format={(v) => `${v.toFixed(2)}x`}
          />
          <Slider
            label="Count" value={value.density} min={8} max={160} step={1}
            onChange={(v) => onChange({ density: Math.round(v) })} format={(v) => `${Math.round(v)}`}
          />
          <Slider
            label="Thickness" value={value.thickness} min={0.2} max={3} step={0.05}
            onChange={(v) => onChange({ thickness: v })} format={(v) => `${v.toFixed(2)}x`}
          />
          <Slider
            label="Smoothing" value={value.smoothing} min={0} max={1} step={0.02}
            onChange={(v) => onChange({ smoothing: v })}
            format={(v) => (v === 0 ? "raw" : `${Math.round(v * 100)}%`)}
          />
          <Slider
            label="Lane Offset" value={value.lane} min={-3} max={3} step={0.1}
            onChange={(v) => onChange({ lane: v })} format={(v) => v.toFixed(1)}
          />
          <Slider
            label="Sparkle" value={value.sparkle} min={0} max={1} step={0.05}
            onChange={(v) => onChange({ sparkle: v })}
            format={(v) => (v === 0 ? "off" : `${Math.round(v * 100)}%`)}
          />

          {(value.style === "dots" || value.style === "particles" || value.style === "sparks") && (
            <Slider
              label={value.style === "dots" ? "Dot Size" : "Particle size"} value={value.dotSize} min={0.2} max={4} step={0.05}
              onChange={(v) => onChange({ dotSize: v })} format={(v) => `${v.toFixed(2)}x`}
            />
          )}

          {!isOrbit(value.style) && value.position !== "circular" && (
            <Toggle
              label="Flush to edge" checked={value.edgeFlush}
              onChange={(v) => onChange({ edgeFlush: v })}
            />
          )}

          {isOrbit(value.style) && (
            <>
              <Slider
                label="Ring Size" value={value.ringSize} min={0.2} max={2} step={0.02}
                onChange={(v) => onChange({ ringSize: v })} format={(v) => `${v.toFixed(2)}x`}
              />
              <Slider
                label="Center Opening" value={value.ringInnerRadius} min={0} max={0.9} step={0.01}
                onChange={(v) => onChange({ ringInnerRadius: v })} format={(v) => `${Math.round(v * 100)}%`}
              />
              <Slider
                label="Ring X" value={value.ringX} min={0} max={1} step={0.01}
                onChange={(v) => onChange({ ringX: v })} format={(v) => `${Math.round(v * 100)}%`}
              />
              <Slider
                label="Ring Y" value={value.ringY} min={0} max={1} step={0.01}
                onChange={(v) => onChange({ ringY: v })} format={(v) => `${Math.round(v * 100)}%`}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
