# Making your own puppet

**Short answer:** draw one portrait with a blank-ish face on a flat magenta
background, cut the mouths, brows and eyelids out as separate pictures, write
down where each one sits, and run one command. You get a `<name>.rig.json` the
app can load with **Cast → Choose puppet…**.

That is the **rig** route, and it is what the current lessons use. Two older
routes still work and are covered further down for completeness.

| Route | You make | Command | You get | Use it when |
|---|---|---|---|---|
| **Rig** (recommended) | 1 portrait + cut-out parts + `placement.json` | `tools/make-rig-puppet.mjs` | `<name>.rig.json` + `rig/<name>/` | You can cut layers in any paint program |
| Layered puppet | base + parts + a spec file with head-relative offsets | `tools/make-puppet.mjs` | `<name>.puppet.json` | You have Photoshop layers with no positions |
| Viseme sheet | nine whole faces, one per mouth shape | `tools/build-puppet-cells.mjs` → `tools/build-viseme-sheet.mjs` | one 3×3 PNG | You only have finished faces (e.g. from an image model) |

---

## Where your puppet goes

| Whose character | Folder |
|---|---|
| Yours, for your own videos | `puppet/` |
| Part of a brand pack (a creator's whole set) | `brands/<pack>/puppet/` — see [BRAND-PACKS.md](BRAND-PACKS.md) |

A puppet file always finds its pictures **relative to itself**, so the puppet
JSON and its art folder can be moved together to anywhere.

---

## Route 1 — the rig (recommended)

### 1. Draw the art

One folder per batch of characters, laid out like this:

```
my-art/
  base/
    robin.png               the full portrait
  layers/
    robin/
      placement.json        where each part sits on the portrait
      mouth_AH.png
      mouth_EE.png
      ...
```

**Rules that matter more than drawing skill:**

1. **Flat magenta background — exactly `#FF00FF`** on the portrait and on every
   part. The tool turns magenta see-through and cleans the pink fringe off the
   edges. (Pink clothes are safe; the tool tells real pink from background.)
2. **Head, neck and shoulders**, facing the viewer, head roughly centred.
3. **The portrait has the resting face already drawn**: mouth closed, eyes
   open, calm eyebrows. Anything "at rest" is the portrait itself; the parts
   are only the *changes*.
4. **Every part is cut from the same-sized canvas as the portrait**, so its
   position can be measured on that canvas.

### 2. The parts, by file name

Only `lid_closed` (or `lid_half`) is close to required — the tool uses it to
find the eyes and frame the head. Everything else is optional: a missing mouth
is reported when you build, and a missing part simply isn't drawn.

| File | What it is | Shown when |
|---|---|---|
| `mouth_AH.png` | jaw dropped, "ah" | open vowels |
| `mouth_EE.png` | lips wide, "ee" | e/i sounds |
| `mouth_OH.png` | round "oh" | o sounds |
| `mouth_OO.png` | small tight circle, "oo" | u sounds |
| `mouth_FV.png` | top teeth on lower lip | f / v |
| `mouth_L.png` | tongue up behind the teeth | l |
| `mouth_CHSH.png` | lips forward, "sh" | sh / ch |
| `mouth_SMILE.png` | closed smile | resting on a happy line |
| `brow_happy.png`, `brow_serious.png`, `brow_raised.png`, `brow_worried.png`, `brow_confused.png` | both eyebrows in one picture | moods and punctuation (`!`, `?`, `…`) |
| `lid_half.png`, `lid_closed.png`, `lid_wide.png` | eyelids | blinks, sleepy, surprised |

"M/B/P" and the resting mouth are the portrait's own closed mouth — no file.

### 3. `placement.json`

Where each part sits on the portrait, in **pixels of the portrait canvas**
(`x`,`y` = top-left corner of the part, `w`,`h` = its size):

```json
{
  "size": { "w": 2048, "h": 2048 },
  "base": "robin.png",
  "layers": {
    "mouth_AH":   { "x": 930, "y": 1210, "w": 190, "h": 160 },
    "mouth_EE":   { "x": 915, "y": 1225, "w": 220, "h": 90 },
    "brow_happy": { "x": 760, "y": 690,  "w": 530, "h": 120 },
    "lid_closed": { "x": 790, "y": 820,  "w": 470, "h": 110 }
  }
}
```

Most paint programs show a selection's x, y, width and height — select the
part, read the four numbers, type them in. Names here are the file names
without `.png`.

### 4. Build it

```bash
node tools/make-rig-puppet.mjs my-art robin
node tools/make-rig-puppet.mjs my-art robin --wide        # optional zoomed-out copy
```

Several characters at once: list them, `robin wren finch`. Output goes to
`puppet/` unless you add `--out <folder>` (a brand pack's characters use
`--out brands/<pack>/puppet`).

You get:

| File | What |
|---|---|
| `puppet/robin.rig.json` | the puppet — this is what you pick in the app |
| `puppet/rig/robin/*.png` | the parts, background removed, head-and-shoulders crop |
| `puppet/robin.rig-wide.json` + `puppet/rig-wide/robin/` | only with `--wide` |

The command prints every part it used, and any part in `placement.json` it did
not recognise — read that list; a typo in a name means a mouth that never moves.

### 5. Use it

Open the app → **Cast** → pick a speaker → **Choose puppet…** → the
`.rig.json`. For a batch job, put the full path in the speaker's `puppetPath`.

### 6. Check it

Render a short test with a line that uses every mouth (for English, *"Oh, I
see — five fresh fish, all lovely, sure!"*). Things to look for:

| You see | Cause | Fix |
|---|---|---|
| A pink rim around the face or a part | background not exactly `#FF00FF` | refill the background with pure magenta |
| A mouth floats off the face | wrong numbers in `placement.json` | re-measure that part |
| The face is tiny in its circle | no `lid_closed`/`lid_half`, so no crop | add one |
| A straight cut line across the shoulders inside the circle | portrait cut off too high | draw more shoulder below the face |

---

## Route 2 — layered puppet from a spec

For parts exported without positions (Photoshop "Trim Layers"). You write a
`<name>.spec.json` placing each part relative to the head, and
`tools/make-puppet.mjs` checks every file exists and writes the runtime puppet:

```bash
node tools/make-puppet.mjs puppet/robin.spec.json puppet/robin.puppet.json
```

The spec's `dir` is relative to where you run the command; the output's `dir`
is rewritten relative to the output file. Worked examples:
`brands/skilitsa/puppet/*.spec.json`. Offsets are in head widths from the
head centre — slower to tune than the rig, which is why the rig replaced it.

---

## Route 3 — viseme sheet (nine whole faces)

The oldest route: one picture per mouth shape, assembled into a 3×3 grid the
app flips between. Loaded with **Cast → Choose sheet…**.

**From layered parts** — composite the nine faces, then assemble:

```bash
node tools/build-puppet-cells.mjs my-cells.json --preview preview.png
node tools/build-viseme-sheet.mjs viseme-v2 viseme-sheets-v2
```

The config for `build-puppet-cells.mjs` names a base, the parts folder, an
output folder, the layers drawn under the mouth, one shared mouth placement and
which mouth file goes in each of the nine cells. Full example and tuning notes:
[PUPPET-CELLS.md](PUPPET-CELLS.md); worked configs:
`brands/skilitsa/puppet/{kaiti,serifis,tsika}.json`.

**From finished faces** (e.g. an image model) — name them
`<name>_<index>_<LABEL>.png` and assemble:

```bash
node tools/build-viseme-sheet.mjs my-faces viseme-sheets
```

| Index | Label | Index | Label | Index | Label |
|---|---|---|---|---|---|
| 0 | NEUTRAL | 3 | OH | 6 | FV |
| 1 | AH | 4 | OO | 7 | L |
| 2 | EE | 5 | MBP | 8 | CH_SH |

The index places the cell, not the label. Missing cells are filled from the
nearest shape and reported. Prompts, the five-cells-instead-of-nine shortcut,
and the one rule that matters most (**the head must not move between cells**):
[VISEME-SHEETS.md](VISEME-SHEETS.md). One picture with all shapes side by side
can be cut up with `tools/slice-grid.mjs`; Image Forge can draw the grids with
`npm run ask-forge -- visemes <name> --describe "..."`.

---

## Giving the puppet a voice

The puppet is only the face. In the Cast panel, the same speaker also takes:

| Field | What to put |
|---|---|
| Opening phrase | how this character's lines start in a script, e.g. `A cheerful man` |
| Reference clip | a short `.wav` of the voice, in `voice-refs/` |
| Outline colour | also their waveform colour — give each character a different one |

To ship a character ready-made with all of that, put it in a brand pack's
`cast` list — [BRAND-PACKS.md](BRAND-PACKS.md).
