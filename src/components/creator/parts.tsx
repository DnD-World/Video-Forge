// How each part shows in the creator: what goes on the main view, what waits
// under "Advanced", how close the pictures are cropped, and the part's icon.

import type { PartId } from "../../../characters/core/index.mjs";
import type { Framing } from "./drawing";

export interface PartUi {
  label: string;
  tip: string;
  /** Fields on the main view, in order. */
  main: string[];
  /** Fine details, folded away. */
  advanced: string[];
  /** How the option pictures are cropped. */
  framing: Framing;
}

export const PART_UI: Record<PartId, PartUi> = {
  body: { label: "Body", tip: "Build, posture and height: the shape you know them by from across a room.", main: ["build", "posture", "height"], advanced: ["muscle", "armLength"], framing: "full" },
  head: { label: "Head", tip: "The shape and size of the head.", main: ["headShape", "headSize"], advanced: [], framing: "head" },
  eyes: { label: "Eyes", tip: "Eye style and how far apart they sit. Make-up and tired eyes under Advanced.", main: ["eyes", "eyeSpacing"], advanced: ["darkCircles", "makeup", "makeupColor"], framing: "head" },
  brows: { label: "Eyebrows", tip: "Eyebrow style. They still move with the feelings in the script.", main: ["brows"], advanced: [], framing: "head" },
  nose: { label: "Nose", tip: "Nose style. Every nose shows in profile.", main: ["nose"], advanced: [], framing: "head" },
  mouth: { label: "Mouth", tip: "Mouth style. Coloured lips under Advanced.", main: ["mouth"], advanced: ["lips", "lipColor"], framing: "head" },
  ears: { label: "Ears", tip: "Ear size. Hair or hats may cover them.", main: ["ears"], advanced: [], framing: "head" },
  hair: { label: "Hair", tip: "Hair style and colour. Lighter streaks under Advanced.", main: ["hair", "hairColor"], advanced: ["highlight"], framing: "head" },
  skin: { label: "Skin", tip: "Skin colour. Rosy cheeks under Advanced.", main: ["skin"], advanced: ["cheeks"], framing: "head" },
  facialHair: { label: "Facial hair", tip: "Beard and moustache, in the hair colour.", main: ["beard", "moustache"], advanced: [], framing: "head" },
  outfits: { label: "Outfits", tip: "Their clothes sets: switch, add, copy, delete, rename, and each piece's colours.", main: [], advanced: [], framing: "full" },
  marks: { label: "Marks", tip: "Freckles and bruises. Scars and tattoos come in the next phase.", main: ["freckles", "bruise"], advanced: [], framing: "head" },
};

/** Simple line icons, one per part (24×24, drawn in the current colour). */
const PATHS: Record<PartId, string> = {
  body: "M12 4.5a2 2 0 1 0 0 .01M8 9h8l-1 6h-1.5l-.5 5h-2l-.5-5H9z",
  head: "M12 3c4 0 6.5 3 6.5 7.5S16 20 12 20s-6.5-5-6.5-9.5S8 3 12 3z",
  eyes: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 9.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4z",
  brows: "M3 11c2.5-3 6-3.5 8-2M13 9c2-1.5 5.5-1 8 2M5 16h4M15 16h4",
  nose: "M12 4c-.5 4-2.5 8-4 11 1.5 1.5 3.5 2 6 1",
  mouth: "M4 11c3 4.5 13 4.5 16 0M4 11c4-1.5 6-1 8 0 2-1 4-1.5 8 0",
  ears: "M9 5.5C9 3.8 10.3 3 12 3c3 0 5 2.4 5 6 0 3-2 4-2.5 6.5S13 21 10.5 21 7 19 7 17",
  hair: "M4 15c0-7 3.5-11 8-11s8 4 8 11M7 15c0-4 1.5-7 5-8 3.5 1 5 4 5 8M9.5 5.5c-1 2.5-1 5 0 7",
  skin: "M12 3.5s6 6.5 6 10.5a6 6 0 0 1-12 0c0-4 6-10.5 6-10.5z",
  facialHair: "M5 8c0 7 3 12 7 12s7-5 7-12M8 12c2 1.2 6 1.2 8 0M10 15.5h4",
  outfits: "M8 3l-5 3 2 4 2-1v11h10V9l2 1 2-4-5-3c-.5 1.8-2 3-4 3S8.5 4.8 8 3z",
  marks: "M7 8.5h.01M11 7h.01M9 11h.01M16 13l3 3M19 13l-3 3M6 15.5h.01",
};

export function PartIcon({ part }: { part: PartId }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[part]} />
    </svg>
  );
}

export function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`cr-lockicon ${locked ? "is-locked" : ""}`}>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path className="shackle" d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </svg>
  );
}

/** Words for option values in the picture lists (the picture says it; this is the caption). */
export function optionLabel(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (value === "none") return "None";
  const s = String(value);
  const named: Record<string, string> = { sidepart: "Side part", hoodie_up: "Hood up", oval: "Oval", lash: "Lashes", googly: "Big round", dot: "Dots", undercut: "Undercut" };
  return named[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
}
