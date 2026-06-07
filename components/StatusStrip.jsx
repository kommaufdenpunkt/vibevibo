"use client";
import { useState } from "react";
import { useMe } from "@/lib/useMe";

const CATS = [
  { name:"🛋 Chillen", moods:[
    {e:"🍿",t:"Netflix & Chill"},{e:"😴",t:"müde"},{e:"🛀",t:"entspannen"},
    {e:"🏠",t:"zu Hause"},{e:"☕",t:"Kaffee"},{e:"🎵",t:"Musik hören"},
    {e:"📖",t:"lesen"},{e:"🛌",t:"ausruhen"},{e:"🌙",t:"chillig"},
  ]},
  { name:"❤️ Gefühle", moods:[
    {e:"😍",t:"verliebt"},{e:"💔",t:"Liebeskummer"},{e:"😊",t:"glücklich"},
    {e:"😢",t:"traurig"},{e:"😤",t:"gestresst"},{e:"🥱",t:"gelangweilt"},
    {e:"🤩",t:"aufgeregt"},{e:"🙏",t:"dankbar"},{e:"😎",t:"selbstbewusst"},
  ]},
  { name:"🎉 Action", moods:[
    {e:"🎉",t:"feiern"},{e:"💪",t:"Sport"},{e:"🎮",t:"zocken"},
    {e:"🚗",t:"unterwegs"},{e:"🛍",t:"Shopping"},{e:"💃",t:"tanzen"},
    {e:"🥳",t:"Party"},{e:"🎤",t:"Karaoke"},{e:"🎸",t:"Festival"},
  ]},
  { name:"💼 Alltag", moods:[
    {e:"💼",t:"arbeiten"},{e:"📚",t:"lernen"},{e:"🍕",t:"essen"},
    {e:"☎️",t:"telefonieren"},{e:"🧹",t:"putzen"},{e:"🍳",t:"kochen"},
    {e:"📅",t:"Termine"},{e:"🚿",t:"frisch machen"},{e:"💤",t:"Pause"},
  ]},
  { name:"🌦 Wetter & Zeit", moods:[
    {e:"☀️",t:"sonnen"},{e:"🌧",t:"Regenwetter"},{e:"❄️",t:"Schnee"},
    {e:"🌅",t:"früh wach"},{e:"🌃",t:"Nachtschicht"},{e:"🎈",t:"Wochenende"},
    {e:"✈️",t:"Urlaub"},{e:"🍻",t:"Feierabend"},{e:"🌈",t:"gute Laune"},
  ]},
];
function parseMood(raw){ if(!raw) return {e:"✨",t:"kein Mood gesetzt"};
  const m=String(raw).match(/^(\S+)\s*(.*)$/); return m?{e:m[1],t:m[2]||raw}:{e:"✨",t:raw}; }

export default function StatusStrip(){
  const { me, refresh } = useMe();
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [q,setQ]=useState("");
  const [exp,setExp]=useState({});
  if(!me) return null;
  const mood=parseMood(me.mood);

  async function pick(x){ setBusy(true);
    try{ await fetch("/api/status",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text:`${x.e} ${x.t}`})}); await refresh?.(); setOpen(false); setQ("");}catch{}
    finally{setBusy(false);} }

  const query=q.trim().toLowerCase();
  const Item=(x)=>(<button key={x.t} type="button" className="vv-status-picker-item"
    disabled={busy} onClick={()=>pick(x)}>
    <span className="vv-status-picker-item-emoji">{x.e}</span>
    <span className="vv-status-picker-item-text">{x.t}</span></button>);

  return(<>
    <div className="vv-status-strip" onClick={()=>setOpen(true)} role="button" tabIndex={0}>
      <span className="vv-status-strip-emoji">{mood.e}</span>
      <span className="vv-status-strip-label">
        <span className="vv-status-strip-prefix">Mood:</span>
        <span className="vv-status-strip-text">{mood.t}</span></span>
      <span className="vv-status-strip-edit">✎</span>
    </div>
    {open&&(<div className="vv-status-picker-backdrop" onClick={(e)=>{if(e.target===e.currentTarget){setOpen(false);setQ("");}}}>
      <div className="vv-status-picker-card" onClick={(e)=>e.stopPropagation()}>
        <button type="button" className="vv-status-picker-close" onClick={()=>{setOpen(false);setQ("");}}>×</button>
        <h3>✨ Was ist gerade dein Mood?</h3>
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="🔍 Suchen…"
          style={{width:"100%",padding:"10px 12px",border:"2px solid #fbcfe8",borderRadius:12,
            marginBottom:14,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
        {query ? (
          <div className="vv-status-picker-grid">
            {CATS.flatMap(c=>c.moods).filter(x=>x.t.toLowerCase().includes(query)).map(Item)}
          </div>
        ) : CATS.map((c)=>{
          const show=exp[c.name]?c.moods:c.moods.slice(0,5);
          return(<div key={c.name} style={{marginBottom:14}}>
            <div style={{fontWeight:800,color:"#be185d",fontSize:14,margin:"4px 0 8px"}}>{c.name}</div>
            <div className="vv-status-picker-grid">{show.map(Item)}</div>
            {c.moods.length>5 && !exp[c.name] && (
              <button type="button" onClick={()=>setExp(s=>({...s,[c.name]:true}))}
                style={{width:"100%",marginTop:8,padding:"8px",background:"#fce7f3",
                  border:"1px dashed #ec4899",borderRadius:10,color:"#be185d",
                  fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
                ▾ mehr ({c.moods.length-5})</button>
            )}
          </div>);
        })}
      </div>
    </div>)}
  </>);
}
