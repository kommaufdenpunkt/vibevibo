"use client";

// 💑 Familienstand + Partnerschafts-Anfrage-Workflow.
// Reihenfolge: 1) Profilbild + Anzeigename oben 2) Status wählen
// 3) Partner suchen + Anfrage senden 4) Beim anderen: Einverstanden/Nicht-Einverstanden
// Konsens-Logik: Anfragen sind nur erlaubt wenn BEIDE Seiten vergeben/verlobt/verheiratet haben.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { ColoredName } from "@/components/GenderAge";

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

const REL_LABELS = {
  taken:   "💕 vergeben",
  engaged: "💍 verlobt",
  married: "💒 verheiratet",
};

export default function RelationshipSettings() {
  const { me, refresh } = useMe();
  const [status, setStatus] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [announce, setAnnounce] = useState(false);
  const [flirtEnabled, setFlirtEnabled] = useState(true);
  const [partner, setPartner] = useState(null);
  const [mutual, setMutual] = useState(false);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api.getRelationship();
      setPartner(r.partner || null);
      setMutual(!!r.mutual);
    } catch {}
    try {
      const r = await api.listPartnershipRequests();
      setIncoming(r.incoming || []);
      setOutgoing(r.outgoing || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!me) return;
    setStatus(me.relationshipStatus || "");
    setFlirtEnabled(me.flirtEnabled !== false);
    load();
  }, [me, load]);

  if (!me) return null;

  const meHasPartnerStatus = PARTNER_STATUSES.has(status);
  const meIsLinked = !!partner && mutual;
  const canRequest = meHasPartnerStatus && !meIsLinked;
  function showFlash(msg, ms = 3500) {
    setFlash(msg);
    setTimeout(() => setFlash(""), ms);
  }

  async function saveStatus() {
    setBusy(true);
    try {
      await api.setRelationship({ status, announceBuschfunk: announce });
      await refresh();
      await load();
      showFlash("✅ Familienstand gespeichert");
    } catch (e) {
      showFlash(`⚠ ${e.message}`, 5000);
    } finally { setBusy(false); }
  }

  async function sendRequest() {
    const name = partnerSearch.trim();
    if (!name) { showFlash("⚠ Bitte den Anzeigenamen oder @username eingeben"); return; }
    setBusy(true);
    try {
      const r = await api.sendPartnershipRequest(name);
      showFlash(`💌 Partnerschaftsanfrage an ${r.targetDisplayName} verschickt!`);
      setPartnerSearch("");
      await load();
    } catch (e) {
      showFlash(`⚠ ${e.message}`, 6000);
    } finally { setBusy(false); }
  }

  async function respond(reqId, accept) {
    setBusy(true);
    try {
      await api.respondPartnershipRequest(reqId, accept);
      await refresh();
      await load();
      showFlash(accept ? "💞 Partnerschaft bestätigt!" : "💔 Anfrage abgelehnt.");
    } catch (e) {
      showFlash(`⚠ ${e.message}`, 5000);
    } finally { setBusy(false); }
  }

  async function cancel(reqId) {
    setBusy(true);
    try {
      await api.cancelPartnershipRequest(reqId);
      await load();
      showFlash("↩ Anfrage zurückgezogen.");
    } catch (e) {
      showFlash(`⚠ ${e.message}`, 5000);
    } finally { setBusy(false); }
  }

  async function unlink() {
    if (!confirm("Partnerschaft wirklich auflösen?")) return;
    setBusy(true);
    try {
      await api.unlinkPartnership();
      await refresh();
      await load();
      showFlash("💔 Partnerschaft aufgelöst.");
    } catch (e) {
      showFlash(`⚠ ${e.message}`, 5000);
    } finally { setBusy(false); }
  }

  async function toggleFlirt(next) {
    setFlirtEnabled(next);
    try {
      await api.setFlirtEnabled(next);
      await refresh();
      showFlash(next ? "💕 Flirt-Modus an" : "🔒 Flirt-Modus aus");
    } catch (e) {
      showFlash(`⚠ ${e.message}`, 4000);
    }
  }

  return (
    <>
      {/* 💑 KOPF: Profilbild + Anzeigename */}
      <div className="vv-edit-card" data-tone="pink">
        <div className="vv-edit-card-title">💑 BEZIEHUNG & FAMILIENSTAND</div>
        <div className="vv-edit-card-body">
          {/* Profilbild oben, Name darunter */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <div style={{
              width: 84, height: 84, padding: 4, borderRadius: "50%",
              background: "conic-gradient(from 0deg, #ec4899, #f472b6, #a855f7, #06b6d4, #fbbf24, #ec4899)",
              boxShadow: "0 6px 14px rgba(236,72,153,0.4)",
            }}>
              <Avatar url={me.avatarUrl} name={me.displayName}
                style={{ width: "100%", height: "100%", borderRadius: "50%", border: "3px solid #fff", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }} />
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#831843", textAlign: "center" }}>
              <ColoredName gender={me.gender} age={me.age} name={me.displayName} size="18px" />
            </div>
          </div>

          {flash && (
            <div className="vv-edit-flash" data-tone={flash.startsWith("⚠") ? "warn" : "ok"} style={{ marginBottom: 10 }}>
              {flash}
            </div>
          )}

          {/* Step 1: Status wählen */}
          <label>① 💞 Familienstand wählen</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 5 }}>
            {STATUS_OPTIONS.map((s) => (
              <button key={s.id} type="button"
                onClick={() => setStatus(s.id)}
                style={{
                  padding: "9px 10px",
                  borderRadius: 10,
                  background: status === s.id ? "linear-gradient(135deg, #ec4899, #be185d)" : "#fff",
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

          <label style={{
            display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "9px 11px",
            background: announce ? "linear-gradient(135deg, #fce7f3, #fbcfe8)" : "#fff",
            border: `2px solid ${announce ? "#ec4899" : "#f9a8d4"}`,
            borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#831843",
          }}>
            <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)}
              style={{ width: 18, height: 18 }} />
            <span style={{ flex: 1 }}>
              📣 Im Buschfunk teilen
              <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 500, marginTop: 2 }}>
                Postet z.B. „💍 verlobt mit @partner" wenn ihr verlinkt seid.
              </div>
            </span>
          </label>

          <button type="button" onClick={saveStatus} disabled={busy || status === (me.relationshipStatus || "")}
            className="vv-edit-savebar-save"
            style={{ marginTop: 12, width: "100%" }}>
            {busy ? "Speichert…" : "💾 Status speichern"}
          </button>

          {/* Step 2: Partner suchen + Anfrage senden — nur wenn Status passt */}
          {meHasPartnerStatus && !meIsLinked && (
            <>
              <label className="vv-edit-spaced">② 💌 Partnerschaftsanfrage senden</label>
              <div className="vv-edit-hint" style={{ marginBottom: 8 }}>
                Wichtig: Der/die andere muss zuerst auch <b>„vergeben/verlobt/verheiratet"</b> bei sich eingestellt haben. Danach bekommt er/sie deine Anfrage und kann „Einverstanden / Nicht einverstanden" klicken.
              </div>
              <input className="vv-edit-input"
                placeholder="Anzeigename oder @username eingeben"
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value.replace(/^@/, ""))} />
              <button type="button" onClick={sendRequest} disabled={busy || !partnerSearch.trim()}
                style={{
                  marginTop: 10, width: "100%",
                  padding: 12, borderRadius: 12,
                  background: "linear-gradient(135deg, #ec4899, #be185d)",
                  color: "#fff", border: "2px solid #831843",
                  fontWeight: 900, fontSize: 14,
                  cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
                  boxShadow: "0 4px 0 #831843",
                  opacity: (busy || !partnerSearch.trim()) ? 0.6 : 1,
                }}>
                💌 Partnerschaftsanfrage senden
              </button>
            </>
          )}

          {!meHasPartnerStatus && (incoming.length > 0 || outgoing.length > 0) && (
            <div style={{
              marginTop: 14, padding: "10px 12px", borderRadius: 10,
              background: "linear-gradient(135deg, #fef3c7, #fde68a)",
              border: "2px solid #f59e0b", fontSize: 12, color: "#92400e", fontWeight: 700,
            }}>
              ⚠ Du hast aktuell keinen passenden Status (vergeben/verlobt/verheiratet) gesetzt. Setz den zuerst, dann kannst du auf Anfragen reagieren.
            </div>
          )}

          {/* Step 3: Eingehende Anfragen — Einverstanden / Nicht einverstanden */}
          {incoming.length > 0 && (
            <>
              <label className="vv-edit-spaced">③ 📨 Eingehende Partnerschaftsanfragen</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {incoming.map((r) => (
                  <div key={r.id} style={{
                    padding: 11, borderRadius: 12,
                    background: "linear-gradient(135deg, #fff, #fdf2f8)",
                    border: "2px dashed #ec4899", boxShadow: "0 3px 10px rgba(236,72,153,0.2)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <Avatar url={r.from.avatarUrl} name={r.from.displayName}
                        className="vv-avatar" style={{ width: 50, height: 50, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/u/${r.from.username}`} style={{ textDecoration: "none" }}>
                          <ColoredName gender={r.from.gender} age={r.from.age} name={r.from.displayName} size="16px" />
                        </Link>
                        <div style={{ fontSize: 11.5, opacity: 0.8, color: "#831843", marginTop: 2 }}>
                          möchte mit dir „{REL_LABELS[r.kind] || r.kind}" sein
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <button type="button" onClick={() => respond(r.id, true)} disabled={busy || !meHasPartnerStatus}
                        style={{
                          padding: "10px 12px", borderRadius: 10,
                          background: "linear-gradient(135deg, #22c55e, #15803d)",
                          color: "#fff", border: "2px solid #14532d",
                          fontWeight: 900, fontSize: 13,
                          cursor: (busy || !meHasPartnerStatus) ? "not-allowed" : "pointer",
                          fontFamily: "inherit", boxShadow: "0 3px 0 #14532d",
                          opacity: (busy || !meHasPartnerStatus) ? 0.6 : 1,
                        }}>
                        ✅ Einverstanden
                      </button>
                      <button type="button" onClick={() => respond(r.id, false)} disabled={busy}
                        style={{
                          padding: "10px 12px", borderRadius: 10,
                          background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                          color: "#fff", border: "2px solid #7f1d1d",
                          fontWeight: 900, fontSize: 13,
                          cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
                          boxShadow: "0 3px 0 #7f1d1d",
                          opacity: busy ? 0.6 : 1,
                        }}>
                        ❌ Nicht einverstanden
                      </button>
                    </div>
                    {!meHasPartnerStatus && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#92400e", textAlign: "center", fontStyle: "italic" }}>
                        ⓘ Setz zuerst deinen Status auf vergeben/verlobt/verheiratet, dann kannst du annehmen.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Ausgehende offene Anfragen */}
          {outgoing.length > 0 && (
            <>
              <label className="vv-edit-spaced">📤 Meine gesendeten offenen Anfragen</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {outgoing.map((r) => (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 11px", borderRadius: 10,
                    background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                    border: "2px solid #f59e0b",
                    fontSize: 12.5, color: "#92400e", fontWeight: 700,
                  }}>
                    <span style={{ fontSize: 22 }}>⏳</span>
                    <span style={{ flex: 1 }}>
                      Anfrage an <b>{r.display_name}</b> · wartet auf Antwort
                    </span>
                    <button type="button" onClick={() => cancel(r.id)} disabled={busy}
                      style={{
                        background: "#fff", color: "#92400e",
                        border: "2px solid #f59e0b", borderRadius: 8,
                        padding: "5px 10px", fontSize: 11, fontWeight: 800,
                        cursor: "pointer", fontFamily: "inherit",
                      }}>
                      ↩ Zurückziehen
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Aktuelle Partnerschaft (mutual) */}
          {meIsLinked && partner && (
            <div style={{
              marginTop: 14, padding: 12, borderRadius: 12,
              background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
              border: "2px solid #22c55e",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 32 }}>💞</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", letterSpacing: 1 }}>
                    BEIDSEITIG VERLINKT
                  </div>
                  <Link href={`/u/${partner.username}`} style={{ textDecoration: "none" }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "#166534" }}>
                      {REL_LABELS[me.relationshipStatus] || me.relationshipStatus} mit @{partner.username}
                    </span>
                  </Link>
                </div>
                <button type="button" onClick={unlink} disabled={busy}
                  style={{
                    background: "#fff", color: "#991b1b",
                    border: "2px solid #ef4444", borderRadius: 8,
                    padding: "6px 12px", fontSize: 11, fontWeight: 800,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                  💔 Trennen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flirt-Toggle */}
      <div className="vv-edit-card" data-tone="violet">
        <div className="vv-edit-card-title">💕 FLIRT-MODUS</div>
        <div className="vv-edit-card-body">
          <div className="vv-edit-hint">
            Im Flirt-Modus tauchst du in Vorschlägen für Swipe & Match auf. Wer ihn ausschaltet, ist nicht in Flirt-Vorschlägen sichtbar — und kann selbst auch nicht swipen.
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
