# Move tags

Every tag a **drawn character** acts out, written in square brackets in the script:
`Maria: [walks in] Good morning!`. The longest matching words win, so `[walks in from the right]`
beats `[walks in]`. Generated from the motion library by `node tools/move-tags.mjs`; do not edit by hand.

- **Style word** after a move changes how it looks: `graceful`, `aggressive`, `tired`, `shy`, `proud`, `playful`, `sneaky` (e.g. `[walks in tired]`, `[waves shyly]`).
- **Props**: name one and the character holds it: `[drinks his coffee]`, `[gives the flowers to Maria]`.
- **Sounds are not moves.** `[laughs]`, `[cries]`, `[gasps]` go to the voice, which performs them (docs/WRITING-SCRIPTS.md).
- 🎥 = copied from a real person's recorded movement (free motion-capture libraries), not hand-animated.

73 moves, 154 tags.

## Gestures

Arms and hands; the body stays where it is.

| Move | Tags | What it does |
|---|---|---|
| Answers the phone 🎥 | `[answers the phone]` | Copied from a real person: answers the phone. |
| Argues 🎥 | `[argues]` `[rants]` | Copied from a real person: argues. |
| Bow | `[bows]` `[bow]` `[takes a bow]` `[υποκλίνεται]` | A polite bow from the waist, best seen side on. |
| Casts a spell 🎥 | `[casts a spell]` | Copied from a real person: casts a spell. |
| Cries (2) 🎥 | `[weeps]` | Copied from a real person: cries (2). |
| Depressed 🎥 | `[is depressed]` `[slumps]` | Copied from a real person: depressed. |
| Depressed walk 🎥 | `[trudges]` | Copied from a real person: depressed walk. |
| Drink | `[drinks]` `[sips]` `[has a sip]` `[πίνει]` | Lifts a cup (or whatever they hold) to the mouth for a sip. |
| Excited walk 🎥 | `[walks excitedly]` | Copied from a real person: excited walk. |
| Explain | `[explains]` `[explaining]` `[gestures]` `[εξηγεί]` | Talking with the hands: the front hand beats along with the words. |
| Explains with hands 🎥 | `[talks with hands]` | Copied from a real person: explains with hands. |
| Facepalm | `[facepalms]` `[facepalm]` `[head in hand]` | Hand to the face, head down: oh no. |
| Formal walk 🎥 | `[walks formally]` | Copied from a real person: formal walk. |
| Gangly teen waiting 🎥 | `[slouches]` | Copied from a real person: gangly teen waiting. |
| Gets hit (chest) 🎥 | `[is struck]` | Copied from a real person: gets hit (chest). |
| Gets hit (head) 🎥 | `[gets hit]` | Copied from a real person: gets hit (head). |
| Happy 🎥 | `[is happy]` | Copied from a real person: happy. |
| Happy (2) 🎥 | `[beams]` | Copied from a real person: happy (2). |
| Happy walk 🎥 | `[walks happily]` | Copied from a real person: happy walk. |
| Hard day's drink 🎥 | `[has a drink]` | Copied from a real person: hard day's drink. |
| Jab 🎥 | `[punches]` | Copied from a real person: jab. |
| Jump and cheer | `[cheers]` `[jumps]` `[jumps for joy]` `[celebrates]` `[πανηγυρίζει]` `[πηδάει]` | A little crouch, a jump with both fists up, and a soft landing. |
| Laughs 🎥 | `[bursts out laughing]` | Copied from a real person: laughs. |
| Laughs hard 🎥 | `[laughs hard]` `[cracks up]` | Copied from a real person: laughs hard. |
| Old man waiting 🎥 | `[waits like an old man]` | Copied from a real person: old man waiting. |
| Open the box | `[opens the box]` `[opens the present]` `[opens the gift]` `[unwraps]` `[ανοίγει]` | Holds a box in front and lifts the lid, surprised. |
| Picks up from table 🎥 | `[picks it up]` | Copied from a real person: picks up from table. |
| Point | `[points]` `[point]` `[points to the side]` `[shows]` `[δείχνει]` | Points out to the side with one finger. Holds as long as the line needs. |
| Quarrels (2) 🎥 | `[fights back]` | Copied from a real person: quarrels (2). |
| Quarrels (angry hands) 🎥 | `[quarrels]` `[snaps at]` | Copied from a real person: quarrels (angry hands). |
| Reaches and presses 🎥 | `[presses the button]` | Copied from a real person: reaches and presses. |
| Sad 🎥 | `[is sad]` `[droops]` | Copied from a real person: sad. |
| Sad (2) 🎥 | `[looks sad]` | Copied from a real person: sad (2). |
| Sad walk 🎥 | `[walks sadly]` | Copied from a real person: sad walk. |
| Scared 🎥 | `[is scared]` `[cowers]` | Copied from a real person: scared. |
| Shrug | `[shrugs]` `[shrug]` `[σηκώνει τους ώμους]` | Both hands up and open: who knows? |
| Shrugs (3) 🎥 | `[who knows]` | Copied from a real person: shrugs (3). |
| Shy 🎥 | `[acts shy]` `[is bashful]` | Copied from a real person: shy. |
| Shy walk 🎥 | `[walks shyly]` | Copied from a real person: shy walk. |
| Stands waiting 🎥 | `[stands around]` | Copied from a real person: stands waiting. |
| Stretches and yawns 🎥 | `[yawns]` `[stretches]` | Copied from a real person: stretches and yawns. |
| Sword attack 🎥 | `[swings a sword]` | Copied from a real person: sword attack. |
| Talking (idle) 🎥 | `[talks]` `[chats]` | Copied from a real person: talking (idle). |
| Thumbs up | `[thumbs up]` `[gives a thumbs up]` `[μπράβο]` | A thumbs up in front of the chest, with a smile. |
| Very happy 🎥 | `[is overjoyed]` `[is thrilled]` | Copied from a real person: very happy. |
| Waits 🎥 | `[waits impatiently]` | Copied from a real person: waits. |
| Waits (bored) 🎥 | `[waits]` `[is bored]` | Copied from a real person: waits (bored). |
| Walks angrily 🎥 | `[storms around]` | Copied from a real person: walks angrily. |
| Wave | `[waves]` `[wave]` `[waves hello]` `[waves goodbye]` `[greets]` `[χαιρετά]` `[κουνάει το χέρι]` | A friendly wave with the hand up by the head. |
| Waves and points 🎥 | `[directs]` | Copied from a real person: waves and points. |
| Yawns, stretches, grabs 🎥 | `[grabs angrily]` | Copied from a real person: yawns, stretches, grabs. |

