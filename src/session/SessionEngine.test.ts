import test from "node:test";
import assert from "node:assert/strict";
import { SessionEngine } from "./SessionEngine.ts";
import { dance, durationInFrames } from "../choreography/dance.ts";

test("recording starts after an explicit start and countdown, without pose detection", () => {
  const e = new SessionEngine();
  assert.equal(e.tick(100), false);
  e.begin(100);
  assert.equal(e.tick(200), false);
  assert.equal(e.tick(2099), false);
  assert.equal(e.tick(2100), true);
  assert.equal(e.tick(2200), false);
  assert.throws(() => e.render());
});

test("two captures lead to review; retaking replaces one step", () => {
  const e = new SessionEngine();
  e.begin(0);
  for (let i = 0; i < dance.steps.length; i++) {
    assert.equal(e.step, i);
    assert.equal(e.tick(e.countdownUntil), true);
    e.finishCapture(e.countdownUntil + 1800);
  }
  assert.equal(e.phase, "review");
  e.begin(30000, 1);
  e.tick(32000); e.finishCapture(34000);
  assert.equal(e.captured.size, 2);
  assert.equal(e.phase, "review");
  e.render(); assert.equal(e.phase, "processing");
  e.begin(40000); assert.equal(e.phase, "processing");
  e.reset(); assert.equal(e.captured.size, 0); assert.equal(e.phase, "ready");
});

test("pausing discards an unfinished capture and resumes that step", () => {
  const e = new SessionEngine();
  e.begin(0); e.tick(2000);
  e.pause(); e.finishCapture(4000);
  assert.equal(e.captured.size, 0);
  e.begin(5000); assert.equal(e.step, 0); assert.equal(e.phase, "countdown");
});

test("both clips alternate in a eight-second silent timeline", () => {
  assert.equal(new Set(dance.order).size, 2);
  assert.equal(durationInFrames / dance.fps, 8);
  assert.equal(dance.segmentFrames / dance.fps, 4);
  assert.ok(dance.captureMs > dance.segmentFrames / dance.fps * 1000);
});
