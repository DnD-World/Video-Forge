# Character Builder — characters drawn by code (plan, 24 Oct 2026)

Ak's ask: stick-figure "cutout" characters like the big storytime channels
(round heads, thin line limbs, simple clothes, detailed coloured backgrounds),
made **inside Video Forge by code**, through a form, with an AI helper — and
then more looks on the same machinery.

Status (25 Oct 2026): **high-effort foundations built** — see [characters/README.md](../characters/README.md). Medium phase next.

---

## 1. The idea in one line

One **rig** (a skeleton with a head, face, arms, legs and clothes), described
by a **character card** (a list of fields), drawn by interchangeable **looks**
(stick figure, geo-minimal, sticker, pop-art …). Everything is a pure function
of time, like the explainers, so the preview is live and the render matches it
exactly.

Why code instead of pictures:

| | Code-drawn | Generated pictures (Nano Banana 2.1 puppets) |
|---|---|---|
| New character | edit fields, instant, free | a batch, ~$2–3, 1–2 h |
| Lip-sync, blinks, brows | exact shapes, never drift | cut from edits; a few need redoing |
| Poses | any arm/leg angle, walking, sitting | only the poses that were generated |
| Change a shirt colour later | one field | redo everything |
| Detail / realism | simple by nature | rich |

Both stay: code characters for volume and storytime channels, Nano Banana 2.1
puppets for rich looks.

## 2. The form (Video Forge → Characters → New)

Left: the fields, grouped. Right: the live preview (it is canvas, so live is
possible — no "save to see"), with buttons to play a test sentence, cycle the
poses, cycle the emotions, and switch head / full body / 3/4.

Every field has:
- a one-line **explanation**,
- 3–5 clickable **examples** (thumbnails, drawn by the same code),
- after each save, an **AI suggestion** under the field ("the tie disappears
  against the navy jacket — try white or red", with an Apply button).

Field groups (first draft):

| Group | Fields |
|---|---|
| Body | height, build (thin / average / round), head size, limb thickness, skin colour, posture |
| Head & face | head shape (round / oval / egg), eye style (dot / oval / lashes), eye spacing, brow style, nose (none / dot / line), mouth style, ears, cheeks, age lines, glasses |
| Hair | style (from a library: short, side part, bun, ponytail, curly, bald, long …), colour, highlight, accessories (bow, cap, clip) |
| Clothes | top (t-shirt, shirt, vest, blazer, hoodie, dress …), bottom, colours, tie / bow tie, collar, shoes |
| Personality | resting expression, blink rate, gesture energy, idle sway |
| Look | which look draws it (section 4), outline thickness, line boil on/off |

**AI helper (BYOK, the keys already saved):**
- After a save: one suggestion per field where it has one (contrast,
  readability at phone size, clashes, "reads as the same as character X").
- **Fill from a description:** "a tired dad in a blue vest and white shirt"
  → every field filled, shown as a diff to accept or reject field by field.
- **Fill from a picture:** a screenshot or a photo → the fields. Uses a
  vision model (Gemini, already in the key vault).
- The AI only ever proposes field values from the lists; it never writes code.

## 3. Animation the rig gets for free

- Mouth shapes from the narration's word timings (the same visemes Video
  Forge already uses), blinks, eyebrow emotions.
- Poses: idle, wave, point, shrug, explain, hands on hips, phone in hand,
  arms crossed, walk cycle, sit. Each is a set of joint angles, so more are
  cheap to add.
- Head turns (front → 3/4 → side) drawn, not generated.
- Squash and stretch on gestures; small idle sway so nobody looks frozen.

## 4. Looks on the same rig

Built one at a time; each is a "skin" over the same character card. Named by
the style, never by a show: the looks below are inspired by eras and genres,
and no show's characters, designs or names are copied.

