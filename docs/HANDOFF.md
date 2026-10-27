# Handoff — updated 27 Oct 2026

Everything a fresh session needs. `PLAN.md` holds the long history; this is the
working state. Newest sections first. Plans: `docs/V2-PLAN.md` (Video Forge),
`docs/FORGES-PLAN.md` (both apps; has a Status section at the bottom).

## Ultra plan — 25–26 Oct 2026 (plan only, nothing built)

Both forges checked end to end; Ak chose the scope on 26 Oct:
[FORGES-ULTRA-PLAN.md](FORGES-ULTRA-PLAN.md) (v2: phases with effort levels,
the puppet library on the Google credit, review rules, motion library, the
new 128 GB mini PC). Evidence: [research/ultra-2026-10-25/](research/ultra-2026-10-25/).
Phase 0 done 26 Oct: WIP committed + pushed, licence removed (UNLICENSED, both forges), nelly/ ignored, puppet-run copied to minipc ~/backups/puppet-run.
Phase 1 done 26 Oct (HIGH):
- Puppet foundations live in Image Forge (`src/lib/puppet`): facts sheet,
  strictest vote, free pixel checks, every try recorded.
- The credit-run scripts live in [tools/puppets/](../tools/puppets/README.md).
- Pilot: 14 base pictures in `puppet-run/pilot/` (index.html = the choosing
  page), waiting for Ak's picks.
- Video Forge safety branch merged (see "Phase 1 safety branch" below):
  150 tests, tsc clean, real window checked. The close prompt, Stop, the
  paid-voice dialog and path refusals on real files are not yet seen
  running.
- The new checks are not yet wired to batch pictures (needed before the
  credit run).
- Nano Banana 2.1's batch price is not yet confirmed.

Phase 2, 26 Oct (MEDIUM):
- Bulk checks: `tools/puppets/check.mjs`. The full panel is slow and the
  free checkers are flaky (the OpenRouter VL timed out, NVIDIA Omni was
  overloaded).
- Import: `to-workshop.mjs`. All 25 Oct puppets are in Image Forge's review
  as `<slug>-nb21-head|full`: 26 puppets, pixel-checked only.
- Blip is not imported: its front parts came from an earlier run.
- Review workbench (Image Forge, Made → Review): seen working on a real
  imported puppet.
- ELI5 help on everything in both apps, enforced by coverage tests.
- Flow job file: an Image Forge menu item, `tools/puppets/flow-export.mjs`,
  and extension v1.1.0 (C:/Users/strav/Documents/flow). Not tried on the
  live Flow page (needs a login).
- New-look A/B page: `docs/design/new-look-ab.html`.
- Not done:
  - #7 render proof (needs Ak's OK for a render);
  - tuning the checks on Ak's ✓/✗ marks (needs his first reviews);
  - Nano Banana 2.1's batch price.

