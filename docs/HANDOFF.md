# Handoff — updated 6 Nov 2026

Everything a fresh session needs. `PLAN.md` holds the long history; this is the
working state. Newest sections first. Plans: `docs/V2-PLAN.md` (Video Forge),
`docs/FORGES-PLAN.md` (both apps; has a Status section at the bottom).

## Major package upgrades — 6 Nov 2026 (branch `deps-major`)

Replaces Dependabot's PR 18 (23 updates in one go; it broke the build). Done one step per commit, each checked before the next.

| Step | Versions | What had to change |
|---|---|---|
| Small | Remotion 4.0.540, hyperframes 0.9, esbuild 0.28, ws, electron-builder, MediaPipe 1.2, @types/node 24 (Electron runs Node 24) | hyperframes 0.9 only exports `./api` and `./package.json`, so `renderHyperframes.ts` finds its bin file through package.json (every puppet render failed without this; test in `tools/lib/work.test.mjs`) |
| Tailwind 3 → 4 | tailwindcss 4.3, @tailwindcss/postcss | Config moved into `src/index.css` (`@theme`); autoprefixer and tailwind.config.js gone. `forge.css` and `lines.css` sit in `@layer utilities`; the two zero-weight `:where()` rules sit in `@layer base` (else Deco Noir's floating `.hint` turns static and squeezes the scrub bar). v3 line heights, placeholder grey and border colour kept. The upgrade tool also renamed non-class words (`"blur"` event, saved `"rounded"`/`"blur"` ids, "ring" in hover text): put back |
| React 19 | react 19.3, framer-motion 14, zustand 5 | `React.JSX.Element`, `useRef(undefined)`. zustand 5 loops on selectors that build new objects: none here do; keep it that way |
| Build tools | Vite 8, electron-vite 6, plugin-react 6, TypeScript 7 | Nothing |
| Electron 45 | 45.2 (Node 24) | Nothing yet. **Before Electron 46:** move `electron/keyStore.ts` to `safeStorage.encryptStringAsync` / `decryptStringAsync` / `isAsyncEncryptionAvailable` (the sync calls are removed in 46; the async decrypt reads keys the sync one wrote, tested). Dependabot ignores electron ≥46 until then |

- **Checked:** `tsc` clean; `npm test` all pass; app build; page build; 18 app screens (every step, every Look/Make tab, explainer, many videos, settings) screenshotted on main and on each step: identical apart from animations; a scripted editing session; puppet test render `jobs/boil-test.json` and explainer `explainer/samples/how-it-works.json` both **pixel-identical** to main (PSNR inf; puppet render with main's narration, since Piper's voice varies run to run). Not checked: the installer (`npm run build-exe`).
- Known small visual changes: Tailwind 4's `space-y` puts the gap below items instead of above (2–4 px in two long panels); its palette colours at 15% strength differ slightly.
- **Dependabot** now groups only minor/patch updates; each major gets its own PR. New `.github/workflows/check.yml` type-checks, tests and builds every PR on Windows.

## Package security updates — 5 Nov 2026 (merged)

- **PR 13** (merged): patch updates cleared 30 of 39 Dependabot alerts. electron 43.8.4, fast-uri 3.1.9, zod 4.6.7 (forced with an npm `overrides` entry because @remotion/studio 4.0.500 pins 4.4.3; drop the override once Remotion is at 4.0.540+), postcss 8.5.32, nanoid, source-map-js, postcss-selector-parser, undici, brace-expansion. Versions picked with `npm --before` a week back.
- **Checked:** `npm test` 222/222, `tsc` clean, `npm run build`, `npm run dev` window opens, test render `npm run job -- jobs/boil-test.json` (27 s, frame checked).
- **PR 15** (merged): `.github/dependabot.yml` from the standards template, weekly grouped PRs for npm + GitHub Actions. Majors inside a weekly PR go to Ak first.
- **Still open (10 alerts, all build-time only):** vite 5.4.21 ×8 + esbuild 0.21 ×1 need Vite 6+ and electron-vite 3+ (major, changes the build setup); minimatch ×1 (alert #95, published 5 Nov) fixed only in 11.x.
- Plain-words report for Ak: `docs/eli5/safety-updates-5-nov.html`.

## PR 12 code review fixes + easy wins — 5 Nov 2026 (branch `redflag-2d-lab`)

- **Merged 5 Nov:** PR 12 into `redflag-data` (merge commit `0355bdf`), then `redflag-data` into `main` (PR 14; it also carried "Many videos: set carries into every row" and "Intros and outros: colour boost", which were not on main yet). PR 13 (package vulnerability updates, 30 of 39) was opened by a separate session.

- **Cloud review (ultrareview) of PR 12: 10 findings, all fixed** (commit "Code review fixes…"). Before/after proof page: `characters/checks/review-fixes.html` (ignored folder; open with the `character-checks` entry in `.claude/launch.json`, port 5591). Built from a scratch script, not kept in the repo.
  - Recorded moves no longer change starter tags: `trimActedPhrases` (core/acted.mjs) drops a recorded move's phrase when it is a voice sound (`laughs`, `cries`, `gasps`, `sobs`, `sighs`) or overlaps a starter phrase. The 3 "known failing" tag tests were caused by this branch and now pass.
  - Three recorded moves had a starter move's id and were silently lost: renamed `wave-acted`, `shrug-acted`, `explain-acted` in clips.json. The data test now fails on any such clash.
  - Eyes: `eyes[0]` is now the NEAR eye. Anything worn on "the visible eye" must pick by `far`, not by index. The eye patch moved to the near eye (in front view that is the character's other eye than before; it no longer vanishes side-on).
  - Arms: in turned views a far hand crossing the chest comes in front (drink, facepalm).
  - 3D shading: canvas paths keep the transform they were built under; shift the points (`pen.trace(q, closed, dx, dy)`), never `ctx.translate` after building.
  - Hats only take the cap wrap, never the hair swing.
  - Hem modesty limits live in `core/follow.mjs` (`HEM_LIFT_MAX`, `HEM_SWAY_MAX`, `capHem`); `lab/physics.mjs` re-exports them.
  - Take server: POST only from its own page with `content-type: application/json`.
- **Easy wins on the same branch:**
  - `docs/MOVE-TAGS.md`: all 154 move tags (73 moves; 🎥 marks the recorded ones), generated by `node tools/move-tags.mjs`; a test fails if it is out of date. Linked from `docs/WRITING-SCRIPTS.md` (new "Moves" section) and `docs/AI-BRIEF.md`.
  - Hover help on every button of the review pages (2D lab, Red Flag, cast, natural movement, motion library): Ak's "no click is naked".
  - Repo standards (Core tier): `.env.example` (every variable the app reads, all optional), `githooks/pre-commit` (gitleaks; switched on with `git config core.hooksPath githooks`), `.github/workflows/secret-scan.yml`. Full-history gitleaks run: 389 commits, clean.
- **Left open (standards):** no LICENSE (Ak: none for now), no `docs/media/*.gif` hero clips in the README, root `HANDOFF.md` is a stale 29 Oct note (untracked; the real handoff is this file).
- **Not checked:** the recorded moves' new tags in a real app render (they pass the engine tests and draw in every look).

## Natural movement + the new PC — 3 Nov 2026 (not committed)

- **Cast picks saved.** Ak's picks are in `brands/redflag/cast.json` under each person's `chosen` (face + outfits, 118 outfits for 40 people). `geoEyes: "own"`: geo-minimal shows each person's own white eyes with lids. That is not yet wired into the `geo` look; only the cast page and the movement page honour it. Young Amber and Rousseau had no face picked, so they keep face A (see `faceNote`).
- **Follow-through** (`characters/core/follow.mjs`): hair, hems and earrings hang off the body and trail it on springs (deterministic window, like `motion.mjs`). It only applies when `state.follow` is set, so old renders are unchanged. Draw hooks: the hair warp and hem warp in `draw.mjs`, and dangling earrings in `wardrobe.mjs`.
- **Acted takes** (`characters/core/acted.mjs`): a MediaPipe Pose take (raw 33 points per frame, plus the `neutral` stance) becomes joints. Covered: arms, feet, crouch/jump, head tilt and nod, and an optional turn. Not covered: fingers, face, turning round. Takes are JSON and deterministic, so renders can use them.
- **Page:** `characters/samples/natural-movement.html` (build: `node tools/natural-sheet.mjs`). Shows today, follow-through and acted by you, with camera, video file, record, save and load. Tested:
  - with a Pexels dancer clip (`?video=` URL hook);
  - tracking ran at about 18 frames a second in the browser pane.
- **Not done:**
  - the follow-through and takes are not in the Remotion render path or the episode script;
  - no face tracking (mouth and brows);
  - the webcam was not tested here (no camera in the pane).
- **Motion library, v2: real motion capture (3 Nov).**
  - Ak rejected v1 (stock clips through a body tracker): "bad, even the ones I said keep". The stock takes were deleted. The capture page and take server are kept for later.
  - v2 uses two sources:
    - 48 CMU Graphics Lab clips ("free for all uses"; never resell the data).
    - 18 Quaternius Universal Animation Library clips (CC0; the free Standard zip comes from the OpenGameArt mirror because itch.io refused the download in the pane).
  - Raw downloads are in the session scratchpad and can be fetched again. `tools/mocap-to-takes.py` runs the 3D skeleton, looks at it from the front and writes takes in the same 33-point format. `node tools/acted-shelf.mjs` turns them into moves (`acted/shelf.mjs`, 66 moves, 629 KB, now in SHELF) plus `acted/preview.json`.
  - Deep hip drops become the rig's chair sit, with a chair prop.
  - The list with names, phrases and face cues is `characters/moves/acted/clips.json`. Ak picks on `motion-library.html` (picks key `rf-motion-picks-v2`, line starts `RF-MOTION2`).
  - Limits:
    - Front view only: an arm reaching towards the camera looks short.
    - No fingers.
    - Some crouches (CMU 142_16 scared, 120_15 surprised) are read as sitting.
    - The shelf adds about 630 KB to every page that loads the engine.
  - Research: `docs/research/free-motion-libraries-2026-11.md` and `docs/research/artstation-free-2026-11.md`.
- **3D trial in Blender (3 Nov).**
  - Ak's verdict on v2: "palms wrong", "elbow to wrist moves way too much", "gravity non-existent, like Karagiozis". Only one wave was good. Diagnosis: flattening 3D capture to the 2D rig loses depth. Ak chose to try 3D now on the laptop rather than wait for the new PC.
  - Blender 5.2.3 is installed portable at `C:\Users\strav\Tools\blender-5.2.3-windows-x64` (checksum verified).
  - Character: Quaternius Universal Base Characters, Standard, CC0, at `C:\Users\strav\Tools\assets\ubc`. Itch.io only worked through BrowserOS neo. It is the Superhero_Female body with Hair_Long, flat toon colours, an inverted-hull outline, and a script-made dress (the bodice is the body pushed out, the skirt a weighted cone).
  - `tools/blender/export_sources.py` turns CMU and Quaternius clips into 3D joint positions. `tools/blender/trial.py` aims every bone at its source joint each frame from rest; the pelvis, chest and hands are turned by hips, shoulders and thumb, and the head is set by where the face looks. It adds a chair when the hips drop, and the camera follows the hips.
  - Renders: 480×640 EEVEE, about 0.6 s per frame; peak GPU 56 °C over 7 clips.
  - Compare page: `characters/samples/trial3d.html` (build `node tools/trial3d-page.mjs`, videos in `characters/samples/trial3d/`).
  - Not done: a real Chloe (face, proportions), face animation, cloth physics, finger acting. The skirt is still a stiff cone.
- **Chloe in 3D, three looks (3 Nov).**
  - Ak: "build Chloe, careful of the dress, it exposes her", and choose a style: clay (Hatch Studios' claymation PSA), stylized 3D, or US chibi.
  - `tools/blender/chloe3d.py <char dir> <sources.json> <out> <clay|stylized|chibi> <clip> [still frame]` reuses `trial.py`'s retarget (importable now, plus `HEAD_SCALE`). It builds:
    - A round cartoon head replacing the realistic one, with eyes that blink, lashes, brows, blush, a nose and a mouth that talks on a test rhythm.
    - A hair cap plus the long hair, the headband (top half only) and gold earrings.
  - The dress is modest by construction:
    - The bodice is the body's surface with a crew neck and short sleeves, pushed out 1.6 cm. A plain Smooth modifier shrank it and EXPOSED her; only volume-preserving Laplacian smoothing is safe.
    - The skirt is real cloth: waist pinned, every vertex softly pulled to its hang (otherwise it got trapped under her when she sat and stayed up), with body and lining as colliders.
    - A dress-colour lining runs to just above the knee, so if the skirt opens only dress colour shows.
  - Still renders must step through every frame for the cloth (jumping skips the simulation).
  - Renders: `C:\Users\strav\Tools\assets\chloe`; batch script `render_all.sh`. Clay renders on twos; Windows ffmpeg has no glob, so frames are renumbered first.
  - Videos are in `characters/samples/chloe3d/`; pick page `characters/samples/chloe3d.html`.
  - GPU peaked at 74 °C over the 9 clips.
- **New PC** (Bosgame M5, Ryzen AI Max+ 395, 128 GB): findings and the list of things the 8 GB laptop made us drop are in `docs/research/new-pc-2026-11.md`.

## The Red Flag Theory family — 2 Nov 2026 (not committed)
Ak's YouTube cartoon channel (plan: `Blacksmith/season_1_plan_and_roadmap-v2.md`)
is built on the drawn-character engine. First 4 of 54 cards:
`brands/redflag/characters.json` (Jake, Rita, Lucas, Amber; no look set, so one
card serves every look; signature colours are proposals). Side-by-side page:
`node tools/redflag-sheet.mjs` → `characters/samples/redflag.html` (every look,
family takes turns talking, framing / facing / phone-size, ☆ Pick saved in the
browser). Seen working in the browser pane. Gaps found: the engine's "Stained
glass" look is only thick outlines + a gloss (no lead-line cells); no temple-only
grey hair; no pleated skirt. Next: Ak picks a look, then signature colours, the
other 50 cards, then the rooms (Omni loops behind, code furniture in front).

Ak's verdicts (2 Nov): **flashbacks = "1930s rubber hose (early colour)"
(`hose2`), decided.** Sunday show = paper cut-out, maybe 90s sitcom. The sitcom
look used to force an overbite arc above every mouth, which read as two mouth
lines: removed from the look (`looks.mjs`), now only a card with
`mouth: "overbite"` gets it (13/13 tests pass). Jake's square head stuck out at
the corners past his hair → oval; all four now share the same dot nose. The
page has a hair library (all 15 styles, click to try on Lucas). **Video Forge
gaps Ak hit:** no place in the app to browse the hair library; only 15 hair
styles (no messy/teen-boy cuts, no temple-grey). Added the same day in
`draw.mjs`: **messy**, **shaggy** (fringe, covers the ears), **undercut**
(clipped sides a shade lighter, long top flopping to one side) → 18 styles.
Seen in paper and sitcom, front view only; the engine checks' test characters
don't use them, so 3/4 and side views are not checked yet.

Later 2 Nov: Lucas = messy + **dark circles**; Amber = muted orange, Rita =
teal (approved). New card fields `darkCircles`, `makeup` (none/soft/bold) and
`makeupColor` in `card.mjs`, drawn in `draw.mjs` after the nose (tests pass).
Bruises: Ak said add them (2 Nov), despite the notebook's "no on-screen
violence" rule. New field `bruise` (none/cheek/eye = black eye), one side of
the face, purple fading to yellow-green. The page has a "Face extras" section
(paper, sitcom, hose2) showing every new mark. Tears are not a card field
(they'd follow the script's feelings); not built.
7 host cards added under `hosts` in `brands/redflag/characters.json` (Margo,
Leo, Clara, Chloe, Judge Mara, Arthur, Lexi; signature colours proposed). The
page has "The other days": each show's host in the notebook look + 2
alternatives (sticker/paper/sitcom; Thu–Fri glass/noir/riso). Margo's petrol
teal sits close to Rita's teal (never in one frame). Testing note: in the
browser pane, a background tab doesn't animate, so screenshots look blank:
front the tab first.

Ak's fixes, 2 Nov (engine-wide, all looked at on the page):
- Eyes with whites now rest with the upper lid a little down (`LID_REST` in
  `draw.mjs`, curved lid); only "wide" (surprised) opens them fully.
- Jake's eyes dot → oval (dots were off-style in paper cut-out).
- Dark circles stronger; dark circles and bruises now drawn BEFORE the eyes,
  so a black eye rings the eye and the eyeball stays white.
- `long` hair redone: two curtains over the shoulders with the neck showing
  (it read as a bib), face-framing locks, ears hidden (`hidesEars`).
- Risograph: grain removed (only the off-register second print stays).
- Robe: the belt crossing the front trim made a cross (judge read as a
  priest); now a V trim, no belt. New neck item `jabot` (judge's lace
  collar), worn by Judge Mara.
- Other days also show pop art, geo-minimal, 1950s and stained glass.
- Paper cut-out (no outlines): the eyelid crease is a darker skin tone, not
  ink, unless the card has eye makeup.

**Looks LOCKED (Ak, 2 Nov):** Sun + Sat paper, flashbacks hose2, Mon–Wed geo,
Thu–Fri glass. Stored as `looks` in `brands/redflag/characters.json`; each
card's `look` set to match; the page shows only the locked look per day.
**Cast picker (2 Nov):** `brands/redflag/cast.json` = Season 1 roster 1–40
(the 11 built + 29 new), each with 3 face candidates and 5–12 outfit
candidates (signature colour kept on the main piece; new people's colours are
proposals). Generated by a script (kept outside the repo, in the session
scratchpad); regenerate by hand-editing cast.json from now on. Page
`characters/samples/redflag-cast.html` (built by
`tools/redflag-cast-sheet.mjs`): face and clothes picked separately, plus a
geo-minimal eyes decision. Picks stay in the browser's localStorage; "Copy my picks" gives
an `RF-PICKS {...}` line to paste to Claude. Ak picked everything (in a
browser Claude can't read) and wants FEWER outfits for some people (fewer =
more recognisable): when the picks arrive, keep only the picked face + outfits.
Engine: new hair `sides` (bald top, side tufts); `sidepart` now clearly
swept with a part line (it looked like `short`); moustaches keep a thin
outline (stained glass turned a grey moustache black). Margo: blond with
highlights, bright turquoise/yellow/coral clothes.
Next: the rest of the 54-character roster (NotebookLM source 2; 1–40 have
specs, 41–54 names only), each with outfits that keep the signature colour.

## Batch 3 merged — 30 Oct 2026
Sets, pop-up icons, costumes, caption styles, in-between poses are in main.
Known gaps (next, approved by Ak in this order): 1 sets in Many videos (runJob
never passes `scene`), 2 script tag switching look/set/on-screen cast mid-video,
3 script tag playing a local clip with sound, 4 couch set + phone-call frame,
5 cast per sheet row. Also asked: drawn characters walking in and sitting at a
set's table; Ak reports intros look desaturated. Brief for Ak's script AI:
docs/AI-BRIEF.md.

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
   - 27 Oct night (HIGH, Ak's notes on batch 2):
     - Step 1 (a6561d1): both arms behind the body when facing the camera
       (in front only while crossing it), round smiles, beards on the jaw,
       real shoes, picture vs drawn told apart in Cast. Proof: npm run
       moves:sheet -- --faces / --shoes.
     - Step 2 (dc67506): motion layer (characters/core/motion.mjs): springs,
       overlap, anticipation, weight, breath, planted feet; 30 fps default,
       60 added. Ak's review page: characters/samples/motion-ab.html.
     - Step 3 (f5ce272): photoreal puppets bent on the skeleton
       (characters/photoreal/*), A-pose + T-pose mixed per arm; works for
       full-body moves. Review page (private, ignored folder):
       node tools/photoreal-review.mjs → characters/checks/review-photoreal-nikos.html.
       Known: torn sleeve bit on the hanging arm's shoulder; side walk, hand
       shapes, talking face not wired yet. Ak asked: portraits only as LAST
       resort. 6 Nikos pictures made on the credit (~$0.10), in
       characters/checks/photoreal/ (never commit: Nikos is private).
   - 28 Oct (HIGH, Ak's second round): bd9ade3 (1930s elbows/knees, hair
     turns with head, 1.5 eyes, line looks hide what is behind, arms come in
     front smoothly, stage colours, true before/after from git a6561d1, QC
     tools --flicker/--frames), b28a2e8 (Karagiozis traditional + black
     cut-out look; BUG fixed: patterns dropped after measuring), 76319f2
     (photoreal presenter at a news desk, upper body only, per Ak).
     Open: ragged sleeve bit next to the apron when an arm moves; dwarf
     helmet design; drink's cup should reach the mouth; different shoe
     designs later (Ak expects them in a later batch).
     PR DnD-World/Video-Forge#10 (batch2-motion) MERGED 28 Oct.
     Ak's decision 28 Oct: photoreal puppets are HALF BODY in scenes where
     furniture hides the legs: desk presenter, team in a conference room,
     speakers at a conference, recorded podcast. Queued for the variety
     batch: those four sets + wiring photoreal presenters into the app.
   - 28 Oct, Ak on batch 3:
     - Sets wanted: game show, news desk, conference room, conference stage,
       podcast (split screen or facing each other). All six built
       (characters/sets/sets.mjs); next: inside the app.
     - Photoreal Nikos: keep, but "anything other than a gimmicky use will
       not work at this level" (face choppy frame to frame, hands/fingers
       poor). Done: feathered face parts, narrower hand cross-fade.
     - #6 motion library: grow it WITH in-between (mid / semi-mid) poses so
       moves look more fluid.
     - #8 pop-ups: animated ICONS too, not only emoji; predict what his
       subjects need (D&D, dogs, manipulation defence, soft skills,
       seasonal, ELI5 AI, tropes) — same for #2 looks, #3 wardrobe,
       #4 costumes, #5 shoes.
     - #9 captions: copy the styles that already work; at most 3 new
       signature styles.
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

## Human Generator trial, "Lucas" (2026-11-04)
- Trial installed into Blender 5.2.3 (user prefs `%APPDATA%/Blender Foundation/Blender/5.2`), content in `C:/Users/strav/Tools/humgen/content/`. Installer, scripts and renders in `C:/Users/strav/Tools/humgen/` (pkg, scripts, audio, out). Original downloads: `D:/downloads`.
- Scripts: `scripts/setup_hg.py` (headless install), `scripts/probe_lucas.py` (API probe), `scripts/visemes.mts` (Video Forge `buildVisemeTrack` on a WAV; bundle with esbuild), `scripts/lucas_test.py <real|soft|toon> <out> [still]`, `scripts/render_all.sh`.
- Proven: headless creation through the `HumGen3D.Human` Python API; age 30/50/70; facial rig (43 ARKit shapes + tongue) survives Rigify (67 keys/63 drivers before and after); full finger bones; lip sync by keying face control bones (value / expression factor from `models/face_rig.json`).
- Laptop render: 0.60-0.76 s/frame at 540x720, EEVEE 32 samples, GPU max 73 C.
- Trial limits: only Caucasian 1 male, 1 outfit (Relaxed Fit), 1 hair, 1 shoe, 2 expressions; "Stylized" and "Big Head" body keys locked. Body acting is placeholder (breathing, nods, sway), and needs Mixamo (Ak's Adobe login).
- Page: `characters/samples/lucas-hg.html` (videos in `lucas-hg/`). Waiting on support email answers (AMD 8060S, licence on 2 machines).
- 2026-11-04: Ak picked **Toon**. Toon v2 in `lucas_test.py` (v1 kept as `lucas_test_v1.py`):
  - Flat colours: median of the colour texture, or set per object (sweater blue, jeans grey, shoes navy, hair dark brown); real teeth and eyes kept.
  - Shading: 3 soft steps (shadow, light, highlight) with a warm 2.2 mm ink outline.
  - Head scaled 1.08; brow lift halved; wall darker.
  - 0.67 s/frame. Video: `characters/samples/lucas-hg/lucas-toon.mp4` (v1 is `lucas-toon-v1.mp4`).
- Next: Mixamo motion. Ak must sign in to mixamo.com in neo (Claude can't enter passwords).
- 2026-11-04 later: Ak set toon aside ("not adequate"); the direction is as-is or smoothed.
- **Mixamo works.**
  - Downloads use Ak's sign-in in neo: Mixamo API calls in the page (export, then monitor, then S3 URL), fetched by curl.
  - Clips in `C:/Users/strav/Tools/humgen/mixamo/`: talk_general (10.3 s), talk_question (3.8 s), sit_talking (45 s), nod_thoughtful.
  - The neo page has no WebGL, so the Mixamo UI is unusable there. The API route is what works.
- `scripts/mixamo_retarget.py`:
  - Rest-aligned world-rotation transfer onto Rigify FK controls (body, arms, wrists, all fingers).
  - Shoulders are left out because they hunched him.
  - Legs use swing-only.
  - Keys go in after the bake loop.
- `lucas_test.py` env:
  - `MOTION=<fbx>`, `MSTART`, `CHAIR=1` (simple wooden chair), `WIDE=1`.
  - Floor added; focus locks to the head bone; the close-up camera follows the head at 55%.
- Videos: `lucas-hg/talk-real.mp4`, `talk-soft.mp4`, `sit-soft.mp4` (0.71-0.76 s/frame, GPU at most 67 C).
- Open issues:
  - The close-up hides the hand gestures (try a medium shot).
  - Mixamo idle download returned a stale job, so it is not fetched.

## Season 1 stays 2D — movement and texture plan (2026-11-04)
Ak: 3D is a merry-go-round; parked until Season 2. Planning only, nothing built yet.
Plan: `docs/research/2d-motion-plan-2026-11.md` — an 8-layer stack (intent, choreography, body solver with IK/balance/foot planting, automatic animation principles, hair and cloth physics with wind and a hard modesty line, bendy shapes and smears, GPU surface layer via PixiJS, camera + motion blur + impact frames).
Next step: a "2D Lab" side-by-side page; Ak picks small round (≈50 human work hours) or full (≈110). Four open questions at the end of the plan.

### 2026-11-04 evening: full scene, darker light, pelvis fix
- `lucas-hg/scene-soft.mp4` (23 s, 960×540): walk in, turn, sit, legs crossed, restless leg, stand, look around, run out. Built by `Tools/humgen/scripts/seq_test.py` using `mixamo_retarget.sequence()`, which chains clips, carries the root path and blends 2–14 frames between clips.
- New Mixamo clips in `Tools/humgen/mixamo/`: walk_std, walk_stop, turn_r90, stand_to_sit, fidget_feet, sit_to_stand, look_nervous, turn_run(_m mirrored). Plain "run" loop download failed; the run tail repeats the last stride of turn_run_m.
- Retarget bug fixed: the Rigify `torso` control is flat, so aligning it to the upright Mixamo hips tilted the pelvis 90° and dropped the legs about 25 cm (bent knees, kneeling run). Torso now uses no direction offset. talk-real/talk-soft re-rendered with the fix.
- Light: `LIGHT=dark` (default) in both scripts, about 0.3–0.45 of the old energy, darker wall and floor, AgX Medium High Contrast.
- Weight: `SKINNY=0..1` env. At 0.5 only the neck and jaw change visibly; the loose trial outfit hides the body. weight-0.png / weight-0.5.png.
- Speed: 0.60 s/frame at 960×540; the bake of 560 frames takes about 6 min on the CPU. GPU peak 73 °C.

## 2D Lab built — full round (2026-11-04)
Page: `characters/samples/lab2d.html` (rebuild: `node tools/lab2d-sheet.mjs`; serve with the `vf-takes` launch config → http://localhost:41970/lab2d.html). Seven side-by-side tests, today vs lab, live at 30 fps.
Code: `characters/lab/` — anim.mjs (key poses, curves, overlap, overshoot, alive), body.mjs (IK, joint limits, reach, balance, planted feet), physics.mjs (hair/hem chains, wind, leaves, cloth flag, faint topple; HEM_LIFT_MAX modesty cap), moves.mjs (wave, sit/stand, jump, kick, dance, faint, wind), pair.mjs (handshake, hug, head pat, catch), actor.mjs (ties it together), surface.mjs (WebGL2 re-lighting: lit, clay, gouache, ink — own shader, no PixiJS download), frame.mjs (room parallax, camera, shadows, smears, dust, RED FLAG impact frame).
Engine hooks added to `core/draw.mjs` (no change when unused): `state.adjust`, `follow.hairField` / `follow.hemField`, `state.armsSkip` / `state.armsOnly` (hug draw order); drawCharacter now also returns `sk`.
Tests: `characters/lab.test.mjs` (in `npm test`): finite frames, feet on the floor, MODESTY (no hem past the cap in calm→strong wind, jumping, dancing), hands reach their contacts. All pass. Two older failures in moves.test.mjs are shelf wording ("waves hello" twice; a laugh tag) and predate the lab.
Measured: hand "jumpiness" on the wave, today 39 vs lab 23 (lower = smoother). Live cost with motion blur ≈ 20–29 ms a frame per stage on the laptop.
Findings for Ak: hose2 kids are nearly adult height (big heads) — the head pat draws Young Amber at 80%. Hug faces overlap with these big heads. Clay/gouache/ink are a first pass at taste.
Not built: mouth from the voice in the lab, beat gestures from words, a larger pose library, rendering lab scenes into videos.

### 2D Lab, round 2 (2026-11-04, Ak's notes)
- Faces: new engine hook `state.headView` (core/draw.mjs) — the head turns less than the body. Lab actors cap the face at 0.9 (three-quarter) while bodies go to profile: fixes the profile nose, the sliver eye and the front-on mouth in side and pair shots.
- Turned views (view ≥ 1): hand targets mean "forwards" for BOTH arms, knees bend forwards — this was why the catch looked like elbows catching and why the handshake used her left hand. Handshake is now right hand to right hand and lets go by drawing back.
- Softer "soft knee" (SOFT 0.994) — the skier stance is gone; catch crouch lighter; wind-up keeps the face clear.
- Red Flag moment: Subtle (Sunday show: slow push-in, small flag over her head on an exclamation-mark mast, faint red edge) and Loud (clip days: freeze, red/black, inked figure, whip pan). Mast is a red "!" (Ak). `frame.mjs flagMast()`.
- Motion blur now off by default: Ak saw no difference at these speeds; smears do that job.
- Materials: Ak judged all five bad (Young Amber least bad). Outline-guessing shading is the wrong method; fake 3D needs per-part shading from the real shapes (see chat answer, 4 Nov).

### 2D Lab, round 3 (2026-11-04)
- FAKE 3D in the engine: `look.form` (core/paint.mjs `formFill` / `formStroke`): each filled part gets a lit side, a core shadow and a floor bounce; limbs are shaded tubes; every part throws a soft shadow on what is behind it; hair gets a shine band; the look's flat half-shade steps aside; the neck sits in the head's shadow. Light from the screen's upper left (mirror-safe). Section 6 of the lab is now flat vs fake 3D on five cast members. The outline-guessing GPU surfaces (lab/surface.mjs) are no longer on the page.
- `state.armsFront` (core/draw.mjs): a far arm drawn in front of the chest — the handshake (her right hand across her body) and folded arms.
- Handshake: bodies at view 1.45, an arm's length apart, hands meet halfway between the two people.
- Red Flag, subtle: a tiny "!" over her head and the flag is RAISED up it (`flagMast(..., hoist)`), not waved. Lucas's shrug and Chloe's folded arms rewritten for the turned-view hand convention (they were reaching backwards).
- New lab section 2b: a slow turntable, face turning all the way vs face held at three-quarter.

### 2D Lab, round 4 — a hint of 3D (2026-11-04)
- `look.form` is now a STRENGTH (number; `true` = 1). Lab section 6 shows flat / 0.5 "a hint of 3D" (Ak: "less aggressive and more detailed") / 1 "fuller 3D".
- Limbs: no more stacked offset strokes (read as double lines). Now the plain stroke, then a blurred shadow down the far side and a faint blurred light down the near side, clipped inside the limb's own capsule outline.
- Small parts (pockets, buttons) get almost no shading (size factor from the shape's radius). Bounce and rim light are neutral warm-white (the pink bounce muddied blue clothes). New: a faint rim of reflected light just inside each big shape's far edge.
- Fixed: the hair shine replaced the canvas path, so outlined looks (hose2) lost their hair outline — the shape path is now re-traced after the shine.

### Red Flag default: a hint of 3D (Ak, 2026-11-04)
- New card field `form` (core/card.mjs, group Look, 0 flat … 1 fuller; default 0). drawCharacter applies it unless the look already sets `form`.
- `brands/redflag/cast.json` now has `form: 0.5` (+ `formNote`); every page that builds Red Flag cards passes `form: CAST.form` (lab2d, natural, library, cast pages — all rebuilt). Lab section 6 forces its own strengths, so its "Flat" panel stays flat.
- When the app itself starts reading the Red Flag cast, carry `form` across the same way.

## 2D Lab, round 5 — anatomy of the turn, text styles, transitions (5 Nov 2026)

Ak's notes and what changed (nothing committed; ultra review first):
- **Turned bodies were backwards.** A head turning to +x now keeps its −x eye full size (near) and narrows the +x eye (far) (`core/rig.mjs` eyes). The near shoulder (−x) keeps its width, the far one tucks in. Turned, the near arm and near leg are `arms[0]` / `legs[0]` and draw over the body (`core/draw.mjs`). Handshake comment in `lab/pair.mjs` is now wrong in words (her right hand IS the near arm) but the code is right.
- **Elbows**: turned, the elbow bends anatomically, a little behind the shoulder-to-hand line (`lab/body.mjs`).
- **Side noses**: a small knob below the eye line. **Mouth** narrows as the head turns. **Lipstick**: thinner ink line.
- **Profile only for walks, hugs, handshakes**: kick and faint now three-quarter (view 1), sit 1.15.
- **Thumbs** turn towards the face on open/wave hands (`core/hands.mjs`). **Wave arm** no longer flips over the hair (hand above the chin stays behind).
- **Kick arms**: calm keys, critically damped springs (moves may now set `springs`).
- **Faint**: no smile on the floor — a move with a negative smile drops the card's resting smile (`state.mouthRest`).
- **Hair** takes 1.45× the hint of 3D; arms and legs unchanged.
- **Fabric patterns** pinned to the body and bent with the hem; **paper grain** moves with the figure (was fixed to the screen = "part of the background").
- **MODESTY BUG FOUND AND FIXED**: the hem physics could swing a dress 7.5% of the body height sideways — in the handshake it slid off her hips. Cap now 2% (`HEM_SWAY_MAX`), new test in `characters/lab.test.mjs`.
- **Talking mouth** (lab stand-in): syllables (open vowel → consonant, 140–230 ms), 70 ms smooth blends, M/B/P closures, phrase rests.
- **Sunday flag**: camera leans in 5% and tips under a degree, then eases back; the big push-in is gone.
- **New section 8** on `lab2d.html`: four text styles (clean, kinetic, pop, marker) and four transitions (red-flag iris, ink wipe, paper tear, whip pan) — `characters/lab/words.mjs`.
- Research (helper): `docs/research/pro-2d-techniques-2026-11.md`. Next steps and answers: `docs/research/2d-plus-next-2026-11.md`.
- Tests: lab 4/4; full suite 223 pass, 3 fail — the old shelf/script-tag failures (`moves.test.mjs` ×2, `tools/lib/moveTracks.test.mjs`), not touched this round.
- Known left: the grip hand reads as a ring; the real app's lip sync (from the voice) is not touched — the lab only.

## Clay details (5 Nov 2026)
- New card setting **"Clay details"** (`formDetail`, off by default), on top of the hint of 3D. Code: `characters/core/clay.mjs`, warm skin edge in `paint.mjs` formFill.
- What it adds: the fringe's soft shadow on the forehead; a soft shadow and a shine on the nose; cheek sheen; a lower-lip shine; a warm red edge where skin turns to shadow; soft drape folds on tops; the hoodie pocket as a soft opening instead of a flat patch.
- Compare on `lab2d.html` section 6: Flat / Hint / **Hint + clay details** / Fuller. Not switched on for the Red Flag cast yet; that's Ak's call (set `"formDetail": true` next to `"form"` in `brands/redflag/cast.json` and pass it in the page builders like `form`).
- Test: `characters/lab.test.mjs` "clay details draw finite frames".
- Stronger (Ak, 5 Nov: "stronger first"): standard clay strength raised 1.7× (`CLAY_K` in `core/clay.mjs`); `formDetail` may be a number to scale it. Section 6 now: Hint / Clay first try / Clay stronger / Fuller.

## New Red Flag look + slow-turn check (5 Nov 2026)
- Ak: "stronger clay, full 3D, just tone down the hands, arms and legs". `brands/redflag/cast.json`: `form` 1, `formDetail` true, `formLimbs` 0.5 (new card field: how much 3D the arms, hands, legs and feet take). All four page builders pass the three fields.
- Clay strength is now independent of the body's 3D strength (it doubled at full 3D and the nose shadow became a smudge).
- Slow turn panel (`lab2d.html` section 6, `MV.turnSlow`, head turns fully). Issues found and fixed: near arm jumped in front at the half-turn (now comes round over a short stretch); profile eye sat on the face's edge; short-hair styles left the back of the head bald when turned (cap styles now cover it, ear on top).
- Still known: in full profile the faces are weaker than front/three-quarter — the show caps the head at three-quarter (`HEAD_MAX`), so it only shows if a scene raises it.
- Long hair follows the head turn: hair beside the head sits on a ring round it (near side swings in, far side tucks to a sliver); long styles also cover the back of the skull when it turns into view (`wrapRound` / `CAP_STYLES` in `core/draw.mjs`).

## Subtitles (5 Nov 2026)
- Ak: text is needed more for subtitles than calls to action; transitions are "meh". Section 8 of `lab2d.html` is now **Subtitles**: classic, karaoke (word lights up in the speaker's colour), kinetic (2–3 word chunks, key words red), drama (speaker name/colour on their side; inner thoughts italic, tagged THINKS). Code: `subtitleScene` in `characters/lab/words.mjs`; the dialogue is a sample with simulated word timing — the app would use the real word times from the voice.
- The call-to-action text styles stay in `words.mjs` (`textScene`) but are no longer on the page. Transitions unchanged, waiting on Ak.
- Transitions round 2 (Ak: the first four were "meh"): red cloth flag sweep with the "!", a match cut through the eyes (drawn sharp through the zoom), glass shatter (shards carry the picture, crack flash first), film burn into a memory (light leaks, charred burn holes, sepia print). `transitionScene` in `characters/lab/words.mjs`.
- Kinetic subtitles round 2 (Ak: "an invisible flipbox with 4 sides rotating on the long axis, the spoken word in the colour of the character"): each 2–3 word chunk on a face of an unseen box that rolls a quarter turn per chunk with a small overshoot; the word being said is in the speaker's colour, key words underlined in it.
