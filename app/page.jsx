"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Marquee from "@/components/Marquee";
import Landing from "@/components/Landing";
import Buschfunk from "@/components/Buschfunk";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "@/components/GenderAge";
import Avatar from "@/components/Avatar";

// Bild im Browser auf 600px verkleinern -> kleines JPEG
function fileToPostImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const maxDim = 600;
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

function StatusBox({ onPosted }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);

  async function onPickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMsg("Bitte ein Bild auswählen."); return; }
    try { setImage(await fileToPostImage(file)); } catch { setMsg("Bild konnte nicht geladen werden."); }
  }

  async function submit() {
    const t = text.trim();
    if (!t && !image) return;
    setBusy(true); setMsg("");
    try {
      const res = await api.setStatus(t, true, image);
      setText(""); setImage(null);
      if (res?.imageNote) setMsg("⏳ " + res.imageNote);
      else setMsg("✅ Gepostet!");
      onPosted?.();
      setTimeout(() => setMsg(""), 4500);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vv-card">
      <h3 style={{ marginTop: 0 }}>📝 Was machst du gerade?</h3>
      <textarea
        className="vv-textarea"
        rows={2}
        value={text}
        maxLength={280}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Erzähl was – z.B. „🎮 zocke gleich was" oder „endlich Wochenende!"'}
      />
      {image && (
        <div style={{ position: "relative", marginTop: 8, display: "inline-block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" style={{ maxHeight: 160, maxWidth: "100%", borderRadius: 10 }} />
          <button
            type="button"
            onClick={() => setImage(null)}
            aria-label="Bild entfernen"
            style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", border: "none", background: "#222", color: "#fff", cursor: "pointer", padding: 0 }}
          >×</button>
        </div>
      )}
      <div className="vv-row vv-mt-8" style={{ alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <button type="button" className="vv-btn" onClick={() => fileRef.current?.click()} disabled={busy}>📷 Foto anhängen</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
        <span className="vv-muted" style={{ fontSize: 11 }}>Erscheint im Buschfunk-Feed</span>
        <div className="vv-spacer" />
        <button type="button" className="vv-btn vv-btn-pink" disabled={busy || (!text.trim() && !image)} onClick={submit}>
          {busy ? "…" : "📢 Posten"}
        </button>
      </div>
      {msg && <div className="vv-mt-8" style={{ fontWeight: "bold", fontSize: 13 }}>{msg}</div>}
      <div className="vv-muted vv-mt-8" style={{ fontSize: 11 }}>🤖 Fidolin prüft Text und Bild streng – nichts Rechtswidriges/Anrüchiges.</div>
    </div>
  );
}

export default function HomePage() {
  const { me, loading } = useMe();
  const [users, setUsers] = useState([]);
  const [feedTick, setFeedTick] = useState(0);

  useEffect(() => {
    if (!me) return;
    const load = () => api.listUsers().then((d) => setUsers(d.users)).catch(() => {});
    load();
    const t = setInterval(load, 20000); // Online-Status live
    return () => clearInterval(t);
  }, [me]);

  if (loading) return null;

  // Nicht eingeloggt: Landing Page mit Wow-Effekt
  if (!me) return <Landing />;

  // Eingeloggt: Klassische Feed-Startseite
  const onlineUsers = users.filter((u) => u.online);

  return (
    <>
      <Marquee speed={60}>
        🎉 Willkommen zurück, {me.displayName}! ✿ Aktuell {onlineUsers.length} User online ✿ Pinnwand wie früher! ✿ Geschenke verschicken ✿ Profile mit Background-Musik ✿ Foto-Alben & Gruppen ✿ Echtzeit-Messenger ✿
      </Marquee>

      <div className="vv-grid-2">
        <div>
          <div className="vv-card">
            <h2 style={{ marginTop: 0 }}>💌 Willkommen zurück, {me.displayName}!</h2>
            <p style={{ lineHeight: 1.6 }}>
              Erinnerst du dich noch? <strong>Pinnwand-Einträge</strong> mit Glitzer-Smileys,
              ein <strong>*gruscheln*</strong> ohne Algorithmus, das eigene Profil mit
              <strong> Lieblingssong</strong> dahinter — und das <strong>ICQ-Oh-Oh</strong>,
              wenn dir jemand schreibt. Genau das machen wir hier wieder.
            </p>
            <div className="vv-muted" style={{ fontSize: 12, fontStyle: "italic" }}>
              ✿ Memories zählen. Diese eine Nachricht. Diese eine Rose. Diese eine Top-8-Platzierung. ✿
            </div>
            <div className="vv-row vv-mt-12" style={{ flexWrap: "wrap" }}>
              <Link href="/profile" className="vv-btn vv-btn-pink">👤 Mein Profil</Link>
              <Link href="/freunde" className="vv-btn vv-btn-cyan">👯 Wer ist online?</Link>
              <Link href="/messenger" className="vv-btn">✉️ Nachrichten</Link>
              <Link href="/profile/skin" className="vv-btn">🎨 Skin gestalten</Link>
            </div>
          </div>

          <StatusBox onPosted={() => setFeedTick((t) => t + 1)} />

          <Buschfunk key={feedTick} />

          <div className="vv-card">
            <h2>👥 Mitglieder</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {users.slice(0, 12).map((u) => (
                <Link key={u.username} href={`/u/${u.username}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8, background: "#23232f", textDecoration: "none" }}>
                  <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.online && <span className="vv-online-dot" />}
                      <ColoredName gender={u.gender} age={u.age} name={u.displayName} fallbackColor="#e8e8f0" />
                    </span>
                    {u.mood && <span style={{ display: "block", fontSize: 11, color: "#a9b0c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.mood}</span>}
                  </span>
                </Link>
              ))}
            </div>
            <div className="vv-row vv-mt-12">
              <div className="vv-spacer" />
              <Link href="/freunde" className="vv-btn">→ Alle Mitglieder</Link>
            </div>
          </div>
        </div>

        <div>
          <div className="vv-card">
            <h3>🟢 Online jetzt</h3>
            {onlineUsers.length === 0 ? (
              <div className="vv-muted">Niemand online :(</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {onlineUsers.slice(0, 15).map((u) => (
                  <Link key={u.username} href={`/u/${u.username}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8, background: "#23232f", textDecoration: "none" }}>
                    <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span className="vv-online-dot" />
                        <ColoredName gender={u.gender} age={u.age} name={u.displayName} fallbackColor="#e8e8f0" />
                      </span>
                      {u.mood && <span style={{ display: "block", fontSize: 11, color: "#a9b0c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.mood}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="vv-card">
            <h3>💡 Schnelleinstieg</h3>
            <ul style={{ paddingLeft: 18, lineHeight: 1.7 }}>
              <li>📝 <Link href="/profile/edit">Profil bearbeiten</Link></li>
              <li>🎨 <Link href="/profile/skin">CSS-Skin gestalten</Link></li>
              <li>📸 <Link href="/fotos">Fotos hochladen</Link></li>
              <li>🏘️ <Link href="/gruppen">Gruppen entdecken</Link></li>
              <li>🎁 <Link href="/geschenke">Geschenke verschicken</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
