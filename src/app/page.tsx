import { TestNowButton } from "@/components/TestNowButton";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return <main className="landing-page">
    <SiteHeader />
    <section className="landing-hero">
      <div className="landing-copy"><h1>Thanks for testing!</h1>
      <p>Getting started? Just enable the camera and follow the instructions.</p>
        <TestNowButton /><p className="start-disclosure">By starting, you agree to camera recording and sending your clips to this app’s server to prepare your result. No microphone audio. You can stop at any time.</p>
        <ul className="landing-details"><li><span aria-hidden="true">▣</span>Camera required</li><li><span aria-hidden="true">♬</span>No microphone needed</li><li><span aria-hidden="true">◇</span>Your result appears automatically</li></ul>
      </div>
      <div className="landing-camera" aria-label="Camera preview placeholder; camera is off"><i className="corner top-left" /><i className="corner top-right" /><i className="corner bottom-left" /><i className="corner bottom-right" />
        <div className="camera-hud"><span><i />CAMERA OFF</span><span>00:00</span></div>
        <div className="camera-illustration"><svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><rect x="14" y="28" width="52" height="44" rx="10" stroke="currentColor" strokeWidth="3" /><path d="M66 42L87 31V69L66 58" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /><circle cx="40" cy="50" r="9" stroke="currentColor" strokeWidth="3" /></svg><h2>Your moment starts here.</h2><p>Your camera opens on the next screen.</p></div>
        <div className="camera-bottom"><span>2 guided movements</span><span className="record-symbol" aria-hidden="true"><i /></span><span>One final video</span></div>
      </div>
    </section>
  </main>;
}
