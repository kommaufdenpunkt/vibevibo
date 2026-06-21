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
    id: "feeling",      label: "Status",        icon: "💭", color: "#a855f7",
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
  const { refresh: refreshMe } = useMe();
  const [postType, setPostType] = useState("free");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Form-State pro Typ (initial leer)
  const [form, setForm] = useState({
    free: { text: "", image: "" },
    quote: { quote: "", author: "", image: "" },
    feeling: { mood: null, text: "", mediaUrl: "", image: "", setStatus: true },
    mention: { mentions: "", text: "", image: "" },
    memory: { yearsAgo: 0, date: "", text: "", source: null, commentary: "", image: "" },
    now_playing: { input: "" },
    never_forget: { dateMode: "exact", date: "", time: "", approxDate: "", place: "", category: null, text: "", image: "" },
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
      const fv = form[postType] || {};
      const body = { postType, text: composedText };
      if (fv.image && fv.image.startsWith("data:image/")) body.image = fv.image;
      if (fv.mediaUrl) body.mediaUrl = fv.mediaUrl;
      // 🎵 now_playing: wenn input eine URL ist, als mediaUrl mitsenden
      if (postType === "now_playing" && fv.input && /^https?:\/\//i.test(fv.input.trim())) {
        body.mediaUrl = fv.input.trim();
      }
      if (postType === "feeling" && fv.setStatus) body.setStatus = true;
      const r = await fetch("/api/buschfunk/post", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      // 🎭 Wenn Status gesetzt wurde, Me-Context refreshen → ChatOverlay,
      //    Profil-Header etc. zeigen sofort den neuen Status
      if (postType === "feeling" && body.setStatus) {
        try { await refreshMe?.(); } catch {}
      }
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
          {/* Avatar + Name */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{ border: "3px ridge #ec4899", borderRadius: 10, padding: 2, background: "#fff" }}>
              <Avatar url={me.avatarUrl} name={me.displayName} className="vv-avatar" style={{ width: 44, height: 44, borderRadius: 8 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 16, fontWeight: 900, color: activeType.color,
                textShadow: "1px 1px 0 #fff, 2px 2px 0 rgba(0,0,0,0.05)",
              }}>{me.displayName}</div>
              <div style={{ fontSize: 11, color: "#831843", marginTop: 2, opacity: 0.8 }}>
                postet als <b style={{ color: activeType.color }}>{activeType.icon} {activeType.label}</b>
              </div>
            </div>
          </div>

          {/* Typ-Buttons — nur Icons, der aktive expandiert mit Label */}
          <div style={{
            display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap",
            alignItems: "center",
          }}>
            {POST_TYPES.map((t) => {
              const active = postType === t.id;
              return (
                <button key={t.id} type="button"
                  onClick={() => setPostType(t.id)}
                  title={t.label}
                  style={{
                    height: 44,
                    width: active ? "auto" : 44,
                    minWidth: 44,
                    padding: active ? "0 14px 0 10px" : 0,
                    borderRadius: 999,
                    background: active
                      ? `linear-gradient(135deg, ${t.color}, ${t.color}cc)`
                      : t.bg,
                    color: active ? "#fff" : t.color,
                    border: active ? `2px ridge ${t.color}` : `2px solid ${t.color}33`,
                    cursor: "pointer", fontFamily: "inherit",
                    fontSize: 13, fontWeight: 900,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                    textShadow: active ? "0 1px 1px rgba(0,0,0,0.25)" : "1px 1px 0 #fff",
                    transition: "all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    boxShadow: active ? `0 5px 14px ${t.color}55` : "none",
                    overflow: "hidden",
                  }}
                  onMouseOver={(e) => {
                    if (!active) {
                      e.currentTarget.style.transform = "scale(1.1)";
                      e.currentTarget.style.boxShadow = `0 3px 10px ${t.color}50`;
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!active) {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{t.icon}</span>
                  {active && (
                    <span style={{
                      whiteSpace: "nowrap",
                      animation: "vv-jc-label-in 0.25s ease-out",
                    }}>{t.label}</span>
                  )}
                </button>
              );
            })}
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
          @keyframes vv-jc-label-in {
            from { opacity: 0; transform: translateX(-4px); }
            to   { opacity: 1; transform: translateX(0); }
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
      <>
        <TextareaField
          value={v.text || ""} onChange={(x) => onChange("text", x)}
          placeholder="Was machst du gerade?" color={color} rows={6}
        />
        <ImageUpload value={v.image || ""} onChange={(x) => onChange("image", x)}
          color={color} bg={bg} label="📸 Bild anhängen" />
      </>
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
        <ImageUpload value={v.image || ""} onChange={(x) => onChange("image", x)}
          color={color} bg={bg} label="📸 Bild zur Quelle" />
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
        <ImageUpload value={v.image || ""} onChange={(x) => onChange("image", x)}
          color={color} bg={bg} label="📸 Foto von euch" />
      </>
    );
  }
  if (type === "memory") {
    return <MemoryForm v={v} onChange={onChange} color={color} bg={bg} />;
  }
  if (type === "now_playing") {
    return (
      <>
        <Label color={color}>WAS LÄUFT GERADE?</Label>
        <InputField
          value={v.input || ""} onChange={(x) => onChange("input", x)}
          placeholder="🎵 YouTube/Spotify-Link einfügen oder Song + Artist tippen"
          color={color}
        />
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 6, fontStyle: "italic", lineHeight: 1.4 }}>
          Tipp: Wenn du einen Link einfügst (z.B. youtube.com/watch?…),
          erscheint im Feed automatisch der Player. Sonst nur als Text.
        </div>
      </>
    );
  }
  if (type === "never_forget") {
    return <NeverForgetForm v={v} onChange={onChange} color={color} bg={bg} />;
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
        <ManualMemoryForm v={v} onChange={onChange} color={color} bg={bg} />
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

// === Manueller Erinnerungs-Form mit Datum-Picker ===
function ManualMemoryForm({ v, onChange, color, bg }) {
  // ISO yyyy-mm-dd → für native date input
  const today = new Date();
  const maxDate = today.toISOString().slice(0, 10);

  function pickDate(iso) {
    if (!iso) {
      onChange("date", "");
      onChange("yearsAgo", 0);
      onChange("source", "manual");
      return;
    }
    const d = new Date(iso);
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
    onChange("date", iso);
    onChange("yearsAgo", Math.max(0, years));
    onChange("source", "manual");
  }

  function pickQuickYear(y) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - y);
    pickDate(d.toISOString().slice(0, 10));
  }

  const dateLabel = v.date ? new Date(v.date).toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }) : null;

  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: 0.5, marginBottom: 6 }}>
        VON WANN IST DIE ERINNERUNG?
      </div>

      {/* Datum-Picker */}
      <input
        type="date"
        value={v.date || ""}
        max={maxDate}
        onChange={(e) => pickDate(e.target.value)}
        style={{
          width: "100%", padding: 12,
          background: "#fff", color: "#1c1c1e",
          border: `2px ridge ${color}`,
          borderRadius: 10, fontFamily: "inherit", fontSize: 14, fontWeight: 700,
          outline: "none", boxSizing: "border-box", marginBottom: 8,
        }}
      />

      {/* Schnell-Buttons */}
      <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10.5, color: "#94a3b8", alignSelf: "center", marginRight: 4, fontWeight: 700 }}>
          Schnell:
        </span>
        {[1, 2, 3, 5, 10, 15, 20, 25].map((y) => {
          const active = v.yearsAgo === y;
          return (
            <button key={y} type="button" onClick={() => pickQuickYear(y)} style={{
              padding: "4px 11px", borderRadius: 999,
              background: active ? `linear-gradient(135deg, ${color}, ${color}cc)` : bg,
              color: active ? "#fff" : color,
              border: active ? `2px ridge ${color}` : `1.5px solid ${color}33`,
              cursor: "pointer", fontFamily: "inherit",
              fontSize: 11, fontWeight: 800,
              textShadow: active ? "0 1px 1px rgba(0,0,0,0.25)" : "none",
            }}>
              -{y}{y === 1 ? "J" : "J"}
            </button>
          );
        })}
      </div>

      {/* Anzeige des gewählten Datums */}
      {dateLabel && (
        <div style={{
          padding: "8px 12px", borderRadius: 8, marginBottom: 10,
          background: bg, border: `2px solid ${color}33`,
          fontSize: 12, color, fontWeight: 700, textAlign: "center",
        }}>
          📅 <b>{dateLabel}</b>
          {v.yearsAgo > 0 && <span style={{ opacity: 0.85 }}> — vor {v.yearsAgo} {v.yearsAgo === 1 ? "Jahr" : "Jahren"}</span>}
        </div>
      )}

      <TextareaField
        value={v.text || ""} onChange={(x) => { onChange("text", x); onChange("source", "manual"); }}
        placeholder="Was war damals? (z.B. ICQ-Sound im Ohr, Sommer 2003 🍦)"
        color={color} rows={4}
      />

      {/* 📸 Bild-Upload */}
      <ImageUpload
        value={v.image || ""}
        onChange={(x) => onChange("image", x)}
        color={color} bg={bg}
        label="📸 Foto zur Erinnerung"
      />
    </>
  );
}

