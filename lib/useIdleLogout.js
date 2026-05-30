"use client";

// Auto-Logout nach Inaktivität (wie früher bei Jappy).
// Listenert auf Maus/Tastatur/Touch/Scroll. Sind 15 Min keine Aktivität
// passiert, wird zuerst gewarnt; nach 30 weiteren Sekunden ohne Reaktion
// wird die Session beendet und der User zur Login-Seite geschickt.
import { useEffect, useState } from "react";

const EVENTS = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "wheel"];
const IDLE_MS_DEFAULT = 15 * 60_000; // 15 Min
const WARN_MS_DEFAULT = 30_000;       // 30 Sek

export function useIdleLogout({ enabled = true, idleMs = IDLE_MS_DEFAULT, warnMs = WARN_MS_DEFAULT, onLogout, onWarn } = {}) {
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(warnMs / 1000);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let warnTimer = null;
    let logoutTimer = null;
    let countdownTimer = null;
    let lastTouch = Date.now();

    const clearAll = () => {
      if (warnTimer) clearTimeout(warnTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      if (countdownTimer) clearInterval(countdownTimer);
      warnTimer = logoutTimer = countdownTimer = null;
    };

    const startTimers = () => {
      clearAll();
      warnTimer = setTimeout(() => {
        setWarning(true);
        setSecondsLeft(Math.ceil(warnMs / 1000));
        onWarn?.();
        // Countdown laufen lassen
        countdownTimer = setInterval(() => {
          setSecondsLeft((s) => Math.max(0, s - 1));
        }, 1000);
        logoutTimer = setTimeout(() => {
          clearAll();
          setWarning(false);
          onLogout?.();
        }, warnMs);
      }, idleMs);
    };

    const reset = () => {
      const now = Date.now();
      // Mausbewegungen kommen massenhaft – sample auf max 1x/Sek
      if (now - lastTouch < 1000) return;
      lastTouch = now;
      if (warning) setWarning(false);
      startTimers();
    };

    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    startTimers();

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
      clearAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, idleMs, warnMs]);

  return { warning, secondsLeft };
}
