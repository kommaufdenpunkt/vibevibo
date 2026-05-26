"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";

export default function MyPhotosPage() {
  const router = useRouter();
  const { me, loading } = useMe();
  const [albums, setAlbums] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const reload = useCallback(async () => {
    if (!me) return;
    const [a, p] = await Promise.all([api.listAlbums(me.username), api.listPhotos(me.username)]);
    setAlbums(a.albums);
    setPhotos(p.photos);
  }, [me]);

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    reload();
  }, [me, loading, router, reload]);

  if (!me) return null;

  async function createAlbumPrompt() {
    const name = window.prompt("Name des neuen Albums:");
    if (!name || !name.trim()) return;
    try {
      await api.createAlbum(me.username, name.trim());
      reload();
    } catch (e) { alert(e.message); }
  }

  async function uploadFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Bitte ein Bild auswählen."); return; }
    setBusy(true);
    try {
      const dataUrl = await downscale(file, 1024);
      await api.uploadPhoto(me.username, { dataUrl, caption, albumId: selectedAlbum });
      setCaption("");
      reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deletePhoto(id) {
    if (!confirm("Foto löschen?")) return;
    try {
      await api.deletePhoto(id);
      reload();
    } catch (e) { alert(e.message); }
  }

  const filtered = selectedAlbum ? photos.filter((p) => p.album_id === selectedAlbum) : photos;

  return (
    <>
      <div className="vv-card">
        <h2 style={{ marginTop: 0 }}>📸 Meine Fotos</h2>

        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          style={{ width: "100%", padding: "18px", borderRadius: 12, border: "2px dashed #ff8fd0", background: "#fff5fb", color: "#c2185b", fontWeight: "bold", fontSize: 17, cursor: "pointer" }}
        >
          {busy ? "⏳ wird hochgeladen…" : "📸 Foto hochladen"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => uploadFile(e.target.files?.[0])}
          disabled={busy}
        />
        <input
          className="vv-input vv-mt-8"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Bildunterschrift (optional) – z.B. Sommer 2008 💕"
        />

        {/* Album-Filter als Chips */}
        <div className="vv-row" style={{ flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          <button type="button" className={`vv-btn${selectedAlbum === null ? " vv-btn-pink" : ""}`} onClick={() => setSelectedAlbum(null)}>📷 Alle ({photos.length})</button>
          {albums.map((a) => (
            <button key={a.id} type="button" className={`vv-btn${selectedAlbum === a.id ? " vv-btn-pink" : ""}`} onClick={() => setSelectedAlbum(a.id)}>📁 {a.name} ({a.photo_count})</button>
          ))}
          <button type="button" className="vv-btn" onClick={createAlbumPrompt}>+ Album</button>
        </div>
        <div className="vv-muted" style={{ fontSize: 11, marginTop: 8 }}>
          Neue Fotos landen {selectedAlbum ? `im Album „${albums.find((a) => a.id === selectedAlbum)?.name}"` : "ohne Album"}. Wähle oben ein Album, um dorthin hochzuladen.
        </div>
      </div>

      <div className="vv-card">
        <h3 style={{ marginTop: 0 }}>🖼️ {selectedAlbum ? albums.find((a) => a.id === selectedAlbum)?.name : "Alle Fotos"}</h3>
        {filtered.length === 0 ? (
          <div className="vv-muted vv-center" style={{ padding: 30 }}>Noch keine Fotos. Lad eins hoch! 📸</div>
        ) : (
          <div className="vv-photo-grid">
            {filtered.map((p) => (
              <div key={p.id} className="vv-photo-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.data_url} alt={p.caption || "Foto"} loading="lazy" />
                <div className="vv-photo-caption">
                  <div>{p.caption || <em className="vv-muted">ohne Titel</em>}</div>
                  <div className="vv-muted" style={{ fontSize: 10 }}>{relTime(p.at)}</div>
                  <button className="vv-btn" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => deletePhoto(p.id)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// Downscale ein File-Objekt zu einer kleineren JPEG-Datenurl
function downscale(file, maxDim) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
