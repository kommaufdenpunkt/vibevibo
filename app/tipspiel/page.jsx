"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import Avatar from "@/components/Avatar";

function fmtKickoff(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function TipspielPage() {
  const router = useRouter();
  const { me, loading, refresh } = useMe();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [drafts, setDrafts] = useState({});

  useEffect(() => { if (!loading && !me) router.push("/login"); }, [loading, me, router]);

  const load = () => fetch("/api/tipspiel", { cache: "no-store" }).then((r) => r.json()).then((d) => {
    setData(d);
    const next = {};
    (d.matches || []).forEach((m) => { if (m.myTip) next[m.matchId] = { tip1: m.myTip.tip1, tip2: m.myTip.tip2 }; });
    setDrafts(next);
  }).catch(() => {});

  useEffect(() => { if (me) load(); }, [me]);

  async function buyEntry() {
    setBusy(true);
    try {
      const r = await fetch("/api/tipspiel/entry", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setFlash("OK Eintritt bezahlt - du bist im Spieltag dabei!");
      if (refresh) await refresh();
      await load();
    } catch (e) { setFlash("WARN " + e.message); }
    finally { setBusy(false); setTimeout(() => setFlash(""), 4000); }
  }

  async function saveAllTips() {
    setBusy(true);
    try {
      const tips = Object.entries(drafts).map(function (entry) {
        return { matchId: Number(entry[0]), tip1: entry[1].tip1, tip2: entry[1].tip2 };
      });
      if (!tips.length) { setFlash("WARN Noch keine Tipps eingegeben"); return; }
      const r = await fetch("/api/tipspiel/tip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tips: tips }) });
      const d = await r.json();
      if (d.errors && d.errors.length) setFlash("WARN " + d.errors[0].error);
      else setFlash("OK " + tips.length + " Tipps gespeichert");
      await load();
    } catch (e) { setFlash("WARN " + e.message); }
    finally { setBusy(false); setTimeout(() => setFlash(""), 4000); }
  }

  function setDraft(matchId, side, val) {
    const n = Math.max(0, Math.min(20, Number(val) || 0));
    setDrafts(function (d) {
      const cur = d[matchId] || { tip1: 0, tip2: 0 };
      const next = Object.assign({}, cur);
      next[side] = n;
      const out = Object.assign({}, d);
      out[matchId] = next;
      return out;
    });
  }

  if (!me || !data) return <div className="vv-card">Laedt...</div>;

  const noMatchday = !data.matchday;
  const potOpen = !data.pot.paidOutAt;

  return (
    <div className="vv-tipspiel">
      <div className="vv-card vv-tipspiel-header">
        <div className="vv-tipspiel-title">🏆 BUNDESLIGA-TIPPSPIEL 🏆</div>
        <div className="vv-tipspiel-sub">3 Punkte exakt - 2 Punkte Tordifferenz - 1 Punkt Sieger</div>
        {!noMatchday && (
          <div className="vv-tipspiel-meta">
            <span>Spieltag <b>{data.matchday}</b> - Saison {data.season}/{Number(data.season) + 1}</span>
            <span>Pott: <b>{data.pot.pot} Vibes</b> {data.pot.paidOutAt ? "(ausgezahlt)" : "(offen)"}</span>
          </div>
        )}
      </div>

      {flash && (
        <div className="vv-card" style={{ background: flash.indexOf("WARN") === 0 ? "#fef3c7" : "#dcfce7", color: flash.indexOf("WARN") === 0 ? "#92400e" : "#166534", fontWeight: 700, fontSize: 13, textAlign: "center" }}>{flash}</div>
      )}

      {noMatchday && (
        <div className="vv-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>⚽</div>
          <div>Gerade laeuft kein Spieltag. Sobald die Liga wieder startet, gehts hier los!</div>
        </div>
      )}

      {!noMatchday && !data.myEntry && potOpen && (
        <div className="vv-card vv-tipspiel-entry">
          <div style={{ fontSize: 14, marginBottom: 8 }}>Eintritt zahlen, um an diesem Spieltag teilzunehmen</div>
          <button type="button" disabled={busy} onClick={buyEntry} className="vv-btn-big vv-btn-big-pink">
            Eintritt fuer {data.entryCost} Vibes kaufen
          </button>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
            Dein Eintritt wandert in den Pott. Wer am Spieltagsende die meisten Punkte hat, kassiert.
          </div>
        </div>
      )}

      {!noMatchday && data.myEntry && (
        <div className="vv-card">
          <div className="vv-tipspiel-matches">
            {data.matches.map(function (m) {
              const canEdit = !m.finished && Date.now() < m.kickoffAt;
              const d = drafts[m.matchId] || { tip1: 0, tip2: 0 };
              return (
                <div key={m.matchId} className={"vv-tipspiel-match" + (m.finished ? " finished" : "")}>
                  <div className="vv-tipspiel-match-time">{fmtKickoff(m.kickoffAt)} {m.finished ? "- beendet" : ""}</div>
                  <div className="vv-tipspiel-match-row">
                    <span className="vv-tipspiel-team">
                      {m.team1Icon ? <img src={m.team1Icon} alt="" /> : null} {m.team1}
                    </span>
                    <span className="vv-tipspiel-score">
                      {m.finished ? <b>{m.goals1} : {m.goals2}</b> : (canEdit ? (
                        <>
                          <input type="number" min="0" max="20" value={d.tip1} onChange={function (e) { setDraft(m.matchId, "tip1", e.target.value); }} />
                          <span>:</span>
                          <input type="number" min="0" max="20" value={d.tip2} onChange={function (e) { setDraft(m.matchId, "tip2", e.target.value); }} />
                        </>
                      ) : <span style={{ opacity: 0.6 }}>-</span>)}
                    </span>
                    <span className="vv-tipspiel-team vv-tipspiel-team-right">
                      {m.team2} {m.team2Icon ? <img src={m.team2Icon} alt="" /> : null}
                    </span>
                  </div>
                  {m.myTip && (
                    <div className="vv-tipspiel-mytip">
                      Mein Tipp: <b>{m.myTip.tip1} : {m.myTip.tip2}</b>
                      {m.finished ? <span className="vv-tipspiel-points"> - {m.myTip.points} Punkt{m.myTip.points === 1 ? "" : "e"}</span> : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button type="button" disabled={busy} onClick={saveAllTips} className="vv-btn-big vv-btn-big-pink" style={{ marginTop: 12, width: "100%" }}>
            Tipps speichern
          </button>
        </div>
      )}

      {!noMatchday && data.leaderboardMd.length > 0 && (
        <div className="vv-card">
          <h3 style={{ margin: "0 0 10px" }}>Spieltag-Rangliste</h3>
          {data.leaderboardMd.map(function (u, i) {
            return (
              <Link key={u.userId} href={"/u/" + u.username} className="vv-tipspiel-row">
                <span className="vv-tipspiel-rank">{i + 1}.</span>
                <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" />
                <span style={{ flex: 1 }}>{u.displayName}</span>
                <b>{u.points} Pkt</b>
              </Link>
            );
          })}
        </div>
      )}

      {data.leaderboardSeason.length > 0 && (
        <div className="vv-card">
          <h3 style={{ margin: "0 0 10px" }}>Saison-Rangliste {data.season}/{Number(data.season) + 1}</h3>
          {data.leaderboardSeason.map(function (u, i) {
            return (
              <Link key={u.userId} href={"/u/" + u.username} className="vv-tipspiel-row">
                <span className="vv-tipspiel-rank">{i + 1}.</span>
                <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" />
                <span style={{ flex: 1 }}>{u.displayName}</span>
                <b>{u.points} Pkt</b>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
