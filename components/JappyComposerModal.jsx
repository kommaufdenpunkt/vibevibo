"use client";

// ✿ 2006er „Beitrag erstellen"-Modal — pro Post-Typ eigenes Formular.
//
//   • Frei:        Textarea
//   • Zitat:       Zitat-Text + Autor/Quelle
//   • Gefühl:      Mood-Emoji wählen + Begründung
//   • Markierung:  Freunde-Tag (@user @user) + Text
//   • Erinnerung:  Jahre-zurück + Text
//   • Musik:       Song + Künstler + Link
//   • Nie-vergessen: Datum + Was

import { useEffect, useMemo, useRef, useState } from "react";
import { useMe } from "@/lib/useMe";
import Avatar from "@/components/Avatar";
import { STATUS_CATS, searchStatuses } from "@/lib/status";

const SMILEYS = [
  "😀","😃","😄","😁","😆","😅","🤣","😂",
  "🙂","😊","😍","🥰","😘","😎","🤩","🥳",
  "🤔","😏","😒","🙄","😴","😪","😭","😢",
  "😩","😤","😡","🤬","😱","😨","🥺","🤗",
  "💖","❤️","💔","💕","💞","✨","🌟","⭐",
  "☀️","🌈","🎉","🎊","🍀","🌸","🌹","🎵",
];

const POST_TYPES = [
  {
    id: "free",         label: "Frei",          icon: "💬", color: "#ec4899",
    bg: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
  },
  {
    id: "quote",        label: "Zitat",         icon: "🌹", color: "#db2777",
    bg: "linear-gradient(135deg, #fff1f2, #ffe4e6)",
  },
  {
    id: "feeling",      label: "Gefühl",        icon: "💭", color: "#a855f7",
    bg: "linear-gradient(135deg, #faf5ff, #f3e8ff)",
  },
  {
    id: "mention",      label: "Mit Markierung", icon: "👯", color: "#06b6d4",
    bg: "linear-gradient(135deg, #ecfeff, #cffafe)",
  },
  {
    id: "memory",       label: "Erinnerung",    icon: "📅", color: "#f97316",
    bg: "linear-gradient(135deg, #fff7ed, #ffedd5)",
  },
  {
    id: "now_playing",  label: "Höre gerade",   icon: "🎵", color: "#10b981",
    bg: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
  },
  {
    id: "never_forget", label: "Nie vergessen", icon: "💔", color: "#475569",
    bg: "linear-gradient(135deg, #f8fafc, #e2e8f0)",
  },
];

const MAX_LEN = 280;

export default function JappyComposerModal({ onPosted }) {
  const { me } = useMe();
  const [open, setOpen] = useState(false);

  if (!me) return null;
  return (
    <>
      <Trigger me={me} onOpen={() => setOpen(true)} />
      {open && <Modal me={me} onClose={() => setOpen(false)} onPosted={() => { setOpen(false); onPosted?.(); }} />}
    </>
  );
}

function Trigger({ me, onOpen }) {
  return (
    <div onClick={onOpen} style={{
      background: "linear-gradient(135deg, #fce7f3, #f5d0fe, #ddd6fe)",
      borderRadius: 999, padding: "10px 14px", marginBottom: 12,
      border: "3px ridge #ec4899",
      boxShadow: "0 3px 10px rgba(236,72,153,0.18)",
      display: "flex", alignItems: "center", gap: 12,
      cursor: "pointer", transition: "transform 0.18s, box-shadow 0.18s",
    }}
    onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.01)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(236,72,153,0.3)"; }}
    onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 3px 10px rgba(236,72,153,0.18)"; }}
    >
      <div style={{ border: "2px ridge #ec4899", borderRadius: "50%", padding: 2, background: "#fff" }}>
        <Avatar url={me.avatarUrl} name={me.displayName} className="vv-avatar" style={{ width: 36, height: 36, borderRadius: "50%" }} />
      </div>
      <span style={{ flex: 1, fontSize: 14, color: "#831843", fontStyle: "italic", textShadow: "0 1px 0 #fff" }}>
        ✿ Was machst du gerade, <b style={{ color: "#ec4899", fontStyle: "normal" }}>{me.displayName}</b>?
      </span>
      <span style={{
        background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
        padding: "5px 14px", borderRadius: 999,
        fontSize: 11, fontWeight: 900, letterSpacing: 0.5,
        border: "2px ridge #fff",
        textShadow: "0 1px 1px rgba(0,0,0,0.3)",
        whiteSpace: "nowrap",
      }}>★ Posten</span>
    </div>
  );
}

