import type { Landmark } from "../vision/GestureNormalizer.ts";

// Starter reference, in palm units. Tune against real camera samples as the prototype develops.
export const openPalm = {
  id: "open-palms", name: "Open palms", threshold: 0.85, minimumHoldMs: 400,
  landmarks: [
    [0, 0], [-.35, -.25], [-.65, -.5], [-.9, -.7], [-1.12, -.85],
    [-.45, -.9], [-.5, -1.4], [-.52, -1.7], [-.54, -1.95],
    [0, -1], [0, -1.55], [0, -1.9], [0, -2.2],
    [.4, -.92], [.45, -1.42], [.48, -1.73], [.5, -1.98],
    [.7, -.75], [.84, -1.1], [.9, -1.33], [.96, -1.53],
  ].map(([x, y]): Landmark => ({ x, y, z: 0 })),
};
