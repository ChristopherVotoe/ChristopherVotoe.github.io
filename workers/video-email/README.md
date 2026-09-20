# Automatic video email setup

The completed video is uploaded from the browser to this Cloudflare Worker. The Worker sends it as an email attachment through Resend to **Chris.Votoe.official@gmail.com**. The recipient, subject, and attachment filename are fixed by the server. Raw camera clips are not uploaded. No Gmail password is needed.

The code is ready, but email stays **disabled until a real Worker URL is configured in the Pages build**. A GitHub Pages deploy alone does not deploy this Worker or configure an email account.

## 1. Prepare Resend

Create or connect a [Resend account](https://resend.com), create an API key with sending access, and choose a sender from a [verified domain](https://resend.com/docs/dashboard/domains/introduction) you control, for example `Hand Test <videos@yourdomain.com>`.

For initial testing, `Hand Test <onboarding@resend.dev>` can send to `Chris.Votoe.official@gmail.com` only if that is the email address registered on the Resend account. The default domain is for testing; use a verified sender for production. See [Resend's sender restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain). A `github.io` address is not a sender domain you can verify, and you cannot verify `gmail.com`.

Do not paste the API key in chat, JavaScript, GitHub repository variables, or this repository.

## Optional: send the Hello World example locally

The Node-only script `scripts/send-test-email.mjs` uses the Resend SDK. It is never imported into the browser or run by the Pages workflow.

Create `.env.email.local` in the repository root (already ignored by Git):

```dotenv
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=onboarding@resend.dev
```

Replace `re_xxxxxxxxx` with your real, private API key. If you previously shared a key in chat or committed it, revoke it and create a replacement first. This file is only for the local test command; the deployed Worker still needs its own secrets as described below.

Preview without sending:

```sh
npm run email:test -- --dry-run
```

Send the Hello World email to `chris.votoe.official@gmail.com`:

```sh
npm run email:test
```

The command reports provider acceptance, not confirmed inbox delivery. Sending with `onboarding@resend.dev` requires that recipient to be your Resend account email.

## 2. Deploy the Worker

Create or sign in to a [Cloudflare account](https://dash.cloudflare.com). From the repository root, using a current Node.js 22 or newer:

```sh
npx wrangler@4 login
npx wrangler@4 deploy --config workers/video-email/wrangler.jsonc
npx wrangler@4 secret put RESEND_API_KEY --config workers/video-email/wrangler.jsonc
npx wrangler@4 secret put EMAIL_FROM --config workers/video-email/wrangler.jsonc
```

Enter the Resend API key and verified sender at their respective private prompts. The initial deployment returns 503 for email until both secrets are set. Keep `ALLOWED_ORIGIN` as `https://christophervotoe.github.io` for this site. The two rate-limit namespace IDs must be unique to this Worker in your account.

Wrangler prints a URL like `https://hand-dance-video-email.YOUR-SUBDOMAIN.workers.dev`. The email endpoint is that URL plus `/email-video`.

Future Worker changes require running the deploy command again. The existing Pages workflow deploys only the website.

## 3. Enable the website

Open [repository Actions variables](https://github.com/ChristopherVotoe/ChristopherVotoe.github.io/settings/variables/actions) and create a **repository variable**:

- Name: `NEXT_PUBLIC_VIDEO_EMAIL_URL`
- Value: the HTTPS Worker URL ending in `/email-video`

Then run [Deploy to GitHub Pages](https://github.com/ChristopherVotoe/ChristopherVotoe.github.io/actions/workflows/pages.yml) from the Actions tab, or push to `main`. This is a public endpoint URL, not a secret. No provider credentials belong in the Pages build.

## Behavior and limits

- A visitor must agree to automatic email before **Ready to record?** becomes available. The destination is shown before recording and in the results.
- Only the finished file is submitted, after browser rendering succeeds. Download and playback still work if email fails.
- Files are limited to **12 MiB** before base64 encoding. Larger exports stay available for download and manual email. MP4 and WebM container signatures are checked; the Worker does not transcode video.
- Identical file bytes produce a stable Resend idempotency key. Resend suppresses duplicate requests for [24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys); the browser stops offering effective retries after 23 hours. Recreating a video may produce different bytes and a new email.
- Successful status means Resend accepted the message. It does not prove delivery to Gmail. Check Resend's delivery dashboard and the recipient's Spam folder when diagnosing missing mail.
- The Worker does not write videos to a storage bucket or database and does not log video contents or provider credentials. The attachment is sent to Resend and retained in the recipient's mailbox; provider retention follows account settings.
- Deleting a session aborts an outstanding browser upload and releases local files, but cannot reliably cancel a request already received by the Worker or recall email. Closing the tab during upload may leave delivery unconfirmed; there is no background queue.
- CORS accepts only the configured site. CORS and the agreement header are not authentication: non-browser callers can spoof them. The endpoint is a public submission service to one fixed recipient. Cloudflare limits submissions to 3 per IP per minute and 10 total per minute **per Cloudflare location**. These limits are approximate, not a global quota or a bot-proof barrier; shared networks can hit the IP limit. Provider account quotas still apply. Attachment encoding consumes Worker CPU and memory; the Free plan’s CPU limit can be too low for multi-megabyte videos. Use a Workers plan with sufficient CPU allowance and validate with a full-size export before enabling the site. See [Cloudflare rate-limit behavior](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
- To disable new sends immediately, remove `RESEND_API_KEY` from the Worker. To restore the website's local-only behavior, remove the GitHub URL variable and rebuild Pages as well.

## Local checks without real email

`npm test` mocks all provider calls for the Worker tests. `npm run typecheck` checks the Worker and frontend types. The optional browser email test described in the root README intercepts the email endpoint and never contacts Resend.
