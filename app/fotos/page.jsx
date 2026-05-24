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
  const [newAlbum, setNewAlbum] = useState("");
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

  async function createAlbum(e) {
    e.preventDefault();
    if (!newAlbum.trim()) return;
    try {
      await api.createAlbum(me.username, newAlbum.trim());
      setNewAlbum("");
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
        <h2>📸 Meine Fotos</h2>
        <p className="vv-muted">Lade Bilder hoch und sortier sie in Alben. Max ~1 MB pro Foto (wird beim Upload verkleinert).</p>

        <div className="vv-grid-2">
          <div>
            <h3>📁 Alben</h3>
            <form onSubmit={createAlbum} className="vv-row vv-mt-8">
              <input
                className="vv-input"
                placeholder="Neues Album..."
                value={newAlbum}
                onChange={(e) => setNewAlbum(e.target.value)}
              />
              <button type="submit" className="vv-btn vv-btn-pink">+ Album</button>
            </form>
            <div className="vv-mt-12">
              <a href="#" className={`vv-conv-entry${selectedAlbum === null ? " active" : ""}`}
                 onClick={(e) => { e.preventDefault(); setSelectedAlbum(null); }}>
                <div className="vv-avatar vv-avatar-sm">📷</div>
                <div><strong>Alle Fotos</strong><div className="vv-conv-preview">{photos.length} Fotos</div></div>
              </a>
              {albums.map((a) => (
                <a key={a.id} href="#"
                   className={`vv-conv-entry${selectedAlbum === a.id ? " active" : ""}`}
                   onClick={(e) => { e.preventDefault(); setSelectedAlbum(a.id); }}>
                  <div className="vv-avatar vv-avatar-sm">📁</div>
                  <div><strong>{a.name}</strong><div className="vv-conv-preview">{a.photo_count} Fotos</div></div>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3>⬆️ Foto hochladen</h3>
            <label className="vv-mt-8">Album: <select
              className="vv-input"
              value={selectedAlbum || ""}
              onChange={(e) => setSelectedAlbum(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Kein Album —</option>
              {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select></label>
            <label className="vv-mt-8">Bildunterschrift (optional)</label>
            <input className="vv-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Sommer 2008 mit Lisa 💕" />
            <label className="vv-mt-8">Bild auswählen</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="vv-input"
              onChange={(e) => uploadFile(e.target.files?.[0])}
              disabled={busy}
            />
            {busy && <div className="vv-mt-8 vv-blink">⏳ wird hochgeladen...</div>}
          </div>
        </div>
      </div>

      <div className="vv-card">
        <h3>🖼️ {selectedAlbum ? albums.find((a) => a.id === selectedAlbum)?.name : "Alle Fotos"}</h3>
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
