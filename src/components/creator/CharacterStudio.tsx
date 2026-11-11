// ---------------------------------------------------------------------------
// THE CHARACTER CREATOR (phase 2, 7 Nov 2026; spec docs/character-creator-spec.md).
//
//   left    the cast: every character file of the brand, as faces
//   centre  the stage: the character big and moving, their faces, the tools
//           (randomise, undo, save), and the preview strip of moving clips
//   right   the twelve parts, each with its lock, and the open part's panel
//
// A character opens with every part locked. Unlock a part, change it, lock it
// again, save: the locks are saved in the file with everything else. Changes
// are kept per character until saved or put back (src/store/useCreatorStore.ts).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { PARTS, PART_IDS, type CharacterCard, type CharacterFile, type PartId } from "../../../characters/core/index.mjs";
import { isDraft, useCreatorStore, useOpenCharacter } from "../../store/useCreatorStore";
import { useProjectStore } from "../../store/useProjectStore";
import { defaultTrackWaveform } from "../../lib/waveform/buildTracks";
import { cardOf, faceIdOf, outfitIdOf, outfitsWithoutMain, randomise, setField, setLock, setUsualFace } from "../../lib/creator/edit";
import { LiveFigure, StillFigure } from "./Figure";
import { CLIPS, litColor, lookFor } from "./drawing";
import { PartPanel } from "./PartPanel";
import { AiBox } from "./AiBox";
import { LockIcon, PART_UI, PartIcon } from "./parts";

