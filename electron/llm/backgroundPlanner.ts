// ---------------------------------------------------------------------------
// Choosing background clips automatically, from the script.
//
// Two stages, and keeping them apart is the whole design:
//
//   1. PLAN — the LLM reads the narration and returns a search query per
//      scene, plus one shared look that all of them must obey.
//   2. PICK — ordinary code searches the providers and chooses a clip per
//      query. No model is asked to choose between actual clips.
//
// The model never sees the search results, and that is deliberate. It cannot
// watch video, so asking it to pick between thumbnails would be asking it to
// guess; what it is genuinely good at is reading a sentence in Greek about
// what dogs shouldn't eat and producing the English phrase "dog looking at
// chocolate on table" that a stock library will actually match. Selection
// among the returned clips is a mechanical problem — duration, orientation,
// don't repeat yourself — and mechanical problems belong in code, where they
// are testable and free.
//
// COORDINATION between scenes comes from the shared look, which is appended to
// every query rather than left to the model to remember. Clips that were
// individually sensible but jointly incoherent — a sunny park next to a neon
// night kitchen — is the failure mode this exists to prevent.
// ---------------------------------------------------------------------------

import { request } from "../net/http";
import * as keyStore from "../keyStore";
import { nvidiaChatModels, nvidiaModelWorked } from "./nvidiaModel";
import { geminiJson } from "./geminiText";
import { searchVideos, type MediaHit } from "../net/mediaSearch";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

/** How long one planning call may take before the model is written off.
 *
 *  Was five minutes, chosen when the model was named in the source and there
 *  was nothing else to try. Now the app walks up to 57 candidates, and most of
 *  this key's models answer 404 instantly while a bad one simply never
 *  replies — at five minutes each that is a render that dies after a coffee
 *  break with nothing to show. A model that has not begun answering a
 *  twenty-scene batch within ninety seconds is not going to. */
const PLAN_REQUEST_TIMEOUT_MS = 90000;

/** Bump this whenever the planning prompt below changes.
 *
 *  Plans are cached per lesson, and the cache key has to include the RULES the
 *  plan was made under — otherwise editing the prompt changes nothing for every
 *  lesson already planned, which is a silent failure that looks like the model
 *  ignoring instructions. See the plan cache in electron/batch/runJob.ts.
 *
 *  2 — 16 Sep 2026: a dog must be on camera.
 *  3 — 16 Sep 2026: query comes from the line's own main point, plus a dog.
 *      "Bright/sunny/lively" was dropped — Ak: the word bright is not proper
 *      here; the script decides the picture.
 *  4 — 16 Sep 2026: 4-8 words naming the line's own object or action; vertical
 *      frame said out loud; planned by Gemini, NVIDIA only as fallback. */
export const PLAN_RULES_VERSION = 4;

/** Words that mean a dog is in the picture: the animal, and the breeds that
 *  show up most in these libraries. Whole words, so "hotdog" does not count. */
const DOG_WORDS =
  /\b(dogs?|pupp(y|ies)|pups?|canine|doggy|chihuahua|terrier|retriever|labrador|poodle|schnauzer|spaniel|shepherd|beagle|bulldog|husky|corgi|dachshund|pug|collie|boxer|rottweiler|doberman|shiba|maltese|greyhound)\b/;
// The model is looked up live — see nvidiaModel.ts for why it is not typed here.

export interface PlannedScene {
  startMs: number;
  endMs: number;
  /** English search phrase, whatever the script's language. Stock libraries
   *  are indexed in English and a Greek query returns almost nothing. */
  query: string;
  /** Why this clip, in the model's words — shown in the UI so a bad pick is
   *  diagnosable rather than mysterious. */
  reason: string;
}

export interface BackgroundPlan {
  /** The shared visual directive every query inherits. */
  look: string;
  scenes: PlannedScene[];
}

export interface ChosenBackground extends PlannedScene {
  hit: MediaHit | null;
  /** Set when nothing usable came back for this query. */
  note?: string;
}

interface Segment {
  text: string;
  startMs: number;
  endMs: number;
  speakerLabel: string;
}

/** Post one request, waiting out a rate limit rather than failing on it.
 *
 *  Splitting a long script into batches made this necessary: one request per
 *  video never hit a limit, and four back to back did. A nine-minute lesson
 *  sends four, a batch of forty lessons sends a hundred and sixty, so this is
 *  the difference between unattended batch runs working and not.
 *
 *  Only 429 is retried. Every other failure — a bad key, a malformed body — is
 *  permanent, and retrying it just delays the message that says so. */
