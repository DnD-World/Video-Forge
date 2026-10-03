# 🎬 BYOK-Vid-Creator

**Bring Your Own Keys. Build cinematic, talking-avatar videos — locally, deterministically, beautifully.**

<p align="center">
  <a href="https://BYOK-Vid-Creator.stravelakis.com">Live Site</a> ·
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#roadmap">Roadmap</a>
</p>

---

## What is this?

BYOK-Vid-Creator is a **desktop studio** for producing narrated, subtitled,
avatar-driven videos with animated audio waveforms — in Greek and English.

It is **not** a generative-video toy. Every frame is **deterministic**:
what you arrange on the canvas is exactly what renders. Voices run free on
your own computer; online services (AI scripts, stock clips, sound effects)
are optional and use your own free keys. Rendering happens **on your
machine** via a bundled Remotion + FFmpeg pipeline.

> Designed for creators who want **repeatable, polished output** — not
> a slot machine.

## ✨ Features

- 🎙️ **Free local voices** — Piper, Greek and English, no account needed
- 🧭 **Five guided steps** — Setup › Cast › Script › Look › Render, with a sample project to start from
- ✅ **Script checker** — catches misspelt names and broken lines before any voice is made
- ✍️ **AI script drafts** (optional, free NVIDIA key)
- 👄 **Lip-sync** — mouth shapes timed from the voice track
- 🧑‍🤝‍🧑 **Built-in characters** — drag, resize, snap; save your own to a library
- 📝 **Subtitles** — active-word glow, full styling, SRT export
- 🌊 **Audio-reactive waveforms** — six styles; only the active speaker animates
- 🎼 **Music with auto-ducking**, CC0 sound effects from Freesound
- 🎞️ **Background clips** from Pixabay and Pexels, planned from the script
- 🖥️ **Local rendering** — 9:16 and 16:9, with a time estimate before you start

**Coming soon:** studio-quality voices (DramaBox, Chatterbox), more free
voice options, intro/outro image cards.

## 🚀 Quick Start

```bash
git clone https://github.com/DnD-World/BYOK-Vid-Creator.git
cd BYOK-Vid-Creator
npm install
npm run dev
```

> The app opens on a welcome screen — choose **Try the sample**, press
> **Make the voice track**, then **Render**.
> Recommended: NVIDIA 8 GB GPU · 32 GB RAM. Rendering takes roughly
> 2.5× the video's length (an 8-minute video ≈ 21 minutes).

## 🗺️ Roadmap
- Studio voices (DramaBox) and more free/free-tier voice engines — see `docs/TTS-OPTIONS.md`
- Step-by-step in-app guides for the advanced features — see `docs/EASE-OF-USE-PLAN.md`
- Batch production of a whole series from a spreadsheet, inside the app
- Intro / outro image cards

## 🤖 Built With AI
This project was designed and engineered in collaboration with AI systems:
- You.com — orchestration & research
- Anthropic Claude Opus 4.8 — architecture, code generation, lip-sync design
- Hermes Agent — automation
- Google Flow — media workflow support
- Human direction & product vision: Stravelakis.
## 📄 License
TBD.
