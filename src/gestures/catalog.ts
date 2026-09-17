export type GestureId = "open-palms" | "fists" | "peace" | "point" | "thumbs";
export type FingerPattern = readonly (0 | 1 | null)[];

export const gestures: Record<GestureId, { name: string; symbol: string; instruction: string; fingers: FingerPattern }> = {
  "open-palms": { name: "Open palms", symbol: "✋ 🤚", instruction: "Face both palms toward the camera and extend all five fingers.", fingers: [1, 1, 1, 1, 1] },
  fists: { name: "Double fists", symbol: "✊ ✊", instruction: "Make two fists. Curl your fingers and tuck your thumbs across them.", fingers: [0, 0, 0, 0, 0] },
  peace: { name: "Double peace", symbol: "✌️ ✌️", instruction: "Extend your index and middle fingers on both hands. Curl your ring and little fingers.", fingers: [null, 1, 1, 0, 0] },
  point: { name: "Point it out", symbol: "☝️ ☝️", instruction: "Extend just the index finger on each hand. Curl the other three fingers.", fingers: [null, 1, 0, 0, 0] },
  thumbs: { name: "Thumbs up", symbol: "👍 👍", instruction: "Extend both thumbs and curl all four fingers on each hand.", fingers: [1, 0, 0, 0, 0] },
};
