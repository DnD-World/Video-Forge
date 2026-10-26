// GENERATED from Image Forge src/lib/puppet (recipe, pixels, quality, maker.reviewPicture) @ f27976b - see tools/puppets/README.md. Do not edit here.

// src/lib/puppet/recipe.ts
var VIEW_EDITS = {
  side: "Edit this picture: turn the character to a three-quarter view \u2014 the head and body turned about 35 degrees towards the viewer's left, eyes looking towards the viewer's left too, as if talking to someone standing there. The same character at the same size and position, the same face, clothes, colours and style, mouth closed, the same flat background.",
  sit: "Edit this picture: the same character now SITTING on a simple plain wooden stool, seen from the front, full body from head to feet, hands resting on the knees, facing the viewer, mouth closed. The same face, clothes, colours, style and the same flat background; the head about the same size as before."
};
var VIEW_PARTS = {
  side: ["lid_closed", "lid_half", "mouth_AH", "mouth_EE", "mouth_OH", "mouth_OO", "mouth_FV", "mouth_L", "mouth_halfAH", "mouth_halfOH", "mouth_halfEE", "mouth_SMILE", "brow_happy", "brow_raised", "arms_explain", "arms_point"],
  sit: ["lid_closed", "lid_half", "mouth_AH", "mouth_EE", "mouth_OH", "mouth_OO", "mouth_FV", "mouth_L", "mouth_halfAH", "mouth_halfOH", "mouth_halfEE", "mouth_SMILE", "brow_happy", "brow_raised", "arms_explain"]
};
var HARD_ANIMALS = [
  {
    words: /\b(poodle|bichon|komondor|puli|shih ?tzu|lhasa apso|maltese|yorkie|yorkshire terrier|old english sheepdog|bearded collie|afghan hound|havanese|cockapoo|labradoodle|goldendoodle|doodle dog|briard|bergamasco)\b/i,
    why: "long, curly or corded fur over the face hides the mouth and changes in every picture"
  },
  {
    words: /\b(schnauzer|scottish terrier|scottie|westie|west highland|wire[- ]?haired|airedale|irish wolfhound|wolfhound|brussels griffon|affenpinscher)\b/i,
    why: "a beard or moustache of fur over the mouth \u2014 mouth shapes are hard to see and to keep the same"
  },
  {
    words: /\b(pug|bulldog|french bulldog|frenchie|boxer|shar[- ]?pei|bullmastiff|mastiff|boston terrier|pekingese|bloodhound|basset hound|dogue de bordeaux|neapolitan mastiff)\b/i,
    why: "a flat face, heavy jowls or deep wrinkles \u2014 the mouth hides in folds that move between pictures"
  },
  {
    words: /\b(pomeranian|chow ?chow|samoyed|keeshond|persian cat|maine coon|ragdoll|norwegian forest cat|alpaca|llama|sheep|lamb|angora)\b/i,
    why: "very fluffy fur \u2014 fine fur detail changes in every picture, so cut-outs show"
  },
  {
    words: /\b(bird|owl|owlet|parrot|penguin|duck|duckling|chick|chicken|eagle|hawk|pelican|toucan|flamingo|crow|raven|swan|goose)\b/i,
    why: "a beak has no lips or teeth, so most mouth shapes look the same \u2014 the talking shows less"
  },
  {
    words: /\b(horse|pony|donkey|zebra|giraffe|camel|crocodile|alligator|anteater|dolphin|shark)\b/i,
    why: "a long snout or jaw \u2014 the mouth is far from the eyes and side-on, and shapes are hard to read"
  },
  {
    words: /\b(fish|snake|lizard|turtle|tortoise|frog|toad|octopus|squid|jellyfish|insect|bug|bee|spider|ant|butterfly|snail|worm)\b/i,
    why: "no real lips or face to animate \u2014 mouth shapes and blinks are mostly guesswork"
  },
  {
    words: /\b(elephant|walrus|hedgehog|porcupine|bat)\b/i,
    why: "a trunk, tusks, spines or wings around the face get in the way of the mouth and the arms"
  }
];
var hardAnimalWhy = (description) => HARD_ANIMALS.find((h) => h.words.test(description))?.why ?? "";
var asksForFaceMarks = (description) => /\b(beard|bearded|moustache|mustache|stubble|goatee|sideburns|freckle|freckles|freckled|mole|beauty mark|scar|scars|scarred|tattoo|tattoos|wrinkle|wrinkles|wrinkled|birthmark)\b/i.test(description);
var faceMarksNote = "Facial hair and skin marks are experimental: they can shift a little between pictures, so check them in the review.";
var REAL_SKIN = "Real-looking skin and hair change a little in every picture, so more mouths need a redo.";
var FUR_SMOOTH = "The fur is smooth and mid-detailed: soft clumps with simple shapes and gentle shading, like a groomed plush toy, rather than thousands of fine strands.";
var furNote = "Fur is experimental in this style: fine strands change between pictures. It is drawn smoother, mid-detail.";
var PUPPET_STYLES = [
  {
    id: "pixar",
    label: "3D animated",
    blurb: "Soft, rounded, film-like",
    smoothFur: true,
    prompt: "a STYLISED 3D ANIMATED CARTOON CHARACTER in the style of a Pixar or Illumination feature film \u2014 appealing exaggerated proportions, big expressive cartoon eyes, soft rounded forms, beautifully rendered but unmistakably a cartoon and NOT a photograph"
  },
  {
    id: "flat",
    label: "Flat cartoon",
    blurb: "Clean lines, flat colours",
    prompt: "a FLAT 2D CARTOON CHARACTER with clean bold outlines and flat colours, simple shapes, like a modern explainer-video illustration, no gradients and no texture"
  },
  {
    id: "clay",
    label: "Claymation",
    blurb: "Plasticine, stop-motion",
    smoothFur: true,
    prompt: "a CLAYMATION CHARACTER made of smooth plasticine, like an Aardman stop-motion film \u2014 visible soft thumbprint texture, rounded chunky shapes, studio lighting"
  },
  {
    id: "paper",
    label: "Paper cut-out",
    blurb: "Layered paper, crafty",
    prompt: "a PAPER CUT-OUT CHARACTER built from layered coloured card, crisp cut edges, subtle paper texture and soft drop shadows between layers, like a craft stop-motion"
  },
  {
    id: "anime",
    label: "Anime",
    blurb: "Cel-shaded, expressive",
    prompt: "an ANIME-STYLE CHARACTER, clean cel shading, crisp line art, large expressive eyes, like a modern TV anime"
  },
  // CLOSEST TO REAL (Ak, 14 Oct 2026). Lifelike 3D is the realistic end that
  // still cuts cleanly: a rendered character with real-looking skin and hair.
  // Photoreal works for the picture, but a real face's fine texture shifts
  // between edits, so more mouths come back "unsure" — hence "experimental".
  {
    id: "lifelike",
    label: "Lifelike 3D",
    blurb: "Cinematic, high detail, nearly real",
    experimental: REAL_SKIN,
    smoothFur: true,
    prompt: "a LIFELIKE, HIGH-DETAIL 3D CHARACTER like a modern video-game cinematic or a high-end animated film \u2014 realistic skin, hair and fabric texture, natural proportions, soft cinematic studio lighting; believable and detailed, but still a rendered character, not a photograph"
  },
  {
    // TOUCHED-UP PHOTOREAL (Ak, 14 Oct 2026: "the art of the possible — the
    // best that can reasonably be done with consistency"). A real photograph's
    // fine detail moves between edits, so the things that move most are left
    // out on purpose — see PHOTO_EXCLUDED, said in the prompt and in the
    // things-to-avoid list.
    id: "photo",
    label: "Retouched photo",
    blurb: "High-fashion retouch \xB7 ironed-out detail",
    experimental: REAL_SKIN,
    smoothFur: true,
    // IRONED OUT (Ak, 16 Oct 2026): "a lot of high fashion photography has
    // ironed out details" — the smoother the skin and hair, the steadier the edits.
    prompt: "a HIGH-FASHION EDITORIAL PHOTOGRAPH retouched to perfection, like a beauty-magazine cover \u2014 flawless airbrushed skin with an even, porcelain-smooth finish, sleek simple hair styled away from the face, plain solid-colour matte clothing, soft diffused beauty lighting from the front, sharp focus. Clean-shaven, no glasses, no jewellery, no patterns, no logos"
  },
  {
    id: "stick",
    label: "Stick figure",
    blurb: "Hand-drawn, simplest of all",
    prompt: "a SIMPLE HAND-DRAWN STICK FIGURE \u2014 a round head with a simple face (dot eyes, a line mouth), single black lines for the body, arms and legs, drawn with a marker on white paper, charming and minimal"
  },
  {
    id: "stick2d",
    label: "2D vector stick figure",
    blurb: "Clean vector animation, bold lines",
    prompt: "a 2D VECTOR ANIMATION STICK FIGURE, like a modern motion-graphics explainer or an Alan Becker-style animation \u2014 perfectly clean, smooth, bold uniform strokes, a round head with a simple expressive face, flat solid colours, no texture, no shading"
  },
  {
    id: "doodle",
    label: "Simple doodle",
    blurb: "Stick figures, blobs, monsters",
    prompt: "a VERY SIMPLE HAND-DRAWN DOODLE CHARACTER \u2014 thick black marker outlines, one or two flat colours, minimal detail, like a whiteboard-animation sketch"
  }
];
var styleById = (id) => PUPPET_STYLES.find((s) => s.id === id) ?? PUPPET_STYLES[0];
var KEY_COLOUR = "#FF00FF";
var KEYS = [
  { key: { name: "magenta", hex: "#FF00FF" }, clashes: /\b(pink|magenta|purple|violet|lilac|lavender|fuchsia|rose|mauve|plum|orchid|bridezilla|bride)\b/i },
  { key: { name: "green", hex: "#00FF00" }, clashes: /\b(green|lime|olive|emerald|mint|frog|leaf|leaves|grass|jade|cactus|alien|zombie|dinosaur|ogre|goblin)\b/i },
  { key: { name: "blue", hex: "#0000FF" }, clashes: /(?!)/ }
];
function keyColourFor(description) {
  return (KEYS.find((k) => !k.clashes.test(description)) ?? KEYS[KEYS.length - 1]).key;
}
var ANIMAL = /\b(owl|bird|parrot|penguin|duck|chick|fox|dog|puppy|cat|kitten|bear|rabbit|bunny|mouse|rat|wolf|lion|tiger|monkey|frog|fish|dragon|dinosaur|monster|robot|blob|alien|creature|animal|beast|cow|pig|sheep|goat|horse|deer|squirrel|hedgehog|owlet|bee|bug|insect)\b/i;
function lipsFor(description, style) {
  if (style === "doodle" || style === "anime" || style === "stick" || style === "stick2d") return false;
  return !ANIMAL.test(description);
}
var eyesOf = (look) => look?.facts?.eyes ?? 2;
function eyeWords(text, eyes) {
  if (eyes === 2) return text;
  if (eyes === 1)
    return text.replace(/both upper eyelids/g, "the upper eyelid").replace(/Lower both/g, "Lower the").replace(/Raise both/g, "Raise the").replace(/The eye OPENINGS stay/g, "The eye OPENING stays").replace(/the eyes are fully shut/g, "the eye is fully shut").replace(/each lid covers/g, "the lid covers").replace(/the visible part of each eye/g, "the visible part of the eye").replace(/the eyes look slightly wider/g, "the eye looks slightly wider").replace(/closing lids over eyes that do not move, not drawing smaller or different eyes/g, "closing a lid over an eye that does not move, not drawing a smaller or different eye").replace(/Change only the eyebrows so both are/g, "Change only the single eyebrow so it is").replace(/so ONE is raised high and the other is lowered and drawn in/g, "so it is raised high on one end and lowered on the other").replace(/the inner ends are lifted and pinched together and the outer ends droop/g, "its middle is lifted and both ends droop").replace(/both eyes look at a distant point far beyond the camera so the two lines of sight are PARALLEL — not cross-eyed, not staring/g, "the eye looks at a distant point far beyond the camera, not staring").replace(/both eyes look in the same direction/g, "the eye looks straight ahead").replace(/both lines of sight parallel/g, "looking straight ahead").replace(/The eyes themselves do not change: the irises and pupils stay/g, "The eye itself does not change: the iris and pupil stay").replace(/the eyes and where they look/g, "the eye and where it looks").replace(/Eyebrows level and calm/g, "The eyebrow level and calm").replace(/Eyes relaxed and normally open, upper lids resting over the top of the irises/g, "The eye relaxed and normally open, the upper lid resting over the top of the iris");
  return text.replace(/both upper eyelids/g, "every upper eyelid").replace(/Lower both/g, "Lower every").replace(/Raise both/g, "Raise every").replace(/both eyes/g, `all ${eyes} eyes`).replace(/the two lines of sight/g, "all the lines of sight").replace(/both lines of sight parallel/g, "all looking the same way");
}
function factsSentence(look = DEFAULT_LOOK) {
  const f = look.facts;
  if (!f) return "";
  const eyes = f.eyes ?? 2;
  const said = [
    f.species ? `it is ${f.species}` : "",
    `it has exactly ${eyes === 1 ? "ONE eye" : eyes === 2 ? "TWO eyes" : `${eyes} eyes`}`,
    look.lips ? "its mouth has drawn lips" : "its mouth has no separate lips",
    f.ears ? `ears: ${f.ears}` : "",
    f.colours?.length ? `colours: ${f.colours.join(", ")}` : "",
    f.clothing ? `clothing: ${f.clothing}` : "",
    ...(f.oneSided ?? []).map((d) => `on one side only: ${d}`)
  ].filter(Boolean);
  return `Facts about this character, true in every picture: ${said.join("; ")}.`;
}
var TEETH = [
  [/\b(dog|puppy|wolf|fox|coyote|jackal)\b/i, "the teeth are a dog's: two long pointed canines and, between them, four small pointed teeth, shorter than the canines, all white"],
  [/\b(cat|kitten|lion|tiger|leopard|cheetah|panther)\b/i, "the teeth are a cat's: two small sharp fangs and a row of tiny teeth between them, all white"],
  [/\b(owl|bird|parrot|penguin|duck|chick|owlet|chicken|eagle)\b/i, "it has a beak and no teeth"],
  [/\b(rabbit|bunny|mouse|rat|squirrel|hamster|beaver)\b/i, "the teeth are two long flat front teeth, side by side"],
  [/\b(horse|cow|sheep|goat|deer|pig)\b/i, "the teeth are broad, flat and blunt"],
  [/\b(frog|fish|blob|robot|alien|monster)\b/i, "teeth only if the original face already has them, drawn the same way"]
];
var HUMAN_TEETH = "the teeth are natural human teeth: even, small and white, in proportion to the face";
var teethFor = (description) => (TEETH.find(([re]) => re.test(description)) ?? [null, HUMAN_TEETH])[1];
var TEETH_SHOWN = {
  mouth_AH: "only a thin line of the upper teeth",
  mouth_halfAH: "at most a thin line of the upper teeth",
  mouth_EE: "both rows, close together",
  mouth_halfEE: "a thin line of both rows",
  mouth_FV: "only the edges of the upper front teeth",
  mouth_L: "only the upper front teeth",
  mouth_CHSH: "both rows, close together"
};
var isAnimal = (description) => ANIMAL.test(description);
var DEFAULT_LOOK = { key: { name: "magenta", hex: KEY_COLOUR }, lips: true };
var lipsClause = (look) => look.lips ? "The mouth has clearly drawn LIPS, the same colour and thickness in every picture." : "The mouth is a plain opening cut straight into the face: its edge is the same colour as the skin or fur around it, with no outline, no rim and no colour change around it, the same in every picture.";
var withoutLipWords = (text) => text.replace(/the lower lip tucked slightly under them/g, "the lower edge of the mouth tucked slightly under them").replace(/the middle of the lower lip/g, "the middle of the lower edge of the mouth").replace(/the lips are pushed forward and squared off/g, "the mouth is pushed forward and squared off").replace(/lips pushed forward and squared/g, "mouth pushed forward and squared").replace(/the lower lip/g, "the lower edge of the mouth").replace(/, the lips gently rounded forward around it/g, ", its edge gently rounded around it").replace(/, the lips gently parted/g, ", just parted").replace(/the lips keep their original colour/g, "the edge of the mouth keeps the same colour as the skin around it");
var editNegative = (look = DEFAULT_LOOK) => look.facts?.never?.length ? `${EDIT_NEGATIVE}, ${look.facts.never.join(", ")}` : EDIT_NEGATIVE;
function basePrompt(o) {
  const style = styleById(o.style);
  const look = o.look ?? DEFAULT_LOOK;
  const frame = o.framing === "full" ? "FULL BODY from the top of the head to the feet, standing, facing the viewer, both arms relaxed at the sides, both feet on the ground, with empty space all around \u2014 above the head, beside the hands and below the feet. The head is in the top quarter of the picture." : o.framing === "waist" ? "Shown from the waist up, facing the viewer, BOTH ARMS AND BOTH HANDS fully visible and relaxed at the sides, with generous empty space on both sides and above the head so a raised hand would still fit inside the picture. The head sits in the upper third." : "Head, neck and shoulders only, filling the frame, with generous headroom so the top of the head (and any ears or hair) is well clear of the top edge.";
  const prompt = [
    `A single character portrait: ${o.description.trim()}.`,
    `Drawn as ${style.prompt}.`,
    ...style.smoothFur && isAnimal(o.description) ? [FUR_SMOOTH] : [],
    // Clean faces unless asked (Ak, 16 Oct 2026): facial hair and marks drift between pictures.
    ...!isAnimal(o.description) && !asksForFaceMarks(o.description) ? ["Clean-shaven, with smooth, clear, even skin."] : [],
    frame,
    "Mouth CLOSED and relaxed, calm friendly neutral expression.",
    lipsClause(look),
    "Eyes relaxed and normally open, upper lids resting over the top of the irises, little white above or below; both eyes look at a distant point far beyond the camera so the two lines of sight are PARALLEL \u2014 not cross-eyed, not staring.",
    "Eyebrows level and calm, the same colour as the character's own hair or fur.",
    "Short neck sitting low on the shoulders.",
    o.inspirations ? `The attached picture${o.inspirations > 1 ? "s are" : " is"} INSPIRATION ONLY: borrow the look, colours and costume, but draw ONE new character in the style described, on its own.` : "",
    `Centred on a completely flat, uniform, pure ${look.key.name} background (${look.key.hex}), edge to edge, with no shadow, no floor and no props. No ${look.key.name} anywhere on the character itself.`
  ].filter(Boolean).join(" ");
  return eyeWords(prompt, eyesOf(look));
}
var PHOTO_EXCLUDED = "beard, stubble, moustache, freckles, moles, scars, heavy make-up, lipstick, glasses, sunglasses, piercings, hair over the face, curly hair near the face, striped clothing, checked clothing, floral pattern, knitwear, wool, fur, fluffy collar, lace, sequins, glitter, shiny fabric, see-through fabric, logo, printed text, earrings, necklace, jewellery, hat";
var baseNegative = (style) => style === "photo" ? `${BASE_NEGATIVE.replace(", photorealistic photo", ", cartoon, illustration, 3d render, plastic skin")}, ${PHOTO_EXCLUDED}` : BASE_NEGATIVE;
var BASE_NEGATIVE = "cross-eyed, converging eyes, wall-eyed, uneven pupils, wide staring eyes, bulging eyes, startled, open mouth, cropped head, cut-off ears, tight crop, text, watermark, extra characters, extra limbs, photorealistic photo, letters, words";
var EDIT_NEGATIVE = "text, letters, words, writing, captions, blurry";
var EYES_STAY = "The eyes themselves do not change: the irises and pupils stay exactly the same size, shape, position and gaze direction, both lines of sight parallel.";
var PUPPET_PARTS = [
  // SHAPES, NEVER SOUNDS. "Saying fff" put letters on the teeth and "saying
  // L" stuck the tongue out (Ak, 13 Oct 2026): only what the lips, teeth and
  // tongue do is described. editPrompt adds the puppet's lips rule.
  { id: "mouth_AH", kind: "mouth", label: "AH", avoid: "Open, but moderately \u2014 not a wide yawn.", change: "Change only the mouth so it is open in a relaxed oval, the opening about half as tall as the mouth is wide. The inside of the mouth is a plain, empty, softly shaded dark shape \u2014 deep shadow, not pure black, with a thin line of the upper teeth at the top edge.", expect: "mouth open wide in a tall oval, the inside plain and dark" },
  { id: "mouth_EE", kind: "mouth", label: "EE", avoid: "The corners move out only slightly \u2014 the mouth stays about the same width as at rest.", change: "Change only the mouth so it is a little wider than at rest and slightly open, both rows of teeth showing close together.", expect: "mouth stretched wide, teeth showing close together" },
  { id: "mouth_OH", kind: "mouth", label: "OH", avoid: "The opening is round, its inside in soft deep shadow rather than pure black; the corners stay level.", change: "Change only the mouth so it forms a round open circle of medium size, the inside of the mouth dark.", expect: "mouth rounded into a medium open circle" },
  { id: "mouth_OO", kind: "mouth", label: "OO", avoid: "The opening is clearly open and round, its inside in soft deep shadow rather than pure black, and the lips keep their original colour.", change: "Change only the mouth so it forms a small round opening, as tall as it is wide, about a third as wide as the mouth at rest, the lips gently rounded forward around it.", expect: "small tight round mouth" },
  { id: "mouth_FV", kind: "mouth", label: "F\xB7V", avoid: "Only the edges of the upper front teeth show, small and natural in size.", change: "Change only the mouth so the edges of the upper front teeth rest lightly on the middle of the lower lip, the lower lip tucked slightly under them, and the mouth otherwise closed.", expect: "upper teeth resting on the lower lip, plain white teeth with nothing drawn on them" },
  { id: "mouth_L", kind: "mouth", avoid: "Everything pink stays inside the mouth, behind the teeth.", label: "L", change: "Change only the mouth so it is only slightly open, the upper front teeth showing. High inside the mouth, the tip of the tongue presses up against the back of the upper front teeth, so only a small pink edge shows just under them. Below that the mouth is in soft deep shadow.", expect: "mouth slightly open, a small pink edge just under the upper teeth, nothing past the teeth" },
  { id: "mouth_CHSH", kind: "mouth", label: "SH", avoid: "The corners stay level.", change: "Change only the mouth so the lips are pushed forward and squared off, slightly open, with the teeth close together and visible.", expect: "lips pushed forward and squared, teeth close together" },
  // HALF-OPEN (13 Oct 2026): the steps between shapes and the quiet syllables,
  // so the mouth flows rather than snapping (Video Forge timeline.ts).
  { id: "mouth_halfAH", kind: "mouth", label: "\xBD AH", avoid: "At most a thin line of the upper teeth shows \u2014 fewer teeth than a wide-open mouth.", change: "Change only the mouth so it is just a little open in a small relaxed oval, the lips gently parted.", expect: "mouth a little open, a small oval" },
  { id: "mouth_halfOH", kind: "mouth", label: "\xBD OH", avoid: "The corners stay level.", change: "Change only the mouth so it forms a small round opening, clearly open, about half the size of a wide round mouth.", expect: "small round opening" },
  { id: "mouth_halfEE", kind: "mouth", label: "\xBD EE", avoid: "Only a little wider than at rest.", change: "Change only the mouth so it is a little wider than at rest and just parted, a thin line of teeth showing.", expect: "mouth slightly widened and just parted" },
  { id: "mouth_SMILE", kind: "mouth", label: "smile", avoid: "The mouth stays closed.", change: "Change only the mouth into a warm, gentle CLOSED-mouth smile, corners turned up, no teeth showing. Nothing above the mouth changes.", expect: "closed-mouth smile" },
  {
    id: "lid_closed",
    kind: "lid",
    label: "blink",
    change: "Lower both upper eyelids all the way down so the eyes are fully shut, as in a mid-blink. The eye OPENINGS stay exactly the same size, shape and position as in the original \u2014 you are closing lids over eyes that do not move, not drawing smaller or different eyes. The eyebrows do not move at all.",
    expect: "both eyes fully closed, same eye shape and position"
  },
  {
    id: "lid_half",
    kind: "lid",
    label: "half",
    change: "Lower both upper eyelids to the halfway point, so each lid covers the top half of the iris. The eye OPENINGS stay exactly the same size, shape and position, and the visible part of each eye below the lid is unchanged. The eyebrows do not move at all.",
    expect: "both eyelids half closed"
  },
  {
    id: "lid_wide",
    kind: "lid",
    label: "wide",
    change: `Raise both upper eyelids a little so the eyes look slightly wider open in surprise. The eye OPENINGS stay in exactly the same position. ${EYES_STAY} The eyebrows do not move.`,
    expect: "eyes a little wider open, same gaze"
  },
  { id: "brow_happy", kind: "brow", label: "happy", change: `Change only the eyebrows so both are raised high and strongly arched in a happy shape. ${EYES_STAY}`, expect: "eyebrows raised and arched (happy)" },
  { id: "brow_serious", kind: "brow", label: "firm", change: `Change only the eyebrows so both are low and drawn firmly inward in a serious shape. ${EYES_STAY}`, expect: "eyebrows low and drawn in (serious)" },
  { id: "brow_raised", kind: "brow", label: "surprised", change: `Change only the eyebrows so both are raised very high and rounded, in open surprise. ${EYES_STAY}`, expect: "eyebrows raised very high (surprise)" },
  { id: "brow_worried", kind: "brow", label: "worried", change: `Change only the eyebrows so the inner ends are lifted and pinched together and the outer ends droop, in a worried shape. ${EYES_STAY}`, expect: "worried eyebrows, inner ends lifted" },
  { id: "brow_confused", kind: "brow", label: "puzzled", change: `Change only the eyebrows so ONE is raised high and the other is lowered and drawn in, a puzzled look. ${EYES_STAY}`, expect: "one eyebrow up, one down (puzzled)" },
  // Arms: only on waist-up puppets. None of these touch the face, on purpose —
  // a hand over the mouth would hide the talking.
  { id: "arms_wave", kind: "arms", label: "wave", waistOnly: true, change: "Change only the arms: raise the character's right hand to shoulder height beside the head in a friendly open-palm wave. The hand stays clear of the face. Each arm is drawn exactly once: an arm that moves is no longer resting at the side.", expect: "one hand raised in a wave, beside (not over) the face" },
  { id: "arms_point", kind: "arms", label: "point", waistOnly: true, change: "Change only the arms: the character's right arm points out to the side of the picture with the index finger, as if showing something next to them. Each arm is drawn exactly once: an arm that moves is no longer resting at the side.", expect: "one arm pointing out to the side" },
  { id: "arms_shrug", kind: "arms", label: "shrug", waistOnly: true, change: "Change only the arms: both forearms lifted with the palms turned up and open in a shrug, hands at waist height. Each arm is drawn exactly once: an arm that moves is no longer resting at the side.", expect: "palms up in a shrug" },
  { id: "arms_explain", kind: "arms", label: "explain", waistOnly: true, change: "Change only the arms: both hands raised in front of the chest, palms slightly open, as if explaining something. The hands stay below the chin. Each arm is drawn exactly once: an arm that moves is no longer resting at the side.", expect: "both hands in front of the chest, explaining" }
];
var partsFor = (framing) => PUPPET_PARTS.filter((p) => framing !== "head" || !p.waistOnly);
var keepFor = (look = DEFAULT_LOOK) => `Keep absolutely everything else in the picture identical: the same character at the same size, position and angle, the same face, eyes, hair or fur, the same skin exactly as it is with nothing added or taken away, the same clothing, colours, lighting and the same flat ${look.key.name} background. Change ONLY what is described. Do not redraw the picture.`;
var KEEP = keepFor();
var guardFor = (part, look) => part.kind === "mouth" ? `${part.id === "mouth_SMILE" || part.id.endsWith("EE") ? "The corners of the mouth stay where the shape puts them. " : "The corners of the mouth stay level. "}${look.lips ? "The lips keep exactly their original colour, shape and size." : "The edge of the mouth keeps the same colour as the skin around it."} ${TEETH_SHOWN[part.id] ? ` Teeth showing: ${TEETH_SHOWN[part.id]}; ${look.teeth ?? HUMAN_TEETH}.` : /OH|OO/.test(part.id) ? " The inside of the opening is plain, in soft deep shadow rather than pure black." : ""}${look.animal ? " Any tongue lies low and flat inside the mouth." : ""} Everything around the mouth stays exactly as in the original, with nothing added.` : part.kind === "arms" ? "Both hands are fully visible. The face stays exactly as it is." : "The mouth stays exactly as it is.";
var pawWords = (text) => text.replace(/open-palm /g, "").replace(/the index finger/g, "a raised paw").replace(/palms slightly open/g, "paws slightly open").replace(/the palms turned up and open/g, "the paws turned up").replace(/palms/g, "paws").replace(/hands/g, "paws").replace(/hand/g, "paw").replace(/Both paws are fully visible\./g, "Both front paws are fully visible.");
var REGION = {
  mouth: "the mouth area",
  lid: "the eyelids",
  brow: "the eyebrows",
  arms: "the arms and hands"
};
var KEEP_EXACTLY = {
  mouth: ["the eyes and where they look", "the eyelids", "the eyebrows", "the nose", "the outline of the head and face", "the hair or fur", "the ears", "every colour", "the background"],
  lid: ["the eye openings' size, shape and position", "the eyebrows", "the mouth", "the nose", "the outline of the head and face", "the hair or fur", "every colour", "the background"],
  brow: ["the eyes and where they look", "the eyelids", "the mouth", "the nose", "the outline of the head and face", "the hair or fur", "every colour", "the background"],
  arms: ["the face and the head", "the body's size and position", "the clothing", "the legs and feet", "every colour", "the background"]
};
var editPrompt = (part, look = DEFAULT_LOOK) => {
  const raw = editPromptRaw(part, look);
  return eyeWords(part.kind === "arms" && look.animal ? pawWords(raw) : raw, eyesOf(look));
};
var editPromptRaw = (part, look) => `Edit only ${REGION[part.kind]} of this picture. ${part.kind === "mouth" && !look.lips ? withoutLipWords(part.change) : part.change}${part.avoid ? ` ${part.kind === "mouth" && !look.lips ? withoutLipWords(part.avoid) : part.avoid}` : ""} ${guardFor(part, look)}${part.kind === "mouth" ? ` ${lipsClause(look)} ${look.lips ? "Keep the lips exactly as they are in the original picture \u2014 the same colour and thickness." : "The edge of the mouth stays exactly like the original: no rim and no colour around it."}` : ""}${look.facts ? ` ${factsSentence(look)}` : ""}

Keep exactly as in the original: ${KEEP_EXACTLY[part.kind].join(", ")}. ${keepFor(look)}`;
function bandFor(kind, framing) {
  if (framing === "head") return { mouth: [0.42, 1], lid: [0.2, 0.7], brow: [0.12, 0.62], arms: [0, 1] }[kind];
  if (framing === "full") return { mouth: [0.06, 0.34], lid: [0.02, 0.28], brow: [0, 0.26], arms: [0, 1] }[kind];
  return { mouth: [0.12, 0.62], lid: [0.04, 0.48], brow: [0.02, 0.45], arms: [0, 1] }[kind];
}
var maxAreaPct = (kind) => kind === "arms" ? 60 : 30;

