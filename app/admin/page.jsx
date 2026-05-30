import { redirect } from "next/navigation";
import { checkAdminPassword, adminEnabled } from "@/lib/admin";
import { fidolinEnabled } from "@/lib/fidolin";
import {
  listUsersByStatus, listBlockedIps, adminStats,
  setUserStatus, deleteUser, getUserByUsername, getUserById, blockIp, unblockIp,
  addSanction, liftSanction, liftAllSanctions, listActiveSanctions,
  listDevices, banDevice, unbanDevice, listDeviceBans,
  getUserDossier, listRecentModLog,
  listPendingPics, listRejectedPics, listApprovedPics, setPicStatus, getProfilePic,
  listPendingPhotos, listRejectedPhotos, setPhotoStatus, getPhoto,
  listOpenReports, getReportSnippet, resolveReport,
  logMod, updateUser, ageFromBirthdate,
  listAllVibesTx, listAuditLog, topVibesEarners, suspiciousVibesPatterns, vibesGiftPairs,
  adminGrantCredits, getCredits, listEarnBlockedUsers, unblockEarnForUser, getUserIdByUsername,
} from "@/lib/db";
import GenderAge from "@/components/GenderAge";
import Avatar from "@/components/Avatar";
import { relTime } from "@/lib/format";
import { deviceLabel } from "@/lib/device";

export const dynamic = "force-dynamic";

const DUR = {
  "10m": 600000, "1h": 3600000, "6h": 21600000, "1d": 86400000,
  "3d": 259200000, "1w": 604800000, "1mo": 2592000000, "6mo": 15552000000,
  "1y": 31536000000, "perm": null,
};

function untilLabel(until) {
  if (!until) return "permanent";
  const diff = until - Date.now();
  if (diff <= 0) return "abgelaufen";
  const h = Math.round(diff / 3600000);
  if (h < 48) return `noch ~${h} Std.`;
  return `noch ~${Math.round(h / 24)} Tage`;
}

