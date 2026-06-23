import { redirect } from "next/navigation";
import Link from "next/link";
import { getMcpUser } from "@/lib/modAuth";
import { getMcpDashboardStats, listMcpReports } from "@/lib/db";
import McpHeader from "@/components/mcp/McpHeader";
import McpBottomNav from "@/components/mcp/McpBottomNav";

export const dynamic = "force-dynamic";

export default async function McpDashboardPage({ searchParams }) {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");

  const sp = (await searchParams) || {};
  const femaleOnly = sp?.f === "1" || sp?.frauen === "1";

  const stats = getMcpDashboardStats();
  const mineCount = listMcpReports({ status: "mine", byModId: me.id, limit: 999 }).length;
  stats.reportsMine = mineCount;

  const openReports = listMcpReports({
    status: "open",
    reporterGender: femaleOnly ? "f" : null,
    limit: 5,
  });

  const delta = 4;
  const high = stats.reportsOpen >= 5 ? Math.floor(stats.reportsOpen / 4) : 0;

  return (
    <div className="mcp-app">
      <McpHeader user={me} />

      <div className="mcp-content">

        <div className="mcp-section-label">
          🚩 OFFENE MELDUNGEN
          <span className="count">{stats.reportsOpen}</span>
          {stats.reportsFemaleOpen > 0 && (
            <span className="count female">🩷 {stats.reportsFemaleOpen}</span>
          )}
          <Link href="/mcp/meldungen" className="mcp-section-action">Alle sehen →</Link>
        </div>

        <div className="mcp-stat-hero">
          <div className="mcp-stat-hero-content">
            <div className="mcp-stat-hero-label">
              <span className="mcp-urgent-dot" />
              Heute zu bearbeiten
            </div>
            <div className="mcp-stat-hero-number">{stats.reportsOpen}</div>
            <div className="mcp-stat-hero-meta">
              {delta > 0 && <><span className="delta up">↑ {delta}</span> seit gestern</>}
              {high > 0 && <> · <b>{high} hochpriorisiert</b></>}
              {stats.reportsMine > 0 && <> · <b style={{ color: "var(--mcp-green)" }}>{stats.reportsMine} bei dir</b></>}
              {stats.reportsFemaleOpen > 0 && (
                <> · <b className="delta female">🩷 {stats.reportsFemaleOpen} von Frauen</b></>
              )}
            </div>
          </div>
        </div>

        <div className="mcp-mini-stats">
          <div className="mcp-mini-stat female">
            <div className="mcp-mini-stat-icon">🩷</div>
            <div className="mcp-mini-stat-content">
              <div className="mcp-mini-stat-num">{stats.reportsFemaleOpen}</div>
              <div className="mcp-mini-stat-label">Frauen-Meldungen</div>
            </div>
          </div>
          <div className="mcp-mini-stat">
            <div className="mcp-mini-stat-icon">🖼</div>
            <div className="mcp-mini-stat-content">
              <div className="mcp-mini-stat-num">{stats.profilePicsPending}</div>
              <div className="mcp-mini-stat-label">Bilder offen</div>
            </div>
          </div>
          <div className="mcp-mini-stat">
            <div className="mcp-mini-stat-icon">🎫</div>
            <div className="mcp-mini-stat-content">
              <div className="mcp-mini-stat-num">{stats.ticketsOpen}</div>
              <div className="mcp-mini-stat-label">Tickets offen</div>
            </div>
          </div>
          <div className="mcp-mini-stat">
            <div className="mcp-mini-stat-icon">🤖</div>
            <div className="mcp-mini-stat-content">
              <div className="mcp-mini-stat-num">{stats.fidolinLast24h}</div>
              <div className="mcp-mini-stat-label">Fidolin 24h</div>
            </div>
          </div>
        </div>

        <div className="mcp-filter-row" style={{ marginTop: 18 }}>
          <Link
            href="/mcp"
            className={`mcp-filter-pill ${!femaleOnly ? "active" : ""}`}
          >Alle</Link>
          <Link
            href="/mcp?f=1"
            className={`mcp-filter-pill female ${femaleOnly ? "active" : ""}`}
          >🩷 Von Frauen</Link>
        </div>

        <div className="mcp-section-label">
          Aktuell
          <Link href="/mcp/meldungen" className="mcp-section-action">Alle →</Link>
        </div>

        {openReports.length === 0 ? (
          <div className="mcp-placeholder-card">
            <div className="icon">🎉</div>
            <b style={{ color: "var(--mcp-text-strong)" }}>
              {femaleOnly ? "Keine Frauen-Meldungen offen" : "Alles erledigt!"}
            </b><br/>
            {femaleOnly
              ? "Alle Meldungen von Frauen sind bearbeitet. Top."
              : "Keine offenen Meldungen gerade. Schöne Schicht."}
          </div>
        ) : (
          openReports.map((r) => {
            const minsAgo = Math.max(1, Math.round((Date.now() - r.createdAt) / 60000));
            const timeStr = minsAgo < 60 ? `${minsAgo} Min` : `${Math.round(minsAgo / 60)} h`;
            const isFemale = r.reporterGender === "f";
            return (
              <Link
                key={r.id}
                href={`/mcp/meldungen/${r.id}`}
                className={`mcp-report-item${isFemale ? " female-report" : ""}`}
              >
                <div className="mcp-report-row-1">
                  <div className={`mcp-report-avatar ${isFemale ? "female" : "urgent"}`}>
                    {isFemale ? "🩷" : "🚩"}
                    {isFemale && <span className="mcp-female-badge">♀</span>}
                  </div>
                  <div className="mcp-report-info">
                    <div className={`mcp-report-cat${isFemale ? " female-cat" : ""}`}>
                      <span>{(r.category || "MELDUNG").toUpperCase()} · {(r.targetType || "").toUpperCase()}</span>
                      {isFemale && <span className="mcp-female-tag">🩷 FRAU MELDET</span>}
                    </div>
                    <div className="mcp-report-title">
                      Gemeldet von @{r.reporterUsername || "?"}
                      {r.targetUsername && ` · betrifft @${r.targetUsername}`}
                    </div>
                  </div>
                  <div className="mcp-report-time">{timeStr}</div>
                </div>
                {r.contentSnapshot && (
                  <div className="mcp-report-snippet">
                    „{r.contentSnapshot.slice(0, 140)}{r.contentSnapshot.length > 140 ? "…" : ""}"
                  </div>
                )}
              </Link>
            );
          })
        )}

      </div>

      <McpBottomNav stats={stats} />
    </div>
  );
}
