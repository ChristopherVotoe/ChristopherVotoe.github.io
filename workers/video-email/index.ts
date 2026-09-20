import { EMAIL_CONSENT_VERSION, MAX_EMAIL_VIDEO_BYTES, VIDEO_EMAIL_RECIPIENT } from "../../src/email/constants.ts";

type Limiter = { limit(options: { key: string }): Promise<{ success: boolean }> };
export type Env = { RESEND_API_KEY: string; EMAIL_FROM: string; ALLOWED_ORIGIN: string; EMAIL_RATE_LIMIT: Limiter; RECIPIENT_RATE_LIMIT: Limiter };

async function readVideo(request: Request): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get("Content-Length")) > MAX_EMAIL_VIDEO_BYTES) throw new RangeError();
  const reader = request.body?.getReader();
  if (!reader) throw new TypeError();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_EMAIL_VIDEO_BYTES) { await reader.cancel(); throw new RangeError(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (size < 12) throw new TypeError();
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

function base64(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)));
  }
  return btoa(parts.join(""));
}

export async function handleEmail(request: Request, env: Env, send: typeof fetch = fetch): Promise<Response> {
  const origin = request.headers.get("Origin");
  const headers = { "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN, "Vary": "Origin", "Cache-Control": "no-store" };
  const reply = (status: number, data: object) => Response.json(data, { status, headers });
  if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) return new Response(null, { status: 403 });
  if (new URL(request.url).pathname !== "/email-video") return reply(404, { error: "Not found." });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    ...headers, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type, X-Video-Consent", "Access-Control-Max-Age": "600",
  } });
  if (request.method !== "POST") return reply(405, { error: "Use POST." });
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.EMAIL_RATE_LIMIT || !env.RECIPIENT_RATE_LIMIT) return reply(503, { error: "Email delivery is not configured." });
  if (request.headers.get("X-Video-Consent") !== EMAIL_CONSENT_VERSION) return reply(400, { error: "Agreement to email is required." });
  const type = request.headers.get("Content-Type")?.split(";")[0].trim();
  if (type !== "video/mp4" && type !== "video/webm") return reply(415, { error: "Expected an MP4 or WebM video." });
  try {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const allowed = await env.EMAIL_RATE_LIMIT.limit({ key: `video:${ip}` });
    if (!allowed.success) return reply(429, { error: "Please wait a minute before retrying." });
    const bytes = await readVideo(request);
    const mp4 = String.fromCharCode(...bytes.subarray(4, 8)) === "ftyp";
    const webm = bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    if ((type === "video/mp4" && !mp4) || (type === "video/webm" && !webm)) return reply(415, { error: "Invalid video container." });
    const recipientAllowed = await env.RECIPIENT_RATE_LIMIT.limit({ key: "video-inbox" });
    if (!recipientAllowed.success) return reply(429, { error: "Email is busy. Please try again in a minute." });
    // Content-derived keys keep retries of identical videos idempotent for Resend's 24-hour window.
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const key = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const response = await send("https://api.resend.com/emails", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(30_000),
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `dance-video-v1/${key}` },
      body: JSON.stringify({
        from: env.EMAIL_FROM, to: [VIDEO_EMAIL_RECIPIENT], subject: "New hand movement test video",
        text: "A visitor agreed to email their completed hand movement test video. The finished video is attached. Raw camera clips were not uploaded.",
        attachments: [{ filename: `hand-signal-dance.${mp4 ? "mp4" : "webm"}`, content: base64(bytes) }],
      }),
    });
    // Never forward provider errors (which may contain account details) or claim inbox delivery.
    if (!response.ok) return reply(response.status === 429 ? 429 : 502, { error: "Email service did not confirm acceptance." });
    const result = await response.json() as { id?: string };
    if (!result.id) return reply(502, { error: "Email service did not confirm acceptance." });
    return reply(200, { status: "accepted" });
  } catch (error) {
    if (error instanceof RangeError) return reply(413, { error: "Video exceeds the 12 MiB attachment limit." });
    if (error instanceof TypeError) return reply(400, { error: "Could not read the video." });
    return reply(502, { error: "Email could not be confirmed. Retry with the same video." });
  }
}

const worker = { fetch: (request: Request, env: Env) => handleEmail(request, env) };
export default worker;
