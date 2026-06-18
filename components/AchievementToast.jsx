"use client";

// 🏆 AchievementToast — globaler animierter Toast wenn eine neue
// Auszeichnung freigeschaltet wird. Polled /api/me/achievements/new
// alle 45s (und bei Tab-Focus) und vergleicht gegen localStorage.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

const SEEN_KEY = "vv_ach_seen_at";
const POLL_MS = 45_000;

export default function AchievementToast() {
  const { me } = useMe();
  const [toast, setToast] = useState(null);
  const queueRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!me) return;

    let cancelled = false;
    let lastSeen = 0;
    try { lastSeen = Number(localStorage.getItem(SEEN_KEY) || "0"); } catch {}

    async function check() {
      if (cancelled) return;
      try {
        const r = await fetch("/api/me/achievements", { credentials: "include" });
        if (!r.ok) return;
        const d = await r.json();
        const earned = (d.achievements || []).filter((a) => a.earned && a.earnedAt);
        if (earned.length === 0) return;
        if (lastSeen === 0) {
          const max = Math.max(...earned.map((a) => a.earnedAt));
          lastSeen = max;
          try { localStorage.setItem(SEEN_KEY, String(max)); } catch {}
          return;
        }
        const fresh = earned.filter((a) => a.earnedAt > lastSeen);
        if (fresh.length === 0) return;
        fresh.sort((a, b) => a.earnedAt - b.earnedAt);
        queueRef.current.push(...fresh);
        const max = Math.max(...earned.map((a) => a.earnedAt));
        lastSeen = max;
        try { localStorage.setItem(SEEN_KEY, String(max)); } catch {}
        pumpQueue();
      } catch {}
    }

    function pumpQueue() {
      if (toast) return;
      const next = queueRef.current.shift();
      if (!next) return;
      setToast(next);
    }

    check();
    timerRef.current = setInterval(check, POLL_MS);
    const focusHandler = () => check();
    window.addEventListener("focus", focusHandler);
    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
      window.removeEventListener("focus", focusHandler);
    };
  }, [me]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => {
      setToast(null);
      setTimeout(() => {
        const next = queueRef.current.shift();
        if (next) setToast(next);
      }, 350);
    }, 5200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <>
      <div style={{
        position: "fixed",
        top: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        animation: "vv-ach-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        pointerEvents: "auto",
      }}>
        <Link
          href="/profile/achievements"
          onClick={() => setToast(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)",
            backgroundSize: "200% 200%",
            animation: "vv-ach-shine 3s ease-in-out infinite",
            color: "#fff",
            padding: "12px 16px 12px 12px",
            borderRadius: 16,
            boxShadow: "0 8px 28px rgba(217,119,6,0.45), 0 1px 0 rgba(255,255,255,0.3) inset",
            textDecoration: "none",
            minWidth: 240,
            maxWidth: "calc(100vw - 32px)",
            border: "2px solid rgba(255,255,255,0.4)",
          }}
        >
          <div style={{
            fontSize: 36,
            lineHeight: 1,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
            animation: "vv-ach-spin 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}>{toast.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10.5,
              fontWeight: 800,
              opacity: 0.95,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}>🏆 Neue Auszeichnung</div>
            <div style={{
              fontSize: 15,
              fontWeight: 900,
              lineHeight: 1.15,
              marginTop: 1,
              textShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }}>{toast.name}</div>
            <div style={{
              fontSize: 11,
              opacity: 0.92,
              marginTop: 2,
              lineHeight: 1.3,
            }}>{toast.desc}</div>
          </div>
          <div style={{
            fontSize: 18,
            opacity: 0.7,
            padding: "0 4px",
          }}>›</div>
        </Link>
      </div>
      <style>{`
        @keyframes vv-ach-pop {
          0%   { transform: translateX(-50%) translateY(-30px) scale(0.7); opacity: 0; }
          60%  { transform: translateX(-50%) translateY(4px) scale(1.04); opacity: 1; }
          100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
        }
        @keyframes vv-ach-shine {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes vv-ach-spin {
          0%   { transform: rotate(-180deg) scale(0.3); }
          100% { transform: rotate(0deg) scale(1); }
        }
      `}</style>
    </>
  );
}