| Look | What makes it | Notes |
|---|---|---|
| **2D stick cutout** (first) | round heads, thin line limbs, flat clothes, thin black outlines | the storytime-channel look |
| Geo-minimal | geometric shapes, no outlines, soft flat shading, rounded everything (the "Kurzgesagt-like" look) | |
| Corporate flat | no outlines, flat fills, long limbs, small heads | |
| MBE sticker | thick dark outlines with a lighter inner line, white sticker border | |
| Pop-art / comic | bold black ink, Ben-Day halftone dots, speech-bubble friendly | |
| Rubber-hose 1930s–40s | bendy limbs, pie-cut eyes, white gloves | era style |
| 90s TV-sitcom cartoon | bold outlines, overbite mouths, bright flat colours | era style |
| **Line boil** (an effect, any look) | outlines wobble a little every few frames, the hand-drawn "alive" feel | |

### Ak's verdict on the first samples (24 Oct 2026, `characters/samples/looks.html`)

| Look | Verdict | Done since |
|---|---|---|
| MBE sticker, 90s sitcom, 1930s rubber hose | loved ("ama-ZING", "a gem") | rubber hose: bounce only in bursts while talking; **early-colour version added** |
| Geo-minimal | great; to be fuller later | shading no longer splits faces |
| Pop-art | liked | face dots much fainter (still there) |
| Corporate flat | needs dot eyes + line mouth | added |
| Line boil | too strong | gentler default, **slider**, and "on every look" switch |
| Pixel art | dropped (Ak, 24 Oct) | removed from samples and plan |
| All | hair and some background corners too angular | hair drawn as smooth curves; clothes and furniture have rounded corners |

### Second round of samples (24 Oct 2026)

Added: Greek vase, shadow puppet, **Karagiozis**, 1950s mid-century,
chalkboard, paper cut-out, risograph, neon, noir comic, stained glass,
ballpoint notebook, blueprint. Pixel art and Byzantine mosaic dropped.

| Look | Ak's verdict → what the build does |
|---|---|
| Karagiozis | needs a **more traditional look**: true flat profiles, the long swinging arm, painted-leather patterns and colours, the traditional cast (Karagiozis, Hatziavatis, Pasha, Morfonios, Stavrakas, Barba-Giorgos …) drawn as our own versions, never copied from a specific artist |
| Greek vase | needs **chitons, himations, togas**, sandals, laurel wreaths, helmets and shields; profile view |
| Ballpoint notebook | faces must not look "crossed out" → faces stay clean paper, hatching only on hair and clothes (done) |
| Byzantine mosaic | not up to the task → dropped |
| All the rest | approved as samples |

**1930s as a flashback:** a scene switch that redraws any scene in the
rubber-hose look with film grain, flicker and a vignette — for flashbacks.

**Steamboat Willie (1928) characters — not in the public version.** The 1928
film entered the public domain in the **USA** on 1 Jan 2024, but in the **EU
(Greece included) copyright runs 70 years after the authors' deaths** (Walt
Disney d. 1966, Ub Iwerks d. 1971 → protected into the 2030s–2040s), and the
characters are also live trademarks. So: our own original cast in that era
style (both black & white and colour), never Mickey, Minnie or Pete.

## 4b. Wardrobe (every look, every character)

Items are shapes hung on the rig's anchor points (head top, eyes, ears, neck,
torso, waist, hands, feet), so one item works in every look — the look only
decides outline, shading and texture.

| Group | Items (first list; more welcome) |
|---|---|
| Head | caps, beanies, fedora, top hat, cowboy hat, beret, helmet, headbands, hair clips, bows, crowns, hoods up |
| Face | eyebrow shapes, eye shapes, noses, mouths, ears, earrings, glasses (round, square, cat-eye), sunglasses, freckles, blush, beards, moustaches, eye patch |
| Hair | short, side part, buzz, bald, bun, ponytail, pigtails, braids, curly, afro, long straight, bob, mohawk + colours and highlights |
| Tops | t-shirt, polo, dress shirt, suit jacket, vest, cardigan, corduroy jacket, pullover, hoodie (hood up / down), tank top, blouse, apron, lab coat, uniform |
| Bottoms | trousers, jeans, shorts, skirts (short, long, pleated), dresses, overalls |
| Body | build (thin → round), muscle size, height, posture |
| Shoes | sneakers, boots, heels, sandals, barefoot |
| Costume packs | Halloween (witch, vampire, ghost sheet, skeleton, pumpkin), medieval (knight, king/queen, peasant, wizard), caveman, pirate, astronaut, chef, doctor, police, firefighter |

