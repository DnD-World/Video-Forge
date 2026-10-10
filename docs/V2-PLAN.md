# Video Forge v2 — plan

Built from [V2-NEEDS.md](V2-NEEDS.md) (Ak's interview, 9–10 Oct 2026),
[research/how-the-70-videos-were-made.md](research/how-the-70-videos-were-made.md) and
[research/creator-needs-2026-10.md](research/creator-needs-2026-10.md).

Private first (DnD-World/Video-Forge). Public copy only when v2 is done.
Free first; every paid option shows its cost and asks. No Google Cloud.

| Phase | What Ak gets | Human work hours |
|---|---|---|
| 0. Foundations | Rename done. Gemini calls switched from Google Cloud to a plain AI Studio key. Old GPU-box scripts archived. Free-voice check (OpenRouter, Gemini, Mistral, Groq, NVIDIA, local) → side-by-side listening page | 6–10 |
| 1. The 70-video workflow, in the app | Spreadsheet batch panel · script import (Docs/Word/text/web page/PDF/whole site → one video per page) · AI script writer · voices per character · automatic word timing · music panel (free library by mood, own files, Envato suggestions) · sound-effects library · intro/outro manager with a loud length check · background review (stock, moving AI pictures, AI clips, branded sets) · 4 subtitle styles + .srt · gesture tags in scripts · cost shown before paid steps · overnight batches on the mini PC · publish per job (YouTube, social, n8n/Hermes folder, file) | 50–70 |
| 2. Puppet maker, linked to Image Forge | Description / photo / restyle → 4 options → Ak picks the face → mouths, blinks, brows, arms made and tested automatically → talking preview. Styles first: Pixar-like 3D, paper cut-out, claymation, anime. Upper body (desk anchor or standing). Old and new Skilitsa puppets both kept | 30–45 |
| 3. Top-moments shorts | Finds and scores every candidate moment in a long video; Ak asks for the top X% | 10–15 |
| 4. New look | A/B page of 2–3 looks in stravelakis navy/mint + Sora → build the chosen one: live preview with sound, glass/fluid/particles, moving template gallery (lesson, news desk, podcast, promo) | 30–50 |
| 5. Public copy | Script makes a clean copy (no brands, no course, no personal paths), banned-word check, Windows installer, repo standards docs, Stravelakis org | 10–15 |
| **Total** | | **~135–205** |

## Open risks

- **Remotion licence:** free for individuals and teams up to 3 people. Ask hi@remotion.dev in writing how that applies to an open-source app before the public release.
- **Licence file:** package.json says MIT; the CLAUDE SPACE rule says Apache-2.0 + NOTICE. Fix in phase 5.
- **Free voices in Greek** may still sound flat; the listening page decides.
