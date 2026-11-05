# Season 1 in 2D: making the coded characters move and look exceptional

Planning only, 4 Nov 2026. Nothing here has been built yet. Ak asked for smooth, natural, varied movement; to see how far texture can go; for gravity and wind on hair and clothes; and for creative mixing of several methods. The listed moves were examples, not limits. 3D is parked until Season 2.

Red Flag's cast uses four looks today: `hose2` (15 characters), `paper` (12), `geo` (11) and `glass` (2). These come from `brands/redflag/cast.json`. Every idea below is checked against those four looks.

---

## 1. Why it looks choppy and the knees bend oddly now (from reading the engine)

- **Legs are driven by two angles** (hip and shin) unless a walk plants the feet. Nothing stops a knee bending the wrong way, and the feet can float or slide. Only walks and crouches solve the knee from where the foot is (`rig.mjs` lines 140–178).
- **Moves come from two weak sources.** Many are smooth sine waves, which read as robotic. The rest are motion-capture takes keyed every 66 ms, which jitter. The springs in `motion.mjs` smooth the result, but they can't add weight, arcs or intent.
- **Nothing in a moving body ever leads or drags.** In real motion the hips move first and the hand arrives last. In ours every joint arrives at once, which gives the puppet ("karagiozis") feel Ak named.
- **There is no motion blur.** At 24–30 frames per second, any fast move strobes.
- **The deliberate wobble on some looks** (`paper`, `notebook`) redraws the lines 3–8 times a second. That's a style choice, but next to smooth motion it can read as choppy.

These are measurable, so step 0 of the build is a "choppiness meter" that records how far each joint jumps between frames on today's moves. The fixes can then be shown working, not just claimed.

---

## 2. The idea: a stack of methods, each doing what it is best at

No single method makes a character look exceptional. Studios layer several. The proposal is eight layers, each replaceable and each testable on its own:

| # | Layer | What it decides | Main method |
|---|---|---|---|
| 1 | **Intent** | what the character wants to express this second | script + voice → emotion, emphasis, who they talk to |
| 2 | **Choreography** | the key poses and their timing | hand-built pose library + move generators |
| 3 | **Body solver** | where every joint really goes | IK (feet and hands placed first, joints worked out from them), joint limits, balance, foot planting, contacts between characters |
| 4 | **Animator's touch** | the life in between key poses | automatic animation principles: anticipation, overshoot, drag, arcs, moving holds |
| 5 | **Physics** | everything that hangs, swings or flies | particle chains and cloth strips with gravity and a wind field; ragdoll for falls |
| 6 | **Shape** | how limbs and bodies deform | bendy limbs, squash and stretch, smear frames |
| 7 | **Surface** | what the character is "made of" | GPU shading: light, rim, texture, paint, clay, line quality |
| 8 | **Frame** | the shot | camera, motion blur, particles, impact frames, colour grade |

