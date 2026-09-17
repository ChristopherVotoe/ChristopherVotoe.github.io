import React from "react";
import { AbsoluteFill, Audio, Composition, Img, OffthreadVideo, Sequence, registerRoot, staticFile, useCurrentFrame } from "remotion";
import { dance, durationInFrames, framesPerBeat, playbackRate, timeline } from "../choreography/dance";
import { DiscoOverlay } from "./DiscoOverlay";

export type DanceProps = { clips: string[]; mirrored: boolean[] };

function Segment({ src, mirrored }: { src: string; mirrored: boolean }) {
  const frame = useCurrentFrame();
  const punch = 1 + .04 * Math.exp(-(frame % framesPerBeat) / 4);
  return <AbsoluteFill style={{ overflow: "hidden", background: "#18221a" }}>
    <OffthreadVideo src={staticFile(src)} muted playbackRate={playbackRate} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${punch}) scaleX(${mirrored ? -1 : 1})` }} />
    <AbsoluteFill style={{ background: "linear-gradient(transparent 65%, rgba(0,0,0,.55))" }} />
  </AbsoluteFill>;
}

export function DanceVideo({ clips, mirrored }: DanceProps) {
  return <AbsoluteFill style={{ background: "#18221a" }}>
    <Audio src={staticFile(dance.song)} trimBefore={dance.audioStartSeconds * dance.fps} trimAfter={dance.audioEndSeconds * dance.fps} />
    {timeline.map(({ clipIndex, from, duration }, index) => <Sequence key={index} from={from} durationInFrames={duration}>
      <Segment src={clips[clipIndex]} mirrored={mirrored[clipIndex]} />
    </Sequence>)}
    <Img src={staticFile("freddyfaz.jpeg")} style={{ position: "absolute", top: 20, left: 20, height: 180, width: "auto", objectFit: "contain" }} />
    <Img src={staticFile("chica.jpeg")} style={{ position: "absolute", bottom: 20, right: 20, height: 180, width: "auto", objectFit: "contain" }} />
    <DiscoOverlay />
  </AbsoluteFill>;
}

function Root() {
  return <Composition id="FirstWave" component={DanceVideo} width={dance.width} height={dance.height} fps={dance.fps} durationInFrames={durationInFrames} defaultProps={{ clips: [], mirrored: [] }} />;
}
registerRoot(Root);
