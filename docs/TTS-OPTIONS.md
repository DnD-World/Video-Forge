# Voice engines — free and free-with-limits options

> Researched 3 Oct 2026. Prices and free allowances move often — re-check a
> provider's own page before building against it. Anything marked
> *unverified* could not be confirmed from the provider's own docs.

## Why this exists

Chatterbox and DramaBox are switched off in the app (`src/lib/features.ts`) and
shown as "coming soon". Piper is the only working voice. This page is the
shortlist for what comes next, judged against what the course actually needs.

## What a voice engine has to do here

| Need | Why |
|---|---|
| **Greek** | Both courses are in Greek. An engine without Greek is English-only extras at best |
| **Free, or free up to our volume** | 72 videos × ~3 min ≈ 3.6 h of speech ≈ **200,000 characters** for the whole dog course |
| **Commercial use allowed** | Courses are sold. Non-commercial licences are out |
| **Two or more voices** | Dialogue between characters |
| **Expressive** | Piper's flat delivery is the loudest complaint (PLAN.md) |
| **Doesn't need the graphics card** | Shared with Hermes/Ollama (CLAUDE.md). Cloud engines avoid this entirely |

## The options

| Engine | Kind | Free allowance | Greek | Commercial | Expressive | Verdict |
|---|---|---|---|---|---|---|
| **Piper** | Local, on CPU | Unlimited | ✅ | ✅ (check each voice's licence) | ✕ flat | **Have it.** Keep as the always-works fallback |
| **Gemini TTS** (Google AI Studio key) | Cloud API | Free tier on Flash TTS models; per-project limits shown in AI Studio, not published | ✅ `el-GR` (preview) | ✅ on paid tier; free tier lets Google use the inputs | ✅ steered by plain-language instructions ("say it warmly"), **2 speakers in one call** | **Best fit.** Closest thing to DramaBox's acted delivery |
| **Azure Speech** F0 | Cloud API | **500,000 characters/month** neural, every month | ✅ Athina (f), Nestoras (m) | ✅ | Some (SSML styles; few for Greek) | Strong, predictable fallback. *Was on the Cut List* — reopening it is your call |
| **Google Cloud TTS** | Cloud API | 4M chars/month Standard + WaveNet, 1M Chirp 3 HD | ✅ Standard/WaveNet; Chirp 3 HD Greek *unverified* | ✅ | Chirp 3 HD: good; WaveNet: moderate | Generous, but needs a Google Cloud **billing account** (card) even for the free part |
| **Groq** (Orpheus) | Cloud API | 100 requests/day, 3,600 tokens/day | ✕ English + Saudi Arabic only | ✅ | ✅ | **No Greek.** English-only, and the daily cap is tiny |
| **Mistral Voxtral TTS** | Cloud API / open weights | API free tier "for testing" (limits unpublished); paid $16 / 1M chars | ✕ 9 languages, no Greek | API ✅; open weights CC BY-NC ✕ | ✅, voice cloning | **No Greek.** |
| ElevenLabs free | Cloud API | ~10k credits/month | ✅ | ✕ free plan is non-commercial | ✅ best-in-class | On the Cut List; free plan can't be used for the courses |
| Edge TTS (unofficial) | Scraped endpoint | Unlimited, no key | ✅ same as Azure | ✕ not a licensed API | Some | **Avoid** — can break any day, not licensed |
| Kokoro | Local | Unlimited | ✕ | ✅ Apache | Moderate | No Greek |
| XTTS-v2 | Local, GPU | Unlimited | ✕ *(not in its 17 languages)* | ✕ CPML non-commercial | ✅ | No Greek, non-commercial, needs the card |

## Recommendation

| Option | |
|---|---|
| **A. Gemini TTS next, Piper stays as fallback — RECOMMENDED** | Only free option that is Greek **and** expressive **and** does two speakers at once. Cloud, so no graphics-card fights with Hermes. One API key, same "bring your own key" pattern as the rest of the app |
| B. Azure F0 next | Most predictable: fixed 500k chars/month covers the whole course twice over. But only two Greek voices and little expression — a better Piper, not a DramaBox |
| C. Both A and B, behind one voice picker | Best coverage; twice the code and twice the things that can break. Do A first, add B only if Gemini's free limits bite |
| **D. Groq or Mistral — AVOID for now** | Neither speaks Greek. Only worth it for English-only social cuts |

**Risks to know before building A:**

- Free-tier inputs may be used by Google to improve its products — fine for
  course scripts, not for anything confidential.
- Gemini TTS models are "preview" — names and limits can change without much
  notice. The engine must fail loudly and fall back to Piper, never silently.
- Free daily limits are per project and unpublished; a 162-line lesson is 162
  requests unless lines are batched per speaker turn. Batch mode would need to
  pace itself.

Nothing here is built. Pick one and it gets planned like the other engines:
key in Setup, voice picker in Cast, one module beside `electron/tts/piperEngine.ts`.

## Prompt for Perplexity — find more free options

Paste this as-is:

```
I'm building a desktop app that turns a two-character dialogue script into narrated video lessons. I need text-to-speech engines that meet ALL of these:

1. Speaks GREEK (el-GR) well — natural, not robotic. This is a hard requirement.
2. Free, or has a free tier that allows roughly 200,000 characters per month (or per project), OR runs locally for free.
3. Licence allows COMMERCIAL use of the generated audio (the videos are sold as an online course).
4. At least two distinct Greek voices (one female, one male), or voice cloning from a short sample.
5. Bonus: expressive delivery controlled by text instructions or tags (e.g. "whispering", "laughing"), multi-speaker dialogue in one request, word-level timestamps or phoneme/viseme timing (for lip-sync), WAV output.

If local: must run on Windows on a laptop RTX 3070 with 8 GB VRAM (ideally CPU-only), installable without admin rights or system-wide changes.

Already evaluated — do NOT list these unless something changed in the last 3 months: Piper, Gemini TTS, Azure Speech, Google Cloud TTS, Groq Orpheus, Mistral Voxtral, ElevenLabs, Edge TTS, Kokoro, Coqui XTTS-v2, Chatterbox, Resemble DramaBox.

For each option give: name, link to official docs/pricing, exact free allowance, Greek support (with source), licence for commercial use, number of Greek voices, API or local, and any catch (credit card required, data used for training, preview/unstable, rate limits). Put it in a table, sorted by best fit. Cite official sources, not blog posts, wherever possible, and say clearly when something is unverified.
```

## Sources

- [Gemini TTS — Google Cloud docs (Greek `el-GR`, multi-speaker)](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts)
- [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing) · [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Groq — Orpheus text to speech](https://console.groq.com/docs/text-to-speech/orpheus) · [Groq free tier limits](https://klymentiev.com/blog/groq-pricing)
- [Mistral — Speaking of Voxtral](https://mistral.ai/news/voxtral-tts/) · [Voxtral on OpenRouter](https://openrouter.ai/mistralai/voxtral-mini-tts-2603)
- [Azure Speech quotas and limits](https://learn.microsoft.com/el-gr/azure/ai-services/speech-service/speech-services-quotas-and-limits) · [Greek Azure voices](https://json2video.com/ai-voices/azure/languages/greek/)
- [Google Cloud TTS pricing](https://cloud.google.com/text-to-speech/pricing) · [Free plan summary](https://costbench.com/software/ai-voice-tools/google-cloud-text-to-speech/free-plan/)
- [Kokoro (languages)](https://github.com/hexgrad/kokoro)
