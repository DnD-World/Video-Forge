# The Forges: review and plan (13 Oct 2026)

A full review of **Image Forge** and **Video Forge**, Ak's notes from 13 Oct,
and what the market says creators and small businesses need, in Greece and in
the English-speaking world. **Nothing in here is built yet.** It is the work
list for the next rounds, in the order recommended at the end.

Each item says what is wrong, why (when found), the fix, and an estimate in
human work hours. Where there is one clearly right fix, it is simply the fix.
Real choices are collected in "Decisions" and are kept to the few that are
truly a matter of taste.

Sources for the review: the code of both apps (branches `forge-twins` and
`dramabox-knobs-and-chatterbox-removal-rlrwzu`), four helper sweeps (Image
Forge docs, hover-help count in both apps, Canva's developer docs, market
research), and the shelf and settings on this computer.

---

## 0. Found today, before anything else

| What | Finding | Status |
|---|---|---|
| Image Forge "lost" its keys | Not lost. The app keeps its settings in a box tied to the local address it opens on (port 47821). A test copy of mine was holding 47821, so Ak's copy opened on 47822 and found an empty box. The old box still holds everything. | **Ak: close Image Forge fully (tray icon too) and open it again.** The keys come back. Today's list in Made will look empty until fix U1 merges the two boxes. Pictures saved to the folder are safe either way. |
| LocalAI open to the home network | Checked: now listening only on this computer (127.0.0.1) and on Tailscale (100.73.36.42). | Fixed by Ak. |
| research-agent `web_search` | Errored for every call from two helpers today. | Logged with `report_issue`. |

---

## 1. Urgent: things that lose or hide your work

**U1. Settings and keys must survive anything (Image Forge). 6 h**
- Cause, confirmed: everything sits in the page's own storage, and that storage
  is tied to the port. A second copy, a test copy or a busy port means a fresh,
  empty box.
- Fix:
  - The app saves settings to a file in its own folder. Keys go into that file
    encrypted, the same way the shared key file is. The page's storage becomes
    only a copy.
  - Only one Image Forge runs. Opening it again brings the open window forward.
  - Test copies use their own ports and folders, so they can never take Ak's.
  - A one-time merge brings both boxes (47821 and 47822) back together, so
    nothing made today disappears.
  - Share **every** key with Video Forge, not only 4. Today only Gemini,
    OpenRouter, Mistral and NVIDIA are shared; Cloudflare, Pollinations and the
    rest are not.
  - Updates never touch the settings file. A test proves it.

**U2. The Image Forge chat gives wrong directions. 1 h, inside I-3**
- It answers app questions from one facts file (`src/lib/appFacts.ts`). That
  file still says "nine-step wizard", "Saved recipes" and a "Forge" tab.
- The chat itself needs a real test with keys after U1 (Ak is not sure it works).

---

## 2. Both apps: hover help on everything

**B1. A help bubble on every click, field and choice. 14 h (most of it writing the text)**
- Today:
  - Video Forge has a bubble, but 111 of 180 controls have no text.
  - Image Forge has only the browser's small grey tooltip, which shows late and
    unstyled. 312 of 380 controls have no text.
  - Worst gaps: the paid-spend "Spend it — go ahead" button, Run queue, Make the
    sheet, all of Settings (73 bare), the wizard (30 bare).
- Fix:
  - **One bubble for both apps:** Video Forge's, moved into a shared file.
  - It sits above everything in the app; only the cursor is above it.
  - It stays open while the mouse moves into it.
  - Text is ELI5 and at most two sentences. Anything longer gets a
    "More about this ↗" link to the right docs page.
  - The slider, toggle, picker, knob and number components gain a `tip` setting,
    so no control can be built without one.
  - A test fails the build when any button, field or link has no help text.
    That is what "no functional click is naked" means in practice.
  - Tips are written in English first. Greek tips come with the Greek
    interface (O-1).

**B2. Small leftovers from the last round. 2 h**
- Image Forge's top-bar queue buttons ("Run queue · 4") repeat Made's
  "Make the N waiting" → keep one.
