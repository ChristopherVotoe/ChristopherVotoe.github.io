import { mkdtemp, mkdir, writeFile, copyFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { makeCancelSignal, renderMedia, selectComposition } from "@remotion/renderer";
import { dance } from "../choreography/dance.ts";

export async function renderDance(clips: File[], mirrored: boolean[], signal: AbortSignal): Promise<Uint8Array> {
  const root = await mkdtemp(join(tmpdir(), "hand-dance-"));
  const { cancelSignal, cancel } = makeCancelSignal();
  signal.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 180_000);
  try {
    signal.throwIfAborted();
    const assets = join(root, "assets");
    await mkdir(assets);
    const names: string[] = [];
    for (const [i, clip] of clips.entries()) {
      signal.throwIfAborted();
      const name = `clip-${i}.${clip.type.includes("mp4") ? "mp4" : "webm"}`;
      await writeFile(join(assets, name), Buffer.from(await clip.arrayBuffer()));
      names.push(name);
    }
    await copyFile(resolve("public/audio", dance.song), join(assets, dance.song));
    const serveUrl = await bundle({ entryPoint: resolve("src/remotion/Root.tsx"), outDir: join(root, "bundle"), publicDir: assets, enableCaching: false });
    signal.throwIfAborted();
    const inputProps = { clips: names, mirrored };
    const composition = await selectComposition({ serveUrl, id: "FirstWave", inputProps });
    signal.throwIfAborted();
    const outputLocation = join(root, "dance.mp4");
    await renderMedia({ composition, serveUrl, inputProps, outputLocation, codec: "h264", audioCodec: "aac", pixelFormat: "yuv420p", concurrency: 2, cancelSignal, crf: 20 });
    signal.throwIfAborted();
    return new Uint8Array(await readFile(outputLocation));
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
    await rm(root, { recursive: true, force: true });
  }
}
