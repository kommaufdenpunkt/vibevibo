"use client";

// 🩷 Admirers — Männer die regelmäßig auf meine Posts reagieren.
// Nur für Frauen sichtbar (Frauen-Initiative-System).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useMe } from "@/lib/useMe";

export default function AdmirersPage() {
  const { me } = useMe();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/me/admirers")
      .then(async (r) => {
        if (r.ok) return r.json();
        const d = await r.json().catch(() => ({}));
        return { error: d.error || "Fehler", admirers: [] };
      })
      .then(setData)
      .catch(() => setData({ error: "Netzwerk-Fehler", admirers: [] }));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function toggleInitiative() {
    setBusy(true);
    try {
      await fetch("/api/me/privacy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ womenInitiative: !data.womenInitiative }),
      });
      refresh();
    } finally { setBusy(false); }
  }

  if (!me) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: "40px auto 0", textAlign: "center" }}>
        <div style={{ fontSize: 50 }}>🩷</div>
        <h1>Admirers</h1>
        <p>Bitte einloggen.</p>
        <Link href="/login?next=/admirers" className="vv-btn">🔑 Einloggen</Link>
      </div>
    );
  }

  if (!data) return <div className="vv-card" style={{ maxWidth: 720, margin: "20px auto" }}>Lädt...</div>;

  if (data.error) {
    return (
      <div style={{ maxWidth: 540, margin: "40px auto", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 50 }}>🩷</div>
        <h1>Admirers</h1>
        <div style={{
          background: "rgba(239,68,68,0.1)", color: "#991b1b",
          padding: 14, borderRadius: 10, marginTop: 12,
          fontSize: 14, fontWeight: 700,
        }}>⚠ {data.error}</div>
        <p style={{ marginTop: 14, fontSize: 13, color: "#64748b" }}>
          Diese Seite ist Teil des Frauen-Initiative-Systems.
        </p>
      </div>
    );
  }

  const admirers = data.admirers || [];

  return (
    <div style={{ maxWidth: 720, margin: "20px auto", padding: 12 }}>
      <div style={{
        background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
        border: "1px solid #ec4899",
        borderRadius: 16, padding: 18, marginBottom: 18,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 36 }}>🩷</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#831843" }}>
              Hat dich öfter gesehen
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#831843", lineHeight: 1.5 }}>
              Männer, die mindestens {data.minInteractions}× auf deine Posts reagiert haben.
              Du entscheidest, ob du jemandem schreibst.
            </p>
          </div>
        </div>
      </div>

      {/* Frauen-Initiative Toggle */}
      <div style={{
        background: data.womenInitiative
          ? "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.1))"
          : "rgba(255,255,255,0.85)",
        border: data.womenInitiative ? "2px solid #ec4899" : "1.5px solid rgba(0,0,0,0.08)",
        borderRadius: 12, padding: 14, marginBottom: 16,
      }}>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!data.womenInitiative}
            onChange={toggleInitiative}
            disabled={busy}
            style={{ marginTop: 3, width: 18, height: 18, accentColor: "#ec4899" }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#831843", marginBottom: 4 }}>
              🩷 Nur ich starte Gespräche mit Männern
            </div>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
              Wenn aktiv: Männer können dir <b>keine direkte Nachricht</b> schicken.
              Sie können nur auf deinen Posts kommentieren/reagieren. Wenn dich jemand
              interessiert — du findest ihn hier in der Liste und schreibst zuerst.
              Sobald ihr Kontakt habt, kann er dir antworten.
            </div>
          </div>
        </label>
      </div>

      {/* Admirers-Liste */}
      {admirers.length === 0 ? (
        <div style={{
          background: "rgba(255,255,255,0.85)", padding: 30, borderRadius: 16,
          textAlign: "center", color: "#64748b",
        }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>💭</div>
          <h3 style={{ margin: "0 0 6px" }}>Noch niemand in deiner Liste.</h3>
          <p style={{ fontSize: 13 }}>
            Sobald Männer regelmäßig auf deine Posts reagieren, erscheinen sie hier.
            Brauchst {data.minInteractions}+ Interaktionen pro Person.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {admirers.map((a) => (
            <AdmirerCard key={a.id} admirer={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdmirerCard({ admirer }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.92)",
      borderRadius: 12, padding: 14,
      border: "1px solid rgba(236,72,153,0.2)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <Avatar
        url={admirer.avatarStatus === "approved" ? admirer.avatarUrl : ""}
        name={admirer.displayName}
        className="vv-avatar vv-avatar-md"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/u/${admirer.username}`} style={{
          fontSize: 15, fontWeight: 800, color: "#831843", textDecoration: "none",
        }}>{admirer.displayName}</Link>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          @{admirer.username} · <b style={{ color: "#ec4899" }}>{admirer.interactions}× interagiert</b>
        </div>
      </div>
      <Link href={`/messenger/${admirer.username}`} style={{
        padding: "8px 14px", borderRadius: 999,
        background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
        textDecoration: "none", fontWeight: 800, fontSize: 12, whiteSpace: "nowrap",
        fontFamily: "inherit",
      }}>💬 Anschreiben</Link>
    </div>
  );
}
