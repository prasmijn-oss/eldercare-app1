import { useState, useEffect } from "react";
import { uid, tod, painLevel, calcPainSummary, bradenScore, bradenRisk, calcBradenSummary, cognitiveLevel, calcCognitiveSummary, calcContinenceSummary, mustScore, mustRisk, calcNutritionSummary, calcWoundSummary, calcAdlSummary, adlScore, adlDepLevel } from "../lib/utils.js";
import { INP, LBL, ABTN, IBTN, BRADEN_SUBSCALES, BRADEN_MAX, MMSE_DOMAINS, CONTINENCE_TYPES, CONTINENCE_PRODUCTS, CONTINENCE_VOLUME, CONTINENCE_SKIN, WOUND_HEALING_COLOR, ADL_ITEMS, ADL_LABELS, ADL_LEVELS, ADL_LEVEL_COLOR, DEFAULT_INTAKE_ITEMS } from "../lib/constants.js";

// ─── Pain Assessment ──────────────────────────────────────────────────────────
const PAIN_CHARACTERS=["Sharp","Dull","Burning","Aching","Throbbing","Stabbing","Cramping","Pressure"];
const PAIN_DURATIONS=["Constant","Intermittent","On movement","At rest","Breakthrough"];
const PAIN_EFFECTIVENESS=["None","Partial","Full"];
const FACES_SCORES=[{score:0,emoji:"😊",label:"No pain"},{score:2,emoji:"🙂",label:"Mild"},{score:4,emoji:"😐",label:"Moderate"},{score:6,emoji:"😟",label:"Some severe"},{score:8,emoji:"😣",label:"Very severe"},{score:10,emoji:"😭",label:"Worst pain"}];