async function postJson(apiKey: string, payload: string): Promise<string> {
  // MEASURED: five attempts from 8s is 120 seconds of patience in total, and
  // NVIDIA's free tier stayed shut for longer than that after a day's use. An
  // unattended overnight batch can afford to wait minutes; what it cannot
  // afford is to stop. Six attempts from 15s, each wait capped so the tail
  // doesn't run away: 15 + 30 + 60 + 120 + 120 = a little over five minutes.
  const MAX_ATTEMPTS = 6;
  const MAX_WAIT_MS = 120000;
  let waitMs = 15000;

  // A MODEL THAT IS LISTED MAY STILL 404. Walk the candidates until one
  // answers, then stay on it — see nvidiaModel.ts. Without this the whole
  // render died at 14% on a model NVIDIA itself had advertised.
  const models = await nvidiaChatModels(apiKey);
  let modelIndex = 0;

  for (let attempt = 1; ; attempt++) {
    const body = JSON.parse(payload);
    body.model = models[modelIndex];
    // A TIMEOUT IS NOT AN HTTP STATUS, and that is why the walk used to die
    // here: `request` REJECTS on a stalled connection, so the 404/500 handling
    // below never saw it and one unresponsive model killed the whole render
    // (16 Sep 2026, five minutes in, eleven working candidates still untried).
    let res;
    try {
      res = await request("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // GLM-5.2 was measured at 274s on a real key for a single script draft.
      // Two minutes was never enough headroom for a reasoning model; batching
      // keeps each call small, and this stops a slow-but-working call from
      // reading as a network failure.
      timeoutMs: PLAN_REQUEST_TIMEOUT_MS,
      });
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      if (modelIndex < models.length - 1) {
        console.log(
          `[byok] ${models[modelIndex]} did not answer (${why}) — ` +
            `trying ${models[modelIndex + 1]} (${models.length - modelIndex - 1} left)`
        );
        modelIndex++;
        continue;
      }
      throw new Error(
        `None of the ${models.length} NVIDIA models this key lists would answer. ` +
          `The last one: ${why}.`
      );
    }

    if (res.status === 200) {
      nvidiaModelWorked(models[modelIndex]);
      return res.body;
    }

    // NOT USABLE RIGHT NOW — cross it off and try the next one.
    //
    // 404 is "this account has no such function"; 400 is a model that rejects
    // the request shape; 5xx is NVIDIA's own "inference connection error",
    // which it returns for models that are listed, permitted, and still not
    // serving. Stopping on the 5xx wasted the whole walk on 16 Sep 2026: seven
    // models were correctly skipped and the eighth killed the render.
    const unusable = res.status === 404 || res.status === 400 || res.status >= 500;
    if (unusable && modelIndex < models.length - 1) {
      console.log(
        `[byok] NVIDIA cannot serve ${models[modelIndex]} (HTTP ${res.status}) — ` +
          `trying ${models[modelIndex + 1]} (${models.length - modelIndex - 1} left)`
      );
      modelIndex++;
      continue;
    }
    if (unusable) {
      throw new Error(
        `None of the ${models.length} NVIDIA models this key lists would answer. ` +
          `The last said HTTP ${res.status}. Footage cannot be planned until one does.`
      );
    }

    if (res.status === 429 && attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, waitMs));
      waitMs = Math.min(waitMs * 2, MAX_WAIT_MS);
      continue;
    }

    throw new Error(
      res.status === 429
        ? `NVIDIA rate limit held for ${MAX_ATTEMPTS} attempts. Try again in a few minutes.`
        : `NVIDIA returned HTTP ${res.status}: ${res.body.slice(0, 200)}`
    );
  }
}

/** Pull the first JSON object out of a reply.
 *
 *  GLM-5.2 is a reasoning model: it frequently wraps its answer in prose, a
 *  ```json fence, or both, and asking it not to does not reliably stop it.
 *  Scanning for the outermost braces is far more robust than trusting the
 *  model to obey a formatting instruction. */
/** One planning question: Gemini first, NVIDIA only if Gemini cannot answer.
 *
 *  Returns the model's reply text; extractJson does the rest. Both paths end
 *  in the same place so the planner above does not care who answered. */
