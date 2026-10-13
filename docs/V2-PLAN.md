# Video Forge v2 — plan

Built from [V2-NEEDS.md](V2-NEEDS.md) (Ak's interview, 9–10 Oct 2026),
[research/how-the-70-videos-were-made.md](research/how-the-70-videos-were-made.md) and
[research/creator-needs-2026-10.md](research/creator-needs-2026-10.md).

Private first (DnD-World/Video-Forge). Public copy only when v2 is done.
Free first; every paid option shows its cost and asks. No Google Cloud.

| Phase | What Ak gets | Human work hours |
|---|---|---|
| 0. Foundations | Rename done. Gemini calls switched from Google Cloud to a plain AI Studio key. Old GPU-box scripts archived. Free-voice check (OpenRouter, Gemini, Mistral, Groq, NVIDIA, local) → side-by-side listening page | 6–10 |
| 1. The 70-video workflow, in the app | Spreadsheet batch panel · script import (Docs/Word/text/web page/PDF/whole site → one video per page) · AI script writer · voices per character · automatic word timing · music panel (free library by mood, own files, Envato suggestions) · sound-effects library · intro/outro manager with a loud length check · background review (stock, moving AI pictures, AI clips, branded sets) · 4 subtitle styles + .srt · gesture tags in scripts · cost shown before paid steps · overnight batches on the mini PC · publish per job (YouTube, social, n8n/Hermes folder, file) | 50–70 |
| 2. Puppet maker, linked to Image Forge | Description / photo / restyle → 4 options → Ak picks the face → mouths, blinks, brows, arms made and tested automatically → talking preview. Styles first: Pixar-like 3D, paper cut-out, claymation, anime. Upper body (desk anchor or standing). Old and new Skilitsa puppets both kept | 30–45 |
| 3. Top-moments shorts | Finds and scores every candidate moment in a long video; Ak asks for the top X% | 10–15 |
| 4. New look | A/B page of 2–3 looks in stravelakis navy/mint + Sora → build the chosen one: live preview with sound, glass/fluid/particles, moving template gallery (lesson, news desk, podcast, promo) | 30–50 |
| 5. Public copy | Script makes a clean copy (no brands, no course, no personal paths), banned-word check, Windows installer, repo standards docs, Stravelakis org | 10–15 |
| **Total** | | **~135–205** |

## Open risks

- **Remotion licence:** free for individuals and teams up to 3 people. Ask hi@remotion.dev in writing how that applies to an open-source app before the public release.
- **Licence file:** package.json says MIT; the CLAUDE SPACE rule says Apache-2.0 + NOTICE. Fix in phase 5.
- **Free voices in Greek** may still sound flat; the listening page decides.

---

## Status — 11 Oct 2026

### Done
- Rename to Video Forge (app, docs, repo DnD-World/Video-Forge); installed with desktop shortcut and logo icon.
- No Google Cloud: planner on a plain Gemini key; GPU-box scripts archived; storage bucket gone.
- Free voices: Gemini Live (2.5 Native Audio, 3.1 Flash Live) as default, word-for-word check, TTS as premium.
- The Forge look: black + orange-red sparks, navy/mint, Sora, twin-logo switch, pill Render.
- Research: creator needs, how the 70 videos were made, free voices, Remotion alternatives.

### Not done yet (rewritten 11 Oct 2026)

Ak, 11 Oct: the 70 videos are done. The goal now is **polishing the maker** — usable, easy, accessible — not producing.

**Done since the first list:** Fish Audio voice; HyperFrames trial (recommend switching, 32–52 h); both test renders pass; four-step mock-up (docs/design/flow-try.html); MIT licence with an optional credit request; Gemini voices work inside the app.

| # | Item | Notes |
|---|---|---|
| A1 | ~~Four-step layout~~ **done 11 Oct** — Cast → Script → Look → Make, Settings behind a gear | |
| A2 | Template gallery — **first version done** (Halo/Broadcast/Orbit as moving tiles); lesson/news/podcast/promo templates still to make | part of Look |
| A3 | **Preview with sound and every layer** | best done with HyperFrames' player — needs the switch decision |
| A4 | ~~Switch to HyperFrames~~ **done 11 Oct** — default engine; glass frosted, not refracting | docs/research/hyperframes-trial.md |
| B1 | First run that works with **no keys at all** (offline voice, plain set), then explains each free key in one line with a link | |
| B2 | **Projects**: name, save, open recent, autosave, undo/redo | |
| B3 | **Script editor**: speaker colours, name autocomplete, a picker for [laughs] / [points] tags, live check as you type | |
| B4 | **Listen before rendering**: ▶ on every line and every character; re-make one line without redoing the rest | |
| B5 | **Every error says what to do next**, in plain words, with a button that does it | |
| B6 | **Cancel anything; progress per line**, with time left | |
| B7 | **Save my own template** from any project | |
| B8 | **Batch from a spreadsheet**: download a template sheet, check every row before starting, resume after a stop | |
| B9 | **Accessibility**: full keyboard use, visible focus, readable contrast, screen-reader labels, text size setting, motion off respected everywhere | |
| B10 | **Built-in help**: short guide per step, a neutral sample project, hover hints instead of long paragraphs | |
| C1 | **Puppet maker** linked to Image Forge (approved) | Phase 2 |
| C2 | **Top-moments shorts** (approved) | Phase 3 |
| C3 | ~~Image Forge pair~~ **done 12 Oct** — shared keys (`tools/lib/forgeKeys.mjs`, DPAPI file `%APPDATA%/Forge/shared-keys.bin`), sparks on black, transparent camera icon, twin switch back. Image Forge branch `forge-twins` (not merged) | |
| D1 | Public release | Ak works out what it should be for his advancement |

## Round of 13 Oct 2026 (Ak's review after the puppet maker)

Human-work-hour estimates in brackets. ✅ = decided, build it. ❓ = needs Ak.

### Video Forge
| # | Ask | Plan |
|---|---|---|
| V1 | Cast "+" opens a menu: ready-made puppet, or create new | ✅ Menu: "From my puppets" (shelf + library + built-ins) / "Create a new one" (order form, inline) [3] |
| V2 | New speaker starts with Who, then the face section; rename "Look" (in Cast) to "Puppet" — no two "Look"s | ✅ [1] |
| V3 | Frame thickness adjustable in pixels | ✅ slider 0–24 px [1] |
| V4 | Waveform default "around the face" | ✅ [0.5] |
| V5 | Sparks waveform more visible — slider | ✅ "Spark size/brightness" slider [1] |
| V6 | Boiling preview not working | ✅ find and fix [1–2] |
| V7 | Particles, bars, bloom bars look the same | ✅ make each distinct and checked side by side [3] |
| V8 | Ribbon/particles/sparks/bloom/boiling: only circular and around-face; add "frame around the whole video" (outside in) | ✅ new position "video frame" for every style [4] |
| V9 | Hover help hidden at the lowest choices | ✅ bubble flips upward near the bottom [0.5] |
| V10 | Mass prepare and render from a Google Sheet | ✅ Sheet link ("publish to web" CSV, no Google Cloud, no key) or a .csv/.xlsx file → one row per video → narrate + render queue, overnight, one at a time [8] |
| V11 | Settings: remove Appearance (always on) | ✅ [0.5] |
| V12 | Settings: no LocalAI entry | ✅ "Your own machine" card: address, test, models listed [1.5] |

### Image Forge
| # | Ask | Plan |
|---|---|---|
| I1 | Start: default 2 images, not 6 | ✅ [0.2] |
| I2 | Model choice = dropdown of what is set up and working, "Add more…" last → Settings | ✅ [2] |
| I3 | "Look" → "Style" everywhere ("No particular style", "All styles"); the word links to the styles page | ✅ [1] |
| I4 | Forge tab: wrong dates ("1 day ago" for months), Pause not working, convoluted, duplicates | ✅ Replace with "Made" — statistics (by engine, by day, cost) + a list of everything produced with status, filters, redo; fix the date bug and Pause [8] |
| I5 | Settings: Test button beside every API key, right when pasted | ✅ [2] |
| I6 | Gallery: old, misses puppets/visemes/sprites | ✅ Rebuild on the new "Made" list: pictures, sheets, puppets (live preview), GIFs; redo/mark [6] |
| I7 | Recipes / previous batches — needed? | Recipe = a saved wizard setup (style, engine, shape). Batch = rows made together. ✅ Recommend: merge into **Templates** (incl. Puppet / Viseme sheet / Sprite sheet templates) and make batches a filter in "Made" [3] |
| I8 | Wizards menu needs help; keep the Prompt factory and let it make CSV / Google Sheet lists | ✅ Menu reduced to: Make pictures, Make a puppet, Animate a character, Prompt factory. Factory exports CSV/XLSX and copies straight into a Google Sheet (paste) [4] |
| I9 | Simplify "Start the wizard" | ✅ 3 steps: what (one sentence) → how many + style → engine (pre-picked) [4] |
| I10 | Canva-style "many image makers plugged in" | Not worth it here: Image Forge already routes between engines; ❓ only if you want a "send to Canva" button |

### Models (answers)
- Z-Image (have it): best for lettering in pictures — now told it can write.
- OVH SDXL: keep — free with no daily cap (capacity), weaker quality; good fallback for bulk.
- DreamShaper: SD 1.5 fine-tune — fast, low memory, painterly fantasy look. Adds a style flavour, not quality. Optional.
- Iris-3B: new (12 Oct 2026); its **upscale / restore** variant could become "make it bigger/sharper" for finished pictures later. Not runnable in LocalAI yet.

### Status of the 13 Oct round (end of day)
Done and installed: V1–V12 (Many videos tested: 2 rows → 2 videos), I1–I9.
I10 (Canva): not now — a Canva app needs their SDK, review and a hosted
server (~20–30 h); worth it only when Image Forge goes public, for reach.
Open: LocalAI still listens on every network until Ak runs
`.localai-lockdown.sh` (127.0.0.1 + Tailscale only).

## Status — 13 Oct 2026, evening
The Video Forge asks of 13 Oct are done (see `docs/HANDOFF.md` and `CHANGELOG.md`): live-face "+" menu, hands and automatic gestures, smoother mouths, Also as / Also in English-Greek, AI label, subtitle files, Greek stress fixer, Language card, hover help. Per-item list for both apps: end of `docs/FORGES-PLAN.md`.
