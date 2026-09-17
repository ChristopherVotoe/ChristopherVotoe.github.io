"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { cameraError, openCamera, stopCamera } from "@/camera/CameraManager";
import { createHandTracker } from "@/vision/HandTracker";
import { drawHandOverlay } from "./HandOverlay";

type Status = "idle" | "starting" | "tracking" | "error";

export function TrackingStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<HandLandmarker | null>(null);
  const frameRef = useRef(0);
  const generation = useRef(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [mirrored, setMirrored] = useState(true);
  const [stats, setStats] = useState({ points: 0, fps: 0 });

  const release = useCallback(() => {
    generation.current += 1;
    cancelAnimationFrame(frameRef.current);
    stopCamera(streamRef.current);
    streamRef.current = null;
    trackerRef.current?.close();
    trackerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const stop = useCallback(() => {
    release();
    setStatus("idle");
    setStats({ points: 0, fps: 0 });
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
            frames++;
            if (now - lastReport >= 250) {
              setStats({ points: result.landmarks[0]?.length ?? 0, fps: Math.round(frames * 1000 / (now - lastReport)) });
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

  const active = status === "tracking";
  const starting = status === "starting";
  return (
    <main>
      <header className="topbar"><Link className="brand" href="/">✳ <span>Hand Signal Dance</span></Link><span className="badge">THE TRACKING LAB <i /></span></header>
      <section className="intro"><p className="eyebrow">SMALL MOVES. SOMETHING GOOD.</p><h1>It starts with<br />a little <em>wave.</em></h1><p>Meet your camera. Find your hand. See your movement come to life, one point at a time.</p></section>
      <section className="studio" aria-label="Hand tracking playground">
        <div className="preview-panel">
          <div className="panel-heading"><span><i className={active ? "dot live" : "dot"} /> CAMERA PREVIEW</span><span>NOT RECORDING</span></div>
          <div className={`preview ${mirrored ? "mirrored" : ""}`}>
            <video ref={videoRef} muted playsInline aria-label="Live camera preview" />
            <canvas ref={canvasRef} aria-hidden="true" />
            {!active && <div className="placeholder"><div className="hand-icon" aria-hidden="true">✋</div><h2>{starting ? "Getting ready…" : "Your stage is right here"}</h2><p>{starting ? "Allow camera access while we prepare hand tracking." : "Switch on your camera, then hold up one hand."}</p></div>}
            {active && <div className="tracking-label">{stats.points ? "Hand found. Looking good." : "Hold one hand in view"}</div>}
          </div>
          <div className="preview-footer"><span>↳ {mirrored ? "Mirrored view" : "Natural view"}</span><label><input type="checkbox" checked={mirrored} onChange={(e) => setMirrored(e.target.checked)} /> Mirror camera</label></div>
        </div>
        <aside className="controls">
          <p className="eyebrow">01 / FIND YOUR HAND</p><h2>Hello, hand.<br />Let’s get acquainted.</h2><p>Hold your hand open, with your palm facing the camera. We’ll connect the dots.</p>
          <div className="metrics"><div><strong>{stats.points}<small> / 21</small></strong><span>LANDMARKS</span></div><div><strong>{stats.fps}<small> fps</small></strong><span>TRACKING RATE</span></div></div>
          <div className="status" role="status"><i className={stats.points && active ? "dot live" : "dot"} />{starting ? "Preparing your camera & model" : active ? stats.points ? "Hand detected" : "Looking for your hand" : "Camera is off"}</div>
          {error && <p className="error" role="alert">{error}</p>}
          {devices.length > 1 && <label className="camera-select">Camera<select value={deviceId} disabled={starting} onChange={(e) => { setDeviceId(e.target.value); if (active) void start(e.target.value); }}>{devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label>}
          <button className="primary" onClick={() => active || starting ? stop() : void start()}>{starting ? "Cancel" : active ? "Stop camera" : "Enable camera"}<span aria-hidden="true">↗</span></button>
          <p className="privacy">Your camera is used for live hand tracking. No audio, recording, or uploads. Everything stays on this device. Switching tabs stops the camera.</p>
        </aside>
      </section>
      <section className="tips" aria-label="Tracking tips"><div><span>01</span><p><strong>Find your light</strong>Face a light source so your hand is easy to see.</p></div><div><span>02</span><p><strong>Give it some space</strong>Keep your whole hand inside the frame.</p></div><div><span>03</span><p><strong>Make a move</strong>Spread your fingers and watch the points follow.</p></div></section>
      <footer><span>A little movement. A lot of possibility.</span><span>PROTOTYPE / HAND TRACKING</span></footer>
    </main>
  );
}
