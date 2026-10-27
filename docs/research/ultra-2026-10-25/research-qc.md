# Automated QC for generated puppet parts: research report

Date: 2026-10-25. Scope: Image Forge (`C:\Users\strav\Documents\CLAUDE SPACE\qwen image creator`) puppet parts. Nothing was run, no model downloaded, no project file edited. Only page reads, search, and public metadata JSON (Hugging Face model API, PyPI JSON, GitHub API) were used.

Tags: **[read]** = page opened and read; **[snip]** = search-result snippet only, not opened; **[inf]** = my inference/design, no source; **[unk]** = could not be established.
Tool order used: research-forge `web_search` / `read_page` for everything. No limit hit, no fallback needed. (research-forge `forge_status` showed 90 of the last 200 model calls "busy"; searches still returned.)

---

## 0. The short answer

- No source gives a measured end-to-end catch rate for this exact job. Every number below is for a part of it. The stacked-ladder numbers have to come from your own hand-labelled set (section 8).
- Biggest structural gap in today's QC: **identity drift is only asked of VLMs, never measured in pixels or embeddings**, and **eye count is never checked** (only arm/hand counts are). Both are cheap to measure without any VLM.
- VLMs are the weakest tool for the failures you named most (counting eyes, subtle drift). Evidence: counting accuracy 17.05% on "one extra/missing" counterfactuals (a one-eyed character is exactly that case); VLMs mistake near-identical pairs for identical. Use them for yes/no on cropped regions and for tie-breaks, not as the front line.
- Strongest cheap identity signal: DINOv2 embeddings (Apache-2.0, 22M/87M params, CPU-OK), calibrated **per character** against that character's own accepted parts. Face-recognition (ArcFace/InsightFace) is the wrong tool: model weights are non-commercial-research-only and it was built for human faces.
- Anime-specific same-character model exists (CCIP, F1 0.94 on its own anime benchmark, OpenRAIL). Likely fine for humanoid characters, **[unk]** for animals/blobs.
- Free judge capacity is thin and moving: Gemini free tier no longer publishes per-model limits; OpenRouter `:free` is 50 requests/day without purchased credits; Cloudflare's 10,000 neurons/day is shared with image generation. Rungs 1-2 below cost zero API calls, which is the point.

---

## 1. What Image Forge checks today (10 lines)

Read: `docs/puppet-recipe.md`, `src/lib/puppet/quality.ts`, `pixels.ts` (cutPart/keyOut), `maker.ts`, `pageIO.ts` (pageInspect).

1. **Base face**: one VLM JSON check `baseQuestion` (maker.ts): one character, mouth closed, eyes parallel, face/ears inside the frame, flat plain background with no key colour on the character, lips yes/no per look, body visible per framing. **One judge only**; with no judge configured the base is accepted.
2. **Cut gate** (`cutPart`, pixels.ts): edit must be same size; edit colour-matched to base (`matchColours`); per-pixel change threshold 26; 16 px grid at 1024; rejects "nothing-changed" (peak cell under 8% pixels), "outside" its band, "redrawn" (changed box over 30% of picture, 60% for arms), mouth reaching above the eye line.
3. **Patch logic**: busy cells grouped into patches; patches under 25% of the strongest are dropped; kept patches grown up to 3 cells; one bounding box around all kept patches.
4. **Keying** (`keyOut`): background colour read from the border; flood-fill from the edges at tolerance 30, then 45, 60 only while the border is still more than 20% opaque; edge un-mix and feather. `opaqueShare()` exists as a "sanity check on the keying" but **is not called anywhere** (grep of `src/`).
5. **Picture panel** (`quality.ts`, `pageInspect` in pageIO.ts): three VLMs (Step 5; Nemotron 3.5 Super VL via OpenRouter free or NVIDIA; Nemotron Omni as tie-break) each answer atomic yes/no or count questions about a before|after side-by-side; fixed rules (`brokenRules`) decide; green = at least two clean votes; a checker that answered under half its questions has no vote.
6. **Facts asked**: mouths: wanted shape, tongue visible/out, smiling, lips drawn left/right; lids/brows: wanted change visible, mouth changed; arms: wanted pose, arm count (must be 2), hands visible (at least 2), hand over face, face changed; all parts: facial hair same, skin marks same, eyes look same direction, "looks broken".
7. **Retry**: up to 3 tries per part; the failed reasons become a "make sure: ..." fix note in the next prompt; best of three kept as "unsure" (fewest reasons) or "missing".
8. **Throttle**: 35 requests/minute per host; a checker whose free daily quota is spent sits out 6 hours.
9. **Measured agreement with Ak** (comment in pageIO.ts, 16 Oct 2026, Maria and Lucky, 30 verdicts): Nemotron 3.5 Super VL 27/30, Step 5 26/30, Nemotron Omni 24/30, Gemma 4 13/30 (mostly no answer). 95% Wilson intervals (my arithmetic): 27/30 = 74-97%, 26/30 = 70-95%, 24/30 = 63-91%. **30 items is too few to rank judges.**
10. **Not checked at all**: drift of everything outside the cut (only VLM questions); eye count on faces; line weight/style; registration between base and edit; key-colour spill/halo after keying; floating specks and holes in the alpha; head/leg cropping of the part's own picture; duplicates between parts; set coverage beyond status; and **no learning from Ak's accept/reject** (thresholds and rules are fixed). Also: `matchColours` removes global colour shift before cutting, so a palette drift never shows downstream. Known open bug: `basePrompt` forces "both eyes ... parallel" (puppet-recipe.md).

Reference datapoint from puppet-recipe.md (23 Oct 2026): with local engines more than half the parts needed a redo and the checkers caught about half of those; Nano Banana 2.1 batch kept the character across all 46 edits with about 4 redos (about 9%). Prevention (a stronger editor) moves the failure rate more than any checker.

---

## 2. Identity / consistency to the base

### 2.1 Embeddings: DINOv2, CLIP, SigLIP

