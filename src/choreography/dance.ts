import type { GestureId } from "../gestures/catalog.ts";

export const dance = {
  id: "first-wave",
  name: "The First Wave",
  bpm: 120,
  fps: 30,
  width: 960,
  height: 540,
  song: "first-wave.wav",
  captureMs: 4250,
  segmentFrames: 120,
  steps: ["inward-open", "raised-fists"] as GestureId[],
  // Alternate the two reference poses. Music and song-specific timing come later.
  order: [0, 1],
};

export const durationInFrames = dance.segmentFrames * dance.order.length;
