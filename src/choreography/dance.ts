import type { GestureId } from "../gestures/catalog.ts";

export const dance = {
  id: "first-wave",
  name: "The First Wave",
  bpm: 120,
  fps: 30,
  width: 960,
  height: 540,
  song: "first-wave.wav",
  captureMs: 1250,
  segmentFrames: 30,
  steps: ["open-palms", "fists", "peace", "point", "thumbs"] as GestureId[],
  // Every cut is two beats at 120 BPM. Reordering turns the prompts into a routine.
  order: [0, 2, 1, 3, 4, 2, 0, 3, 1, 4],
};

export const durationInFrames = dance.segmentFrames * dance.order.length;
