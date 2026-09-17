import { renderDance } from "@/rendering/renderDance";
import { dance } from "@/choreography/dance";

export const runtime = "nodejs";
export const maxDuration = 240;
let busy = false;
const MAX_BODY = 45 * 1024 * 1024;
const MAX_CLIP = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Use this app to submit a render." }, { status: 403 });
  if (busy) return Response.json({ error: "The renderer is busy. Please try again shortly." }, { status: 429 });
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return Response.json({ error: "Expected recorded video clips." }, { status: 400 });
  if (Number(request.headers.get("content-length")) > MAX_BODY) return Response.json({ error: "The clips are too large. Please retake them." }, { status: 413 });
  busy = true;
  try {
    // Bound actual bytes, including chunked requests, before parsing multipart data.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Missing clips." }, { status: 400 });
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY) { await reader.cancel(); return Response.json({ error: "The clips are too large." }, { status: 413 }); }
      chunks.push(new Uint8Array(value));
    }
    const form = await new Response(new Blob(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
    const clips = dance.steps.map((_, index) => form.get(`clip${index}`));
    if (clips.some((clip) => !(clip instanceof File) || clip.size === 0 || clip.size > MAX_CLIP || !/^video\/(webm|mp4)(;|$)/.test(clip.type))) {
      return Response.json({ error: "Provide two non-empty WebM or MP4 clips, each under 8 MB." }, { status: 400 });
    }
    const mirrored: unknown = JSON.parse(String(form.get("mirrored")));
    if (!Array.isArray(mirrored) || mirrored.length !== dance.steps.length || mirrored.some((value) => typeof value !== "boolean")) return Response.json({ error: "Invalid camera orientation." }, { status: 400 });
    const video = await renderDance(clips as File[], mirrored, request.signal);
    return new Response(new Blob([new Uint8Array(video)], { type: "video/mp4" }), { headers: { "Content-Type": "video/mp4", "Content-Disposition": 'attachment; filename="hand-signal-dance.mp4"', "Cache-Control": "no-store" } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    if (error instanceof SyntaxError || error instanceof TypeError) return Response.json({ error: "Invalid clip submission." }, { status: 400 });
    console.error("Dance rendering failed:", error);
    return Response.json({ error: "Could not render this video. Your clips are still here; retry, or retake a clip if it will not play." }, { status: 500 });
  } finally { busy = false; }
}
