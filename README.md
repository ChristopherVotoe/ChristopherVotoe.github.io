# Hand Signal Dance

First milestone of the **Hand Signal Dance** software design document, available from MCP server `my-first-mcp` at `info://software-design-doc`.

## Run locally

Requires Node.js 22 or newer and npm.

```sh
npm install
npm run prepare:vision
npm run dev
```

Open http://localhost:3000 and select **Enable camera**. Allow camera access, then hold one hand in view. A successful tracking frame draws 21 landmarks and their connections. Stop the camera with **Stop camera**. Switching tabs also stops tracking.

The preparation script downloads Google's version 1 float16 hand-landmarker model and copies the installed MediaPipe WASM runtime into `public/mediapipe`. These generated assets are ignored by Git. Run this command again after dependency updates. Both assets are served locally by Next.js; camera frames never leave the browser.

## Included

- Next.js, React, and strict TypeScript.
- Front-facing camera preference, camera selection after permission, mirrored preview toggle.
- Single-hand MediaPipe Hand Landmarker with GPU initialization and CPU fallback.
- Skeleton overlay, landmark count, and inference rate.
- Permission and device error handling; cancellation and camera/model cleanup.
- Responsive layout and explicit camera disclosure. No recording, microphone access, or uploading in this milestone.

Inference currently runs on the main thread at up to 30 Hz. Moving it to a Web Worker is a later performance step in the SDD. FPS is measured inference throughput, not a promised camera rate.

## Validation

```sh
npm run typecheck
npm run lint
npm run build
```

Manual camera acceptance checks:

1. Confirm no camera permission is requested until Enable camera is pressed.
2. Allow access and confirm 21 points follow one hand; move it out of frame and confirm the overlay clears.
3. Toggle mirroring and verify points remain aligned. Switch cameras when available.
4. Stop, restart, cancel during startup, and switch tabs; confirm the camera indicator turns off when stopped.
5. Deny camera access and confirm the recovery message. Retry after allowing permission.
6. Test in desktop Chrome and Safari, plus mobile browsers over HTTPS. Localhost is valid on the same device; plain HTTP on a LAN address cannot access cameras.

## Next milestones

Follow SDD sections 25–27: normalized gesture matching and a match meter; five gesture prompts with hold validation and clip recording; music and final video composition; mobile validation and a gesture creation tool. Recording consent, retakes, deletion, and upload disclosure must be added when recording is introduced.

Reference: [MediaPipe Hand Landmarker for web](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js).
