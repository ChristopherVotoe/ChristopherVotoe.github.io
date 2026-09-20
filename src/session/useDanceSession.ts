"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SessionEngine, type Phase } from "./SessionEngine";
import { useVideoEmail } from "@/email/useVideoEmail";
import { prepareRenderAudio, renderDance } from "@/rendering/renderDance";
import { dance } from "@/choreography/dance";
import { recordClip, recordingMimeType } from "@/recorder/ClipRecorder";

export type Capture = { blob: Blob; url: string; mirrored: boolean };

export function useDanceSession(stream: React.RefObject<MediaStream | null>) {
  const email = useVideoEmail();
  const resetEmail = email.reset;
  const audio = useRef<AudioContext | null>(null);
  const outputFile = useRef<File | null>(null);
  const outputFormat = useRef("webm");
  const engine = useRef(new SessionEngine());
  const clips = useRef<(Capture | null)[]>(Array.from({ length: dance.steps.length }, () => null));
  const output = useRef<string | null>(null);
  const operation = useRef<AbortController | null>(null);
  const [view, setView] = useState({ phase: "ready" as Phase, step: 0, countdown: 3, clips: Array.from({ length: dance.steps.length }, (): Capture | null => null), output: null as string | null, outputFormat: "webm", outputFile: null as File | null, error: "" });
  const publish = useCallback((error = "") => {
    const e = engine.current;
    setView({ phase: e.phase, step: e.step, countdown: Math.max(1, Math.ceil((e.countdownUntil - performance.now()) / 1000)), clips: [...clips.current], output: output.current, outputFormat: outputFormat.current, outputFile: outputFile.current, error });
  }, []);

  const pause = useCallback(() => {
    const e = engine.current;
    if (!["countdown", "matching", "recording"].includes(e.phase)) return;
    operation.current?.abort(); operation.current = null;
    e.pause(); publish();
  }, [publish]);

  const clear = useCallback(() => {
    resetEmail(true);
    operation.current?.abort(); operation.current = null;
    clips.current.forEach((clip) => { if (clip) URL.revokeObjectURL(clip.url); });
    clips.current = Array.from({ length: dance.steps.length }, () => null);
    if (output.current) URL.revokeObjectURL(output.current);
    output.current = null;
    outputFile.current = null;
    if (audio.current && audio.current.state !== "closed") void audio.current.close();
    audio.current = null;
    engine.current.reset();
  }, [resetEmail]);
  useEffect(() => clear, [clear]);

  const begin = (step?: number) => {
    try {
      if (!stream.current?.active) throw new Error("Enable your camera before starting or retaking a clip.");
      if (email.enabled && !email.consent) throw new Error("Agree to email your finished video before recording.");
      resetEmail();
      recordingMimeType();
      if (!audio.current || audio.current.state === "closed") audio.current = prepareRenderAudio();
      else void audio.current.resume().catch(() => {});
      engine.current.begin(performance.now(), step);
      if (output.current) URL.revokeObjectURL(output.current);
      output.current = null;
      outputFile.current = null;
      publish();
    } catch (error) { publish(error instanceof Error ? error.message : "Cannot start recording."); }
  };

  const frame = (now: number, mirrored: boolean) => {
    const e = engine.current;
    const before = e.phase;
    const shouldRecord = e.tick(now);
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
      if (!audio.current || audio.current.state === "closed") audio.current = prepareRenderAudio();
      const captures = clips.current;
      if (captures.some((clip) => !clip)) throw new Error("Record both movements first.");
      const blob = await renderDance(captures as Capture[], audio.current, controller.signal);
      outputFormat.current = blob.type.includes("mp4") ? "mp4" : "webm";
      if (controller.signal.aborted || operation.current !== controller) return;
      if (output.current) URL.revokeObjectURL(output.current);
      outputFile.current = new File([blob], `hand-signal-dance.${outputFormat.current}`, { type: blob.type.split(";")[0] });
      output.current = URL.createObjectURL(blob);
      engine.current.phase = "complete";
      operation.current = null;
      publish();
      void email.send(outputFile.current);
    } catch (error) {
      if (controller.signal.aborted || operation.current !== controller) return;
      operation.current = null;
      engine.current.phase = "review";
      publish(error instanceof Error ? error.message : "Video rendering failed.");
    }
  };

  return { view, email, engine, begin, frame, pause, render,
    prepareRetake: (step: number) => {
      resetEmail();
      operation.current?.abort(); operation.current = null;
      if (output.current) URL.revokeObjectURL(output.current);
      output.current = null;
      outputFile.current = null;
      engine.current.step = step;
      engine.current.phase = "paused";
      publish();
    },
    cancelRender: () => { operation.current?.abort(); operation.current = null; engine.current.phase = "review"; publish(); },
    remove: () => { clear(); publish(); },
  };
}
