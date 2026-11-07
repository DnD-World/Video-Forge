// ---------------------------------------------------------------------------
// The character creator's working state (phase 2, 7 Nov 2026).
//
// The files on disk are the truth; this holds what is open: each character's
// last saved version and, once touched, the version being worked on (a
// "draft"). Drafts outlive switching screens or characters, so nothing is
// lost by looking at someone else; they are dropped when saved or put back.
// Not saved to disk itself: closing the app with unsaved changes loses them,
// and the screen says so before you leave a changed character.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { normalizeCharacter, type CharacterFile, type PartId } from "../../characters/core/index.mjs";
import { changed } from "../lib/creator/edit";

export interface BrandCast {
  brand: string;
  title: string;
  settings: { groups?: { id: string; title: string; sub?: string }[]; geoEyes?: string };
  /** id → the file as last read or saved (checked). */
  saved: Record<string, CharacterFile>;
  /** Problems found when a file was read (fixed in the version shown). */
  readProblems: Record<string, string[]>;
  where: Record<string, "app" | "user">;
  order: string[];
}

const keyOf = (brand: string, id: string) => `${brand}/${id}`;

interface CreatorState {
  brands: BrandCast[] | null;
  loadError: string | null;
  brand: string;
  id: string;
  /** brand/id → the version being worked on. */
  drafts: Record<string, CharacterFile>;
  /** brand/id → earlier versions, for Undo (newest last) and Redo. */
  undo: Record<string, CharacterFile[]>;
  redo: Record<string, CharacterFile[]>;
  face: string;
  outfit: string;
  part: PartId;
  clip: string;
  saving: boolean;
  lastSave: { at: number; ok: boolean; text: string } | null;

  load: () => Promise<void>;
  open: (brand: string, id: string) => void;
  /** Change the open character (fn gets the current version). */
  edit: (fn: (c: CharacterFile) => CharacterFile) => void;
  undoOne: () => void;
  redoOne: () => void;
  putBack: () => void;
  save: () => Promise<void>;
  set: (p: Partial<Pick<CreatorState, "face" | "outfit" | "part" | "clip">>) => void;
}