| Model | Licence (HF API) | Size | Notes |
|---|---|---|---|
| DINOv2 small / base | apache-2.0 | 22M / 87M params | ViT-S/14 distilled 21M, ImageNet k-NN 79.0%, linear 81.1% (repo table). Runs on CPU for 1-2 images per part. Source: https://github.com/facebookresearch/dinov2 [read]; https://huggingface.co/api/models/facebook/dinov2-small [read] |
| DINOv3 vits16 | "other", gated manual | 22M | Licence not open. Avoid unless terms are read. https://huggingface.co/api/models/facebook/dinov3-vits16-pretrain-lvd1689m [read] |
| SigLIP 2 base | apache-2.0 | 375M | https://huggingface.co/api/models/google/siglip2-base-patch16-224 [read] |
| CLIP / OpenCLIP | open_clip_torch is MIT (PyPI classifier) | ViT-B/32 ~150M [unk exact] | https://pypi.org/pypi/open-clip-torch/json [read]; OpenAI CLIP repo licence tag missing in HF API, **[unk]** from my sources |
| LPIPS | BSD (PyPI classifier) | AlexNet-based, small | https://github.com/richzhang/PerceptualSimilarity [read] |
| DreamSim | MIT (PyPI classifier) | ensemble of CLIP+OpenCLIP+DINO; size [unk] | Fine-tuned on human similarity judgements; NIGHTS accuracy 96.2% (ensemble) vs 94.8-95.9% for single backbones. https://github.com/ssundaram21/dreamsim [read] |

Evidence for which embedding to trust:
- DreamBooth's authors introduced the DINO score because CLIP-I mis-ranked subject fidelity: in the supplementary, a sample that looks more like the reference scored lower on CLIP-I than a worse one, "the DINO metric more closely tracks human evaluation". https://openaccess.thecvf.com/content/CVPR2023/supplemental/Ruiz_DreamBooth_Fine_Tuning_CVPR_2023_supplemental.pdf [snip]
- ELECT (Oct 2026) uses DINOv2 embeddings plus k-means to throw out wrong-object / lookalike crops ("incorrect crops appear as outliers in the embedding space"), and states DINOv2 "separated visually similar characters more reliably than CLIP" in preliminary experiments (no numbers given). Precedent for outlier detection among one character's crops. https://arxiv.org/html/2610.15555v1 [read]
- DINOv2 and CLIP are described as complementary; evaluate both on your own pairs. https://dinov2.com/dinov2-vs-clip.html [read] (third-party reference site, low authority)
- Edit-preservation benchmarks (Emu Edit, MagicBrush, AnyEdit) score "did the rest stay the same" with **L1 + CLIP-I + DINO against the source image**. This is exactly your "edit only the mouth" question. https://www.researchgate.net/publication/392133448_ImgEdit_A_Unified_Image_Editing_Dataset_and_Benchmark [snip]; https://arxiv.org/html/2604.23763v1 [snip]

Caveat for all: cosine thresholds are not universal. Calibrate per character (section 8). **[inf]** A character's own accepted parts give its reference spread: flag a new part whose distance to the base exceeds, say, the 95th percentile of the accepted parts' distances (z-score / k-means outlier, as ELECT does).

### 2.2 Anime-character model: CCIP

- CCIP (Contrastive Anime Character Image Pre-Training) scores "same character or not" between two single-character images. Best listed model `ccip-caformer_b36-24`: F1 0.941, precision 0.938, recall 0.944 (threshold 0.213); the default model `ccip-caformer-24-randaug-pruned`: F1 0.917 (P 0.933, R 0.901). Input 384 px, 768-d feature. Benchmark is the authors' own anime dataset. https://huggingface.co/deepghs/ccip/blob/main/README.md [read]; https://dghs-imgutils.deepghs.org/main/api_doc/metrics/ccip.html [read]
- Licence: model repo tag `openrail` (HF API); `imgutils` library MIT (GitHub API). OpenRAIL has use restrictions: read before bundling in a public build.
- **[unk]** accuracy on 3D-cartoon, animal, or non-human puppets. Test it on 20 pairs before trusting it. It also reads the whole picture, so it checks "same character" but not "the mouth is wrong".

### 2.3 Face recognition (ArcFace / InsightFace) on cartoons

- InsightFace code is MIT, but **"models trained with these data ... are available for non-commercial research purposes only"**, including the auto-downloaded `buffalo_l` ArcFace pack; licensing is by email. https://github.com/deepinsight/insightface [read]
- ComfyUI "face match" nodes are built on it (Alchemica Face Match: ArcFace cosine, default accept 0.45, CPU via onnxruntime; ComfyUI_FaceSimilarity: dlib, 0-100 score, above 50 "very similar"). Both are for photos/faces, and the Alchemica node returns "-1 = no face found". https://comfy.icu/node/AlchemicaFaceMatch [read]; https://github.com/chflame163/ComfyUI_FaceSimilarity [read]
- On cartoons: iCartoonFace (iQIYI, ACM MM 2020) used an ArcFace model **pre-trained on human faces only as the starting feature extractor** for filtering, then needed 5,013-character cartoon training to improve; its cartoon face detector (RetinaNet) reached 89% mAP@0.5 on their test set. The paper does not give a clean "off-the-shelf ArcFace on cartoons" accuracy in the parts I could read. https://ar5iv.labs.arxiv.org/html/1907.13394 [read, partly]
- Verdict: **AVOID** ArcFace for puppet identity (licence + domain + animals have no human face). **[unk]**: off-the-shelf ArcFace accuracy on your puppets; not worth measuring given the licence.

### 2.4 SSIM / LPIPS on aligned crops

- Because each part is cut from a same-size edit of the same base, no alignment is needed to compare the **region outside the cut**: base vs edit, with the cut box (dilated) masked out. A good edit leaves that region nearly identical; a redraw shows up as high L1/LPIPS/low SSIM there. `skimage.metrics.structural_similarity` (BSD) and `lpips` (BSD) do it. https://scikit-image.org/docs/stable/api/skimage.metrics.html [read]
- **[inf]** Compute this both before and after `matchColours`: the gap between the two is itself a "global tone shift" score that the pipeline currently hides.
- Cost: milliseconds on CPU. No published threshold for flat-colour cartoons; calibrate.

