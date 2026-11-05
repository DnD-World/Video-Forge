# Pro 2D character techniques - research notes (2026-11-05)

Tools used: research-forge `web_search` + `read_page` first. Videohive pages: research-forge got only cookie text / a Cloudflare check page, so those 3 pages were read with Firecrawl `firecrawl_scrape` (plain page read, no bypass).
Rule used here: every fact has a URL. Lines marked **[UNSOURCED]** are my own craft knowledge, not found in a source this session - treat as a starting guess to test. Unknown stays unknown.
Search quality was weak for Q3, Q4 and Q5; gaps are listed at the end.

## 1. The three Videohive packs

### Vol 2 - https://videohive.net/item/2d-character-animation-pack-vol-2/58943917
- Author fxjagi2014, $35. After Effects CC 2018+, "No plugins required".
- 1920x1080, **25 fps**. 20 animations, looped, alpha channel, "drag and drop customization", tutorial file included.
- Clips 2-9 s long. Project 200 MB (so heavy vector/PNG art, not tiny).
- Tags: 2d, flat, cartoon, rig, explainer, builder, kit, office, business, corporate.
- Page names NO rig tool (no Duik / RubberHose / Joysticks). Shading not mentioned. "Flat" tag = flat-colour style.

### Vol 1 - https://videohive.net/item/2d-character-animation-pack-vol-1/58827803
- Same author, $45. Same specs: AE CC 2018+, no plugins, 1920x1080, **25 fps**, alpha, looped, drag-and-drop.
- "More than 45 different animations". Clips 2-8 s. 285 MB. Includes video files (pre-rendered) + project files.
- Tags add "Explainer Toolkit", "rig". No rig tool named. Flat style.

### Basic Characters Animations Pack - https://videohive.net/item/basic-characters-animations-pack/5917417
- Author sfxstudio, $16, 129 sales, last update 2013. AE CS5 to CC. 1920x1080.
- Not a character-rig pack: "30 basic icon character animations" = 20 text reveals, 9 scenes, 1 logo reveal, colour adjust, PDF help. Tags: icon, picto, kinetic, text reveal.
- Frame rate not stated. Project is 2:16 long, 3.3 MB (tiny = shape layers only).

### What this tells us
- Commercial "packs" at this price are: flat vector, looped short clips (2-9 s), 25 fps, drag-and-drop. Nothing on the pages mentions curved/rubber-hose limbs, shading, or a named rig tool. Do NOT assume more polish than the pages claim.
- The polish people mean ("pro AE packs") more likely comes from Duik/RubberHose-rigged characters (below) - pages do not confirm that for these three.

### Rig tools (what pros use in AE)
- RubberHose (BattleAxe): bendy "noodle" arms/legs without rigid joints; extra bend points give S-curves, fingers, tails; "stretchy bones". https://www.battleaxe.co/rubberhose/
- Duik Bassel: free; auto-rigging + inverse kinematics ("almost every feature"). RubberHose = fastest rig; Duik = full pro toolset. https://schoolofmotion.com/blog/duik-vs-rubberhose
- Joysticks 'n Sliders: page blocked by Cloudflare - NOT READ. Unknown.
- Duik official page (rainboxprod.coop) returned a spam/gambling page via research-forge - ignore, not read.
- Rubber hose history: style = limbs drawn as flowing curves with no elbow/knee joints; Bill Nolan on Felix the Cat, 1920s; Mickey Mouse and Betty Boop are the famous examples. https://en.wikipedia.org/wiki/Rubber_hose_animation
- Engine takeaway: a limb = a curve (bezier/spline) through shoulder-elbow-wrist with thickness, not two rigid sticks. Add extra bend points for S-curves. (derived from the two sources above)

## 2. Craft that makes 2D character animation feel alive

### Principles (definitions, Wikipedia) - https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation
- Follow-through: loose parts keep moving after the body stops, overshoot, then get pulled back with damped oscillation (this is a spring).
- Overlapping action: parts move at different rates/start times (arm vs. torso).
- Moving hold: animate between two very similar poses; sitting characters still breathe/shift so they never go "lifeless".
- Slow in / slow out: more drawings near start and end of an action (= ease in/out).
- Anticipation: a small move the opposite way before the main action (knees bend before a jump).
- Squash and stretch: volume must stay constant (stretch tall = get narrower).
- Arcs: natural motion follows curved paths.
- Smear frames: elongated in-between drawings that fake motion blur on fast moves; standardised by Tex Avery / Chuck Jones at Warner Bros, 1930s-40s. https://en.wikipedia.org/wiki/Smear_frame
- Numbers for offset/drag (e.g. frames of delay per body part) were NOT found in any source read. **[UNSOURCED]** common practice: delay each child part 1-3 frames behind its parent, and drive hair/cloth with a damped spring instead of keyframes. Test it.
- A book that covers "overlapping action, follow-through and drag": Animation: The Mechanics of Motion (PDF copy found, not read): https://theswissbay.ch/pdf/Gentoomen%20Library/Animation/Animation_Mechanics_Motion.pdf

