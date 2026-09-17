import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { ensureBrowser, getVideoMetadata } from "@remotion/renderer";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

const output = resolve("test-results/browser");
await mkdir(output, { recursive: true });
await build({ entryPoints: ["tests/browser-entry.tsx"], bundle: true, outfile: join(output, "app.js"), platform: "browser", jsx: "automatic", alias: { "@/vision/HandTracker": resolve("tests/mockTracker.ts") }, define: { "process.env.NODE_ENV": '"production"' } });
const app = "http://127.0.0.1:3000";
let uploads = 0;
const server = createServer(async (req, res) => {
  try {
    if (req.url === "/api/render") {
      uploads++;
      const parts = []; for await (const part of req) parts.push(part);
      const upstream = await fetch(`${app}/api/render`, { method: "POST", body: Buffer.concat(parts), headers: { "content-type": req.headers["content-type"], origin: app } });
      res.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") });
      res.end(Buffer.from(await upstream.arrayBuffer())); return;
    }
    if (req.url === "/app.js" || req.url === "/app.css") {
      res.setHeader("content-type", req.url.endsWith("css") ? "text/css" : "text/javascript");
      res.end(await readFile(join(output, req.url.slice(1)))); return;
    }
    res.setHeader("content-type", "text/html");
    res.end('<!doctype html><html><head><title>Dance browser test</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
  } catch (error) { res.writeHead(500); res.end(String(error)); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const browserInfo = await ensureBrowser();
console.log("Launching browser test…");
assert.ok("path" in browserInfo);
const browser = await chromium.launch({ executablePath: browserInfo.path, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (error) => { errors.push(error.message); console.error("Browser:", error.message); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  console.log("Test UI loaded.");
  assert.equal(await page.getByRole("button", { name: "Start recording challenge", exact: true }).isDisabled(), true);
  await page.evaluate(() => { window.testGesture = "inward-open"; });
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await page.getByRole("button", { name: "Stop camera", exact: true }).waitFor();
  assert.equal(await page.locator(".motion-demo").count(), 2);
  assert.equal(uploads, 0);
  await page.getByRole("button", { name: "Start recording challenge", exact: true }).click();
  // Recording is time-driven and does not require detected hands.
  await page.evaluate(() => { window.testHands = 0; });
  for (const [index, gesture] of ["inward-open", "raised-fists"].entries()) {
    await page.evaluate((id) => { window.testGesture = id; }, gesture);
    await page.waitForFunction((count) => document.querySelectorAll(".step-list .captured").length === count, index + 1, { timeout: 15000 });
    console.log(`Recorded clip ${index + 1}: ${gesture}`);
  }
  await page.getByRole("button", { name: "Create my video", exact: false }).waitFor();
  assert.equal(uploads, 0, "review must not upload automatically");
  assert.equal(await page.locator(".clip-grid video").count(), 2);
  // Retake one clip; pause midway, resume, and ensure the clip count stays at two.
  await page.getByRole("button", { name: "Retake clip 2", exact: true }).click();
  await page.getByRole("button", { name: "Pause challenge", exact: true }).click();
  await page.getByRole("button", { name: "Resume recording challenge", exact: true }).click();
  await page.evaluate(() => { window.testGesture = "raised-fists"; });
  await page.getByRole("button", { name: "Create my video", exact: false }).waitFor({ timeout: 15000 });
  assert.equal(await page.locator(".clip-grid video").count(), 2);
  await page.screenshot({ path: join(output, "review.png"), fullPage: true });
  const before = (await readdir(tmpdir())).filter((name) => name.startsWith("hand-dance-"));
  await page.getByRole("button", { name: "Create my video", exact: false }).click();
  const download = page.getByRole("link", { name: "Download MP4", exact: false });
  await download.waitFor({ timeout: 180000 });
  const url = await download.getAttribute("href");
  const bytes = await page.evaluate(async (src) => Array.from(new Uint8Array(await (await fetch(src)).arrayBuffer())), url);
  const path = join(output, "dance.mp4");
  await writeFile(path, Buffer.from(bytes));
  const metadata = await getVideoMetadata(path);
  assert.equal(metadata.codec, "h264"); assert.equal(metadata.audioCodec, null);
  assert.equal(metadata.width, 960); assert.equal(metadata.height, 540);
  assert.ok(Math.abs(metadata.durationInSeconds - 8) < .1);
  const video = page.getByLabel("Your final dance video");
  await video.evaluate(async (el) => { el.muted = true; await el.play(); });
  await page.waitForFunction(() => document.querySelector('.reveal video').currentTime > .2);
  await page.screenshot({ path: join(output, "reveal.png"), fullPage: true });
  await page.getByRole("button", { name: "Delete session and videos", exact: true }).click();
  assert.equal(await page.locator(".clip-grid video, .reveal video").count(), 0);
  assert.equal(await page.getByRole("button", { name: "Enable camera", exact: true }).count(), 1);
  const after = (await readdir(tmpdir())).filter((name) => name.startsWith("hand-dance-"));
  assert.deepEqual(after, before, "temporary rendering directories must be removed");
  assert.equal(uploads, 1);
  assert.deepEqual(errors, []);
  console.log("PASS: timed follow-along, two real MediaRecorder clips, retake/pause/resume, explicit upload, 8-second silent H.264 MP4 playback, deletion, and temporary-file cleanup.");
  console.log(JSON.stringify(metadata));
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
