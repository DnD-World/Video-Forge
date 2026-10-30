# Brief for an AI partner: what our forges can make

You are helping Ak (Stravelakis) plan YouTube series, write scripts and order
artwork for videos made with **two desktop apps he owns**: **Video Forge**
(makes the videos) and **Image Forge** (makes the pictures). The goal is
**one finished upload per channel per day**, so everything you suggest has to
be something these apps can actually make, repeatedly, without hand-editing.

Read this whole file before suggesting anything. Where it says "cannot", plan
around it; don't assume a workaround exists. Facts here were read from the
code on 30 Oct 2026.

---

## 1. The big picture in one table

| Kind of video | What it looks like | Best for | Status |
|---|---|---|---|
| **Puppet video** | Any number of talking characters (no cap in code; every cast member is on screen for the whole video unless a drawn character walks in/out) with lip-sync, subtitles, sound bars, a background, music | Lessons, banter, sketches, Shorts | Main mode, mature |
| **Puppet video in a set** | Characters seated behind furniture: news desk, conference room, stage, podcast, game show | News-style, interviews, quizzes, panels | Built (newest version) |
| **Explainer** | Animated cards drawn by code: titles, bullet points, steps, big numbers, bar charts, comparisons, takeaway | Facts, how-tos, lists, data | Built |
| **Explainer + puppets** | An explainer as the background, with 1–3 talking faces in spots it leaves empty | Lessons that need both a host and diagrams | Built |
| **Many videos** | Any of the above, one per spreadsheet row, made one after another | Daily production | Built |

Every video comes out in any of **9:16 (1080×1920)**, **16:9 (1920×1080)**,
**1:1** and **4:5**, all from one script. Optional second copy in the other
language (Greek ↔ English, translated automatically). Subtitle files (.srt, .vtt)
are written next to every video. Up to **10 minutes** per video.

**Nothing is AI-generated video.** Every frame is drawn by code from the
script, so the same script always gives the same video. There is no "make a
clip of a dog running" — moving pictures come from stock footage, code-drawn
characters, or the explainer cards.

---

## 2. The characters — three kinds

### A. Drawn characters (made by code) — the most flexible
Built from a "character card". They can walk, sit, gesture, hold props, change
clothes, and appear in every art style below. **Ask for these when a
character needs to move, act, or appear in many episodes in different outfits.**

- **21 art styles ("looks")**: 2D stick cutout, geo-minimal, corporate flat,
  sticker, pop-art comic, 1930s rubber hose (black & white / early colour),
  90s sitcom cartoon, Greek vase (black-figure), shadow puppet, Karagiozis
  (two versions, side-on only), 1950s mid-century, chalkboard, paper cut-out,
  risograph print, neon glow, noir comic, stained glass, ballpoint notebook
  doodle, blueprint.
- **Three views**: front, three-quarter, side. Vase, shadow and Karagiozis
  looks turn side-on when two characters talk.
- **Framing**: full body, waist up, head only.
- **Body**: height, thin/average/round build, muscle, head size, posture
  (upright/slouch/hunch), arm length, skin colour.
- **Face**: 4 head shapes, 7 eye types, brows, 5 noses, lips, ears, rosy
  cheeks, freckles; beard (stubble/short/full/goatee), moustache (thin/thick/
  handlebar); 15 hair styles (bald, tuft, buzz, short, side part, spiky,
  curly, afro, bob, long, ponytail, pigtails, bun, braid, mohawk) in any colour.
- **Personality knobs**: resting face (neutral/smile/serious/grumpy), how
  often they blink, how much they gesture, how much they sway.
- **56 clothes and accessories**, in any colours, some with stripes/checks/
  dots/corduroy:
  - tops: t-shirt, polo, shirt, tank, hoodie (hood up or down), sweater
  - over: vest, blazer, himation, lab coat, apron, armour
  - whole outfit: dress, chiton, robe, Santa coat
  - bottoms: trousers, jeans, shorts, skirt
  - shoes: sneakers, shoes, boots, sandals, heels, pointy, wellies, paws
  - neck: tie, bow tie, scarf
  - hats: cap, beanie, top hat, fez, laurel wreath, helmet, wizard hat, crown,
    witch hat, Santa hat, tricorn, chef hat, great helm, beret
  - hair: headband, bow, bunny ears, dog ears
  - eyes: glasses, sunglasses, eyepatch; ears: earrings, headset; cape
- **21 one-click costumes**: wizard, knight, king/queen, rogue, pirate,
  innkeeper, vet, dog trainer, dog costume, smooth charmer, detective,
  villain, office, chef, podcaster, scientist, Santa, Christmas elf, witch,
  Easter bunny, Valentine.
