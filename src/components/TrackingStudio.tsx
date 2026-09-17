"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "./SiteHeader";
import { cameraError, openCamera, stopCamera } from "@/camera/CameraManager";
import { dance } from "@/choreography/dance";
import { gestures } from "@/gestures/catalog";
import { useDance } from "@/session/DanceProvider";
import type { SmileFilter } from "@/vision/SmileFilter";
import { MotionGuide } from "./MotionGuide";

type Status = "idle" | "starting" | "tracking" | "error";

export function TrackingStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const smileCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const smileFilterRef = useRef<SmileFilter | null>(null);
  const smileEnabledRef = useRef(true);
  const [smileEnabled, setSmileEnabled] = useState(true);
  const [smilePreview, setSmilePreview] = useState(false);
  const [smileNotice, setSmileNotice] = useState("Preparing smile effect…");
  const { session, stream: streamRef } = useDance();
  const router = useRouter();
  const pauseSession = session.pause;
  const mirroredRef = useRef(true);
  const frameRef = useRef(0);
  const generation = useRef(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [mirrored, setMirrored] = useState(true);

  const release = useCallback(() => {
    pauseSession();
    generation.current += 1;
    cancelAnimationFrame(frameRef.current);
    stopCamera(streamRef.current);
    stopCamera(cameraRef.current);
    cameraRef.current = null;
    smileFilterRef.current?.close();
    smileFilterRef.current = null;
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [pauseSession, streamRef]);

  const stop = useCallback(() => {
    release();
    setStatus("idle");
    setSmilePreview(false);
  }, [release]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", stop);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", stop);
      release();
    };
  }, [release, stop]);

  async function start(selectedDevice = deviceId) {
    release();
    const token = generation.current;
    setError("");
    setStatus("starting");
    setSmilePreview(false);
    setSmileNotice("Preparing smile effect…");
    try {
      const stream = await openCamera(selectedDevice || undefined);
      if (token !== generation.current) { stopCamera(stream); return; }
      streamRef.current = stream;
      cameraRef.current = stream;
      const track = stream.getVideoTracks()[0];
      track.addEventListener("ended", () => {
        if (token === generation.current) {
          release();
          setError("The camera disconnected. Reconnect it and try again.");
          setStatus("error");
        }
      });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      if (token !== generation.current) return;
      const cameras = await navigator.mediaDevices.enumerateDevices();
      if (token !== generation.current) return;
      setDevices(cameras.filter((device) => device.kind === "videoinput"));
      setDeviceId(track.getSettings().deviceId ?? "");
      let filter: SmileFilter | null = null;
      try {
        const { SmileFilter } = await import("@/vision/SmileFilter");
        if (token !== generation.current) return;
        if (!smileCanvasRef.current?.captureStream) throw new Error("Canvas recording unavailable");
        filter = new SmileFilter(smileCanvasRef.current);
        await filter.initialize();
        if (token !== generation.current) { filter.close(); return; }
        filter.draw(video, performance.now(), smileEnabledRef.current);
        streamRef.current = smileCanvasRef.current.captureStream(30);
        smileFilterRef.current = filter;
        setSmilePreview(true);
        setSmileNotice("Smile effect ready · adjusts a neutral mouth gently");
      } catch {
        filter?.close();
        if (token !== generation.current) return;
        setSmileNotice("Smile effect unavailable — recording the original camera instead.");
      }
      setStatus("tracking");
      const tick = (now: number) => {
        if (token !== generation.current) return;
        try {
          if (video.readyState >= 2) smileFilterRef.current?.draw(video, now, smileEnabledRef.current);
        } catch {
          pauseSession();
          if (streamRef.current !== cameraRef.current) stopCamera(streamRef.current);
          streamRef.current = cameraRef.current;
          smileFilterRef.current?.close(); smileFilterRef.current = null;
          setSmilePreview(false);
          setSmileNotice("Smile effect stopped. Press Ready to record to continue with the original camera.");
        }
        session.frame(now, mirroredRef.current);
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (cause) {
      if (token !== generation.current) return;
      release();
      setError(cameraError(cause));
      setStatus("error");
    }
  }

  const autoStart = useEffectEvent(() => {
    if (!["review", "complete", "processing"].includes(session.engine.current.phase)) void start();
  });
  useEffect(() => {
    // Let the recording screen paint before prompting, and cancel on early navigation.
    const frame = requestAnimationFrame(() => autoStart());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (session.view.phase === "review" || session.view.phase === "complete") router.push("/results");
  }, [session.view.phase, router]);

  const gesture = gestures[dance.steps[session.view.step]];
  const recording = session.view.phase === "recording";
  const playing = ["countdown", "matching", "recording"].includes(session.view.phase);
  const active = status === "tracking";
  const starting = status === "starting";
  return (
    <main>
      <SiteHeader current="record" />
      <section className="flow-intro"><p className="eyebrow">THE HAND MOVEMENT TEST</p><h1>Follow the hands.</h1><p>Allow camera access if prompted. After the countdown, follow each guide for two repetitions.</p></section>
      <section className="studio" aria-label="Hand tracking playground">
        <div className="preview-panel">
          <div className="panel-heading"><span><i className={active ? "dot live" : "dot"} /> CAMERA PREVIEW</span><span className={recording ? "recording-indicator" : ""}>{recording ? "● RECORDING" : "NOT RECORDING"}</span></div>
          <div className={`preview ${mirrored ? "mirrored" : ""}`}>
            <video ref={videoRef} muted playsInline aria-label="Live camera preview" />
            <canvas ref={smileCanvasRef} className="smile-preview" style={{ visibility: active && smilePreview ? "visible" : "hidden" }} aria-label="Camera preview with smile effect" />
            {active && <MotionGuide overlay kind={session.view.step === 0 ? "inward" : "fists"} active phase={session.view.phase} countdown={session.view.countdown} />}
            {!active && <div className="placeholder"><div className="hand-icon" aria-hidden="true">✋</div><h2>{starting ? "Getting ready…" : "Your stage is right here"}</h2><p>{starting ? "Allow camera access to see your preview." : "Switch on your camera, then hold up both hands."}</p></div>}
            {active && <div className="tracking-label">{recording ? "Recording — follow the moving hands" : session.view.phase === "countdown" ? `Get ready: ${session.view.countdown}` : gesture.name}</div>}
          </div>
          <div className="preview-footer"><span>↳ {mirrored ? "Mirrored view" : "Natural view"}</span><label><input type="checkbox" checked={mirrored} disabled={playing} onChange={(e) => { setMirrored(e.target.checked); mirroredRef.current = e.target.checked; }} /> Mirror camera</label></div>
        </div>
        <aside className="controls">
          <p className="eyebrow">MOVEMENT {session.view.step + 1} / {dance.steps.length}</p>
          <h1>Follow the hands!</h1>
          <h2>Make sure to line up the green dot right under your chin.</h2>
          <p>{session.view.step === 0 ? "Point your open fingers inward. Move both hands together vertically, from up to down and back up." : "Show the backs of your closed fists. Start at the center, lift both fists a couple of inches, then return to the center."}</p>
          <p>When you’re ready, press “Ready to record?” to start a three-second countdown. Follow two repetitions of each movement. Your result will appear automatically when both movements are complete.</p>
          <div className="status" role="status"><i className={active ? "dot live" : "dot"} />{starting ? "Preparing your camera" : active ? "Camera ready" : "Camera is off"}</div>
          {error && <p className="error" role="alert">{error}</p>}
          {devices.length > 1 && <label className="camera-select">Camera<select value={deviceId} disabled={starting || playing} onChange={(e) => { setDeviceId(e.target.value); if (active) void start(e.target.value); }}>{devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label>}
          <div className="smile-option"><label><input type="checkbox" checked={smileEnabled} disabled={playing || !smilePreview} onChange={(event) => { smileEnabledRef.current = event.target.checked; setSmileEnabled(event.target.checked); }} /> Gentle smile effect</label><p>{smileEnabled ? smileNotice : "Smile effect off — your original expression is recorded."}</p><small>Experimental · Face tracking stays on this device. The effect is included in your recording.</small></div>
          <button className="primary" disabled={starting} onClick={() => playing ? stop() : active ? session.begin() : void start()}>{starting ? "Waiting for camera…" : playing ? "Stop recording" : active ? "Ready to record?" : "Enable camera"}<span aria-hidden="true">↗</span></button>
          <p className="privacy">Your test records automatically after each countdown and sends the clips to this app’s server to prepare your result. Follow the visual at your own pace; your movement is not scored. No microphone audio is captured. Switching tabs stops the camera and pauses the challenge.</p>
        </aside>
      </section>
      {session.view.error && <p className="error" role="alert">{session.view.error}</p>}
      <p className="session-note">Movement {session.view.step + 1} of {dance.steps.length} · {session.view.phase === "countdown" ? `Starting in ${session.view.countdown}…` : recording ? "Recording in progress" : "Follow the on-screen guide"}</p>
      <section className="tips" aria-label="Tracking tips"><div><span>01</span><p><strong>Find your light</strong>Face a light source so your hand is easy to see.</p></div><div><span>02</span><p><strong>Give it some space</strong>Keep both hands fully inside the frame, with space between them.</p></div><div><span>03</span><p><strong>Make a move</strong>Move with the guides: open hands up and down, then lift your fists and return.</p></div></section>
      <footer><span>A little movement. A lot of possibility.</span><span>PROTOTYPE / HAND SIGNAL DANCE</span></footer>
    </main>
  );
}
