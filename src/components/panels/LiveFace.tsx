// ---------------------------------------------------------------------------
// A character's real face, small and alive — for the Cast "+" menu and the
// shelf (Ak, 13 Oct 2026: "thumbnails or animated thumbnails of the
// characters"). It blinks now and then; hover and it talks.
//
// The old thumbnails showed the base picture only, and the three ready-made
// characters' faces are drawn ON TOP of their base — so they appeared as
// bodies without faces. This draws the whole puppet with the same component
// the video uses.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { usePuppets } from "../../lib/puppets/usePuppets";
import { PuppetAvatar } from "../canvas/PuppetAvatar";

/** A made-up line of mouth shapes, looped while the pointer is over the face. */
const TALK = [1, 3, 0, 2, 4, 1, 7, 3, 0, 6, 2, 1, 8, 0, 3, 1];

export function LiveFace({ path, label, color, size = 56 }: { path: string; label: string; color?: string; size?: number }) {
  const { puppets, errors } = usePuppets([path]);
  const loaded = puppets[path];
  const [hover, setHover] = useState(false);
  const [tick, setTick] = useState(0);
  const [blink, setBlink] = useState(false);

  // Talking: a new mouth every 110 ms, only while hovered.
  useEffect(() => {
    if (!hover) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 110);
    return () => window.clearInterval(t);
  }, [hover]);

  // Blinking: every 2.5–4.5 s, 140 ms each. Offset by the name so a row of
  // faces does not blink in unison.
  useEffect(() => {
    let alive = true;
    let timer = 0;
    const seed = [...label].reduce((a, c) => a + c.charCodeAt(0), 0);
    const next = (n: number) => {
      timer = window.setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        window.setTimeout(() => alive && setBlink(false), 140);
        next(n + 1);
      }, 2500 + ((seed * 7 + n * 1300) % 2000));
    };
    next(0);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [label]);

  if (!loaded || errors[path]) {
    return (
      <span className="initial" style={{ borderColor: color }}>
        {label.slice(0, 1)}
      </span>
    );
  }
  const lids = loaded.puppet.eyes.lids;
  const closed = lids.closed ? "closed" : lids.half ? "half" : "open";
  return (
    <span className="live-face" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ width: size, height: size }}>
      <PuppetAvatar
        puppet={loaded.puppet}
        urls={loaded.urls}
        urlsReady={loaded.ready}
        viseme={hover ? TALK[tick % TALK.length] : 0}
        lidLeft={blink ? closed : "open"}
        lidRight={blink ? closed : "open"}
        size={size}
        bgOpacity={0.9}
        bgColor="#0b1418"
        borderOpacity={1}
        borderColor={color ?? "#76FFC2"}
        outlineShape="circle"
        frameWidth={2}
        sizeFraction={size / 1080}
      />
    </span>
  );
}
