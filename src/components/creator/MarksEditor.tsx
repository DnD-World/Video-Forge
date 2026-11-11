// Tattoos, scars, freckles, birthmarks and moles (creator phase 3): add one, put it on a place
// by clicking a little body map, pick a shape, size, angle and colour. Every picture of a mark is
// drawn by the engine's own drawMark, so it looks as it will on the character.

import { useLayoutEffect, useRef } from "react";
import { MARK_KINDS, MARK_SPOTS, MAX_MARKS, MARK_SIZE, MARK_ANGLE, drawMark, type Mark } from "../../../characters/core/index.mjs";
import { Slider } from "../ui/Slider";

const START: Record<string, Partial<Mark>> = {
  tattoo: { on: "forearmR", shape: "heart" }, scar: { on: "browL", angle: 20 }, freckles: { on: "cheekR" }, birthmark: { on: "neck" }, mole: { on: "chin" },
};
const SHAPE_WORDS: Record<string, string> = { heart: "Heart", star: "Star", anchor: "Anchor", wave: "Wave", dots: "Three dots", band: "Band" };
const COLORS: Record<string, string[]> = {
  tattoo: ["#2e3f66", "#1c1c22", "#6a2a3a", "#2f6b4f"], scar: ["#c98f86", "#d9a8a0", "#b07a72"],
  freckles: ["#9a5f3c", "#7a4a2c", "#b07a52"], birthmark: ["#a8724f", "#c08a6a", "#8a5a3a"], mole: ["#5a3a2a", "#3a2a20"],
};

/** One mark drawn on a disc of skin. */
function MarkPic({ mark, skin }: { mark: Mark; skin: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const el = cv.current;
    if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(el.clientWidth * dpr) || 48;
    el.width = W; el.height = W;
    const ctx = el.getContext("2d")!;
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W * 0.46, 0, Math.PI * 2); ctx.fillStyle = skin; ctx.fill();
    drawMark(ctx, { ...mark, size: Math.min(mark.size, 1.3) }, W / 2, W / 2, W * 0.2, { along: mark.shape === "band" ? Math.PI / 2 : 0 });
  });
  return <canvas ref={cv} className="cr-markpic" aria-hidden />;
}

/** The places, as dots on a little figure. */
const SPOT_XY: Record<string, [number, number]> = {
  forehead: [60, 22], browL: [49, 33], browR: [71, 33], cheekL: [47, 48], cheekR: [73, 48], chin: [60, 62],
  neck: [60, 76], forearmL: [20, 118], forearmR: [100, 118], handL: [14, 142], handR: [106, 142],
};
function BodyMap({ value, onPick, label }: { value: string; onPick: (spot: string) => void; label: string }) {
  return (
    <svg viewBox="0 0 120 156" className="cr-bodymap" role="radiogroup" aria-label={label}>
      <ellipse cx="60" cy="44" rx="25" ry="28" className="b" />
      <rect x="53" y="68" width="14" height="12" rx="3" className="b" />
      <path d="M32 84 h56 l4 52 h-64 z" className="b" />
      <path d="M32 86 L18 128 M88 86 L102 128" className="limb" />
      {Object.entries(SPOT_XY).map(([id, [x, y]]) => (
        <g key={id} role="radio" aria-checked={value === id} aria-label={MARK_SPOTS[id].label} className={`spot ${value === id ? "on" : ""}`} onClick={() => onPick(id)} tabIndex={0} data-tip={`Put it on the ${MARK_SPOTS[id].label.toLowerCase()}.`}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPick(id); }}>
          <title>{`${MARK_SPOTS[id].label} (left and right as you look at them)`}</title>
          <circle cx={x} cy={y} r="9" className="hit" />
          <circle cx={x} cy={y} r="4.5" className="dot" />
        </g>
      ))}
    </svg>
  );
}

