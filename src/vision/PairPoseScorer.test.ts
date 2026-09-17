import test from "node:test";
import assert from "node:assert/strict";
import { openPalm } from "../gestures/openPalm.ts";
import { GestureMatcher } from "./GestureMatcher.ts";
import { scorePairDirection } from "./PairPoseScorer.ts";

const left = openPalm.landmarks.map((p) => ({ x: .15 - p.y * .14, y: .6 + p.x * .14, z: 0 }));
const right = openPalm.landmarks.map((p) => ({ x: .85 + p.y * .14, y: .6 + p.x * .14, z: 0 }));

test("inward open pose requires inward fingers, raised thumbs and both hands", () => {
  assert.equal(scorePairDirection(left, right, "inward-open", 1), 1);
  assert.equal(scorePairDirection(right, left, "inward-open", 1), 1);
  assert.equal(scorePairDirection(left, undefined, "inward-open", 1), 0);
  const outward = left.map((p) => ({ ...p, x: .3 - p.x }));
  assert.equal(scorePairDirection(outward, right, "inward-open", 1), 0);
  const down = left.map((p) => ({ ...p, y: 1.2 - p.y }));
  assert.equal(scorePairDirection(down, right, "inward-open", 1), 0);
});

test("inward open pose succeeds through normalization and the two-hand hold", () => {
  const matcher = new GestureMatcher(); matcher.setGesture("inward-open");
  const frame = { landmarks: [left, right], handedness: [[{ categoryName: "Left", score: .99 }], [{ categoryName: "Right", score: .99 }]] };
  for (let t = 0; t <= 400; t += 100) assert.equal(matcher.update(frame, t).success, t === 400);
});

test("fists must point up instead of down or sideways", () => {
  const up = openPalm.landmarks.map((p) => ({ x: .3 + p.x * .1, y: .7 + p.y * .1, z: 0 }));
  assert.equal(scorePairDirection(up, right, "raised-fists", 1), 1);
  assert.equal(scorePairDirection(left, right, "raised-fists", 1), 0);
  assert.equal(scorePairDirection(up.map((p) => ({ ...p, y: 1 - p.y })), right, "raised-fists", 1), 0);
});
