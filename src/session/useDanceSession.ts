"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SessionEngine, type Phase } from "./SessionEngine";
import { dance } from "@/choreography/dance";
import { recordClip, recordingMimeType } from "@/recorder/ClipRecorder";

export type Capture = { blob: Blob; url: string; mirrored: boolean };

export function useDanceSession(stream: React.RefObject<MediaStream | null>) {
  const engine = useRef(new SessionEngine());
  const clips = useRef<(Capture | null)[]>(Array.from({ length: dance.steps.length }, () => null));
  const output = useRef<string | null>(null);
  const operation = useRef<AbortController | null>(null);
  const [view, setView] = useState({ phase: "ready" as Phase, step: 0, countdown: 2, clips: Array.from({ length: dance.steps.length }, (): Capture | null => null), output: null as string | null, error: "" });
  const publish = useCallback((error = "") => {
    const e = engine.current;
    setView({ phase: e.phase, step: e.step, countdown: Math.max(1, Math.ceil((e.countdownUntil - performance.now()) / 1000)), clips: [...clips.current], output: output.current, error });
  }, []);

  const pause = useCallback(() => {
    const e = engine.current;
    if (!["countdown", "matching", "recording"].includes(e.phase)) return;
    operation.current?.abort(); operation.current = null;
    e.pause(); publish();
  }, [publish]);

  const clear = useCallback(() => {
    operation.current?.abort(); operation.current = null;
    clips.current.forEach((clip) => { if (clip) URL.revokeObjectURL(clip.url); });
    clips.current = Array.from({ length: dance.steps.length }, () => null);
    if (output.current) URL.revokeObjectURL(output.current);
    output.current = null;
    engine.current.reset();
  }, []);
  useEffect(() => clear, [clear]);

  const begin = (step?: number) => {
    try {
      if (!stream.current?.active) throw new Error("Enable your camera before starting or retaking a clip.");
      recordingMimeType();
      engine.current.begin(performance.now(), step);
      if (output.current) URL.revokeObjectURL(output.current);
      output.current = null;
      publish();
    } catch (error) { publish(error instanceof Error ? error.message : "Cannot start recording."); }
  };

  const frame = (now: number, success: boolean, mirrored: boolean) => {
    const e = engine.current;
    const before = e.phase;
    const shouldRecord = e.tick(now, success);
    if (before === "countdown" || e.phase !== before) publish();
    if (!shouldRecord) return;
    const controller = new AbortController();
    operation.current = controller;
    const index = e.step;
    if (!stream.current) { e.pause(); publish("The camera is off."); return; }
    void recordClip(stream.current, dance.captureMs, controller.signal).then((blob) => {
      if (operation.current !== controller || controller.signal.aborted) return;
      operation.current = null;
      const old = clips.current[index];
      if (old) URL.revokeObjectURL(old.url);
      clips.current[index] = { blob, url: URL.createObjectURL(blob), mirrored };
      e.finishCapture(performance.now());
      publish();
    }).catch((error) => {
      if (operation.current !== controller || controller.signal.aborted) return;
      operation.current = null;
      e.pause(); publish(error instanceof Error ? error.message : "Recording failed. Please retry.");
    });
  };

  const render = async () => {
    const controller = new AbortController();
    try {
      engine.current.render();
      operation.current = controller;
      publish();
      const body = new FormData();
      clips.current.forEach((clip, i) => { if (clip) body.append(`clip${i}`, clip.blob, `clip-${i}.${clip.blob.type.includes("mp4") ? "mp4" : "webm"}`); });
      body.append("mirrored", JSON.stringify(clips.current.map((clip) => clip?.mirrored ?? false)));
      const response = await fetch("/api/render", { method: "POST", body, signal: controller.signal });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({ error: "Video rendering failed. Please retry." }));
        throw new Error(problem.error);
      }
      const blob = await response.blob();
      if (controller.signal.aborted || operation.current !== controller) return;
      if (output.current) URL.revokeObjectURL(output.current);
      output.current = URL.createObjectURL(blob);
      engine.current.phase = "complete";
      operation.current = null;
      publish();
    } catch (error) {
      if (controller.signal.aborted) return;
      operation.current = null;
      engine.current.phase = "review";
      publish(error instanceof Error ? error.message : "Video rendering failed.");
    }
  };

  return { view, engine, begin, frame, pause, render,
    cancelRender: () => { operation.current?.abort(); operation.current = null; engine.current.phase = "review"; publish(); },
    remove: () => { clear(); publish(); },
  };
}
