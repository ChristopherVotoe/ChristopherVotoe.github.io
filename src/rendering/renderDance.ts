import { dance, framesPerBeat, playbackRate, timeline } from "../choreography/dance";

type Clip = { url: string; mirrored: boolean };

/** Call during the Ready/Retry click so automatic rendering can use audio on mobile. */
export function prepareRenderAudio(): AudioContext {
  const context = new AudioContext();
  void context.resume().catch(() => {});
  return context;
}

function waitFor(target: EventTarget, event: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(event, done);
      target.removeEventListener("error", error);
      signal.removeEventListener("abort", abort);
    };
    const done = () => { cleanup(); resolve(); };
    const error = () => { cleanup(); reject(new Error("Could not load video or music. Please retry.")); };
    const abort = () => { cleanup(); reject(signal.reason); };
    if (signal.aborted) { abort(); return; }
    target.addEventListener(event, done, { once: true });
    target.addEventListener("error", error, { once: true });
    signal.addEventListener("abort", abort, { once: true });
  });
}

function paint(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, mirrored: boolean, frame: number, segmentFrame: number, images: HTMLImageElement[]) {
  const { width: w, height: h } = dance;
  const seconds = frame / dance.fps;
  const pulse = (1 + Math.cos(frame / framesPerBeat * Math.PI * 2)) / 2;
  const zoom = 1 + .04 * Math.exp(-(segmentFrame % framesPerBeat) / 4);
  const scale = Math.max(w / video.videoWidth, h / video.videoHeight) * zoom;
  ctx.fillStyle = "#18221a"; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(mirrored ? -1 : 1, 1);
  ctx.drawImage(video, -video.videoWidth * scale / 2, -video.videoHeight * scale / 2, video.videoWidth * scale, video.videoHeight * scale);
  ctx.restore();
  const shade = ctx.createLinearGradient(0, h * .65, 0, h);
  shade.addColorStop(0, "transparent"); shade.addColorStop(1, "rgba(0,0,0,.55)");
  ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
  images.forEach((img, index) => {
    const width = 180 * img.naturalWidth / img.naturalHeight;
    ctx.drawImage(img, index ? w - width - 20 : 20, index ? h - 200 : 20, width, 180);
  });
  ctx.save(); ctx.globalCompositeOperation = "screen";
  const angle = seconds * 35 * Math.PI / 180;
  const wash = ctx.createLinearGradient(w / 2 - Math.sin(angle) * w / 2, h / 2 + Math.cos(angle) * h / 2, w / 2 + Math.sin(angle) * w / 2, h / 2 - Math.cos(angle) * h / 2);
  wash.addColorStop(0, "#ff239f"); wash.addColorStop(.45, "transparent"); wash.addColorStop(1, "#287bff");
  ctx.globalAlpha = .18 + pulse * .16; ctx.fillStyle = wash; ctx.fillRect(0, 0, w, h);
  ["255,35,175", "30,155,255", "150,65,255", "30,255,195"].forEach((color, index) => {
    const phase = seconds * .85 + index * Math.PI / 2;
    const x = w * (.5 + Math.sin(phase) * .42), y = h * (.5 + Math.cos(phase * 1.3 + index) * .38);
    const light = ctx.createRadialGradient(x, y, 0, x, y, w * .25);
    light.addColorStop(0, `rgba(${color},.85)`); light.addColorStop(.38, `rgba(${color},.3)`); light.addColorStop(1, "transparent");
    ctx.globalAlpha = .5 + pulse * .25; ctx.fillStyle = light; ctx.fillRect(0, 0, w, h);
  });
  ctx.restore();
}