Mixing happens across the stack. A hug, for example, is choreography (keys) + solver (hands lock onto the partner) + physics (both characters' hair squashes) + frame (a slow push-in with a few hearts). Today the engine has rough versions of layers 2, 3 and 7.

---

## 3. Movement: smooth, natural, varied

### 3a. Natural bodies (layer 3)
- **IK on every limb.** Hands and feet get placed where they should be, and elbows and knees are worked out from that. Joint limits mean a knee only bends forwards and an elbow never folds backwards.
- **Foot planting everywhere,** not just in walks. A foot on the floor stays exactly put until the move lifts it. That alone removes most "floaty" frames.
- **Balance.** The body's centre of weight stays over the foot it stands on, and the engine leans the hips and spine automatically to keep it there. Picking something up, kicking or reaching high then look physically possible.
- **Hips decide height.** With the feet planted, the hips can't sit higher than the legs can reach, so a character never hovers above the floor.

### 3b. Smooth motion (layers 4 and 8)
- **Pose-to-pose with curves.** A move becomes 3–7 strong key poses with timing, and the engine draws smooth curves between them. Joints travel on arcs (wrists swing round, not in straight lines).
- **Overlapping action, done automatically.** The hips start, then the chest, shoulder, elbow and finally the hand, a few frames apart. The head leads a turn with the eyes, then the face, then the body.
- **Moving holds.** A character is never frozen: breathing, a weight shift, small settling.
- **Motion blur from sub-frames.** Each output frame is rendered 4–8 times at in-between moments and averaged. It's the cheapest strong cure for strobing, and the new PC's GPU makes it affordable.
- **Frame rate as a style.** Smooth on ones (every frame) by default. Deliberate "on twos" bursts for comedy or punchlines, which Spider-Verse made famous. The choppiness becomes a choice, not a fault.

### 3c. Variety: where all the moves come from
Mocap has failed for 2D, and stock-clip tracking was rejected. So moves come from a mix:

1. **A hand-built pose library** (written in code, with Ak judging taste). There are about 80 strong key poses, like standing, sitting, kneeling, crouching, lying down, reaching, hugging, recoiling and pointing. Each move is then a few poses plus timing. Principles layer 4 does most of the work, so poses don't need hand in-betweens.
2. **Move generators** for moves that follow rules rather than drawings:
   - **Jump:** take-off crouch, then a real flight arc from take-off speed (gravity), stretch going up, squash and a dust puff on landing. The jump height is just a number.
   - **Dance:** reads the music's beat. It bounces on the beat, sways on the bar, and strings moves together in 8-counts. Two characters can dance in sync, in mirror, or one after the other.
   - **Walk, run, sneak, stomp** from one walk engine, with mood settings (heavy, bouncy, tired, angry).
   - **Kick, punch, throw:** wind-up, a fast strike with a smear frame, hold, recover. Strength and speed are dials.
   - **Fall, trip, faint:** a ragdoll (physics takes the body for a moment), blended back into a get-up pose.
3. **Interaction moves between two characters,** using contact points. A hand can lock to the partner's hand, head, shoulder or back. Both bodies then solve together:
   - **Handshake:** the hands meet, then pump in a shared rhythm.
   - **Hug:** each arm wraps the other's back, with layer order switching so the arm goes *behind* the partner. Both lean in, and both heads tilt.
   - **Petting the head:** the hand follows the partner's head. The partner's hair squashes and springs back (physics), and their eyes close happily.
   - Also: high five, arm round the shoulder, pulling someone by the hand, a slap (with an impact frame), dragging someone away, whispering in an ear.
4. **Still pictures as key-pose references (optional).** Generate one still image of the wanted pose with the image model, read the skeleton from that single picture, and use it only as a *key pose*; timing still comes from layers 2 and 4. This is different from the rejected method of tracking whole clips frame by frame. Flagged because it's close to it, so Ak decides.
5. **Talking body language from the voice.** "Beat gestures" land on the stressed words (from the audio's loudness and the script). The emotion tag picks the posture: sad = slumped, slow, head down; angry = leaning forwards, sharp; flirty = head tilt, weight on one hip (kept modest).

Not proposed for Season 1: text-to-motion AI models. They produce 3D motion, which brings back the flattening problem.

---

## 4. Gravity and wind on hair and clothes (layer 5)

- **Hair as chains of points with real gravity.** Locks, ponytails, fringes and buns-with-strands are each a short chain of points that swings, bounces and settles, then deforms the drawn hair shape, so it stays a readable cartoon shape, not loose strands. At the top of a jump the hair floats up; on landing it slams down.
- **Clothes:**
  - Skirt hems, sleeve ends, coat tails, scarves, ties and bag straps are strips of linked points that collide with the legs and body.
  - Earrings, necklaces and bows swing too (the earring dangle already exists in `wardrobe.mjs` and gets upgraded).
- **One wind field for the whole scene.** Smooth swirling noise with gusts, a direction and a strength per scene. The wind is made visible with matching particles (leaves, petals, dust, snow) that move the same way as the hair, which is where the wow comes from.
- **Modesty rule built into the physics.** Skirt points can never rise above a line just above the knee. Wind moves the hem sideways and behind, never up at the front. Chests have no jiggle, ever. A new automatic check (alongside `check.mjs`) fails any frame that breaks this.
- **Same result every render.** The simulation starts at frame 0 and steps at a fixed rate, so re-rendering a video gives identical frames.

---

## 5. Texture: no, it's not just colour gradients

**What the engine can already do (Canvas 2D):** flat colour, gradients, pattern fills (dots, hatching, halftone, holes, grain), a hand-drawn wobble, paper shadows, sticker edges, a neon glow, print misregistration and a stained-glass glow. That's 20 looks.

**What a GPU shader layer adds.** This is a second drawing pass on the GPU (graphics card), on the same skeleton. Each item below is a dial, not a separate engine.

| Surface idea | What you'd see | Good for |
|---|---|---|
| **Fake-3D light on flat shapes** | rim light, soft shading bands, a moving shine on hair, light colour taken from the scene's lamp | all looks; makes characters sit *in* the scene |
| **Cast shadows** | shadows on the floor, on the wall and on each other, stretching as the light moves | all looks |
| **Clay without 3D** | soft blobby joints, fingerprint dents, matte light: the clay look Ak wanted, in 2D | a new look, or `geo` pushed further |
| **Painted (gouache or watercolour)** | brush texture, pigment pooling at edges, paper showing through, paint "boiling" gently | `paper`, flashbacks |
| **Fabric** | denim weave, knit, velvet sheen, sequins catching light, glitter on drama dresses | wardrobe in every look |
| **Line quality** | ink lines thicker on the shadow side and tapered at the ends, like a real brush | `hose2`, `glass` |
| **Real glass** | light pouring through `glass` characters' colour panes onto the floor | `glass` |
| **Textures from the image model** | the image model (NB2) paints seamless fabric, hair and paper swatches, which are then laid onto the shapes | everything; cheap, and consistent because it's a pattern, not a character |

**Other ways to draw coded characters (honest comparison):**

| Method | Verdict |
|---|---|
| Canvas 2D (today) | KEEP as the base. Runs everywhere and is easy to test. Slow for heavy effects. |
| **PixiJS** (free, MIT): GPU 2D drawing with bendable meshes, ropes for hair and huge particle counts | **RECOMMENDED** as the layer 5–8 engine. |
| **Shape-field drawing** (SDF: the character described as distance maths in a shader, drawn by the GPU) | RECOMMENDED for clay and blobby joints, outlines of any width and shape morphing. Pairs with PixiJS. |
| SVG with filters | Useful for a cheap hand-drawn wobble. Too slow for long videos. |
| **Live2D-style face turns** (face features slide over a curved head when it turns) | RECOMMENDED as a trick inside our engine. Gives heads real depth on turns. |
| Rive, Spine, Live2D, DragonBones (editor tools) | AVOID for Season 1. Characters must be built by hand in their editors, which breaks "code makes the cast"; Spine is paid. |
| Blender Grease Pencil (2D drawn in 3D space) | AVOID for Season 1 (back to the 3D roundabout). Revisit in Season 2. |

---

## 6. Wow factors (layer 8 and beyond)

- **The "Red Flag" impact frame** as a channel signature. On the big reveal line:
  - the frame freezes;
  - colours flip to red and black and the background becomes speed lines;
  - the character turns into an inked sketch;
  - a red flag whips in on its own cloth physics with a sound hit, then everything snaps back.
- **Multiplane camera:** backgrounds in depth layers, real parallax, focus pulls with blur, slow push-ins for tension, whip pans with motion blur.
- **Reaction zooms** (drama staple), with a small camera shake.
- **Smears and speed lines** on slaps, turns and storm-offs.
- **Squash and stretch** on jumps, surprise and laughter.
- **Mood lighting that shifts with the scene:** warm to cold when the twist hits; shadows lengthen.
- **Emotion effects:** sweat drop, tear drops with gravity, blush lines, an anger vein, a little dark cloud with rain over a sulking character, hearts, sparkles and confetti.
- **Eyes that feel alive:** quick eye darts, blinks on head turns, pupils that shrink in shock.
- **Lip sync:** already exists (`src/lib/visemes`, mouth shapes from word timings). It gets the same smoothing, and the jaw and cheeks move with it.

---

## 7. Limits (honest)

- Coded characters won't reach hand-drawn feature-film acting. The realistic target is high-end motion-graphics cartoon with wow moments. Ak judges whether that's enough.
- Two-character moves (hug, handshake, fight) are the hardest part. Contact and layer order need careful per-move tuning.
- GPU effects and motion blur make renders slower: roughly 4–8× for blur, though not measured yet. The new PC is the target machine, and long renders on the laptop need the heat rule (warn, throttle, one at a time).
- The pose library needs Ak's eye. I write the poses; Ak only says yes or no from side-by-side pages, with no acting.
- Licences: PixiJS is MIT. Every other library gets checked before download, and downloads still need Ak's OK.

---

## 8. How we'd find out what works: the "2D Lab" page first

Before building anything for real, one page with **side-by-side A/B clips** (Ak's preferred way to decide). Each pair is today vs the idea, on Chloe, in `geo`, `paper` and `hose2`:

1. Smoothness: today's wave vs pose-to-pose + drag + motion blur.
2. Knees and feet: today's sit-and-stand vs IK + planted feet + balance.
3. Variety reel: jump, kick, dance-on-beat, faint (ragdoll), each in two energies.
4. Two characters: handshake, hug and head-pat.
5. Hair and skirt in wind: calm, gusty and jumping, with the modesty line drawn for checking.
6. Surface sampler: flat (today) vs rim light + shadows vs clay vs gouache vs fabric, on one still pose.
7. Wow reel: the Red Flag impact frame, a reaction zoom and a parallax push-in.

Rough size, in human work hours (estimates, not measured):

| Piece | Hours |
|---|---|
| Lab page + choppiness meter | 4 |
| Body solver (IK, limits, balance, planting) | 14 |
| Pose library start (≈30 poses) + principles layer | 18 |
| Jump, dance, kick and ragdoll generators | 16 |
| Interaction contacts (3 moves) | 14 |
| Hair and cloth physics + wind + modesty check | 16 |
| GPU surface layer (PixiJS): 4 surface samples | 18 |
| Camera, motion blur, impact frame | 10 |
| **Total to a full Lab page** | **≈110** |

A smaller first round would be lab pairs 1, 2, 5 and 6 (≈50 hours). It answers "is this good enough?" before the rest.

---

## 9. Decisions only Ak can make

1. Lab first, small round (pairs 1, 2, 5, 6) or the full round?
2. Which looks matter most for Season 1: `geo`, `paper` or `hose2`? (The Lab tests all three; the build focuses on one first.)
3. Is the still-picture key-pose idea (section 3c, item 4) OK, or too close to the rejected tracking?
4. A Red Flag impact frame as the channel signature: yes or no?
