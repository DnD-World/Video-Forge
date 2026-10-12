import { geminiJson } from "./geminiText";
import { request } from "../net/http";
import * as keyStore from "../keyStore";
import { nvidiaChatModels } from "./nvidiaModel";

// ---------------------------------------------------------------------------
// GLM-5.2 via NVIDIA NIM — script draft assistant. Rather than inventing a
// separate "scenes" data structure that nothing else in the app uses yet,
// this generates directly into the "Label: text" per-line format
// NarrationPanel/parseScript.ts already consume — the draft becomes an
// editable starting point in the same script textarea, not a new pipeline
// stage. MIT-licensed model, OpenAI-compatible API.
// ---------------------------------------------------------------------------

// The model is looked up live — see nvidiaModel.ts for why it is not typed here.
const NVIDIA_HOST = "integrate.api.nvidia.com";

export interface DraftScriptOptions {
  topic: string;
  speakerLabels: string[];
  languageName: string; // e.g. "Greek", "English" — spelled out for the prompt
  tone?: string;        // e.g. "playful", "informative" — optional
  /** Who each speaker is ("A tiny woman"), so the draft gets genders and
   *  roles right — it called Τσίκα «τον Τσίκα» without it (12 Oct 2026). */
  characters?: string[];
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```[a-z]*\n([\s\S]*?)\n```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/** GLM-5.2 is a reasoning model. Depending on how NIM serves it, the chain of
 *  thought arrives either in a separate `reasoning_content` field or inlined
 *  into `content` wrapped in <think> tags. The second case would otherwise be
 *  pasted straight into the user's script box as if it were dialogue. */
function stripThinkBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

/** Gemini first (fast, free tier, already set up for the voices); NVIDIA's
 *  GLM only if Gemini cannot answer — it is slow (minutes) and was the old
 *  default (changed 12 Oct 2026). */
export async function draftScript(opts: DraftScriptOptions): Promise<string> {
  if (opts.speakerLabels.length === 0) {
    throw new Error("Add at least one speaker before writing a draft.");
  }
  try {
    const reply = await geminiJson(
      `You write short narration/dialogue scripts in ${opts.languageName} for animated explainer videos. ` +
        `Use ONLY these speaker labels, spelled exactly: ${opts.speakerLabels.join(", ")}. ` +
        (opts.characters?.length ? `Who they are: ${opts.characters.join("; ")}. Use the right grammatical gender for each. ` : "") +
        `You may put acting cues in square brackets inside a line, e.g. [laughs], [whispers], [sighs] — they are performed, not read. ` +
        `Write Greek capitals with their accents. ` +
        `Answer only JSON: {"lines": ["Label: text", ...]}.`,
      [`Topic: ${opts.topic}`, opts.tone ? `Tone: ${opts.tone}` : ""].filter(Boolean).join("\n")
    );
    const lines = (JSON.parse(reply) as { lines?: string[] }).lines ?? [];
    if (lines.length) return lines.join("\n");
  } catch (e) {
    console.log(`[video-forge] Gemini draft failed (${e instanceof Error ? e.message : e}); trying NVIDIA.`);
  }
  return draftScriptNvidia(opts);
}

async function draftScriptNvidia(opts: DraftScriptOptions): Promise<string> {
  const apiKey = await keyStore.getKey("nvidia");
  if (!apiKey) {
    throw new Error("No NVIDIA API key saved — add one in Backend Settings first.");
  }
  if (opts.speakerLabels.length === 0) {
    throw new Error("Add at least one speaker before generating a script draft.");
  }

  const systemPrompt = [
    `You write short narration/dialogue scripts in ${opts.languageName}.`,
    `Output ONLY the script itself, one line per line of speech, formatted exactly as:`,
    `Label: text`,
    `Use ONLY these exact speaker labels, spelled exactly as given: ${opts.speakerLabels.join(", ")}.`,
    `Do not add a title, headers, scene directions, markdown formatting, or any commentary — just the`,
    `"Label: text" lines themselves, nothing before or after them.`,
  ].join(" ");

  const userPrompt = [
    `Topic: ${opts.topic}`,
    opts.tone ? `Tone: ${opts.tone}` : null,
  ].filter(Boolean).join("\n");

  const payload = JSON.stringify({
    model: (await nvidiaChatModels(apiKey))[0],
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    // Generous on purpose: reasoning tokens are billed against this same
    // budget, so a tight limit gets consumed entirely by the model thinking
    // and returns an empty `content` with finish_reason "length".
    max_tokens: 8192,
  });

  const res = await request(`https://${NVIDIA_HOST}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: payload,
    // GLM-5.2 is a reasoning model on a free shared tier: it thinks before it
    // answers, and queue time is on top of that. 60s was routinely too tight.
    // This is a ceiling for a pathological stall, not a target.
    timeoutMs: 300000,
  }).catch((e) => {
    if (e instanceof Error && e.message === "Timed out") {
      throw new Error("NVIDIA didn't respond within 5 minutes. The free tier queues requests behind " +
          "paying traffic, so this usually means it's busy rather than broken — try again, " +
          "or use a shorter topic.");
    }
    throw e;
  });

  if (res.status >= 400) {
    throw new Error(`NVIDIA API returned ${res.status}: ${res.body}`);
  }
  const body = res.body;

  const parsed = JSON.parse(body);
  const choice = parsed?.choices?.[0];
  const finishReason: string | undefined = choice?.finish_reason;
  const script = stripCodeFences(stripThinkBlocks(choice?.message?.content ?? ""));

  if (!script) {
    // Distinguish the two ways this realistically fails, because the fixes are
    // completely different — one is ours to raise, the other is a bad response.
    if (finishReason === "length") {
      throw new Error(
        "GLM-5.2 used its whole token budget thinking and never got to the script. " +
          "Try a shorter, more specific topic."
      );
    }
    const hadReasoning = Boolean(choice?.message?.reasoning_content);
    if (hadReasoning) {
      throw new Error("GLM-5.2 returned only its reasoning and no script. Try rephrasing the topic.");
    }
    // Include the actual response so an unexpected shape is diagnosable from
    // the UI instead of needing a debugger attached to the main process.
    throw new Error(
      `NVIDIA API returned no script text. Raw response:\n${body.slice(0, 500)}`
    );
  }

  return script;
}
