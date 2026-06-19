// 📋 Userakte — komplette Owner-Sicht eines einzelnen Mitglieds.
//
// Sections:
//   1. Header mit Avatar + Rolle + Status + Schnell-Aktionen
//   2. Anmeldedaten
//   3. Personalien + Geschlecht/Alter
//   4. Anschrift (für Versand-Werbeartikel) — editierbar
//   5. Ausweis-Verifikation
//   6. Sanktionen (Liste + Bann verhängen)
//   7. Mod-Log
//   8. Geräte + IP-Historie
//   9. Reports gegen User
//  10. Admin-Notizen

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { checkAdminPassword, adminEnabled } from "@/lib/admin";
import {
  getUserByUsername, getFullUserAkte, updateUserAdminFields,
  setUserStatus, addSanction, liftSanction, liftAllSanctions,
  setUserRole, logMod, ageFromBirthdate,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const DUR = {
  "10m": 600000, "1h": 3600000, "6h": 21600000, "1d": 86400000,
  "3d": 259200000, "1w": 604800000, "1mo": 2592000000, "perm": null,
};
const DUR_LABEL = {
  "10m": "10 Min", "1h": "1 Stunde", "6h": "6 Stunden", "1d": "1 Tag",
  "3d": "3 Tage", "1w": "1 Woche", "1mo": "1 Monat", "perm": "permanent",
};
const SANCTION_TYPES = [
  { id: "comm",    label: "💬 Stumm geschaltet (kein Schreiben)" },
  { id: "profile", label: "🚷 Profil gesperrt (kein Posten)" },
  { id: "full",    label: "⛔ Voll-Ban (kein Login)" },
];
const ROLES = [
  { id: "user",        label: "👤 Normaler User",  badge: "USER"  },
  { id: "moderator",   label: "⚖️ Moderator",      badge: "MOD"   },
  { id: "teamleitung", label: "🛡 Teamleitung",   badge: "LEAD"  },
  { id: "admin",       label: "👑 Admin",          badge: "ADMIN" },
];

function fmtDateTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function untilLabel(until) {
  if (!until) return "permanent";
  const diff = until - Date.now();
  if (diff <= 0) return "abgelaufen";
  const h = Math.round(diff / 3600000);
  if (h < 48) return `noch ~${h} h`;
  return `noch ~${Math.round(h / 24)} Tage`;
}
function maskIp(ip) {
  if (!ip) return "—";
  if (ip.includes(".")) {
    const p = ip.split(".");
    if (p.length === 4) return `${p[0]}.${p[1]}.${p[2]}.*`;
  }
  return ip;
}

export default async function UserAktePage({ params, searchParams }) {
  const sp = await searchParams;
  const { username: usernameRaw } = await params;
  const username = decodeURIComponent(String(usernameRaw || "")).toLowerCase();
  const pw = typeof sp?.pw === "string" ? sp.pw : "";

  if (!adminEnabled() || !checkAdminPassword(pw)) {
    redirect(`/admin?pw=${encodeURIComponent(pw)}`);
  }

  const target = getUserByUsername(username);
  if (!target) notFound();

  // === GET-Actions ===
  const action = typeof sp?.do === "string" ? sp.do : "";
  const pwQ = `pw=${encodeURIComponent(pw)}`;
  const backUrl = `/admin/mitglieder/${encodeURIComponent(username)}?${pwQ}`;

  if (action) {
    try {
      if (action === "save_address") {
        updateUserAdminFields(target.id, {
          real_name:     String(sp?.real_name     || ""),
          addr_street:   String(sp?.addr_street   || ""),
          addr_zip:      String(sp?.addr_zip      || ""),
          addr_city:     String(sp?.addr_city     || ""),
          addr_country:  String(sp?.addr_country  || "DE"),
        });
        try { logMod({ userId: target.id, kind: "owner.address_updated", by: "owner", note: "" }); } catch {}
        redirect(`${backUrl}&flash=adresse_saved`);
      }
      if (action === "save_notes") {
        updateUserAdminFields(target.id, { admin_notes: String(sp?.notes || "") });
        redirect(`${backUrl}&flash=notes_saved`);
      }
      if (action === "set_id_verified") {
        updateUserAdminFields(target.id, { id_verified: sp?.value === "1" ? 1 : 0 });
        try { logMod({ userId: target.id, kind: sp?.value === "1" ? "owner.id_verified" : "owner.id_unverified", by: "owner", note: "" }); } catch {}
        redirect(`${backUrl}&flash=id_saved`);
      }
      if (action === "set_role") {
        const r = String(sp?.role || "user");
        if (["user","moderator","teamleitung","admin"].includes(r)) {
          setUserRole(target.id, r);
          try { logMod({ userId: target.id, kind: `owner.role.${r}`, by: "owner", note: "" }); } catch {}
        }
        redirect(`${backUrl}&flash=role_saved`);
      }
      if (action === "block") {
        setUserStatus(target.id, "blocked");
        try { logMod({ userId: target.id, kind: "owner.hardban", by: "owner", note: String(sp?.reason || "") }); } catch {}
        redirect(`${backUrl}&flash=blocked`);
      }
      if (action === "unblock") {
        setUserStatus(target.id, "approved");
        try { logMod({ userId: target.id, kind: "owner.unblock", by: "owner", note: "" }); } catch {}
        redirect(`${backUrl}&flash=unblocked`);
      }
      if (action === "approve_waitlist") {
        setUserStatus(target.id, "approved");
        try { logMod({ userId: target.id, kind: "owner.approve_waitlist", by: "owner", note: "" }); } catch {}
        redirect(`${backUrl}&flash=approved`);
      }
      if (action === "sanction") {
        const type = String(sp?.type || "");
        const durKey = String(sp?.dur || "");
        const reason = String(sp?.reason || "");
        if (["comm","profile","full"].includes(type) && (durKey in DUR)) {
          const until = DUR[durKey] === null ? null : Date.now() + DUR[durKey];
          addSanction(target.id, type, until, reason, "owner");
          try { logMod({ userId: target.id, kind: `owner.sanction.${type}.${durKey}`, by: "owner", note: reason }); } catch {}
        }
        redirect(`${backUrl}&flash=sanctioned`);
      }
      if (action === "lift_sanction" && sp?.sanction_id) {
        liftSanction(Number(sp.sanction_id));
        redirect(`${backUrl}&flash=sanction_lifted`);
      }
      if (action === "lift_all") {
        liftAllSanctions(target.id);
        try { logMod({ userId: target.id, kind: "owner.lift_all", by: "owner", note: "" }); } catch {}
        redirect(`${backUrl}&flash=all_lifted`);
      }
    } catch (e) {
      redirect(`${backUrl}&flash=error&error=${encodeURIComponent(e.message || "Fehler")}`);
    }
  }

  // === Daten holen ===
  const akte = getFullUserAkte(target.id);
  if (!akte) notFound();
  const u = akte.user;
  const flash = sp?.flash || "";
  const flashError = sp?.error || "";
  const age = u.birthdate ? ageFromBirthdate(u.birthdate) : null;
  const vipActive = (u.vipUntil || 0) > Date.now();

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px 16px 60px", fontFamily: "system-ui, sans-serif" }}>

      {/* Breadcrumb mit 2 Back-Buttons */}
      <div style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/admin?${pwQ}`} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: 999,
          background: "#1c1c1e", color: "#fff",
          fontSize: 12.5, fontWeight: 700,
          textDecoration: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>
          ← 👑 Cockpit
        </Link>
        <Link href={`/admin/mitglieder?${pwQ}`} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: 999,
          background: "#f5f5f7", color: "#1c1c1e",
          fontSize: 12.5, fontWeight: 700,
          textDecoration: "none",
          border: "1px solid #e5e5e7",
        }}>
          ← 👥 Mitglieder-Liste
        </Link>
      </div>

      {/* Flash */}
      {flash && (
        <div style={{
          marginBottom: 14, padding: "10px 14px", borderRadius: 10,
          background: flash === "error" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
          color: flash === "error" ? "#991b1b" : "#065f46",
          fontWeight: 700, fontSize: 13,
        }}>
          {flash === "error" ? `⚠ ${flashError || "Fehler"}` : `✓ ${flashLabel(flash)}`}
        </div>
      )}

      {/* HERO: Avatar + Rolle */}
      <div style={{
        background: "linear-gradient(135deg, #1c1c1e, #2d2d30)", color: "#fff",
        padding: 24, borderRadius: 20, marginBottom: 18,
        display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: 22, flexShrink: 0,
          background: u.avatarUrl
            ? `url(${u.avatarUrl}) center/cover`
            : "linear-gradient(135deg, #ec4899, #a855f7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 42, color: "#fff",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {!u.avatarUrl && (u.emoji || "👤")}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>
            {u.displayName || u.username}
            {vipActive && <span style={{ marginLeft: 10, fontSize: 14, color: "#fbbf24" }}>👑</span>}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 4 }}>
            @{u.username} · ID #{u.id}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <RoleBadge role={u.role} />
            <StatusBadge status={u.status} />
            {u.idVerified === 1 && (
              <span style={{
                background: "rgba(16,185,129,0.2)", color: "#a7f3d0",
                padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800,
              }}>✓ ID verifiziert</span>
            )}
          </div>
        </div>
      </div>

      {/* Schnell-Aktionen */}
      <Section title="⚡ Schnell-Aktionen">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {u.status === "blocked" ? (
            <ActionLink href={`${backUrl}&do=unblock`} color="#10b981" label="✓ Entsperren" confirm="Wirklich entsperren?" />
          ) : (
            <ActionLink href={`${backUrl}&do=block`} color="#ef4444" label="⛔ Hard-Ban" confirm="Account WIRKLICH sperren?" />
          )}
          {u.status === "pending" && (
            <ActionLink href={`${backUrl}&do=approve_waitlist`} color="#06b6d4" label="✓ Aus Warteliste freigeben" />
          )}
          {akte.sanctions.length > 0 && (
            <ActionLink href={`${backUrl}&do=lift_all`} color="#a855f7" label="🔓 Alle Sanktionen aufheben" />
          )}
        </div>
      </Section>

      {/* Rolle ändern */}
      <Section title="🎭 Rolle ändern">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
          {ROLES.map((r) => (
            <ActionLink
              key={r.id}
              href={`${backUrl}&do=set_role&role=${r.id}`}
              color={u.role === r.id ? "#94a3b8" : "#a855f7"}
              label={`${u.role === r.id ? "● " : ""}${r.label}`}
              disabled={u.role === r.id}
              confirm={r.id === "admin" ? "WIRKLICH zum ADMIN ernennen?" : `Rolle auf "${r.label}" ändern?`}
            />
          ))}
        </div>
      </Section>

      {/* Anmeldedaten */}
      <Section title="📅 Anmeldung & Kontakt">
        <Grid>
          <InfoBox label="Angemeldet" value={fmtDateTime(u.createdAt)} />
          <InfoBox label="Zuletzt online" value={fmtDateTime(u.lastSeen)} />
          <InfoBox label="Registrier-IP" value={maskIp(u.regIp)} mono />
          <InfoBox label="Status" value={u.status || "approved"} />
          <InfoBox label="Premium bis" value={u.vipUntil ? fmtDateTime(u.vipUntil) : "—"} />
          <InfoBox label="Cookie-Consent" value={consentLabel(u.adsConsent)} />
        </Grid>
      </Section>

      {/* Personalien */}
      <Section title="👤 Personalien">
        <Grid>
          <InfoBox label="Username" value={`@${u.username}`} mono />
          <InfoBox label="Display-Name" value={u.displayName || "—"} />
          <InfoBox label="Emoji" value={u.emoji || "—"} />
          <InfoBox label="Geschlecht" value={u.gender === "w" ? "weiblich" : u.gender === "m" ? "männlich" : u.gender || "—"} />
          <InfoBox label="Geburtsdatum" value={u.birthdate || "—"} />
          <InfoBox label="Alter" value={age ? `${age} Jahre` : "—"} />
        </Grid>
      </Section>

      {/* Anschrift — editierbar */}
      <Section title="📍 Anschrift (für Versand-Werbeartikel)">
        <form method="GET" action={`/admin/mitglieder/${encodeURIComponent(username)}`} style={{ display: "grid", gap: 10 }}>
          <input type="hidden" name="pw" value={pw} />
          <input type="hidden" name="do" value="save_address" />
          <FieldGrid>
            <Field label="Klarname" name="real_name" defaultValue={u.realName} />
            <Field label="Straße + Nr." name="addr_street" defaultValue={u.addrStreet} />
            <Field label="PLZ" name="addr_zip" defaultValue={u.addrZip} />
            <Field label="Wohnort" name="addr_city" defaultValue={u.addrCity} />
            <Field label="Land" name="addr_country" defaultValue={u.addrCountry || "DE"} />
          </FieldGrid>
          <button type="submit" style={btnSave()}>💾 Anschrift speichern</button>
        </form>
      </Section>

      {/* Ausweis */}
      <Section title="🪪 Ausweis-Verifikation">
        <div style={{ fontSize: 13, color: "#475569", marginBottom: 12 }}>
          Status: {u.idVerified === 1 ? (
            <b style={{ color: "#059669" }}>✓ Verifiziert</b>
          ) : (
            <b style={{ color: "#92400e" }}>⏳ Nicht verifiziert</b>
          )}
          {u.idDocUrl && <> · <a href={u.idDocUrl} target="_blank" style={{ color: "#ec4899" }}>📄 Ausweis-Scan ansehen</a></>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ActionLink
            href={`${backUrl}&do=set_id_verified&value=1`}
            color="#10b981" label="✓ Als verifiziert markieren"
            disabled={u.idVerified === 1}
          />
          <ActionLink
            href={`${backUrl}&do=set_id_verified&value=0`}
            color="#94a3b8" label="✕ Verifikation zurückziehen"
            disabled={u.idVerified !== 1}
          />
        </div>
        <div style={{ marginTop: 12, padding: 12, background: "#fef3c7", borderRadius: 10, fontSize: 12, color: "#78350f" }}>
          ⚠ Ausweis-Scan-Upload ist datenschutzkritisch. Erst aktivieren wenn nötig (Versandverify, AGB-Prüfung etc.).
        </div>
      </Section>

      {/* Sanktionen */}
      <Section title={`⚠ Sanktionen & Regelverstöße (${akte.sanctions.length})`}>
        {akte.sanctions.length === 0 ? (
          <Empty icon="🎉" text="Keine Sanktionen." />
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {akte.sanctions.map((s) => {
              const expired = s.until && s.until < Date.now();
              const lifted = !!s.liftedAt;
              return (
                <div key={s.id} style={{
                  background: lifted || expired ? "#f5f5f7" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${lifted || expired ? "#e5e5e7" : "rgba(239,68,68,0.25)"}`,
                  borderRadius: 10, padding: "10px 12px",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>
                    {s.type === "comm" ? "💬" : s.type === "profile" ? "🚷" : "⛔"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>
                      {s.type === "comm" ? "Stumm" : s.type === "profile" ? "Profil-Sperre" : "Voll-Ban"}
                      <span style={{ marginLeft: 8, fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                        {lifted ? "AUFGEHOBEN" : expired ? "ABGELAUFEN" : untilLabel(s.until)}
                      </span>
                    </div>
                    {s.reason && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>Grund: {s.reason}</div>}
                    <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>
                      verhängt am {fmtDateTime(s.createdAt)} von {s.by || "?"}
                    </div>
                  </div>
                  {!lifted && !expired && (
                    <Link href={`${backUrl}&do=lift_sanction&sanction_id=${s.id}`} style={{
                      fontSize: 11, color: "#ec4899", textDecoration: "none", fontWeight: 700, whiteSpace: "nowrap",
                    }}>Aufheben</Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Neue Sanktion verhängen */}
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 13, padding: "8px 0" }}>
            + Neue Sanktion verhängen
          </summary>
          <form method="GET" action={`/admin/mitglieder/${encodeURIComponent(username)}`} style={{
            background: "#fafafa", padding: 14, borderRadius: 10, marginTop: 8, display: "grid", gap: 10,
          }}>
            <input type="hidden" name="pw" value={pw} />
            <input type="hidden" name="do" value="sanction" />
            <div>
              <label style={fieldLabel()}>Typ</label>
              <select name="type" style={fieldInput()} required>
                {SANCTION_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel()}>Dauer</label>
              <select name="dur" style={fieldInput()} required>
                {Object.entries(DUR_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel()}>Grund (intern)</label>
              <input name="reason" style={fieldInput()} placeholder="z.B. Beleidigung in Pinnwand-Kommentar" />
            </div>
            <button type="submit" style={btnDanger()}>⚠ Sanktion verhängen</button>
          </form>
        </details>
      </Section>

      {/* Mod-Log */}
      <Section title={`📜 Mod-Log (${akte.modLog.length})`}>
        {akte.modLog.length === 0 ? (
          <Empty icon="📜" text="Keine Mod-Einträge." />
        ) : (
          <div style={{ display: "grid", gap: 4 }}>
            {akte.modLog.slice(0, 15).map((m) => (
              <div key={m.id} style={{
                padding: "8px 12px", borderRadius: 8, background: "#fafafa",
                fontSize: 12, display: "flex", gap: 10, alignItems: "center",
              }}>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#475569" }}>{m.kind}</span>
                {m.note && <span style={{ color: "#64748b" }}>· {m.note}</span>}
                <span style={{ marginLeft: "auto", color: "#94a3b8" }}>{fmtDateTime(m.createdAt)} · {m.by || "?"}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* IPs + Geräte */}
      <Section title={`📡 IPs & Geräte (${akte.ips.length} IPs, ${akte.devices.length} Geräte)`}>
        {akte.ips.length === 0 ? (
          <Empty icon="📡" text="Keine IP-Daten." />
        ) : (
          <Grid>
            {akte.ips.map((ip) => (
              <InfoBox
                key={ip.ip}
                label={`${ip.uses}× Login`}
                value={maskIp(ip.ip)}
                sub={`zuletzt ${fmtDateTime(ip.lastSeen)}`}
                mono
              />
            ))}
          </Grid>
        )}
      </Section>

      {/* Reports gegen den User */}
      {akte.reportsAgainst.length > 0 && (
        <Section title={`🚩 Meldungen gegen diesen User (${akte.reportsAgainst.length})`}>
          <div style={{ display: "grid", gap: 6 }}>
            {akte.reportsAgainst.map((r) => (
              <div key={r.id} style={{
                background: r.status === "resolved" ? "#f5f5f7" : "rgba(239,68,68,0.08)",
                border: `1px solid ${r.status === "resolved" ? "#e5e5e7" : "rgba(239,68,68,0.25)"}`,
                borderRadius: 10, padding: "10px 12px", fontSize: 12,
                display: "flex", gap: 10, alignItems: "center",
              }}>
                <span style={{ fontWeight: 800 }}>{r.targetType}</span>
                <span style={{ color: "#64748b" }}>· {r.category}</span>
                <span style={{ color: "#94a3b8", marginLeft: "auto" }}>{fmtDateTime(r.createdAt)}</span>
                <span style={{
                  background: r.status === "resolved" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                  color: r.status === "resolved" ? "#065f46" : "#92400e",
                  padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800,
                }}>{r.status}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Admin-Notizen */}
      <Section title="🗒 Admin-Notizen (intern)">
        <form method="GET" action={`/admin/mitglieder/${encodeURIComponent(username)}`} style={{ display: "grid", gap: 10 }}>
          <input type="hidden" name="pw" value={pw} />
          <input type="hidden" name="do" value="save_notes" />
          <textarea
            name="notes" defaultValue={u.adminNotes || ""}
            rows={5} maxLength={2000}
            placeholder="Persönliche Notizen zum User (nicht für ihn sichtbar)…"
            style={{
              width: "100%", padding: 12, borderRadius: 10, border: "1px solid #cbd5e1",
              fontSize: 13, fontFamily: "inherit", resize: "vertical",
            }}
          />
          <button type="submit" style={btnSave()}>💾 Notizen speichern</button>
        </form>
      </Section>
    </div>
  );
}

// ─── Small components ───────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: 18,
      border: "1px solid #e5e5e7", marginBottom: 12,
    }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 900, color: "#1c1c1e" }}>{title}</h3>
      {children}
    </div>
  );
}
function Grid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>{children}</div>;
}
function FieldGrid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>{children}</div>;
}
function InfoBox({ label, value, sub, mono }) {
  return (
    <div style={{ background: "#fafafa", padding: 12, borderRadius: 10, border: "1px solid #f1f5f9" }}>
      <div style={{ fontSize: 10, letterSpacing: 1, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
      <div style={{
        marginTop: 4, fontSize: 13, fontWeight: 700, color: "#1c1c1e",
        fontFamily: mono ? "monospace" : "inherit",
        wordBreak: "break-word",
      }}>{value || "—"}</div>
      {sub && <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function Field({ label, name, defaultValue }) {
  return (
    <div>
      <label style={fieldLabel()}>{label}</label>
      <input name={name} defaultValue={defaultValue || ""} style={fieldInput()} />
    </div>
  );
}
function fieldLabel() {
  return { display: "block", fontSize: 10, letterSpacing: 1, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 };
}
function fieldInput() {
  return { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "inherit", outline: "none" };
}
function Empty({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: 18, color: "#94a3b8", fontSize: 13 }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>{text}
    </div>
  );
}
function ActionLink({ href, color, label, disabled }) {
  // Hinweis: Server-Komponente kann kein onClick-Confirm.
  // Für gefährliche Aktionen ist die Farbe Warnung genug; User klickt bewusst.
  const sty = {
    display: "block", padding: "11px 14px", borderRadius: 10,
    background: disabled ? "#f5f5f7" : color, color: disabled ? "#94a3b8" : "#fff",
    fontWeight: 800, fontSize: 12.5, textDecoration: "none", textAlign: "center",
    pointerEvents: disabled ? "none" : "auto",
    cursor: disabled ? "default" : "pointer",
  };
  if (disabled) return <span style={sty}>{label}</span>;
  return <a href={href} style={sty}>{label}</a>;
}
function btnSave() {
  return {
    padding: "11px 22px", borderRadius: 10,
    background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
    border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    justifySelf: "start",
  };
}
function btnDanger() {
  return {
    padding: "11px 22px", borderRadius: 10,
    background: "linear-gradient(135deg, #ef4444, #b91c1c)", color: "#fff",
    border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    justifySelf: "start",
  };
}
function RoleBadge({ role }) {
  const map = {
    admin: { bg: "linear-gradient(135deg, #fbbf24, #d97706)", label: "👑 ADMIN" },
    teamleitung: { bg: "linear-gradient(135deg, #ec4899, #a855f7)", label: "🛡 LEAD" },
    moderator: { bg: "linear-gradient(135deg, #a855f7, #06b6d4)", label: "⚖️ MOD" },
    user: { bg: "rgba(255,255,255,0.15)", label: "👤 USER" },
  };
  const m = map[role] || map.user;
  return <span style={{
    background: m.bg, color: "#fff",
    padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 900, letterSpacing: 0.5,
  }}>{m.label}</span>;
}
function StatusBadge({ status }) {
  if (status === "blocked") return <span style={{
    background: "rgba(239,68,68,0.25)", color: "#fecaca",
    padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 900,
  }}>🚫 GESPERRT</span>;
  if (status === "pending") return <span style={{
    background: "rgba(245,158,11,0.25)", color: "#fde68a",
    padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 900,
  }}>⏳ WARTELISTE</span>;
  return <span style={{
    background: "rgba(16,185,129,0.25)", color: "#a7f3d0",
    padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 900,
  }}>✓ AKTIV</span>;
}
function flashLabel(f) {
  return {
    adresse_saved: "Adresse gespeichert",
    notes_saved: "Notizen gespeichert",
    id_saved: "Ausweis-Status aktualisiert",
    role_saved: "Rolle geändert",
    blocked: "Account gesperrt",
    unblocked: "Account entsperrt",
    approved: "Aus Warteliste freigegeben",
    sanctioned: "Sanktion verhängt",
    sanction_lifted: "Sanktion aufgehoben",
    all_lifted: "Alle Sanktionen aufgehoben",
  }[f] || f;
}
function consentLabel(c) {
  if (c === 1) return "alle Cookies";
  if (c === 2) return "generisch";
  if (c === -1) return "nur essentiell";
  return "nicht entschieden";
}
