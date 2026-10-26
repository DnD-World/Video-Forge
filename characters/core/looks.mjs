// ---------------------------------------------------------------------------
// LOOKS: ways of drawing the same character.
//
// A look never changes WHO the character is (that is the card: hair, clothes,
// colours). It changes HOW they are drawn: proportions, line, fill, colour
// treatment, texture. So any character can be shown in any look, and a new
// look is a new entry here, not new characters.
//
// Fields (all optional except id/name/p):
//   p          proportions in units of standing height (feet at 0, up is −):
//              headR head radius · sy shoulder line · hy hip line ·
//              sw half shoulder width · hw half hip width
//   outline    line thickness, fraction of height (0 = no outlines)
//   ink        line colour; inkFrom: "top" takes it from the clothes (neon)
//   limb       "line" (stick limbs) | "tube" (filled limbs) | "hose" (bendy)
//   limbW/legW limb thickness, fraction of height
//   eyes/mouth force a face style (the look's signature: pie eyes, overbite)
//   mouthScale bigger mouths for tiny-headed looks (so they read on a phone)
//   fill       "solid" | "none" (line art) | "hatch" (ballpoint) | "glass"
//   tone       colour treatment: "keep" | "mono" | "bw" | "twostrip" | "noir" |
//              "primary" | "spot" | "vivid"
//   mono       the one colour for "mono"; incise: details drawn in `ink` on it
//   spot       inks for "spot"
//   shade      two-tone shading strength (geo, noir); halftone dot shading (pop)
//   inner      a lighter line inside the outline (MBE sticker)
//   offset     colour printed off the line by [dx, dy] (1950s)
//   translucent painted see-through leather with light holes (Karagiozis)
//   layer      a treatment of the whole figure: "sticker" | "chalk" | "paper" |
//              "riso" | "glow" | "lamp"
//   rivets     pins at the joints (shadow theatre)
//   gloves, bigShoes   era details (rubber hose)
//   boil       default line boil for the look (px at 720 high); boilRate
//   profile    best seen from the side (vase, shadow puppets, Karagiozis)
//   scene      effects that belong to the whole frame, not the figure
//              (film grain, vignette) — applied by the scene, never per avatar
// ---------------------------------------------------------------------------

