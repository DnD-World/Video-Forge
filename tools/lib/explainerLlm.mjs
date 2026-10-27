// ---------------------------------------------------------------------------
// Asking a model to write an explainer, with the user's own key (BYOK).
//
// Every provider here speaks the same "chat completions" API, so one call
// covers them all. Keys are passed in by the caller (the app reads its vault,
// the bake-off reads the Key Vault) and never logged.
//
//   writeSceneList   built-in style: model writes the scene list; the checker's
//                    problems go back to it until it is valid (max 3 tries)
//   rebuildImported  imported atlas style: model writes the whole HTML page
// ---------------------------------------------------------------------------

import { extractHtml, extractJson, fixPrompt, rebuildPrompt, sceneListPrompt } from "../../explainer/core/prompts.mjs";
import { validateSpec } from "../../explainer/core/spec.mjs";

export const PROVIDERS = {
  gemini: { label: "Google Gemini", base: "https://generativelanguage.googleapis.com/v1beta/openai", hint: ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-pro"] },
  openrouter: { label: "OpenRouter", base: "https://openrouter.ai/api/v1", hint: ["google/gemini-3.5-flash", "moonshotai/kimi-k2", "deepseek/deepseek"] },
  nvidia: { label: "NVIDIA", base: "https://integrate.api.nvidia.com/v1", hint: ["deepseek-v4", "glm-5", "qwen3"] },
  cerebras: { label: "Cerebras", base: "https://api.cerebras.ai/v1", hint: ["gpt-oss-120b", "qwen-3.8", "glm"] },
  openai: { label: "OpenAI", base: "https://api.openai.com/v1", hint: ["gpt-5.5", "gpt-5"] },
  groq: { label: "Groq", base: "https://api.groq.com/openai/v1", hint: ["kimi-k2", "llama-3.3"] },
  mistral: { label: "Mistral", base: "https://api.mistral.ai/v1", hint: ["mistral-large", "mistral-medium"] },
};

/** Model ids the key can use, as the provider lists them. */
export async function listModels(provider, key) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`unknown provider ${provider}`);
  const res = await fetch(`${p.base}/models`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${p.label} would not list models (HTTP ${res.status})`);
  const data = await res.json();
  return (data.data ?? []).map((m) => String(m.id).replace(/^models\//, ""));
}

/** First listed model matching the provider's hints (families, not exact versions). */
export async function pickModel(provider, key, wanted) {
  const ids = await listModels(provider, key);
  for (const h of wanted ? [wanted] : PROVIDERS[provider].hint) {
    const hit = ids.find((id) => id === h) ?? ids.find((id) => id.includes(h));
    if (hit) return hit;
  }
  throw new Error(`${PROVIDERS[provider].label}: none of ${(wanted ? [wanted] : PROVIDERS[provider].hint).join(", ")} is on this key`);
}

/** One chat call. Returns the reply text. */
export async function chat({ provider, key, model, messages, json = false, maxTokens = 8000, timeoutMs = 180000, signal }) {
  const p = PROVIDERS[provider];
  const body = { model, messages, max_tokens: maxTokens, temperature: 0.4, stream: false };
  if (json && provider !== "nvidia") body.response_format = { type: "json_object" };
  let res, text;
  // "busy" (429/503) is usually brief: wait and try again, twice
  for (const wait of [0, 4000, 12000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    const ctl = AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
    res = await fetch(`${p.base}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl,
    });
    text = await res.text();
    if (res.status !== 429 && res.status !== 503) break;
  }
  if (!res.ok) throw new Error(`${p.label} ${model}: HTTP ${res.status} ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  const out = data.choices?.[0]?.message?.content ?? "";
  if (!out.trim()) throw new Error(`${p.label} ${model} returned an empty answer`);
  return { text: out, usage: data.usage ?? null };
}

/**
 * Built-in style: get a valid scene list. Problems found by validateSpec are
 * sent back to the model (same conversation) up to `tries` times.
 * Returns { spec, attempts, ms, problems } — problems empty when valid.
 */
export async function writeSceneList({ provider, key, model, script, words, format = "16:9", duration, base = {}, tries = 3, signal, onAttempt }) {
  const t0 = Date.now();
  const { system, user } = sceneListPrompt({ script, words, format, duration });
  const messages = [{ role: "system", content: system }, { role: "user", content: user }];
  let problems = ["no answer yet"], spec = null;
  for (let attempt = 1; attempt <= tries; attempt++) {
    onAttempt?.(attempt);
    const { text } = await chat({ provider, key, model, messages, json: true, signal });
    messages.push({ role: "assistant", content: text });
    try {
      const got = extractJson(text);
      // the user's choices win over whatever the model put there
      spec = { ...got, ...base, format, scenes: got.scenes, ...(words?.length ? { words } : {}) };
      problems = validateSpec(spec);
    } catch (e) {
      problems = [`the answer was not valid JSON (${e.message})`];
    }
    if (!problems.length) return { spec, attempts: attempt, ms: Date.now() - t0, problems };
    messages.push({ role: "user", content: fixPrompt(problems) });
  }
  return { spec, attempts: tries, ms: Date.now() - t0, problems };
}

/** Imported atlas style: the model writes the whole HTML explainer. */
export async function rebuildImported({ provider, key, model, style, content, format, words, holes, duration, signal }) {
  const prompt = rebuildPrompt(style, { content, format, words, holes, duration });
  const t0 = Date.now();
  const { text, usage } = await chat({ provider, key, model, messages: [{ role: "user", content: prompt }], maxTokens: 48000, timeoutMs: 15 * 60000, signal });
  return { html: extractHtml(text), ms: Date.now() - t0, usage };
}
