// 👥 Mitglieder-Übersicht — Owner-Sicht mit Tabs:
//   • Alle
//   • Admins
//   • Teamleitung
//   • Moderatoren

import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminPassword, adminEnabled } from "@/lib/admin";
import { listUsersByRole, countUsersByRole } from "@/lib/db";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "all",         label: "👥 Alle",         badgeKey: "all"         },
  { id: "admin",       label: "👑 Admins",       badgeKey: "admin"       },
  { id: "teamleitung", label: "🛡 Teamleitung",  badgeKey: "teamleitung" },
  { id: "moderator",   label: "⚖️ Moderatoren",  badgeKey: "moderator"   },
];

function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function relTime(ts) {
  if (!ts) return "nie";
  const min = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (min < 60) return `${min} Min`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h`;
  const d = Math.round(h / 24);
  return `${d} Tg`;
}

function roleColor(role) {
  if (role === "admin") return { bg: "linear-gradient(135deg, #fbbf24, #d97706)", text: "#fff", short: "ADMIN" };
  if (role === "teamleitung") return { bg: "linear-gradient(135deg, #ec4899, #a855f7)", text: "#fff", short: "LEAD" };
  if (role === "moderator") return { bg: "linear-gradient(135deg, #a855f7, #06b6d4)", text: "#fff", short: "MOD" };
  return { bg: "#f1f5f9", text: "#475569", short: "USER" };
}

function statusBadge(status) {
  if (status === "blocked") return { bg: "rgba(239,68,68,0.15)", text: "#991b1b", label: "🚫 Gesperrt" };
  if (status === "pending") return { bg: "rgba(245,158,11,0.15)", text: "#92400e", label: "⏳ Warteliste" };
  return { bg: "rgba(16,185,129,0.12)", text: "#065f46", label: "✓ Aktiv" };
}

export default async function MitgliederPage({ searchParams }) {
  const sp = await searchParams;
  const pw = typeof sp?.pw === "string" ? sp.pw : "";

  if (!adminEnabled() || !checkAdminPassword(pw)) {
    redirect(`/admin?pw=${encodeURIComponent(pw)}`);
  }

  const tab = TABS.some((t) => t.id === sp?.tab) ? sp.tab : "all";
  const search = typeof sp?.q === "string" ? sp.q.trim().slice(0, 64) : "";
  const role = tab === "all" ? "all" : tab;

  const counts = countUsersByRole();
  const users = listUsersByRole({ role, search, limit: 200 });
  const pwQ = `pw=${encodeURIComponent(pw)}`;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 16px 60px", fontFamily: "system-ui, sans-serif" }}>

      {/* Breadcrumb + Header */}
      <div style={{ marginBottom: 14 }}>
        <Link href={`/admin?${pwQ}`} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: 999,
          background: "#1c1c1e", color: "#fff",
          fontSize: 12.5, fontWeight: 700,
          textDecoration: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>
          ← 👑 Zurück zum Cockpit
        </Link>
        <h1 style={{ margin: "14px 0 0", fontSize: 28, fontWeight: 900, letterSpacing: -0.5, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}>
          👥 Mitglieder
        </h1>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
          Owner-Sicht auf alle Konten. Klick auf einen User öffnet die volle Userakte.
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4,
        borderBottom: "1px solid #e5e5e7", marginBottom: 18,
      }}>
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Link
              key={t.id}
              href={`/admin/mitglieder?${pwQ}&tab=${t.id}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
              style={{
                padding: "10px 18px", borderRadius: "12px 12px 0 0",
                background: active ? "linear-gradient(135deg, #ec4899, #a855f7)" : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.6)",
                textDecoration: "none", fontSize: 13, fontWeight: 800,
                whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
                borderBottom: active ? "none" : "2px solid transparent",
              }}
            >
              {t.label}
              <span style={{
                background: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)",
                color: active ? "#fff" : "rgba(255,255,255,0.85)",
                padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800,
              }}>
                {counts[t.badgeKey] || 0}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Suchleiste */}
      <form method="GET" action="/admin/mitglieder" style={{ marginBottom: 18, display: "flex", gap: 8 }}>
        <input type="hidden" name="pw" value={pw} />
        <input type="hidden" name="tab" value={tab} />
        <input
          name="q" defaultValue={search}
          placeholder="🔍 Nach Username, Display-Name oder Klarnamen suchen…"
          style={{
            flex: 1, padding: "11px 14px", borderRadius: 10,
            border: "1px solid #cbd5e1", fontSize: 14, outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button type="submit" style={{
          padding: "11px 22px", borderRadius: 10,
          background: "linear-gradient(135deg, #ec4899, #a855f7)",
          color: "#fff", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer",
        }}>Suchen</button>
        {search && (
          <Link href={`/admin/mitglieder?${pwQ}&tab=${tab}`} style={{
            padding: "11px 16px", borderRadius: 10,
            background: "#f5f5f7", color: "#64748b", textDecoration: "none",
            fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center",
          }}>✕</Link>
        )}
      </form>

      {/* Liste */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
        {users.length === 0 ? (
          <div style={{
            gridColumn: "1 / -1",
            background: "#fff", borderRadius: 16, padding: 38, textAlign: "center",
            border: "1px dashed #cbd5e1", color: "#64748b",
          }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>🔍</div>
            <b>Niemand gefunden</b><br/>
            <span style={{ fontSize: 12 }}>
              {search ? `Keine Treffer für "${search}".` : "In diesem Tab sind keine User."}
            </span>
          </div>
        ) : users.map((u) => {
          const rc = roleColor(u.role);
          const sb = statusBadge(u.status);
          return (
            <Link
              key={u.id}
              href={`/admin/mitglieder/${encodeURIComponent(u.username)}?${pwQ}`}
              style={{
                display: "block",
                background: "#fff", borderRadius: 14, padding: 14,
                border: "1px solid #e5e5e7",
                textDecoration: "none", color: "inherit",
                transition: "transform 0.1s, box-shadow 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: u.avatarUrl
                    ? `url(${u.avatarUrl}) center/cover`
                    : "linear-gradient(135deg, #1e293b, #0f172a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 22,
                }}>
                  {!u.avatarUrl && (u.emoji || "👤")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: "#1c1c1e",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {u.displayName || u.username}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                    @{u.username}
                  </div>
                </div>
                <span style={{
                  background: rc.bg, color: rc.text,
                  fontSize: 9.5, fontWeight: 900, padding: "3px 8px", borderRadius: 999,
                  letterSpacing: 1, flexShrink: 0,
                }}>{rc.short}</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", fontSize: 10.5 }}>
                <span style={{
                  background: sb.bg, color: sb.text,
                  padding: "3px 8px", borderRadius: 999, fontWeight: 700,
                }}>{sb.label}</span>
                <span style={{ color: "#94a3b8", padding: "3px 0" }}>
                  📅 {fmtDate(u.createdAt)}
                </span>
                <span style={{ color: "#94a3b8", padding: "3px 0" }}>
                  · zuletzt {relTime(u.lastSeen)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: 20, fontSize: 11.5, color: "rgba(255,255,255,0.6)", textAlign: "center", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
        {users.length} von {counts[tab === "all" ? "all" : tab] || 0} angezeigt
        {users.length >= 200 && " · Max-Limit erreicht — bitte Suche eingrenzen"}
      </div>
    </div>
  );
}
