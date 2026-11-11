// One part of the character, open in the creator: a picture list for each
// choice (every option drawn by the engine), sliders for the numbers, colour
// swatches, and an Advanced fold for the fine details. Outfits have their own
// panel: the sets, and the pieces of the one shown.

import { useState } from "react";
import { WARDROBE, fieldByKey, PATTERNS, type CharacterCard, type CharacterFile, type Look, type Locks, type Mark, type PartId } from "../../../characters/core/index.mjs";
import { MarksEditor } from "./MarksEditor";
import { AiBox } from "./AiBox";
import { Slider } from "../ui/Slider";
import { StillFigure } from "./Figure";
import { PART_UI, LockIcon, optionLabel } from "./parts";
import {
  setField, cardOf, copyOutfit, newOutfit, deleteOutfit, renameOutfit, toggleChosenOutfit, setWearColor, setWearPattern,
  setMainPiece, addWear, removeWear, outfitsWithoutMain,
} from "../../lib/creator/edit";

type Edit = (fn: (c: CharacterFile) => CharacterFile) => void;

interface Props {
  character: CharacterFile;
  card: CharacterCard;
  look: Look;
  face: string;
  outfit: string;
  part: PartId;
  locked: boolean;
  onEdit: Edit;
  onUnlock: () => void;
  onShowOutfit: (id: string) => void;
  locks: Locks;
  /** Show the AI's answer on the stage (null: back to the character). */
  onPreview: (c: CharacterCard | null) => void;
}

const AI_EXAMPLES: Partial<Record<PartId, string>> = {
  body: "a bit taller and slouching", head: "a slightly bigger, rounder head", eyes: "left eye a bit lazy, eyes at most 50% open",
  brows: "thicker brows", nose: "a small button nose", mouth: "coloured lips, a deep red", ears: "bigger ears", hair: "a messy bun, grey with silver streaks",
  skin: "a warm olive skin with rosy cheeks", facialHair: "a short grey beard and a thin moustache", marks: "a small anchor tattoo on the right forearm and a scar through the left eyebrow",
};

export function PartPanel(p: Props) {
  const ui = PART_UI[p.part];
  return (
    <div className="cr-panel" key={p.part} data-tip={ui.tip}>
      <header className="cr-panel-head">
        <h3 data-tip={ui.tip}>{ui.label}</h3>
        {p.locked && (
          <button className="cr-unlock" onClick={p.onUnlock} data-tip={`${ui.label} is locked: nothing here changes, not even with the randomiser. Click to unlock it.`}>
            <LockIcon locked /> Locked · unlock to change
          </button>
        )}
      </header>
      {p.part !== "outfits" && (
        p.locked ? null : (
          <details className="cr-adv cr-ai-fold">
            <summary data-tip={`Say what you want for the ${ui.label.toLowerCase()} in plain words; the AI fills in the choices and sliders.`}>✦ Ask the AI about the {ui.label.toLowerCase()}</summary>
            <AiBox scope={`the ${ui.label.toLowerCase()}`} keys={[...ui.main, ...ui.advanced]} card={p.card} locks={p.locks} example={AI_EXAMPLES[p.part] ?? ""}
              onPreview={p.onPreview} onKeep={(changes) => p.onEdit((c) => changes.reduce((x, ch) => setField(x, p.face, ch.key, ch.to)[0], c))} compact />
          </details>
        )
      )}
      {p.part === "outfits" ? (
        <OutfitPanel {...p} />
      ) : (
        <fieldset className={`cr-fields ${p.locked ? "is-locked" : ""}`} disabled={p.locked}>
          {ui.main.map((k) => <FieldControl key={k} field={k} {...p} />)}
          {ui.advanced.length > 0 && (
            <details className="cr-adv">
              <summary data-tip="Fine details for this part, folded away so the main view stays simple.">Advanced</summary>
              <div className="cr-adv-body">{ui.advanced.map((k) => <FieldControl key={k} field={k} {...p} />)}</div>
            </details>
          )}
        </fieldset>
      )}
    </div>
  );
}

