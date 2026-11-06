// The drawn-character engine, in one import (the app, Remotion and the tools
// use this; tests may import modules directly). Types: index.d.mts.
export { LOOKS, LOOK_IDS, lookById, stageOf } from "./looks.mjs";
export { FIELDS, WARDROBE, CARD_VERSION, defaultCard, normalizeCard, checkField, fieldByKey, PARTS, PART_IDS, partOf, allLocked, normalizeLocks, keepLocked, VOICE_ENGINES, PITCH_RANGE, SPEED_RANGE, normalizeVoice } from "./card.mjs";
export { CHARACTER_KIND, CHARACTER_VERSION, normalizeCharacter, cardFor, castFrom, characterToFile, wearsColor } from "./character.mjs";
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
export { performAt } from "./motion.mjs";
export { followAt } from "./follow.mjs";
export { TAKE_VERSION, takeAt, normalizeTake, reference as takeNeutral, activeSpan, takeToMove, trimActedPhrases, clipOnShelf, clipMoveId } from "./acted.mjs";
export { poseArms } from "./rig.mjs";
import { buildShelf as build } from "./moves.mjs";
import { SHELF_DATA } from "../moves/shelf.mjs";
import { ACTED_DATA } from "../moves/acted/shelf.mjs";
import { trimActedPhrases } from "./acted.mjs";
/**
 * The starter shelf plus the moves copied from real people (moves/acted), checked once
 * (problems are caught by the tests, never at run time). Recorded moves never change what
 * a starter tag does: their clashing phrases are dropped (trimActedPhrases).
 */
export const SHELF = build([...SHELF_DATA, ...trimActedPhrases(SHELF_DATA, ACTED_DATA)]).shelf;
export { SUBJECTS, FORMS, SHARED_FIELDS, normalizeShared, formOf, activeCard, cardDiff, applyDiff, describeCard, puppetPickPrompt, readPuppetPick } from "./profile.mjs";
export { DRAWN_PRESETS } from "../presets/drawn.mjs";
export { COSTUMES } from "../presets/costumes.mjs";
