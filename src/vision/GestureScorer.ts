import { openPalm } from "../gestures/openPalm.ts";
import type { Landmark } from "./GestureNormalizer.ts";
import { gestures, type GestureId } from "../gestures/catalog.ts";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const distance = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export function scoreOpenPalm(points: Landmark[]): number {
  if (points.length !== 21 || points.some((p) => ![p.x, p.y, p.z].every(Number.isFinite))) return 0;
  const poseError = points.reduce((sum, p, i) => sum + distance(p, openPalm.landmarks[i]), 0) / 21;
  const pose = Math.exp(-poseError * 0.65);
  const extension = [1, 5, 9, 13, 17].map((base) => {
    const length = distance(points[base], points[base + 1]) + distance(points[base + 1], points[base + 2]) + distance(points[base + 2], points[base + 3]);
    if (length < 1e-6) return 0;
    return clamp((distance(points[base], points[base + 3]) / length - .55) / .4);
  });
  // The weakest finger matters: a fist or a peace sign must not pass as an open palm.
  return clamp(Math.min(pose * .4 + extension.reduce((a, b) => a + b, 0) / 5 * .6, Math.min(...extension)));
}

export function scoreGesture(points: Landmark[], gesture: GestureId): number {
  if (gesture === "open-palms") return scoreOpenPalm(points);
  if (points.length !== 21 || points.some((p) => ![p.x, p.y, p.z].every(Number.isFinite))) return 0;
  const scores = [1, 5, 9, 13, 17].map((base, finger) => {
    const expected = gestures[gesture].fingers[finger];
    if (expected === null) return 1;
    // A tucked thumb can be straight across the fingers; measure its separation too.
    if (finger === 0 && expected === 0) return clamp((.7 - distance(points[4], points[5])) / .4);
    const length = distance(points[base], points[base + 1]) + distance(points[base + 1], points[base + 2]) + distance(points[base + 2], points[base + 3]);
    if (length < 1e-6) return 0;
    const ratio = distance(points[base], points[base + 3]) / length;
    const score = expected ? clamp((ratio - .55) / .4) : clamp((.85 - ratio) / .3);
    return finger === 0 ? Math.min(score, clamp((distance(points[4], points[5]) - .25) / .45)) : score;
  });
  return Math.min(...scores);
}
