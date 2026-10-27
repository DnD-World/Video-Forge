// Stand-in for @remotion/transitions in the HyperFrames page. Only
// BackgroundLayer uses it, and under HyperFrames the background track is
// pre-built by ffmpeg (crossfades included) and played as a native clip, so
// nothing here ever draws. See remotionShim.tsx.
export const TransitionSeries = Object.assign((_: unknown) => null, {
  Sequence: (_: unknown) => null,
  Transition: (_: unknown) => null,
});
export const linearTiming = (o: unknown) => o;
export const fade = () => ({});
