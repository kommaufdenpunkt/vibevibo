"use client";

import { useEffect, useRef } from "react";

// Verbindet sich mit /api/messages/stream und reicht alle Events durch.
// `handlers` ist ein Objekt: { onMessage, onRoomMessage, onTyping, onNudge, onRtc }.
// Legacy: zweites Argument darf weiterhin eine onMessage-Funktion sein.
export function useMessageStream(enabled, handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource("/api/messages/stream");
    const get = () => (typeof ref.current === "function" ? { onMessage: ref.current } : (ref.current || {}));

    const wrap = (key) => (e) => {
      const h = get()[key];
      if (!h) return;
      try { h(JSON.parse(e.data)); } catch {}
    };

    es.addEventListener("message", wrap("onMessage"));
    es.addEventListener("room-message", wrap("onRoomMessage"));
    es.addEventListener("typing", wrap("onTyping"));
    es.addEventListener("nudge", wrap("onNudge"));
    es.addEventListener("rtc", wrap("onRtc"));
    es.addEventListener("error", () => {
      // EventSource versucht automatisch zu reconnecten
    });
    return () => es.close();
  }, [enabled]);
}
