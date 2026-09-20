export { VIDEO_EMAIL_RECIPIENT, MAX_EMAIL_VIDEO_BYTES, EMAIL_CONSENT_VERSION } from "./constants.ts";
export const VIDEO_EMAIL_URL = process.env.NEXT_PUBLIC_VIDEO_EMAIL_URL?.trim() ?? "";
export const VIDEO_EMAIL_ENABLED = Boolean(VIDEO_EMAIL_URL);
