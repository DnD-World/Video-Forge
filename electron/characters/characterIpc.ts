// ---------------------------------------------------------------------------
// Drawn characters in the app: the main-process side of the AI helper.
//
// The helper fills a character card from a description or a picture, and
// suggests field-by-field improvements — always with the user's own key
// (BYOK, the app's key store), always checked by characters/core before the
// screen sees it. The drawing itself happens in the window (the form's live
// preview) and in Remotion; nothing here draws.
// ---------------------------------------------------------------------------

import { app, dialog, ipcMain, type BrowserWindow } from "electron";
import path from "node:path";
import { listCharacterFiles, saveCharacterFile } from "../../tools/lib/characterFiles.mjs";
import * as keyStore from "../keyStore";
import { guard } from "../security/guard";
import { PROVIDERS, pickModel, listModels } from "../../tools/lib/explainerLlm.mjs";
import { cardFromDescription, cardFromPicture, suggestForCard, partsFromWords } from "../../tools/lib/characterLlm.mjs";
import type { CharacterCard } from "../../characters/core/index.mjs";

/** Providers whose usual models can look at pictures (the others: text only). */
const SEES_PICTURES = new Set(["gemini", "openrouter", "openai"]);

/** Model families to try first, per provider. Pictures need a vision model. */
const HINTS: Record<string, string[]> = {
  gemini: ["gemini-3.5-flash", "gemini-flash-latest"],
  openrouter: ["google/gemini-3.5-flash", "openai/gpt-5.5-mini", "qwen/qwen3.8"],
  openai: ["gpt-5.5-mini", "gpt-5-mini", "gpt-5"],
  groq: ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"],
  cerebras: ["gpt-oss-120b", "qwen-3.8"],
  nvidia: ["deepseek-v4", "qwen3"],
  mistral: ["mistral-medium", "mistral-small"],
};

async function keyFor(provider: string): Promise<string> {
  const key = await keyStore.getKey(provider);
  if (!key) throw new Error(`No ${PROVIDERS[provider]?.label ?? provider} key saved. Add it in Settings (the gear, top right), in the box for it.`);
  return key;
}
async function chooseModel(provider: string, key: string, wanted?: string): Promise<string> {
  if (wanted) return wanted;
  for (const h of HINTS[provider] ?? []) {
    try { return await pickModel(provider, key, h); } catch { /* next */ }
  }
  return pickModel(provider, key);
}

export function registerCharacterIpc(getWindow: () => BrowserWindow | null) {
  let busy: AbortController | null = null;
  const run = async <T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    if (busy) throw new Error("The character helper is already working — wait for it or cancel it.");
    busy = new AbortController();
    try { return await fn(busy.signal); } finally { busy = null; }
  };

  ipcMain.handle("character:cancel", () => { busy?.abort(); return true; });

  // THE CHARACTER CREATOR (phase 2, 7 Nov 2026): every brand's character files, and saving one.
  // The window only ever names a brand and hands over a character; where it is written is decided
  // here (tools/lib/characterFiles.mjs checks the names and the character before writing).
  const roots = () => ({ app: path.join(app.getAppPath(), "brands"), user: path.join(app.getPath("userData"), "characters") });
  ipcMain.handle("character:listFiles", () => listCharacterFiles(roots()));
  ipcMain.handle("character:saveFile", (_e, brand: unknown, raw: unknown) => saveCharacterFile(roots(), String(brand), raw));

  ipcMain.handle("character:providers", async () => {
    const out: { id: string; label: string; hasKey: boolean; seesPictures: boolean }[] = [];
    for (const [id, p] of Object.entries(PROVIDERS)) out.push({ id, label: p.label, hasKey: !!(await keyStore.getKey(id)), seesPictures: SEES_PICTURES.has(id) });
    return out;
  });

  /** Let the person pick a picture (the path never comes from the page itself). */
  ipcMain.handle("character:pickPicture", async () => {
    const win = getWindow();
    const opts = { title: "A picture of the character", properties: ["openFile" as const], filters: [{ name: "Pictures", extensions: ["png", "jpg", "jpeg", "webp"] }] };
    const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
    if (r.canceled || !r.filePaths[0]) return null;
    guard().grantRead(r.filePaths[0]);
    return r.filePaths[0];
  });

  ipcMain.handle("character:fromDescription", (_e, req: { description: string; look?: string; provider: string; model?: string }) =>
    run(async (signal) => {
      const key = await keyFor(req.provider);
      const model = await chooseModel(req.provider, key, req.model);
      const r = await cardFromDescription({ provider: req.provider, key, model, description: String(req.description ?? "").slice(0, 4000), look: req.look, signal });
      return { ...r, model };
    })
  );

  ipcMain.handle("character:fromPicture", (_e, req: { file: string; description?: string; look?: string; provider: string; model?: string }) =>
    run(async (signal) => {
      if (!SEES_PICTURES.has(req.provider)) throw new Error(`${PROVIDERS[req.provider]?.label ?? req.provider} can't look at pictures here. Use Google Gemini, OpenRouter or OpenAI.`);
      // The picture is read and sent to a cloud model, so it must be one you picked.
      guard().assertRead(req.file);
      const key = await keyFor(req.provider);
      const model = await chooseModel(req.provider, key, req.model);
      const r = await cardFromPicture({ provider: req.provider, key, model, file: req.file, description: String(req.description ?? "").slice(0, 2000), look: req.look, signal });
      return { ...r, model };
    })
  );

  // THE AI BOX (creator phase 3): which models this key can use, for the picker. Text models only:
  // speech, pictures, video, embeddings and moderation models can't fill a card.
  const NOT_TEXT = /embed|tts|whisper|transcri|audio|speech|orpheus|playai|image|imagen|dall|veo|lyria|vision-only|moderation|guard|rerank|realtime|search|computer-use|robotics/i;
  ipcMain.handle("character:models", async (_e, provider: unknown) => {
    const p = String(provider);
    if (!PROVIDERS[p]) throw new Error(`"${p}" isn't a provider this app knows`);
    const key = await keyFor(p);
    const ids = (await listModels(p, key)).filter((id: string) => !NOT_TEXT.test(id)).sort();
    let usual = "";
    try { usual = await chooseModel(p, key); } catch { /* none of the usual ones: the list still works */ }
    return { models: ids, usual };
  });

  // The window says which fields are open (the unlocked parts'); main asks the model with the key
  // and returns the checked answer. The window checks it again against its own locks.
  ipcMain.handle("character:askParts", (_e, req: { card: CharacterCard; keys: string[]; request: string; scope?: string; provider: string; model?: string }) =>
    run(async (signal) => {
      const keys = Array.isArray(req.keys) ? req.keys.map(String).slice(0, 40) : [];
      if (!keys.length) throw new Error("No part is open to change: unlock a part first.");
      const request = String(req.request ?? "").trim().slice(0, 1500);
      if (!request) throw new Error("Type what you want first.");
      const key = await keyFor(req.provider);
      const model = await chooseModel(req.provider, key, req.model);
      const r = await partsFromWords({ provider: req.provider, key, model, card: req.card, keys, request, scope: String(req.scope ?? "the character").slice(0, 60), signal });
      return { ...r, model };
    })
  );

  ipcMain.handle("character:suggest", (_e, req: { card: CharacterCard; purpose?: string; provider: string; model?: string }) =>
    run(async (signal) => {
      const key = await keyFor(req.provider);
      const model = await chooseModel(req.provider, key, req.model);
      const r = await suggestForCard({ provider: req.provider, key, model, card: req.card, purpose: req.purpose, signal });
      return { ...r, model };
    })
  );
}
