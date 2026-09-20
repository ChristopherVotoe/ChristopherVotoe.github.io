# Hand Signal Dance

First two milestones of the **Hand Signal Dance** software design document, available from MCP server `my-first-mcp` at `info://software-design-doc`.

## Run locally

Requires Node.js 22.18 or newer and npm.

```sh
npm install
npm run prepare:vision
npm run dev
```

Open http://localhost:3000 and select **Enable camera**. Allow camera access, then hold both hands in view. Tracking draws up to 42 landmarks and their connections. Match the open-palm prompt with both hands for 400 ms to see success. Stop the camera with **Stop camera**. Switching tabs also stops tracking.

The preparation script downloads Google's version 1 float16 hand-landmarker model and copies the installed MediaPipe WASM runtime into `public/mediapipe`. These generated assets are ignored by Git. Run this command again after dependency updates. Both assets are served locally by Next.js; camera frames never leave the browser.

## Included

- Next.js, React, and strict TypeScript.
- Front-facing camera preference, camera selection after permission, mirrored preview toggle.
- Two-hand MediaPipe Hand Landmarker with GPU initialization and CPU fallback.
- Skeleton overlay, landmark count, and inference rate.
- Normalized open-palm template matching, separate left/right score meters, and simultaneous 400 ms hold validation.
- Translation, scale, in-plane rotation, image aspect, and mirror normalization; independent smoothing by model handedness. Missing or ambiguous hands and inference gaps over 200 ms reset holds.
- Permission and device error handling; cancellation and camera/model cleanup.
- Responsive layout and explicit camera disclosure. No recording, microphone access, or uploading in this milestone.

Inference currently runs on the main thread at up to 30 Hz. Moving it to a Web Worker is a later performance step in the SDD. FPS is measured inference throughput, not a promised camera rate.

## Validation

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Manual camera acceptance checks:

1. Confirm no camera permission is requested until Enable camera is pressed.
2. Allow access and confirm 42 points follow two hands; remove one and confirm its score resets while the other continues.
3. Toggle mirroring and verify points remain aligned. Switch cameras when available.
4. Stop, restart, cancel during startup, and switch tabs; confirm the camera indicator turns off when stopped.
5. Deny camera access and confirm the recovery message. Retry after allowing permission.
6. Open both palms for 400 ms: both scores should reach 85% and show success. Close either hand, hide it, or show a peace sign: success must clear. One hand alone must never complete the challenge. Cross hands, toggle mirroring, and vary distance and rotation to check identity and alignment.
7. Test in desktop Chrome and Safari, plus mobile browsers over HTTPS. Localhost is valid on the same device; plain HTTP on a LAN address cannot access cameras.

The automated tests cover normalization invariance, rejected poses, hand ordering, independent scores, simultaneous holds, disappearance, and interrupted inference. They use synthetic landmarks. The starter reference in `src/gestures/openPalm.ts` has not yet been calibrated against recorded real-hand samples; live accuracy, handedness stability during occlusion, and performance on mobile remain manual acceptance checks.

## Next milestones

Follow SDD sections 25–27: five gesture prompts with clip recording; music and final video composition; mobile validation and a gesture creation tool. Recording consent, retakes, deletion, and upload disclosure must be added when recording is introduced.

Reference: [MediaPipe Hand Landmarker for web](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js).

## Photo-based two-pose challenge

The active sequence now uses the two supplied reference poses: open hands pointing inward with thumbs raised, then upright closed fists. Both hands must match for 400 ms. Two recorded clips alternate into a silent four-second MP4; music is deferred. The matcher checks finger shapes and image-space hand direction, but does not track the face or enforce distance from the chin. The original five gesture definitions remain available for future sequences. Live pose accuracy still needs webcam validation.

## Follow-along mode (current)

The app now shows two animated hand guides: open hands moving inward and outward, then the backs of closed fists rising and returning. Camera recording starts after a two-second countdown without landmark detection or accuracy scoring. Each clip captures two two-second repetitions; the silent output preserves four seconds from each clip for an eight-second video. Review, retake, pause, and delete controls remain available. Legacy recognition modules remain in the repository but are not loaded by the live experience.


24-30

0-3 for first hand
4-7 for 2nd