# Explainer videos — plan (v3, 20 Oct 2026, NOT STARTED)

A new kind of video in Video Forge, next to the puppet videos: **animated
explainers drawn by code**, in looks taken from the Futurepedia "AI Style
Atlas" (https://www.futurepedia.io/resources/ai-style-atlas/view).

**Status (21 Oct 2026): Phases A and B are BUILT** — checking page, tile
engine, Stravelakis style, puppet spots (20 Oct, high effort); bake-off, app
screen, importer + how-to, fonts, colours, tint, exports, 4:5 everywhere,
puppet spots in the puppet screen (21 Oct, medium). How to use:
[explainer/README.md](../explainer/README.md). Deviations from this plan:
- Checks and explainer renders run in **Electron**, not HyperFrames' Chrome
  (that Chrome would not start from the build session's sandboxed shell).
- The Greek-key meander became the brand's own half-circle wave (Ak, 21 Oct).
- Bake-off models were what the keys could actually call on 21 Oct (Gemini
  3.5 Flash, GPT-OSS 120B and Qwen 3.8 on Groq); Kimi/GLM/DeepSeek weren't reachable.

v2 changes (Ak, 20 Oct): use the atlas's own prompts (each contains full
working code); new style list; Google Fonts online; colour tints; 4:5
everywhere; captions/chapters/thumbnails now; 4-image storyboard instead of
N-style videos; style creator; puppet timing.

---

## 1. What the atlas prompts are (checked: Ak pasted #78 and #86)

Each style's **Copy prompt** gives:

| Part | What it is | Why it matters to us |
|---|---|---|
| Style card | Name, family, look, motion, "how it explains" | Gallery text, style-creator template |
| `H` helper library | Seeded randomness, noise, paper, grain, vignette (same for all styles) | Shared; load once |
| `SOUND` kit | Synthesised sound effects in plain Web Audio, no audio files, no GPU. Has a **voiceover mode** (drops beds/music, lowers minor sounds under narration) | Sound effects for free; already built to sit under a voice |
| Reference source | Complete code: a hero frame `draw()`, a 15 s `explainer()` ("How does AI learn?"), and `explainerSound()` | A working example of the look, motion and sound |
| Instructions | Rebuild around *my content*; 1280×720 canvas; every frame a pure function of time `t`; expose `window.seek(t)`, `window.DURATION`, `window.scoreSound`; phone-size text rules (headlines ≥44 px, labels ≥28 px, key numbers ≥64 px); structure (hook ≤2 s, a change every 1–2 s, takeaway held ~1 s); how to render to MP4 frame by frame | Exactly how our renderer already works: seek a frame, capture, next frame |

So the atlas's workflow is: **a strong model reads the reference and writes
a new explainer for your topic.** That fits Video Forge directly — HyperFrames
already renders a page frame by frame (`electron/render/hyperframes/`).

### Terms — Ak's decision (20 Oct, v3)
- Ideas and methods aren't owned by copyright; **the code itself is**.
- **Ak's own install:** all chosen atlas styles in (private use, as the creator invites).
- **Public v1:** ships with **no Futurepedia code**. It ships with (a) **one premade style in Ak's brand look**, written by us, and (b) an **"Import a style" box + short step-by-step tutorial**: the user clicks Copy prompt on the atlas themselves and pastes it into Video Forge, which stores it in *their* install only.
- **Then** Ak writes to Futurepedia, linking the project, asking permission to bundle their styles (and for the code directly). If yes → v2 bundles them. Claude can draft that email; Ak sends it.
- Which brand look: assumed **Stravelakis** (navy/mint, Sora font, `stravelakis.com/DESIGN-TOKENS.md`) — confirm with Ak.

---

## 2. The style list (v2)

Removed by Ak: 10, 18, 21, 28, 38, 47, 60, and (v3) **8, 20, 78**. Ak's #41
Manga: kept, built later. Added: the easy ones from v1. **35 styles** (34 +
Manga later). Rows for 8, 20, 78 below are struck — kept only so the
reasons stay on record.

"Effort" now = how hard it is to make *our* videos in it, given the
reference code exists. Three things decide it:
1. **New subjects** — does the topic (dogs, people, steps) need drawing the style finds hard (faces, characters)?
2. **Other shapes** — the references are fixed at 1280×720; portrait/square/4:5 need re-layout.
3. **Render speed** — styles that touch every pixel each frame (`readsPixels: true`, e.g. paper tooth, flood fills) are slow; a 5-minute lesson could take a long time and heat the laptop's processor.

