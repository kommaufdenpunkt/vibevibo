"use client";

import { useState } from "react";
import { api } from "@/lib/api";

// 🔑 Admin-Only Wartungs-Buttons pro User:
//   - PW Reset: bcrypt-Hash in DB ersetzen
//   - Login-Sperre lösen: Rate-Limit-Buckets für User+IP zurücksetzen
//   (hilft wenn Admin sich selbst ausgesperrt hat).
export default function AdminResetPasswordBtn({ pw, username, regIp }) {
  const [busy, setBusy] = useState(false);

  async function doReset() {
    if (busy) return;
    const newPw = window.prompt(`Neues Passwort für @${username} eingeben (min. 6 Zeichen):`);
    if (newPw == null) return;
    if (newPw.trim().length < 6) {
      alert("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    if (!window.confirm(`Passwort für @${username} wirklich zurücksetzen?`)) return;
    setBusy(true);
    try {
      const r = await api.adminResetPassword(pw, username, newPw.trim());
      alert(r?.message || `Passwort für ${username} gesetzt.`);
    } catch (e) {
      alert(`Fehler: ${e?.message || e}`);
    } finally { setBusy(false); }
  }

  async function doUnlock() {
    if (busy) return;
    const ip = window.prompt(
      `Login-Sperre für @${username} aufheben.\n\nIP eintragen (leer = nur User-Bucket leeren):`,
      regIp || ""
    );
    if (ip == null) return;
    setBusy(true);
    try {
      const r = await api.adminUnlockLogin(pw, username, ip.trim());
      alert(r?.message || `Login-Sperre für ${username} aufgehoben.`);
    } catch (e) {
      alert(`Fehler: ${e?.message || e}`);
    } finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" onClick={doReset} disabled={busy}
        className="vv-btn"
        style={{ background: "#fef3c7", borderColor: "#f59e0b", color: "#78350f", fontWeight: 700 }}>
        {busy ? "…" : "🔑 PW Reset"}
      </button>
      <button type="button" onClick={doUnlock} disabled={busy}
        className="vv-btn"
        style={{ background: "#dcfce7", borderColor: "#16a34a", color: "#14532d", fontWeight: 700 }}>
        🔓 Unlock
      </button>
    </>
  );
}