// src/lib/puppet/pixels.ts
var blank = (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) });
function resize(src, width, height) {
  if (src.width === width && src.height === height) return src;
  const out = blank(width, height);
  const sx = src.width / width;
  const sy = src.height / height;
  for (let y = 0; y < height; y++) {
    const fy = Math.min(src.height - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(src.height - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(src.width - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(src.width - 1, x0 + 1);
      const tx = fx - x0;
      const o = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) {
        const a = src.data[(y0 * src.width + x0) * 4 + c];
        const b = src.data[(y0 * src.width + x1) * 4 + c];
        const d = src.data[(y1 * src.width + x0) * 4 + c];
        const e = src.data[(y1 * src.width + x1) * 4 + c];
        out.data[o + c] = (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
      }
    }
  }
  return out;
}
function borderColour(img) {
  const rs = [];
  const gs = [];
  const bs = [];
  const take = (x, y) => {
    const i = (y * img.width + x) * 4;
    rs.push(img.data[i]);
    gs.push(img.data[i + 1]);
    bs.push(img.data[i + 2]);
  };
  const step = Math.max(1, Math.floor(Math.min(img.width, img.height) / 64));
  for (let x = 0; x < img.width; x += step) {
    take(x, 0);
    take(x, 1);
    take(x, img.height - 2);
  }
  for (let y = 0; y < img.height; y += step) {
    take(0, y);
    take(img.width - 1, y);
  }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  return [med(rs), med(gs), med(bs)];
}
function keyOut(img, bg = borderColour(img), tolerance) {
  if (tolerance !== void 0) return keyWith(img, bg, tolerance);
  let out = keyWith(img, bg, 30);
  for (const t of [45, 60]) {
    if (borderLeft(out) < 0.2) break;
    out = keyWith(img, bg, t);
  }
  return out;
}
function borderLeft(img) {
  let n = 0;
  let all = 0;
  const at = (x, y) => {
    all++;
    if (img.data[(y * img.width + x) * 4 + 3] > 128) n++;
  };
  for (let x = 0; x < img.width; x += 2) {
    at(x, 0);
    at(x, 1);
  }
  for (let y = 0; y < img.height * 0.6; y += 2) {
    at(0, y);
    at(img.width - 1, y);
  }
  return n / all;
}
function keyWith(img, bg, tolerance) {
  const out = { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
  const d = out.data;
  const W = img.width;
  const H = img.height;
  const dist = (p) => {
    const i = p * 4;
    const dr = d[i] - bg[0];
    const dg = d[i + 1] - bg[1];
    const db = d[i + 2] - bg[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
  const gone = new Uint8Array(W * H);
  const stack = [];
  const seed = (p) => {
    if (!gone[p] && dist(p) <= tolerance) {
      gone[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < W; x++) {
    seed(x);
    seed((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    seed(y * W);
    seed(y * W + W - 1);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % W;
    const y = p / W | 0;
    if (x > 0) seed(p - 1);
    if (x < W - 1) seed(p + 1);
    if (y > 0) seed(p - W);
    if (y < H - 1) seed(p + W);
  }
  const EDGE = Math.max(2, Math.round(W / 300));
  const near2 = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    if (!gone[p]) continue;
    const x = p % W;
    const y = p / W | 0;
    for (let dy = -EDGE; dy <= EDGE; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= H) continue;
      for (let dx = -EDGE; dx <= EDGE; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < W && !gone[yy * W + xx]) near2[yy * W + xx] = 1;
      }
    }
  }
  const outer = tolerance * 2.2;
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (gone[p]) {
      d[i + 3] = 0;
      continue;
    }
    if (!near2[p]) continue;
    const e = dist(p);
    if (e < outer) {
      const a = Math.max(0.05, (e - tolerance * 0.5) / (outer - tolerance * 0.5));
      for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, (d[i + c] - (1 - a) * bg[c]) / a));
      d[i + 3] = Math.round(d[i + 3] * a);
    }
    const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
    const bl = (bg[0] + bg[1] + bg[2]) / 3;
    const cx = [d[i] - lum, d[i + 1] - lum, d[i + 2] - lum];
    const bx = [bg[0] - bl, bg[1] - bl, bg[2] - bl];
    const cn = Math.hypot(cx[0], cx[1], cx[2]);
    const bn = Math.hypot(bx[0], bx[1], bx[2]);
    if (cn > 8 && bn > 8) {
      const cos = (cx[0] * bx[0] + cx[1] * bx[1] + cx[2] * bx[2]) / (cn * bn);
      if (cos > 0.75) {
        const k = Math.min(1, (cos - 0.75) / 0.2) * 0.85;
        for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, Math.round(d[i + c] - cx[c] * k)));
      }
    }
  }
  return out;
}
function featherEdges(img, feather) {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const e = Math.min(x, y, img.width - 1 - x, img.height - 1 - y);
      if (e < feather) img.data[(y * img.width + x) * 4 + 3] = Math.round(img.data[(y * img.width + x) * 4 + 3] * e / feather);
    }
  }
  return img;
}
function opaqueShare(img) {
  let n = 0;
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 128) n++;
  return n / (img.width * img.height);
}
function crop(img, box) {
  const out = blank(box.w, box.h);
  for (let y = 0; y < box.h; y++) {
    const sy = y + box.y;
    if (sy < 0 || sy >= img.height) continue;
    for (let x = 0; x < box.w; x++) {
      const sx = x + box.x;
      if (sx < 0 || sx >= img.width) continue;
      const si = (sy * img.width + sx) * 4;
      const di = (y * box.w + x) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = img.data[si + 3];
    }
  }
  return out;
}
function composite(under, top, x, y) {
  const out = { width: under.width, height: under.height, data: new Uint8ClampedArray(under.data) };
  for (let ty = 0; ty < top.height; ty++) {
    const oy = ty + y;
    if (oy < 0 || oy >= out.height) continue;
    for (let tx = 0; tx < top.width; tx++) {
      const ox = tx + x;
      if (ox < 0 || ox >= out.width) continue;
      const ti = (ty * top.width + tx) * 4;
      const oi = (oy * out.width + ox) * 4;
      const a = top.data[ti + 3] / 255;
      if (a === 0) continue;
      const ua = out.data[oi + 3] / 255;
      const oa = a + ua * (1 - a);
      for (let c = 0; c < 3; c++) out.data[oi + c] = (top.data[ti + c] * a + out.data[oi + c] * ua * (1 - a)) / (oa || 1);
      out.data[oi + 3] = oa * 255;
    }
  }
  return out;
}
function sideBySide(a, b, gap = 8) {
  const out = blank(a.width + gap + b.width, Math.max(a.height, b.height));
  out.data.fill(255);
  const put = (img, ox) => {
    for (let y = 0; y < img.height; y++) out.data.set(img.data.subarray(y * img.width * 4, (y + 1) * img.width * 4), (y * out.width + ox) * 4);
  };
  put(a, 0);
  put(b, a.width + gap);
  return out;
}
function matchColours(base, edit) {
  const n = base.width * base.height;
  const s = [0, 0, 0], se = [0, 0, 0], ss = [0, 0, 0], sse = [0, 0, 0];
  let k = 0;
  for (let p = 0; p < n; p += 3) {
    const i = p * 4;
    const d = Math.max(Math.abs(edit.data[i] - base.data[i]), Math.abs(edit.data[i + 1] - base.data[i + 1]), Math.abs(edit.data[i + 2] - base.data[i + 2]));
    if (d > 48) continue;
    for (let c = 0; c < 3; c++) {
      const b = base.data[i + c], e = edit.data[i + c];
      s[c] += b;
      se[c] += e;
      ss[c] += b * b;
      sse[c] += e * e;
    }
    k++;
  }
  if (k < n / 20) return edit;
  const gain = [], off = [];
  for (let c = 0; c < 3; c++) {
    const mb = s[c] / k, me = se[c] / k;
    const sb = Math.sqrt(Math.max(1, ss[c] / k - mb * mb)), sdE = Math.sqrt(Math.max(1, sse[c] / k - me * me));
    const g = Math.min(1.25, Math.max(0.8, sb / sdE));
    gain.push(g);
    off.push(mb - me * g);
  }
  const out = new Uint8ClampedArray(edit.data);
  for (let i = 0; i < out.length; i += 4) for (let c = 0; c < 3; c++) out[i + c] = edit.data[i + c] * gain[c] + off[c];
  return { width: edit.width, height: edit.height, data: out };
}
function cutPart(base, editIn, o) {
  if (editIn.width !== base.width || editIn.height !== base.height) {
    return { ok: false, reason: "same-size", detail: `edit is ${editIn.width}\xD7${editIn.height}, base is ${base.width}\xD7${base.height}` };
  }
  const edit = matchColours(base, editIn);
  const T = o.threshold ?? 26;
  const CELL = Math.max(8, Math.round(base.width / 64));
  const FEATHER = o.feather ?? Math.max(6, Math.round(base.width * 18 / 1024));
  const { width: W, height: H } = base;
  const gw = Math.ceil(W / CELL);
  const gh = Math.ceil(H / CELL);
  const count = new Float32Array(gw * gh);
  const grid = new Float32Array(gw * gh);
  let changed = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const d = Math.max(
        Math.abs(edit.data[i] - base.data[i]),
        Math.abs(edit.data[i + 1] - base.data[i + 1]),
        Math.abs(edit.data[i + 2] - base.data[i + 2])
      );
      if (d > T) {
        changed++;
        const c = (y / CELL | 0) * gw + (x / CELL | 0);
        count[c]++;
        grid[c] += (d - T) * (d - T);
      }
    }
  }
  const areaPct = changed / (W * H) * 100;
  const [bandTop, bandBot] = bandFor(o.kind, o.framing);
  const gyMin = Math.floor(bandTop * gh);
  const gyMax = Math.min(gh, Math.ceil(bandBot * gh));
  let peak = 0;
  let peakCount = 0;
  for (let gy = gyMin; gy < gyMax; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      peak = Math.max(peak, grid[gy * gw + gx]);
      peakCount = Math.max(peakCount, count[gy * gw + gx]);
    }
  }
  if (peakCount < CELL * CELL * 0.08) return { ok: false, reason: "nothing-changed", detail: "the picture came back (almost) unchanged" };
  const cut = peak * (o.density ?? 0.18);
  const busy = (gx, gy) => gy >= gyMin && gy < gyMax && gx >= 0 && gx < gw && grid[gy * gw + gx] >= cut;
  const patchOf = new Int32Array(gw * gh).fill(-1);
  const weights = [];
  for (let gy = gyMin; gy < gyMax; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      if (!busy(gx, gy) || patchOf[gy * gw + gx] !== -1) continue;
      const id = weights.length;
      let weight = 0;
      const stack = [gy * gw + gx];
      patchOf[gy * gw + gx] = id;
      while (stack.length) {
        const c = stack.pop();
        weight += grid[c];
        const cx = c % gw;
        const cy = c / gw | 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (!busy(nx, ny) || patchOf[ny * gw + nx] !== -1) continue;
            patchOf[ny * gw + nx] = id;
            stack.push(ny * gw + nx);
          }
        }
      }
      weights.push(weight);
    }
  }
  const strongest = Math.max(...weights);
  const keep = new Set(weights.map((w, i) => w >= strongest * 0.25 ? i : -1).filter((i) => i >= 0));
  const inCut = new Uint8Array(gw * gh);
  for (let c = 0; c < gw * gh; c++) if (keep.has(patchOf[c])) inCut[c] = 1;
  for (let step = 0; step < 3; step++) {
    const add = [];
    for (let gy = gyMin; gy < gyMax; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const c = gy * gw + gx;
        if (inCut[c] || count[c] < CELL * CELL * 0.03) continue;
        let touches = false;
        for (let dy = -1; dy <= 1 && !touches; dy++) for (let dx = -1; dx <= 1 && !touches; dx++) {
          const nx = gx + dx, ny = gy + dy;
          touches = nx >= 0 && nx < gw && ny >= gyMin && ny < gyMax && inCut[ny * gw + nx] === 1;
        }
        if (touches) add.push(c);
      }
    }
    for (const c of add) inCut[c] = 1;
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let gy = gyMin; gy < gyMax; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      if (!inCut[gy * gw + gx]) continue;
      const px = gx * CELL;
      const py = gy * CELL;
      x0 = Math.min(x0, px);
      y0 = Math.min(y0, py);
      x1 = Math.max(x1, Math.min(W - 1, px + CELL - 1));
      y1 = Math.max(y1, Math.min(H - 1, py + CELL - 1));
    }
  }
  if (x1 < 0) return { ok: false, reason: "outside", detail: "the change is not where this part belongs" };
  const boxPct = (x1 - x0 + 1) * (y1 - y0 + 1) / (W * H) * 100;
  if (boxPct > maxAreaPct(o.kind)) {
    return { ok: false, reason: "redrawn", detail: `the change covers ${boxPct.toFixed(0)}% of the picture \u2014 it was redrawn, not edited` };
  }
  if (o.kind === "mouth" && o.eyeY !== void 0 && y0 < o.eyeY) {
    return { ok: false, reason: "over-eyes", detail: "the mouth change reaches up over the eyes" };
  }
  const pad = FEATHER * 2;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(W - 1, x1 + pad);
  y1 = Math.min(H - 1, y1 + pad);
  const box = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  const layer = featherEdges(crop(edit, box), FEATHER);
  const keyed = featherEdges(crop(keyOut(edit, borderColour(base)), box), FEATHER);
  return { ok: true, layer, keyed, box, areaPct, boxPct };
}
var near = (d, i, c, tol) => Math.abs(d[i] - c[0]) <= tol && Math.abs(d[i + 1] - c[1]) <= tol && Math.abs(d[i + 2] - c[2]) <= tol;
function bodyCentre(img, bg, skip) {
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < img.height; y += 2) {
    for (let x = 0; x < img.width; x += 2) {
      if (x >= skip.x && x < skip.x + skip.w && y >= skip.y && y < skip.y + skip.h) continue;
      if (near(img.data, (y * img.width + x) * 4, bg, 60)) continue;
      sx += x;
      sy += y;
      n++;
    }
  }
  return n ? { x: sx / n, y: sy / n, n } : { x: 0, y: 0, n: 0 };
}
function pixelChecks(base, editIn, cut, kind) {
  if (editIn.width !== base.width || editIn.height !== base.height) return [];
  const out = [];
  const edit = matchColours(base, editIn);
  const bg = borderColour(base);
  const scale = base.width / 1024;
  if (kind !== "arms") {
    const grow = Math.round(24 * scale);
    const skip = { x: cut.box.x - grow, y: cut.box.y - grow, w: cut.box.w + grow * 2, h: cut.box.h + grow * 2 };
    const a = bodyCentre(base, bg, skip), b = bodyCentre(edit, bg, skip);
    const moved = Math.hypot(a.x - b.x, a.y - b.y) / scale;
    if (a.n && b.n && moved > 3) out.push(`the character moved about ${moved.toFixed(0)} px`);
    const CELL = Math.max(8, Math.round(base.width / 64));
    let busy = 0;
    for (let cy = 0; cy + CELL <= base.height; cy += CELL) {
      for (let cx = 0; cx + CELL <= base.width; cx += CELL) {
        if (cx + CELL > skip.x && cx < skip.x + skip.w && cy + CELL > skip.y && cy < skip.y + skip.h) continue;
        let hit = 0;
        for (let y = cy; y < cy + CELL; y += 2) {
          for (let x = cx; x < cx + CELL; x += 2) {
            const i = (y * base.width + x) * 4;
            if (Math.max(Math.abs(edit.data[i] - base.data[i]), Math.abs(edit.data[i + 1] - base.data[i + 1]), Math.abs(edit.data[i + 2] - base.data[i + 2])) > 64) hit++;
          }
        }
        if (hit > CELL * CELL / 4 / 4) busy++;
      }
    }
    if (busy >= 3) out.push(`${busy} other places changed too`);
  }
  const fringeShare = (img) => {
    let solid = 0, fringe = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i + 3] < 128) continue;
      solid++;
      if (near(img.data, i, bg, 70)) fringe++;
    }
    return solid ? fringe / solid : 0;
  };
  const extra = fringeShare(cut.keyed) - fringeShare(crop(keyOut(base, bg), cut.box));
  if (extra > 0.01) out.push(`background colour left on the edge (${(extra * 100).toFixed(1)}% more than the face had)`);
  return out;
}

