import assert from "node:assert/strict";
import { test } from "node:test";
import { handleEmail, type Env } from "./index.ts";
import { EMAIL_CONSENT_VERSION, MAX_EMAIL_VIDEO_BYTES, VIDEO_EMAIL_RECIPIENT } from "../../src/email/constants.ts";

const origin = "https://christophervotoe.github.io";
const mp4 = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]);
const env = (): Env => ({ RESEND_API_KEY: "test-secret", EMAIL_FROM: "Dance <dance@example.com>", ALLOWED_ORIGIN: origin,
  EMAIL_RATE_LIMIT: { limit: async () => ({ success: true }) }, RECIPIENT_RATE_LIMIT: { limit: async () => ({ success: true }) } });
const request = (headers = {}, body: BodyInit = mp4) => new Request("https://worker.example/email-video", {
  method: "POST", body, headers: { Origin: origin, "Content-Type": "video/mp4", "X-Video-Consent": EMAIL_CONSENT_VERSION, ...headers },
});
const neverSend: typeof fetch = async () => { assert.fail("No email should be sent"); };

test("preflight permits the configured website and unknown origins are rejected", async () => {
  const response = await handleEmail(new Request("https://worker.example/email-video", { method: "OPTIONS", headers: { Origin: origin } }), env(), neverSend);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal((await handleEmail(request({ Origin: "https://evil.example" }), env(), neverSend)).status, 403);
});

test("requires server configuration, agreement, and a supported video container", async () => {
  assert.equal((await handleEmail(request(), { ...env(), RESEND_API_KEY: "" }, neverSend)).status, 503);
  assert.equal((await handleEmail(request({ "X-Video-Consent": "" }), env(), neverSend)).status, 400);
  assert.equal((await handleEmail(request({ "Content-Type": "text/plain" }), env(), neverSend)).status, 415);
  assert.equal((await handleEmail(request({}, new Uint8Array(12)), env(), neverSend)).status, 415);
  assert.equal((await handleEmail(request({}, new Uint8Array(1)), env(), neverSend)).status, 400);
});

test("bounds declared and actual upload bytes before calling the email service", async () => {
  assert.equal((await handleEmail(request({ "Content-Length": String(MAX_EMAIL_VIDEO_BYTES + 1) }), env(), neverSend)).status, 413);
  assert.equal((await handleEmail(request({}, new Uint8Array(MAX_EMAIL_VIDEO_BYTES + 1)), env(), neverSend)).status, 413);
});

test("both rate limits prevent email requests", async () => {
  for (const key of ["EMAIL_RATE_LIMIT", "RECIPIENT_RATE_LIMIT"] as const) {
    assert.equal((await handleEmail(request(), { ...env(), [key]: { limit: async () => ({ success: false }) } }, neverSend)).status, 429);
  }
});

test("sends the attachment only to Chris with stable duplicate protection on retries", async () => {
  const keys: string[] = [];
  const bodies: string[] = [];
  const send: typeof fetch = async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    const headers = new Headers(options?.headers);
    assert.equal(headers.get("Authorization"), "Bearer test-secret");
    keys.push(headers.get("Idempotency-Key")!);
    bodies.push(String(options?.body));
    const body = JSON.parse(String(options?.body));
    assert.deepEqual(body.to, [VIDEO_EMAIL_RECIPIENT]);
    assert.equal(body.attachments[0].filename, "hand-signal-dance.mp4");
    assert.deepEqual(Buffer.from(body.attachments[0].content, "base64"), Buffer.from(mp4));
    return Response.json({ id: "email-123" });
  };
  for (let i = 0; i < 2; i++) {
    const response = await handleEmail(request(), env(), send);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "accepted" });
  }
  assert.equal(keys[0], keys[1]);
  assert.equal(bodies[0], bodies[1]);
});

test("accepts WebM without changing the recipient or adding client-controlled email fields", async () => {
  const bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]);
  const response = await handleEmail(request({ "Content-Type": "video/webm" }, bytes), env(), async (_, options) => {
    const body = JSON.parse(String(options?.body));
    assert.equal(body.attachments[0].filename, "hand-signal-dance.webm");
    assert.deepEqual(body.to, [VIDEO_EMAIL_RECIPIENT]);
    return Response.json({ id: "email-webm" });
  });
  assert.equal(response.status, 200);
});

test("provider failures are not reported as success or exposed to the browser", async () => {
  for (const code of [401, 429, 500]) {
    const response = await handleEmail(request(), env(), async () => Response.json({ error: "private-account-info" }, { status: code }));
    assert.equal(response.status, code === 429 ? 429 : 502);
    assert.ok(!(await response.text()).includes("private-account-info"));
  }
  assert.equal((await handleEmail(request(), env(), async () => Response.json({}))).status, 502);
});
