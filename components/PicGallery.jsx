"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { relTime } from "@/lib/format";

// Bild im Browser auf 400x400 verkleinern (mittig beschnitten) -> kleines JPEG
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const size = 400;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const STATUS_BADGE = {
  pending: { t: "⏳ in Prüfung", c: "#a70" },
  rejected: { t: "🚫 abgelehnt", c: "#a00" },
  approved: { t: "", c: "" },
};

export default function PicGallery({ username, isOwner, onAvatarChange }) {
  const { me } = useMe();
  const [pics, setPics] = useState([]);
  const [max, setMax] = useState(9);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await api.listPics(username);
      setPics(d.pics || []);
      setMax(d.max || 9);
    } catch { /* ignore */ }
  }, [username]);

  useEffect(() => { load(); }, [load]);

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setMsg("");
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await api.uploadPic(username, dataUrl);
      if (res.status === "approved") {
        // Neues Bild automatisch als Hauptbild setzen (konsistent mit Avatar-Klick)
        try { await api.setPrimaryPic(res.id); } catch { /* ignore */ }
        setMsg("⭐ Neues Hauptbild!");
      } else if (res.status === "pending") {
        setMsg("⏳ Bild in Prüfung – Fidolin/Admin gibt es bald frei.");
      } else {
        setMsg("🚫 Abgelehnt: " + (res.reason || "verstößt gegen die Regeln"));
      }
      await load();
      onAvatarChange?.();
      setTimeout(() => setMsg(""), 4000);
    } catch (err) {
      setMsg("Fehler: " + err.message);
      setTimeout(() => setMsg(""), 4000);
    } finally {
      setBusy(false);
    }
  }

  async function makePrimary(id) {
    setBusy(true);
    try { await api.setPrimaryPic(id); await load(); onAvatarChange?.(); }
    catch (err) { alert(err.message); }
    finally { setBusy(false); }
  }

  async function removePic(id) {
    if (!confirm("Dieses Profilbild wirklich löschen?")) return;
    setBusy(true);
    try { await api.deletePic(id); if (open === id) setOpen(null); await load(); onAvatarChange?.(); }
    catch (err) { alert(err.message); }
    finally { setBusy(false); }
  }

  const visible = pics; // owner sieht alle, Besucher bekommt nur approved vom Server
  const openPic = pics.find((p) => p.id === open) || null;

  return (
    <div className="vv-card">
      <h3 style={{ marginTop: 0 }}>📸 Profilbilder</h3>
      {isOwner && (
        <>
          {pics.length < max ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              style={{ width: "100%", padding: "16px", borderRadius: 12, border: "2px dashed #ff8fd0", background: "#fff5fb", color: "#c2185b", fontWeight: "bold", fontSize: 16, cursor: "pointer" }}
            >
              {busy ? "⏳ wird hochgeladen…" : "📸 Foto hochladen"}
            </button>
          ) : (
            <div className="vv-muted">Maximal {max} Profilbilder erreicht.</div>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPick} />
          <div className="vv-muted" style={{ fontSize: 11, marginTop: 6 }}>Antippen zum Hochladen · Fidolin prüft jedes Bild · auf ein Bild tippen zum Verwalten</div>
        </>
      )}
      {msg && <div className="vv-mt-8" style={{ fontWeight: "bold" }}>{msg}</div>}

      {visible.length === 0 ? (
        <div className="vv-muted vv-center" style={{ padding: 14 }}>
          {isOwner ? "Noch keine Profilbilder – lad dein erstes hoch!" : "Noch keine Profilbilder."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 10 }}>
          {visible.map((p) => {
            const badge = STATUS_BADGE[p.status] || STATUS_BADGE.approved;
            return (
              <div key={p.id} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => (p.status === "approved" || isOwner) && setOpen(open === p.id ? null : p.id)}
                  style={{ width: "100%", aspectRatio: "1/1", padding: 0, border: p.isPrimary ? "3px solid #ff3e9d" : "2px solid #eee", borderRadius: 10, overflow: "hidden", cursor: (p.status === "approved" || isOwner) ? "pointer" : "default", background: "#f7f7f7" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: p.status === "approved" ? 1 : 0.5 }} />
                </button>
                {p.isPrimary && <span style={{ position: "absolute", top: 4, left: 4, fontSize: 16 }}>⭐</span>}
                {badge.t && <span style={{ position: "absolute", bottom: 4, left: 4, right: 4, fontSize: 10, color: "#fff", background: badge.c, borderRadius: 6, textAlign: "center" }}>{badge.t}</span>}
              </div>
            );
          })}
        </div>
      )}

      {openPic && (
        <div className="vv-mt-12" style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
          <div className="vv-row" style={{ alignItems: "flex-start", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={openPic.url} alt="" style={{ width: 180, maxWidth: "45%", borderRadius: 10 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {isOwner && (
                <div className="vv-row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {openPic.status === "approved" && !openPic.isPrimary && <button type="button" className="vv-btn vv-btn-pink" disabled={busy} onClick={() => makePrimary(openPic.id)}>⭐ Als Hauptbild</button>}
                  {openPic.isPrimary && <span className="vv-muted" style={{ fontSize: 12, alignSelf: "center" }}>⭐ ist Hauptbild</span>}
                  <button type="button" className="vv-btn" style={{ color: "#a00" }} disabled={busy} onClick={() => removePic(openPic.id)}>🗑 Löschen</button>
                </div>
              )}
              {openPic.status === "approved" ? (
                <PicComments picId={openPic.id} canComment={!!me} />
              ) : (
                <div className="vv-muted" style={{ fontSize: 12 }}>
                  Dieses Bild ist {openPic.status === "pending" ? "noch in Prüfung 🕓" : "abgelehnt 🚫"} – Kommentare gibt es erst nach Freigabe.
                </div>
              )}
            </div>
          </div>
          <button type="button" className="vv-btn vv-mt-8" onClick={() => setOpen(null)}>Schließen</button>
        </div>
      )}
    </div>
  );
}

function CommentAvatar({ c }) {
  return c.avatarUrl
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={c.avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", verticalAlign: "middle" }} />
    : <span>{c.emoji}</span>;
}

function PicComments({ picId, canComment }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { const d = await api.listPicComments(picId); setComments(d.comments || []); } catch { /* ignore */ }
  }, [picId]);
  useEffect(() => { load(); }, [load]);

  async function send(body, parentId, reset) {
    const t = String(body || "").trim();
    if (!t) return;
    setBusy(true); setErr("");
    try {
      const d = await api.addPicComment(picId, t, parentId || null);
      setComments(d.comments || []);
      reset();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const tops = comments.filter((c) => !c.parentId);
  const repliesOf = (id) => comments.filter((c) => c.parentId === id);

  return (
    <div>
      <h4 style={{ margin: "0 0 8px" }}>💬 Kommentare ({comments.length})</h4>
      {tops.length === 0 && <div className="vv-muted" style={{ fontSize: 12 }}>Noch keine Kommentare. Sei der/die Erste!</div>}
      {tops.map((c) => (
        <div key={c.id} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13 }}>
            <CommentAvatar c={c} /> <strong>{c.displayName}</strong>{" "}
            <span className="vv-muted" style={{ fontSize: 11 }}>{relTime(c.at)}</span>
            <div>{c.text}</div>
            {canComment && (
              <button type="button" className="vv-link-btn" style={{ fontSize: 11, color: "#ff3e9d", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(""); }}>↩ Antworten</button>
            )}
          </div>
          {repliesOf(c.id).map((r) => (
            <div key={r.id} style={{ fontSize: 12, marginLeft: 18, marginTop: 4, borderLeft: "2px solid #f0c", paddingLeft: 8 }}>
              <CommentAvatar c={r} /> <strong>{r.displayName}</strong>{" "}
              <span className="vv-muted" style={{ fontSize: 10 }}>{relTime(r.at)}</span>
              <div>{r.text}</div>
            </div>
          ))}
          {replyTo === c.id && canComment && (
            <div className="vv-row" style={{ marginLeft: 18, marginTop: 4, gap: 4 }}>
              <input className="vv-input" style={{ fontSize: 12 }} value={replyText} placeholder="Antwort…" onChange={(e) => setReplyText(e.target.value)} />
              <button type="button" className="vv-btn vv-btn-pink" disabled={busy} onClick={() => send(replyText, c.id, () => { setReplyText(""); setReplyTo(null); })}>Senden</button>
            </div>
          )}
        </div>
      ))}

      {err && <div style={{ color: "#a00", fontSize: 12 }}>{err}</div>}
      {canComment ? (
        <div className="vv-row vv-mt-8" style={{ gap: 4 }}>
          <input className="vv-input" style={{ fontSize: 13 }} value={text} placeholder="Kommentar schreiben…" onChange={(e) => setText(e.target.value)} />
          <button type="button" className="vv-btn vv-btn-pink" disabled={busy} onClick={() => send(text, null, () => setText(""))}>Posten</button>
        </div>
      ) : (
        <div className="vv-muted vv-mt-8" style={{ fontSize: 12 }}>Zum Kommentieren einloggen.</div>
      )}
    </div>
  );
}
