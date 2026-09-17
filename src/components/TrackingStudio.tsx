"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { cameraError, openCamera, stopCamera } from "@/camera/CameraManager";
import { createHandTracker } from "@/vision/HandTracker";
import { GestureMatcher, emptyMatch } from "@/vision/GestureMatcher";
import { dance } from "@/choreography/dance";
import { gestures } from "@/gestures/catalog";
import { useDanceSession } from "@/session/useDanceSession";
import { SessionPanel } from "./SessionPanel";
import { openPalm } from "@/gestures/openPalm";
import { drawHandOverlay } from "./HandOverlay";

type Status = "idle" | "starting" | "tracking" | "error";

export function TrackingStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const session = useDanceSession(streamRef);
  const pauseSession = session.pause;
  const mirroredRef = useRef(true);
  const trackerRef = useRef<HandLandmarker | null>(null);
  const frameRef = useRef(0);
  const generation = useRef(0);
  const matcher = useRef(new GestureMatcher());
  const [match, setMatch] = useState(emptyMatch);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [mirrored, setMirrored] = useState(true);
  const [stats, setStats] = useState({ points: 0, fps: 0 });

  const release = useCallback(() => {
    pauseSession();
    generation.current += 1;
    matcher.current.reset();
    cancelAnimationFrame(frameRef.current);
    stopCamera(streamRef.current);
    streamRef.current = null;
    trackerRef.current?.close();
    trackerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, [pauseSession]);

  const stop = useCallback(() => {
    release();
    setStatus("idle");
    setStats({ points: 0, fps: 0 });
    setMatch(emptyMatch());
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
    setStats({ points: 0, fps: 0 });
    setMatch(emptyMatch());
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
      const tracker = await createHandTracker();
      if (token !== generation.current) { tracker.close(); return; }
      trackerRef.current = tracker;
      setStatus("tracking");
      let lastVideoTime = -1;
      let lastInference = 0;
      let lastReport = performance.now();
      let frames = 0;
      const tick = (now: number) => {
        if (token !== generation.current) return;
        try {
          if (video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastInference >= 33) {
            lastVideoTime = video.currentTime;
            lastInference = now;
            const result = tracker.detectForVideo(video, now);
            if (canvasRef.current) drawHandOverlay(canvasRef.current, video, result);
            const phase = session.engine.current.phase;
            matcher.current.setGesture(dance.steps[session.engine.current.step]);
            if (phase === "countdown") matcher.current.reset();
            const nextMatch = matcher.current.update(result, now, video.videoWidth / video.videoHeight);
            setMatch(nextMatch);
            session.frame(now, nextMatch.success, mirroredRef.current);
            frames++;
            if (now - lastReport >= 250) {
              setStats({ points: result.landmarks.reduce((sum, hand) => sum + hand.length, 0), fps: Math.round(frames * 1000 / (now - lastReport)) });
              frames = 0;
              lastReport = now;
            }
          }
          frameRef.current = requestAnimationFrame(tick);
        } catch (cause) {
          release();
          setError(cameraError(cause));
          setStatus("error");
        }
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
      <section className="intro"><p className="eyebrow">SMALL MOVES. SOMETHING GOOD.</p><h1>It starts with<br />a little <em>wave.</em></h1><p>Meet your camera. Find your hand. See your movement come to life, one point at a time.</p></section>
      <section className="studio" aria-label="Hand tracking playground">
        <div className="preview-panel">
          <div className="panel-heading"><span><i className={active ? "dot live" : "dot"} /> CAMERA PREVIEW</span><span className={recording ? "recording-indicator" : ""}>{recording ? "● RECORDING" : "NOT RECORDING"}</span></div>
          <div className={`preview ${mirrored ? "mirrored" : ""}`}>
            <video ref={videoRef} muted playsInline aria-label="Live camera preview" />
            <canvas ref={canvasRef} aria-hidden="true" />
            {!active && <div className="placeholder"><div className="hand-icon" aria-hidden="true">✋</div><h2>{starting ? "Getting ready…" : "Your stage is right here"}</h2><p>{starting ? "Allow camera access while we prepare hand tracking." : "Switch on your camera, then hold up both hands."}</p></div>}
            {active && <div className="tracking-label">{recording ? "Recording — hold your pose" : session.view.phase === "countdown" ? `Get ready: ${session.view.countdown}` : match.success ? "Both hands matched!" : gesture.name}</div>}
          </div>
          <div className="preview-footer"><span>↳ {mirrored ? "Mirrored view" : "Natural view"}</span><label><input type="checkbox" checked={mirrored} disabled={playing} onChange={(e) => { setMirrored(e.target.checked); mirroredRef.current = e.target.checked; }} /> Mirror camera</label></div>
        </div>
        <aside className="controls">
          <p className="eyebrow">GESTURE {session.view.step + 1} / 5</p><h2>Two hands.<br />Make your move.</h2><div className="pose-reference" aria-label={`Target gesture: ${gesture.name}`}><span aria-hidden="true">{gesture.symbol}</span><strong>{gesture.name}</strong></div><p>{gesture.instruction} Reach {Math.round(openPalm.threshold * 100)}% on each hand and hold together for {openPalm.minimumHoldMs} ms.</p>
          <div className="metrics"><div><strong>{stats.points}<small> / 42</small></strong><span>LANDMARKS</span></div><div><strong>{stats.fps}<small> fps</small></strong><span>TRACKING RATE</span></div></div>
          <div className="hand-matches">{(["Left", "Right"] as const).map((side) => {
            const hand = active ? match[side] : emptyMatch()[side];
            return <div className="hand-match" key={side}>
              <div><strong>{side} hand</strong><span>{hand.detected ? `${Math.round(hand.score * 100)}%` : "Not detected"}</span></div>
              <meter aria-label={`${side} hand match score`} min={0} max={1} value={hand.score} low={openPalm.threshold} high={openPalm.threshold} optimum={1} />
              <small>{hand.matched ? "Pose matched" : hand.hold > 0 ? "Keep holding…" : "Follow the pose above"}</small>
            </div>;
          })}</div>
          <div className="together" role="status">{active && match.success ? "Both hands matched." : "Hold both poses together"}</div>
          <progress aria-label="Both hands hold progress" max={1} value={active ? match.together : 0} />
          <div className="status" role="status"><i className={stats.points && active ? "dot live" : "dot"} />{starting ? "Preparing your camera & model" : active ? stats.points ? `${stats.points / 21} of 2 hands detected` : "Looking for your hands" : "Camera is off"}</div>
          {error && <p className="error" role="alert">{error}</p>}
          {devices.length > 1 && <label className="camera-select">Camera<select value={deviceId} disabled={starting || playing} onChange={(e) => { setDeviceId(e.target.value); if (active) void start(e.target.value); }}>{devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label>}
          <button className="primary" onClick={() => active || starting ? stop() : void start()}>{starting ? "Cancel" : active ? "Stop camera" : "Enable camera"}<span aria-hidden="true">↗</span></button>
          <p className="privacy">Hand tracking stays on your device. Recording starts only after you start the challenge and match a pose. No microphone audio is captured. Switching tabs stops the camera and pauses the challenge.</p>
        </aside>
      </section>
      <SessionPanel session={session} active={active} onBegin={(step) => { matcher.current.reset(); session.begin(step); }} onRender={() => { stop(); void session.render(); }} onDelete={() => { stop(); session.remove(); matcher.current.reset(); }} />
      <section className="tips" aria-label="Tracking tips"><div><span>01</span><p><strong>Find your light</strong>Face a light source so your hand is easy to see.</p></div><div><span>02</span><p><strong>Give it some space</strong>Keep both hands fully inside the frame, with space between them.</p></div><div><span>03</span><p><strong>Make a move</strong>Spread your fingers and watch the points follow.</p></div></section>
      <footer><span>A little movement. A lot of possibility.</span><span>PROTOTYPE / HAND SIGNAL DANCE</span></footer>
    </main>
  );
}
