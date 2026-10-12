// Script starters — a skeleton to fill in, per kind of video (Ak, 12 Oct 2026:
// templates for every step, with friendly names). Each uses the cast's own
// names, in the project's language (Greek or English for now). «…» marks the
// places to write your own words.

export interface ScriptStarter {
  id: string;
  label: string;
  tip: string;
  build: (names: string[], lang: string) => string;
}

const n = (names: string[], i: number) => names[i] ?? names[i % Math.max(1, names.length)] ?? `Speaker ${i + 1}`;

export const SCRIPT_STARTERS: ScriptStarter[] = [
  {
    id: "lesson",
    label: "Lesson",
    tip: "Hello, three points, a quick recap. The shape of the course lessons.",
    build: (names, lang) =>
      lang === "el"
        ? `${n(names, 0)}: Καλώς ήρθατε! Σήμερα μιλάμε για «θέμα».
${n(names, 1)}: Και γιατί να μας ενδιαφέρει;
${n(names, 0)}: Γιατί «λόγος». Πρώτο: «πρώτο σημείο».
${n(names, 2)}: [laughs] «ένα αστείο ή παράδειγμα»!
${n(names, 0)}: Δεύτερο: «δεύτερο σημείο». Και τρίτο: «τρίτο σημείο».
${n(names, 1)}: Δηλαδή, με δυο λόγια, «σύνοψη».
${n(names, 0)}: Ακριβώς. Τα λέμε στο επόμενο!`
        : `${n(names, 0)}: Welcome! Today we're talking about «topic».
${n(names, 1)}: And why should we care?
${n(names, 0)}: Because «reason». First: «point one».
${n(names, 2)}: [laughs] «a joke or an example»!
${n(names, 0)}: Second: «point two». And third: «point three».
${n(names, 1)}: So, in short, «summary».
${n(names, 0)}: Exactly. See you in the next one!`,
  },
  {
    id: "news",
    label: "News bulletin",
    tip: "Headline, the story, a reaction, sign-off. For the News desk look.",
    build: (names, lang) =>
      lang === "el"
        ? `${n(names, 0)}: Καλησπέρα. Η είδηση της ημέρας: «τίτλος».
${n(names, 0)}: «Τι έγινε, πού, πότε».
${n(names, 1)}: Και τι σημαίνει αυτό για εμάς;
${n(names, 0)}: «Τι σημαίνει».
${n(names, 0)}: Αυτά για σήμερα. Καλό βράδυ.`
        : `${n(names, 0)}: Good evening. Today's headline: «headline».
${n(names, 0)}: «What happened, where, when».
${n(names, 1)}: And what does that mean for us?
${n(names, 0)}: «What it means».
${n(names, 0)}: That's all for today. Good night.`,
  },
  {
    id: "podcast",
    label: "Podcast chat",
    tip: "Two people talking it through, back and forth. For the Podcast look.",
    build: (names, lang) =>
      lang === "el"
        ? `${n(names, 0)}: Λοιπόν, σήμερα θέλω να σε ρωτήσω κάτι. «ερώτηση»;
${n(names, 1)}: [laughs] Καλή ερώτηση. Νομίζω ότι «απάντηση».
${n(names, 0)}: Σοβαρά; Εγώ πάντα πίστευα «αντίθετη άποψη».
${n(names, 1)}: Κι εγώ, μέχρι που «ιστορία».
${n(names, 0)}: Οπότε, το συμπέρασμα;
${n(names, 1)}: «συμπέρασμα».`
        : `${n(names, 0)}: So, today I want to ask you something. «question»?
${n(names, 1)}: [laughs] Good question. I think «answer».
${n(names, 0)}: Really? I always thought «other view».
${n(names, 1)}: So did I, until «story».
${n(names, 0)}: So, what's the takeaway?
${n(names, 1)}: «takeaway».`,
  },
  {
    id: "promo",
    label: "30-second promo",
    tip: "Hook, promise, call to action. Short and punchy, for the Promo look.",
    build: (names, lang) =>
      lang === "el"
        ? `${n(names, 0)}: [excited] Ξέρεις ότι «εντυπωσιακό γεγονός»;!
${n(names, 1)}: Στο «όνομα» θα μάθεις «τι κερδίζεις».
${n(names, 0)}: Ξεκίνα σήμερα: «σύνδεσμος ή κάλεσμα»!`
        : `${n(names, 0)}: [excited] Did you know that «surprising fact»?!
${n(names, 1)}: At «name» you'll learn «what you get».
${n(names, 0)}: Start today: «link or call to action»!`,
  },
  {
    id: "interview",
    label: "Interview",
    tip: "Questions and answers between a host and a guest. For the Interview look.",
    build: (names, lang) =>
      lang === "el"
        ? `${n(names, 0)}: Σήμερα έχουμε μαζί μας «καλεσμένο». Καλώς ήρθες!
${n(names, 1)}: Ευχαριστώ πολύ για την πρόσκληση.
${n(names, 0)}: Πες μας, «πρώτη ερώτηση»;
${n(names, 1)}: «απάντηση».
${n(names, 0)}: Και κάτι τελευταίο: «τελευταία ερώτηση»;
${n(names, 1)}: «απάντηση». Ευχαριστώ!`
        : `${n(names, 0)}: Today we have «guest» with us. Welcome!
${n(names, 1)}: Thanks so much for having me.
${n(names, 0)}: Tell us, «first question»?
${n(names, 1)}: «answer».
${n(names, 0)}: And one last thing: «last question»?
${n(names, 1)}: «answer». Thank you!`,
  },
];
