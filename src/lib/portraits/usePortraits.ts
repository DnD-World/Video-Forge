import { useEffect, useState } from "react";
import type { PortraitFile } from "./portraitRig";

// The preview's way in: the main process reads the file (storage:readFile).
// Kept for the session — a portrait is several MB and never changes on disk
// while the app runs.
const cache = new Map<string, Promise<PortraitFile>>();
function read(path: string) {
  let p = cache.get(path);
  if (!p) {
    p = window.byok.storage.readFile(path).then((buf) => JSON.parse(new TextDecoder().decode(buf)) as PortraitFile);
    cache.set(path, p);
  }
  return p;
}

/** path -> loaded portrait, or an error message. */
export function usePortraits(paths: (string | undefined)[]) {
  const [files, setFiles] = useState<Record<string, PortraitFile>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = paths.filter(Boolean).join("|");
  useEffect(() => {
    let live = true;
    for (const p of new Set(paths.filter((x): x is string => !!x))) {
      read(p)
        .then((f) => {
          if (!live) return;
          if (f?.v !== 1 || !f.svg || !f.data) throw new Error("not a portrait rig file");
          setFiles((m) => (m[p] === f ? m : { ...m, [p]: f }));
        })
        .catch((e) => { cache.delete(p); if (live) setErrors((m) => ({ ...m, [p]: String(e?.message ?? e) })); });
    }
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { files, errors };
}