export function CharacterStudio() {
  const s = useCreatorStore();
  const { brandCast, character, dirty } = useOpenCharacter();
  useEffect(() => { if (!s.brands) void s.load(); }, [s.brands, s.load]);

  // keyboard: undo, redo, save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA") && (t as HTMLInputElement).type !== "range" && (t as HTMLInputElement).type !== "color") return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); useCreatorStore.getState().undoOne(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); useCreatorStore.getState().redoOne(); }
      else if (k === "s") { e.preventDefault(); void useCreatorStore.getState().save(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!s.brands) return <div className="cr-studio cr-empty" data-tip="Reading the character files.">Opening the cast…</div>;
  if (!brandCast || !character) {
    return (
      <div className="cr-studio cr-empty" data-tip="The creator shows the character files in a brand's characters folder (brands/<brand>/characters).">
        {s.loadError ? `Couldn't read the character files: ${s.loadError}` : "No character files found. They live in a brand's characters folder, one file per person."}
      </div>
    );
  }
  return <Studio character={character} dirty={dirty} />;
}

function Studio({ character: c, dirty }: { character: CharacterFile; dirty: boolean }) {
  const s = useCreatorStore();
  const { brandCast } = useOpenCharacter();
  const settings = brandCast!.settings;
  const look = useMemo(() => lookFor(c.look, settings), [c.look, settings]);
  const face = faceIdOf(c, s.face), outfit = outfitIdOf(c, s.outfit);
  const card = useMemo(() => cardOf(c, face, outfit), [c, face, outfit]);
  // the AI's answer, shown on the stage until it's kept or thrown away
  const [preview, setPreview] = useState<CharacterCard | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  useEffect(() => { setPreview(null); }, [c.id, face, outfit]);
  const shown = preview ?? card;
  const aiKeys = PARTS.filter((p) => c.locks[p.id] === false && p.id !== "outfits").flatMap((p) => p.fields as string[]);
  const clip = CLIPS.find((x) => x.id === s.clip) ?? CLIPS[0];
  const [epoch, setEpoch] = useState(0);
  const [burst, setBurst] = useState(0);
  // every change sweeps a light across the figure, so you see it transform
  const [sheen, setSheen] = useState(0);
  const cardKey = JSON.stringify(shown);
  const firstCard = useRef(cardKey);
  useEffect(() => { if (cardKey !== firstCard.current) setSheen((n) => n + 1); }, [cardKey]);
  const missing = outfitsWithoutMain(c);
  const unlocked = PART_IDS.filter((p) => c.locks[p] === false);
  const readProblems = brandCast!.readProblems[c.id] ?? [];
  const canUndo = (s.undo[`${s.brand}/${s.id}`] ?? []).length > 0;
  const canRedo = (s.redo[`${s.brand}/${s.id}`] ?? []).length > 0;
  const vars = { "--main": c.signature, "--lit": litColor(c.signature) } as CSSProperties;

  const doRandom = () => {
    if (!unlocked.length) return;
    s.edit((x) => randomise(x, face, outfit, x.locks));
    setBurst((b) => b + 1);
  };

  return (
    <div className="cr-studio" style={vars}>
      <Roster />

      <section className="cr-centre">
        <div className="cr-stage" data-tip={`${c.name}, live. ${clip.tip} Pick another clip in the strip below.`}>
          <div className="cr-aura" aria-hidden />
          <div className="cr-motes" aria-hidden>{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ["--k" as string]: i }} />)}</div>
          <div className="cr-floor" aria-hidden />
          <div className="cr-pedestal" aria-hidden />
          <div className="cr-figure" key={`${c.id}-${s.clip}-${epoch}`}>
            <LiveFigure card={shown} look={look} clip={clip} framing={clip.framing ?? "full"} fps={50} epoch={epoch} seed={card.seed ?? 2} pad={0.02} />
          </div>
          {preview && <div className="cr-preview-badge" data-tip="The stage shows the AI's answer. Keep it or throw it away in the AI box.">✦ AI preview: keep or throw away</div>}
          {aiOpen && (
            <div className="cr-ai-float" data-tip="Ask the AI about the whole character: it may change only the unlocked parts.">
              <div className="cr-ai-float-head">
                <b data-tip="The AI box for the whole character.">✦ Ask the AI about {c.name}</b>
                <button className="cr-x" onClick={() => { setAiOpen(false); setPreview(null); }} data-tip="Close the AI box." aria-label="Close">×</button>
              </div>
              {aiKeys.length ? (
                <AiBox scope="the whole character" keys={aiKeys} card={card} locks={c.locks} example="a tired night-shift nurse: heavy lids, dark circles, a small scar on the chin"
                  onPreview={setPreview} onKeep={(changes) => s.edit((x) => changes.reduce((y, ch) => setField(y, face, ch.key, ch.to)[0], x))} />
              ) : (
                <p className="cr-ai-none" data-tip="The AI never touches a locked part.">Every part is locked. Unlock the parts the AI may change (the locks on the right), then ask.</p>
              )}
            </div>
          )}
          {sheen > 0 && <div className="cr-sheen" key={`s${sheen}`} aria-hidden />}
          {burst > 0 && <div className="cr-burst" key={burst} aria-hidden />}

          <div className="cr-id">
            <div className="cr-kicker" data-tip={`Which group of the cast ${c.name} belongs to${c.roster ? `, and their number in the roster` : ""}.`}>
              {settings.groups?.find((g) => g.id === c.group)?.title ?? c.group}{c.roster ? ` · #${c.roster}` : ""}
            </div>
            <h2 className={`cr-name ${c.name.length > 9 ? "long" : ""}`} data-tip={`${c.name}: the character open in the creator.`}>{c.name}</h2>
            <p className="cr-role" data-tip="Who they are, from the roster.">{c.role}</p>
            <span className="cr-main" data-tip={`${c.name}'s main colour: their sound bars, their spoken word in the subtitles, their frame, and one piece of every outfit.`}>
              <i /> {(c.signatureName || c.signature).replace(/\s*\(.*$/, "")}
            </span>
          </div>

          <div className="cr-tools">
            <button className="cr-tool" onClick={() => s.undoOne()} disabled={!canUndo} data-tip="Undo the last change (Ctrl+Z)." aria-label="Undo">↶</button>
            <button className="cr-tool" onClick={() => s.redoOne()} disabled={!canRedo} data-tip="Redo what you undid (Ctrl+Y)." aria-label="Redo">↷</button>
            <button className={`cr-tool wide cr-ai-btn ${aiOpen ? "on" : ""}`} onClick={() => { setAiOpen((v) => !v); setPreview(null); }} aria-pressed={aiOpen} data-tip="Ask the AI to change the whole character in plain words. It only touches unlocked parts, and you see it before keeping it.">✦ AI</button>
            <button className={`cr-dice ${unlocked.length ? "" : "off"}`} onClick={doRandom} disabled={!unlocked.length} key={`d${burst}`}
              data-tip={unlocked.length ? `Randomise the unlocked parts (${unlocked.map((p) => PART_UI[p].label.toLowerCase()).join(", ")}). Click again until it's close.` : "Unlock a part first: the randomiser only changes unlocked parts."}>
              <span className="die" aria-hidden>⚄</span> Randomise
            </button>
            {dirty && <button className="cr-tool wide" onClick={() => s.putBack()} data-tip="Throw away the unsaved changes and go back to the saved file.">Put back</button>}
            <button
              className={`cr-save ${dirty ? "dirty" : ""} ${s.saving ? "busy" : ""}`}
              onClick={() => void s.save()}
              disabled={!dirty || s.saving || missing.length > 0}
              data-tip={missing.length ? `Not yet: ${missing.length} outfit${missing.length > 1 ? "s have" : " has"} no piece in the main colour (see Outfits).` : dirty ? "Save to the character file (Ctrl+S). The old version is kept as a backup." : "Saved: nothing has changed since."}
            >
              {s.saving ? "Saving…" : dirty ? "Save" : "Saved ✓"}
            </button>
          </div>

          {s.lastSave && <SaveToast key={s.lastSave.at} ok={s.lastSave.ok} text={s.lastSave.text} />}
          {readProblems.length > 0 && (
            <div className="cr-toast bad stay" data-tip={readProblems.join("\n")}>The file had {readProblems.length} problem{readProblems.length > 1 ? "s" : ""}; they are fixed in what you see. Save to keep the fix.</div>
          )}
        </div>

        <div className="cr-faces" data-tip={`${c.name}'s face options. The star is the face the videos use.`}>
          {c.faces.map((f) => (
            <button key={f.id} className={`cr-face ${f.id === face ? "on" : ""}`} onClick={() => s.set({ face: f.id })} data-tip={`Show face ${f.id}: ${f.label}.`}>
              <StillFigure card={cardOf(c, f.id, outfit)} look={look} framing="head" />
              <span><b>{f.id}</b> {f.label}</span>
              {c.chosen.face === f.id && <em className="cr-usual" data-tip="The face the videos use.">★</em>}
            </button>
          ))}
          {c.chosen.face !== face && (
            <button className="btn" onClick={() => s.edit((x) => setUsualFace(x, face))} data-tip={`Make face ${face} the one the videos use.`}>★ Use this face</button>
          )}
          <UseInVideo character={c} face={face} outfit={outfit} />
        </div>

        <div className="cr-strip" role="list" aria-label="Preview clips">
          {CLIPS.map((k, i) => (
            <button
              key={k.id}
              role="listitem"
              className={`cr-clip ${k.id === clip.id ? "on" : ""}`}
              style={{ ["--i" as string]: i }}
              onClick={() => { s.set({ clip: k.id }); setEpoch((e) => e + 1); }}
              data-tip={`${k.tip} Click to play it big.`}
            >
              <LiveFigure card={card} look={look} clip={k} framing={k.framing ?? "full"} fps={20} seed={(card.seed ?? 2) + i} />
              <span>{k.label}</span>
            </button>
          ))}
        </div>
      </section>

      <aside className="cr-right">
        <div className="cr-parts" role="tablist" aria-label="Parts">
          {PARTS.map((p, i) => {
            const locked = c.locks[p.id] !== false;
            return (
              <div key={p.id} className={`cr-part ${s.part === p.id ? "on" : ""} ${locked ? "" : "open"}`} style={{ ["--i" as string]: i }} data-tip={PART_UI[p.id].tip}>
                <button role="tab" aria-selected={s.part === p.id} className="cr-part-pick" onClick={() => s.set({ part: p.id })} data-tip={`Open ${PART_UI[p.id].label.toLowerCase()}.`}>
                  <PartIcon part={p.id} /><span>{PART_UI[p.id].label}</span>
                </button>
                <button
                  className="cr-lock"
                  aria-pressed={locked}
                  onClick={() => s.edit((x) => setLock(x, p.id, !locked))}
                  data-tip={locked ? `${PART_UI[p.id].label} is locked. Click to unlock it and change it.` : `${PART_UI[p.id].label} is open to change (and to the randomiser). Click to lock it.`}
                  aria-label={locked ? `Unlock ${PART_UI[p.id].label}` : `Lock ${PART_UI[p.id].label}`}
                >
                  <LockIcon locked={locked} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="cr-lockall">
          <span data-tip="How many parts are open to change.">{unlocked.length ? `${unlocked.length} of ${PARTS.length} parts open` : "Every part locked"}</span>
          {unlocked.length > 0 && <button className="cr-link" onClick={() => s.edit((x) => ({ ...x, locks: Object.fromEntries(PART_IDS.map((p) => [p, true])) as CharacterFile["locks"] }))} data-tip="Lock every part again.">Lock all</button>}
        </div>
        <PartPanel
          character={c}
          card={card}
          look={look}
          face={face}
          outfit={outfit}
          part={s.part}
          locked={c.locks[s.part] !== false}
          onEdit={s.edit}
          onUnlock={() => s.edit((x) => setLock(x, s.part as PartId, false))}
          onShowOutfit={(id) => s.set({ outfit: id })}
          locks={c.locks}
          onPreview={setPreview}
        />
      </aside>
    </div>
  );
}

/** What happened at the last save, for a few seconds (a failure stays until the next try). */
function SaveToast({ ok, text }: { ok: boolean; text: string }) {
  const [on, setOn] = useState(true);
  useEffect(() => { if (!ok) return; const t = window.setTimeout(() => setOn(false), 4200); return () => window.clearTimeout(t); }, [ok]);
  if (!on) return null;
  return <div className={`cr-toast ${ok ? "" : "bad"}`} data-tip="What happened when you last saved.">{ok ? text : `Not saved: ${text}`}</div>;
}

/** The cast, as faces: pick one to open. */
function Roster() {
  const s = useCreatorStore();
  const [q, setQ] = useState("");
  const b = s.brands?.find((x) => x.brand === s.brand);
  if (!b) return null;
  const groups = [...(b.settings.groups ?? []), { id: "__other", title: "Others" }];
  const match = (c: CharacterFile) => !q.trim() || `${c.name} ${c.role} ${c.id}`.toLowerCase().includes(q.trim().toLowerCase());
  return (
    <nav className="cr-roster" aria-label="Cast">
      {(s.brands?.length ?? 0) > 1 ? (
        <select className="cr-brand" value={s.brand} onChange={(e) => { const nb = s.brands!.find((x) => x.brand === e.target.value)!; s.open(nb.brand, nb.order[0]); }} data-tip="Which brand's characters to show.">
          {s.brands!.map((x) => <option key={x.brand} value={x.brand}>{x.title}</option>)}
        </select>
      ) : (
        <div className="cr-brand-title" data-tip="The brand whose characters these are.">{b.title}</div>
      )}
      <input className="cr-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find someone…" aria-label="Find a character" data-tip="Type a name or part of their role." />
      <div className="cr-roster-list">
        {groups.map((g) => {
          const people = b.order.map((id) => b.saved[id]).filter((c) => (g.id === "__other" ? !groups.some((x) => x.id === c.group) : c.group === g.id)).filter(match);
          if (!people.length) return null;
          return (
            <div key={g.id} className="cr-group">
              <div className="cr-group-title" data-tip={(g as { sub?: string }).sub ?? g.title}>{g.title} <em data-tip="How many people in this group.">{people.length}</em></div>
              <div className="cr-tiles">
                {people.map((c, i) => {
                  const shown = s.drafts[`${b.brand}/${c.id}`] ?? c;
                  return (
                    <button key={c.id} className={`cr-tile ${s.id === c.id ? "on" : ""}`} style={{ ["--main" as string]: shown.signature, ["--lit" as string]: litColor(shown.signature), ["--i" as string]: i }} onClick={() => s.open(b.brand, c.id)} data-tip={`${c.name}: ${c.role}${isDraft(s.drafts, b.brand, c.id) ? " (unsaved changes)" : ""}`}>
                      <span className="cr-tile-face"><StillFigure card={cardOf(shown)} look={lookFor(shown.look, b.settings)} framing="head" /></span>
                      <span className="cr-tile-name">{c.name}</span>
                      {isDraft(s.drafts, b.brand, c.id) && <i className="cr-unsaved" data-tip="Unsaved changes." />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/** Put this character, as shown, into the video being made (a copy). */
function UseInVideo({ character: c, face, outfit }: { character: CharacterFile; face: string; outfit: string }) {
  const add = useProjectStore((st) => st.addSpeakerFrom);
  const n = useProjectStore((st) => st.speakers.length);
  const [done, setDone] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  return (
    <button
      className="btn cr-use"
      onClick={() => {
        add({
          label: c.name, form: "drawn", character: cardOf(c, face, outfit), description: c.role,
          borderColor: c.signature, bgColor: "#1a1a1a", bgOpacity: 0, borderOpacity: 0, outlineShape: "none", size: 0.32,
          waveform: defaultTrackWaveform(n === 0 ? 0 : n % 2 === 1 ? 1 : -1),
        });
        setDone(true);
        t.current = window.setTimeout(() => setDone(false), 2400);
      }}
      data-tip={`Add ${c.name}, with this face and outfit, to the puppet video you're making. A copy: later changes here don't change it.`}
    >
      {done ? "Added ✓" : "Use in my video"}
    </button>
  );
}
