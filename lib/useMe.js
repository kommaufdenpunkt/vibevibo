"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { api } from "./api";

const Ctx = createContext({ me: null, loading: true, refresh: () => {}, logout: async () => {} });

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "wheel"];
const ACTIVITY_WINDOW_MS = 90_000; // letzte 90s zählen als „aktiv"

export function MeProvider({ children }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.me();
      setMe(user);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch {}
    setMe(null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Aktivitäts-Tracking: jede echte Interaktion aktualisiert lastActivityRef.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => { lastActivityRef.current = Date.now(); };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, bump));
  }, []);

  // Heartbeat: alle 30s pingen, ABER nur wenn in den letzten 90s
  // tatsächlich Interaktion war. Sonst läuft der last_seen-Wert ehrlich aus
  // und der User wird in den Aktivitäts-Balken korrekt als „kurz weg" angezeigt.
  useEffect(() => {
    if (!me) return;
    const tryPing = () => {
      if (Date.now() - lastActivityRef.current > ACTIVITY_WINDOW_MS) return;
      api.ping().catch(() => {});
    };
    tryPing(); // sofort einmal
    const t = setInterval(tryPing, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        // Tab zurückgeholt zählt als Aktivität
        lastActivityRef.current = Date.now();
        tryPing();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [me]);

  return <Ctx.Provider value={{ me, loading, refresh, logout, setMe }}>{children}</Ctx.Provider>;
}

export function useMe() {
  return useContext(Ctx);
}