- The puppet checker is too strict about hats being "cut off" → loosen it.
- The run names in Many videos → `<sheet name> · <date> · <row count>`.

---

## 3. Image Forge

**I-1. Start forgets what you asked for. 2 h**
- Cause: the Start page keeps "what I'm making" only while it is on screen.
  Leave the page and it is forgotten, even though the work carries on.
- Fix: the app remembers it. Start always shows:
  - the run in progress, live;
  - the last finished run;
  - under them, "See everything in Made →".

**I-2. Remove Appearance from Settings. 1 h**
- The Forge look is the only look now. Old saved looks are moved to it once.

**I-3. Docs, agents and API pages are behind. 10 h**
- The standards ask for **three** reading levels: Dev, English and ELI5. The
  docs site has all three, but they stopped at version 1.0.3.
- Out of date: README, GUIDE, docs index, no-code, creators, developers,
  troubleshooting, the in-app manual and the CHANGELOG.
- The **Agents** page shows made-up example code instead of the real eight
  `forge_*` tools.
- Missing on every level: the puppet maker, Made, Templates, the Video Forge
  twin, shared keys, local engines (Z-Image, FLUX.2 klein) and Cloudflare
  FLUX.2.
- Also: fix the facts file the chat reads (U2), update the HANDOFF header,
  and note why the licence is Apache-2.0.

**I-4. The "Make a sheet" page. 3 h**
- The pill buttons are too tight for their words → give them room and let
  them wrap.
- Cursor chaser: a glow that follows the mouse, shown on this page and on
  Start. The style is decision **D1**.

**I-5. The chat tab. 2 h**
- A full test after U1: every engine, and a long answer.

---

## 4. Puppets (made in Image Forge, played in Video Forge)

Ak: "the puppet maker is great! really great!!!!". These items take it from
great to production-ready.

**P-1. F·V comes out with letters on the mouth. 1 h**
- Cause: the request itself says "'fff' sound" and "no letters". Both put
  letters in the picture model's head.
- Fix:
  - Describe the shape only: upper front teeth resting lightly on the middle of
    the lower lip, lower lip tucked slightly under them.
  - Remove every sound name ("saying AH", "saying L") from **all** mouth
    requests. The word "letters" goes to the list of things to avoid, not into
    the request.
  - The checker still rejects any letter it sees.

**P-2. L sticks the tongue out. Included in P-1**
- New wording: mouth slightly open; the tip of the tongue touches just behind
  the upper front teeth and stays inside the mouth; only the tip is visible.

**P-3. Lips or no lips, one per puppet. 2 h**
- Step 1 gains "Lips: drawn lips / no lips (just a mouth opening)".
- It is chosen automatically from the style and the description (a doodle or
  an owl gets none; a 3D person gets lips), and you can change it.
- The choice goes into the base picture and into every mouth edit. The checker
  rejects a mouth that does not match.

**P-4. Smoother mouths with in-between shapes. 6 h**
- Today:
  - Each word's letters are spread evenly across the word.
  - A shape must stay at least 2 frames.
  - Changes cross-fade.
  - This flaps on fast speech.
- Fix, three parts:
  1. **Calmer timing:**
     - Each shape stays at least about 100 ms.
     - Look-alike shapes merge in fast speech (OO→OH, SH→EE).
     - Quick consonants inside a word are skipped.
     - The mouth closes between words only on a real pause.
  2. **Loudness sets how wide:** a quiet syllable uses a smaller version of the
     shape.
  3. **Three half-open pictures** (small AH, small OH, small EE), made with the
     rest. Every jump between two open shapes passes through the nearest half
     shape, which covers L→O, OO→L, EE→AH and the rest. Separate pictures for
     every pair would need 56, so they are not made.
- Works the same for puppets that already exist. Those without half shapes
  just skip step 3.

**P-5. Hands that stay at rest while also waving. 5 h**
- Cause, confirmed: an arm pose is drawn **on top of** the resting arms, and
  the resting arms are never erased. So you see the wave and the arm at the
  side together.
