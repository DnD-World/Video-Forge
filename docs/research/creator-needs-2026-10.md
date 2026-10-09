# What free-video creators need - research for Video Forge

Date of research: 2026-10-09. Read-only research; no code changed.

## How to read this

- Every fact has a source link next to it. Where I could not find a source, I say "not verified".
- The ranking in section 2 is my judgement, based on how often and how angrily a problem shows up. It is not a measured survey. Nobody has polled "free video creators" in a way I could find.
- Reddit, Trustpilot and App Store quotes are single voices. They show what people say, not how many feel it.
- Prices and free-plan limits change often. Several sources disagree (flagged in the tables). Re-check before quoting any number publicly.

Tools that worked:

| Tool | Result |
|---|---|
| research-agent `read_page` | Worked (Reddit, GitHub, Trustpilot, Remotion, Steam). Failed once on veadotube.com. |
| research-agent `web_search` | Failed on every call ("Error executing tool"), 6 tries. Logged with `report_issue`. |
| Firecrawl search | Worked for 8 searches, then hit a rate limit (429). |
| Parallel `web_search` | Worked; used for the rest. |
| GitHub public API (curl) | Star counts, licences, last-push dates, top issues. All numbers taken 2026-10-09. |

---

## 1. Short answer

People who make videos for free want, in this order: (1) a free tool that is really free - no watermark, no export cap; (2) no surprise bills or burnt credits; (3) a tool they can trust with their files; (4) something that installs and runs without a fight; (5) a first video in minutes.

The gap Video Forge fits: nobody does "same cast of characters, several voices, finished lesson, many lessons at once, on my own PC, free". The cloud tools do pieces of it and charge for it. The open-source tools do the assembly but make users fight setup and have no recurring characters.

**One risk that is bigger than any feature: the Remotion licence (see section 7, item 1).**

---

## 2. Top 15 needs, ranked (my judgement)

