# Puppet pipeline (credit run)

The scripts that make puppet pictures in bulk on the Google credit, with
Nano Banana 2.1 through Vertex AI batch (half price). Pictures land in
`puppet-run/` (not in git; backed up to the mini PC at `~/backups/puppet-run`).

The prompt rules are not written here. They live in Image Forge,
`src/lib/puppet/recipe.ts`, and are bundled into `recipe.mjs` so the app and
the bulk run always ask for the same thing.

## Files

| File | What it does |
|---|---|
| `recipe.mjs` | Generated copy of Image Forge's recipe (the first line names the commit it came from). Never edit it by hand. |
| `pilot.mjs` | Writes `pilot.json`: one character per subject, two looks each, base pictures only. |
| `vrun.py` | Sends a job list to Vertex AI batch, waits, saves each picture as `<key>.png`, deletes its temporary bucket. Writes `records.jsonl` next to the pictures: model, time, batch, prompt, things to avoid, reference pictures, and whether a picture came back. |
| `pilot-page.mjs` | The choosing page for the pilot: two looks side by side per subject, with a "Copy my picks" button. |

## Commands

Re-bundle the recipe after changing it in Image Forge (run from the Image Forge folder):

```bash
node_modules/.bin/esbuild src/lib/puppet/recipe.ts --bundle --format=esm --platform=neutral --banner:js="// GENERATED from Image Forge src/lib/puppet/recipe.ts @ $(git rev-parse --short HEAD) by tools/puppets/README.md's bundle command. Do not edit here." --outfile="../BYOK-Vid-Creator/tools/puppets/recipe.mjs"
```

The pilot (from the Video Forge folder). The second command costs money: 14 pictures.

```bash
node tools/puppets/pilot.mjs
```

```bash
python -I tools/puppets/vrun.py tools/puppets/pilot.json puppet-run/pilot pilot26oct
```

```bash
node tools/puppets/pilot-page.mjs
```

`vrun.py` skips any key whose picture already exists, so it is safe to run again after a failure.

## Rules the pipeline follows

- Prompt regime v2 (Image Forge recipe): a facts sheet per character, set when its base is approved. The edit's region is named first. Each kind of edit has a keep-exactly list. The eye wording follows the eye count.
- Checks (Image Forge `quality.ts`, `pixels.ts`): the strictest vote wins. Any fault is a **no**. Any doubt, or any question left unanswered, is a **maybe** and goes to Ak. A **yes** needs every checker to be clean, with at least two checkers having looked. A picture nobody checked is never green.
- Every try is kept together with its prompt, so the Flow export (#21) can re-make any picture after the credit ends.
