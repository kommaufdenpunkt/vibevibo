"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";
import { useMessageStream } from "@/lib/useEventStream";
import Avatar from "@/components/Avatar";
import PresenceAvatar from "@/components/PresenceAvatar";
import { ColoredName } from "@/components/GenderAge";
import CreateRoomDialog from "@/components/CreateRoomDialog";
import ActivityBars from "@/components/ActivityBars";
import OnlineName from "@/components/OnlineName";
import ViboPet from "@/components/ViboPet";
import QuestPanel from "@/components/QuestPanel";
import ShopPanel from "@/components/ShopPanel";
import CardCollection from "@/components/CardCollection";
import WorldMap from "@/components/WorldMap";
import { getPresence } from "@/lib/presence";
import { useTheme } from "@/lib/useTheme";
import { isOnlineActivity, formatLastActive, activityLabel, activityLevel } from "@/lib/activity";
import { getAutoLogoutMinutes, setAutoLogoutMinutes } from "@/components/IdleGuard";
import PwaInfo from "@/components/PwaInfo";
import InstallNow from "@/components/InstallNow";

const VALID_TABS = ["chats", "freunde", "vibo", "profil"];

function MessengerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { me, loading } = useMe();
  const [conversations, setConversations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("chats"); // chats | freunde | vibo | profil
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [theme, setTheme] = useTheme();
  const [autoLogout, setAutoLogout] = useState(0);

  // Tab reaktiv aus ?tab=... lesen — greift auch bei Klick aus dem Menü,
  // wenn man schon auf /messenger ist (Next.js remountet dann nicht).
  const tabParam = searchParams.get("tab");
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) setTab(tabParam);
  }, [tabParam]);

  // Tab-Wechsel hält die URL synchron (damit Reload + Back/Forward stimmen)
  function changeTab(next) {
    setTab(next);
    const url = next === "chats" ? "/messenger" : `/messenger?tab=${next}`;
    router.replace(url, { scroll: false });
  }

  useEffect(() => { setAutoLogout(getAutoLogoutMinutes()); }, []);

  async function reload() {
    if (!me) return;
    try {
      const [c, u, r] = await Promise.all([api.listConversations(), api.listUsers(), api.listRooms()]);
      setConversations(c.conversations || []);
      setUsers((u.users || []).filter((x) => x.username !== me.username));
      setRooms(r.rooms || []);
    } catch {}
  }

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, loading, router]);

  useMessageStream(!!me, { onMessage: reload, onRoomMessage: reload });

  const q = query.trim().toLowerCase();
  const filteredConvs = useMemo(() =>
    !q ? conversations : conversations.filter((c) =>
      (c.partnerDisplayName || "").toLowerCase().includes(q) ||
      (c.partnerUsername || "").toLowerCase().includes(q) ||
      (c.lastText || "").toLowerCase().includes(q)),
    [conversations, q]);
  const filteredRooms = useMemo(() =>
    !q ? rooms : rooms.filter((r) => (r.name || "").toLowerCase().includes(q)),
    [rooms, q]);
  const filteredUsers = useMemo(() => {
    const f = !q ? users : users.filter((u) =>
      (u.displayName || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.mood || "").toLowerCase().includes(q));
    return [...f].sort((a, b) => {
      // Aktivste oben: Stufe 5 → 0
      const la = activityLevel(a.lastSeen);
      const lb = activityLevel(b.lastSeen);
      if (la !== lb) return lb - la;
      return (b.lastSeen || 0) - (a.lastSeen || 0);
    });
  }, [users, q]);

  if (!me) return null;

  const totalUnread =
    conversations.reduce((s, c) => s + (c.unread || 0), 0) +
    rooms.reduce((s, r) => s + (r.unread || 0), 0);
  const onlineCount = users.filter((u) => isOnlineActivity(u.lastSeen)).length;

  return (
    <div className="vv-msgapp">
      {/* iOS-Style Header */}
      <header className="vv-msgapp-header">
        <div className="vv-msgapp-header-title">
          {tab === "chats" && "💬 Nachrichten"}
          {tab === "freunde" && "👥 Freunde"}
          {tab === "vibo" && "🥚 Mein VIBO"}
          {tab === "profil" && "🌟 Mein VibeVibo"}
        </div>
        <div className="vv-msgapp-header-actions">
          {tab === "chats" && (
            <button type="button" onClick={() => setCreating(true)} title="Neue Gruppe" aria-label="Neue Gruppe">+</button>
          )}
        </div>
      </header>

      {(tab === "chats" || tab === "freunde") && (
        <div className="vv-msgapp-search">
          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "chats" ? "🔍 In Chats suchen…" : "🔍 Person suchen…"}
            className="vv-msgapp-search-input"
          />
        </div>
      )}

      <main className="vv-msgapp-main">
        {tab === "chats" && (
          <>
            <div className="vv-msgapp-status">
              {totalUnread > 0
                ? <><strong>{totalUnread}</strong> ungelesen · {onlineCount} online</>
                : <>Alles gelesen · {onlineCount} online</>}
            </div>

            {filteredRooms.length > 0 && (
              <>
                <div className="vv-msgapp-section">Gruppen</div>
                {filteredRooms.map((r) => (
                  <Link key={r.id} href={`/messenger/rooms/${r.id}`} className="vv-msgapp-row">
                    <div className="vv-msgapp-row-icon" style={{ background: "linear-gradient(135deg,#f7e0b0,#ffd9ec)" }}>
                      <span style={{ fontSize: 22 }}>{r.emoji || "💬"}</span>
                      {r.unread > 0 && <span className="vv-msgapp-badge">{r.unread > 99 ? "99+" : r.unread}</span>}
                    </div>
                    <div className="vv-msgapp-row-body">
                      <div className="vv-msgapp-row-top">
                        <span className="vv-msgapp-row-name">{r.name}</span>
                        {r.lastAt && <span className="vv-msgapp-row-time">{relTime(r.lastAt)}</span>}
                      </div>
                      <div className="vv-msgapp-row-preview">
                        {r.lastText || <span style={{ color: "#aaa" }}>noch nichts geschrieben</span>}
                        <span style={{ marginLeft: 6, color: "#aaa", fontSize: 11 }}>· {r.memberCount}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </>
            )}

            {filteredConvs.length > 0 && (
              <>
                <div className="vv-msgapp-section">Chats</div>
                {filteredConvs.map((c) => (
                  <Link key={c.partnerUsername} href={`/messenger/${c.partnerUsername}`} className="vv-msgapp-row">
                    <div className="vv-msgapp-row-icon" style={{ background: "transparent" }}>
                      <Avatar url={c.partnerAvatar} name={c.partnerDisplayName} className="vv-avatar" style={{ width: 48, height: 48 }} />
                      {c.unread > 0 && <span className="vv-msgapp-badge">{c.unread > 99 ? "99+" : c.unread}</span>}
                    </div>
                    <div className="vv-msgapp-row-body">
                      <div className="vv-msgapp-row-top">
                        <span className="vv-msgapp-row-name">
                          <ColoredName gender={c.partnerGender} age={c.partnerAge} name={c.partnerDisplayName} />
                        </span>
                        <span className="vv-msgapp-row-time">{relTime(c.at)}</span>
                      </div>
                      <div className="vv-msgapp-row-preview" style={{ fontWeight: c.unread > 0 ? 600 : 400 }}>
                        {c.fromMe ? "Du: " : ""}{c.lastText}
                      </div>
                    </div>
                  </Link>
                ))}
              </>
            )}

            {filteredRooms.length === 0 && filteredConvs.length === 0 && (
              <div className="vv-msgapp-empty">
                {q ? "Nichts gefunden." : (
                  <>
                    <div style={{ fontSize: 50, marginBottom: 8 }}>💬</div>
                    Noch keine Chats. Wechsel auf <strong>Freunde</strong> und schreib jemandem!
                  </>
                )}
              </div>
            )}
          </>
        )}

        {tab === "freunde" && (
          <>
            <div className="vv-msgapp-status">
              {onlineCount} von {users.length} online
            </div>
            {filteredUsers.map((u) => {
              const onlineNow = isOnlineActivity(u.lastSeen);
              const presenceInfo = getPresence({ statusText: u.mood, presence: u.presence, online: onlineNow });
              return (
                <Link key={u.username} href={`/messenger/${u.username}`} className="vv-msgapp-row">
                  <div className="vv-msgapp-row-icon" style={{ background: "transparent" }}>
                    <PresenceAvatar url={u.avatarUrl} name={u.displayName} presenceInfo={presenceInfo} size={48} className="vv-avatar" />
                  </div>
                  <div className="vv-msgapp-row-body">
                    <div className="vv-msgapp-row-top">
                      <span className="vv-msgapp-row-name">
                        <OnlineName lastSeen={u.lastSeen}>
                          <ColoredName gender={u.gender} age={u.age} name={u.displayName} />
                        </OnlineName>
                      </span>
                      <span className="vv-msgapp-row-time" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <ActivityBars lastSeen={u.lastSeen} size="sm" title={activityLabel(activityLevel(u.lastSeen))} />
                      </span>
                    </div>
                    <div className="vv-msgapp-row-preview">
                      {onlineNow
                        ? (u.mood || <span style={{ color: "var(--vv-muted)" }}>{activityLabel(activityLevel(u.lastSeen))}</span>)
                        : <span style={{ color: "var(--vv-muted)" }}>zuletzt {formatLastActive(u.lastSeen)}{u.mood ? ` · „${u.mood}"` : ""}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="vv-msgapp-empty">Niemand gefunden.</div>
            )}
          </>
        )}

        {tab === "vibo" && (
          <>
            <QuestPanel />
            <ViboPet />

            {/* Karte direkt im VIBO-Tab — kompakte 420px-Variante */}
            <div className="vv-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid var(--vv-border,#eee)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 15 }}>🗺 Karte</h3>
                  <Link href="/karte" className="vv-btn vv-btn-sm">↗ Vollbild</Link>
                </div>
                <div className="vv-muted" style={{ fontSize: 11, marginTop: 4 }}>
                  Items einsammeln, Basar besuchen, fischen — auch in der Vollbild-Ansicht.
                </div>
              </div>
              <WorldMap compact />
            </div>

            <ShopPanel />
            <CardCollection />
          </>
        )}

        {tab === "profil" && (
          <div style={{ padding: "16px 14px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <Avatar url={me.avatarUrl} name={me.displayName} className="vv-avatar" style={{ width: 80, height: 80, margin: "0 auto" }} />
              <h2 style={{ margin: "10px 0 2px" }}>{me.displayName}</h2>
              <div className="vv-muted" style={{ fontSize: 13 }}>@{me.username}</div>
              {me.mood && <div style={{ marginTop: 8, fontSize: 14, fontStyle: "italic", color: "#666" }}>„{me.mood}"</div>}
            </div>

            <InstallNow appName="VV Messenger" appEmoji="💬" appColor="#2d7dd2" />
            <PwaInfo id="pwa-messenger" appName="VV Messenger"
              appEmoji="💬" appPurpose="den Messenger" />

            <div className="vv-msgapp-section">Privatsphäre</div>
            <div className="vv-msgapp-link-row">
              <span style={{ fontSize: 18 }}>⏱</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14 }}>Auto-Logout bei Inaktivität</div>
                <div style={{ fontSize: 11, color: "var(--vv-muted)", marginTop: 2 }}>
                  Push-Nachrichten kommen weiter an, auch wenn du ausgeloggt bist.
                </div>
              </div>
              <select
                value={autoLogout}
                onChange={(e) => { const v = setAutoLogoutMinutes(e.target.value); setAutoLogout(v); }}
                style={{
                  padding: "6px 10px", borderRadius: 8,
                  border: "1px solid var(--vv-border)",
                  background: "var(--vv-card)", color: "var(--vv-text)",
                  fontSize: 13, fontWeight: 500,
                }}
              >
                <option value="0">Aus</option>
                <option value="15">15 Min</option>
                <option value="30">30 Min</option>
                <option value="60">1 Std</option>
                <option value="120">2 Std</option>
              </select>
            </div>

            <div className="vv-msgapp-section">Aussehen</div>
            <div className="vv-msgapp-link-row" style={{ borderBottom: "0.5px solid var(--vv-border)" }}>
              <span style={{ fontSize: 18 }}>🎨</span>
              <span style={{ flex: 1 }}>Erscheinungsbild</span>
              <div style={{ display: "inline-flex", background: "var(--vv-input-bg)", borderRadius: 10, padding: 2, gap: 0 }}>
                {[
                  { v: "light",  label: "☀️" },
                  { v: "system", label: "Auto" },
                  { v: "dark",   label: "🌙" },
                ].map((o) => (
                  <button key={o.v} type="button" onClick={() => setTheme(o.v)}
                    style={{
                      border: "none", cursor: "pointer", padding: "6px 12px",
                      borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: theme === o.v ? "var(--vv-card)" : "transparent",
                      color: theme === o.v ? "var(--vv-accent)" : "var(--vv-muted)",
                      boxShadow: theme === o.v ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
                      font: "inherit", fontWeight: 600,
                    }}>{o.label}</button>
                ))}
              </div>
            </div>

            <div className="vv-msgapp-section">Konto</div>
            <Link href="/profile" className="vv-msgapp-link-row">🌟 <span>Mein Profil</span> <span style={{ marginLeft: "auto", color: "var(--vv-muted)" }}>›</span></Link>
            <Link href="/profile/edit" className="vv-msgapp-link-row">✏️ <span>Profil bearbeiten</span> <span style={{ marginLeft: "auto", color: "var(--vv-muted)" }}>›</span></Link>
            <Link href="/freunde" className="vv-msgapp-link-row">👥 <span>Freunde</span> <span style={{ marginLeft: "auto", color: "var(--vv-muted)" }}>›</span></Link>
            <Link href="/gruppen" className="vv-msgapp-link-row">👯 <span>Gruppen (Foren)</span> <span style={{ marginLeft: "auto", color: "var(--vv-muted)" }}>›</span></Link>
            <Link href="/" className="vv-msgapp-link-row">🏠 <span>Zur Hauptseite</span> <span style={{ marginLeft: "auto", color: "var(--vv-muted)" }}>›</span></Link>
            <button type="button" onClick={() => window.dispatchEvent(new Event("vv-pwa-install"))}
              className="vv-msgapp-link-row" style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer", font: "inherit" }}>
              📱 <span>Als App installieren</span> <span style={{ marginLeft: "auto", color: "var(--vv-muted)" }}>›</span>
            </button>

            {/* Spenden-Box */}
            <div style={{
              marginTop: 20, padding: 16, borderRadius: 14,
              background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
              border: "1px solid #fbbf24",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 32 }}>💛</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#92400e", marginTop: 6 }}>
                VibeVibo am Leben halten
              </div>
              <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5, marginTop: 4 }}>
                Server kostet Geld. Wenn dir VibeVibo gefällt, spende einen Kaffee.
                <strong> Keine Gegenleistung, keine Vibes-Boost — einfach Danke.</strong>
              </div>
              <a
                href="https://ko-fi.com/vibevibo"
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-block", marginTop: 10,
                  background: "#92400e", color: "#fff",
                  padding: "8px 16px", borderRadius: 10,
                  textDecoration: "none", fontWeight: 700, fontSize: 13,
                }}>
                ☕ Bei Ko-fi unterstützen
              </a>
              <div style={{ fontSize: 10, color: "#92400e", opacity: 0.7, marginTop: 8 }}>
                Freiwillige Zuwendung an den Plattform-Betreiber · keine Spende im steuerlichen Sinne
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="vv-msgapp-tabbar" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <button type="button" onClick={() => changeTab("chats")} className={tab === "chats" ? "active" : ""}>
          <span className="vv-tab-icon">💬</span>
          <span>Chats</span>
          {totalUnread > 0 && <span className="vv-tab-badge">{totalUnread > 99 ? "99+" : totalUnread}</span>}
        </button>
        <button type="button" onClick={() => changeTab("freunde")} className={tab === "freunde" ? "active" : ""}>
          <span className="vv-tab-icon">👥</span>
          <span>Freunde</span>
          {onlineCount > 0 && <span className="vv-tab-badge" style={{ background: "#10b981" }}>{onlineCount}</span>}
        </button>
        <button type="button" onClick={() => changeTab("vibo")} className={tab === "vibo" ? "active" : ""}>
          <span className="vv-tab-icon">🥚</span>
          <span>VIBO</span>
        </button>
        <button type="button" onClick={() => changeTab("profil")} className={tab === "profil" ? "active" : ""}>
          <span className="vv-tab-icon">🌟</span>
          <span>Profil</span>
        </button>
      </nav>

      {creating && (
        <CreateRoomDialog
          users={users}
          onClose={() => setCreating(false)}
          onCreated={(room) => { setCreating(false); router.push(`/messenger/rooms/${room.id}`); }}
        />
      )}
    </div>
  );
}

// useSearchParams braucht eine Suspense-Grenze (Next.js App Router).
export default function MessengerHome() {
  return (
    <Suspense fallback={null}>
      <MessengerInner />
    </Suspense>
  );
}
