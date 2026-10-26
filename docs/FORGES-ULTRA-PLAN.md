# The Forges, ultra plan — v2 with Ak's choices (26 Oct 2026)

First version 25 Oct 2026 (47 items); this version takes in Ak's answers of
26 Oct. **Nothing in here is built.** Evidence for every finding (file:line)
is in the five reports in [research/ultra-2026-10-25/](research/ultra-2026-10-25/):
two code audits (Video Forge, Image Forge), free sources and licences, puppet
quality checks, and other video makers' methods. Made by five Sonnet 5.5
helpers plus the main session.

Ranking rule (Ak, saved in memory): 1 zero cost + stability + security →
2 clear, explained, intuitive UI → 3 variety without paid video models →
4 quality control → 5 automation → 6 social posting (a third app, later).

Hours are human work hours, conservative.

---

## What Ak decided on 26 Oct

| Topic | Decision |
|---|---|
| Scope | **All items 1–47 except 8, 44, 45, 46.** 45 (Greek interface) and 46 (Social Forge) later. 44 (public release) parked: maybe a watered-down version, maybe Image Forge only. |
| Fine print (#8) | Dropped for now. Ak may change the licence to "no licence" (all rights reserved). |
| GitHub | Repos stay public (Ak, 26 Oct: not private after all). **Licence removed** instead: no LICENSE file, `"license": "UNLICENSED"` (all rights reserved). Copies already downloaded under Apache-2.0/MIT keep that licence. |
| Credit | **243 left** on tier-1-emf (Ak, 26 Oct) → the whole §3 cast, variants and sets fit, with room for redos. |
| New mini PC | Ak is buying a mini PC with **128 GB unified memory** (probably CUDA, maybe AMD). It brings bigger local models: DramaBox voices locally, local judges, local image editing, music. The post-Christmas end of the Google credit matters less. |
| Credits (#9) | Spend the Google credit on a **puppet library** for Ak's subjects (D&D, dogs and puppies, narcissism and manipulation defence, life coaching and soft skills, seasonals, ELI5 AI and automation, everyday pop-culture ethics and tropes). |
| Puppet review | Today's process is not good. Wanted: zoomed checks per region (mouth, eyes, brows…) compared with what should be there; a stronger positive/negative prompt regime; a clickable ✓/✗ array per picture (mouth, eyes, brows…); **submit changes per page, accept per pose**; **one "no" from any of the 3 checkers = no; one "maybe no" = maybe no.** |
| Motion | A **library of movements** instead of coding each animation: ballet-like, alluring walk, aggressive, pointing with a finger, thumbs up, holding and giving things, dancing, cuddling with a blur, running, entering and leaving, doors and windows, opening boxes, eating… large, with variety inside each type. Mix coded animation with puppets. |
| Character forms | **Two forms** (picture puppet, drawn character) with a switch between them, prepared libraries, and "describe it" → choices picked from the libraries. |
| #15 wardrobe | Asked: "40 choices × 40 items?" → answered in §5. |
| #17 | **Very important**: plain words, and an ELI5 hover popup on **everything**. |
| #19 | Yes. |
| #20 | Animated icons and emoji preferred. |
| #21 | Only an **export file of prompt instructions for Flow**, so hard things can still be made semi-automatically after the credit ends. |
| #22 | Agreed: the platform is being upgraded and the current look is too limited. |
| #24 | Animated transitions included; style presets make choosing a look simpler. |
| #36, #37, #42 | Excited: the local judge, webcam acting, talking photo. Promoted. |

---

## 1. The phases, the effort level for each, and when to switch

| Phase | Effort | What (item numbers) | h | When |
|---|---|---|---|---|
| **0. Safety net** | LOW | #1 back up + remove the licence from both forge repos | 2 | now |
| **1. Foundations** | HIGH | Puppet pipeline first (#51 prompt regime, #12 checks core, #11 per-try records, the 7-puppet pilot), then money, keys and crash safety (#2–#6) | 60 | now → ~2 weeks |
| **2. Review and words** | MEDIUM | #11 review workbench, #12 the rest of the checks, #10 the 784 parts in, #21 Flow export, #7 render proof, #17 plain words + ELI5 everywhere, #22 new look as an A/B page | 60 | weeks 2–4 |
| **3. Credit run** | LOW | #9 puppet library in 3 waves; Ak reviews each wave in the workbench | 10 + Ak's review | weeks 3–7, alongside 2 and 4 |
| **4. Motion and forms** | HIGH | #48 motion library core, #13 two forms + switch + libraries (core), #49 puppet + code mixing (experiments) | 50 | weeks 4–6 |
| **5. Variety** | MEDIUM | #13 form screens, #14, #15, #16, #18, #19, #20, #22 build, #23–#35, #48 the moves and props themselves | 275 | after 4, in any order Ak likes |
| **6a. Engine room** | HIGH | When the new mini PC arrives: #50 worker, #36 local judge, #37 webcam moves | 60 | on arrival |
| **6b. Engine room uses** | MEDIUM | #42, #41, #47, #38, #39, #40 | 60 | after 6a |
| **7. Timeline** | HIGH | #43 | 50 | last |

Total ≈ 630 h. Phases 0–3 are the urgent part (Google credit deadline,
money leaks).

**Why these levels (frugal, honest):**
- **LOW** — the work is a script or a list of exact file:line fixes already
  written in the audits: backups, batch runs, doc edits.
- **MEDIUM** — building screens and content from a spec that already exists
  (this plan + the reports). Most of the hours.
- **HIGH** — foundations where a mistake costs money, leaks keys, or forces a
  rewrite later: the money guard, the security refactor, the checks that
  decide which paid pictures are kept, the motion library's format, the two
  forms' shared card, the mini PC worker, the timeline.
- **ULTRA** — only this planning. Nothing ahead needs it.
- Run `/compact` at the end of every phase; the next phase starts from this
  file, HANDOFF.md and memory.

---

## 2. The items (numbers kept from v1; new ones from 48)

### MUST — protect money, work and keys

| # | Item | ELI5 | h | Phase |
|---|---|---|---|---|
| 1 | **Back up + private repos** | Photocopy 11 days of pencil homework. Add `nelly/` (personal photos) to `.gitignore`; work-in-progress commits; push both repos; copy the 1.1 GB of puppet pictures to the mini PC; make the forge repos private (Phase 0 lists what that breaks). | 2 | 0 |
| 2 | **Money locks, Image Forge** | Every paid door goes past the cashier: one shared "this costs €x — go ahead?" check; unknown price = paid; agents (MCP) free-only unless allowed, with a € cap; per-puppet cap, default €0; the delayed-queue button sends only Google rows and says it's paid. | 10 | 1 |
| 3 | **Money locks, Video Forge** | Show paid-voice cost before a batch, cap it, keep the paid lines if line 40 of 50 fails. | 4 | 1 |
| 4 | **Lock the doors** | Voice servers stop listening to the home network; the render tool can't update itself; the window can't ask for keys; a sneaky SVG can't steal keys (allow-list cleaner + content rules); links open only web pages; window sandbox and path checks. | 9 | 1 |
| 5 | **Nothing lost on close or crash** | Vault can't wipe itself; half downloads discarded; Save project keeps everything; closing during a batch asks first; Stop for one render; Image Forge saves every picture to disk. | 11 | 1 |
| 6 | **Patch known holes** | MCP SDK, zod, Electron in Image Forge; drop Supabase and xlsx. | 2 | 1 |
| 7 | **Film the actor** | A finished video with a drawn character and an explainer, rendered and watched (Chrome / mini PC browsers allowed). | 2 | 2 |
| 9 | **Puppet library on the Google credit** | See §3. | 10 + Ak | 3 |

### SHOULD — finish, check, explain

| # | Item | ELI5 | h | Phase |
|---|---|---|---|---|
| 10 | **The 784 parts into Image Forge** | Cut, reviewed in the workbench, loaded (old ones backed up; private five private). | 4 | 2 |
| 11 | **Review workbench** | See §4. | 25 | 1 (records) + 2 |
| 12 | **Checks that catch the misses** | See §4: zoomed region checks, strictest-vote rule, expected facts per character, free pixel checks, your ✓/✗ marks as the answer key. | 18 | 1 + 2 |
| 13 | **Two character forms + switch + libraries** | See §6. | 26 | 4 + 5 |
| 14 | **Finish the looks** | Shared beard and shoe fix first (lifts ~15 looks), per-look notes, 3 traditional shadow looks, Greek vase from real vases. | 16 | 5 |
| 15 | **Wardrobe, parametric** | See §5. | 16 | 5 |
| 16 | **Hear it before you render** | Sound in the preview, ▶ on every line and character, re-make one line. | 10 | 5 |
| 17 | **Plain words + ELI5 on everything** | Every control, label, status, badge and number gets an ELI5 popup (two sentences, a "more" link). A test fails on anything visible without one; a readability check flags jargon; forge slang replaced; every error says what to do next with a button; missing key boxes added; stale docs fixed. Both apps. | 16 | 2 |
| 18 | **Undo / redo + project list** | Ctrl+Z; open recent by name. | 6 | 5 |
| 19 | **Free pictures and clips everywhere** | Pixabay photos + videos in every mode and in Image Forge (source shown, 24 h cache, download on pick), credits file written automatically; Poly Haven, museum public domain (Met, Art Institute, Smithsonian CC0), NASA, Wikimedia; Freesound CC0/CC BY. Pexels for the key Ak already has. | 14 | 5 |
| 20 | **Animated pop-ups** | Animated emoji and icons pop beside a speaker from a script marker (Google's animated Noto emoji, CC BY: credited; plus our own code-animated icons); the 1930s flashback switch. | 10 | 5 |
| 21 | **Flow export file** | Image Forge and the puppet pipeline write a file of prompt instructions (prompt, style, shape, reference picture names, notes) that the Flow extension loads, for semi-automatic runs after the credit ends. Extension: load the file; download folder in its settings. | 5 | 2 |
| 22 | **New look and layout** | One layout for every mode, a big preview, the stage used fully. First an A/B page of 2–3 directions (WOW, reactbits-level polish, Forge colours); then built into Phase 5 screens. | 6 + 14 | 2 + 5 |
| 23 | **Merge the long branches** | Video Forge's main is from 17 Aug, Image Forge's from 26 Sep; merge after Phase 1, run the standards' release check. | 3 | 5 |

### CAN — variety (all chosen)

| # | Item | ELI5 | h |
|---|---|---|---|
| 24 | **Style presets: effects + animated transitions** | One click picks a whole style: look, effects (halftone, duotone, light leaks, grain, TV-off, glitch from the riso offset), animated transitions (film burn, cross-zoom, page turn, wipes) with automatic whoosh sounds, caption style and music mood. Shown side by side. (Absorbs #31.) | 14 |
| 25 | **Captions that pop** | Word-pop, karaoke, big bold with emoji. | 6 |
| 26 | **Story templates** | Fake text-message story, quiz, would-you-rather, countdown, tier list, from the spreadsheet. | 12 |
| 27 | **Camera moves on stills** | Ken Burns, punch-in, shake; 3D depth parallax from any picture (experimental; Depth Anything V2 Small, or a bigger model on the new mini PC). | 10 |
| 28 | **Explainer kits** | Whiteboard hand-drawing reveal, charts and counters, timelines, map routes, moving text. | 20 |
| 29 | **Costume packs** | Halloween, medieval, caveman, pirate, astronaut, jobs, D&D classes. | 20 |
| 30 | **Lesson cards** | Do/don't, step timers, checklists. | 6 |
| 32 | **Template gallery** | Lesson, news desk, podcast, promo, playing on hover. | 10 |
| 33 | **Image Forge variety** | Sticker sheets, comic pages, thumbnails with A/B text, mock-ups, seamless patterns. | 15 |
| 34 | **One studio** | Order a picture from inside a video scene; send a picture back as a scene. | 6 |
| 35 | **Many videos without restarts** | One render process for a series; each video varied enough for YouTube's "repetitive content" rule. | 6 |

### MAY → promoted (Ak: "gamechanger")

| # | Item | ELI5 | h | Phase |
|---|---|---|---|---|
| 36 | **Local judge** | A vision model on the new mini PC checks every puppet part for free, and learns from your ✓/✗ marks (mouth checker trained on mouths you accepted). | 12 | 6 |
| 37 | **Act it out** | Your webcam pose (MediaPipe, free) records a move straight into the motion library (#48). | 12 | 6 |
| 38 | **Top-moments shorts** | Finds the best moments of a long video and makes shorts. | 15 | 6 |
| 39 | **Video Forge agent tools** | Claude or n8n can order a video; free engines only unless allowed. | 8 | 6 |
| 40 | **Satisfying-loop split screen** | Code-made satisfying animation beside the story. | 8 | 6 |
| 41 | **Local mood music** | ACE-Step (Apache-2.0) on the mini PC. | 6 | 6 |
| 42 | **Talking photo** | A photo or puppet that talks, made locally (MuseTalk / SadTalker; not LivePortrait). Cartoon faces untested: experimental. | 16 | 6 |

### STRETCH (chosen)

| # | Item | ELI5 | h |
|---|---|---|---|
| 43 | **Timeline editor** | One video made of scenes you drag: puppet, drawn character, explainer, stock. | 50 |
| 47 | **Overnight renders on the mini PC** | The mini PC renders while the laptop sleeps (part of #50). | 6 |

### New items

| # | Item | ELI5 | h | Phase |
|---|---|---|---|---|
| 48 | **Motion library** | See §7. A shelf of ready-made moves any character can perform, with styles and variety, instead of new code per animation. | 25 core + 40 moves/props | 4 + 5 |
| 49 | **Puppets + code mixing** | See §7: (a) picture puppets with coded props, effects and pop-ups around them; (b) experiment: a picture puppet cut into limbs on the same skeleton, so the motion library moves it too. | 20 | 4 |
| 50 | **Engine room on the new mini PC** | One worker service the laptop apps send jobs to (Tailscale only, with a token): DramaBox voices, a local LLM for the AI helpers (no key, no quota), the judge (#36), local picture editing for puppet parts (Qwen-Image-Edit, Apache-2.0, to be tested against Nano Banana 2.1), music (#41), talking photo (#42), overnight renders (#47). | 20 + 3 per model | 6 |
| 51 | **Prompt regime v2** | See §4: a facts sheet per character in every prompt, region-only edit wording, positive phrasing of what must stay, per-part "keep exactly" lists. Fixes the "both eyes" bug. | 6 | 1 |

### Parked / later / dropped
- **8** fine print — dropped for now. Two things outside licences still bite in private use: the ElevenLabs **free** plan forbids commercial use (monetised videos), and Pexels gives no new keys (Ak's existing key works).
- **44** public release — parked; maybe a watered-down build, maybe Image Forge only.
- **45** Greek interface, **46** Social Forge — later.
- **31** merged into 24.

---

## 3. The puppet library on the Google credit (#9)

**Credit left: 243** (Ak, 26 Oct 2026). Plan: the whole cast below + variants + sets (≈ 200), ≈ 40 kept for redos and extras.

**Cost per puppet (estimate).** A full puppet in the 25 Oct run (head + full
body + 3/4 view, 59 parts + bases) is about 62 pictures; head-only about 20.
At Nano Banana 2's batch price ($0.034 a picture — Nano Banana 2.1's own price
gets checked before wave 1) plus 20% redos:

| Kind | Pictures | ≈ cost |
|---|---|---|
| Full puppet (+4 new hand poses: point with finger, thumbs up, hold, give) | ~66 | $2.70 |
| Head-only puppet | ~20 | $0.80 |
| Outfit variant of an existing puppet (head unchanged, so face parts are reused — to be proven in the pilot) | ~10 | $0.40 |
| Empty set / background (storytime rooms) | 1 each | $0.04 |

**The cast (first draft, 79 characters; Ak edits it in the pilot review).**
Every design is our own. No show, film or game character is copied.

| Subject | Characters | Style |
|---|---|---|
| D&D (18) | Dungeon Master narrator, dwarf fighter, elf wizard, halfling rogue, human cleric, half-orc barbarian, tiefling warlock, dragonborn paladin, gnome bard, human ranger, tavern keeper; goblin, kobold, orc, skeleton, dragon (head), mimic chest, owlbear | Ak picks in the pilot. Monsters only from the free SRD list: beholder, mind flayer, displacer beast and githyanki are Wizards of the Coast's own and stay out. |
| Dogs and puppies (12) | Labrador puppy, golden retriever, German shepherd, border collie, beagle, French bulldog, chihuahua, dachshund, husky, mixed-breed rescue; dog trainer, vet | Skilitsa look (Pixar-like 3D) unless Ak says otherwise |
| Narcissism and manipulation defence (9) | the charmer / love-bomber, the gaslighter, the guilt-tripper, the credit-stealing boss, the "flying monkey", the stonewaller, the target who learns, the wise friend, the therapist | archetypes, never diagnoses or real people |
| Life coaching and soft skills (8) | coach, team lead, new hire, difficult colleague, upset customer, quiet introvert, loud extrovert, older mentor (plus Alex, Maria, Nikos, Elena, Yiayia Eleni, Captain Stavros already made) | |
| Seasonal (16) | Santa, Mrs Claus, elf, reindeer, snowman, Cupid, Easter bunny, Easter chick, witch, vampire, ghost, pumpkin-head, turkey, leprechaun; Greek: kalikantzaros, Agios Vasilis | Rudolph and Frosty are protected characters: generic reindeer and snowman only |
| ELI5 AI and automation (6) | friendly AI orb, helper robot, workflow gear-bot, software-bug gremlin, confused beginner, tinkerer (plus Blip, Bolt, Grump) | |
| Pop-culture ethics and tropes (10) | the Chosen One, the Mentor, the monologuing Villain, the Sidekick, the Anti-hero, the Influencer, the Mysterious Stranger, the Nerd, the Jock, the Host | original designs only |

Plus: ~40 outfit variants (seasonal hats and costumes for existing puppets)
and ~120 empty sets (6 rooms × 7 subjects, 3 variants: tavern, dungeon, dog
park, vet, office, therapist's room, living room, Christmas workshop…).

| Budget | What it buys |
|---|---|
| ≈ $100 | Core: ~30 full + ~10 head-only, all sets |
| ≈ $200 | the whole cast above + variants + sets |
| more | more breeds, monsters, variants; bases-only extras for the new mini PC to finish locally (risky until local editing is proven) |

**Order:** prompt regime v2 and the new checks first (Phase 1) → **pilot**:
2 style options per subject, bases only (~14 pictures, under $1); Ak picks →
one full puppet per subject (7) → Ak reviews in the workbench → **3 waves** a
week apart, each reviewed before the next; last wave by ~10 Dec, leaving room
for redos before the credit ends. Every prompt is saved, so the Flow export
(#21) can re-make anything later.

Review load, honestly: ~79 puppets × ~66 pictures ≈ 5,000 pictures. The checks
must pass most of them; Ak sees the flagged ones plus a 5–10% random sample.
With keyboard review at ~3 s a picture, the flagged share should be a few
hours per wave, not days.

---

## 4. Puppet review and checks (#11, #12, #51)

**Prevention (#51, prompt regime v2):**
- A **facts sheet** per character, written once at base approval: species,
  number of eyes, lips yes/no, ears, colours (hex), clothing, one-sided details,
  what must never appear. Injected into every edit prompt.
- Region-only wording: "edit only the mouth area; keep everything else
  exactly as in the reference." What must stay is stated positively ("keep
  the single eye exactly as it is"), because image models follow positive
  descriptions better than "no X" (to be re-checked against Google's current
  prompting guide).
- Per-part "keep exactly" lists (mouth edit: eyes, brows, outline, colours,
  background).
- The "both eyes … parallel" sentence becomes "the eye(s)" from the facts
  sheet (the bug that gave Blip two eyes).

**Zoomed checks (#12):**
1. For each part, crop the **same box** from the base and the edit (mouth,
   each eye, each brow, ears, outline), enlarge both.
2. Pixel checks first, free and instant: nothing changed outside the part's
   box; specks, holes, leftover background colour; head shifted.
3. Each judge answers **atomic questions per crop**, checked against the
   expected answer from the part and the facts sheet: "How many eyes in this
   crop? (number)", "Is the mouth open with teeth showing?", "Are there lips?",
   "Is anything different from the left picture?".
4. **Strictest vote wins:** any judge "no" → **no**; any "maybe no" → **maybe
   no** (goes to Ak); unanswered is never "yes"; "not checked" is never green.
5. A free "same character?" score against the base (DINOv2, runs on the CPU).

**The workbench (#11):**
- A full page, not a pop-up. Left: parts grouped by pose (Mouths, Eyes, Brows,
  Arms, 3/4 view, Full body) with counts and filters (Needs you / Maybe no / No
  / Accepted).
- Each picture has a **clickable ✓/✗ row**: mouth, eyes, brows, ears,
  outline, colours, background, other — plus a note. These marks are the
  answer key that tunes the checks.
- Every try kept, with its prompt (positive and negative), engine, seed and
  the judges' answers; a strip of all tries per part, the zoom stays in place.
- **Submit changes per page** (one button sends all the marks and redo
  requests on the page); **accept per pose** (accepting a pose accepts its
  parts together).
- Contact sheet: all mouths side by side on the face at one scale (same for
  brows and lids).
- Keyboard: arrows move, ✓/✗ keys, Enter submits the page.
- Exports: "Copy for Google Sheets" and the Flow file (#21).

---

## 5. Wardrobe: "40 choices × 40 items?" (#15)

No: v1 meant ~40 items in total. But items should be **parametric** — each
item type is one drawing with sliders (a hat: brim width, crown height, band,
tilt; a shirt: collar, sleeve length, pattern, 1–3 colours). So 40 item types
× their sliders × colours × patterns give thousands of different outfits,
and the AI or the form picks the slider values. Plan: 40 parametric types in
#15 (16 h), the costume packs in #29, then ~120 types over time.

---

## 6. Two character forms with a switch (#13)

- One **Characters** screen with a switch: **Picture puppet ⇄ Drawn
  character**. Shared on top: name, description, personality, voice, subject
  tags (D&D, dogs, …). Below: the fields for that kind.
- **Prepared libraries:** character presets per subject (the §3 cast as
  drawn presets too), wardrobe, moves, looks.
- **Describe it** ("a grumpy dwarf cook with a ladle") → the AI picks values
  from the libraries only (never invents), shown as a diff to accept field by
  field. Works for both kinds: for a puppet it picks from the shelf or fills an
  Image Forge order.
- **Convert:** "make a drawn version of this puppet" (the AI already reads a
  picture into a card) and "order a puppet of this drawn character".
- Readable-size warning, examples under every field, ELI5 on everything.

---

## 7. Motion library and mixing (#48, #49, #37)

**A move** is data, not code: keyframes for the skeleton's joints, hand
shapes, a path (entering, leaving, walking across), props it uses, facial
expression cues, length, loopable or not, tags.

- **Variety inside a type:** every move takes a style (graceful, aggressive,
  tired, shy, proud, playful), energy, size and tempo, plus seeded wobble and
  mirroring, so "walk" alone gives dozens of different walks.
- **Hands:** a hand-shape set (point with finger, thumbs up, open, fist, OK,
  peace, grip, wave) used by any move.
- **Props:** objects with grip points (cup, phone, book, box with a lid,
  gift, flowers, sword, leash, ball) and scene objects with action points
  (door opens/closes, window, chair, table, box opens).
- **Two-person moves:** give/receive, handshake, high five, hug and cuddle
  (with a soft blur), pair dance.
- **Starter shelf (~60 moves):** walks (normal, alluring, tired, sneaky,
  march, skip), run, jump, enter/exit from either side or a door, ballet-like
  flow, dances, aggressive stance and lunge, point, thumbs up, wave, shrug,
  explain, hold, give, open door, open window, open box, eat, drink, sit down,
  stand up, cuddle, cheer, facepalm…
- **How moves get made:** written as data (Phase 4–5), recorded from the
  webcam (#37), and optionally imported from free motion-capture data (CMU
  database: licence to verify). Text-to-motion AI models exist but are trained
  on non-commercial data — avoided for now.
- **Script tags:** `[walks in]`, `[gives the box to Maria]`, `[opens the
  door]`; the AI can suggest them from the script.

**Mixing with picture puppets (#49):**
- (a) Now: picture puppets share scenes with drawn characters (already per
  speaker), and gain coded props, effects, pop-ups and entrances (slide/fade
  in, bounce).
- (b) Experiment: a picture puppet cut into limbs (upper arm, forearm, hand,
  thigh, shin, foot) on the same skeleton, so every move in the library works
  on puppets too. Joints may show; judged on an A/B page before going further.
- (c) Experiment: a picture puppet's head on a drawn body in matching colours.

---

## 8. Phase 0 detail: repos (superseded 26 Oct: stay public, licence removed instead)

Public today (checked 26 Oct with `gh`): **DnD-World/Video-Forge**,
**Stravelakis/image-forge**, **DnD-World/Image-Forge-BYOK-4freeAPI** (older).
Already private: Free-Video-Creation-BYOK. Other public repos (langplay,
skilitsa-id, qwendogfood, dog-food-in-greece, Voice-recorder, mystory,
Stravelakis.github.io, BlankStare, deco-noir-template, DogPark-Weather,
infra-guardian) are not forge repos and stay as they are unless Ak says so.

What going private breaks (GitHub's rules; to be re-checked at the time):
- Stars and watchers are erased (1 star each on Video-Forge and image-forge).
- Image Forge's **in-app "Update now"** and the README download link read the
  public releases page: they stop working, for Ak's own install too. Updates
  then come from a local build.
- stravelakis.com/forge forwards to the GitHub repo list: visitors see fewer
  repos.
- Copies already downloaded under Apache-2.0 keep that licence; a "no
  licence" choice applies to new versions only.

---

## 9. The new mini PC

- Everything this project runs today was built and tested on NVIDIA (CUDA):
  DramaBox, the torchaudio word aligner, local image engines. If there is
  still a choice, CUDA avoids surprises; on AMD some of these may need
  different builds or may not run. Unknown until tested on the machine.
- Same house rules as the current mini PC: services listen on Tailscale
  only, with a token; heavy runs announced first.

---

## 10. Evidence

| Report | What |
|---|---|
| [audit-video-forge.md](research/ultra-2026-10-25/audit-video-forge.md) | 8 high, 17 medium, 12 low; tests 91 pass; quick wins |
| [audit-image-forge.md](research/ultra-2026-10-25/audit-image-forge.md) | 2 critical, 9 high, 12 medium, 10 low; tests 728 pass; review redesign; QC |
| [research-qc.md](research/ultra-2026-10-25/research-qc.md) | the QC ladder, judges, embeddings, licences |
| [research-free-sources.md](research/ultra-2026-10-25/research-free-sources.md) | Pixabay/Pexels rules, 30 sources, free AI tiers |
| [research-video-methods.md](research/ultra-2026-10-25/research-video-methods.md) | 54 techniques, local models and licences, formats |
