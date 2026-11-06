// ---------------------------------------------------------------------------
// A drawn character's MAIN COLOUR is their speaker colour (character creator, 6 Nov 2026).
//
// Everything in the picture that is "about" a speaker already takes one colour,
// `borderColor`: their sound bars (any position, the bottom bar included) and
// the bars' glow, the spoken word in the subtitles (when "word colour from the
// speaker" is on, the default), the frame and its glow around them, their
// stretch on the timeline, their name chip in the batch list. So the main colour
// is wired in ONE place: whenever a speaker is added, changed or loaded and
// their card has a main colour, `borderColor` is set to it. No renderer needed
// to learn a second colour, and the two can't drift apart.
//
// A character without a main colour (every speaker before this, every puppet)
// keeps whatever colour was picked for them.
// ---------------------------------------------------------------------------

import type { SpeakerConfig } from "./types";

const HEX = /^#[0-9a-f]{6}$/i;

/** The character's main colour, when this speaker is a drawn character that has one. */
export function mainColorOf(sp: Pick<SpeakerConfig, "character">): string | null {
  const c = sp.character?.signature;
  return typeof c === "string" && HEX.test(c) ? c.toLowerCase() : null;
}

/** The speaker with their colour taken from their character's main colour (unchanged without one). */
export function withCharacterColor<T extends Pick<SpeakerConfig, "character" | "borderColor">>(sp: T): T {
  const c = mainColorOf(sp);
  return c && sp.borderColor?.toLowerCase() !== c ? { ...sp, borderColor: c } : sp;
}
