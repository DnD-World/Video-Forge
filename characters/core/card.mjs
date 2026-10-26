// ---------------------------------------------------------------------------
// The CHARACTER CARD: everything that makes a character who they are.
//
// One list of fields drives three things, so they can never disagree:
//   · the form (label, group, help text, clickable examples)
//   · normalizeCard (what is allowed; anything else is fixed and reported)
//   · the AI helper (it is shown exactly these fields and values, and its
//     answers go through normalizeCard like anything a person types)
//
// A card is plain JSON (a few hundred bytes), so it travels inside a project
// file and inside a render's input like any other setting.
// ---------------------------------------------------------------------------

import { LOOK_IDS } from "./looks.mjs";
import { HAIR_STYLES } from "./draw.mjs";
import { ITEMS, normalizeWear } from "./wardrobe.mjs";

export const CARD_VERSION = 1;
const HEX = /^#[0-9a-f]{6}$/i;

/**
 * kind: text | choice | number | color | bool | wear
 * examples: values the form shows as one-click samples
 */
export const FIELDS = [
  { key: "name", group: "About", label: "Name", kind: "text", default: "New character", max: 40,
    help: "What you call them. Only shown in the app.", examples: ["Dad", "Yiayia", "Captain"] },
  { key: "look", group: "Look", label: "Look", kind: "choice", options: LOOK_IDS, default: "stick",
    help: "How they are drawn. The same character works in every look.", examples: ["stick", "sticker", "sitcom", "hose"] },
  { key: "framing", group: "Look", label: "Framing", kind: "choice", options: ["full", "waist", "head"], default: "full",
    help: "How much of them the video shows: the whole body, from the waist up, or head and shoulders.", examples: ["full", "waist", "head"] },
  { key: "boil", group: "Look", label: "Line wobble", kind: "number", min: 0, max: 4, step: 0.1, default: 0,
    help: "\"Line boil\": outlines wobble a little, like hand-drawn animation. 0 is still; 1 is gentle.", examples: [0, 0.8, 1.6] },

  { key: "height", group: "Body", label: "Height", kind: "number", min: 0.75, max: 1.15, step: 0.01, default: 1,
    help: "1 is average. A child is about 0.8.", examples: [0.8, 1, 1.1] },
  { key: "build", group: "Body", label: "Build", kind: "choice", options: ["thin", "average", "round"], default: "average",
    help: "How wide the body is.", examples: ["thin", "average", "round"] },
  { key: "muscle", group: "Body", label: "Muscles", kind: "number", min: 0, max: 1, step: 0.05, default: 0,
    help: "Broader shoulders and thicker arms.", examples: [0, 0.5, 1] },
  { key: "headSize", group: "Body", label: "Head size", kind: "number", min: 0.8, max: 1.35, step: 0.01, default: 1,
    help: "Bigger heads read as younger and friendlier, and make the mouth easier to see on a phone.", examples: [0.9, 1, 1.25] },
  { key: "posture", group: "Body", label: "Posture", kind: "choice", options: ["upright", "slouch", "hunch"], default: "upright",
    help: "How they stand.", examples: ["upright", "slouch", "hunch"] },
  { key: "armLength", group: "Body", label: "Arm length", kind: "number", min: 0.8, max: 1.6, step: 0.05, default: 1,
    help: "1 is normal. Shadow-theatre heroes often have one very long arm.", examples: [1, 1.3, 1.6] },
  { key: "skin", group: "Body", label: "Skin", kind: "color", default: "#f3d6bd",
    help: "Skin colour.", examples: ["#f6dcc6", "#f3d6bd", "#e0b48c", "#c68b5e", "#8d5a3b", "#5c3a24"] },

  { key: "headShape", group: "Head & face", label: "Head shape", kind: "choice", options: ["round", "oval", "egg", "square"], default: "round",
    help: "The outline of the head.", examples: ["round", "oval", "egg", "square"] },
  { key: "eyes", group: "Head & face", label: "Eyes", kind: "choice", options: ["dot", "small", "oval", "lash", "googly", "sleepy", "none"], default: "dot",
    help: "Eye style. Some looks use their own (rubber hose has pie eyes, the sitcom look googly eyes).", examples: ["dot", "oval", "googly", "sleepy"] },
  { key: "eyeSpacing", group: "Head & face", label: "Eye spacing", kind: "number", min: 0.8, max: 1.25, step: 0.01, default: 1,
    help: "Wider apart looks friendlier; closer looks sharper.", examples: [0.85, 1, 1.15] },
  { key: "brows", group: "Head & face", label: "Eyebrows", kind: "choice", options: ["line", "thick", "arched", "none"], default: "line",
    help: "Eyebrow style. They move with the script's feelings either way.", examples: ["line", "thick", "arched"] },
  { key: "nose", group: "Head & face", label: "Nose", kind: "choice", options: ["none", "dot", "line", "button", "long"], default: "none",
    help: "Many cartoon styles have no nose from the front; in profile every nose shows.", examples: ["none", "dot", "button", "long"] },
  { key: "mouth", group: "Head & face", label: "Mouth", kind: "choice", options: ["plain", "overbite"], default: "plain",
    help: "Mouth style. It always moves with the narration.", examples: ["plain", "overbite"] },
  { key: "lips", group: "Head & face", label: "Coloured lips", kind: "bool", default: false,
    help: "Only some characters have visible lips; most cartoon mouths are a plain line.", examples: [false, true] },
  { key: "lipColor", group: "Head & face", label: "Lip colour", kind: "color", default: "#c2575c",
    help: "Used only when coloured lips are on.", examples: ["#c2575c", "#a8423f", "#d9827a"] },
  { key: "ears", group: "Head & face", label: "Ears", kind: "choice", options: ["none", "small", "round", "big"], default: "small",
    help: "Ear size. Hair or hats may cover them.", examples: ["none", "small", "big"] },
  { key: "cheeks", group: "Head & face", label: "Rosy cheeks", kind: "bool", default: false, help: "A soft blush under the eyes.", examples: [false, true] },
  { key: "freckles", group: "Head & face", label: "Freckles", kind: "bool", default: false, help: "A few freckles across the cheeks.", examples: [false, true] },
  { key: "beard", group: "Head & face", label: "Beard", kind: "choice", options: ["none", "stubble", "short", "full", "goatee"], default: "none",
    help: "In the hair colour. The mouth still shows through.", examples: ["none", "stubble", "full", "goatee"] },
  { key: "moustache", group: "Head & face", label: "Moustache", kind: "choice", options: ["none", "thin", "thick", "handlebar"], default: "none",
    help: "In the hair colour.", examples: ["none", "thin", "thick", "handlebar"] },

  { key: "hair", group: "Hair", label: "Hair style", kind: "choice", options: HAIR_STYLES, default: "short",
    help: "Hair style. Long styles and ponytails swing a little as they move.", examples: ["short", "sidepart", "ponytail", "bun", "curly", "bald"] },
  { key: "hairColor", group: "Hair", label: "Hair colour", kind: "color", default: "#262a33",
    help: "Also used for eyebrows, beards and moustaches.", examples: ["#262a33", "#5a3825", "#c9a46e", "#b0b0b0", "#a8322b"] },
  { key: "highlight", group: "Hair", label: "Highlights", kind: "color", default: "", optional: true,
    help: "Lighter streaks on top. Leave empty for none.", examples: ["", "#c9a46e", "#e8d5a8"] },

  { key: "wear", group: "Clothes", label: "Clothes and accessories", kind: "wear",
    default: [{ id: "tshirt", colors: ["#3a6fb0"] }, { id: "trousers", colors: ["#2d3446"] }, { id: "shoes", colors: ["#16181d"] }],
    help: "What they wear, one item per place (one top, one hat …). Each item has its own colours and, for fabrics, a pattern.",
    examples: [["shirt", "vest", "tie", "trousers", "shoes"], ["hoodie", "jeans", "sneakers"], ["chiton", "himation", "sandals", "wreath"]] },

  { key: "expression", group: "Personality", label: "Resting face", kind: "choice", options: ["neutral", "smile", "serious", "grumpy"], default: "neutral",
    help: "The face between words. Feelings in the script still change it.", examples: ["neutral", "smile", "grumpy"] },
  { key: "blinkRate", group: "Personality", label: "Blinking", kind: "number", min: 0.3, max: 2, step: 0.05, default: 1,
    help: "1 is natural. Lower is calm, higher is nervous.", examples: [0.6, 1, 1.6] },
  { key: "energy", group: "Personality", label: "Gestures", kind: "number", min: 0, max: 1, step: 0.05, default: 0.5,
    help: "How much their hands move by themselves while they talk.", examples: [0, 0.5, 1] },
  { key: "sway", group: "Personality", label: "Idle sway", kind: "number", min: 0, max: 1, step: 0.05, default: 0.5,
    help: "A small breathing sway so nobody looks frozen.", examples: [0, 0.5, 1] },
];