| # | Need | One-line evidence | Source |
|---|---|---|---|
| 1 | **Free that is really free**: no watermark, no export cap, no account | CapCut users furious that features, watermark removal and export counts moved behind a paywall ("I only got 2 times to export my videos"). | https://www.reddit.com/r/CapCut/comments/1htbzyu/people_who_are_upset_that_capcut_is_not_free/ |
| 2 | **Predictable cost** - no credits that vanish | InVideo reviewers: 75 credits burned on one bad short video; support refused a refund. | https://www.trustpilot.com/review/ai.invideo.io?page=4 and https://www.reddit.com/r/videography/comments/1tor62z/invideo_ai_review_poor_results_and_experience/ |
| 3 | **Trust**: my files and my rights stay mine | CapCut's terms caused a panic about a "perpetual" licence over user content; CapCut says nothing changed. | https://www.reddit.com/r/CapCut/comments/1lgh087/to_anyone_panicking_about_capcuts_new_terms_of/ and https://www.capcut.com/resource/about-capcut-terms-of-service |
| 4 | **Installs and runs without a fight** (Windows one-click) | The most-requested thing in MoneyPrinterTurbo's issues is a "Windows one-click package"; setup and voice errors dominate its top issues. | https://github.com/harry0703/MoneyPrinterTurbo/issues/132 and https://github.com/harry0703/MoneyPrinterTurbo/issues/56 |
| 5 | **First video fast, little to learn** | A Shotcut fan says it "takes less than a day to learn"; Kdenlive's interface "sucked"; a DaVinci Resolve beginner "can't change portrait or landscape" and feels "stupid". | https://www.reddit.com/r/linuxmint/comments/1s0ygqu/video_editing_shotcut_is_criminally_underrated/ and https://www.reddit.com/r/ClipChamp/comments/1ro9nzo/clipchamp_just_sucks_now_but_i_still_need_an/ |
| 6 | **Auto captions in good-looking styles** | Captions are the most-praised CapCut feature; Shotcut praised for free built-in captions; OpusClip sells "animated captions" and "Hormozi style". | https://www.producthunt.com/products/capcut/reviews and https://www.opus.pro/alternatives/repurpose-io |
| 7 | **Natural voices, many languages, correct pronunciation** | Instructional designers: Synthesia "voiceovers are not too good"; text-to-speech "mispronounces names, jargon, acronyms". | https://www.reddit.com/r/instructionaldesign/comments/1k0bhoz/what_are_your_experiences_using_synthesia and https://www.readspeaker.com/blog/elearning-voice-over |
| 8 | **Script in, finished video out, in one tool** | Reviewer: Canva AI video has "no script, no voiceover, no captions, 4-second clips, manual assembly". A Reddit user's favourite tool is the one that "does everything in one platform". | https://fluxnote.io/guides/canva-ai-video-generator-review and https://www.reddit.com/r/NewTubers/comments/1cei9b2/best_ai_video_generator_for_faceless_channels/ |
| 9 | **The same character in every video** (mascot / cast) | A channel owner says character consistency is "what I really need"; a MoneyPrinterTurbo user asks if it can keep a recurring 3D character the same across scenes (no answer on the page); another creator calls AI character consistency "a massive trap". | https://www.reddit.com/r/NewTubers/comments/1cei9b2/best_ai_video_generator_for_faceless_channels/ and https://github.com/harry0703/MoneyPrinterTurbo/issues/1522 and https://www.reddit.com/r/NewTubers/comments/1q5d01l/how_do_you_actually_start_a_new_faceless_channel/ |
| 10 | **Batch: many videos from a list** | MoneyPrinterTurbo lists batch generation as a headline feature; a faceless creator ran "4 videos a day" until the price jumped. | https://github.com/harry0703/MoneyPrinterTurbo and https://www.reddit.com/r/NewTubers/comments/1cei9b2/best_ai_video_generator_for_faceless_channels/ |
| 11 | **Vertical and wide from one project** | MoneyPrinterTurbo ships 9:16, 16:9 and 1:1; OpusClip sells "AI reframe" for each shape. | https://github.com/harry0703/MoneyPrinterTurbo and https://www.opus.pro/ |
| 12 | **Doesn't crash, doesn't lose work** | Kdenlive user: 3-4 crashes per 4-5 hours of work; CapCut desktop reviewer: crashes exporting videos over five minutes. | https://www.reddit.com/r/kdenlive/comments/1ioda0f/we_need_to_be_more_honest_and_open_about and https://checkthat.ai/brands/capcut/reviews |
| 13 | **Stock footage and music with a clear licence** | MoneyPrinterTurbo pulls free stock from Pexels/Pixabay; a faceless music-channel user is asked whether free Suno tracks carry a royalty claim. | https://github.com/harry0703/MoneyPrinterTurbo and https://www.reddit.com/r/NewTubers/comments/1q5d01l/how_do_you_actually_start_a_new_faceless_channel/ |
| 14 | **Long video to shorts** | OpusClip's whole product; its free plan is 60 minutes of processing per month. | https://www.opus.pro/ |
| 15 | **Posting / upload handled for me** | MoneyPrinterTurbo advertises one-click publish to TikTok, Instagram, YouTube Shorts; AutoShorts / Faceless.so sell auto-posting. | https://github.com/harry0703/MoneyPrinterTurbo and https://www.heygen.com/blog/best-ai-video-generator-faceless-youtube |

Gaps in the evidence (honest):
- **Thumbnails**: I found only one passing mention (a creator using an image AI for thumbnail art, in the NewTubers faceless thread above). No strong demand signal either way. Image Forge covers it anyway.
- **Product Hunt**: CapCut's page summarises 43 reviews as praising ease, templates, captions and criticising "increasingly aggressive paywalls, watermarks, weak sync, lag, slow exports, poor billing or support" (AI-written summary, not individual reviews). https://www.producthunt.com/products/capcut/reviews
- **Reddit coverage**: r/NewTubers, r/CapCut, r/ClipChamp, r/instructionaldesign, r/videography, r/kdenlive, r/linuxmint and r/OpenShot were read. r/elearning, r/SideProject, r/facelessYouTube and r/AItools were not reached with usable threads.

