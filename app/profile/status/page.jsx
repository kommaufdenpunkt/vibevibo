"use client";

// Status-Seite: vordefinierte Status auswählen (gratis) oder eigenen Status
// per Vibes freikaufen. Erweiterte Kategorien sind in Status-Packs gebündelt,
// die im Shop cascading freigeschaltet werden (movie → party → love → emo → glam).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { STATUS_CATS, STATUS_PACKS, searchStatuses } from "@/lib/status";

export default function StatusPage() {
  const router = useRouter();
  const { me, loading, refresh } = useMe();
  const [pending, setPending] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [useBoost, setUseBoost] = useState(false);

  useEffect(() => {
    if (!loading && !me) router.push("/login");
  }, [loading, me, router]);

  const unlockedPacks = useMemo(() => {
    const badges = me?.premiumBadges || [];
    return STATUS_PACKS.filter((p) => badges.includes(`status_pack_${p.id}`)).map((p) => p.id);
  }, [me?.premiumBadges]);

  const filtered = useMemo(() => searchStatuses(query, unlockedPacks), [query, unlockedPacks]);

  if (!me) return null;

  async function applyStatus(text, isPublic) {
    setBusy(true);
    try {
      const willBoost = isPublic && useBoost && (me?.buschfunkBoosts || 0) > 0 && text;
      const res = await api.setStatus(text, isPublic, undefined, willBoost);
      await refresh();
      setPending(null);
      setUseBoost(false);
      if (res?.boosted) {
        setFlash("📣 Boost angewendet — dein Post bleibt 24h ganz oben!");
      } else {
        setFlash(text ? `✅ Status gesetzt: ${text}` : "✅ Status entfernt");
      }
      setTimeout(() => setFlash(""), 3500);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 4000);
    } finally { setBusy(false); }
  }

  async function buyPack(packId) {
    setBusy(true);
    try {
      await api.premiumBuy(`status_pack_${packId}`);
      await refresh();
      setFlash(`✅ Status-Pack „${packId}" freigeschaltet!`);
      setTimeout(() => setFlash(""), 4000);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 5000);
    } finally { setBusy(false); }
  }

  const chip = (active) => ({
    fontSize: 14, padding: "10px 14px", borderRadius: 18, cursor: "pointer",
    border: active ? "2px solid #ec4899" : "1px solid var(--vv-border,#ddd)",
    background: active ? "#ffe6f2" : "var(--vv-surface,#f6f6f6)",
    color: "var(--vv-text,#1c1c1e)",
    whiteSpace: "nowrap", fontFamily: "inherit", lineHeight: 1.2,
  });

  return (
    <div>
      {/* Kopf */}
      <div className="vv-card">
        <div className="vv-row" style={{ alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28 }}>💬</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0 }}>Status setzen</h2>
            <div className="vv-muted" style={{ fontSize: 13 }}>
              {me.mood ? <>Aktuell: <b>{me.mood}</b></> : "Du hast aktuell keinen Status gesetzt."}
            </div>
          </div>
          <Link href="/profile/edit" className="vv-btn">↩ Zurück</Link>
        </div>
      </div>

      {flash && (
        <div className="vv-card" style={{
          background: flash.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#92400e" : "#166534",
          fontWeight: 700, fontSize: 13, textAlign: "center",
        }}>{flash}</div>
      )}

      {/* Wenn ein Status angeklickt wurde: Posten / nur setzen / Abbruch */}
      {pending && (
        <div className="vv-card">
          <div className="vv-muted" style={{ fontSize: 13 }}>Vorschau deines neuen Status:</div>
          <div style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 14px" }}>{pending}</div>

          {(me?.buschfunkBoosts || 0) > 0 && (
            <label style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: useBoost ? "linear-gradient(135deg, #fff7ed, #fef3c7)" : "var(--vv-surface,#f5f5f7)",
              border: `2px solid ${useBoost ? "#f59e0b" : "var(--vv-border,#ddd)"}`,
              borderRadius: 10, marginBottom: 10, cursor: "pointer",
            }}>
              <input type="checkbox" checked={useBoost} onChange={(e) => setUseBoost(e.target.checked)}
                style={{ width: 18, height: 18 }} />
              <span style={{ flex: 1, fontSize: 13 }}>
                <strong>📣 Buschfunk-Boost benutzen</strong>
                <div className="vv-muted" style={{ fontSize: 11 }}>
                  Post bleibt 24h ganz oben + Glow-Rahmen. Du hast noch <b>{me.buschfunkBoosts}</b> Boost(s).
                </div>
              </span>
            </label>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" disabled={busy} onClick={() => applyStatus(pending, true)}
              className="vv-btn-big vv-btn-big-pink"
              style={{ padding: "12px", fontSize: 14 }}>
              📢 Öffentlich posten{useBoost ? " 📣" : ""}
            </button>
            <button type="button" disabled={busy} onClick={() => applyStatus(pending, false)}
              className="vv-btn-big vv-btn-big-ghost"
              style={{ padding: "12px", fontSize: 14 }}>
              🔒 Nur für mich
            </button>
          </div>
          <button type="button" disabled={busy} onClick={() => setPending(null)}
            style={{ marginTop: 8, width: "100%", padding: 8, borderRadius: 10,
              border: "none", background: "transparent", color: "var(--vv-muted,#888)", cursor: "pointer" }}>
            ← Andere Auswahl
          </button>
        </div>
      )}

      {/* Suche + Chips */}
      {!pending && (
        <div className="vv-card">
          <input
            className="vv-input"
            placeholder="🔍 Status suchen… (z.B. zocken)"
            value={query} onChange={(e) => setQuery(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          {filtered ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {filtered.length === 0 && <div className="vv-muted">Nichts gefunden.</div>}
              {filtered.map(([em, lbl]) => {
                const val = `${em} ${lbl}`;
                return (
                  <button key={lbl} type="button" onClick={() => setPending(val)} style={chip(me.mood === val)}>
                    {em} {lbl}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              {/* Freigeschaltete Kategorien */}
              {STATUS_CATS.filter((c) => c.packId === null || unlockedPacks.includes(c.packId)).map((cat) => (
                <div key={cat.title} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#ec4899", margin: "4px 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
                    {cat.title}
                    {cat.packId && (
                      <span style={{
                        background: "linear-gradient(135deg,#fef3c7,#fde68a)",
                        color: "#92400e", padding: "2px 8px", borderRadius: 999,
                        fontSize: 10, border: "1px solid #f59e0b",
                      }}>✓ Pack freigeschaltet</span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {cat.items.map(([em, lbl]) => {
                      const val = `${em} ${lbl}`;
                      return (
                        <button key={lbl} type="button" onClick={() => setPending(val)} style={chip(me.mood === val)}>
                          {em} {lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Locked Packs — als Kauf-Karten */}
              {STATUS_PACKS.filter((p) => !unlockedPacks.includes(p.id)).map((pack) => {
                const requiresOk = !pack.requires || unlockedPacks.includes(pack.requires);
                const lockedByPrev = !requiresOk;
                const prevName = pack.requires ? STATUS_PACKS.find((x) => x.id === pack.requires)?.name : null;

                return (
                  <div key={pack.id} style={{
                    marginTop: 14, padding: 12, borderRadius: 12,
                    background: lockedByPrev
                      ? "repeating-linear-gradient(45deg, #f3f4f6 0 10px, #e5e7eb 10px 20px)"
                      : "linear-gradient(135deg, #fce7f3, #f5d0fe)",
                    border: `2px dashed ${lockedByPrev ? "#9ca3af" : "#ec4899"}`,
                    opacity: lockedByPrev ? 0.7 : 1,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 28, filter: lockedByPrev ? "grayscale(1)" : "none" }}>
                        {lockedByPrev ? "🔒" : "🛍"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#831843" }}>
                          {pack.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#831843", opacity: 0.8 }}>
                          {pack.description}
                        </div>
                      </div>
                      <div style={{
                        background: "#fff", color: "#831843",
                        padding: "5px 10px", borderRadius: 999,
                        fontWeight: 800, fontSize: 13, border: "1px solid #ec4899",
                      }}>
                        ✨ {pack.price}
                      </div>
                    </div>
                    {lockedByPrev ? (
                      <div style={{ fontSize: 11, color: "#374151", marginTop: 6 }}>
                        🔐 Erst „{prevName}" freischalten, dann ist das hier kaufbar.
                      </div>
                    ) : (
                      <button type="button" disabled={busy} onClick={() => buyPack(pack.id)}
                        className="vv-btn-big vv-btn-big-pink"
                        style={{ marginTop: 8, width: "100%", padding: "10px 12px", fontSize: 13 }}>
                        🔓 Für {pack.price} ✨ freischalten
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {me.mood && (
            <button type="button" disabled={busy} onClick={() => applyStatus("", false)}
              style={{
                marginTop: 6, width: "100%", padding: 10, borderRadius: 10,
                border: "1px solid #fda4af", background: "var(--vv-card,#fff)",
                color: "#9f1239", cursor: "pointer", fontWeight: 700, fontSize: 13,
              }}>
              ✖ Status entfernen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
