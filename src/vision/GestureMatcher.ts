import { normalizeHand, type Landmark } from "./GestureNormalizer.ts";
import { scoreGesture } from "./GestureScorer.ts";
import type { GestureId } from "../gestures/catalog.ts";
import { openPalm } from "../gestures/openPalm.ts";

export type Side = "Left" | "Right";
export type HandMatch = { detected: boolean; score: number; hold: number; matched: boolean };
export type MatchFrame = { Left: HandMatch; Right: HandMatch; together: number; success: boolean };
type Detection = { landmarks: Landmark[][]; handedness: { categoryName: string; score: number }[][] };
const emptyHand = (): HandMatch => ({ detected: false, score: 0, hold: 0, matched: false });
export const emptyMatch = (): MatchFrame => ({ Left: emptyHand(), Right: emptyHand(), together: 0, success: false });

export class GestureMatcher {
  private target: GestureId = "open-palms";
  private previous: Partial<Record<Side, Landmark[]>> = {};
  private since: Partial<Record<Side, number>> = {};
  private togetherSince: number | undefined;
  private lastTime: number | undefined;

  reset() { this.previous = {}; this.since = {}; this.togetherSince = undefined; this.lastTime = undefined; }

  setGesture(target: GestureId) {
    if (target !== this.target) { this.target = target; this.reset(); }
  }

  update(result: Detection, now: number, aspect = 1): MatchFrame {
    if (!Number.isFinite(now)) { this.reset(); return emptyMatch(); }
    if (this.lastTime !== undefined && (now <= this.lastTime || now - this.lastTime > 200)) this.reset();
    this.lastTime = now;
    const frame = emptyMatch();
    for (const side of ["Left", "Right"] as const) {
      // Never assign history by result index: MediaPipe may reorder the hands.
      const indices = result.landmarks.map((_, i) => i).filter((i) => result.handedness[i]?.[0]?.categoryName === side && result.handedness[i][0].score >= .6);
      const raw = indices.length === 1 ? normalizeHand(result.landmarks[indices[0]], aspect) : null;
      if (!raw) { delete this.previous[side]; delete this.since[side]; continue; }
      const prior = this.previous[side];
      const smooth = raw.map((p, i) => prior ? { x: .5 * p.x + .5 * prior[i].x, y: .5 * p.y + .5 * prior[i].y, z: .5 * p.z + .5 * prior[i].z } : p);
      this.previous[side] = smooth;
      const score = scoreGesture(smooth, this.target);
      // Raw validity prevents smoothing from continuing a hold after the pose is lost.
      const valid = score >= openPalm.threshold && scoreGesture(raw, this.target) >= openPalm.threshold;
      if (!valid) delete this.since[side];
      else this.since[side] ??= now;
      const hold = valid ? Math.min(1, (now - this.since[side]!) / openPalm.minimumHoldMs) : 0;
      frame[side] = { detected: true, score, hold, matched: hold >= 1 };
    }
    const bothValid = this.since.Left !== undefined && this.since.Right !== undefined;
    if (bothValid) this.togetherSince ??= now;
    else this.togetherSince = undefined;
    frame.together = this.togetherSince === undefined ? 0 : Math.min(1, (now - this.togetherSince) / openPalm.minimumHoldMs);
    frame.success = frame.together >= 1;
    return frame;
  }
}
