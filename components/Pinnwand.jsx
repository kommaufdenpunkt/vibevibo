"use client";

import { relTime } from "@/lib/format";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "./GenderAge";
import MentionText from "./MentionText";
import WallComposer from "./WallComposer";

export default function Pinnwand({ profile, entries, onChange }) {
  const { me } = useMe();

  const isOwner = me?.username === profile.username;
  const placeholder = isOwner ? "Was machst du gerade?" : `Schreib was Liebes an ${profile.displayName}…`;

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
      <h3 style={{ marginTop: 0 }}>📌 Wall von {profile.displayName}</h3>
      {me ? (
        <WallComposer targetUsername={profile.username} onPosted={onChange} placeholder={placeholder} />
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
              {entry.text && <div style={{ whiteSpace: "pre-wrap" }}><MentionText text={entry.text} /></div>}
              {entry.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={entry.imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 10, marginTop: 6 }} />
              )}
              <div style={{ marginTop: 6 }}>
                {me ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try { await api.toggleReaction("pinnwand", entry.id); onChange?.(); }
                      catch (e) { alert(e.message); }
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: entry.iLiked ? "#ff3e9d" : "#666", padding: 0, fontSize: 13 }}
                  >
                    {entry.iLiked ? "❤️ Gefällt dir" : "🤍 Gefällt mir"}{entry.likeCount ? ` · ${entry.likeCount}` : ""}
                  </button>
                ) : entry.likeCount > 0 ? (
                  <span className="vv-muted" style={{ fontSize: 12 }}>❤️ {entry.likeCount}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