function ImageUpload({ value, onChange, color, bg, label = "📸 Foto" }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Nur Bilder erlaubt (PNG/JPG/HEIC).");
      setTimeout(() => setErr(""), 4000);
      return;
    }
    if (file.size > 8_000_000) {
      setErr("Bild zu groß (max 8 MB).");
      setTimeout(() => setErr(""), 4000);
      return;
    }
    setBusy(true); setErr("");
    try {
      const dataUrl = await readAndCompress(file, 1024);
      onChange(dataUrl);
    } catch (e) {
      setErr("Bild konnte nicht gelesen werden.");
    } finally { setBusy(false); }
  }

  if (value) {
    return (
      <div style={{ marginTop: 10, position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" style={{
          width: "100%", maxHeight: 280, objectFit: "contain",
          borderRadius: 10, border: `2px ridge ${color}`,
          background: "#000", display: "block",
        }} />
        <button type="button" onClick={() => onChange("")} title="Bild entfernen" style={{
          position: "absolute", top: 8, right: 8,
          width: 32, height: 32, borderRadius: "50%",
          background: "rgba(255,255,255,0.95)", color: "#b91c1c",
          border: "2px ridge #fff", cursor: "pointer", fontSize: 14,
          fontWeight: 900, fontFamily: "inherit",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }}>✕</button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFile(e.target.files?.[0])}
        style={{ display: "none" }}
      />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} style={{
        width: "100%", padding: "10px 14px", borderRadius: 10,
        background: bg, color, border: `2px dashed ${color}66`,
        cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
        fontSize: 13, fontWeight: 800,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        {busy ? "⏳ Lade…" : label}
        <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>(Kamera oder Galerie)</span>
      </button>
      {err && (
        <div style={{
          marginTop: 6, padding: 8, borderRadius: 6,
          background: "rgba(239,68,68,0.1)", color: "#991b1b",
          fontSize: 11, fontWeight: 700, textAlign: "center",
        }}>⚠ {err}</div>
      )}
    </div>
  );
}

