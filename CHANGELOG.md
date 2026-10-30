# Changelog

All notable changes to Video Forge. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Nothing is tagged yet; everything below is under Unreleased.

## [Unreleased]

### Added (27–30 Oct 2026, batch 2 and 3)
- Drawn characters: smoother movement layer, in-between poses, round smiles, beards that follow the jaw, shoes, elbows and knees that bend, Karagiozis looks, 1.5-eye turning heads.
- Sets: news desk, conference room, conference stage, podcast (facing or split screen), game show; speakers are seated, legs hidden.
- Animated pop-ups: `[pop red flag]`, `[pop d20]` or `[🎉]` in a line; 52 code-drawn icons for Ak's subjects.
- Costumes: 26 new wardrobe pieces and 21 one-click costume packs ("Dress as…").
- Caption styles: bold box, karaoke, one word, clean outline, lesson bar, plus forge sweep, comic burst and ink drop; "Words shown" and "Keep said words coloured".
- docs/AI-BRIEF.md: what the forges can and can't make, for an AI that plans series and writes scripts.

### Changed (25 Oct 2026)
- Full-body puppets no longer get the waveform ring around them: adding one (or picking one on a speaker) switches that speaker's ring off. It can still be switched back on in the speaker's waveform settings.
- The label on the picture and in the MP4 notes now reads "Made with Video Forge" (was "Made with AI · Video Forge").

### Added (13 Oct 2026)
- Cast "+" menu: every character has a live face (blinks, talks on hover), grouped Ready-made / Made in Image Forge / My library; "Order it from Image Forge" and "Open Image Forge".
- Puppet shelf: live faces and a two-click delete (moved to `%APPDATA%\Forge\puppets-deleted`, not erased).
- Automatic gestures: question = shrug, "this / here / look / αυτό / εδώ" = point, longer lines = explain; per-speaker "How much they gesture" slider. Tags `[waves] [points] [shrugs] [explains]` still work.
- Make: "Also as" Tall 9:16, Square 1:1, Portrait 4:5, Wide 16:9.
- Make: "Also in English/Greek" twin video (script translated by Gemini, same cast, matching subtitles).
- Make: "Made with AI · Video Forge" label on the picture (on by default) and in the MP4's comment metadata.
- `.srt` and `.vtt` subtitle files beside every video.
- Greek stress fixer: Greek words typed without a tonos get one before the voice speaks (subtitles unchanged); Settings → "Say it like this" word list.
- Settings → Language card (English now; Greek, French, German, Spanish, Portuguese coming soon).
- Hover help bubble on every control, shared with Image Forge, plus `tools/lib/hoverHelp.test.mjs`.
- Many videos: output folder named `<sheet> · <date> · <n> videos`.
- Shared keys file now also carries openai, groq, elevenlabs and fish names.

### Changed
- Smoother mouths: shapes held ~100 ms, look-alikes merged in fast speech, quick consonants skipped, short vowels half-open, half-open in-betweens (visemes 10, 11, 12).
- Primary buttons are readable (lighter gradient).

### Fixed
- Arm pictures were never loaded; now they are. Whole-body poses replace the resting body.
- Frame thickness and gestures now reach the final render.
- Boiling waveform now shows in the preview (SVG id clash).
- Sample subtitles alternate Greek and English before narration exists.

### Earlier (12-13 Oct 2026)
- Many videos from a Google Sheet or CSV; Cast "Puppet" section with frame thickness; "around the video" waveform position; keys shared with Image Forge; puppets from Image Forge shelf.
- Renamed from BYOK-Vid-Creator to Video Forge (9 Oct).
