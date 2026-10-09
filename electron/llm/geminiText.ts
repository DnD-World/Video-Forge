// ---------------------------------------------------------------------------
// Ask Gemini for a JSON answer, through Google Vertex.
//
// WHY GEMINI FOR THE SHOT LIST. It reads a line of the script and writes an
// English stock-footage search. NVIDIA did this before and became the least
// reliable part of a render: of 57 models its key listed on 16 Sep 2026, eleven
// answered "not on your account", one crashed, one never replied, and the one
// that worked was a reasoning model that thought out loud around its JSON.
// Gemini answered the same probe in 0.7 seconds with clean JSON.
//
// NO NEW KEY. This uses the machine's existing Google sign-in (Application
// Default Credentials) on project `tier-1-ak` — the same one that made the
// course's narration and puppet art. A missing sign-in is reported plainly and
// the planner falls back to NVIDIA.
//
// MODELS VERIFIED LIVE on 16 Sep 2026 against `tier-1-ak`, global location:
//   gemini-2.5-flash  answered, 0.7s
//   gemini-3.5-flash  answered, 1.2s
//   gemini-3-flash, gemini-3-pro, gemini-2.0-flash, gemini-1.5-flash  — 404
// Tried in order; the first that answers is kept for the rest of the run.
// ---------------------------------------------------------------------------

import { GoogleAuth } from "google-auth-library";

const PROJECT = process.env.VIDEOFORGE_VERTEX_PROJECT ?? process.env.BYOK_VERTEX_PROJECT ?? "tier-1-ak";
const MODELS = ["gemini-2.5-flash", "gemini-3.5-flash"];

let client: Awaited<ReturnType<GoogleAuth["getClient"]>> | null = null;
let working: string | null = null;

export async function geminiJson(system: string, user: string): Promise<string> {
  if (!client) {
    try {
      const auth = new GoogleAuth({ scopes: "https://www.googleapis.com/auth/cloud-platform" });
      client = await auth.getClient();
    } catch {
      throw new Error(
        "This computer is not signed in to Google Cloud, so Gemini cannot plan the footage."
      );
    }
  }

  const order = working ? [working, ...MODELS.filter((m) => m !== working)] : MODELS;
  let lastProblem = "";
  for (const model of order) {
    try {
      const res = await client.request<{
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      }>({
        url:
          `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global` +
          `/publishers/google/models/${model}:generateContent`,
        method: "POST",
        timeout: 90000,
        data: {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          // JSON mode: the answer IS the object, with nothing around it to peel off.
          generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
        },
      });
      const text = (res.data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      if (!text.trim()) {
        lastProblem = `${model} returned nothing`;
        continue;
      }
      if (working !== model) console.log(`[video-forge] Gemini model for planning: ${model}`);
      working = model;
      return text;
    } catch (e: any) {
      lastProblem = `${model}: ${String(e?.response?.data?.error?.message ?? e?.message ?? e).slice(0, 120)}`;
    }
  }
  throw new Error(`Gemini could not plan the footage — ${lastProblem}`);
}
