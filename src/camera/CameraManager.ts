export async function openCamera(deviceId?: string): Promise<MediaStream> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access needs HTTPS or localhost and a supported browser.");
  }
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
  });
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function cameraError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") return "Camera permission was denied. Allow camera access in your browser, then try again.";
    if (error.name === "NotFoundError") return "No camera was found. Connect a camera, then try again.";
    if (error.name === "NotReadableError") return "The camera is unavailable. Close other apps using it, then try again.";
    if (error.name === "OverconstrainedError") return "That camera is no longer available. Select another camera.";
  }
  return error instanceof Error ? error.message : "Unable to start hand tracking. Please try again.";
}
