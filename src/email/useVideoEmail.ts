"use client";

import { useCallback, useRef, useState } from "react";
import { VIDEO_EMAIL_ENABLED } from "./config";
import { sendVideo } from "./sendVideo";

type Delivery = { phase: "idle" | "sending" | "accepted" | "failed"; error: string };

export function useVideoEmail() {
  const [consent, setConsent] = useState(false);
  const [delivery, setDelivery] = useState<Delivery>({ phase: "idle", error: "" });
  const operation = useRef<AbortController | null>(null);
  const pending = useRef<{ file: File; startedAt: number; accepted: boolean } | null>(null);

  const reset = useCallback((clearConsent = false) => {
    operation.current?.abort(); operation.current = null;
    pending.current = null;
    setDelivery({ phase: "idle", error: "" });
    if (clearConsent) setConsent(false);
  }, []);

  const send = async (file: File) => {
    if (!VIDEO_EMAIL_ENABLED || !consent || operation.current) return;
    if (pending.current?.file !== file) pending.current = { file, startedAt: Date.now(), accepted: false };
    const current = pending.current;
    if (current.accepted) return;
    // Stop retries before the provider's 24-hour duplicate-protection window expires.
    if (Date.now() - current.startedAt > 23 * 60 * 60 * 1000) {
      setDelivery({ phase: "failed", error: "The retry window has expired. Download your video instead." }); return;
    }
    const controller = new AbortController();
    operation.current = controller;
    const timeout = setTimeout(() => controller.abort(), 90_000);
    setDelivery({ phase: "sending", error: "" });
    try {
      await sendVideo(file, controller.signal);
      if (operation.current !== controller) return;
      current.accepted = true;
      setDelivery({ phase: "accepted", error: "" });
    } catch (error) {
      if (operation.current !== controller) return;
      setDelivery({ phase: "failed", error: controller.signal.aborted
        ? "Email confirmation timed out. Keep this tab open and retry, or download your video."
        : error instanceof Error ? error.message : "Email could not be confirmed. Your download is still available." });
    } finally {
      clearTimeout(timeout);
      if (operation.current === controller) operation.current = null;
    }
  };

  return { enabled: VIDEO_EMAIL_ENABLED, consent, setConsent, ...delivery, reset, send,
    retry: () => { if (pending.current) void send(pending.current.file); },
  };
}
