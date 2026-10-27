# How the 70 lesson videos were really made

Compiled 9 Oct 2026 from past session transcripts (Aug–Sep 2026) and the repo.
Purpose: every step done *outside* the app becomes a built-in feature in v2.

**Headline:** the app only rendered. Scripts, narration, word timing, music,
sound effects, puppets, intros/outros, titles and YouTube were all done by side
scripts and hand work. Narration was **Gemini TTS on Google Vertex** (`lms/tts/`),
not DramaBox — the DramaBox GPU box was deleted on 8 Sep 2026.

| Step | How it was done | What went wrong | Built-in feature for v2 |
|---|---|---|---|
| Scripts, split into 70 sub-lessons | Gemini Gem + NotebookLM → Google Doc/MD; extraction script (`lms/scripts/GEM-INSTRUCTION.md`) | Headings dropped → lessons merged; 198 SFX cues lost to markdown escapes; duplicate 501; wrong 103.2 split | Script import that splits by heading, checks format, counts cues |
| Voices | `lms/tts/speak.mjs`, `characters.mjs`, `render.mjs` (Vertex). Stock voice + style prompt per character; Τσίκα sped up 1.55× | Cloning refused; Τσίκα sounded like Καίτη; stale cache; cost guess 10× off; lesson 501 stalled ~1 h | Voice recipes per character, resumable batch, cost meter, smart cache |
| Word timing | `tools/timestamp-audio-for-puppets-and-subtitles.py`, shell loop, ~12 s/lesson | 17 late lines checked by hand | Runs automatically, flags suspect lines |
| Music + sting | `lms/tts/add-music.mjs`, `music-all.mjs` | Remixed 3–4 times; app preview has no sound | Music panel: intro/bed/outro levels, sting alignment, audible preview |
| Sound effects | Freesound CC0 + listening page + loudness fix (`lms/sfx/`); Stable Audio locally; ElevenLabs | GPU hit 88 °C; wrong sounds; licence checks | SFX library: audition, pick/reject, auto-level, licence tag |
| Puppets | See below | Many rounds | Puppet builder linked to Image Forge |
| Intros/outros | Made in Google Flow by hand, cut to 2 s / 30 fps by hand | Characters reversed in one; none of 69 had outros until the 20 Sep repair | Intro/outro manager: trim, fps, rotate, append — and a check that fails loudly |
| Banner | 4 looping clips, crop measured frame by frame | Manual measuring | Banner picker with crop preview |
| Background footage | `electron/llm/backgroundPlanner.ts` → Pixabay/Pexels | Dark, blurry, landscape, off-topic; ~7 min/lesson planning; cut-off replies killed 3 lessons | Shot-list review with thumbnails to swap; auto-retry |
| Series looks 1xx–5xx | `brands/skilitsa/presets/lms-*.json` | Waveform and subtitle bugs (fixed) | "Lesson-number → look" rule in the UI |
| Queue | Throwaway Python made `series-*.queue.json`; `tools/run-queue.mjs` | Port 3001 collisions; 64/69 first pass; 11–19 min/lesson | Batch panel: import, queue, resume, retry, time left |
| Outro weld | `electron/render/addOutros.ts`, `npm run outros` | Missing ffmpeg filters; error scrolled past; all 69 shipped without outros | Post-render check: fail loudly on wrong length |
| Look checking | Test renders + contact sheets | Preview doesn't show footage band, intro, logo | Preview with every layer; frame gallery |
| Titles | Pasted from Google Sheet into `jobs/lesson-titles.json` | Hand pasting | CSV/Sheet import |
| YouTube | `tools/youtube-*.mjs`, `lms/wp/*` + hand uploads | 3-hour sign-in; 26 duplicate uploads; quota | Publish tab: sign-in wizard, description template, schedule, duplicate finder |
| Covers, handouts, promos, 64 demo clips | `lms/visuals/*` (Vertex, Veo, Flow) | A third of handout images redone | Image Forge link, "cover from frame", logo stamp |
| New single lesson (502) | Seven hand-run steps | Seven steps | "Add a lesson" wizard |
| Desktop app | `scripts/build-exe.mjs` | `out/` goes stale after pulls | Auto-rebuild / version check |

## Puppets: old and new

| | Old — layered "cells" puppets | New — "rig" puppets |
|---|---|---|
| Look | Flat cartoon (chibi) | Pixar-like 3D |
| Art | Photoshop layer PNGs in `viseme/`, 3×3 sheets in `viseme-sheets*/`, `viseme-v2/` | Base portrait + 11 "change only mouth/lids/brows" edits per character (Gemini images, Vertex) |
| Built by | `*.spec.json`, `*.puppet.json` | `lms/visemes/cut-layers.mjs` → `tools/make-rig-puppet.mjs` → `brands/skilitsa/puppet/rig`, `rig-wide` |
| Recipe | — | Image Forge `recipes/skilitsa-viseme.md` (failure log) |
| Pains | Layer positions lost on export | Parts didn't match face; cross-eyed; magenta fringe |

## Google Cloud still referenced in code

- `electron/llm/geminiText.ts` defaults to dead project `tier-1-ak`.
- `narrate-remote.mjs`, `dramabox-vm-setup.sh`, `gpu-light.ps1` target `tier-1-ak`.
- `lms/tts`, `lms/visuals/batch.mjs` use Vertex + a storage bucket.
- Ak, 9 Oct 2026: **no Google Cloud unless absolutely necessary**, private or public.

## Ak's own words (selected)

- 11 Sep: "it is not a 1 time 69 vids job."
- 15 Sep: wants crossfades between mouth shapes and blinks.
- 16 Sep: backgrounds should be lively, on-topic, portrait.
- 19 Aug: give it a webpage → short for YouTube, auto description, upload, schedule.
- 20 Sep: every step explained simply.