const BY_KEY = Object.fromEntries(FIELDS.map((f) => [f.key, f]));
export const fieldByKey = (k) => BY_KEY[k];

/** A fresh card with every default. */
export function defaultCard(over = {}) {
  const card = { v: CARD_VERSION };
  for (const f of FIELDS) card[f.key] = structuredClone(f.default);
  return normalizeCard({ ...card, ...over }).card;
}

/** One field's value, checked. Returns [value, problem | null]. */
export function checkField(f, value) {
  if (value === undefined || value === null) return [structuredClone(f.default), null];
  switch (f.kind) {
    case "text": {
      const s = String(value).trim().slice(0, f.max ?? 80);
      return s ? [s, null] : [f.default, `${f.label} was empty`];
    }
    case "choice":
      return f.options.includes(value) ? [value, null] : [f.default, `${f.label}: "${value}" isn't one of ${f.options.join(", ")}`];
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) return [f.default, `${f.label}: "${value}" isn't a number`];
      const c = Math.min(f.max, Math.max(f.min, n));
      return [Math.round(c * 1000) / 1000, c !== n ? `${f.label}: ${n} is outside ${f.min}–${f.max}, used ${c}` : null];
    }
    case "color":
      if (f.optional && value === "") return ["", null];
      return HEX.test(value) ? [String(value).toLowerCase(), null] : [f.default, `${f.label}: "${value}" isn't a colour like #3a6fb0`];
    case "bool":
      return typeof value === "boolean" ? [value, null] : [!!value && value !== "false", null];
    case "wear": {
      const { wear, problems } = normalizeWear(value);
      return [wear, problems.length ? problems.join("; ") : null];
    }
    default:
      return [value, null];
  }
}

/**
 * Bring any object (an old save, a hand edit, an AI answer) to a valid card.
 * Never throws. Returns { card, problems } — problems in plain words.
 */
export function normalizeCard(input) {
  const src = input && typeof input === "object" ? input : {};
  const card = { v: CARD_VERSION }, problems = [];
  for (const f of FIELDS) {
    const [v, p] = checkField(f, src[f.key]);
    card[f.key] = v;
    if (p) problems.push(p);
  }
  for (const k of Object.keys(src)) if (!BY_KEY[k] && k !== "v" && k !== "seed") problems.push(`"${k}" isn't a card field, ignored`);
  // a stable per-character number for idle motion, from the name
  card.seed = Number.isInteger(src.seed) ? src.seed : [...card.name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
  return { card, problems };
}

/** The wardrobe list as the form and the AI see it. */
export const WARDROBE = ITEMS.map((i) => ({ id: i.id, label: i.label, slot: i.slot, colors: i.colors.length, patterns: !!i.patterns }));