/** Fields whose pictures read better another way than the part's usual crop. */
const PIC_VIEW: Record<string, { framing: "head" | "waist" | "full"; view: number }> = {
  build: { framing: "waist", view: 0 },
  posture: { framing: "full", view: 2 },
};

function FieldControl({ field, card, look, face, part, onEdit }: Props & { field: string }) {
  const f = fieldByKey(field)!;
  const value = (card as unknown as Record<string, unknown>)[field];
  const put = (v: unknown) => onEdit((c) => setField(c, face, field, v)[0]);
  if (f.kind === "marks") return <MarksEditor marks={(value as Mark[]) ?? []} skin={card.skin} onChange={put} />;
  const framing = PART_UI[part].framing;
  if (f.kind === "choice" || f.kind === "bool") {
    const options = f.kind === "bool" ? [false, true] : (f.options as string[]);
    // body shapes compare by size: every picture in the row drawn at the scale of the biggest option;
    // build from the waist up (the body fills the picture), posture side on (where a slouch shows)
    const fitTo = part === "body" ? ({ ...card, [field]: field === "build" ? "round" : options[options.length - 1] } as CharacterCard) : undefined;
    const pic = PIC_VIEW[field] ?? { framing, view: 0 };
    return (
      <div className="cr-field" data-tip={f.help}>
        <div className="cr-field-label" data-tip={f.help}>{f.label}</div>
        <div className={`cr-pics ${framing === "full" ? "is-full" : ""}`} role="radiogroup" aria-label={f.label}>
          {options.map((o, i) => (
            <button
              key={String(o)}
              role="radio"
              aria-checked={value === o}
              className={`cr-pic ${value === o ? "on" : ""}`}
              style={{ ["--i" as string]: i }}
              onClick={() => put(o)}
              data-tip={`${f.label}: ${optionLabel(field, o)}.`}
            >
              <StillFigure card={{ ...card, [field]: o } as CharacterCard} look={look} framing={pic.framing} view={pic.view} fitTo={fitTo} />
              <span>{optionLabel(field, o)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (f.kind === "number") {
    return (
      <div className="cr-field" data-tip={f.help}>
        <Slider label={f.label} value={Number(value)} min={f.min!} max={f.max!} step={f.step} onChange={put} format={(v) => (Math.abs(v - Number(f.default)) < 1e-6 ? `${v.toFixed(2)} · usual` : v.toFixed(2))} data-tip={f.help} />
      </div>
    );
  }
  if (f.kind === "color") {
    const examples = (f.examples as string[]).filter(Boolean);
    const v = String(value ?? "");
    return (
      <div className="cr-field" data-tip={f.help}>
        <div className="cr-field-label" data-tip={f.help}>{f.label}</div>
        <div className="cr-swatches" role="radiogroup" aria-label={f.label}>
          {f.optional && (
            <button role="radio" aria-checked={v === ""} className={`cr-swatch none ${v === "" ? "on" : ""}`} onClick={() => put("")} data-tip={`No ${f.label.toLowerCase()}.`} />
          )}
          {examples.map((x) => (
            <button key={x} role="radio" aria-checked={v === x} className={`cr-swatch ${v.toLowerCase() === x.toLowerCase() ? "on" : ""}`} style={{ background: x }} onClick={() => put(x)} data-tip={`${f.label}: ${x}.`} />
          ))}
          <label className="cr-swatch custom" data-tip={`Any ${f.label.toLowerCase()} you like: opens the colour picker.`} style={{ background: v || "transparent" }}>
            <input type="color" value={v || "#888888"} onChange={(e) => put(e.target.value)} aria-label={`${f.label}: any colour`} />
            <span aria-hidden>+</span>
          </label>
        </div>
      </div>
    );
  }
  return null;
}

// ---- outfits ----------------------------------------------------------------------------------------

const SLOT_WORDS: Record<string, string> = { top: "Tops", outer: "Over the top", full: "Dresses & robes", bottom: "Trousers & skirts", feet: "Shoes", neck: "Neck", head: "Hats", hair: "In the hair", eyes: "Eyes", ears: "Ears", cape: "Capes" };

function OutfitPanel({ character: c, face, outfit, look, locked, onEdit, onShowOutfit }: Props) {
  const [naming, setNaming] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [slot, setSlot] = useState("top");
  const o = c.outfits.find((x) => x.id === outfit) ?? c.outfits[0];
  const missing = new Set(outfitsWithoutMain(c));
  const sig = c.signature.toLowerCase();
  const doEdit = (fn: (x: CharacterFile) => CharacterFile) => { if (!locked) onEdit(fn); };
  return (
    <div className="cr-outfits">
      <div className="cr-field-label" data-tip="Every clothes set this person has. The star marks the ones the videos use; the first starred one is their usual outfit.">
        Outfit sets <em data-tip="How many sets they have.">{c.outfits.length}</em>
      </div>
      <div className="cr-outfit-grid">
        {c.outfits.map((x, i) => {
          const chosen = c.chosen.outfits.indexOf(x.id);
          return (
            <div key={x.id} className={`cr-outfit ${x.id === o.id ? "on" : ""} ${missing.has(x.id) ? "warn" : ""}`} style={{ ["--i" as string]: i }} data-tip={`${x.label}${chosen === 0 ? ": their usual outfit" : chosen > 0 ? ": used in the videos" : ""}.${missing.has(x.id) ? " No piece is in the main colour yet." : ""}`}>
              <button className="cr-outfit-pic" onClick={() => onShowOutfit(x.id)} data-tip={`Show ${x.label}.`}>
                <StillFigure card={cardOf(c, face, x.id)} look={look} framing="full" />
              </button>
              {naming === x.id ? (
                <input
                  className="cr-outfit-name"
                  autoFocus
                  defaultValue={x.label}
                  aria-label="Outfit name"
                  data-tip="Type the new name, then press Enter."
                  onKeyDown={(e) => { if (e.key === "Enter") { doEdit((cc) => renameOutfit(cc, x.id, e.currentTarget.value)); setNaming(null); } if (e.key === "Escape") setNaming(null); }}
                  onBlur={(e) => { doEdit((cc) => renameOutfit(cc, x.id, e.currentTarget.value)); setNaming(null); }}
                />
              ) : (
                <span className="cr-outfit-label" data-tip={x.label}>{x.label}</span>
              )}
              <button className={`cr-star ${chosen >= 0 ? "on" : ""}`} disabled={locked} onClick={() => doEdit((cc) => toggleChosenOutfit(cc, x.id))} aria-pressed={chosen >= 0} data-tip={chosen >= 0 ? "Used in the videos. Click to stop using it." : "Not used in the videos. Click to use it."}>★</button>
            </div>
          );
        })}
      </div>
      <div className="cr-row">
        <button className="btn" disabled={locked} onClick={() => doEdit((cc) => { const [n, id] = newOutfit(cc); setTimeout(() => onShowOutfit(id)); return n; })} data-tip="A new, plain outfit with the top in the main colour.">New</button>
        <button className="btn" disabled={locked} onClick={() => doEdit((cc) => { const [n, id] = copyOutfit(cc, o.id); setTimeout(() => onShowOutfit(id)); return n; })} data-tip={`A copy of ${o.label}, to change without losing the original.`}>Copy</button>
        <button className="btn" disabled={locked} onClick={() => setNaming(o.id)} data-tip={`Give ${o.label} a new name.`}>Rename</button>
        <button
          className={`btn ${sure === o.id ? "cr-danger" : ""}`}
          disabled={locked || c.outfits.length <= 1}
          onClick={() => { if (sure !== o.id) { setSure(o.id); setTimeout(() => setSure(null), 3000); return; } const keep = c.outfits.find((x) => x.id !== o.id)!.id; doEdit((cc) => deleteOutfit(cc, o.id)); onShowOutfit(keep); setSure(null); }}
          data-tip={c.outfits.length <= 1 ? "The last outfit can't be deleted." : sure === o.id ? "Click again to delete it. Undo brings it back." : `Delete ${o.label}. Asks once more first.`}
        >
          {sure === o.id ? "Sure? Delete" : "Delete"}
        </button>
      </div>

      <fieldset className={`cr-fields ${locked ? "is-locked" : ""}`} disabled={locked}>
        <div className="cr-field-label" data-tip={`The pieces of ${o.label}. The star piece carries the main colour; every outfit needs one.`}>Pieces of {o.label}</div>
        {missing.has(o.id) && (
          <p className="cr-warn" data-tip="Every outfit keeps the main colour on one piece, so they are recognised in any outfit. Saving waits until this is fixed.">
            No piece is in the main colour. Click ★ on a piece to give it the main colour.
          </p>
        )}
        <ul className="cr-pieces">
          {o.wear.map((w, i) => {
            const item = WARDROBE.find((x) => x.id === w.id);
            const isMain = w.colors.some((x) => x.toLowerCase() === sig);
            return (
              <li key={`${w.id}-${i}`} className={isMain ? "main" : ""} data-tip={`${item?.label ?? w.id}${isMain ? ", in the main colour" : ""}.`}>
                <button className={`cr-star ${isMain ? "on" : ""}`} onClick={() => doEdit((cc) => setMainPiece(cc, o.id, i))} aria-pressed={isMain} data-tip={isMain ? "This piece carries the main colour." : "Put the main colour on this piece."}>★</button>
                <span className="cr-piece-name" data-tip={`Worn: ${item?.label ?? w.id}.`}>{item?.label ?? w.id}</span>
                <span className="cr-piece-colors" data-tip="This piece's colours: click one to change it.">
                  {Array.from({ length: item?.colors ?? w.colors.length }, (_, k) => (
                    <label key={k} className="cr-dot" style={{ background: w.colors[k] ?? "#888" }} data-tip={`Colour ${k + 1} of the ${item?.label ?? w.id}: click to change.`}>
                      <input type="color" value={w.colors[k] ?? "#888888"} onChange={(e) => doEdit((cc) => setWearColor(cc, o.id, i, k, e.target.value))} aria-label={`Colour ${k + 1}`} />
                    </label>
                  ))}
                </span>
                {item?.patterns && (
                  <select className="cr-pattern" value={w.pattern ?? "none"} onChange={(e) => doEdit((cc) => setWearPattern(cc, o.id, i, e.target.value))} data-tip="A pattern on the fabric." aria-label="Pattern">
                    {PATTERNS.map((pt) => <option key={pt} value={pt}>{pt === "none" ? "Plain" : optionLabel("pattern", pt)}</option>)}
                  </select>
                )}
                <button className="cr-x" onClick={() => doEdit((cc) => removeWear(cc, o.id, i))} disabled={o.wear.length <= 1} data-tip={`Take off the ${item?.label ?? w.id}.`} aria-label="Remove">×</button>
              </li>
            );
          })}
        </ul>
        <details className="cr-adv">
          <summary data-tip="Add a piece of clothing to this outfit. A piece replaces whatever was in the same place.">Advanced: add a piece</summary>
          <div className="cr-adv-body">
            <div className="cr-chips" role="tablist" aria-label="Where it is worn">
              {Object.keys(SLOT_WORDS).map((s) => (
                <button key={s} role="tab" aria-selected={slot === s} className={`cr-chip ${slot === s ? "on" : ""}`} onClick={() => setSlot(s)} data-tip={`Show the pieces worn: ${SLOT_WORDS[s].toLowerCase()}.`}>{SLOT_WORDS[s]}</button>
              ))}
            </div>
            <div className="cr-pics is-full">
              {WARDROBE.filter((w) => w.slot === slot).map((w, i) => {
                const [preview] = addWear(c, o.id, w.id);
                return (
                  <button key={w.id} className="cr-pic" style={{ ["--i" as string]: i }} onClick={() => doEdit((cc) => addWear(cc, o.id, w.id)[0])} data-tip={`Add ${w.label} to ${o.label}.`}>
                    <StillFigure card={cardOf(preview, face, o.id)} look={look} framing="full" />
                    <span>{w.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </details>
      </fieldset>
    </div>
  );
}
