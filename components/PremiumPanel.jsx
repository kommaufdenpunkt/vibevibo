"use client";

// Shop: Account-Freischaltungen mit Vibes ✨. Eigenes Status-Setzen,
// Anzeigename ändern, mehr Profilbild-Slots, Badges etc.

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import HelpCard from "./HelpCard";
import { PREMIUM_GROUPS } from "@/lib/premium";

// Items die einen Text-Input brauchen (vor dem Kauf)
const NEEDS_INPUT = {
  custom_status:        { label: "Dein Status-Text", placeholder: "z.B. 🚀 voll im Flow", field: "text" },
  displayname_change:   { label: "Neuer Anzeigename", placeholder: "z.B. Marcel K.", field: "newDisplayName" },
  displayname_3pack:    null, // kein direkter Input — gibt Credits
  username_change:      { label: "Neuer @username (3-20 Zeichen, a-z 0-9 _)", placeholder: "z.B. marcel_2026", field: "newUsername" },
  username_change_fast: { label: "Neuer @username (3-20 Zeichen, a-z 0-9 _)", placeholder: "z.B. marcel_2026", field: "newUsername" },
};

// Permanent-Owned Flags die im Backend gespeichert sind
const FLAGS = {
  badge_gold: "gold", badge_diamond: "diamond",
  frame_rainbow: "rainbow", frame_neon: "frame_neon", frame_gold: "frame_gold",
  vanity_url: "vanity", bio_xl: "bio_xl", presence_invisible: "invisible",
  status_slot: "status_slot",
};

