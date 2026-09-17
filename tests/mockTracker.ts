// Only aliased into the isolated browser-test bundle, never the Next.js app.
import { openPalm } from "../src/gestures/openPalm";
import { gestures, type GestureId } from "../src/gestures/catalog";

declare global { interface Window { testGesture?: GestureId; testHands?: number } }
export async function createHandTracker() {
  return {
    close() {},
    detectForVideo(video: HTMLVideoElement) {
      const pattern = gestures[window.testGesture ?? "open-palms"].fingers;
      const points = structuredClone(openPalm.landmarks);
      [1, 5, 9, 13, 17].forEach((base, index) => { if (pattern[index] === 0) points[base + 3] = { ...points[base], y: points[base].y - .04 }; });
      if (pattern[0] === 0) points[4] = { ...points[5] };
      const aspect = video.videoWidth / video.videoHeight;
      const inward = window.testGesture === "inward-open";
      const landmarks = [1, -1].slice(0, window.testHands ?? 2).map((sign, index) => points.map((p) => ({ x: .25 + index * .5 + sign * (inward ? -p.y : p.x) * .16 / aspect, y: .7 + (inward ? p.x : p.y) * .16, z: p.z * .16 / aspect })));
      return { landmarks, worldLandmarks: [], handedness: landmarks.map((_, index) => [{ categoryName: index ? "Right" : "Left", score: .99 }]) };
    },
  };
}
