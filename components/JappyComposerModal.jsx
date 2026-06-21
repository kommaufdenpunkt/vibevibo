"use client";

// ✿ 2006er „Beitrag erstellen"-Modal — Jappy/SchülerVZ-Style.
//
//   • Trigger: kompakte „Was machst du gerade?"-Pille auf Startseite
//   • Modal mit pinken Ridge-Borders, Glitzer-Background, Gradient-Title
//   • Aa-Hintergrund-Modus (kurze Texte als Glitter-Hero)
//   • Smiley-Picker (40 Smileys)
//   • Bold/Italic via Markdown
//   • Post-Typ-Dropdown (7 Typen)
//   • Vollständig keyboard-bedienbar (ESC, Auto-Focus)

import { useEffect, useRef, useState } from "react";
import { useMe } from "@/lib/useMe";
import Avatar from "@/components/Avatar";

const SMILEYS = [
  "😀","😃","😄","😁","😆","😅","🤣","😂",
  "🙂","😊","😍","🥰","😘","😎","🤩","🥳",
  "🤔","😏","😒","🙄","😴","😪","😭","😢",
  "😩","😤","😡","🤬","😱","😨","🥺","🤗",
  "💖","❤️","💔","💕","💞","✨","🌟","⭐",
  "☀️","🌈","🎉","🎊","🍀","🌸","🌹","🎵",
];

