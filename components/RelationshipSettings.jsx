"use client";

// 💑 Familienstand + Partner-Verlinkung + Flirt-Modus.
// Konsens-Logik im Backend:
//   - Partner kann nur verlinkt werden, wenn ER/SIE schon vergeben/verlobt/verheiratet ist.
//   - Verhindert das „Outen" von Leuten ohne deren Zustimmung.
//   - Erst wenn BEIDE sich gegenseitig verlinken, gilt es als „mutual".

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";

const STATUS_OPTIONS = [
  { id: "",            label: "— keine Angabe —", emoji: "" },
  { id: "single",      label: "Single",            emoji: "💚" },
  { id: "taken",       label: "vergeben",          emoji: "💕" },
  { id: "engaged",     label: "verlobt",           emoji: "💍" },
  { id: "married",     label: "verheiratet",       emoji: "💒" },
  { id: "complicated", label: "es ist kompliziert", emoji: "🤯" },
  { id: "open",        label: "offene Beziehung",  emoji: "🌈" },
];

const PARTNER_STATUSES = new Set(["taken", "engaged", "married"]);

export default function RelationshipSettings() {
  const { me, refresh } = useMe();
  const [status, setStatus] = useState("");
  const [partnerUsername, setPartnerUsername] = useState("");
  const [announce, setAnnounce] = useState(false);
  const [flirtEnabled, setFlirtEnabled] = useState(true);
  const [partner, setPartner] = useState(null);
  const [mutual, setMutual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (!me) return;
    setStatus(me.relationshipStatus || "");
    setFlirtEnabled(me.flirtEnabled !== false);
    api.getRelationship().then((r) => {
      setPartner(r.partner || null);
      setMutual(!!r.mutual);
      if (r.partner) setPartnerUsername(r.partner.username || "");
    }).catch(() => {});
  }, [me]);

  if (!me) return null;

  const needsPartner = PARTNER_STATUSES.has(status);

  async function save() {
    setBusy(true);
    try {
      const r = await api.setRelationship({
        status,
        partnerUsername: needsPartner ? partnerUsername.trim() : "",
        announceBuschfunk: announce,
      });
      setPartner(r.partner || null);
      setMutual(!!r.mutual);
      await refresh();
      setFlash(r.partner
        ? (r.mutual ? "✅ Gespeichert + mit Partner gegenseitig verlinkt!" : "✅ Gespeichert — Partner noch nicht gegenseitig verlinkt")
        : "✅ Gespeichert"
      );
      setTimeout(() => setFlash(""), 3500);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 5500);
    } finally { setBusy(false); }
  }

  async function toggleFlirt(next) {
    setFlirtEnabled(next);
    try {
      await api.setFlirtEnabled(next);
      await refresh();
      setFlash(next ? "💕 Flirt-Modus an — du bist für Matches sichtbar" : "🔒 Flirt-Modus aus — du flirtest nicht mit");
      setTimeout(() => setFlash(""), 3500);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 4000);
    }
  }

  return (
    <>
      <div className="vv-edit-card" data-tone="pink">
        <div className="vv-edit-card-title">💑 BEZIEHUNG & FAMILIENSTAND</div>
        <div className="vv-edit-card-body">
          <div className="vv-edit-hint">
            💡 Du entscheidest, wer was sieht. Partner kann nur verlinkt werden,
            wenn der/die andere schon „vergeben/verlobt/verheiratet" gesetzt hat —
            keiner wird gegen seinen Willen geoutet.
          </div>

          {flash && (
            <div className="vv-edit-flash" data-tone={flash.startsWith("⚠") ? "warn" : "ok"} style={{ marginBottom: 10 }}>
              {flash}
            </div>
          )}

          <label>💞 Familienstand</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 5 }}>
            {STATUS_OPTIONS.map((s) => (
              <button key={s.id} type="button"
                onClick={() => setStatus(s.id)}
                style={{
                  padding: "9px 10px",
                  borderRadius: 10,
                  background: status === s.id
                    ? "linear-gradient(135deg, #ec4899, #be185d)"
                    : "#fff",
                  color: status === s.id ? "#fff" : "#831843",
                  border: "2px solid #ec4899",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 12.5,
                  textAlign: "left",
                  boxShadow: status === s.id ? "0 3px 0 #831843" : "none",
                }}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>

          {needsPartner && (
            <>
              <label className="vv-edit-spaced">💕 Partner (Anzeigename oder @username)</label>
              <input className="vv-edit-input"
                placeholder="z.B. lisa_2003"
                value={partnerUsername}
                onChange={(e) => setPartnerUsername(e.target.value.replace(/^@/, ""))} />
              <div className="vv-edit-hint" style={{ marginTop: 8 }}>
                ⚠ Wichtig: Dein Partner muss <b>ZUERST</b> bei sich „vergeben/verlobt/verheiratet"
                eingetragen haben. Erst dann kannst du hier verlinken.
              </div>

              {partner && (
                <div style={{
                  marginTop: 10, padding: "10px 12px", borderRadius: 10,
                  background: mutual
                    ? "linear-gradient(135deg, #dcfce7, #bbf7d0)"
                    : "linear-gradient(135deg, #fef3c7, #fde68a)",
                  border: `2px solid ${mutual ? "#22c55e" : "#f59e0b"}`,
                  fontSize: 12.5, color: mutual ? "#166534" : "#92400e", fontWeight: 700,
                }}>
                  {mutual ? "💞 Beidseitig verlinkt mit " : "🥺 Einseitig (warte auf Bestätigung) — Partner: "}
                  <Link href={`/u/${partner.username}`} style={{ color: "inherit" }}>
                    {partner.displayName || partner.username}
                  </Link>
                </div>
              )}
            </>
          )}

          <label style={{
            display: "flex", alignItems: "center", gap: 10, marginTop: 14, padding: "9px 11px",
            background: announce ? "linear-gradient(135deg, #fce7f3, #fbcfe8)" : "#fff",
            border: `2px solid ${announce ? "#ec4899" : "#f9a8d4"}`,
            borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#831843",
          }}>
            <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)}
              style={{ width: 18, height: 18 }} />
            <span style={{ flex: 1 }}>
              📣 Im Buschfunk teilen
              <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 500, marginTop: 2 }}>
                Postet automatisch z.B. „💍 verlobt mit @partner" wenn du speicherst.
              </div>
            </span>
          </label>

          <button type="button" onClick={save} disabled={busy}
            className="vv-edit-savebar-save"
            style={{ marginTop: 12, width: "100%" }}>
            {busy ? "Speichert…" : "💾 Familienstand speichern"}
          </button>
        </div>
      </div>

      {/* Flirt-Toggle (separate Card) */}
      <div className="vv-edit-card" data-tone="violet">
        <div className="vv-edit-card-title">💕 FLIRT-MODUS</div>
        <div className="vv-edit-card-body">
          <div className="vv-edit-hint">
            Im Flirt-Modus tauchst du in Vorschlägen für Swipe & Match auf (à la Lovoo/Tinder).
            Wer ihn ausschaltet, ist nicht in Flirt-Vorschlägen sichtbar — und kann selbst auch nicht swipen.
          </div>
          <label style={{
            display: "flex", alignItems: "center", gap: 10, marginTop: 10, padding: "10px 12px",
            background: flirtEnabled ? "linear-gradient(135deg, #fce7f3, #fbcfe8)" : "linear-gradient(135deg, #f3f4f6, #e5e7eb)",
            border: `2px solid ${flirtEnabled ? "#ec4899" : "#9ca3af"}`,
            borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13,
            color: flirtEnabled ? "#831843" : "#374151",
          }}>
            <input type="checkbox" checked={flirtEnabled}
              onChange={(e) => toggleFlirt(e.target.checked)}
              style={{ width: 20, height: 20 }} />
            <span style={{ flex: 1 }}>
              {flirtEnabled ? "💕 Flirt-Modus AN" : "🔒 Flirt-Modus AUS"}
              <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, marginTop: 2 }}>
                {flirtEnabled
                  ? "Du wirst zum Swipen vorgeschlagen und kannst andere swipen."
                  : "Du bist von Flirt-Funktionen komplett ausgenommen."}
              </div>
            </span>
          </label>
        </div>
      </div>
    </>
  );
}