// src/lib/puppet/quality.ts
var MOUTH_SHAPES = [
  "closed, no opening",
  "a closed smile, the corners turned up",
  "a little open, a small relaxed oval",
  "wide open, a tall oval",
  "a small tight round opening",
  "a medium or big round opening",
  "a little wider than at rest, slightly open, both rows of teeth close together",
  "the upper teeth resting on the lower lip or lower edge of the mouth",
  "slightly open, a small pink tongue tip just under the upper teeth",
  "pushed forward and squared, the teeth close together"
];
var SHAPE_OK = {
  mouth_AH: [3, 4],
  mouth_halfAH: [3],
  mouth_EE: [7],
  mouth_halfEE: [7, 3],
  mouth_OH: [6],
  mouth_OO: [5],
  mouth_halfOH: [5, 6],
  mouth_FV: [8],
  mouth_L: [9, 3, 7],
  mouth_CHSH: [10, 7],
  mouth_SMILE: [2]
};
var SHAPE_ASK = "Look at the RIGHT picture only. Which of these is the mouth? " + MOUTH_SHAPES.map((s, i) => `${i + 1}: ${s}.`).join(" ") + " Answer with the number only.";
var EYES_ASK = "Look at the RIGHT picture only. How many eyes does the character have? Answer with a number only.";
var YN = " Answer only yes or no.";
var COMMON = [
  { key: "beard_or_facial_hair_same_as_left", ask: "Compare the LEFT and RIGHT pictures. Is the facial hair (beard, moustache, stubble) the same on both? If neither has any, answer yes." + YN },
  { key: "skin_marks_same_as_left", ask: "Compare the LEFT and RIGHT pictures. Are the freckles, moles, scars and wrinkles the same on both? If neither has any, answer yes." + YN },
  { key: "eyes_look_same_direction_as_left", ask: "Compare the LEFT and RIGHT pictures. Do the eyes look in the same direction on both?" + YN },
  { key: "right_looks_broken", ask: "Does the RIGHT picture look broken \u2014 doubled or extra features, smears, a visible seam or box edge, or letters drawn on it?" + YN }
];
function factsQuestions(part, look) {
  const qs = factsQuestionsRaw(part);
  return part.kind === "arms" && look?.animal ? qs.map((q) => ({ ...q, ask: pawWords(q.ask).replace(/arms/g, "front legs") })) : qs;
}
function factsQuestionsRaw(part) {
  if (part.kind === "mouth")
    return [
      { key: "right_mouth_is_the_wanted_shape", ask: `Look at the RIGHT picture only. Is the mouth this shape: ${part.expect}?` + YN },
      ...SHAPE_OK[part.id] ? [{ key: "mouth_shape_pick", ask: SHAPE_ASK, number: true }] : [],
      { key: "tongue_visible", ask: "Look at the RIGHT picture only. Can you see the tongue?" + YN },
      { key: "tongue_reaches_past_the_teeth_or_lips", ask: "Look at the RIGHT picture only. Does the tongue stick out of the mouth \u2014 past the teeth or past the lips, so part of it is outside the mouth?" + YN },
      { key: "smiling_right", ask: "Look at the RIGHT picture only. Is the character smiling, with the corners of the mouth turned up?" + YN },
      { key: "lips_drawn_left", ask: "Look at the LEFT picture only. Does the mouth have distinct drawn lips \u2014 a lip shape or a lip colour different from the skin?" + YN },
      { key: "lips_drawn_right", ask: "Look at the RIGHT picture only. Does the mouth have distinct drawn lips \u2014 a lip shape or a lip colour different from the skin?" + YN },
      ...COMMON
    ];
  if (part.kind === "lid" || part.kind === "brow")
    return [
      { key: "wanted_change_visible", ask: `Compare the LEFT and RIGHT pictures. Does the RIGHT one show: ${part.expect}?` + YN },
      { key: "mouth_changed", ask: "Compare the LEFT and RIGHT pictures. Is the mouth different between them?" + YN },
      { key: "eyes_count_right", ask: EYES_ASK, number: true },
      ...COMMON
    ];
  return [
    { key: "right_picture_shows_the_wanted_arm_pose", ask: `Look at the RIGHT picture only. Does it show: ${part.expect}?` + YN },
    { key: "arms_count_right", ask: "Look at the RIGHT picture only. How many arms does the character have? Answer with a number only.", number: true },
    { key: "hands_visible_right", ask: "Look at the RIGHT picture only. How many hands can you see? Answer with a number only.", number: true },
    { key: "hand_covers_face_right", ask: "Look at the RIGHT picture only. Does a hand cover any part of the face?" + YN },
    { key: "face_changed", ask: "Compare the LEFT and RIGHT pictures. Is the face different between them?" + YN },
    { key: "eyes_count_right", ask: EYES_ASK, number: true },
    ...COMMON
  ];
}
function readAnswer(text, number) {
  if (!text) return void 0;
  const t = text.toLowerCase().replace(/<think>[\s\S]*?<\/think>/g, "");
  if (number) {
    const m = t.match(/\b(\d+)\b/g);
    return m ? Number(m[m.length - 1]) : void 0;
  }
  const yes = /\byes\b/.test(t), no = /\bno\b/.test(t);
  return yes && !no ? true : no && !yes ? false : void 0;
}
var SMILES_OK = /* @__PURE__ */ new Set(["mouth_SMILE", "mouth_EE", "mouth_halfEE"]);
var EYES_SHUT = /* @__PURE__ */ new Set(["lid_closed", "lid_half"]);
var SOFT_MARK = "unsure: ";
var isSoft = (reason) => reason.startsWith(SOFT_MARK);
function brokenRules(part, look, f) {
  const b = [];
  if (f.beard_or_facial_hair_same_as_left === false) b.push("facial hair changed");
  if (f.skin_marks_same_as_left === false) b.push("marks changed");
  if (f.eyes_look_same_direction_as_left === false && !EYES_SHUT.has(part.id)) b.push("eyes changed direction");
  if (f.right_looks_broken === true) b.push("picture broken");
  if (typeof f.eyes_count_right === "number" && f.eyes_count_right !== eyesOf(look)) b.push(`${f.eyes_count_right} eyes, should be ${eyesOf(look)}`);
  const shapeOk = SHAPE_OK[part.id.replace(/^(side|sit)_/, "")];
  if (shapeOk && typeof f.mouth_shape_pick === "number" && !shapeOk.includes(f.mouth_shape_pick))
    b.push(`${SOFT_MARK}mouth looks like "${MOUTH_SHAPES[f.mouth_shape_pick - 1] ?? "none of the shapes"}"`);
  if (part.kind === "mouth") {
    if (f.right_mouth_is_the_wanted_shape === false) b.push("wrong mouth shape");
    if (f.tongue_reaches_past_the_teeth_or_lips === true) b.push("tongue sticking out");
    else if (part.id.endsWith("_AH") && f.tongue_visible === true) b.push("tongue showing");
    if (!look.lips && f.lips_drawn_right === true) b.push("lips on a lipless puppet");
    else if (look.lips && typeof f.lips_drawn_left === "boolean" && typeof f.lips_drawn_right === "boolean" && f.lips_drawn_left !== f.lips_drawn_right) b.push("lips differ from the face");
    if (f.smiling_right === true && !SMILES_OK.has(part.id.replace(/^(side|sit)_/, ""))) b.push("smile where none was asked");
  } else if (part.kind === "lid" || part.kind === "brow") {
    if (f.wanted_change_visible === false) b.push("change not visible");
    if (f.mouth_changed === true) b.push("mouth changed too");
  } else {
    if (f.right_picture_shows_the_wanted_arm_pose === false) b.push("pose wrong");
    if (typeof f.arms_count_right === "number" && f.arms_count_right !== 2) b.push(`${f.arms_count_right} arms`);
    if (typeof f.hands_visible_right === "number" && f.hands_visible_right < 2) b.push("a hand missing");
    if (f.hand_covers_face_right === true) b.push("hand over the face");
    if (f.face_changed === true) b.push("face changed");
  }
  return b;
}
var FIX = [
  [/tongue sticking out/, "only the smallest tip inside the mouth, behind the teeth"],
  [/tongue showing/, "the inside of the mouth plain, empty and dark"],
  [/lips on a lipless/, "the edge of the mouth the same colour as the skin around it"],
  [/lips differ/, "the lips exactly as on the original face"],
  [/facial hair|marks changed/, "the face exactly as in the original, nothing added and nothing taken away"],
  [/smile where none/, "the corners of the mouth level"],
  [/mouth changed too/, "the mouth exactly as in the original"],
  [/eyes changed/, "the eyes and where they look exactly as in the original"],
  [/arms|hand missing/, "two arms, both hands fully visible"],
  [/eyes, should be/, "exactly the eyes the original has, no more and no fewer"],
  [/hand over the face/, "the hands beside the body, the face fully visible"],
  [/face changed/, "the face exactly as in the original"],
  [/picture broken/, "one clean, simple drawing"]
];
function fixNote(reasons, part) {
  const out = /* @__PURE__ */ new Set();
  for (const r of reasons) {
    const hit = FIX.find(([re]) => re.test(r));
    if (hit) out.add(hit[1]);
    else if (/wrong mouth shape|mouth looks like|pose wrong|change not visible/.test(r)) out.add(`clearly: ${part.expect}`);
  }
  return [...out].join("; ");
}
async function factsFrom(c, qs) {
  const facts = {};
  const unanswered = [];
  const answers = await Promise.all(qs.map((q) => c.answer(q.ask).catch(() => null)));
  qs.forEach((q, i) => {
    const v = readAnswer(answers[i], q.number);
    if (v === void 0) unanswered.push(q.key);
    else facts[q.key] = v;
  });
  return unanswered.length === qs.length ? null : { facts, unanswered };
}
async function panelVerdict(part, look, checkers, tieBreak) {
  const qs = factsQuestions(part, look);
  const all = tieBreak ? [...checkers, tieBreak] : checkers;
  const detail = await Promise.all(
    all.map(async (c) => {
      const got = await factsFrom(c, qs);
      return { name: c.name, facts: got?.facts ?? null, faults: got ? brokenRules(part, look, got.facts) : [], unanswered: got?.unanswered ?? [] };
    })
  );
  const looked = detail.filter((d) => d.facts);
  if (!looked.length) return null;
  const hard = [...new Set(looked.flatMap((d) => d.faults.filter((r) => !isSoft(r))))];
  const soft = [...new Set(looked.flatMap((d) => d.faults.filter(isSoft)))];
  const unsure = looked.filter((d) => d.unanswered.length);
  const level = hard.length ? "no" : soft.length || unsure.length || looked.length < 2 ? "maybe" : "yes";
  const reasons = [
    ...hard,
    ...soft,
    ...unsure.map((d) => `${SOFT_MARK}${d.name} could not answer ${d.unanswered.length} question${d.unanswered.length > 1 ? "s" : ""}`),
    ...looked.length < 2 ? [`${SOFT_MARK}only ${looked.length} checker could look`] : []
  ];
  const mark = (d) => !d.facts ? "\u2013" : d.faults.some((r) => !isSoft(r)) ? "\u2717" : d.faults.length || d.unanswered.length ? "?" : "\u2713";
  const votes = detail.map((d) => `${d.name} ${mark(d)}`).join(" \xB7 ");
  const ok = level === "yes";
  return {
    ok,
    level,
    reasons: ok ? [] : reasons,
    votes,
    detail,
    why: ok ? `green: all ${looked.length} checkers found nothing (${votes})` : `${level === "no" ? "no" : "maybe no"}: ${reasons.join(", ")} (${votes})`
  };
}

