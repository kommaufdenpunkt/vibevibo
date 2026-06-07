"use client";
import { useState } from "react";
import { useMe } from "@/lib/useMe";

const MOODS = [
  { e:"🍿", t:"Netflix & Chill" },{ e:"😴", t:"müde" },{ e:"🎵", t:"Musik hören" },
  { e:"🏠", t:"zu Hause" },{ e:"💼", t:"arbeiten" },{ e:"🎮", t:"zocken" },
  { e:"😍", t:"verliebt" },{ e:"💔", t:"Liebeskummer" },{ e:"🎉", t:"feiern" },
  { e:"📚", t:"lernen" },{ e:"🍕", t:"essen" },{ e:"☕", t:"Kaffee" },
  { e:"☀️", t:"sonnen" },{ e:"🚗", t:"unterwegs" },{ e:"💪", t:"Sport" },
  { e:"☎️", t:"telefonieren" },{ e:"🛀", t:"entspannen" },{ e:"📷", t:"Fotos" },
];
function parseMood(raw){ if(!raw) return {e:"✨",t:"kein Mood gesetzt"};
  const m=String(raw).match(/^(\S+)\s*(.*)$/); return m?{e:m[1],t:m[2]||raw}:{e:"✨",t:raw}; }

export default function StatusStrip(){
  const { me, refresh } = useMe();
  const [open,setOpen]=useState(false); const [busy,setBusy]=useState(false);
  if(!me) return null;
  const mood=parseMood(me.mood);
  async function setMood(x){ setBusy(true);
    try{ await fetch("/api/status",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text:`${x.e} ${x.t}`})}); await refresh?.(); setOpen(false);}catch{}
    finally{setBusy(false);} }
  return(<>
    <div className="vv-status-strip" onClick={()=>setOpen(true)} role="button" tabIndex={0}>
      <span className="vv-status-strip-emoji">{mood.e}</span>
      <span className="vv-status-strip-label">
        <span className="vv-status-strip-prefix">Mood:</span>
        <span className="vv-status-strip-text">{mood.t}</span></span>
      <span className="vv-status-strip-edit">✎</span>
    </div>
    {open&&(<div className="vv-status-picker-backdrop" onClick={(e)=>{if(e.target===e.currentTarget)setOpen(false);}}>
      <div className="vv-status-picker-card" onClick={(e)=>e.stopPropagation()}>
        <button type="button" className="vv-status-picker-close" onClick={()=>setOpen(false)}>×</button>
        <h3>✨ Was ist gerade dein Mood?</h3>
        <div className="vv-status-picker-grid">
          {MOODS.map((x)=>(<button key={x.t} type="button" className="vv-status-picker-item"
            disabled={busy} onClick={()=>setMood(x)}>
            <span className="vv-status-picker-item-emoji">{x.e}</span>
            <span className="vv-status-picker-item-text">{x.t}</span></button>))}
        </div></div></div>)}
  </>);
}
