# 2D+ characters — answers and next steps (5 Nov 2026)

Answers to Ak's round-5 questions. Sources for the craft facts: `pro-2d-techniques-2026-11.md` (helper research; items marked UNSOURCED there are our own choices).

## The 3D-looking avatar Ak sent — can 2D do it?
- That picture is most likely a real 3D render (soft global light, clay materials). We can't know for sure from one image.
- **The technique can be faked in 2D, about 80% of the way.** What gives that look, and where we stand:

| Ingredient | What it is | Us today |
|---|---|---|
| Soft round shading | a wide, blurred light-to-shadow on each part | have it (hint of 3D) |
| Contact shadows | darker where parts touch: hair on the forehead, chin on the neck, sleeve on the arm | partly (drop shadow per part); needs proper hair-on-forehead and nose-on-cheek |
| Warm shadow edge | skin goes slightly red where light turns to shadow (light through skin) | missing |
| Shine spots | small soft highlights: nose tip, cheeks, lips, a big eye catchlight | eyes only |
| Rim light | a thin light edge on the far side | have it |
| Soft creases | hoodie folds, the pocket seam as soft shading, not lines | missing (why the pocket looked bad) |
| Big simple shapes | fewer, rounder parts | have it |

- Cost to add the four missing ones: about 10–14 human work hours, then a side-by-side page.

## Is texturing beyond us?
- No. Texture is not only colour gradients. Options, all doable in code:
  - paper fibre and fabric weave **locked to each part** (fixes "swimming"; this round fixed the dress print and the paper grain at figure level);
  - halftone or hatching **only in the shadows**;
  - knit or denim pattern bent along the arm or leg;
  - a slightly wobbly ink line that changes a little each frame ("boil"; the paper look already has it).
- Per-part locked textures: about 6–8 human work hours.

## The Videohive packs
- Read by the helper: Vol 1 has 45+ animations, Vol 2 has 20. Both are flat vector, After Effects, 25 fps, looped. Neither page names a rig tool or any shading.
- "Basic Characters Animations Pack" turned out to be text reveals and icon scenes from 2013, not a character rig.
- Their polish is pose design and timing, not a secret technique. We are close on motion, and our moves are made by rules (unlimited), not hand-keyed.

## Mouth movement
- The lab's talking mouth now follows syllables, blends smoothly and closes on M/B/P (this round).
- The real app's lip sync (driven from the voice) has **not** been changed yet. Next step: apply the same rules there (hold each shape ≥ 2 frames, lead the sound by 1–2 frames, in-between shapes, always close on M/B/P). About 4–6 human work hours.

## What else would up our game (ranked)
1. **The four missing 3D ingredients above.** Biggest visible jump. 10–14 h
2. **Brows and lids that drag** a frame or two behind head moves, plus a blink on every big head turn. 3 h
3. **Hands**: the grip reads as a ring; add a proper clasp and a relaxed curled hand. 4–6 h
4. **Lip sync in the app** (above). 4–6 h
5. **Per-part locked textures** (above). 6–8 h
6. **Walk in / walk out** in profile, the one place side view stays: planted feet, head bob, arm swing. 6–8 h
7. **Text and transitions into the app**: the four styles and four transitions from the lab (section 8) as real options. 8–10 h
8. **Smear frames and moving holds** in more moves (only the kick has a smear today). 3–4 h
