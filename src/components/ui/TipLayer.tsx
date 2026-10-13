// ---------------------------------------------------------------------------
// The hover help, for the whole window (13 Oct 2026).
//
// Any element with data-tip="…" shows a plain-words bubble on hover. It used
// to be a CSS ::after inside the element, which a scrolling panel clips — so
// the lowest controls in a panel had no help at all. One bubble, fixed to the
// window, placed below the control or above it when there is no room below.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";

interface Tip {
  text: string;
  left: number;
  top: number;
  above: boolean;
}

export function TipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  useEffect(() => {
    let current: Element | null = null;
    const over = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-tip]") ?? null;
      if (el === current) return;
      current = el;
      const text = el?.getAttribute("data-tip");
      if (!el || !text) return setTip(null);
      const r = el.getBoundingClientRect();
      const above = window.innerHeight - r.bottom < 140;
      setTip({ text, left: Math.min(Math.max(8, r.left), window.innerWidth - 296), top: above ? r.top - 6 : r.bottom + 6, above });
    };
    const hide = () => {
      current = null;
      setTip(null);
    };
    document.addEventListener("mouseover", over);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);
    return () => {
      document.removeEventListener("mouseover", over);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
    };
  }, []);
  if (!tip) return null;
  return (
    <div className="forge-tip" role="tooltip" style={{ left: tip.left, top: tip.top, transform: tip.above ? "translateY(-100%)" : undefined }}>
      {tip.text}
    </div>
  );
}