// Liest File, skaliert auf max-Dimension, gibt base64 JPG zurück
function readAndCompress(file, maxDim = 1024) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(1, maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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

// === Nie-Vergessen-Form mit Datum+Uhrzeit+Ort+Kategorie ===
const NF_CATEGORIES = [
  { id: "family",   emoji: "👨‍👩‍👧",  label: "Familie" },
  { id: "school",   emoji: "🎓",  label: "Schule" },
  { id: "work",     emoji: "💼",  label: "Beruf" },
  { id: "love",     emoji: "💕",  label: "Liebe" },
  { id: "travel",   emoji: "✈️",  label: "Reise" },
  { id: "loss",     emoji: "🕯️",  label: "Abschied" },
  { id: "history",  emoji: "🌍",  label: "Geschichte" },
  { id: "moment",   emoji: "✨",  label: "Moment" },
];

const NF_ERAS = [
  { label: "Kindheit",      value: "in der Kindheit" },
  { label: "Schulzeit",     value: "in der Schulzeit" },
  { label: "90er",          value: "in den 90er Jahren" },
  { label: "2000er",        value: "in den 2000er Jahren" },
  { label: "2010er",        value: "in den 2010er Jahren" },
  { label: "Studium",       value: "im Studium" },
  { label: "Ausbildung",    value: "in der Ausbildung" },
  { label: "Sommer 2003",   value: "Sommer 2003" },
  { label: "WM 2006",       value: "während der WM 2006" },
];

function NeverForgetForm({ v, onChange, color, bg }) {
  const [open, setOpen] = useState({
    date: !!v.date || !!v.approxDate,
    place: !!v.place,
    cat: !!v.category,
  });
  const today = new Date();
  const maxDate = today.toISOString().slice(0, 10);

  function toggle(key) {
    setOpen((o) => ({ ...o, [key]: !o[key] }));
  }

  // Chip-Summary: zeigt was eingegeben wurde (kompakt)
  const summary = [];
  if (v.date) {
    const dt = new Date(v.date);
    summary.push("📅 " + dt.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
      + (v.time ? " · " + v.time + " Uhr" : ""));
  } else if (v.approxDate) {
    summary.push("🌫 " + v.approxDate);
  }
  if (v.place) summary.push("📍 " + v.place);
  if (v.category) {
    const c = NF_CATEGORIES.find((x) => x.id === v.category);
    if (c) summary.push(`${c.emoji} ${c.label}`);
  }

  return (
    <>
      {/* HAUPTSACHE: Die emotionale Story */}
      <TextareaField
        value={v.text || ""} onChange={(x) => onChange("text", x)}
        placeholder="💔 Ich werde nie vergessen, wie …"
        color={color} rows={6}
      />

      {/* Summary-Chips wenn was eingegeben wurde */}
      {summary.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10,
          padding: 10, borderRadius: 10,
          background: bg, border: `2px ridge ${color}`,
        }}>
          {summary.map((s, i) => (
            <span key={i} style={{
              padding: "3px 10px", borderRadius: 999,
              background: "rgba(255,255,255,0.8)", color,
              fontSize: 11, fontWeight: 800,
            }}>{s}</span>
          ))}
        </div>
      )}

      {/* + Buttons für optionale Felder */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        <AddChip label="Datum" emoji="📅" open={open.date} onClick={() => toggle("date")} color={color} bg={bg} filled={!!v.date || !!v.approxDate} />
        <AddChip label="Ort" emoji="📍" open={open.place} onClick={() => toggle("place")} color={color} bg={bg} filled={!!v.place} />
        <AddChip label="Kategorie" emoji="🏷️" open={open.cat} onClick={() => toggle("cat")} color={color} bg={bg} filled={!!v.category} />
      </div>

      {/* Datum (aufklappbar) */}
      {open.date && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: bg, border: `2px ridge ${color}33` }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
            <input type="date" value={v.date || ""} max={maxDate}
              onChange={(e) => { onChange("date", e.target.value); onChange("approxDate", ""); }}
              style={dateInputStyle(color)}
              placeholder="Genaues Datum"
            />
            <input type="time" value={v.time || ""}
              onChange={(e) => onChange("time", e.target.value)}
              style={dateInputStyle(color)}
            />
          </div>
          <div style={{ textAlign: "center", fontSize: 10, color: "#94a3b8", margin: "6px 0", fontWeight: 700, letterSpacing: 0.5 }}>
            — ODER UNGEFÄHR —
          </div>
          <input value={v.approxDate || ""}
            onChange={(e) => { onChange("approxDate", e.target.value); onChange("date", ""); onChange("time", ""); }}
            placeholder="z.B. Sommer 2003, Schulzeit, 11.09.2001"
            style={dateInputStyle(color)}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
            {NF_ERAS.map((e) => (
              <button key={e.label} type="button"
                onClick={() => { onChange("approxDate", e.value); onChange("date", ""); onChange("time", ""); }}
                style={{
                  padding: "3px 9px", borderRadius: 999,
                  background: v.approxDate === e.value ? `linear-gradient(135deg, ${color}, ${color}cc)` : "rgba(255,255,255,0.7)",
                  color: v.approxDate === e.value ? "#fff" : color,
                  border: v.approxDate === e.value ? `2px ridge ${color}` : `1.5px solid ${color}33`,
                  cursor: "pointer", fontFamily: "inherit",
                  fontSize: 10, fontWeight: 700,
                }}>{e.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Ort (aufklappbar) */}
      {open.place && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: bg, border: `2px ridge ${color}33` }}>
          <input value={v.place || ""}
            onChange={(e) => onChange("place", e.target.value)}
            placeholder="z.B. in der Schule, zu Hause, Berlin, am Strand"
            style={dateInputStyle(color)}
          />
        </div>
      )}

      {/* Kategorie (aufklappbar) */}
      {open.cat && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: bg, border: `2px ridge ${color}33` }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {NF_CATEGORIES.map((c) => {
              const active = v.category === c.id;
              return (
                <button key={c.id} type="button"
                  onClick={() => onChange("category", active ? null : c.id)}
                  style={{
                    padding: "5px 11px", borderRadius: 999,
                    background: active ? `linear-gradient(135deg, ${color}, ${color}cc)` : "rgba(255,255,255,0.7)",
                    color: active ? "#fff" : color,
                    border: active ? `2px ridge ${color}` : `1.5px solid ${color}33`,
                    cursor: "pointer", fontFamily: "inherit",
                    fontSize: 11, fontWeight: 800,
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                  <span style={{ fontSize: 13 }}>{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ImageUpload value={v.image || ""} onChange={(x) => onChange("image", x)}
        color={color} bg={bg} label="📸 Foto vom Moment (optional)" />
    </>
  );
}

function AddChip({ label, emoji, open, onClick, color, bg, filled }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "6px 12px", borderRadius: 999,
      background: open
        ? `linear-gradient(135deg, ${color}, ${color}cc)`
        : (filled ? bg : "rgba(0,0,0,0.04)"),
      color: open ? "#fff" : (filled ? color : "#64748b"),
      border: open
        ? `2px ridge ${color}`
        : (filled ? `2px solid ${color}66` : "1.5px solid rgba(0,0,0,0.1)"),
      cursor: "pointer", fontFamily: "inherit",
      fontSize: 11.5, fontWeight: 800,
      display: "inline-flex", alignItems: "center", gap: 4,
      textShadow: open ? "0 1px 1px rgba(0,0,0,0.25)" : "none",
    }}>
      <span style={{ fontSize: 12 }}>{emoji}</span>
      <span>{open ? label : `+ ${label}`}</span>
      {filled && !open && <span style={{ fontSize: 10 }}>✓</span>}
    </button>
  );
}

function Label({ color, children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 900, color, letterSpacing: 0.6,
      marginBottom: 4, textTransform: "uppercase", opacity: 0.85,
    }}>{children}</div>
  );
}

function dateInputStyle(color) {
  return {
    width: "100%", padding: 10,
    background: "#fff", color: "#1c1c1e",
    border: `2px ridge ${color}`,
    borderRadius: 10, fontFamily: "inherit", fontSize: 14, fontWeight: 700,
    outline: "none", boxSizing: "border-box",
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

      {/* 🎵 Optional: Song / YouTube-Link */}
      <div style={{ marginTop: 8 }}>
        <InputField
          value={v.mediaUrl || ""} onChange={(x) => onChange("mediaUrl", x)}
          placeholder="🎵 YouTube/Spotify-Link zur Stimmung (optional)"
          color={color}
        />
      </div>

      {/* 📸 Optional: Bild */}
      <ImageUpload
        value={v.image || ""}
        onChange={(x) => onChange("image", x)}
        color={color} bg={bg}
        label="📸 Foto / Bild dazu"
      />

      {/* ✓ Auch als Profil-Status setzen */}
      <label style={{
        display: "flex", alignItems: "center", gap: 8, marginTop: 10,
        padding: "8px 12px", borderRadius: 10,
        background: v.setStatus ? `linear-gradient(135deg, ${color}22, ${color}11)` : "rgba(0,0,0,0.03)",
        border: v.setStatus ? `2px ridge ${color}` : "2px solid rgba(0,0,0,0.05)",
        cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: v.setStatus ? color : "#475569",
      }}>
        <input type="checkbox" checked={!!v.setStatus}
          onChange={(e) => onChange("setStatus", e.target.checked)}
          style={{ width: 16, height: 16, accentColor: color, flexShrink: 0 }} />
        <span style={{ flex: 1 }}>
          ⭐ Als <b>Profil-Status</b> setzen — erscheint überall (Chat, Header, Online-Liste)
        </span>
      </label>
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
    const i = (v.input || "").trim();
    if (!i) return "";
    if (/^https?:\/\//i.test(i)) return `🎵 Hört gerade: ${i}`;
    return `🎵 Hört gerade: ${i}`;
  }
  if (type === "never_forget") {
    const t = (v.text || "").trim();
    if (!t) return "";

    // Datums-Teil zusammenbauen
    let when = "";
    if (v.dateMode === "approx") {
      when = (v.approxDate || "").trim();
    } else if (v.date) {
      const dt = new Date(v.date + (v.time ? `T${v.time}` : "T12:00"));
      when = dt.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
      if (v.time) {
        when += " · " + dt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
      }
    }

    const place = (v.place || "").trim();
    const catObj = (v.category && (
      v.category === "family"  ? { emoji: "👨‍👩‍👧",  label: "Familie" } :
      v.category === "school"  ? { emoji: "🎓",  label: "Schule" } :
      v.category === "work"    ? { emoji: "💼",  label: "Beruf" } :
      v.category === "love"    ? { emoji: "💕",  label: "Liebe" } :
      v.category === "travel"  ? { emoji: "✈️",  label: "Reise" } :
      v.category === "loss"    ? { emoji: "🕯️",  label: "Abschied" } :
      v.category === "history" ? { emoji: "🌍",  label: "Geschichte" } :
      v.category === "moment"  ? { emoji: "✨",  label: "Moment" } : null
    )) || null;

    let head = "💔";
    if (catObj) head += ` ${catObj.emoji}`;
    if (when) head += ` ${when}`;
    if (place) head += ` · ${place}`;
    return `${head}\n\n${t}`;
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
