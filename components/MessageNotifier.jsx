"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { useMessageStream } from "@/lib/useEventStream";
import { playIncomingSound, playGroupSound, playPlop, unlockSoundOnFirstInteraction } from "@/lib/sound";

export default function MessageNotifier() {
  const { me } = useMe();
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  lastPath.current = pathname;

  // Audio nach erster Interaktion freischalten (auch in der installierten PWA)
  useEffect(() => unlockSoundOnFirstInteraction(), []);

  const pack = me?.soundPack || "icq";

  // Sounds, wenn eine vom Service Worker getriggerte Push-Nachricht eintrifft
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    function onSwMessage(ev) {
      const d = ev?.data;
      if (!d || typeof d !== "object") return;
      if (d.type !== "vv-push") return;
      if (d.payload?.kind === "room") playGroupSound(pack);
      else playIncomingSound(pack);
    }
    navigator.serviceWorker?.addEventListener?.("message", onSwMessage);
    return () => navigator.serviceWorker?.removeEventListener?.("message", onSwMessage);
  }, [pack]);

  const onMsg = useCallback((data) => {
    if (data && data.fromMe === false) playIncomingSound(pack);
  }, [pack]);

  const onRoom = useCallback((data) => {
    if (!data || data.fromMe) return;
    // Wenn der Tab gerade in genau diesem Raum ist, keinen Sound (man sieht's ja).
    const url = lastPath.current || "";
    if (url === `/messenger/rooms/${data.roomId}`) return;
    playGroupSound(pack);
  }, [pack]);

  const onNudge = useCallback(() => {
    playPlop();
    document.body?.animate?.(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-6px,2px)" },
        { transform: "translate(6px,-2px)" },
        { transform: "translate(-4px,1px)" },
        { transform: "translate(4px,-1px)" },
        { transform: "translate(0,0)" },
      ],
      { duration: 380, iterations: 1 }
    );
  }, []);

  useMessageStream(!!me, { onMessage: onMsg, onRoomMessage: onRoom, onNudge });
  return null;
}
