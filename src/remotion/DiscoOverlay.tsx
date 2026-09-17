import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { dance, framesPerBeat } from "../choreography/dance";

/** Frame-driven effects stay deterministic in the exported MP4. */
export function DiscoOverlay() {
  const frame = useCurrentFrame();
  const seconds = frame / dance.fps;
  const beat = frame / framesPerBeat;
  const pulse = (1 + Math.cos(beat * Math.PI * 2)) / 2;
  const colors = ["255, 35, 175", "30, 155, 255", "150, 65, 255", "30, 255, 195"];

  return <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden", mixBlendMode: "screen" }}>
    <AbsoluteFill style={{
      opacity: .18 + pulse * .16,
      background: `linear-gradient(${seconds * 35}deg, #ff239f, transparent 45%, #287bff)`,
    }} />
    {colors.map((color, index) => {
      const phase = seconds * .85 + index * Math.PI / 2;
      const x = 50 + Math.sin(phase) * 42;
      const y = 50 + Math.cos(phase * 1.3 + index) * 38;
      return <AbsoluteFill key={color} style={{
        opacity: .5 + pulse * .25,
        background: `radial-gradient(ellipse 25% 40% at ${x}% ${y}%, rgba(${color}, .85) 0%, rgba(${color}, .3) 38%, transparent 75%)`,
      }} />;
    })}
    {[0, 1].map((index) => <AbsoluteFill key={index} style={{
      opacity: .18 + pulse * .12,
      background: `conic-gradient(from ${Math.sin(seconds * .7 + index * 2) * 45 + (index ? 110 : 165)}deg at ${index ? 100 : 0}% 0%, transparent 0deg, ${index ? "#57cfff" : "#ff65d8"} 10deg, transparent 22deg)`,
    }} />)}
  </AbsoluteFill>;
}
