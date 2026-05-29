"use client";

import { useCallback, useEffect } from "react";
import { useMe } from "@/lib/useMe";
import { useMessageStream } from "@/lib/useEventStream";
import { playUhOh, unlockSoundOnFirstInteraction } from "@/lib/sound";

export default function MessageNotifier() {
  const { me } = useMe();

  // Audio nach erster Interaktion freischalten (auch in der installierten PWA)
  useEffect(() => unlockSoundOnFirstInteraction(), []);

  const onMsg = useCallback((data) => {
    // Nur bei EINGEHENDEN Nachrichten (nicht meine eigenen)
    if (data && data.fromMe === false) playUhOh();
  }, []);

  useMessageStream(!!me, onMsg);
  return null;
}
