# Changelog

All notable changes to Video Forge. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Nothing is tagged yet; everything below is under Unreleased.

## [Unreleased]

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
