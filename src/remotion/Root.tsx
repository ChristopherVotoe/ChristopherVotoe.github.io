import React from "react";
import { AbsoluteFill, Audio, Composition, OffthreadVideo, Sequence, registerRoot, staticFile, useCurrentFrame } from "remotion";
import { dance, durationInFrames, framesPerBeat, playbackRate, timeline } from "../choreography/dance";

export type DanceProps = { clips: string[]; mirrored: boolean[] };

function Segment({ src, mirrored, index }: { src: string; mirrored: boolean; index: number }) {
  const frame = useCurrentFrame();
  const punch = 1 + .04 * Math.exp(-(frame % framesPerBeat) / 4);
  return <AbsoluteFill style={{ overflow: "hidden", background: "#18221a" }}>
    <OffthreadVideo src={staticFile(src)} muted playbackRate={playbackRate} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${punch}) scaleX(${mirrored ? -1 : 1})` }} />
    <AbsoluteFill style={{ background: "linear-gradient(transparent 65%, rgba(0,0,0,.55))" }} />
    <div style={{ position: "absolute", bottom: 28, left: 34, color: "#d1f793", fontFamily: "Arial", fontSize: 20, letterSpacing: 3 }}>HAND SIGNAL DANCE <span style={{ color: "white", marginLeft: 22 }}>{String(index + 1).padStart(2, "0")}</span></div>
  </AbsoluteFill>;
}

export function DanceVideo({ clips, mirrored }: DanceProps) {
  return <AbsoluteFill style={{ background: "#18221a" }}>
    <Audio src={staticFile(dance.song)} trimBefore={dance.audioStartSeconds * dance.fps} trimAfter={dance.audioEndSeconds * dance.fps} />
    {timeline.map(({ clipIndex, from, duration }, index) => <Sequence key={index} from={from} durationInFrames={duration}>
      <Segment src={clips[clipIndex]} mirrored={mirrored[clipIndex]} index={index} />
    </Sequence>)}
  </AbsoluteFill>;
}

function Root() {
  return <Composition id="FirstWave" component={DanceVideo} width={dance.width} height={dance.height} fps={dance.fps} durationInFrames={durationInFrames} defaultProps={{ clips: [], mirrored: [] }} />;
}
registerRoot(Root);