- Fix:
  - Each pose becomes a **whole body picture**, head excluded, that replaces
    the resting body while it is used.
  - The head and face layers stay on top, so talking and blinking carry on.
  - The body changes with a quick soft blend.

**P-6. The background bleeding, not covering, or behaving badly. 6 h**
- Fix, all three:
  - **Pick the key colour per character:** magenta normally, green for a pink
    or purple character, blue for a green one.
  - **Clean the edges:** remove the leftover background tint from the outline,
    not only from the outside.
  - **An AI cut-out on this computer** (a small free background-removal model
    that runs inside the app, no GPU needed) as the safety net on the base
    picture. The parts are still cut by comparing with the base, so they line
    up exactly.
- The checker gets one more question: is there any background colour left
  around the character?

**P-7. A 3/4 set for two people talking to each other. 10 h**
- In Image Forge, "Also make a side-facing set", on by default for waist-up
  puppets:
  - The base is turned 3/4, then the same parts are made for it (about 27 more
    pictures).
  - The other side is a mirror copy, made for free. If the character has
    one-sided details (a badge, a parting, a logo), the other side is made too.
- In Video Forge, each speaker gets "Faces: camera / left / right / auto".
  "Auto" turns two speakers towards each other while one talks to the other,
  and back to camera for the audience.

**P-8. Legs: standing and sitting. 10 h**
- New framing, **Full body**, with two body pictures:
  - **standing**;
  - **sitting** (on a simple stool or chair that is part of the picture).
- Both share the same head layers. The neck point is measured for each body.
- Legs do not animate. A small idle sway keeps them alive.
- Video Forge: "Stands / Sits" per speaker, and a `[sits]` / `[stands]` tag
  for changes mid-video.

**P-9. Hand movement Ak has never seen. 3 h, plus a test video**
- Cause, confirmed:
  - Both shelf puppets (Foxy, Hoolio) are head-only, so they have no arm
    pictures.
  - Gestures fire only on script tags (`[waves]`) and greetings.
- Fix:
  - Waist-up becomes the default framing.
  - **Automatic gestures:**
    - a greeting → wave;
    - a question → shrug;
    - "this / here / look" → point;
    - explaining sentences → explain, taking turns with rest.
  - A "How much they gesture" slider (none → lively).
  - Proof: one waist-up puppet made end to end, and a video where it waves and
    explains.

**P-10. Delete a puppet. 1 h**
- In the puppet maker: "Delete this puppet", with a second "Yes, delete it"
  click.
- On the Video Forge shelf: the same, with the same confirmation.

**P-11. Puppet thumbnails that move. Inside V-1**

---

## 5. Video Forge

**V-1. The "+" menu: every character, with faces that move. 4 h**
- On this computer there are 5 characters: Kaiti, Serifis and Tsika (each in
  several versions: classic picture set, rig, wide rig), Foxy and Hoolio. Ak
  counts 8; if 3 more exist somewhere, they need a location.
- Today:
  - The old three show as bodies without faces, because their format draws the
    face on top.
  - Foxy and Hoolio show a still picture.
- Fix:
  - **Live mini puppets**: the real face, blinking. On hover they talk.
  - Grouped as Ready-made · Made in Image Forge · My library.

**V-2. "Create new" in the "+" menu. 2 h**
- The send button is too dark to read → use the bright main button.
- Add "**Order it from Image Forge**", which sends the order and shows it as
  ordered → being made → ready, then appears on the shelf by itself.
- Add "**Open Image Forge**".

**V-3. Boiling: shows on the tile, not in the preview. 1 h**
- Likely cause, found in the code: the tile and the big preview give their
  colour fades the same names, so the preview uses the tile's, which point to
  the wrong place and draw nothing.
- Fix: unique names per drawing, then check every style the same way.

**V-4. The preview's sample subtitles alternate Greek and English. 1 h**
- With no narration yet, the sample line changes between a Greek and an
  English sentence every few seconds, so fonts and sizes can be judged in both.

**V-5. Hands and legs.** See P-5, P-8 and P-9.

---

## 6. Getting ready for Social Forge and Content Forge

