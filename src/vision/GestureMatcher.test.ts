import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHand, type Landmark } from "./GestureNormalizer.ts";
import { scoreOpenPalm } from "./GestureScorer.ts";
import { GestureMatcher } from "./GestureMatcher.ts";
import { openPalm } from "../gestures/openPalm.ts";
import { scoreGesture } from "./GestureScorer.ts";
import { gestures, type GestureId } from "../gestures/catalog.ts";

const palm = openPalm.landmarks;
const flipped = palm.map((p) => ({ ...p, x: -p.x }));
const detection = (hands: [string, Landmark[]][]) => ({ landmarks: hands.map((h) => h[1]), handedness: hands.map((h) => [{ categoryName: h[0], score: .99 }]) });
const both = detection([["Left", palm], ["Right", flipped]]);

test("normalization removes translation, scale, rotation, reflection and image aspect", () => {
  for (const aspect of [1, 16 / 9, 9 / 16]) for (const mirror of [-1, 1]) {
    const angle = .6, scale = .13;
    const transformed = palm.map((p) => ({ x: .4 + scale * (mirror * p.x * Math.cos(angle) - p.y * Math.sin(angle)) / aspect, y: .7 + scale * (mirror * p.x * Math.sin(angle) + p.y * Math.cos(angle)), z: p.z * scale / aspect }));
    const normalized = normalizeHand(transformed, aspect)!;
    normalized.forEach((p, i) => assert.ok(Math.hypot(p.x - palm[i].x, p.y - palm[i].y, p.z - palm[i].z) < 1e-10));
    assert.ok(scoreOpenPalm(normalized) >= .85);
  }
});

test("invalid and degenerate hands fail safely", () => {
  assert.equal(normalizeHand([]), null);
  assert.equal(normalizeHand(palm.map(() => ({ x: 0, y: 0, z: 0 }))), null);
  assert.equal(normalizeHand(palm.map((p) => ({ ...p, z: NaN }))), null);
  assert.equal(scoreOpenPalm([]), 0);
});

function folded(bases: number[]) {
  const points = structuredClone(palm);
  for (const base of bases) points[base + 3] = { ...points[base], y: points[base].y - .04 };
  return points;
}

test("a fist, peace sign, or single curled finger cannot match an open palm", () => {
  assert.ok(scoreOpenPalm(palm) >= .85);
  for (const bases of [[1, 5, 9, 13, 17], [1, 13, 17], [5]]) assert.ok(scoreOpenPalm(folded(bases)) < .85);
});

test("five gesture patterns score independently and reject other target finger patterns", () => {
  const poses = Object.fromEntries(Object.entries(gestures).map(([id, gesture]) => {
    const points = folded([1, 5, 9, 13, 17].filter((_, i) => gesture.fingers[i] === 0));
    if (gesture.fingers[0] === 0) points[4] = { ...points[5] };
    return [id, points];
  })) as Record<GestureId, Landmark[]>;
  for (const target of (["open-palms", "fists", "peace", "point", "thumbs"] as GestureId[])) {
    assert.ok(scoreGesture(poses[target], target) >= .85, target);
    for (const other of (["open-palms", "fists", "peace", "point", "thumbs"] as GestureId[])) {
      if (other !== target) assert.ok(scoreGesture(poses[other], target) < .85, `${other} should not match ${target}`);
    }
  }
});

test("switching gesture resets both hands' hold history", () => {
  const matcher = new GestureMatcher();
  for (let t = 0; t <= 400; t += 100) matcher.update(both, t);
  matcher.setGesture("peace");
  assert.equal(matcher.update(both, 500).success, false);
});

test("two simultaneous hands pass only after 400 ms, regardless of result order", () => {
  const matcher = new GestureMatcher();
  for (let t = 0; t <= 400; t += 100) {
    const result = matcher.update(t % 200 ? detection([["Right", flipped], ["Left", palm]]) : both, t);
    assert.equal(result.success, t === 400);
    assert.ok(result.Left.score >= .85 && result.Right.score >= .85);
  }
});

test("one hand can match independently but cannot complete the two-hand challenge", () => {
  const matcher = new GestureMatcher();
  for (let t = 0; t <= 500; t += 100) {
    const result = matcher.update(detection([["Left", palm]]), t);
    assert.equal(result.success, false);
    assert.equal(result.Right.detected, false);
    if (t >= 400) assert.equal(result.Left.matched, true);
  }
});

test("staggered hand holds require an overlapping 400 ms", () => {
  const matcher = new GestureMatcher();
  for (let t = 0; t <= 800; t += 100) {
    const result = matcher.update(t < 400 ? detection([["Left", palm]]) : both, t);
    assert.equal(result.success, t === 800);
  }
});

test("disappearance, ambiguous identity, invalid pose and long frame gaps reset success", () => {
  for (const interruption of [detection([]), detection([["Left", palm], ["Left", palm]]), detection([["Left", folded([5])], ["Right", flipped]])]) {
    const matcher = new GestureMatcher();
    for (let t = 0; t <= 400; t += 100) matcher.update(both, t);
    assert.equal(matcher.update(interruption, 500).success, false);
    assert.equal(matcher.update(both, 600).success, false);
  }
  const matcher = new GestureMatcher();
  matcher.update(both, 0);
  assert.equal(matcher.update(both, 1000).success, false);
  matcher.reset();
  assert.equal(matcher.update(both, 1100).together, 0);
});
