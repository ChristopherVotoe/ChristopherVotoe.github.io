import { HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";

export function drawHandOverlay(canvas: HTMLCanvasElement, video: HTMLVideoElement, result: HandLandmarkerResult) {
  if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const radius = Math.max(3, canvas.width / 230);
  for (const hand of result.landmarks) {
    ctx.strokeStyle = "#c3ff75";
    ctx.lineWidth = radius * 0.6;
    for (const { start, end } of HandLandmarker.HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(hand[start].x * canvas.width, hand[start].y * canvas.height);
      ctx.lineTo(hand[end].x * canvas.width, hand[end].y * canvas.height);
      ctx.stroke();
    }
    for (const point of hand) {
      ctx.beginPath();
      ctx.arc(point.x * canvas.width, point.y * canvas.height, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#fcfff4";
      ctx.fill();
      ctx.strokeStyle = "#253819";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}
