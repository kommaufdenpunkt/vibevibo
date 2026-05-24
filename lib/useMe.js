"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const Ctx = createContext({ me: null, loading: true, refresh: () => {}, logout: async () => {} });

export function MeProvider({ children }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ICQ-Heartbeat: solange eingeloggt, alle 30s "ich bin noch da" pingen,
  // damit der Online-Status (last_seen < 90s) live bleibt.
  useEffect(() => {
    if (!me) return;
    const ping = () => { api.ping().catch(() => {}); };
    ping();
    const t = setInterval(ping, 30000);
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
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