### 2.5 Palette / histogram distance

- OpenCV `compareHist` supports correlation, chi-square, intersection, Bhattacharyya/Hellinger, KL. https://docs.opencv.org/4.x/d6/dc7/group__imgproc__hist.html [read]
- **[inf]** Compute on the opaque pixels only, in Lab (so the key colour does not dominate), outside the cut region; add dominant-colour check (k-means 6-8 colours, compare matched centroid ΔE). Flat cartoons have few colours, so a drifted skin or fur colour is a large histogram shift. No published threshold; calibrate.

---

## 3. Structure checks (eyes, limbs, crop, alignment)

### 3.1 Counting with a VLM: do not trust it for "one eye" vs "two eyes"

- VLMs scored an average of **17.05%** on counting when the image is a counterfactual of something they know (4th stripe on a 3-stripe logo, 5th leg on a dog); most wrong answers were the memorised answer. Removing the background nearly doubled accuracy (+21.09 percentage points). A one-eyed or three-eyed character is the same trap. https://arxiv.org/abs/2505.23941 [read]
- VLMs also fail simple low-level geometry (overlap, intersection, counting circles). https://arxiv.org/html/2407.06581v1 [snip]
- HoloCount (Jul 2026): top models "degrade significantly" on adversarial/counter-prior counting, "persistent numerical hallucinations". https://arxiv.org/html/2607.06420 [read]
- Local judges like Qwen3-VL are better than older ones but no source tests them on cartoon eye counts. **[unk]**.

### 3.2 Counting with a detector or from the base

| Tool | Licence | Size | Cartoon evidence |
|---|---|---|---|
| OWLv2 base (open-vocabulary detector) | apache-2.0 | 155M | none found [unk]. https://huggingface.co/api/models/google/owlv2-base-patch16-ensemble [read] |
| Grounding DINO tiny | apache-2.0 | 172M | none found [unk]. https://huggingface.co/api/models/IDEA-Research/grounding-dino-tiny [read] |
| SAM 3 (text "eye" returns every instance as masks) | "other", gated manual (SAM licence) | 860M | built for "all instances of a concept" and counting benchmarks; no cartoon test found [unk]. https://arxiv.org/html/2511.16719v2 [read]; https://huggingface.co/api/models/facebook/sam3 [read] |
| Florence-2 base / large | mit | 232M / 777M | object detection / region captioning; counting on cartoons [unk]. https://huggingface.co/api/models/microsoft/Florence-2-large [read] |
| Moondream2 | apache-2.0 | 1.9B | has `detect()` and `point()` skills; v3 preview licence is "other" and 9.3B. https://blog.roboflow.com/moondream-2/ [snip]; https://huggingface.co/api/models/moondream/moondream3-preview [read] |

**[inf]** Cheaper and more reliable: **record the expected counts once, at base approval** (eyes = N, arms = 2, head count = 1), from a human click or one detector run Ak confirms. Then, for lids/brows/mouth parts, the *changed pixels* must sit where the base's eyes are (two patches for two eyes, one for a one-eyed character). Compare the **eye-region crop of the edit against the same crop of the base**: for a mouth part it must be pixel-near-identical; any detector/VLM is then needed only on rare borderline cases. This uses the base as ground truth instead of asking a model to count.

### 3.3 Landmarks: MediaPipe vs anime detectors

- MediaPipe face mesh/landmarker: a ComfyUI-controlnet-aux maintainer states **"Mediapipe is only trained on camera images so anime, CGI images aren't compatible"** (issue about it failing to detect faces). Single anecdotal comment, but consistent with the task docs describing human faces. https://github.com/Fannovel16/comfyui_controlnet_aux/issues/204 [read]. MediaPipe is Apache-2.0 (PyPI classifier).
- `anime-face-detector` (hysts, MIT code): detects **near-frontal anime faces** and predicts **28 landmarks** (Faster R-CNN or YOLOv3 + HRNetV2). Requires Python 3.12+, PyTorch 2.2+. Fails off-frontal by design. https://github.com/hysts/anime-face-detector [read]; https://pypi.org/project/anime-face-detector/ [read]. Training-data licence for the weights: **[unk]**, check before shipping.
- `lbpcascade_animeface` (nagadomi, OpenCV cascade, CPU, tiny): face box only, no landmarks; author says `animeface-2009` is more accurate but harder to install. https://github.com/nagadomi/lbpcascade_animeface [read]
- YOLOv8 anime face: P 0.957, R 0.924, mAP50 0.955 on the author's 10,000-image safebooru test; **licence agpl-3.0** (HF API; Ultralytics is AGPL-3.0 on PyPI). Avoid in an MIT repo. https://huggingface.co/Fuyucchi/yolov8_animeface [read]
- Your characters include owls, foxes, one-eyed creatures; anime-face detectors are for human-like anime faces. **[unk]** hit-rate on them. Do not plan on landmarks; use base-derived expected positions (3.2).

### 3.4 Crop, bounding box, registration

- Crop/cut-off: **[inf]** alpha bounding box of the part's whole edit vs base: area ratio, top/bottom/left/right margin, alpha touching the image border. Pure numpy.
- Registration of stacked parts: parts are composited at the same pixel position they were cut from, so misalignment shows up as the edit's *non-edit region* shifting relative to base. Measure sub-pixel shift with OpenCV `findTransformECC` or `phaseCorrelate` on the outside-region. https://docs.opencv.org/4.x/dc/d6b/group__video__track.html [read]. **[inf]** Threshold e.g. over 1.5 px at 1024 → "edit moved the character".
- For a *stack* of layers (mouth over lids over brows), Bunraku (Live2D generation, Jul 2026) reports a **missing or inconsistent layer in the set is the dominant end-to-end error channel**, and that independently plausible layers still break as a character. Supports set-level checks in section 6. https://arxiv.org/html/2607.27348v1 [read]

---

