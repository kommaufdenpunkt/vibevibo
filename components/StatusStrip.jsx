"use client";
import { useState, useMemo } from "react";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { STATUS_CATS, STATUS_PACKS, searchStatuses } from "@/lib/status";

function parseMood(raw){ if(!raw) return {e:"✨",t:"kein Mood gesetzt"};
  const m=String(raw).match(/^(\S+)\s*(.*)$/); return m?{e:m[1],t:m[2]||raw}:{e:"✨",t:raw}; }

export default function StatusStrip(){
  const { me, refresh } = useMe();
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [q,setQ]=useState("");
  const [exp,setExp]=useState({});
  const [post,setPost]=useState(false);
  const [msg,setMsg]=useState("");
  const unlockedPacks=useMemo(()=>{
    const b=me?.premiumBadges||[];
    return STATUS_PACKS.filter(p=>b.includes(`status_pack_${p.id}`)).map(p=>p.id);
  },[me?.premiumBadges]);
  if(!me) return null;
  const mood=parseMood(me.mood);

  const cats=STATUS_CATS.filter(c=>c.packId===null||unlockedPacks.includes(c.packId));
  const locked=STATUS_PACKS.filter(p=>!unlockedPacks.includes(p.id));
  const filtered=searchStatuses(q,unlockedPacks);

  async function pick(full){ setBusy(true); setMsg("");
    try{ await api.setStatus(full,post,undefined,false); await refresh?.(); setOpen(false); setQ(""); }
    catch(e){ setMsg(e.message||"Konnte nicht gespeichert werden."); }
    finally{ setBusy(false); } }
  async function remove(){ setBusy(true); setMsg("");
    try{ await api.setStatus("",false,undefined,false); await refresh?.(); setOpen(false); }
    catch(e){ setMsg(e.message); } finally{ setBusy(false); } }
  async function buyPack(id){ setBusy(true); setMsg("");
    try{ await api.premiumBuy(`status_pack_${id}`); await refresh?.(); setMsg("✅ Pack freigeschaltet!"); }
    catch(e){ setMsg(e.message||"Freischalten fehlgeschlagen."); } finally{ setBusy(false); } }

  const Chip=([em,lbl])=>{ const full=`${em} ${lbl}`;
    return(<button key={full} type="button" className="vv-status-picker-item" disabled={busy}
      onClick={()=>pick(full)}>
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
    {open&&(<div className="vv-status-picker-backdrop" onClick={(e)=>{if(e.target===e.currentTarget){setOpen(false);setQ("");}}}>
      <div className="vv-status-picker-card" onClick={(e)=>e.stopPropagation()}>
        <button type="button" className="vv-status-picker-close" onClick={()=>{setOpen(false);setQ("");}}>×</button>
        <h3>✨ Was ist gerade dein Mood?</h3>
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="🔍 Suchen…"
          style={{width:"100%",padding:"10px 12px",border:"2px solid #fbcfe8",borderRadius:12,
            marginBottom:10,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
        <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"9px 11px",
          background:post?"#fce7f3":"#f7f7fa",border:"2px solid",borderColor:post?"#ec4899":"#eee",
          borderRadius:10,cursor:"pointer",fontSize:12.5,fontWeight:700,color:"#831843"}}>
          <input type="checkbox" checked={post} onChange={(e)=>setPost(e.target.checked)}/>
          📣 Auch im Buschfunk posten <span style={{opacity:.7,fontWeight:400}}>(sonst nur still)</span>
        </label>
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
                {c.title}{c.packId&&<span style={{background:"linear-gradient(135deg,#fef3c7,#fde68a)",color:"#92400e",
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
          {me.mood && (<button type="button" disabled={busy} onClick={remove}
            style={{marginTop:6,width:"100%",padding:10,borderRadius:10,border:"1px solid #fda4af",
              background:"#fff",color:"#9f1239",cursor:"pointer",fontWeight:700,fontSize:13}}>
            ✖ Status entfernen</button>)}
        </>)}
      </div>
    </div>)}
  </>);
}