| # | Style | Effort | Note |
|---|---|---|---|
| 4 | Whiteboard Explainer | **Easy** | Classic lesson look |
| 23 | Chalkboard Lesson | **Easy** | |
| 50 | Napkin Sketch | **Easy** | |
| 61 | Kinetic Type | **Easy** | Words only — cheapest, best for quotes/rules |
| 6 | Tech Glow Explainer | **Easy** | |
| 1 | Flat-Vector Science | **Easy** | |
| 37 | Engineering Blueprint | **Easy** | |
| 64 | Sticky-Note Wall | **Easy** | |
| 55 | ISOTYPE Pictograms | **Easy** | Counting with icons |
| 48 | Transit Map | **Easy** | Process steps as a metro line |
| 26 | Editorial Chart | **Easy** | |
| 9 | Manim-Style Math | **Easy** | |
| 46 | Glassmorphism UI | **Easy** | Frosted glass only (our renderer can't bend glass) |
| 58 | Constructivist Propaganda | **Easy** | |
| 67 | Memphis Group | **Easy** | |
| 74 | Bauhaus Poster | **Easy** | |
| 69 | Op Art Sphere | Easy-Medium | Generative; can be slow |
| 17 | Risograph Zine | Medium | Print texture pass |
| 11 | Editorial Essay Collage | Medium | Wants photos → Image Forge |
| 15 | Isometric Pastel | Medium | |
| 24 | Cut-Paper Diorama | Medium | |
| 29 | Linocut Relief Print | Medium | |
| 40 | Low-Poly Faceted | Medium | |
| 42 | Wood Type Letterpress | Medium | |
| 49 | Gouache Travel Poster | Medium | |
| 51 | Art Deco Foil | Medium | An option, not "our style" |
| 56 | Soft 3D Clay | Medium | |
| 62 | Byzantine Mosaic | Medium | Can tile any picture into mosaic |
| 63 | Y2K Liquid Chrome | Medium | |
| 68 | Ballpoint Notebook | Medium | |
| 70 | Topographic Survey | Medium | |
| 86 | Multi-scale Truchet | Easy-Medium | Tiles themselves are easy; see §2b |
| 3 | Shadow Puppet Theatre | Medium | **Our puppets as silhouettes** — natural fit |
| 14 | Halftone Pop Panel | Medium-Hard | Faces |
| ~~8~~ | ~~1940s Film Noir~~ | out (v3) | People |
| ~~78~~ | ~~Sketchbook Graphite~~ | out (v3) | Per-pixel paper tooth = slow |
| ~~20~~ | ~~Kawaii Anime~~ | out (v3) | Characters |
| 41 | Manga Page | Hard — **later** | See §7 |

### 2b. Pattern-tile family (Ak's idea, v3) — our own, can ship publicly
Truchet (#86) is one rotating tile in 2–3 sizes and 2–3 colours. Ak is right
that this is easy. In the reference only three things cost effort:
- tiles of different sizes must still join up (a balancing rule — solved once);
- the hidden word is found by colouring every pixel **every frame** → slow; fix: work it out once and cache it;
- explaining a *dog lesson* with only tiles is abstract — subjects become tile-paths and labels, not drawings.

Same engine, different tile rules = a whole family, **written by us, so it
can ship in the public app**:

| Pattern | Rule |
|---|---|
| Truchet | Quarter-circle tile, rotate 0/90° |
| Greek meander (key) | Square spiral tile; repeats in a band or frame |
| Arabic geometric (girih / star) | 5–10 point star tiles from a polygon grid |
| Fishbone / herringbone | Offset rectangles at ±45° |
| Celtic knot | Over/under strands on a diagonal grid |
| Hex / honeycomb | Hexagon tiles, 3 rotations |

How they explain: a band of pattern "grows" to the next point, tiles flip to
show change, labels are printed blocks, charts are stacked tiles. Good
first candidate for the **premade brand style** (meander + brand colours).

---

## 3. How a video gets made (two paths)

### Path 1 — "Rebuild" (the atlas way; build first)
1. Ak picks a style, shape, font, colours, and gives the narration (or a lesson section).
2. The app fills the atlas prompt: our content + the target canvas size + word times (see §5) + chosen font/colours.
3. A strong model writes one HTML page (the explainer).
4. **Automatic checks** in a hidden browser (no model guessing): page loads with no errors; `seek()` works; every frame under 150 ms; text sizes meet the phone rules; nothing outside the frame; length matches narration. If a check fails, the error goes back to the model (max 2 retries).
5. Ak sees the **4-image storyboard** first (§6 #6), then renders.
6. HyperFrames renders frames; SOUND renders the effects to WAV; mixed under the narration.

### Path 2 — "Kit" (later, for long lessons)
Path 1 writes a whole new program each time: fine for 10–30 s pieces, risky
for an 8-minute lesson. Path 2 takes the reusable parts of a style's
reference (paper, strokes, labels, arrows, transitions) into a fixed kit; a
model then only writes a short scene list. Steadier, cheaper per video, but
real work per style. Build it only for the 3–5 styles Ak uses most.

### How much code a model writes (Ak asked, v3)
| Moment | Who | Size |
|---|---|---|
| Building a **new style** (once) | Top model / Claude Code | ~1–2k lines |
| **Path 1**: every explainer section (10–30 s) | Top model — it rewrites the drawing story for the new topic each time | a few hundred to ~1.5k lines **per section** |
| **Path 2**: every explainer section | Cheap fast model — only a scene list | ~50–200 lines |

So Path 1 is the costly one per video. That's why the brand style is built as a
**Path 2 kit from day one** (§6), and Path 1 is used for imported atlas styles.

### Puppets on top of an explainer (Ak, v3) — in the first draft
Yes, simple enough. Two renders:
1. The explainer is told which areas to **leave empty** — the puppet slots, in the shape the dialogue layout uses (round / rounded / square), per frame shape (16:9, 9:16, 1:1, 4:5). It is rendered to an MP4.
2. The normal puppet render uses that MP4 as its **background footage** (HyperFrames already does background video — tested 11 Oct) and puts the puppets in the slots. Same narration, same word times.

Check: the harness compares each slot area with the plain background; if
anything is drawn there, the section goes back to the model. Extra work:
≈ 6–10 h (slot map per layout + check + wiring).

### Lesson length
Lessons are 3–8 min; references are 15 s. Plan: **one explainer per lesson
section (10–30 s)**, stitched, or used as inserts between puppet talk. Not
one 8-minute program.

---

## 4. Models

| Job | Recommended | Fallbacks to test | Avoid |
|---|---|---|---|
| Path 1 rebuild (writes ~1–2k lines of drawing code) | Claude (Opus) via Claude Code — the prompt is written for it; GPT-5.5; Gemini 3.1 Pro | Kimi K3, DeepSeek V4, GLM 4.7 | Small/fast models — will break the code |
| Path 2 scene lists | Gemini 3.5 Flash | GLM 4.7 (Cerebras), Kimi K2.6 | — |
| Look at frames (taste check) | C1/C2/TB panel from Image Forge | Gemini Flash | — |

- **Two ways to run Path 1:** (a) the app calls the model with the user's own key (BYOK); (b) **"Hand to Claude"**: the app writes the filled prompt to a file, Ak runs it in Claude Code on his subscription, the app picks up the result. (b) costs nothing extra per video.
- **Risk:** OmniRoute routes named `aug/`, `agy/`, `gweb/`, `ds-web/`, `tllm/` look like borrowed accounts/websites (not checked). Don't build on them.
- Not yet known which model is best: bake-off in Step A3.

---

## 5. Features

| Feature | Plan |
|---|---|
| **Fonts** | Bundled offline set (each style's own fonts + ~10 favourites, `@fontsource`). Online: the full Google Fonts library, searched in the app, downloaded on use and **kept in a local cache** so a project re-renders offline. Free licences (OFL/Apache) — ship licence notes. Source for the font list: to be checked at build time. |
| **Colours** | Two ways. (1) *Swap*: each style's colour constants (e.g. `C_DARK`, `C_ACC`, `GR`) become named slots the user can set; ships with 3–4 schemes + "my brand". (2) *Tint*: one finishing pass that maps light→dark onto 2–3 chosen colours; works on **any** style — Noir in sepia or maroon. |
| **Shapes** | 16:9, 9:16, 1:1 and **4:5 everywhere** in Video Forge (puppet videos too). App today only has 9:16 and 16:9 (`src/store/types.ts`). For explainers the target size goes into the prompt; text rules scale with the short side. |
| **GIF** | Range ≤15 s, ≤720 px wide, 12–15 fps; ffmpeg palette two-step. |
| **Extracts** | Any time range → short MP4, GIF or still PNG. |
| **Voice timing** | The aligner already gives the time of every word for any narration — **puppet voiceovers included**. Word times go into the prompt ("the arrow lands on the word 'reward' at 4.32 s"). SOUND runs in voiceover mode under narration. |
| **Captions/chapters/thumbnails (now)** | From the same word times: `.srt` and `.vtt` caption files; chapter list `00:00 Hook / 00:12 …` for the YouTube description; 3 thumbnail stills (key-number frame, title frame, takeaway frame) at 1280×720. Cheap, good for YouTube search. |

---

## 6. Build steps

Each step: do it, test it yourself (hidden browser, scripts), show Ak only
taste questions. Warn Ak before long render runs (processor heat).

### Phase A — prove it (≈ 12–18 h)
- **A1. Collect prompts (Ak's install only).** For the 34 styles, save each Copy-prompt text to the app's user data folder, not the repo. The page lazy-loads cards; scroll in the built-in browser and click each button. Record each style card in `styles.json` (number, name, family, effort, fonts, `readsPixels`).
- **A2. Harness.** One page that loads an explainer, calls `seek(t)` per frame, measures time per frame, checks text sizes, bounds and **empty puppet slots**, captures frames. Reuse `electron/render/hyperframes/`. Test with the unmodified reference explainers of #4 and #86 → MP4 + effects WAV mixed.
- **A3. Model bake-off.** Same 20 s dog-training section, styles #4, #61, #6, written by Claude (Claude Code), GPT-5.5, Gemini 3.1 Pro, Kimi K3. Score: passes checks first time? retries? frame speed? Side-by-side page for Ak; Ak picks default + fallback → HANDOFF.md.
- **A4. Other shapes.** Same section in 9:16, 1:1, 4:5 with the winner.
- Done when: Ak has watched the comparison page and picked.

### Phase B — the brand style + the app (≈ 34–48 h) = **public v1**
- **B1. Brand style as a kit (Path 2), our own code.** Pattern-tile engine (§2b) with meander/Truchet rules in Ak's brand colours and font, plus pieces: title, label block, arrow, number, chart, scene change, puppet slots. All 4 shapes.
- **B2.** "Explainer" category; style gallery (hero frames, family filter, effort badge, "Experimental" on hard ones).
- **B3. "Import a style"** box: paste an atlas Copy prompt → the app reads the style card, fonts, helper code and reference, test-renders the hero frame, adds it to the gallery. Plus a short illustrated **tutorial** (numbered steps, screenshots).
- **B4.** Pickers: shape (4), font (bundled + Google online, cached), colours (swap/tint), length; puppet layout (none/1/2/3).
- **B5.** Generate (kit: cheap model; imported: BYOK top model or "Hand to Claude") → checks → **4-image storyboard** → render → puppets on top if chosen.
- **B6.** Exports: MP4, GIF, PNG still, extract-from-range, `.srt`/`.vtt`, chapters text, 3 thumbnails.
- **B7.** 4:5 across the rest of Video Forge.
- Done when: Ak makes one explainer (with and without puppets) start to finish without help.

### Phase C — Ak's install, widen (≈ 2–4 h per style)
- Run each of Ak's 34 styles through the harness; note speed/failures; hard ones stay "Experimental" until Ak signs off.
- Ak writes to Futurepedia (Claude drafts). If yes → v2 bundles them.

### Phase D — later (each needs Ak's go)
- More pattern rules: Arabic geometric, fishbone, Celtic knot, hex.
- Path 2 kits for Ak's 3–5 favourite atlas styles.
- Style creator (§7 #2). Manga as a forge combo (§7 #3). Transparent-overlay export (§7 #5).

**Rough total A–B: 46–66 human work hours** (v3 adds the brand kit, the
importer + tutorial and puppet slots).

---

## 7. Ideas — status after Ak's answers (20 Oct)

| # | Idea | Status |
|---|---|---|
| 1 | Puppets + explainer together | **First draft** — empty slots + explainer as background (§3) |
| 2 | **Style creator** | Yes, later. User describes a look → app writes a new style card in the atlas format + picks the closest existing reference → model (or "Hand to Claude") builds hero frame + explainer + sound → checks → it joins the gallery as "Experimental — made by you". |
| 3 | **Manga (#41)** | Later, as a **forge combo** (Ak): Image Forge makes the characters/scenes as ink pictures; Video Forge lays them into panels with screentone, speed lines and balloons in code. Same combo can serve other picture-heavy looks later. |
| 4 | Sound effects | **Solved without GPU:** the atlas SOUND kit synthesises effects in the browser. (Black Friday AI machine still useful for voices/images.) |
| 5 | See-through overlay export | Future. Means: a video with no background, so it can be laid over other footage (e.g. over a puppet video or in another editor). |
| 6 | Captions/chapters/thumbnails | **Now** (Phase B5). |
| 7 | Same script in N styles | **As a 4-image storyboard**, not videos: every frame is a function of time, so seek to 4 key beats per style and save stills. Cheap. Part of B4. |
