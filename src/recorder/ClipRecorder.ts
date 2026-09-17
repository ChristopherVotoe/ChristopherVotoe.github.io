export function recordingMimeType(): string {
  if (typeof MediaRecorder === "undefined") throw new Error("This browser cannot record video. Try a recent Chrome or Safari browser.");
  const type = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm"].find((candidate) => MediaRecorder.isTypeSupported(candidate));
  if (!type) throw new Error("This browser has no supported video recording format.");
  return type;
}

/** A fresh recorder per clip makes every Blob independently decodable. */
export function recordClip(stream: MediaStream, durationMs: number, signal: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Recording cancelled", "AbortError")); return; }
    let recorder: MediaRecorder;
    try { recorder = new MediaRecorder(stream, { mimeType: recordingMimeType(), videoBitsPerSecond: 3_000_000 }); }
    catch (error) { reject(error); return; }
    const chunks: BlobPart[] = [];
    let timer: ReturnType<typeof setTimeout>;
    let watchdog: ReturnType<typeof setTimeout>;
    let settled = false;
    const tracks = stream.getVideoTracks();
    const cleanup = () => {
      clearTimeout(timer); clearTimeout(watchdog);
      signal.removeEventListener("abort", abort);
      tracks.forEach((track) => track.removeEventListener("ended", ended));
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true; cleanup();
      if (recorder.state !== "inactive") recorder.stop();
      reject(error);
    };
    const abort = () => fail(new DOMException("Recording cancelled", "AbortError"));
    const ended = () => fail(new Error("The camera stopped before the clip finished. Please retake it."));
    signal.addEventListener("abort", abort, { once: true });
    tracks.forEach((track) => track.addEventListener("ended", ended, { once: true }));
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => fail(new Error("Recording failed. Please try this gesture again."));
    recorder.onstop = () => {
      if (settled) return;
      settled = true; cleanup();
      const blob = new Blob(chunks, { type: recorder.mimeType });
      if (blob.size === 0) reject(new Error("The camera produced an empty clip. Please retake it."));
      else resolve(blob);
    };
    try {
      if (!tracks.some((track) => track.readyState === "live")) throw new Error("Enable your camera before recording.");
      recorder.start();
      timer = setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, durationMs);
      watchdog = setTimeout(() => fail(new Error("Recording timed out. Please retake this clip.")), durationMs + 5000);
    } catch (error) { fail(error instanceof Error ? error : new Error("Unable to record.")); }
  });
}
