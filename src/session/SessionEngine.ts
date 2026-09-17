import { dance } from "../choreography/dance.ts";

export type Phase = "ready" | "countdown" | "matching" | "recording" | "paused" | "review" | "processing" | "complete";
export class SessionEngine {
  phase: Phase = "ready";
  step = 0;
  captured = new Set<number>();
  countdownUntil = 0;

  begin(now: number, step = this.step) {
    if (this.phase === "recording" || this.phase === "processing") return;
    if (!Number.isInteger(step) || step < 0 || step >= dance.steps.length) throw new Error("Invalid challenge step.");
    this.step = step;
    this.phase = "countdown";
    this.countdownUntil = now + 2000;
  }

  tick(now: number): boolean {
    if (this.phase !== "countdown" || now < this.countdownUntil) return false;
    this.phase = "recording";
    return true;
  }

  finishCapture(now: number) {
    if (this.phase !== "recording") return;
    this.captured.add(this.step);
    const next = dance.steps.findIndex((_, index) => !this.captured.has(index));
    if (next === -1) this.phase = "review";
    else { this.phase = "paused"; this.begin(now, next); }
  }

  pause() { if (["countdown", "matching", "recording"].includes(this.phase)) this.phase = "paused"; }
  render() {
    if (this.captured.size !== dance.steps.length || this.phase !== "review") throw new Error("Record and review both clips first.");
    this.phase = "processing";
  }
  reset() { this.phase = "ready"; this.step = 0; this.captured.clear(); this.countdownUntil = 0; }
}
