# Hand Signal Dance

A static Next.js camera app. Record two movements and create an 11-second dance video entirely in the browser, with music, mirrored clips, character images, and animated disco lighting. Recordings are never uploaded. Downloads use MP4 when supported, otherwise WebM.

## Run locally

Requires Node.js 22.18 or newer.

```sh
npm ci
npm run prepare:vision
npm run dev
```

Open http://localhost:3000. Start the test, allow the camera, and press **Ready to record?**. Keep the tab visible during recording and video creation. The 0:24–0:35 music excerpt is mixed into the video without microphone audio. Closing or reloading the tab clears the recordings.

## Publish to GitHub Pages

Repository: `ChristopherVotoe/ChristopherVotoe.github.io`.

1. In the repository’s **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
2. Push this code to `main`. The **Deploy to GitHub Pages** workflow installs dependencies, prepares the MediaPipe assets, checks the app, builds `out/`, and publishes it.
3. Visit https://ChristopherVotoe.github.io after the workflow succeeds.

The workflow can also be started manually from the Actions tab. This username repository serves from `/`, so no repository-name base path is needed. `trailingSlash` exports `/record/index.html` and `/results/index.html` for direct navigation and refreshes.

If your local remote still points at the old repository name:

```sh
git remote set-url origin https://github.com/ChristopherVotoe/ChristopherVotoe.github.io.git
```

## Validation

```sh
npm test
npm run lint
npm run build
npm run typecheck
```

To preview or test the static output, run `npm start` (requires Python 3), or serve it in one terminal:

```sh
python3 -m http.server 3000 --directory out
```

Then run `npm run test:browser` in another terminal. The browser test uses a fake camera, records both clips, creates and plays the final video, verifies audio and duration, deletes the recording, checks direct routes, and confirms there are no render uploads. It uses Remotion’s local Chromium and metadata tools; run `node scripts/prepare-render.mjs` once if the test browser is missing. Remotion compositions remain as reference material but are not used by the deployed app.

## Browser behavior

Video creation uses canvas capture, MediaRecorder, and Web Audio, taking approximately the video’s 11-second duration after loading assets. Keep the tab visible; switching away cancels creation so you can retry without losing the clips. Some browsers require **Retry video** to unlock audio. Browser encoding and seek performance can vary; exact frame timing and lighting differ from the former server renderer. Validate on actual Safari/iOS and Android devices before relying on mobile output.

The smile filter falls back to the original camera if MediaPipe cannot initialize. `npm run prepare:vision` copies the runtime and downloads the face and hand models into ignored `public/mediapipe/`; CI prepares these automatically. Camera access requires HTTPS (provided by GitHub Pages) or localhost.
