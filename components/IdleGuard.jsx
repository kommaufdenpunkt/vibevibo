"use client";

// Optionaler Auto-Logout nach Idle. Standardmäßig AUS — wird im Profil-Tab
// des Messengers per localStorage aktiviert (vv:autoLogoutMinutes).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { useIdleLogout } from "@/lib/useIdleLogout";

const LS_KEY = "vv:autoLogoutMinutes";

function readMinutes() {
  if (typeof window === "undefined") return 0;
  try {
    const v = Number(localStorage.getItem(LS_KEY)) || 0;
    return [0, 15, 30, 60, 120].includes(v) ? v : 0;
  } catch { return 0; }
}

export default function IdleGuard() {
  const { me, logout } = useMe();
  const router = useRouter();
  const [minutes, setMinutes] = useState(0);

  // Auf Setting-Änderungen aus dem Profil-Tab reagieren
  useEffect(() => {
    setMinutes(readMinutes());
    const onChange = () => setMinutes(readMinutes());
    window.addEventListener("storage", onChange);
    window.addEventListener("vv-auto-logout-changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("vv-auto-logout-changed", onChange);
    };
  }, []);

  const { warning, secondsLeft } = useIdleLogout({
    enabled: !!me && minutes > 0,
    idleMs: minutes * 60_000,
    warnMs: 30_000,
    onLogout: async () => {
      try { await logout(); } catch {}
      router.push("/login");
    },
  });

  if (!me || !warning) return null;

  return (
    <div
      role="alertdialog" aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{
        background: "linear-gradient(180deg, #fff 0%, #fff5fb 100%)",
        borderRadius: 16, padding: 22, maxWidth: 380, width: "100%",
        boxShadow: "0 24px 50px rgba(0,0,0,0.45)",
        fontFamily: "-apple-system, BlinkMacSystemFont, Arial, sans-serif",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 54 }}>😴</div>
        <h2 style={{ margin: "10px 0 6px", color: "#c2185b" }}>Bist du noch da?</h2>
        <p style={{ color: "#555", fontSize: 14, lineHeight: 1.5, margin: 0 }}>
          Du warst {minutes} Min inaktiv. Aus Sicherheitsgründen
          wirst du in <strong>{secondsLeft}</strong> Sekunden ausgeloggt.
        </p>
        <p style={{ color: "#888", fontSize: 12, marginTop: 8 }}>
          Klick irgendwo, um wach zu bleiben.
        </p>
      </div>
    </div>
  );
}

// Export für die Setting-UI im Profil-Tab.
export function getAutoLogoutMinutes() { return readMinutes(); }
export function setAutoLogoutMinutes(min) {
  const v = [0, 15, 30, 60, 120].includes(Number(min)) ? Number(min) : 0;
  try { localStorage.setItem(LS_KEY, String(v)); } catch {}
  window.dispatchEvent(new Event("vv-auto-logout-changed"));
  return v;
}
