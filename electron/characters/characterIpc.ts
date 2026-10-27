// ---------------------------------------------------------------------------
// Drawn characters in the app: the main-process side of the AI helper.
//
// The helper fills a character card from a description or a picture, and
// suggests field-by-field improvements — always with the user's own key
// (BYOK, the app's key store), always checked by characters/core before the
// screen sees it. The drawing itself happens in the window (the form's live
// preview) and in Remotion; nothing here draws.
// ---------------------------------------------------------------------------

import { dialog, ipcMain, type BrowserWindow } from "electron";
import * as keyStore from "../keyStore";
import { guard } from "../security/guard";
import { PROVIDERS, pickModel } from "../../tools/lib/explainerLlm.mjs";
import { cardFromDescription, cardFromPicture, suggestForCard } from "../../tools/lib/characterLlm.mjs";
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

  ipcMain.handle("character:suggest", (_e, req: { card: CharacterCard; purpose?: string; provider: string; model?: string }) =>
    run(async (signal) => {
      const key = await keyFor(req.provider);
      const model = await chooseModel(req.provider, key, req.model);
      const r = await suggestForCard({ provider: req.provider, key, model, card: req.card, purpose: req.purpose, signal });
      return { ...r, model };
    })
  );
}