export function MarksEditor({ marks, skin, onChange }: { marks: Mark[]; skin: string; onChange: (m: Mark[]) => void }) {
  const set = (i: number, patch: Partial<Mark>) => onChange(marks.map((m, k) => (k === i ? { ...m, ...patch } : m)));
  const add = (kind: string) => {
    if (marks.length >= MAX_MARKS) return;
    onChange([...marks, { kind, size: 1, angle: 0, color: MARK_KINDS[kind].color, ...START[kind] } as Mark]);
  };
  return (
    <div className="cr-marks" data-tip="Simple marks that ride on a body part and move with it. Sleeves cover forearm marks.">
      <div className="cr-field-label" data-tip="Tattoos, scars, freckles, birthmarks and moles on the face, neck, forearms and hands.">
        Tattoos, scars and marks <em data-tip={`How many marks they have, out of ${MAX_MARKS}.`}>{marks.length} of {MAX_MARKS}</em>
      </div>
      <div className="cr-addmarks" data-tip="Add a mark: pick what kind.">
        {Object.entries(MARK_KINDS).map(([k, v], i) => (
          <button key={k} className="cr-pic small" style={{ ["--i" as string]: i }} disabled={marks.length >= MAX_MARKS} onClick={() => add(k)}
            data-tip={marks.length >= MAX_MARKS ? `At most ${MAX_MARKS} marks.` : `Add a ${v.label.toLowerCase()}. It starts on the ${MARK_SPOTS[START[k].on!].label.toLowerCase()}; move it on the little figure.`}>
            <MarkPic mark={{ kind: k, on: "chin", size: 1, angle: 0, color: v.color, shape: k === "tattoo" ? "heart" : undefined }} skin={skin} />
            <span>+ {v.label}</span>
          </button>
        ))}
      </div>
      {marks.map((m, i) => (
        <div key={i} className="cr-mark" style={{ ["--i" as string]: i }} data-tip={`${MARK_KINDS[m.kind].label} on the ${MARK_SPOTS[m.on].label.toLowerCase()}.`}>
          <div className="cr-mark-head">
            <MarkPic mark={m} skin={skin} />
            <b data-tip={`A ${MARK_KINDS[m.kind].label.toLowerCase()}.`}>{MARK_KINDS[m.kind].label}</b>
            <span data-tip="Where it is. Click a dot on the little figure to move it.">{MARK_SPOTS[m.on].label}</span>
            <button className="cr-x" onClick={() => onChange(marks.filter((_, k) => k !== i))} data-tip={`Remove this ${MARK_KINDS[m.kind].label.toLowerCase()}.`} aria-label="Remove">×</button>
          </div>
          <div className="cr-mark-body">
            <BodyMap value={m.on} onPick={(on) => set(i, { on, ...(m.shape === "band" && !on.startsWith("forearm") ? { shape: "star" } : {}) })} label={`Where the ${MARK_KINDS[m.kind].label.toLowerCase()} goes`} />
            <div className="cr-mark-controls">
              {m.kind === "tattoo" && (
                <div className="cr-shapes" role="radiogroup" aria-label="Tattoo shape" data-tip="The tattoo's shape. A band goes round a forearm only.">
                  {MARK_KINDS.tattoo.shapes!.filter((sh) => sh !== "band" || m.on.startsWith("forearm")).map((sh) => (
                    <button key={sh} role="radio" aria-checked={m.shape === sh} className={`cr-shape ${m.shape === sh ? "on" : ""}`} onClick={() => set(i, { shape: sh })} data-tip={`Shape: ${SHAPE_WORDS[sh]}.`}>
                      <MarkPic mark={{ ...m, shape: sh, size: 1, angle: 0 }} skin={skin} />
                    </button>
                  ))}
                </div>
              )}
              <Slider label="Size" value={m.size} min={MARK_SIZE[0]} max={MARK_SIZE[1]} step={0.05} onChange={(v) => set(i, { size: v })} format={(v) => `${v.toFixed(2)}×`} data-tip="How big the mark is." />
              <Slider label="Angle" value={m.angle} min={MARK_ANGLE[0]} max={MARK_ANGLE[1]} step={5} onChange={(v) => set(i, { angle: v })} format={(v) => `${Math.round(v)}°`} data-tip="How the mark is turned." />
              <div className="cr-swatches" role="radiogroup" aria-label="Colour" data-tip="The mark's colour.">
                {(COLORS[m.kind] ?? []).map((x) => (
                  <button key={x} role="radio" aria-checked={m.color === x} className={`cr-swatch ${m.color === x ? "on" : ""}`} style={{ background: x }} onClick={() => set(i, { color: x })} data-tip={`Colour ${x}.`} />
                ))}
                <label className="cr-swatch custom" style={{ background: m.color }} data-tip="Any colour you like.">
                  <input type="color" value={m.color} onChange={(e) => set(i, { color: e.target.value })} aria-label="Any colour" />
                  <span aria-hidden>+</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
