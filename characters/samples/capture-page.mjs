// Track a list of free stock clips frame by frame and save each as a take
// (characters/moves/acted/takes/<id>.json) through tools/take-server.mjs.
// Runs unattended: open capture.html?list=/acted/clips.json on the take server.
const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
const $ = (id) => document.getElementById(id);
const log = (s) => { $("log").textContent += s + "\n"; window.__log.push(s); };
window.__log = []; window.__done = false;

async function tracker() {
  const mod = await import(/* @vite-ignore */ MP + "/vision_bundle.mjs");
  const files = await mod.FilesetResolver.forVisionTasks(MP + "/wasm");
  return mod.PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate: "GPU" }, runningMode: "VIDEO", numPoses: 1 });
}
const seek = (v, t) => new Promise((ok) => { v.onseeked = () => ok(); v.currentTime = t; });

async function trackClip(pose, clip, clock) {
  const v = $("video");
  v.crossOrigin = "anonymous"; v.muted = true; v.src = clip.mp4;
  await new Promise((ok, bad) => { v.onloadeddata = ok; v.onerror = () => bad(new Error("video did not load")); });
  const fps = 25, dur = Math.min(v.duration, clip.maxSec ?? 20), frames = [];
  const ctx = $("view").getContext("2d");
  for (let t = clip.fromSec ?? 0; t < dur; t += 1 / fps) {
    await seek(v, t);
    clock.ms += 1000 / fps;
    const r = pose.detectForVideo(v, clock.ms);
    const lm = r?.landmarks?.[0];
    $("view").width = 320; $("view").height = Math.round(320 * v.videoHeight / v.videoWidth);
    ctx.drawImage(v, 0, 0, 320, $("view").height);
    if (!lm) continue;
    frames.push({ ms: Math.round(t * 1000), lm: lm.map((p) => [+p.x.toFixed(4), +p.y.toFixed(4), +(p.visibility ?? 1).toFixed(2)]) });
    ctx.fillStyle = "#ff4d57"; for (const p of lm) ctx.fillRect(p.x * 320 - 2, p.y * $("view").height - 2, 4, 4);
  }
  return { v: 1, fps, aspect: v.videoWidth / v.videoHeight, mirrored: false, source: { page: clip.page, mp4: clip.mp4, site: clip.site, title: clip.title }, frames };
}

async function main() {
  const listUrl = new URLSearchParams(location.search).get("list");
  if (!listUrl) { log("add ?list=<clips json>"); return; }
  const clips = await (await fetch(listUrl, { cache: "no-store" })).json();
  const only = new URLSearchParams(location.search).get("only");
  log(`loading the tracker…`);
  const pose = await tracker();
  const clock = { ms: 0 };
  for (const clip of clips) {
    if (!clip.mp4 || (only && !only.split(",").includes(clip.id))) continue;
    try {
      const take = await trackClip(pose, clip, clock);
      const seen = take.frames.length;
      const r = await fetch(`/api/take?id=${clip.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(take) });
      log(`${clip.id}: ${seen} frames ${r.ok ? "saved" : "NOT saved: " + (await r.text())}`);
    } catch (e) { log(`${clip.id}: FAILED ${e.message || e}`); }
  }
  log("done"); window.__done = true;
}
main();
