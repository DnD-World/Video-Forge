// ---------------------------------------------------------------------------
// Asking a model about characters, with the user's own key (BYOK).
// Same providers and chat call as the explainers (explainerLlm.mjs). Pictures
// go as an OpenAI-style image part, which Gemini, OpenRouter and OpenAI accept.
//
//   cardFromDescription  text → a full card
//   cardFromPicture      a picture (+ optional text) → a full card
//   suggestForCard       a card → up to six checked, field-by-field suggestions
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import { chat } from "./explainerLlm.mjs";
import { cardPrompt, readCardAnswer, readSuggestions, suggestPrompt } from "../../characters/core/ai.mjs";

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const MAX_PICTURE = 8 * 1024 * 1024;

/** A local picture as a data URL (refuses anything that isn't a small image). */
export async function pictureDataUrl(file) {
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error("Use a PNG, JPG or WebP picture.");
  const st = await fs.stat(file);
  if (st.size > MAX_PICTURE) throw new Error("That picture is over 8 MB. Use a smaller one.");
  return `data:${mime};base64,${(await fs.readFile(file)).toString("base64")}`;
}

async function ask({ provider, key, model, system, user, image, signal }) {
  const content = image ? [{ type: "text", text: user }, { type: "image_url", image_url: { url: image } }] : user;
  const { text } = await chat({ provider, key, model, json: true, maxTokens: 4000, timeoutMs: 90000, signal, messages: [{ role: "system", content: system }, { role: "user", content }] });
  return text;
}

export async function cardFromDescription({ provider, key, model, description, look, signal }) {
  const t0 = Date.now();
  const { system, user } = cardPrompt({ description, look });
  const text = await ask({ provider, key, model, system, user, signal });
  return { ...readCardAnswer(text), ms: Date.now() - t0 };
}

export async function cardFromPicture({ provider, key, model, file, dataUrl, description = "", look, signal }) {
  const t0 = Date.now();
  const image = dataUrl ?? (await pictureDataUrl(file));
  const { system, user } = cardPrompt({ description, picture: true, look });
  const text = await ask({ provider, key, model, system, user, image, signal });
  return { ...readCardAnswer(text), ms: Date.now() - t0 };
}

export async function suggestForCard({ provider, key, model, card, purpose, signal }) {
  const t0 = Date.now();
  const { system, user } = suggestPrompt(card, { purpose });
  const text = await ask({ provider, key, model, system, user, signal });
  return { suggestions: readSuggestions(text, card), ms: Date.now() - t0 };
}