## 4. Cut-out quality (alpha, spill, specks, holes)

No paper found that measures *chroma-key spill on cartoon cut-outs*. Standard ingredients:

| Check | How | Source / note |
|---|---|---|
| Alpha-quality error vocabulary | SAD, MSE, Gradient, Connectivity are the standard matting error types (need a ground-truth alpha, which you don't have) | https://www.alphamatting.com/eval_25.php [read]. Use as vocabulary, not as a runnable metric. |
| Floating specks | `connectedComponentsWithStats` on alpha above 0.5: component count and area; flag components under ~0.2% of the main component | https://docs.opencv.org/4.x/d3/dc0/group__imgproc__shape.html [read] |
| Holes | connected components on the *inverted* alpha, minus the outer background component; compare hole count/area with the base's alpha | same; **[inf]** (a fox with pink-key holes was a real failure, 12 Oct, per puppet-recipe.md) |
| Key-colour fringe / halo | **[inf]** composite the part over black, white and the key's complement; in a 3-6 px band around the alpha edge, measure hue distance to the key colour and the share of pixels within ΔE of the key. Magenta shadows inside the body = pixels inside alpha with Lab distance to the key below a threshold |
| Despill reference | FFmpeg's `despill` filter exists for green/blue; the principle (limit the key channel by the others) can be applied to magenta | https://salivity.github.io/ffmpeg/article/remove-green-screen-spill-in-f-fmpeg-with-despill [snip] |
| Second-opinion mask | Run a background-removal model on the *raw edit* and compare IoU with your flood-fill alpha; a low IoU = bad key. BiRefNet: MIT, 221M params. RMBG-1.4/2.0 are licence "other" (non-commercial). | https://huggingface.co/api/models/ZhengPeng7/BiRefNet [read]; https://huggingface.co/api/models/briaai/RMBG-2.0 [read]. VRAM for BiRefNet at 1024: **[unk]**. Heavier than needed if the pixel checks work. |
| Existing helper | `opaqueShare()` (pixels.ts) = share of opaque pixels; compare against the base's; **already written, not called** |

Practical game-sprite QA advice exists but is manual: view PNG over light and dark backgrounds because a pale halo can be invisible on white; check the grid math; check every frame in order for pose jumps and changing accessories. https://aispritegen.com/sprite-workflow [read] (a vendor page, low authority; matches the compositing idea above).

---

## 5. Mouth-shape correctness (13 visemes)

No published classifier for cartoon mouth crops was found. Options:

1. **Geometry features + tiny classifier [inf]**. On the changed region: height/width of the dark interior, share of dark interior, share of teeth-white, share of tongue-red, mouth width vs base mouth width, vertical extent vs base. Train logistic regression / small GBM on your accepted mouths (13 classes). Cheap, explainable, needs only labels you already generate when Ak accepts parts. Accuracy **[unk]**.
2. **Embedding + few-shot [inf]**. DINOv2 features are meant to "be directly employed with classifiers as simple as linear layers ... without fine-tuning" (repo). Embed the mouth crop; k-NN / linear probe against accepted exemplars of the 13 classes (pooled across characters, or per-character after 1-2 examples). https://github.com/facebookresearch/dinov2 [read]. Accuracy **[unk]**; confusions between neighbouring visemes (EE vs half-EE, AH vs OH) are likely.
3. **Template matching against the recipe's own spec**. The recipe has a text spec per mouth (`expect`). Convert to numeric ranges (openness ratio etc.) and test the extracted features; reject if outside. Pairs well with option 1.
4. **VLM multiple choice [inf]**: show the *mouth crop only* and ask "which of these descriptions fits: A closed, B slightly open, C wide open, D round O ..." and compare to the target. Better than the current "is the mouth this shape?" yes/no because a yes/no on the target is exposed to yes-bias. VLMs are weak at subtle comparisons (VLM-SubtleBench: "systematic gaps between model and human performance"), so use for coarse classes only. https://arxiv.org/html/2603.07888v1 [read]

Also: viseme definitions as background (Microsoft's list is 22 visemes, not your 13): https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis-viseme [snip].

---

## 6. VLM-as-judge: patterns, failure rates, calibration, cost

### 6.1 What the literature says

| Finding | Source |
|---|---|
| Strong LLM judges reach over 80% agreement with humans (same as human-human) on chat; known biases: position, verbosity, self-enhancement; mitigations proposed (e.g. swap order) | MT-Bench paper https://arxiv.org/abs/2306.05685 [read] |
| Multimodal judges: "remarkable human-like discernment in **Pair Comparison**" but "significant divergence from human preferences" in **Scoring** and **Batch Ranking**; biases, hallucination, inconsistency even in GPT-4V | MLLM-as-a-Judge https://arxiv.org/abs/2402.04788 [read] |
| Decompose into **atomic, unique yes/no questions in a dependency graph** so answers stay consistent (e.g. don't say "no motorcycle" then "it is blue"); QG/A approaches correlate better with human 1-5 ratings than single-score metrics (the paper reports Kendall τ 47.2 for DSG-style scoring vs 23.1 for CLIPScore; the 47.2 subject is elided in the text I read, so treat as approximate) | DSG https://arxiv.org/html/2310.18235v3 [read] |
| VQAScore: score = a VQA model's probability of "Yes" to "Does this figure show {text}?"; outperforms CLIPScore on compositional prompts | https://blog.ml.cmu.edu/2024/10/07/vqascore-evaluating-and-improving-vision-language-generative-models/ [read, partly] |
| Yes/no polling questions are a more stable probe than free description; LVLMs hallucinate objects that are frequent or co-occur in training data | POPE https://arxiv.org/abs/2305.10355 [read, partly] |
| VLMs struggle with subtle comparative reasoning between near-identical images; Qwen2.5-VL called two different products identical | https://arxiv.org/html/2603.07888v1 [read]; https://openaccess.thecvf.com/content/CVPR2026/papers/Marsili_Same_or_Not_Enhancing_Visual_Perception_in_Vision-Language_Models_CVPR_2026_paper.pdf [read] |
| Counting under counter-prior: 17.05% | section 3.1 |

Image Forge's current panel already follows DSG-style atomic facts + rules + 2-of-3 votes, which is the right pattern. What it lacks is crop-level questions and non-VLM evidence.

### 6.2 Prompt patterns that raise reliability (supported or inferred)

1. **Facts, not verdicts** (already done; Ak's 15 Oct finding that a judge approved a tongue it had just described).
2. **Crop to the region in question** and, per the biased-VLM paper, remove clutter; ask about the eye crop, the mouth crop separately. [supported by +21 pp with background removed; inf for crops]
3. **Ask for a count as a number after listing**: "list each eye you see with its position, then give the count". Still prior-biased; do not rely on it for unusual anatomy (3.1).
4. **Reverse-polarity twin question** for acquiescence ("is the mouth open?" and "is the mouth closed?") and flag disagreement as borderline. [inf]
5. **Swap the order** of LEFT/RIGHT (or base/edit) on a second call for borderline cases, as MT-Bench mitigates position bias. [source for the bias; inf for this use]
6. **Two judges from different families must agree**; a third only on disagreement (already done).
7. **Deterministic settings** (temperature 0) and a strict answer format. [inf]
8. Prefer **pairwise (base vs edit)** only for large differences; for identity drift use embeddings/pixels (VLM-SubtleBench, Same-or-Not).

### 6.3 Free API tiers: what is actually available (checked 25 Oct 2026)

| Provider | What was found | Limit | Source |
|---|---|---|---|
| Gemini API free tier | Free of charge: Gemini 3.8 Flash, 3.6 Flash, 3.5 Flash-Lite, 3.1 Flash-Lite, Gemma 4; image models, Gemini 4 Argon, Pro are paid only. Free tier: Google "can use your prompts and responses to improve its products". | Google **no longer prints per-model RPM/RPD** in docs (see AI Studio console). Limits are per project; daily reset midnight Pacific. A community tracker puts 3.x Flash at "roughly 10 RPM and 1,500 RPD", indicative only. | https://dev.to/hassann/gemini-api-free-tier-in-2026-limits-models-and-when-you-get-billed-4081 [read]; https://ai.google.dev/gemini-api/docs/rate-limits [read]; https://klymentiev.com/blog/gemini-api-free-tier [read] |
| Vertex AI with free credits | Per Ak's CLAUDE SPACE notes: only project `tier-1-emf` works; **credit ends before Christmas 2026**. Treat as a time-limited extra, not a base. | n/a | local file `CLAUDE SPACE/CLAUDE.md` |
| Groq | Docs list one vision model, `qwen/qwen3.8-27b` (up to 3 images/request, 2,048 tokens per image) plus a limited-preview Meta model. A third-party article lists free "larger models" (incl. Llama 4 Scout) at 30 RPM / 1,000 RPD. Free-plan numbers for the Qwen vision model: **[unk]**, check `console.groq.com/settings/limits`. | | https://console.groq.com/docs/vision [read]; https://klymentiev.com/blog/groq-api-free-tier [read] |
| Cloudflare Workers AI | Free allocation 10,000 neurons/day, reset 00:00 UTC. `@cf/meta/llama-3.2-11b-vision-instruct`: 4,410 neurons per M input tokens, 61,493 per M output tokens. My arithmetic: a call with 1,500-4,000 image+prompt tokens and 20-40 output tokens costs about 8-20 neurons, so **roughly 500-1,300 judge calls/day** if nothing else uses the allowance. Token count per image **[unk]**. **Image generation already uses this allowance** (one dev picture about 6,100 neurons per puppet-recipe.md). | | https://developers.cloudflare.com/workers-ai/platform/pricing/ [read] |
| OpenRouter `:free` | 20 requests/minute; **50 requests/day with no credits purchased**, 1,000/day once at least $10 of credits has ever been bought (a purchase would break the zero-cost rule; Image Forge's code comment assumes about 1,000/day, so the account may already be on the higher tier: verify with `GET /api/v1/key` → `free_model_daily_requests`). | | https://openrouter.ai/docs/api_reference/limits [read]; https://openrouter.ai/blog/tutorials/how-to-get-the-lowest-cost-llm-inference-on-openrouter/ [snip] |
| NVIDIA hosted models | Already wired (Step 5, Nemotron 3.5 Super VL, Nemotron Omni). Terms/limits not checked this session. | | `pageIO.ts` |
| Local (RTX 3070, 8 GB) | see table below | | |

### 6.4 Local VLMs for the 8 GB card

Memory is **weights only unless noted**; Q4 figure is my estimate from the common rule "about 0.56 bytes per weight plus about 1 GB overhead" (https://localaimaster.com/tools/vram-calculator [snip]). Real usage depends on the runtime and image size: measure before relying on it.

| Model | Licence (HF API) | Params | fp16 weights | Q4 estimate |
|---|---|---|---|---|
| Qwen3-VL-2B-Instruct | apache-2.0 | 2.13B | 4.3 GB | ~2.2 GB |
| Qwen3-VL-4B-Instruct | apache-2.0 | 4.44B | 8.9 GB (does not fit) | ~3.5 GB |
| Qwen3-VL-8B-Instruct | apache-2.0 | 8.77B | 17.5 GB | ~5.9 GB (tight with anything else on the card) |
| Qwen2.5-VL-7B-Instruct | apache-2.0 | 8.29B | 16.6 GB | ~5.6 GB |
| Qwen2.5-VL-3B-Instruct | licence tag missing in API [unk] | 3.75B | 7.5 GB | ~3.1 GB |
| MiniCPM-V-4 | apache-2.0 | 4.06B | 8.1 GB | ~3.3 GB |
| InternVL3-2B | apache-2.0 | 2.09B | 4.2 GB | ~2.2 GB |
| SmolVLM2-2.2B | apache-2.0 | 2.25B | 4.5 GB | ~2.3 GB |
| Moondream2 | apache-2.0 | 1.93B | 3.9 GB | ~2.1 GB |
| Florence-2-large | mit | 0.78B | 1.6 GB | ~1.4 GB |
| Gemma 3 4B-it | "gemma" licence, gated | 4.3B | 8.6 GB | restricted terms; avoid for a public build |

Sources: `https://huggingface.co/api/models/<id>` for each (read). A user report runs Qwen3-VL 4B Q4_K_M for invoice extraction on an 8 GB card, 8-38 s per document; no cartoon QC data. https://www.reddit.com/r/Qwen_AI/comments/1x28tms/qwen3827b_q4_on_rtx_4060_8gb_32gb_ram_6_toks_with/ [read] (anecdote).

Heat rule: batches of local VLM calls count as a "long generation run" under the project rules: say so and get a yes first. DINOv2, LPIPS, pixel checks do not.

### 6.5 Calibrating thresholds with a small hand-labelled set

- **Labels**: for each part-try, Ak taps accept/reject + a failure tag (drift, eye count, lips, wrong shape, crop, spill, misaligned, style). The pipeline already makes these when Ak redoes parts. Start with the 23 Oct Blip + Grump runs (46 edits × engines) if the rejected images still exist [unk].
- **Size**: with n = 30 the 95% interval on a 90% hit-rate is 74-97% (my Wilson arithmetic above), too wide to rank judges. Aim for **at least 100 labelled items with at least 30 bad ones** before fixing thresholds.
- **Choosing a threshold**: sklearn `precision_recall_curve` on each feature; pick (a) a **low threshold with near-100% precision for "reject"** (so cheap rungs rarely discard a good image) and (b) a **high threshold with near-100% recall for "accept"** (so nothing bad slips through); between them = borderline → next rung. https://scikit-learn.org/stable/modules/generated/sklearn.metrics.precision_recall_curve.html [read] [inf for the two-threshold use]
- **Judge bias correction**: Prediction-Powered Inference combines a small gold set with a large model-labelled set, estimates the judge's error from the gold set, and corrects estimates with valid confidence intervals; `ppi_py` is the reference code. Useful to *estimate the true failure rate* of auto-accepted parts. https://www.science.org/doi/10.1126/science.adi6000 [snip]; https://github.com/aangelopoulos/ppi_py [snip]
- **Zero-miss audits**: if you audit n auto-accepted parts and find 0 bad, the 95% upper bound on the escape rate is about 3/n (30 → 10%, 50 → 6%, 100 → 3%). https://en.wikipedia.org/wiki/Rule_of_three_(statistics) [snip]
- **Cost = zero**: rungs 1-2 are local CPU; rung 3 runs only on the borderline slice, so the free quota (hundreds to ~1,000 calls/day across providers) covers it; a cache keyed by image hash + question prevents repeats.

---

## 7. Library-level QC

| Need | Tool / method | Licence | Source |
|---|---|---|---|
| Exact/near duplicates (e.g. mouth_AH ≈ mouth_OH, a part ≈ base = "nothing changed") | `imagehash` (average, perceptual, difference, wavelet, colour hashes; Hamming distance). README says its hashes read luminance structure (colour hash separate), shows groups of different-looking free icons sharing one hash at hash size 8, and suggests a larger hash size or a Hamming-distance threshold. Better for flat cartoons: DINOv2 cosine. | BSD-2-clause | https://github.com/JohannesBuchner/imagehash [read] |
| Duplicates, uniqueness, hardness, "mistakenness" in one local toolkit | FiftyOne Brain: `compute_near_duplicates`, `compute_uniqueness`, `compute_exact_duplicates`, mistakenness, hardness, all from embeddings | Apache | https://docs.voxel51.com/brain/ [read]; https://pypi.org/pypi/fiftyone/json [read] |
| Suspect labels (Ak's accept/reject that look wrong) | `cleanlab` confident learning | Apache-2.0 (PyPI) | https://github.com/cleanlab/cleanlab [snip] |
| Coverage | **[inf]** manifest check: every character × every required part id present, status ok/unsure/missing, expected pixel size, expected eye/arm counts; run before sending to Video Forge. Bunraku: the set "must be complete and correctly ordered ... a missing sleeve is an inter-layer inconsistency no animation model can repair". | n/a | https://arxiv.org/html/2607.27348v1 [read] |
| Variation diversity | Mean pairwise cosine among the 5 brows (or 13 mouths): near-1.0 = brows barely differ ("change not visible"); also required: separation between each part and the base | | **[inf]** |
| Review queue that learns | Active learning: an algorithm that chooses what to ask a human reaches accuracy with fewer labels; uncertainty-based query strategies. https://burrsettles.com/pub/settles.activelearning.pdf [read, abstract]. **[inf]** Queue order: (1) judges disagree, (2) a metric between its two thresholds, (3) first-of-its-kind (new failure tag), (4) a random 5-10% of auto-accepts as an audit. Every click is logged with all feature values; thresholds are re-fit nightly (6.5). |

---

## 8. How others do it

- **ComfyUI**: identity gating is a node at the end of the graph returning a float plus accepted flag. Alchemica Face Match (ArcFace cosine, default 0.45; "for a batch you get the worst score ... a batch is only as good as its worst face"; warns that a missing install returns -2 and silently rejects everything) and ComfyUI_FaceSimilarity (dlib). Photo-face tools; not for cartoons. https://comfy.icu/node/AlchemicaFaceMatch [read]; https://github.com/chflame163/ComfyUI_FaceSimilarity [read]. Lesson: **distinguish "failed" from "could not run"** (Image Forge's panel already does for checkers: no vote ≠ no).
- **Edit benchmarks** (Emu Edit, MagicBrush, AnyEdit): L1 + CLIP-I + DINO vs source for preservation. Section 2.1.
- **Story/character generation research** (ELECT, Oct 2026): DINOv2 k-means to drop outlier crops, anchor election among a character's own drafts, aCCS character consistency score. https://arxiv.org/html/2610.15555v1 [read]
- **Live2D layer pipelines**: See-through (single-image layer decomposition for anime characters, SIGGRAPH 2026, 23 body-part layers) and Bunraku (Live2D-Bench, 8,884-model corpus). Both treat set completeness and joint consistency as the quality criteria; neither publishes a hand-QC checklist I could find. https://github.com/shitagaki-lab/see-through [snip]; https://arxiv.org/html/2607.27348v1 [read]
- **Game sprite QA**: manual checklists (alpha over light/dark, grid maths, frame order, pose jumps). https://aispritegen.com/sprite-workflow [read]. No studio-published automated sprite QA numbers found: **[unk]**.
- **Not found**: any published catch-rate for stacked pixel + embedding + VLM QC on 2D-puppet parts.

---

## 9. Proposed QC ladder

Principle: each rung is cheaper and more deterministic than the next; each rung either **rejects clear failures**, **accepts clear passes**, or **passes borderline up**. All rungs log their raw numbers so Ak's clicks can tune them.

Notation: "R" = reject threshold, "A" = accept threshold, both fitted from labelled data (6.5). Expected catch: only where a source gives one.

| Rung | Checks (all per try, before any API call) | Catches | Cost / where | Free? | Expected catch |
|---|---|---|---|---|---|
| **0. Prevention** (not QC) | Fix `basePrompt` eye clause (per-look eye count); use the strongest editor for parts | Many identity/count failures never occur | n/a | Local engines only for tests | Datapoint: >50% redo with local engines vs ~9% (4 of 46) with Nano Banana 2.1 batch (puppet-recipe.md) |
| **1. Pixel / geometry** (CPU, ms) | (a) outside-region drift vs base: L1/SSIM/ΔE and LPIPS, before and after colour matching; (b) patch census: count/position of strong patches vs the part's expected count (two eyes → two lid patches, one-eyed → one; mouth → one patch, nothing in the eye boxes); (c) alpha: components, specks, holes vs base, border contact, bbox/area ratio vs base; (d) key-colour fringe/spill score in edge band and inside alpha; (e) ECC / phase-correlation shift of the unchanged region; (f) Lab histogram + dominant-colour distance vs base outside the cut; (g) no-op and duplicate check by pHash/DINO against the base and against sibling parts | Global redraw, wrong places changed, extra/missing eye patches (via base-derived expectations), cropped silhouettes, halo/spill, floating specks, holes, shift, colour drift, no-op, copies | numpy / OpenCV / scikit-image / lpips; ms per image; no GPU | Yes, zero API | **[unk]**: no published rates; measure on the labelled set. Preservation-metric precedent: Emu Edit/MagicBrush/AnyEdit use L1+CLIP-I+DINO |
| **2. Embeddings** (CPU or small GPU) | (a) DINOv2-S/B cosine: whole edit vs base and (face minus cut box) vs base, against per-character spread; (b) CCIP same-character score for humanoid characters; (c) mouth viseme: geometry features and/or DINOv2 k-NN against the 13 classes, target-class rank; (d) lid/brow "change magnitude" vs required direction | Identity drift, wrong viseme class, brow/lid change absent or wrong | DINOv2 22-87M params; CCIP model size [unk]; < 1 s per part | Yes (Apache / OpenRAIL; check CCIP terms) | CCIP: F1 0.94 on anime same-character benchmark (HF README). DINOv2 vs CLIP: qualitative advantage only (DreamBooth supp., ELECT). Mouth classifier: **[unk]** |
| **3. VLM judge, borderline only** | Crop-level atomic questions with reverse-polarity twins and order swap; multiple-choice for the mouth class; two judges from different families, a third only on a split (existing panel). Local Qwen3-VL-4B/8B (Q4) as the free third voice | Whatever rungs 1-2 cannot call: "lips on a lipless puppet", tongue out, smile, hand over face, odd drawing artefacts | Free APIs (Gemini free tier, OpenRouter `:free`, Cloudflare ~500-1,300 calls/day, Groq, NVIDIA) + local VLM; heat warning for local batches | Yes | Ak's panel scores: 27/30, 26/30, 24/30 (single checkers, 95% CI 63-97%); the panel as a whole missed about half the bad parts on 23 Oct. Counting: 17% on counter-prior cases, so **not** the eye-count authority |
| **4. Human review queue** | Sort by uncertainty (judge split, near thresholds, new failure kind) + 5-10% random audit of auto-accepts; show diff overlay, base beside edit, failing metric highlighted; one key = accept/reject + tag | Everything left; produces labels | Ak's time | n/a | By definition; each audit of n clean auto-accepts bounds the escape rate at ~3/n (30 → 10%, 100 → 3%) |
| **5. Learning loop** (nightly) | Re-fit R/A thresholds per check from all labels; retrain mouth classifier; PPI estimate of the escape rate; cleanlab pass for suspect labels | Threshold drift, new failure modes | CPU | Yes | n/a |

Order of work (smallest first, each testable on the existing Blip/Grump images):
1. Label the existing Blip + Grump parts (accept/reject + tag). Needed for everything else.
2. Rung 1 (a), (b), (c): drift, patch census, alpha checks. Biggest gap, zero API, deterministic.
3. Record expected counts at base approval (eyes/arms/head) and use them in rung 1(b).
4. Rung 2 DINOv2 per-character spread; then mouth classifier from accepted mouths.
5. Rework rung 3 questions to crop-level + twins + order swap; keep the existing 2-of-3 rule.
6. Review queue + threshold re-fit.

---

## 10. Unknowns and what was not found

- Any measured catch rate for the stacked ladder, or for any single rung on 2D cartoon puppet parts.
- Off-the-shelf ArcFace accuracy on cartoons (licence makes it moot).
- CCIP, OWLv2, Grounding DINO, SAM 3, Florence-2, Moondream accuracy on your non-human/3D-cartoon characters.
- Groq free-plan limits for its current vision model; Gemini per-model free limits (not published); tokens per image for Cloudflare's vision model; whether the OpenRouter account is on the 1,000/day tier.
- Qwen2.5-VL-3B licence (tag missing in API); weight licence of `anime-face-detector`; CCIP OpenRAIL specifics.
- VRAM for BiRefNet, CCIP, DreamSim, and real (not estimated) VRAM for the Qwen3-VL quantisations on the 3070.
- Mini PC specs: not checked (outside scope); the DINOv2/pixel rungs do not need it.
- Whether the 23 Oct Blip/Grump rejected images still exist for labelling.

---

## 11. Sources (all opened unless tagged snip)

Image Forge (local): `docs/puppet-recipe.md`; `src/lib/puppet/quality.ts`, `pixels.ts`, `maker.ts`, `pageIO.ts`, `recipe.ts`.

Identity: https://github.com/facebookresearch/dinov2 · https://huggingface.co/api/models/facebook/dinov2-small · https://arxiv.org/html/2610.15555v1 · https://github.com/ssundaram21/dreamsim · https://github.com/richzhang/PerceptualSimilarity · https://huggingface.co/deepghs/ccip/blob/main/README.md · https://dghs-imgutils.deepghs.org/main/api_doc/metrics/ccip.html · https://github.com/deepinsight/insightface · https://ar5iv.labs.arxiv.org/html/1907.13394 · https://comfy.icu/node/AlchemicaFaceMatch · https://github.com/chflame163/ComfyUI_FaceSimilarity · DreamBooth supp. (snip) https://openaccess.thecvf.com/content/CVPR2023/supplemental/Ruiz_DreamBooth_Fine_Tuning_CVPR_2023_supplemental.pdf · ImgEdit table (snip) https://www.researchgate.net/publication/392133448_ImgEdit_A_Unified_Image_Editing_Dataset_and_Benchmark · https://arxiv.org/html/2604.23763v1 (snip)

Structure: https://arxiv.org/abs/2505.23941 · https://arxiv.org/html/2407.06581v1 (snip) · https://arxiv.org/html/2607.06420 · https://github.com/hysts/anime-face-detector · https://pypi.org/project/anime-face-detector/ · https://github.com/nagadomi/lbpcascade_animeface · https://huggingface.co/Fuyucchi/yolov8_animeface · https://github.com/Fannovel16/comfyui_controlnet_aux/issues/204 · https://arxiv.org/html/2511.16719v2 · https://huggingface.co/api/models/google/owlv2-base-patch16-ensemble · https://huggingface.co/api/models/IDEA-Research/grounding-dino-tiny · https://huggingface.co/api/models/facebook/sam3 · https://huggingface.co/api/models/microsoft/Florence-2-large · https://blog.roboflow.com/moondream-2/ (snip) · https://docs.opencv.org/4.x/dc/d6b/group__video__track.html · https://arxiv.org/html/2607.27348v1

Cut-out: https://www.alphamatting.com/eval_25.php · https://docs.opencv.org/4.x/d3/dc0/group__imgproc__shape.html · https://docs.opencv.org/4.x/d6/dc7/group__imgproc__hist.html · https://scikit-image.org/docs/stable/api/skimage.metrics.html · https://salivity.github.io/ffmpeg/article/remove-green-screen-spill-in-f-fmpeg-with-despill (snip) · https://huggingface.co/api/models/ZhengPeng7/BiRefNet · https://huggingface.co/api/models/briaai/RMBG-2.0 · https://aispritegen.com/sprite-workflow

Judges: https://arxiv.org/abs/2306.05685 · https://arxiv.org/abs/2402.04788 · https://arxiv.org/html/2310.18235v3 · https://blog.ml.cmu.edu/2024/10/07/vqascore-evaluating-and-improving-vision-language-generative-models/ · https://arxiv.org/abs/2305.10355 · https://arxiv.org/html/2603.07888v1 · https://openaccess.thecvf.com/content/CVPR2026/papers/Marsili_Same_or_Not_Enhancing_Visual_Perception_in_Vision-Language_Models_CVPR_2026_paper.pdf · https://www.science.org/doi/10.1126/science.adi6000 (snip) · https://github.com/aangelopoulos/ppi_py (snip) · https://en.wikipedia.org/wiki/Rule_of_three_(statistics) (snip) · https://scikit-learn.org/stable/modules/generated/sklearn.metrics.precision_recall_curve.html

Free tiers / local: https://ai.google.dev/gemini-api/docs/rate-limits · https://dev.to/hassann/gemini-api-free-tier-in-2026-limits-models-and-when-you-get-billed-4081 · https://klymentiev.com/blog/gemini-api-free-tier · https://console.groq.com/docs/vision · https://klymentiev.com/blog/groq-api-free-tier · https://developers.cloudflare.com/workers-ai/platform/pricing/ · https://openrouter.ai/docs/api_reference/limits · https://openrouter.ai/blog/tutorials/how-to-get-the-lowest-cost-llm-inference-on-openrouter/ (snip) · https://huggingface.co/api/models/{Qwen/Qwen3-VL-2B-Instruct, Qwen/Qwen3-VL-4B-Instruct, Qwen/Qwen3-VL-8B-Instruct, Qwen/Qwen2.5-VL-7B-Instruct, Qwen/Qwen2.5-VL-3B-Instruct, openbmb/MiniCPM-V-4, OpenGVLab/InternVL3-2B, HuggingFaceTB/SmolVLM2-2.2B-Instruct, vikhyatk/moondream2, google/gemma-3-4b-it, google/siglip2-base-patch16-224} · https://localaimaster.com/tools/vram-calculator (snip) · https://www.reddit.com/r/Qwen_AI/comments/1x28tms/qwen3827b_q4_on_rtx_4060_8gb_32gb_ram_6_toks_with/

Library QC: https://github.com/JohannesBuchner/imagehash · https://docs.voxel51.com/brain/ · https://github.com/cleanlab/cleanlab (snip) · https://burrsettles.com/pub/settles.activelearning.pdf · PyPI JSON for licences: ImageHash (BSD-2), lpips (BSD), dreamsim (MIT), open-clip-torch (MIT), fiftyone (Apache), cleanlab (Apache-2.0), ultralytics (AGPL-3.0), anime-face-detector (MIT), mediapipe (Apache-2.0) via https://pypi.org/pypi/<name>/json
