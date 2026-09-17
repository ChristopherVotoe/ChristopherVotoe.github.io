import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export async function createHandTracker() {
  const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const options = {
    baseOptions: { modelAssetPath: "/mediapipe/hand_landmarker.task" },
    runningMode: "VIDEO" as const,
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };
  try {
    return await HandLandmarker.createFromOptions(files, {
      ...options, baseOptions: { ...options.baseOptions, delegate: "GPU" },
    });
  } catch {
    return HandLandmarker.createFromOptions(files, options);
  }
}
