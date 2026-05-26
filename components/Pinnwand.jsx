"use client";

import { useState } from "react";
import { relTime } from "@/lib/format";
import SmileyPicker from "./SmileyPicker";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "./GenderAge";

export default function Pinnwand({ profile, entries, onChange }) {
  const { me } = useMe();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwner = me?.username === profile.username;

  async function submit(e) {
    e.preventDefault();
    if (!me) { alert("Bitte einloggen."); return; }
    const v = text.trim();
    if (!v) return;
    setBusy(true);
    try {
      await api.postPinnwand(profile.username, v);
      setText("");
      onChange?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm("Eintrag löschen?")) return;
    try {
      await api.deletePinnwand(id);
      onChange?.();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="vv-card">
      <h3>📌 Pinnwand von {profile.displayName}</h3>
      {me ? (
        <form onSubmit={submit}>
          <textarea
            className="vv-textarea"
            placeholder={`Schreib was Liebes an ${profile.displayName}... :*`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="vv-row vv-mt-8">
            <SmileyPicker onPick={(s) => setText((t) => t + s)} />
            <div className="vv-spacer" />
            <button type="submit" className="vv-btn vv-btn-pink" disabled={busy}>
              ✎ An die Pinnwand
            </button>
          </div>
        </form>
      ) : (
        <div className="vv-muted">Logge dich ein, um auf die Pinnwand zu schreiben.</div>
      )}

      <div className="vv-mt-12">
        {entries.length === 0 && (
          <div className="vv-muted vv-center" style={{ padding: "20px 0" }}>
            ✿ Noch keine Einträge. Sei der/die Erste! ✿
          </div>
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
                  <a
                    href="#"
                    style={{ marginLeft: 6, color: "#a00" }}
                    onClick={(e) => { e.preventDefault(); remove(entry.id); }}
                  >
                    [löschen]
                  </a>
                )}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{entry.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
