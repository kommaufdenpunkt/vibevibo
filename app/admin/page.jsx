import { redirect } from "next/navigation";
import { checkAdminPassword, adminEnabled } from "@/lib/admin";
import {
  listUsersByStatus, listBlockedIps, adminStats,
  setUserStatus, deleteUser, getUserByUsername, blockIp, unblockIp,
} from "@/lib/db";
import { relTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// Reine Server-Component: kein fetch, kein Cookie, keine API-Route.
// Passwort kommt per ?pw=, Aktionen per GET-Link (?do=...&u=...).
export default async function AdminPage({ searchParams }) {
  const sp = await searchParams;
  const pw = typeof sp?.pw === "string" ? sp.pw : "";

  if (!adminEnabled()) {
    return (
      <div className="vv-card vv-login-card">
        <h2>🔐 VibeVibo Admin</h2>
        <p>Admin-Bereich nicht konfiguriert. Setze <code>VV_ADMIN_PASSWORD</code> in Coolify.</p>
      </div>
    );
  }

  if (!checkAdminPassword(pw)) {
    return (
      <div className="vv-card vv-login-card">
        <h2>🔐 VibeVibo Admin</h2>
        <form method="GET" action="/admin">
          <label>Admin-Passwort</label>
          <input type="password" name="pw" className="vv-input" autoFocus autoComplete="current-password" />
          {pw ? <div className="vv-mt-8" style={{ color: "#a00", fontWeight: "bold" }}>⚠ Falsches Passwort</div> : null}
          <div className="vv-mt-12">
            <button type="submit" className="vv-btn vv-btn-pink">▶ Anmelden</button>
          </div>
        </form>
      </div>
    );
  }

  // Aktion ausführen (GET-basiert), danach sauber zurück
  const action = typeof sp?.do === "string" ? sp.do : "";
  const uname = typeof sp?.u === "string" ? sp.u : "";
  const ip = typeof sp?.ip === "string" ? sp.ip : "";
  if (action) {
    if (action === "approve" && uname) { const x = getUserByUsername(uname); if (x) setUserStatus(x.id, "approved"); }
    else if (action === "block" && uname) { const x = getUserByUsername(uname); if (x) { setUserStatus(x.id, "blocked"); if (ip) blockIp(ip, `User ${uname} gesperrt`); } }
    else if (action === "reject" && uname) { const x = getUserByUsername(uname); if (x) { if (ip) blockIp(ip, `Anmeldung ${uname} abgelehnt`); deleteUser(x.id); } }
    else if (action === "delete" && uname) { const x = getUserByUsername(uname); if (x) deleteUser(x.id); }
    else if (action === "unblockip" && ip) unblockIp(ip);
    else if (action === "blockip" && ip) blockIp(ip, "manuell gesperrt");
    redirect(`/admin?pw=${encodeURIComponent(pw)}`);
  }

  const stats = adminStats();
  const pending = listUsersByStatus("pending");
  const approved = listUsersByStatus("approved");
  const blocked = listUsersByStatus("blocked");
  const blockedIps = listBlockedIps();
  const q = `pw=${encodeURIComponent(pw)}`;

  return (
    <>
      <div className="vv-card">
        <div className="vv-row">
          <h2 style={{ flex: 1, margin: 0 }}>🔐 Admin-Dashboard</h2>
          <a className="vv-btn" href={`/admin?${q}`}>↻ Aktualisieren</a>
          <a className="vv-btn" href="/admin">↩ Logout</a>
        </div>
        <ul className="vv-profile-stats vv-mt-12">
          <li><strong>{stats.pending}</strong>Warteliste</li>
          <li><strong>{stats.approved}</strong>Aktiv</li>
          <li><strong>{stats.blocked}</strong>Gesperrt</li>
          <li><strong>{stats.blockedIps}</strong>IP-Sperren</li>
        </ul>
      </div>

      <div className="vv-card">
        <h3>⏳ Warteliste ({pending.length})</h3>
        {pending.length === 0 ? (
          <div className="vv-muted vv-center" style={{ padding: 14 }}>Niemand wartet gerade.</div>
        ) : pending.map((u) => (
          <div className="vv-admin-row" key={u.username}>
            <div className="vv-avatar vv-avatar-sm">{u.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{u.displayName}</strong> <span className="vv-muted">@{u.username}</span>
              <div className="vv-muted" style={{ fontSize: 11 }}>IP: {u.regIp || "?"} · {relTime(u.createdAt)}</div>
            </div>
            <a className="vv-btn vv-btn-pink" href={`/admin?${q}&do=approve&u=${encodeURIComponent(u.username)}`}>✓ Frei</a>
            <a className="vv-btn" href={`/admin?${q}&do=reject&u=${encodeURIComponent(u.username)}&ip=${encodeURIComponent(u.regIp || "")}`}>✕ +IP-Sperre</a>
          </div>
        ))}
      </div>

      <div className="vv-card">
        <h3>✅ Aktive Mitglieder ({approved.length})</h3>
        {approved.length === 0 && <div className="vv-muted">Noch keine.</div>}
        {approved.map((u) => (
          <div className="vv-admin-row" key={u.username}>
            <div className="vv-avatar vv-avatar-sm">{u.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{u.displayName}</strong> <span className="vv-muted">@{u.username}</span>
            </div>
            <a className="vv-btn" href={`/admin?${q}&do=block&u=${encodeURIComponent(u.username)}&ip=${encodeURIComponent(u.regIp || "")}`}>🚫 Sperren</a>
            <a className="vv-btn" style={{ color: "#a00", fontWeight: "bold" }} href={`/admin?${q}&do=delete&u=${encodeURIComponent(u.username)}`}>🗑 Löschen</a>
          </div>
        ))}
      </div>

      {blocked.length > 0 && (
        <div className="vv-card">
          <h3>🚫 Gesperrte Accounts ({blocked.length})</h3>
          {blocked.map((u) => (
            <div className="vv-admin-row" key={u.username}>
              <div style={{ flex: 1 }}><strong>{u.displayName}</strong> <span className="vv-muted">@{u.username}</span></div>
              <a className="vv-btn vv-btn-pink" href={`/admin?${q}&do=approve&u=${encodeURIComponent(u.username)}`}>✓ Entsperren</a>
              <a className="vv-btn" style={{ color: "#a00", fontWeight: "bold" }} href={`/admin?${q}&do=delete&u=${encodeURIComponent(u.username)}`}>🗑 Löschen</a>
            </div>
          ))}
        </div>
      )}

      <div className="vv-card">
        <h3>⛔ IP-Blacklist ({blockedIps.length})</h3>
        <form method="GET" action="/admin" className="vv-row vv-mt-8">
          <input type="hidden" name="pw" value={pw} />
          <input type="hidden" name="do" value="blockip" />
          <input className="vv-input" name="ip" placeholder="IP-Adresse sperren..." />
          <button type="submit" className="vv-btn vv-btn-pink">Sperren</button>
        </form>
        <div className="vv-mt-12">
          {blockedIps.length === 0 && <div className="vv-muted">Keine gesperrten IPs.</div>}
          {blockedIps.map((b) => (
            <div className="vv-admin-row" key={b.ip}>
              <div style={{ flex: 1 }}><code>{b.ip}</code> <span className="vv-muted">{b.reason} · {relTime(b.at)}</span></div>
              <a className="vv-btn" href={`/admin?${q}&do=unblockip&ip=${encodeURIComponent(b.ip)}`}>Entsperren</a>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