export const useCreatorStore = create<CreatorState>((set, get) => ({
  brands: null,
  loadError: null,
  brand: "",
  id: "",
  drafts: {},
  undo: {},
  redo: {},
  face: "",
  outfit: "",
  part: "body",
  clip: "idle",
  saving: false,
  lastSave: null,

  load: async () => {
    try {
      const list = (await window.byok?.characters?.listFiles?.()) ?? [];
      const brands: BrandCast[] = list.map((b) => {
        const saved: Record<string, CharacterFile> = {}, readProblems: Record<string, string[]> = {}, where: Record<string, "app" | "user"> = {};
        for (const c of b.characters) {
          const { character, problems } = normalizeCharacter(c.raw);
          saved[c.id] = character;
          where[c.id] = c.where;
          if (problems.length) readProblems[c.id] = problems;
        }
        const order = Object.values(saved).sort((x, y) => (x.roster ?? 1e9) - (y.roster ?? 1e9) || x.id.localeCompare(y.id)).map((c) => c.id);
        return { brand: b.brand, title: b.title, settings: b.settings ?? {}, saved, readProblems, where, order };
      });
      const s = get();
      const still = brands.find((b) => b.brand === s.brand && b.saved[s.id]);
      set({ brands, loadError: null });
      if (!still && brands[0]) get().open(brands[0].brand, brands[0].order[0]);
    } catch (e) {
      set({ brands: [], loadError: e instanceof Error ? e.message : String(e) });
    }
  },

  open: (brand, id) => {
    const b = get().brands?.find((x) => x.brand === brand);
    const c = get().drafts[keyOf(brand, id)] ?? b?.saved[id];
    if (!c) return;
    set({ brand, id, face: c.chosen.face || c.faces[0]?.id || "", outfit: c.chosen.outfits[0] || c.outfits[0]?.id || "" });
  },

  edit: (fn) => {
    const s = get();
    const k = keyOf(s.brand, s.id);
    const b = s.brands?.find((x) => x.brand === s.brand);
    const now = s.drafts[k] ?? b?.saved[s.id];
    if (!now) return;
    const next = fn(now);
    if (next === now || !changed(now, next)) return;
    const back = [...(s.undo[k] ?? []), now].slice(-60);
    const drafts = { ...s.drafts };
    if (b && !changed(next, b.saved[s.id])) delete drafts[k]; else drafts[k] = next;
    set({ drafts, undo: { ...s.undo, [k]: back }, redo: { ...s.redo, [k]: [] } });
  },

  undoOne: () => {
    const s = get();
    const k = keyOf(s.brand, s.id);
    const back = s.undo[k] ?? [];
    if (!back.length) return;
    const b = s.brands?.find((x) => x.brand === s.brand);
    const now = s.drafts[k] ?? b?.saved[s.id];
    const prev = back[back.length - 1];
    const drafts = { ...s.drafts };
    if (b && !changed(prev, b.saved[s.id])) delete drafts[k]; else drafts[k] = prev;
    set({ drafts, undo: { ...s.undo, [k]: back.slice(0, -1) }, redo: { ...s.redo, [k]: [...(s.redo[k] ?? []), now!] } });
  },

  redoOne: () => {
    const s = get();
    const k = keyOf(s.brand, s.id);
    const fwd = s.redo[k] ?? [];
    if (!fwd.length) return;
    const b = s.brands?.find((x) => x.brand === s.brand);
    const now = s.drafts[k] ?? b?.saved[s.id];
    const next = fwd[fwd.length - 1];
    const drafts = { ...s.drafts };
    if (b && !changed(next, b.saved[s.id])) delete drafts[k]; else drafts[k] = next;
    set({ drafts, redo: { ...s.redo, [k]: fwd.slice(0, -1) }, undo: { ...s.undo, [k]: [...(s.undo[k] ?? []), now!] } });
  },

  putBack: () => {
    const s = get();
    const k = keyOf(s.brand, s.id);
    const drafts = { ...s.drafts };
    delete drafts[k];
    set({ drafts, undo: { ...s.undo, [k]: [] }, redo: { ...s.redo, [k]: [] } });
    get().open(s.brand, s.id);
  },

  save: async () => {
    const s = get();
    const k = keyOf(s.brand, s.id);
    const draft = s.drafts[k];
    if (!draft || s.saving) return;
    set({ saving: true });
    try {
      const r = await window.byok.characters.saveFile(s.brand, draft);
      if (!r.ok) { set({ saving: false, lastSave: { at: Date.now(), ok: false, text: r.problems.slice(0, 3).join("; ") } }); return; }
      const brands = (get().brands ?? []).map((b) => (b.brand !== s.brand ? b : {
        ...b, saved: { ...b.saved, [s.id]: draft }, where: { ...b.where, [s.id]: r.where },
        readProblems: Object.fromEntries(Object.entries(b.readProblems).filter(([id]) => id !== s.id)),
      }));
      const drafts = { ...get().drafts };
      delete drafts[k];
      set({ brands, drafts, saving: false, lastSave: { at: Date.now(), ok: true, text: r.where === "user" ? "Saved in the app's data folder (the app's own folder can't be written)." : "Saved." } });
    } catch (e) {
      set({ saving: false, lastSave: { at: Date.now(), ok: false, text: e instanceof Error ? e.message : String(e) } });
    }
  },

  set: (p) => set(p),
}));

/** The open character as it is now (draft or saved), and whether it has unsaved changes. */
export function useOpenCharacter() {
  const brands = useCreatorStore((s) => s.brands);
  const brand = useCreatorStore((s) => s.brand);
  const id = useCreatorStore((s) => s.id);
  const draft = useCreatorStore((s) => s.drafts[keyOf(s.brand, s.id)]);
  const brandCast = brands?.find((x) => x.brand === brand) ?? null;
  return { brandCast, character: draft ?? brandCast?.saved[id] ?? null, dirty: !!draft };
}

export const isDraft = (drafts: Record<string, CharacterFile>, brand: string, id: string) => !!drafts[keyOf(brand, id)];