Render proof (#7), 26 Oct:
- Explainer: "near perfect" (Ak); well-timed sound effects would make it 100%.
- Puppet lesson (101.1): renders on the GPU (NVENC; frames via the
  complete Playwright headless shell, set to the NVIDIA card in Windows by
  Ak). 7m25s took 13.2 min.
- Open bugs:
  (1) subtitles wrong in the first 30 s (Ak);
  (2) the outro join stamps its last frames at 54 min, so the file reads
      54 min long / 806 MB;
  (3) explainer sound effects.

26 Oct evening:
- Installed for Ak: Image Forge 1.1.0 and Video Forge 0.2.0.
- Subtitle paging fixed (sentences, even pages, no dangling little words, no
  blinks between pages); outro join timescale fixed.
- "B" layout built for Puppet video (App.tsx + canvas/TimelineStrip.tsx +
  forge.css):
  - steps down the left, with the open step in place;
  - the preview always on the right;
  - the timeline strip under the preview;
  - Many videos as a mode button;
  - the column folds to its numbers.
- Checked at 1440×900 and 1280×720 with lesson 101.1 data, and installed.

Explainer in the B layout too (26 Oct, late): Style/Script/Look/Make down the left (ui/StepColumn.tsx, shared with the puppet screen), live preview filling the right with a strip of scenes + narration words. Installed.
BUILD ORDER (Ak, 26 Oct: "I do not want to choose sequence"). Claude decides the order; Ak switches the effort level when told.
1. MEDIUM, batch 1: DONE 27 Oct (0.3.0).
   - Many videos screen; undo/redo + Recent + New project (#18); hear before
     render (#16: play any line or character, remake one line); Explainer
     sound effects; transparent header logos (both apps).
   - Seen in a test copy: undo/redo on the cast, sound effects section, adding
     speakers. NOT seen: saving through the real Save window then Recent; a
     line remake with a real voice; the sound effects by ear.
   - #23: pull requests open, NOT merged (merging needs Ak — the permission
     system blocks Claude merging without review):
     DnD-World/Video-Forge#9 and Stravelakis/image-forge#11. Release gate:
     no tag (CHANGELOG entries, audit, docs site, Lighthouse, smoke test,
     media refresh not done).
   - Installers built: Video Forge Setup 0.3.0, Image Forge Setup 1.1.1. The
     Image Forge silent install hung (a hidden "Image Forge Setup" window);
     Video Forge 0.3.0 installs after it. Ak to look at that window.
2. HIGH, batch 2: BUILT 27 Oct (on dramabox-knobs-and-chatterbox-removal-rlrwzu,
   backed up to origin as batch2-motion; not in PR #9).
   - #48 motion library core (aed9eab, b839fbf): moves are data
     (characters/core/moves.mjs, 21 starter moves in characters/moves/shelf.mjs),
     8 styles, hand shapes, props (cup, box, chair…), script tags
     ([walks in], [sits down], [gives the box to Maria]) drive drawn
     characters in the preview and the render; picture puppets slide in/out;
     sound-bar rings follow. Proof: npm run moves:sheet (real canvas),
     characters/samples/moves.html. Seen frame by frame in a test copy.
     NOT seen: a full render with moves (needs Ak's OK to render).
   - #13 core (2917198): one character, two forms — Kind switch (picture
     puppet / drawn, both kept), who they are, personality, subjects, 24
     prepared drawn characters, "Order a puppet of this character" (opens the
     Image Forge order filled in). formOf() is the one rule for which form
     shows. NOT built yet (Phase 5 Characters screen): the AI "describe it"
     and "drawn version of this puppet" buttons — the logic (cardDiff,
     applyDiff, readPuppetPick) is built and tested; the test copy has no keys.
   - #49 (dedc76c): (a) puppets share walk-in/out; (b) a picture puppet cut
     into limbs moved by the skeleton (characters/experiments/cutout.mjs) and
     (c) a puppet head on a drawn body. A/B sheet: tools/mixing-sheet.mjs →
     characters/checks/mixing-nikos.png (ignored folder: Nikos is private).
     Ak judges B and C before going further.
   - Known small faults for Phase 5: Dad preset's stubble draws as a white
     patch; the Mentor's robe reads like a shield; thumbs on the stick-figure
     look are faint; a seated drawn character facing the camera still reads
     weakly; a picture puppet can't hold props yet.
   - 27 Oct evening: PRs #9 (Video Forge) and #11 (Image Forge) MERGED (Ak's
     go-ahead; Image Forge CI moved to Node 22 first). Both apps installed
     (0.3.0 / 1.1.1). Review page for #49 B/C sent to Ak:
     node tools/review-mixing.mjs → characters/checks/review-nikos.html.
   - NEXT VERSION (Ak, 27 Oct): better installer pictures in both apps —
     promote our things and show what is being installed (electron-builder
     NSIS installerSidebar 164×314 / installerHeader 150×57 images, a
     welcome/finish page showing the app's screens and the sister Forge).
3. MEDIUM: variety. Looks (beards, shoes, 3 shadow looks), wardrobe, free media, emoji pop-ups, Image Forge in the same layout, the rest of Phase 5.
4. HIGH: #43 timeline.

Waiting on something else:
- check tuning (Ak's ✓/✗ marks);
- the mini PC (6a/6b);
- the credit run (Phase 3), only when Ak says.

Test recipe: run a test copy on a scratch data folder with VIDEOFORGE_USER_DATA, and open DevTools with --remote-debugging-port.
- Close it with CDP Browser.close; killing processes is not allowed.
- Seed lesson 101.1 data through the localStorage key byok-project.
- Install silently: the Setup exe with /S, once Ak's apps are closed.
Top risk: Google credit ends before Christmas.

## Phase 1 safety fixes — branch `phase1-vf-safety` (not merged, not pushed)

From `docs/research/ultra-2026-10-25/audit-video-forge.md`: H1–H8, M1, M7.
What changed that you can feel:

- **The window can only touch what it was given.** Files it may read/write are
  the app's own folders plus files you picked in an Open/Save dialog
  (`electron/security/pathGuard.ts`; Open picks are remembered in
  `picked-files.json` in the data folder). A project that points at a file
  outside those (picked before this change) needs that file picked again.
- **Window hardening:** sandboxed, content policy in the built page, can't
  navigate away, web links only. The preload is now `preload.cjs`.
- **Paid ElevenLabs voice:** a dialog shows characters + estimated USD before
  anything is bought; Settings has Paid voices (price, allow in batches —
  OFF —, cap). `--job` files need `"allowPaidVoices": true` (and optionally
  `"maxPaidCredits"`) to buy ElevenLabs lines; lessons built from
  `lessonDir` buy nothing. Bought lines are kept in `renders/eleven-lines/`.
- **Closing during a render asks first; Stop button on a render.**
- **Key vault:** atomic saves, `byok.secrets.enc.bak`, refuses to overwrite a
  file it cannot read.
- **Downloads** go to `.part` and are renamed only when whole.
- **Save project** file version 2 keeps music, SFX, backgrounds, logo, cards.
- Not exercised by running the real app: the close prompt, the dialogs, the
  Stop button, and the path checks on real files (tests + a sandboxed-window
  smoke run only).

## Drawn characters — 24–25 Oct 2026 (foundations built, medium phase next)

Characters drawn by code, as a third kind of speaker (card JSON → any of 20
looks, front / 3/4 / side, 34 wardrobe items, lip-sync from the narration's
existing signals). How it works: [characters/README.md](../characters/README.md).
Plan, Ak's verdicts on the looks, and what each effort level does:
[CHARACTER-BUILDER-PLAN.md](CHARACTER-BUILDER-PLAN.md).

- Built (high effort): engine `characters/core/`, `CharacterAvatar` in the
  preview and the Remotion composition, `speaker.character` through the render
  bar, batch jobs and renderVideo, AI helper core (`window.byok.characters`),
  checks (`npm run test:characters`, `npm run characters:check`).
- Seen working: all 20 looks on a real canvas (identical twice, fast), the
  preview in the real app with three drawn speakers, the AI helper live (Groq
  from a description, Gemini 3.5 Flash from a picture).
- **Not seen yet: a full render with a drawn character** — Remotion's headless
  browser can't start from the build session's sandbox. Try a Draft render
  once the form can pick a character.
- Not committed (Ak commits after the medium phase).
- Next (medium): the form, finishing the looks (Karagiozis traditional, Greek
  vase clothing), wardrobe catalogue, Pixabay/Pexels, pop-ups, docs.

## Puppets with Nano Banana 2.1 — 23–25 Oct 2026 (pictures made, not yet in Image Forge)

All pictures are made by Vertex batch (tier-1-emf credit): bases, 3/4 views and
every part for Alex, Nikos (Greek now), Yiayia Eleni, Maria, Elena (chibi),
Lucky, Captain Stavros, Bolt (head only), Grump (back to the old look), Blip
(3/4), and the private five (Kaiti, Tsika, Serifis, Maya, Nelly on four legs).
Files: `puppet-run/nb21/raw/` (bases/, parts/ — 784 parts, background still on;
key colour per puppet in `scripts/bases.json`), `puppet-run/nb21/scripts/` (the
batch scripts and every prompt used), `puppet-run/nb21/bases.html` (bases review). Next (medium): the parts review page,
then load into Image Forge (old puppets backed up), private five to a private
folder only. Lips only on Maria, Nikos, Kaiti.

## Explainers — 20–21 Oct 2026 (new kind of video, built)

Animated explainers drawn by code, as their own mode in the app (top right:
**Puppet video | Explainer**). How to use and where everything is:
[explainer/README.md](../explainer/README.md). Plan: [EXPLAINER-PLAN.md](EXPLAINER-PLAN.md).

| Done | Proof (21 Oct 2026) |
|---|---|
| Built-in style "Mint Meander" (Stravelakis: Sora, navy, mint, Truchet tiles, half-circle waves), 3 schemes + custom colours, tint, 11 offline fonts + any Google Font, Greek via Inter | `npm run explainer:check` — 20 shape × puppet × scheme runs pass; Greek, custom colours, Google font + sepia checked by eye |
| Explainer screen in the app: style, shape, puppets, live preview, write scenes with a saved key, check, storyboard, render + extras | driven in the real app over CDP: Groq wrote a Greek scene list, check passed 110 frames, render made MP4 + GIF + thumbnails + chapters |
| Import a style from the AI Style Atlas (how-to inside), "Hand to Claude", load page, render with tint | Ak's two styles (#78 Sketchbook Graphite, #86 Multi-scale Truchet) imported into Ak's install; a test page loaded, checked, rendered sepia; model-written pages proven cut off from the internet |
| Puppets on top: explainer leaves spots empty; puppet Look → Background → **Use an explainer** moves faces into them | spot maps read back correctly; button present (its file dialog not clickable in tests) |
| 1:1 and 4:5 across the app (shape buttons, Instagram-feed preset, preview, backgrounds, batch sheet) | `tsc` clean, 78 tests pass |
| Model bake-off on lesson 102.1 (Greek) | `explainer/checks/bakeoff/bakeoff.html` — Gemini 3.5 Flash best Greek (often overloaded), GPT-OSS 120B clean but adds a step, Qwen 3.8 faithful but scattered. Groq default order: GPT-OSS, then Qwen |

Fixed along the way (not explainer work): `[data-tip] { position: relative }`
had made the puppet screen's Next button a full-width block that pushed the
preview off the stage since 13 Oct; now `:where([data-tip])`.

Open: Ak's taste review of the look and the bake-off; security/stability/code
review (Ak: high effort); then docs + UI tour update for the whole app (medium).
Seen but not touched: in the puppet preview the "9:16 · 24 FPS · 1080×1920"
label overlaps the sample subtitle text.
Puppet long run is PAUSED (LocalAI off) — resume with `puppet-run/resume-run.cmd`.

## Current state — 13 Oct 2026, evening

**What it is now:** a four-step maker — Cast → Script → Look → Make — with
Settings behind a gear. Voices: Gemini Live (default), DramaBox, Piper, Fish,
ElevenLabs. Render engine: HyperFrames by default. Paired with Image Forge
(shared keys, shared puppet shelf).

### Built on 13 Oct (all verified in source; branch `dramabox-knobs-and-chatterbox-removal-rlrwzu`, not merged)

| Area | What | Where |
|---|---|---|
| Cast "+" menu | Every character has a live face (blinks; talks on hover). Groups: Ready-made / Made in Image Forge / My library. "Order it from Image Forge" and "Open Image Forge" | `src/components/panels/CastPanel.tsx`, `PuppetShelf.tsx` |
| Shelf | Live faces; two-click delete. Deleted puppets are moved to `%APPDATA%\Forge\puppets-deleted`, not erased | `tools/lib/forgeShelf.mjs`, `electron/main.ts` |
| Hands | Arm pictures are now loaded (they never were). Whole-body poses (`posesReplaceBody`) replace the resting body. Automatic gestures: a question = shrug; "this / here / look / αυτό / εδώ / κοίτα" = point; longer lines = explain. Per-speaker **How much they gesture** slider (0 = none). Tags `[waves] [points] [shrugs] [explains]` still work | `src/components/canvas/PuppetAvatar.tsx`, `src/lib/motion/facePerformance.ts`, `src/store/puppetTypes.ts` |
| Mouths | Shapes held about 100 ms; look-alikes merged in fast speech; quick consonants skipped; short vowels half-open; half-open in-betweens (visemes 10, 11, 12) between open shapes, closing only on real pauses. Puppets without half shapes fall back to the full ones | `src/lib/visemes/timeline.ts` |
| Render | Frame thickness and gestures now reach the final render | `electron/render/renderVideo.ts`, `remotion/` |
| Preview | Boiling waveform shows (SVG id clash fixed). Sample subtitles alternate Greek/English until narration exists | `src/components/canvas/` |
| Make → Also as | Tall 9:16 · Square 1:1 · Portrait 4:5 · Wide 16:9, one after another | `src/components/render/RenderBar.tsx` |
| Make → Also in English/Greek | Twin video: script translated by Gemini, same cast, matching subtitles | `electron/tts/twinNarration.ts` |
| Make → Made with Video Forge | Label on the picture, on by default, also written into the MP4's comment metadata. Also applies to Many videos | `remotion/AiBadge.tsx`, `renderVideo.ts` |
| Subtitle files | `.srt` and `.vtt` beside every video | `renderVideo.ts` |
| Greek stress fixer | Greek words typed without a tonos get one before the voice speaks. Spoken only; subtitles unchanged. Settings → **Say it like this** list is applied to every voice (`pronunciations.json` in userData) | `electron/tts/greekAccents*.ts`, `pronunciations.ts`, `src/components/settings/SayItCard.tsx` |
| Settings → Language | Card: English now; Greek, French, German, Spanish, Portuguese "coming soon" (simple words only). Replaces the full Greek interface idea (FORGES-PLAN O-1) for now | `SayItCard.tsx` |
| Hover help | One bubble over everything, stays open for its link; `title=` becomes a bubble too. Shared with Image Forge | `src/components/ui/TipLayer.tsx`, `tools/lib/hoverHelp.mjs` |
| Buttons | Primary buttons readable (lighter gradient) | |
| Many videos | Output folder is `<sheet> · <date> · <n> videos` | `src/components/render/ManyVideos.tsx` |
| Shared keys | Shared keys file now also carries `openai`, `groq`, `elevenlabs`, `fish` names | `tools/lib/forgeKeys.mjs` |

### How to test

- `npm test` — 10 test files, including `tools/lib/hoverHelp.test.mjs`, which fails on any click control without a hover tip.
- `npm run typecheck`, then `npm run dev` and open the app.
- By hand: Cast → "+" (faces move on hover) · Script with `Καίτη: Τι είναι αυτό;` (shrug, then point) · Make → tick Square + "Also in English" → Render → find `.mp4`, `.srt`, `.vtt` together; `ffprobe` the MP4 for the AI comment.
- One render at a time: two renders (or a render and the open app) collide on localhost:3001.

### What's next

- Merge the branch; tag after the release gate in the standards (README, HANDOFF, CHANGELOG, audit, gitleaks).
- Template gallery: lesson, news desk, podcast, promo (A2 in V2-PLAN).
- Not yet: AI cut-out model for puppet backgrounds (colour key plus spill cleaning is used instead); 3/4 two-person set (P-7); legs (P-8); real Greek interface (O-1); Social Forge / Content Forge prep.
- Public copy and licence file: see V2-PLAN open risks.
- Open on the mini PC: LocalAI still listens on every network until `.localai-lockdown.sh` is run.

---


## Keys shared with Image Forge — 12 Oct 2026

Gemini, OpenRouter, NVIDIA (and Mistral, Cloudflare, Pollinations for Image
Forge) are shared between the two apps through one file only this Windows user
can read: `%APPDATA%/Forge/shared-keys.bin`, locked with Windows' DPAPI via
PowerShell (stdin, never the command line). Code: `tools/lib/forgeKeys.mjs`
(identical copy in Image Forge as `electron/forgeKeys.mjs`), used by
`electron/keyStore.ts`: reading prefers the shared copy (cached 30 s), saving
or deleting writes both, and `syncShared()` at start-up hands over keys the
file lacks. Tested end to end on 12 Oct: Image Forge filled Gemini and NVIDIA
from Video Forge by itself. Full status of the V2 work: `docs/V2-PLAN.md`.

## Many videos from a sheet — 13 Oct 2026

Make → **Many videos** (`src/components/render/ManyVideos.tsx`): a Google
Sheet link (shared "anyone with the link"; read as CSV through Google's export
address — `electron/batch/sheet.ts`, tested) or a CSV path. Check all matches
each row's script to the cast; Make all runs `runBatchJob` in-process, one at a
time (`electron/batch/manyVideos.ts`), with this project's cast and look as a
preset. Output: `<output>/many/<run>/<name>.mp4`.

Also this day: Cast "+" menu (ready-made / create new → order form), Cast
section "Puppet" with frame thickness (`frameWidth`, px on 1080), waveform
default around the face, position "around the video" (`frameEdgeAt`) for every
style, distinct particles/sparks/bloom, a pretend voice for empty previews,
window-wide hover help (`TipLayer`), Settings without Appearance, LocalAI card.

## Puppets from Image Forge — 12–13 Oct 2026

Image Forge's puppet maker makes Forge puppets (method: Image Forge
`docs/puppet-recipe.md`). They arrive on the **Forge shelf**,
`%APPDATA%/Forge/puppets/<slug>/<slug>.rig.json`, shared through
`tools/lib/forgeShelf.mjs` (identical copy in Image Forge). In the app:
Cast → Look → **Puppets from Image Forge** (click a face to use it) and
**Order a new puppet…** (description, style, framing, up to 3 inspiration
pictures, "make it without me"); the order opens Image Forge, which makes it
and puts it on the shelf. Component: `src/components/panels/PuppetShelf.tsx`.

The puppet format gained `poses` (arm layers over the body). New in the face
engine (`src/lib/motion/facePerformance.ts`): head gesture `nod` (`[nods]`,
spoken yes/ναι) and `shake` for `[shakes head]`/no/όχι; arm poses from
`[waves] [points] [shrugs] [explains]` and opening greetings
(`buildSpeakerPoseTracks`, `poseAt`; drawn in `PuppetAvatar` under the neck).
In-app narration now keeps the line's tags (`mood`, `tags`) — before, they
were stripped and `[laughs]` never reached the face outside course lessons.

Verified 13 Oct: Hoolio (owl, made in Image Forge) chosen from the shelf for
Καίτη in a test copy, and lip-synced in the preview.

## Renamed: Video Forge (9 Oct 2026)

The app was called BYOK-Vid-Creator; it is now **Video Forge** (package `video-forge`, appId `com.stravelakis.videoforge`, repo https://github.com/DnD-World/Video-Forge). The folder on disk is still `BYOK-Vid-Creator` (not renamed, so absolute paths in `jobs/` keep working).

- **Saved data:** fresh installs use `%APPDATA%ideo-forge`. A computer that already has `%APPDATA%yok-vid-creator` (this laptop, 35 GB) keeps using it in place — no copy, no move (`electron/migrateUserData.ts`, tested by `npm test`).
- **Kept on purpose, so nothing saved breaks:** `window.byok` (internal bridge name), localStorage keys `byok-*`, project file kind `byok-project` / `.byokproj.json`, vault file `byok.secrets.enc`.
- **Env vars:** `VIDEOFORGE_SECRETS_DIR` and `VIDEOFORGE_VERTEX_PROJECT` are read first; the old `BYOK_SECRETS_DIR` / `BYOK_VERTEX_PROJECT` still work.
- **Log lines** are now tagged `[video-forge]` (were `[byok]`).
- The old live-site address `BYOK-Vid-Creator.stravelakis.com` is gone from the README; no new address has been set.

## What this project is

Two LMS courses of lesson videos, Greek, 3–8 minutes each. Dog training first
(**23 lessons → 72 sub-lesson videos**, plus 18 handouts that are not video),
professional soft skills second. Same material also cut for social, so a project
must come out in more than one orientation.

Three characters: **Καίτη** (human), **Σερίφης** (serious dog), **Τσίκα**
(chihuahua). Voice briefs in `docs/CHARACTER-VOICES.md`. Since 9 Oct 2026 they
live in the Skilitsa brand pack — see below.

---

## Brand packs — 9 Oct 2026 (cloud session)

**Ak's decision, 9 Oct 2026: two versions of the app.**

| Version | For | How |
|---|---|---|
| Skilitsa | Ak's own course work, on the laptop | brand pack switched on (`npm run brand -- skilitsa`) — characters, sample, clips all present |
| Public | to publish for other creators | brand pack off, and `brands/skilitsa/` left out of the published copy |

Cloud sessions are stopped — too costly for what they can reach. All further
work happens on the laptop. First job there: switch Skilitsa on, run the
"Check on the laptop" list below, then decide how the public copy is made
(separate repository, or an installer build that leaves `brands/` out).

**The app no longer carries Skilitsa.** Everything that was the course's —
the three characters, intro/outro clips, banners, logo, the 1xx–5xx presets,
the sample project, the Image Forge picture lists — now lives in
`brands/skilitsa/`. A fresh install shows no characters and no sample. This
laptop gets them back with one command:

```bash
npm run brand -- skilitsa      # once, then restart the app
```

How it works: [BRAND-PACKS.md](BRAND-PACKS.md). Making a new character:
[PUPPET-MAKING.md](PUPPET-MAKING.md). What moved where:
`brands/skilitsa/README.md`.

### Left where it was, on purpose

`jobs/` (series queues and templates), `projects/`, `scripts/`,
`dramabox-audition/`, `sfx/wanted.csv`, `inspiration looks/`. The queues keep
their progress in `jobs/*.queue.state.json` beside them; moving them while the
series is unfinished would re-render finished lessons. **Move them into the
pack after the 5xx series is done.** Every path inside them already points at
the new locations.

### Check on the laptop — the cloud could not

The cloud session has no GPU, no speech engines, no `lms` folder and no
`viseme/` art, so none of this was run for real. Tests (18) and typecheck pass,
and the app builds.

| # | Do | Expect |
|---|---|---|
| 1 | `git pull`, then `npm run brand -- skilitsa` | "Brand pack on: Skilitsa" |
| 2 | Look in `Intros/`, `outros/`, `banners/`, `puppet/` at the top level | Only files git never tracked are left. Move any you want into the matching `brands/skilitsa/` folder; delete the rest |
| 3 | Open the app → Presets → **Load Dogs & Butterflies** | Three faces, Greek script — same as before |
| 4 | Same, after `npm run brand -- off` and a restart | No sample section; Cast panel works with blank speakers |
| 5 | `npm run job -- jobs/lms-smoke.json` | Renders as before (intro clip, logo, rig puppets found at the new paths) |
| 6 | `npm run outros` (dry run) | Lists lessons and outros as before |
| 7 | A job using `*.puppet.json` (e.g. `jobs/smoke.json`) | Faces still draw — they read art from top-level `viseme/` via `../../../viseme` |
| 8 | `npm run build-exe`, if the exe is used | Installed app opens with Skilitsa (copied `brand.local.json`) |

Nothing here is hard to undo: `npm run brand -- off/skilitsa` flips it, and the
whole change is one commit to revert.

**Laptop results, 9 Oct 2026:** Skilitsa is ON.

| # | Result |
|---|---|
| 1 | Pass — "Brand pack on: Skilitsa"; tests 18/18, typecheck clean |
| 2 | Pass — `Intros/`, `outros/`, `banners/` gone; `puppet/` holds only its README |
| 3 | Pass — app opened, Load Dogs & Butterflies loaded, three faces drawn (screenshot seen) |
| 4 | Pass — brand off: no sample offered. Speakers still listed = this PC's saved project, not the pack |
| 5, 7 | Not run — renders; waiting for Ak's yes |
| 6 | Pass after `npm run build` — 70 lessons listed, all already have outros. **Gotcha:** `npm run outros/job` run the compiled copy in `out/`; rebuild after every pull |
| 8 | Not run — waiting for Ak |

---

## The pipeline, end to end

Script → narration → background clips → render → MP4. All of it works.

```bash
npm run job -- jobs/smoke.json          # 27s, no backgrounds, ~30 seconds
npm run job -- jobs/glass-test.json     # with stock footage
npm run job -- jobs/ribbon-test.json    # one waveform style, judged alone
```

A job can set `waveformStyle` and `outlineShape` for the whole cast, and both
**throw on an unknown name**. Comparing looks used to mean editing a preset in
source, which is how four "different" renders came out identical.

`electron/batch/runJob.ts` is the headless runner. It calls the same functions
the UI calls, in the same order — if a headless render and a clicked render ever
disagree, that is a bug, not a variant.

### Measured, not estimated

| | |
|---|---|
| 8m50s render, end to end | **21 min** (narration 3.1, planning 1.5, clips 1.2, render 14.5) |
| Production cost | ~2.5× the finished video's runtime |
| Whole dog course (~3.6 h of video) | **~8.6 h of rendering**, ~1 h of narration |
| CRF 23 | 668 MB → about a sixth |

**Rendering is the bottleneck by a factor of ten.** Narration is the cheap part.

---

## Voices — DramaBox

**Decided and proven.** Chatterbox was tried, rejected, and removed from the
code on 18 Aug 2026 — two engines, not three.

- Open weights, Resemble AI. **Prompt-driven**: stage directions control the
  acting and never appear in the audio.
- **Will not run locally** — ~24 GB VRAM against an 8 GB laptop 3070.
- Runs on a **GCP L4** (24 GB, the cheapest card that clears it).
  Measured: **8.5 s per generation**, ~3.4× slower than the documented H100.
- **Greek is not a documented language** — the official docs say English only —
  **and it works.** Auditioned by ear, then used for the whole of lesson 101.1.
  Piper remains the fallback: correct and flat.
- **Noises must be spelled the English way.** `Χαχαχα` produced no laugh at all
  in a finished lesson; `Hahaha` does. The subtitle shows the Greek.

### The instance

`dramabox-smoke`, `us-east1-c`, `g2-standard-8`. **Currently TERMINATED.**
us-central1 was stocked out in all three zones; L4 capacity fluctuates.

```bash
gcloud compute instances list --project=tier-1-ak      # TERMINATED = not billing
powershell -ExecutionPolicy Bypass -File tools/gpu-light.ps1   # red/green widget
```

**Ak's standing rule: turn it off as the last step of the work, every time.**
Set `sudo shutdown -h +N` on the box before anything long, so it dies even if the
session ends.

Setup is `tools/dramabox-vm-setup.sh`; the Greek test is
`tools/dramabox-greek-test.py`. **The repo's own README example cannot work** —
it falls back to filenames from Resemble's machine. The real mapping:

```
checkpoint      → dramabox-dit-v1.safetensors
full_checkpoint → dramabox-audio-components.safetensors
gemma_root      → unsloth/gemma-3-12b-it-bnb-4bit, read from $GEMMA_DIR
```

### The clips exist — unblocked 17 Aug 2026

`voice-refs/` holds `kaiti.wav`, `serifis.wav`, `tsika.wav` and a fourth,
`kaiti-babytalk.wav`, for the voice she uses on Τσίκα. Spec in
`docs/HANDOFF-VOICE-CLIPS.md`. Rule: **record the voice, not the mood** — timbre
comes from the clip, acting from the prompt.

Lesson 101.1 was narrated with them end to end: 24 blocks generated, forced
aligned, word times remapped through the silence cuts, rendered.

### Every knob is reachable — 18 Aug 2026

The engine's settings used to be literals inside `tools/dramabox-render-blocks.py`,
which meant one setting for the whole cast. They are now **per character and per
block**:

| Where | How |
|---|---|
| `src/lib/narration/dramaboxParams.ts` | The one list. The Cast panel builds its controls from it, so a knob added here appears in the app. |
| Cast panel → "DramaBox — this voice" | Thirteen controls, plus the reference clip and opening phrase. |
| `[VOICE: acting=2.4 pace=0.9]` in a script | That block only. Beats the character's setting. |
| Narration panel → "Write DramaBox files…" | Writes `blocks.json` and `align.json` from the current project. |
| `tools/make-blocks.mjs job.json` | The same, from a job file. Shares `buildBlocks.ts` with the button. |

**Watermark is OFF** (18 Aug 2026). Resemble Perth is inaudible and carries no
custom payload — it cannot say the audio is ours, so it has nothing to do for us.

**Said in English, shown in Greek.** Laughs only fire from English spellings
(`Hahaha`), so the script carries those and the subtitle shows «Χαχαχα».
`src/lib/narration/displayText.ts`; the aligner is given the spoken form.

### The voices are settled — 19 Aug 2026

Auditioned by ear from fifteen takes (`dramabox-audition/settings/`): three
characters against five settings, same line, same seed, same clip.

| Character | Setting | What it is |
|---|---|---|
| Καίτη | acting 1.5, **pace 0.85** | Same acting, less time for the words. She tumbles over them. |
| Σερίφης | acting 1.5, pace 1.0 | The defaults, over both the bigger and the faster takes. |
| Τσίκα | acting 1.5, pace 1.0 | The defaults. Her speed is a WRITING device, not a setting. |

Measured on the way: pace is real. The same words came out at 12s, 10s and 14s
from Καίτη at 1.0, 0.85 and 1.15 — a 40% spread.

These live on the built-in cast, so adding Καίτη from the Characters row brings
her voice with her: opening phrase, reference clip and settings.

**`steps` is not a parameter of this engine.** It is a command-line flag in the
README and `generate()` rejects it. Fifteen generations failed on it once.

**The app may add expression a script was written without** — a flat "speaks"
lifted, a promised laugh spelled so it is actually heard. Off unless asked for,
and every change is printed before anything is generated.

---

## Waveforms — done this session

All six chosen from `tools/waveform-lab.html` now render, and all six are in
the picker:

| Style | What it is |
|---|---|
| `boil` | Bubbles swelling where they start, gradient per slice |
| `particles` | Bars plus a corona thrown on consonants |
| `sparks` | No bars, scattered embers, random headings |
| `bloomBars` | Bar ring with a glow that scales with the moment |
| `ribbon` | Wide two-sided band, a colour per face, twisting on the boil |

`WAVEFORM_STYLES` in `src/store/types.ts` is the one list — the union, the
picker and the headless runner all read it. Four styles rendered correctly for
a week and none appeared in the picker, because the union was extended and
`WaveformControls` was not.

The ribbon's twist is its **width**: the offset from the spine is the signed
cosine of the twist phase, so at a pinch it crosses zero, the edges swap sides
and the visible face flips. Use the absolute value and you get a waist, not a
turn. Its width does not follow the superellipse even though its spine does — a
ribbon's width belongs to the ribbon, not to where it happens to be.

**All shape-aware.** `src/lib/waveform/superellipse.ts` gives circle, rounded
square and square from one exponent, taken from the speaker's `outlineShape`.

**The rule that shapes all of it:** Remotion renders frames out of order and in
parallel, so nothing may accumulate. Every particle is computed from its birth
time (`src/lib/waveform/emitters.ts`). Randomness is a hash of the particle's
index, never `Math.random()`.

Two things learned the hard way: `moment` is the whole mix and the same object
for every track, so `active` is the only thing that knows whose turn it is — and
it must gate the **swell**, not just the colour. And SVG arcs are circles by
definition, so a superellipse drawn with arcs stays round.

---

## ElevenLabs — the paid voice, added 20 Aug 2026

It was on the cut list as "stubs only, don't build" and came back, with the code
in the same change. Chosen per character in the Cast panel, alongside DramaBox
and Piper.

**What it costs, measured rather than guessed.** Lesson 101.1 is **4,640
characters** of Greek, and a credit is a character:

| | |
|---|---|
| 72 lessons | 334,080 credits |
| Creator, $22/mo | 121,000 — about **26 lessons a month** |
| Pro, $99/mo | 600,000 — the course plus ~1.8× of re-renders |
| DramaBox, same course | about **$5** of rented card |

**Every re-render spends it again.** The GPU charges only more minutes. Two
months of Creator is 242,000 and leaves the course twenty lessons short — the
question Ak asked, and the answer is no.

**Raw PCM, not MP3.** The app's analysis reads 16-bit PCM — it is what moves a
waveform, loops a music bed and feeds the aligner. The API is asked for
`pcm_44100` and `elevenlabsEngine.ts` writes the WAV header itself, because the
response is bare samples with no container. An MP3 would play and analyse as
silence.

**The voice id and its settings are in the narration cache key.** Changing a
voice changes every sample and not one character of the script, so a key without
them would serve the old audio for the new voice and the change would look like
it did nothing. That has happened twice in this project for other reasons.

Untested against the real API — there is no key saved yet. The key test in
Backend Settings reports the tier and how many lessons the remaining credits buy.

### v3 — the model that acts, added 20 Aug 2026

`eleven_v3` is now the default for any character set to ElevenLabs, chosen per
character in the Cast panel alongside `eleven_multilingual_v2`.

**The script does not change.** v3 takes its acting from a bracketed tag inside
the text; DramaBox takes the same instruction from the words outside the quotes.
So `src/lib/narration/elevenTags.ts` turns one into the other at the last moment
before synthesis:

```
A bright woman sighs heavily, "Ουφ, δεν την καταλαβαίνω."
                ↓
[sighs] Ουφ, δεν την καταλαβαίνω.
```

`segment.text` is untouched, so the subtitle never shows a tag and the aligner
is never asked to find one. **Measured on lesson 101.1: 48 spans, 42 tagged, and
the six that were not are directions a voice cannot perform** — `nods slowly`,
`claps her hands`. A body does those; no tag is the right answer, and a tag v3
cannot follow is either ignored or performed as a sound.

**Three things about v3 that are not true of v2**, each of which fails the whole
lesson at line one if got wrong:

| | |
|---|---|
| `stability` | Three values only — 0.0 Creative, 0.5 Natural, 1.0 Robust. Snapped, not passed through, so a slider at 0.35 does not 422. |
| `style`, `speed` | Do not exist. Speed is a direction: «slows right down». |
| Character limit | 5,000 per request against v2's 10,000. Irrelevant per line, fatal if anyone ever batches. |

**`pcm_44100` needs the Pro plan.** Documented, and it fails at request time on
anything cheaper — which on Creator is every line of every lesson. The engine
asks for 44.1k, and on a tier refusal retries once at 24k and says so in the
log. Nothing downstream cares about the rate as long as it is consistent: every
reader in `electron/audio` takes it from the WAV header. The key test now names
this at the moment the key is saved rather than leaving it to be found mid-lesson.

**Text-to-dialogue was looked at and rejected.** It takes the multi-speaker
`inputs[]` array — the shape a JSON-emitting script writer would produce — but
it caps at **2,000 characters across all inputs** (a lesson is 4,600) and returns
**one merged blob**, which destroys the per-line timing that subtitles, visemes
and the active-speaker gate are all built on. The per-line convert endpoint keeps
the architecture intact.

**The acting tags cost money.** Measured on 101.1: 4,597 characters of Greek plus
663 of tags — **+14.4%**. A lesson is ~5,260 credits on v3, not 4,640.

| | credits | at Creator (121k/mo) | at Pro (600k/mo) |
|---|---|---|---|
| One lesson | 5,260 | | |
| All 72 | **378,720** | 3.2 months, no re-renders | 0.63 of one month |
| One full re-render of the course | another 378,720 | | |

**Pro at $99 is the only plan that fits**, and it fits once with about 1.6
re-renders of headroom. Creator at $22 buys 23 lessons a month. DramaBox does the
same course for about $5 of rented card and charges only minutes for a re-render.

The in-app **Generate** button is still the Piper path. ElevenLabs runs from a
job file (`"engine": "elevenlabs"`, `"elevenModel": "eleven_v3"`) through
`npm run job`, which is how lessons are actually made.

## YouTube — scheduled publishing

Not a Premiere. **Decided 20 Aug 2026:** a video is uploaded private with a
`publishAt` time and becomes public at that moment. No countdown, no waiting
room, no live chat. A real Premiere needs a live broadcast created alongside the
video and is a different and more fragile piece of work; nothing about this
course needs one.

- `electron/net/youtube.ts` — refresh, resumable upload, read the status back.
  No SDK: three HTTP calls do not justify that dependency tree.
- `tools/youtube-auth.mjs` — **Ak runs this once**, in a browser. It writes
  the refresh token beside the client secret.

**Credentials live in `../SECRETS`, outside the repository**, and that is
deliberate: a secret inside a working tree is one `git add -A` away from being
published, and an ignore rule only holds for as long as nobody edits the ignore
file. `VIDEOFORGE_SECRETS_DIR` (old name `BYOK_SECRETS_DIR` still works) overrides the location. The client must be of type
**Desktop app** — a "Web application" client cannot complete a sign-in from a
program on your own machine, and the tool stops with that explanation rather
than failing later with something obscure.

### Proven end to end — 20 Aug 2026

Two real uploads to the channel **Lambros Stravelakis**: one private, one
private with a publish date of 1 Jan 2030. YouTube echoed both back. Delete them
whenever — they are `KtN3cdh1tCs` and `ezZ2Gese6lY`.

```bash
node tools/youtube-auth.mjs --check        # says which channel, or why not
node tools/youtube-upload.mjs video.mp4 --title "..." --publish-at 2026-09-01T10:00
```

**What cost the evening, so nobody repeats it:**

- A `cmd` window cuts a URL at its first `&`, and an OAuth URL is mostly
  ampersands. The browser got the client id and nothing else.
- `fetch` reports "fetch failed" and hides the reason in `e.cause`.
- Attaching `on("data")` to a file stream to measure upload progress CONSUMES
  it, and fetch then sends an empty body. The error says "content-length
  mismatch", which sounds like a header bug and is a stolen stream.
- A valid token proves nothing about a channel. The account may have none, or
  the channel may be a Brand account while the sign-in picked the person. Both
  refuse with the same word. `--check` now names the channel.

**Quota, checked against Google's own documentation:** a new project gets
**100 uploads a day**, on a separate allowance from the 10,000 units everything
else shares. Four hundred videos is four days, not two months.

**A scheduled video must be uploaded private.** Any other starting state and
YouTube ignores the schedule and publishes it the moment the upload finishes.
The uploader refuses that combination rather than discovering it from a
subscriber.

### Later: the websites write the videos

The intended shape, once the 72 lessons are made and the pipeline has earned
trust: point the app at a page on our own sites, have it read the page
(`electron/net/readPage.ts` already does this), draft a script from it, render,
and upload on a drip — one a day, for as long as there are pages. Four hundred
of them was the number discussed.

Two things are already in place for it: the page reader, which refuses to
invent a lesson from a page that came back empty, and `tools/run-queue.mjs`,
which renders a long list and survives failing in the middle. What is missing
is the step between them — turning a page into a script good enough to publish
without someone reading it first, which is a writing problem rather than a
programming one.

## The GPU round trip is one command — 20 Aug 2026

```bash
node tools/narrate-remote.mjs jobs/101.1.json jobs/101.2.json
node tools/narrate-remote.mjs --queue queue.json
```

Builds the blocks, starts the box (retrying while the zone is out of cards),
sends the lessons and the voice clips, generates, aligns, brings the audio back,
writes `dramaboxWavDir` and `dramaboxWordsPath` into each job file, and **stops
the machine**. A shutdown is also scheduled ON the box first, so the card dies
even if this is killed or the laptop sleeps. `--keep-running` opts out.

**One model load for the whole batch.** The generator takes a folder per lesson
and is given all of them at once; loading it seventy-two times would be over an
hour of rented card spent on nothing.

Then rendering is just `npm run job -- jobs/101.1.json`, or the whole list
through `tools/run-queue.mjs`.

## Open, in the order I would take them

1. **Audition the voice settings by ear.** The presets — "Bigger performance",
   "Fast and bright" — are plausible numbers nobody has listened to. One GPU
   session settles all three characters. **Ak only; I cannot judge audio.**
2. **Re-run four blocks of lesson 101.1.** Blocks 000, 003, 008 and 022 still
   say `Ουφ`, `Χεχε`, `Χαχαχα` and `Μμμμ` in Greek letters, which make no sound.
   The script is fixed; the audio is one revision behind it.
3. **Batch spreadsheet** — CSV → queue on the existing runner. One row per
   lesson; a row carries a finished script, a topic, or a URL.
4. **Render a series in one process.** 72 short videos pay bundle+browser startup
   72 times — about 50 minutes of pure setup.
5. **The GPU round trip is still by hand** — files up, run the script, WAVs
   back, run the aligner. The app writes the files now; nothing drives the box.
6. Narration-cache eviction; preview has no audio at all.

**Done 18 Aug 2026:** every engine knob reachable per character and per block;
the app writes `blocks.json` and `align.json` itself; English spellings shown as
Greek in subtitles; Chatterbox removed; and the render now names any setting it
was given but could not apply.

**Done before that:** the blink is a crossfade (it was a three-state step
function inside 3½ frames, which is what "a bit choppy" was); the `ribbon`
style; the four lab styles that had no way to be selected; generation per
speaker turn rather than per line; and forced alignment for word-level timing.

---

## Image Forge, once both are installed — decided 20 Sep 2026

[Image Forge](../../qwen%20image%20creator) is the sister app: bulk AI image
generation from a spreadsheet, same BYOK and local-first shape, already
shipping as an installed Windows app.

**They stay two apps.** No merge, no shared UI, no shared repository. The plan
is narrower: **game recognising game** — when both are installed on the same
computer, this app notices Image Forge is there and can ask it for pictures.

The favour runs one way: **this app asks the forge for the art the puppets are
made of** — viseme sheets, sprite sheets, turnarounds, expression sets, and
backgrounds — instead of someone generating files in one app and hand-placing
them here.

Why this is the seam, and not somewhere else:

- The puppets already eat exactly what the forge already makes. `tools/
  slice-grid.mjs`, `tools/build-viseme-sheet.mjs` and `tools/forge-to-sheets.mjs`
  turn grids of mouth shapes into the 3×3 sheets `SpeakerAvatar` reads.
- Image Forge already plans those sets by name (viseme, turnaround, expression,
  avatar eyes and brows) and gives each frame its own seed plus a "change ONLY
  this" instruction — the thing that keeps a character from being redesigned
  between frames.
- Image Forge already exposes handles a neighbouring program can use: a **fixed
  local port** (47821–47825) and an **MCP server with eight tools** over stdio
  that generates real files and updates its manifest.

Open, on purpose: which side starts the conversation, whether it goes over MCP
or the local port, how this app words "ten mouth shapes for Σερίφης in this
style", and how finished files come back. Agree that here before writing code.

⚠️ Reality check before relying on it: the forge's free engines return
**square** pictures and ignore seeds (OVHcloud), and only Google's models spell
readable words. Sheets hold together best on an engine that takes a seed and a
reference picture.

**Nothing has been built for this. Nothing was started on 20 September 2026.**
The matching note is §14.2 of `qwen image creator/HANDOFF.md`; keep the two in
step.

---

## Traps that have each cost a day

**Antivirus HTTPS scanning.** Avast re-signs every response with its own root,
which only Windows and Chromium trust. Python, gcloud and every engine fail with
`CERTIFICATE_VERIFY_FAILED`. Fix: `tools/windows-ca-bundle.pem` via
`SSL_CERT_FILE` / `REQUESTS_CA_BUNDLE`, already applied in
`electron/net/childEnv.ts` and in gcloud's config. **Any provider-specific
network failure on this machine should be checked against this first.**

**Same-ish name, different quantity.** GlassSurface's `backgroundOpacity: 0.1` is
an alpha; it was read into a `frost` field that is a blur as a fraction of frame
width — a **108 pixel blur** that hid every other effect for several rounds.

**Judge an effect in isolation.** The glass was judged over a frame of the
finished video (discs on discs) and over footage a preset had already blurred.
Both wasted more time than any bug. `tools/glass-lab.py` and
`tools/waveform-lab.html` exist for this — seconds per iteration, not 20 minutes.

**Silent success.** The spectrum 404, `backgroundBlur`, subtitle surfaces,
transitions — four times a render has reported success while quietly leaving
something out. `onBrowserLog` carries exactly one message today.

**A regex that matches nothing fails silently.** Four "different" waveform styles
were rendered and all four were bars.

---

## Glass — called as a failure

**Avatar disc works** (a magnifier: the scene redrawn larger and clipped).
**Caption pill failed** and is turned off. Full account in `docs/GLASS.md`.
Do not reopen without reading it; the next move is either giving the caption the
disc's magnifier or bringing in WebGL `FluidGlass`.

---

## How Ak wants to be worked with

In `CLAUDE.md`, and worth reading before the first reply:

- **Answer in the first line or two.** Everything else in skippable sections.
- **Cut filler.** No preamble, no summarising what you just did.
- **Plain language.** Define any unavoidable term in the same sentence.
- **Prepare, then ask.** Bring a recommendation, not a menu.
- **Never overclaim.** Saying something works when the picture shows otherwise is
  the one thing he has called unacceptable. If you cannot judge it — audio,
  subtle motion — say so and hand it over.
- Everything stays inside this folder. Never kill a process by name; other agents
  own `python.exe` and `node.exe` on this machine.

## Next round (13 Oct 2026)

Work list for both forges: `docs/FORGES-PLAN.md` (review, puppets, hover help, Forge hub, Canva, opportunities, recommended order).

## Running now: the 10 sample puppets (started 14 Oct 2026, ~18:00 Athens)

For the "The Next New Thing" pitch. Made by Ak's **installed** Image Forge (his
own profile, so they land in his Made → to review), started with
`--remote-debugging-port=9555`, Z-Image (faces) + FLUX.2 klein (parts) on
LocalAI, waist-up, side view on. Nothing goes to Video Forge until Ak approves
each part in the review studio.

- Orders: `%APPDATA%\Forge\orders\sample-01…10-*.json` (placed by
  `%TEMP%\samples\orders.mjs`). Inspiration photos for Lucky (dog, Jane
  Thomson) and Alex (guy, Andrea Piacquadio) in `%TEMP%\samples\insp\`.
- Watcher: `%TEMP%\samples\watch.mjs`, log `%TEMP%\samples\run.log` (times in
  UTC). Closes the maker when a puppet is done so the next order opens; HEAT
  GUARD — at 83 °C on the graphics card it presses Stop, waits for 72 °C,
  presses Continue; 3-minute rest between puppets. If the watcher died, restart
  it with `FINISHED=<n already done> node watch.mjs` from that folder.
- Progress per puppet: `%APPDATA%\image-forge\workshop\<slug>\meta.json`.
- Estimate (measured ~30 s a picture, ~65–75 pictures a puppet): 6–9 hours.
- If Z-Image/klein cannot make the dog or the guy cleanly: tell Ak why, he will
  approve Nano Banana for those two.
- After curation: put the approved Lucky and Alex in the Image Forge README
  showcase (credit already written there).
