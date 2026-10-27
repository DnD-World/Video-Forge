// ---------------------------------------------------------------------------
// Prepared drawn characters, per subject (ultra plan #13, 27 Oct 2026).
//
// Starting points, not finished casts: pick one, change anything. Every
// design is our own — no show, film or game character is copied. Cards only
// use clothes the engine has today; costumes (wizard hats, Santa suits, dog
// ears) come with the wardrobe work in Phase 5, and these get them then.
// Plain data, checked by normalizeCard in the tests.
// ---------------------------------------------------------------------------

const W = (id, ...colors) => ({ id, colors });

export const DRAWN_PRESETS = [
  // ---- D&D
  { id: "dnd-dungeon-master", subjects: ["dnd"], name: "The Dungeon Master", description: "A cheerful narrator with glasses who runs the game and voices every monster.", personality: "Dramatic, kind, loves a twist",
    card: { build: "round", hair: "curly", hairColor: "#5a3825", beard: "short", wear: [W("sweater", "#6b3fa0"), W("jeans", "#2d3446"), W("sneakers", "#f2f2f2", "#6b3fa0"), W("glasses", "#262a33")], expression: "smile", energy: 0.8 } },
  { id: "dnd-dwarf", subjects: ["dnd"], name: "Dwarf fighter", description: "A short, broad dwarf warrior with a huge red beard and a dented helmet.", personality: "Gruff, loyal, brave to a fault",
    card: { height: 0.8, build: "round", muscle: 0.8, hair: "bald", hairColor: "#a8322b", beard: "full", moustache: "thick", wear: [W("tshirt", "#7a5230"), W("trousers", "#4b3a2a"), W("boots", "#2b1d12"), W("helmet", "#9aa3ab", "#6b4429")], expression: "grumpy" } },
  { id: "dnd-elf-wizard", subjects: ["dnd"], name: "Elf wizard", description: "A tall, slim elf with long silver hair and a flowing robe.", personality: "Calm, clever, a little vain",
    card: { height: 1.1, build: "thin", hair: "long", hairColor: "#d9d9e0", ears: "big", wear: [W("dress", "#2f4fa0"), W("himation", "#7fd3ff"), W("sandals", "#7a5230")], expression: "neutral" } },
  // ---- dogs
  { id: "dogs-trainer", subjects: ["dogs"], name: "Dog trainer", description: "A friendly dog trainer in a green polo shirt with a treat pouch and a lead.", personality: "Patient, upbeat, explains with examples",
    card: { hair: "ponytail", hairColor: "#5a3825", wear: [W("polo", "#3f8f4a"), W("jeans", "#2d3446"), W("sneakers", "#f2f2f2", "#3f8f4a"), W("cap", "#3f8f4a")], expression: "smile", energy: 0.7 } },
  { id: "dogs-vet", subjects: ["dogs"], name: "The vet", description: "A calm vet in a white coat with glasses.", personality: "Gentle, precise, reassuring",
    card: { hair: "sidepart", hairColor: "#262a33", wear: [W("shirt", "#7fd3ff"), W("blazer", "#f2f2f2"), W("trousers", "#2d3446"), W("shoes", "#16181d"), W("glasses", "#262a33")], expression: "smile" } },
  { id: "dogs-owner", subjects: ["dogs", "everyday"], name: "New dog owner", description: "A young new dog owner in a hoodie, a bit overwhelmed.", personality: "Eager, worried, asks lots of questions",
    card: { height: 0.95, hair: "spiky", hairColor: "#c9a46e", wear: [W("hoodie", "#e07b39"), W("jeans", "#3a6fb0"), W("sneakers", "#f2f2f2", "#e07b39")], expression: "neutral", energy: 0.8 } },
  // ---- manipulation defence (archetypes, never diagnoses or real people)
  { id: "manip-charmer", subjects: ["manipulation"], name: "The charmer", description: "A smooth talker in a sharp blazer with a big smile.", personality: "Flattering at first, then cold and controlling",
    card: { hair: "sidepart", hairColor: "#262a33", wear: [W("shirt", "#ffffff"), W("blazer", "#2d3446"), W("tie", "#a8322b"), W("trousers", "#2d3446"), W("shoes", "#16181d")], expression: "smile" } },
  { id: "manip-target", subjects: ["manipulation"], name: "The one who learns", description: "An ordinary person in a cardigan-style sweater who learns to spot manipulation.", personality: "Kind, doubtful at first, steadier by the end",
    card: { hair: "bob", hairColor: "#5a3825", wear: [W("sweater", "#e8d5a8"), W("jeans", "#2d3446"), W("shoes", "#5a3825")], expression: "neutral" } },
  { id: "manip-wise-friend", subjects: ["manipulation", "softskills"], name: "The wise friend", description: "An older friend with grey hair and warm eyes who names what is happening.", personality: "Warm, direct, never preachy",
    card: { hair: "bun", hairColor: "#b0b0b0", cheeks: true, wear: [W("sweater", "#3f8f4a"), W("skirt", "#2d3446"), W("shoes", "#5a3825"), W("glasses", "#5a3825")], expression: "smile" } },
  // ---- soft skills
  { id: "soft-coach", subjects: ["softskills"], name: "The coach", description: "An energetic life coach in a bright polo with a headset microphone.", personality: "Encouraging, practical, a little cheesy",
    card: { muscle: 0.4, hair: "buzz", hairColor: "#262a33", wear: [W("polo", "#d4405c"), W("trousers", "#2d3446"), W("sneakers", "#ffffff", "#d4405c")], expression: "smile", energy: 0.9 } },
  { id: "soft-new-hire", subjects: ["softskills", "everyday"], name: "The new hire", description: "A nervous new hire on their first day, shirt tucked in too neatly.", personality: "Nervous, keen to please",
    card: { height: 0.96, build: "thin", hair: "short", hairColor: "#262a33", wear: [W("shirt", "#7fd3ff"), W("tie", "#2f6fb5"), W("trousers", "#2d3446"), W("shoes", "#16181d")], expression: "neutral", blinkRate: 1.5 } },
  { id: "soft-team-lead", subjects: ["softskills"], name: "The team lead", description: "A composed team lead in a blazer, always with a notebook.", personality: "Fair, busy, listens before deciding",
    card: { hair: "braid", hairColor: "#5a3825", wear: [W("tshirt", "#f2f2f2"), W("blazer", "#6b3fa0"), W("trousers", "#2d3446"), W("shoes", "#16181d"), W("earrings", "#f2c84b")], expression: "neutral" } },
  // ---- seasonal (costume pieces come in Phase 5)
  { id: "season-winter-gift-giver", subjects: ["seasonal"], name: "Winter gift-giver", description: "A jolly, round man with a big white beard in a red sweater.", personality: "Jolly, warm, a little forgetful",
    card: { build: "round", hair: "short", hairColor: "#ffffff", beard: "full", moustache: "thick", cheeks: true, wear: [W("sweater", "#a8322b"), W("trousers", "#a8322b"), W("boots", "#16181d"), W("beanie", "#a8322b")], expression: "smile" } },
  { id: "season-snow-kid", subjects: ["seasonal", "everyday"], name: "Snow-day kid", description: "A small kid bundled up in a scarf and beanie.", personality: "Excited about everything",
    card: { height: 0.78, headSize: 1.2, hair: "pigtails", hairColor: "#a8322b", freckles: true, wear: [W("hoodie", "#2f6fb5"), W("jeans", "#2d3446"), W("boots", "#e07b39"), W("scarf", "#f2c84b"), W("beanie", "#d4405c")], expression: "smile", energy: 1 } },
  { id: "season-spooky-host", subjects: ["seasonal"], name: "Spooky host", description: "A pale, thin host in a black suit and top hat for Halloween stories.", personality: "Theatrical, slow, secretly sweet",
    card: { height: 1.1, build: "thin", skin: "#e8e2da", hair: "sidepart", hairColor: "#000000", wear: [W("shirt", "#ffffff"), W("blazer", "#16181d"), W("bowtie", "#a8322b"), W("trousers", "#16181d"), W("shoes", "#16181d"), W("tophat", "#16181d", "#a8322b")], expression: "serious" } },
  // ---- ELI5 AI
  { id: "ai-tinkerer", subjects: ["ai"], name: "The tinkerer", description: "A curious maker in a hoodie with goggles-style glasses, always building automations.", personality: "Curious, explains with analogies",
    card: { hair: "mohawk", hairColor: "#3f8f4a", wear: [W("hoodie", "#2d3446"), W("jeans", "#3a6fb0"), W("sneakers", "#f2c84b", "#2d3446"), W("glasses", "#262a33")], expression: "smile", energy: 0.8 } },
  { id: "ai-beginner", subjects: ["ai", "everyday"], name: "Confused beginner", description: "Someone new to computers, holding a phone and frowning at it.", personality: "Honest about not knowing, quick to laugh",
    card: { build: "round", hair: "curly", hairColor: "#b0b0b0", wear: [W("sweater", "#e85d8a"), W("trousers", "#2d3446"), W("shoes", "#5a3825"), W("glasses", "#5a3825")], expression: "neutral" } },
  { id: "ai-office-skeptic", subjects: ["ai", "softskills"], name: "The skeptic", description: "An office worker in a shirt and tie who doubts every new tool.", personality: "Dry, sarcastic, secretly impressed",
    card: { hair: "tuft", hairColor: "#262a33", moustache: "thin", wear: [W("shirt", "#f2f2f2"), W("tie", "#2d3446"), W("trousers", "#4b3a2a"), W("shoes", "#16181d")], expression: "grumpy" } },
  // ---- tropes (original designs only)
  { id: "trope-chosen-one", subjects: ["tropes"], name: "The Chosen One", description: "A young hero in a plain hoodie who just found out they are special.", personality: "Unsure, stubborn, grows into it",
    card: { height: 0.94, hair: "spiky", hairColor: "#262a33", wear: [W("hoodie", "#3f8f4a"), W("jeans", "#2d3446"), W("sneakers", "#ffffff", "#3f8f4a")], expression: "neutral" } },
  { id: "trope-mentor", subjects: ["tropes", "dnd"], name: "The Mentor", description: "An old mentor with a long grey beard and a calm smile.", personality: "Cryptic, patient, always one step ahead",
    card: { posture: "slouch", hair: "bald", hairColor: "#b0b0b0", beard: "full", moustache: "thick", wear: [W("chiton", "#e8d5a8", "#7a5230"), W("himation", "#5a3825"), W("sandals", "#7a5230")], expression: "smile" } },
  { id: "trope-villain", subjects: ["tropes"], name: "The monologuing villain", description: "A tall villain in a dark suit who explains the whole plan.", personality: "Grand, theatrical, can't stop talking",
    card: { height: 1.12, build: "thin", hair: "sidepart", hairColor: "#000000", moustache: "handlebar", wear: [W("shirt", "#16181d"), W("blazer", "#6b3fa0"), W("trousers", "#16181d"), W("shoes", "#16181d")], expression: "grumpy", energy: 0.9 } },
  // ---- everyday
  { id: "everyday-yiayia", subjects: ["everyday"], name: "Yiayia", description: "A small Greek grandmother with a grey bun, a black dress and a brown shawl.", personality: "Loving, bossy, feeds everyone",
    card: { height: 0.85, build: "round", hair: "bun", hairColor: "#b0b0b0", cheeks: true, wear: [W("dress", "#16181d"), W("scarf", "#5a3825"), W("shoes", "#16181d")], expression: "smile" } },
  { id: "everyday-dad", subjects: ["everyday"], name: "Dad", description: "A friendly dad in a polo shirt and shorts.", personality: "Corny jokes, calm in a crisis",
    card: { build: "round", hair: "short", hairColor: "#5a3825", beard: "stubble", wear: [W("polo", "#3a6fb0"), W("shorts", "#c9a46e"), W("sneakers", "#ffffff", "#3a6fb0")], expression: "smile" } },
  { id: "everyday-teen", subjects: ["everyday"], name: "The teenager", description: "A teenager in a hoodie and headphones-style headband, always on the phone.", personality: "Bored, witty, kinder than they look",
    card: { height: 0.97, build: "thin", hair: "long", hairColor: "#262a33", wear: [W("hoodie", "#6b3fa0"), W("jeans", "#2d3446"), W("sneakers", "#ffffff", "#6b3fa0"), W("headband", "#d4405c")], expression: "neutral" } },
];