async function askPlanner(nvidiaKey: string | null, system: string, user: string): Promise<string> {
  try {
    return await geminiJson(system, user);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    if (!nvidiaKey) {
      throw new Error(`${why} There is no NVIDIA key saved to fall back on.`);
    }
    console.log(`[byok] ${why} — falling back to NVIDIA.`);
    const body = await postJson(
      nvidiaKey,
      JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4, // classification, not creativity
        max_tokens: 8192,
      })
    );
    const parsed = JSON.parse(body) as { choices?: { message?: { content?: string } }[] };
    return parsed.choices?.[0]?.message?.content ?? "";
  }
}

function extractJson(text: string): unknown {
  // A REASONING MODEL IS THE NORMAL CASE NOW, not the exception. The only
  // model this account can actually call is
  // `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`, and it thinks out loud:
  // the answer arrives wrapped in <think> blocks, prose, or a fence, often
  // with a second stray brace after it. Taking everything between the FIRST
  // "{" and the LAST "}" then fails to parse — "Expected ',' or ']' after
  // array element", 16 Sep 2026, which killed a render at 14%.
  //
  // So: drop the thinking, drop the fence, then take the first BALANCED
  // object rather than the widest span of braces.
  const withoutThinking = text.replace(/<think>[\s\S]*?<\/think>/gi, " ");
  const fenced = withoutThinking.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : withoutThinking;

  const start = candidate.indexOf("{");
  if (start === -1) throw new Error("The model didn't return JSON.");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return JSON.parse(candidate.slice(start, i + 1));
    }
  }
  throw new Error("The model's JSON was cut off before it finished.");
}

/**
 * Stage 1 — ask the model for a query per scene, plus one shared look.
 *
 * Scenes are derived from the narration's own timing rather than invented, so
 * a cut always lands on a line boundary and never mid-sentence.
 */
