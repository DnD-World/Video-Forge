// The Red Flag cast as one object: the brand's settings (cast-settings.json) plus every character
// file in characters/, in roster order, as `people`. The same shape the old cast.json had, so the
// sample pages read it unchanged. Draw a person with cardFor() from characters/core/character.mjs.
import SETTINGS from "./cast-settings.json" with { type: "json" };
import { CHARACTERS } from "./characters/index.mjs";
import { castFrom } from "../../characters/core/character.mjs";

export default castFrom(SETTINGS, CHARACTERS);
