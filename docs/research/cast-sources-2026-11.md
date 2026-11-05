# Ready-made cast sources (searched 2026-11-03)

Why: Ak rejected script-built 3D Chloe as "2024 AI slop". Need artist-made, stylized, modest, everyday-people characters with a commercial video licence.
Page: characters/samples/character-sources.html

## 3D
- **ThreeDee One** (Superhive https://superhivemarket.com/creators/threedee-one, 76 products). Singles $48-88 list, $33.60-61.60 on sale (seen 2026-11-03). Lifetime library $799 / $559.30: "70+ single models", "Future single models included". Modern casual/business/doctor/teen. Auto Rig Pro body + face rig; selected characters have 52 ARKit blendshapes + lipsync (per character page). Blender 3.3-5.2, FBX, GLB. LICENCE NOT SEEN; confirm (samuel@threedee.design). Skip gym/emo titles (modesty).
- **VRoid Studio**: free; "can be used for commercial purposes" (https://vroid.pixiv.help/hc/en-us/articles/4405813333657). VRM 1.0 has visemes aa/ih/ou/ee/oh + expressions. Anime by default; de-animefying not researched successfully.
- **Quaternius**: licence https://quaternius.com/license.html allows film/video, no attribution. Source $19.99/kit; Patreon from €3/mo; $10/$20/$50 tiers give 15/30/75 claim credits. All-in-one tier price unknown. Outfits fantasy only; modular women/men = 10 chars, 24 anims, old low-poly look.
- **Blender Studio** characters: licence not stated on pages read; film characters, not everyday.
- **Synty**: licence covers videogames or productions agreed in writing (https://syntystore.com/pages/one-time-purchase-licence). Avoid.
- **Stylized Rigged Humans** (arzvel, Superhive): body-focused; fails modesty.
- **Reallusion Character Creator**: ~$299 per third-party blog, unverified; export licence unverified.

## Motion
- Mixamo: free; Adobe FAQ "Yes to all" for commercial.
- ActorCore: free tier "up to 10 FREE daily downloads"; Daily Life 2,268 / Communication 811 clips. Licence per pack unverified.

## 2D
- Reallusion Cartoon Animator 5: $149 app, 30-day trial. G3 360 "Office colleagues" $39 -> $23.40 (sale ends 2026-11-19). EULA: may "sell, and redistribute your creations ... in Image or Video". Some content "can only be used within Reallusion applications". No scripting/headless route found (unknown). Everyday packs: office, family, medical, campus.
- Spine: documented JSON (code-drivable), no everyday cast found.
- Adobe Character Animator puppets: free "no credit needed", mostly quirky, app-locked.
- Live2D samples: anime; terms unread.

## Not reached (Ak to check)
Patreon catalogues, Fab, CGTrader, ArtStation stylized casual, Envato Elements / Motion Array 2D kits, Moho/Toon Boom rig packs, Booth.pm modest VRoid bases.

## Ak's 4 links (checked 2026-11-03, Firecrawl + research-forge)
- **AutoCharacters 3.0** https://superhivemarket.com/products/autocharacters-male--female-body-presets-base : stylized; Complete = 168 fitted clothes (75 M / 93 F), 100 poses; finger rig. "a Commercial license is required for your monetized YouTube". Complete Commercial $167.99 (was $349.97), Base Commercial $143.99; Standard $28.79/$62.39 NOT enough. Face rig / mouth shapes NOT mentioned; ask seller. Ships SFW + NSFW scenes (use SFW only).
- **Human Generator Ultimate** https://superhivemarket.com/products/humgen3d : $68 Personal / $128 Commercial; both list "Use for YouTube and Vimeo videos". Age slider young adult to old. "Over 30 individual controls for brows, eyes, mouth and jaw", ARKit face capture. Photoreal ("Make realistic humans").
- **Customisable Male + Female Basemesh** https://superhivemarket.com/products/customisable-male-female-basemesh-bundle : $15, GPL. Rigify, 80+ sliders incl. head scale. Face expressions and clothing list not stated.
- **polygoniq humaniq** https://polygoniq.com/3d/humaniq/ : archviz, 119 humans, "basic rig for posing adjustments", AI-generated base meshes. Not for acting.

## Human Generator deep check (2026-11-03)
- Licence FAQ https://humgen3d.com/docs/faq/license-faq : Personal = public YouTube/Vimeo yes, "Commercial renders/animations" no; FAQ: "We made an exception to our license for YouTube and Vimeo creators" (public videos only). Other platforms: public = no commercial licence needed; paywalled = needed. Can't share/sell HG models, even edited. 1 user per licence.
- Contact: support@humgen3d.com, Discord https://discord.gg/qDbYGGcFpg, Superhive messages (Oliver J Post).
- Superhive ratings: 4/5 from 137. Pros: value, Rigify rig well weight-painted, ARKit, heads/hair, scriptability. Cons: limited clothing (several), bodies "not that great", a crash report, slow viewport for lip sync; YouTube comment: poses/expressions disappear after adding Rigify.
- Videos: CGDive review https://www.youtube.com/watch?v=9NVqCrgb8wU (2023, 35k views, has Batch Generation chapter); Rhubarb lip sync + HG https://www.youtube.com/watch?v=Xw9kbuPo9MU ; AutoLipSync Pro + HG https://www.youtube.com/watch?v=xYg43UBLt-8 ; Rokoko mocap + HG https://www.youtube.com/watch?v=XQG5iCipCaQ . No stylized/toon HG examples found.
- Reddit threads exist but blocked for bots (login wall): r/blender 1pzd08c, 1f402ud.
- Gmail draft to support@humgen3d.com created 2026-11-03 (10 questions: licence for multi-platform, 2 machines, stylizing, visemes/Rigify, fingers/Mixamo, Python headless, modest outfits, teens/heavier bodies, AMD 8060S, EEVEE speed).

## Trial results (2026-11-04)
See docs/HANDOFF.md "Human Generator trial". Headless API works, expressions survive Rigify, finger bones present, 0.6-0.76 s/frame at 540x720 on the laptop.
