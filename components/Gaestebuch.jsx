"use client";

import { useCallback, useEffect, useState } from "react";
import { relTime } from "@/lib/format";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "./GenderAge";
import MentionText from "./MentionText";

export default function Gaestebuch({ profile, initialEntries = [] }) {
  const { me } = useMe();
  const [entries, setEntries] = useState(initialEntries);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isOwner = me?.username === profile.username;

  const load = useCallback(async () => {
    try { const d = await api.getGuestbook(profile.username); setEntries(d.entries || []); } catch { /* ignore */ }
  }, [profile.username]);

  useEffect(() => { if (!initialEntries.length) load(); }, [load, initialEntries.length]);

  async function submit(e) {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    setBusy(true); setErr("");
    try {
      const d = await api.postGuestbook(profile.username, v);
      setEntries(d.entries || []);
      setText("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
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
      <div className="vv-muted" style={{ fontSize: 12, marginBottom: 8 }}>Klassisch wie früher – sign hier mit einem netten Gruß. Fidolin prüft jeden Eintrag.</div>
      {me ? (
        <form onSubmit={submit}>
          <textarea
            className="vv-textarea"
            rows={3}
            value={text}
            maxLength={600}
            onChange={(e) => setText(e.target.value)}
            placeholder={isOwner ? "Eigenen Gruß hinterlassen…" : `Sign here für ${profile.displayName} 🌸`}
          />
          <div className="vv-row vv-mt-8">
            <div className="vv-spacer" />
            <button type="submit" className="vv-btn vv-btn-pink" disabled={busy || !text.trim()}>✎ Eintragen</button>
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
                <ColoredName gender={entry.from_gender} age={entry.from_age} name={entry.from_display_name} />
                {" · "}
                <span>{relTime(entry.at)}</span>
                {canDelete && (
                  <a href="#" style={{ marginLeft: 6, color: "#a00" }} onClick={(e) => { e.preventDefault(); remove(entry.id); }}>[löschen]</a>
                )}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}><MentionText text={entry.text} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
