"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import SmileyPicker from "./SmileyPicker";

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

export default function WallComposer({ targetUsername, onPosted, placeholder = "Was machst du gerade?" }) {
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

  async function submit(e) {
    e?.preventDefault?.();
    const t = text.trim();
    if (!t && !image) return;
    setBusy(true); setMsg("");
    try {
      const res = await api.postPinnwand(targetUsername, t, image);
      setText(""); setImage(null);
      if (res?.imageNote) setMsg("⏳ " + res.imageNote);
      else setMsg("✅ Gepostet!");
      onPosted?.();
      setTimeout(() => setMsg(""), 3500);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <textarea
        className="vv-textarea"
        rows={2}
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
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
        <SmileyPicker onPick={(s) => setText((t) => t + s)} />
        <button type="button" className="vv-btn" onClick={() => fileRef.current?.click()} disabled={busy}>📷 Foto</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
        <div className="vv-spacer" />
        <button type="submit" className="vv-btn vv-btn-pink" disabled={busy || (!text.trim() && !image)}>
          {busy ? "…" : "📢 Posten"}
        </button>
      </div>
      {msg && <div className="vv-mt-8" style={{ fontWeight: "bold", fontSize: 13 }}>{msg}</div>}
      <div className="vv-muted vv-mt-8" style={{ fontSize: 11 }}>🤖 Fidolin prüft Text und Bild streng · @user markiert die Person</div>
    </form>
  );
}
