"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";

export default function UserPhotosPage() {
  const params = useParams();
  const username = decodeURIComponent(params.username || "");
  const [albums, setAlbums] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getUser(username).then((d) => setUser(d.user)),
      api.listAlbums(username).then((d) => setAlbums(d.albums)),
      api.listPhotos(username).then((d) => setPhotos(d.photos)),
    ]).catch(() => {});
  }, [username]);

  const filtered = selectedAlbum ? photos.filter((p) => p.album_id === selectedAlbum) : photos;

  return (
    <>
      <div className="vv-card">
        <h2>📸 Fotos von {user?.displayName || username}</h2>
        <Link href={`/u/${username}`} className="vv-btn">← Zum Profil</Link>
      </div>

      {albums.length > 0 && (
        <div className="vv-card">
          <h3>Alben</h3>
          <div className="vv-row" style={{ flexWrap: "wrap" }}>
            <button className={`vv-btn ${selectedAlbum === null ? "vv-btn-pink" : ""}`}
                    onClick={() => setSelectedAlbum(null)}>Alle ({photos.length})</button>
            {albums.map((a) => (
              <button key={a.id} className={`vv-btn ${selectedAlbum === a.id ? "vv-btn-pink" : ""}`}
                      onClick={() => setSelectedAlbum(a.id)}>{a.name} ({a.photo_count})</button>
            ))}
          </div>
        </div>
      )}

      <div className="vv-card">
        {filtered.length === 0 ? (
          <div className="vv-muted vv-center" style={{ padding: 30 }}>Keine Fotos.</div>
        ) : (
          <div className="vv-photo-grid">
            {filtered.map((p) => (
              <div key={p.id} className="vv-photo-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.data_url} alt={p.caption || "Foto"} loading="lazy" />
                <div className="vv-photo-caption">
                  <div>{p.caption || <em className="vv-muted">ohne Titel</em>}</div>
                  <div className="vv-muted" style={{ fontSize: 10 }}>{relTime(p.at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