### Blinks (numbers)
- "A standard blink is usually about 8 frames, with the lids closed for about 2 frames, and an ease-in and ease-out at either end. Often you want to offset the eye lids by one frame." (Animator's Survival Kit, via blog) https://animationapprentice.blogspot.com/2018/03/why-animators-need-to-blink.html
- Animation Mentor: blinks take **3-5 frames down, a brief hold, 2-4 frames to open**; top lid does most of the movement, lower lid catches up; offset brows and lids; slow blinks = fatigue/sadness, quick = excitement/nerves, half blinks for casual, long holds (few blinks) for fear/focus. https://www.animationmentor.com/blog/tutorial-animate-blinks-eye-movement/
- Add a blink on a head turn / gaze shift (it "edits out" the in-between; mirrors a film cut). Same animationapprentice source.
- Reddit animator advice: blink on 2s with ~3-4 drawings max. https://www.reddit.com/r/animation/comments/1hq0g9p/im_new_to_animation_and_tried_to_animate_my/ (forum snippet, weak source)
- Brow drag on blink: only "offset eyebrows and eyelids" is sourced (Animation Mentor). Exact brow lag in frames: unknown. **[UNSOURCED]** brow lags lid by ~1-2 frames and dips slightly.
- Blink interval: one forum snippet says 70-150 frames between blinks (https://www.facebook.com/groups/267851339903643/posts/9057365587618797/) - weak; treat as a range to randomise.

### Lip sync (shapes, holds, blending)
- Rhubarb Lip Sync uses 6 basic shapes A-F (invented at Hanna-Barbera for Scooby-Doo / Flintstones, now de-facto standard) plus 3 optional: G, H, X. https://github.com/DanielSWolf/rhubarb-lip-sync/blob/master/README.adoc
  - A closed (P/B/M, slight lip pressure); B slightly open, clenched teeth (K/S/T, "EE"); C open ("EH", "AE"); D wide open ("AA"); E slightly rounded ("AO", "ER"); F puckered ("UW", "OW", "W"); G teeth on lower lip (F/V, optional); H tongue up (long L, optional); X idle/rest (optional).
  - C is the in-between from A/B to D; E is the in-between from C/D to F; "make sure A-C-D and B-C-D look smooth". E must never be wider open than C.
- Preston Blair names: MBP closed, AI wide open, O rounded, U puckered, FV teeth-on-lip. https://www.kasradesign.com/how-lip-sync-works-in-2d-animation-and-the-tools/ (Blair set is ~10 shapes per https://www.scribd.com/document/498052185/Animacao-bocas)
- Timing recipe (Animperia guide, https://animperia.com/learn/lip-sync-animation):
  - Hold each shape **at least 2 frames** (animate on twos), longer on stressed vowels; changing every frame = "chattering".
  - Fast speech: drop shapes, keep vowels + closed lips.
  - Put the mouth **1-2 frames before** the sound; their tool allows up to 5 frames of lead.
  - M/B/P must close the lips, even for one frame.
  - Don't snap closed -> wide; pass through the middle open shape.
  - Example at 24 fps: "Round holds 6 frames on hello, lips close 2 frames on the M of my".
  - Head, brows, jaw, blink carry emotion; mouth is the last layer.
- Coarticulation: no source gave a formula. **[UNSOURCED]** engine idea: treat each shape as a target, blend mouth params over 2-3 frames toward the next target, never skip the middle shape (rule above), and let long vowels hold.
- Automation caveat: auto lip-sync needs human-added holds and anticipations. https://www.kasradesign.com/how-lip-sync-works-in-2d-animation-and-the-tools/
- Rhubarb outputs timed cues from audio (+ optional dialog text); usable as the viseme source for our engine. Same GitHub README.

## 3. Faking a soft 3D / clay / toy look in flat 2D

What was actually found (thin - see gaps):
- Claymorphism = the named UI/illustration style for "clay": rounded squircle shapes, matte look, soft inner shadows, glossy inner highlight, colour-tinted (not grey) shadows, pastel colours. Sources: Figma plugin description https://www.figma.com/community/plugin/1678388492837523987/claymorphic-claymorphism-3d-clay-puffy-pastel-ui-inflated-buttons-css-export ; https://www.gleamstudio.design/blog-post/design-trends-2026 ; double soft shadows: https://icora.io/styles/clay-icons ; explainer: https://bamboolab.eu/blog/design/all-about-claymorphism-and-how-to-create-it-on-your-own
- Illustrator gradient mesh tutorial roundup (shading and highlights by adjusting mesh points): https://blog.spoongraphics.co.uk/articles/20-tutorials-to-help-master-illustrators-gradient-mesh ; Illustrator 2025 "Mesh Gradients - make illustrations look 3D": https://www.youtube.com/watch?v=SzDA_3hu_Ck
- Canvas building blocks (MDN): `clip()` and `globalCompositeOperation` modes. `source-atop` draws only where existing content is (= shadow stays inside the part); `multiply` darkens (shadows); `screen` lightens (highlights); `overlay`/`soft-light` for grain. https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
- Spine meshes: an image textured onto a polygon; vertices bend/deform the image, driven by bone weights; vertex positions can be keyed. This is how pro 2D rigs bend a drawn limb without redrawing. https://esotericsoftware.com/spine-meshes
- RubberHose bends art along a path (battleaxe link above). Rive docs page for meshes: URL I tried returned 404; not read. Lottie: not researched.

Recipe for the engine (my synthesis, **[UNSOURCED]** - these are standard digital-painting steps, not quoted from a source; verify visually):
1. Base fill = 2-stop radial/linear gradient (light top-left, deeper hue bottom-right), not a flat colour.
2. Shadow shapes: draw a blurred dark-tinted shape inside `clip()` of the part (ctx.filter blur or shadowBlur, `multiply`). Use a hue-shifted warm shadow on skin (red/orange-leaning) and a cool-tinted shadow on cloth, never plain black.
3. Contact shadows (AO): hair onto forehead, chin onto neck, sleeve hem onto arm, hand onto torso - each a soft blurred band clipped to the receiving part, drawn on the receiver, and re-drawn every frame from the caster's pose so it moves with it.
4. Highlights: small soft white-ish ellipses on nose tip, cheeks, lower lip, forehead, hair crown; `screen` or normal at 20-40% alpha.
5. Rim light: thin inner stroke on the edge facing the light colour, clipped to the part.
6. Inner glow: inset stroke blurred, light colour, to fake "puffy" volume.
7. Eyes: glossy white catch-light(s) fixed to the eye, not to the pupil.
8. Rounded ends everywhere (round caps/joins) - hard corners kill the toy look.

## 4. Texture in canvas/vector animation; stopping "swimming"

- The effect has a name: **shower-door effect** - a texture fixed to screen space "swims" over a moving object. Cure in 3D = drive the texture from **object-space** coordinates so it sticks to the surface. https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-15-blueprint-rendering-and-sketchy ; also noted in https://markmark.net/npar/npar2000_lake_et_al.pdf (paper-texture pencil shader causes it during animation).
- Canvas mapping of that idea: `createPattern()` then `pattern.setTransform(DOMMatrix)` each frame so the pattern follows the part's own transform (translate/rotate/scale). https://developer.mozilla.org/en-US/docs/Web/API/CanvasPattern/setTransform (setTransform exists in all browsers since Jan 2020). Alternative: draw the part to an offscreen canvas in its local space, apply the texture there, then draw that canvas with the part's transform.
- Spine/Rive-style meshes: texture is baked into the part image and deforms with the mesh (Spine page above) - textures cannot swim because they are part of the image.
- Which one to choose: fabric/skin patterns = lock to the part (object space). Paper grain over the whole frame = screen space on purpose, but pros keep it subtle or animated-on-twos (**[UNSOURCED]**: "boiling" grain refreshed at 8-12 fps reads as hand-made; static grain over moving art reads as dirty glass).
- Halftone, brush textures, noise overlays: no craft source found. **[UNSOURCED]** halftone dots as a pattern clipped to the shadow shape only; noise as a tiny tiled PNG with `soft-light` at low alpha.

## 5. Text animation for YouTube-style videos

Source limits: only generic After Effects tutorials were read; no source gave ms values for cartoony pops or write-ons. Numbers marked [UNSOURCED] are my starting points.

### (a) Clean / minimal lower thirds
- Infinite Creation recipe (AE, 25 fps): text 30 px below final position, opacity 0 -> position final + opacity 100 over **15 frames** (0.6 s), Easy Ease (F9), tweak graph so it starts fast and settles. Overshoot variant: 5 px past at +20 frames, back at +25 frames. Keep lower third ~80% down the frame. https://infinitecreation.io/tutorial-kinetic-ae
- Material Design reference for UI-speed motion: 200 ms with Standard easing for small items; emphasized decelerate for entering. https://m3.material.io/styles/motion/easing-and-duration (and /tokens-specs; the tokens page read empty - only the 200 ms line came from the search snippet).
- Hold time on screen and exit timing: not found. **[UNSOURCED]** hold 3-5 s, exit = reverse in ~60% of the in-time.

### (b) Kinetic typography (word/letter by word, emphasis)
- Built with Text Animators + Range Selector: opacity animator at 0%, animate Range Start 0->100%; stack Position + Scale + Tracking animators with slightly offset timing; "Ramp Up" shape gives a soft cascade instead of a hard cutoff; asymmetric easing (steep entry, longer settle); sync keyframes to audio peaks; kinetic bounce = overshoot then settle. https://trydemotion.com/blog/kinetic-typography-4
- Reveal speed examples: 4-word phrase in ~0.5 s with sharp ease-out; 10-word sentence ~2 s with slow ease-in accelerating (same page). Use character-based range units so timing stays predictable when text length changes (same page).
- Per-letter/word stagger in frames: no number found. **[UNSOURCED]** 1-3 frames per letter, 3-6 frames per word.
- Emphasis words: bigger scale + colour + a small rotation (**[UNSOURCED]**).

### (c) Cartoony / bouncy call-to-action
- Pop recipe seen in a search snippet: keyframe scale **0% -> 110% -> 100% with a "back" ease** for text pop. https://loopdesk.ai/blog/what-are-keyframes-and-easing (the fuller page text did not repeat the line; snippet only - weak)
- GSAP eases to use in code: `back`, `elastic`, `bounce`, `CustomWiggle`, `CustomBounce` (with squash). https://gsap.com/docs/v3/Eases/ (listed, no durations).
- Squash on landing + wiggle after: principles above; durations **[UNSOURCED]**: pop 8-12 frames at 25-30 fps, 1-2 wiggles decaying over ~15 frames, sticker = slight random rotation (-4 to 4 deg) + white outline + drop shadow.

### (d) Handwritten / marker write-on
- Method: trace each letter as stroked paths, animate stroke "Trim Paths" end 0->100% in letter order; stroke -> fill swap at the end. https://www.capcut.com/resource/write-on-effect-in-after-effects ; course: https://www.skillshare.com/en/classes/the-write-on-technique-hand-lettering-in-motion/389809607
- Speed/timing numbers: none found. **[UNSOURCED]** ~0.05-0.1 s per letter, ease-in-out per stroke, tiny pen-tip wobble.
- Other families not researched (glitch, typewriter, paper cut-out): unknown.

## 5b. Scene transitions (explainer-style)

General guidance (short-form video, https://framenotion.com/blog/best-transitions-for-short-form-video-ads): transitions should hide a cut, add energy or mark an idea change; anything that pauses motion more than a few frames must earn its place; must read on mute; whip pan and zoom push best used once or twice only; text wipe = a text block/bar/shape slides across and reveals next shot underneath, doing double duty for copy.

| Transition | How it is built (from source) | Extra build notes |
|---|---|---|
| Hard cut / match cut | Align an object, shape or motion line between outgoing and incoming shot (framenotion) | Match position/scale/rotation of one shape across the cut |
| Whip pan | Fast sideways movement with motion blur, settle on next shot (framenotion, https://www.insta360.com/blog/tips/how-to-create-film-transitions.html) | **[UNSOURCED]** 6-10 frames; ease-in then ease-out on a sideways slide of both scenes; blur proportional to speed |
| Zoom push / zoom-through | Fast zoom into a detail, or zoom out to reveal (framenotion) | **[UNSOURCED]** scale scene A up to a hole/object that becomes scene B; cut at max scale |
| Shape / text wipe | Bar, text block or shape slides across and reveals next scene (framenotion) | **[UNSOURCED]** in canvas: clip scene B with a growing shape (circle, blob, stripes) - easiest to code |
| Ink / liquid wipe | Not sourced | **[UNSOURCED]** animated blobby mask (metaball or noise-threshold) revealing scene B |
| Paper tear / cut-out | Not sourced | **[UNSOURCED]** two clip polygons with jagged edge sliding apart + paper-edge highlight |
| Light burst / flash | Soft burst of light sweeps the frame (framenotion) | additive white overlay 3-6 frames |
Unknown: real timing values from pro packs. Tutorial links found but not read: whip tutorial https://www.tiktok.com/@stephenscrivens/video/7003091116543266053 ; match-cut tutorial https://www.youtube.com/watch?v=ZFolxPFgU8A

## Gaps / what to do next (not found)
- Joysticks 'n Sliders page (Cloudflare block) and Duik official page (hijacked result) not read.
- No source with frame-offset numbers for overlap/drag, brow-drag lag, coarticulation blend times, texture-boil rates, text stagger, pop/write-on durations, transition durations. All marked [UNSOURCED]; best plan = A/B test in the engine instead of trusting these.
- No named artist tutorial for "2D vector that looks 3D toy" beyond gradient-mesh roundup + claymorphism sources. Worth a second pass: search Behance/Dribbble case studies, Rive "squishy/clay" community files, Procreate clipping-mask shading tutorials.
- Lottie and Rive mesh docs not read (Rive URL 404).
- Verify before adopting: whether the Videohive packs really use Duik/RubberHose - ask the sellers or buy one (not done; no purchases allowed).
