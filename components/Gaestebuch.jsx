"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { relTime } from "@/lib/format";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "./GenderAge";
import OnlineName from "./OnlineName";
import MentionText from "./MentionText";
import InlineToolbar from "./InlineToolbar";

function fileToImage(file, maxDim = 700) {
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

export default function Gaestebuch({ profile, initialEntries = [] }) {
  const { me } = useMe();
  const [entries, setEntries] = useState(initialEntries);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);
  const taRef = useRef(null);

  const isOwner = me?.username === profile.username;

  const load = useCallback(async () => {
    try { const d = await api.getGuestbook(profile.username); setEntries(d.entries || []); } catch {}
  }, [profile.username]);

  useEffect(() => { if (!initialEntries.length) load(); }, [load, initialEntries.length]);

  async function onPickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Bitte ein Bild auswählen."); return; }
    try { setPendingImage(await fileToImage(file)); }
    catch { alert("Bild konnte nicht geladen werden."); }
  }

  async function submit(e) {
    e.preventDefault();
    const v = text.trim();
    if (!v && !pendingImage) return;
    setBusy(true); setErr("");
    try {
      const d = await api.postGuestbook(profile.username, v, pendingImage);
      setEntries(d.entries || []);
      setText(""); setPendingImage(null);
      if (d.imageNote) alert(d.imageNote);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    if (!confirm("Eintrag löschen?")) return;
    try {
      const d = await api.deleteGuestbookEntry(profile.username, id);
      setEntries(d.entries || []);
    } catch (e) { alert(e.message); }
  }

  return (
    <div className="vv-card">
      <h3 style={{ marginTop: 0 }}>📖 Gästebuch von {profile.displayName}</h3>
      <div className="vv-muted" style={{ fontSize: 12, marginBottom: 8 }}>
        Klassisch wie früher – sign hier mit einem netten Gruß. Fidolin prüft jeden Eintrag (Text + Bild).
      </div>
      {me ? (
        <form onSubmit={submit}>
          <InlineToolbar taRef={taRef} value={text} onChange={setText} maxLength={600} />
          <textarea
            ref={taRef}
            className="vv-textarea"
            rows={3}
            value={text}
            maxLength={600}
            onChange={(e) => setText(e.target.value)}
            placeholder={isOwner ? "Eigenen Gruß hinterlassen…" : `Sign here für ${profile.displayName} 🌸`}
          />
          {pendingImage && (
            <div style={{ position: "relative", display: "inline-block", margin: "6px 0", maxWidth: 200 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImage} alt="" style={{ maxHeight: 150, maxWidth: "100%", borderRadius: 8, border: "2px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} />
              <button type="button" onClick={() => setPendingImage(null)} aria-label="Bild entfernen"
                style={{ position: "absolute", top: -8, right: -8, width: 24, height: 24, borderRadius: "50%", border: "none", background: "#222", color: "#fff", cursor: "pointer", padding: 0, fontSize: 14 }}>×</button>
            </div>
          )}
          <div className="vv-row vv-mt-8">
            <button type="button" className="vv-btn" onClick={() => fileRef.current?.click()} title="Foto anhängen">📷 Foto</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
            <div className="vv-spacer" />
            <button type="submit" className="vv-btn vv-btn-pink" disabled={busy || (!text.trim() && !pendingImage)}>✎ Eintragen</button>
          </div>
          {err && <div className="vv-mt-8" style={{ color: "#a00", fontSize: 12 }}>{err}</div>}
        </form>
      ) : (
        <div className="vv-muted">Logge dich ein, um ins Gästebuch zu schreiben.</div>
      )}
      <div className="vv-mt-12">
        {entries.length === 0 && (
          <div className="vv-muted vv-center" style={{ padding: "16px 0" }}>✿ Noch kein Eintrag. Sei der/die Erste! ✿</div>
        )}
        {entries.map((entry) => {
          const canDelete = me && (entry.from_username === me.username || isOwner);
          return (
            <div className="vv-pinnwand-entry" key={entry.id}>
              <div className="vv-pinnwand-meta">
                <OnlineName lastSeen={entry.from_last_seen}>
                  <ColoredName gender={entry.from_gender} age={entry.from_age} name={entry.from_display_name} />
                </OnlineName>
                {" · "}
                <span>{relTime(entry.at)}</span>
                {canDelete && (
                  <a href="#" style={{ marginLeft: 6, color: "#a00" }} onClick={(e) => { e.preventDefault(); remove(entry.id); }}>[löschen]</a>
                )}
              </div>
              {entry.text && (() => {
                const looksHtml = /<\/?[a-z][^>]*>/i.test(entry.text);
                return looksHtml
                  ? <div className="vv-wall-text" style={{ marginTop: 4 }} dangerouslySetInnerHTML={{ __html: entry.text }} />
                  : <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}><MentionText text={entry.text} /></div>;
              })()}
              {entry.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.image} alt="Gästebuch-Foto" style={{ display: "block", maxWidth: "100%", maxHeight: 360, borderRadius: 10, marginTop: 8, border: "2px solid #fff", boxShadow: "0 6px 16px rgba(0,0,0,0.18)" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
