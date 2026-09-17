import type { GestureId } from "../gestures/catalog.ts";

export const dance = {
  id: "first-wave",
  name: "The First Wave",
  bpm: 86,
  fps: 30,
  width: 960,
  height: 540,
  song: "Join_Us_For_A_Bite_-_Song_by_JT_Machinima_(mp3.pm).mp3",
  audioStartSeconds: 24,
  audioEndSeconds: 35,
  captureMs: 4250,
  sourceFrames: 120,
  beatsPerClip: 2,
  firstMovementSeconds: 3,
  steps: ["inward-open", "raised-fists"] as GestureId[],
  // Repeat both clips; each recorded movement cycle occupies one beat.
  order: [0, 1],
};

export const durationInFrames = (dance.audioEndSeconds - dance.audioStartSeconds) * dance.fps;
export const framesPerBeat = dance.fps * 60 / dance.bpm;
export const framesPerClip = framesPerBeat * dance.beatsPerClip;
export const playbackRate = dance.sourceFrames / framesPerClip;
// Loop each movement within its own section, with an exact cut at three seconds.
const switchFrame = dance.firstMovementSeconds * dance.fps;
export const timeline = [
  { clipIndex: 0, start: 0, end: switchFrame },
  { clipIndex: 1, start: switchFrame, end: durationInFrames },
].flatMap((section) => Array.from({ length: Math.ceil((section.end - section.start) / framesPerClip) }, (_, index) => {
  const from = section.start + Math.round(index * framesPerClip);
  const end = Math.min(section.end, section.start + Math.round((index + 1) * framesPerClip));
  return { clipIndex: section.clipIndex, from, duration: end - from };
}));
