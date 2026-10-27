// Proof: a React component driven ONLY by frame number — the way Video Forge's
// Remotion compositions are written — plugged into HyperFrames by registering a
// seekable "timeline" on window.__timelines.
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import AMP from "./project/amp.json";

const FPS = 30, DURATION = 10;
const LINES = [
  { who: "Καίτη", color: "#76FFC2", x: 540, y: 620, start: 0, end: 5.4, text: "Η σκυλίτσα μου κυνηγάει πεταλούδες. Κάθε μία. Κάθε φορά." },
  { who: "Σερίφης", color: "#5562B8", x: 540, y: 1180, start: 6.0, end: 13.68, text: "Δεν κυνηγάει πεταλούδες. Κυνηγάει κάτι που κινείται. ΑΥΤΟ ΕΙΝΑΙ ΤΟ ΕΝΣΤΙΚΤΟ!" },
];

function Face({ line, frame }) {
  const t = frame / FPS;
  const talking = t >= line.start && t < line.end;
  const amp = talking ? AMP[Math.min(frame, AMP.length - 1)] : 0;
  const blink = (frame % 97) < 4;
  const r = 170;
  return (
    <g transform={`translate(${line.x} ${line.y})`}>
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2, len = 14 + (talking ? amp * 70 * (0.6 + 0.4 * Math.sin(i * 1.7 + frame * 0.3)) : 4);
        return <line key={i} x1={Math.cos(a) * (r + 12)} y1={Math.sin(a) * (r + 12)} x2={Math.cos(a) * (r + 12 + len)} y2={Math.sin(a) * (r + 12 + len)} stroke={line.color} strokeWidth="6" strokeLinecap="round" opacity={talking ? 1 : 0.35} />;
      })}
      <circle r={r} fill="#0B2837" stroke={line.color} strokeWidth="4" />
      <ellipse cx="-55" cy="-30" rx="18" ry={blink ? 2 : 22} fill="#E9FEF5" />
      <ellipse cx="55" cy="-30" rx="18" ry={blink ? 2 : 22} fill="#E9FEF5" />
      <ellipse cx="0" cy="70" rx={50} ry={6 + amp * 55} fill="#071C26" stroke="#E9FEF5" strokeWidth="4" />
      <text y={r + 110} textAnchor="middle" fill="#E9FEF5" fontSize="44" fontFamily="sans-serif">{line.who}</text>
    </g>
  );
}

function Subtitle({ frame }) {
  const t = frame / FPS;
  const line = LINES.find((l) => t >= l.start && t < l.end);
  if (!line) return null;
  const words = line.text.split(" ");
  const k = Math.floor(((t - line.start) / (line.end - line.start)) * words.length);
  return (
    <div style={{ position: "absolute", left: 60, right: 60, bottom: 160, textAlign: "center", fontFamily: "sans-serif", fontSize: 58, fontWeight: 700, lineHeight: 1.25, color: "#E9FEF5", textShadow: "0 4px 18px #000" }}>
      {words.map((w, i) => <span key={i} style={{ color: i === k ? "#76FFC2" : undefined }}>{w} </span>)}
    </div>
  );
}

function Scene({ frame }) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        {LINES.map((l) => <Face key={l.who} line={l} frame={frame} />)}
      </svg>
      <Subtitle frame={frame} />
    </div>
  );
}

const root = createRoot(document.getElementById("react-layer"));
let current = 0;
const draw = (f) => { current = f; flushSync(() => root.render(<Scene frame={f} />)); };
draw(0);
// The seekable "timeline" HyperFrames drives. It seeks; we redraw synchronously.
const timeline = {
  pause() { return timeline; }, play() { return timeline; },
  duration() { return DURATION; }, totalDuration() { return DURATION; },
  time(t) { if (t === undefined) return current / FPS; draw(Math.round(t * FPS)); return timeline; },
  seek(t) { draw(Math.min(DURATION * FPS - 1, Math.round(t * FPS))); return timeline; },
  totalTime(t) { return timeline.time(t); }, progress() { return current / (DURATION * FPS); },
  isActive() { return false; }, paused() { return true; },
};
window.vfTimeline = timeline;