const TABS = [
  ["uebersicht", "📊 Übersicht"],
  ["warteliste", "⏳ Warteliste"],
  ["mitglieder", "👥 Mitglieder"],
  ["profilbilder", "🖼 Profilbilder"],
  ["fotos", "📷 Fotos"],
  ["meldungen", "🚩 Meldungen"],
  ["banns", "🔨 Banns"],
  ["geraete", "📱 Geräte"],
  ["userakte", "📁 Userakte"],
  ["ips", "⛔ IP-Sperren"],
  ["vibeslog", "✨ Vibes-Log"],
  ["audit", "📜 Audit-Log"],
];

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

  const tab = typeof sp?.tab === "string" && TABS.some((t) => t[0] === sp.tab) ? sp.tab : "uebersicht";
  const uParam = typeof sp?.u === "string" ? sp.u : "";

  // Streng: KEINE Auto-Freigabe. Bilder/Fotos bleiben in Prüfung, bis Fidolin (KI)
  // beim Upload entscheidet oder ein Mensch sie freigibt – so rutscht nichts durch.

  // ---- Aktionen (GET-basiert) ----
  const action = typeof sp?.do === "string" ? sp.do : "";
  const uname = uParam;
  const ip = typeof sp?.ip === "string" ? sp.ip : "";
  const dev = typeof sp?.dev === "string" ? sp.dev : "";
  const pic = typeof sp?.pic === "string" ? sp.pic : "";
  const pid = typeof sp?.pid === "string" ? sp.pid : "";
  const rid = typeof sp?.rid === "string" ? sp.rid : "";
  if (action) {
    if (action === "approve" && uname) { const x = getUserByUsername(uname); if (x) setUserStatus(x.id, "approved"); }
    else if (action === "block" && uname) { const x = getUserByUsername(uname); if (x) { setUserStatus(x.id, "blocked"); if (ip) blockIp(ip, `User ${uname} gesperrt`); } }
    else if (action === "reject" && uname) { const x = getUserByUsername(uname); if (x) { if (ip) blockIp(ip, `Anmeldung ${uname} abgelehnt`); deleteUser(x.id); } }
    else if (action === "delete" && uname) { const x = getUserByUsername(uname); if (x) deleteUser(x.id); }
    else if (action === "ban" && uname) {
      const x = getUserByUsername(uname);
      if (x) {
        const t = ["comm", "profile", "full"].includes(sp.btype) ? sp.btype : "comm";
        const code = typeof sp.dur === "string" && sp.dur in DUR ? sp.dur : "1d";
        const ms = DUR[code];
        const until = ms == null ? null : Date.now() + ms;
        addSanction(x.id, t, until, `Admin-Bann (${t}, ${code})`, "admin");
        logMod({ userId: x.id, kind: "ban", decision: t, reason: `Admin-Bann ${code}`, by: "admin" });
      }
    }
    else if (action === "liftban" && sp.sid) liftSanction(Number(sp.sid));
    else if (action === "liftall" && uname) { const x = getUserByUsername(uname); if (x) { liftAllSanctions(x.id); logMod({ userId: x.id, kind: "unban", decision: "lifted", reason: "Admin hob alle Sanktionen auf", by: "admin" }); } }
    else if (action === "banDevice" && dev) banDevice(dev, "Admin-Gerätebann", null, "admin");
    else if (action === "unbanDevice" && dev) unbanDevice(dev);
    else if (action === "avApprove" && pic) { const p = getProfilePic(Number(pic)); if (p) { setPicStatus(p.id, "approved", "Admin freigegeben"); logMod({ userId: p.user_id, kind: "avatar", decision: "approved", reason: "Admin-Freigabe", by: "admin" }); } }
    else if (action === "avReject" && pic) { const p = getProfilePic(Number(pic)); if (p) { setPicStatus(p.id, "rejected", "Vom Admin abgelehnt"); logMod({ userId: p.user_id, kind: "avatar", decision: "rejected", reason: "Admin-Ablehnung", by: "admin" }); } }
    else if (action === "phApprove" && pid) { const p = getPhoto(Number(pid)); if (p) { setPhotoStatus(p.id, "approved", "Admin freigegeben"); logMod({ userId: p.user_id, kind: "foto", decision: "approved", reason: "Admin-Freigabe", by: "admin" }); } }
    else if (action === "phReject" && pid) { const p = getPhoto(Number(pid)); if (p) { setPhotoStatus(p.id, "rejected", "Vom Admin abgelehnt"); logMod({ userId: p.user_id, kind: "foto", decision: "rejected", reason: "Admin-Ablehnung", by: "admin" }); } }
    else if (action === "resolveReport" && rid) { resolveReport(Number(rid), "resolved"); }
    else if (action === "dismissReport" && rid) { resolveReport(Number(rid), "dismissed"); }
    else if (action === "setvitals" && uname) {
      const x = getUserByUsername(uname);
      if (x) {
        const patch = {};
        if (sp.g === "m" || sp.g === "w") patch.gender = sp.g;
        if (typeof sp.bd === "string" && sp.bd) { const a = ageFromBirthdate(sp.bd); if (a != null && a >= 18) patch.birthdate = sp.bd; }
        if (Object.keys(patch).length) {
          updateUser(x.id, patch);
          logMod({ userId: x.id, kind: "note", decision: "stammdaten", reason: `Admin setzte ${patch.gender ? "Geschlecht=" + patch.gender + " " : ""}${patch.birthdate ? "Geburtsdatum=" + patch.birthdate : ""}`.trim(), by: "admin" });
        }
      }
    }
    else if (action === "unblockip" && ip) unblockIp(ip);
    else if (action === "blockip" && ip) blockIp(ip, "manuell gesperrt");
    else if (action === "grantVibes" && uname) {
      const x = getUserByUsername(uname);
      const n = Number(sp.amt) || 0;
      const reason = typeof sp.r === "string" ? sp.r : "Admin-Gutschrift";
      if (x && n !== 0) {
        adminGrantCredits(x.id, n, reason);
        logMod({ userId: x.id, kind: "vibes", decision: n > 0 ? "+" + n : String(n), reason, by: "admin" });
      }
    }
    else if (action === "unblockEarn" && uname) {
      const uid = getUserIdByUsername(uname);
      if (uid) { unblockEarnForUser(uid); logMod({ userId: uid, kind: "vibes", decision: "earn_unblocked", reason: "Admin", by: "admin" }); }
    }
    const keepU = (tab === "userakte" && uname) ? `&u=${encodeURIComponent(uname)}` : "";
    redirect(`/admin?pw=${encodeURIComponent(pw)}&tab=${tab}${keepU}`);
  }

  const q = `pw=${encodeURIComponent(pw)}`;
  const stats = adminStats();

  return (
    <>
      <div className="vv-card">
        <div className="vv-row">
          <h2 style={{ flex: 1, margin: 0 }}>🔐 Admin · Fidolin</h2>
          <a className="vv-btn" href={`/admin?${q}&tab=${tab}`}>↻ Aktualisieren</a>
          <a className="vv-btn" href="/admin">↩ Logout</a>
        </div>
        <div className="vv-row" style={{ flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {TABS.map(([id, label]) => (
            <a key={id} href={`/admin?${q}&tab=${id}`}
               className={`vv-btn${id === tab ? " vv-btn-pink" : ""}`}>{label}</a>
          ))}
        </div>
      </div>

      {tab === "uebersicht" && <Uebersicht stats={stats} />}
      {tab === "warteliste" && <Warteliste q={q} />}
      {tab === "mitglieder" && <Mitglieder q={q} />}
      {tab === "profilbilder" && <Profilbilder q={q} />}
      {tab === "fotos" && <Fotos q={q} />}
      {tab === "meldungen" && <Meldungen q={q} />}
      {tab === "banns" && <Banns q={q} pw={pw} />}
      {tab === "geraete" && <Geraete q={q} />}
      {tab === "userakte" && <Userakte q={q} pw={pw} uParam={uParam} />}
      {tab === "ips" && <IpSperren q={q} pw={pw} />}
      {tab === "vibeslog" && <VibesLog q={q} pw={pw} />}
      {tab === "audit" && <AuditLog q={q} />}
    </>
  );
}

function Uebersicht({ stats }) {
  const log = listRecentModLog(40);
  return (
    <>
      <div className="vv-card">
        <ul className="vv-profile-stats">
          <li><strong>{stats.pending}</strong>Warteliste</li>
          <li><strong>{stats.approved}</strong>Aktiv</li>
          <li><strong>{stats.blocked}</strong>Gesperrt</li>
          <li><strong>{stats.sanctions}</strong>Banns</li>
          <li><strong>{stats.deviceBans}</strong>Geräte-Sperren</li>
          <li><strong>{stats.pendingAvatars}</strong>Bilder offen</li>
          <li><strong>{stats.blockedIps}</strong>IP-Sperren</li>
        </ul>
        <div className="vv-mt-12 vv-muted">
          🤖 Fidolins KI-Gehirn: {fidolinEnabled()
            ? <strong style={{ color: "#0a7" }}>aktiv (Gemini)</strong>
            : <strong style={{ color: "#a70" }}>Wortfilter (kein API-Key gesetzt)</strong>}
        </div>
      </div>
      <div className="vv-card">
        <h3>📜 Letzte Fidolin-Aktivität</h3>
        {log.length === 0 && <div className="vv-muted">Noch nichts protokolliert.</div>}
        {log.map((m) => (
          <div className="vv-admin-row" key={m.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: "bold" }}>{m.by}</span>{" "}
              <span className="vv-muted">{m.kind} · {m.decision}</span>
              {m.username ? <> · <strong>@{m.username}</strong></> : null}
              {m.reason ? <div className="vv-muted" style={{ fontSize: 11 }}>{m.reason}</div> : null}
              {m.content ? <div style={{ fontSize: 11, color: "#666" }}>„{m.content}"</div> : null}
            </div>
            <span className="vv-muted" style={{ fontSize: 11 }}>{relTime(m.created_at)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Warteliste({ q }) {
  const pending = listUsersByStatus("pending");
  return (
    <div className="vv-card">
      <h3>⏳ Warteliste ({pending.length})</h3>
      {pending.length === 0 ? (
        <div className="vv-muted vv-center" style={{ padding: 14 }}>Niemand wartet gerade.</div>
      ) : pending.map((u) => (
        <div className="vv-admin-row" key={u.username}>
          <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{u.displayName}</strong> <span className="vv-muted">@{u.username}</span>
            <div className="vv-muted" style={{ fontSize: 11 }}>IP: {u.regIp || "?"} · {relTime(u.createdAt)}</div>
          </div>
          <a className="vv-btn vv-btn-pink" href={`/admin?${q}&tab=warteliste&do=approve&u=${encodeURIComponent(u.username)}`}>✓ Frei</a>
          <a className="vv-btn" href={`/admin?${q}&tab=warteliste&do=reject&u=${encodeURIComponent(u.username)}&ip=${encodeURIComponent(u.regIp || "")}`}>✕ +IP-Sperre</a>
        </div>
      ))}
    </div>
  );
}

function Mitglieder({ q }) {
  const approved = listUsersByStatus("approved");
  const blocked = listUsersByStatus("blocked");
  return (
    <>
      <div className="vv-card">
        <h3>✅ Aktive Mitglieder ({approved.length})</h3>
        {approved.length === 0 && <div className="vv-muted">Noch keine.</div>}
        {approved.map((u) => (
          <div className="vv-admin-row" key={u.username}>
            <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{u.displayName}</strong> <span className="vv-muted">@{u.username}</span>
            </div>
            <a className="vv-btn" href={`/admin?${q}&tab=userakte&u=${encodeURIComponent(u.username)}`}>📁 Akte</a>
            <a className="vv-btn" href={`/admin?${q}&tab=banns&do=ban&u=${encodeURIComponent(u.username)}&btype=comm&dur=1d`}>🔇 1T Mute</a>
            <a className="vv-btn" href={`/admin?${q}&tab=mitglieder&do=block&u=${encodeURIComponent(u.username)}&ip=${encodeURIComponent(u.regIp || "")}`}>🚫 Sperren</a>
            <a className="vv-btn" style={{ color: "#a00", fontWeight: "bold" }} href={`/admin?${q}&tab=mitglieder&do=delete&u=${encodeURIComponent(u.username)}`}>🗑 Löschen</a>
          </div>
        ))}
      </div>
      {blocked.length > 0 && (
        <div className="vv-card">
          <h3>🚫 Gesperrte Accounts ({blocked.length})</h3>
          {blocked.map((u) => (
            <div className="vv-admin-row" key={u.username}>
              <div style={{ flex: 1 }}><strong>{u.displayName}</strong> <span className="vv-muted">@{u.username}</span></div>
              <a className="vv-btn vv-btn-pink" href={`/admin?${q}&tab=mitglieder&do=approve&u=${encodeURIComponent(u.username)}`}>✓ Entsperren</a>
              <a className="vv-btn" style={{ color: "#a00", fontWeight: "bold" }} href={`/admin?${q}&tab=mitglieder&do=delete&u=${encodeURIComponent(u.username)}`}>🗑 Löschen</a>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function picSource(reason) {
  if (!reason) return "Fidolin-KI";
  if (reason.includes("Auto-Freigabe")) return "⚠ Auto (10-Min-Frist, ungeprüft)";
  if (reason.includes("Admin")) return "Admin";
  return "Fidolin-KI";
}

function Profilbilder({ q }) {
  const pending = listPendingPics();
  const rejected = listRejectedPics();
  const approved = listApprovedPics(80);
  return (
    <>
      <div className="vv-card">
        <h3>🖼 Wartet auf Freigabe ({pending.length})</h3>
        <div className="vv-muted" style={{ fontSize: 12 }}>Fidolin (KI) entscheidet beim Hochladen streng. Unklare/ungeprüfte Bilder bleiben hier in Prüfung, bis du freigibst – nichts wird automatisch öffentlich.</div>
        {pending.length === 0 && <div className="vv-muted vv-mt-8">Keine offenen Profilbilder.</div>}
        <div className="vv-row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          {pending.map((p) => (
            <div key={p.id} style={{ textAlign: "center", width: 130 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.username} style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 10, border: "2px solid #eee" }} />
              <div style={{ fontSize: 12 }}><strong>@{p.username}</strong></div>
              <div className="vv-row" style={{ gap: 4, justifyContent: "center", marginTop: 4 }}>
                <a className="vv-btn vv-btn-pink" href={`/admin?${q}&tab=profilbilder&do=avApprove&pic=${p.id}`}>✓</a>
                <a className="vv-btn" style={{ color: "#a00" }} href={`/admin?${q}&tab=profilbilder&do=avReject&pic=${p.id}`}>✕</a>
              </div>
            </div>
          ))}
        </div>
      </div>
      {rejected.length > 0 && (
        <div className="vv-card">
          <h3>🚫 Abgelehnte Bilder ({rejected.length})</h3>
          <div className="vv-muted" style={{ fontSize: 12 }}>Du kannst ein abgelehntes Bild nachträglich doch freigeben.</div>
          <div className="vv-row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
            {rejected.map((p) => (
              <div key={p.id} style={{ textAlign: "center", width: 130 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.username} style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 10, border: "2px solid #fdd", filter: "grayscale(0.4)" }} />
                <div style={{ fontSize: 12 }}><strong>@{p.username}</strong></div>
                <div className="vv-muted" style={{ fontSize: 10 }}>{p.reason}</div>
                <a className="vv-btn vv-btn-pink vv-mt-8" href={`/admin?${q}&tab=profilbilder&do=avApprove&pic=${p.id}`}>✓ Doch freigeben</a>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="vv-card">
        <h3>✅ Freigegebene Bilder ({approved.length})</h3>
        <div className="vv-muted" style={{ fontSize: 12 }}>Kontrolle aller aktiven Profilbilder – auch die, die Fidolin automatisch durchgewinkt hat. Du kannst jedes nachträglich zurückziehen.</div>
        {approved.length === 0 && <div className="vv-muted vv-mt-8">Noch keine freigegebenen Bilder.</div>}
        <div className="vv-row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          {approved.map((p) => (
            <div key={p.id} style={{ textAlign: "center", width: 130 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.username} style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 10, border: p.isPrimary ? "2px solid #ff3e9d" : "2px solid #cfc" }} />
              <div style={{ fontSize: 12 }}>{p.isPrimary ? "⭐ " : ""}<strong>@{p.username}</strong></div>
              <div className="vv-muted" style={{ fontSize: 10 }}>{picSource(p.reason)}</div>
              <a className="vv-btn vv-mt-8" style={{ color: "#a00" }} href={`/admin?${q}&tab=profilbilder&do=avReject&pic=${p.id}`}>✕ Zurückziehen</a>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Fotos({ q }) {
  const pending = listPendingPhotos();
  const rejected = listRejectedPhotos();
  return (
    <>
      <div className="vv-card">
        <h3>📷 Fotos – wartet auf Freigabe ({pending.length})</h3>
        <div className="vv-muted" style={{ fontSize: 12 }}>Album-Fotos werden von Fidolin (KI) streng geprüft. Unklare/ungeprüfte Fotos bleiben in Prüfung, bis du freigibst – erst danach öffentlich sichtbar.</div>
        {pending.length === 0 && <div className="vv-muted vv-mt-8">Keine offenen Fotos.</div>}
        <div className="vv-row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          {pending.map((p) => (
            <div key={p.id} style={{ textAlign: "center", width: 150 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 10, border: "2px solid #eee" }} />
              <div style={{ fontSize: 12 }}><strong>@{p.username}</strong></div>
              {p.caption && <div className="vv-muted" style={{ fontSize: 10 }}>{p.caption}</div>}
              <div className="vv-row" style={{ gap: 4, justifyContent: "center", marginTop: 4 }}>
                <a className="vv-btn vv-btn-pink" href={`/admin?${q}&tab=fotos&do=phApprove&pid=${p.id}`}>✓</a>
                <a className="vv-btn" style={{ color: "#a00" }} href={`/admin?${q}&tab=fotos&do=phReject&pid=${p.id}`}>✕</a>
              </div>
            </div>
          ))}
        </div>
      </div>
      {rejected.length > 0 && (
        <div className="vv-card">
          <h3>🚫 Abgelehnte Fotos ({rejected.length})</h3>
          <div className="vv-row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
            {rejected.map((p) => (
              <div key={p.id} style={{ textAlign: "center", width: 150 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 10, border: "2px solid #fdd", filter: "grayscale(0.4)" }} />
                <div style={{ fontSize: 12 }}><strong>@{p.username}</strong></div>
                <div className="vv-muted" style={{ fontSize: 10 }}>{p.reason}</div>
                <a className="vv-btn vv-btn-pink vv-mt-8" href={`/admin?${q}&tab=fotos&do=phApprove&pid=${p.id}`}>✓ Doch freigeben</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Meldungen({ q }) {
  const reports = listOpenReports(60);
  return (
    <div className="vv-card">
      <h3 style={{ marginTop: 0 }}>🚩 Gemeldete Nachrichten ({reports.length})</h3>
      {reports.length === 0 && <div className="vv-muted vv-mt-8">Keine offenen Meldungen. ✨</div>}
      {reports.map((r) => {
        const snippet = getReportSnippet(r.messageId, 5);
        return (
          <div key={r.id} style={{ borderTop: "1px solid #eee", paddingTop: 10, marginTop: 10 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              Gemeldet von <strong>@{r.reporterUsername}</strong> · {relTime(r.at)}
              {r.reason ? <> · Grund: <em>„{r.reason}"</em></> : null}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              Konversation: <strong>@{r.senderUsername}</strong> ↔ <strong>@{r.receiverUsername}</strong>
            </div>
            <div style={{ background: "#f6f6fa", padding: 8, borderRadius: 8 }}>
              {snippet.map((m) => {
                const isReported = m.id === r.messageId;
                return (
                  <div key={m.id} style={{
                    fontSize: 12, padding: "3px 6px",
                    borderLeft: isReported ? "3px solid #ff3e9d" : "3px solid transparent",
                    background: isReported ? "#fff5fb" : "transparent",
                  }}>
                    <strong>@{m.from_user_id === r.senderId ? r.senderUsername : r.receiverUsername}</strong>:{" "}
                    {m.kind === "voice" ? <em>🎤 Sprachnachricht</em> : null}
                    {m.imageUrl ? <em>📷 [Bild]</em> : null}
                    {m.text || ""}
                  </div>
                );
              })}
            </div>
            <div className="vv-row vv-mt-8" style={{ flexWrap: "wrap", gap: 6 }}>
              <a className="vv-btn" style={{ color: "#a00" }} href={`/admin?${q}&tab=banns&do=ban&u=${encodeURIComponent(r.senderUsername)}&btype=comm&dur=1d`}>🔇 1 Tag mute (@{r.senderUsername})</a>
              <a className="vv-btn" style={{ color: "#a00", fontWeight: "bold" }} href={`/admin?${q}&tab=banns&do=ban&u=${encodeURIComponent(r.senderUsername)}&btype=full&dur=perm`}>⛔ Permanent bannen</a>
              <a className="vv-btn" href={`/admin?${q}&tab=userakte&u=${encodeURIComponent(r.senderUsername)}`}>📁 Userakte</a>
              <div className="vv-spacer" />
              <a className="vv-btn vv-btn-pink" href={`/admin?${q}&tab=meldungen&do=resolveReport&rid=${r.id}`}>✓ Erledigt</a>
              <a className="vv-btn" href={`/admin?${q}&tab=meldungen&do=dismissReport&rid=${r.id}`}>✕ Verwerfen</a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Banns({ q, pw }) {
  const active = listActiveSanctions();
  const TYPE_LABEL = { comm: "Kommunikationsbann", profile: "Profil-Einschränkung", full: "Komplett-Bann" };
  return (
    <>
      <div className="vv-card">
        <h3>🔨 Bann verhängen</h3>
        <form method="GET" action="/admin" className="vv-mt-8" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input type="hidden" name="pw" value={pw} />
          <input type="hidden" name="tab" value="banns" />
          <input type="hidden" name="do" value="ban" />
          <input className="vv-input" name="u" placeholder="Benutzername" style={{ width: 160 }} required />
          <select name="btype" className="vv-input">
            <option value="comm">Kommunikationsbann (kann nicht schreiben)</option>
            <option value="profile">Profil-Einschränkung</option>
            <option value="full">Komplett-Bann (kein Login)</option>
          </select>
          <select name="dur" className="vv-input" defaultValue="1d">
            <option value="10m">10 Minuten</option>
            <option value="1h">1 Stunde</option>
            <option value="6h">6 Stunden</option>
            <option value="1d">1 Tag</option>
            <option value="3d">3 Tage</option>
            <option value="1w">1 Woche</option>
            <option value="1mo">1 Monat</option>
            <option value="6mo">6 Monate</option>
            <option value="1y">1 Jahr</option>
            <option value="perm">Permanent</option>
          </select>
          <button type="submit" className="vv-btn vv-btn-pink">Bann verhängen</button>
        </form>
      </div>
      <div className="vv-card">
        <h3>Aktive Banns ({active.length})</h3>
        {active.length === 0 && <div className="vv-muted">Keine aktiven Banns.</div>}
        {active.map((s) => (
          <div className="vv-admin-row" key={s.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>@{s.username}</strong> · {TYPE_LABEL[s.type] || s.type}
              <div className="vv-muted" style={{ fontSize: 11 }}>
                {untilLabel(s.until)} · von {s.by} · {s.reason}
              </div>
            </div>
            <a className="vv-btn" href={`/admin?${q}&tab=banns&do=liftban&sid=${s.id}`}>Aufheben</a>
          </div>
        ))}
      </div>
    </>
  );
}

function Geraete({ q }) {
  const devices = listDevices(150);
  const bans = listDeviceBans();
  return (
    <>
      <div className="vv-card">
        <h3>📱 Geräte ({devices.length})</h3>
        <div className="vv-muted" style={{ fontSize: 12 }}>Ein gebanntes Gerät kann sich nicht mehr anmelden oder registrieren.</div>
        {devices.length === 0 && <div className="vv-muted vv-mt-8">Noch keine Geräte erfasst.</div>}
        {devices.map((d) => (
          <div className="vv-admin-row" key={d.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{d.username || "—"}</strong> <span className="vv-muted">{deviceLabel(d.user_agent)}</span>
              <div className="vv-muted" style={{ fontSize: 11 }}>IP: {d.ip || "?"} · {relTime(d.last_seen)} · <code style={{ fontSize: 10 }}>{String(d.id).slice(0, 10)}…</code></div>
            </div>
            {d.banned
              ? <a className="vv-btn" href={`/admin?${q}&tab=geraete&do=unbanDevice&dev=${encodeURIComponent(d.id)}`}>Entsperren</a>
              : <a className="vv-btn" style={{ color: "#a00", fontWeight: "bold" }} href={`/admin?${q}&tab=geraete&do=banDevice&dev=${encodeURIComponent(d.id)}`}>🔒 Geräte-Bann</a>}
          </div>
        ))}
      </div>
      {bans.length > 0 && (
        <div className="vv-card">
          <h3>🔒 Gesperrte Geräte ({bans.length})</h3>
          {bans.map((b) => (
            <div className="vv-admin-row" key={b.id}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{b.username || "—"}</strong> <span className="vv-muted">{b.reason} · {untilLabel(b.until)}</span>
                <div className="vv-muted" style={{ fontSize: 10 }}><code>{String(b.id).slice(0, 14)}…</code></div>
              </div>
              <a className="vv-btn" href={`/admin?${q}&tab=geraete&do=unbanDevice&dev=${encodeURIComponent(b.id)}`}>Entsperren</a>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Userakte({ q, pw, uParam }) {
  const user = uParam ? getUserByUsername(uParam) : null;
  const log = user ? getUserDossier(user.id, 120) : [];
  return (
    <div className="vv-card">
      <h3>📁 Userakte</h3>
      <form method="GET" action="/admin" className="vv-row vv-mt-8">
        <input type="hidden" name="pw" value={pw} />
        <input type="hidden" name="tab" value="userakte" />
        <input className="vv-input" name="u" placeholder="Benutzername eingeben…" defaultValue={uParam} />
        <button type="submit" className="vv-btn vv-btn-pink">Anzeigen</button>
      </form>
      {uParam && !user && <div className="vv-muted vv-mt-12">Kein Nutzer „{uParam}" gefunden.</div>}
      {user && (
        <>
          <div className="vv-row vv-mt-12" style={{ alignItems: "center", gap: 8 }}>
            <Avatar url={user.avatarUrl} name={user.displayName} className="vv-avatar vv-avatar-sm" />
            <div style={{ flex: 1 }}>
              <strong>{user.displayName}</strong> <span className="vv-muted">@{user.username}</span> · <GenderAge gender={user.gender} age={user.age} /> · Status: {user.status}
            </div>
            <a className="vv-btn" href={`/admin?${q}&tab=userakte&do=liftall&u=${encodeURIComponent(user.username)}`}>Alle Banns aufheben</a>
          </div>

          <form method="GET" action="/admin" className="vv-row vv-mt-8" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input type="hidden" name="pw" value={pw} />
            <input type="hidden" name="tab" value="userakte" />
            <input type="hidden" name="u" value={user.username} />
            <input type="hidden" name="do" value="setvitals" />
            <span className="vv-muted" style={{ fontSize: 12 }}>Stammdaten ändern:</span>
            <select name="g" className="vv-input" defaultValue={user.gender || ""}>
              <option value="">– Geschlecht –</option>
              <option value="m">m</option>
              <option value="w">w</option>
            </select>
            <input type="date" name="bd" className="vv-input" defaultValue={user.birthdate || ""} max={new Date().toISOString().slice(0, 10)} />
            <button type="submit" className="vv-btn">Speichern</button>
          </form>
          <div className="vv-mt-12">
            {log.length === 0 && <div className="vv-muted">Keine Einträge – sauberer Nutzer. 🌟</div>}
            {log.map((m) => (
              <div className="vv-admin-row" key={m.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: "bold" }}>{m.by}</span>{" "}
                  <span className="vv-muted">{m.kind} · {m.decision}</span>
                  {m.reason ? <div className="vv-muted" style={{ fontSize: 11 }}>{m.reason}</div> : null}
                  {m.content ? <div style={{ fontSize: 11, color: "#666" }}>„{m.content}"</div> : null}
                </div>
                <span className="vv-muted" style={{ fontSize: 11 }}>{relTime(m.created_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function IpSperren({ q, pw }) {
  const blockedIps = listBlockedIps();
  return (
    <div className="vv-card">
      <h3>⛔ IP-Blacklist ({blockedIps.length})</h3>
      <form method="GET" action="/admin" className="vv-row vv-mt-8">
        <input type="hidden" name="pw" value={pw} />
        <input type="hidden" name="tab" value="ips" />
        <input type="hidden" name="do" value="blockip" />
        <input className="vv-input" name="ip" placeholder="IP-Adresse sperren..." />
        <button type="submit" className="vv-btn vv-btn-pink">Sperren</button>
      </form>
      <div className="vv-mt-12">
        {blockedIps.length === 0 && <div className="vv-muted">Keine gesperrten IPs.</div>}
        {blockedIps.map((b) => (
          <div className="vv-admin-row" key={b.ip}>
            <div style={{ flex: 1 }}><code>{b.ip}</code> <span className="vv-muted">{b.reason} · {relTime(b.at)}</span></div>
            <a className="vv-btn" href={`/admin?${q}&tab=ips&do=unblockip&ip=${encodeURIComponent(b.ip)}`}>Entsperren</a>
          </div>
        ))}
      </div>
    </div>
  );
}

const VIBES_REASON_LABEL = {
  daily: "🎁 Tages-Bonus",
  gruscheln_send: "🫶 Gegruschelt",
  gruscheln_recv: "🫶 Wurde gegruschelt",
  pinnwand: "📌 Pinnwand-Beitrag",
  gift_send: "🎀 Geschenk verschickt",
  gift_recv: "🎀 Geschenk bekommen",
  like_recv: "❤️ Like bekommen",
  photo_upload: "📷 Foto hochgeladen",
  admin_grant: "👑 Admin-Gutschrift",
};

function VibesLog({ q, pw }) {
  const recent = listAllVibesTx({ limit: 80 });
  const top = topVibesEarners(15);
  const suspicious = suspiciousVibesPatterns();
  const pairs = vibesGiftPairs(20);
  const blocked = listEarnBlockedUsers();

  return (
    <>
      {/* KI-Block-Liste */}
      {blocked.length > 0 && (
        <div className="vv-card" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
          <h3>🤖 Von KI gesperrte Earn-Konten ({blocked.length})</h3>
          <p className="vv-muted" style={{ fontSize: 12 }}>
            Diese User dürfen aktuell keine Vibes durch Aktivität verdienen. Daily-Bonus + Admin-Gutschrift gehen weiter.
          </p>
          {blocked.map((b) => (
            <div key={b.userId} className="vv-admin-row">
              <a href={`/admin?${q}&tab=userakte&u=${encodeURIComponent(b.username)}`} style={{ color: "#92400e", flex: 1, fontWeight: 600 }}>@{b.username}</a>
              <span style={{ fontSize: 12, color: "#92400e" }}>{b.reason || "—"}</span>
              <span style={{ fontSize: 11, color: "#666" }}>bis {new Date(b.until).toLocaleString("de-DE")}</span>
              <a className="vv-btn" href={`/admin?${q}&tab=vibeslog&do=unblockEarn&u=${encodeURIComponent(b.username)}`}>Aufheben</a>
            </div>
          ))}
        </div>
      )}

      {/* Manueller Buchungs-Block */}
      <div className="vv-card">
        <h3>👑 Vibes manuell buchen</h3>
        <p className="vv-muted" style={{ fontSize: 12, marginTop: 4 }}>
          Positiver Betrag = gutschreiben. Negativ = abziehen. Umgeht alle Anti-Inflation-Limits.
        </p>
        <form method="GET" action="/admin" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 2fr auto", gap: 6, marginTop: 8 }}>
          <input type="hidden" name="pw" value={pw} />
          <input type="hidden" name="tab" value="vibeslog" />
          <input type="hidden" name="do" value="grantVibes" />
          <input className="vv-input" name="u" placeholder="Username" required />
          <input className="vv-input" name="amt" type="number" placeholder="±N" required />
          <input className="vv-input" name="r" placeholder="Grund (optional)" />
          <button type="submit" className="vv-btn vv-btn-pink">✨ Buchen</button>
        </form>
      </div>

      {/* Top-Sammler */}
      <div className="vv-card">
        <h3>🏆 Top-Sammler ({top.length})</h3>
        {top.length === 0 ? <div className="vv-muted">Noch keine Daten.</div> : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left", color: "#666" }}>
              <th>User</th><th>Saldo</th><th>Total</th><th>Streak</th>
            </tr></thead>
            <tbody>
              {top.map((t) => (
                <tr key={t.userId} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "6px 0" }}>
                    <a href={`/admin?${q}&tab=userakte&u=${encodeURIComponent(t.username)}`} style={{ color: "#1f5fa8" }}>
                      {t.displayName} <span className="vv-muted">@{t.username}</span>
                    </a>
                  </td>
                  <td>✨ {t.balance}</td>
                  <td>{t.totalEarned}</td>
                  <td>🔥 {t.streak || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Verdächtige Muster */}
      {suspicious.length > 0 && (
        <div className="vv-card" style={{ background: "#fff5f5", borderColor: "#fecaca" }}>
          <h3 style={{ color: "#b91c1c" }}>🚨 Verdächtige Vibes-Muster (24h)</h3>
          <p className="vv-muted" style={{ fontSize: 12 }}>
            Mehr als 20 Earns in 24h. Multi-Account-Verdacht prüfen.
          </p>
          {suspicious.map((s) => (
            <div key={s.userId} className="vv-admin-row">
              <a href={`/admin?${q}&tab=userakte&u=${encodeURIComponent(s.username)}`} style={{ color: "#b91c1c", flex: 1, fontWeight: 600 }}>
                @{s.username}
              </a>
              <span style={{ fontSize: 12, color: "#666" }}>
                {s.earnCount} Earns · +{s.totalEarned24h} ✨ · {s.uniqueRefs} eindeutige Quellen
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Häufigste Sender→Empfänger-Paare (Multi-Account-Detector) */}
      {pairs.length > 0 && (
        <div className="vv-card">
          <h3>🔗 Häufige Sender→Empfänger (7 Tage)</h3>
          <p className="vv-muted" style={{ fontSize: 12 }}>
            Wenn dieselbe Person sehr oft Vibes von derselben Quelle bekommt: Multi-Account-Check.
          </p>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left", color: "#666" }}>
              <th>Empfänger</th><th>Sender</th><th>Anzahl</th><th>Summe</th>
            </tr></thead>
            <tbody>
              {pairs.map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                  <td>@{p.recipient}</td>
                  <td>@{p.sender || "?"}</td>
                  <td>{p.gifts}</td>
                  <td>+{p.sumAmount} ✨</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Letzte Transaktionen */}
      <div className="vv-card">
        <h3>📜 Letzte 80 Transaktionen</h3>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead><tr style={{ textAlign: "left", color: "#666" }}>
            <th>Zeit</th><th>User</th><th>Grund</th><th style={{ textAlign: "right" }}>Betrag</th>
          </tr></thead>
          <tbody>
            {recent.map((t) => (
              <tr key={t.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: "5px 0", color: "#888", whiteSpace: "nowrap" }}>{relTime(t.at)}</td>
                <td>
                  <a href={`/admin?${q}&tab=userakte&u=${encodeURIComponent(t.username)}`} style={{ color: "#1f5fa8" }}>
                    @{t.username}
                  </a>
                </td>
                <td>{VIBES_REASON_LABEL[t.reason] || t.reason}</td>
                <td style={{ textAlign: "right", color: t.amount > 0 ? "#0d8a3f" : "#c2185b", fontWeight: 600 }}>
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AuditLog({ q }) {
  const recent = listAuditLog({ limit: 150 });
  return (
    <div className="vv-card">
      <h3>📜 Audit-Log ({recent.length})</h3>
      <p className="vv-muted" style={{ fontSize: 12 }}>
        Sicherheits- und Aktivitäts-Events: Login, 2FA, Push, Anrufe, Sanktionen.
      </p>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead><tr style={{ textAlign: "left", color: "#666" }}>
          <th>Zeit</th><th>User</th><th>Aktion</th><th>IP</th><th>Detail</th>
        </tr></thead>
        <tbody>
          {recent.map((a) => (
            <tr key={a.id} style={{ borderTop: "1px solid #eee" }}>
              <td style={{ padding: "5px 4px", color: "#888", whiteSpace: "nowrap" }}>{relTime(a.at)}</td>
              <td>
                {a.username
                  ? <a href={`/admin?${q}&tab=userakte&u=${encodeURIComponent(a.username)}`} style={{ color: "#1f5fa8" }}>@{a.username}</a>
                  : <span className="vv-muted">—</span>}
              </td>
              <td><code style={{ fontSize: 11, color: a.action.includes("fail") ? "#c2185b" : a.action.includes(".ok") ? "#0d8a3f" : "#444" }}>{a.action}</code></td>
              <td style={{ color: "#666", fontSize: 11 }}>{a.ip || "—"}</td>
              <td style={{ color: "#666", fontSize: 11 }}>{a.detail || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
