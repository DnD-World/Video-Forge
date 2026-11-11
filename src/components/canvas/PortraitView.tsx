import { useLayoutEffect, useRef, useState } from "react";
import { mountPortrait, mouthFor, prefixSvg, type PortraitFile } from "../../lib/portraits/portraitRig";

// A talking illustrated portrait (brands/scotus/rig). The same component in the
// preview and in the render; each loads the file its own way and hands it in.

const W = 896, H = 1200;
let next = 0;
const seedOf = (id: string) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);

/** `size` is the slot's size in px: the picture fits it by height. `onMounted`
 *  fires once the drawing is in the page (the render waits for it). */
export function PortraitView(props: {
  file: PortraitFile;
  id: string;
  timeMs: number;
  viseme: number;
  prevViseme: number;
  mix: number;
  active: boolean;
  size: number;
  onMounted?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const pose = useRef<ReturnType<typeof mountPortrait> | null>(null);
  const [prefix] = useState(() => `pr${next++}_`);
  const { file } = props;

  useLayoutEffect(() => {
    if (!box.current) return;
    box.current.innerHTML = prefixSvg(file.svg, prefix);
    const svg = box.current.querySelector("svg");
    svg?.setAttribute("width", "100%"); svg?.setAttribute("height", "100%");
    svg?.setAttribute("preserveAspectRatio", "xMidYMid meet");
    pose.current = mountPortrait(box.current, file.data, prefix);
    props.onMounted?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, prefix]);

  const h = props.size, w = (props.size * W) / H;
  useLayoutEffect(() => {
    if (!pose.current) return;
    // The shapes were tuned on the full 1200px portrait; shown smaller in a video
    // they read as a twitch. Opened up as the picture shrinks, at most 2.2x
    // (checked at full size: past that the lips look cartoonish).
    const gain = Math.max(1, Math.min(2.2, (H * 0.85) / h));
    const q = mouthFor(props.prevViseme, props.viseme, props.mix, (file.data.f.scale ?? 1) * gain);
    pose.current(props.timeMs / 1000, q, seedOf(props.id), props.active ? 1 : 0);
  });

  return (
    <div style={{ width: w, height: h, position: "relative" }}>
      <div
        ref={box}
        style={{
          position: "absolute", inset: 0, borderRadius: w * 0.012, overflow: "hidden",
          // the speaker gets a warm glow; the others sit in shadow
          boxShadow: props.active ? `0 0 ${w * 0.06}px ${w * 0.012}px rgba(232,196,120,.55)` : `0 ${w * 0.02}px ${w * 0.05}px rgba(0,0,0,.55)`,
        }}
      />
    </div>
  );
}
