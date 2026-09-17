import type { Phase } from "@/session/SessionEngine";

function OpenHand() {
  return <g fill="#e8bd96" stroke="#513c30" strokeWidth="2.5" strokeLinejoin="round">
    <path d="M0 100 L42 100 C52 90 54 73 61 62 L75 38 Q83 29 89 35 Q94 39 89 50 L79 77 L140 62 Q152 59 155 67 Q158 75 146 80 L99 94 L157 87 Q171 86 172 95 Q173 104 160 106 L102 112 L151 116 Q165 117 163 126 Q162 134 149 133 L100 132 L133 144 Q144 149 140 156 Q136 163 124 158 L77 144 Q60 140 46 145 L0 145 Z" />
    <path d="M48 105 Q63 112 62 132 M83 94 L88 125" fill="none" stroke="#b18465" />
  </g>;
}

function Fist() {
  return <g fill="#e8bd96" stroke="#513c30" strokeWidth="2.5" strokeLinejoin="round">
    <path d="M28 165 L28 132 Q10 119 9 100 L9 71 Q9 57 21 57 Q26 42 39 47 Q46 34 59 43 Q70 35 82 47 Q97 46 99 63 L100 105 Q99 123 82 137 L82 165 Z" />
    <path d="M21 58 L24 91 M40 48 L43 87 M61 45 L64 87 M82 49 L84 91 M25 104 Q51 96 81 105 M29 131 Q54 140 81 133" fill="none" stroke="#b18465" />
    <path d="M12 101 Q-1 95 2 82 Q6 75 16 86 L30 103 Q34 113 23 115" />
    <path d="M37 149 L40 165 M68 147 L65 165" fill="none" stroke="#b18465" />
  </g>;
}

export function MotionGuide({ kind, active, phase, countdown, overlay = false }: { kind: "inward" | "fists"; active: boolean; phase: Phase; countdown: number; overlay?: boolean }) {
  const recording = active && phase === "recording";
  const waiting = active && phase === "countdown";
  const demo = ["ready", "paused", "review", "complete"].includes(phase);
  return <article className={overlay ? "motion-overlay" : `motion-card ${active ? "current" : ""}`}>
    {!overlay && <div className="motion-heading"><span>{kind === "inward" ? "01 / UP & DOWN" : "02 / UP & BACK"}</span><span>{recording ? "● FOLLOW & RECORD" : waiting ? `START IN ${countdown}` : "MOVEMENT GUIDE"}</span></div>}
    <svg key={`${kind}-${phase}`} viewBox="0 0 500 280" role="img" aria-label={kind === "inward" ? "Two open hands with fingers pointing inward move vertically from up to down and back" : "Backs of two closed fists move upward from the center and return"} className={`motion-demo ${recording || demo ? "moving" : ""}`}>
      <path d="M250 38 V242 M40 170 H460" stroke="#ced7c4" strokeDasharray="4 7" fill="none" />
      <circle cx="250" cy="170" r="5" fill="#8ba673" />
      {kind === "inward" ? <>
        <g className="hand-in-left"><g transform="translate(10 55)"><OpenHand /></g></g>
        <g className="hand-in-right"><g transform="translate(490 55) scale(-1 1)"><OpenHand /></g></g>
        <path d="M250 95 V190 L243 180 M250 190 L257 180 M250 95 L243 105 M250 95 L257 105" stroke="#638d35" strokeWidth="2" fill="none" />
      </> : <>
        <g className="hands-up"><g transform="translate(135 90)"><Fist /></g><g transform="translate(365 90) scale(-1 1)"><Fist /></g></g>
        <path d="M250 155 V75 L243 85 M250 75 L257 85" stroke="#638d35" strokeWidth="2" fill="none" />
      </>}
    </svg>
    {!overlay && <><h3>{kind === "inward" ? "Move your open hands up and down." : "Lift your fists. Then return to center."}</h3>
    <p>{kind === "inward" ? "Fingers point inward · thumbs stay up" : "Backs of fists face the camera · lift a couple of inches"}</p></>}
  </article>;
}
