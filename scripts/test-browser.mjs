import { chromium } from "@playwright/test";
import { ensureBrowser, getVideoMetadata } from "@remotion/renderer";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";

const baseURL = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const output = resolve("test-results/browser");
await mkdir(output, { recursive: true });
const browserInfo = await ensureBrowser();
assert.ok("path" in browserInfo);
const browser = await chromium.launch({ executablePath: browserInfo.path, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (error) => { errors.push(error.message); console.error(error.message); });
try {
  let failMusic = true;
  await page.route("**/audio/**", async (route) => {
    if (failMusic) { failMusic = false; await route.fulfill({ status: 503, body: "Unavailable" }); }
    else await route.continue();
  });
  await page.goto(baseURL);
  let uploads = 0;
  page.on("request", (req) => { if (req.url().endsWith("/api/render")) uploads++; });
  await page.getByRole("link", { name: /Test Now/ }).click();
  await page.waitForURL(/\/record\/?$/);
  await page.locator(".motion-overlay").waitFor();
  await page.getByRole("button", { name: "Ready to record?" }).click();
  await page.waitForURL(/\/results\/?$/, { timeout: 25000 });
  console.log("Ready button completed both camera recordings and started rendering automatically.");
  await page.getByRole("alert").filter({ hasText: "music could not load" }).waitFor();
  await page.getByRole("button", { name: "Retry video", exact: true }).click();
  const download = page.getByRole("link", { name: /Download (MP4|WEBM)/ });
  await download.waitFor({ timeout: 65000 });
  const filename = await download.getAttribute("download");
  const path = join(output, filename);
  const data = await download.evaluate(async (link) => Array.from(new Uint8Array(await (await fetch(link.href)).arrayBuffer())));
  await writeFile(path, Buffer.from(data));
  const metadata = await getVideoMetadata(path);
  assert.ok(["h264", "vp8", "vp9"].includes(metadata.codec));
  assert.ok(["aac", "opus"].includes(metadata.audioCodec));
  assert.equal(metadata.width, 960); assert.equal(metadata.height, 540);
  assert.ok(Math.abs(metadata.durationInSeconds - 11) < .5);
  await page.getByLabel("Your final dance video").evaluate(async (video) => { video.muted = true; await video.play(); });
  await page.waitForFunction(() => document.querySelector('.reveal video').currentTime > .2);
  await page.screenshot({ path: join(output, "reveal.png"), fullPage: true });
  await page.getByRole("button", { name: "Delete recording and return home", exact: true }).click();
  assert.equal(await page.locator(".clip-grid video, .reveal video").count(), 0);
  await page.getByRole("link", { name: /Test Now/ }).click();
  await page.getByRole("button", { name: "Ready to record?" }).click();
  await page.waitForURL(/\/results\/?$/, { timeout: 25000 });
  await page.getByRole("progressbar").waitFor();
  await page.getByRole("button", { name: "Delete recording and return home", exact: true }).click();
  await page.waitForTimeout(12000);
  assert.equal(await page.locator(".reveal video").count(), 0);
  assert.equal(uploads, 0);
  for (const route of ["/record/", "/results/"]) {
    const response = await page.goto(`${baseURL}${route}`);
    assert.equal(response.status(), 200);
  }
  assert.deepEqual(errors, []);
  console.log("PASS: ready-button flow, two real recordings, eleven-second video with audio, playback, deletion, direct static routes, music failure/retry, cancellation and zero uploads.");
} catch (error) {
  await page.screenshot({ path: join(output, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); }
