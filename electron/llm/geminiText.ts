// ---------------------------------------------------------------------------
// Ask Gemini for a JSON answer, with a plain API key.
//
// WHY GEMINI FOR THE SHOT LIST. It reads a line of the script and writes an
// English stock-footage search. NVIDIA did this before and became the least
// reliable part of a render: of 57 models its key listed on 16 Sep 2026, eleven
// answered "not on your account", one crashed, one never replied, and the one
// that worked was a reasoning model that thought out loud around its JSON.
// Gemini answered the same probe in 0.7 seconds with clean JSON.
//
// WHY A KEY, NOT GOOGLE CLOUD. Until 10 Oct 2026 this went through Vertex on a
// Google Cloud project. Ak's rule since then: no Google Cloud unless there is
// no other way. A Google AI Studio key (aistudio.google.com/apikey) reaches
// the same models with nothing to set up, and anyone installing the app can
// get one free. The key lives in the app's vault under "gemini".
//
// MODELS VERIFIED LIVE on 10 Oct 2026 with an AI Studio key: all four below
// answered 200. Cheapest first — a shot list is a small job. Tried in order;
// the first that answers is kept for the rest of the run.
// ---------------------------------------------------------------------------

import * as keyStore from "../keyStore";

const MODELS = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.5-flash"];
const API = "https://generativelanguage.googleapis.com/v1beta/models";

let working: string | null = null;

export async function geminiJson(system: string, user: string): Promise<string> {
  const key = await keyStore.getKey("gemini");
  if (!key) {
    throw new Error("No Gemini key saved (Backend Settings → Gemini), so Gemini cannot plan the footage.");
  }

  const order = working ? [working, ...MODELS.filter((m) => m !== working)] : MODELS;
  let lastProblem = "";
  for (const model of order) {
    try {
      const res = await fetch(`${API}/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        signal: AbortSignal.timeout(90000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          // JSON mode: the answer IS the object, with nothing around it to peel off.
          generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
        }),
      });
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        error?: { message?: string };
      };
      if (!res.ok) {
        lastProblem = `${model}: HTTP ${res.status} ${String(data.error?.message ?? "").slice(0, 120)}`;
        continue;
      }
      const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      if (!text.trim()) {
        lastProblem = `${model} returned nothing`;
        continue;
      }
      if (working !== model) console.log(`[video-forge] Gemini text model: ${model}`);
      working = model;
      return text;
    } catch (e: any) {
      lastProblem = `${model}: ${String(e?.message ?? e).slice(0, 120)}`;
    }
  }
  throw new Error(`Gemini could not plan the footage — ${lastProblem}`);
}
