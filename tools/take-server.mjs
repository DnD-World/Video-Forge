// The samples pages plus a place to save tracked takes (motion library from
// free stock clips, 3 Nov 2026). Local only.
//   node tools/take-server.mjs [port]
//   GET  /…                      files from characters/samples
//   GET  /acted/…                files from characters/moves/acted
//   POST /api/take?id=<move id>  body: a take (JSON) → characters/moves/acted/takes/<id>.json
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLES = path.join(root, "characters/samples");
const ACTED = path.join(root, "characters/moves/acted");
const port = Number(process.argv[2] ?? 41970);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
const ID = /^[a-z0-9][a-z0-9-]{0,60}$/;

function serve(res, base, rel) {
  const file = path.resolve(base, "." + decodeURIComponent(rel));
  if (!file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "POST" && url.pathname === "/api/take") {
    const id = url.searchParams.get("id") ?? "";
    if (!ID.test(id)) { res.writeHead(400); res.end("bad id"); return; }
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 20e6) req.destroy(); });
    req.on("end", () => {
      try {
        const take = JSON.parse(body);
        if (!Array.isArray(take.frames) || !take.frames.length) throw new Error("no frames");
        fs.mkdirSync(path.join(ACTED, "takes"), { recursive: true });
        fs.writeFileSync(path.join(ACTED, "takes", id + ".json"), JSON.stringify(take));
        res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: true, id, frames: take.frames.length }));
      } catch (e) { res.writeHead(400); res.end(String(e.message || e)); }
    });
    return;
  }
  if (url.pathname.startsWith("/acted/")) return serve(res, ACTED, url.pathname.slice("/acted".length));
  serve(res, SAMPLES, url.pathname === "/" ? "/index.html" : url.pathname);
}).listen(port, "127.0.0.1", () => console.log(`take server on http://127.0.0.1:${port}`));