export async function planBackgrounds(opts: {
  segments: Segment[];
  languageName: string;
  /** Roughly how long one background should stay on screen. Lines are grouped
   *  up to this, so a fast exchange doesn't cut the picture every 1.5s.
   *
   *  Prefer setting `perMinute` — this is the raw form it resolves to. */
  minSceneMs?: number;
  /** How many background clips per minute of finished video.
   *
   *  THE FREQUENCY HALF OF THE DIAL, in the unit a person actually thinks in.
   *  The nine-minute test render cut 66 times — a new clip every 8 seconds,
   *  which is music-video pacing and fights a narrator who is explaining
   *  something. Ak's answer: aim for 3-4 a minute, and never outside 2-6.
   *
   *  2/min is a 30s hold, restful and cheap; 6/min is a 10s hold and about as
   *  fast as a lesson can take. Clamped, because outside that range this stops
   *  being a lesson. */
  perMinute?: number;
  topic?: string;
  /** Called once per batch. A nine-minute script takes several minutes to
   *  plan, and a caller with no way to say so looks hung. */
  onBatch?: (done: number, total: number) => void;
}): Promise<BackgroundPlan> {
  // Gemini plans; NVIDIA is only asked when Gemini cannot answer. So a missing
  // NVIDIA key is not an error by itself any more — see askPlanner below.
  const apiKey = await keyStore.getKey("nvidia");
  if (opts.segments.length === 0) throw new Error("Generate narration first — there is no script to read.");

  // Group consecutive lines into scenes of at least minSceneMs. A cut per line
  // is exhausting to watch and burns through the search quota for no gain.
  const perMinute = Math.max(2, Math.min(6, opts.perMinute ?? 3.5));
  const minMs = opts.minSceneMs ?? Math.round(60000 / perMinute);
  const groups: Segment[][] = [];
  let current: Segment[] = [];
  for (const seg of opts.segments) {
    current.push(seg);
    const span = current[current.length - 1].endMs - current[0].startMs;
    if (span >= minMs) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    // A short tail is merged backwards rather than left as its own flash of a
    // scene.
    if (groups.length > 0 && current[current.length - 1].endMs - current[0].startMs < minMs / 2) {
      groups[groups.length - 1].push(...current);
    } else {
      groups.push(current);
    }
  }

  const scenesForModel = groups.map((g, i) => ({
    index: i,
    text: g.map((s) => `${s.speakerLabel}: ${s.text}`).join(" "),
  }));

  // PLANNED IN BATCHES, and the reason is a measurement rather than caution.
  //
  // This was one request for the whole script, which is fine at sixty seconds
  // and breaks at nine minutes. An 8m47s lesson groups into roughly ninety
  // scenes; that request timed out, and had it returned it would have been
  // truncated anyway, since ninety query-plus-reason objects do not fit in the
  // 8192 tokens asked for. Both failures are silent in different ways — one
  // looks like a network problem, the other like a model that ignored half its
  // input.
  //
  // The batch size is small enough that any one call is comfortably inside both
  // limits, and the LOOK IS DECIDED ONCE, by the first batch, then handed to
  // every later one. That is what keeps ninety scenes coherent without asking a
  // model to hold ninety scenes in mind at once.
  const BATCH = 20;
  const batches: typeof scenesForModel[] = [];
  for (let i = 0; i < scenesForModel.length; i += BATCH) {
    batches.push(scenesForModel.slice(i, i + BATCH));
  }

  let look = "";
  const byIndex = new Map<number, { index: number; query: string; reason?: string }>();

  for (const [n, batch] of batches.entries()) {
    const first = n === 0;

    // Wait between batches rather than only reacting to a 429. Backing off
    // after being refused still costs the refused call's round trip, and the
    // free NVIDIA tier refuses quickly enough that four batches in a row hit
    // it every time. Three seconds is far cheaper than the retry it avoids.
    if (!first) await new Promise((r) => setTimeout(r, 3000));
    const systemPrompt = [
      "You choose stock-video search queries for a narrated video.",
      "Answer with the JSON object ONLY — no explanation, no thinking out loud,",
      "no markdown fence. The first character you write must be {.",
      "Return ONLY a JSON object of the form:",
      first
        ? `{"look":"...","scenes":[{"index":0,"query":"...","reason":"..."}]}`
        : `{"scenes":[{"index":0,"query":"...","reason":"..."}]}`,
      "",
      first
        ? [
            "`look` is ONE short phrase describing a consistent visual treatment for",
            "the whole video — lighting, palette, setting. Every scene in the video",
            "will inherit it, including scenes you are not being shown, so keep it",
            "general enough to suit a whole lesson on this subject.",
            "Keep the look plain and consistent. Do not prescribe a mood.",
          ].join("\n")
        : `The look has already been chosen for this video: "${look}". Every query you return must suit it. Do not return a look field.`,
      "",
      "`query` MUST be in ENGLISH regardless of the script's language, 4-8 words,",
      "and must describe something a stock footage library plausibly contains.",
      "Prefer concrete filmable subjects over abstractions: 'dog eating from bowl'",
      "not 'canine nutrition awareness'. Never name a brand or a person.",
      "",
      // THE DOG HAS TO BE IN THE PICTURE. The first lesson came back with an
      // empty sofa, a dim kitchen table and a blurred wall: each one a fair
      // illustration of its line, and not one of them about a dog. This is a
      // dog-training course, and the footage is carrying the avatars.
      "EVERY query MUST have a dog or puppy on camera — a room, an object or a",
      "person alone is never acceptable: not 'chewed slipper on floor' but 'dog",
      "chewing slipper'; not 'front door hallway' but 'dog waiting at front door'.",
      "Take the query from THE MAIN POINT OF THE LINE you are given: name the",
      "line's own object or action, and put the dog in it. A line about a chewed",
      "slipper is 'dog lying beside chewed slipper', not 'dog close up'.",
      "The video is VERTICAL (phone-shaped); prefer subjects that fill a tall frame.",
      "",
      "`reason` is one short sentence, in English, saying why it fits that scene.",
      "Return exactly one entry per scene index given, in order, and use the",
      "index numbers exactly as given — they are not consecutive from zero.",
    ].join("\n");

    const userPrompt = [
      opts.topic ? `Overall topic: ${opts.topic}` : null,
      `Script language: ${opts.languageName}`,
      batches.length > 1 ? `This is part ${n + 1} of ${batches.length} of one video.` : null,
      `Scenes:`,
      ...batch.map((s) => `${s.index}: ${s.text}`),
    ].filter(Boolean).join("\n");

    const content = await askPlanner(apiKey, systemPrompt, userPrompt);
    const obj = extractJson(content) as {
      look?: string;
      scenes?: { index: number; query: string; reason?: string }[];
    };

    if (first) look = (obj.look ?? "").trim();

    // TRUST THE ORDER, VERIFY THE NUMBER.
    //
    // Batch two is sent scenes 20-39 and asked to reuse those numbers. Models
    // renumber lists from zero anyway — it is one of the most reliable things
    // they do — and `byIndex.set(s.index, ...)` would then quietly overwrite
    // every query batch one produced, leaving scenes 20-39 to fall back to
    // their own Greek text, which stock libraries cannot match. The first third
    // of the video would get the wrong footage and the rest near-random, with
    // no error anywhere.
    //
    // So an index is used only if it belongs to this batch. Anything else is
    // taken as a renumbering and mapped back by position, which is the one
    // thing the model does reliably: it returns them in the order given.
    const lo = batch[0].index;
    const hi = batch[batch.length - 1].index;
    const returned = obj.scenes ?? [];
    returned.forEach((s, i) => {
      const inRange = typeof s.index === "number" && s.index >= lo && s.index <= hi;
      const target = inRange ? s.index : batch[i]?.index;
      if (target !== undefined) byIndex.set(target, { ...s, index: target });
    });

    opts.onBatch?.(n + 1, batches.length);
  }

  return {
    look,
    scenes: groups.map((g, i) => {
      const s = byIndex.get(i);
      return {
        startMs: g[0].startMs,
        endMs: g[g.length - 1].endMs,
        // A scene the model skipped still gets a background rather than a
        // hole: falling back to its own words is worse than a chosen query
        // but much better than nothing.
        query: (s?.query ?? g.map((x) => x.text).join(" ").slice(0, 40)).trim(),
        reason: s?.reason ?? "Fallback: the model returned no query for this scene.",
      };
    }),
  };
}

