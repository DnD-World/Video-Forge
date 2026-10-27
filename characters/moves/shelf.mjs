// ---------------------------------------------------------------------------
// The starter shelf of moves (motion library #48, 27 Oct 2026).
//
// Plain data in the format moves.mjs checks (normalizeMove): no functions, so
// a move recorded from a webcam or written by hand later is the same kind of
// thing. Angles in radians, the skeleton's own way: 0 = arm hanging down,
// positive = away from the body; about 1.5 is straight out, 2.9 is overhead.
// Times are 0–1 of the move's length. Phase 5 grows this shelf to ~60.
// ---------------------------------------------------------------------------

const UP = [2.55, 0.25], OUT = [1.5, 0.05], REST_ARM = [0.12, 0.1];
// Seen from the front an arm bent with a POSITIVE forearm swings out to the
// side; a NEGATIVE forearm folds it across the body (side on, forwards).

export const SHELF_DATA = [
  // ---- gestures (they replace the four old arm poses one for one) ----------------------
  {
    id: "wave", name: "Wave", kind: "gesture", tags: ["greet", "hands"], phrases: ["waves", "wave", "waves hello", "waves goodbye", "greets", "χαιρετά", "κουνάει το χέρι"],
    help: "A friendly wave with the hand up by the head.",
    lengthMs: 1700,
    tracks: {
      armF: [[0.15, [2.45, 0.45]], [0.24, [2.5, 0.95]], [0.33, [2.5, 0.1]], [0.42, [2.5, 0.95]], [0.51, [2.5, 0.1]], [0.6, [2.5, 0.95]], [0.69, [2.5, 0.3]], [1, REST_ARM]],
      head: [[0.2, [4, 0]], [0.75, [4, 0]], [1, [0, 0]]],
    },
    hands: { F: [[0.1, "wave"], [0.85, "relaxed"]] },
    face: [[0.1, { smile: 0.35, brows: "happy" }], [0.9, {}]],
  },
  {
    id: "point", name: "Point", kind: "gesture", tags: ["hands", "explain"], phrases: ["points", "point", "points to the side", "shows", "δείχνει"],
    help: "Points out to the side with one finger. Holds as long as the line needs.",
    lengthMs: 1400, hold: 0.4,
    tracks: { armF: [[0.3, OUT, "back"], [0.75, OUT], [1, REST_ARM]], head: [[0.3, [-3, 0]], [0.8, [-3, 0]], [1, [0, 0]]] },
    hands: { F: [[0.12, "point"], [0.85, "relaxed"]] },
  },
  {
    id: "shrug", name: "Shrug", kind: "gesture", tags: ["question", "hands"], phrases: ["shrugs", "shrug", "σηκώνει τους ώμους"],
    help: "Both hands up and open: who knows?",
    lengthMs: 1500,
    tracks: {
      armF: [[0.3, [0.55, 1.75], "back"], [0.7, [0.55, 1.75]], [1, REST_ARM]],
      armB: [[0.3, [0.55, 1.75], "back"], [0.7, [0.55, 1.75]], [1, REST_ARM]],
      head: [[0.3, [-6, 0.02]], [0.75, [-6, 0.02]], [1, [0, 0]]],
    },
    hands: { F: [[0.15, "open"], [0.85, "relaxed"]], B: [[0.15, "open"], [0.85, "relaxed"]] },
    face: [[0.2, { brows: "raised" }], [0.85, {}]],
  },
  {
    id: "explain", name: "Explain", kind: "gesture", tags: ["hands", "explain"], phrases: ["explains", "explaining", "gestures", "εξηγεί"],
    help: "Talking with the hands: the front hand beats along with the words.",
    lengthMs: 2000, hold: 0.3,
    tracks: {
      armF: [[0.2, [0.45, 1.35]], [0.35, [0.55, 1.75]], [0.5, [0.42, 1.25]], [0.65, [0.55, 1.7]], [0.8, [0.45, 1.35]], [1, REST_ARM]],
      armB: [[0.25, [0.3, 0.8]], [0.8, [0.3, 0.8]], [1, REST_ARM]],
    },
    hands: { F: [[0.15, "open"], [0.88, "relaxed"]] },
  },
  {
    id: "thumbs-up", name: "Thumbs up", kind: "gesture", tags: ["hands", "yes"], phrases: ["thumbs up", "gives a thumbs up", "μπράβο"],
    help: "A thumbs up in front of the chest, with a smile.",
    lengthMs: 1300, hold: 0.35,
    tracks: { armF: [[0.3, [0.35, -1.9], "back"], [0.75, [0.35, -1.9]], [1, REST_ARM]] },
    hands: { F: [[0.15, "thumbsUp"], [0.85, "relaxed"]] },
    face: [[0.15, { smile: 0.4, brows: "happy" }], [0.9, {}]],
  },
  {
    id: "facepalm", name: "Facepalm", kind: "gesture", tags: ["emotion", "hands"], phrases: ["facepalms", "facepalm", "head in hand"],
    help: "Hand to the face, head down: oh no.",
    lengthMs: 1800, hold: 0.45,
    tracks: {
      armF: [[0.3, [0.3, -2.85]], [0.75, [0.3, -2.85]], [1, REST_ARM]],
      head: [[0.3, [-6, 0.12]], [0.75, [-6, 0.12]], [1, [0, 0]]],
      lean: [[0.3, [0.06]], [0.75, [0.06]], [1, [0]]],
    },
    hands: { F: [[0.2, "open"], [0.85, "relaxed"]] },
    face: [[0.25, { brows: "worried", lids: "closed" }], [0.85, {}]],
  },
  // ---- poses held for a while ------------------------------------------------------------
  {
    id: "hands-on-hips", name: "Hands on hips", kind: "pose", tags: ["stance", "confident"], phrases: ["hands on hips", "puts hands on hips"],
    help: "Hands on the hips, elbows out. Held until the line ends.",
    lengthMs: 1200, hold: 0.4,
    tracks: { armF: [[0.35, [0.75, -1.75]], [0.8, [0.75, -1.75]], [1, REST_ARM]], armB: [[0.35, [0.75, -1.75]], [0.8, [0.75, -1.75]], [1, REST_ARM]] },
    hands: { F: [[0.2, "fist"], [0.9, "relaxed"]], B: [[0.2, "fist"], [0.9, "relaxed"]] },
  },
  {
    id: "arms-crossed", name: "Arms crossed", kind: "pose", tags: ["stance", "grumpy"], phrases: ["crosses arms", "arms crossed", "folds arms", "σταυρώνει τα χέρια"],
    help: "Arms folded across the chest. Held until the line ends.",
    lengthMs: 1200, hold: 0.4,
    tracks: { armF: [[0.35, [0.15, -2.45]], [0.8, [0.15, -2.45]], [1, REST_ARM]], armB: [[0.35, [0.1, -2.3]], [0.8, [0.1, -2.3]], [1, REST_ARM]] },
    hands: { F: [[0.2, "fist"], [0.9, "relaxed"]], B: [[0.2, "fist"], [0.9, "relaxed"]] },
  },
  {
    id: "bow", name: "Bow", kind: "gesture", tags: ["greet", "polite"], phrases: ["bows", "bow", "takes a bow", "υποκλίνεται"],
    help: "A polite bow from the waist, best seen side on.",
    lengthMs: 1800,
    tracks: {
      lean: [[0.35, [0.85]], [0.65, [0.85]], [1, [0]]],
      head: [[0.35, [0, 0.14]], [0.65, [0, 0.14]], [1, [0, 0]]],
      armF: [[0.35, [0.35, -1.7]], [0.65, [0.35, -1.7]], [1, REST_ARM]],
      armB: [[0.35, [0.25, 0.1]], [0.65, [0.25, 0.1]], [1, REST_ARM]],
      view: [[0.15, [1.6]], [0.85, [1.6]], [1, [0]]],
    },
  },
  // ---- whole body ------------------------------------------------------------------------
  {
    id: "cheer", name: "Jump and cheer", kind: "gesture", tags: ["emotion", "happy", "jump"], phrases: ["cheers", "jumps", "jumps for joy", "celebrates", "πανηγυρίζει", "πηδάει"],
    help: "A little crouch, a jump with both fists up, and a soft landing.",
    lengthMs: 1300,
    tracks: {
      root: [[0.18, [0, 0.05]], [0.38, [0, -0.13], "out"], [0.55, [0, 0], "in"], [0.65, [0, 0.03]], [0.8, [0, 0]]],
      armF: [[0.18, [0.4, 0.6]], [0.38, UP, "back"], [0.8, UP], [1, REST_ARM]],
      armB: [[0.18, [0.4, 0.6]], [0.38, UP, "back"], [0.8, UP], [1, REST_ARM]],
      legF: [[0.38, [0.2, 0.5]], [0.55, [0, 0]]],
      legB: [[0.38, [-0.1, 0.7]], [0.55, [0, 0]]],
    },
    hands: { F: [[0.3, "fist"], [0.9, "relaxed"]], B: [[0.3, "fist"], [0.9, "relaxed"]] },
    face: [[0.2, { smile: 0.6, brows: "raised", lids: "wide" }], [0.95, {}]],
  },
  {
    id: "dance", name: "Little dance", kind: "idle", tags: ["happy", "dance"], phrases: ["dances", "dance", "χορεύει"],
    help: "A bouncy little dance that loops as long as it is asked to.",
    lengthMs: 1000, loop: true,
    tracks: {
      root: [[0, [-0.01, 0.02]], [0.25, [0, -0.01]], [0.5, [0.01, 0.02]], [0.75, [0, -0.01]], [1, [-0.01, 0.02]]],
      armF: [[0, [2.3, 0.6]], [0.5, [0.8, 1.6]], [1, [2.3, 0.6]]],
      armB: [[0, [0.8, 1.6]], [0.5, [2.3, 0.6]], [1, [0.8, 1.6]]],
      legF: [[0, [0.15, 0.5]], [0.5, [0, 0.05]], [1, [0.15, 0.5]]],
      legB: [[0, [0, 0.05]], [0.5, [0.15, 0.5]], [1, [0, 0.05]]],
      head: [[0, [-6, 0]], [0.5, [6, 0]], [1, [-6, 0]]],
    },
    hands: { F: [[0, "open"]], B: [[0, "open"]] },
    face: [[0, { smile: 0.5 }]],
  },
  {
    id: "walk-in", name: "Walk in", kind: "travel", tags: ["enter", "walk"], phrases: ["walks in", "enters", "comes in", "arrives", "μπαίνει", "έρχεται"],
    help: "Walks in from the left side of the picture to their place, then turns to the camera.",
    lengthMs: 2600,
    tracks: { view: [[0, [2]], [0.84, [2]], [1, [0]]] },
    gait: { t0: 0, t1: 0.88, cadence: 2 },
    path: { from: "left", to: "here", t0: 0, t1: 0.86 },
  },
  {
    id: "walk-in-right", name: "Walk in from the right", kind: "travel", tags: ["enter", "walk"], phrases: ["walks in from the right", "enters from the right", "comes in from the right"],
    help: "Walks in from the right side of the picture to their place.",
    lengthMs: 2600,
    tracks: { view: [[0, [2]], [0.84, [2]], [1, [0]]] },
    gait: { t0: 0, t1: 0.88, cadence: 2 },
    path: { from: "right", to: "here", t0: 0, t1: 0.86 },
  },
  {
    id: "walk-out", name: "Walk out", kind: "travel", tags: ["exit", "walk"], phrases: ["walks out", "leaves", "exits", "walks off", "φεύγει", "βγαίνει"],
    help: "Turns and walks out of the picture to the right.",
    lengthMs: 2600,
    tracks: { view: [[0, [0]], [0.12, [2]], [1, [2]]] },
    gait: { t0: 0.08, t1: 1, cadence: 2 },
    path: { from: "here", to: "right", t0: 0.1, t1: 1 },
  },
  {
    id: "run-across", name: "Run across", kind: "travel", tags: ["run", "fast"], phrases: ["runs across", "runs past", "dashes across", "τρέχει"],
    help: "Runs across the whole picture from left to right.",
    lengthMs: 1800,
    tracks: { view: [[0, [2]], [1, [2]]] },
    gait: { t0: 0, t1: 1, cadence: 2.4, run: true, stride: 1.2 },
    path: { from: "left", to: "right", t0: 0, t1: 1 },
  },
  {
    id: "sit-down", name: "Sit down", kind: "stance", tags: ["sit"], stance: "sit", phrases: ["sits down", "sits", "takes a seat", "κάθεται"],
    help: "Sits down and stays sitting until told to stand up.",
    lengthMs: 1300,
    tracks: { sit: [[0.15, [0]], [0.85, [1]]], lean: [[0.2, [0]], [0.5, [0.3]], [0.9, [0]]], armF: [[0.5, [0.3, -0.4]], [1, [0.2, -0.7]]], armB: [[0.5, [0.3, -0.4]], [1, [0.2, -0.7]]] },
    props: [{ id: "chair", hand: "F", t0: 0, t1: 1 }],
  },
  {
    id: "stand-up", name: "Stand up", kind: "stance", tags: ["sit"], stance: "stand", phrases: ["stands up", "gets up", "rises", "σηκώνεται"],
    help: "Gets up from sitting.",
    lengthMs: 1200,
    tracks: { sit: [[0, [1]], [0.2, [1]], [0.85, [0]]], lean: [[0.1, [0]], [0.4, [0.35]], [0.9, [0]]], armF: [[0, [0.2, -0.7]], [0.5, [0.3, -0.4]], [1, REST_ARM]], armB: [[0, [0.2, -0.7]], [0.5, [0.3, -0.4]], [1, REST_ARM]] },
    props: [{ id: "chair", hand: "F", t0: 0, t1: 1 }],
  },
  // ---- with props ----------------------------------------------------------------------
  {
    id: "drink", name: "Drink", kind: "gesture", tags: ["prop", "eat"], phrases: ["drinks", "sips", "has a sip", "πίνει"],
    help: "Lifts a cup (or whatever they hold) to the mouth for a sip.",
    lengthMs: 2200,
    tracks: {
      armF: [[0, [0.25, -1.45]], [0.3, [0.25, -2.7]], [0.65, [0.25, -2.7]], [0.95, [0.25, -1.45]]],
      head: [[0.3, [-8, -0.03]], [0.65, [-8, -0.03]], [0.9, [0, 0]]],
    },
    props: [{ id: "cup", hand: "F", t0: 0, t1: 1 }],
    face: [[0.3, { lids: "half" }], [0.7, {}]],
  },
  {
    id: "give", name: "Give", kind: "pair", tags: ["prop", "two people"], phrases: ["gives", "hands", "passes", "δίνει"],
    help: "Holds something out to the other speaker and lets go.",
    lengthMs: 2000,
    tracks: { armF: [[0, [0.5, 1.3]], [0.45, [1.25, 0.25]], [0.7, [1.25, 0.25]], [1, REST_ARM]], lean: [[0.45, [0.08]], [0.7, [0.08]], [1, [0]]] },
    props: [{ id: "box", hand: "F", t0: 0, t1: 0.55 }],
    face: [[0.3, { smile: 0.3 }], [0.95, {}]],
    pair: { role: "giver", partner: "receive", contact: 0.55 },
  },
  {
    id: "receive", name: "Receive", kind: "pair", tags: ["prop", "two people"], phrases: ["takes", "receives", "accepts", "παίρνει"],
    help: "Reaches out and takes what the other speaker holds out.",
    lengthMs: 2000,
    tracks: { armF: [[0.25, REST_ARM], [0.5, [1.2, 0.3]], [0.62, [1.2, 0.3]], [1, [0.5, 1.3]]] },
    props: [{ id: "box", hand: "F", t0: 0.55, t1: 1 }],
    face: [[0.5, { smile: 0.4, brows: "raised" }], [0.95, {}]],
    pair: { role: "receiver", partner: "give", contact: 0.55 },
  },
  {
    id: "open-box", name: "Open the box", kind: "gesture", tags: ["prop", "surprise"], phrases: ["opens the box", "opens the present", "opens the gift", "unwraps", "ανοίγει"],
    help: "Holds a box in front and lifts the lid, surprised.",
    lengthMs: 2400, hold: 0.75,
    tracks: {
      armF: [[0, [0.3, -1.45]], [1, [0.3, -1.45]]],
      armB: [[0.25, [0.25, -1.3]], [0.42, [0.35, -2.2]], [0.66, [0.7, -2.6]], [0.85, [0.25, -1.3]]],
      open: [[0.4, [0]], [0.68, [1], "back"]],
      head: [[0.3, [0, 0.04]], [0.7, [-4, -0.02]]],
    },
    props: [{ id: "box", hand: "F", t0: 0, t1: 1 }],
    face: [[0.68, { smile: 0.55, brows: "raised", lids: "wide" }]],
  },
];
