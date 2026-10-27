# Nano Banana 2.1 by Vertex AI batch (tier-1-emf credit). Temporary bucket, deleted at the end.
#   python -I vrun.py <jobs.json> <outdir> <name>
# jobs.json = [{ "key": "...", "prompt": "...", "refs": ["path.png", ...] }]
# Every picture's record (key, model, time, prompt, refs, saved or why not) is
# appended to <outdir>/records.jsonl, so any picture can be traced and re-made.
import base64, io, json, mimetypes, os, sys, time
from PIL import Image
from google.oauth2 import service_account
import google.auth.transport.requests as tr

KEY = "C:/Users/strav/Documents/CLAUDE SPACE/SECRETS/tier-1-emf-218c21c970d7.json"
PROJ = json.load(open(KEY))["project_id"]
MODEL = "gemini-nano-banana-2.1"
cr = service_account.Credentials.from_service_account_file(KEY, scopes=["https://www.googleapis.com/auth/cloud-platform"])
S = tr.AuthorizedSession(cr)
GS, VX = "https://storage.googleapis.com", f"https://aiplatform.googleapis.com/v1/projects/{PROJ}/locations/global"

def ok(r):
    if r.status_code >= 300: raise SystemExit(f"{r.status_code} {r.text[:400]}")
    return r

def inline(path):
    im = Image.open(path).convert("RGB")
    if max(im.size) > 1536: im.thumbnail((1536, 1536))
    b = io.BytesIO(); im.save(b, "PNG")
    return {"inlineData": {"mimeType": "image/png", "data": base64.b64encode(b.getvalue()).decode()}}

def main(jobs_path, out, name):
    jobs = json.load(open(jobs_path, encoding="utf8"))
    os.makedirs(out, exist_ok=True)
    todo = [j for j in jobs if not os.path.exists(os.path.join(out, j["key"] + ".png"))]
    if not todo: print("nothing to do"); return
    bucket = f"{PROJ}-{name}-tmp".lower()
    r = S.post(f"{GS}/storage/v1/b?project={PROJ}", json={"name": bucket, "location": "US", "lifecycle": {"rule": [{"action": {"type": "Delete"}, "condition": {"age": 2}}]}})
    if r.status_code not in (200, 409): ok(r)
    cache = {}
    lines = []
    for j in todo:
        parts = [cache.setdefault(p, inline(p)) for p in j.get("refs", [])] + [{"text": j["prompt"]}]
        lines.append(json.dumps({"key": j["key"], "request": {"contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": j.get("aspect", "1:1")}}}}))
    try:
        ok(S.post(f"{GS}/upload/storage/v1/b/{bucket}/o?uploadType=media&name=in/jobs.jsonl", data="\n".join(lines).encode(), headers={"Content-Type": "application/jsonl"}))
        job = ok(S.post(f"{VX}/batchPredictionJobs", json={"displayName": name, "model": f"publishers/google/models/{MODEL}",
            "inputConfig": {"instancesFormat": "jsonl", "gcsSource": {"uris": [f"gs://{bucket}/in/jobs.jsonl"]}},
            "outputConfig": {"predictionsFormat": "jsonl", "gcsDestination": {"outputUriPrefix": f"gs://{bucket}/out/"}}})).json()
        print("job", job["name"], len(lines), "requests", flush=True)
        while True:
            st = ok(S.get(f"https://aiplatform.googleapis.com/v1/{job['name']}")).json()
            print(time.strftime("%H:%M:%S"), st["state"], st.get("completionStats", ""), flush=True)
            if st["state"] in ("JOB_STATE_SUCCEEDED", "JOB_STATE_FAILED", "JOB_STATE_CANCELLED", "JOB_STATE_EXPIRED", "JOB_STATE_PARTIALLY_SUCCEEDED"): break
            time.sleep(60)
        if "error" in st: print("error:", st["error"])
        saved = bad = 0
        by_key = {j["key"]: j for j in todo}
        rec = open(os.path.join(out, "records.jsonl"), "a", encoding="utf8")
        def note(key, ok, why=""):
            j = by_key.get(key, {})
            rec.write(json.dumps({"key": key, "model": MODEL, "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "batch": job["name"],
                                  "prompt": j.get("prompt"), "negative": j.get("negative"), "refs": j.get("refs", []), "saved": ok, "why": why}) + "\n")
        for o in S.get(f"{GS}/storage/v1/b/{bucket}/o?prefix=out/").json().get("items", []):
            if not o["name"].endswith(".jsonl"): continue
            for line in ok(S.get(f"{GS}/storage/v1/b/{bucket}/o/{o['name'].replace('/', '%2F')}?alt=media")).text.splitlines():
                r = json.loads(line)
                try:
                    d = next(p["inlineData"]["data"] for p in r["response"]["candidates"][0]["content"]["parts"] if "inlineData" in p)
                    open(os.path.join(out, r["key"] + ".png"), "wb").write(base64.b64decode(d)); saved += 1
                    note(r["key"], True)
                except Exception:
                    bad += 1; why = str(r.get("status") or r.get("response", ""))[:200]; print("no image:", r.get("key"), why)
                    note(r.get("key"), False, why)
        rec.close()
        print(f"{saved} saved, {bad} without an image")
    finally:
        for o in (S.get(f"{GS}/storage/v1/b/{bucket}/o").json().get("items", []) or []):
            S.delete(f"{GS}/storage/v1/b/{bucket}/o/{o['name'].replace('/', '%2F')}")
        print("bucket deleted:", S.delete(f"{GS}/storage/v1/b/{bucket}").status_code)

if __name__ == "__main__":
    main(*sys.argv[1:4])
