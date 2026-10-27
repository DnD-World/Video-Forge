// ---------------------------------------------------------------------------
// One speaker's voice engine settings, as controls.
//
// NOTHING HERE IS HAND-WRITTEN PER KNOB. The controls are built from
// DRAMABOX_KNOBS, so a knob added to that table appears in the app without this
// file being touched — which is the whole reason the last set went unused:
// adding one meant editing a Python file on a machine that is switched off.
//
// A control that has never been moved shows the default and stores nothing, so
// a project saved today does not freeze today's defaults into itself.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Slider } from "../ui/Slider";
import { Toggle } from "../ui/Toggle";
import { NumberField } from "../ui/NumberField";
import { Picker } from "../ui/Picker";
import {
  DRAMABOX_DEFAULTS,
  DRAMABOX_KNOBS,
  VOICE_PRESETS,
  type DramaboxParams,
  type KnobSpec,
} from "../../lib/narration/dramaboxParams";
import type { ExpressionOptions } from "../../lib/narration/expression";

interface Props {
  /** Only what this speaker has actually changed. */
  value: Partial<DramaboxParams>;
  onChange: (next: Partial<DramaboxParams>) => void;
  expression: ExpressionOptions;
  onExpressionChange: (next: ExpressionOptions) => void;
}

export function VoiceControls({
  value,
  onChange,
  expression,
  onExpressionChange,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const current = <K extends keyof DramaboxParams>(k: K): DramaboxParams[K] =>
    (value[k] ?? DRAMABOX_DEFAULTS[k]) as DramaboxParams[K];

  const set = (k: keyof DramaboxParams, v: number | boolean | null) =>
    onChange({ ...value, [k]: v });

  const changedCount = Object.keys(value).length;
  const knobs = DRAMABOX_KNOBS.filter((k) => showAdvanced || !k.advanced);

  return (
    <div className="space-y-4">
      <label className="block">
        <span data-tip="A ready-made set of voice settings to start from. You can change anything after." className="label-etched text-sm">Starting point</span>
        <Picker
          aria-label="Starting point"
          data-tip="Pick a ready-made voice style to start from, then fine-tune the sliders below."
          className="mt-1 w-full"
          value=""
          options={[
            {
              value: "",
              label: changedCount ? `Custom · ${changedCount} changed` : "Untouched",
            },
            ...Object.keys(VOICE_PRESETS).map((name) => ({ value: name, label: name })),
          ]}
          onChange={(name) => name && onChange({ ...value, ...VOICE_PRESETS[name] })}
        />
      </label>

      {knobs.map((knob) => (
        <KnobControl
          key={knob.key}
          knob={knob}
          value={current(knob.key)}
          isDefault={value[knob.key] === undefined}
          onChange={(v) => set(knob.key, v)}
          onReset={() => {
            const next = { ...value };
            delete next[knob.key];
            onChange(next);
          }}
        />
      ))}

      <button
        type="button"
        className="text-sm text-accent-bright/70 hover:text-accent-bright"
        data-tip="Shows or hides extra voice settings that most people never need to change."
        onClick={() => setShowAdvanced((s) => !s)}
      >
        {showAdvanced ? "Hide the rarely-touched ones" : "Show the rarely-touched ones"}
      </button>

      {/* --- the app writing expression the script did not ------------------ */}
      <div className="border-t border-accent/15 pt-4 space-y-3">
        <p data-tip="Lets the app add feeling to lines that have none written in." className="label-etched text-sm">Let the app add expression</p>
        <Toggle
          data-tip="If a line of the script has no feeling written in, the app adds a mood so the voice does not sound flat."
          label="Lift flat lines"
          checked={!!expression.liftFlatLines}
          onChange={(liftFlatLines) => onExpressionChange({ ...expression, liftFlatLines })}
        />
        {expression.liftFlatLines && (
          <label className="block">
            <span data-tip="The feeling the app gives to flat lines, for example “cheerful”." className="label-etched text-sm">Lift them to</span>
            <input
              type="text"
              className="w-full mt-1 bg-black/30 border border-accent/20 rounded px-2 py-1 text-sm"
              placeholder="speaks warmly"
              data-tip="The mood the app adds to flat lines, for example speaks warmly."
              value={expression.defaultVerb ?? ""}
              onChange={(e) =>
                onExpressionChange({ ...expression, defaultVerb: e.target.value })
              }
            />
          </label>
        )}
        <Toggle
          data-tip="If the script says someone laughs or hums, the app writes the sound into the speech so you can actually hear it."
          label="Spell out laughs and hums"
          checked={!!expression.spellNoises}
          onChange={(spellNoises) => onExpressionChange({ ...expression, spellNoises })}
        />
        <p className="text-sm text-neutral-500">
          A direction on its own shapes delivery but makes no noise — a laugh is
          only heard if it is spelled inside the speech. These two write that in
          when the script forgot. Every change is listed before anything is
          generated, so nothing is altered behind your back.
        </p>
      </div>
    </div>
  );
}

/** Plain-words help for each voice setting, by its key. */
const KNOB_TIPS: Record<string, string> = {
  stgScale: "How strongly the voice acts out the feeling in the script. Higher = more dramatic, lower = a flatter read.",
  durationMultiplier: "How much time the voice takes to say the words. Under 1 = faster and tighter, over 1 = slower with pauses.",
  cfgScale: "How closely the voice sticks to exactly what you wrote. Higher = more exact but a bit less natural.",
  refDuration: "How many seconds of the sample recording the voice copies from.",
  denoiseRef: "Cleans background hiss out of the sample recording before the voice copies it.",
  watermark: "Hides a secret mark in the audio that says it was made by a computer. Off by default.",
  seed: "A lucky number. The same number gives the same take every time; change it to get a different take.",
  genDuration: "Forces the speech to last this many seconds. Leave on Auto and the program chooses.",
  rescaleScale: "An expert setting that tweaks how the voice is balanced. Leave on Auto unless you are experimenting.",
  targetChunkDuration: "Long text is cut into pieces. This is how many seconds each piece aims to be.",
  maxChunkDuration: "No piece of speech is allowed to be longer than this many seconds, because long pieces start to sound worse.",
  crossfadeMs: "How many thousandths of a second two pieces of speech overlap so the join is not heard.",
};

function KnobControl({
  knob,
  value,
  isDefault,
  onChange,
  onReset,
}: {
  knob: KnobSpec;
  value: number | boolean | null;
  isDefault: boolean;
  onChange: (v: number | boolean | null) => void;
  onReset: () => void;
}) {
  const label = isDefault ? knob.label : `${knob.label} ·`;

  if (knob.kind === "toggle") {
    return (
      <div>
        <Toggle label={label} checked={!!value} onChange={onChange} data-tip={KNOB_TIPS[knob.key] ?? knob.hint} />
        <p className="text-sm text-neutral-500 mt-1">{knob.hint}</p>
      </div>
    );
  }

  if (knob.kind === "number") {
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <span data-tip="The name of this voice setting. A dot after it means you changed it from the default." className="label-etched text-sm">{label}</span>
          <NumberField
            aria-label={knob.label}
            data-tip={KNOB_TIPS[knob.key] ?? knob.hint}
            className="w-24"
            value={typeof value === "number" ? value : 0}
            onChange={onChange}
          />
        </div>
        <p className="text-sm text-neutral-500 mt-1">{knob.hint}</p>
      </div>
    );
  }

  // A nullable slider is two controls in one: "let the engine decide", or a
  // number. Showing the slider greyed out and unusable would say less.
  const isAuto = value === null;
  return (
    <div>
      <Slider
        data-tip={KNOB_TIPS[knob.key] ?? knob.hint}
        label={label}
        value={typeof value === "number" ? value : (knob.min ?? 0)}
        min={knob.min ?? 0}
        max={knob.max ?? 1}
        step={knob.step ?? 0.01}
        format={(v) => (isAuto ? (knob.nullLabel ?? "Auto") : String(v))}
        onChange={onChange}
      />
      <div className="flex items-center justify-between mt-1">
        <p className="text-sm text-neutral-500">{knob.hint}</p>
        <div className="flex gap-2 shrink-0">
          {knob.nullable && (
            <button
              type="button"
              className="text-sm text-accent-bright/60 hover:text-accent-bright"
              data-tip={isAuto ? "Stop letting the program decide, and choose the number yourself." : "Let the program decide this one for you."}
              onClick={() => onChange(isAuto ? (knob.min ?? 0) : null)}
            >
              {isAuto ? "Set a value" : knob.nullLabel ?? "Auto"}
            </button>
          )}
          {!isDefault && (
            <button
              type="button"
              className="text-sm text-accent-bright/60 hover:text-accent-bright"
              data-tip="Puts this setting back the way it was at the start."
              onClick={onReset}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
