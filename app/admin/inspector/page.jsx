"use client";

export const dynamic = "force-dynamic";

// 🔍 Admin-Inspector — User suchen, Profil komplett einsehen, Aktionen ausführen.

import { useEffect, useState } from "react";
import Link from "next/link";

const PW_KEY = "vv_admin_pw";

export default function InspectorPage() {
  const [pw, setPw] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PW_KEY);
      if (saved) { setPw(saved); setUnlocked(true); }
    } catch {}
  }, []);

  useEffect(() => { if (unlocked && !users) search(""); }, [unlocked]); // eslint-disable-line

  async function search(query) {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/inspector?q=${encodeURIComponent(query)}`, {
        headers: { "x-admin-password": pw },
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setUsers({ error: d.error || `HTTP ${r.status}` });
      } else {
        const d = await r.json();
        setUsers(d.users);
      }
    } catch (e) {
      setUsers({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function inspect(id) {
    setSelectedId(id);
    setInspection({ loading: true });
    try {
      const r = await fetch(`/api/admin/inspector?id=${id}`, {
        headers: { "x-admin-password": pw },
      });
      const d = await r.json();
      if (!r.ok) {
        setInspection({ error: d.error || `HTTP ${r.status}` });
      } else {
        setInspection(d);
      }
    } catch (e) {
      setInspection({ error: e.message });
    }
  }

  async function grantVibes(amount) {
    if (!inspection?.user) return;
    const reason = prompt("Begründung:", "admin_grant");
    if (reason === null) return;
    try {
      const r = await fetch("/api/admin/grant-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({
          username: inspection.user.username,
          amount,
          reason: reason || "admin_grant",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setActionMsg(`✓ ${amount > 0 ? "+" : ""}${amount} ✨ — Neuer Saldo: ${d.newBalance}`);
      await inspect(inspection.user.id);
    } catch (e) {
      setActionMsg(`⚠ ${e.message}`);
    } finally {
      setTimeout(() => setActionMsg(null), 4000);
    }
  }

  function unlock(e) {
    e.preventDefault();
    if (!pw.trim()) return;
    try { sessionStorage.setItem(PW_KEY, pw); } catch {}
    setUnlocked(true);
  }
  function lock() {
    try { sessionStorage.removeItem(PW_KEY); } catch {}
    setPw(""); setUnlocked(false); setUsers(null); setInspection(null);
  }

  if (!unlocked) {
    return (
      <div style={shell}>
        <Hero />
        <Card>
          <h2 style={{ marginTop: 0 }}>🔐 Admin-Login</h2>
          <form onSubmit={unlock}>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
              placeholder="Admin-Passwort" autoFocus style={input} />
            <button type="submit" style={primary}>🔓 Entsperren</button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div style={shell}>
      <Hero />
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <form onSubmit={(e) => { e.preventDefault(); search(q); }} style={{ display: "flex", gap: 8, flex: 1 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 Username, Name, E-Mail oder ID"
            style={{ ...input, flex: 1, marginBottom: 0 }} />
          <button type="submit" style={primary}>{loading ? "⏳" : "Suchen"}</button>
        </form>
        <button onClick={lock} style={ghost}>🔒 Sperren</button>
      </div>

      {actionMsg && (
        <Card style={{
          background: actionMsg.startsWith("⚠") ? "#fee2e2" : "#dcfce7",
          color: actionMsg.startsWith("⚠") ? "#991b1b" : "#166534",
          fontWeight: 700, marginBottom: 12,
        }}>{actionMsg}</Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)", gap: 12 }} className="vv-insp-grid">
        {/* Linke Spalte: User-Liste */}
        <div>
          {!users && <Card><div style={muted}>⏳ Lade…</div></Card>}
          {users?.error && <Card><div style={{ color: "#dc2626" }}>⚠ {users.error}</div></Card>}
          {Array.isArray(users) && users.length === 0 && (
            <Card><div style={muted}>Keine User gefunden.</div></Card>
          )}
          {Array.isArray(users) && users.map((u) => (
            <button key={u.id} onClick={() => inspect(u.id)} style={{
              ...userRow,
              border: selectedId === u.id ? "2px solid #ec4899" : "1px solid rgba(0,0,0,0.06)",
              background: selectedId === u.id ? "#fdf2f8" : "rgba(255,255,255,0.95)",
            }}>
              <span style={{ fontSize: 24 }}>{u.emoji || "👤"}</span>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#1f2937" }}>
                  {u.displayName || u.username}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  @{u.username} · ID {u.id} · {u.status || "active"}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Rechte Spalte: Inspection */}
        <div>
          {!inspection && <Card><div style={muted}>👈 Wähle einen User aus der Liste.</div></Card>}
          {inspection?.loading && <Card><div style={muted}>⏳ Lade Inspektion…</div></Card>}
          {inspection?.error && <Card><div style={{ color: "#dc2626" }}>⚠ {inspection.error}</div></Card>}
          {inspection?.user && <UserInspection insp={inspection} onGrant={grantVibes} />}
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .vv-insp-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function UserInspection({ insp, onGrant }) {
  const { user, credits, txLog, achievements, counts, coms, sessions, sanctions, modLog, rank } = insp;
  return (
    <>
      {/* Header */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 48 }}>{user.emoji || "👤"}</span>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, color: "#1f2937" }}>{user.displayName || user.username}</h2>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              <Link href={`/u/${user.username}`} style={{ color: "#ec4899", fontWeight: 700 }}>@{user.username}</Link>
              {" "}· ID {user.id} · Status: <b>{user.status || "active"}</b>
            </div>
          </div>
        </div>
        <KV k="E-Mail" v={user.email} />
        <KV k="Anmelde-Datum" v={user.createdAt ? new Date(user.createdAt).toLocaleString("de-DE") : "—"} />
        <KV k="Letzter Login" v={user.lastSeen ? new Date(user.lastSeen).toLocaleString("de-DE") : "—"} />
        <KV k="Geschlecht" v={user.gender || "—"} />
        <KV k="Geburtstag" v={user.birthdate || "—"} />
        <KV k="Status-Text" v={user.mood || "—"} />
      </Card>

      {/* Vibes */}
      <Card>
        <h3 style={h3}>✨ Vibes & Saldo</h3>
        <KV k="Aktueller Saldo" v={credits?.balance != null ? `${credits.balance} ✨` : "—"} />
        <KV k="Gesamt verdient" v={credits?.totalEarned != null ? `${credits.totalEarned} ✨` : "—"} />
        <KV k="Daily-Streak" v={credits?.dailyStreak != null ? `🔥 ${credits.dailyStreak}` : "—"} />
        <KV k="Letzter Daily" v={credits?.lastDailyAt ? new Date(credits.lastDailyAt).toLocaleString("de-DE") : "—"} />
        {rank && <KV k="XP" v={rank.xp != null ? rank.xp.toLocaleString("de-DE") : "—"} />}

        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {[100, 500, 1000, 5000, -100, -500].map((n) => (
            <button key={n} onClick={() => onGrant(n)} style={{
              ...preset,
              background: n > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff",
            }}>{n > 0 ? "+" : ""}{n} ✨</button>
          ))}
        </div>
      </Card>

      {/* Tx-Log */}
      {txLog?.length > 0 && (
        <Card>
          <h3 style={h3}>📋 Letzte Transaktionen ({txLog.length})</h3>
          <div style={{ maxHeight: 250, overflowY: "auto" }}>
            {txLog.map((tx, i) => (
              <div key={i} style={txRow}>
                <span style={{
                  fontWeight: 800, color: tx.amount > 0 ? "#16a34a" : "#dc2626",
                  minWidth: 60, fontSize: 13,
                }}>{tx.amount > 0 ? "+" : ""}{tx.amount}</span>
                <span style={{ flex: 1, fontSize: 12, color: "#475569" }}>{tx.reason || "—"}</span>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>
                  {tx.at ? new Date(tx.at).toLocaleString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Aktivitäts-Zähler */}
      <Card>
        <h3 style={h3}>📊 Aktivität</h3>
        <KV k="Pinnwand-Einträge geschrieben" v={counts.pinnwand} />
        <KV k="Buschfunk-Posts" v={counts.buschfunkPosts} />
        <KV k="Geschenke verschickt" v={counts.giftsSent} />
        <KV k="Geschenke erhalten" v={counts.giftsReceived} />
        <KV k="Nachrichten gesendet" v={counts.messagesSent} />
        <KV k="Fotos hochgeladen" v={counts.photos} />
        <KV k="Freunde" v={counts.friends} />
        <KV k="Com-Mitgliedschaften" v={counts.coms} />
        <KV k="Profil-Besuche getätigt" v={counts.visits} />
        <KV k="Profil-Besuche erhalten" v={counts.visitedBy} />
      </Card>

      {/* Coms */}
      {coms?.length > 0 && (
        <Card>
          <h3 style={h3}>🌐 Coms ({coms.length})</h3>
          {coms.map((c) => (
            <div key={c.slug} style={listRow}>
              <span style={{ fontSize: 18 }}>{c.emoji || "👥"}</span>
              <Link href={`/coms/${c.slug}`} style={{ flex: 1, color: "#ec4899", fontWeight: 700, fontSize: 13 }}>{c.name}</Link>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 999,
                background: c.role === "owner" ? "#fbbf24" : c.role === "mod" ? "#c084fc" : "#e2e8f0",
                color: c.role === "owner" ? "#7c2d12" : c.role === "mod" ? "#581c87" : "#475569",
                fontWeight: 700,
              }}>{c.role}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Achievements */}
      {achievements?.length > 0 && (
        <Card>
          <h3 style={h3}>🏆 Auszeichnungen ({achievements.length})</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {achievements.map((a) => (
              <span key={a.slug} style={{
                background: "#fef3c7", color: "#92400e",
                padding: "4px 10px", borderRadius: 999,
                fontSize: 11, fontWeight: 700,
              }}>{a.slug}</span>
            ))}
          </div>
        </Card>
      )}

      {/* Sessions */}
      {sessions?.length > 0 && (
        <Card>
          <h3 style={h3}>🔑 Login-Sessions ({sessions.length})</h3>
          {sessions.slice(0, 10).map((s) => (
            <div key={s.id} style={txRow}>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#475569", minWidth: 120 }}>{s.ip || "—"}</span>
              <span style={{ flex: 1, fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(s.userAgent || "").slice(0, 60)}</span>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString("de-DE") : ""}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Sanctions */}
      {sanctions?.length > 0 && (
        <Card style={{ background: "#fee2e2" }}>
          <h3 style={{ ...h3, color: "#991b1b" }}>⚠ Strafen ({sanctions.length})</h3>
          {sanctions.map((s) => (
            <div key={s.id} style={{ ...txRow, background: "#fef2f2" }}>
              <b style={{ color: "#991b1b" }}>{s.kind}</b>
              <span style={{ flex: 1, fontSize: 12 }}>{s.reason}</span>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{new Date(s.createdAt).toLocaleDateString("de-DE")}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Mod-Log */}
      {modLog?.length > 0 && (
        <Card>
          <h3 style={h3}>📜 Mod-Aktionen über diesen User ({modLog.length})</h3>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {modLog.map((m) => (
              <div key={m.id} style={txRow}>
                <b style={{ minWidth: 80, fontSize: 12 }}>{m.action}</b>
                <span style={{ flex: 1, fontSize: 11, color: "#64748b" }}>{m.byAdmin ? "Admin" : "User"} · {m.details || "—"}</span>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{new Date(m.createdAt).toLocaleDateString("de-DE")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function Hero() {
  return (
    <div style={{
      background: "linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1)",
      backgroundSize: "200% 200%",
      animation: "vv-insp-shift 8s ease infinite",
      color: "#fff", padding: "20px 18px",
      borderRadius: 16, marginBottom: 14,
      boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.9, letterSpacing: 1.2, textTransform: "uppercase" }}>
        Admin · User-Inspector
      </div>
      <h1 style={{ margin: "4px 0 4px", fontSize: 24, fontWeight: 900, textShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
        🔍 Profil-Inspektion
      </h1>
      <div style={{ fontSize: 13, opacity: 0.95 }}>
        Username suchen → komplette Aktivität, Vibes, Coms, Login-Historie sehen + Aktionen ausführen.
      </div>
      <style>{`@keyframes vv-insp-shift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }`}</style>
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.95)",
      borderRadius: 14, padding: 14, marginBottom: 12,
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      ...style,
    }}>{children}</div>
  );
}

function KV({ k, v }) {
  return (
    <div style={{ display: "flex", padding: "4px 0", gap: 8, borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
      <span style={{ color: "#475569", flex: 1 }}>{k}</span>
      <span style={{ color: "#1f2937", fontWeight: 600, fontFamily: typeof v === "number" ? "monospace" : "inherit" }}>{v}</span>
    </div>
  );
}

const shell = { maxWidth: 1100, margin: "0 auto", padding: "12px 12px 100px" };
const input = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, marginBottom: 8,
};
const primary = {
  background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  color: "#fff", border: "none", padding: "9px 16px",
  borderRadius: 999, fontWeight: 800, fontSize: 13, cursor: "pointer",
  boxShadow: "0 4px 12px rgba(139,92,246,0.35)",
};
const ghost = {
  background: "#f1f5f9", color: "#475569", border: "1px solid rgba(0,0,0,0.06)",
  padding: "7px 14px", borderRadius: 999, fontWeight: 700, fontSize: 12, cursor: "pointer",
};
const preset = {
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#fff", border: "none", padding: "6px 12px",
  borderRadius: 999, fontWeight: 700, fontSize: 12, cursor: "pointer",
};
const userRow = {
  display: "flex", gap: 10, alignItems: "center", width: "100%",
  padding: "8px 10px", borderRadius: 10, marginBottom: 6,
  cursor: "pointer", transition: "all 0.12s",
};
const txRow = {
  display: "flex", gap: 8, alignItems: "center",
  padding: "5px 8px", marginBottom: 3, borderRadius: 6, background: "#f8fafc",
};
const listRow = {
  display: "flex", gap: 8, alignItems: "center",
  padding: "6px 0", borderBottom: "1px solid #f1f5f9",
};
const h3 = { marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1f2937" };
const muted = { color: "#64748b", fontSize: 13, textAlign: "center", padding: 20 };