export const LOOKS = [
  { id: "stick", name: "2D stick cutout", blurb: "Round heads, thin line limbs, flat clothes — the storytime-channel look.",
    p: { headR: 0.145, sy: -0.66, hy: -0.4, sw: 0.085, hw: 0.07 }, outline: 0.006, limb: "line", limbW: 0.009 },
  { id: "geo", name: "Geo-minimal", blurb: "Rounded geometry, no outlines, soft two-tone shading.",
    p: { headR: 0.16, sy: -0.6, hy: -0.36, sw: 0.12, hw: 0.11 }, outline: 0, limb: "tube", limbW: 0.055, shade: 0.16, eyes: "small" },
  { id: "corp", name: "Corporate flat", blurb: "No outlines, tiny heads, long bold limbs, a few loud flat colours.",
    p: { headR: 0.07, sy: -0.76, hy: -0.47, sw: 0.085, hw: 0.075 }, outline: 0, limb: "tube", limbW: 0.05, legW: 0.075, eyes: "small", noNeck: true, tone: "vivid", mouthScale: 1.8 },
  { id: "sticker", name: "MBE sticker", blurb: "Thick dark outlines with a lighter inner line and a white sticker edge.",
    p: { headR: 0.15, sy: -0.62, hy: -0.37, sw: 0.11, hw: 0.1 }, outline: 0.016, inner: true, limb: "tube", limbW: 0.045, eyes: "oval", layer: "sticker", ink: "#2a1840" },
  { id: "pop", name: "Pop-art comic", blurb: "Bold black ink, halftone dots, primary colours.",
    p: { headR: 0.125, sy: -0.68, hy: -0.41, sw: 0.095, hw: 0.08 }, outline: 0.011, limb: "tube", limbW: 0.036, halftone: true, tone: "primary" },
  { id: "hose", name: "1930s rubber hose (black & white)", blurb: "Bendy limbs, pie-cut eyes, white gloves.",
    p: { headR: 0.17, sy: -0.6, hy: -0.36, sw: 0.1, hw: 0.1 }, outline: 0.012, limb: "hose", limbW: 0.032, eyes: "pie", gloves: true, bigShoes: true, tone: "bw",
    scene: { film: true } },
  { id: "hose2", name: "1930s rubber hose (early colour)", blurb: "The same shapes in the reds, greens and creams of early two-colour film.",
    p: { headR: 0.17, sy: -0.6, hy: -0.36, sw: 0.1, hw: 0.1 }, outline: 0.012, limb: "hose", limbW: 0.032, eyes: "pie", gloves: true, bigShoes: true, tone: "twostrip", ink: "#2b1d16",
    scene: { film: true, warm: true } },
  { id: "sitcom", name: "90s sitcom cartoon", blurb: "Bold outlines, big googly eyes, overbite mouths.",
    p: { headR: 0.135, sy: -0.66, hy: -0.4, sw: 0.09, hw: 0.08 }, outline: 0.009, limb: "tube", limbW: 0.032, eyes: "googly", mouth: "overbite" },
  { id: "vase", name: "Greek vase (black-figure)", blurb: "Black-glaze figures with scratched-in detail on terracotta.",
    p: { headR: 0.13, sy: -0.66, hy: -0.4, sw: 0.09, hw: 0.075 }, outline: 0.0045, limb: "tube", limbW: 0.03, eyes: "dot", tone: "mono", mono: "#17100b", incise: true, ink: "#d27a42", profile: true },
  { id: "shadow", name: "Shadow puppet (1920s silhouette)", blurb: "Jointed black silhouettes; eyes and mouth cut out.",
    p: { headR: 0.13, sy: -0.66, hy: -0.4, sw: 0.09, hw: 0.075 }, outline: 0, limb: "tube", limbW: 0.03, eyes: "dot", tone: "mono", mono: "#0b0806", ink: "#ffcf8a", rivets: "#2a1a10", profile: true },
  { id: "karag", name: "Karagiozis (Greek shadow theatre)", blurb: "Painted, see-through figures pinned at the joints, pressed against a lit screen.",
    p: { headR: 0.15, sy: -0.64, hy: -0.39, sw: 0.09, hw: 0.08 }, outline: 0.008, limb: "tube", limbW: 0.036, eyes: "dot", translucent: true, ink: "#3a1f12", layer: "lamp", rivets: "#3a1f12", tone: "vivid", profile: true },
  { id: "mid", name: "1950s mid-century", blurb: "Flat geometric shapes, colour printed slightly off the line.",
    p: { headR: 0.13, sy: -0.68, hy: -0.42, sw: 0.08, hw: 0.065 }, outline: 0.0045, limb: "line", limbW: 0.006, eyes: "small", offset: [0.012, 0.008], ink: "#2b2622" },
  { id: "chalk", name: "Chalkboard", blurb: "Powdery chalk lines on a green board.",
    p: { headR: 0.14, sy: -0.66, hy: -0.4, sw: 0.085, hw: 0.07 }, outline: 0.006, limb: "line", limbW: 0.007, fill: "none", ink: "#f4f1e8", layer: "chalk" },
  { id: "paper", name: "Paper cut-out", blurb: "Coloured paper with fibre texture and a soft shadow under every piece.",
    p: { headR: 0.145, sy: -0.64, hy: -0.39, sw: 0.09, hw: 0.075 }, outline: 0, limb: "tube", limbW: 0.04, layer: "paper", boil: 0.7, boilRate: 3 },
  { id: "riso", name: "Risograph print", blurb: "Bright spot inks, grain, layers printed slightly out of line.",
    p: { headR: 0.14, sy: -0.66, hy: -0.4, sw: 0.09, hw: 0.075 }, outline: 0.006, limb: "tube", limbW: 0.032, tone: "spot", spot: ["#ff48b0", "#0078bf", "#ffe800", "#f3efe4", "#1a1a1a"], ink: "#0078bf", layer: "riso",
    scene: { grain: true } },
  { id: "neon", name: "Neon glow", blurb: "Glowing outlines on a dark night city.",
    p: { headR: 0.14, sy: -0.66, hy: -0.4, sw: 0.085, hw: 0.07 }, outline: 0.006, limb: "line", limbW: 0.007, fill: "none", inkFrom: "top", layer: "glow" },
  { id: "noir", name: "Noir comic", blurb: "Black and white with one spot colour, heavy shadows.",
    p: { headR: 0.13, sy: -0.68, hy: -0.41, sw: 0.09, hw: 0.075 }, outline: 0.009, limb: "tube", limbW: 0.034, shade: 0.55, ink: "#0d0d0d", tone: "noir",
    scene: { vignette: true, grain: true } },
  { id: "glass", name: "Stained glass", blurb: "Thick lead lines, jewel colours, light glowing through.",
    p: { headR: 0.15, sy: -0.64, hy: -0.39, sw: 0.1, hw: 0.085 }, outline: 0.016, limb: "tube", limbW: 0.04, fill: "glass", ink: "#1b1410", tone: "vivid" },
  { id: "notebook", name: "Ballpoint notebook doodle", blurb: "Blue ballpoint on lined paper, hatched shading, faces left clean.",
    p: { headR: 0.145, sy: -0.66, hy: -0.4, sw: 0.085, hw: 0.07 }, outline: 0.005, limb: "line", limbW: 0.006, fill: "hatch", ink: "#2340b8", boil: 0.9, boilRate: 4 },
  { id: "blueprint", name: "Blueprint", blurb: "White technical lines on blue.",
    p: { headR: 0.14, sy: -0.66, hy: -0.4, sw: 0.085, hw: 0.07 }, outline: 0.005, limb: "line", limbW: 0.006, fill: "none", ink: "#e8f4ff" },
];

export const LOOK_IDS = LOOKS.map((l) => l.id);
const BY_ID = Object.fromEntries(LOOKS.map((l) => [l.id, l]));

/** The look by id, or the stick look when the id is unknown. */
export const lookById = (id) => BY_ID[id] ?? BY_ID.stick;
