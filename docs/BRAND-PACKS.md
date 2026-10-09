# Brand packs

**Short answer:** everything that belongs to one creator — characters, sample
project, intro/outro clips, banners, logo, series presets — lives in
`brands/<name>/`. The app shows none of it until a computer switches that pack
on with `npm run brand -- <name>`. A fresh install is neutral.

```bash
npm run brand                  # which pack is on, and which exist
npm run brand -- skilitsa      # switch Skilitsa on (restart the app)
npm run brand -- off           # back to neutral
```

The switch is a small file, `brand.local.json`, beside `package.json`. It is
not committed, so it never travels to anyone else's copy.

---

## What a pack switches on

| With a pack on | With none |
|---|---|
| Presets tab offers the pack's sample project | No sample offered |
| The pack's characters are available as ready-made speakers | No built-in characters |
| `npm run outros` knows which clips and lessons to use | `npm run outros` refuses and says why |
| `npm run ask-forge -- visemes <name>` knows how to describe the pack's characters | Needs `--describe "..."` |

Things a batch job names by full path — intros, outros, banners, logo, preset —
work whether or not the pack is on: the job file says where they are.

---

## Layout

```
brands/<name>/
  brand.json          the pack's description (below)
  puppet/             the cast's puppet files and their art
  intros/  outros/    clips joined before / after a lesson
  banners/            looping strips along the bottom edge
  presets/            looks for a series of videos
  forge/              picture-request lists for Image Forge
```

Only `brand.json` is required. Everything is optional and every path inside
`brand.json` is relative to the pack's folder.

## `brand.json`

```json
{
  "name": "Acme",
  "puppetDir": "puppet",
  "cast": [
    {
      "file": "robin.rig.json",
      "label": "Robin",
      "note": "Presenter",
      "borderColor": "#e8a24a",
      "x": 0.5, "y": 0.4,
      "openingPhrase": "A cheerful man",
      "voiceRef": "robin.wav"
    }
  ],
  "sample": {
    "name": "Robin says hello",
    "language": "en",
    "script": "A cheerful man speaks warmly, \"Hello! This is a sample.\""
  },
  "addOutros": { "outrosDir": "outros/cut", "lessonsSrc": "C:/path/to/lessons" },
  "forgeCharacters": { "robin": "Robin, a cheerful man with a red scarf" }
}
```

| Field | Used by |
|---|---|
| `cast` | Cast panel, sample project. `dramabox` (optional) holds voice settings that differ from the defaults |
| `sample` | Presets tab → Load sample. Uses the first three of `cast` |
| `addOutros` | `npm run outros` and `tools/add-outros.mjs` |
| `forgeCharacters` | `npm run ask-forge -- visemes <name>` |

Making the characters themselves: [PUPPET-MAKING.md](PUPPET-MAKING.md).

## In the installer

`npm run build-exe` includes `brands/` but leaves out each pack's intros,
outros, banners and presets (large, and job files reach them by path anyway).
It also copies `brand.local.json` **if this computer has one** — so a build
made on a branded machine opens branded, and a build from a clean copy opens
neutral.