## Poses

A position the character takes and holds while the line lasts.

| Move | Tags | What it does |
|---|---|---|
| Arms crossed | `[crosses arms]` `[arms crossed]` `[folds arms]` `[σταυρώνει τα χέρια]` | Arms folded across the chest. Held until the line ends. |
| Hands on hips | `[hands on hips]` `[puts hands on hips]` | Hands on the hips, elbows out. Held until the line ends. |

## Stances

How the character stands or sits for the line.

| Move | Tags | What it does |
|---|---|---|
| Chin in hand (seated) 🎥 | `[rests chin in hand]` `[ponders]` | Copied from a real person: chin in hand (seated). |
| Dies 🎥 | `[dies]` | Copied from a real person: dies. |
| Face in hands (seated) 🎥 | `[buries face in hands]` | Copied from a real person: face in hands (seated). |
| Fidgets (seated) 🎥 | `[fidgets]` `[is restless]` | Copied from a real person: fidgets (seated). |
| Kneels and fixes 🎥 | `[kneels]` | Copied from a real person: kneels and fixes. |
| Pounds the table, points 🎥 | `[pounds the table]` | Copied from a real person: pounds the table, points. |
| Scared (2) 🎥 | `[flinches]` | Copied from a real person: scared (2). |
| Sit down | `[sits down]` `[sits]` `[takes a seat]` `[κάθεται]` | Sits down and stays sitting until told to stand up. |
| Stand up | `[stands up]` `[gets up]` `[rises]` `[σηκώνεται]` | Gets up from sitting. |
| Surprised 🎥 | `[is surprised]` | Copied from a real person: surprised. |
| Talks seated 🎥 | `[talks seated]` | Copied from a real person: talks seated. |
| Thinker 🎥 | `[thinks]` `[muses]` | Copied from a real person: thinker. |
| Thinks, ankle on knee (seated) 🎥 | `[thinks it over]` | Copied from a real person: thinks, ankle on knee (seated). |

## Idle

Small movement while waiting or listening.

| Move | Tags | What it does |
|---|---|---|
| Little dance | `[dances]` `[dance]` `[χορεύει]` | A bouncy little dance that loops as long as it is asked to. |

## Moving around

Walking, running, coming in and going out.

| Move | Tags | What it does |
|---|---|---|
| Run across | `[runs across]` `[runs past]` `[dashes across]` `[τρέχει]` | Runs across the whole picture from left to right. |
| Walk in | `[walks in]` `[enters]` `[comes in]` `[arrives]` `[μπαίνει]` `[έρχεται]` | Walks in from the left side of the picture to their place, then turns to the camera. |
| Walk in from the right | `[walks in from the right]` `[enters from the right]` `[comes in from the right]` | Walks in from the right side of the picture to their place. |
| Walk out | `[walks out]` `[leaves]` `[exits]` `[walks off]` `[φεύγει]` `[βγαίνει]` | Turns and walks out of the picture to the right. |

## With someone else

Two characters together; name the other one: [gives the box to Maria].

| Move | Tags | What it does |
|---|---|---|
| Give | `[gives]` `[hands]` `[passes]` `[δίνει]` | Holds something out to the other speaker and lets go. |
| Receive | `[takes]` `[receives]` `[accepts]` `[παίρνει]` | Reaches out and takes what the other speaker holds out. |