function PainAssessment({items,onChange}){
  const [showForm,setShowForm]=useState(false);
  const [entry,setEntry]=useState(null);
  const [scaleMode,setScaleMode]=useState("numeric"); // "numeric" | "faces"
  const blank=()=>({id:uid(),date:tod(),time:"",recorded_by:"",scale:"numeric",score:0,location:"",character:"",duration:"",intervention:"",effectiveness:"",notes:""});
  const openNew=()=>{const b=blank();setEntry(b);setScaleMode("numeric");setShowForm(true);};
  const openEdit=row=>{setEntry({...row});setScaleMode(row.scale||"numeric");setShowForm(true);};
  const save=()=>{onChange([...items.filter(i=>i.id!==entry.id),{...entry,scale:scaleMode}].sort((a,b)=>b.date.localeCompare(a.date)||(b.time||"").localeCompare(a.time||"")));setShowForm(false);setEntry(null);};
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const sorted=[...items].sort((a,b)=>b.date.localeCompare(a.date)||(b.time||"").localeCompare(a.time||""));
  const summary=calcPainSummary(items);

  return(
    <div>
      {summary&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{fontSize:22}}>{summary.latestScore>=7?"😣":summary.latestScore>=4?"😐":"😊"}</span>
          <div>
            <span style={{fontWeight:700,fontSize:13,color:summary.level.color}}>{summary.level.label} pain — {summary.latestScore}/10</span>
            {summary.latest.location&&<span style={{fontSize:12,color:"var(--color-text-dim)",marginLeft:8}}>📍 {summary.latest.location}</span>}
          </div>
          {summary.persistent&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(245,158,11,0.15)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.3)"}}>⚠ Persistent ({summary.recentModerateCount}x this week)</span>}
          <span style={{fontSize:12,color:"var(--color-text-muted)",marginLeft:"auto"}}>{new Date(summary.latest.date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"var(--color-text-dim)"}}>{items.length} assessment{items.length!==1?"s":""}</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#f59e0b",color:"#f59e0b"}} onClick={openNew}>+ Log Pain Assessment</button>
      </div>
      {showForm&&entry&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid #f59e0b",borderRadius:10,padding:14,marginBottom:12}}>
          <div className="three-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={LBL}>Date</label><input type="date" style={INP} value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
            <div><label style={LBL}>Time</label><input type="time" style={INP} value={entry.time} onChange={e=>setEntry(v=>({...v,time:e.target.value}))}/></div>
            <div><label style={LBL}>Recorded By</label><input style={INP} value={entry.recorded_by} onChange={e=>setEntry(v=>({...v,recorded_by:e.target.value}))} placeholder="Staff name..."/></div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={LBL}>Pain Scale</label>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {["numeric","faces"].map(m=>(
                <button key={m} onClick={()=>setScaleMode(m)} style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+(scaleMode===m?"#f59e0b":"var(--color-border)"),background:scaleMode===m?"rgba(245,158,11,0.15)":"transparent",color:scaleMode===m?"#f59e0b":"var(--color-text-muted)",fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{m==="numeric"?"Numeric (0-10)":"FACES Scale"}</button>
              ))}
            </div>
            {scaleMode==="numeric"?(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--color-text-dim)",marginBottom:4}}><span>No pain (0)</span><span>Worst pain (10)</span></div>
                <input type="range" min={0} max={10} step={1} value={entry.score??0} onChange={e=>setEntry(v=>({...v,score:Number(e.target.value)}))} style={{width:"100%",accentColor:painLevel(entry.score??0).color}}/>
                <div style={{textAlign:"center",marginTop:6}}>
                  <span style={{fontWeight:800,fontSize:22,color:painLevel(entry.score??0).color}}>{entry.score??0}</span>
                  <span style={{fontSize:12,color:painLevel(entry.score??0).color,marginLeft:6}}>{painLevel(entry.score??0).label}</span>
                </div>
              </div>
            ):(
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {FACES_SCORES.map(f=>(
                  <button key={f.score} onClick={()=>setEntry(v=>({...v,score:f.score}))} style={{flex:"1 1 60px",padding:"8px 4px",borderRadius:8,border:"2px solid "+(entry.score===f.score?painLevel(f.score).color:"var(--color-border)"),background:entry.score===f.score?painLevel(f.score).color+"20":"transparent",cursor:"pointer",textAlign:"center"}}>
                    <div style={{fontSize:24}}>{f.emoji}</div>
                    <div style={{fontSize:10,color:"var(--color-text-dim)",marginTop:2}}>{f.label}</div>
                    <div style={{fontSize:11,fontWeight:700,color:painLevel(f.score).color}}>{f.score}/10</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Location</label><input style={INP} value={entry.location} onChange={e=>setEntry(v=>({...v,location:e.target.value}))} placeholder="e.g. Lower back, right hip..."/></div>
            <div><label style={LBL}>Duration / Pattern</label>
              <select style={{...INP,cursor:"pointer"}} value={entry.duration} onChange={e=>setEntry(v=>({...v,duration:e.target.value}))}>
                <option value="">Select...</option>
                {PAIN_DURATIONS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={LBL}>Character</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {PAIN_CHARACTERS.map(ch=>(
                <button key={ch} onClick={()=>setEntry(v=>({...v,character:v.character===ch?"":ch}))} style={{padding:"4px 10px",borderRadius:6,border:"1px solid "+(entry.character===ch?"#f59e0b":"var(--color-border)"),background:entry.character===ch?"rgba(245,158,11,0.15)":"transparent",color:entry.character===ch?"#f59e0b":"var(--color-text-muted)",fontSize:11,fontWeight:600,cursor:"pointer"}}>{ch}</button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Intervention / Treatment</label><input style={INP} value={entry.intervention} onChange={e=>setEntry(v=>({...v,intervention:e.target.value}))} placeholder="e.g. Paracetamol 500mg, repositioning..."/></div>
            <div><label style={LBL}>Effectiveness</label>
              <select style={{...INP,cursor:"pointer"}} value={entry.effectiveness} onChange={e=>setEntry(v=>({...v,effectiveness:e.target.value}))}>
                <option value="">N/A</option>
                {PAIN_EFFECTIVENESS.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:10}}><label style={LBL}>Notes</label><textarea style={{...INP,height:52,resize:"vertical"}} value={entry.notes} onChange={e=>setEntry(v=>({...v,notes:e.target.value}))} placeholder="Additional observations..."/></div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{...ABTN,borderStyle:"solid"}} onClick={()=>{setShowForm(false);setEntry(null);}}>Cancel</button>
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#f59e0b",color:"#000",fontWeight:600}} onClick={save}>Save</button>
          </div>
        </div>
      )}
      {sorted.length===0&&!showForm&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No pain assessments logged yet</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map(row=>{
          const sc=Number(row.score??0);
          const lv=painLevel(sc);
          return(
            <div key={row.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:9,padding:"10px 14px",borderLeft:"3px solid "+lv.color}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{new Date(row.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}{row.time&&" "+row.time}</span>
                  <span style={{fontSize:22,lineHeight:1}}>{sc>=7?"😣":sc>=4?"😐":"😊"}</span>
                  <span style={{fontSize:12,fontWeight:800,color:lv.color}}>{sc}/10</span>
                  <span style={{fontSize:11,fontWeight:700,padding:"1px 7px",borderRadius:20,background:lv.color+"20",color:lv.color}}>{lv.label}</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>openEdit(row)} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"2px 8px",color:"#f59e0b",fontSize:11}}>Edit</button>
                  <button onClick={()=>rm(row.id)} style={{background:"none",border:"none",color:"var(--color-text-muted)",fontSize:12}}>x</button>
                </div>
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {row.location&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>📍 {row.location}</span>}
                {row.character&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>〰 {row.character}</span>}
                {row.duration&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>⏱ {row.duration}</span>}
              </div>
              {row.intervention&&<div style={{fontSize:12,color:"var(--color-text-dim)",marginTop:4}}>Tx: {row.intervention}{row.effectiveness&&<span style={{marginLeft:6,fontSize:11,fontWeight:600,color:row.effectiveness==="Full"?"#10b981":row.effectiveness==="Partial"?"#f59e0b":"#ef4444"}}>({row.effectiveness} relief)</span>}</div>}
              {row.recorded_by&&<div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:2}}>By: {row.recorded_by}</div>}
              {row.notes&&<div style={{fontSize:12,color:"var(--color-text-muted)",marginTop:4,fontStyle:"italic"}}>{row.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Braden Scale ────────────────────────────────────────────────────────────
function BradenScale({items,onChange}){
  const [showForm,setShowForm]=useState(false);
  const [entry,setEntry]=useState(null);
  const blank=()=>{
    const e={id:uid(),date:tod(),recorded_by:"",turning_schedule:"",notes:""};
    BRADEN_SUBSCALES.forEach(sub=>{e[sub.key]=sub.max;});
    return e;
  };
  const openNew=()=>{setEntry(blank());setShowForm(true);};
  const openEdit=row=>{setEntry({...row});setShowForm(true);};
  const save=()=>{onChange([...items.filter(i=>i.id!==entry.id),entry].sort((a,b)=>b.date.localeCompare(a.date)));setShowForm(false);setEntry(null);};
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const sorted=[...items].sort((a,b)=>b.date.localeCompare(a.date));
  const summary=calcBradenSummary(items);
  const liveScore=entry?bradenScore(entry):null;
  const liveRisk=liveScore!=null?bradenRisk(liveScore):null;
  const scoreBar=s=>Math.round((s/BRADEN_MAX)*100);

  return(
    <div>
      {summary&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
            <span style={{fontWeight:800,fontSize:22,color:summary.risk.color}}>{summary.score}</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:summary.risk.color}}>{summary.risk.label}</div>
              <div style={{fontSize:11,color:"var(--color-text-dim)"}}>Score {summary.score}/{BRADEN_MAX} · {new Date(summary.latest.date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
            </div>
            {summary.trend&&<span style={{fontSize:12,fontWeight:600,marginLeft:"auto",color:summary.trend==="improving"?"#10b981":summary.trend==="declining"?"#ef4444":"var(--color-text-muted)"}}>{summary.trend==="improving"?"↑ Improving":summary.trend==="declining"?"↓ Declining":"→ Stable"}</span>}
          </div>
          <div style={{height:6,background:"rgba(128,128,128,0.12)",borderRadius:3,overflow:"hidden",marginBottom:6}}>
            <div style={{height:"100%",width:scoreBar(summary.score)+"%",background:summary.risk.color,borderRadius:3,transition:"width 0.3s"}}/>
          </div>
          <div style={{fontSize:11,color:"var(--color-text-muted)"}}>🔄 Recommended repositioning: <strong style={{color:"var(--color-text-secondary)"}}>{summary.latest.turning_schedule||summary.risk.turning}</strong></div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
            {BRADEN_SUBSCALES.map(sub=>{
              const val=Number(summary.latest[sub.key]??sub.max);
              const pct=val/sub.max;
              const col=pct<=0.25?"#ef4444":pct<=0.5?"#f59e0b":pct<=0.75?"#06b6d4":"#10b981";
              return<span key={sub.key} style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,background:col+"18",color:col,border:"1px solid "+col+"35"}}>{sub.label.split(" ")[0]} {val}/{sub.max}</span>;
            })}
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"var(--color-text-dim)"}}>{items.length} assessment{items.length!==1?"s":""}</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#8b5cf6",color:"#8b5cf6"}} onClick={openNew}>+ Log Braden Assessment</button>
      </div>
      {showForm&&entry&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid #8b5cf6",borderRadius:10,padding:14,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,padding:"8px 12px",background:"var(--color-bg-hover)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8}}>
            <span style={{fontWeight:800,fontSize:26,color:liveRisk.color}}>{liveScore}</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:liveRisk.color}}>{liveRisk.label}</div>
              <div style={{fontSize:11,color:"var(--color-text-dim)"}}>of {BRADEN_MAX} · updates as you score</div>
            </div>
            <div style={{flex:1,height:6,background:"rgba(128,128,128,0.12)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:scoreBar(liveScore)+"%",background:liveRisk.color,borderRadius:3,transition:"width 0.2s"}}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={LBL}>Date</label><input type="date" style={INP} value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
            <div><label style={LBL}>Recorded By</label><input style={INP} value={entry.recorded_by} onChange={e=>setEntry(v=>({...v,recorded_by:e.target.value}))} placeholder="Staff name..."/></div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
            {BRADEN_SUBSCALES.map(sub=>{
              const val=Number(entry[sub.key]??sub.max);
              return(
                <div key={sub.key}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <label style={{...LBL,marginBottom:0}}>{sub.label}</label>
                    <span style={{fontSize:11,fontWeight:700,color:(val/sub.max)<=0.25?"#ef4444":(val/sub.max)<=0.5?"#f59e0b":(val/sub.max)<=0.75?"#06b6d4":"#10b981"}}>{val}/{sub.max}</span>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    {sub.options.map((opt,idx)=>{
                      const score=idx+1;
                      const active=val===score;
                      const col=score/sub.max<=0.25?"#ef4444":score/sub.max<=0.5?"#f59e0b":score/sub.max<=0.75?"#06b6d4":"#10b981";
                      return(
                        <button key={score} onClick={()=>setEntry(v=>({...v,[sub.key]:score}))}
                          title={opt}
                          style={{flex:1,padding:"6px 4px",borderRadius:6,border:"1px solid "+(active?col:"var(--color-border)"),background:active?col+"25":"transparent",color:active?col:"var(--color-text-muted)",fontSize:11,fontWeight:active?700:400,cursor:"pointer",textAlign:"center",lineHeight:1.2}}>
                          <div style={{fontWeight:700,fontSize:13}}>{score}</div>
                          <div style={{fontSize:9,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{opt}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Turning Schedule</label><input style={INP} value={entry.turning_schedule} onChange={e=>setEntry(v=>({...v,turning_schedule:e.target.value}))} placeholder={liveRisk.turning}/></div>
            <div><label style={LBL}>Notes</label><input style={INP} value={entry.notes} onChange={e=>setEntry(v=>({...v,notes:e.target.value}))} placeholder="Additional observations..."/></div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{...ABTN,borderStyle:"solid"}} onClick={()=>{setShowForm(false);setEntry(null);}}>Cancel</button>
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#8b5cf6",color:"#fff",fontWeight:600}} onClick={save}>Save</button>
          </div>
        </div>
      )}
      {sorted.length===0&&!showForm&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No Braden assessments logged yet</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map(row=>{
          const sc=bradenScore(row);
          const rk=bradenRisk(sc);
          return(
            <div key={row.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:9,padding:"10px 14px",borderLeft:"3px solid "+rk.color}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{new Date(row.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</span>
                  <span style={{fontWeight:800,fontSize:15,color:rk.color}}>{sc}</span>
                  <span style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,background:rk.color+"20",color:rk.color}}>{rk.label}</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>openEdit(row)} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"2px 8px",color:"#8b5cf6",fontSize:11}}>Edit</button>
                  <button onClick={()=>rm(row.id)} style={{background:"none",border:"none",color:"var(--color-text-muted)",fontSize:12}}>x</button>
                </div>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:4}}>
                {BRADEN_SUBSCALES.map(sub=>{
                  const val=Number(row[sub.key]??sub.max);
                  const col=val/sub.max<=0.25?"#ef4444":val/sub.max<=0.5?"#f59e0b":val/sub.max<=0.75?"#06b6d4":"#10b981";
                  return<span key={sub.key} style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:10,background:col+"18",color:col}}>{sub.label.split(" ")[0]} {val}</span>;
                })}
              </div>
              <div style={{fontSize:11,color:"var(--color-text-muted)"}}>🔄 {row.turning_schedule||rk.turning}{row.recorded_by&&" · By: "+row.recorded_by}</div>
              {row.notes&&<div style={{fontSize:12,color:"var(--color-text-muted)",marginTop:4,fontStyle:"italic"}}>{row.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cognitive Screening (MMSE / MoCA) ───────────────────────────────────────
function CognitiveScreening({items,onChange}){
  const [showForm,setShowForm]=useState(false);
  const [entry,setEntry]=useState(null);
  const [showDomains,setShowDomains]=useState(false);
  const blank=()=>({id:uid(),date:tod(),test_type:"MMSE",score:30,administered_by:"",notes:"",next_due:"",domains:{}});
  const openNew=()=>{setEntry(blank());setShowForm(true);};
  const openEdit=row=>{setEntry({...row,domains:row.domains||{}});setShowForm(true);};
  const save=()=>{onChange([...items.filter(i=>i.id!==entry.id),entry].sort((a,b)=>b.date.localeCompare(a.date)));setShowForm(false);setEntry(null);};
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const sorted=[...items].sort((a,b)=>b.date.localeCompare(a.date));
  const summary=calcCognitiveSummary(items);
  const liveLevel=entry?cognitiveLevel(entry.test_type||"MMSE",entry.score??30):null;

  return(
    <div>
      {summary&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
            <span style={{fontWeight:800,fontSize:22,color:summary.level.color}}>{summary.score}</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:summary.level.color}}>{summary.level.label}</div>
              <div style={{fontSize:11,color:"var(--color-text-dim)"}}>{summary.latest.test_type||"MMSE"} · Score {summary.score}/30 · {new Date(summary.latest.date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
            </div>
            {summary.trend&&<span style={{fontSize:12,fontWeight:600,marginLeft:"auto",color:summary.trend==="improving"?"#10b981":summary.trend==="declining"?"#ef4444":"var(--color-text-muted)"}}>{summary.trend==="improving"?"↑ Improving":summary.trend==="declining"?"↓ Declining":"→ Stable"}</span>}
          </div>
          <div style={{height:6,background:"rgba(128,128,128,0.12)",borderRadius:3,overflow:"hidden",marginBottom:6}}>
            <div style={{height:"100%",width:Math.round((summary.score/30)*100)+"%",background:summary.level.color,borderRadius:3,transition:"width 0.3s"}}/>
          </div>
          {summary.dueReassess&&<div style={{fontSize:11,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:6,padding:"4px 10px",color:"#f59e0b",marginTop:6}}>⚠️ Reassessment overdue — last screening was {summary.daysSince} days ago</div>}
          {summary.latest.next_due&&<div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:4}}>📅 Next due: {new Date(summary.latest.next_due+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>}
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"var(--color-text-dim)"}}>{items.length} screening{items.length!==1?"s":""}</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#a78bfa",color:"#a78bfa"}} onClick={openNew}>+ Log Screening</button>
      </div>
      {showForm&&entry&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid #a78bfa",borderRadius:10,padding:14,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,padding:"8px 12px",background:"var(--color-bg-hover)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8}}>
            <span style={{fontWeight:800,fontSize:26,color:liveLevel.color}}>{entry.score??30}</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:liveLevel.color}}>{liveLevel.label}</div>
              <div style={{fontSize:11,color:"var(--color-text-dim)"}}>{entry.test_type||"MMSE"} · out of 30</div>
            </div>
            <div style={{flex:1,height:6,background:"rgba(128,128,128,0.12)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.round((Number(entry.score??30)/30)*100)+"%",background:liveLevel.color,borderRadius:3,transition:"width 0.2s"}}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Test Type</label>
              <select style={INP} value={entry.test_type||"MMSE"} onChange={e=>setEntry(v=>({...v,test_type:e.target.value}))}>
                <option>MMSE</option><option>MoCA</option><option>Other</option>
              </select>
            </div>
            <div><label style={LBL}>Date</label><input type="date" style={INP} value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={LBL}>Total Score (0–30)</label>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <input type="range" min={0} max={30} value={entry.score??30} onChange={e=>setEntry(v=>({...v,score:Number(e.target.value)}))} style={{flex:1,accentColor:liveLevel.color}}/>
              <input type="number" min={0} max={30} value={entry.score??30} onChange={e=>setEntry(v=>({...v,score:Math.min(30,Math.max(0,Number(e.target.value)))}))} style={{...INP,width:64,textAlign:"center"}}/>
            </div>
            <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
              {(entry.test_type==="MoCA"
                ?[{s:26,l:"Normal",c:"#10b981"},{s:18,l:"Mild",c:"#f59e0b"},{s:10,l:"Moderate",c:"#ef4444"},{s:0,l:"Severe",c:"#dc2626"}]
                :[{s:25,l:"Normal",c:"#10b981"},{s:20,l:"Mild",c:"#f59e0b"},{s:10,l:"Moderate",c:"#ef4444"},{s:0,l:"Severe",c:"#dc2626"}]
              ).map(tier=>(
                <span key={tier.s} style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:10,background:tier.c+"15",color:tier.c,border:"1px solid "+tier.c+"30"}}>≥{tier.s} {tier.l}</span>
              ))}
            </div>
          </div>
          {entry.test_type==="MMSE"&&(
            <div style={{marginBottom:10}}>
              <button type="button" onClick={()=>setShowDomains(v=>!v)} style={{background:"none",border:"none",color:"var(--color-text-secondary)",fontSize:12,cursor:"pointer",padding:0}}>
                {showDomains?"▾":"▸"} Domain breakdown (optional)
              </button>
              {showDomains&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                  {MMSE_DOMAINS.map(dom=>(
                    <div key={dom.key}>
                      <label style={LBL}>{dom.label} (0–{dom.max})</label>
                      <input type="number" min={0} max={dom.max} value={entry.domains?.[dom.key]??""} onChange={e=>setEntry(v=>({...v,domains:{...v.domains,[dom.key]:Math.min(dom.max,Math.max(0,Number(e.target.value)))}}))} style={INP} placeholder="–"/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Administered By</label><input style={INP} value={entry.administered_by||""} onChange={e=>setEntry(v=>({...v,administered_by:e.target.value}))} placeholder="Staff name..."/></div>
            <div><label style={LBL}>Next Reassessment Due</label><input type="date" style={INP} value={entry.next_due||""} onChange={e=>setEntry(v=>({...v,next_due:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={LBL}>Notes / Observations</label>
            <textarea style={{...INP,height:60,resize:"vertical"}} value={entry.notes||""} onChange={e=>setEntry(v=>({...v,notes:e.target.value}))} placeholder="Behaviour during screening, context, follow-up recommendations..."/>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{...ABTN,borderStyle:"solid"}} onClick={()=>{setShowForm(false);setEntry(null);}}>Cancel</button>
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#8b5cf6",color:"#fff",fontWeight:600}} onClick={save}>Save</button>
          </div>
        </div>
      )}
      {sorted.length===0&&!showForm&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No cognitive screenings logged yet</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map(row=>{
          const lv=cognitiveLevel(row.test_type||"MMSE",row.score);
          return(
            <div key={row.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:9,padding:"10px 14px",borderLeft:"3px solid "+lv.color}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{new Date(row.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</span>
                  <span style={{fontSize:11,padding:"1px 8px",borderRadius:10,background:lv.color+"18",color:lv.color,fontWeight:700}}>{row.test_type||"MMSE"}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:800,fontSize:17,color:lv.color}}>{row.score}<span style={{fontSize:11,fontWeight:400,color:"var(--color-text-muted)"}}>/30</span></span>
                  <span style={{fontSize:11,color:lv.color,fontWeight:600}}>{lv.label}</span>
                  <button onClick={()=>openEdit(row)} style={{...IBTN}}>✏️</button>
                  <button onClick={()=>rm(row.id)} style={{...IBTN}}>🗑</button>
                </div>
              </div>
              {row.administered_by&&<div style={{fontSize:11,color:"var(--color-text-muted)"}}>By: {row.administered_by}</div>}
              {row.notes&&<div style={{fontSize:12,color:"var(--color-text-dim)",marginTop:3,fontStyle:"italic"}}>{row.notes}</div>}
              {row.next_due&&<div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:2}}>📅 Next due: {new Date(row.next_due+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>}
              {row.test_type==="MMSE"&&row.domains&&Object.keys(row.domains).length>0&&(
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
                  {MMSE_DOMAINS.filter(d=>row.domains[d.key]!==undefined).map(d=>{
                    const v=Number(row.domains[d.key]);
                    const pct=v/d.max;
                    const col=pct<0.5?"#ef4444":pct<0.75?"#f59e0b":"#10b981";
                    return<span key={d.key} style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:10,background:col+"18",color:col,border:"1px solid "+col+"35"}}>{d.label.split(" ")[0]} {v}/{d.max}</span>;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Continence Monitoring ────────────────────────────────────────────────────
function ContinenceLog({items,onChange}){
  const [showForm,setShowForm]=useState(false);
  const [entry,setEntry]=useState(null);
  const blank=()=>({id:uid(),date:tod(),time:new Date().toTimeString().slice(0,5),type:"Urinary Urgency",product_used:"Pad",volume:"Medium",skin_condition:"Intact",notes:""});
  const openNew=()=>{setEntry(blank());setShowForm(true);};
  const openEdit=row=>{setEntry({...row});setShowForm(true);};
  const save=()=>{onChange([...items.filter(i=>i.id!==entry.id),entry].sort((a,b)=>b.date.localeCompare(a.date)||(b.time||"").localeCompare(a.time||"")));setShowForm(false);setEntry(null);};
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const summary=calcContinenceSummary(items);
  const sorted=[...items].sort((a,b)=>b.date.localeCompare(a.date)||(b.time||"").localeCompare(a.time||""));

  return(
    <div>
      {summary&&summary.recentCount>0&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontWeight:800,fontSize:22,color:summary.highFrequency?"#ef4444":"#06b6d4"}}>{summary.avgPerDay}</div>
              <div style={{fontSize:10,color:"var(--color-text-dim)"}}>avg/day (7d)</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontWeight:700,fontSize:16,color:"var(--color-text-secondary)"}}>{summary.recentCount}</div>
              <div style={{fontSize:10,color:"var(--color-text-dim)"}}>episodes (7d)</div>
            </div>
            {summary.mostCommonType&&<div style={{flex:1}}>
              <div style={{fontSize:11,color:"var(--color-text-dim)"}}>Most common</div>
              <div style={{fontWeight:600,fontSize:12,color:"var(--color-text-secondary)"}}>{summary.mostCommonType}</div>
            </div>}
            {summary.skinIssue&&<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:"rgba(239,68,68,0.12)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.3)"}}>⚠️ Skin breakdown</span>}
            {summary.highFrequency&&!summary.skinIssue&&<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:"rgba(239,68,68,0.12)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.3)"}}>High frequency</span>}
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"var(--color-text-dim)"}}>{items.length} episode{items.length!==1?"s":""} logged</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#06b6d4",color:"#06b6d4"}} onClick={openNew}>+ Log Episode</button>
      </div>
      {showForm&&entry&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid #06b6d4",borderRadius:10,padding:14,marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Date</label><input type="date" style={INP} value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
            <div><label style={LBL}>Time</label><input type="time" style={INP} value={entry.time||""} onChange={e=>setEntry(v=>({...v,time:e.target.value}))}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Type</label>
              <select style={INP} value={entry.type||""} onChange={e=>setEntry(v=>({...v,type:e.target.value}))}>
                {CONTINENCE_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Volume</label>
              <select style={INP} value={entry.volume||""} onChange={e=>setEntry(v=>({...v,volume:e.target.value}))}>
                {CONTINENCE_VOLUME.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Product Used</label>
              <select style={INP} value={entry.product_used||""} onChange={e=>setEntry(v=>({...v,product_used:e.target.value}))}>
                {CONTINENCE_PRODUCTS.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Skin Condition</label>
              <select style={INP} value={entry.skin_condition||"Intact"} onChange={e=>setEntry(v=>({...v,skin_condition:e.target.value}))}>
                {CONTINENCE_SKIN.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={LBL}>Notes</label>
            <textarea style={{...INP,height:56,resize:"vertical"}} value={entry.notes||""} onChange={e=>setEntry(v=>({...v,notes:e.target.value}))} placeholder="Triggering activity, odour, colour, care given..."/>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{...ABTN,borderStyle:"solid"}} onClick={()=>{setShowForm(false);setEntry(null);}}>Cancel</button>
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#06b6d4",color:"#fff",fontWeight:600}} onClick={save}>Save</button>
          </div>
        </div>
      )}
      {sorted.length===0&&!showForm&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No continence episodes logged yet</div>}
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {sorted.map(row=>{
          const skinCol=row.skin_condition==="Breakdown"?"#ef4444":row.skin_condition==="Maceration"?"#f59e0b":row.skin_condition==="Redness"?"#fb923c":"#10b981";
          return(
            <div key={row.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:9,padding:"9px 14px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                  <span style={{fontWeight:700,fontSize:12,color:"var(--color-text-primary)"}}>{new Date(row.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}{row.time&&" "+row.time}</span>
                  <span style={{fontSize:11,padding:"1px 8px",borderRadius:10,background:"rgba(6,182,212,0.12)",color:"#06b6d4",fontWeight:600}}>{row.type}</span>
                  {row.volume&&<span style={{fontSize:11,color:"var(--color-text-dim)"}}>{row.volume}</span>}
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  {row.product_used&&row.product_used!=="None"&&<span style={{fontSize:11,color:"var(--color-text-muted)"}}>🛒 {row.product_used}</span>}
                  <span style={{fontSize:11,fontWeight:600,color:skinCol}}>Skin: {row.skin_condition||"Intact"}</span>
                  {row.notes&&<span style={{fontSize:11,color:"var(--color-text-dim)",fontStyle:"italic",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.notes}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>openEdit(row)} style={{...IBTN}}>✏️</button>
                <button onClick={()=>rm(row.id)} style={{...IBTN}}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Nutritional Risk Screening (MUST) ────────────────────────────────────────
function NutritionScreening({items,onChange}){
  const [showForm,setShowForm]=useState(false);
  const [entry,setEntry]=useState(null);
  const blank=()=>({id:uid(),date:tod(),assessed_by:"",bmi_score:0,weight_loss_score:0,acute_illness:false,appetite:"Good",swallowing_difficulty:false,dietary_restrictions:"",supplement_use:"",notes:""});
  const openNew=()=>{setEntry(blank());setShowForm(true);};
  const openEdit=row=>{setEntry({...row});setShowForm(true);};
  const save=()=>{onChange([...items.filter(i=>i.id!==entry.id),entry].sort((a,b)=>b.date.localeCompare(a.date)));setShowForm(false);setEntry(null);};
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const sorted=[...items].sort((a,b)=>b.date.localeCompare(a.date));
  const summary=calcNutritionSummary(items);
  const liveScore=entry?mustScore(entry):null;
  const liveRisk=liveScore!=null?mustRisk(liveScore):null;

  const ScoreBtn=({field,val,label,desc,color})=>{
    const active=entry&&Number(entry[field])===val;
    return(
      <button onClick={()=>setEntry(v=>({...v,[field]:val}))} title={desc}
        style={{flex:1,padding:"7px 5px",borderRadius:7,border:"1px solid "+(active?color:"var(--color-border)"),background:active?color+"22":"transparent",color:active?color:"var(--color-text-muted)",fontSize:11,fontWeight:active?700:400,cursor:"pointer",textAlign:"center"}}>
        <div style={{fontWeight:700,fontSize:15}}>{val}</div>
        <div style={{fontSize:9,lineHeight:1.2}}>{label}</div>
      </button>
    );
  };

  return(
    <div>
      {summary&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
            <span style={{fontWeight:800,fontSize:22,color:summary.risk.color}}>{summary.score}</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:summary.risk.color}}>{summary.risk.label}</div>
              <div style={{fontSize:11,color:"var(--color-text-dim)"}}>MUST Score · {new Date(summary.latest.date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
            </div>
            {summary.trend&&<span style={{fontSize:12,fontWeight:600,marginLeft:"auto",color:summary.trend==="improving"?"#10b981":summary.trend==="worsening"?"#ef4444":"var(--color-text-muted)"}}>{summary.trend==="improving"?"↑ Improving":summary.trend==="worsening"?"↓ Worsening":"→ Stable"}</span>}
          </div>
          <div style={{height:6,background:"rgba(128,128,128,0.12)",borderRadius:3,overflow:"hidden",marginBottom:8}}>
            <div style={{height:"100%",width:Math.min(100,Math.round((summary.score/4)*100))+"%",background:summary.risk.color,borderRadius:3,transition:"width 0.3s"}}/>
          </div>
          <div style={{fontSize:11,color:"var(--color-text-muted)"}}>📋 Action: <strong style={{color:"var(--color-text-secondary)"}}>{summary.risk.action}</strong></div>
          {(summary.latest.swallowing_difficulty||summary.latest.dietary_restrictions||summary.latest.supplement_use)&&(
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
              {summary.latest.swallowing_difficulty&&<span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:10,background:"rgba(239,68,68,0.1)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.25)"}}>⚠️ Swallowing difficulty</span>}
              {summary.latest.dietary_restrictions&&<span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:10,background:"rgba(245,158,11,0.1)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.25)"}}>🍽 {summary.latest.dietary_restrictions}</span>}
              {summary.latest.supplement_use&&<span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:10,background:"rgba(16,185,129,0.1)",color:"#10b981",border:"1px solid rgba(16,185,129,0.25)"}}>💊 {summary.latest.supplement_use}</span>}
            </div>
          )}
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"var(--color-text-dim)"}}>{items.length} screening{items.length!==1?"s":""}</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#10b981",color:"#10b981"}} onClick={openNew}>+ Log Screening</button>
      </div>
      {showForm&&entry&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid #10b981",borderRadius:10,padding:14,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,padding:"8px 12px",background:"var(--color-bg-hover)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8}}>
            <span style={{fontWeight:800,fontSize:26,color:liveRisk.color}}>{liveScore}</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:liveRisk.color}}>{liveRisk.label}</div>
              <div style={{fontSize:11,color:"var(--color-text-dim)"}}>MUST Score · updates as you score</div>
            </div>
            <div style={{flex:1,height:6,background:"rgba(128,128,128,0.12)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.min(100,Math.round((liveScore/4)*100))+"%",background:liveRisk.color,borderRadius:3,transition:"width 0.2s"}}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Date</label><input type="date" style={INP} value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
            <div><label style={LBL}>Assessed By</label><input style={INP} value={entry.assessed_by||""} onChange={e=>setEntry(v=>({...v,assessed_by:e.target.value}))} placeholder="Staff name..."/></div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={LBL}>BMI Score</label>
            <div style={{display:"flex",gap:4}}>
              <ScoreBtn field="bmi_score" val={0} label=">20" desc="BMI > 20 kg/m²" color="#10b981"/>
              <ScoreBtn field="bmi_score" val={1} label="18.5–20" desc="BMI 18.5–20 kg/m²" color="#f59e0b"/>
              <ScoreBtn field="bmi_score" val={2} label="<18.5" desc="BMI < 18.5 kg/m²" color="#ef4444"/>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={LBL}>Unplanned Weight Loss Score (last 3–6 months)</label>
            <div style={{display:"flex",gap:4}}>
              <ScoreBtn field="weight_loss_score" val={0} label="<5%" desc="Weight loss < 5%" color="#10b981"/>
              <ScoreBtn field="weight_loss_score" val={1} label="5–10%" desc="Weight loss 5–10%" color="#f59e0b"/>
              <ScoreBtn field="weight_loss_score" val={2} label=">10%" desc="Weight loss > 10%" color="#ef4444"/>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={LBL}>Acute Illness Effect (+2 points if acutely ill / no nutritional intake ≥5 days)</label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>setEntry(v=>({...v,acute_illness:!v.acute_illness}))} style={{padding:"7px 16px",borderRadius:8,border:"1px solid "+(entry.acute_illness?"#ef4444":"var(--color-border)"),background:entry.acute_illness?"rgba(239,68,68,0.15)":"transparent",color:entry.acute_illness?"#ef4444":"var(--color-text-muted)",fontWeight:600,fontSize:13}}>
                {entry.acute_illness?"Yes — +2 applied":"No"}
              </button>
              <span style={{fontSize:11,color:"var(--color-text-dim)"}}>Tap to toggle</span>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Appetite</label>
              <select style={INP} value={entry.appetite||"Good"} onChange={e=>setEntry(v=>({...v,appetite:e.target.value}))}>
                {["Good","Fair","Poor","None"].map(a=><option key={a}>{a}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              <label style={{...LBL,marginBottom:8}}>Swallowing Difficulty</label>
              <button onClick={()=>setEntry(v=>({...v,swallowing_difficulty:!v.swallowing_difficulty}))} style={{padding:"8px 12px",borderRadius:8,border:"1px solid "+(entry.swallowing_difficulty?"#ef4444":"var(--color-border)"),background:entry.swallowing_difficulty?"rgba(239,68,68,0.12)":"transparent",color:entry.swallowing_difficulty?"#ef4444":"var(--color-text-muted)",fontWeight:600,fontSize:13}}>
                {entry.swallowing_difficulty?"Yes — Dysphagia":"No"}
              </button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Dietary Restrictions</label><input style={INP} value={entry.dietary_restrictions||""} onChange={e=>setEntry(v=>({...v,dietary_restrictions:e.target.value}))} placeholder="e.g. Diabetic, low-sodium..."/></div>
            <div><label style={LBL}>Supplements / ONS</label><input style={INP} value={entry.supplement_use||""} onChange={e=>setEntry(v=>({...v,supplement_use:e.target.value}))} placeholder="e.g. Ensure 2x daily..."/></div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={LBL}>Notes</label>
            <textarea style={{...INP,height:56,resize:"vertical"}} value={entry.notes||""} onChange={e=>setEntry(v=>({...v,notes:e.target.value}))} placeholder="Food preferences, feeding assistance, observations..."/>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{...ABTN,borderStyle:"solid"}} onClick={()=>{setShowForm(false);setEntry(null);}}>Cancel</button>
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#10b981",color:"#fff",fontWeight:600}} onClick={save}>Save</button>
          </div>
        </div>
      )}
      {sorted.length===0&&!showForm&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No nutritional screenings logged yet</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map(row=>{
          const sc=mustScore(row);
          const rk=mustRisk(sc);
          return(
            <div key={row.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:9,padding:"10px 14px",borderLeft:"3px solid "+rk.color}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{new Date(row.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</span>
                  {row.assessed_by&&<span style={{fontSize:11,color:"var(--color-text-muted)"}}>By: {row.assessed_by}</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:800,fontSize:17,color:rk.color}}>{sc}<span style={{fontSize:11,fontWeight:400,color:"var(--color-text-muted)"}}> MUST</span></span>
                  <span style={{fontSize:11,color:rk.color,fontWeight:600}}>{rk.label}</span>
                  <button onClick={()=>openEdit(row)} style={{...IBTN}}>✏️</button>
                  <button onClick={()=>rm(row.id)} style={{...IBTN}}>🗑</button>
                </div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:11,color:"var(--color-text-dim)"}}>BMI:{row.bmi_score} WL:{row.weight_loss_score} Acute:{row.acute_illness?"+2":"0"}</span>
                {row.appetite&&row.appetite!=="Good"&&<span style={{fontSize:11,fontWeight:600,color:row.appetite==="None"?"#ef4444":row.appetite==="Poor"?"#f59e0b":"var(--color-text-secondary)"}}>Appetite: {row.appetite}</span>}
                {row.swallowing_difficulty&&<span style={{fontSize:11,fontWeight:700,color:"#ef4444"}}>⚠️ Dysphagia</span>}
                {row.dietary_restrictions&&<span style={{fontSize:11,color:"var(--color-text-muted)"}}>🍽 {row.dietary_restrictions}</span>}
              </div>
              {row.notes&&<div style={{fontSize:12,color:"var(--color-text-dim)",marginTop:4,fontStyle:"italic"}}>{row.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Wound & Skin Assessment ─────────────────────────────────────────────────
const WOUND_TYPES=["Pressure Ulcer","Skin Tear","Surgical","Laceration","Abrasion","Diabetic Ulcer","Venous Ulcer","Arterial Ulcer","Other"];
const WOUND_STAGES=["Stage I","Stage II","Stage III","Stage IV","Unstageable","Deep Tissue","N/A"];
const WOUND_EXUDATE_AMT=["None","Minimal","Moderate","Heavy"];
const WOUND_EXUDATE_TYPE=["Serous","Serosanguineous","Sanguineous","Purulent"];
const WOUND_BED=["Granulating","Epithelializing","Slough","Necrotic","Mixed"];
const WOUND_PERIWOUND=["Intact","Erythema","Macerated","Indurated","Oedematous"];
const WOUND_HEALING=["Improving","Stable","Deteriorating","Healed"];
const WOUND_PAIN=["None","Mild","Moderate","Severe"];

function WoundAssessment({items,onChange}){
  const [showForm,setShowForm]=useState(false);
  const [entry,setEntry]=useState(null);
  const [filterSite,setFilterSite]=useState("All");
  const blank=()=>({id:uid(),date:tod(),recorded_by:"",site:"",type:"Pressure Ulcer",stage:"N/A",length_cm:"",width_cm:"",depth_cm:"",exudate:"None",exudate_type:"",wound_bed:"Granulating",periwound:"Intact",odour:false,pain_at_site:"None",dressing_used:"",dressing_frequency:"",healing_status:"Stable",notes:""});
  const openNew=()=>{setEntry(blank());setShowForm(true);};
  const openEdit=row=>{setEntry({...row});setShowForm(true);};
  const save=()=>{onChange([...items.filter(i=>i.id!==entry.id),entry].sort((a,b)=>b.date.localeCompare(a.date)));setShowForm(false);setEntry(null);};
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const summary=calcWoundSummary(items);
  const allSites=["All",...new Set(items.map(i=>i.site||"Unknown").filter(Boolean))];
  const sorted=[...items].sort((a,b)=>b.date.localeCompare(a.date));
  const filtered=filterSite==="All"?sorted:sorted.filter(i=>(i.site||"Unknown")===filterSite);

  return(
    <div>
      {summary&&summary.activeSites.length>0&&(
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          {summary.activeSites.map(w=>{
            const hc=WOUND_HEALING_COLOR[w.healing_status]||"var(--color-text-muted)";
            return(
              <div key={w.site} style={{padding:"6px 12px",borderRadius:10,background:hc+"15",border:"1px solid "+hc+"40",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontWeight:700,fontSize:12,color:hc}}>🩹 {w.site}</span>
                {w.stage&&w.stage!=="N/A"&&<span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{w.stage}</span>}
                <span style={{fontSize:11,fontWeight:600,color:hc}}>{w.healing_status}</span>
              </div>
            );
          })}
          {summary.healedCount>0&&<div style={{padding:"6px 12px",borderRadius:10,background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.3)",fontSize:12,fontWeight:600,color:"#a78bfa"}}>✓ {summary.healedCount} healed</div>}
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"var(--color-text-dim)"}}>{items.length} record{items.length!==1?"s":""}</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#06b6d4",color:"#06b6d4"}} onClick={openNew}>+ Log Assessment</button>
      </div>
      {allSites.length>2&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
          {allSites.map(s=>(
            <button key={s} onClick={()=>setFilterSite(s)} style={{padding:"3px 10px",borderRadius:6,border:"1px solid "+(filterSite===s?"#06b6d4":"var(--color-border)"),background:filterSite===s?"rgba(6,182,212,0.15)":"transparent",color:filterSite===s?"#06b6d4":"var(--color-text-muted)",fontSize:11,fontWeight:600,cursor:"pointer"}}>{s}</button>
          ))}
        </div>
      )}
      {showForm&&entry&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid #06b6d4",borderRadius:10,padding:14,marginBottom:12}}>
          <div className="three-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Date</label><input type="date" style={INP} value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
            <div><label style={LBL}>Recorded By</label><input style={INP} value={entry.recorded_by} onChange={e=>setEntry(v=>({...v,recorded_by:e.target.value}))} placeholder="Staff name..."/></div>
            <div><label style={LBL}>Healing Status</label>
              <select style={{...INP,cursor:"pointer",color:WOUND_HEALING_COLOR[entry.healing_status]||"#e2e8f0",borderColor:WOUND_HEALING_COLOR[entry.healing_status]||"var(--color-border)"}} value={entry.healing_status} onChange={e=>setEntry(v=>({...v,healing_status:e.target.value}))}>
                {WOUND_HEALING.map(h=><option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Wound Site / Location</label><input style={INP} value={entry.site} onChange={e=>setEntry(v=>({...v,site:e.target.value}))} placeholder="e.g. Sacrum, Left heel..."/></div>
            <div><label style={LBL}>Type</label>
              <select style={{...INP,cursor:"pointer"}} value={entry.type} onChange={e=>setEntry(v=>({...v,type:e.target.value}))}>
                {WOUND_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Stage</label>
              <select style={{...INP,cursor:"pointer"}} value={entry.stage} onChange={e=>setEntry(v=>({...v,stage:e.target.value}))}>
                {WOUND_STAGES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={LBL}>Measurements (cm)</label>
            <div className="three-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <div style={{position:"relative"}}><input style={INP} type="number" step="0.1" min="0" value={entry.length_cm} onChange={e=>setEntry(v=>({...v,length_cm:e.target.value}))} placeholder="Length"/><span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--color-text-muted)"}}>L</span></div>
              <div style={{position:"relative"}}><input style={INP} type="number" step="0.1" min="0" value={entry.width_cm} onChange={e=>setEntry(v=>({...v,width_cm:e.target.value}))} placeholder="Width"/><span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--color-text-muted)"}}>W</span></div>
              <div style={{position:"relative"}}><input style={INP} type="number" step="0.1" min="0" value={entry.depth_cm} onChange={e=>setEntry(v=>({...v,depth_cm:e.target.value}))} placeholder="Depth"/><span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--color-text-muted)"}}>D</span></div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={LBL}>Wound Bed</label>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {WOUND_BED.map(b=><button key={b} onClick={()=>setEntry(v=>({...v,wound_bed:b}))} style={{padding:"3px 9px",borderRadius:6,border:"1px solid "+(entry.wound_bed===b?"#06b6d4":"var(--color-border)"),background:entry.wound_bed===b?"rgba(6,182,212,0.15)":"transparent",color:entry.wound_bed===b?"#06b6d4":"var(--color-text-muted)",fontSize:11,cursor:"pointer"}}>{b}</button>)}
              </div>
            </div>
            <div>
              <label style={LBL}>Periwound Skin</label>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {WOUND_PERIWOUND.map(p=><button key={p} onClick={()=>setEntry(v=>({...v,periwound:p}))} style={{padding:"3px 9px",borderRadius:6,border:"1px solid "+(entry.periwound===p?"#06b6d4":"var(--color-border)"),background:entry.periwound===p?"rgba(6,182,212,0.15)":"transparent",color:entry.periwound===p?"#06b6d4":"var(--color-text-muted)",fontSize:11,cursor:"pointer"}}>{p}</button>)}
              </div>
            </div>
          </div>
          <div className="four-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Exudate Amount</label>
              <select style={{...INP,cursor:"pointer"}} value={entry.exudate} onChange={e=>setEntry(v=>({...v,exudate:e.target.value}))}>
                {WOUND_EXUDATE_AMT.map(x=><option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Exudate Type</label>
              <select style={{...INP,cursor:"pointer"}} value={entry.exudate_type} onChange={e=>setEntry(v=>({...v,exudate_type:e.target.value}))}>
                <option value="">—</option>
                {WOUND_EXUDATE_TYPE.map(x=><option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Pain at Site</label>
              <select style={{...INP,cursor:"pointer"}} value={entry.pain_at_site} onChange={e=>setEntry(v=>({...v,pain_at_site:e.target.value}))}>
                {WOUND_PAIN.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--color-text-primary)",fontWeight:600,cursor:"pointer",paddingBottom:8}}>
                <input type="checkbox" checked={!!entry.odour} onChange={e=>setEntry(v=>({...v,odour:e.target.checked}))} style={{accentColor:"#ef4444",width:14,height:14}}/>
                Odour present
              </label>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Dressing Used</label><input style={INP} value={entry.dressing_used} onChange={e=>setEntry(v=>({...v,dressing_used:e.target.value}))} placeholder="e.g. Foam dressing, alginate..."/></div>
            <div><label style={LBL}>Change Frequency</label><input style={INP} value={entry.dressing_frequency} onChange={e=>setEntry(v=>({...v,dressing_frequency:e.target.value}))} placeholder="e.g. Daily, 3x/week..."/></div>
          </div>
          <div style={{marginBottom:10}}><label style={LBL}>Notes</label><textarea style={{...INP,height:52,resize:"vertical"}} value={entry.notes} onChange={e=>setEntry(v=>({...v,notes:e.target.value}))} placeholder="Observations, wound appearance changes..."/></div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{...ABTN,borderStyle:"solid"}} onClick={()=>{setShowForm(false);setEntry(null);}}>Cancel</button>
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#06b6d4",color:"#000",fontWeight:600}} onClick={save}>Save</button>
          </div>
        </div>
      )}
      {filtered.length===0&&!showForm&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No wound assessments logged yet</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(row=>{
          const hc=WOUND_HEALING_COLOR[row.healing_status]||"var(--color-text-muted)";
          const area=(row.length_cm&&row.width_cm)?Math.round(parseFloat(row.length_cm)*parseFloat(row.width_cm)*10)/10:null;
          return(
            <div key={row.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:9,padding:"10px 14px",borderLeft:"3px solid "+hc}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{new Date(row.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
                  {row.site&&<span style={{fontSize:12,fontWeight:700,color:"var(--color-text-secondary)"}}>📍 {row.site}</span>}
                  <span style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,background:hc+"20",color:hc}}>{row.healing_status}</span>
                  {row.stage&&row.stage!=="N/A"&&<span style={{fontSize:11,fontWeight:600,padding:"1px 7px",borderRadius:20,background:"rgba(100,116,139,0.15)",color:"var(--color-text-secondary)"}}>{row.stage}</span>}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>openEdit(row)} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"2px 8px",color:"#06b6d4",fontSize:11}}>Edit</button>
                  <button onClick={()=>rm(row.id)} style={{background:"none",border:"none",color:"var(--color-text-muted)",fontSize:12}}>x</button>
                </div>
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:area||row.wound_bed||row.exudate?4:0}}>
                <span style={{fontSize:12,color:"var(--color-text-dim)"}}>📋 {row.type}</span>
                {area&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>📐 {row.length_cm}×{row.width_cm}{row.depth_cm?" (d:"+row.depth_cm+")":""} cm → {area} cm²</span>}
              </div>
              {(row.wound_bed||row.periwound||row.exudate)&&(
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:4}}>
                  {row.wound_bed&&<span style={{fontSize:11,color:"var(--color-text-dim)"}}>Bed: <strong style={{color:"var(--color-text-secondary)"}}>{row.wound_bed}</strong></span>}
                  {row.periwound&&<span style={{fontSize:11,color:"var(--color-text-dim)"}}>Periwound: <strong style={{color:"var(--color-text-secondary)"}}>{row.periwound}</strong></span>}
                  {row.exudate&&row.exudate!=="None"&&<span style={{fontSize:11,color:"var(--color-text-dim)"}}>Exudate: <strong style={{color:"var(--color-text-secondary)"}}>{row.exudate}{row.exudate_type?" "+row.exudate_type:""}</strong></span>}
                  {row.odour&&<span style={{fontSize:11,fontWeight:700,color:"#f87171"}}>⚠ Odour</span>}
                  {row.pain_at_site&&row.pain_at_site!=="None"&&<span style={{fontSize:11,color:"#f59e0b"}}>Pain: {row.pain_at_site}</span>}
                </div>
              )}
              {row.dressing_used&&<div style={{fontSize:12,color:"var(--color-text-muted)",marginTop:2}}>Dressing: {row.dressing_used}{row.dressing_frequency?" · "+row.dressing_frequency:""}</div>}
              {row.recorded_by&&<div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:2}}>By: {row.recorded_by}</div>}
              {row.notes&&<div style={{fontSize:12,color:"var(--color-text-muted)",marginTop:4,fontStyle:"italic"}}>{row.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ADL Tracker ─────────────────────────────────────────────────────────────
function ADLTracker({items,onChange}){
  const [showForm,setShowForm]=useState(false);
  const [entry,setEntry]=useState(null);
  const blankEntry=()=>({id:uid(),date:tod(),recorded_by:"",items:{bathing:"Independent",dressing:"Independent",toileting:"Independent",eating:"Independent",mobility:"Independent",grooming:"Independent"},notes:""});
  const openNew=()=>{setEntry(blankEntry());setShowForm(true);};
  const openEdit=row=>{setEntry({...row,items:{...row.items}});setShowForm(true);};
  const save=()=>{onChange([...items.filter(i=>i.id!==entry.id),entry].sort((a,b)=>b.date.localeCompare(a.date)));setShowForm(false);setEntry(null);};
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const sorted=[...items].sort((a,b)=>b.date.localeCompare(a.date));
  const summary=calcAdlSummary(items);

  return(
    <div>
      {summary&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{fontWeight:700,fontSize:13,color:summary.dep.color}}>{summary.dep.label} dependency</span>
          <span style={{fontSize:12,color:"var(--color-text-dim)"}}>Score: {summary.score}/18</span>
          {summary.trend&&(
            <span style={{fontSize:12,fontWeight:600,color:summary.trend==="declining"?"#f87171":summary.trend==="improving"?"#10b981":"var(--color-text-muted)"}}>
              {summary.trend==="declining"?"↓ Declining":summary.trend==="improving"?"↑ Improving":"→ Stable"}
            </span>
          )}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginLeft:"auto"}}>
            {ADL_ITEMS.map(k=>{
              const lvl=summary.latest.items?.[k]||"Independent";
              return<span key={k} style={{fontSize:11,fontWeight:700,padding:"1px 7px",borderRadius:12,background:ADL_LEVEL_COLOR[lvl]+"20",color:ADL_LEVEL_COLOR[lvl],border:"1px solid "+ADL_LEVEL_COLOR[lvl]+"40"}}>{ADL_LABELS[k].split(" ")[0]} {lvl}</span>;
            })}
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"var(--color-text-dim)"}}>{items.length} assessment{items.length!==1?"s":""}</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#10b981",color:"#10b981"}} onClick={openNew}>+ Log Assessment</button>
      </div>
      {showForm&&entry&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid #10b981",borderRadius:10,padding:14,marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Date</label><input type="date" style={INP} value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
            <div><label style={LBL}>Recorded By</label><input style={INP} value={entry.recorded_by} onChange={e=>setEntry(v=>({...v,recorded_by:e.target.value}))} placeholder="Staff name..."/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            {ADL_ITEMS.map(k=>(
              <div key={k}>
                <label style={LBL}>{ADL_LABELS[k]}</label>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {ADL_LEVELS.map(lvl=>(
                    <button key={lvl} onClick={()=>setEntry(v=>({...v,items:{...v.items,[k]:lvl}}))}
                      style={{padding:"4px 10px",borderRadius:6,border:"1px solid "+(entry.items?.[k]===lvl?ADL_LEVEL_COLOR[lvl]:"var(--color-border)"),background:entry.items?.[k]===lvl?ADL_LEVEL_COLOR[lvl]+"25":"transparent",color:entry.items?.[k]===lvl?ADL_LEVEL_COLOR[lvl]:"var(--color-text-muted)",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{marginBottom:10}}><label style={LBL}>Notes</label><textarea style={{...INP,height:52,resize:"vertical"}} value={entry.notes} onChange={e=>setEntry(v=>({...v,notes:e.target.value}))} placeholder="Observations..."/></div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{...ABTN,borderStyle:"solid"}} onClick={()=>{setShowForm(false);setEntry(null);}}>Cancel</button>
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#10b981",color:"#fff",fontWeight:600}} onClick={save}>Save</button>
          </div>
        </div>
      )}
      {sorted.length===0&&!showForm&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No ADL assessments logged yet</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map(row=>{
          const sc=adlScore(row.items);
          const dep=adlDepLevel(sc);
          return(
            <div key={row.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:9,padding:"10px 14px",borderLeft:"3px solid "+dep.color}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{new Date(row.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</span>
                  <span style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,background:dep.color+"20",color:dep.color}}>{dep.label} ({sc}/18)</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>openEdit(row)} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"2px 8px",color:"#10b981",fontSize:11}}>Edit</button>
                  <button onClick={()=>rm(row.id)} style={{background:"none",border:"none",color:"var(--color-text-muted)",fontSize:12}}>x</button>
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {ADL_ITEMS.map(k=>{
                  const lvl=row.items?.[k]||"Independent";
                  return<span key={k} style={{fontSize:11,padding:"1px 7px",borderRadius:12,background:ADL_LEVEL_COLOR[lvl]+"18",color:ADL_LEVEL_COLOR[lvl],border:"1px solid "+ADL_LEVEL_COLOR[lvl]+"35"}}>{ADL_LABELS[k].split(" ")[0]} <strong>{lvl}</strong></span>;
                })}
              </div>
              {row.recorded_by&&<div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:4}}>Recorded by: {row.recorded_by}</div>}
              {row.notes&&<div style={{fontSize:12,color:"var(--color-text-muted)",marginTop:4,fontStyle:"italic"}}>{row.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Incident Reports ─────────────────────────────────────────────────────────
const INCIDENT_TYPES=["Fall","Near Fall","Behavioral Event","Medical Emergency","Medication Error","Skin / Wound","Property Damage","Other"];
const INCIDENT_SEV_COLORS={Minor:"#f59e0b",Moderate:"#ef4444",Severe:"#dc2626"};
function IncidentReports({items,onChange,currentUser}){
  const [showForm,setShowForm]=useState(false);
  const [entry,setEntry]=useState(null);
  const blank=()=>({id:uid(),date:tod(),time:"",type:"Fall",severity:"Minor",description:"",witnesses:"",action_taken:"",reported_by:currentUser?.displayName||"",follow_up_required:false,follow_up_date:""});
  const openNew=()=>{setEntry(blank());setShowForm(true);};
  const openEdit=item=>{setEntry({...item});setShowForm(true);};
  const save=()=>{onChange([...items.filter(i=>i.id!==entry.id),entry].sort((a,b)=>b.date.localeCompare(a.date)));setShowForm(false);setEntry(null);};
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const sorted=[...items].sort((a,b)=>b.date.localeCompare(a.date));
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"var(--color-text-dim)"}}>{items.length} incident{items.length!==1?"s":""}</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#ef4444",color:"#ef4444"}} onClick={openNew}>+ Log Incident</button>
      </div>
      {showForm&&entry&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid #ef4444",borderRadius:10,padding:14,marginBottom:12}}>
          <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Date</label><input type="date" style={INP} value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
            <div><label style={LBL}>Time</label><input type="time" style={INP} value={entry.time} onChange={e=>setEntry(v=>({...v,time:e.target.value}))}/></div>
            <div><label style={LBL}>Incident Type</label>
              <select style={{...INP,cursor:"pointer"}} value={entry.type} onChange={e=>setEntry(v=>({...v,type:e.target.value}))}>
                {INCIDENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Severity</label>
              <select style={{...INP,cursor:"pointer",color:INCIDENT_SEV_COLORS[entry.severity]||"#e2e8f0",borderColor:INCIDENT_SEV_COLORS[entry.severity]||"var(--color-border)"}} value={entry.severity} onChange={e=>setEntry(v=>({...v,severity:e.target.value}))}>
                {["Minor","Moderate","Severe"].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
            <div><label style={LBL}>Description</label><textarea style={{...INP,height:72,resize:"vertical"}} value={entry.description} onChange={e=>setEntry(v=>({...v,description:e.target.value}))} placeholder="What happened..."/></div>
            <div><label style={LBL}>Witnesses</label><input style={INP} value={entry.witnesses} onChange={e=>setEntry(v=>({...v,witnesses:e.target.value}))} placeholder="Names of witnesses..."/></div>
            <div><label style={LBL}>Action Taken</label><textarea style={{...INP,height:56,resize:"vertical"}} value={entry.action_taken} onChange={e=>setEntry(v=>({...v,action_taken:e.target.value}))} placeholder="Immediate actions taken..."/></div>
            <div><label style={LBL}>Reported By</label><input style={INP} value={entry.reported_by} onChange={e=>setEntry(v=>({...v,reported_by:e.target.value}))}/></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <input type="checkbox" checked={entry.follow_up_required} onChange={e=>setEntry(v=>({...v,follow_up_required:e.target.checked}))} style={{accentColor:"#6366f1",width:15,height:15}}/>
            <label style={{fontSize:13,color:"var(--color-text-primary)",fontWeight:600}}>Follow-up required</label>
            {entry.follow_up_required&&<input type="date" style={{...INP,flex:1}} value={entry.follow_up_date} onChange={e=>setEntry(v=>({...v,follow_up_date:e.target.value}))}/>}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{...ABTN,borderStyle:"solid"}} onClick={()=>{setShowForm(false);setEntry(null);}}>Cancel</button>
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontWeight:600}} onClick={save}>Save Incident</button>
          </div>
        </div>
      )}
      {sorted.length===0&&!showForm&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No incidents recorded</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map(item=>{
          const sc=INCIDENT_SEV_COLORS[item.severity]||"#f59e0b";
          return(
            <div key={item.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:9,padding:"12px 14px",borderLeft:"4px solid "+sc}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{item.type}</span>
                    <span style={{fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:20,background:sc+"20",color:sc,border:"1px solid "+sc+"40"}}>{item.severity}</span>
                  </div>
                  <span style={{fontSize:11,color:"var(--color-text-dim)"}}>{new Date(item.date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}{item.time&&" at "+item.time}</span>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>openEdit(item)} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"2px 8px",color:"#6366f1",fontSize:11}}>Edit</button>
                  <button onClick={()=>rm(item.id)} style={{background:"none",border:"none",color:"var(--color-text-muted)",fontSize:12}}>x</button>
                </div>
              </div>
              {item.description&&<div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.5,marginBottom:6}}>{item.description}</div>}
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                {item.action_taken&&<span style={{fontSize:11,color:"var(--color-text-dim)"}}>✓ {item.action_taken}</span>}
                {item.reported_by&&<span style={{fontSize:11,color:"var(--color-text-muted)"}}>By: {item.reported_by}</span>}
                {item.follow_up_required&&<span style={{fontSize:11,fontWeight:700,color:"#8b5cf6"}}>📋 Follow-up{item.follow_up_date?" "+item.follow_up_date:""}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Intake Checklist ─────────────────────────────────────────────────────────
function IntakeChecklist({items,onChange,currentUser}){
  const full=DEFAULT_INTAKE_ITEMS.map(def=>{
    const ex=items.find(i=>i.key===def.key);
    return ex||{id:uid(),key:def.key,label:def.label,done:false,completed_by:"",completed_at:""};
  });
  const toggle=key=>{
    const item=full.find(i=>i.key===key);
    const newDone=!item.done;
    onChange(full.map(i=>i.key===key?{...i,done:newDone,completed_by:newDone?(currentUser?.displayName||""):"",completed_at:newDone?tod():""}:i));
  };
  const doneCount=full.filter(i=>i.done).length;
  const pct=Math.round(doneCount/full.length*100);
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <div style={{flex:1,height:8,background:"rgba(128,128,128,0.12)",borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:pct+"%",background:pct===100?"#10b981":"var(--color-accent)",borderRadius:4,transition:"width 0.3s"}}/>
        </div>
        <span style={{fontSize:12,fontWeight:700,color:pct===100?"#10b981":"var(--color-text-secondary)",whiteSpace:"nowrap"}}>{doneCount}/{full.length}{pct===100?" ✓ Complete":""}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {full.map(item=>(
          <div key={item.key} onClick={()=>toggle(item.key)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:9,border:"1px solid "+(item.done?"rgba(16,185,129,0.3)":"var(--color-border)"),background:item.done?"rgba(16,185,129,0.08)":"transparent",cursor:"pointer"}}>
            <div style={{width:20,height:20,borderRadius:5,border:"2px solid "+(item.done?"#10b981":"var(--color-text-muted)"),background:item.done?"#10b981":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,color:"#fff",fontWeight:700}}>
              {item.done?"✓":""}
            </div>
            <span style={{flex:1,fontSize:13,color:item.done?"#10b981":"var(--color-text-primary)",fontWeight:item.done?600:400}}>{item.label}</span>
            {item.done&&item.completed_by&&<span style={{fontSize:10,color:"var(--color-text-muted)",whiteSpace:"nowrap"}}>{item.completed_by}{item.completed_at?" · "+item.completed_at:""}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAR Tracker ──────────────────────────────────────────────────────────────
const SLOTS=[
  {key:"morning",  label:"Morning",  short:"AM",  icon:"🌅"},
  {key:"afternoon",label:"Afternoon",short:"PM",  icon:"☀️"},
  {key:"evening",  label:"Evening",  short:"Eve", icon:"🌆"},
  {key:"night",    label:"Night",    short:"Ngt", icon:"🌙"},
];

function MARTracker({marLog,medications,onChange,currentUser}){
  const [date,setDate]=useState(tod());

  const meds=(medications||[]).filter(m=>m.name&&m.name.trim());
  const activeMeds=meds.filter(m=>SLOTS.some(s=>m.timing&&m.timing[s.key]));

  // Get all entries for selected date
  const dayEntries=(marLog||[]).filter(e=>e.date===date);

  const getEntry=(medName,slot)=>dayEntries.find(e=>e.medication_name===medName&&e.slot===slot);

  const toggle=(med,slot)=>{
    const existing=getEntry(med.name,slot);
    const now=new Date().toISOString();
    let updated;
    if(existing&&existing.given){
      // Un-give
      updated=(marLog||[]).map(e=>(e.date===date&&e.medication_name===med.name&&e.slot===slot)
        ?{...e,given:false,given_by:"",given_at:""}:e);
    } else if(existing){
      // Mark given
      updated=(marLog||[]).map(e=>(e.date===date&&e.medication_name===med.name&&e.slot===slot)
        ?{...e,given:true,given_by:currentUser?.displayName||"",given_at:now}:e);
    } else {
      // New entry
      const entry={id:uid(),date,medication_name:med.name,dosage:med.dosage||"",slot,given:true,given_by:currentUser?.displayName||"",given_at:now,notes:""};
      updated=[...(marLog||[]),entry];
    }
    // Prune entries older than 90 days
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);
    const cutoffStr=cutoff.toISOString().slice(0,10);
    onChange(updated.filter(e=>e.date>=cutoffStr));
  };

  const givenCount=dayEntries.filter(e=>e.given).length;
  const totalSlots=activeMeds.reduce((s,m)=>s+SLOTS.filter(sl=>m.timing&&m.timing[sl.key]).length,0);

  // Navigate dates
  const changeDate=offset=>{
    const d=new Date(date+"T00:00:00");
    d.setDate(d.getDate()+offset);
    setDate(d.toISOString().slice(0,10));
  };
  const isToday=date===tod();

  if(meds.length===0)return(
    <div style={{textAlign:"center",padding:"32px 20px",color:"var(--color-text-muted)"}}>
      <div style={{fontSize:32,marginBottom:8}}>💊</div>
      <div style={{fontSize:14,fontWeight:600}}>No medications on record</div>
      <div style={{fontSize:12,marginTop:4}}>Add medications first to use the MAR</div>
    </div>
  );

  return(
    <div>
      {/* Date navigator */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <button onClick={()=>changeDate(-1)} style={{width:32,height:32,borderRadius:8,border:"1px solid var(--color-border)",background:"var(--color-bg-hover)",color:"var(--color-text-secondary)",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <div style={{flex:1,textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:700,color:"var(--color-text-primary)"}}>{new Date(date+"T00:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>
          {isToday&&<div style={{fontSize:11,color:"var(--color-accent)",fontWeight:600,fontFamily:"'DM Mono',monospace"}}>TODAY</div>}
        </div>
        <button onClick={()=>changeDate(1)} disabled={isToday} style={{width:32,height:32,borderRadius:8,border:"1px solid var(--color-border)",background:isToday?"transparent":"var(--color-bg-hover)",color:isToday?"var(--color-text-muted)":"var(--color-text-secondary)",fontSize:16,cursor:isToday?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:isToday?0.4:1}}>›</button>
      </div>

      {/* Progress bar */}
      {totalSlots>0&&(
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 14px",background:"var(--color-bg-hover)",borderRadius:9,border:"1px solid var(--color-border)"}}>
          <div style={{flex:1,height:6,background:"rgba(128,128,128,0.12)",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:(totalSlots>0?(givenCount/totalSlots)*100:0)+"%",background:givenCount===totalSlots&&totalSlots>0?"#10b981":"var(--color-accent)",borderRadius:3,transition:"width 0.3s"}}/>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:givenCount===totalSlots&&totalSlots>0?"#10b981":"var(--color-text-secondary)",whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace"}}>{givenCount}/{totalSlots} given</span>
        </div>
      )}

      {/* Medication rows */}
      {activeMeds.length===0?(
        <div style={{textAlign:"center",padding:"20px",color:"var(--color-text-muted)",fontSize:13}}>No medications have a scheduled time set. Edit medications and set Morning/Afternoon/Evening/Night.</div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {activeMeds.map(med=>{
            const activeSlots=SLOTS.filter(s=>med.timing&&med.timing[s.key]);
            return(
              <div key={med.id||med.name} style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:10,overflow:"hidden"}}>
                {/* Med header */}
                <div style={{padding:"10px 14px",borderBottom:"1px solid var(--color-border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--color-text-primary)"}}>{med.name}</div>
                    {(med.dosage||med.frequency)&&<div style={{fontSize:11,color:"var(--color-text-dim)",marginTop:1}}>{[med.dosage,med.frequency].filter(Boolean).join(" · ")}</div>}
                  </div>
                  <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"var(--color-text-muted)"}}>{activeSlots.length} slot{activeSlots.length!==1?"s":""}/day</div>
                </div>
                {/* Slot buttons */}
                <div style={{display:"flex",gap:8,padding:"10px 14px",flexWrap:"wrap"}}>
                  {activeSlots.map(slot=>{
                    const entry=getEntry(med.name,slot.key);
                    const given=entry?.given;
                    return(
                      <button key={slot.key} onClick={()=>toggle(med,slot.key)}
                        style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 14px",borderRadius:8,border:"2px solid "+(given?"#10b981":"var(--color-border)"),background:given?"rgba(16,185,129,0.1)":"var(--color-bg-hover)",cursor:"pointer",minWidth:70,transition:"all 120ms",touchAction:"manipulation"}}>
                        <span style={{fontSize:18}}>{slot.icon}</span>
                        <span style={{fontSize:11,fontWeight:700,color:given?"#10b981":"var(--color-text-secondary)"}}>{slot.short}</span>
                        {given?(
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:9,color:"#10b981",fontWeight:600}}>✓ Given</div>
                            {entry.given_by&&<div style={{fontSize:9,color:"var(--color-text-muted)"}}>{entry.given_by}</div>}
                            {entry.given_at&&<div style={{fontSize:9,color:"var(--color-text-muted)",fontFamily:"'DM Mono',monospace"}}>{new Date(entry.given_at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</div>}
                          </div>
                        ):(
                          <div style={{fontSize:9,color:"var(--color-text-muted)"}}>Tap to give</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PRN / unscheduled meds note */}
      {meds.length>activeMeds.length&&(
        <div style={{marginTop:12,padding:"8px 12px",borderRadius:8,background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",fontSize:11,color:"var(--color-text-muted)"}}>
          💊 {meds.length-activeMeds.length} PRN / unscheduled medication{meds.length-activeMeds.length!==1?"s":""} not shown — edit medications to set a schedule.
        </div>
      )}
    </div>
  );
}

// ─── Shift Handover Notes ─────────────────────────────────────────────────────
const SHIFTS=[
  {key:"morning",  label:"Morning Shift",  icon:"🌅", time:"06:00–14:00"},
  {key:"afternoon",label:"Afternoon Shift", icon:"☀️", time:"14:00–22:00"},
  {key:"night",    label:"Night Shift",     icon:"🌙", time:"22:00–06:00"},
];
const URGENCY_OPTS=["Routine","Watch","Urgent"];
const URGENCY_COLOR={Routine:"#34d399",Watch:"#f59e0b",Urgent:"#ef4444"};

function HandoverNotes({supabase,companyId,currentUser,clients}){
  const [date,setDate]=useState(tod());
  const [shift,setShift]=useState(()=>{
    const h=new Date().getHours();
    return h>=6&&h<14?"morning":h>=14&&h<22?"afternoon":"night";
  });
  const [notes,setNotes]=useState([]);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({summary:"",outgoing_staff:"",incoming_staff:"",key_events:[],action_items:[]});
  const [newEvent,setNewEvent]=useState({clientName:"",note:"",urgency:"Routine"});
  const [newAction,setNewAction]=useState("");
  const [signingOff,setSigningOff]=useState(null);

  const load=async()=>{
    setLoading(true);
    const {data}=await supabase.from("handover_notes")
      .select("*").eq("company_id",companyId).eq("date",date)
      .order("created_at",{ascending:false});
    setNotes(data||[]);
    setLoading(false);
  };

  useEffect(()=>{load();},[date,companyId]);

  const currentNote=notes.find(n=>n.shift===shift);
  const otherNotes=notes.filter(n=>n.shift!==shift);

  const startForm=()=>{
    if(currentNote){
      setForm({
        summary:currentNote.summary||"",
        outgoing_staff:currentNote.outgoing_staff||"",
        incoming_staff:currentNote.incoming_staff||"",
        key_events:JSON.parse(currentNote.key_events||"[]"),
        action_items:JSON.parse(currentNote.action_items||"[]"),
      });
    } else {
      setForm({summary:"",outgoing_staff:currentUser?.displayName||"",incoming_staff:"",key_events:[],action_items:[]});
    }
    setShowForm(true);
  };

  const save=async()=>{
    setSaving(true);
    const payload={
      company_id:companyId,date,shift,
      summary:form.summary,
      outgoing_staff:form.outgoing_staff,
      incoming_staff:form.incoming_staff,
      key_events:JSON.stringify(form.key_events),
      action_items:JSON.stringify(form.action_items),
      created_by:currentUser?.displayName||currentUser?.email||"",
    };
    if(currentNote){
      await supabase.from("handover_notes").update(payload).eq("id",currentNote.id);
    } else {
      await supabase.from("handover_notes").insert(payload);
    }
    setSaving(false);setShowForm(false);await load();
  };

  const signOff=async(note)=>{
    setSigningOff(note.id);
    await supabase.from("handover_notes").update({
      signed_off_by:currentUser?.displayName||"",
      signed_off_at:new Date().toISOString(),
    }).eq("id",note.id);
    setSigningOff(null);await load();
  };

  const addEvent=()=>{
    if(!newEvent.clientName.trim()&&!newEvent.note.trim())return;
    setForm(f=>({...f,key_events:[...f.key_events,{id:uid(),...newEvent}]}));
    setNewEvent({clientName:"",note:"",urgency:"Routine"});
  };

  const addAction=()=>{
    if(!newAction.trim())return;
    setForm(f=>({...f,action_items:[...f.action_items,newAction.trim()]}));
    setNewAction("");
  };

  const renderNote=(note,isMain)=>{
    const events=JSON.parse(note.key_events||"[]");
    const actions=JSON.parse(note.action_items||"[]");
    const shiftInfo=SHIFTS.find(s=>s.key===note.shift)||{icon:"📋",label:note.shift,time:""};
    const signed=!!note.signed_off_by;
    return(
      <div key={note.id} style={{background:"var(--color-bg-card)",border:"1px solid "+(signed?"rgba(16,185,129,0.3)":"var(--color-border)"),borderRadius:12,overflow:"hidden",marginBottom:isMain?0:12}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--color-border)",display:"flex",alignItems:"center",justifyContent:"space-between",background:signed?"rgba(16,185,129,0.06)":"transparent"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>{shiftInfo.icon}</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--color-text-primary)"}}>{shiftInfo.label} {shiftInfo.time&&<span style={{fontSize:11,color:"var(--color-text-muted)",fontFamily:"'DM Mono',monospace"}}>({shiftInfo.time})</span>}</div>
              <div style={{fontSize:11,color:"var(--color-text-muted)"}}>By {note.created_by||"—"}{note.outgoing_staff?" · Out: "+note.outgoing_staff:""}{note.incoming_staff?" · In: "+note.incoming_staff:""}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {signed?(
              <span style={{fontSize:11,fontWeight:700,color:"#10b981",display:"flex",alignItems:"center",gap:4}}>✓ Signed off by {note.signed_off_by}</span>
            ):(
              <button onClick={()=>signOff(note)} disabled={signingOff===note.id}
                style={{padding:"5px 12px",borderRadius:7,border:"1px solid #10b981",background:"transparent",color:"#10b981",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {signingOff===note.id?"...":"✓ Sign Off"}
              </button>
            )}
            {isMain&&<button onClick={startForm} style={{padding:"5px 12px",borderRadius:7,border:"1px solid var(--color-border)",background:"var(--color-bg-hover)",color:"var(--color-text-secondary)",fontSize:12,fontWeight:600,cursor:"pointer"}}>Edit</button>}
          </div>
        </div>
        {note.summary&&<div style={{padding:"12px 16px",fontSize:13,color:"var(--color-text-primary)",lineHeight:1.7,borderBottom:events.length>0||actions.length>0?"1px solid var(--color-border)":"none",whiteSpace:"pre-wrap"}}>{note.summary}</div>}
        {events.length>0&&(
          <div style={{padding:"10px 16px",borderBottom:actions.length>0?"1px solid var(--color-border)":"none"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--color-text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Key Events</div>
            {events.map((e,i)=>(
              <div key={e.id||i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"5px 0",borderBottom:i<events.length-1?"1px solid var(--color-border)":"none"}}>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:URGENCY_COLOR[e.urgency]+"18",color:URGENCY_COLOR[e.urgency],whiteSpace:"nowrap",marginTop:1}}>{e.urgency}</span>
                <div>
                  {e.clientName&&<span style={{fontSize:12,fontWeight:700,color:"var(--color-text-primary)"}}>{e.clientName} — </span>}
                  <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{e.note}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {actions.length>0&&(
          <div style={{padding:"10px 16px"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--color-text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Action Items</div>
            {actions.map((a,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontSize:12,color:"var(--color-text-secondary)"}}>
                <span style={{color:"var(--color-accent)",fontWeight:700,fontSize:14}}>→</span>{a}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return(
    <div>
      {/* Date + shift selector */}
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          style={{...INP,width:"auto",fontSize:13,padding:"7px 10px"}}/>
        <div style={{display:"flex",gap:6}}>
          {SHIFTS.map(s=>(
            <button key={s.key} onClick={()=>setShift(s.key)}
              style={{padding:"6px 12px",borderRadius:7,border:"1px solid "+(shift===s.key?"var(--color-accent)":"var(--color-border)"),background:shift===s.key?"var(--color-bg-active)":"var(--color-bg-hover)",color:shift===s.key?"var(--color-accent-light)":"var(--color-text-secondary)",fontSize:12,fontWeight:600,cursor:"pointer",touchAction:"manipulation"}}>
              {s.icon} {s.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Current shift */}
      {loading?<div style={{textAlign:"center",padding:32,color:"var(--color-text-muted)"}}>Loading...</div>:(
        <>
          {currentNote&&!showForm&&renderNote(currentNote,true)}
          {!currentNote&&!showForm&&(
            <div style={{textAlign:"center",padding:"32px 20px",border:"2px dashed var(--color-border)",borderRadius:12,marginBottom:16}}>
              <div style={{fontSize:32,marginBottom:8}}>{SHIFTS.find(s=>s.key===shift)?.icon}</div>
              <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)",marginBottom:4}}>No {SHIFTS.find(s=>s.key===shift)?.label} handover yet</div>
              <div style={{fontSize:12,color:"var(--color-text-muted)",marginBottom:14}}>{date===tod()?"Start now to hand over to the incoming team.":"No handover was recorded for this shift."}</div>
              {date===tod()&&<button onClick={startForm} style={{padding:"9px 22px",borderRadius:9,border:"none",background:"var(--color-accent)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Start Handover</button>}
            </div>
          )}

          {/* Form */}
          {showForm&&(
            <div style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:12,padding:16,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:"var(--color-text-primary)",marginBottom:12}}>{currentNote?"Edit":"New"} {SHIFTS.find(s=>s.key===shift)?.label} Handover</div>
              <div style={{marginBottom:10}}>
                <label style={LBL}>Outgoing Staff</label>
                <input style={INP} value={form.outgoing_staff} onChange={e=>setForm(f=>({...f,outgoing_staff:e.target.value}))} placeholder="Your name"/>
              </div>
              <div style={{marginBottom:10}}>
                <label style={LBL}>Incoming Staff</label>
                <input style={INP} value={form.incoming_staff} onChange={e=>setForm(f=>({...f,incoming_staff:e.target.value}))} placeholder="Incoming staff name"/>
              </div>
              <div style={{marginBottom:12}}>
                <label style={LBL}>Shift Summary</label>
                <textarea style={{...INP,height:90,resize:"none",lineHeight:1.6}} value={form.summary} onChange={e=>setForm(f=>({...f,summary:e.target.value}))} placeholder="General shift summary, ward status, notable events…"/>
              </div>

              {/* Key events */}
              <div style={{marginBottom:12}}>
                <label style={LBL}>Key Events / Client Flags</label>
                {form.key_events.map((e,i)=>(
                  <div key={e.id||i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,padding:"6px 10px",background:"var(--color-bg-card)",borderRadius:7,border:"1px solid var(--color-border)"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:4,background:URGENCY_COLOR[e.urgency]+"18",color:URGENCY_COLOR[e.urgency]}}>{e.urgency}</span>
                    <span style={{fontSize:12,flex:1,color:"var(--color-text-primary)"}}>{e.clientName&&<strong>{e.clientName} — </strong>}{e.note}</span>
                    <button onClick={()=>setForm(f=>({...f,key_events:f.key_events.filter((_,j)=>j!==i)}))} style={IBTN} aria-label="Remove">×</button>
                  </div>
                ))}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <select value={newEvent.urgency} onChange={e=>setNewEvent(v=>({...v,urgency:e.target.value}))}
                    style={{...INP,width:"auto",fontSize:12,padding:"7px 10px",color:URGENCY_COLOR[newEvent.urgency]}}>
                    {URGENCY_OPTS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                  <input style={{...INP,flex:"1 1 120px",fontSize:12,padding:"7px 10px"}} placeholder="Client name (optional)" value={newEvent.clientName} onChange={e=>setNewEvent(v=>({...v,clientName:e.target.value}))}/>
                  <input style={{...INP,flex:"2 1 180px",fontSize:12,padding:"7px 10px"}} placeholder="Event / note…" value={newEvent.note} onChange={e=>setNewEvent(v=>({...v,note:e.target.value}))}
                    onKeyDown={e=>e.key==="Enter"&&addEvent()}/>
                  <button onClick={addEvent} style={ABTN}>+ Add</button>
                </div>
              </div>

              {/* Action items */}
              <div style={{marginBottom:14}}>
                <label style={LBL}>Action Items for Incoming Team</label>
                {form.action_items.map((a,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,padding:"6px 10px",background:"var(--color-bg-card)",borderRadius:7,border:"1px solid var(--color-border)"}}>
                    <span style={{color:"var(--color-accent)",fontWeight:700}}>→</span>
                    <span style={{fontSize:12,flex:1,color:"var(--color-text-primary)"}}>{a}</span>
                    <button onClick={()=>setForm(f=>({...f,action_items:f.action_items.filter((_,j)=>j!==i)}))} style={IBTN} aria-label="Remove">×</button>
                  </div>
                ))}
                <div style={{display:"flex",gap:6}}>
                  <input style={{...INP,flex:1,fontSize:12,padding:"7px 10px"}} placeholder="Action item…" value={newAction} onChange={e=>setNewAction(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&addAction()}/>
                  <button onClick={addAction} style={ABTN}>+ Add</button>
                </div>
              </div>

              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setShowForm(false)} style={{...ABTN,borderStyle:"solid",borderColor:"var(--color-border)",color:"var(--color-text-secondary)"}}>Cancel</button>
                <button onClick={save} disabled={saving} style={{padding:"9px 22px",borderRadius:8,border:"none",background:"var(--color-accent)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  {saving?"Saving…":"Save Handover"}
                </button>
              </div>
            </div>
          )}

          {/* Other shifts today */}
          {otherNotes.length>0&&(
            <div style={{marginTop:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--color-text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Other shifts this day</div>
              {otherNotes.map(n=>renderNote(n,false))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { PainAssessment, BradenScale, CognitiveScreening, ContinenceLog, NutritionScreening, WoundAssessment, ADLTracker, IncidentReports, IntakeChecklist, MARTracker, HandoverNotes };
