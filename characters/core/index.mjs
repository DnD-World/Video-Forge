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
