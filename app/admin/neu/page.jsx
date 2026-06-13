// 🆕 Admin-Was-ist-neu — komplette Changelog-Liste, inkl. interner Eintraege.
// Server-Component: Auth ueber dasselbe ?pw=... wie /admin (kein Cookie noetig).
// Filter ueber ?audience=public|admin|all (Default: all).

import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminPassword, adminEnabled } from "@/lib/admin";
import { CHANGELOG_ADMIN, formatChangelogTime } from "@/lib/changelog";

export const dynamic = "force-dynamic";

const AUDIENCE_LABEL = {
  public: { label: "Öffentlich", color: "#16a34a", bg: "#dcfce7" },
  admin:  { label: "Nur Admin",  color: "#7c2d12", bg: "#fed7aa" },
};

export default async function AdminNeuPage({ searchParams }) {
  const sp = await searchParams;
  const pw = typeof sp?.pw === "string" ? sp.pw : "";
  const audience = typeof sp?.audience === "string" ? sp.audience : "all";

  if (!adminEnabled() || !checkAdminPassword(pw)) {
    redirect("/admin");
  }

  const filtered = audience === "all"
    ? CHANGELOG_ADMIN
    : CHANGELOG_ADMIN.filter((e) => (e.audience || "public") === audience);

  const groups = (() => {
    const map = new Map();
    for (const e of filtered) {
      const d = new Date(e.at);
      const key = d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return [...map.entries()];
  })();

  const counts = {
    all:    CHANGELOG_ADMIN.length,
    public: CHANGELOG_ADMIN.filter((e) => (e.audience || "public") === "public").length,
    admin:  CHANGELOG_ADMIN.filter((e) => e.audience === "admin").length,
  };

  const pwQuery = `pw=${encodeURIComponent(pw)}`;

  return (
    <div className="vv-neu-page">
      <div className="vv-neu-hero">
        <Link href={`/admin?${pwQuery}`} className="vv-neu-back">← Admin</Link>
        <h1 className="vv-neu-title">🆕 Neuigkeiten (Admin)</h1>
        <p className="vv-neu-sub">
          Komplette Liste inklusive interner Patches, DB-Migrationen und Refactorings.
        </p>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {[
            ["all",    `Alle · ${counts.all}`],
            ["public", `🌍 Öffentlich · ${counts.public}`],
            ["admin",  `🔒 Admin-Only · ${counts.admin}`],
          ].map(([k, lbl]) => {
            const active = k === audience;
            return (
              <Link key={k} href={`/admin/neu?${pwQuery}&audience=${k}`}
                style={{
                  padding: "6px 14px", borderRadius: 999, fontWeight: 700, fontSize: 12,
                  border: active ? "2px solid #ec4899" : "1.5px solid rgba(0,0,0,0.1)",
                  background: active ? "linear-gradient(135deg,#ec4899,#a855f7)" : "rgba(255,255,255,0.7)",
                  color: active ? "#fff" : "#374151",
                  textDecoration: "none",
                }}>{lbl}</Link>
            );
          })}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="vv-neu-empty">Nichts unter diesem Filter.</div>
      ) : (
        <div className="vv-neu-timeline">
          {groups.map(([day, items]) => (
            <section key={day} className="vv-neu-day">
              <div className="vv-neu-day-title">{day}</div>
              <ul className="vv-neu-list">
                {items.map((e, i) => {
                  const aud = AUDIENCE_LABEL[e.audience || "public"];
                  return (
                    <li key={`${e.at}-${i}`} className="vv-neu-item">
                      <span className="vv-neu-dot" aria-hidden="true">{e.emoji}</span>
                      <div className="vv-neu-text">
                        <div className="vv-neu-itemtitle">{e.title}</div>
                        <div className="vv-neu-itemtime">
                          {formatChangelogTime(e.at)}
                          {e.sha && <> · <code style={{ fontSize: 10 }}>{e.sha}</code></>}
                          {" · "}
                          <span style={{
                            padding: "1px 7px", borderRadius: 999, fontSize: 10,
                            background: aud.bg, color: aud.color, fontWeight: 700,
                          }}>{aud.label}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