export default function PremiumPanel() {
  const [data, setData] = useState(null);
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState("");
  const [input, setInput] = useState({});           // {kind: "value"}
  const [confirming, setConfirming] = useState(""); // welches Item wartet auf Bestätigung

  const load = useCallback(async () => {
    try { setData(await api.premium()); } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function buy(kind) {
    setBusy(kind);
    try {
      const needsIn = NEEDS_INPUT[kind];
      const payload = {};
      if (needsIn) {
        const val = String(input[kind] || "").trim();
        if (!val) {
          setFlash(`⚠ Bitte ${needsIn.label} eingeben.`);
          setTimeout(() => setFlash(""), 2500);
          setBusy("");
          return;
        }
        payload[needsIn.field] = val;
      }
      const r = await api.premiumBuy(kind, payload);
      setFlash(`✅ ${r.note} · Saldo: ${r.balance} ✨`);
      setTimeout(() => setFlash(""), 4000);
      setInput((p) => ({ ...p, [kind]: "" }));
      setConfirming("");
      await load();
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 4000);
    } finally { setBusy(""); }
  }

  // Items nach group bündeln (vor early-return wegen useMemo-Regel)
  const itemsByGroup = useMemo(() => {
    const map = new Map(PREMIUM_GROUPS.map((g) => [g.id, []]));
    for (const it of data?.items || []) {
      const g = it.group || "andere";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(it);
    }
    return map;
  }, [data]);

  if (!data) return null;

  function badgeOwned(itemKind) {
    const flag = FLAGS[itemKind];
    return flag ? data.owned.badges.includes(flag) : false;
  }

  return (
    <div style={{ padding: 14 }}>
      <HelpCard id="shop-account-intro" title="Was ist der Shop?" emoji="🛍️" color="#8b5cf6">
        Hier kaufst du <b>Account-Funktionen</b> mit Vibes ✨ frei.
        Anders als der VIBO-Shop (Futter, Möbel, Karten) geht's hier um
        dich selbst und dein Profil:
        <br/><br/>
        • <b>Eigenen Status-Text</b> schreiben (statt vorgegebene)<br/>
        • <b>Anzeigenamen ändern</b> (muss einzigartig sein)<br/>
        • <b>@username ändern</b> (max 1× pro Jahr, alte Links zeigen ins Leere)<br/>
        • <b>Mehr Profilbild-Slots</b> (von 9 auf 14)<br/>
        • <b>Badges + Rahmen</b> für dein Profil (permanent)
        <br/><br/>
        Alle Käufe werden im <b>Vibes-Verlauf</b> dokumentiert.
        Username-Änderung loggt dich aus — danach neu mit neuem Namen einloggen!
      </HelpCard>

      {/* Header mit Saldo */}
      <div style={{
        background: "linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)",
        color: "#fff", padding: 14, borderRadius: 14, marginBottom: 14,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h3 style={{ margin: 0 }}>🛍️ Shop</h3>
          <div style={{ fontSize: 12, opacity: 0.95 }}>Account-Features mit Vibes freischalten</div>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.2)", padding: "8px 14px", borderRadius: 999,
          fontWeight: 800, fontSize: 16,
        }}>✨ {data.balance}</div>
      </div>

      {/* Aktueller Bestand */}
      <div style={{
        background: "var(--vv-card,#fff)",
        border: "1px solid var(--vv-border,#eee)",
        borderRadius: 10, padding: 10, marginBottom: 14, fontSize: 12,
      }}>
        <b>Dein Bestand:</b> {data.owned.picSlots} Profilbild-Slots
        {data.owned.badges.length > 0 && (
          <> · Badges: {data.owned.badges.map((b) => b === "gold" ? "🥇" : b === "diamond" ? "💎" : "🌈").join(" ")}</>
        )}
      </div>

      {flash && (
        <div style={{
          background: flash.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#92400e" : "#166534",
          padding: 10, borderRadius: 10, marginBottom: 10, fontSize: 13, fontWeight: 600, textAlign: "center",
        }}>{flash}</div>
      )}

      {/* Items nach Gruppen */}
      {PREMIUM_GROUPS.map((group) => {
        const items = itemsByGroup.get(group.id) || [];
        if (!items.length) return null;
        return (
          <div key={group.id} style={{ marginTop: 18 }}>
            <h3 style={{
              margin: "0 0 8px", fontSize: 14, fontWeight: 800,
              color: "var(--vv-text,#1c1c1e)", letterSpacing: 0.2,
              padding: "6px 10px", borderRadius: 8,
              background: "linear-gradient(90deg, rgba(139,92,246,0.18), transparent)",
              borderLeft: "4px solid #8b5cf6",
            }}>{group.label}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((it) => renderItem(it))}
            </div>
          </div>
        );
      })}
    </div>
  );

  function renderItem(it) {
    const owned = badgeOwned(it.kind);
    const canAfford = data.balance >= it.price;
    const needsIn = NEEDS_INPUT[it.kind];
    const isConfirming = confirming === it.kind;
    return (
      <div key={it.kind} style={{
        background: "var(--vv-card,#fff)",
        border: `2px solid ${owned ? "#10b981" : "var(--vv-border,#eee)"}`,
        borderRadius: 12, padding: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 32, lineHeight: 1 }}>{it.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {it.name}
              {owned && <span style={{ marginLeft: 6, color: "#10b981", fontSize: 11 }}>✓ besitzt du</span>}
            </div>
            <div style={{ fontSize: 11, color: "var(--vv-muted,#666)" }}>{it.description}</div>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            color: "#1c1c1e", padding: "5px 10px", borderRadius: 999,
            fontWeight: 800, fontSize: 13, flexShrink: 0,
          }}>✨ {it.price}</div>
        </div>

        {/* Text-Eingabe wenn nötig */}
        {needsIn && !owned && (
          <input
            type="text"
            value={input[it.kind] || ""}
            onChange={(e) => setInput((p) => ({ ...p, [it.kind]: e.target.value }))}
            placeholder={needsIn.placeholder}
            className="vv-input"
            style={{ width: "100%", marginTop: 8, fontSize: 13 }}
            maxLength={it.kind === "custom_status" ? 80 : 40}
          />
        )}

        {!owned && (
          <div style={{ marginTop: 8 }}>
            {!isConfirming ? (
              <button type="button" disabled={!canAfford || busy === it.kind}
                onClick={() => setConfirming(it.kind)}
                className={canAfford ? "vv-btn-big vv-btn-big-violet" : "vv-btn-big vv-btn-big-ghost"}
                style={{ width: "100%", padding: "10px 12px", fontSize: 13 }}>
                {canAfford ? `Freikaufen für ${it.price} ✨` : `Du brauchst noch ${it.price - data.balance} ✨ mehr`}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" disabled={busy === it.kind}
                  onClick={() => buy(it.kind)}
                  className="vv-btn-big vv-btn-big-pink"
                  style={{ flex: 1, padding: "10px 12px", fontSize: 13 }}>
                  {busy === it.kind ? "…" : "✓ Wirklich kaufen"}
                </button>
                <button type="button"
                  onClick={() => setConfirming("")}
                  className="vv-btn-big vv-btn-big-ghost"
                  style={{ padding: "10px 16px", fontSize: 13 }}>Abbruch</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
