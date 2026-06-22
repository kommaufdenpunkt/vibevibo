"use client";

// 🎀 Admin Fidolin-Broadcast — Fidolin schickt System-DM an alle User.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export default function FidolinBroadcastAdmin() {
  const [data, setData] = useState(null);
  const [pw, setPw] = useState("");
  const [text, setText] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const refresh = useCallback(async () => {
    const p = pw || (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("pw") || ""
      : "");
    if (!pw && p) setPw(p);
    const r = await fetch(`/api/admin/fidolin-broadcast?pw=${encodeURIComponent(p)}`);
    if (r.ok) {
      const d = await r.json();
      setData(d);
      if (!draftLoaded && d.draftText) {
        setText(d.draftText);
        setDraftLoaded(true);
      }
    } else {
      setData({ error: (await r.json().catch(() => ({}))).error || "Auth-Fehler" });
    }
  }, [pw, draftLoaded]);

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  async function send() {
    if (!text.trim()) return alert("Text fehlt.");
    const recipients = data?.recipientCount || 0;
    if (recipients === 0) return alert("Keine Empfänger.");
    if (!confirm(`🎀 Diese Nachricht JETZT als Fidolin an ${recipients} User schicken?\n\nKann nicht rückgängig gemacht werden.`)) return;
    setBusy(true); setResult(null);
    try {
      const lastChangelogKey = data?.newEntries?.[0]?.key || "";
      const r = await fetch(`/api/admin/fidolin-broadcast?pw=${encodeURIComponent(pw)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lastChangelogKey }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResult({ ok: true, count: d.count, total: d.recipientCount });
      refresh();
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally { setBusy(false); }
  }

  if (!data) return <div style={{ padding: 20, color: "#475569" }}>Lädt…</div>;
  if (data.error) {
    return (
      <div style={{ padding: 20, maxWidth: 400, margin: "30px auto" }}>
        <h2 style={{ color: "#1c1c1e" }}>🎀 Fidolin-Broadcast</h2>
        <div style={{ padding: 12, background: "#fef3c7", borderRadius: 8, fontSize: 13 }}>
          {data.error}. Setz <code>?pw=DEIN_ADMIN_PW</code> an die URL.
        </div>
      </div>
    );
  }

  const recipients = data.recipientCount || 0;
  const newEntries = data.newEntries || [];

  return (
    <div style={{ maxWidth: 820, margin: "20px auto", padding: 14 }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #fce7f3, #f5d0fe)",
        border: "3px ridge #ec4899", borderRadius: 14,
        padding: 18, marginBottom: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>🎀</span>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#831843" }}>
              Fidolin-Broadcast
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#831843" }}>
              {recipients} aktive User · Fidolin verschickt eine DM an alle (außer Bots).
            </p>
          </div>
        </div>
      </div>

      {/* Status */}
      {data.lastBroadcastAt > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.9)", padding: 10, borderRadius: 10,
          fontSize: 12, color: "#475569", marginBottom: 12,
          border: "1px solid rgba(0,0,0,0.06)",
        }}>
          📤 Letzter Fidolin-Broadcast: <strong>{new Date(data.lastBroadcastAt).toLocaleString("de-DE")}</strong>
          {" — "}an {data.lastBroadcastCount} User
        </div>
      )}

      {/* Neue Changelog-Einträge */}
      <div style={{
        background: "rgba(255,255,255,0.85)", padding: 14, borderRadius: 12,
        marginBottom: 14, border: "1px solid rgba(0,0,0,0.06)",
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {newEntries.length > 0
            ? `🆕 ${newEntries.length} Einträge seit letztem Broadcast — Draft unten basiert darauf`
            : "✓ Alles aktuell — keine neuen Einträge"}
        </div>
        {newEntries.length > 0 && (
          <div style={{ display: "grid", gap: 4, maxHeight: 220, overflowY: "auto" }}>
            {newEntries.map((e) => (
              <div key={e.key} style={{
                fontSize: 12, color: "#1c1c1e", padding: "4px 8px",
                background: "rgba(236,72,153,0.05)", borderRadius: 6,
                borderLeft: "2px solid #ec4899",
              }}>
                {e.emoji || "•"} {String(e.title || "").slice(0, 160)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Textarea */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
          Nachricht (Draft aus Changelog ist vorausgefüllt — komplett anpassbar)
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          maxLength={2000}
          placeholder="🎀 Hey du! Es gibt was Neues..."
          style={{
            width: "100%", padding: 12, borderRadius: 10,
            border: "1.5px solid #cbd5e1", fontSize: 13,
            fontFamily: "inherit", boxSizing: "border-box",
            lineHeight: 1.5, resize: "vertical",
          }}
        />
        <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right", marginTop: 4 }}>
          {text.length} / 2000 Zeichen
        </div>
      </div>

      {/* Result */}
      {result && (
        <div style={{
          padding: 12, borderRadius: 10, marginBottom: 14,
          background: result.ok ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          color: result.ok ? "#15803d" : "#991b1b",
          fontSize: 13, fontWeight: 700,
          border: `1px solid ${result.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          {result.ok
            ? `🎉 Erfolgreich an ${result.count} von ${result.total} Usern gesendet`
            : `⚠ Fehler: ${result.error}`}
        </div>
      )}

      {/* Send button */}
      <button
        onClick={send}
        disabled={busy || !text.trim() || recipients === 0}
        style={{
          width: "100%", padding: 14, borderRadius: 12,
          background: busy
            ? "#94a3b8"
            : (text.trim() && recipients > 0
                ? "linear-gradient(135deg, #ec4899, #a855f7)"
                : "#cbd5e1"),
          color: "#fff", border: "2px ridge #fff",
          fontWeight: 900, fontSize: 15,
          cursor: busy ? "wait" : (text.trim() && recipients > 0 ? "pointer" : "not-allowed"),
          fontFamily: "inherit",
          boxShadow: "0 4px 12px rgba(236,72,153,0.35)",
        }}
      >
        {busy
          ? "⏳ Sende an alle…"
          : `🎀 Jetzt als Fidolin an ${recipients} User senden`}
      </button>

      <div style={{ marginTop: 18, textAlign: "center", display: "flex", gap: 14, justifyContent: "center" }}>
        <Link href="/admin" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>
          ← Zurück zum Admin
        </Link>
        <Link href="/admin/broadcast" style={{ color: "#94a3b8", fontSize: 13, textDecoration: "none" }}>
          (System-Broadcast statt Fidolin)
        </Link>
      </div>
    </div>
  );
}