// src/lib/puppet/maker.ts
function viewBox(box, img) {
  const grow = Math.max(box.w, box.h) * 0.6;
  const side = Math.min(Math.max(box.w, box.h) + grow * 2, img.width, img.height);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const x = Math.round(Math.min(Math.max(0, cx - side / 2), img.width - side));
  const y = Math.round(Math.min(Math.max(0, cy - side / 2), img.height - side));
  return { x, y, w: Math.round(side), h: Math.round(side) };
}
function shrink(img, max) {
  const k = Math.min(1, max / Math.max(img.width, img.height));
  return k === 1 ? img : resize(img, Math.round(img.width * k), Math.round(img.height * k));
}
function reviewPicture(base, part, cut) {
  if (part.kind === "arms" && cut.full) return shrink(sideBySide(base, cut.full), 1024);
  const view = viewBox(cut.box, base);
  const after = composite(base, cut.layer, cut.box.x, cut.box.y);
  return shrink(sideBySide(crop(base, view), crop(after, view)), 768);
}
export {
  BASE_NEGATIVE,
  DEFAULT_LOOK,
  EDIT_NEGATIVE,
  FUR_SMOOTH,
  HARD_ANIMALS,
  KEEP,
  KEEP_EXACTLY,
  KEY_COLOUR,
  MOUTH_SHAPES,
  PHOTO_EXCLUDED,
  PUPPET_PARTS,
  PUPPET_STYLES,
  REGION,
  SHAPE_OK,
  SOFT_MARK,
  TEETH_SHOWN,
  VIEW_EDITS,
  VIEW_PARTS,
  asksForFaceMarks,
  bandFor,
  baseNegative,
  basePrompt,
  blank,
  borderColour,
  brokenRules,
  composite,
  crop,
  cutPart,
  editNegative,
  editPrompt,
  eyeWords,
  eyesOf,
  faceMarksNote,
  factsQuestions,
  factsSentence,
  featherEdges,
  fixNote,
  furNote,
  hardAnimalWhy,
  isAnimal,
  isSoft,
  keepFor,
  keyColourFor,
  keyOut,
  lipsFor,
  matchColours,
  maxAreaPct,
  opaqueShare,
  panelVerdict,
  partsFor,
  pawWords,
  pixelChecks,
  readAnswer,
  resize,
  reviewPicture,
  sideBySide,
  styleById,
  teethFor,
  withoutLipWords
};