/**
 * Stage 2 — search for each planned scene and choose a clip.
 *
 * Entirely mechanical. Preference order:
 *   1. long enough to cover the scene without looping
 *   2. matching the output's orientation
 *   3. not already used elsewhere in this video
 */
export async function pickBackgrounds(
  plan: BackgroundPlan,
  opts: { portrait: boolean }
): Promise<ChosenBackground[]> {
  const used = new Set<string>();
  const out: ChosenBackground[] = [];

  for (const scene of plan.scenes) {
    // The shared look is appended here rather than baked into the query by the
    // model, so it is applied uniformly and can be changed without another
    // round trip.
    const query = plan.look ? `${scene.query} ${plan.look}` : scene.query;
    const { hits, notes } = await searchVideos(query, {
      perProvider: 12,
      orientation: opts.portrait ? "portrait" : "landscape",
    });

    const needMs = scene.endMs - scene.startMs;
    const scored = hits
      .filter((h) => !used.has(h.id))
      .map((h) => {
        let score = 0;
        // ORIENTATION FIRST, LENGTH SECOND. It used to be the other way round —
        // 100 for long enough, 50 for the right shape — so a long landscape clip
        // beat a portrait one every time, and a 9:16 lesson filled up with
        // sideways footage cropped to its middle. A clip that is the wrong
        // shape loses most of its picture; a clip that is too short merely
        // loops, which nobody notices behind a talking head.
        const isPortrait = h.height > h.width;
        if (isPortrait === opts.portrait) score += 200;
        if (h.durationSec * 1000 >= needMs) score += 100;
        // Mild preference for longer clips among those that already fit, so a
        // scene that grows slightly doesn't immediately need re-picking.
        score += Math.min(20, h.durationSec);
        return { h, score };
      })
      .sort((a, b) => b.score - a.score);

    // THE RIGHT SHAPE OR NOTHING — unless there is nothing. Pexels is asked for
    // portrait at the source, but Pixabay's video API cannot filter, so a
    // landscape clip could still out-score a vertical one and fill a 9:16 frame
    // with a sideways picture cropped to its middle.
    const rightShape = scored.filter((x) => (x.h.height > x.h.width) === opts.portrait);
    // A DOG IN THE CLIP, by the library's own description of it. The query
    // always asks for one, but a stock search matches loosely: "dog owner
    // coming home" returns a hand and a mug. Right shape with a dog first,
    // then right shape, then anything — so a scene is never left empty.
    const withDog = rightShape.filter((x) => DOG_WORDS.test(x.h.tags));
    const best = (withDog[0] ?? rightShape[0] ?? scored[0])?.h ?? null;
    if (best && !DOG_WORDS.test(best.tags)) {
      console.log(`[byok] no clip described with a dog for "${scene.query}" — using the closest match`);
    }
    if (best) used.add(best.id);
    out.push({
      ...scene,
      hit: best,
      note: best ? undefined : notes[0] ?? `Nothing found for "${query}".`,
    });
  }

  return out;
}
