"use client";

import { useEffect } from "react";

// Verbindet sich mit /api/messages/stream und reicht jeden "message"-Event durch.
export function useMessageStream(enabled, onMessage) {
  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource("/api/messages/stream");
    es.addEventListener("message", (e) => {
      try { onMessage?.(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener("error", () => {
      // EventSource versucht automatisch zu reconnecten
    });
    return () => es.close();
  }, [enabled, onMessage]);
}
