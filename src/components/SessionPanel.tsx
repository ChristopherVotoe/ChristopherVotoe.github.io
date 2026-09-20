"use client";

import { VideoDownload } from "@/components/VideoDownload";
import { dance } from "@/choreography/dance";
import { gestures } from "@/gestures/catalog";
import type { useDanceSession } from "@/session/useDanceSession";

export function SessionPanel({ session, active, onBegin, onRender, onDelete }: {
  session: ReturnType<typeof useDanceSession>; active: boolean; onBegin: (step?: number) => void; onRender: () => void; onDelete: () => void;
}) {
  const { view } = session;
  const count = view.clips.filter(Boolean).length;
  const playing = ["countdown", "matching", "recording"].includes(view.phase);
  return <section className="session-panel" aria-label="Recording challenge">
    <div className="session-heading"><div><p className="eyebrow">YOUR TWO-MOVE CHALLENGE</p><h2>{view.phase === "complete" ? "You made a dance." : view.phase === "review" ? "Two poses. Ready to stitch?" : "Make a little magic."}</h2></div><span>{count} / {dance.steps.length} clips</span></div>
    <ol className="step-list">{dance.steps.map((id, index) => <li key={id} aria-current={view.step === index && playing ? "step" : undefined} className={view.clips[index] ? "captured" : ""}><span>{view.clips[index] ? "✓" : index + 1}</span>{gestures[id].name}</li>)}</ol>
    {view.error && <p className="error" role="alert">{view.error}</p>}
    {["ready", "paused"].includes(view.phase) && <div className="session-actions"><button className="primary" disabled={!active} onClick={() => onBegin()}>{view.phase === "paused" ? "Resume recording challenge" : "Start recording challenge"}</button><p>Records two short camera clips as you follow the animations, after a two-second countdown. No microphone. Clips and the finished video stay on your device. Keep this tab visible during video creation.</p>{!active && <p>Enable your camera above to continue.</p>}</div>}
    {playing && <div className="session-actions"><p role="status">{view.phase === "recording" ? "● Recording — follow the moving hands!" : view.phase === "countdown" ? `Get ready: ${view.countdown}` : `Follow ${gestures[dance.steps[view.step]].name} with both hands.`}</p><button className="secondary" onClick={session.pause}>Pause challenge</button></div>}
    {["review", "complete"].includes(view.phase) && <>
      <div className="clip-grid">{view.clips.map((clip, index) => clip && <article key={clip.url}><video src={clip.url} controls muted playsInline style={{ transform: clip.mirrored ? "scaleX(-1)" : undefined }} aria-label={`Clip ${index + 1}: ${gestures[dance.steps[index]].name}`} /><strong>{gestures[dance.steps[index]].name}</strong><button className="secondary" disabled={!active} onClick={() => onBegin(index)}>Retake clip {index + 1}</button></article>)}</div>
      {!active && <p className="session-note">Enable your camera above if you want to retake a clip.</p>}
      {view.phase === "review" && <div className="session-actions"><button className="primary" onClick={onRender}>Create my video ↗</button><p>Create an 11-second video on your device, with your movements sped up to 86 BPM and repeated to “Join Us for a Bite” (0:24–0:35). Download as MP4 or WebM, depending on your browser. No recordings are uploaded.</p></div>}
    </>}
    {view.phase === "processing" && <div className="render-status" role="status"><h3>Stitching your moves together…</h3><p>Keep this tab visible while your video is created on your device.</p><progress aria-label="Rendering video" /><button className="secondary" onClick={session.cancelRender}>Cancel rendering</button></div>}
    {view.output && <div className="reveal"><video src={view.output} controls playsInline aria-label="Your final dance video" /><div className="session-actions">{view.outputFile && <VideoDownload url={view.output!} file={view.outputFile} />}<p>Your two movements, stitched together. Press play to watch or replay. Play with sound to hear “Join Us for a Bite.”</p></div></div>}
    {view.phase !== "ready" && <button className="delete-button" onClick={onDelete}>Delete session and videos</button>}
  </section>;
}
