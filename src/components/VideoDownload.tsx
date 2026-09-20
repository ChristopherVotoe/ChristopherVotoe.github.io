"use client";

import { useState } from "react";

export function VideoDownload({ url, file }: { url: string; file: File }) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const canShare = typeof navigator !== "undefined" && Boolean(navigator.canShare?.({ files: [file] }));
  const share = async () => {
    setSharing(true); setError("");
    try {
      // The File is ready before the tap, preserving mobile user activation.
      await navigator.share({ files: [file], title: "My hand signal dance" });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setError("Sharing is unavailable. Use Download to save your video instead.");
      }
    } finally { setSharing(false); }
  };
  return <div className="video-download">
    {canShare && <button className="primary" disabled={sharing} onClick={() => void share()}>{sharing ? "Opening share options…" : "Save or share video"}<span aria-hidden="true">↗</span></button>}
    <a className={canShare ? "secondary" : "primary"} href={url} download={file.name}>Download {file.name.endsWith(".mp4") ? "MP4" : "WEBM"} ↓</a>
    {error && <p className="error" role="status">{error}</p>}
  </div>;
}
