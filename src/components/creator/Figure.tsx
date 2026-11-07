// The creator's two kinds of character picture: a still (picture lists, the
// roster) and a moving clip (the stage, the preview strip).

import { useEffect, useLayoutEffect, useRef } from "react";
import type { CharacterCard, Look } from "../../../characters/core/index.mjs";
import { calmMotion, clipFrame, drawIn, drawStill, subscribe, type Clip, type Framing } from "./drawing";

// Stills are drawn a few per frame, so opening a list of twenty pictures never freezes the screen.
const queue: (() => void)[] = [];
let pumping = false;
function later(job: () => void) {
  queue.push(job);
  if (pumping) return;
  pumping = true;
  const pump = () => {
    const until = performance.now() + 10;
    while (queue.length && performance.now() < until) queue.shift()!();
    if (queue.length) requestAnimationFrame(pump); else pumping = false;
  };
  requestAnimationFrame(pump);
}

export function StillFigure({ card, look, framing, view = 0, className = "" }: { card: CharacterCard; look: Look; framing: Framing; view?: number; className?: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(card) + look.id + framing + view + String((look as { eyes?: unknown }).eyes);
  useLayoutEffect(() => {
    let live = true;
    later(() => { if (live && cv.current) drawStill(cv.current, card, look, framing, view); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <canvas ref={cv} className={`cr-still ${className}`} aria-hidden />;
}

/**
 * A clip, looping. `fps` keeps the small ones cheap; off screen it doesn't draw at all.
 * `epoch` restarts the clip from the beginning when it changes.
 */
export function LiveFigure({ card, look, clip, framing, fps = 30, className = "", epoch = 0, seed = 2, pad }: {
  card: CharacterCard; look: Look; clip: Clip; framing?: Framing; fps?: number; className?: string; epoch?: number; seed?: number; pad?: number;
}) {
  const cv = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ card, look, clip, framing, seed, pad });
  latest.current = { card, look, clip, framing, seed, pad };
  const drawn = useRef(-1);
  useEffect(() => {
    const el = cv.current;
    if (!el) return;
    let visible = true;
    const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }, { rootMargin: "60px" });
    io.observe(el);
    const t0 = performance.now();
    const step = 1000 / fps;
    const calm = calmMotion();
    // small clips (fps under 30) take turns with each other and draw at screen size, not double
    const small = fps < 30;
    const paint = (now: number) => {
      const { card: c, look: l, clip: k, framing: fr, seed: s, pad: p } = latest.current;
      const t = calm ? 1200 : now - t0;
      const { state, mirror } = clipFrame(k, t, s);
      drawIn(el, c, l, fr ?? k.framing ?? "full", state, { mirror, pad: p, maxDpr: small ? 1 : 2 });
    };
    paint(t0);
    const stop = subscribe((now) => {
      if (!visible || calm) return;
      if (!small && now - drawn.current < step) return;
      drawn.current = now;
      paint(now);
    }, small);
    return () => { stop(); io.disconnect(); };
  }, [fps, epoch]);
  // a calm screen still shows changes at once
  useEffect(() => {
    if (!calmMotion() || !cv.current) return;
    const { state, mirror } = clipFrame(clip, 1200, seed);
    drawIn(cv.current, card, look, framing ?? clip.framing ?? "full", state, { mirror, pad });
  });
  return <canvas ref={cv} className={`cr-live ${className}`} aria-hidden />;
}
