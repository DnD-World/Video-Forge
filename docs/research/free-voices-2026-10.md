# Free voices that can speak Greek (checked 10 Oct 2026)

**Answer:** Three real free paths speak Greek: Google Gemini 3.8 TTS (AI Studio key), Fish Audio S2.1 Pro Free (through OpenRouter), and Microsoft Edge voices (unofficial). Chatterbox Multilingual is the best local one, but its Greek has known bugs. Mistral, Groq and NVIDIA do not speak Greek.

Nobody has listened to the samples yet. This file only says which ones exist, not how good they sound.

## What the owner asked about

| Provider | Greek? | Free? | Verdict |
|---|---|---|---|
| Google Gemini (AI Studio key) | Yes, official | Free tier, "free of charge"; the free tier's data is used to improve Google products | Best online option |
| OpenRouter | Yes, through Fish Audio S2.1 Pro Free (language list is from the Fish model card) | Free model, rate limited | Worth testing |
| Mistral (Voxtral TTS) | No (9 languages: en, fr, de, es, nl, pt, it, hi, ar) | Paid, $0.016 per 1k characters. Whether our key is free or billed is unknown | Skip for Greek |
| Groq (Orpheus) | No (English and Saudi Arabic only) | Free plan: 10 requests/min, 100 requests/day, 3.6K tokens/day (per Groq docs) | English only |
| NVIDIA (build.nvidia.com Magpie TTS) | No (ar, de, en, es, fr, hi, it, ja, ko, pt, vi, zh) | Free tier is about 1,000 credits at 40 requests/min (forum posts, not official docs) | Skip for Greek |

Our keys and what I did:
- **Gemini:** we hold many Gemini keys. Two of them (`GEMINI_API_KEY`, `F_GEMINI_API_KEY`) are blocked ("project denied access"). One (`AK2_`) is out of prepaid credit. The key `2_GEMINI_API_KEY` worked, and so did `5_GEMINI_API_KEY`, which I tried only to confirm it worked. I did not check whether `2_` sits on the free tier or a billed project. The free requests/min and requests/day are not published in the docs, because Google shows them only in the AI Studio dashboard. They are unknown here.
- **Others:** the OpenRouter, Mistral and Groq keys work. The NVIDIA key lists no TTS models, only text-translation models.
- **Billing check still needed:** I did not confirm that the OpenRouter call cost nothing, or that the Mistral call was free.

## Full table

Dates are the day I checked: 2026-10-10. "Acting" means emotion or style control. "Clone" means voice cloning.

### Online (API)

