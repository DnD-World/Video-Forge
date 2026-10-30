// ---------------------------------------------------------------------------
// COSTUME PACKS (#29, 28 Oct 2026): whole outfits in one click, picked for
// Ak's subjects. A pack replaces what a character wears (and may set hair or
// a beard where the costume needs it); the face, skin and build stay theirs.
// Plain data, checked by normalizeCard in the tests.
// ---------------------------------------------------------------------------

const W = (id, ...colors) => ({ id, colors });

export const COSTUMES = [
  // D&D
  { id: "wizard", label: "Wizard", subjects: ["dnd", "tropes"], wear: [W("robe", "#3b2a7a", "#ffd400"), W("wizardhat", "#3b2a7a", "#ffd400"), W("pointy", "#4b3a2a")] },
  { id: "knight", label: "Knight", subjects: ["dnd", "tropes"], wear: [W("tshirt", "#6b4429"), W("armor", "#b8c2cc", "#8a5a36"), W("trousers", "#3a3a44"), W("boots", "#3a2a1a"), W("cape", "#1f4fa0", "#e0b040")] },
  { id: "king", label: "King or queen", subjects: ["dnd", "tropes"], wear: [W("robe", "#7a1f3a", "#e0b040"), W("crown", "#ffc93c", "#d7261e"), W("cape", "#a8322b", "#e0b040"), W("pointy", "#3a2a1a")] },
  { id: "rogue", label: "Rogue", subjects: ["dnd"], wear: [W("hoodie_up", "#2d3446"), W("trousers", "#1f2430"), W("boots", "#3a2a1a"), W("scarf", "#3f3f4a")] },
  { id: "pirate", label: "Pirate", subjects: ["dnd", "seasonal", "tropes"], wear: [W("shirt", "#f4f1e8"), W("vest", "#a8322b"), W("trousers", "#2d3446"), W("boots", "#1a1a1a"), W("tricorn", "#1a1a1a", "#e0b040"), W("eyepatch", "#1a1a1a")] },
  { id: "innkeeper", label: "Innkeeper", subjects: ["dnd", "everyday"], wear: [W("shirt", "#e9e4da"), W("apron", "#8a5a36"), W("trousers", "#4b3a2a"), W("boots", "#3a2a1a")] },
  // dogs
  { id: "vet", label: "Vet", subjects: ["dogs"], wear: [W("polo", "#3a6fb0"), W("labcoat", "#f4f6f8"), W("trousers", "#2d3446"), W("sneakers", "#ffffff", "#3a6fb0")] },
  { id: "dogtrainer", label: "Dog trainer", subjects: ["dogs"], wear: [W("polo", "#3f8f4a"), W("jeans", "#2d3446"), W("wellies", "#2f6b4f"), W("cap", "#3f8f4a")] },
  { id: "dogcostume", label: "Dog costume (kids, Halloween)", subjects: ["dogs", "seasonal"], wear: [W("hoodie", "#8a5a36"), W("trousers", "#8a5a36"), W("paws", "#8a5a36", "#f4ead2"), W("dogears", "#6b4429")] },
  // manipulation defence / tropes
  { id: "charmer", label: "Smooth charmer", subjects: ["manipulation", "tropes"], wear: [W("shirt", "#ffffff"), W("blazer", "#2d3446"), W("tie", "#a8322b"), W("trousers", "#2d3446"), W("shoes", "#16181d"), W("sunglasses", "#141414")] },
  { id: "detective", label: "Detective", subjects: ["manipulation", "tropes"], wear: [W("shirt", "#e9e4da"), W("blazer", "#8a6a3a"), W("trousers", "#4b3a2a"), W("shoes", "#3a2a1a"), W("beret", "#5a4632")] },
  { id: "villain", label: "Villain", subjects: ["tropes", "seasonal"], wear: [W("shirt", "#16181d"), W("blazer", "#16181d"), W("trousers", "#16181d"), W("shoes", "#16181d"), W("cape", "#16181d", "#a8322b")] },
  // soft skills / everyday work
  { id: "office", label: "Office", subjects: ["softskills", "everyday"], wear: [W("shirt", "#cfe8ff"), W("tie", "#2f6fb5"), W("trousers", "#2d3446"), W("shoes", "#16181d")] },
  { id: "chef", label: "Chef", subjects: ["softskills", "everyday"], wear: [W("labcoat", "#ffffff"), W("trousers", "#1a1a1a"), W("shoes", "#16181d"), W("chefhat", "#ffffff")] },
  { id: "podcaster", label: "Podcaster", subjects: ["softskills", "ai"], wear: [W("hoodie", "#2d3446"), W("jeans", "#3a6fb0"), W("sneakers", "#ffffff", "#2d3446"), W("headset", "#2a2a33")] },
  { id: "scientist", label: "Scientist", subjects: ["ai", "softskills"], wear: [W("shirt", "#ffffff"), W("labcoat", "#f4f6f8"), W("trousers", "#2d3446"), W("shoes", "#16181d"), W("glasses", "#1a1a1a")] },
  // seasonal
  { id: "santa", label: "Santa", subjects: ["seasonal"], beard: "full", hairColor: "#ffffff", wear: [W("santacoat", "#d7261e", "#ffffff"), W("boots", "#1a1a1a"), W("santahat", "#d7261e", "#ffffff")] },
  { id: "elf", label: "Christmas elf", subjects: ["seasonal"], wear: [W("tshirt", "#2e8b57"), W("vest", "#d7261e"), W("shorts", "#2e8b57"), W("pointy", "#d7261e"), W("santahat", "#2e8b57", "#ffffff")] },
  { id: "witch", label: "Witch", subjects: ["seasonal"], wear: [W("dress", "#1f1a24"), W("witchhat", "#1f1a24", "#7a3fa0"), W("cape", "#3a1f4a", "#7a3fa0"), W("boots", "#1a1a1a")] },
  { id: "bunny", label: "Easter bunny", subjects: ["seasonal"], wear: [W("hoodie", "#f4f1e8"), W("trousers", "#f4f1e8"), W("paws", "#f4f1e8", "#ffb3c7"), W("bunnyears", "#f4f1e8", "#ffb3c7")] },
  { id: "cupid", label: "Valentine", subjects: ["seasonal"], wear: [W("sweater", "#ff4d6d"), W("skirt", "#f4f1e8"), W("heels", "#a8322b"), W("bow", "#ff4d6d")] },
];
