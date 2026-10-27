# Skilitsa brand pack

The dog-training course's characters and clips, moved here from the top of the
repository on 9 Oct 2026 so the app itself carries no one's branding. Nothing
was deleted or changed — only moved.

Switch on for this computer: `npm run brand -- skilitsa` (then restart the app).

| Folder / file | Was | What |
|---|---|---|
| `puppet/` | `puppet/` | Καίτη, Σερίφης, Τσίκα — `*.rig.json` (1xx close-up), `*.rig-wide.json` (2xx–5xx), `*.puppet.json` (older layered), specs and cell configs |
| `intros/` | `Intros/` | intro clips |
| `outros/` | `outros/` | outro clips |
| `banners/` | `banners/` | skilitsa.com strip |
| `skilitsa logo banner.png` | top level | logo |
| `presets/` | `presets/lms-*.json` | looks for the 1xx–5xx series |
| `forge/` | `puppet-bust.csv`, `puppet-restyle.csv`, `viseme-grids.csv` | Image Forge request lists |
| `brand.json` | `src/store/builtinCast.ts`, `src/store/sampleProject.ts`, `tools/lib/forgeLink.mjs`, `electron/main.ts` | cast, voices, sample script, outro settings, character descriptions |

**Still at the top level, on purpose:** `jobs/` (series queues and templates),
`projects/`, `scripts/`, `dramabox-audition/`, `sfx/wanted.csv`. The series
queues keep their progress in files beside them on the laptop; moving them
mid-series would make every finished lesson render again. Their paths inside
already point here.

**Art outside git:** the `*.puppet.json` files read their pictures from the
top-level `viseme/` folder (`"dir": "../../../viseme"`). The rig puppets used by
the lessons carry their own pictures in `puppet/rig*/` and need nothing else.
