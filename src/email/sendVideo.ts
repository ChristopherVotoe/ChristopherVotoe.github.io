import { EMAIL_CONSENT_VERSION, MAX_EMAIL_VIDEO_BYTES, VIDEO_EMAIL_URL } from "./config.ts";

export async function sendVideo(file: File, signal: AbortSignal): Promise<void> {
  const endpoint = new URL(VIDEO_EMAIL_URL);
  const local = endpoint.protocol === "http:" && ["localhost", "127.0.0.1"].includes(endpoint.hostname);
  if (endpoint.protocol !== "https:" && !local) {
    throw new Error("Email delivery is not configured securely. You can still download your video.");
  }
  if (!file.size || file.size > MAX_EMAIL_VIDEO_BYTES) throw new Error("This video is too large to email automatically. Download it and email it manually.");
  const response = await fetch(endpoint, {
    method: "POST", body: file, signal, credentials: "omit", redirect: "error",
    headers: { "Content-Type": file.type, "X-Video-Consent": EMAIL_CONSENT_VERSION },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status !== "accepted") {
    throw new Error(response.status === 429
      ? "Email is busy. Wait a minute, then retry. Your download is still available."
      : "We could not confirm the email was sent. You can retry or download your video.");
  }
}
