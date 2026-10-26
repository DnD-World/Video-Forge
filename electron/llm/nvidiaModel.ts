// ---------------------------------------------------------------------------
// Which NVIDIA model to ask — decided by asking NVIDIA, not by this file.
//
// WHY. The app shipped with "z-ai/glm-5.2" typed into two files. NVIDIA retired
// it on 21 Aug 2026 and every footage plan after that failed with
//   HTTP 410 — "has reached its end of life … no longer available"
// which is Image Forge's standard #10 exactly: a model id hard-coded in our
// source becomes the user's error. Found 14 Sep 2026 on the first render of
// lesson 101.1 with footage switched on.
//
// So the key's own /v1/models list is read once per run, and the first model
// that fits the job is used. A name in the preference list is a hint, never a
// requirement: when every preferred name has gone, any general chat model the
// account still has will do, and the log says which one was picked.
// ---------------------------------------------------------------------------

import { request } from "../net/http";

/** Tried in order, as substrings of the model id. Families, not versions, so
 *  a renamed "-5.3" still matches where an exact "-5.2" would not.
 *
 *  FAST INSTRUCT MODELS FIRST, reasoning models last. Planning footage is
 *  classification — read a line, name a filmable shot — not creative work, and
 *  a reasoning model spends minutes thinking before it answers. With "glm" at
 *  the head of this list a single batch of 20 scenes blew the five-minute
 *  request timeout (16 Sep 2026) and the whole render failed at 14%. */
const PREFERRED = ["llama-3.3", "llama-3.1", "qwen3", "mistral", "nemotron", "llama", "deepseek", "glm"];

/** Ids that are not general chat models, whatever family they belong to. */
const NOT_CHAT = /embed|rerank|reward|guard|safety|vision|vl\b|-vl-|clip|parse|retriever|nv-ingest|asr|tts|coder|math|translate|detector|ocr/i;

let cached: string[] | null = null;
/** The one that has actually answered. Tried first from then on. */
let working: string | null = null;

/** Every chat model this key lists, best first.
 *
 *  A LIST, NOT A NAME, because being listed is not the same as being callable.
 *  `nvidia/llama-3.1-nemotron-51b-instruct` appears in /v1/models on this
 *  account and returns 404 "Function … Not found for account" when called
 *  (16 Sep 2026). Only a real request can tell the difference, so the caller
 *  walks this list and keeps the first model that answers. */
export async function nvidiaChatModels(apiKey: string): Promise<string[]> {
  if (cached) return working ? [working, ...cached.filter((m) => m !== working)] : cached;

  const res = await request("https://integrate.api.nvidia.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("NVIDIA did not accept the saved key. Check it in Settings (the gear, top right).");
  }
  if (res.status !== 200) {
    throw new Error(`NVIDIA would not list its models (HTTP ${res.status}), so no footage could be planned.`);
  }

  const ids = ((JSON.parse(res.body) as { data?: { id: string }[] }).data ?? [])
    .map((m) => m.id)
    .filter((id) => !NOT_CHAT.test(id));

  const ranked = [...ids].sort((a, b) => rank(a) - rank(b));
  if (ranked.length === 0) {
    throw new Error("This NVIDIA key has no chat model available, so no footage could be planned.");
  }
  cached = ranked;
  console.log(`[video-forge] NVIDIA lists ${ranked.length} chat model(s); first choice ${ranked[0]}`);
  return ranked;
}

/** Position in PREFERRED, or the end for anything unlisted. */
function rank(id: string): number {
  const i = PREFERRED.findIndex((f) => id.toLowerCase().includes(f));
  return i === -1 ? PREFERRED.length : i;
}

/** Remember what worked, so the next call starts there instead of walking the
 *  dead entries again. */
export function nvidiaModelWorked(model: string): void {
  working = model;
}