---

## 3. Pain points per competitor

Plain-language reading of "free tier": what you get without paying.

| Tool | Free tier today | What people hate | Sources |
|---|---|---|---|
| **CapCut** | Exists, but many once-free features and watermark removal now need Pro. Third-party article says free export is capped at 1080p. | Paywalling basics ("including basic transitions"); one user says only 2 exports; Trustpilot 1.2 out of 5 from about 1,330 reviews, mostly billing and subscription complaints; terms-of-service fear (CapCut says the "User-generated Content" section did not change). Desktop crashes on longer exports (one review). | https://www.reddit.com/r/CapCut/comments/1htbzyu/people_who_are_upset_that_capcut_is_not_free/ ; https://www.trustpilot.com/review/www.capcut.com ; https://www.capcut.com/resource/about-capcut-terms-of-service ; https://www.pdfchef.com/video-fix/clipchamp-free-plan-limitations/ |
| **Canva video** | Exports have no watermark only if you use free elements; adding any Pro item adds one. AI video: 5 lifetime free credits, 4-second silent clips. | AI clips have no voice-over, no memory between clips (no recurring character); AI credits run out in 1-2 weeks on Pro (as reported by a third-party review). Canva says it does not claim your content or train AI on it without permission. | https://www.canva.com/video-editor/ ; https://fluxnote.io/guides/canva-ai-video-generator-review |
| **Clipchamp** | Free export up to 1080p, no watermark (Microsoft's own pages). | Reddit: "just sucks now", slow and laggy, edits lost "in the Bermuda Triangle of OneDrive"; free plan has no cloud backup and fewer premium stock items. (The "3 exports a month" complaint in that thread is about a different tool, Elevate.) | https://clipchamp.com/en/pricing/ ; https://support.microsoft.com/en-us/clipchamp/what-are-the-clipchamp-paid-plans-and-how-do-they-work ; https://www.reddit.com/r/ClipChamp/comments/1ro9nzo/clipchamp_just_sucks_now_but_i_still_need_an/ |
| **DaVinci Resolve (free)** | Really free, no watermark; output limited to Ultra HD or lower, one GPU on Windows. | Windows minimum is 16 GB RAM and a graphics chip with at least 4 GB video memory; a beginner got lost changing portrait/landscape; another user: "a monster, but you need a powerful machine". | https://www.blackmagicdesign.com/support/content/readme/59dd4eef1f4941c29fb8dc48b33f5c87 ; https://www.reddit.com/r/ClipChamp/comments/1ro9nzo/clipchamp_just_sucks_now_but_i_still_need_an/ ; https://www.reddit.com/r/kdenlive/comments/1ga2zy2/i_want_to_make_meme_videos_for_fun_and_was/ |
| **Kdenlive** | Free, open source. | "Steep learning curve"; slow for vertical short clips; crashes (one user: 3-4 per 4-5 hours); a commenter says it does not use the graphics card. Praised for session recovery. | https://www.reddit.com/r/software/comments/nh6n2t/kdenlive_vs_shotcut_which_is_more_feature_rich/ ; https://www.reddit.com/r/linuxmint/comments/1s0ygqu/video_editing_shotcut_is_criminally_underrated/ ; https://www.reddit.com/r/kdenlive/comments/1ioda0f/we_need_to_be_more_honest_and_open_about ; https://www.reddit.com/r/kdenlive/comments/174fbva/kdenlive_is_unreliable_broken_unoptimized_and |
| **Shotcut** | Free, open source. | Mostly praise ("more advanced CapCut", free Whisper captions). Complaint: confusing for animating text and graphics. | https://www.reddit.com/r/linuxmint/comments/1s0ygqu/video_editing_shotcut_is_criminally_underrated/ ; https://www.reddit.com/r/kdenlive/comments/17fqasc/good_old_question_kdenlive_vs_olive_vs/ |
| **OpenShot** | Free, open source. | Lag and stutter in preview, crashes on import (several Reddit threads; evidence is thin and some is from 2019). | https://www.reddit.com/r/OpenShot/comments/1d9xr0u/openshot_lags_very_bad_on_my_computer ; https://www.reddit.com/r/OpenShot/comments/bl6oi5/a_review_of_openshot |
| **InVideo AI** | Free: 10 AI minutes and 4 watermarked exports a week (figures from competitor Pictory's blog and a third-party review; no commercial use on free per Arcade). | Credits vanish: 75 credits on one short video, "over 360 credits" to finish one video, refunds refused; ignored instructions; repeated clips. | https://pictory.ai/blog/pictory-vs-invideo ; https://www.arcade.software/post/ai-video-generator-free ; https://www.trustpilot.com/review/ai.invideo.io?page=4 ; https://www.reddit.com/r/videography/comments/1tor62z/invideo_ai_review_poor_results_and_experience/ |
| **Pictory** | 14-day watermarked trial, no permanent free plan (Pictory's own blog). | AI voice is made scene by scene, so cutting scenes small makes the voice sound uneven (one user who bought a year). | https://pictory.ai/blog/pictory-vs-invideo ; https://www.reddit.com/r/NewTubers/comments/1cei9b2/best_ai_video_generator_for_faceless_channels/ |
| **HeyGen** | Free: 3 videos a month, 1 minute max, watermark. Sources disagree on resolution (720p vs 1080p). Creator plan $29/month removes the watermark. | Free is "a look at the interface", not usable for real posting; credit system; avatars still look unreal to some course makers. | https://www.arcade.software/post/heygen-pricing ; https://www.heygen.com/faq ; https://www.reddit.com/r/instructionaldesign/comments/1lvipol/what_am_i_missing_about_synthesia |
| **Synthesia** | Free plan with the Synthesia logo. Sources disagree: 3 minutes a month (third parties) vs 10 minutes (Synthesia's own page). Starter $29/month. | "Uncanny valley" avatars, "not worth the price point", voice-overs "not too good" (instructional designers). | https://www.synthesia.io/features/text-to-video ; https://fluxnote.io/guides/synthesia-pricing-2026 ; https://www.synthesia.io/pricing ; https://www.reddit.com/r/instructionaldesign/comments/1lvipol/what_am_i_missing_about_synthesia |
| **Vyond** | No free plan, 14-day trial. Starter $99/month or $699/year. | "Clunky", "nightmare editing text", overused: "the Comic Sans of eLearning"; everyone uses the same templates and characters; SCORM (LMS package) only on a $1,649/year Enterprise tier (per HeyGen's competing blog). | https://www.vyond.com/faqs/ ; https://www.reddit.com/r/instructionaldesign/comments/193jevl/anyone_else_hate_vyond/ ; https://www.heygen.com/blog/heygen-vs-synthesia-vs-ai-studios-vs-vyond |
| **Animaker** | Free plan with watermark; Basic $15/month removes it. | Watermark and low credits on free (company's own pricing page). | http://app.animaker.com/pricing |
| **Steve AI** | Free: 1,200 seconds of AI video, 200 credits; paid needed for HD and no watermark. | Limited downloads on free. | https://www.steve.ai/ |
| **VEED** | Free: 720p, watermark, 10 minutes per export, about 30 minutes of AI use per month. | Watermark and caps on the exact features creators want (captions). | https://sonary.com/b/veed/veed+creative-tools/ ; https://www.videocaptions.ai/blog/veed-free-plan-limits |
| **OpusClip** | Free-forever: 60 minutes of processing per month. | A rival (ShortClipr) claims OpusClip's free plan is watermarked; this is a competitor claim, not verified. | https://www.opus.pro/ ; https://shortclipr.com/ |
| **Faceless-video apps (Nullface, Faceless.io, AutoShorts)** | Paid. | Price hikes ($19.99 to $33/month for same output), shorter videos for the same money, outages with no refund. | https://www.reddit.com/r/NewTubers/comments/1cei9b2/best_ai_video_generator_for_faceless_channels/ |
| **Adobe Character Animator** | Free "Starter" mode (basic); full "Pro" mode needs a Creative Cloud subscription. | Needs a webcam performance workflow; not built for script-to-video batches (my reading of Adobe's description). | https://helpx.adobe.com/adobe-character-animator/using/overview.html |

Pattern across the table: the free tier is a demo. The watermark, the minute cap and the credits are the product's way of making you pay. Video Forge being free with no catch is the headline.

---

## 4. "Wow" features worth copying

The evidence here is thinner than for pain points. It is what products promote and what fans praise, plus your own stated taste.

| Wow feature | Who does it / evidence | Source |
|---|---|---|
| Pick a template, swap your clips, done (first video in minutes) | CapCut's template library is its core pull. | https://aitoolhunt.top/tools/capcut-ai.html |
| "Edit the video like a document": change the text, the video follows | Descript's main selling point. | https://help.descript.com/getting-started/edit-like-a-doc |
| 3 steps, 1 click, ready clips | OpusClip's pitch. | https://www.opus.pro/alternatives/repurpose-io |
| Caption look presets, one-click | OpusClip lists templates including a famous creator's style; ShortClipr claims 11 caption styles (competitor claim). | https://www.opus.pro/captions ; https://shortclipr.com/ |
| Free captions with no limit, locally | Shotcut fans cite "UNLIMITED AUTO-CAPTIONS" as the reason to switch. | https://www.reddit.com/r/linuxmint/comments/1s0ygqu/video_editing_shotcut_is_criminally_underrated/ |
| Same voice across clips so a whole channel sounds like one person | HeyGen markets this for faceless channels. | https://www.heygen.com/en-ca/tool/ai-youtube-shorts-generator |
| Same character across a series | Faceless.so lists a "character consistency feature". | https://www.heygen.com/blog/best-ai-video-generator-faceless-youtube |
| Instant preview that costs nothing | Remotion previews in its Player/Studio do not count as renders; only finished files do. | https://www.remotion.dev/docs/license/faq |
| Glass / liquid-glass polish | The reference you named (reactbits glass-surface, fluid-glass). | https://reactbits.dev/components/glass-surface |

Worth copying, in plain words:
1. A sample project that opens on first launch and plays a finished lesson instantly, so the first thing the user sees is the result.
2. A gallery of looks (captions, backgrounds, puppet styles) where one click changes the whole preview live.
3. A "make it again, different" button so batch output does not look copy-pasted.
4. One-sentence progress ("rendering lesson 4 of 12, about 6 minutes left").

---

## 5. Open-source competitors and neighbours

Stars and licences read from the GitHub API on 2026-10-09. "Last push" is the last code upload. A stale last-push date is a warning sign.

| Project | Stars | Licence | Last push | What it is | What users praise / complain | Source |
|---|---|---|---|---|---|---|
| MoneyPrinterTurbo | 129,310 | MIT | 2026-10-09 | Topic in, finished short video out (script, stock footage, voice, captions, music). Batch, 9:16 / 16:9 / 1:1, optional auto-publish. | Praise: breadth of features (from its own README). Complaints in top issues: voice generation errors (free Edge voice returning 403), setup trouble, requests for Windows one-click package and GPU video encoding. No characters; one user asked about recurring characters and got no answer on the page. | https://github.com/harry0703/MoneyPrinterTurbo ; https://github.com/harry0703/MoneyPrinterTurbo/issues/514 ; https://github.com/harry0703/MoneyPrinterTurbo/issues/171 |
| MoneyPrinterV2 | 32,071 | AGPL-3.0 | 2026-09-15 | Automation for shorts and posting. | Not researched in depth. | https://github.com/FujiwaraChoki/MoneyPrinterV2 |
| OpenCut | 93,321 | MIT | 2026-09-24 | "Open-source CapCut alternative" (web, desktop, mobile). Being rewritten from scratch; plans an AI-agent interface and batch rendering. | 375 open issues; top requests are mobile app and Chinese language. Shows how much people want a free CapCut. | https://github.com/OpenCut-app/OpenCut |
| ShortGPT | 8,010 | MIT | 2025-02-10 (stale) | AI short-video framework, free Edge voices, Pexels footage. | Top issues are install and rate-limit errors, "is there a way to use OpenAI for free". | https://github.com/RayVentura/ShortGPT |
| OpenShorts | 6,355 | MIT | 2026-10-09 | Open-source long-to-short clipper (from repo description). | Not researched in depth. | https://github.com/mutonby/openshorts |
| Remotion | 62,749 | Custom licence (see risk below) | 2026-10-09 | The video engine Video Forge uses. | Product Hunt: 5.0 stars from 59 reviews. | https://github.com/remotion-dev/remotion ; https://www.producthunt.com/categories/video-editing |
| Shotcut | 15,375 | GPL-3.0 | 2026-10-06 | Free editor. | Praised as beginner-friendly, free captions. | https://github.com/mltframework/shotcut |
| Kdenlive (GitHub copy) | 5,819 | GPL-3.0 | 2026-10-09 | Free editor. | Learning curve and crashes (see section 3). | https://github.com/KDE/kdenlive |
| OpenShot | 6,608 | not stated | 2026-10-09 | Free editor, simple. | Lag, import crashes. | https://github.com/OpenShot/openshot-qt |
| Olive | 9,132 | GPL-3.0 | 2024-12-05 (stale) | Free editor. | "Crashed a lot" in one thread. | https://github.com/olive-editor/olive ; https://www.reddit.com/r/kdenlive/comments/17fqasc/good_old_question_kdenlive_vs_olive_vs/ |
| PNGTuber-Remix | 387 | not checked | 2026-09-07 | Open-source PNG avatar app (streamers). | Tiny; shows the PNG-puppet idea is alive but small. | https://github.com/MudkipWorld/PNGTuber-Remix |
| Rhubarb Lip Sync | 2,645 | not stated | 2026-06-16 | Mouth-shape timing from audio (the idea behind puppet lip-sync). | Not researched for user opinions. | https://github.com/DanielSWolf/rhubarb-lip-sync |
| SadTalker / Wav2Lip (photo / video talking heads) | 14,122 / 13,232 | not stated / none | 2024 / 2025 | AI talking faces. | Realistic faces need a good graphics card (not verified with numbers here). SadTalker last push 2024-06. | https://github.com/OpenTalker/SadTalker ; https://github.com/Rudrabha/Wav2Lip |
| Open-Sora / Wan 2.1 | 29,865 / 17,135 | Apache-2.0 | 2026-04 / 2026-03 | Text-to-video AI models. | Different job (generate footage, not assemble a lesson). Hardware needs not verified here. | https://github.com/hpcaitech/Open-Sora ; https://github.com/Wan-Video/Wan2.1 |
| Voice engines Video Forge could use | Piper 11,297 (original) / 5,805 (new GPL fork, active); Kokoro 9,228; Chatterbox 26,819; whisper.cpp 54,249 | MIT / GPL-3.0 / Apache-2.0 / MIT / MIT | Piper original 2025-08; Kokoro 2025-08; others 2026 | Local voices and local captions. | Piper's own description: fast, local, tuned for a Raspberry Pi 4. | https://github.com/rhasspy/piper ; https://github.com/OHF-Voice/piper1-gpl ; https://github.com/hexgrad/kokoro ; https://github.com/resemble-ai/chatterbox ; https://github.com/ggml-org/whisper.cpp |
| veadotube (PNG streamer tool) | not verified | not verified | not verified | The site would not load in my tool. | Skipped; no numbers invented. | (fetch failed) |
| Adobe Character Animator alternatives | none found with real traction | - | - | I found no free open-source "Character Animator for script-to-video" with serious stars. The closest are small PNGTuber apps. | Treat as an open lane, but my search was not exhaustive. | see PNGTuber-Remix row |

Read of the table: the big open-source winners are the "type a topic, get a video" tools and the free CapCut clone. Nobody in this list combines recurring puppet characters, multi-voice scripts and lesson batches. The most-starred rival (MoneyPrinterTurbo) shows both the demand and the pain: huge stars, but its top issues are setup and voice failures.

---

## 6. Hardware reality

What I could source:

| Fact | Source |
|---|---|
| Steam survey, Sept 2026: Windows 11 on 71.34% of machines; most common memory is 32 GB (42.22%); most common screen is 1920x1080 (47.91%). | https://store.steampowered.com/hwsurvey/ |
| The Verge-reported figure via a summary: 32 GB RAM (42.2%) overtook 16 GB (37.8%) for the first time. | https://shattered.io/steam-hardware-survey-32gb-ram-rtx-5070-2026/ |
| Graphics memory: 16 GB cards (25.9%) overtook 8 GB cards (25.32%) in July 2026; cards under 16 GB are still the majority of users. | https://tech4gamers.com/16gb-vram-gpus-overtake-8gb ; https://gameluster.com/16gb-gpus-steam-survey |
| Most common single card: RTX 5070 at 5.86% in Sept 2026; RTX 3060 was the long-time leader (3.76% in the August survey); in June 2026 a laptop chip (RTX 4060 Laptop) led at 3.81%. | https://shattered.io/steam-hardware-survey-32gb-ram-rtx-5070-2026/ ; https://specclear.com/steam-hardware-survey-july-2026 ; https://hwbusters.com/news/steam-hardware-survey-a-laptop-gpu-tops-the-chart-for-the-first-time |
| DaVinci Resolve on Windows: minimum 16 GB RAM and a graphics chip with at least 4 GB of video memory. | https://www.blackmagicdesign.com/support/content/readme/59dd4eef1f4941c29fb8dc48b33f5c87 |
| Piper (local voices) is built to be fast on a tiny Raspberry Pi 4; Whisper (local captions) has a CPU-only C++ version. | https://github.com/lcsouzamenezes/piper-tts ; https://github.com/ggml-org/whisper.cpp |

Caution: the Steam survey counts gamers. People using free video tools are probably, on average, on weaker machines than this (my inference, not sourced). Plan for "a 5-year-old laptop with 8 GB RAM and no gaming card" as the floor, and treat anything better as a bonus.

What this means for local vs cloud (my reading):
- **Runs fine on a modest PC**: local voices (Piper), local captions (Whisper), puppet animation, waveforms, subtitles, and the final video render (slow but works on CPU).
- **Heavy on the graphics card**: AI talking faces and AI-generated video clips (SadTalker, Wan, Open-Sora). I did not find a sourced memory figure for these, so I am not stating one. Keep them optional.
- **Needs the internet**: bring-your-own-key voices and images, stock footage search (Pexels/Pixabay), auto-posting.
- Free cloud shortcuts break: MoneyPrinterTurbo's free Edge voice produces repeated 403 errors in its issue list. Do not make anyone depend on an unofficial free cloud voice. https://github.com/harry0703/MoneyPrinterTurbo/issues/514

---

## 7. What this means for Video Forge - 10 concrete suggestions

1. **Get the Remotion licence confirmed in writing before the public release. Risk, upfront.** Remotion is free for individuals, non-profits and for-profit teams up to 3 people. Its FAQ says organisations "building video editors, prompt-to-video tools" fall under a paid "Automators" plan ($0.01 per render, $100/month minimum) if they are not eligible for the free licence. It does not say what happens when an open-source app is handed to thousands of strangers who each render on their own PC. Also, its licence forbids selling or relicensing your own derivative, and Remotion 5.0 changes the licence. Email hi@remotion.dev, quote the app, and keep the answer in the repo. Sources: https://www.remotion.dev/docs/license/faq ; https://www.remotion.pro/license ; https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md
2. **Put "no catch" on the front page and in the app.** No watermark, no minute cap, no export count, no account, no credits for the local path. Show a table "Video Forge vs the others" using section 3. This is need #1 and #2, and it is the only claim the paid tools cannot copy.
3. **Make the first launch a one-click Windows installer with a sample lesson that already plays.** The most-requested item for the biggest rival was exactly this. The user's first minute should be watching a finished lesson, then pressing "make my own". Test it on a clean laptop with 8 GB RAM and no gaming card.
4. **A caption look gallery with live preview** (word-pop, karaoke, plain, big-and-bold, per-character colours), powered by local Whisper so it is free and unlimited. Captions are the most-praised free feature elsewhere.
5. **Make the cast the signature feature.** Save a "cast" (face, voice, colours) once; every lesson reuses it. Nobody in the research solves this well: it was asked for in MoneyPrinterTurbo and called a trap by a faceless creator. Add a "vary the look" control (backgrounds, layouts, intro/outro styles) so a 50-lesson batch does not look copy-pasted. Reason: YouTube has said it will not pay for "mass-produced or repetitive" channels, and clarified the rules again in July 2026. Sources: https://support.google.com/youtube/answer/1311392?hl=en ; https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/
6. **Batch that is safe to leave running.** If lesson 7 fails, lessons 1-6 are kept and the queue says why (a rival fixed exactly this: "preserve completed videos when a batch fails"). Show a time estimate per lesson. For bring-your-own-key voices and images, show an estimated cost before the run and a running total, because surprise bills are need #2. Source: https://github.com/harry0703/MoneyPrinterTurbo/pull/1597
7. **Voices: local first, honest about quality, easy to fix.** Local voices as default (free, offline). Add a pronunciation list (names, jargon) and a "redo this line only" button; mispronunciation is the standard complaint. Tell the user, per voice, "local" or "uses your key". Do not rely on unofficial free cloud voices (they fail with 403 errors in the biggest rival's issues).
8. **Light mode by default, quality mode on request.** Detect the machine; on a weak laptop use the CPU path and say how long it will take. Keep AI talking faces and AI footage optional and clearly labelled "needs a strong graphics card". Per your house rule, warn before long renders.
9. **One project, both shapes, plus "cut a short".** Keep the one-click vertical + wide export, and add a simple "turn this lesson into 3 short clips" using captions and chapter marks. This covers needs #11 and #14 without a cloud service.
10. **Course pack and trust.** For each lesson export: MP4 (wide), MP4 (vertical), captions file (SRT), a thumbnail from Image Forge, and a plain list of chapters. Vyond keeps its LMS package behind a $1,649/year tier, so a free equivalent is a real selling point for course makers. Add a plain-words privacy line ("your files never leave your PC unless you use a key service"), autosave with recovery, and a project folder users can copy. This answers the CapCut terms panic, the Clipchamp "lost in OneDrive" complaint and the crash complaints. Source: https://www.heygen.com/blog/heygen-vs-synthesia-vs-ai-studios-vs-vyond (competitor's blog; re-check the price before quoting).

---

## 8. Things I could not confirm

- Exact current CapCut free-tier limits (sources conflict).
- Synthesia free minutes (3 vs 10 per month) and HeyGen free resolution (720p vs 1080p).
- veadotube details and any "free Character Animator clone with traction".
- Memory needs of AI talking-face and video models (no sourced figure).
- How Remotion's licence applies to a free app that ships to end users (needs their written answer).
- Whether OpenShot's 2019 lag reports still apply.
- Music licensing rules for AI music services (only one forum question found).
