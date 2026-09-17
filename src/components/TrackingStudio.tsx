"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cameraError, openCamera, stopCamera } from "@/camera/CameraManager";
import { dance } from "@/choreography/dance";
import { gestures } from "@/gestures/catalog";
import { useDanceSession } from "@/session/useDanceSession";
import { MotionGuide } from "./MotionGuide";
import { SessionPanel } from "./SessionPanel";

type Status = "idle" | "starting" | "tracking" | "error";

export function TrackingStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const session = useDanceSession(streamRef);
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
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [pauseSession]);

  const stop = useCallback(() => {
    release();
    setStatus("idle");
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
    try {
      const stream = await openCamera(selectedDevice || undefined);
      if (token !== generation.current) { stopCamera(stream); return; }
      streamRef.current = stream;
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
      setStatus("tracking");
      const tick = (now: number) => {
        if (token !== generation.current) return;
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

  const gesture = gestures[dance.steps[session.view.step]];
  const recording = session.view.phase === "recording";
  const playing = ["countdown", "matching", "recording"].includes(session.view.phase);
  const active = status === "tracking";
  const starting = status === "starting";
  return (
    <main>
      <header className="topbar"><Link className="brand" href="/">✳ <span>Hand Signal Dance</span></Link><span className="badge">THE TRACKING LAB <i /></span></header>
      <section className="intro"><p className="eyebrow">SMALL MOVES. SOMETHING GOOD.</p><h1>It starts with<br />a little <em>wave.</em></h1><p>Follow the moving hands. We’ll record each movement after a countdown, then stitch your clips together.</p></section>
      <section className="studio" aria-label="Hand tracking playground">
        <div className="preview-panel">
          <div className="panel-heading"><span><i className={active ? "dot live" : "dot"} /> CAMERA PREVIEW</span><span className={recording ? "recording-indicator" : ""}>{recording ? "● RECORDING" : "NOT RECORDING"}</span></div>
          <div className={`preview ${mirrored ? "mirrored" : ""}`}>
            <video ref={videoRef} muted playsInline aria-label="Live camera preview" />
            {active && <MotionGuide overlay kind={session.view.step === 0 ? "inward" : "fists"} active phase={session.view.phase} countdown={session.view.countdown} />}
            {!active && <div className="placeholder"><div className="hand-icon" aria-hidden="true">✋</div><h2>{starting ? "Getting ready…" : "Your stage is right here"}</h2><p>{starting ? "Allow camera access to see your preview." : "Switch on your camera, then hold up both hands."}</p></div>}
            {active && <div className="tracking-label">{recording ? "Recording — follow the moving hands" : session.view.phase === "countdown" ? `Get ready: ${session.view.countdown}` : gesture.name}</div>}
          </div>
          <div className="preview-footer"><span>↳ {mirrored ? "Mirrored view" : "Natural view"}</span><label><input type="checkbox" checked={mirrored} disabled={playing} onChange={(e) => { setMirrored(e.target.checked); mirroredRef.current = e.target.checked; }} /> Mirror camera</label></div>
        </div>
        <aside className="controls">
          <p className="eyebrow">MOVEMENT {session.view.step + 1} / {dance.steps.length}</p>
          <h2>Follow the hands.<br />Find your rhythm.</h2>
          <p>{session.view.step === 0 ? "Point your open fingers inward. Move both hands together vertically, from up to down and back up." : "Show the backs of your closed fists. Start at the center, lift both fists a couple of inches, then return to the center."}</p>
          <p>Follow two slow repetitions per clip. Recording begins automatically after the two-second countdown. You can review and retake either movement.</p>
          <div className="status" role="status"><i className={active ? "dot live" : "dot"} />{starting ? "Preparing your camera" : active ? "Camera ready" : "Camera is off"}</div>
          {error && <p className="error" role="alert">{error}</p>}
          {devices.length > 1 && <label className="camera-select">Camera<select value={deviceId} disabled={starting || playing} onChange={(e) => { setDeviceId(e.target.value); if (active) void start(e.target.value); }}>{devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label>}
          <button className="primary" onClick={() => active || starting ? stop() : void start()}>{starting ? "Cancel" : active ? "Stop camera" : "Enable camera"}<span aria-hidden="true">↗</span></button>
          <p className="privacy">Recording starts only after you start the challenge and the countdown finishes. Follow the visual at your own pace; your movement is not scored. No microphone audio is captured. Switching tabs stops the camera and pauses the challenge.</p>
        </aside>
      </section>
      <SessionPanel session={session} active={active} onBegin={(step) => { session.begin(step); document.querySelector(".preview-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} onRender={() => { stop(); void session.render(); }} onDelete={() => { stop(); session.remove(); }} />
      <section className="tips" aria-label="Tracking tips"><div><span>01</span><p><strong>Find your light</strong>Face a light source so your hand is easy to see.</p></div><div><span>02</span><p><strong>Give it some space</strong>Keep both hands fully inside the frame, with space between them.</p></div><div><span>03</span><p><strong>Make a move</strong>Move with the guides: open hands up and down, then lift your fists and return.</p></div></section>
      <footer><span>A little movement. A lot of possibility.</span><span>PROTOTYPE / HAND SIGNAL DANCE</span></footer>
    </main>
  );
}