Nothing here blocks the two new forges. The shared folder both apps already use
(`%APPDATA%\Forge`, which holds the keys, the puppet shelf and the orders)
becomes **the Forge hub**.

| Prepare now | Why the new forges need it | Hours |
|---|---|---|
| **Orders between any forges**, not only Video → Image puppets. Each order says from, to, what kind, and its status. | Social Forge orders "a 15 s video of this product" or "4 pictures for this post". | 3 |
| **One list of everything made**, in the hub. Each entry: file, size and shape, language, title, alt text, caption drafts (EL and EN), tags, link, engine. | Social Forge's pantry: pick, caption, post. | 4 |
| **A shared brand kit** (logo, colours, fonts, tone of voice, hashtags, links, call to action, languages). Video Forge's brand packs move into the hub format. | Every forge looks and sounds the same for one business. | 4 |
| **A forge switcher** instead of the twin button: it lists every installed forge. | Four apps, one click between them. | 1 |
| **A local API and agent tools for Video Forge**, like Image Forge's `forge_*` tools: make a video from a script, from a sheet row, check status. | Social Forge and agents can order videos. | 5 |
| **Fixed, documented sheet columns** for Prompt factory and Many videos. | Content Forge will write those sheets. | 1 |

---

## 7. Using Canva from the Forges

Canva's developer kit (Canva Connect) lets an app act on someone's Canva
account. From Canva's docs:

| Can do | Plan needed |
|---|---|
| Upload pictures (<50 MB) and videos (<500 MB) | any |
| Create a design of any size with a picture in it | any |
| **Fill a Canva template from data** (text, pictures, even a video in a picture slot) | **Pro**, Teams or Enterprise |
| Export as PNG, JPG, GIF, PDF, PPTX or **MP4** (480p to 4K) | any (Free has a few limits, e.g. no see-through PNG) |
| Resize into a new copy | Pro (Free gets a tiny trial) |
| Make templates or template fields by code | **not possible**; done once in Canva |
| "Bulk Create" through the API | **not offered**; one fill per row instead, up to 60 a minute |

**Recommended way in:**
- Each user makes their own free Canva "integration" and pastes its two codes
  into the Forge, like the other keys. It signs in on this computer.
- No Canva review is needed, and no secret ships with the app.
- A shared public "Forge" integration would need Canva's review and a hosted
  sign-in page. That is only for later, when going public.

**What it gives (Image Forge first, then the others):** 9 h

| Feature | Forge |
|---|---|
| **Send to Canva**: a batch goes into a Canva folder, ready to design with. | Image |
| **Fill my Canva template from a sheet**: pick a template, map columns to its fields, one finished design per row, exported back into Made as PNG or MP4. This is Canva's Bulk Create, driven by the Forge. | Image, Content |
| **Video into a Canva template**: a Video Forge video fills a template's video slot (e.g. a branded frame or an end card), exported as MP4. | Video |
| Later, Social Forge posts the exported designs. | Social |

---

## 8. Opportunities: what creators and small businesses struggle with

