"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDance } from "@/session/DanceProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { TestNowButton } from "@/components/TestNowButton";

export default function ResultsPage() {
  const { session } = useDance();
  const router = useRouter();
  const attempted = useRef(false);
  const [playBlocked, setPlayBlocked] = useState(false);
  const startRender = useEffectEvent(() => { void session.render(); });
  useEffect(() => {
    if (session.view.phase === "review" && !attempted.current) {
      attempted.current = true;
      startRender();
    }
  }, [session.view.phase]);
  const hasClips = session.view.clips.every(Boolean);
  const ready = Boolean(session.view.output);
  return <main className="results-page"><SiteHeader current="results" />
    <section className="flow-intro"><p className="eyebrow">YOUR RESULT</p><h1>{ready ? "Thanks for video chud!!! I already have it... it's too late to delete" : hasClips ? "One moment…" : "Ready for your test?"}</h1><p>{ready ? "Your two movements, with a little rhythm added." : hasClips ? "Your test is complete. We’re preparing your video automatically." : "Start a test to see your video here. Recordings clear when you reload or close this tab."}</p></section>
    {ready ? <section className="reveal"><video src={session.view.output!} autoPlay controls playsInline aria-label="Your final dance video" onCanPlay={(event) => { void event.currentTarget.play().catch(() => setPlayBlocked(true)); }} onPlay={() => setPlayBlocked(false)} />{playBlocked && <p className="session-note">Your browser requires a tap on Play to start the video with sound.</p>}<div className="session-actions"><a className="primary" href={session.view.output!} download={`hand-signal-dance.${session.view.outputFormat}`}>Download {session.view.outputFormat.toUpperCase()} ↓</a><Link className="secondary" href="/">Back home</Link></div></section> : hasClips ? <section className="session-panel">
      {session.view.error ? <><p className="error" role="alert">{session.view.error}</p><button className="primary" onClick={() => void session.render()}>Retry video</button></> : <div className="render-status" role="status"><h2>Preparing your result…</h2><p>Keep this tab visible while your video is created on your device.</p><progress aria-label="Preparing final video" /></div>}
    </section> : <TestNowButton />}
    {hasClips && <button className="delete-button" onClick={() => { session.remove(); router.push("/"); }}>Delete recording and return home</button>}
  </main>;
}
