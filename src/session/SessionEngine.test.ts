import test from "node:test";
import assert from "node:assert/strict";
import { SessionEngine } from "./SessionEngine.ts";
import { dance, durationInFrames } from "../choreography/dance.ts";

test("recording requires an explicit start, countdown, and match; no duplicate captures", () => {
  const e = new SessionEngine();
  assert.equal(e.tick(100, true), false);
  e.begin(100);
  assert.equal(e.tick(200, true), false);
  assert.equal(e.tick(2100, true), false);
  assert.equal(e.tick(2200, false), false);
  assert.equal(e.tick(2300, true), true);
  assert.equal(e.tick(2400, true), false);
  assert.throws(() => e.render());
});

test("five captures lead to review; retaking replaces one step without adding a sixth", () => {
  const e = new SessionEngine();
  e.begin(0);
  for (let i = 0; i < 5; i++) {
    assert.equal(e.step, i);
    e.tick(e.countdownUntil, false);
    assert.equal(e.tick(e.countdownUntil + 500, true), true);
    e.finishCapture(e.countdownUntil + 1800);
  }
  assert.equal(e.phase, "review");
  e.begin(30000, 2);
  e.tick(32000, false); e.tick(32500, true); e.finishCapture(34000);
  assert.equal(e.captured.size, 5);
  assert.equal(e.phase, "review");
  e.render(); assert.equal(e.phase, "processing");
  e.begin(40000); assert.equal(e.phase, "processing");
  e.reset(); assert.equal(e.captured.size, 0); assert.equal(e.phase, "ready");
});

test("pausing discards an unfinished capture and resumes that step", () => {
  const e = new SessionEngine();
  e.begin(0); e.tick(2000, false); e.tick(2500, true);
  e.pause(); e.finishCapture(4000);
  assert.equal(e.captured.size, 0);
  e.begin(5000); assert.equal(e.step, 0); assert.equal(e.phase, "countdown");
});

test("all five clips appear in a ten-second timeline with two-beat cuts", () => {
  assert.equal(new Set(dance.order).size, 5);
  assert.equal(durationInFrames / dance.fps, 10);
  assert.equal(dance.segmentFrames / dance.fps, 2 * 60 / dance.bpm);
  assert.ok(dance.captureMs > dance.segmentFrames / dance.fps * 1000);
});
