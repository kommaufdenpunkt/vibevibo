"use client";

// 🏘 Coms — Gruppen-Detail-Seite, 2007-Nostalgia-Style.
// Sparkles, Marquee, Owner/Mod-Hierarchie, Mod-Aktionen, Theme-Farben.

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { relTime } from "@/lib/format";
import SmileyPicker from "@/components/SmileyPicker";

const ROLE_BADGE = {
  owner: { emoji: "👑", label: "Owner", bg: "#fbbf24", color: "#7c2d12" },
  mod:   { emoji: "🛡", label: "Mod",   bg: "#c084fc", color: "#581c87" },
  member:{ emoji: "⭐", label: "",       bg: "transparent", color: "#475569" },
};

export default function ComsPage() {
  const params = useParams();
  const slug = decodeURIComponent(params.slug || "");
  const { me } = useMe();
  const [data, setData] = useState(undefined);
  const [meta, setMeta] = useState(null);
  const [text, setText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showModPanel, setShowModPanel] = useState(false);
  const [flash, setFlash] = useState("");

  const reload = useCallback(async () => {
    try {
      const d = await api.getGroup(slug);
      setData(d);
    } catch (e) {
      if (e.status === 404) setData(null);
    }
    // Mod-Endpoint mit Coms-Felder + meine Rolle
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/mod`, { credentials: "include" });
      if (r.ok) setMeta(await r.json());
    } catch {}
  }, [slug]);

  useEffect(() => { reload(); }, [reload]);

  if (data === undefined) {
    return (
      <div style={{ padding: 30, textAlign: "center", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
        ⏳ Lade Gruppe…
      </div>
    );
  }
  if (data === null) {
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>👻</div>
        <h2 style={{ color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>Gruppe nicht gefunden</h2>
        <Link href="/gruppen" style={{
          background: "linear-gradient(135deg, #ec4899, #8b5cf6)", color: "#fff",
          padding: "10px 18px", borderRadius: 999, textDecoration: "none", fontWeight: 800,
          display: "inline-block", marginTop: 10,
        }}>← Zurück zu allen Gruppen</Link>
      </div>
    );
  }

  const { group, members, posts, isMember } = data;
  const myRole = meta?.myRole;
  const isOwner = myRole === "owner";
  const isMod = myRole === "mod" || isOwner;
  const comsGroup = meta?.group || group;
  const themeColor = comsGroup.theme_color || "#ec4899";
  const coverEmoji = comsGroup.cover_emoji || group.emoji || "🏘";

  async function modAction(action, extra = {}) {
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/mod`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setFlash("✓ Erledigt");
      await reload();
    } catch (e) { setFlash(`⚠ ${e.message}`); }
    finally { setTimeout(() => setFlash(""), 3000); }
  }

  async function join() { try { await api.joinGroup(slug); reload(); } catch (e) { alert(e.message); } }
  async function leave() {
    if (!confirm("Gruppe wirklich verlassen?")) return;
    try { await api.leaveGroup(slug); reload(); } catch (e) { alert(e.message); }
  }
  async function post(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try { await api.postGroup(slug, text); setText(""); reload(); }
    catch (err) { alert(err.message); }
  }

  return (
    <div style={{ background: "transparent", paddingBottom: 100 }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "10px 12px 0" }}>

        {/* ✨ HERO mit Glitter ✨ */}
        <div style={{
          position: "relative", overflow: "hidden",
          background: `linear-gradient(135deg, ${themeColor} 0%, ${shade(themeColor, -25)} 100%)`,
          borderRadius: 18, padding: "22px 20px",
          marginBottom: 14, color: "#fff",
          boxShadow: `0 10px 30px ${themeColor}66`,
        }}>
          {/* Sparkle-Deco */}
          <div style={{ position: "absolute", top: 10, right: 14, fontSize: 28, opacity: 0.7, pointerEvents: "none" }}>✨</div>
          <div style={{ position: "absolute", bottom: 8, left: 16, fontSize: 22, opacity: 0.55, pointerEvents: "none" }}>★</div>
          <div style={{ position: "absolute", top: 50, left: 30, fontSize: 14, opacity: 0.5, pointerEvents: "none" }}>♡</div>
          <div style={{ position: "absolute", bottom: 30, right: 60, fontSize: 16, opacity: 0.5, pointerEvents: "none" }}>✿</div>

          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{
              fontSize: 72, lineHeight: 1, flexShrink: 0,
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
            }}>{coverEmoji}</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.95, letterSpacing: 1, textTransform: "uppercase" }}>
                ★ COMS ★ · /{group.slug}
              </div>
              <h1 style={{
                margin: "4px 0 6px", fontSize: 30, fontWeight: 900,
                textShadow: "0 2px 6px rgba(0,0,0,0.3)",
                fontFamily: '"Comic Sans MS", "Trebuchet MS", sans-serif',
              }}>
                {comsGroup.name} {group.emoji}
              </h1>
              {comsGroup.motto && (
                <div style={{
                  background: "rgba(0,0,0,0.2)", backdropFilter: "blur(8px)",
                  padding: "5px 12px", borderRadius: 999, display: "inline-block",
                  fontSize: 12, fontStyle: "italic", fontWeight: 600,
                  marginBottom: 6,
                }}>„{comsGroup.motto}"</div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                <Pill>👥 {comsGroup.memberCount || members.length} Mitglieder</Pill>
                <Pill>📝 {comsGroup.postCount || posts.length} Posts</Pill>
                {comsGroup.ownerUsername && (
                  <Pill>👑 {comsGroup.ownerDisplayName || `@${comsGroup.ownerUsername}`}</Pill>
                )}
                {myRole && ROLE_BADGE[myRole] && (
                  <Pill bg={ROLE_BADGE[myRole].bg} color={ROLE_BADGE[myRole].color}>
                    Du bist {ROLE_BADGE[myRole].emoji} {myRole === "member" ? "Mitglied" : ROLE_BADGE[myRole].label}
                  </Pill>
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              {me ? (
                isMember ? (
                  <button onClick={leave} style={btnGhost}>↩ Verlassen</button>
                ) : (
                  <button onClick={join} style={btnPrimary}>+ Beitreten</button>
                )
              ) : (
                <Link href="/login" style={btnPrimary}>🔑 Login zum Beitreten</Link>
              )}
              {isOwner && (
                <button onClick={() => setShowSettings(true)} style={btnGhost}>⚙ Einstellungen</button>
              )}
              {isMod && (
                <button onClick={() => setShowModPanel(true)} style={btnGhost}>🛡 Mod-Aktionen</button>
              )}
            </div>
          </div>

          {/* Beschreibung als Marquee-Style */}
          {comsGroup.description && (
            <div style={{
              marginTop: 14, padding: "10px 14px",
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
              borderRadius: 12, fontSize: 13.5, lineHeight: 1.5,
              border: "1px solid rgba(255,255,255,0.25)",
              whiteSpace: "pre-wrap",
            }}>
              {comsGroup.description}
            </div>
          )}
        </div>

        {flash && (
          <div style={{
            background: flash.startsWith("⚠") ? "#fee2e2" : "#dcfce7",
            color: flash.startsWith("⚠") ? "#991b1b" : "#166534",
            padding: 10, borderRadius: 12, marginBottom: 10,
            fontWeight: 700, fontSize: 13, textAlign: "center",
          }}>{flash}</div>
        )}

        {/* Hauptbereich: Posts links, Members rechts */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(220px, 1fr)",
          gap: 14,
        }} className="vv-coms-grid">
          <div>
            {/* POST-FORM */}
            {isMember && (
              <div style={{
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(12px)",
                borderRadius: 14, padding: 12, marginBottom: 12,
                border: `2px solid ${themeColor}33`,
              }}>
                <form onSubmit={post}>
                  <textarea value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Was läuft in ${group.name}? ✿`}
                    style={{
                      width: "100%", minHeight: 70, padding: "8px 10px",
                      borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)",
                      fontSize: 14, fontFamily: "inherit", resize: "vertical",
                    }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <SmileyPicker onPick={(s) => setText((t) => t + s)} />
                    <div style={{ flex: 1 }} />
                    <button type="submit" style={{
                      background: `linear-gradient(135deg, ${themeColor}, ${shade(themeColor, -20)})`,
                      color: "#fff", border: "none", padding: "8px 18px", borderRadius: 999,
                      fontWeight: 800, cursor: "pointer", fontSize: 13,
                      boxShadow: `0 2px 8px ${themeColor}66`,
                    }}>✎ Posten</button>
                  </div>
                </form>
              </div>
            )}

            {/* POSTS-LISTE */}
            <SectionTitle color={themeColor}>💬 Gruppen-Wand</SectionTitle>
            {posts.length === 0 ? (
              <div style={{
                background: "rgba(255,255,255,0.7)",
                borderRadius: 12, padding: 20, textAlign: "center",
                color: "#64748b", fontSize: 13,
              }}>
                Noch keine Posts. Mach den Anfang ✿
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {posts.map((p) => (
                  <div key={p.id} style={{
                    background: "#fff",
                    border: `1px solid ${themeColor}22`,
                    borderLeft: `4px solid ${themeColor}`,
                    borderRadius: 10, padding: "10px 12px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 4,
                    }}>
                      <Link href={`/u/${p.username}`} style={{
                        fontSize: 13, fontWeight: 800, color: "#1f2937",
                        textDecoration: "none",
                      }}>
                        {p.emoji} {p.displayName}
                      </Link>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{relTime(p.at)}</span>
                        {isMod && (
                          <button type="button" onClick={() => {
                            if (confirm("Diesen Post löschen?")) modAction("deletepost", { postId: p.id });
                          }} title="Post löschen (Mod)" style={{
                            background: "transparent", border: "none",
                            color: "#ef4444", fontSize: 13, cursor: "pointer",
                            padding: 0,
                          }}>🗑</button>
                        )}
                      </div>
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5, color: "#374151" }}>{p.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SIDEBAR: Members */}
          <div>
            <SectionTitle color={themeColor}>👥 Mitglieder</SectionTitle>
            <div style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(12px)",
              borderRadius: 14, padding: 8,
              border: `2px solid ${themeColor}22`,
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              {(meta?.members || members).map((m) => {
                const r = ROLE_BADGE[m.role] || ROLE_BADGE.member;
                const username = m.username;
                return (
                  <div key={username} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 8px", borderRadius: 8,
                    background: m.role === "owner" ? "rgba(251,191,36,0.12)"
                              : m.role === "mod"   ? "rgba(192,132,252,0.12)"
                              : "transparent",
                  }}>
                    <div style={{ fontSize: 22 }}>{m.emoji || "👤"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/u/${username}`} style={{
                        fontSize: 12.5, fontWeight: 700, color: "#1f2937",
                        textDecoration: "none", display: "block",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {m.displayName || username}
                      </Link>
                      {r.label && (
                        <div style={{ fontSize: 10, color: r.color, fontWeight: 800 }}>
                          {r.emoji} {r.label}
                        </div>
                      )}
                    </div>
                    {isOwner && m.role !== "owner" && (
                      <div style={{ display: "flex", gap: 3 }}>
                        {m.role === "mod" ? (
                          <button title="Mod entfernen"
                            onClick={() => modAction("demote", { targetUsername: username })}
                            style={btnXs}>⬇</button>
                        ) : (
                          <button title="Zu Mod befördern"
                            onClick={() => modAction("promote", { targetUsername: username })}
                            style={btnXs}>🛡</button>
                        )}
                        <button title="Kicken" onClick={() => {
                          if (confirm(`@${username} aus Gruppe entfernen?`)) modAction("kick", { targetUsername: username });
                        }} style={{ ...btnXs, color: "#dc2626" }}>🚪</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {comsGroup.rules && (
              <>
                <SectionTitle color={themeColor} mt>📜 Regeln</SectionTitle>
                <div style={{
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(12px)",
                  borderRadius: 14, padding: 12,
                  border: `2px solid ${themeColor}22`,
                  fontSize: 12, color: "#475569", lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}>{comsGroup.rules}</div>
              </>
            )}
          </div>
        </div>

        {/* OWNER-SETTINGS-MODAL */}
        {showSettings && isOwner && (
          <SettingsModal group={comsGroup} themeColor={themeColor}
            onClose={() => setShowSettings(false)}
            onSave={async (meta) => {
              await modAction("meta", { meta });
              setShowSettings(false);
            }} />
        )}

        {/* MOD-PANEL-MODAL */}
        {showModPanel && isMod && (
          <ModPanelModal members={meta?.members || []} onClose={() => setShowModPanel(false)}
            onAction={(action, extra) => modAction(action, extra)}
            isOwner={isOwner} />
        )}

      </div>

      <style>{`
        @media (max-width: 720px) {
          .vv-coms-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function SectionTitle({ children, color, mt = false }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 900, color: "#fff",
      letterSpacing: 0.7, textTransform: "uppercase",
      marginBottom: 6, marginTop: mt ? 16 : 0, padding: "0 4px",
      textShadow: "0 2px 4px rgba(0,0,0,0.3)",
    }}>{children}</div>
  );
}

function Pill({ children, bg = "rgba(0,0,0,0.2)", color = "#fff" }) {
  return (
    <div style={{
      background: bg, color, padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 800, backdropFilter: "blur(8px)",
    }}>{children}</div>
  );
}

const btnPrimary = {
  background: "rgba(255,255,255,0.95)", color: "#9d174d",
  padding: "8px 16px", borderRadius: 999,
  fontWeight: 900, fontSize: 13, border: "none", cursor: "pointer",
  textDecoration: "none", display: "inline-block",
};
const btnGhost = {
  background: "rgba(0,0,0,0.2)", color: "#fff",
  padding: "7px 14px", borderRadius: 999,
  fontWeight: 800, fontSize: 12, border: "1px solid rgba(255,255,255,0.4)",
  cursor: "pointer", backdropFilter: "blur(8px)",
};
const btnXs = {
  background: "transparent", border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 6, padding: "2px 6px", fontSize: 11, cursor: "pointer",
};

// Helle/dunkle Farbtoene (einfache Lerp)
function shade(hex, percent) {
  let r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
  const f = (1 + percent / 100);
  r = Math.max(0, Math.min(255, Math.round(r * f)));
  g = Math.max(0, Math.min(255, Math.round(g * f)));
  b = Math.max(0, Math.min(255, Math.round(b * f)));
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

// === OWNER-SETTINGS-MODAL ===
function SettingsModal({ group, themeColor, onClose, onSave }) {
  const [name, setName] = useState(group.name || "");
  const [description, setDescription] = useState(group.description || "");
  const [emoji, setEmoji] = useState(group.emoji || "🏘");
  const [coverEmoji, setCoverEmoji] = useState(group.cover_emoji || "");
  const [motto, setMotto] = useState(group.motto || "");
  const [rules, setRules] = useState(group.rules || "");
  const [joinMode, setJoinMode] = useState(group.join_mode || "open");
  const [color, setColor] = useState(group.theme_color || "#ec4899");

  return (
    <Modal onClose={onClose} title="⚙ Coms-Einstellungen">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} style={inputStyle} /></Field>
        <Field label="Emoji (klein)"><input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} style={{ ...inputStyle, width: 70 }} /></Field>
        <Field label="Cover-Emoji (gross im Hero)"><input value={coverEmoji} onChange={(e) => setCoverEmoji(e.target.value)} maxLength={4} style={{ ...inputStyle, width: 70 }} placeholder="z.B. 🌸" /></Field>
        <Field label="Motto (kurze Zeile)"><input value={motto} onChange={(e) => setMotto(e.target.value)} maxLength={200} style={inputStyle} placeholder="z.B. Hier ist immer was los ✿" /></Field>
        <Field label="Beschreibung"><textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={800} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} /></Field>
        <Field label="Regeln"><textarea value={rules} onChange={(e) => setRules(e.target.value)} maxLength={2000} style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} placeholder="1. Sei nett.&#10;2. Kein Spam.&#10;3. …" /></Field>
        <Field label="Beitritt"><select value={joinMode} onChange={(e) => setJoinMode(e.target.value)} style={inputStyle}>
          <option value="open">Offen — jeder darf rein</option>
          <option value="request">Auf Anfrage — Owner bestätigt</option>
          <option value="invite">Nur per Einladung</option>
        </select></Field>
        <Field label="Theme-Farbe"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 50, height: 32, border: "none", cursor: "pointer" }} /></Field>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ ...btnGhost, color: "#475569", background: "#f1f5f9", border: "1px solid #e5e7eb" }}>Abbruch</button>
        <button onClick={() => onSave({ name, description, emoji, cover_emoji: coverEmoji, motto, rules, join_mode: joinMode, theme_color: color })}
          style={{
            background: `linear-gradient(135deg, ${themeColor}, ${shade(themeColor, -20)})`,
            color: "#fff", border: "none", padding: "8px 18px", borderRadius: 999,
            fontWeight: 900, cursor: "pointer",
          }}>💾 Speichern</button>
      </div>
    </Modal>
  );
}

function ModPanelModal({ members, onAction, onClose, isOwner }) {
  return (
    <Modal onClose={onClose} title="🛡 Mod-Aktionen">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {members.filter((m) => m.role !== "owner").map((m) => (
          <div key={m.username} style={{
            background: "#f8fafc", border: "1px solid #e5e7eb",
            borderRadius: 10, padding: "8px 10px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ fontSize: 22 }}>{m.emoji || "👤"}</div>
            <div style={{ flex: 1 }}>
              <strong>{m.displayName || m.username}</strong>
              <div style={{ fontSize: 11, color: "#64748b" }}>@{m.username} · {ROLE_BADGE[m.role]?.label || "Member"}</div>
            </div>
            {isOwner && (m.role === "mod" ? (
              <button onClick={() => onAction("demote", { targetUsername: m.username })} style={btnXs}>⬇ Demote</button>
            ) : (
              <button onClick={() => onAction("promote", { targetUsername: m.username })} style={btnXs}>🛡 Promote</button>
            ))}
            <button onClick={() => {
              if (confirm(`@${m.username} kicken?`)) onAction("kick", { targetUsername: m.username });
            }} style={{ ...btnXs, color: "#dc2626" }}>🚪 Kick</button>
          </div>
        ))}
        {members.filter((m) => m.role !== "owner").length === 0 && (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: 16 }}>Keine Mitglieder zum Verwalten.</div>
        )}
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 14, backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 18, padding: 18, maxWidth: 520, width: "100%",
        maxHeight: "85vh", overflow: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, cursor: "pointer", color: "#64748b" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#374151", marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
  border: "1px solid #e5e7eb", outline: "none",
};