What the research found, with sources:
- Small businesses: 93% name a social-media struggle. The top one is posting
  consistently, and fewer than a third use any scheduling tool
  ([Clutch](https://clutch.co/resources/social-media-marketing-challenges)).
- Customers distrust content that looks AI-made: 53% are less likely to buy,
  and nearly 90% want it disclosed
  ([Clutch, Aug 2026](https://clutch.co/press-releases/ai-social-media-report)).
- Creators: editing is the top complaint, and burnout and time follow. Adapting
  one piece to each platform is the top repurposing problem (38%)
  ([Canto/Ascend2](https://www.marketingprofs.com/charts/2024/52480/the-top-challenges-businesses-face-with-repurposing-content)).
- Creators want AI to speed them up, but 85% want the final say
  ([Adobe, via Agile Brand Guide](https://agilebrandguide.com/adobe-report-87-of-ai-using-creators-say-the-technology-is-accelerating-business-growth/)).
- Greece:
  - Among the lowest AI use in the EU: 7.3% of small firms vs a 20% EU average
    ([Eurostat](https://ec.europa.eu/eurostat/documents/7870049/23260410/KS-01-26-009-EN-N.pdf/37d063cb-28cf-3b4e-91f3-c3784c970842?t=1774528533658&version=1.1)).
    The market is open, but needs hand-holding.
  - Reach is led by YouTube, Facebook, Instagram and TikTok
    ([DataReportal](https://datareportal.com/reports/digital-2026-greece)).
  - Shops run mostly on WooCommerce and feed Skroutz
    ([wmtips](https://www.wmtips.com/technologies/e-commerce/country/gr),
    [Naftemporiki](https://www.naftemporiki.gr/?p=2014113)).
  - 7 in 10 tourists arrive June to September
    ([PwC](https://www.pwc.com/gr/en/Reimagine%20Tourism%20in%20Greece_Challenges_final%20version_english.pdf)).
  - Hotels need Greek and English content
    ([Tourismos](https://tourismosjournal.aegean.gr/article/download/486/436/862)).
  - In Greek speech, the stress mark changes the meaning (πότε/ποτέ)
    ([tts.ai](https://tts.ai/text-to-speech/greek/)).
- The EU AI Act's rules on disclosing AI-made content apply from 2 Aug 2026
  ([summary](https://artificialintelligenceact.eu/transparency-rules-article-50/);
  check the official text).
- Not found: a Greek small-business survey on content struggles; Viber usage
  figures; an independent test of Greek voices.

**Cheap, on what exists** (recommended first):

| # | Feature | Forge | Solves | For | Hours |
|---|---|---|---|---|---|
| O-1 | **Greek interface** (menus, help bubbles, docs) | both | Greek users who need hand-holding | GR | 15 |
| O-2 | **One video, every shape**: 9:16, 1:1, 4:5 and 16:9 from one render | Video | Per-platform rework | all | 5 |
| O-3 | **Twin language render**: one script gives a Greek and an English video, with the same puppet | Video | Tourism, bilingual shops | GR+EN | 4 |
| O-4 | **Greek stress fixer**: adds missing stress marks before the voice speaks, plus a "say it like this" word list | Video | Wrong stress changes meaning | GR | 4 |
| O-5 | **Voice taster**: one line through several Greek voices side by side, pick by ear | Video | No trusted Greek voice ranking | GR | 2 |
| O-6 | **Subtitles out**: SRT/VTT files beside every video, Greek and English | Video | Re-use, accessibility | all | 2 |
| O-7 | **Make it shorter**: cut a script to 15, 30 or 60 s | Video | Short-video demand | all | 3 |
| O-8 | **Honest AI label**: an optional "made with AI" line in captions plus a hidden file marker | all | Distrust, AI Act | all | 2 |
| O-9 | **Cost meter**: what each picture or video cost per engine, steering to free | all | Low budgets | all | 3 |
| O-10 | **Hotel, café and shop starter packs** (Greek and English templates) | Image + Video | Small tourism firms | GR | 6 |
| O-11 | **Thumbnail maker** with A/B variants | Image | Clicks | creators | 4 |

**Bigger** (mostly the new forges):

| # | Feature | Forge |
|---|---|---|
| O-12 | Product photo + description → 15 s ad video | Video + Image |
| O-13 | Product picture sets from one photo (white background for Skroutz, lifestyle scenes) | Image |
| O-14 | Skroutz/WooCommerce product descriptions in bulk, Greek and English | Content |
| O-15 | Top-10s and comparisons with a sourced facts table | Content |
| O-16 | Captions and hashtags per platform, with link and call to action | Social |
| O-17 | Calendar and scheduler (Facebook, Instagram, YouTube, LinkedIn, TikTok), approve-before-post | Social |
| O-18 | Season planner: summer peak and shoulder months | Social |
| O-19 | A month of content from one topic: sheet → videos + pictures + captions | all |
| O-20 | Long → short: one lesson or article into clips, quotes and carousels | Video + Content |
| O-21 | Results loop: post stats come back and suggest what to repeat | Social |

---

## 9. Decisions

Only one real choice. Everything else above is the recommendation, and it
stands.

**D1. The cursor chaser's style.** It is a matter of taste, so it gets a
comparison page with three live versions, the Forge violet on black:
- a soft glow trail;
- a ring that snaps around anything clickable;
- liquid smoke.

---

## 10. Recommended order

| Round | What | Hours |
|---|---|---|
| 1 | U1 keys and settings, U2, I-1, I-2, V-3, V-4, B2 | 14 |
| 2 | Puppets: P-1, P-2, P-3, P-5, P-6, P-9, P-10, V-1, V-2, then a waist-up puppet and a video as proof | 28 |
| 3 | B1 hover help in both apps, I-4 with D1, I-5 | 19 |
| 4 | I-3 docs on all three levels, both apps (Video Forge's docs too) | 15 |
| 5 | P-4 smoother mouths, P-7 side-facing, P-8 full body | 26 |
| 6 | Forge hub prep (section 6) and Canva (section 7) | 27 |
| 7 | Cheap opportunities O-1 to O-11 | 50 |

About 180 human work hours in all. Rounds 1–2 make what exists solid; rounds
3–4 make it understandable; rounds 5–7 make it bigger.

---

## Status (13 Oct 2026, evening)

| ID | State |
|---|---|
| U1 settings and keys survive anything (vault) | done |
| U2 / I-5 Image Forge chat gives wrong directions | done (chat fixed) |
| B1 help bubble on every control | done |
| B2 small leftovers | done |
| I-1 Start remembers what you asked | done |
| I-2 Appearance removed from Settings | done |
| I-3 docs, agents, API pages | not covered in this list |
| I-4 "Make a sheet" page | done (card shapes plus cursor comparison page) |
| P-1, P-2, P-3, P-5, P-6 | partly done: no AI cut-out model; key colour plus spill cleaning instead |
| P-4 smoother mouths | done (`src/lib/visemes/timeline.ts`) |
| P-7 3/4 set, P-8 legs | not started |
| P-9 hand movement | done |
| P-10 delete a puppet | done (moved to `puppets-deleted`) |
| P-11 moving thumbnails | done inside V-1 |
| V-1 "+" menu with live faces | done |
| V-2 "Create new" (Order it from Image Forge, Open Image Forge) | done |
| V-3 boiling in the preview | done |
| V-4 alternating sample subtitles | done |
| O-1 Greek interface | replaced for now by Settings → Language card ("coming soon") |
| O-2 every shape (Tall, Square, Portrait, Wide) | done |
| O-3 twin language video | done |
| O-4 Greek stress fixer and "say it like this" list | done |
| O-6 subtitle files `.srt` / `.vtt` | done |
| O-8 honest AI label | done (Video Forge) |
| O-5, O-7, O-9 to O-21 | not started |

### Later the same evening

| ID | State |
|---|---|
| I-3 docs | done in both apps (three reading levels in Image Forge; in-app manual, Agents page with the real 8 tools, the Chat's facts) |
| D1 cursor chaser | Ak meant a running pet: a violet fox runs after the mouse, sits, naps; any walk cycle from Make a sheet can replace it (Settings → Language & pet) |
| P-7 side-facing set | built: Image Forge makes it ("Also side-facing"), Video Forge turns speakers towards each other (Cast → Faces). **Not yet seen with a real generated puppet** — needs the proof run |
| P-8 full body, sitting | built: Full body framing, "Also sitting", Cast → Sitting. **Same: needs the proof run** |
| Chat (I-5) | fixed for real: empty writing job takes a provider with a key; busy/retired models fall back; NVIDIA relay hung on IPv6 → IPv4 + body length |
| Forge hub (section 6) | made-list (`%APPDATA%\Forge\made\register.jsonl`, videos + puppets) and orders with a `to` field; brand kit, forge switcher, Video Forge local API still to do |
| Canva (section 7) | built: Settings → Canva, Made → Send ♥ to Canva, Wizards → Fill a Canva template. **Untested against Canva itself** — needs Ak's integration (Client ID + secret) |
| Proof run | waiting for Ak's yes: a waist-up puppet with the side view on this computer's graphics card (~1–1.5 h) |
