// An ⓘ next to a heading that opens a short explanation in place.
//
// Inline rather than a floating tooltip: panels are clipped with clip-path, so
// anything positioned outside its box gets sliced off (see Picker.tsx for the
// long version of that story). Pushing the text below costs a little layout
// shift and can never be cut in half.

import { useState, type ReactNode } from "react";

export function Hint({ children, label = "What is this?" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        title={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`ml-2 inline-grid h-5 w-5 place-items-center rounded-full border text-[11px] leading-none align-middle
          ${open ? "border-accent text-accent-bright" : "border-accent/40 text-accent/80 hover:border-accent hover:text-accent-bright"}`}
      >
        i
      </button>
      {open && (
        <span className="block mt-2 text-sm font-normal normal-case tracking-normal text-neutral-300 border-l-2 border-accent/50 pl-3">
          {children}
        </span>
      )}
    </>
  );
}