| Option | Greek | Free limit | Licence / commercial | Acting | Clone | Key | Sample | Source |
|---|---|---|---|---|---|---|---|---|
| Gemini 3.8 Flash TTS (`gemini-3.8-flash-tts`) | Yes, official (130 languages) | Free tier at $0. Paid is $9 per 1M audio tokens, doubling on 1 Jan 2027. Free RPM/RPD unknown | Google API terms. Free-tier data used to improve products. Output has a SynthID watermark | Strong: style field, `<laugh>` and `<sigh>` tags, 2 speakers per call | Yes (Voice replication). Also Voice design (a voice from a text description) | AI Studio key | `google-gemini-3.8-flash-tts.wav` | ai.google.dev/gemini-api/docs/speech-generation and /pricing |
| Gemini 3.8 Flash-Lite TTS | Yes, official (101 languages) | Free tier, same terms. Paid $6 per 1M audio tokens | Same | Good, less nuance than Flash | Yes | AI Studio key | `google-gemini-3.8-flash-lite-tts.wav` | same pages |
| Gemini 3.1 Flash TTS Preview | Language list not re-checked here; the sample was generated | Free tier listed | Same | 200+ inline tags, 2 speakers | No | AI Studio key | `google-gemini-3.1-flash-tts-preview.wav` | same pages |
| Gemini 2.5 Flash/Pro preview TTS | Older, fewer languages (about 24, from memory; not re-checked) | Tiny quota (Pro 25,000 tokens/min?). Not confirmed | Same | Prompt-based | No | AI Studio key | none | rate-limits page |
| Fish Audio S2.1 Pro Free, via OpenRouter (`fish-audio/s2.1-pro-free:free`) | Yes (Greek `el` in the S2 Pro language list; the S2.1 list was not checked) | $0. "Rate limited, no production guarantee". Exact numbers unknown, they depend on OpenRouter credits bought | Hosted service. Open weights are for research only | Strong: free-form `[tag]` text, 15,000+ tags | S2 supports cloning; not confirmed for the free endpoint | OpenRouter key | `openrouter-fish-s2.1-pro-free.mp3` | openrouter.ai/fish-audio/s2.1-pro-free:free |
| Microsoft Edge read-aloud, via `edge-tts` | Yes: el-GR-AthinaNeural (female), el-GR-NestorasNeural (male) | No published limit. Unofficial endpoint | Unofficial. The library is LGPL, but Microsoft's terms are murky | Almost none (neural voices only) | No | None | `edge-tts-el-GR-AthinaNeural.mp3` | pypi.org/project/edge-tts |
| Mistral Voxtral Mini TTS | No Greek | Paid, $0.016 per 1k chars. Our call worked; billing unknown | Weights CC BY-NC 4.0 (non-commercial). API is paid | Yes, emotion steering | Yes (3-25 second reference) | Mistral key | `mistral-voxtral-mini-tts-en_paul-GREEK-TEXT.mp3` (English voice reading Greek text, kept only as proof it is not Greek) | mistral.ai/news/voxtral-tts |
| Groq Orpheus | No | 10 RPM / 100 RPD (free plan, Groq docs) | Orpheus is Apache-2.0 (from memory) | `[cheerful]` style tags | No | Groq key | none, English only | console.groq.com/docs/text-to-speech |
| NVIDIA Magpie TTS Multilingual | No | About 1,000 credits, 40 RPM (forum) | NIM terms | Per-emotion voice variants | A separate Zeroshot NIM exists | NVIDIA key | none | build.nvidia.com/nvidia/magpie-tts-multilingual |
| Paid-only, seen on OpenRouter (not free) | Grok Voice TTS ($15/M chars, "20+ languages"); Microsoft MAI-Voice-2.1 ($22/M chars); ElevenLabs v3 (70+ languages, $40/M chars list price); Qwen-Audio-3.0-TTS; Seed Audio 1.0; Deepgram Aura-2; MiniMax. Greek support was not checked for any of them | Not free | - | - | - | - | none | openrouter.ai/collections/text-to-speech-models |

### Local (run on the laptop)

I only researched these. I downloaded no models.

