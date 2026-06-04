"use client";

import { relTime } from "@/lib/format";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "./GenderAge";
import OnlineName from "./OnlineName";
import MentionText from "./MentionText";
import WallComposer from "./WallComposer";
import EmbeddedMedia from "./EmbeddedMedia";

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
                <OnlineName lastSeen={entry.from_last_seen}>
                  <ColoredName gender={entry.from_gender} age={entry.from_age} name={entry.from_display_name} />
                </OnlineName>
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
              <EmbeddedMedia audioUrl={entry.audioUrl} mediaJson={entry.media} />
              <ReactionBar entry={entry} me={me} onChange={onChange} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const REACTIONS = [
  { key: "like", emoji: "👍", label: "Gefällt mir", color: "#3b82f6" },
  { key: "love", emoji: "❤️", label: "Liebe",        color: "#ef4444" },
  { key: "haha", emoji: "😂", label: "Haha",         color: "#f59e0b" },
  { key: "wow",  emoji: "😍", label: "Wow",          color: "#ec4899" },
  { key: "fire", emoji: "🔥", label: "Feuer",        color: "#f97316" },
  { key: "sad",  emoji: "😢", label: "Traurig",      color: "#6b7280" },
];

function ReactionBar({ entry, me, onChange }) {
  const counts = entry.reactionCounts || (entry.likeCount ? { like: entry.likeCount } : {});
  const mine = new Set(entry.myReactions || (entry.iLiked ? ["like"] : []));
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  async function toggle(kind) {
    try { await api.toggleReaction("pinnwand", entry.id, kind); onChange?.(); }
    catch (e) { alert(e.message); }
  }

  if (!me) {
    if (!total) return null;
    return (
      <div className="vv-pin-reactions-readonly">
        {REACTIONS.filter((r) => counts[r.key]).map((r) => (
          <span key={r.key}>{r.emoji} {counts[r.key]}</span>
        ))}
      </div>
    );
  }

  return (
    <div className="vv-pin-reactions">
      {REACTIONS.map((r) => {
        const active = mine.has(r.key);
        const n = counts[r.key] || 0;
        return (
          <button key={r.key} type="button" onClick={() => toggle(r.key)}
            className={`vv-pin-react${active ? " active" : ""}`}
            title={r.label}
            style={{ borderColor: active ? r.color : "transparent", color: active ? r.color : "inherit" }}
          >
            <span className="vv-pin-react-emoji">{r.emoji}</span>
            {n > 0 && <span className="vv-pin-react-n">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

