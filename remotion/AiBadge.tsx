// ---------------------------------------------------------------------------
// "Made with AI · Video Forge" (Ak, 13 Oct 2026): an honest label, in our own
// look. Viewers trust brands less when AI is hidden (Clutch, Aug 2026), and
// the EU AI Act asks for AI-made content to be marked. Optional — on by
// default — and small: a glass pill in a bottom corner, above the subtitles'
// level so a caption never covers it.
//
// Drawn by the composition (so preview and render match) and by the preview.
// ---------------------------------------------------------------------------

export function AiBadge({ width, height, corner = "right" }: { width: number; height: number; corner?: "left" | "right" }) {
  const s = Math.min(width, height);
  const font = Math.max(10, s * 0.022);
  return (
    <div
      style={{
        position: "absolute",
        bottom: height * 0.025,
        [corner]: width * 0.03,
        display: "flex",
        alignItems: "center",
        gap: font * 0.45,
        padding: `${font * 0.35}px ${font * 0.75}px ${font * 0.35}px ${font * 0.5}px`,
        borderRadius: 999,
        background: "rgba(3, 12, 16, 0.62)",
        border: "1px solid rgba(118, 255, 194, 0.45)",
        boxShadow: "0 0 18px -6px rgba(118, 255, 194, 0.6)",
        color: "#e9fff6",
        font: `500 ${font}px Sora, system-ui, sans-serif`,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        opacity: 0.88,
      }}
    >
      {/* the Forge spark */}
      <svg width={font * 1.15} height={font * 1.15} viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="aib" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8fb4ff" />
            <stop offset="1" stopColor="#76FFC2" />
          </linearGradient>
        </defs>
        <path d="M12 1.5l2.6 7.1 7.4 2.9-7.4 2.9L12 22.5l-2.6-8.1L2 11.5l7.4-2.9z" fill="url(#aib)" />
      </svg>
      <span>
        Made with AI · <b style={{ fontWeight: 650, color: "#76FFC2" }}>Video Forge</b>
      </span>
    </div>
  );
}