| Option | Greek | Licence / commercial | Acting | Clone | CPU OK? | VRAM | Stability / notes | Source |
|---|---|---|---|---|---|---|---|---|
| Chatterbox Multilingual V3 (0.5B) | Yes, official (23 languages). Bug reports: accented Greek letters (ά έ ή ί ό ώ) are mispronounced and Greek can sound mixed with other languages (GitHub issue #254, Sep 2025). Whether V3 fixed this is unknown | MIT, commercial OK. Output is watermarked | Some (an exaggeration setting). No tag prompts | Yes, zero-shot | Possible but slow. Not confirmed | Not published; roughly small enough for 8 GB (unverified) | Already used by Video Forge (the repo name mentions Chatterbox removal). Greek is the weak spot | github.com/resemble-ai/chatterbox, HF ResembleAI/chatterbox |
| Fish Speech / Fish Audio S2 (open weights) | Yes (`el` is in the 80+ list) | Fish Audio Research License. Non-commercial only; commercial needs a paid licence from Fish Audio | Best of the local set: 15,000+ `[tag]` instructions | Yes | No (GPU model, about 4.4B parameters) | One report says 12 GB minimum, so it likely will not fit an 8 GB RTX 3070. Unconfirmed | Large | huggingface.co/fishaudio/s2-pro |
| F5-TTS Greek finetune (PetrosStav/F5-TTS-Greek) | Yes, Greek and English, labelled beta. Skips uppercase Greek letters; wants 6-9 s reference clips; quality of mixed Greek/English needs work | Finetune licence not stated. Base F5-TTS code is MIT, base weights CC-BY-NC | None | Yes (reference clip) | Slow on CPU | About 4-8 GB for the base model | Beta, one author | huggingface.co/PetrosStav/F5-TTS-Greek |
| Piper `el_GR-rapunzelina-low` | Yes, one voice only, "low" quality. Reported bugs: sometimes outputs incomprehensible sentences or a voice that does not sound Greek (piper issue #696, HF discussion #27) | Piper engine is GPL-3.0. The voice's own licence was not checked | None | No | Yes, very fast on CPU | None | Fast and tiny, but unreliable in Greek | github.com/rhasspy/piper VOICES.md |
| Kokoro 82M | No. 8 languages (en US/UK, es, fr, hi, it, ja, pt, zh) | Apache-2.0, commercial OK | Voice presets only | No | Yes | Tiny | Very stable. English only for us | HF hexgrad/Kokoro-82M; OpenRouter page |
| XTTS-v2 (Coqui) | No. 17 languages, Greek not listed | Coqui Public Model License (non-commercial). Coqui the company has closed (not re-checked) | None | Yes | Slow | About 4-6 GB (from memory) | Dead project | HF coqui/XTTS-v2 |
| Qwen3-TTS | No. 10 languages | Apache-2.0 | Yes | Yes (3 s) | Possible | 4-8 GB | Newcomer | github.com/QwenLM/Qwen3-TTS |
| Orpheus (open, multilingual research preview) | No. Languages: fr, de, zh, ko, hi, es, it (Greek not listed) | Apache-2.0 | Emotion tags | Fine-tune only | No (3B) | Large | - | github.com/canopyai/Orpheus-TTS |
| Voxtral-4B-TTS (open weights) | No Greek | CC BY-NC 4.0 | Yes | Yes | No | About 6 GB download | - | HF mistralai/Voxtral-4B-TTS-2603 |
| Dia, MeloTTS, Parler-TTS, Sesame CSM | Believed to be no Greek (English-first; Melo has 6 languages; Parler multilingual v1.1 has 8, none Greek). **I did not re-check these four this session.** | - | - | - | - | - | Not worth testing for Greek | - |

## Shortlist for the side-by-side listening test

| # | Candidate | Mark | One-line reason |
|---|---|---|---|
| 1 | Gemini 3.8 Flash TTS | **RECOMMENDED** | Official Greek, free tier, acting control, 30 preset voices plus custom voice design and cloning. Catch: key is needed and free-tier audio trains Google. |
| 2 | Gemini 3.8 Flash-Lite TTS | **RECOMMENDED** | Same Greek support, cheaper and faster for bulk. Compare it against Flash to see what the quality gap is. |
| 3 | Fish Audio S2.1 Pro Free (OpenRouter) | **RECOMMENDED** | Free, rich emotion tags, Greek listed. The free endpoint has no uptime guarantee and unknown limits. |
| 4 | Edge-tts, el-GR-AthinaNeural | **RECOMMENDED as a fallback** | No key and very stable Greek, but flat acting and it is an unofficial endpoint. A second request returned 403 during my test (Athina worked, Nestoras was blocked), so expect flakiness. |
| 5 | Chatterbox Multilingual V3 (local) | **RECOMMENDED for the offline mode** | The only decent local Greek with a commercial licence. Test the accented-letter bug before trusting it. |
| 6 | F5-TTS-Greek (local) | Optional | The only Greek-trained local cloner. Beta, licence unclear. Add it only if the Chatterbox sample is bad. |
| - | Mistral Voxtral, Groq Orpheus, NVIDIA Magpie, Kokoro, XTTS-v2, Qwen3-TTS | **AVOID for Greek** | No Greek in the official language lists. |
| - | Piper Greek | **AVOID** | One low-quality voice with reports of garbled output. |
| - | Fish S2 local weights | **AVOID for public release** | Research-only licence and probably too big for 8 GB. The hosted OpenRouter version is fine for personal tests. |

## Things to know

- **Key mix-up:** four of the Gemini keys behave differently (denied, out of credit, working). The app must handle a 403 or 402 from Google as "try the next key", not as a crash.
- **Free-tier data:** Gemini's free tier uses submitted text to improve Google's products. This matters if lesson scripts are private.
- **Multi-character lessons:** Gemini does two speakers per call. For more characters, make one call per line and join the audio. Custom designed or cloned voices cannot be mixed inside one two-speaker call.
- **Cost after the free period:** Gemini 3.8 TTS prices double on 1 Jan 2027 (Flash from $9 to $18 per 1M audio tokens). The free tier has no listed end date.
- **Edge-tts failure:** Microsoft can block it at any time (403 seen on a repeat request).
- **Research tools:** the research-forge web search failed on every call this session ("Error executing tool"). I logged it with `report_issue` and used Firecrawl plus direct page downloads instead.
- **Samples:** `docs/research/tts-samples/` holds six files, all using the sentence "Η σκυλίτσα μου κυνηγάει πεταλούδες. Κάθε μία. Κάθε φορά."
