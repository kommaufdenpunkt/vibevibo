"use client";

// 👮 Officer-Verwaltung — nur für Owner sichtbar.
// • Member zu Officer befördern + Officer-Rechte je nach Officer einstellen
// • Owner-Übergabe an einen Officer
// • Owner-Abgabe (Com wird besitzerlos)

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ComOfficerPanel({ slug, members, officerPerms, availablePerms, themeColor = "#ec4899", onChange }) {
  const [editingUser, setEditingUser] = useState(null);
  const [draftPerms, setDraftPerms] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function api(action, body) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/groups/${slug}/mod`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setMsg({ ok: true, text: "✓ Erledigt" });
      onChange?.();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 3500);
    }
  }

  const owner = members.find((m) => m.role === "owner");
  const officers = members.filter((m) => m.role === "mod");
  const plainMembers = members.filter((m) => m.role === "member");

  function startEdit(officer) {
    setEditingUser(officer.username);
    setDraftPerms(officerPerms?.[officer.username] || []);
  }
  function togglePerm(id) {
    setDraftPerms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }
  async function savePerms() {
    await api("set-perms", { targetUsername: editingUser, perms: draftPerms });
    setEditingUser(null);
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.95)",
      borderRadius: 14, padding: 14,
      border: `2px solid ${themeColor}33`,
      marginBottom: 12,
    }}>
      <h3 style={{ marginTop: 0, color: "#1f2937" }}>👮 Officer-Verwaltung</h3>

      {msg && (
        <div style={{
          padding: 8, borderRadius: 8, marginBottom: 10,
          background: msg.ok ? "#dcfce7" : "#fee2e2",
          color: msg.ok ? "#166534" : "#991b1b",
          fontWeight: 700, fontSize: 13,
        }}>{msg.text}</div>
      )}

      {/* Owner */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#92400e", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>
          👑 Owner
        </div>
        {owner ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: 8, background: "#fef3c7", borderRadius: 10,
            border: "1px solid #f59e0b",
          }}>
            <span style={{ fontSize: 20 }}>{owner.emoji || "👤"}</span>
            <Link href={`/u/${owner.username}`} style={{ flex: 1, color: "#92400e", fontWeight: 700, fontSize: 13 }}>
              {owner.displayName || owner.username}
            </Link>
          </div>
        ) : (
          <div style={{ padding: 8, background: "#fee2e2", color: "#991b1b", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
            ⚠ N/A — Com ist besitzerlos.
          </div>
        )}
      </div>

      {/* Officers */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: "#581c87",
          letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          🛡 Officers ({officers.length})
        </div>
        {officers.length === 0 && (
          <div style={{ fontSize: 12, color: "#64748b" }}>Noch keine Officers ernannt.</div>
        )}
        {officers.map((o) => {
          const perms = officerPerms?.[o.username] || [];
          const isEditing = editingUser === o.username;
          return (
            <div key={o.username} style={{
              padding: 10, borderRadius: 10, marginBottom: 6,
              background: isEditing ? "#fdf2f8" : "#f8fafc",
              border: isEditing ? `2px solid ${themeColor}` : "1px solid rgba(0,0,0,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{o.emoji || "👤"}</span>
                <Link href={`/u/${o.username}`} style={{ flex: 1, color: "#581c87", fontWeight: 700, fontSize: 13 }}>
                  {o.displayName || o.username}
                </Link>
                {!isEditing ? (
                  <>
                    <button disabled={busy} onClick={() => startEdit(o)} style={smallBtn(themeColor)}>⚙ Rechte</button>
                    <button disabled={busy} onClick={() => {
                      if (confirm(`Officer-Status von @${o.username} entziehen?`))
                        api("demote", { targetUsername: o.username });
                    }} style={smallBtn("#64748b")}>↓ Demote</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditingUser(null)} style={smallBtn("#64748b")}>Abbrechen</button>
                    <button disabled={busy} onClick={savePerms} style={smallBtn(themeColor)}>✓ Speichern</button>
                  </>
                )}
              </div>
              <div style={{
                marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6,
              }}>
                {availablePerms.map((p) => {
                  const has = isEditing ? draftPerms.includes(p.id) : perms.includes(p.id);
                  if (isEditing) {
                    return (
                      <button key={p.id} onClick={() => togglePerm(p.id)} style={{
                        ...permPill,
                        background: has ? themeColor : "#e2e8f0",
                        color: has ? "#fff" : "#475569",
                        borderColor: has ? themeColor : "rgba(0,0,0,0.08)",
                      }}>{has ? "✓ " : ""}{p.label}</button>
                    );
                  }
                  if (!has) return null;
                  return (
                    <span key={p.id} style={{ ...permPill, background: "#dcfce7", color: "#166534", borderColor: "#86efac" }}>
                      ✓ {p.label}
                    </span>
                  );
                })}
                {!isEditing && perms.length === 0 && (
                  <span style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>Keine Rechte — View-Only.</span>
                )}
              </div>

              {/* Owner-Übergabe-Knopf */}
              {owner && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed rgba(0,0,0,0.08)" }}>
                  <button disabled={busy} onClick={() => {
                    if (confirm(`Eigentum endgültig an @${o.username} übergeben? Du wirst Officer mit allen Rechten.`))
                      api("transfer-owner", { targetUsername: o.username });
                  }} style={{ ...smallBtn("#f59e0b"), fontSize: 11 }}>
                    👑 Eigentum übergeben
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Member → Promote */}
      {plainMembers.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>
            👥 Members ({plainMembers.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
            {plainMembers.slice(0, 30).map((m) => (
              <div key={m.username} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 8, background: "#f8fafc",
              }}>
                <span style={{ fontSize: 16 }}>{m.emoji || "👤"}</span>
                <Link href={`/u/${m.username}`} style={{ flex: 1, color: "#1f2937", fontWeight: 600, fontSize: 12 }}>
                  {m.displayName || m.username}
                </Link>
                <button disabled={busy} onClick={() => {
                  if (confirm(`@${m.username} zum Officer befördern?`))
                    api("promote", { targetUsername: m.username });
                }} style={smallBtn(themeColor)}>↑ Promote</button>
              </div>
            ))}
            {plainMembers.length > 30 && (
              <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: 4 }}>
                + {plainMembers.length - 30} weitere Members (zu viele zum anzeigen)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Eigentums-Abgabe (Notausgang) */}
      {owner && (
        <details style={{ marginTop: 16, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
          <summary style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, cursor: "pointer" }}>
            ⚠ Eigentum komplett abgeben (Com wird besitzerlos)
          </summary>
          <div style={{ fontSize: 12, color: "#475569", margin: "8px 0" }}>
            Du verlässt die Com und sie hat keinen Owner mehr. Ein verbliebener Officer kann sie übernehmen.
            Wenn alle weg sind, läuft sie führerlos weiter — Admin kann sie dann zuweisen.
          </div>
          <button disabled={busy} onClick={() => {
            if (confirm("Wirklich Eigentum abgeben und Com verlassen?"))
              api("release-owner", {});
          }} style={{ ...smallBtn("#dc2626"), fontSize: 12 }}>
            ⛔ Eigentum abgeben
          </button>
        </details>
      )}
    </div>
  );
}

const permPill = {
  fontSize: 11, padding: "3px 9px", borderRadius: 999,
  border: "1px solid",
  fontWeight: 700, cursor: "pointer",
  whiteSpace: "nowrap",
};
function smallBtn(color) {
  return {
    background: color, color: "#fff", border: "none",
    padding: "5px 10px", borderRadius: 999,
    fontWeight: 700, fontSize: 11, cursor: "pointer",
  };
}
