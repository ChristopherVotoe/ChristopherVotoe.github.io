import type { Landmark } from "./GestureNormalizer.ts";
import type { GestureId } from "../gestures/catalog.ts";

/** Retain the image-space directions that per-hand rotation normalization removes. */
export function scorePairDirection(hand: Landmark[], other: Landmark[] | undefined, gesture: GestureId, aspect: number): number {
  if (gesture !== "inward-open" && gesture !== "raised-fists") return 1;
  if (!other || hand.length !== 21 || other.length !== 21) return 0;
  const x = (hand[9].x - hand[0].x) * aspect;
  const y = hand[9].y - hand[0].y;
  const length = Math.hypot(x, y);
  if (length < 1e-6) return 0;
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  if (gesture === "raised-fists") return clamp((-y / length - .3) / .5);
  const direction = Math.sign(other[0].x - hand[0].x);
  const separation = Math.abs(other[0].x - hand[0].x) * aspect / length;
  const thumbUp = (hand[4].y - hand[2].y) / length;
  return Math.min(clamp((direction * x / length - .3) / .5), clamp(separation - .5), clamp((-thumbUp - .05) / .25));
}