Each item gets colours (1–3) and, where it makes sense, a pattern (stripes,
checks, corduroy ribs, polka dots).

## 4c. Stock backgrounds: Pixabay and Pexels (pictures and videos)

Not difficult. A search box in Look → Background: type "kitchen", pick a
picture or a video clip, it downloads into the project and is used like any
background. Both sites are free for commercial use without credit, but their
API terms ask the app to show where results come from, so the picker shows
"from Pexels / Pixabay" and the project keeps a credits file anyway.
Pexels key: already in the Key Vault (`PEXELS_API_KEY`). Pixabay: needs a free
key (pixabay.com/api/docs). Videos get the same dim/blur controls as now.

## 5. Pop-ups: emoji and icons

- **Manual:** a marker in the script (`[!]`, `[idea]`, `[laugh]`, `[heart]`)
  pops an emoji or icon next to the speaker's head on that word.
- **Auto:** the AI reads the script and proposes pop-ups; shown as markers
  you can delete before rendering.
- **Animated:** pop in with a bounce, wobble, float away. Our own code-drawn
  icons (always free to use) plus an open emoji set (licence to be checked
  before shipping: Noto Emoji, Fluent Emoji and OpenMoji are the candidates).

## 6. Backgrounds and explainer looks (from Ak's research list)

These are scene / explainer looks, not character looks:

| Look | Where it goes |
|---|---|
| Truchet tiling & pattern art | already in the explainer tile engine |
| Pen-plotter generative line art | explainer kit + transitions |
| Algorithmic Mondrian / De Stijl | explainer kit (it is a layout system) |
| Detailed coloured rooms (storytime sets) | Nano Banana 2.1 pictures, empty sets, as now |

## 7. Order and size (human work hours, conservative)

| # | Step | Hours |
|---|---|---|
| 1 | Rig + 2D stick cutout look + live preview + head/full/3/4 + lip-sync, blinks, poses | 14 |
| 2 | The form: every field, explanations, clickable examples | 8 |
| 3 | AI helper: per-field suggestions, fill from description, fill from picture | 6 |
| 4 | Pop-ups: manual markers, auto proposals, animated emoji/icons | 6 |
| 5 | Each further look (geo-minimal, sticker, pop-art …) | 3–5 each |
| 6 | Line boil effect | 2 |
| 7 | Explainer kits: pen plotter, Mondrian | 3–4 each |
| 8 | Wardrobe: anchor system + a first pack of ~40 items | 12 |
| 9 | Wardrobe: the rest of the list, costume packs | 20–30 |
| 10 | Pixabay + Pexels search for backgrounds (pictures and videos) | 5 |
| 11 | 1930s flashback scene switch | 2 |

Steps 1–4 make a usable feature (~34 h). Looks and kits follow one by one.

### Which effort level does what (Ak picks the level per phase)

**High effort** — the foundations everything else stands on:

1. The rig as real code in Video Forge (`characters/`), not a sample page:
   skeleton, poses, front / 3/4 / **true side profile**, lip-sync from the
   narration's word timings, blinks, brows, the walk cycle.
2. The look engine: looks as skins over one rig (fill modes, layer effects,
   per-look proportions), line boil as a setting on any look.
3. The wardrobe anchor system (items hang on body points and work in every
   look) with a small first set to prove it.
4. Rendering in the real pipeline: the same drawing used for the live
   preview and the Electron render, checked by code like the explainers
   (mouth readable, nothing leaves the frame, identical frames).
5. The AI helper's core: fill the card from a description or a picture,
   per-field suggestions, all within the allowed values.

**Medium effort** — building on the foundations:

- The form UI: every field, explanations, clickable examples, live preview.
- Each look brought to finished quality (the 18 kept), Karagiozis
  traditional, Greek vase clothing.
- The wardrobe catalogue and costume packs.
- Pixabay + Pexels search, emoji/icon pop-ups, the 1930s flashback switch.
- Docs, HANDOFF, the app tour.

## 8. Checks (as for explainers)

Every look is checked by code: mouth visible and readable at phone size, no
part leaves the frame in any pose, contrast of face features against skin,
and the same frame drawn twice is pixel-identical.
