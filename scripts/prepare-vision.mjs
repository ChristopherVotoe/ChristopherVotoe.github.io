import { cp, mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const destination = resolve("public/mediapipe");
await mkdir(destination, { recursive: true });
await cp(resolve("node_modules/@mediapipe/tasks-vision/wasm"), resolve(destination, "wasm"), { recursive: true });
for (const model of ["hand_landmarker", "face_landmarker"]) {
  const modelPath = resolve(destination, `${model}.task`);
  const existing = await stat(modelPath).catch(() => null);
  if (!existing?.size) {
    const response = await fetch(`https://storage.googleapis.com/mediapipe-models/${model}/${model}/float16/1/${model}.task`);
    if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
    await writeFile(modelPath, Buffer.from(await response.arrayBuffer()));
  }
}
console.log("MediaPipe runtime, hand model, and face model ready in public/mediapipe.");
