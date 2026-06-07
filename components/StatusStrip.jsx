"use client";
import { useState, useMemo } from "react";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { STATUS_CATS, STATUS_PACKS, searchStatuses } from "@/lib/status";

function parseMood(raw){ if(!raw) return {e:"✨",t:"kein Mood gesetzt"};
  const m=String(raw).match(/^(\S+)\s*(.*)$/); return m?{e:m[1],t:m[2]||raw}:{e:"✨",t:raw}; }
function packOf(c){ const k=(c.niId!==undefined?c.niId:c.packId); return (k==null)?null:k; }

export default function StatusStrip(){
  const { me, refresh } = useMe();
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [q,setQ]=useState("");
  const [exp,setExp]=useState({});
  const [pending,setPending]=useState(null);
  const [msg,setMsg]=useState("");
  const unlockedPacks=useMemo(()=>{
    const b=me?.premiumBadges||[];
    return STATUS_PACKS.filter(p=>b.includes(`status_ni_${p.id}`)||b.includes(`status_pack_${p.id}`)).map(p=>p.id);
  },[me?.premiumBadges]);
  if(!me) return null;
  const mood=parseMood(me.mood);

  const cats=STATUS_CATS.filter(c=>{const k=packOf(c);return k===null||unlockedPacks.includes(k);});
  const locked=STATUS_PACKS.filter(p=>!unlockedPacks.includes(p.id));
  const filtered=searchStatuses(q,unlockedPacks);

  function close(){ setOpen(false); setQ(""); setPending(null); setMsg(""); }
  async function apply(text,isPublic){ setBusy(true); setMsg("");
    try{ await api.setStatus(text,isPublic,undefined,false); await refresh?.(); close(); }
    catch(e){ setMsg(e.message||"Konnte nicht gespeichert werden."); } finally{ setBusy(false); } }
  async function buyPack(id){ setBusy(true); setMsg("");
    try{ await api.premiumBuy(`status_ni_${id}`); await refresh?.(); setMsg("✅ Pack freigeschaltet!"); }
    catch(e){ setMsg(e.message||"Freischalten fehlgeschlagen."); } finally{ setBusy(false); } }

  const Chip=([em,lbl])=>{ const full=`${em} ${lbl}`;
    return(<button key={full} type="button" className="vv-status-picker-item" disabled={busy}
      onClick={()=>{setPending(full);setMsg("");}}>
      <span className="vv-status-picker-item-emoji">{em}</span>
      <span className="vv-status-picker-item-text">{lbl}</span></button>); };

  return(<>
    <div className="vv-status-strip" onClick={()=>setOpen(true)} role="button" tabIndex={0}>
      <span className="vv-status-strip-emoji">{mood.e}</span>
      <span className="vv-status-strip-label">
        <span className="vv-status-strip-prefix">Mood:</span>
        <span className="vv-status-strip-text">{mood.t}</span></span>
      <span className="vv-status-strip-edit">✎</span>
    </div>
    {open&&(<div className="vv-status-picker-backdrop" onClick={(e)=>{if(e.target===e.currentTarget)close();}}>
      <div className="vv-status-picker-card" onClick={(e)=>e.stopPropagation()}>
        <button type="button" className="vv-status-picker-close" onClick={close}>×</button>

        {pending ? (<>
          <h3>So willst du es?</h3>
          <div style={{textAlign:"center",fontSize:24,fontWeight:800,margin:"4px 0 16px",color:"#831843"}}>{pending}</div>
          {msg&&<div style={{background:"#fef3c7",border:"1px dashed #d97706",color:"#78350f",
            borderRadius:10,padding:"8px 10px",fontSize:12,marginBottom:12}}>{msg}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button type="button" disabled={busy} onClick={()=>apply(pending,true)}
              style={{padding:"14px 10px",borderRadius:12,border:"2px solid #be185d",
                background:"linear-gradient(180deg,#f472b6,#ec4899)",color:"#fff",fontWeight:800,
                fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 3px 0 #831843"}}>
              📢 Im Buschfunk posten</button>
            <button type="button" disabled={busy} onClick={()=>apply(pending,false)}
              style={{padding:"14px 10px",borderRadius:12,border:"2px solid #ec4899",
                background:"#fff",color:"#be185d",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
              🔒 Nur für mich</button>
          </div>
          <button type="button" disabled={busy} onClick={()=>setPending(null)}
            style={{marginTop:10,width:"100%",padding:8,border:"none",background:"transparent",
              color:"#999",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>← Andere Auswahl</button>
        </>) : (<>
          <h3>✨ Was ist gerade dein Mood?</h3>
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="🔍 Suchen…"
            style={{width:"100%",padding:"10px 12px",border:"2px solid #fbcfe8",borderRadius:12,
              marginBottom:12,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
          {msg&&<div style={{background:"#fef3c7",border:"1px dashed #d97706",color:"#78350f",
            borderRadius:10,padding:"8px 10px",fontSize:12,marginBottom:12}}>{msg}</div>}
          {filtered ? (
            <div className="vv-status-picker-grid">
              {filtered.length===0 && <div style={{gridColumn:"1/-1",color:"#999",fontSize:13}}>Nichts gefunden.</div>}
              {filtered.map(Chip)}
            </div>
          ) : (<>
            {cats.map((c)=>{ const show=exp[c.title]?c.items:c.items.slice(0,5);
              return(<div key={c.title} style={{marginBottom:14}}>
                <div style={{fontWeight:800,color:"#be185d",fontSize:14,margin:"4px 0 8px",display:"flex",gap:6,alignItems:"center"}}>
                  {c.title}{packOf(c)&&<span style={{background:"linear-gradient(135deg,#fef3c7,#fde68a)",color:"#92400e",
                    padding:"1px 7px",borderRadius:999,fontSize:10,border:"1px solid #f59e0b"}}>✓ Pack</span>}</div>
                <div className="vv-status-picker-grid">{show.map(Chip)}</div>
                {c.items.length>5 && !exp[c.title] && (
                  <button type="button" onClick={()=>setExp(s=>({...s,[c.title]:true}))}
                    style={{width:"100%",marginTop:8,padding:"8px",background:"#fce7f3",
                      border:"1px dashed #ec4899",borderRadius:10,color:"#be185d",
                      fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
                    ▾ mehr ({c.items.length-5})</button>
                )}
              </div>);
            })}
            {locked.length>0 && (<div style={{marginTop:6}}>
              <div style={{fontWeight:800,color:"#be185d",fontSize:14,margin:"4px 0 8px"}}>🛍 Mehr Moods freischalten</div>
              {locked.map((pack)=>{
                const ok=!pack.requires||unlockedPacks.includes(pack.requires);
                const prev=pack.requires?STATUS_PACKS.find(x=>x.id===pack.requires)?.name:null;
                return(<div key={pack.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                  marginBottom:8,borderRadius:12,background:ok?"linear-gradient(135deg,#fce7f3,#f5d0fe)":"#f3f4f6",
                  border:`2px dashed ${ok?"#ec4899":"#9ca3af"}`,opacity:ok?1:.7}}>
                  <span style={{fontSize:22,filter:ok?"none":"grayscale(1)"}}>{ok?"🛍":"🔒"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:13,color:"#831843"}}>{pack.name}</div>
                    <div style={{fontSize:11,color:"#831843",opacity:.8}}>{ok?pack.description:`Erst „${prev}" freischalten`}</div>
                  </div>
                  {ok?(<button type="button" disabled={busy} onClick={()=>buyPack(pack.id)}
                    style={{background:"#fff",border:"1px solid #ec4899",borderRadius:999,padding:"6px 12px",
                      fontWeight:800,fontSize:12,color:"#831843",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>
                    🔓 {pack.price} ✨</button>):(<span style={{fontSize:18}}>🔒</span>)}
                </div>);
              })}
            </div>)}
            {me.mood && (<button type="button" disabled={busy} onClick={()=>apply("",false)}
              style={{marginTop:6,width:"100%",padding:10,borderRadius:10,border:"1px solid #fda4af",
                background:"#fff",color:"#9f1239",cursor:"pointer",fontWeight:700,fontSize:13}}>
              ✖ Status entfernen</button>)}
          </>)}
        </>)}
      </div>
    </div>)}
  </>);
}
