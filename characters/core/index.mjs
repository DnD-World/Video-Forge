// The drawn-character engine, in one import (the app, Remotion and the tools
// use this; tests may import modules directly). Types: index.d.mts.
export { LOOKS, LOOK_IDS, lookById } from "./looks.mjs";
export { FIELDS, WARDROBE, CARD_VERSION, defaultCard, normalizeCard, checkField, fieldByKey } from "./card.mjs";
export { ITEMS, SLOTS, PATTERNS, itemById, normalizeWear } from "./wardrobe.mjs";
export { POSES, POSE_NAMES, solveRig, anchors, figureExtent } from "./rig.mjs";
export { MOUTHS, LIDS, BROWS, mouthShape } from "./face.mjs";
export { drawCharacter, drawFigure, frameFor, HAIR_STYLES } from "./draw.mjs";
export { applyScene } from "./fx.mjs";
export { characterState, poseBlendAt, facingView, autoPerformance } from "./perform.mjs";
export { cardPrompt, suggestPrompt, readCardAnswer, readSuggestions, cardSchemaText } from "./ai.mjs";
export { setCanvasFactory } from "./paint.mjs";
export { MOVE_VERSION, CHANNELS, REST, HAND_SHAPES, KINDS, STYLES, STYLE_IDS, normalizeMove, playMove, movesAt, moveProgress, moveLengthMs, readMoveTag, buildShelf } from "./moves.mjs";
export { PROPS, PROP_IDS, PROP_NAMES, drawProp } from "./props.mjs";
export { drawHand } from "./hands.mjs";
import { buildShelf as build } from "./moves.mjs";
import { SHELF_DATA } from "../moves/shelf.mjs";
/** The starter shelf, checked once (problems are caught by the tests, never at run time). */
export const SHELF = build(SHELF_DATA).shelf;
