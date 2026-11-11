import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import type { PortraitFile } from "../../src/lib/portraits/portraitRig";
import { PortraitView } from "../../src/components/canvas/PortraitView";

// The render's way in: the file sits in the public dir (renderVideo.ts copies it
// there) and the first frame waits until the drawing and its pictures are in.

const files = new Map<string, Promise<PortraitFile>>();
function load(fileName: string) {
  let p = files.get(fileName);
  if (!p) {
    p = fetch(staticFile(fileName)).then(async (r) => {
      if (!r.ok) throw new Error(`portrait ${fileName}: ${r.status}`);
      const f = (await r.json()) as PortraitFile;
      // the layers are data-URI pictures: decoded before any frame is captured
      const uris = f.svg.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g) ?? [];
      await Promise.all(uris.map((u) => { const im = new Image(); im.src = u; return im.decode().catch(() => {}); }));
      return f;
    });
    files.set(fileName, p);
  }
  return p;
}

export function PortraitAvatar(props: {
  fileName: string;
  id: string;
  timeMs: number;
  viseme: number;
  prevViseme: number;
  mix: number;
  active: boolean;
  size: number;
}) {
  const [file, setFile] = useState<PortraitFile | null>(null);
  const [handle] = useState(() => delayRender(`portrait ${props.fileName}`));
  useEffect(() => {
    let live = true;
    load(props.fileName)
      .then((f) => { if (live) setFile(f); })
      .catch((e) => { console.error(e); continueRender(handle); });
    return () => { live = false; };
  }, [props.fileName, handle]);
  if (!file) return null;
  const { fileName: _f, ...rest } = props;
  return <PortraitView {...rest} file={file} onMounted={() => continueRender(handle)} />;
}