function Modal({ me, onClose, onPosted }) {
  const [postType, setPostType] = useState("free");
  const [showTypes, setShowTypes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Form-State pro Typ (initial leer)
  const [form, setForm] = useState({
    free: { text: "" },
    quote: { quote: "", author: "" },
    feeling: { mood: null, text: "" },
    mention: { mentions: "", text: "" },
    memory: { yearsAgo: 1, text: "", source: null, commentary: "" },
    now_playing: { song: "", artist: "", link: "" },
    never_forget: { date: "", text: "" },
  });

  const activeType = POST_TYPES.find((t) => t.id === postType) || POST_TYPES[0];

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Per-Typ Compose
  const composedText = useMemo(() => composeForType(postType, form[postType]), [postType, form]);
  const remaining = MAX_LEN - composedText.length;
  const canSubmit = composedText.trim().length >= 2 && remaining >= 0 && !busy;

  function patch(field, value) {
    setForm((f) => ({ ...f, [postType]: { ...f[postType], [field]: value } }));
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/buschfunk/post", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postType, text: composedText }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      onPosted();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(131,24,67,0.45)",
      backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 12,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "linear-gradient(180deg, #fff, #fef7fb 30%, #fff)",
        color: "#1c1c1e",
        borderRadius: 16, width: "100%", maxWidth: 560,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 22px 64px rgba(236,72,153,0.35)",
        border: "4px ridge #ec4899",
      }}>
        {/* Header */}
        <div style={{
          position: "relative", overflow: "hidden",
          padding: "14px 16px",
          background: "linear-gradient(135deg, #ec4899, #a855f7, #06b6d4, #ec4899)",
          backgroundSize: "300% 100%",
          animation: "vv-jc-wave 8s ease-in-out infinite",
          borderBottom: "3px ridge #fff",
        }}>
          <div style={{
            position: "absolute", top: 6, left: 14, fontSize: 16, color: "#fff", opacity: 0.7,
            animation: "vv-jc-spin 5s ease-in-out infinite",
          }}>✿</div>
          <div style={{
            position: "absolute", bottom: 6, right: 14, fontSize: 16, color: "#fff", opacity: 0.7,
            animation: "vv-jc-spin 5s ease-in-out infinite reverse",
          }}>✿</div>
          <div style={{
            textAlign: "center", fontSize: 18, fontWeight: 900,
            color: "#fff", letterSpacing: 1.5,
            textShadow: "0 2px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.4)",
          }}>★ BEITRAG ERSTELLEN ★</div>
          <button onClick={onClose} title="Schließen" style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.95)", color: "#831843",
            border: "2px ridge #fff", cursor: "pointer", fontSize: 14, fontFamily: "inherit",
            fontWeight: 900,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {/* Avatar + Typ-Picker */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <div style={{ border: "3px ridge #ec4899", borderRadius: 10, padding: 2, background: "#fff" }}>
              <Avatar url={me.avatarUrl} name={me.displayName} className="vv-avatar" style={{ width: 44, height: 44, borderRadius: 8 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 16, fontWeight: 900, color: activeType.color,
                textShadow: "1px 1px 0 #fff, 2px 2px 0 rgba(0,0,0,0.05)",
              }}>{me.displayName}</div>
              <div style={{ position: "relative", marginTop: 4 }}>
                <button onClick={() => setShowTypes((s) => !s)} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 999,
                  background: `linear-gradient(135deg, ${activeType.color}, ${activeType.color}cc)`,
                  color: "#fff", border: "2px ridge #fff",
                  cursor: "pointer", fontFamily: "inherit",
                  fontSize: 11, fontWeight: 900, letterSpacing: 0.4,
                  textShadow: "0 1px 1px rgba(0,0,0,0.25)",
                }}>
                  <span style={{ fontSize: 13 }}>{activeType.icon}</span>
                  <span>{activeType.label}</span>
                  <span style={{ fontSize: 9 }}>{showTypes ? "▴" : "▾"}</span>
                </button>
                {showTypes && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 10,
                    background: "#fff", borderRadius: 10,
                    border: "3px ridge #ec4899",
                    boxShadow: "0 8px 24px rgba(236,72,153,0.25)",
                    padding: 6, minWidth: 240, display: "grid", gap: 3,
                  }}>
                    {POST_TYPES.map((t) => {
                      const active = postType === t.id;
                      return (
                        <button key={t.id} type="button"
                          onClick={() => { setPostType(t.id); setShowTypes(false); }}
                          style={{
                            padding: "8px 12px", borderRadius: 8,
                            background: active
                              ? `linear-gradient(135deg, ${t.color}, ${t.color}cc)`
                              : t.bg,
                            color: active ? "#fff" : t.color,
                            border: active ? `2px ridge ${t.color}` : `2px solid ${t.color}33`,
                            cursor: "pointer", fontFamily: "inherit",
                            fontSize: 13, fontWeight: 900,
                            textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                            textShadow: active ? "0 1px 1px rgba(0,0,0,0.25)" : "1px 1px 0 #fff",
                            transition: "transform 0.12s, box-shadow 0.12s",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = "translateX(2px)";
                            e.currentTarget.style.boxShadow = `0 3px 10px ${t.color}55`;
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = "translateX(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 28, height: 28, borderRadius: "50%",
                            background: active ? "rgba(255,255,255,0.25)" : `${t.color}22`,
                            border: active ? "1px solid rgba(255,255,255,0.4)" : `1.5px solid ${t.color}55`,
                            fontSize: 15, flexShrink: 0,
                          }}>{t.icon}</span>
                          <span style={{ flex: 1 }}>{t.label}</span>
                          {active && <span style={{ fontSize: 14 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pro-Typ-Formular */}
          <TypedForm type={postType} value={form[postType]} onChange={patch} color={activeType.color} bg={activeType.bg} />

          {/* Live-Preview */}
          {composedText.trim().length > 0 && (
            <div style={{
              marginTop: 14, padding: 10, borderRadius: 10,
              background: activeType.bg,
              border: `2px ridge ${activeType.color}`,
              fontSize: 12.5, color: "#1c1c1e", lineHeight: 1.45,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              position: "relative",
            }}>
              <div style={{
                position: "absolute", top: -8, left: 10,
                background: activeType.color, color: "#fff",
                padding: "1px 8px", borderRadius: 6, fontSize: 9, fontWeight: 900,
                letterSpacing: 0.8, textShadow: "0 1px 1px rgba(0,0,0,0.3)",
              }}>VORSCHAU</div>
              {composedText}
            </div>
          )}

          {err && (
            <div style={{
              marginTop: 10, padding: 10, borderRadius: 8,
              background: "rgba(239,68,68,0.1)", color: "#991b1b",
              border: "2px ridge #ef4444",
              fontSize: 12, fontWeight: 800, textAlign: "center",
            }}>⚠ {err}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 16px", borderTop: "3px ridge #ec4899",
          background: "linear-gradient(180deg, #fef7fb, #fce7f3)",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 8, fontSize: 11, color: "#831843",
          }}>
            <span style={{ fontStyle: "italic", opacity: 0.85 }}>{tipFor(postType)}</span>
            <span style={{
              color: remaining < 20 ? "#dc2626" : "#831843",
              fontWeight: remaining < 20 ? 900 : 700,
            }}>{remaining}</span>
          </div>
          <button onClick={submit} disabled={!canSubmit} style={{
            width: "100%", padding: 13, borderRadius: 10,
            background: canSubmit
              ? `linear-gradient(135deg, ${activeType.color}, ${activeType.color}cc, ${activeType.color})`
              : "linear-gradient(135deg, #e5e5e7, #cbd5e1)",
            backgroundSize: "200% 100%",
            color: canSubmit ? "#fff" : "rgba(0,0,0,0.35)",
            border: canSubmit ? "3px ridge #fff" : "2px solid #e5e5e7",
            fontWeight: 900, fontSize: 14,
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "inherit", letterSpacing: 1,
            textShadow: canSubmit ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
            animation: canSubmit ? "vv-jc-wave 4s ease-in-out infinite" : "none",
          }}>
            {busy ? "⏳ Wird gepostet…" : "★ POSTEN ★"}
          </button>
        </div>

        <style>{`
          @keyframes vv-jc-wave {
            0%, 100% { background-position: 0% 50%; }
            50%      { background-position: 100% 50%; }
          }
          @keyframes vv-jc-spin {
            0%, 100% { transform: rotate(-12deg) scale(1); }
            50%      { transform: rotate(12deg) scale(1.15); }
          }
        `}</style>
      </div>
    </div>
  );
}

// === Per-Typ Formulare ===
function TypedForm({ type, value, onChange, color, bg }) {
  const v = value || {};
  if (type === "free") {
    return (
      <TextareaField
        value={v.text || ""} onChange={(x) => onChange("text", x)}
        placeholder="Was machst du gerade?" color={color} rows={6}
      />
    );
  }
  if (type === "quote") {
    return (
      <>
        <TextareaField
          value={v.quote || ""} onChange={(x) => onChange("quote", x)}
          placeholder="Das Zitat …" color={color} rows={3}
        />
        <InputField
          value={v.author || ""} onChange={(x) => onChange("author", x)}
          placeholder="— Autor / Quelle (z.B. Forrest Gump)"
          color={color} marginTop={8}
        />
      </>
    );
  }
  if (type === "feeling") {
    return <FeelingForm v={v} onChange={onChange} color={color} bg={bg} />;
  }
  if (type === "mention") {
    return (
      <>
        <InputField
          value={v.mentions || ""} onChange={(x) => onChange("mentions", x)}
          placeholder="@user1 @user2 @user3 …"
          color={color}
        />
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4, fontStyle: "italic" }}>
          Tipp: mit @-Zeichen vor dem Username werden Freunde markiert.
        </div>
        <TextareaField
          value={v.text || ""} onChange={(x) => onChange("text", x)}
          placeholder="Was war? Wo wart ihr?" color={color} rows={4} marginTop={10}
        />
      </>
    );
  }
  if (type === "memory") {
    return <MemoryForm v={v} onChange={onChange} color={color} bg={bg} />;
  }
  if (type === "now_playing") {
    return (
      <>
        <InputField
          value={v.song || ""} onChange={(x) => onChange("song", x)}
          placeholder="🎵 Song-Titel"
          color={color}
        />
        <InputField
          value={v.artist || ""} onChange={(x) => onChange("artist", x)}
          placeholder="🎤 Künstler"
          color={color} marginTop={8}
        />
        <InputField
          value={v.link || ""} onChange={(x) => onChange("link", x)}
          placeholder="🔗 YouTube/Spotify-Link (optional)"
          color={color} marginTop={8}
        />
      </>
    );
  }
  if (type === "never_forget") {
    return (
      <>
        <InputField
          value={v.date || ""} onChange={(x) => onChange("date", x)}
          placeholder="📅 Datum (z.B. 11.09.2001 oder Sommer 2003)"
          color={color}
        />
        <TextareaField
          value={v.text || ""} onChange={(x) => onChange("text", x)}
          placeholder="Was wirst du nie vergessen?"
          color={color} rows={5} marginTop={8}
        />
      </>
    );
  }
  return null;
}

function InputField({ value, onChange, placeholder, color, marginTop = 0 }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={140}
      style={{
        width: "100%", padding: 12, marginTop,
        background: "#fff", color: "#1c1c1e",
        border: `2px ridge ${color}`,
        borderRadius: 10, fontFamily: "inherit", fontSize: 14,
        outline: "none", boxSizing: "border-box",
      }}
    />
  );
}

function TextareaField({ value, onChange, placeholder, color, rows = 4, marginTop = 0 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={MAX_LEN}
      style={{
        width: "100%", padding: 12, marginTop,
        background: "#fff", color: "#1c1c1e",
        border: `2px ridge ${color}`,
        borderRadius: 10, fontFamily: "inherit", fontSize: 14,
        lineHeight: 1.45, outline: "none", resize: "vertical",
        boxSizing: "border-box", minHeight: 80,
      }}
    />
  );
}

// === Erinnerung-Form: lädt echte eigene Memories aus der Vergangenheit ===
function MemoryForm({ v, onChange, color, bg }) {
  const [memories, setMemories] = useState(null);
  const [mode, setMode] = useState("pick"); // "pick" | "manual"

  useEffect(() => {
    fetch("/api/me/memories")
      .then((r) => r.ok ? r.json() : { memories: [] })
      .then((d) => setMemories(d.memories || []))
      .catch(() => setMemories([]));
  }, []);

  function pickMemory(m) {
    const txt = m.text || m.note || m.caption || "";
    onChange("yearsAgo", m.yearsAgo);
    onChange("text", txt);
    onChange("source", "real");
  }

  function resetPick() {
    onChange("yearsAgo", 1);
    onChange("text", "");
    onChange("source", null);
  }

  if (memories === null) {
    return <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
      ⏳ Lade deine Erinnerungen…
    </div>;
  }

  return (
    <>
      {/* Mode-Switch */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        <button type="button" onClick={() => setMode("pick")} style={modeBtn(mode === "pick", color)}>
          🕰️ Echte Erinnerung ({memories.length})
        </button>
        <button type="button" onClick={() => setMode("manual")} style={modeBtn(mode === "manual", color)}>
          ✏️ Selbst tippen
        </button>
      </div>

      {mode === "pick" ? (
        memories.length === 0 ? (
          <div style={{
            padding: 20, textAlign: "center", color: "#831843", fontSize: 13,
            background: bg, borderRadius: 10, border: `2px ridge ${color}33`, lineHeight: 1.5,
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🌱</div>
            Du hast noch keine Posts/Geschenke aus dem heutigen Tag in vergangenen Jahren.
            Tippe deine Erinnerung manuell oder komm in einem Jahr wieder!
          </div>
        ) : (
          <div style={{ maxHeight: 260, overflowY: "auto", display: "grid", gap: 6 }}>
            {memories.map((m, i) => {
              const txt = m.text || m.note || m.caption || "(ohne Text)";
              const isPicked = v.source === "real" && v.yearsAgo === m.yearsAgo && v.text === txt;
              const kindLabel = {
                pinnwand: "📌 Pinnwand", gift: "🎁 Geschenk",
                photo: "📸 Foto", status: "💬 Status",
              }[m.kind] || "📅 Aktivität";
              return (
                <button key={`${m.kind}-${m.id}-${i}`} type="button"
                  onClick={() => pickMemory(m)}
                  style={{
                    padding: "10px 12px", borderRadius: 10,
                    background: isPicked ? `linear-gradient(135deg, ${color}, ${color}cc)` : bg,
                    color: isPicked ? "#fff" : "#1c1c1e",
                    border: isPicked ? `2px ridge ${color}` : `2px solid ${color}33`,
                    cursor: "pointer", fontFamily: "inherit",
                    textAlign: "left", display: "block",
                    textShadow: isPicked ? "0 1px 1px rgba(0,0,0,0.25)" : "none",
                  }}
                >
                  <div style={{
                    display: "flex", justifyContent: "space-between", marginBottom: 4,
                    fontSize: 10.5, fontWeight: 900, letterSpacing: 0.4,
                    opacity: isPicked ? 0.95 : 0.7,
                  }}>
                    <span>{kindLabel} · ⏳ vor {m.yearsAgo} {m.yearsAgo === 1 ? "Jahr" : "Jahren"}</span>
                    <span>{new Date(m.at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.4, fontWeight: 600,
                    overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  }}>
                    {txt}
                  </div>
                  {isPicked && <div style={{ fontSize: 10, marginTop: 4, fontWeight: 800 }}>✓ ausgewählt</div>}
                </button>
              );
            })}
          </div>
        )
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: 0.5, marginBottom: 6 }}>
            VOR WIE VIELEN JAHREN?
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {[1, 2, 3, 5, 10, 15, 20, 25].map((y) => {
              const active = v.yearsAgo === y;
              return (
                <button key={y} type="button" onClick={() => { onChange("yearsAgo", y); onChange("source", "manual"); }} style={{
                  padding: "6px 14px", borderRadius: 999,
                  background: active ? `linear-gradient(135deg, ${color}, ${color}cc)` : bg,
                  color: active ? "#fff" : color,
                  border: active ? `2px ridge ${color}` : `2px solid ${color}33`,
                  cursor: "pointer", fontFamily: "inherit",
                  fontSize: 13, fontWeight: 900,
                  textShadow: active ? "0 1px 1px rgba(0,0,0,0.25)" : "none",
                }}>
                  {y === 1 ? "1 Jahr" : `${y} Jahre`}
                </button>
              );
            })}
          </div>
          <TextareaField
            value={v.text || ""} onChange={(x) => { onChange("text", x); onChange("source", "manual"); }}
            placeholder="Was war damals? (z.B. ICQ-Sound im Ohr, Sommer 2003 🍦)"
            color={color} rows={4}
          />
        </>
      )}

      {/* Optional: Eigene Worte dazu */}
      {v.source === "real" && (
        <div style={{ marginTop: 10 }}>
          <InputField
            value={v.commentary || ""} onChange={(x) => onChange("commentary", x)}
            placeholder="Dein Kommentar dazu (optional)"
            color={color}
          />
        </div>
      )}

      {(v.source === "real" || (v.source === null && v.yearsAgo)) && (
        <button type="button" onClick={resetPick} style={{
          marginTop: 8, padding: "4px 10px", borderRadius: 8,
          background: "transparent", color: "#94a3b8",
          border: "1px solid #cbd5e1", cursor: "pointer", fontFamily: "inherit",
          fontSize: 11, fontWeight: 700,
        }}>↺ Reset</button>
      )}
    </>
  );
}

function modeBtn(active, color) {
  return {
    flex: 1, padding: "7px 10px", borderRadius: 8,
    background: active ? `linear-gradient(135deg, ${color}, ${color}cc)` : "rgba(0,0,0,0.04)",
    color: active ? "#fff" : "#475569",
    border: active ? `2px ridge ${color}` : "1.5px solid rgba(0,0,0,0.08)",
    cursor: "pointer", fontFamily: "inherit",
    fontSize: 11.5, fontWeight: active ? 900 : 700,
    textShadow: active ? "0 1px 1px rgba(0,0,0,0.25)" : "none",
  };
}

// === Gefühl-Form mit existierendem Status-Katalog ===
function FeelingForm({ v, onChange, color, bg }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    return searchStatuses(q, []);
  }, [query]);

  // Nur die gratis Kategorien anzeigen (keine Pack-Locks im Composer)
  const freeCats = STATUS_CATS.filter((c) => c.packId === null);

  function pick(emoji, label) {
    onChange("mood", { emoji, label });
  }

  return (
    <>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Status suchen (z.B. zocken, glücklich, im Café…)"
        style={{
          width: "100%", padding: 10,
          background: "#fff", color: "#1c1c1e",
          border: `2px ridge ${color}`,
          borderRadius: 10, fontFamily: "inherit", fontSize: 13,
          outline: "none", boxSizing: "border-box", marginBottom: 10,
        }}
      />

      {v.mood && (
        <div style={{
          padding: "8px 12px", borderRadius: 999,
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          color: "#fff", border: "2px ridge #fff",
          fontSize: 13, fontWeight: 900,
          display: "inline-flex", alignItems: "center", gap: 8,
          marginBottom: 10,
          textShadow: "0 1px 1px rgba(0,0,0,0.3)",
        }}>
          <span style={{ fontSize: 17 }}>{v.mood.emoji}</span>
          <span>{v.mood.label}</span>
          <button type="button" onClick={() => onChange("mood", null)} style={{
            marginLeft: 4, background: "rgba(255,255,255,0.3)",
            border: "1px solid rgba(255,255,255,0.4)", color: "#fff",
            width: 18, height: 18, borderRadius: "50%",
            cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 900,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>
      )}

      <div style={{ maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
        {filtered ? (
          // Such-Resultate (flach)
          filtered.length === 0 ? (
            <div style={{ padding: 14, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
              Nichts gefunden für „{query}".
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {filtered.map(([em, lbl]) => (
                <ChipBtn key={lbl} emoji={em} label={lbl}
                  active={v.mood?.label === lbl}
                  onClick={() => pick(em, lbl)}
                  color={color} bg={bg}
                />
              ))}
            </div>
          )
        ) : (
          // Kategorien-View
          freeCats.map((cat) => (
            <div key={cat.title} style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 11, fontWeight: 900, color, letterSpacing: 0.5,
                marginBottom: 6, textShadow: "0 1px 0 #fff",
              }}>
                {cat.title.toUpperCase()}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {cat.items.map(([em, lbl]) => (
                  <ChipBtn key={lbl} emoji={em} label={lbl}
                    active={v.mood?.label === lbl}
                    onClick={() => pick(em, lbl)}
                    color={color} bg={bg}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <InputField
          value={v.text || ""} onChange={(x) => onChange("text", x)}
          placeholder="Warum / mehr dazu (optional)" color={color}
        />
      </div>
    </>
  );
}

function ChipBtn({ emoji, label, active, onClick, color, bg }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "6px 11px", borderRadius: 999,
      background: active ? `linear-gradient(135deg, ${color}, ${color}cc)` : bg,
      color: active ? "#fff" : "#1c1c1e",
      border: active ? `2px ridge ${color}` : `1.5px solid ${color}33`,
      cursor: "pointer", fontFamily: "inherit",
      fontSize: 12, fontWeight: active ? 900 : 700,
      display: "inline-flex", alignItems: "center", gap: 5,
      textShadow: active ? "0 1px 1px rgba(0,0,0,0.25)" : "none",
      whiteSpace: "nowrap", lineHeight: 1.2,
    }}>
      <span style={{ fontSize: 14 }}>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

// === Compose-Logik pro Typ ===
function composeForType(type, v) {
  if (!v) return "";
  if (type === "free") return (v.text || "").trim();
  if (type === "quote") {
    const q = (v.quote || "").trim();
    const a = (v.author || "").trim();
    if (!q) return "";
    return a ? `„${q}" — ${a}` : `„${q}"`;
  }
  if (type === "feeling") {
    const mood = v.mood;
    const t = (v.text || "").trim();
    if (!mood && !t) return "";
    if (!mood) return t;
    return t ? `${mood.emoji} ${mood.label} · ${t}` : `${mood.emoji} ${mood.label}`;
  }
  if (type === "mention") {
    const m = (v.mentions || "").trim();
    const t = (v.text || "").trim();
    if (!m && !t) return "";
    return [m, t].filter(Boolean).join(" — ");
  }
  if (type === "memory") {
    const y = Number(v.yearsAgo) || 1;
    const t = (v.text || "").trim();
    const c = (v.commentary || "").trim();
    if (!t) return "";
    const head = `📅 Vor ${y} ${y === 1 ? "Jahr" : "Jahren"}`;
    if (v.source === "real") {
      // Repost: Original-Text in Anführungszeichen + optional Kommentar
      return c ? `${head}: „${t}"\n\n${c}` : `${head}: „${t}"`;
    }
    return `${head}: ${t}`;
  }
  if (type === "now_playing") {
    const s = (v.song || "").trim();
    const a = (v.artist || "").trim();
    const l = (v.link || "").trim();
    if (!s && !a) return "";
    let out = `🎵 Hört ${s ? `„${s}"` : ""}`.trim();
    if (a) out += ` von ${a}`;
    if (l) out += `\n${l}`;
    return out;
  }
  if (type === "never_forget") {
    const d = (v.date || "").trim();
    const t = (v.text || "").trim();
    if (!d && !t) return "";
    return `💔 ${d} — ${t}`.trim();
  }
  return "";
}

function tipFor(type) {
  if (type === "free") return "Tipp: @name markiert Freunde";
  if (type === "quote") return "Schöne Zitate werden oft geteilt";
  if (type === "feeling") return "Such oder wähl deinen Status";
  if (type === "mention") return "@user mit @-Zeichen davor";
  if (type === "memory") return "Jeder hat Erinnerungen, teile deine";
  if (type === "now_playing") return "Was läuft gerade im Ohr?";
  if (type === "never_forget") return "Persönliche Geschichte";
  return "";
}