const POST_TYPES = [
  { id: "free",         label: "Frei",          icon: "💬", color: "#ec4899", bg: "linear-gradient(135deg, #fce7f3, #fbcfe8, #f5d0fe)" },
  { id: "quote",        label: "Zitat",         icon: "🌹", color: "#db2777", bg: "linear-gradient(135deg, #fff1f2, #ffe4e6, #fecdd3)" },
  { id: "feeling",      label: "Gefühl",        icon: "💭", color: "#a855f7", bg: "linear-gradient(135deg, #faf5ff, #f3e8ff, #e9d5ff)" },
  { id: "mention",      label: "Mit Markierung", icon: "👯", color: "#06b6d4", bg: "linear-gradient(135deg, #ecfeff, #cffafe, #a5f3fc)" },
  { id: "memory",       label: "Erinnerung",    icon: "📅", color: "#f97316", bg: "linear-gradient(135deg, #fff7ed, #ffedd5, #fed7aa)" },
  { id: "now_playing",  label: "Höre gerade",   icon: "🎵", color: "#10b981", bg: "linear-gradient(135deg, #ecfdf5, #d1fae5, #a7f3d0)" },
  { id: "never_forget", label: "Nie vergessen", icon: "💔", color: "#475569", bg: "linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1)" },
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
      <div style={{
        border: "2px ridge #ec4899", borderRadius: "50%", padding: 2, background: "#fff",
      }}>
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
  const [text, setText] = useState("");
  const [postType, setPostType] = useState("free");
  const [bgMode, setBgMode] = useState(false);
  const [showSmileys, setShowSmileys] = useState(false);
  const [showTypes, setShowTypes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const textareaRef = useRef(null);

  const activeType = POST_TYPES.find((t) => t.id === postType) || POST_TYPES[0];
  const remaining = MAX_LEN - text.length;
  const canSubmit = text.trim().length >= 2 && remaining >= 0 && !busy;
  const useBg = bgMode && text.length <= 100;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  function insertAtCursor(snippet) {
    const ta = textareaRef.current;
    if (!ta) { setText((t) => t + snippet); return; }
    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;
    setText(text.slice(0, start) + snippet + text.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  }
  function wrapSelection(prefix, suffix = prefix) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;
    const selected = text.slice(start, end);
    const replacement = prefix + (selected || "Text") + suffix;
    setText(text.slice(0, start) + replacement + text.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const innerStart = start + prefix.length;
      const innerEnd = innerStart + (selected || "Text").length;
      ta.setSelectionRange(innerStart, innerEnd);
    });
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/buschfunk/post", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postType, text }),
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
        boxShadow: "0 22px 64px rgba(236,72,153,0.35), 0 0 0 1px rgba(255,255,255,0.5)",
        border: "4px ridge #ec4899",
      }}>
        {/* Glitzer-Header mit Gradient-Wave */}
        <div style={{
          position: "relative", overflow: "hidden",
          padding: "14px 16px",
          background: "linear-gradient(135deg, #ec4899, #a855f7, #06b6d4, #ec4899)",
          backgroundSize: "300% 100%",
          animation: "vv-jc-wave 8s ease-in-out infinite",
          borderBottom: "3px ridge #fff",
        }}>
          <div style={{
            position: "absolute", top: 6, left: 14, fontSize: 16, color: "#fff",
            opacity: 0.7, animation: "vv-jc-spin 5s ease-in-out infinite",
          }}>✿</div>
          <div style={{
            position: "absolute", bottom: 6, right: 14, fontSize: 16, color: "#fff",
            opacity: 0.7, animation: "vv-jc-spin 5s ease-in-out infinite reverse",
          }}>✿</div>
          <div style={{
            textAlign: "center", fontSize: 18, fontWeight: 900,
            color: "#fff", letterSpacing: 1.5,
            textShadow: "0 2px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.4)",
          }}>
            ★ BEITRAG ERSTELLEN ★
          </div>
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
        <div style={{ padding: 16, overflowY: "auto", flex: 1, background: "transparent" }}>
          {/* Avatar + Name + Typ-Dropdown */}
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
                <button onClick={() => { setShowTypes((s) => !s); setShowSmileys(false); }} style={{
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
                    padding: 6, minWidth: 220, display: "grid", gap: 2,
                  }}>
                    {POST_TYPES.map((t) => {
                      const active = postType === t.id;
                      return (
                        <button key={t.id} type="button"
                          onClick={() => { setPostType(t.id); setShowTypes(false); }}
                          style={{
                            padding: "7px 10px", borderRadius: 6,
                            background: active ? `linear-gradient(135deg, ${t.color}22, ${t.color}11)` : "transparent",
                            color: active ? t.color : "#1c1c1e",
                            border: "none", cursor: "pointer", fontFamily: "inherit",
                            fontSize: 13, fontWeight: active ? 900 : 600,
                            textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                          }}
                          onMouseOver={(e) => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
                          onMouseOut={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                        >
                          <span style={{ fontSize: 15 }}>{t.icon}</span>
                          <span style={{ flex: 1 }}>{t.label}</span>
                          {active && <span style={{ color: t.color, fontWeight: 900 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Textarea */}
          {useBg ? (
            <div style={{
              background: activeType.bg,
              borderRadius: 12, minHeight: 220,
              padding: 24, display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 12,
              border: `3px ridge ${activeType.color}`,
              position: "relative", overflow: "hidden",
              boxShadow: `inset 0 0 30px ${activeType.color}22`,
            }}>
              <span style={{ position: "absolute", top: 8, left: 10, fontSize: 14, color: activeType.color, opacity: 0.5 }}>✿</span>
              <span style={{ position: "absolute", top: 8, right: 10, fontSize: 14, color: activeType.color, opacity: 0.5 }}>✿</span>
              <span style={{ position: "absolute", bottom: 8, left: 10, fontSize: 14, color: activeType.color, opacity: 0.5 }}>✿</span>
              <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 14, color: activeType.color, opacity: 0.5 }}>✿</span>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_LEN + 50))}
                placeholder={`Was machst du gerade, ${me.displayName}?`}
                rows={3}
                style={{
                  width: "100%", padding: 0, background: "transparent",
                  color: activeType.color, border: "none",
                  fontFamily: "inherit",
                  fontSize: text.length > 60 ? 18 : text.length > 30 ? 24 : 28,
                  fontWeight: 900, lineHeight: 1.25,
                  textAlign: "center", outline: "none", resize: "none",
                  textShadow: "0 1px 0 #fff, 0 2px 4px rgba(0,0,0,0.08)",
                }}
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN + 50))}
              placeholder={`Was machst du gerade, ${me.displayName}?`}
              rows={6}
              style={{
                width: "100%", padding: 12, background: "#fff",
                color: "#1c1c1e", border: `2px ridge ${activeType.color}`,
                borderRadius: 10,
                fontFamily: "inherit", fontSize: text.length > 80 ? 15 : 17,
                lineHeight: 1.45, marginBottom: 12,
                outline: "none", resize: "vertical", boxSizing: "border-box",
                minHeight: 120,
              }}
            />
          )}

          {/* Smiley-Picker */}
          {showSmileys && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2,
              padding: 8, marginBottom: 12,
              background: "linear-gradient(135deg, #fce7f3, #f5d0fe)",
              borderRadius: 10,
              border: "2px ridge #ec4899",
            }}>
              {SMILEYS.map((s) => (
                <button key={s} type="button" onClick={() => insertAtCursor(s)} style={{
                  padding: 4, fontSize: 22, background: "transparent",
                  border: "none", cursor: "pointer", borderRadius: 4,
                  transition: "background 0.12s, transform 0.12s",
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.7)"; e.currentTarget.style.transform = "scale(1.18)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "scale(1)"; }}
                >{s}</button>
              ))}
            </div>
          )}

          {/* Format-Toolbar */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 10px", borderRadius: 10,
            background: "linear-gradient(135deg, #fce7f3, #f5d0fe)",
            border: "2px ridge #ec4899",
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setBgMode((b) => !b)} title="Glitter-Hintergrund"
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: useBg
                    ? activeType.bg
                    : "linear-gradient(135deg, #fb923c, #ec4899, #a855f7, #06b6d4)",
                  color: useBg ? activeType.color : "#fff",
                  border: "2px ridge #fff",
                  fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                  textShadow: useBg ? "0 1px 0 #fff" : "0 1px 2px rgba(0,0,0,0.3)",
                }}>Aa</button>
              <button onClick={() => wrapSelection("**")} title="Fett"
                style={fmtBtn}><b>F</b></button>
              <button onClick={() => wrapSelection("*")} title="Kursiv"
                style={{ ...fmtBtn, fontStyle: "italic" }}>K</button>
            </div>
            <button onClick={() => { setShowSmileys((s) => !s); setShowTypes(false); }} title="Smileys"
              style={{
                width: 38, height: 38, borderRadius: "50%",
                background: showSmileys
                  ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                  : "rgba(255,255,255,0.85)",
                color: "#7c2d12", border: "2px ridge #fff",
                cursor: "pointer", fontSize: 18, fontFamily: "inherit",
              }}>😊</button>
          </div>

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
            <span style={{ fontStyle: "italic", opacity: 0.85 }}>
              Tipp: @name markiert Freunde ✿
            </span>
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

const fmtBtn = {
  width: 38, height: 38, borderRadius: 10,
  background: "rgba(255,255,255,0.85)", color: "#831843",
  border: "2px ridge #fff",
  cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800,
};