- **24 ready-made starters**, 3 per subject: D&D (dungeon master, dwarf, elf
  wizard), dogs (trainer, vet, owner), manipulation (charmer, target, wise
  friend), soft skills (coach, new hire, team lead), seasonal (winter gift
  giver, snow kid, spooky host), AI (tinkerer, beginner, office sceptic),
  tropes (chosen one, mentor, villain), everyday (yiayia, dad, teen).
- **10 props** they can hold or use: cup/mug, phone, book, box (lid opens),
  gift, ball, flowers, sword, chair, leash.

**Cannot**: animals as drawn characters (no drawn dogs), more than the 10
props, hold arbitrary objects, fight choreography, lie down, change camera
angle mid-line. Faces are cartoon, not realistic.

### B. Picture puppets (made in Image Forge) — the prettiest faces
A portrait (Pixar-like 3D, lifelike, photo, flat, clay, paper, anime, doodle,
stick…) cut into parts: 8 mouth shapes, brows for 5 moods, eyelids. They
lip-sync, blink, change mood, nod, shake their head, and do 4 arm poses
(wave, point, shrug, explain). Ordered from inside Video Forge ("Order it from
Image Forge"); the finished puppet appears in the Cast list by itself.

**Cannot**: walk properly (they bob across), sit, hold props, change clothes,
turn to the side. One puppet = one outfit. **Ask for these for the main
recurring hosts whose face is the brand.**

### C. Photoreal presenters — gimmick only
Real-looking half-body people with bending arms. **Not usable in the app yet**
(only test pages). Hands and the face are not good enough for regular use. Do
not plan series around them; at most a one-off gag.

---

## 3. Writing scripts — the exact format

Two script formats exist. Pick one per video.

### Format 1 — simple lines (works with every voice)
```
Kaiti: Ξέρεις τι είναι πιο επικίνδυνο από ό,τι νομίζεις;
Serifis [gravely]: Η σοκολάτα.
[SFX: doorbell]
Kaiti [waves] [pop red flag]: Ακόμα και λίγη!
```
- `Name: words`. The name must match the cast name (or one of its aliases)
  exactly; capitals don't matter, spelling and accents do.
- One line = one subtitle chunk, one scene, one background clip. **Short
  lines = faster cuts.** Roughly 15 Greek characters ≈ 1 second.
- `[direction]` before the colon = how to say it (for voices that act).
  Everything after the colon is spoken, so never put directions there except
  the tags below.
- Write the punctuation you want performed: `?`/`;` raises the brows and tilts
  the head, `!` sharpens, `…` droops.
- One language per video.

### Format 2 — DramaBox acting prose (only for the DramaBox voice)
```
A bright woman speaks warmly, "Γεια σου!" She laughs, "Hahaha! Τι κάνεις;"

A grave man speaks evenly, "Η σοκολάτα είναι δηλητήριο."
```
Full rules, the list of directions that work, and how to spell laughs and
sighs (Latin letters inside Greek speech: `Hahaha`, `Mmmm`, `Ugh`):
`docs/SCRIPT-GEM.md`. Use those wordings exactly; small changes stop them
working.

### Tags you can put inside a line (both formats)
| Tag | What happens |
|---|---|
| Feelings: `[excited]`, `[proud]`, `[sarcastic]`, `[surprise]`, `[nervousness]`, `[sadness]`, `[curious]`, `[tired]`, `[frustration]`… | Face and head for the whole line |
| `[nods]`, `[shakes head]` | Head movement |
| `[waves]`, `[points]`, `[shrugs]`, `[explains]` | Arm pose (all character kinds) |
| Moves (drawn characters only): `[walks in]`, `[walks in from the right]`, `[walks out]`, `[runs across]`, `[sits down]`, `[stands up]`, `[thumbs up]`, `[facepalms]`, `[hands on hips]`, `[crosses arms]`, `[bows]`, `[cheers]`, `[dances]`, `[drinks]`, `[gives the box to Maria]`, `[takes]`, `[opens the box]` | Full-body action, starts with the line |
| Style word after a move: graceful, angry, tired, shy, proud, playful, sneaky — e.g. `[walks in tired]`, `[waves shyly]` | Changes how the move looks |
| `[pop red flag]`, `[pop d20]`, `[pop κόκκινη σημαία]` | An animated icon pops up beside the speaker for ~2 s |
| `[🎉]` (any emoji) | The emoji pops up instead |
| `[SFX: clicker-training]` on its own line | A sound plays at the start of the next line. **Unknown names stop the render** |
| `[VOICE: acting=2.4 pace=0.9]` on its own line | Voice settings for the next block only (DramaBox) |

Automatic, no tag needed: greetings wave, questions shrug, "this/here/look"
points, long lines explain. Hand movement amount is a per-character slider.

**52 animated icons** for `[pop …]` (English or Greek name):
- everyday: heart, star, check, cross, question, exclaim, idea, laugh, thumbs up
- D&D: d20, sword, shield, potion, scroll, coin, skull, crown, dragon
- dogs: paw, bone, ball, bowl, whistle
- manipulation: red flag, warning, mask, chain, eye, bell
- soft skills: speech, handshake, target, clock, chart, puzzle
- seasonal: snowflake, gift, pumpkin, egg, tree, fireworks
- AI: robot, gear, chip, sparkle, bolt, cloud, code, wand
- tropes: spotlight, villain, plot twist

**26 sound effects** in the library today: dog barks (single, double, small,
big), whine, happy pant, soft growl, lapping water, squeaky toy, collar
jingle, lead clip, kibble into bowl, clicker (single, double), door knock,
doorbell, notification pop, whoosh (short, soft), pop-in, ding-correct,
buzz-wrong, slow heartbeat, clock tick, paper rustle, camera shutter. **New
ones can be made** (Ak generates them locally) — list what a series needs.

---

## 4. Voices

| Voice | Quality | Cost / effort |
|---|---|---|
| **Gemini** (default) | Good, natural, Greek and English | Live mode free and unlimited |
| **DramaBox** | The best acting (laughs, whispers, fury) | Runs on a rented graphics card; a manual round trip per batch — not daily-friendly |
| **Piper** | Flat but correct | Local, free, instant — for timing checks |
| ElevenLabs, Fish | Good | Paid per character |

Greek accents are added automatically before speaking; stubborn words go in a
"say it like this" list. A video is one language.

---

## 5. How it looks

- **Background**: stock video clips from Pexels and Pixabay, picked per line
  automatically from the topic (or searched by hand); dim, blur, crossfade and
  7 colour looks (natural, sepia, b&w, warm, cool, vivid, faded) — one look
  for the whole video, no script tag switches it. Background clips are always
  muted. Or an
  explainer video as the background. Empty = plain dark.
  **Cannot (today)**: use a generated still image as a background. Pictures
  from Image Forge come in as puppets, not as backdrops. If you want custom
  backgrounds, propose them as **sets** (code-drawn rooms) or as short
  looping video clips Ak would have to source.
- **Sets** (seated, legs hidden): news desk (2), conference room (4),
  conference stage (podium + panel, 3), podcast facing each other (2), podcast
  split screen (2), game show (host + 2 contestants). One set per video,
  chosen in the app, not by script. Cast members beyond the seats are not
  drawn. **Many videos (the spreadsheet) does not carry the set yet** — sets
  work only in videos made one at a time. No couch or living-room set exists.
- **Subtitles**: 8 one-click styles — bold box, karaoke, one word at a time,
  clean outline, lesson bar, and three of ours (forge sweep, comic burst, ink
  drop) — plus 13 subtitle fonts that have Greek letters.
- **Sound bars**: 9 styles (bars, wave, mirror, dots, ribbon, particles,
  sparks, bloom bars, boiling) around faces, around the frame, or along an edge.
- **Music**: 7 pizzicato comedy loops today, auto-ducked under speech. More
  music must be supplied — say what mood each series needs.
- **Intros / outros**: short video clips joined before and after each video,
  plus a looping banner strip along the bottom. They are made separately (any
  video file), set per series in a "brand pack". Ask for them as: length
  (2–5 s), what happens, what text, sound or not.
- **"Made with Video Forge"** label on the picture, on by default.

---

## 6. Explainer videos — the card types
Scenes are timed to the narration (on a given word). Each scene is one of:

| Card | Holds | Text limits |
|---|---|---|
| title | headline + small kicker | 70 / 28 chars |
| points | title + 1–4 bullets | 48 / 46 each |
| steps | title + 2–5 numbered steps | 48 / 46 each |
| number | one big number with label, prefix/suffix, counts up | label 40 |
| bars | title + 2–6 labelled bars with values | label 40 |
| compare | two sides, 1–3 items each | side title 24 |
| takeaway | the closing message + kicker | 70 / 28 |

Scenes at least 1.6 s apart. One built-in style (navy/mint "Mint Meander") plus
imported styles (whiteboard, chalkboard, blueprint, sticky notes, transit map…);
4 colour schemes, 4 tints, any Google font. Extras: 3 thumbnails, YouTube
chapters, captions, a GIF, a short clip.

**Cannot**: draw pictures of things (no dog drawings, no photos inside cards),
free-form layouts, more text than the limits.

---

## 7. Making many videos: the spreadsheet
One row = one video. Columns (only `script` is required):

`name, script, topic, template, format, music, backgrounds, language`

- `script`: the whole script in one cell, real line breaks (Alt+Enter).
- `topic`: a few words for picking background clips.
- `template`: a saved look by name (e.g. "News desk"): subtitles, sound bars,
  layout and dress of the speakers, background treatment. It does **not**
  change the cast or the set. Empty = the open project.
- `format`: 9:16 / 16:9 / 1:1 / 4:5. `music`, `backgrounds`: auto or none.
- `language`: el, en.
- The cast comes from the open project; every line must start with a cast name.

**Throughput limits — plan the calendar around these:**
- One render at a time. Roughly **1 hour of rendering per 10 minutes of
  video** on Ak's laptop; so a 60-second Short is roughly 6 minutes.
- So a daily schedule across several channels means **Shorts and 3–8 minute
  lessons, made in weekly batches**, not long videos every day.
- **Upload**: a command uploads a finished video with title, description,
  tags and a scheduled publish time (goes up private, turns public at that
  time). No upload button in the app yet. While the Google sign-in is in
  "testing" mode it must be renewed every 7 days.
  So for every video, also give: **title (≤100 chars), description (≤5000),
  tags, publish date/time.**

---

## 8. Image Forge — pictures, and how to order them

Image Forge makes pictures from a sentence, free engines first, paid only
after Ak approves. AI agents can drive it through **MCP** (a standard way for
AI tools to call apps). Its tools:

| Tool | Does |
|---|---|
| `forge_status` | what's pending/done/failed, cost of pending |
| `forge_models` | models, prices, free allowances |
| `forge_list` | list the order rows |
| `forge_add_row` | add one picture: `filename` (lowercase_underscores.png), `prompt`, `negative_prompt`, `category` (image, svg, lottie, sheet, gif, shop, item, event, npc), `aspect_ratio` (16:9, 1:1, 9:16, 4:3), `seed`, `model` |
| `forge_generate_pending` / `forge_generate_one` | make them |
| `forge_retry_failed`, `forge_fix_retired` | repair |

It also has a **puppet maker** (talking faces for Video Forge, ordered with a
name, description, style and framing: head / waist / full) and makes mouth-
shape grids, sprite sheets, GIFs and lettering.

**When you propose artwork, output it as rows Ak can paste**:
```
filename,prompt,negative_prompt,category,aspect_ratio
intro_dnd_logo.png,"...",,image,16:9
```
Rules Ak set: no golden-hour lighting; Skilitsa artwork is Pixar-like 3D
only; never copy existing show characters or brands.

Other MCP servers Ak runs (for research, not for making videos): a research
tool on his mini PC (web search and page reading) and n8n (automation).
Video Forge itself has **no MCP server** — it is driven by the app, the
spreadsheet and job files.

---

## 9. Ak's subjects (the apps were built around these)

dog training (the Skilitsa course, Greek, hosts Καίτη, Σερίφης, Τσίκα),
soft skills, defence against manipulation, D&D, tropes, AI, seasonal,
everyday life. Icons, costumes and starter characters exist for each. The
first priority is two **LMS courses of 3–8 minute lessons** (dogs first, then
soft skills); channels and Shorts are cut from the same material.

---

## 10. What to give Ak back — please use these shapes

1. **Series plan**: channel, series name, episode list (number, title, one-
   line hook, length, format, video kind from §1, set if any, cast).
2. **Scripts**: in Format 1 or 2 exactly, with tags from §3 only. Nothing that
   isn't in the lists. Each script also gets title / description / tags /
   publish time.
3. **Cast sheet** per series: for drawn characters — look, body, face, hair,
   clothes (from §2A lists) or a costume pack; for picture puppets — a
   description, style and framing for the puppet maker.
4. **Artwork rows** (§8 CSV) for intros, outros, banners, thumbnails, puppet
   portraits.
5. **Wanted list**: sound effects, music moods, props, icons, sets or
   costumes that don't exist yet — **clearly marked as new work**, with why
   each would be reused across many episodes. Ak can have new ones built; one
   that serves a whole series beats one for a single episode.
6. **Improvement ideas**: welcome, but say which limit in this file each idea
   removes, and keep it to what makes daily output easier or better.

Never invent facts in the scripts. Dog-training and health content must come
from Ak's sources; if something is missing, ask under a `---` line at the end.