/** Real-time canvas + Web Audio export. No recorded media leaves the browser. */
export async function renderDance(clips: Clip[], context: AudioContext, cancellation: AbortSignal): Promise<Blob> {
  const hidden = new AbortController();
  const signal = AbortSignal.any([cancellation, hidden.signal, AbortSignal.timeout(60_000)]);
  const onVisibility = () => { if (document.hidden) hidden.abort(new Error("Rendering paused. Keep this tab visible and tap Retry video.")); };
  document.addEventListener("visibilitychange", onVisibility);
  const canvas = document.createElement("canvas");
  canvas.width = dance.width; canvas.height = dance.height;
  const videos: HTMLVideoElement[] = [];
  let stream: MediaStream | undefined;
  let recorder: MediaRecorder | undefined;
  let source: AudioBufferSourceNode | undefined;
  let animation = 0;
  try {
    signal.throwIfAborted(); onVisibility(); signal.throwIfAborted();
    if (!canvas.captureStream || typeof MediaRecorder === "undefined") throw new Error("This browser cannot create videos. Try Chrome or Safari.");
    if (context.state !== "running") throw new Error("Tap Retry video to enable audio and create your video.");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Video canvas is unavailable.");
    const mimeType = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error("This browser has no supported video export format.");
    const [audio, images] = await Promise.all([
      fetch(`/audio/${encodeURIComponent(dance.song)}`, { signal }).then(async (response) => {
        if (!response.ok) throw new Error("The music could not load. Please retry.");
        return context.decodeAudioData(await response.arrayBuffer());
      }),
      Promise.all(["freddyfaz.jpeg", "chica.jpeg"].map(async (name) => {
        const image = new Image();
        const loaded = waitFor(image, "load", signal);
        image.src = `/image/${name}`; await loaded; return image;
      })),
      Promise.all(clips.map(async (clip) => {
        const video = document.createElement("video"); videos.push(video);
        video.muted = true; video.playsInline = true; video.preload = "auto";
        const ready = waitFor(video, "loadeddata", signal);
        video.src = clip.url; video.load(); await ready;
        video.playbackRate = playbackRate;
      })),
    ]);
    signal.throwIfAborted();
    if (audio.duration < dance.audioEndSeconds) throw new Error("The backing track is shorter than the selected excerpt.");
    const destination = context.createMediaStreamDestination();
    source = context.createBufferSource(); source.buffer = audio; source.connect(destination);
    stream = canvas.captureStream(dance.fps);
    destination.stream.getAudioTracks().forEach((track) => stream!.addTrack(track));
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000, audioBitsPerSecond: 128_000 });
    const activeRecorder = recorder;
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    let segment = 0;
    paint(ctx, videos[0], clips[0].mirrored, 0, 0, images);
    await videos[0].play();
    signal.throwIfAborted();
    const result = new Promise<Blob>((resolve, reject) => {
      const cleanup = () => signal.removeEventListener("abort", abort);
      const fail = (error: unknown) => { cleanup(); reject(error); };
      const abort = () => fail(signal.reason);
      signal.addEventListener("abort", abort, { once: true });
      activeRecorder.onerror = () => fail(new Error("Video creation failed. Please retry."));
      activeRecorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: activeRecorder.mimeType });
        if (blob.size) resolve(blob); else reject(new Error("The exported video was empty. Please retry."));
      };
      activeRecorder.start(250);
      const start = context.currentTime;
      source!.start(start, dance.audioStartSeconds, dance.audioEndSeconds - dance.audioStartSeconds);
      const tick = () => {
        try {
          signal.throwIfAborted();
          const frame = (context.currentTime - start) * dance.fps;
          if (frame >= (dance.audioEndSeconds - dance.audioStartSeconds) * dance.fps) { activeRecorder.stop(); return; }
          const next = timeline.findIndex((part) => frame >= part.from && frame < part.from + part.duration);
          if (next >= 0 && next !== segment) {
            videos[timeline[segment].clipIndex].pause();
            segment = next;
            const video = videos[timeline[segment].clipIndex];
            video.currentTime = Math.max(0, (frame - timeline[segment].from) / dance.fps * playbackRate);
            void video.play().catch(fail);
          }
          const part = timeline[segment];
          paint(ctx, videos[part.clipIndex], clips[part.clipIndex].mirrored, frame, frame - part.from, images);
          animation = requestAnimationFrame(tick);
        } catch (error) { fail(error); }
      };
      animation = requestAnimationFrame(tick);
    });
    return await result;
  } finally {
    hidden.abort();
    cancelAnimationFrame(animation);
    document.removeEventListener("visibilitychange", onVisibility);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    source?.disconnect();
    stream?.getTracks().forEach((track) => track.stop());
    videos.forEach((video) => { video.pause(); video.removeAttribute("src"); video.load(); });
    if (context.state !== "closed") await context.close();
  }
}
