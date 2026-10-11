# Video Forge v2 — Ak's needs (interview)

Source: interview with Ak, 9–10 Oct 2026. Each line is his answer, not a guess.
Background: [research/how-the-70-videos-were-made.md](research/how-the-70-videos-were-made.md),
[research/creator-needs-2026-10.md](research/creator-needs-2026-10.md).

## Ground rules (9 Oct 2026)

- Name: **Video Forge**, everywhere.
- Build the private version first (DnD-World). When v2 is ready, clean a copy for the public (Stravelakis org) — no dogs, no Skilitsa, no personal specifics.
- **No Google Cloud** (VMs, storage, Vertex) unless absolutely necessary — private or public.
- Look: stravelakis.com colours (navy/mint, Sora) + repo standards. Wow factor.
- Private version keeps both old (flat) and new (Pixar-like rig) Skilitsa puppets.
- Easy new puppets through a direct link to Image Forge, in several styles.
- Everything done by hand for the 70 lessons becomes easy in the app.
- Claude may render test videos freely to check its work.

## Round 1

| Topic | Answer |
|---|---|
| Voices | Gemini voices with a plain AI Studio API key (no cloud project) |
| Puppet styles | Pixar-like 3D, flat cartoon, anime/manga, paper cut-out/storybook, stop-motion, claymation, cutout animation, papercraft, stick puppets, limited animation (shared parts between frames), stick figure |
| Puppet bodies | Full body if possible: neck, shoulders, wrists, hips, ankles; knees and elbows if possible; some fingers if not too much |
| Next videos | Soft-skills course, shorts from lessons, promos/ads. **Wants automatic "top moments" picking** from long videos to make shorts |
| Batch input | Spreadsheet, one row per video |

## Round 2

| Topic | Answer |
|---|---|
| Puppet bodies (v2) | Upper body only: news anchor behind a desk, or standing person whose legs don't move. Full body later |
| Top-moments shorts | Fully automatic: app finds and rates every candidate; Ak then asks for the top X% to be made — usually 50%, 80–90% for must-not-miss topics, all for volume |
| Picture engine | Both — Gemini key or free local (Image Forge), chosen per job |
| Publishing | All of it — YouTube upload+schedule, TikTok/Instagram/Facebook, hand-off folder for n8n/Hermes, or just the file — chosen per job |

## Round 3

| Topic | Answer |
|---|---|
| Languages | Any language, chosen per video |
| Backgrounds | All four: reviewed stock footage, gently moving AI pictures, AI video clips, plain branded sets |
| Acting | Ak marks gestures in the script with tags (e.g. [points], [shrugs]) |
| Scripts | All: write with AI in the app, import Docs/Word/text, from a web page or PDF, paste by hand — **plus point at a whole site and make one video per post / breed / page** |

## Round 4

| Topic | Answer |
|---|---|
| New character input | All three: description, photo/drawing, restyle an existing puppet |
| Puppet check | Ak approves the base face; mouths, blinks, brows, arms made and tested automatically; short talking preview at the end |
| Money | **Free first.** Every paid option shows its cost and Ak decides; he will usually pick free |
| Users | Just Ak, one laptop |

## Round 5

| Topic | Answer |
|---|---|
| Free voice | Side-by-side listening page — but first check free TTS models offered by OpenRouter, Gemini, Mistral, Groq (and rarely NVIDIA) |
| Music | Free library picked by mood + Ak's own files + **Envato** (Ak has a subscription: app proposes Envato tracks, Ak downloads them) |
| Subtitles | All: word-by-word highlight, plain lines, big bold captions with emoji, separate .srt file |
| Rendering | Long batches on the mini PC, overnight |

## Round 6

| Topic | Answer |
|---|---|
| Puppet styles first | Pixar-like 3D, paper cut-out/papercraft, claymation/stop-motion, anime/flat cartoon |
| First-minute wow | Live preview with sound, animated look (glass, fluid, particles in stravelakis navy/mint), template gallery that plays on hover |
| Templates | Lesson/explainer, news desk, podcast/dialogue, promo/ad |
| Order of work | Make the 70-video workflow easy first; then puppet maker; then shorts; then the new look |

## Voice ranking, round 1 (10 Oct 2026, plain line)

1. Gemini 3.8 Flash-Lite — Love it
2. Gemini 3.1 Flash — Love it
3. Gemini 3.8 Flash — OK
4. Fish Audio S2.1 — OK
5. Microsoft Athina — OK
6–7. Piper Joy, Piper Rapunzelina — OK
8. Mistral Voxtral — No (no Greek at all)

Ak asked for a second round with an emotional line: questions, exclamations, [x] markings.

## Gemini free tier (Ak's AI Studio dashboard, 10 Oct 2026)

- Speech models (2.5 Flash TTS, 3.1 Flash TTS, 3.8 Flash-Lite TTS, 3.8 Flash TTS): **10 requests per day each** — too few for a lesson (~50 lines).
- Live models (2.5 Native Audio Dialog, 3 Flash Live, 3.8 Live, 3.8 Live Extended Thinking, 3.5 Live Translate, 3.5 Transcribe Live): **unlimited requests**, token-per-minute caps (1M for 2.5 Native Audio, 65K for 3.x Live).
- Test 10 Oct: Gemini 3.8 Live, told to act as a voice actor, read an emotional line word for word and did not speak the [x] markings (its own transcript). 2.5 Native Audio skipped a sentence. → Live is the candidate free voice engine; round-2 listening page decides.

## Voice ranking, round 2 (10 Oct 2026, emotional line with [x] markings)

1. Gemini 3.8 Flash TTS — Love it
2. Gemini 3.1 Flash TTS — Love it
3. Gemini 3.8 Flash-Lite TTS — Love it
4. Gemini 2.5 Native Audio (Live) — Love it
5. Gemini 3.1 Flash Live — Love it
6. Fish Audio S2.1 — OK
7. Gemini 3.8 Live — OK
8. Piper Joy — No

**Decision (Ak):** the two unlimited free Live voices he loves — **Gemini 2.5 Native Audio** and **Gemini 3.1 Flash Live** — are the stars (default engines). The TTS models (10/day free) stay as a premium option. **Fish Audio** stays as a fun option: "a funny foreigner speaking Greek" accent, not a main voice. Piper: offline fallback only.
Guard needed: Live models can skip or add words (2.5 skipped a sentence in testing), so every line's transcript is compared with the script and re-made if it doesn't match.

## Rendering engine (10 Oct 2026)

Ak asked why not **HyperFrames** (github.com/heygen-com/hyperframes): Apache-2.0, ~60k stars, active, HTML+GSAP → MP4, has a Remotion-port workflow. Removes the Remotion licence risk. Trial port first (see docs/research/hyperframes-trial.md).

## The Forge look (11 Oct 2026)

Ak's verdict on docs/design/looks-pick.html: **A Star sparks — Love it**; B Embers — OK; C Anvil button — OK.

- Pure black background; tiny orange-red sparks like the logo's, drifting and twinkling (half the first density).
- Click: 3–4 tiny orange-red sparks, always flying north-east (up and to the right).
- stravelakis navy/mint for the interface; Sora font; see-through panels with a navy-to-mint hairline edge.
- **Render is a pill**, not the anvil (Ak, 11 Oct).
- Logos: build/brand/video-forge-logo.jpg, image-forge-logo.jpg; symbol crops in docs/design/.
- The Image Forge switch: options on docs/design/switch-pick.html, verdict pending.
