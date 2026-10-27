# Free media + free AI tiers for Video Forge / Image Forge

Research date: 2026-10-25. Every page below was read on that date (read-only; nothing signed up for, nothing downloaded).
Rule applied: zero money, stable, secure, legal, commercial use OK (YouTube/social + paid LMS courses).
Marking: **VERIFIED** = read on the official page. **UNVERIFIED** = secondary source or my background knowledge, must be re-checked before building.

Tool note: research-forge `web_search`/`read_page` used first. Firecrawl used where read_page returned only a nav bar/cookie wall/block (Openverse docs, Mixkit, Coverr developers, ccMixter, Unsplash, Videvo). WebFetch once (empty). No limit was hit. A Firecrawl result for unsplash.com/documentation was auto-saved by the harness to its own tool-results store; I did not open that file.

---

## 0. Biggest findings (read first)

| # | Finding | Source (read 2026-10-25) |
|---|---|---|
| 1 | **Pexels is not usable for new users right now.** Pexels API page: "New API key issuance is currently paused and cannot be requested." Community posts date it from ~30 Sep 2026, no reopening date (UNVERIFIED secondary). Existing keys reportedly keep working (UNVERIFIED). So "each user brings their own Pexels key" fails today. | https://www.pexels.com/api/ ; https://help.pexels.com/hc/en-us/articles/900004904026-How-do-I-get-an-API-key |
| 2 | **Pexels and Pixabay both changed their Terms of Service on 20 Oct 2026** (5 days ago; both are Canva Germany brands). Re-read before shipping; build a "licence rules version" field into the app. | https://www.pexels.com/terms-of-service/ ; https://pixabay.com/service/terms/ |
| 3 | **Gemini API free tier cannot legally back a distributed app for EU users.** Terms: "You may use only Paid Services when making API Clients available to users in the European Economic Area, Switzerland, or the United Kingdom." (Ak is in the EEA.) Outside EEA the free tier lets Google train on prompts and human reviewers read them. | https://ai.google.dev/gemini-api/terms |
| 4 | **Free ElevenLabs cannot be used commercially** (no commercial licence, attribution required). Not usable for paid LMS / monetised YouTube. | https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform |
| 5 | **Unsplash API is a bad fit**: must hotlink, must ping a download endpoint, must show photographer+Unsplash credit on every display, and "applications should not require users to register for a developer account" (kills BYOK). | https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines |
| 6 | **Tenor API is dead** (no new clients since Jan 2026, discontinuation notice on Google's page; news reports shutdown 30 Jun 2026 - UNVERIFIED date). **Giphy**: not a content licence + "Powered by Giphy" + may not build a GIF index. Skip both. | https://developers.google.com/tenor ; https://support.giphy.com/hc/en-us/articles/360028134111-GIPHY-API-Terms-of-Service- |
| 7 | **Several "free" sources forbid use with AI** (Coverr, unDraw, Sonniss; Pexels/Pixabay forbid scraping for ML). Do not feed these assets into Image Forge as reference/training material without a deliberate check. | see rows below |
| 8 | **Free Music Archive API is shut down.** YouTube Audio Library has no API (Studio-only). Pixabay's API covers images + videos only (no music). Music needs: ccMixter query API (licence-filtered), Openverse audio (filter!), Freesound, or hand-picked Incompetech (CC BY). | https://freemusicarchive.org/app-developers (search snippet) ; https://pixabay.com/api/docs/ ; https://support.google.com/youtube/answer/3376882 |

---

## 1. Pexels and Pixabay in detail

### 1a. Pexels

| Item | What the source says | URL |
|---|---|---|
| Media licence | "All photos and videos on Pexels are free to use. Attribution is not required... You can modify." Prohibited: sell unaltered copies (poster/print/product); imply endorsement by people/brands in the image; redistribute/sell on other stock or wallpaper platforms; use as part of trade-mark, design-mark, trade-name, business name; identifiable people may not appear "in a bad light or in a way that is offensive". | https://www.pexels.com/license/ |
| ToS (updated 20 Oct 2026) | Content under "Pexels License" (non-CC0) vs some items marked CC0 on the photo page. "Standalone" = no creative effort; filter/resize/crop alone is still standalone. Combining with other media/text/editing into a new work is not standalone. Barred uses include pornographic/offensive/political context and "in a way which portrays someone as suffering from, or medicating for, a physical or mental ailment". "Data mining, extraction, scraping and the use of programs or robots for automatic data collection... strictly prohibited for all unauthorised purposes, including... machine learning". "Bulk, large-scale or systematic copying of Content is strictly prohibited unless explicit permission". Pexels does not accept AI-generated uploads. Recognisable-person / trademark / building rights stay with the user ("Responsibility... always rests solely and exclusively with you"). | https://www.pexels.com/terms-of-service/ |
| API access | Key is free and instant per account, **but issuance is paused now**. Header `Authorization: KEY`. | https://www.pexels.com/api/ ; https://www.pexels.com/api/documentation/ |
| API rules | Show a "prominent link to Pexels" whenever you make API requests ("Photos provided by Pexels" or logo). "Always credit our photographers when possible" with link to photo page. May not "copy or replicate core functionality of Pexels (including... a wallpaper app)". No abuse; working around the rate limit ends API access. | https://www.pexels.com/api/documentation/ |
| Rate limits | Default 200 requests/hour and 20,000/month. Higher/unlimited is free if you show attribution (ask api@pexels.com with demo). Headers `X-Ratelimit-Limit/Remaining/Reset` (monthly) only on 2xx. Max 80 results/page. | https://www.pexels.com/api/documentation/ ; https://www.pexels.com/api/ |
| Videos | Yes: `GET https://api.pexels.com/v1/videos/search` (old `/videos/` path to be deprecated). `video_files[]` with sd/hd up to 4K; links are `player.vimeo.com/external/...mp4?s=...` signed URLs (seen in doc sample). | https://www.pexels.com/api/documentation/ |
| Caching / storing / hotlinking | The API docs and API page I read say nothing explicit about storing files. Only the ToS "no bulk/systematic copying" applies. Safe design: download only the file the user picks, never crawl. (Gap - UNVERIFIED whether a separate API Terms page exists.) | - |
| Desktop app with user's own key | Nothing forbids it in the pages read. Key is "unique to you... each user account is assigned one API key only" (help centre). Sharing one key across all downloaders would break the 200/h limit and look like circumvention. | https://help.pexels.com/hc/en-us/articles/900004904026-How-do-I-get-an-API-key |
| Commercial OK? | Yes, with the prohibitions above. | - |

### 1b. Pixabay

| Item | What the source says | URL |
|---|---|---|
| Media licence | Two regimes: content published **before 9 Jan 2019 = CC0**; content after = "Content License" (free, commercial OK, no attribution required, modify OK). Prohibited: sell/distribute **Standalone** (filter/colour/resize/crop alone = standalone; also NFT, print, merch); trademarks/logos in content cannot be used commercially for goods/services; no immoral/illegal use "especially Content which features a recognisable person"; no political context; no misleading use (implied endorsement, claiming ownership); no use as trade-mark/business name. Same "mental ailment" clause as Pexels. Credit optional: "by [Contributor] via Pixabay". | https://pixabay.com/service/terms/ ; https://pixabay.com/service/license-summary/ |
| AI angle | "Data mining, extraction, scraping and the use of programs or robots for automatic data collection... strictly prohibited... including for machine learning purposes." Bulk/systematic copying prohibited without permission. Pixabay **accepts AI-generated uploads** (must be labelled) - so some results may be AI images with unclear copyright (UNVERIFIED whether API exposes the label). | https://pixabay.com/service/terms/ |
| API access | Free key: log in at pixabay.com/api/docs to see it. Images `https://pixabay.com/api/`, videos `https://pixabay.com/api/videos/`. No music endpoint. | https://pixabay.com/api/docs/ |
| API rules | "If you make use of the API, show your users where the images and videos are from, whenever search results are displayed." **Requests must be cached 24 hours.** "Made for real human requests; do not send lots of automated queries. Systematic mass downloads are not allowed." **Image URLs only for temporary display; permanent hotlinking not allowed - download to your own storage first.** Videos may be embedded directly (storing recommended). Original / fullHD / vector URLs only after Pixabay approves "full API access". | https://pixabay.com/api/docs/ |
| Rate limit | 100 requests per 60 s, per key (not per IP). Headers X-RateLimit-*. Max 500 hits per query; per_page 3-200. `webformatURL` valid 24 h. Video renditions tiny/small/medium/large (large ~4K, may be empty). | https://pixabay.com/api/docs/ |
| Desktop app with user's own key | Allowed by the docs read: key tied to the user's login; limits are per key. Good BYOK fit. | https://pixabay.com/api/docs/ |
| Commercial OK? | Yes, with the prohibitions above. | - |

### 1c. Must-follow rules (for the build spec)

Pexels (if a user already has a key):
1. Show "Photos/Videos provided by Pexels" link (or logo) wherever API results appear; credit photographer with link where possible.
2. Stay under 200/h, 20,000/month; read headers; back off on 429; never work around limits.
3. Do not clone Pexels (no wallpaper/browse-everything mode); keep search narrow and tied to a project.
4. Download only picked files; no crawling; no bulk saves.
5. Never put images where a person is shown in a derogatory/medical-ailment/political/endorsement context; never as a business name/mark.
6. Do not use as AI training/reference sets.

Pixabay:
1. Show "images/videos from Pixabay" wherever results are displayed.
2. Max 100 requests / 60 s; cache every query result for 24 h; no automated query loops.
3. Display with temporary URLs only; copy a file into the project folder when the user picks it (never keep Pixabay URLs inside a saved project).
4. No bulk or systematic downloads.
5. Same people/brand/political/endorsement/trademark/standalone-resale rules as above; record the licence regime (CC0 pre-2019 vs Content License) per asset.
6. No scraping/ML use.

---

## 2. Image / video / 3D sources

| Source | Media | Licence | Attribution needed? | API? key? rate limit | Commercial OK? | Traps | URL |
|---|---|---|---|---|---|---|---|
| Pexels | photo, video | Pexels License (some CC0) | Media: no. API: yes (link to Pexels + photographer where possible) | Yes; **key issuance paused**; 200/h, 20,000/mo | Yes (limits above) | see 1a | https://www.pexels.com/api/documentation/ |
| Pixabay | photo, illustration, vector, video | Pixabay Content License (CC0 if pre-9 Jan 2019) | Media: no. API: show source | Yes; free key per user; 100/60 s; cache 24 h | Yes (limits above) | see 1b | https://pixabay.com/api/docs/ |
| Openverse | images, audio (~800M works) | each item's own CC licence or PD | Yes for BY/SA items; response includes ready-made `attribution` string (seen in schema sample) | Yes; anonymous works: **20/min and 200/day** (response headers in GitHub issue 5613, Sep 2026); register OAuth2 for "standard" tier (numbers UNVERIFIED). | Only if filtered: results include NC/ND/SA (e.g. Jamendo BY-NC-SA audio). Schema lists `license`, `license_type` filters (accepted values UNVERIFIED). | ToS: must adhere to rate limits+registration; no scraping; no multi-machine circumvention; apps "must prominently indicate that it was made using Openverse but is not endorsed"; Openverse "reserves the right to charge fees for commercial uses and/or heavy usage"; does not verify licences; verification email bug reported. | https://docs.openverse.org/terms_of_service.html ; https://api.openverse.org/v1/schema/ ; https://github.com/WordPress/openverse/issues/5613 |
| Wikimedia Commons | image, video, audio | per file: PD, CC0, CC BY, CC BY-SA, etc. | Per licence (BY/SA need credit + licence link; SA needs share-alike for derivatives) | Yes, no key. Rate limits (new in 2026): **200 req/min with a compliant User-Agent**, 10/min unidentified, keep <=3 concurrent; respect Retry-After | Yes if the file's licence suits; check each | Personality, trademark, moral rights are separate; Foundation gives no warranty on licence correctness; must send User-Agent with contact info; cannot white-label the API. | https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits ; https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_API_Usage_Guidelines ; https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia |
| Smithsonian Open Access | 2D/3D images, metadata | CC0 for items flagged CC0; all other items = usage conditions, **non-commercial only** | CC0: no (caption of title/author/source/licence/URL recommended). Non-CC0: yes + cannot be used commercially | Yes; free api.data.gov key; default 1,000 req/h (DEMO_KEY: 30/h and 50/day per IP) | Only CC0-flagged items | Items with copyright have CC0 metadata but no media file; third-party rights (people, trademarks) remain yours; don't use Smithsonian names/logos in account names. | https://www.si.edu/openaccess/faq ; https://www.si.edu/termsofuse ; https://www.si.edu/openaccess/devtools ; https://api.data.gov/docs/rate-limits/ |
| The Met Open Access | images of public-domain works, metadata | CC0 for data; images only where `isPublicDomain` true | No | Yes; **no key**; asked to stay <=80 requests/s. `/v1/search` retires **1 Oct 2026** (already past) -> use `/v1.1/search` (offset/limit, max 500) | Yes for public-domain-flagged images | Photos of works under copyright are excluded; Met terms apply to API. | https://metmuseum.github.io/ |
| Art Institute of Chicago | artwork images (IIIF), metadata | CC0 for items labelled "CC0 Public Domain Designation" (>50,000 images) | Not required; museum requests caption "Artist. Title, Date. The Art Institute of Chicago." | Yes; no key mentioned in docs read. Scraping: one image at a time, ~1 s delay. Hotlinking allowed. Use `query[term][is_public_domain]=true`; recommended size 843 px (1686 px for PD). | Yes, CC0-labelled only | Images can be unpublished/replaced; only PD images may be taken at 1686; museum defers to artic.edu/terms. | https://api.artic.edu/docs/ ; https://www.artic.edu/image-licensing |
| Rijksmuseum | images, metadata | Much is PD/CC0; some CC BY 4.0; some not free (copyright holder shown) | CC BY: yes; CC0: no (credit requested) | New data services: OAI-PMH, Search API, LDES, data dumps. Key and rate limit not stated on pages read (UNVERIFIED). | Yes per-object; check rights statement | "Work in progress, structures may change"; no endorsement implied. | https://data.rijksmuseum.nl/policy ; https://data.rijksmuseum.nl/docs/ |
| NASA Image and Video Library | images, video, audio | Generally not copyrighted (US); third-party items marked | Acknowledge NASA as source | `https://images-api.nasa.gov/search` (docs v1.22.0, 2023); key and limits not stated in the intro I read (UNVERIFIED) | Yes, if no implied NASA endorsement | NASA Insignia/logos not public domain; identifiable people need permission; **current astronauts/employees' name/likeness not on commercial products/ads**; no NFTs; "attribution of information directly to NASA is not permitted" for AI outputs; clearances may be needed for NASA-logo cover art. | https://www.nasa.gov/nasa-brand-center/images-and-media/ ; https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf |
| Library of Congress | photos, maps, prints, audio, video | **Rights vary per item**; LOC "does not own rights... cannot grant or deny permission" | per item | Yes (loc.gov JSON API), no key; published limits include 20 req/min on one endpoint class, 150/min others, **1-hour block** when exceeded; deep paging capped at 100,000 | Only items with "no known restrictions" | Rate-limit blocks last an hour; CAPTCHAs on heavy load; you must judge rights per item. | https://www.loc.gov/apis/json-and-yaml/working-within-limits/ ; https://www.loc.gov/item/93511155/ |
| Internet Archive | everything | uploader-declared; IA says declarations "rarely" trustworthy | per item | n/a | **AVOID** | Terms: access "granted for scholarship and research purposes only"; use limited to non-infringing/fair use. | https://archive.org/about/terms.php |
| Unsplash | photo | Unsplash License (commercial OK; no sale w/o modification; no compiling a competing service) | Licence: no. **API: yes, every display** (photographer + Unsplash + link with utm) | API: demo 50/h; production up to 1,000/h after approval (docs page now says 1,000; older material said 5,000) | Licence yes; **API usage rules block this project** | Must hotlink API URLs (no local copies), must call download endpoint on use, key must stay secret (needs proxy), apps must not require users to register their own developer account, no unaltered resale, can't use name "Unsplash" in app name. **AVOID.** | https://unsplash.com/license ; https://unsplash.com/documentation ; https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines ; https://unsplash.com/api-terms |
| Poly Haven | HDRIs, textures, 3D models | CC0 | No (assets). If you surface live API content, make clear it comes from Poly Haven ("Powered by Poly Haven") | API at api.polyhaven.com: **no key**, free incl. commercial, no stated rate limit; every call needs unique Referer/User-Agent matching your software name | Yes | ToS bans scraping the website without permission (use the API); never imply endorsement; API may change without notice; they invite optional Patreon support (not required). | https://polyhaven.com/license ; https://github.com/Poly-Haven/Public-API/blob/master/ToS.md |
| Kenney | 2D/3D game assets, UI, audio packs | CC0 | No (optional "Kenney"; don't use their logo) | **No API**; download packs (manual or vendored) | Yes | Fits as bundled/ship-with content; no key needed. | https://kenney.nl/support |
| OpenGameArt | art, sprites, audio | per item: CC0, CC-BY 3/4, CC-BY-SA 3/4, GPL 2/3 etc. | CC-BY/SA yes | No official API found (UNVERIFIED) | Per licence | CC-BY terms forbid DRM'd distribution; SA/GPL copyleft; credit text format provided in FAQ. Manual curation only. | https://opengameart.org/content/faq |
| Mixkit | video, music, SFX, templates | Separate Mixkit licence per type (Video Free / Video **Restricted** / Music Free / SFX Free / Templates / Art) | SFX Free: not required (as read) | **No official API found**; only third-party scrapers (UNVERIFIED) | Yes under Free licences | SFX Free: cannot redistribute "on its own, as stock, in a tool or template, or with source files". "Restricted" videos have extra limits. Don't scrape. | https://mixkit.co/license/ |
| Coverr | stock video, music, AI-generated | Coverr licence | Site downloads: no. **API: show Coverr logo link; FAQ says videos require attribution** | Yes: free key, Demo = 50 calls/h; Production = 2,000/h on paid plans; MCP endpoint exists | FAQ: "Absolutely... commercially licensed". But API docs also say free "as long as you don't charge for it yourself, AKA re-sell or use the videos for commercial use" - **contradictory, ask Coverr** | Licence bans AI training/datasets and competing services; Coverr sometimes supplements catalogue with Shutterstock footage; no brand/trademark clearance. | https://coverr.co/developers ; https://api.coverr.co/docs/ ; https://coverr.co/license |
| Videvo | stock video | (was Videvo Attribution / CC BY 3.0 / standard) | mixed | videvo.net/licensing now redirects to Magnific, then 404. No API found. | **AVOID** (current licence unreadable; third-party blogs only) | Rebranded under Magnific; licence variety by clip. | https://www.videvo.net/licensing/ (404 after redirect) |

---

## 3. Audio: music and SFX

| Source | Media | Licence | Attribution? | API / key / limit | Commercial OK? | Traps | URL |
|---|---|---|---|---|---|---|---|
| Freesound | SFX, loops, some music | per sound: CC0, CC BY 4.0, CC BY-NC 4.0, legacy Sampling+ | CC BY yes; CC0 no | Yes; free key via apply form; 60/min and 2,000/day; originals via **OAuth2** (30/min, 500/day); **previews (mp3/ogg) need no OAuth**; search returns `license` field | **Only CC0 + CC BY**. Exclude BY-NC and Sampling+ | API ToS: "limited intermediate copies", no full-DB copy, no linking/distributing Content outside the Application, no scraping; "terms for commercial use of the API negotiated case by case"; YouTube Content ID can falsely flag raw SFX; since Jul 2026 uploaders can set extra gen-AI preferences. Exact licence-filter syntax UNVERIFIED. | https://freesound.org/docs/api/overview.html ; https://freesound.org/help/tos_api/ ; https://freesound.org/help/faq/ |
| Incompetech (Kevin MacLeod) | music | CC BY 4.0 (or paid licence) | **Yes**, visible credit (title, Kevin MacLeod (incompetech.com), licence link); YouTube description or in-video is OK; monetising OK | No API; manual list | Yes with credit | Recordings are copyrighted; credit must be findable. | https://incompetech.com/music/royalty-free/faq.html |
| ccMixter | music, samples, a cappellas | per upload (query `lic=`: by, nc, sa, nod, byncsa, byncnd, s, splus, ncsplus, pd) | by/sa yes | Yes: Query API 2.0 (beta), URL-based JSON/CSV/RSS, no key; limits not stated | Only `lic=by` / `pd`; site also has "free for commercial use" filter | Beta API; community uploads (verify uploader rights); NC/ND are common. | https://ccmixter.org/query-api |
| Free Music Archive | music | per track | per track | **API shut down** by FMA ("heavy load") | n/a | Manual download only. | https://freemusicarchive.org/app-developers (search snippet) |
| Musopen | classical recordings | user-uploaded; "does not review... to determine if the music is in the public domain" | n/a | No API found | **AVOID** | Composition PD does not make recording PD. | https://musopen.org/faq/ (search snippet) |
| YouTube Audio Library | music, SFX | Standard YouTube licence or CC BY | CC BY: credit in description | **No API**; only inside YouTube Studio (manual MP3 download) | Safe inside YouTube; licence for off-YouTube/LMS use not confirmed (third-party says standard licence restricted to YouTube - UNVERIFIED) | Not usable for LMS course videos unless CC BY tracks only. | https://support.google.com/youtube/answer/3376882 |
| Pixabay music | music, SFX | Pixabay Content License | no | **No endpoint in API docs** | Yes (manual) | Manual download only. | https://pixabay.com/api/docs/ |
| Sonniss GDC bundle | SFX (large packs) | Sonniss EULA v2.0 (effective 27 Aug 2026) | No | **No API**; yearly free bundle download | Yes, inside your own projects | **Cannot supply the SFX to anyone else as SFX** (no asset packs, SDKs, templates, libraries) -> never bundle in the app; each user downloads their own. **AI training prohibited.** | https://sonniss.com/gdc-bundle-license/ |
| Mixkit SFX / music | see section 2 | Mixkit Free | no | no API | yes | no redistribution in tools | https://mixkit.co/license/ |
| Openverse audio | music/SFX | mixed CC | per licence | see section 2 | filter | includes Jamendo BY-NC-SA | https://api.openverse.org/v1/schema/ |

---

## 4. Illustrations, animation, fonts, icons, emoji

| Source | Media | Licence | Attribution? | API / key | Commercial OK? | Traps | URL |
|---|---|---|---|---|---|---|---|
| Open Peeps (Pablo Stanley) | vector people parts | CC0 | No | None (download kit; Blush link) | Yes | Static kit; needs own compositing code. | https://www.openpeeps.com/ |
| Humaaans | vector people | Official site: CC0 | No | None | Yes | A third-party listing says CC BY 4.0 - conflict; trust the official site but re-check before shipping. | https://www.humaaans.com/ (search snippet) |
| unDraw | vector illustrations | custom unDraw licence | No | None | Yes for normal use | **Forbids**: re-distribution/packs, adding them "in an app", "automated ways to link, embed, scrape, search or download", and all AI/ML use. **AVOID.** | https://undraw.co/license |
| DrawKit | illustrations | custom (third-party: free commercial, no resale, no AI) | - | None | UNVERIFIED | Official licence not read. | (not read) |
| LottieFiles | Lottie animations (JSON) | Lottie Simple License (FL 9.13.21) | Not required, encouraged | API not researched | Yes incl. commercial | Any display/distribution "must contain (and be subject to) the same terms"; modifications are derivative works under the same terms; cannot compile to build a competing service. Fine for rendering into videos; don't ship the JSON files inside the app. | https://lottiefiles.com/page/license |
| Google Fonts | fonts | Mostly SIL OFL 1.1; some Apache 2.0 or Ubuntu Font Licence | No | Developer API needs a free key (metadata); font files also from github.com/google/fonts | Yes (even in products sold) | Product Sans not available; per-font licence in repo. | https://developers.google.com/fonts/faq ; https://developers.google.com/fonts/docs/developer_api |
| Fontsource | fonts as npm packages | Each font's own open licence (OFL etc.) | per font | npm; no key; offline | Yes | Keeps fonts version-locked and offline - better than runtime Google CDN. | https://fontsource.org/docs/getting-started/introduction |
| Iconify | 300k icons, 200+ sets | **Per icon set**: set info carries `license.title/spdx` | per set | Public API https://api.iconify.design free, no key, "limits to prevent abuse" (numbers not published); self-host option | Only sets whose licence allows (MIT, Apache, CC0 fine; CC BY needs credit; check others) | Make the app read `license.spdx` and refuse unknown sets. | https://iconify.design/docs/api/ ; https://iconify.design/docs/types/iconify-info.html |
| Noto Emoji | emoji font + images | Font: OFL 1.1; tools and most images Apache 2.0; flags public domain | Apache: keep notice | github | Yes | Fine for video. | https://github.com/googlefonts/noto-emoji |
| Twemoji (jdecked fork) | emoji graphics | Graphics CC BY 4.0; code MIT | **Yes** (mention in README/About/footer accepted by project) | none | Yes with credit | Credit string must ship with the app. | https://github.com/jdecked/twemoji |
| OpenMoji | emoji graphics | CC BY-SA 4.0 (code LGPL-3.0) | Yes | none | Yes, but **ShareAlike** on adapted material | Using them inside a rendered video may count as adaptation -> avoid for videos. | https://github.com/hfg-gmuend/openmoji |
| Fluent Emoji (Microsoft) | emoji graphics | MIT | Keep MIT notice | none | Yes | Simplest permissive choice. | https://github.com/microsoft/fluentui-emoji |

---

## 5. GIF providers

| Source | Status | Verdict | URL |
|---|---|---|---|
| Giphy API | Needs key; "Powered by Giphy" + logo required; attribution of every item; "shall not use content... to create a database, directory, or index containing GIFs"; no commingling with other providers; API terms effective 2018. Not a copyright licence for the GIFs. | **AVOID** | https://support.giphy.com/hc/en-us/articles/360028134111-GIPHY-API-Terms-of-Service- |
| Tenor API | "As of Jan 2026, we are no longer accepting new API clients"; Google page headed "Tenor API Service Discontinuation". | **DEAD** | https://developers.google.com/tenor |

---

## 6. Free AI API tiers

All numbers read 2026-10-25 unless marked.

| Provider | What is free | Limits | Commercial use of output | Traps | URL |
|---|---|---|---|---|---|
| **Gemini API (Google AI Studio key)** | Several Flash-class text models "Free of charge"; Pro-class "Not available" on free; **TTS models (Gemini 3.8 Flash TTS, Flash-Lite TTS) free of charge**; **image generation (Nano Banana 2 / Lite) NOT free** ("Not available", AI Studio test only). Rows listing "Free of charge" lose model names in the text I got - re-read the table by eye. | Per project; numbers only in AI Studio rate-limit page (UNVERIFIED); RPD resets midnight Pacific | Google "won't claim ownership" of generated content; you must follow the Prohibited Use Policy | **EEA/CH/UK: unpaid quota may not back an app offered to users there.** Free tier = prompts+outputs used to improve Google products, human reviewers may read them (outside EEA); "Do not submit sensitive, confidential, or personal information". No clients likely to be used by under-18s. Preview models may change/end. Paid tiers rising in price. | https://ai.google.dev/gemini-api/docs/pricing ; https://ai.google.dev/gemini-api/terms ; https://ai.google.dev/gemini-api/docs/rate-limits |
| **Groq** | Free plan (no card per secondary source - UNVERIFIED). Models: gpt-oss-120b/20b, qwen3.8-27b, Whisper large-v3, Orpheus TTS. | Table on rate-limits page (ambiguous whether Free or Developer base): e.g. gpt-oss-120b 30 RPM / 1K RPD / 8K TPM / 200K TPD; whisper-large-v3 20 RPM / 2K RPD / 7.2K audio-s per hour / 28.8K per day; Orpheus 10 RPM / 100 RPD. Exact limits only on your console Limits page. | Services Agreement: Outputs = Customer Data; "Groq is not permitted to use Inputs or Outputs for training". Third-party model terms ("AI Model Terms") still apply per model (e.g. Llama licence). | Which plan the table describes is unclear; Beta services excluded from agreement; limits change. Free-plan-specific commercial wording not read (UNVERIFIED). | https://console.groq.com/docs/rate-limits ; https://console.groq.com/docs/legal/services-agreement |
| **Cloudflare Workers AI** | Free allocation **10,000 Neurons/day** (resets 00:00 UTC) on Free and Paid plans. Catalogue (73 models) includes text-to-image FLUX.1 schnell, FLUX.2 klein 4B/9B, FLUX.2 dev; LLMs (Llama, Mistral, Gemma, DeepSeek); TTS/ASR models exist (not read). | On Free plan "operations will fail" past the allowance - a hard stop, so no surprise bill. Over 10,000/day needs Workers Paid ($0.011 per 1,000 Neurons). | **UNVERIFIED** - model licences differ per model (FLUX.2 dev is a BFL licence likely non-commercial; check each model page). | Free allowance is small (a few dozen LLM calls / handful of images). Use only models whose licence permits commercial output. | https://developers.cloudflare.com/workers-ai/platform/pricing/ ; https://developers.cloudflare.com/workers-ai/models/ |
| **OpenRouter** | `:free` model variants | 20 requests/min. **1,000 requests/day only after buying >= $10 credits** (official table row read). Below that a lower daily ceiling (secondary source says 50/day - UNVERIFIED). Negative balance blocks even free models. | Depends on each underlying model's licence/provider terms (UNVERIFIED) | Zero-cost rule: the 1,000/day tier costs $10. Free capacity "not permanent"; `openrouter/free` router picks random providers with different data policies; prompts may be logged or used for training by free providers (secondary - UNVERIFIED). | https://openrouter.ai/docs/api-reference/limits ; https://openrouter.ai/docs/faq |
| **Hugging Face Inference Providers** | **Nothing free**: "Free Users: None" monthly credits; PRO users get $2/month credits; otherwise pay-as-you-go. | - | - | Excluded by the zero-cost rule. | https://huggingface.co/docs/inference-providers/pricing |
| **Mistral (La Plateforme / AI Studio)** | "Free mode lets you create API keys and use included monthly usage within the limits shown on the Limits page" | Per-model tokens/min and requests/sec shown in the Admin panel; public numbers not on the docs page read (secondary: ~1B tokens/month - UNVERIFIED) | UNVERIFIED (terms not read) | API data may be used for training unless you disable "Anonymous improvement data" (Admin -> Privacy); separate toggle from Vibe. | https://docs.mistral.ai/admin/billing-usage/usage-limits ; https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training |
| **ElevenLabs** | Free plan: 10,000 credits/month ($0) | ~10,000 characters TTS/month | **NO**: "The free plan does not include a commercial license and cannot be used for any commercial purpose." Attribution ("elevenlabs.io" or "11.ai" in title) required. Content made on Free can never become commercial later. | Unusable for paid LMS and monetised YouTube. | https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform ; https://elevenlabs.io/pricing |
| **Google Cloud Text-to-Speech** | Monthly free characters: Standard 4M, WaveNet 4M, Neural2 1M, Polyglot 1M, Studio 1M, Chirp 3 HD 1M. Gemini TTS models in Cloud TTS: no free allowance. | Per month, per type | Standard Google Cloud terms (not read - UNVERIFIED) | **"You must enable billing"** and overage is charged automatically -> breaks the zero-cost rule unless hard quota caps are set. | https://cloud.google.com/text-to-speech/pricing |

---

## 7. Ranking: 12 best to integrate (zero cost, stable, legal, commercial video/LMS)

| Rank | Source | Why | Key? (BYOK) | Must-do |
|---|---|---|---|---|
| 1 | **Pixabay** (images + video) | Largest free API with video, free key per user, BYOK-friendly, commercial OK | Yes (free) | Cache 24 h; download on pick; show "from Pixabay"; filter risky people/brand/ailment images |
| 2 | **Poly Haven** (HDRI/textures/3D) | CC0, no key, API explicitly commercial-friendly | No | Unique User-Agent; "Powered by Poly Haven" when surfacing live API results |
| 3 | **Freesound** (SFX) | Best SFX source with a real API; previews need no OAuth | Yes (free) | Only CC0 + CC BY; store credit text; never full-DB copy |
| 4 | **Wikimedia Commons** | Huge, free, no key; licence data per file | No (User-Agent) | Allow only PD/CC0/CC BY (offer SA behind a warning); store credit; rights of people/brands |
| 5 | **The Met Open Access** | CC0, no key, great for history/education | No | `isPublicDomain` only; use `/v1.1/search` |
| 6 | **Art Institute of Chicago** | CC0 images via IIIF, no key | No | `is_public_domain=true`; 1 req/s when saving files |
| 7 | **Smithsonian Open Access** | CC0 images/3D, free key | Yes (api.data.gov) | CC0 flag only; 1,000/h |
| 8 | **NASA Image & Video Library** | Rare free video/audio source | No (unverified) | No logos/endorsement; avoid recognisable current astronauts in promos |
| 9 | **Openverse** (images + audio) | One search across many CC sources | Optional register | Filter to commercial-compatible licences; show attribution; "made with Openverse" notice; 20/min, 200/day anon |
| 10 | **Fontsource / Google Fonts** | OFL fonts, offline, version-locked | No | Record licence per font |
| 11 | **Iconify** (permissive sets only) | Icons through one API | No | Read `license.spdx`; block unknown/NC sets |
| 12 | **Kenney + Open Peeps (+ Humaaans)** | CC0 bundles: game assets/UI/audio and vector people | n/a (bundle) | Vendor into the repo with CC0 notice; re-check Humaaans licence statement |

Second wave (usable, more conditions): Rijksmuseum (CC0/PD/BY), Library of Congress (rights per item), ccMixter (`lic=by|pd` only), Incompetech (manual CC BY), Coverr (key + logo + AI ban + contradictory wording), Pexels (only for users who already hold a key).

Do not integrate: Unsplash API, Giphy, Tenor, unDraw, Internet Archive, Musopen, Videvo, ElevenLabs free, Hugging Face (no free credits), OpenMoji in videos (ShareAlike), Mixkit/YouTube Audio Library/Sonniss (no API; Sonniss never bundled).

---

## 8. Cross-cutting rules for the two apps

1. **Asset ledger.** Every fetched asset gets one record: provider, asset id, source page URL, creator, licence id (e.g. CC0, CC-BY-4.0, Pixabay-Content-2019+), attribution string, fetch date, content hash, "licence rules version" read date, flags (needs-credit, editorial-only, no-AI, NC, ShareAlike). Both apps read/write the same ledger so Video Forge can auto-build a credits file for the YouTube description and LMS page, and Image Forge can refuse to use "no-AI" assets as references. (Design suggestion, not research.)
2. **Licence allow-list at fetch time**, not at export time: default allow = CC0, PD, Pixabay/Pexels licences, CC BY. Block NC/ND by default; SA behind a warning.
3. **Per-user keys stored locally** (Pixabay, Freesound, Smithsonian, Coverr); never ship Ak's keys; never put keys in URLs that get logged.
4. **Download on pick**, cache search results (>=24 h for Pixabay), store originals under the project; never hotlink inside saved projects.
5. **Rate-limit governor** per provider (Pixabay 100/60 s, Freesound 60/min + 2,000/day, Openverse 20/min + 200/day anon, Wikimedia <=3 concurrent + User-Agent).
6. **Content-risk screen** before use in a course: recognisable people, brands/logos, "ailment" depictions (soft-skills content!), political context, NASA/Smithsonian marks. These are user responsibility under every licence.
7. **Re-verify terms** on a schedule: Pexels/Pixabay changed 20 Oct 2026; Openverse can add fees; Freesound may add API conditions; Wikimedia limits are "new in 2026 and subject to change".

---

## 9. Unverified / open items (do not treat as fact)

- Pexels: when key issuance reopens; whether existing keys keep working; whether a separate "API Terms" page exists; explicit caching/storage rule.
- Pixabay: whether the API exposes an AI-generated flag; terms for "full API access" approval.
- Openverse: authenticated (standard) rate limits; accepted `license_type` values; whether fees for commercial use are in force.
- Freesound: exact license-filter string for CC0/CC BY; whether a distributed free app needs "commercial API" negotiation.
- NASA images API: key requirement and rate limit. Rijksmuseum: key requirement and limits. AIC: official rate limit for normal API calls. Smithsonian: field that marks CC0 in API response.
- Gemini free-tier numeric limits and exactly which text models are free (table text lost model names). Groq: which plan the published limit table describes; free-plan commercial wording. Cloudflare: per-model commercial rights. OpenRouter: sub-$10 daily ceiling (50/day secondary claim). Mistral: free-mode numbers and commercial wording. Google Cloud TTS: output terms.
- DrawKit, Videvo, OpenGameArt API, Mixkit API, Lottie API: not read officially.

---

## 10. Page log (all read 2026-10-25)

Pexels: /api/, /api/documentation/, /license/, /terms-of-service/ (updated 20 Oct 2026), help.pexels.com search snippet. Pixabay: /api/docs/, /service/license-summary/, /service/terms/ (updated 20 Oct 2026), /service/about/api/. Openverse: docs ToS, API schema, GitHub issue 5613. Wikimedia: Rate_limits, API:Etiquette, API Usage Guidelines, Commons reuse. Freesound: api overview, tos_api, faq, resources. Smithsonian: faq, termsofuse, devtools; api.data.gov rate limits. Met: metmuseum.github.io. AIC: api docs, image-licensing. Rijksmuseum: /en/data, data policy, docs. NASA: media guidelines, API docs PDF. LOC: /apis/, working-within-limits. Internet Archive: terms. Unsplash: license, documentation, API guidelines, API terms. Mixkit: license. Coverr: /developers, api docs, /license. Poly Haven: /license, API ToS. Kenney: /support. OpenGameArt: FAQ. Open Peeps; unDraw license; LottieFiles license. Google Fonts FAQ + Developer API; Fontsource intro; Iconify API + info type docs. Noto Emoji, Twemoji, OpenMoji, Fluent Emoji repos. Incompetech FAQ; ccMixter query API; Sonniss licence v2.0; YouTube Audio Library help. Giphy API terms; Tenor developer page. Gemini pricing/terms/rate-limits; Groq rate-limits + services agreement; Cloudflare Workers AI pricing + models; OpenRouter limits; Hugging Face pricing; Mistral usage-limits + opt-out; ElevenLabs pricing + commercial-use help; Google Cloud TTS pricing.
