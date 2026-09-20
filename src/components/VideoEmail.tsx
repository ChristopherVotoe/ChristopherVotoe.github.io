"use client";

import { VIDEO_EMAIL_ENABLED, VIDEO_EMAIL_RECIPIENT } from "@/email/config";
import type { useVideoEmail } from "@/email/useVideoEmail";

type Email = ReturnType<typeof useVideoEmail>;

export function VideoPrivacy() {
  return <>{VIDEO_EMAIL_ENABLED
    ? `The finished video will be uploaded and automatically emailed to ${VIDEO_EMAIL_RECIPIENT} after you agree and record. Raw clips stay on your device. Deleting this session cannot recall an email already submitted.`
    : "Your video is created on your device. No recordings are uploaded."}</>;
}

export function EmailConsent({ email, disabled }: { email: Email; disabled: boolean }) {
  if (!email.enabled) return null;
  return <label className="email-consent"><input type="checkbox" checked={email.consent} disabled={disabled} onChange={(event) => email.setConsent(event.target.checked)} /><span>I agree to automatically email my finished video to <strong>{VIDEO_EMAIL_RECIPIENT}</strong>. Deleting the recording here will not delete the email.</span></label>;
}

export function VideoEmailStatus({ email }: { email: Email }) {
  if (!email.enabled) return null;
  return <section className="email-delivery" aria-label="Video email">
    <p role="status">{email.phase === "sending"
      ? `Emailing your video to ${VIDEO_EMAIL_RECIPIENT}… Keep this tab open until confirmed.`
      : email.phase === "accepted"
        ? `Email accepted for delivery to ${VIDEO_EMAIL_RECIPIENT}. Inbox delivery is not yet confirmed.`
        : email.phase === "failed" ? email.error : "Your video has not been submitted for email."}</p>
    {email.phase === "failed" && <button className="secondary" onClick={email.retry}>Retry email</button>}
    <p className="session-note">Deleting this session clears this device’s copy. It cannot recall an email already submitted.</p>
  </section>;
}
