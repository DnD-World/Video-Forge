/**
 * Fix the title, description, tags, privacy and publish date of videos that
 * are ALREADY on the channel.
 *
 *   node tools/youtube-update.mjs plan.json            # says what it would do
 *   node tools/youtube-update.mjs plan.json --apply    # actually does it
 *   node tools/youtube-update.mjs --list               # what is on the channel
 *
 * WHY THIS EXISTS SEPARATELY FROM youtube-upload.mjs. Uploading and editing are
 * different permissions on YouTube: `youtube.upload` can put a new video on a
 * channel but cannot touch one that is already there. Editing needs
 * `youtube.force-ssl`, which is why tools/youtube-auth.mjs has to be re-run
 * once before this works. An API key cannot do it at any scope — a key says
 * which app is calling, not who owns the channel.
 *
 * THE PLAN FILE is a list, one entry per video:
 *
 *   [{ "match": "101.1",                  // found in the current title
 *      "title": "…",
 *      "description": "…",
 *      "tags": ["σκύλος", "εκπαίδευση"],
 *      "privacyStatus": "private",        // private | unlisted | public
 *      "publishAt": "2026-10-07T09:00:00Z" }]   // private only
 *
 * NOTHING IS GUESSED. A plan entry that matches no video, or more than one, is
 * reported and skipped rather than applied to whichever came first.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SECRETS = process.env.BYOK_SECRETS_DIR ?? path.resolve(ROOT, "..", "SECRETS");
const API = "https://www.googleapis.com/youtube/v3";

const argv = process.argv.slice(2);
const planPath = argv.find((a) => !a.startsWith("--"));
const apply = argv.includes("--apply");
const listOnly = argv.includes("--list");

const { readClientSecret, accessToken } = await import(
  "file://" + path.join(ROOT, "electron/net/youtube.ts")
);

const secretFile = fs.readdirSync(SECRETS).find((n) => n.startsWith("client_secret"));
if (!secretFile) {
  console.error(`No client_secret*.json in ${SECRETS}.`);
  process.exit(1);
}
const client = await readClientSecret(path.join(SECRETS, secretFile));
const token = JSON.parse(fs.readFileSync(path.join(SECRETS, "youtube-token.json"), "utf8"));
const bearer = await accessToken(client, token);

const get = async (url) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });
  const body = await res.json();
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason ?? "";
    if (reason === "insufficientPermissions" || res.status === 403) {
      throw new Error(
        "YouTube refused: this sign-in cannot edit videos. Run `node tools/youtube-auth.mjs` " +
          "again and approve the wider permission, then try this once more."
      );
    }
    throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body;
};

/** Every video on the signed-in channel, newest first. */
async function myVideos() {
  const me = await get(`${API}/channels?part=contentDetails&mine=true`);
  const uploads = me.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("This sign-in has no channel with uploads.");
  const out = [];
  let pageToken = "";
  do {
    const page = await get(
      `${API}/playlistItems?part=snippet&maxResults=50&playlistId=${uploads}` +
        (pageToken ? `&pageToken=${pageToken}` : "")
    );
    for (const it of page.items ?? []) {
      out.push({ id: it.snippet.resourceId.videoId, title: it.snippet.title });
    }
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

const videos = await myVideos();
if (listOnly || !planPath) {
  console.log(`${videos.length} video(s) on the channel:`);
  for (const v of videos) console.log(`  ${v.id}  ${v.title}`);
  if (!planPath) process.exit(0);
}

const plan = JSON.parse(fs.readFileSync(path.resolve(planPath), "utf8"));
let done = 0;
let skipped = 0;

for (const row of plan) {
  const hits = row.videoId
    ? videos.filter((v) => v.id === row.videoId)
    : videos.filter((v) => v.title.includes(row.match));
  if (hits.length !== 1) {
    console.log(`SKIP ${row.match ?? row.videoId}: ${hits.length === 0 ? "no video matched" : `${hits.length} videos matched`}`);
    skipped++;
    continue;
  }
  const video = hits[0];

  // The existing snippet first: videos.update REPLACES the parts it is given,
  // so sending a title without the category would blank the category.
  const current = await get(`${API}/videos?part=snippet,status&id=${video.id}`);
  const snippet = current.items?.[0]?.snippet ?? {};
  const status = current.items?.[0]?.status ?? {};

  const body = {
    id: video.id,
    snippet: {
      ...snippet,
      title: row.title ?? snippet.title,
      description: row.description ?? snippet.description,
      tags: row.tags ?? snippet.tags,
      categoryId: snippet.categoryId ?? "27", // Education
    },
    status: {
      ...status,
      privacyStatus: row.privacyStatus ?? status.privacyStatus,
      ...(row.publishAt ? { publishAt: row.publishAt } : {}),
    },
  };

  // Same rule as uploading: a schedule only works from private, and YouTube
  // silently ignores publishAt on anything else.
  if (body.status.publishAt && body.status.privacyStatus !== "private") {
    console.log(`SKIP ${video.title}: a publish date needs privacy "private", not "${body.status.privacyStatus}"`);
    skipped++;
    continue;
  }

  if (!apply) {
    console.log(
      `would update ${video.id}  ${video.title}\n` +
        `   title: ${body.snippet.title}\n` +
        `   privacy: ${body.status.privacyStatus}${body.status.publishAt ? `, public on ${body.status.publishAt}` : ""}\n` +
        `   description: ${String(body.snippet.description).length} chars, tags: ${(body.snippet.tags ?? []).length}`
    );
    done++;
    continue;
  }

  const res = await fetch(`${API}/videos?part=snippet,status`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const out = await res.json();
  if (!res.ok) {
    console.log(`FAILED ${video.title}: ${JSON.stringify(out).slice(0, 200)}`);
    skipped++;
    continue;
  }
  // Read back what YouTube actually stored, rather than trusting the request.
  console.log(
    `ok ${video.id}  ${out.snippet?.title}  [${out.status?.privacyStatus}` +
      `${out.status?.publishAt ? `, public on ${out.status.publishAt}` : ""}]`
  );
  done++;
}

console.log(`\n${apply ? "updated" : "would update"} ${done}, skipped ${skipped}`);
