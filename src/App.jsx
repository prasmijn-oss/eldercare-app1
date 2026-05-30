import { useState, useEffect, useCallback, useRef, useMemo, Fragment, createContext, useContext } from "react";
import { supabase, supabaseAdmin, SUPABASE_URL } from "./lib/supabase.js";
import {
  COLORS, PLY, DIAGNOSES, MEDICATIONS, HIGH_RISK,
  FALL_RISK_DIAG, FALL_RISK_MEDS,
  BRADEN_SUBSCALES, BRADEN_MAX,
  MMSE_DOMAINS,
  CONTINENCE_TYPES, CONTINENCE_PRODUCTS, CONTINENCE_VOLUME, CONTINENCE_SKIN,
  WOUND_HEALING_COLOR,
  ADL_ITEMS, ADL_LABELS, ADL_LEVELS, ADL_LEVEL_SCORE, ADL_LEVEL_COLOR,
  IDLE_TIMEOUT_MS, IDLE_WARN_SECS,
  DEFAULT_PERMS, DEFAULT_INTAKE_ITEMS,
  PW_LEVELS, INP, LBL, ABTN, IBTN, GCSS,
  LANG_OPTIONS, T,
} from "./lib/constants.js";
import {
  he, uid, tod, prefersReducedMotion,
  calcAge, daysUntil, daysSince, daysUntilBirthday,
  initials, avatarColor,
  getMedFlags, calcFallRisk, calcWeightTrend, getMissedAppointments,
  checkAbnormalVitals, allergyMedConflicts, checkDrugInteractions, expiryBadge,
  adlScore, adlDepLevel, calcAdlSummary,
  painLevel, calcPainSummary,
  calcWoundSummary,
  bradenRisk, bradenScore, calcBradenSummary,
  cognitiveLevel, calcCognitiveSummary,
  calcContinenceSummary,
  mustRisk, mustScore, calcNutritionSummary,
  calcReadmissionRisk,
  scorePassword,
  can, loadPermissions,
  toDb, fromDb, emptyClient,
} from "./lib/utils.js";
import { PasswordStrengthMeter, UserManagement } from "./components/UserManagement.jsx";
import { TiltCard, FlipCard, Dashboard } from "./components/Dashboard.jsx";
import { AuditTrail } from "./components/AuditTrail.jsx";
import { PainAssessment, BradenScale, CognitiveScreening, ContinenceLog, NutritionScreening, WoundAssessment, ADLTracker, IncidentReports, IntakeChecklist, MARTracker, PRNLog, HandoverNotes, PreventiveCare } from "./components/ClinicalComponents.jsx";
import { PermissionsContext } from "./lib/PermissionsContext.jsx";

function buildNotifications(clients){
  const notifs=[];const now=new Date();
  (clients||[]).forEach(c=>{
    if(c.archived)return;
    (c.documents||[]).forEach(d=>{
      if(!d.expiry)return;
      const days=Math.ceil((new Date(d.expiry)-now)/86400000);
      if(days>=0&&days<=30)notifs.push({id:`doc-${c.id}-${d.id||d.name}`,type:"expiry",urgency:days<=7?"high":"medium",icon:"📄",title:"Document expiring soon",body:`${d.name||"Doc"} for ${c.name} — ${days===0?"today":days+" day"+(days!==1?"s":"")}`,clientId:c.id,clientName:c.name});
      else if(days<0&&days>=-7)notifs.push({id:`docx-${c.id}-${d.id||d.name}`,type:"expired",urgency:"high",icon:"🚨",title:"Document expired",body:`${d.name||"Doc"} for ${c.name} expired ${Math.abs(days)} day${Math.abs(days)!==1?"s":""} ago`,clientId:c.id,clientName:c.name});
    });
    (c.appointments||[]).filter(a=>a.status==="Scheduled"&&a.date).forEach(a=>{
      const days=Math.ceil((new Date(a.date)-now)/86400000);
      if(days>=0&&days<=7)notifs.push({id:`apt-${c.id}-${a.id}`,type:"appointment",urgency:days===0?"high":"low",icon:"📅",title:`Appointment ${days===0?"today":"in "+days+" day"+(days!==1?"s":"")}`,body:`${c.name} — ${a.type||"Appointment"}`,clientId:c.id,clientName:c.name});
    });
    const fr=calcFallRisk(c);
    if(fr.level==="High")notifs.push({id:`fr-${c.id}`,type:"fall_risk",urgency:"medium",icon:"🚶",title:"High fall risk",body:`${c.name} scores ${fr.score} — ${fr.factors.slice(0,2).join(", ")}`,clientId:c.id,clientName:c.name});
    const wt=calcWeightTrend(c.vitals);
    if(wt)notifs.push({id:`wt-${c.id}`,type:"weight_trend",urgency:wt.severity,icon:wt.direction==="gain"?"⚖️":"📉",title:`Rapid weight ${wt.direction}`,body:`${c.name} — ${wt.amount}kg ${wt.direction} in ${wt.days} day${wt.days!==1?"s":""} (${wt.fromKg}→${wt.toKg} kg)`,clientId:c.id,clientName:c.name});
    const ma=getMissedAppointments(c.appointments);
    if(ma.pattern)notifs.push({id:`ma-${c.id}`,type:"missed_appt",urgency:"high",icon:"📅",title:"Repeated missed appointments",body:`${c.name} — ${ma.recentMissed.length} missed/overdue in the last 30 days`,clientId:c.id,clientName:c.name});
    else if(ma.overdue.length>0)notifs.push({id:`ma-${c.id}`,type:"missed_appt",urgency:"medium",icon:"📅",title:"Overdue appointment",body:`${c.name} — ${ma.overdue.length} scheduled appointment${ma.overdue.length!==1?"s":""} past due`,clientId:c.id,clientName:c.name});
    const adl=calcAdlSummary(c.adl_logs);
    if(adl&&adl.dep.label==="High")notifs.push({id:`adl-${c.id}`,type:"adl",urgency:"medium",icon:"🧍",title:"High ADL dependency",body:`${c.name} — score ${adl.score}/18 (${adl.dep.label})${adl.trend&&adl.trend==="declining"?" · declining":""}`,clientId:c.id,clientName:c.name});
    const pain=calcPainSummary(c.pain_assessments);
    if(pain){
      if(pain.latestScore>=7)notifs.push({id:`pain-${c.id}`,type:"pain",urgency:"high",icon:"🩹",title:"Severe pain reported",body:`${c.name} — score ${pain.latestScore}/10 (${pain.latest.location||"unspecified location"})`,clientId:c.id,clientName:c.name});
      else if(pain.persistent)notifs.push({id:`pain-${c.id}`,type:"pain",urgency:"medium",icon:"🩹",title:"Persistent moderate pain",body:`${c.name} — ${pain.recentModerateCount} assessments ≥4/10 in last 7 days`,clientId:c.id,clientName:c.name});
    }
    const braden=calcBradenSummary(c.braden_assessments);
    if(braden){
      if(braden.score<=12)notifs.push({id:`braden-${c.id}`,type:"braden",urgency:"high",icon:"🛏",title:`${braden.risk.label} — pressure ulcer`,body:`${c.name} — Braden score ${braden.score}/${BRADEN_MAX} · ${braden.risk.turning}`,clientId:c.id,clientName:c.name});
      else if(braden.score<=14)notifs.push({id:`braden-${c.id}`,type:"braden",urgency:"medium",icon:"🛏",title:"Moderate pressure ulcer risk",body:`${c.name} — Braden score ${braden.score}/${BRADEN_MAX}`,clientId:c.id,clientName:c.name});
    }
    const ws=calcWoundSummary(c.wound_assessments);
    if(ws){
      if(ws.deteriorating.length>0)notifs.push({id:`wound-${c.id}`,type:"wound",urgency:"high",icon:"🩺",title:"Deteriorating wound",body:`${c.name} — ${ws.deteriorating.map(w=>w.site).join(", ")}`,clientId:c.id,clientName:c.name});
      else if(ws.highStage.length>0)notifs.push({id:`wound-${c.id}`,type:"wound",urgency:"high",icon:"🩺",title:"Stage III/IV pressure ulcer",body:`${c.name} — ${ws.highStage.map(w=>w.site+(w.stage?" ("+w.stage+")":"")).join(", ")}`,clientId:c.id,clientName:c.name});
      else if(ws.activeSites.length>0)notifs.push({id:`wound-${c.id}`,type:"wound",urgency:"low",icon:"🩺",title:`Active wound${ws.activeSites.length!==1?"s":""}`,body:`${c.name} — ${ws.activeSites.length} active site${ws.activeSites.length!==1?"s":""}`,clientId:c.id,clientName:c.name});
    }
    const cog=calcCognitiveSummary(c.cognitive_assessments);
    if(cog){
      if(cog.level.label==="Severe Impairment")notifs.push({id:`cog-${c.id}`,type:"cognitive",urgency:"high",icon:"🧠",title:"Severe cognitive impairment",body:`${c.name} — ${cog.latest.test_type||"MMSE"} score ${cog.score}/30${cog.trend==="declining"?" · declining":""}`,clientId:c.id,clientName:c.name});
      else if(cog.level.label==="Moderate Impairment"||cog.trend==="declining")notifs.push({id:`cog-${c.id}`,type:"cognitive",urgency:"medium",icon:"🧠",title:`${cog.level.label==="Moderate Impairment"?"Moderate cognitive impairment":"Declining cognitive score"}`,body:`${c.name} — ${cog.latest.test_type||"MMSE"} score ${cog.score}/30`,clientId:c.id,clientName:c.name});
      if(cog.dueReassess)notifs.push({id:`cog-due-${c.id}`,type:"cognitive_due",urgency:"low",icon:"🧠",title:"Cognitive reassessment overdue",body:`${c.name} — last screened ${cog.daysSince} days ago`,clientId:c.id,clientName:c.name});
    }
    const cont=calcContinenceSummary(c.continence_logs);
    if(cont){
      if(cont.skinIssue)notifs.push({id:`cont-skin-${c.id}`,type:"continence",urgency:"high",icon:"💧",title:"Continence-related skin breakdown",body:`${c.name} — skin integrity issue recorded in last 7 days`,clientId:c.id,clientName:c.name});
      else if(cont.highFrequency)notifs.push({id:`cont-${c.id}`,type:"continence",urgency:"medium",icon:"💧",title:"High incontinence frequency",body:`${c.name} — avg ${cont.avgPerDay} episodes/day over last 7 days`,clientId:c.id,clientName:c.name});
    }
    const nutr=calcNutritionSummary(c.nutrition_assessments);
    if(nutr){
      if(nutr.score>=2)notifs.push({id:`nutr-${c.id}`,type:"nutrition",urgency:"medium",icon:"🥗",title:"High nutritional risk (MUST)",body:`${c.name} — MUST score ${nutr.score} · ${nutr.risk.action}`,clientId:c.id,clientName:c.name});
      else if(nutr.score===1)notifs.push({id:`nutr-${c.id}`,type:"nutrition",urgency:"low",icon:"🥗",title:"Medium nutritional risk (MUST)",body:`${c.name} — MUST score 1 · ${nutr.risk.action}`,clientId:c.id,clientName:c.name});
    }
    (c.incidents||[]).forEach(inc=>{
      if(!inc.date)return;
      const days=Math.ceil((now-new Date(inc.date))/86400000);
      if(days<=7)notifs.push({id:`inc-${c.id}-${inc.id}`,type:"incident",urgency:inc.severity==="Severe"?"high":inc.severity==="Moderate"?"medium":"low",icon:"⚠️",title:`${inc.type||"Incident"} reported`,body:`${c.name} — ${inc.severity||""} ${days===0?"today":days===1?"yesterday":days+"d ago"}`,clientId:c.id,clientName:c.name});
    });
    const today=now.toISOString().slice(0,10);
    (c.preventive_care||[]).forEach(pc=>{
      if(!pc.due_date||pc.status==="Completed"||pc.status==="Declined"||pc.status==="N/A")return;
      if(pc.due_date<today)notifs.push({id:`pc-${c.id}-${pc.id}`,type:"preventive",urgency:"medium",icon:"🛡",title:"Overdue preventive care",body:`${c.name} — ${pc.label} was due ${new Date(pc.due_date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`,clientId:c.id,clientName:c.name});
    });
  });
  const ord={high:0,medium:1,low:2};
  return notifs.sort((a,b)=>ord[a.urgency]-ord[b.urgency]);
}
function SearchDrop({value,onChange,options,placeholder}){
  const [q,setQ]=useState(value||"");
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  const filtered=options.filter(o=>o.toLowerCase().includes(q.toLowerCase())).slice(0,8);
  useEffect(()=>{setQ(value||"");},[value]);
  useEffect(()=>{
    const fn=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",fn);
    document.addEventListener("touchstart",fn,{passive:true});
    return()=>{document.removeEventListener("mousedown",fn);document.removeEventListener("touchstart",fn);};
  },[]);
  const pick=opt=>{onChange(opt);setQ(opt);setOpen(false);};
  return(
    <div ref={ref} style={{position:"relative"}}>
      <input style={{...INP,paddingRight:28}} placeholder={placeholder} value={q}
        onChange={e=>{setQ(e.target.value);onChange(e.target.value);setOpen(true);}}
        onFocus={()=>setOpen(true)}/>
      <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",color:"var(--color-text-muted)",fontSize:10,pointerEvents:"none"}}>v</span>
      {open&&filtered.length>0&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--color-bg-card)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,zIndex:999,boxShadow:"0 8px 24px rgba(0,0,0,0.4)",maxHeight:220,overflowY:"auto"}}>
          {filtered.map(opt=>(
            <div key={opt} onMouseDown={()=>pick(opt)}
              style={{padding:"9px 12px",cursor:"pointer",fontSize:13,color:"var(--color-text-secondary)",borderBottom:"1px solid var(--color-border)"}}>
              {opt}
            </div>
          ))}
          {q&&!options.includes(q)&&(
            <div onMouseDown={()=>pick(q)} style={{padding:"9px 12px",cursor:"pointer",fontSize:13,color:"#6366f1",fontWeight:600,borderTop:"1px solid var(--color-border)"}}>
              + Use "{q}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Sec({icon,title,accent,children,defaultOpen=true}){
  const [open,setOpen]=useState(defaultOpen);
  return(
    <div style={{background:"var(--color-bg-card)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,marginBottom:16,overflow:"visible"}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"14px 18px",background:"none",border:"none",borderBottom:open?"1px solid rgba(255,255,255,0.1)":"none"}}>
        <span style={{fontSize:18}}>{icon}</span>
        <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)",flex:1,textAlign:"left",letterSpacing:"-0.2px"}}>{title}</span>
        <span style={{color:accent||"#6366f1",fontSize:12}}>{open?"^":"v"}</span>
      </button>
      {open&&<div style={{padding:"16px 18px"}}>{children}</div>}
    </div>
  );
}

// Resolves a client-photos value (storage path OR legacy public URL) to a displayable src.
// New uploads store only the path (e.g. "uuid.jpg"); old rows store the full https:// URL.
function ClientPhoto({path,style,alt="",fallback=null}){
  const [src,setSrc]=useState(()=>path?.startsWith("http")?path:null);
  useEffect(()=>{
    if(!path){setSrc(null);return;}
    if(path.startsWith("http")){setSrc(path);return;} // legacy public URL — use as-is
    let cancelled=false;
    supabase.storage.from("client-photos").createSignedUrl(path,3600)
      .then(({data})=>{if(!cancelled)setSrc(data?.signedUrl||null);});
    return()=>{cancelled=true;};
  },[path]);
  if(!src)return fallback;
  return <img src={src} alt={alt} style={style}/>;
}

function PhotoUp({value,onChange,clientId,t}){
  const [loading,setLoading]=useState(false);
  const ref=useRef(null);
  const handle=async e=>{
    const file=e.target.files[0];if(!file)return;
    setLoading(true);
    const ext=file.name.split(".").pop().toLowerCase();
    const path=clientId+"."+ext;
    const {error}=await supabase.storage.from("client-photos").upload(path,file,{upsert:true,contentType:file.type});
    if(error){alert("Upload failed: "+error.message);setLoading(false);return;}
    // Store only the storage path — display via signed URL (private bucket)
    onChange(path);
    setLoading(false);
  };
  return(
    <div style={{display:"flex",alignItems:"center",gap:20,padding:"16px 18px",borderBottom:"1px solid var(--color-border)"}}>
      <div onClick={()=>ref.current&&ref.current.click()}
        style={{width:80,height:80,borderRadius:"50%",background:value?"transparent":"rgba(255,255,255,0.04)",border:"2px dashed rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",flexShrink:0}}>
        <ClientPhoto path={value} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} fallback={<span style={{fontSize:28}}>+</span>}/>
      </div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={handle}/>
      <div>
        <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)",marginBottom:4}}>{t.photoTitle}</div>
        <button type="button" onClick={()=>ref.current&&ref.current.click()}
          style={{padding:"6px 14px",borderRadius:7,border:"1px solid #6366f1",background:"rgba(99,102,241,0.1)",color:"#6366f1",fontSize:12,fontWeight:600}}>
          {loading?t.uploading:value?t.changePhoto:t.uploadPhoto}
        </button>
      </div>
    </div>
  );
}

function DiagList({items,onChange,t}){
  const upd=(id,v)=>onChange(items.map(i=>i.id===id?{...i,value:v}:i));
  const add=()=>onChange([...items,{id:uid(),value:""}]);
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {items.map(item=>(
        <div key={item.id} style={{display:"flex",gap:8,alignItems:"center"}}>
          <SearchDrop value={item.value} onChange={v=>upd(item.id,v)} options={DIAGNOSES} placeholder={t.searchDiag}/>
          {items.length>1&&<button style={IBTN} aria-label="Remove" onClick={()=>rm(item.id)}>x</button>}
        </div>
      ))}
      <button style={ABTN} onClick={add}>{t.addDiagnosis}</button>
    </div>
  );
}

const TSLOTS=[
  {key:"morning",color:"#f59e0b"},
  {key:"afternoon",color:"#ef4444"},
  {key:"evening",color:"#8b5cf6"},
  {key:"night",color:"#3b82f6"},
];

function MedList({items,onChange,t}){
  const upd=(id,f,v)=>onChange(items.map(i=>i.id===id?{...i,[f]:v}:i));
  const updT=(id,slot,v)=>onChange(items.map(i=>i.id===id?{...i,timing:{...(i.timing||{}),[slot]:v}}:i));
  const add=()=>onChange([...items,{id:uid(),name:"",dosage:"",frequency:"",timing:{morning:false,afternoon:false,evening:false,night:false}}]);
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const labs={morning:t.morning,afternoon:t.afternoon,evening:t.evening,night:t.night};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {items.map(item=>{
        // Check interactions against all OTHER medications
        const others=items.filter(i=>i.id!==item.id);
        const interactions=checkDrugInteractions(item.name,others);
        return(
        <div key={item.id} style={{background:"var(--color-bg-hover)",border:"1px solid "+(interactions.some(i=>i.severity==="high")?"rgba(239,68,68,0.4)":interactions.length>0?"rgba(245,158,11,0.35)":"var(--color-border)"),borderRadius:10,padding:12}}>
          <div style={{marginBottom:8}}>
            <label style={LBL}>{t.medName}</label>
            <SearchDrop value={item.name} onChange={v=>upd(item.id,"name",v)} options={MEDICATIONS} placeholder={t.searchMed}/>
            {interactions.map((ix,i)=>(
              <div key={i} style={{display:"flex",gap:7,alignItems:"flex-start",marginTop:6,padding:"7px 10px",borderRadius:7,background:ix.severity==="high"?"rgba(239,68,68,0.08)":"rgba(245,158,11,0.08)",border:"1px solid "+(ix.severity==="high"?"rgba(239,68,68,0.3)":"rgba(245,158,11,0.3)")}}>
                <span style={{fontSize:14,flexShrink:0}}>{ix.severity==="high"?"⚠️":"⚡"}</span>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:ix.severity==="high"?"#ef4444":"#f59e0b",marginBottom:1}}>Drug Interaction — {ix.severity==="high"?"HIGH RISK":"Moderate"}</div>
                  <div style={{fontSize:11,color:"var(--color-text-secondary)",lineHeight:1.5}}>{ix.msg}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <div><label style={LBL}>{t.dosage}</label><input style={INP} placeholder="e.g. 10mg" value={item.dosage} onChange={e=>upd(item.id,"dosage",e.target.value)}/></div>
            <div><label style={LBL}>{t.frequency}</label><input style={INP} placeholder="e.g. 2x daily" value={item.frequency} onChange={e=>upd(item.id,"frequency",e.target.value)}/></div>
          </div>
          <div>
            <label style={LBL}>{t.whenToGive}</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {TSLOTS.map(slot=>{
                const active=item.timing&&item.timing[slot.key];
                return(
                  <button key={slot.key} type="button" onClick={()=>updT(item.id,slot.key,!active)}
                    style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid "+(active?slot.color:"rgba(255,255,255,0.1)"),background:active?slot.color+"20":"transparent",color:active?slot.color:"var(--color-text-dim)",fontSize:12,fontWeight:600}}>
                    {labs[slot.key]}
                  </button>
                );
              })}
            </div>
          </div>
          {items.length>1&&<button style={{...IBTN,marginTop:8}} aria-label="Remove" onClick={()=>rm(item.id)}>x</button>}
        </div>
        );
      })}
      <button style={ABTN} onClick={add}>{t.addMed}</button>
    </div>
  );
}

function TagList({items,onChange,placeholder,addLabel}){
  const upd=(id,v)=>onChange(items.map(i=>i.id===id?{...i,value:v}:i));
  const add=()=>onChange([...items,{id:uid(),value:""}]);
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {items.map(item=>(
        <div key={item.id} style={{display:"flex",gap:8,alignItems:"center"}}>
          <input style={INP} placeholder={placeholder} value={item.value} onChange={e=>upd(item.id,e.target.value)}/>
          {items.length>1&&<button style={IBTN} aria-label="Remove" onClick={()=>rm(item.id)}>x</button>}
        </div>
      ))}
      <button style={ABTN} onClick={add}>{addLabel}</button>
    </div>
  );
}

function NotesList({items,onChange,t}){
  const upd=(id,f,v)=>onChange(items.map(i=>i.id===id?{...i,[f]:v}:i));
  const add=()=>onChange([...items,{id:uid(),date:tod(),role:"",staff_name:"",text:""}]);
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const roles=[t.nurse,t.doctor,t.physio,t.careAssist,t.other];

  const [fDate,setFDate]=useState("");
  const [fRole,setFRole]=useState("");
  const [fName,setFName]=useState("");

  const uniqueRoles=[...new Set(items.map(i=>i.role).filter(Boolean))];
  const uniqueNames=[...new Set(items.map(i=>i.staff_name).filter(Boolean))];

  const filtered=[...items].reverse().filter(i=>{
    const matchDate=!fDate||i.date===fDate;
    const matchRole=!fRole||i.role===fRole;
    const matchName=!fName||i.staff_name.toLowerCase().includes(fName.toLowerCase());
    return matchDate&&matchRole&&matchName;
  });

  const hasFilter=fDate||fRole||fName;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Filter Bar */}
      <div style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,padding:12}}>
        <div className="notes-filter" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
          <div>
            <label style={LBL}>{t.date}</label>
            <input type="date" style={INP} value={fDate} onChange={e=>setFDate(e.target.value)}/>
          </div>
          <div>
            <label style={LBL}>{t.role}</label>
            <select style={{...INP,cursor:"pointer"}} value={fRole} onChange={e=>setFRole(e.target.value)}>
              <option value="">All roles</option>
              {uniqueRoles.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>{t.staffName}</label>
            <input style={INP} placeholder="Search name..." value={fName} onChange={e=>setFName(e.target.value)}/>
          </div>
          <div style={{paddingBottom:1}}>
            {hasFilter&&(
              <button onClick={()=>{setFDate("");setFRole("");setFName("");}}
                style={{padding:"9px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-dim)",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>
                Clear
              </button>
            )}
          </div>
        </div>
        {hasFilter&&(
          <div style={{marginTop:8,fontSize:12,color:"var(--color-text-dim)"}}>
            {filtered.length} of {items.length} note{items.length!==1?"s":""}
          </div>
        )}
      </div>

      {/* Notes */}
      {filtered.length===0?(
        <div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>
          {hasFilter?"No notes match your filters":t.noNotes}
        </div>
      ):filtered.map(item=>(
        <div key={item.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,padding:12}}>
          <div className="g4" style={{display:"grid",gridTemplateColumns:"160px 1fr 1fr auto",gap:8,alignItems:"center",marginBottom:10}}>
            <div><label style={LBL}>{t.date}</label><input type="date" style={INP} value={item.date} onChange={e=>upd(item.id,"date",e.target.value)}/></div>
            <div><label style={LBL}>{t.role}</label>
              <select style={{...INP,cursor:"pointer"}} value={item.role||""} onChange={e=>upd(item.id,"role",e.target.value)}>
                <option value="">{t.selectRole}</option>
                {roles.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div><label style={LBL}>{t.staffName}</label><input style={INP} placeholder={t.staffName} value={item.staff_name||""} onChange={e=>upd(item.id,"staff_name",e.target.value)}/></div>
            {items.length>1&&<div style={{paddingTop:18}}><button style={IBTN} aria-label="Remove" onClick={()=>rm(item.id)}>x</button></div>}
          </div>
          <textarea style={{...INP,height:80,resize:"vertical"}} placeholder={t.notePlaceholder} value={item.text} onChange={e=>upd(item.id,"text",e.target.value)}/>
        </div>
      ))}
      <button style={ABTN} onClick={add}>{t.addNote}</button>
    </div>
  );
}

function VChart({data,color,unit}){
  if(data.length<2)return null;
  const vals=data.map(v=>parseFloat(v)).filter(v=>!isNaN(v));
  if(vals.length<2)return null;
  const mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
  const W=200,H=48,pd=6;
  const pts=vals.map((v,i)=>{
    const x=pd+(i/(vals.length-1))*(W-pd*2);
    const y=H-pd-((v-mn)/rng)*(H-pd*2);
    return x+","+y;
  }).join(" ");
  return(
    <svg width={W} height={H} style={{display:"block",overflow:"visible"}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {vals.map((v,i)=>{
        const x=pd+(i/(vals.length-1))*(W-pd*2);
        const y=H-pd-((v-mn)/rng)*(H-pd*2);
        return <circle key={i} cx={x} cy={y} r="3" fill={color}/>;
      })}
      <text x={pd} y={H} fontSize="9" fill="var(--color-text-muted)">{vals[0]}{unit}</text>
      <text x={W-pd} y={H} fontSize="9" fill="var(--color-text-muted)" textAnchor="end">{vals[vals.length-1]}{unit}</text>
    </svg>
  );
}

function VitalsTracker({vitals,onChange,t}){
  const [showForm,setShowForm]=useState(false);
  const [entry,setEntry]=useState({id:"",date:tod(),bp_systolic:"",bp_diastolic:"",heart_rate:"",weight:"",temperature:"",blood_sugar:"",oxygen_sat:"",notes:""});
  const [metric,setMetric]=useState("bp_systolic");
  const openForm=()=>{setEntry({id:uid(),date:tod(),bp_systolic:"",bp_diastolic:"",heart_rate:"",weight:"",temperature:"",blood_sugar:"",oxygen_sat:"",notes:""});setShowForm(true);};
  const save=()=>{onChange([...vitals.filter(v=>v.id!==entry.id),entry].sort((a,b)=>b.date.localeCompare(a.date)));setShowForm(false);};
  const rm=id=>onChange(vitals.filter(v=>v.id!==id));
  const sorted=[...vitals].sort((a,b)=>b.date.localeCompare(a.date));
  const chartData=[...vitals].sort((a,b)=>a.date.localeCompare(b.date));
  const metrics=[
    {key:"bp_systolic",label:"BP Sys",unit:"mmHg",color:"#ef4444"},
    {key:"bp_diastolic",label:"BP Dia",unit:"mmHg",color:"#f87171"},
    {key:"heart_rate",label:"HR",unit:"bpm",color:"#ec4899"},
    {key:"weight",label:"Weight",unit:"kg",color:"#10b981"},
    {key:"temperature",label:"Temp",unit:"C",color:"#f59e0b"},
    {key:"blood_sugar",label:"Glucose",unit:"mmol",color:"#8b5cf6"},
    {key:"oxygen_sat",label:"O2",unit:"%",color:"#06b6d4"},
  ];
  const weightTrend=calcWeightTrend(vitals);
  const weightPts=[...vitals].filter(v=>v.weight!==""&&v.weight!=null&&!isNaN(parseFloat(v.weight))).sort((a,b)=>a.date.localeCompare(b.date));

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"var(--color-text-dim)"}}>{vitals.length} entries</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#6366f1"}} onClick={openForm}>{t.logVitals}</button>
      </div>

      {/* ── Weight Trend Alert Banner ── */}
      {weightTrend&&(()=>{
        const isHigh=weightTrend.severity==="high";
        const ac=isHigh?"#ef4444":"#f59e0b";
        const rec=weightTrend.direction==="gain"
          ?"Consider monitoring for fluid retention, oedema, or heart failure exacerbation."
          :"Consider monitoring for dehydration, reduced intake, or acute illness.";
        return(
          <div style={{background:isHigh?"rgba(239,68,68,0.08)":"rgba(245,158,11,0.08)",border:"1px solid "+(isHigh?"rgba(239,68,68,0.35)":"rgba(245,158,11,0.35)"),borderRadius:10,padding:"12px 14px",marginBottom:12}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:22,lineHeight:1,flexShrink:0}}>{weightTrend.direction==="gain"?"⚖️":"📉"}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:ac,marginBottom:3}}>
                  {isHigh?"🔴 Alert":"🟡 Monitor"}: Rapid weight {weightTrend.direction} — {weightTrend.amount} kg in {weightTrend.days} day{weightTrend.days!==1?"s":""}
                </div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:4}}>
                  {weightTrend.fromKg} kg ({new Date(weightTrend.fromDate+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})})
                  {" → "}
                  {weightTrend.toKg} kg ({new Date(weightTrend.toDate+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})})
                </div>
                <div style={{fontSize:11,color:"var(--color-text-dim)",fontStyle:"italic"}}>{rec}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Weight Trend Mini-Chart (shown when ≥2 weight entries exist) ── */}
      {weightPts.length>=2&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,padding:"10px 12px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:11,fontWeight:700,color:"#10b981",letterSpacing:0.4}}>⚖ WEIGHT TREND</span>
            <span style={{fontSize:11,color:"var(--color-text-dim)"}}>{weightPts[0].kg} → {weightPts[weightPts.length-1].kg} kg</span>
          </div>
          <VChart data={weightPts.map(p=>p.kg)} color={weightTrend?.severity==="high"?"#ef4444":weightTrend?.severity==="medium"?"#f59e0b":"#10b981"} unit="kg"/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            <span style={{fontSize:10,color:"var(--color-text-muted)"}}>{new Date(weightPts[0].date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"2-digit"})}</span>
            <span style={{fontSize:10,color:"var(--color-text-muted)"}}>{new Date(weightPts[weightPts.length-1].date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"2-digit"})}</span>
          </div>
        </div>
      )}

      {vitals.length>=2&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,padding:12,marginBottom:12}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {metrics.map(m=>(
              <button key={m.key} onClick={()=>setMetric(m.key)}
                style={{padding:"3px 10px",borderRadius:20,border:"1.5px solid "+(metric===m.key?m.color:"rgba(255,255,255,0.1)"),background:metric===m.key?m.color+"20":"transparent",color:metric===m.key?m.color:"var(--color-text-dim)",fontSize:11,fontWeight:600}}>
                {m.label}
              </button>
            ))}
          </div>
          {(()=>{const m=metrics.find(x=>x.key===metric);const d=chartData.map(v=>v[metric]).filter(v=>v!==""&&v!==undefined);return <VChart data={d} color={m.color} unit={m.unit}/>;})()}
        </div>
      )}
      {showForm&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid #6366f1",borderRadius:10,padding:14,marginBottom:12}}>
          <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>{t.date}</label><input type="date" style={INP} value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
            <div><label style={LBL}>{t.bloodPressure}</label>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input style={INP} placeholder="Sys" value={entry.bp_systolic} onChange={e=>setEntry(v=>({...v,bp_systolic:e.target.value}))}/>
                <span style={{color:"var(--color-text-dim)"}}>/</span>
                <input style={INP} placeholder="Dia" value={entry.bp_diastolic} onChange={e=>setEntry(v=>({...v,bp_diastolic:e.target.value}))}/>
              </div>
            </div>
            <div><label style={LBL}>{t.heartRate}</label><input style={INP} placeholder="72" value={entry.heart_rate} onChange={e=>setEntry(v=>({...v,heart_rate:e.target.value}))}/></div>
            <div><label style={LBL}>{t.weight}</label><input style={INP} placeholder="68.5" value={entry.weight} onChange={e=>setEntry(v=>({...v,weight:e.target.value}))}/></div>
            <div><label style={LBL}>{t.temperature}</label><input style={INP} placeholder="36.8" value={entry.temperature} onChange={e=>setEntry(v=>({...v,temperature:e.target.value}))}/></div>
            <div><label style={LBL}>{t.bloodSugar}</label><input style={INP} placeholder="5.4" value={entry.blood_sugar} onChange={e=>setEntry(v=>({...v,blood_sugar:e.target.value}))}/></div>
            <div><label style={LBL}>{t.oxygenSat}</label><input style={INP} placeholder="98" value={entry.oxygen_sat} onChange={e=>setEntry(v=>({...v,oxygen_sat:e.target.value}))}/></div>
            <div><label style={LBL}>{t.vitalNotes}</label><input style={INP} placeholder="..." value={entry.notes} onChange={e=>setEntry(v=>({...v,notes:e.target.value}))}/></div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{...ABTN,borderStyle:"solid"}} onClick={()=>setShowForm(false)}>{t.cancel}</button>
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"var(--color-accent)",color:"#fff",fontWeight:600}} onClick={save}>{t.save}</button>
          </div>
        </div>
      )}
      {sorted.length===0?<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>{t.noVitals}</div>:(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {sorted.map(v=>(
            <div key={v.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:8,padding:"10px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontWeight:600,fontSize:13,color:"var(--color-text-primary)"}}>{new Date(v.date+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</span>
                <button onClick={()=>rm(v.id)} style={{background:"none",border:"none",color:"var(--color-text-muted)",fontSize:12}}>x</button>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {v.bp_systolic&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(239,68,68,0.1)",color:"#ef4444",fontWeight:600}}>BP {v.bp_systolic}/{v.bp_diastolic} mmHg</span>}
                {v.heart_rate&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(236,72,153,0.1)",color:"#ec4899",fontWeight:600}}>{v.heart_rate} bpm</span>}
                {v.weight&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(16,185,129,0.1)",color:"#10b981",fontWeight:600}}>{v.weight} kg</span>}
                {v.temperature&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(245,158,11,0.1)",color:"#f59e0b",fontWeight:600}}>{v.temperature}C</span>}
                {v.blood_sugar&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(139,92,246,0.1)",color:"#8b5cf6",fontWeight:600}}>{v.blood_sugar} mmol</span>}
                {v.oxygen_sat&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(6,182,212,0.1)",color:"#06b6d4",fontWeight:600}}>{v.oxygen_sat}% O2</span>}
              </div>
              {v.notes&&<div style={{fontSize:12,color:"var(--color-text-dim)",marginTop:6,fontStyle:"italic"}}>{v.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const GSTATUSES=[
  {value:"inProgress",color:"#f59e0b"},
  {value:"achieved",color:"#10b981"},
  {value:"onHold",color:"#8b5cf6"},
  {value:"discontinued",color:"var(--color-text-dim)"},
];

function CarePlan({items,onChange,t}){
  const add=()=>onChange([...items,{id:uid(),goal:"",plan:"",status:"inProgress",created:tod(),reviewed:""}]);
  const upd=(id,f,v)=>onChange(items.map(i=>i.id===id?{...i,[f]:v}:i));
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const slab={inProgress:t.inProgress,achieved:t.achieved,onHold:t.onHold,discontinued:t.discontinued};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {items.length===0&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"16px 0"}}>{t.noGoals}</div>}
      {items.map(item=>{
        const gs=GSTATUSES.find(s=>s.value===item.status)||GSTATUSES[0];
        return(
          <div key={item.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,padding:12,borderLeft:"3px solid "+gs.color}}>
            <div style={{marginBottom:8}}><label style={LBL}>{t.goalLabel}</label><input style={INP} placeholder={t.goalLabel+"..."} value={item.goal} onChange={e=>upd(item.id,"goal",e.target.value)}/></div>
            <div style={{marginBottom:8}}><label style={LBL}>{t.planLabel}</label><textarea style={{...INP,height:64,resize:"vertical"}} placeholder={t.planLabel+"..."} value={item.plan} onChange={e=>upd(item.id,"plan",e.target.value)}/></div>
            <div className="g4" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
              <div><label style={LBL}>{t.goalStatus}</label>
                <select style={{...INP,color:gs.color,borderColor:gs.color,cursor:"pointer"}} value={item.status} onChange={e=>upd(item.id,"status",e.target.value)}>
                  {GSTATUSES.map(s=><option key={s.value} value={s.value}>{slab[s.value]}</option>)}
                </select>
              </div>
              <div><label style={LBL}>{t.created}</label><input type="date" style={INP} value={item.created} onChange={e=>upd(item.id,"created",e.target.value)}/></div>
              <div><label style={LBL}>{t.reviewed}</label><input type="date" style={INP} value={item.reviewed||""} onChange={e=>upd(item.id,"reviewed",e.target.value)}/></div>
              <div style={{paddingBottom:1}}><button style={IBTN} aria-label="Remove" onClick={()=>rm(item.id)}>x</button></div>
            </div>
          </div>
        );
      })}
      <button style={ABTN} onClick={add}>{t.addGoal}</button>
    </div>
  );
}

function DocTracker({items,onChange,t}){
  const add=()=>onChange([...items,{id:uid(),name:"",expiry:"",notes:""}]);
  const upd=(id,f,v)=>onChange(items.map(i=>i.id===id?{...i,[f]:v}:i));
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {items.length===0&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"16px 0"}}>{t.noDocs}</div>}
      {items.map(item=>{
        const days=daysUntil(item.expiry);
        const badge=expiryBadge(days);
        return(
          <div key={item.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,padding:12,display:"flex",gap:10,alignItems:"center",borderLeft:badge?"3px solid "+badge.color:"3px solid rgba(255,255,255,0.1)"}}>
            <div className="fg three-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,flex:1}}>
              <div><label style={LBL}>{t.docName}</label><input style={INP} placeholder="e.g. AZV Card..." value={item.name} onChange={e=>upd(item.id,"name",e.target.value)}/></div>
              <div><label style={LBL}>{t.expiry}</label><input type="date" style={INP} value={item.expiry||""} onChange={e=>upd(item.id,"expiry",e.target.value)}/></div>
              <div><label style={LBL}>{t.docNotes}</label><input style={INP} placeholder="..." value={item.notes||""} onChange={e=>upd(item.id,"notes",e.target.value)}/></div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center",flexShrink:0}}>
              {badge&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:badge.bg,color:badge.color,whiteSpace:"nowrap"}}>{badge.label}{days!==null&&" "+(days<0?Math.abs(days)+"d ago":days+"d")}</span>}
              <button style={IBTN} aria-label="Remove" onClick={()=>rm(item.id)}>x</button>
            </div>
          </div>
        );
      })}
      <button style={ABTN} onClick={add}>{t.addDoc}</button>
    </div>
  );
}

function InvItem({item,onUpd,onDel,t}){
  const [uploading,setUploading]=useState(false);
  const ref=useRef(null);
  const cc={Excellent:"#10b981",Good:"#06b6d4",Fair:"#f59e0b",Poor:"#ef4444"};
  const cl={Excellent:t.excellent,Good:t.good,Fair:t.fair,Poor:t.poor};
  const color=cc[item.condition]||"rgba(240,242,250,0.3)";
  const handlePhoto=async e=>{
    const file=e.target.files[0];if(!file)return;
    setUploading(true);
    const ext=file.name.split(".").pop();
    const path=item.id+"."+ext;
    const {error}=await supabase.storage.from("item-photos").upload(path,file,{upsert:true});
    if(error){alert("Upload failed: "+error.message);setUploading(false);return;}
    const {data}=supabase.storage.from("item-photos").getPublicUrl(path);
    onUpd("photo_url",data.publicUrl+"?t="+Date.now());
    setUploading(false);
  };
  return(
    <div style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:10,overflow:"hidden"}}>
      <div onClick={()=>ref.current&&ref.current.click()}
        style={{width:"100%",height:120,background:item.photo_url?"transparent":"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",borderBottom:"1px solid var(--color-border)",position:"relative"}}>
        {item.photo_url?<img src={item.photo_url} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{textAlign:"center",color:"var(--color-text-muted)"}}><div style={{fontSize:28}}>+</div><div style={{fontSize:11,marginTop:4}}>Add photo</div></div>}
        {uploading&&<div style={{position:"absolute",inset:0,background:"rgba(15,23,42,0.8)",display:"flex",alignItems:"center",justifyContent:"center",color:"#6366f1",fontSize:12}}>Uploading...</div>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
      <div style={{padding:10}}>
        <input style={{...INP,fontWeight:700,marginBottom:6}} placeholder={t.itemName+"..."} value={item.name} onChange={e=>onUpd("name",e.target.value)}/>
        <input style={{...INP,fontSize:12,marginBottom:8}} placeholder={t.description+"..."} value={item.description||""} onChange={e=>onUpd("description",e.target.value)}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
          <div>
            <label style={{...LBL,fontSize:9}}>{t.condition}</label>
            <select style={{...INP,fontSize:12,color:color,borderColor:color,cursor:"pointer"}} value={item.condition||""} onChange={e=>onUpd("condition",e.target.value)}>
              <option value="">Select...</option>
              {Object.entries(cl).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{...LBL,fontSize:9}}>{t.value}</label>
            <input style={{...INP,fontSize:12}} placeholder="0.00" value={item.value||""} onChange={e=>onUpd("value",e.target.value)}/>
          </div>
        </div>
        <div style={{marginBottom:8}}>
          <label style={{...LBL,fontSize:9}}>{t.location}</label>
          <input style={{...INP,fontSize:12}} placeholder="Room 3, wardrobe..." value={item.location||""} onChange={e=>onUpd("location",e.target.value)}/>
        </div>
        <button onClick={onDel} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,padding:"3px 10px",color:"var(--color-text-dim)",fontSize:11}}>Remove</button>
      </div>
    </div>
  );
}

function Inventory({items,onChange,t}){
  const add=()=>onChange([...items,{id:uid(),name:"",description:"",condition:"Good",value:"",location:"",photo_url:"",date_logged:tod()}]);
  const upd=(id,f,v)=>onChange(items.map(i=>i.id===id?{...i,[f]:v}:i));
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const total=items.reduce((s,i)=>s+(parseFloat(i.value)||0),0);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"var(--color-text-dim)"}}>{items.length} items{total>0?" - AWG "+total.toFixed(2):""}</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#6366f1"}} onClick={add}>{t.addItem}</button>
      </div>
      {items.length===0&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"24px 0"}}>{t.noItems}</div>}
      <div className="inv-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {items.map(item=><InvItem key={item.id} item={item} onUpd={(f,v)=>upd(item.id,f,v)} onDel={()=>rm(item.id)} t={t}/>)}
      </div>
    </div>
  );
}

// ─── Family Contacts ─────────────────────────────────────────────────────────
const RELATIONSHIPS=["Spouse","Parent","Child","Sibling","Grandchild","Grandparent","Friend","Guardian","Legal Representative","Other"];
function FamilyContacts({items,onChange}){
  const [expanded,setExpanded]=useState(null);
  const add=()=>{const n={id:uid(),name:"",relationship:"",phone:"",email:"",is_primary:items.length===0,notes:""};onChange([...items,n]);setExpanded(n.id);};
  const rm=id=>{onChange(items.filter(i=>i.id!==id));if(expanded===id)setExpanded(null);};
  const upd=(id,f,v)=>onChange(items.map(i=>i.id===id?{...i,[f]:v}:i));
  const setPrimary=id=>onChange(items.map(i=>({...i,is_primary:i.id===id})));
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {items.length===0&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"16px 0"}}>No family contacts added yet</div>}
      {items.map(item=>(
        <div key={item.id} style={{background:"var(--color-bg-hover)",border:"1px solid "+(item.is_primary?"rgba(99,102,241,0.4)":"rgba(255,255,255,0.1)"),borderRadius:10,overflow:"hidden"}}>
          <div onClick={()=>setExpanded(expanded===item.id?null:item.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(item.name||"?"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(item.name||"?")}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,color:"var(--color-text-primary)"}}>{item.name||"New Contact"}</div>
              <div style={{fontSize:11,color:"var(--color-text-dim)"}}>{item.relationship}{item.phone?" · "+item.phone:""}</div>
            </div>
            {item.is_primary&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(99,102,241,0.15)",color:"#a5b4fc"}}>Primary</span>}
            <span style={{color:"var(--color-text-muted)",fontSize:12}}>{expanded===item.id?"^":"v"}</span>
          </div>
          {expanded===item.id&&(
            <div style={{padding:"12px 14px",borderTop:"1px solid var(--color-border)",display:"flex",flexDirection:"column",gap:10}}>
              <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><label style={LBL}>Full Name</label><input style={INP} value={item.name} onChange={e=>upd(item.id,"name",e.target.value)} placeholder="Full name..."/></div>
                <div><label style={LBL}>Relationship</label>
                  <select style={{...INP,cursor:"pointer"}} value={item.relationship} onChange={e=>upd(item.id,"relationship",e.target.value)}>
                    <option value="">Select...</option>
                    {RELATIONSHIPS.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><label style={LBL}>Phone</label><input style={INP} type="tel" value={item.phone} onChange={e=>upd(item.id,"phone",e.target.value)} placeholder="+297-..."/></div>
                <div><label style={LBL}>Email</label><input style={INP} type="email" value={item.email} onChange={e=>upd(item.id,"email",e.target.value)} placeholder="..."/></div>
              </div>
              <div><label style={LBL}>Notes</label><input style={INP} value={item.notes} onChange={e=>upd(item.id,"notes",e.target.value)} placeholder="e.g. Available evenings only..."/></div>
              <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
                {!item.is_primary?<button onClick={()=>setPrimary(item.id)} style={{background:"none",border:"1px solid #6366f1",borderRadius:6,padding:"4px 12px",color:"#6366f1",fontSize:11,fontWeight:700}}>★ Set as Primary</button>:<span style={{fontSize:11,color:"#6366f1",fontWeight:700}}>★ Primary Contact</span>}
                <button onClick={()=>rm(item.id)} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,padding:"4px 12px",color:"#ef4444",fontSize:11,fontWeight:600}}>Remove</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button style={ABTN} onClick={add}>+ Add Contact</button>
    </div>
  );
}

// ─── Appointment Log ──────────────────────────────────────────────────────────
const APPT_TYPES=["Doctor Visit","Specialist","Lab / Imaging","Physiotherapy","Dentist","Transport Only","Other"];
const APPT_STATUSES=["Scheduled","Completed","Cancelled","No-Show"];
const APPT_STATUS_COLORS={Scheduled:"#6366f1",Completed:"#10b981",Cancelled:"rgba(240,242,250,0.3)","No-Show":"#f59e0b"};
const TRANSPORT_TYPES=["Family","Facility Transport","Taxi","Ambulance","None"];
function AppointmentLog({items,onChange}){
  const [showForm,setShowForm]=useState(false);
  const [entry,setEntry]=useState(null);
  const blank=()=>({id:uid(),date:tod(),time:"",type:"Doctor Visit",provider:"",location:"",transport_needed:false,transport_type:"None",notes:"",status:"Scheduled"});
  const openNew=()=>{setEntry(blank());setShowForm(true);};
  const openEdit=item=>{setEntry({...item});setShowForm(true);};
  const save=()=>{onChange([...items.filter(i=>i.id!==entry.id),entry].sort((a,b)=>b.date.localeCompare(a.date)));setShowForm(false);setEntry(null);};
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const sorted=[...items].sort((a,b)=>b.date.localeCompare(a.date));
  const ma=getMissedAppointments(items);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"var(--color-text-dim)"}}>{items.length} appointment{items.length!==1?"s":""}</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#6366f1"}} onClick={openNew}>+ Log Appointment</button>
      </div>
      {/* ── Missed appointment alert banner ── */}
      {(ma.pattern||ma.overdue.length>0||ma.noShows.length>0)&&(
        <div style={{background:ma.pattern?"rgba(239,68,68,0.08)":"rgba(245,158,11,0.07)",border:"1px solid "+(ma.pattern?"rgba(239,68,68,0.35)":"rgba(245,158,11,0.35)"),borderRadius:10,padding:"10px 14px",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:ma.pattern||ma.overdue.length>0?6:0}}>
            <span style={{fontSize:15}}>{ma.pattern?"🚨":"⚠️"}</span>
            <span style={{fontWeight:700,fontSize:13,color:ma.pattern?"#f87171":"#fbbf24"}}>
              {ma.pattern?"Repeated missed appointment pattern detected":"Appointment follow-up required"}
            </span>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {ma.noShows.length>0&&<span style={{fontSize:12,color:"#f87171",fontWeight:600}}>No-Shows: {ma.noShows.length}</span>}
            {ma.overdue.length>0&&<span style={{fontSize:12,color:"#fbbf24",fontWeight:600}}>Overdue (still Scheduled): {ma.overdue.length}</span>}
            {ma.pattern&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{ma.recentMissed.length} missed / overdue in last 30 days — update status or reschedule</span>}
          </div>
        </div>
      )}
      {showForm&&entry&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid #6366f1",borderRadius:10,padding:14,marginBottom:12}}>
          <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Date</label><input type="date" style={INP} value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
            <div><label style={LBL}>Time</label><input type="time" style={INP} value={entry.time} onChange={e=>setEntry(v=>({...v,time:e.target.value}))}/></div>
            <div><label style={LBL}>Type</label>
              <select style={{...INP,cursor:"pointer"}} value={entry.type} onChange={e=>setEntry(v=>({...v,type:e.target.value}))}>
                {APPT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Status</label>
              <select style={{...INP,cursor:"pointer",color:APPT_STATUS_COLORS[entry.status],borderColor:APPT_STATUS_COLORS[entry.status]}} value={entry.status} onChange={e=>setEntry(v=>({...v,status:e.target.value}))}>
                {APPT_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Provider / Doctor</label><input style={INP} value={entry.provider} onChange={e=>setEntry(v=>({...v,provider:e.target.value}))} placeholder="Dr. Smith..."/></div>
            <div><label style={LBL}>Location / Clinic</label><input style={INP} value={entry.location} onChange={e=>setEntry(v=>({...v,location:e.target.value}))} placeholder="e.g. CMC..."/></div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--color-text-primary)",fontWeight:600,cursor:"pointer",marginBottom:6}}>
              <input type="checkbox" checked={entry.transport_needed} onChange={e=>setEntry(v=>({...v,transport_needed:e.target.checked}))} style={{accentColor:"#6366f1",width:15,height:15}}/>
              Transport needed
            </label>
            {entry.transport_needed&&<select style={{...INP,cursor:"pointer"}} value={entry.transport_type} onChange={e=>setEntry(v=>({...v,transport_type:e.target.value}))}>
              {TRANSPORT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>}
          </div>
          <div style={{marginBottom:10}}><label style={LBL}>Notes</label><textarea style={{...INP,height:56,resize:"vertical"}} value={entry.notes} onChange={e=>setEntry(v=>({...v,notes:e.target.value}))} placeholder="Additional notes..."/></div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{...ABTN,borderStyle:"solid"}} onClick={()=>{setShowForm(false);setEntry(null);}}>Cancel</button>
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"var(--color-accent)",color:"#fff",fontWeight:600}} onClick={save}>Save</button>
          </div>
        </div>
      )}
      {sorted.length===0&&!showForm&&<div style={{color:"var(--color-text-muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No appointments logged yet</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map(item=>{
          const sc=APPT_STATUS_COLORS[item.status]||"rgba(240,242,250,0.3)";
          return(
            <div key={item.id} style={{background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:9,padding:"10px 14px",borderLeft:"3px solid "+sc}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{new Date(item.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}{item.time&&" at "+item.time}</span>
                  <span style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,background:sc+"20",color:sc}}>{item.status}</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>openEdit(item)} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"2px 8px",color:"#6366f1",fontSize:11}}>Edit</button>
                  <button onClick={()=>rm(item.id)} style={{background:"none",border:"none",color:"var(--color-text-muted)",fontSize:12}}>x</button>
                </div>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:"var(--color-text-dim)"}}>📋 {item.type}</span>
                {item.provider&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>👨‍⚕️ {item.provider}</span>}
                {item.location&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>📍 {item.location}</span>}
                {item.transport_needed&&<span style={{fontSize:11,fontWeight:600,color:"#f59e0b"}}>🚗 {item.transport_type}</span>}
              </div>
              {item.notes&&<div style={{fontSize:12,color:"var(--color-text-muted)",marginTop:4,fontStyle:"italic"}}>{item.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function HospLog({items,onChange}){
  const empty=()=>({id:uid(),date_admitted:"",date_discharged:"",reason:"",hospital:"",notes:""});
  const [form,setForm]=useState(null);
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const save=()=>{if(!form.date_admitted)return;onChange([...items.filter(i=>i.id!==form.id),form].sort((a,b)=>b.date_admitted.localeCompare(a.date_admitted)));setForm(null);};
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const sorted=[...items].sort((a,b)=>b.date_admitted.localeCompare(a.date_admitted));
  const fmtD=d=>d?new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"present";
  const nights=h=>{if(!h.date_discharged)return null;const ms=new Date(h.date_discharged+"T00:00:00")-new Date(h.date_admitted+"T00:00:00");return Math.max(0,Math.round(ms/86400000));};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {form&&(
        <div style={{background:"var(--color-bg-hover)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:10,padding:14,display:"flex",flexDirection:"column",gap:10}}>
          <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={LBL}>Date Admitted *</label><input type="date" style={INP} value={form.date_admitted} onChange={e=>f("date_admitted",e.target.value)}/></div>
            <div><label style={LBL}>Date Discharged</label><input type="date" style={INP} value={form.date_discharged} onChange={e=>f("date_discharged",e.target.value)}/></div>
          </div>
          <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={LBL}>Reason / Diagnosis</label><input style={INP} placeholder="e.g. CHF exacerbation" value={form.reason} onChange={e=>f("reason",e.target.value)}/></div>
            <div><label style={LBL}>Hospital</label><input style={INP} placeholder="Hospital name" value={form.hospital} onChange={e=>f("hospital",e.target.value)}/></div>
          </div>
          <div><label style={LBL}>Notes</label><input style={INP} placeholder="Any relevant notes" value={form.notes} onChange={e=>f("notes",e.target.value)}/></div>
          <div style={{display:"flex",gap:8}}>
            <button style={{...ABTN,flex:1}} onClick={save}>Save</button>
            <button style={{...IBTN,padding:"6px 16px"}} onClick={()=>setForm(null)}>Cancel</button>
          </div>
        </div>
      )}
      {sorted.map((h,i)=>{
        const prev=sorted[i+1];
        const isReadmit=prev&&prev.date_discharged&&(()=>{const gap=(new Date(h.date_admitted+"T00:00:00")-new Date(prev.date_discharged+"T00:00:00"))/86400000;return gap>=0&&gap<=30;})();
        const n=nights(h);
        return(
          <div key={h.id} style={{background:"var(--color-bg-hover)",border:"1px solid "+(isReadmit?"rgba(239,68,68,0.35)":"var(--color-border)"),borderRadius:9,padding:"10px 14px",borderLeft:"3px solid "+(h.date_discharged?"#10b981":"#f59e0b")}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{fmtD(h.date_admitted)} → {fmtD(h.date_discharged)}</span>
                {n!==null&&<span style={{fontSize:11,color:"var(--color-text-muted)"}}>{n} night{n!==1?"s":""}</span>}
                {!h.date_discharged&&<span style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,background:"rgba(245,158,11,0.15)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.3)"}}>Current</span>}
                {isReadmit&&<span style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,background:"rgba(239,68,68,0.12)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.3)"}}>⚠ Readmission</span>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setForm({...h})} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"2px 8px",color:"#6366f1",fontSize:11}}>Edit</button>
                <button onClick={()=>rm(h.id)} style={IBTN} aria-label="Remove">x</button>
              </div>
            </div>
            {(h.reason||h.hospital)&&<div style={{display:"flex",gap:12,marginTop:4,flexWrap:"wrap"}}>
              {h.reason&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>🏥 {h.reason}</span>}
              {h.hospital&&<span style={{fontSize:12,color:"var(--color-text-dim)"}}>📍 {h.hospital}</span>}
            </div>}
            {h.notes&&<div style={{fontSize:12,color:"var(--color-text-muted)",marginTop:4,fontStyle:"italic"}}>{h.notes}</div>}
          </div>
        );
      })}
      {!form&&<button style={ABTN} onClick={()=>setForm(empty())}>+ Log Admission</button>}
    </div>
  );
}

function ClientForm({client,onSave,onCancel,saving,t,currentUser,cfSchema,logAudit}){
  const [d,setD]=useState(()=>JSON.parse(JSON.stringify(client)));
  const s=(f,v)=>setD(prev=>({...prev,[f]:v}));
  const valid=(d.name||"").trim().length>0;
  const scols={Active:"#10b981",Inactive:"#f59e0b",Discharged:"#8b5cf6"};
  return(
    <div style={{paddingBottom:40}}>
      <div style={{background:"var(--color-bg-card)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,marginBottom:16,overflow:"hidden"}}>
        <PhotoUp value={d.photo_url} onChange={v=>s("photo_url",v)} clientId={d.id} t={t}/>
        <Sec icon="👤" title={t.personalInfo} defaultOpen={true}>
          <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[[t.fullName+" *","name","text"],[t.dob,"date_of_birth","date"],[t.phone,"phone","tel"],[t.address,"room_or_address","text"],[t.azv,"azv_number","text"],[t.emergency,"emergency_contact","text"],[t.emergPhone,"emergency_phone","tel"],[t.drCas,"dr_di_cas","text"]].map(([label,field,type])=>(
              <div key={field}><label style={LBL}>{label}</label><input type={type} style={INP} value={d[field]||""} onChange={e=>s(field,e.target.value)}/></div>
            ))}
            <div><label style={LBL}>{t.drSpec}</label><input style={INP} value={d.dr_specialista||""} onChange={e=>s("dr_specialista",e.target.value)}/></div>
            <div><label style={LBL}>{t.status}</label>
              <select style={{...INP,cursor:"pointer",color:scols[d.status]||"#e2e8f0",borderColor:scols[d.status]||"rgba(255,255,255,0.1)"}} value={d.status||"Active"} onChange={e=>s("status",e.target.value)}>
                <option value="Active">{t.active}</option>
                <option value="Inactive">{t.inactive}</option>
                <option value="Discharged">{t.discharged}</option>
              </select>
            </div>
            <div><label style={LBL}>Isolation Precautions</label>
              <select style={{...INP,cursor:"pointer",color:{None:"var(--color-text-primary)",Contact:"#f59e0b",Droplet:"#06b6d4",Airborne:"#ef4444"}[d.isolation_type||"None"]}} value={d.isolation_type||"None"} onChange={e=>s("isolation_type",e.target.value)}>
                <option value="None">None</option>
                <option value="Contact">Contact</option>
                <option value="Droplet">Droplet</option>
                <option value="Airborne">Airborne</option>
              </select>
            </div>
          </div>
        </Sec>
      </div>
      <Sec icon="🩺" title={t.diagnoses} accent="#06b6d4"><DiagList items={d.diagnoses||[]} onChange={v=>s("diagnoses",v)} t={t}/></Sec>
      <Sec icon="💊" title={t.medications} accent="#ef4444"><MedList items={d.medications||[]} onChange={v=>s("medications",v)} t={t}/></Sec>
      <Sec icon="⚠️" title={t.allergies} accent="#f59e0b"><TagList items={d.allergies||[]} onChange={v=>s("allergies",v)} placeholder="e.g. Penicillin..." addLabel={t.add}/></Sec>
      <Sec icon="📦" title={t.inventory} accent="#10b981" defaultOpen={false}><Inventory items={d.inventory||[]} onChange={v=>s("inventory",v)} t={t}/></Sec>
      <Sec icon="📄" title={t.documents} accent="#06b6d4" defaultOpen={false}><DocTracker items={d.documents||[]} onChange={v=>s("documents",v)} t={t}/></Sec>
      <Sec icon="📋" title={t.carePlan} accent="#8b5cf6" defaultOpen={false}><CarePlan items={d.care_plan||[]} onChange={v=>s("care_plan",v)} t={t}/></Sec>
      <Sec icon="📊" title={t.vitals} accent="#6366f1" defaultOpen={false}><VitalsTracker vitals={d.vitals||[]} onChange={v=>s("vitals",v)} t={t}/></Sec>
      <Sec icon="📝" title={t.notes} accent="#7c3aed"><NotesList items={d.session_notes||[]} onChange={v=>s("session_notes",v)} t={t}/></Sec>
      <Sec icon="👨‍👩‍👧" title="Family Contacts" accent="#ec4899" defaultOpen={false}><FamilyContacts items={d.family_contacts||[]} onChange={v=>s("family_contacts",v)}/></Sec>
      <Sec icon="📅" title="Appointments & Transport" accent="#06b6d4" defaultOpen={false}><AppointmentLog items={d.appointments||[]} onChange={v=>s("appointments",v)}/></Sec>
      <Sec icon="⚠️" title="Incident Reports" accent="#ef4444" defaultOpen={false}><IncidentReports items={d.incidents||[]} onChange={v=>s("incidents",v)} currentUser={currentUser}/></Sec>
      <Sec icon="✅" title="Intake Checklist" accent="#10b981" defaultOpen={false}><IntakeChecklist items={d.intake_checklist||[]} onChange={v=>s("intake_checklist",v)} currentUser={currentUser}/></Sec>
      <Sec icon="💊" title="MAR — Daily Medication Log" accent="#16a34a" defaultOpen={true}><MARTracker marLog={d.mar_log||[]} medications={d.medications||[]} onChange={v=>s("mar_log",v)} currentUser={currentUser}/></Sec>
      <Sec icon="⚡" title="PRN — As-Needed Medication Log" accent="#f59e0b" defaultOpen={false}><PRNLog prnLog={d.prn_log||[]} medications={d.medications||[]} onChange={v=>s("prn_log",v)} currentUser={currentUser}/></Sec>
      <Sec icon="🏥" title="Hospitalisation Log" accent="#ef4444" defaultOpen={false}><HospLog items={d.hospitalizations||[]} onChange={v=>s("hospitalizations",v)}/></Sec>
      <Sec icon="🛡" title="Preventive Care — Vaccines & Screenings" accent="#10b981" defaultOpen={false}><PreventiveCare items={d.preventive_care||[]} onChange={v=>s("preventive_care",v)}/></Sec>
      <Sec icon="🧍" title="ADL Tracking" accent="#06b6d4" defaultOpen={false}><ADLTracker items={d.adl_logs||[]} onChange={v=>s("adl_logs",v)}/></Sec>
      <Sec icon="🩹" title="Pain Assessment" accent="#f59e0b" defaultOpen={false}><PainAssessment items={d.pain_assessments||[]} onChange={v=>s("pain_assessments",v)}/></Sec>
      <Sec icon="🩺" title="Wound & Skin Assessment" accent="#06b6d4" defaultOpen={false}><WoundAssessment items={d.wound_assessments||[]} onChange={v=>s("wound_assessments",v)}/></Sec>
      <Sec icon="🛏" title="Braden Scale (Pressure Ulcer Risk)" accent="#8b5cf6" defaultOpen={false}><BradenScale items={d.braden_assessments||[]} onChange={v=>s("braden_assessments",v)}/></Sec>
      <Sec icon="🧠" title="Cognitive Screening (MMSE / MoCA)" accent="#a78bfa" defaultOpen={false}><CognitiveScreening items={d.cognitive_assessments||[]} onChange={v=>s("cognitive_assessments",v)}/></Sec>
      <Sec icon="💧" title="Continence Monitoring" accent="#06b6d4" defaultOpen={false}><ContinenceLog items={d.continence_logs||[]} onChange={v=>s("continence_logs",v)}/></Sec>
      <Sec icon="🥗" title="Nutritional Risk Screening (MUST)" accent="#10b981" defaultOpen={false}><NutritionScreening items={d.nutrition_assessments||[]} onChange={v=>s("nutrition_assessments",v)}/></Sec>
      {(()=>{const cfs=cfSchema?JSON.parse(cfSchema||"[]"):[];return cfs.length>0&&(<Sec icon="🧩" title="Additional Information" accent="#6366f1" defaultOpen={true}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{cfs.map(f=>{const val=d.custom_fields?.[f.id]??"";const setVal=v=>s("custom_fields",{...(d.custom_fields||{}),[f.id]:v});return(<div key={f.id} style={f.type==="textarea"?{gridColumn:"1/-1"}:{}}><label style={{...LBL,marginBottom:4}}>{f.label}{f.required&&<span style={{color:"#f87171",marginLeft:3}}>*</span>}</label>{f.type==="textarea"?<textarea value={val} onChange={e=>setVal(e.target.value)} rows={3} style={{...INP,marginBottom:0,resize:"vertical"}}/>:f.type==="select"?<select value={val} onChange={e=>setVal(e.target.value)} style={{...INP,marginBottom:0,padding:"7px 10px"}}><option value="">— Select —</option>{(f.options||"").split(",").map(o=>o.trim()).filter(Boolean).map(o=><option key={o} value={o}>{o}</option>)}</select>:f.type==="checkbox"?<label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"var(--color-text-secondary)"}}><input type="checkbox" checked={!!val} onChange={e=>setVal(e.target.checked)} style={{accentColor:"#6366f1",width:16,height:16}}/>{f.label}</label>:<input type={f.type} value={val} onChange={e=>setVal(e.target.value)} style={{...INP,marginBottom:0}}/> }</div>);})}</div></Sec>);})()}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:8}}>
        <button onClick={onCancel} style={{padding:"10px 20px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-secondary)",fontWeight:600}}>{t.cancel}</button>
        <button onClick={()=>valid&&!saving&&onSave(d)} disabled={!valid||saving}
          style={{padding:"10px 24px",borderRadius:8,border:"none",background:valid&&!saving?"#6366f1":"rgba(255,255,255,0.1)",color:valid&&!saving?"#fff":"rgba(240,242,250,0.3)",fontWeight:700,fontSize:15}}>
          {saving?t.saving:t.save}
        </button>
      </div>
    </div>
  );
}

function EmergCard({client,onClose,t}){
  const fa=(client.allergies||[]).filter(a=>a.value&&a.value.trim());
  const fm=(client.medications||[]).filter(m=>m.name&&m.name.trim());
  const fd=(client.diagnoses||[]).filter(d=>d.value&&d.value.trim());
  const {highRisk}=getMedFlags(client);
  const age=calcAge(client.date_of_birth);
  const printCard=()=>{
    const aHTML=fa.length>0?fa.map(a=>"<span style='background:rgba(239,68,68,0.1);color:#ef4444;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;margin:2px;display:inline-block'>"+a.value+"</span>").join(""):"<span style='color:#64748b'>"+t.knownAllergies+"</span>";
    const hrHTML=highRisk.map(m=>"<span style='background:rgba(245,158,11,0.1);color:#f59e0b;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;margin:2px;display:inline-block'>"+m.name+(m.dosage?" - "+m.dosage:"")+"</span>").join("");
    const mHTML=fm.map(m=>"<div style='display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;font-size:12px'><strong>"+m.name+"</strong><span>"+(m.dosage||"")+" "+(m.frequency||"")+"</span></div>").join("");
    const dHTML=fd.map(d=>"<span style='background:rgba(99,102,241,0.1);color:#6366f1;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;margin:2px;display:inline-block'>"+d.value+"</span>").join("");
    const sec=(title,color,content)=>"<div style='border:2px solid "+color+"40;border-radius:10px;padding:12px 14px;margin-bottom:12px'><div style='font-size:11px;font-weight:800;color:"+color+";letter-spacing:.5px;margin-bottom:8px'>"+title+"</div>"+content+"</div>";
    const h="<!DOCTYPE html><html><head><title>Emergency Card - "+client.name+"</title>"
      +"<style>body{font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto}</style>"
      +"</head><body>"
      +"<div style='background:#ef4444;color:#fff;border-radius:12px;padding:16px 20px;margin-bottom:16px'>"
      +"<h1 style='font-size:22px;font-weight:800;margin:0'>"+client.name+"</h1>"
      +"<div style='font-size:13px;opacity:.9;margin-top:4px'>"+(client.date_of_birth?client.date_of_birth+(age?" - Age "+age:""):"")+((client.room_or_address?" - "+client.room_or_address:""))+"</div>"
      +(client.azv_number?"<div style='font-size:12px;opacity:.8;margin-top:2px'>AZV: "+client.azv_number+"</div>":"")
      +"</div>"
      +sec("ALLERGIES","#ef4444",aHTML)
      +(highRisk.length>0?sec("HIGH-RISK MEDICATIONS","#f59e0b",hrHTML):"")
      +"<div style='display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px'>"
      +sec("EMERGENCY CONTACT","#8b5cf6",client.emergency_contact?"<strong>"+client.emergency_contact+"</strong>"+(client.emergency_phone?"<br>"+client.emergency_phone:""):t.notProvided)
      +sec("DOCTORS","#06b6d4",(client.dr_di_cas?"<div><strong>GP:</strong> "+client.dr_di_cas+"</div>":"")+(client.dr_specialista?"<div><strong>Spec:</strong> "+client.dr_specialista+"</div>":"")||t.notProvided)
      +"</div>"
      +(fm.length>0?sec("ALL MEDICATIONS","#10b981",mHTML):"")
      +(fd.length>0?sec("DIAGNOSES","#6366f1",dHTML):"")
      +"<div style='text-align:center;font-size:10px;color:#999;margin-top:16px;border-top:1px solid #eee;padding-top:10px'>GoldenCare System - Printed "+new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})+"</div>"
      +"</body></html>";
    const blob=new Blob([h],{type:"text/html"});
    const url=URL.createObjectURL(blob);
    const w=window.open(url,"_blank");
    if(w){w.onload=()=>{setTimeout(()=>w.print(),400);};}
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:16}}>
      <div style={{background:"var(--color-bg-card)",borderRadius:16,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",border:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid var(--color-border)"}}>
          <span style={{fontWeight:700,color:"#ef4444",fontSize:16}}>Emergency Card</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={printCard} style={{padding:"7px 14px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontWeight:700,fontSize:12}}>Print</button>
            <button onClick={onClose} style={{padding:"7px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-secondary)",fontSize:12}}>Close</button>
          </div>
        </div>
        <div style={{padding:20}}>
          <div style={{background:"#ef4444",borderRadius:10,padding:"14px 18px",marginBottom:14}}>
            <div style={{fontSize:22,fontWeight:800,color:"#fff"}}>{client.name}</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.85)",marginTop:4}}>{client.date_of_birth&&client.date_of_birth+(calcAge(client.date_of_birth)?" - Age "+calcAge(client.date_of_birth):"")}{client.room_or_address&&" - "+client.room_or_address}</div>
            {client.azv_number&&<div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:2}}>AZV: {client.azv_number}</div>}
          </div>
          <div style={{background:"rgba(239,68,68,0.1)",border:"2px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"12px 16px",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:800,color:"#ef4444",marginBottom:8}}>ALLERGIES</div>
            {fa.length===0?<span style={{color:"var(--color-text-dim)",fontSize:13}}>{t.knownAllergies}</span>:fa.map(a=><span key={a.id} style={{display:"inline-block",background:"rgba(239,68,68,0.15)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.3)",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700,margin:2}}>{a.value}</span>)}
          </div>
          {highRisk.length>0&&(
            <div style={{background:"rgba(245,158,11,0.1)",border:"2px solid rgba(245,158,11,0.3)",borderRadius:10,padding:"12px 16px",marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:800,color:"#f59e0b",marginBottom:8}}>HIGH-RISK MEDICATIONS</div>
              {highRisk.map(m=><span key={m.name} style={{display:"inline-block",background:"rgba(245,158,11,0.15)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.3)",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700,margin:2}}>{m.name}{m.dosage&&" - "+m.dosage}</span>)}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div style={{background:"rgba(139,92,246,0.1)",border:"2px solid rgba(139,92,246,0.3)",borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#8b5cf6",marginBottom:6}}>EMERGENCY</div>
              {client.emergency_contact?<><div style={{fontWeight:700,color:"var(--color-text-primary)"}}>{client.emergency_contact}</div>{client.emergency_phone&&<div style={{fontSize:13,color:"var(--color-text-secondary)"}}>{client.emergency_phone}</div>}</>:<div style={{color:"var(--color-text-dim)"}}>{t.notProvided}</div>}
            </div>
            <div style={{background:"rgba(6,182,212,0.1)",border:"2px solid rgba(6,182,212,0.3)",borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#06b6d4",marginBottom:6}}>DOCTORS</div>
              {client.dr_di_cas&&<div style={{fontSize:13,color:"var(--color-text-secondary)"}}><strong>GP:</strong> {client.dr_di_cas}</div>}
              {client.dr_specialista&&<div style={{fontSize:13,color:"var(--color-text-secondary)"}}><strong>Spec:</strong> {client.dr_specialista}</div>}
              {!client.dr_di_cas&&!client.dr_specialista&&<div style={{color:"var(--color-text-dim)"}}>{t.notProvided}</div>}
            </div>
          </div>
          {fm.length>0&&(
            <div style={{background:"rgba(16,185,129,0.1)",border:"2px solid rgba(16,185,129,0.3)",borderRadius:10,padding:"12px 16px"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#10b981",marginBottom:8}}>ALL MEDICATIONS</div>
              {fm.map(m=><div key={m.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(16,185,129,0.15)",fontSize:13}}><strong style={{color:"var(--color-text-primary)"}}>{m.name}</strong><span style={{color:"var(--color-text-secondary)"}}>{m.dosage} {m.frequency}</span></div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientDetail({client,onEdit,onDelete,onRestore,onInlineUpdate,t,currentUser,cfSchema,logAudit}){
  const perms=useContext(PermissionsContext);
  const role=currentUser?.role||"user";
  const canEdit=can(role,"edit",perms);
  const canDelete=can(role,"delete",perms);
  const [showEmerg,setShowEmerg]=useState(false);
  const age=calcAge(client.date_of_birth);
  const color=avatarColor(client.name);
  const {highRisk,polypharmacy,medCount}=getMedFlags(client);
  const fallRisk=calcFallRisk(client);
  const [showFallFactors,setShowFallFactors]=useState(false);
  const fd=(client.diagnoses||[]).filter(d=>d.value&&d.value.trim());
  const fa=(client.allergies||[]).filter(a=>a.value&&a.value.trim());
  const fm=(client.medications||[]).filter(m=>m.name&&m.name.trim());
  const fn=[...(client.session_notes||[])].filter(n=>n.text&&n.text.trim()).sort((a,b)=>b.date.localeCompare(a.date));
  const scols={Active:"#10b981",Inactive:"#f59e0b",Discharged:"#8b5cf6"};
  const sc=scols[client.status]||"#10b981";

  const doPrint=()=>window.print();

  const doExport=()=>{
    const rows=[];
    rows.push("<h1 style='font-family:serif;color:#1e293b;margin-bottom:4px'>"+client.name+"</h1>");
    rows.push("<div style='color:#64748b;font-size:13px;margin-bottom:16px'>"+(age?"Age "+age:"")+(client.room_or_address?" - "+client.room_or_address:"")+(client.azv_number?" - AZV: "+client.azv_number:"")+"</div>");
    if(client.phone)rows.push("<p style='font-size:13px'><strong>Phone:</strong> "+client.phone+"</p>");
    if(client.emergency_contact)rows.push("<p style='font-size:13px'><strong>Emergency:</strong> "+client.emergency_contact+" "+(client.emergency_phone||"")+"</p>");
    if(client.dr_di_cas)rows.push("<p style='font-size:13px'><strong>GP:</strong> "+client.dr_di_cas+"</p>");
    if(client.dr_specialista)rows.push("<p style='font-size:13px'><strong>Specialist:</strong> "+client.dr_specialista+"</p>");
    if(fa.length>0)rows.push("<h3 style='color:#ef4444;border-bottom:1px solid #eee;padding-bottom:4px;margin-top:16px'>Allergies</h3><p style='font-size:13px'>"+fa.map(a=>a.value).join(", ")+"</p>");
    if(fd.length>0)rows.push("<h3 style='color:#6366f1;border-bottom:1px solid #eee;padding-bottom:4px;margin-top:16px'>Diagnoses</h3><p style='font-size:13px'>"+fd.map(d=>d.value).join(", ")+"</p>");
    if(fm.length>0){
      rows.push("<h3 style='color:#ef4444;border-bottom:1px solid #eee;padding-bottom:4px;margin-top:16px'>Medications</h3>");
      rows.push("<table style='width:100%;border-collapse:collapse;font-size:12px'><tr style='background:#f8f9fa'><th style='padding:6px;text-align:left;border-bottom:1px solid #dee2e6'>Name</th><th style='padding:6px;text-align:left;border-bottom:1px solid #dee2e6'>Dosage</th><th style='padding:6px;text-align:left;border-bottom:1px solid #dee2e6'>Frequency</th></tr>");
      fm.forEach(m=>rows.push("<tr><td style='padding:6px;border-bottom:1px solid #f0f0f0'><strong>"+m.name+"</strong></td><td style='padding:6px;border-bottom:1px solid #f0f0f0'>"+(m.dosage||"-")+"</td><td style='padding:6px;border-bottom:1px solid #f0f0f0'>"+(m.frequency||"-")+"</td></tr>"));
      rows.push("</table>");
    }
    if(fn.length>0){
      rows.push("<h3 style='color:#7c3aed;border-bottom:1px solid #eee;padding-bottom:4px;margin-top:16px'>Session Notes</h3>");
      fn.slice(0,10).forEach(n=>rows.push("<div style='border-left:3px solid #7c3aed;padding-left:12px;margin-bottom:10px'><strong style='font-size:11px;color:#7c3aed'>"+n.date+(n.role?" - "+n.role:"")+(n.staff_name?" - "+n.staff_name:"")+"</strong><p style='margin:4px 0;font-size:13px;color:#374151'>"+n.text+"</p></div>"));
    }
    rows.push("<hr style='margin-top:24px;border:none;border-top:1px solid #e5e7eb'><p style='text-align:center;font-size:10px;color:#9ca3af'>GoldenCare System - Exported "+new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})+"</p>");
    const html="<!DOCTYPE html><html><head><title>"+client.name+" - GoldenCare System</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#374151;font-size:13px}@page{margin:1.5cm;size:A4}</style></head><body>"+rows.join("")+"</body></html>";
    const blob=new Blob([html],{type:"text/html"});
    const url=URL.createObjectURL(blob);
    const w=window.open(url,"_blank");
    if(w){w.onload=()=>{setTimeout(()=>w.print(),500);};}
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  };

  return(
    <div>
      <style dangerouslySetInnerHTML={{__html:"@media print { body > * { display: none !important; } #pz { display: block !important; position: fixed; top: 0; left: 0; width: 100%; padding: 32px; background: #fff; color: #000; } .np { display: none !important; } .ph { display: block !important; } @page { margin: 1.5cm; size: A4; } } .ph { display: none; }"}}/>
      <div className="np" style={{display:"flex",gap:8,justifyContent:"flex-end",marginBottom:16,flexWrap:"wrap"}}>
        {client.archived?(
          <>
            <span style={{fontSize:12,fontWeight:700,padding:"8px 14px",borderRadius:8,background:"rgba(239,68,68,0.1)",color:"#f87171",border:"1px solid rgba(239,68,68,0.25)",alignSelf:"center"}}>📦 Archived</span>
            {onRestore&&canEdit&&<button onClick={onRestore} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#10b981",color:"#fff",fontWeight:600,fontSize:13}}>♻️ Restore</button>}
            {canDelete&&<button onClick={onDelete} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #ef4444",background:"rgba(239,68,68,0.1)",color:"#ef4444",fontWeight:600,fontSize:13}}>🗑️ Delete Permanently</button>}
          </>
        ):(
          <>
            <button onClick={doExport} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"var(--color-accent)",color:"#fff",fontWeight:600,fontSize:13}}>Export PDF</button>
            <button onClick={()=>setShowEmerg(true)} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontWeight:600,fontSize:13}}>Emergency Card</button>
            <button onClick={doPrint} style={{padding:"8px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-secondary)",fontWeight:600,fontSize:13}}>Print</button>
            {canEdit&&<button onClick={onEdit} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #6366f1",background:"rgba(99,102,241,0.1)",color:"#6366f1",fontWeight:600,fontSize:13}}>{t.edit}</button>}
            {canDelete&&<button onClick={onDelete} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #f59e0b",background:"rgba(245,158,11,0.1)",color:"#f59e0b",fontWeight:600,fontSize:13}}>📦 Archive</button>}
            {!canEdit&&<span style={{fontSize:12,color:"var(--color-text-muted)",alignSelf:"center",fontStyle:"italic"}}>View only</span>}
          </>
        )}
      </div>
      <div id="pz">
        <div className="ph" style={{textAlign:"center",borderBottom:"2px solid #6366f1",paddingBottom:12,marginBottom:20}}>
          <div style={{fontSize:22,fontWeight:700,color:"#111",fontFamily:"serif"}}>GoldenCare System - Client Profile</div>
          <div style={{fontSize:11,color:"var(--color-text-dim)",marginTop:4}}>Printed on {new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
        </div>
        <div style={{background:"var(--color-bg-card)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:18,padding:20}}>
            <div style={{width:80,height:80,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:800,color:"#fff",flexShrink:0,overflow:"hidden"}}>
              <ClientPhoto path={client.photo_url} alt={client.name} style={{width:"100%",height:"100%",objectFit:"cover"}} fallback={initials(client.name)}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:20,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.4px",marginBottom:6}}>{client.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:8}}>
                <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:sc+"20",color:sc,border:"1px solid "+sc+"40"}}>{client.status||t.active}</span>
                <button onClick={()=>setShowFallFactors(f=>!f)} title={fallRisk.factors.join(", ")||"No risk factors"}
                  style={{fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:20,background:fallRisk.color+"20",color:fallRisk.color,border:"1px solid "+fallRisk.color+"40",cursor:"pointer"}}>
                  🚶 Fall Risk: {fallRisk.level} ({fallRisk.score})
                </button>
                {(()=>{const ic=client.intake_checklist||[];const done=ic.filter(i=>i.done).length;const total=DEFAULT_INTAKE_ITEMS.length;const pct=total>0?Math.round(done/total*100):0;return<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:pct===100?"rgba(16,185,129,0.2)":"rgba(99,102,241,0.1)",color:pct===100?"#10b981":"#a5b4fc",border:"1px solid "+(pct===100?"rgba(16,185,129,0.3)":"rgba(99,102,241,0.2)")}}>✅ Intake {pct}%</span>;})()}
                {client.isolation_type&&client.isolation_type!=="None"&&(()=>{const icols={Contact:{bg:"rgba(245,158,11,0.15)",border:"rgba(245,158,11,0.4)",color:"#f59e0b"},Droplet:{bg:"rgba(6,182,212,0.15)",border:"rgba(6,182,212,0.4)",color:"#06b6d4"},Airborne:{bg:"rgba(239,68,68,0.15)",border:"rgba(239,68,68,0.4)",color:"#ef4444"}};const ic=icols[client.isolation_type]||icols.Contact;return<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:ic.bg,border:"1px solid "+ic.border,color:ic.color,letterSpacing:0.3}}>🚨 {client.isolation_type.toUpperCase()} PRECAUTIONS</span>;})()}
              </div>
              {showFallFactors&&fallRisk.factors.length>0&&(
                <div style={{background:fallRisk.color+"10",border:"1px solid "+fallRisk.color+"30",borderRadius:8,padding:"8px 12px",marginBottom:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                  {fallRisk.factors.map((f,i)=><span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:fallRisk.color+"20",color:fallRisk.color,fontWeight:600}}>{f}</span>)}
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"18px 1fr",rowGap:5,columnGap:8,marginTop:2}}>
                {client.date_of_birth&&<><span style={{fontSize:13,paddingTop:1}}>🎂</span><span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{new Date(client.date_of_birth+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}{age!==null&&" · Age "+age}</span></>}
                {client.room_or_address&&<><span style={{fontSize:13,paddingTop:1}}>📍</span><span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{client.room_or_address}</span></>}
                {client.azv_number&&<><span style={{fontSize:13,paddingTop:1}}>🪪</span><span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{client.azv_number}</span></>}
                {client.phone&&<><span style={{fontSize:13,paddingTop:1}}>📞</span><span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{client.phone}</span></>}
                {client.emergency_contact&&<><span style={{fontSize:13,paddingTop:1}}>🆘</span><span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{client.emergency_contact}{client.emergency_phone&&" · "+client.emergency_phone}</span></>}
                {client.dr_di_cas&&<><span style={{fontSize:13,paddingTop:1}}>🩺</span><span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{client.dr_di_cas}{client.dr_specialista&&" · "+client.dr_specialista}</span></>}
              </div>
            </div>
          </div>
        </div>
        {(polypharmacy||highRisk.length>0)&&(
          <div style={{background:"rgba(239,68,68,0.08)",border:"1.5px solid rgba(239,68,68,0.25)",borderRadius:12,padding:"14px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#ef4444",fontSize:13,marginBottom:8}}>MEDICATION FLAGS</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {polypharmacy&&<span style={{fontSize:12,background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:20,padding:"4px 12px",color:"#f59e0b",fontWeight:600}}>{medCount} {t.polypharmacy}</span>}
              {highRisk.map(m=><span key={m.name} style={{fontSize:12,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:20,padding:"4px 12px",color:"#ef4444",fontWeight:600}}>{t.highRisk} {m.name}</span>)}
            </div>
          </div>
        )}
        {fa.length>0&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,color:"#f59e0b",fontSize:13,marginBottom:10}}>ALLERGIES</div>
            {fa.map(a=><span key={a.id} style={{display:"inline-block",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:20,padding:"3px 10px",fontSize:12,color:"#f59e0b",fontWeight:600,margin:2}}>{a.value}</span>)}
          </div>
        )}
        {fd.length>0&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:10}}>DIAGNOSES</div>
            {fd.map(d=><span key={d.id} style={{display:"inline-block",background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:20,padding:"3px 10px",fontSize:12,color:"#06b6d4",fontWeight:600,margin:2}}>{d.value}</span>)}
          </div>
        )}
        {fm.length>0&&(()=>{
          const sched=TSLOTS.map(slot=>({...slot,meds:fm.filter(m=>m.timing&&m.timing[slot.key])})).filter(s=>s.meds.length>0);
          const labs={morning:t.morning,afternoon:t.afternoon,evening:t.evening,night:t.night};
          return(
            <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
              <div style={{fontWeight:700,color:"#ef4444",fontSize:13,marginBottom:12}}>MEDICATIONS</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:sched.length>0?16:0}}>
                {fm.map(m=><div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"var(--color-bg-hover)",borderRadius:8}}>
                  <span style={{fontWeight:700,color:"var(--color-text-primary)",flex:2}}>{m.name}</span>
                  {m.dosage&&<span style={{color:"var(--color-text-secondary)",flex:1}}>{m.dosage}</span>}
                  {m.frequency&&<span style={{color:"var(--color-text-dim)",flex:1,fontSize:12}}>{m.frequency}</span>}
                </div>)}
              </div>
              {sched.length>0&&(
                <div>
                  <div style={{fontWeight:600,color:"#6366f1",fontSize:12,marginBottom:8}}>{t.medSchedule}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                    {sched.map(slot=>(
                      <div key={slot.key} style={{background:slot.color+"10",border:"1px solid "+slot.color+"30",borderRadius:8,padding:"8px 10px"}}>
                        <div style={{fontWeight:700,fontSize:11,color:slot.color,marginBottom:6}}>{labs[slot.key]}</div>
                        {slot.meds.map(m=><div key={m.id} style={{fontSize:12,color:"var(--color-text-secondary)"}}>{m.name}{m.dosage&&" - "+m.dosage}</div>)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {(client.inventory||[]).length>0&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:700,color:"#10b981",fontSize:13}}>INVENTORY</div>
              <div style={{fontSize:12,color:"var(--color-text-dim)"}}>{(client.inventory||[]).length} items{(client.inventory||[]).reduce((s,i)=>s+(parseFloat(i.value)||0),0)>0&&" - AWG "+(client.inventory||[]).reduce((s,i)=>s+(parseFloat(i.value)||0),0).toFixed(2)}</div>
            </div>
            <div className="inv-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {(client.inventory||[]).map(item=>{
                const cc={Excellent:"#10b981",Good:"#06b6d4",Fair:"#f59e0b",Poor:"#ef4444"};
                const c=cc[item.condition]||"rgba(240,242,250,0.3)";
                return(
                  <div key={item.id} style={{background:"var(--color-bg-hover)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)"}}>
                    {item.photo_url?<img src={item.photo_url} alt={item.name} style={{width:"100%",height:90,objectFit:"cover",display:"block"}}/>:<div style={{width:"100%",height:90,background:"var(--color-bg-card)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"var(--color-text-muted)"}}>+</div>}
                    <div style={{padding:"8px 10px"}}>
                      <div style={{fontWeight:700,fontSize:12,color:"var(--color-text-primary)",marginBottom:4}}>{item.name||"Item"}</div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {item.condition&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:20,background:c+"15",color:c,fontWeight:700}}>{item.condition}</span>}
                        {item.value&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:20,background:"rgba(16,185,129,0.1)",color:"#10b981",fontWeight:700}}>AWG {item.value}</span>}
                      </div>
                      {item.location&&<div style={{fontSize:10,color:"var(--color-text-dim)",marginTop:4}}>{item.location}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {(client.documents||[]).length>0&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:12}}>DOCUMENTS</div>
            {(client.documents||[]).map(doc=>{
              const days=daysUntil(doc.expiry);
              const badge=expiryBadge(days);
              return(
                <div key={doc.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1e293b"}}>
                  <div>
                    <span style={{fontWeight:600,fontSize:13,color:"var(--color-text-primary)"}}>{doc.name}</span>
                    {doc.expiry&&<span style={{fontSize:12,color:"var(--color-text-dim)",marginLeft:8}}>Exp: {new Date(doc.expiry+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}</span>}
                  </div>
                  {badge&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:badge.bg,color:badge.color}}>{badge.label} {days!==null&&(days<0?Math.abs(days)+"d ago":days+"d")}</span>}
                </div>
              );
            })}
          </div>
        )}
        {(client.care_plan||[]).length>0&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,color:"#8b5cf6",fontSize:13,marginBottom:12}}>CARE PLAN</div>
            {(client.care_plan||[]).map(item=>{
              const gs=GSTATUSES.find(s=>s.value===item.status)||GSTATUSES[0];
              return(
                <div key={item.id} style={{borderLeft:"3px solid "+gs.color,paddingLeft:12,marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontWeight:700,color:"var(--color-text-primary)"}}>{item.goal}</span>
                    <span style={{fontSize:11,padding:"2px 7px",borderRadius:20,background:gs.color+"20",color:gs.color,fontWeight:700}}>{item.status}</span>
                  </div>
                  {item.plan&&<div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.6}}>{item.plan}</div>}
                </div>
              );
            })}
          </div>
        )}
        {(client.vitals||[]).length>0&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <VitalsTracker vitals={client.vitals||[]} onChange={()=>{}} t={t}/>
          </div>
        )}
        {fn.length>0&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,color:"#7c3aed",fontSize:13,marginBottom:12}}>SESSION NOTES</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {fn.map(n=>(
                <div key={n.id} style={{borderLeft:"3px solid rgba(124,58,237,0.4)",paddingLeft:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,color:"#7c3aed",fontWeight:700}}>{new Date(n.date+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</span>
                    {(n.role||n.staff_name)&&<span style={{fontSize:11,background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:20,padding:"2px 8px",color:"#7c3aed",fontWeight:600}}>{n.role}{n.role&&n.staff_name&&" - "}{n.staff_name}</span>}
                  </div>
                  <div style={{color:"var(--color-text-secondary)",fontSize:14,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{n.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
        {/* Family Contacts */}
        {(client.family_contacts||[]).length>0&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,color:"#ec4899",fontSize:13,marginBottom:12}}>👨‍👩‍👧 FAMILY CONTACTS</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {(client.family_contacts||[]).map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:"var(--color-bg-hover)",borderRadius:8}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name||"?"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name||"?")}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13,color:"var(--color-text-primary)"}}>{c.name}{c.is_primary&&<span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,background:"rgba(99,102,241,0.15)",color:"#a5b4fc",marginLeft:6}}>Primary</span>}</div>
                    <div style={{fontSize:11,color:"var(--color-text-dim)"}}>{c.relationship}{c.phone?" · "+c.phone:""}{c.email?" · "+c.email:""}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Appointments */}
        {(client.appointments||[]).length>0&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:12}}>📅 APPOINTMENTS</div>
            <AppointmentLog items={client.appointments||[]} onChange={onInlineUpdate?v=>onInlineUpdate("appointments",v):()=>{}}/>
          </div>
        )}
        {/* Incidents */}
        {(client.incidents||[]).length>0&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,color:"#ef4444",fontSize:13,marginBottom:12}}>⚠️ INCIDENT REPORTS</div>
            <IncidentReports items={client.incidents||[]} onChange={onInlineUpdate?v=>onInlineUpdate("incidents",v):()=>{}} currentUser={currentUser}/>
          </div>
        )}
        {/* Intake Checklist */}
        {(()=>{const ic=client.intake_checklist||[];return(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,color:"#10b981",fontSize:13,marginBottom:12}}>✅ INTAKE CHECKLIST</div>
            <IntakeChecklist items={ic} onChange={onInlineUpdate?v=>onInlineUpdate("intake_checklist",v):()=>{}} currentUser={currentUser}/>
          </div>
        );})()}
        {/* ADL Tracking */}
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
          <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:12}}>🧍 ADL TRACKING</div>
          <ADLTracker items={client.adl_logs||[]} onChange={onInlineUpdate?v=>onInlineUpdate("adl_logs",v):()=>{}}/>
        </div>
        {/* Pain Assessment */}
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
          <div style={{fontWeight:700,color:"#f59e0b",fontSize:13,marginBottom:12}}>🩹 PAIN ASSESSMENT</div>
          <PainAssessment items={client.pain_assessments||[]} onChange={onInlineUpdate?v=>onInlineUpdate("pain_assessments",v):()=>{}}/>
        </div>
        {/* Wound & Skin Assessment */}
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
          <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:12}}>🩺 WOUND & SKIN ASSESSMENT</div>
          <WoundAssessment items={client.wound_assessments||[]} onChange={onInlineUpdate?v=>onInlineUpdate("wound_assessments",v):()=>{}}/>
        </div>
        {/* Braden Scale */}
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
          <div style={{fontWeight:700,color:"#8b5cf6",fontSize:13,marginBottom:12}}>🛏 BRADEN SCALE — PRESSURE ULCER RISK</div>
          <BradenScale items={client.braden_assessments||[]} onChange={onInlineUpdate?v=>onInlineUpdate("braden_assessments",v):()=>{}}/>
        </div>
        {/* Cognitive Screening */}
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
          <div style={{fontWeight:700,color:"#a78bfa",fontSize:13,marginBottom:12}}>🧠 COGNITIVE SCREENING — MMSE / MoCA</div>
          <CognitiveScreening items={client.cognitive_assessments||[]} onChange={onInlineUpdate?v=>onInlineUpdate("cognitive_assessments",v):()=>{}}/>
        </div>
        {/* Continence Monitoring */}
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
          <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:12}}>💧 CONTINENCE MONITORING</div>
          <ContinenceLog items={client.continence_logs||[]} onChange={onInlineUpdate?v=>onInlineUpdate("continence_logs",v):()=>{}}/>
        </div>
        {/* Nutritional Risk Screening */}
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
          <div style={{fontWeight:700,color:"#10b981",fontSize:13,marginBottom:12}}>🥗 NUTRITIONAL RISK SCREENING — MUST</div>
          <NutritionScreening items={client.nutrition_assessments||[]} onChange={onInlineUpdate?v=>onInlineUpdate("nutrition_assessments",v):()=>{}}/>
        </div>
        {(client.preventive_care||[]).length>0&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,color:"#10b981",fontSize:13,marginBottom:12}}>🛡 PREVENTIVE CARE — VACCINES & SCREENINGS</div>
            <PreventiveCare items={client.preventive_care||[]} onChange={onInlineUpdate?v=>onInlineUpdate("preventive_care",v):()=>{}}/>
          </div>
        )}
      {(()=>{const cfs=cfSchema?JSON.parse(cfSchema||"[]"):[];const vals=client.custom_fields||{};const filled=cfs.filter(f=>f.type==="checkbox"?vals[f.id]!==undefined:vals[f.id]);if(!cfs.length||!filled.length)return null;return(<div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:"14px 16px",marginBottom:12}}><div style={{fontWeight:700,color:"#6366f1",fontSize:13,marginBottom:12}}>🧩 ADDITIONAL INFORMATION</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 16px"}}>{cfs.map(f=>{const v=vals[f.id];if(v===undefined||v==="")return null;return(<div key={f.id}><div style={{fontSize:10,color:"var(--color-text-muted)",fontWeight:700,letterSpacing:"0.5px",marginBottom:2}}>{f.label.toUpperCase()}</div><div style={{fontSize:13,color:"var(--color-text-secondary)"}}>{f.type==="checkbox"?(v?"Yes":"No"):String(v)}</div></div>);})}</div></div>);})()}
      {showEmerg&&<EmergCard client={client} onClose={()=>setShowEmerg(false)} t={t}/>}
    </div>
  );
}

function LangPicker({onSelect}){
  return(
    <div style={{minHeight:"100vh",background:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"var(--color-bg-card)",borderRadius:20,padding:"48px 40px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",maxWidth:420,width:"90%",border:"1px solid rgba(255,255,255,0.08)",textAlign:"center"}}>
        <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:"0 8px 20px rgba(99,102,241,0.35)"}}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <div style={{fontSize:24,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.5px",marginBottom:6}}>GoldenCare System</div>
        <div style={{fontSize:13,color:"var(--color-text-dim)",marginBottom:32}}>Select your language / Selecta bo idioma</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {LANG_OPTIONS.map(l=>(
            <button key={l.code} onClick={()=>onSelect(l.code)}
              style={{display:"flex",alignItems:"center",gap:16,padding:"14px 18px",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"var(--color-bg-hover)",color:"var(--color-text-primary)",fontSize:16,fontWeight:600}}>
              <span style={{fontSize:18,fontWeight:800,color:"#6366f1",width:40,textAlign:"center"}}>{l.emoji}</span><span>{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Login({onLogin,t}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState(null);
  const [loading,setLoading]=useState(false);
  const handle=async()=>{
    if(!email||!password)return;
    setLoading(true);setError(null);
    let loginEmail=email;
    // If input doesn't look like email, try username lookup
    if(!email.includes("@")){
      const {data:byUsername}=await supabase.from("user_roles").select("email").eq("username",email.toLowerCase()).single();
      if(!byUsername?.email){setError("Username not found");setLoading(false);return;}
      loginEmail=byUsername.email;
    }
    const {data,error:err}=await supabase.auth.signInWithPassword({email:loginEmail,password});
    if(err){setError(err.message);setLoading(false);return;}
    const {data:roles}=await supabase.from("user_roles").select("*").eq("user_id",data.user.id);
    const rd=roles?.[0];
    // Log login history (keep last 10) — non-blocking
    if(rd){
      try{
        const prev=rd.login_history||[];
        const entry={at:new Date().toISOString(),ip:"unknown",device:navigator.userAgent.slice(0,80)};
        const updated=[entry,...prev].slice(0,10);
        supabase.from("user_roles").update({login_history:updated}).eq("user_id",data.user.id).eq("company_id",rd.company_id).then(()=>{});
      }catch(_){}
    }
    // Audit: sign-in event
    supabase.from("audit_log").insert({
      action:"User signed in",
      client_name:"",
      performed_by:rd?.name||loginEmail,
      performed_role:rd?.role||"",
      company_id:rd?.company_id||null,
      section:"Auth",
      details:`Signed in from ${navigator.userAgent.includes("Mobile")?"mobile":"desktop"}`,
      device:navigator.userAgent.slice(0,220),
    }).then(()=>{});
    onLogin({...data.user,role:rd?.role||"user",displayName:rd?.name||loginEmail.split("@")[0],company_id:rd?.company_id||null,allRoles:roles||[],avatar_url:rd?.avatar_url||null,username:rd?.username||null});
    setLoading(false);
  };
  return(
    <div style={{minHeight:"100vh",background:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"var(--color-bg-card)",borderRadius:20,padding:"48px 40px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",maxWidth:420,width:"90%",border:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:"0 8px 20px rgba(99,102,241,0.35)"}}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div style={{fontSize:22,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.5px",marginBottom:4}}>GoldenCare System</div>
          <div style={{fontSize:13,color:"var(--color-text-dim)"}}>{t.signIn}</div>
        </div>
        {error&&<div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,color:"#ef4444",fontSize:13}}>{error}</div>}
        <form onSubmit={e=>{e.preventDefault();handle();}} style={{margin:0}}>
          <div style={{marginBottom:14}}><label style={LBL}>Email or Username</label><input type="text" style={INP} placeholder="your@email.com or username" value={email} onChange={e=>setEmail(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="username email" spellCheck="false"/></div>
          <div style={{marginBottom:24}}><label style={LBL}>{t.password}</label><input type="password" style={INP} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></div>
          <button type="submit" disabled={loading} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:loading?"rgba(255,255,255,0.08)":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:loading?"rgba(240,242,250,0.3)":"#fff",fontWeight:700,fontSize:15,boxShadow:loading?"none":"0 4px 14px rgba(99,102,241,0.35)"}}>
            {loading?t.signingIn:t.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}

const DAYS=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DEFAULT_HOURS={monday:"8:00 AM - 5:00 PM",tuesday:"8:00 AM - 5:00 PM",wednesday:"8:00 AM - 5:00 PM",thursday:"8:00 AM - 5:00 PM",friday:"8:00 AM - 5:00 PM",saturday:"10:00 AM - 2:00 PM",sunday:"Closed"};

function CompanyView({company,onUpdate,currentUser,t}){
  const fileRef=useRef(null);
  const [form,setForm]=useState({
    name:company?.name||"",address:company?.address||"",phone:company?.phone||"",
    email:company?.email||"",website:company?.website||"",director_name:company?.director_name||"",
    director_contact:company?.director_contact||"",registration_number:company?.registration_number||"",
    mission_statement:company?.mission_statement||"",emergency_contact:company?.emergency_contact||"",
    emergency_phone:company?.emergency_phone||"",hours_of_operation:company?.hours_of_operation||DEFAULT_HOURS,
  });
  const [tab,setTab]=useState("info");
  const [logoPreview,setLogoPreview]=useState(company?.logo_url||null);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [toast,setToast]=useState(null);
  const [cfSchema,setCfSchema]=useState(()=>{try{return JSON.parse(company?.custom_fields_schema||"[]");}catch{return [];}});
  const [cfSaving,setCfSaving]=useState(false);

  const showToast=(type,msg)=>{setToast({type,msg});setTimeout(()=>setToast(null),3500);};
  const onChange=e=>setForm(p=>({...p,[e.target.name]:e.target.value}));
  const onHour=(day,val)=>setForm(p=>({...p,hours_of_operation:{...p.hours_of_operation,[day]:val}}));

  const onLogoSelect=e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!file.type.startsWith("image/")){showToast("error","Please select an image file");return;}
    if(file.size>5*1024*1024){showToast("error","Logo must be under 5MB");return;}
    const reader=new FileReader();
    reader.onload=ev=>setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const uploadLogo=async()=>{
    const file=fileRef.current?.files?.[0];
    if(!file||!company)return null;
    setUploading(true);
    const ext=file.name.split(".").pop();
    const fileName=company.id+"/logo."+ext;
    const {error:upErr}=await supabase.storage.from("company-logos").upload(fileName,file,{upsert:true});
    if(upErr){showToast("error","Logo upload failed: "+upErr.message);setUploading(false);return null;}
    const {data}=supabase.storage.from("company-logos").getPublicUrl(fileName);
    setUploading(false);
    return data.publicUrl+"?t="+Date.now();
  };

  const onSave=async e=>{
    e.preventDefault();
    if(!company){showToast("error","No company record found. Run the SQL setup first.");return;}
    setSaving(true);
    let logoUrl=company.logo_url;
    if(fileRef.current?.files?.[0]){const u=await uploadLogo();if(u)logoUrl=u;}
    const {data,error:err}=await supabase.from("companies").update({...form,logo_url:logoUrl,updated_at:new Date().toISOString()}).eq("id",company.id).select().single();
    if(err){showToast("error","Save failed: "+err.message);}
    else{onUpdate(data);setLogoPreview(data.logo_url);showToast("success","Company information saved!");}
    setSaving(false);
  };

  const TABS=[{id:"info",label:"Company Info"},{id:"hours",label:"Hours"},{id:"emergency",label:"Emergency"},{id:"fields",label:"Custom Fields"}];

  const saveCfSchema=async()=>{
    if(!company)return;
    setCfSaving(true);
    const schema=JSON.stringify(cfSchema);
    const {data,error}=await supabase.from("companies").update({custom_fields_schema:schema}).eq("id",company.id).select().single();
    if(error)showToast("error","Save failed: "+error.message);
    else{onUpdate(data);showToast("success","Custom fields saved!");}
    setCfSaving(false);
  };
  const addCfField=()=>setCfSchema(s=>[...s,{id:uid(),label:"",type:"text",required:false,options:""}]);
  const updateCfField=(id,key,val)=>setCfSchema(s=>s.map(f=>f.id===id?{...f,[key]:val}:f));
  const removeCfField=id=>setCfSchema(s=>s.filter(f=>f.id!==id));
  const moveCfField=(id,dir)=>setCfSchema(s=>{const i=s.findIndex(f=>f.id===id);if(i<0)return s;const n=[...s];const t=n[i];n.splice(i,1);n.splice(i+dir,0,t);return n;});
  const inp={...INP,marginBottom:0};
  const lbl={...LBL,marginBottom:4};
  const fld=(label,name,type="text",placeholder="")=>(
    <div>
      <label style={lbl}>{label}</label>
      <input type={type} name={name} value={form[name]} onChange={onChange} placeholder={placeholder} style={inp}/>
    </div>
  );

  return(
    <div style={{maxWidth:800}}>
      {toast&&(
        <div style={{position:"fixed",top:24,right:24,zIndex:999,padding:"12px 20px",borderRadius:10,background:toast.type==="success"?"#059669":"#dc2626",color:"#fff",fontSize:14,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>
          {toast.type==="success"?"✓ ":"✗ "}{toast.msg}
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
        {logoPreview&&(
          <div style={{background:"#fff",borderRadius:12,padding:"8px 10px",boxShadow:"0 2px 12px rgba(0,0,0,0.3)",flexShrink:0}}>
            <img src={logoPreview} alt="logo" style={{height:60,maxWidth:160,objectFit:"contain",display:"block"}}/>
          </div>
        )}
        <div>
          <div style={{fontSize:20,color:"var(--color-text-primary)",fontWeight:700,letterSpacing:"-0.4px"}}>{form.name||"Company Settings"}</div>
          {form.mission_statement&&<div style={{color:"var(--color-text-dim)",fontSize:13,marginTop:4,fontStyle:"italic"}}>"{form.mission_statement}"</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:2,marginBottom:24,borderBottom:"1px solid var(--color-border)"}}>
        {TABS.map(tab_=>(<button key={tab_.id} onClick={()=>setTab(tab_.id)}
          style={{padding:"8px 16px",border:"none",borderBottom:tab===tab_.id?"2px solid #6366f1":"2px solid transparent",background:"transparent",color:tab===tab_.id?"#6366f1":"rgba(240,242,250,0.3)",fontWeight:600,fontSize:13,cursor:"pointer",marginBottom:-1}}>
          {tab_.label}</button>))}
      </div>
      <form onSubmit={onSave}>
        {tab==="info"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,padding:16}}>
              <div style={{fontSize:11,color:"var(--color-text-dim)",fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:14,textTransform:"uppercase",letterSpacing:"0.8px"}}>🖼 Company Logo</div>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <div style={{width:120,height:120,border:"2px dashed rgba(255,255,255,0.15)",borderRadius:12,background:"var(--color-bg-hover)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                  {logoPreview
                    ?<div style={{background:"#fff",width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:8}}><img src={logoPreview} alt="preview" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/></div>
                    :<span style={{color:"var(--color-text-muted)",fontSize:12}}>No logo</span>}
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onLogoSelect} style={{display:"none"}}/>
                  <button type="button" onClick={()=>fileRef.current?.click()}
                    style={{padding:"8px 16px",borderRadius:8,border:"1px solid #6366f1",background:"rgba(99,102,241,0.1)",color:"#6366f1",fontSize:13,fontWeight:600,marginBottom:8,display:"block"}}>
                    {uploading?"Uploading...":"Choose Logo"}
                  </button>
                  <div style={{fontSize:11,color:"var(--color-text-muted)"}}>PNG or JPG · Max 5MB</div>
                  <div style={{fontSize:11,color:"var(--color-text-muted)"}}>Will appear in sidebar</div>
                </div>
              </div>
            </div>
            <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,padding:16}}>
              <div style={{fontSize:11,color:"var(--color-text-dim)",fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:14,textTransform:"uppercase",letterSpacing:"0.8px"}}>🏢 Basic Information</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {fld("Company Name *","name")}
                {fld("Registration Number","registration_number")}
                {fld("Address","address","text","e.g. Oranjestad, Aruba")}
                {fld("Phone","phone","tel","+297-...")}
                {fld("Email","email","email","info@company.aw")}
                {fld("Website","website","text","www.company.aw")}
              </div>
              <div style={{marginTop:12}}>
                <label style={lbl}>Mission Statement</label>
                <textarea name="mission_statement" value={form.mission_statement} onChange={onChange} rows={3}
                  placeholder="e.g. The love of God reflected in every care"
                  style={{...inp,resize:"vertical",lineHeight:1.5}}/>
              </div>
            </div>
            <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,padding:16}}>
              <div style={{fontSize:11,color:"var(--color-text-dim)",fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:14,textTransform:"uppercase",letterSpacing:"0.8px"}}>👤 Director / Contact</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {fld("Director Name","director_name","text","e.g. Maria Johnson")}
                {fld("Director Contact","director_contact","email","director@company.aw")}
              </div>
            </div>
          </div>
        )}
        {tab==="hours"&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,padding:16}}>
            <div style={{fontSize:11,color:"var(--color-text-dim)",fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:16,textTransform:"uppercase",letterSpacing:"0.8px"}}>🕐 Hours of Operation</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {DAYS.map(day=>(
                <div key={day} style={{display:"flex",alignItems:"center",gap:12}}>
                  <label style={{width:90,fontSize:13,fontWeight:600,color:"var(--color-text-secondary)",textTransform:"capitalize",flexShrink:0}}>{day}</label>
                  <input type="text" value={form.hours_of_operation[day]||""} onChange={e=>onHour(day,e.target.value)}
                    placeholder='e.g. 8:00 AM - 5:00 PM or Closed' style={{...inp,flex:1}}/>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==="emergency"&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,padding:16}}>
            <div style={{fontSize:11,color:"var(--color-text-dim)",fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:14,textTransform:"uppercase",letterSpacing:"0.8px"}}>🚨 Emergency Contact</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {fld("Emergency Contact Name","emergency_contact","text","e.g. Emergency Hotline")}
              {fld("Emergency Phone","emergency_phone","tel","+297-999-8888")}
            </div>
          </div>
        )}
        {tab==="fields"&&(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,padding:16}}>
            <div style={{fontSize:11,color:"var(--color-text-dim)",fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.8px"}}>🧩 Custom Client Fields</div>
            <div style={{fontSize:12,color:"var(--color-text-muted)",marginBottom:16}}>Define extra fields that appear on every client record for this company.</div>
            {cfSchema.length===0&&<div style={{fontSize:13,color:"var(--color-text-muted)",textAlign:"center",padding:"24px 0"}}>No custom fields yet. Click Add Field to get started.</div>}
            {cfSchema.map((f,i)=>(
              <div key={f.id} style={{background:"var(--color-bg-surface)",border:"1px solid var(--color-border)",borderRadius:10,padding:"12px 14px",marginBottom:10,display:"flex",gap:10,alignItems:"flex-start"}}>
                <div className="cf-fields-row" style={{flex:1,display:"grid",gridTemplateColumns:"1fr 130px 80px",gap:8,alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:10,color:"var(--color-text-muted)",fontWeight:600,marginBottom:3}}>LABEL</div>
                    <input value={f.label} onChange={e=>updateCfField(f.id,"label",e.target.value)} placeholder="e.g. Insurance Number" style={{...INP,marginBottom:0,fontSize:12}}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"var(--color-text-muted)",fontWeight:600,marginBottom:3}}>TYPE</div>
                    <select value={f.type} onChange={e=>updateCfField(f.id,"type",e.target.value)} style={{...INP,marginBottom:0,fontSize:12,padding:"7px 10px"}}>
                      <option value="text">Text</option>
                      <option value="textarea">Long Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="select">Dropdown</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,paddingTop:18}}>
                    <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--color-text-secondary)",cursor:"pointer"}}>
                      <input type="checkbox" checked={f.required} onChange={e=>updateCfField(f.id,"required",e.target.checked)} style={{accentColor:"#6366f1"}}/>
                      Required
                    </label>
                  </div>
                </div>
                {f.type==="select"&&(
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:"var(--color-text-muted)",fontWeight:600,marginBottom:3}}>OPTIONS (comma-separated)</div>
                    <input value={f.options||""} onChange={e=>updateCfField(f.id,"options",e.target.value)} placeholder="Option A, Option B, Option C" style={{...INP,marginBottom:0,fontSize:12}}/>
                  </div>
                )}
                <div style={{display:"flex",flexDirection:"column",gap:4,paddingTop:18}}>
                  <button type="button" onClick={()=>moveCfField(f.id,-1)} disabled={i===0} style={{background:"transparent",border:"1px solid var(--color-border)",borderRadius:6,padding:"2px 7px",color:"var(--color-text-dim)",cursor:i===0?"default":"pointer",fontSize:12}}>↑</button>
                  <button type="button" onClick={()=>moveCfField(f.id,1)} disabled={i===cfSchema.length-1} style={{background:"transparent",border:"1px solid var(--color-border)",borderRadius:6,padding:"2px 7px",color:"var(--color-text-dim)",cursor:i===cfSchema.length-1?"default":"pointer",fontSize:12}}>↓</button>
                  <button type="button" onClick={()=>removeCfField(f.id)} style={{background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.25)",borderRadius:6,padding:"2px 7px",color:"#f87171",cursor:"pointer",fontSize:12}}>✕</button>
                </div>
              </div>
            ))}
            <div style={{display:"flex",gap:10,marginTop:12}}>
              <button type="button" onClick={addCfField} style={{padding:"8px 16px",borderRadius:8,border:"1px dashed var(--color-border)",background:"transparent",color:"var(--color-text-secondary)",fontSize:12,fontWeight:600,cursor:"pointer"}}>+ Add Field</button>
              <button type="button" onClick={saveCfSchema} disabled={cfSaving} style={{padding:"8px 20px",borderRadius:8,border:"none",background:cfSaving?"rgba(255,255,255,0.1)":"#6366f1",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {cfSaving?"Saving…":"Save Fields"}
              </button>
            </div>
          </div>
        )}
        {tab!=="fields"&&<div style={{marginTop:20}}>
          <button type="submit" disabled={saving||uploading}
            style={{padding:"11px 28px",borderRadius:10,border:"none",background:saving?"rgba(255,255,255,0.1)":"#10b981",color:saving?"rgba(240,242,250,0.3)":"#fff",fontWeight:700,fontSize:14}}>
            {saving?"Saving...":"Save Company Information"}
          </button>
        </div>}
      </form>
    </div>
  );
}

function CompanyPicker({onSelect,currentUser,t}){
  const [companies,setCompanies]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    // For superadmin load all companies, for others load only their assigned companies
    const isSuperAdmin=currentUser?.allRoles?.some(r=>r.role==="superadmin");
    if(isSuperAdmin){
      supabase.from("companies").select("*").is("archived_at",null).order("name")
        .then(({data})=>{setCompanies(data||[]);setLoading(false);});
    } else {
      // Load only companies this user belongs to (non-archived)
      const companyIds=(currentUser?.allRoles||[]).map(r=>r.company_id).filter(Boolean);
      if(companyIds.length===0){setLoading(false);return;}
      supabase.from("companies").select("*").in("id",companyIds).is("archived_at",null).order("name")
        .then(({data})=>{setCompanies(data||[]);setLoading(false);});
    }
  },[currentUser]);

  const handleSelect=(companyId)=>{
    // Find the role for this specific company
    const roleForCompany=currentUser?.allRoles?.find(r=>r.company_id===companyId);
    onSelect(companyId, roleForCompany?.role||"user");
  };

  return(
    <div style={{minHeight:"100vh",background:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{maxWidth:600,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🏢</div>
          <div style={{fontSize:24,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.5px",marginBottom:6}}>Select Care Facility</div>
          <div style={{fontSize:13,color:"var(--color-text-dim)"}}>Choose which care facility to manage</div>
        </div>
        {loading?(
          <div style={{textAlign:"center",color:"var(--color-text-muted)",padding:"40px 0"}}>Loading companies...</div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {companies.map(c=>{
              const roleForCompany=currentUser?.allRoles?.find(r=>r.company_id===c.id);
              const roleColors={superadmin:"#f59e0b",admin:"#6366f1",power_user:"#06b6d4",user:"#10b981"};
              const rc=roleColors[roleForCompany?.role]||"rgba(240,242,250,0.3)";
              return(
                <button key={c.id} onClick={()=>handleSelect(c.id)}
                  style={{display:"flex",alignItems:"center",gap:16,padding:"20px 24px",borderRadius:16,border:"1px solid rgba(255,255,255,0.08)",background:"var(--color-bg-card)",cursor:"pointer",textAlign:"left",width:"100%"}}>
                  {c.logo_url?(
                    <div style={{background:"#fff",borderRadius:10,padding:"6px 8px",flexShrink:0}}>
                      <img src={c.logo_url} alt={c.name} style={{height:48,maxWidth:120,objectFit:"contain",display:"block"}}/>
                    </div>
                  ):(
                    <div style={{width:64,height:64,borderRadius:12,background:"rgba(99,102,241,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🏥</div>
                  )}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:16,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.3px",marginBottom:4}}>{c.name}</div>
                    {c.mission_statement&&<div style={{fontSize:12,color:"var(--color-text-dim)",fontStyle:"italic",marginBottom:6}}>"{c.mission_statement}"</div>}
                    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                      {c.address&&<span style={{fontSize:11,color:"var(--color-text-muted)"}}>📍 {c.address}</span>}
                      {roleForCompany&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:rc+"20",color:rc,border:"1px solid "+rc+"40",textTransform:"capitalize"}}>{roleForCompany.role.replace("_"," ")}</span>}
                    </div>
                  </div>
                  <div style={{color:"#6366f1",fontSize:20,flexShrink:0}}>→</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const ACTIONS=[
  {key:"view",       label:"View Clients",       icon:"👁",  desc:"Browse and read client profiles"},
  {key:"add",        label:"Add Clients",         icon:"➕",  desc:"Create new client records"},
  {key:"edit",       label:"Edit Clients",        icon:"✏️", desc:"Modify client data and assessments"},
  {key:"delete",     label:"Delete Clients",      icon:"🗑",  desc:"Permanently delete client records"},
  {key:"audit",      label:"Audit Trail",         icon:"📋", desc:"Access the full system audit log"},
  {key:"company",    label:"Company Settings",    icon:"🏢", desc:"Edit company profile and settings"},
  {key:"users",      label:"User Management",     icon:"👥", desc:"Create, edit and deactivate staff accounts"},
  {key:"permissions",label:"Permissions Panel",   icon:"🔐", desc:"Edit what each role can do"},
  {key:"rooms",           label:"Rooms Board",          icon:"🛏", desc:"View room assignments and isolation flags"},
  {key:"readmission",     label:"Readmission Risk",     icon:"🏥", desc:"View hospitalisation history and readmission risk dashboard"},
  {key:"medications_view",label:"Medications View",     icon:"💊", desc:"Access the aggregate medications list across all clients"},
  {key:"incidents_view",  label:"Incidents View",       icon:"⚠️", desc:"Access the aggregate incidents list across all clients"},
  {key:"reports",         label:"Reports",              icon:"📄", desc:"Generate census, MAR and other reports"},
  {key:"handover",        label:"Handover Notes",       icon:"📝", desc:"Access shift handover notes"},
];
const ROLES=["superadmin","admin","power_user","nurse","care_assistant","user"];
const ROLE_LABELS={superadmin:"Super Admin",admin:"Admin",power_user:"Power User",nurse:"Nurse",care_assistant:"Care Assistant",user:"User"};
const ROLE_COLORS={superadmin:"#f59e0b",admin:"var(--color-accent)",power_user:"#06b6d4",nurse:"#8b5cf6",care_assistant:"#ec4899",user:"#10b981"};
const ROLE_DESC={
  superadmin:"Full unrestricted access to all features and all companies.",
  admin:"Manages users, clients, and company settings within their company.",
  power_user:"Clinical staff — can view, add, and edit clients but not manage users.",
  nurse:"Can view and edit clients, log clinical assessments, administer MAR, and run reports.",
  care_assistant:"Can view clients and log clinical assessments and MAR doses. Cannot edit the client record.",
  user:"Read-only care staff — can view clients and log assessments.",
};

function PermissionsPanel({activeCompanyId,currentUser,t}){
  const [globalPerms,setGlobalPerms]=useState([]);
  const [companyPerms,setCompanyPerms]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [tab,setTab]=useState("global");
  const [pendingChanges,setPendingChanges]=useState({});

  const showToast=(type,msg)=>{setToast({type,msg});setTimeout(()=>setToast(null),3500);};

  const loadPerms=async()=>{
    setLoading(true);
    const {data:gp}=await supabase.from("permissions").select("*").order("role").order("action");
    setGlobalPerms(gp||[]);
    if(activeCompanyId){
      const {data:cp}=await supabase.from("company_permissions").select("*").eq("company_id",activeCompanyId).order("role").order("action");
      setCompanyPerms(cp||[]);
    }
    setLoading(false);
  };

  useEffect(()=>{loadPerms();},[activeCompanyId]);

  const getPermValue=(role,action,isCompany=false)=>{
    const key=`${isCompany?"c":"g"}_${role}_${action}`;
    if(pendingChanges[key]!==undefined)return pendingChanges[key];
    if(isCompany){
      const override=companyPerms.find(p=>p.role===role&&p.action===action);
      if(override)return override.allowed;
      // Fall back to global
      const global=globalPerms.find(p=>p.role===role&&p.action===action);
      return global?.allowed??false;
    }
    const global=globalPerms.find(p=>p.role===role&&p.action===action);
    return global?.allowed??false;
  };

  const togglePerm=(role,action,isCompany=false)=>{
    const key=`${isCompany?"c":"g"}_${role}_${action}`;
    const current=getPermValue(role,action,isCompany);
    setPendingChanges(p=>({...p,[key]:!current}));
  };

  const saveChanges=async()=>{
    if(Object.keys(pendingChanges).length===0){showToast("error","No changes to save");return;}
    setSaving(true);
    const changeCount=Object.keys(pendingChanges).length;
    try{
      for(const [key,allowed] of Object.entries(pendingChanges)){
        const isCompany=key.startsWith("c_");
        const withoutPrefix=key.slice(2);
        const PARSE_ROLES=["superadmin","admin","power_user","care_assistant","nurse","user","inactive"];
        const matchedRole=PARSE_ROLES.find(r=>withoutPrefix.startsWith(r+"_"));
        const role=matchedRole||withoutPrefix.split("_")[0];
        const action=withoutPrefix.slice(role.length+1);
        if(isCompany&&activeCompanyId){
          await supabase.from("company_permissions").upsert({company_id:activeCompanyId,role,action,allowed,updated_at:new Date().toISOString()},{onConflict:"company_id,role,action"});
        } else {
          await supabase.from("permissions").update({allowed,updated_at:new Date().toISOString()}).eq("role",role).eq("action",action);
        }
      }
      // Audit log
      await supabase.from("audit_log").insert({
        action:"Permissions updated",client_name:"",
        performed_by:currentUser?.displayName||currentUser?.email||"",
        performed_role:currentUser?.role||"",
        company_id:activeCompanyId||null,
        section:"Permissions",
        details:`Changed ${changeCount} permission${changeCount!==1?"s":""} (${tab==="company"?"company override":"global defaults"})`,
        device:navigator.userAgent.slice(0,220),
      }).then(()=>{});
      // Reload permissions cache
      if(applyMode==="now")await refreshPerms(activeCompanyId);
      setPendingChanges({});
      await loadPerms();
      showToast("success",applyMode==="now"?"Permissions saved and applied immediately!":"Permissions saved — will apply on next login");
    }catch(err){
      showToast("error","Failed to save: "+err.message);
    }
    setSaving(false);
  };

  const hasPending=Object.keys(pendingChanges).length>0;
  const isCompanyTab=tab==="company";

  // Toggle switch component (inline)
  const Toggle=({val,onClick,locked,pending})=>(
    <button onClick={locked?undefined:onClick} disabled={locked} aria-checked={val} role="switch"
      style={{width:48,height:26,borderRadius:13,border:"none",flexShrink:0,
        background:val?"#10b981":"var(--color-border)",
        position:"relative",cursor:locked?"not-allowed":"pointer",
        transition:"background 200ms ease",
        outline:pending?"2px solid #f59e0b":"none",outlineOffset:2,
        opacity:locked?0.5:1,touchAction:"manipulation"}}>
      <span style={{position:"absolute",top:3,left:val?25:3,
        width:20,height:20,borderRadius:"50%",background:"#fff",
        transition:"left 200ms ease",boxShadow:"0 1px 4px rgba(0,0,0,0.25)"}}/>
    </button>
  );

  return(
    <div style={{maxWidth:960}}>
      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",top:24,right:24,zIndex:1100,padding:"12px 20px",borderRadius:10,
          background:toast.type==="success"?"#059669":"#dc2626",color:"#fff",fontSize:14,fontWeight:600,
          boxShadow:"0 4px 20px rgba(0,0,0,0.35)",display:"flex",alignItems:"center",gap:8}}>
          <span>{toast.type==="success"?"✓":"✗"}</span>{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.5px"}}>Permissions</div>
          <div style={{fontSize:13,color:"var(--color-text-dim)",marginTop:3}}>Configure what each role can access and modify</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {hasPending&&(
            <button onClick={()=>setPendingChanges({})}
              style={{padding:"7px 14px",borderRadius:8,border:"1px solid var(--color-border)",background:"transparent",color:"var(--color-text-dim)",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              Discard changes
            </button>
          )}
          <button onClick={saveChanges} disabled={saving||!hasPending}
            style={{padding:"8px 20px",borderRadius:8,border:"none",
              background:hasPending?"#10b981":"var(--color-bg-hover)",
              color:hasPending?"#fff":"var(--color-text-muted)",
              fontWeight:700,fontSize:13,cursor:hasPending?"pointer":"not-allowed",transition:"background 150ms"}}>
            {saving?"Saving…":`Save${hasPending?` (${Object.keys(pendingChanges).length})`:""}` }
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--color-border)",marginBottom:20}}>
        {[["global","🌐 Global Defaults","Sets the default permissions for all companies"],
          ["company","🏢 Company Override","Override global defaults for this specific company"]
        ].map(([id,label,hint])=>(
          <button key={id} onClick={()=>{setTab(id);setPendingChanges({});}}
            title={hint}
            style={{padding:"9px 20px",border:"none",borderBottom:tab===id?"2px solid var(--color-accent)":"2px solid transparent",
              background:"transparent",color:tab===id?"var(--color-accent)":"var(--color-text-secondary)",
              fontWeight:600,fontSize:13,cursor:"pointer",marginBottom:-1,transition:"color 120ms"}}>
            {label}
          </button>
        ))}
      </div>

      {tab==="company"&&(
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:9,
          background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",marginBottom:16}}>
          <span style={{fontSize:14}}>ℹ️</span>
          <span style={{fontSize:12,color:"#f59e0b",lineHeight:1.5}}>
            Company overrides apply <strong>on top of</strong> global defaults — only changed permissions are stored here. Unset overrides fall back to global.
            {!activeCompanyId&&<strong> Select a company first to use this tab.</strong>}
          </span>
        </div>
      )}

      {tab==="company"&&!activeCompanyId?(
        <div style={{padding:40,textAlign:"center",color:"var(--color-text-muted)"}}>
          <div style={{fontSize:32,marginBottom:10}}>🏢</div>
          <div style={{fontSize:15,fontWeight:600}}>No company selected</div>
          <div style={{fontSize:13,marginTop:4}}>Switch to a company from the sidebar to manage overrides.</div>
        </div>
      ):loading?(
        <div style={{color:"var(--color-text-muted)",textAlign:"center",padding:"40px 0",fontFamily:"'DM Mono',monospace",fontSize:13}}>Loading permissions…</div>
      ):(
        <>
          {/* Pending banner */}
          {hasPending&&(
            <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)",
              borderRadius:10,padding:"10px 16px",marginBottom:16,
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,color:"#f59e0b",fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                ⚠️ {Object.keys(pendingChanges).length} unsaved change{Object.keys(pendingChanges).length!==1?"s":""}  — will apply immediately on save
              </span>
            </div>
          )}

          {/* Role cards */}
          <div className="perms-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {ROLES.map(role=>{
              const enabledCount=ACTIONS.filter(a=>getPermValue(role,a.key,isCompanyTab&&!!activeCompanyId)).length;
              const roleColor=ROLE_COLORS[role];
              const pendingForRole=ACTIONS.filter(a=>pendingChanges[`${isCompanyTab?"c":"g"}_${role}_${a.key}`]!==undefined).length;
              return(
                <div key={role} style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",
                  borderRadius:14,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
                  {/* Card header */}
                  <div style={{padding:"14px 18px",borderBottom:"1px solid var(--color-border)",
                    background:"var(--color-bg-hover)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontSize:13,fontWeight:800,color:roleColor,textTransform:"uppercase",letterSpacing:"0.4px"}}>{ROLE_LABELS[role]}</span>
                        <span style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,
                          background:roleColor+"18",color:roleColor,fontFamily:"'DM Mono',monospace"}}>
                          {enabledCount}/{ACTIONS.length}
                        </span>
                        {pendingForRole>0&&<span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20,background:"rgba(245,158,11,0.15)",color:"#f59e0b"}}>{pendingForRole} pending</span>}
                      </div>
                      <div style={{fontSize:11,color:"var(--color-text-dim)",lineHeight:1.4}}>{ROLE_DESC[role]}</div>
                    </div>
                    {/* Enable all / none quick actions — skip superadmin */}
                    {role!=="superadmin"&&(
                      <div style={{display:"flex",gap:4,flexShrink:0}}>
                        <button onClick={()=>{ACTIONS.forEach(a=>{if(!getPermValue(role,a.key,isCompanyTab&&!!activeCompanyId)){const k=`${isCompanyTab?"c":"g"}_${role}_${a.key}`;setPendingChanges(p=>({...p,[k]:true}));}});}}
                          style={{fontSize:10,padding:"3px 8px",borderRadius:5,border:"1px solid var(--color-border)",background:"transparent",color:"var(--color-text-dim)",cursor:"pointer",fontWeight:600}}>All</button>
                        <button onClick={()=>{ACTIONS.forEach(a=>{if(getPermValue(role,a.key,isCompanyTab&&!!activeCompanyId)){const k=`${isCompanyTab?"c":"g"}_${role}_${a.key}`;setPendingChanges(p=>({...p,[k]:false}));}});}}
                          style={{fontSize:10,padding:"3px 8px",borderRadius:5,border:"1px solid var(--color-border)",background:"transparent",color:"var(--color-text-dim)",cursor:"pointer",fontWeight:600}}>None</button>
                      </div>
                    )}
                  </div>
                  {/* Permission rows */}
                  <div>
                    {ACTIONS.map((action,i)=>{
                      const val=getPermValue(role,action.key,isCompanyTab&&!!activeCompanyId);
                      const key=`${isCompanyTab?"c":"g"}_${role}_${action.key}`;
                      const isPending=pendingChanges[key]!==undefined;
                      const isLocked=role==="superadmin";
                      return(
                        <div key={action.key}
                          onClick={()=>!isLocked&&togglePerm(role,action.key,isCompanyTab&&!!activeCompanyId)}
                          style={{display:"flex",alignItems:"center",gap:12,padding:"11px 18px",
                            borderBottom:i<ACTIONS.length-1?"1px solid var(--color-border)":"none",
                            cursor:isLocked?"default":"pointer",
                            background:isPending?"rgba(245,158,11,0.05)":"transparent",
                            transition:"background 80ms"}}>
                          <span style={{fontSize:16,flexShrink:0,width:22,textAlign:"center"}}>{action.icon}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:val?"var(--color-text-primary)":"var(--color-text-dim)"}}>{action.label}</div>
                            <div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:1}}>{action.desc}</div>
                          </div>
                          <Toggle val={val} onClick={()=>togglePerm(role,action.key,isCompanyTab&&!!activeCompanyId)} locked={isLocked} pending={isPending}/>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


// ─── Reports & Exports ────────────────────────────────────────────────────────
function ReportsView({clients,company,currentUser,logAudit}){
  const now=new Date();
  const [report,setReport]=useState(null);
  const [clientId,setClientId]=useState("");
  const [month,setMonth]=useState(now.getMonth()+1);
  const [year,setYear]=useState(now.getFullYear());
  const [generating,setGenerating]=useState(false);

  const activeClients=clients.filter(c=>!c.archived);
  const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthName=MONTH_NAMES[month-1];
  const daysInMonth=new Date(year,month,0).getDate();
  const companyName=company?.name||"GoldenCare System";
  const generatedOn=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const inMonth=d=>d&&d.startsWith(`${year}-${String(month).padStart(2,"0")}`);
  const fmtDate=d=>d?new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—";

  const BASE_CSS=`*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;font-size:12px}h2{font-size:11px;font-weight:800;border-bottom:2px solid #6366f1;padding-bottom:3px;margin:18px 0 8px;color:#6366f1;text-transform:uppercase;letter-spacing:.8px}table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11px}th{background:#f1f5f9;padding:5px 8px;text-align:left;border-bottom:2px solid #e2e8f0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.3px}td{padding:5px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top}.page{padding:28px;max-width:210mm;margin:0 auto}.header-bar{background:#1e293b;color:white;padding:18px 22px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start}.header-title{font-family:Georgia,serif;font-size:18px;font-weight:700;margin-bottom:4px}.header-meta{font-size:10px;opacity:.65;line-height:1.6}.client-block{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:14px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px}.info-row{font-size:11px;padding:2px 0;display:flex;gap:8px}.info-label{color:#64748b;font-weight:700;font-size:10px;text-transform:uppercase;white-space:nowrap;min-width:76px}.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;margin:2px;border:1px solid}.bg{background:#f0fdf4;color:#16a34a;border-color:#bbf7d0}.by{background:#fefce8;color:#ca8a04;border-color:#fde68a}.br{background:#fef2f2;color:#dc2626;border-color:#fecaca}.bb{background:#eff6ff;color:#2563eb;border-color:#bfdbfe}.note-block{border-left:3px solid #7c3aed;padding:6px 10px;margin-bottom:8px;background:#faf5ff;border-radius:0 4px 4px 0}.note-meta{font-size:10px;font-weight:700;color:#7c3aed;margin-bottom:3px}.note-text{font-size:11px;color:#374151;line-height:1.5}.vital-flag{background:#fef2f2;color:#dc2626;font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700}.footer{text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:24px;padding-top:10px}.no-data{color:#94a3b8;font-style:italic;font-size:11px;padding:6px 0}@page{size:A4;margin:1.2cm}`;

  const openPrint=html=>{
    const blob=new Blob([html],{type:"text/html"});
    const url=URL.createObjectURL(blob);
    const w=window.open(url,"_blank");
    if(w){w.onload=()=>{setTimeout(()=>w.print(),450);};}
    setTimeout(()=>URL.revokeObjectURL(url),12000);
  };

  // ── Monthly Client Summary ───────────────────────────────────────────────────
  const genMonthly=()=>{
    const client=activeClients.find(c=>c.id===clientId);
    if(!client)return;
    setGenerating(true);
    const age=calcAge(client.date_of_birth);
    const fr=calcFallRisk(client);
    const {highRisk,polypharmacy,medCount}=getMedFlags(client);
    const notes=(client.session_notes||[]).filter(n=>inMonth(n.date)).sort((a,b)=>b.date.localeCompare(a.date));
    const vitals=(client.vitals||[]).filter(v=>inMonth(v.date)).sort((a,b)=>b.date.localeCompare(a.date));
    const appts=(client.appointments||[]).filter(a=>inMonth(a.date)).sort((a,b)=>b.date.localeCompare(a.date));
    const incidents=(client.incidents||[]).filter(i=>inMonth(i.date)).sort((a,b)=>b.date.localeCompare(a.date));
    const meds=(client.medications||[]).filter(m=>m.name&&m.name.trim());
    const diagnoses=(client.diagnoses||[]).filter(d=>d.value&&d.value.trim());
    const allergies=(client.allergies||[]).filter(a=>a.value&&a.value.trim());
    const adl=calcAdlSummary(client.adl_logs);
    const pain=calcPainSummary(client.pain_assessments);
    const braden=calcBradenSummary(client.braden_assessments);
    const cog=calcCognitiveSummary(client.cognitive_assessments);
    const nutr=calcNutritionSummary(client.nutrition_assessments);
    const fmtSlot=t=>{const s=[];if(t?.morning)s.push("AM");if(t?.afternoon)s.push("PM");if(t?.evening)s.push("Eve");if(t?.night)s.push("Ngt");return s.length?s.join(" · "):"—";};

    let h=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Monthly Summary — ${he(client.name)}</title><style>${BASE_CSS}</style></head><body><div class="page">`;

    // Header
    h+=`<div class="header-bar"><div><div class="header-title">Monthly Client Summary</div><div class="header-meta">${he(monthName)} ${he(year)} &nbsp;·&nbsp; ${he(companyName)}<br>Generated: ${he(generatedOn)} &nbsp;·&nbsp; By: ${he(currentUser.displayName||currentUser.email)}</div></div><div style="text-align:right"><div class="header-title" style="font-size:15px">${he(client.name)}</div><div class="header-meta">${he(client.status||"Active")} &nbsp;·&nbsp; ${age?"Age "+he(age):"DOB not set"}</div></div></div>`;

    // Identity block
    h+=`<div class="client-block"><div class="info-grid"><div class="info-row"><span class="info-label">DOB</span>${client.date_of_birth?fmtDate(client.date_of_birth):"—"}</div><div class="info-row"><span class="info-label">AZV #</span>${he(client.azv_number||"—")}</div><div class="info-row"><span class="info-label">Room</span>${he(client.room_or_address||"—")}</div><div class="info-row"><span class="info-label">Phone</span>${he(client.phone||"—")}</div><div class="info-row"><span class="info-label">GP</span>${he(client.dr_di_cas||"—")}</div><div class="info-row"><span class="info-label">Specialist</span>${he(client.dr_specialista||"—")}</div><div class="info-row"><span class="info-label">Emergency</span>${he(client.emergency_contact||"—")} ${he(client.emergency_phone||"")}</div><div class="info-row"><span class="info-label">Status</span>${he(client.status||"Active")}</div></div></div>`;

    // Allergy alert
    if(allergies.length>0)h+=`<div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:6px;padding:8px 12px;margin-bottom:14px;font-weight:700;color:#dc2626;font-size:11px">⚠ ALLERGIES: ${allergies.map(a=>he(a.value)).join(" · ")}</div>`;

    // Clinical snapshot
    const badges=[];
    badges.push(`<span class="badge ${fr.level==="High"?"br":fr.level==="Medium"?"by":"bg"}">🚶 Fall Risk: ${fr.level} (${fr.score})</span>`);
    if(adl)badges.push(`<span class="badge ${adl.dep.label==="High"?"br":adl.dep.label==="Moderate"?"by":"bg"}">🧍 ADL: ${adl.dep.label}</span>`);
    if(pain)badges.push(`<span class="badge ${pain.latestScore>=7?"br":pain.latestScore>=4?"by":"bg"}">🩹 Pain: ${pain.latestScore}/10</span>`);
    if(braden)badges.push(`<span class="badge ${braden.score<=12?"br":braden.score<=14?"by":"bg"}">🛏 Braden: ${braden.score}/${BRADEN_MAX}</span>`);
    if(cog)badges.push(`<span class="badge ${cog.level.label.includes("Severe")?"br":cog.level.label.includes("Moderate")?"by":"bg"}">🧠 ${cog.latest.test_type||"MMSE"}: ${cog.score}/30</span>`);
    if(nutr)badges.push(`<span class="badge ${nutr.score>=2?"br":nutr.score===1?"by":"bg"}">🥗 MUST: ${nutr.score} — ${nutr.risk.label}</span>`);
    if(polypharmacy)badges.push(`<span class="badge by">💊 Polypharmacy (${medCount} meds)</span>`);
    if(highRisk.length>0)badges.push(`<span class="badge br">⚠ ${highRisk.length} High-Risk Med${highRisk.length>1?"s":""}</span>`);
    h+=`<h2>Clinical Snapshot</h2><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">${badges.join("")}</div>`;

    // Diagnoses
    if(diagnoses.length>0)h+=`<h2>Diagnoses</h2><div style="display:flex;flex-wrap:wrap;gap:4px">${diagnoses.map(d=>`<span class="badge bb">${he(d.value)}</span>`).join("")}</div>`;

    // Medications
    if(meds.length>0){
      h+=`<h2>Current Medications</h2><table><thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Timing</th><th>High Risk</th></tr></thead><tbody>`;
      meds.forEach(m=>{const isHR=highRisk.some(x=>x.id===m.id);h+=`<tr${isHR?" style='background:#fef2f2'":" "}><td><strong>${he(m.name)}</strong></td><td>${he(m.dosage||"—")}</td><td>${he(m.frequency||"—")}</td><td>${he(fmtSlot(m.timing))}</td><td>${isHR?"<strong style='color:#dc2626'>⚠ Yes</strong>":"—"}</td></tr>`;});
      h+=`</tbody></table>`;
    }

    // Session notes
    h+=`<h2>Session Notes — ${he(monthName)} ${he(year)} (${notes.length})</h2>`;
    if(notes.length===0){h+=`<div class="no-data">No session notes recorded this month.</div>`;}
    else{notes.forEach(n=>{h+=`<div class="note-block"><div class="note-meta">${fmtDate(n.date)}${n.role?" &nbsp;·&nbsp; "+he(n.role):""}${n.staff_name?" &nbsp;·&nbsp; "+he(n.staff_name):""}</div><div class="note-text">${he(n.text||"")}</div></div>`;});}

    // Vitals
    h+=`<h2>Vitals — ${monthName} ${year} (${vitals.length})</h2>`;
    if(vitals.length===0){h+=`<div class="no-data">No vitals recorded this month.</div>`;}
    else{
      h+=`<table><thead><tr><th>Date</th><th>BP (mmHg)</th><th>HR</th><th>Weight (kg)</th><th>Temp (°C)</th><th>O₂ (%)</th><th>Glucose</th><th>Notes</th></tr></thead><tbody>`;
      vitals.forEach(v=>{
        const flags=checkAbnormalVitals(v);
        const bp=v.bp_systolic?`${he(v.bp_systolic)}/${he(v.bp_diastolic||"?")}`:"-";
        const flagHtml=flags.length?` <span class="vital-flag">⚠ ${flags.map(f=>he(f.label)).join(", ")}</span>`:"";
        h+=`<tr><td>${fmtDate(v.date)}</td><td>${bp}${flagHtml}</td><td>${he(v.heart_rate||"—")}</td><td>${he(v.weight||"—")}</td><td>${he(v.temperature||"—")}</td><td>${he(v.oxygen_sat||"—")}</td><td>${he(v.blood_sugar||"—")}</td><td style="font-size:10px;color:#64748b">${he(v.notes||"")}</td></tr>`;
      });
      h+=`</tbody></table>`;
    }

    // Appointments
    h+=`<h2>Appointments — ${monthName} ${year} (${appts.length})</h2>`;
    if(appts.length===0){h+=`<div class="no-data">No appointments recorded this month.</div>`;}
    else{
      h+=`<table><thead><tr><th>Date</th><th>Type</th><th>Status</th><th>Transport</th><th>Notes</th></tr></thead><tbody>`;
      appts.forEach(a=>{const sc=a.status==="No-Show"?"color:#dc2626;font-weight:700":a.status==="Completed"?"color:#16a34a":"";h+=`<tr><td>${fmtDate(a.date)}</td><td>${he(a.type||"—")}</td><td style="${sc}">${he(a.status||"—")}</td><td>${a.transport?"Yes":"—"}</td><td style="font-size:10px">${he(a.notes||"")}</td></tr>`;});
      h+=`</tbody></table>`;
    }

    // Incidents
    if(incidents.length>0){
      h+=`<h2 style="color:#dc2626;border-color:#dc2626">⚠ Incidents — ${monthName} ${year} (${incidents.length})</h2>`;
      h+=`<table><thead><tr><th>Date</th><th>Type</th><th>Severity</th><th>Description</th><th>Action Taken</th></tr></thead><tbody>`;
      incidents.forEach(i=>{const sc=i.severity==="Severe"?"color:#dc2626;font-weight:700":i.severity==="Moderate"?"color:#ca8a04;font-weight:700":"";h+=`<tr><td>${fmtDate(i.date)}</td><td>${he(i.type||"—")}</td><td style="${sc}">${he(i.severity||"—")}</td><td>${he(i.description||"—")}</td><td style="font-size:10px">${he(i.action||i.action_taken||"—")}</td></tr>`;});
      h+=`</tbody></table>`;
    }

    // Care plan
    const goals=(client.care_plan||[]).filter(g=>g.goal||g.plan);
    if(goals.length>0){
      h+=`<h2>Care Plan</h2><table><thead><tr><th>Goal</th><th>Plan</th><th>Status</th><th>Last Reviewed</th></tr></thead><tbody>`;
      goals.forEach(g=>{const sb=g.status==="Achieved"?`<span class="badge bg">Achieved</span>`:g.status==="On Hold"?`<span class="badge by">On Hold</span>`:g.status==="Discontinued"?`<span class="badge br">Discontinued</span>`:`<span class="badge bb">In Progress</span>`;h+=`<tr><td>${he(g.goal||"—")}</td><td style="font-size:10px">${he(g.plan||"—")}</td><td>${sb}</td><td style="font-size:10px">${g.reviewed?fmtDate(g.reviewed):"—"}</td></tr>`;});
      h+=`</tbody></table>`;
    }

    h+=`<div class="footer">CONFIDENTIAL — GoldenCare System &nbsp;·&nbsp; ${he(companyName)} &nbsp;·&nbsp; ${he(client.name)} — Monthly Summary ${he(monthName)} ${he(year)} &nbsp;·&nbsp; Generated ${he(generatedOn)}</div></div></body></html>`;
    openPrint(h);
    logAudit?.("Generated Monthly Summary PDF",client.name,{section:"Reports",details:`Monthly summary for ${client.name} — ${monthName} ${year}`});
    setGenerating(false);
  };

  // ── MAR ─────────────────────────────────────────────────────────────────────
  const genMAR=()=>{
    const client=activeClients.find(c=>c.id===clientId);
    if(!client)return;
    setGenerating(true);
    const meds=(client.medications||[]).filter(m=>m.name&&m.name.trim());
    const allergies=(client.allergies||[]).filter(a=>a.value&&a.value.trim());
    const days=Array.from({length:daysInMonth},(_,i)=>i+1);
    const SLOTS=[{key:"morning",label:"AM"},{key:"afternoon",label:"PM"},{key:"evening",label:"Eve"},{key:"night",label:"Ngt"}];

    let h=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MAR — ${client.name} — ${monthName} ${year}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:9px;color:#000;padding:10px}@page{size:A4 landscape;margin:.8cm}.ph{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e293b;padding-bottom:8px;margin-bottom:6px}.pt{font-size:15px;font-weight:700;font-family:Georgia,serif}.ci{font-size:9px;line-height:1.6;margin-top:2px}.ab{background:#fef2f2;border:2px solid #fca5a5;padding:3px 10px;font-weight:700;color:#dc2626;font-size:9px;margin-bottom:6px;border-radius:4px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #94a3b8;padding:1px;text-align:center;font-size:8px;vertical-align:middle}.mth{text-align:left;padding:3px 5px;width:130px;font-size:9px;background:#1e293b;color:white}.sth{background:#1e293b;color:white;font-size:8px;font-weight:700;width:16px}.dth{background:#f1f5f9;font-size:7px;font-weight:700;width:18px}.mn{font-weight:700;font-size:9px}.md{font-size:7px;color:#64748b}.sc{font-size:8px;font-weight:700;color:#475569}.ac{background:#fff;height:13px}.lg{font-size:7.5px;color:#475569;margin-top:6px}.ft{text-align:center;font-size:8px;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:8px;padding-top:5px}</style></head><body>`;

    h+=`<div class="ph"><div><div class="pt">Medication Administration Record (MAR)</div><div class="ci"><strong>Client:</strong> ${he(client.name)} &nbsp;·&nbsp; <strong>DOB:</strong> ${he(client.date_of_birth||"—")} &nbsp;·&nbsp; <strong>Room:</strong> ${he(client.room_or_address||"—")} &nbsp;·&nbsp; <strong>AZV #:</strong> ${he(client.azv_number||"—")}</div><div class="ci"><strong>Period:</strong> ${he(monthName)} ${he(year)} (${daysInMonth} days) &nbsp;·&nbsp; <strong>Facility:</strong> ${he(companyName)}</div></div><div style="text-align:right;font-size:8px;color:#475569"><div>Generated: ${he(generatedOn)}</div><div>By: ${he(currentUser.displayName||currentUser.email)}</div></div></div>`;
    if(allergies.length>0)h+=`<div class="ab">⚠ ALLERGIES: ${allergies.map(a=>he(a.value)).join(" · ")}</div>`;

    if(meds.length===0){h+=`<p style="color:#94a3b8;text-align:center;padding:20px;font-style:italic">No medications on record.</p>`;}
    else{
      h+=`<table><thead><tr><th class="mth">Medication</th><th class="sth">Slot</th>`;
      days.forEach(d=>{h+=`<th class="dth">${d}</th>`;});
      h+=`</tr></thead><tbody>`;
      meds.forEach((m,mi)=>{
        const active=SLOTS.filter(s=>m.timing&&m.timing[s.key]);
        const rows=active.length||1;
        const bg=mi%2===0?"#fff":"#f8fafc";
        if(active.length===0){
          h+=`<tr style="background:${bg}"><td class="sc" rowspan="1" style="text-align:left;padding:3px 5px;background:${bg}"><div class="mn">${he(m.name)}</div><div class="md">${he(m.dosage||"")} ${he(m.frequency||"")}</div></td><td class="sc">PRN</td>`;
          days.forEach(()=>{h+=`<td class="ac"></td>`;});h+=`</tr>`;
        } else {
          active.forEach((slot,si)=>{
            h+=`<tr style="background:${bg}">`;
            if(si===0)h+=`<td class="sc" rowspan="${rows}" style="text-align:left;padding:3px 5px;background:${bg};vertical-align:middle"><div class="mn">${he(m.name)}</div><div class="md">${he(m.dosage||"")} ${he(m.frequency||"")}</div></td>`;
            h+=`<td class="sc">${slot.label}</td>`;
            days.forEach(()=>{h+=`<td class="ac"></td>`;});
            h+=`</tr>`;
          });
        }
      });
      h+=`<tr style="height:8px"><td colspan="${2+daysInMonth}" style="border:none;background:#fff"></td></tr>`;
      h+=`<tr><td style="text-align:left;padding:4px 6px;font-weight:700;font-size:8px;height:28px">NURSE SIGNATURE / INITIALS</td><td colspan="${1+daysInMonth}" style="border:none"></td></tr>`;
      h+=`</tbody></table>`;
    }
    h+=`<div class="lg">Legend: AM = Morning · PM = Afternoon · Eve = Evening · Ngt = Night · PRN = As Needed &nbsp;|&nbsp; Initial each cell after administration. Circle if withheld — document reason separately.</div>`;
    h+=`<div class="ft">CONFIDENTIAL — ${he(companyName)} &nbsp;·&nbsp; ${he(client.name)} — MAR ${he(monthName)} ${he(year)}</div></body></html>`;
    openPrint(h);
    logAudit?.("Generated MAR PDF",client.name,{section:"Reports",details:`MAR for ${client.name} — ${monthName} ${year}`});
    setGenerating(false);
  };

  // ── Census Report ────────────────────────────────────────────────────────────
  const genCensus=()=>{
    setGenerating(true);
    // Defer heavy computation so the "Generating PDF…" button state renders before the
    // main thread is blocked by iterating all clients and building the HTML string.
    setTimeout(()=>{
    const all=clients.filter(c=>!c.archived);
    const byStatus={Active:0,Inactive:0,Discharged:0};
    all.forEach(c=>{const s=c.status||"Active";byStatus[s]=(byStatus[s]||0)+1;});

    const ageBands=[{l:"Under 65",mn:0,mx:64,n:0},{l:"65–74",mn:65,mx:74,n:0},{l:"75–84",mn:75,mx:84,n:0},{l:"85+",mn:85,mx:999,n:0},{l:"Unknown",mn:-1,mx:-1,n:0}];
    all.forEach(c=>{const a=calcAge(c.date_of_birth);if(a===null){ageBands[4].n++;return;}const b=ageBands.find(x=>x.mn>=0&&a>=x.mn&&a<=x.mx);if(b)b.n++;});

    const frCount={Low:0,Medium:0,High:0};
    all.forEach(c=>{const fr=calcFallRisk(c);frCount[fr.level]=(frCount[fr.level]||0)+1;});

    const diagCount={};
    all.forEach(c=>(c.diagnoses||[]).filter(d=>d.value).forEach(d=>{const v=d.value.trim();diagCount[v]=(diagCount[v]||0)+1;}));
    const topDiags=Object.entries(diagCount).sort((a,b)=>b[1]-a[1]).slice(0,8);

    const locCount={};
    all.forEach(c=>{const l=c.room_or_address?.trim()||"Not assigned";locCount[l]=(locCount[l]||0)+1;});
    const topLocs=Object.entries(locCount).sort((a,b)=>b[1]-a[1]).slice(0,10);

    const polyClients=all.filter(c=>getMedFlags(c).polypharmacy);
    let totalNotes=0;const staffNotes={};
    all.forEach(c=>(c.session_notes||[]).filter(n=>inMonth(n.date)).forEach(n=>{totalNotes++;const st=n.staff_name||n.role||"Unknown";staffNotes[st]=(staffNotes[st]||0)+1;}));
    const clientsWithNotes=all.filter(c=>(c.session_notes||[]).some(n=>inMonth(n.date))).length;
    const topStaff=Object.entries(staffNotes).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const highBraden=all.filter(c=>{const b=calcBradenSummary(c.braden_assessments);return b&&b.score<=14;}).length;
    const activeWounds=all.filter(c=>{const w=calcWoundSummary(c.wound_assessments);return w&&w.activeSites.length>0;}).length;
    const highPain=all.filter(c=>{const p=calcPainSummary(c.pain_assessments);return p&&p.latestScore>=7;}).length;
    const highNutr=all.filter(c=>{const n=calcNutritionSummary(c.nutrition_assessments);return n&&n.score>=2;}).length;
    const modCog=all.filter(c=>{const cg=calcCognitiveSummary(c.cognitive_assessments);return cg&&(cg.level.label.includes("Moderate")||cg.level.label.includes("Severe"));}).length;

    const bar=(n,tot,col="#6366f1")=>{const p=tot>0?Math.round((n/tot)*100):0;return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden"><div style="height:100%;width:${p}%;background:${col};border-radius:4px"></div></div><span style="font-size:10px;font-weight:700;min-width:22px">${n}</span><span style="font-size:9px;color:#94a3b8">${p}%</span></div>`;};

    const CSS2=BASE_CSS+`.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}.stat-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center}.stat-num{font-size:32px;font-weight:800;font-family:Georgia,serif}.stat-lbl{font-size:11px;color:#64748b;margin-top:2px}.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}.sb{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:12px}.sl{font-size:10px;font-weight:800;text-transform:uppercase;color:#6366f1;letter-spacing:.5px;margin-bottom:8px}.fr{display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #f0f0f0;font-size:11px}.fn{font-weight:800;font-size:13px}.cf{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;text-align:center}.cfc{background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:10px 6px}`;

    let h=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Census Report — ${monthName} ${year}</title><style>${CSS2}</style></head><body><div class="page">`;
    h+=`<div class="header-bar"><div><div class="header-title">Census Report</div><div class="header-meta">${he(companyName)} &nbsp;·&nbsp; ${he(monthName)} ${he(year)}<br>Generated: ${he(generatedOn)} &nbsp;·&nbsp; By: ${he(currentUser.displayName||currentUser.email)}</div></div><div style="text-align:right"><div style="font-size:32px;font-weight:800;color:white">${all.length}</div><div class="header-meta">clients on file</div></div></div>`;

    // Status strip
    h+=`<div class="stat-grid"><div class="stat-card"><div class="stat-num" style="color:#16a34a">${byStatus.Active||0}</div><div class="stat-lbl">Active</div></div><div class="stat-card"><div class="stat-num" style="color:#ca8a04">${byStatus.Inactive||0}</div><div class="stat-lbl">Inactive</div></div><div class="stat-card"><div class="stat-num" style="color:#7c3aed">${byStatus.Discharged||0}</div><div class="stat-lbl">Discharged</div></div></div>`;

    // Age + Fall Risk
    h+=`<div class="two">`;
    h+=`<div class="sb"><div class="sl">Age Distribution</div>`;
    ageBands.forEach(b=>{if(b.n===0)return;const col=b.mn>=85?"#dc2626":b.mn>=75?"#f59e0b":"#6366f1";h+=`<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:1px"><span>${b.l}</span><span style="font-weight:700">${b.n}</span></div>${bar(b.n,all.length,col)}</div>`;});
    h+=`</div>`;
    h+=`<div class="sb"><div class="sl">Fall Risk Distribution</div>`;
    [["High","#dc2626"],["Medium","#f59e0b"],["Low","#16a34a"]].forEach(([lv,col])=>{h+=`<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:1px"><span>${lv} Risk</span><span style="font-weight:700">${frCount[lv]||0}</span></div>${bar(frCount[lv]||0,all.length,col)}</div>`;});
    h+=`</div></div>`;

    // Top diagnoses + Locations
    h+=`<div class="two">`;
    h+=`<div class="sb"><div class="sl">Top Diagnoses</div>`;
    if(topDiags.length===0)h+=`<div class="no-data">None recorded.</div>`;
    topDiags.forEach(([d,n])=>{h+=`<div style="margin-bottom:4px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:1px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px">${d}</span><span style="font-weight:700">${n}</span></div>${bar(n,all.length,"#6366f1")}</div>`;});
    h+=`</div>`;
    h+=`<div class="sb"><div class="sl">Room / Location</div>`;
    topLocs.forEach(([loc,n])=>{h+=`<div class="fr"><span style="overflow:hidden;text-overflow:ellipsis;max-width:120px;white-space:nowrap">${loc}</span><span class="fn">${n}</span></div>`;});
    h+=`</div></div>`;

    // Clinical flags
    h+=`<div class="sb"><div class="sl">Clinical Flags — All Clients</div><div class="cf">`;
    [{icon:"🛏",lbl:"Braden ≤14",n:highBraden,col:"#7c3aed"},{icon:"🩺",lbl:"Active Wounds",n:activeWounds,col:"#ef4444"},{icon:"🩹",lbl:"Severe Pain ≥7",n:highPain,col:"#f59e0b"},{icon:"🥗",lbl:"MUST High",n:highNutr,col:"#10b981"},{icon:"🧠",lbl:"Mod/Sev Cog.",n:modCog,col:"#06b6d4"}].forEach(f=>{h+=`<div class="cfc"><div style="font-size:16px">${f.icon}</div><div style="font-size:20px;font-weight:800;color:${f.col}">${f.n}</div><div style="font-size:9px;color:#64748b;margin-top:2px">${f.lbl}</div></div>`;});
    h+=`</div></div>`;

    // Medication safety + Notes activity
    h+=`<div class="two"><div class="sb"><div class="sl">Medication Safety</div><div class="fr"><span>Polypharmacy (5+ meds)</span><span class="fn" style="color:#ca8a04">${polyClients.length}</span></div><div class="fr"><span>Rate</span><span class="fn">${all.length>0?Math.round((polyClients.length/all.length)*100):0}%</span></div></div>`;
    h+=`<div class="sb"><div class="sl">Notes Activity — ${monthName} ${year}</div><div class="fr"><span>Total notes written</span><span class="fn">${totalNotes}</span></div><div class="fr"><span>Clients with notes</span><span class="fn">${clientsWithNotes}</span></div>`;
    if(topStaff.length>0){h+=`<div style="margin-top:6px;font-size:9px;color:#64748b;font-weight:700">Top staff:</div>`;topStaff.forEach(([st,n])=>{h+=`<div class="fr"><span>${st}</span><span style="font-size:11px;font-weight:700">${n}</span></div>`;});}
    h+=`</div></div>`;

    h+=`<div class="footer">CONFIDENTIAL — GoldenCare System &nbsp;·&nbsp; ${he(companyName)} &nbsp;·&nbsp; Census Report ${he(monthName)} ${he(year)} &nbsp;·&nbsp; Generated ${he(generatedOn)}</div></div></body></html>`;
    openPrint(h);
    logAudit?.("Generated Census PDF","",{section:"Reports",details:`Census report — ${monthName} ${year} — ${all.length} clients`});
    setGenerating(false);
    },0); // end setTimeout — allows "Generating PDF…" state to paint before CPU work begins
  };

  const REPORTS=[
    {id:"monthly",icon:"📋",title:"Monthly Client Summary",desc:"Complete clinical summary for one client — notes, vitals, meds, appointments, incidents, care plan, and clinical scores.",col:"#6366f1"},
    {id:"mar",    icon:"💊",title:"Medication Administration Record",desc:"Pre-printed blank MAR for bedside use — one row per medication per timing slot, 31-day grid, landscape A4.",col:"#ef4444"},
    {id:"census", icon:"📊",title:"Census Report",desc:"Company-wide snapshot — client counts, age/fall risk distribution, top diagnoses, clinical flags, medication safety.",col:"#10b981"},
  ];
  const needsClient=report==="monthly"||report==="mar";
  const canGenerate=!!report&&(report==="census"||(needsClient&&clientId))&&!generating;
  const activeCol=REPORTS.find(r=>r.id===report)?.col||"#6366f1";
  const MONTHS=MONTH_NAMES;

  return(
    <div style={{maxWidth:780,margin:"0 auto"}}>
      <div style={{fontSize:22,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.5px",marginBottom:4}}>Reports & Exports</div>
      <div style={{fontSize:13,color:"var(--color-text-dim)",marginBottom:28}}>Generate PDF reports for clinical review, compliance, and operational planning.</div>

      {/* Report type selector */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:28}} className="g4">
        {REPORTS.map(r=>(
          <div key={r.id} onClick={()=>{setReport(r.id);setClientId("");}}
            style={{background:"var(--color-bg-card)",border:"2px solid "+(report===r.id?r.col:"rgba(255,255,255,0.1)"),borderRadius:14,padding:"18px 16px",cursor:"pointer",transition:"border-color .2s",boxShadow:report===r.id?`0 0 0 1px ${r.col}35`:"6px 6px 14px rgba(0,0,0,.45),-3px -3px 8px rgba(255,255,255,.04)"}}>
            <div style={{fontSize:28,marginBottom:8}}>{r.icon}</div>
            <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:5}}>{r.title}</div>
            <div style={{fontSize:11,color:"var(--color-text-dim)",lineHeight:1.5}}>{r.desc}</div>
          </div>
        ))}
      </div>

      {report&&(
        <div style={{background:"var(--color-bg-card)",border:"1px solid "+activeCol+"55",borderRadius:14,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}>
          <div style={{fontWeight:700,color:"var(--color-text-primary)",fontSize:15,marginBottom:18}}>
            {REPORTS.find(r=>r.id===report)?.icon} Configure: {REPORTS.find(r=>r.id===report)?.title}
          </div>
          <div style={{display:"grid",gridTemplateColumns:needsClient?"1fr 1fr 1fr":"1fr 1fr",gap:12,marginBottom:16}}>
            <div>
              <label style={LBL}>Month</label>
              <select style={INP} value={month} onChange={e=>setMonth(Number(e.target.value))}>
                {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Year</label>
              <select style={INP} value={year} onChange={e=>setYear(Number(e.target.value))}>
                {[now.getFullYear(),now.getFullYear()-1,now.getFullYear()-2].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {needsClient&&(
              <div>
                <label style={LBL}>Client *</label>
                <select style={INP} value={clientId} onChange={e=>setClientId(e.target.value)}>
                  <option value="">— Select client —</option>
                  {activeClients.sort((a,b)=>a.name.localeCompare(b.name)).map(c=>(
                    <option key={c.id} value={c.id}>{c.name}{c.room_or_address?" ("+c.room_or_address+")":""}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Info banner */}
          <div style={{background:activeCol+"12",border:"1px solid "+activeCol+"30",borderRadius:8,padding:"10px 14px",marginBottom:18,fontSize:12,color:"#cdd5e0"}}>
            {report==="monthly"&&<>📋 Covers all data from <strong>{MONTHS[month-1]} {year}</strong>: session notes, vitals, appointments, incidents — plus current medications, diagnoses, care plan, and all clinical scores.</>}
            {report==="mar"&&<>💊 Blank MAR for <strong>{MONTHS[month-1]} {year}</strong> ({daysInMonth} days). Prints landscape A4. Staff initial each cell after administering; circle if dose withheld.</>}
            {report==="census"&&<>📊 Snapshot of all <strong>{clients.filter(c=>!c.archived).length} clients</strong> on file. Note activity is counted for <strong>{MONTHS[month-1]} {year}</strong>.</>}
          </div>

          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button onClick={report==="monthly"?genMonthly:report==="mar"?genMAR:genCensus} disabled={!canGenerate}
              style={{padding:"12px 28px",borderRadius:10,border:"none",background:canGenerate?activeCol:"rgba(255,255,255,0.1)",color:canGenerate?"#fff":"rgba(240,242,250,0.3)",fontWeight:700,fontSize:14,cursor:canGenerate?"pointer":"not-allowed",transition:"background .2s"}}>
              {generating?"Generating PDF…":report==="monthly"?"📋 Generate Summary PDF":report==="mar"?"💊 Print MAR":"📊 Generate Census PDF"}
            </button>
            {needsClient&&!clientId&&<span style={{fontSize:12,color:"var(--color-text-dim)"}}>← Select a client to continue</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function UserProfile({currentUser,onUpdate,onClose,t}){
  const [tab,setTab]=useState("profile"); // profile | password | history | sessions
  const [form,setForm]=useState({displayName:currentUser.displayName||"",username:currentUser.username||""});
  const [pwForm,setPwForm]=useState({newPw:"",confirm:""});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState(null);
  const [uploading,setUploading]=useState(false);
  const [loginHistory,setLoginHistory]=useState([]);
  const [sessions,setSessions]=useState([]);

  useEffect(()=>{loadHistory();},[currentUser.id]);

  const loadHistory=async()=>{
    // Use maybeSingle + order to safely handle multi-company users (multiple rows)
    const {data}=await supabase.from("user_roles").select("login_history").eq("user_id",currentUser.id).not("login_history","is",null).order("company_id").limit(1).maybeSingle();
    setLoginHistory(data?.login_history||[]);
  };

  const saveProfile=async()=>{
    if(!form.displayName.trim()){setMsg({type:"error",text:"Display name required"});return;}
    setSaving(true);setMsg(null);
    // Check username uniqueness
    if(form.username){
      const {data:existing}=await supabase.from("user_roles").select("user_id").eq("username",form.username.toLowerCase()).neq("user_id",currentUser.id);
      if(existing?.length>0){setMsg({type:"error",text:"Username already taken"});setSaving(false);return;}
    }
    const {error}=await supabase.from("user_roles").update({
      name:form.displayName.trim(),
      username:form.username?form.username.toLowerCase().trim():null,
    }).eq("user_id",currentUser.id); // update all company rows so name is consistent
    if(error){setMsg({type:"error",text:error.message});}
    else{
      setMsg({type:"success",text:"Profile updated!"});
      onUpdate({...currentUser,displayName:form.displayName.trim(),username:form.username.toLowerCase().trim()});
    }
    setSaving(false);
  };

  const uploadAvatar=async(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>2*1024*1024){setMsg({type:"error",text:"Max file size is 2MB"});return;}
    setUploading(true);setMsg(null);
    const ext=file.name.split(".").pop();
    const path=`${currentUser.id}/avatar.${ext}`;
    const {error:upErr}=await supabase.storage.from("avatars").upload(path,file,{upsert:true});
    if(upErr){setMsg({type:"error",text:upErr.message});setUploading(false);return;}
    const {data:{publicUrl}}=supabase.storage.from("avatars").getPublicUrl(path);
    const {error:dbErr}=await supabase.from("user_roles").update({avatar_url:publicUrl}).eq("user_id",currentUser.id).eq("company_id",currentUser.company_id);
    if(dbErr){setMsg({type:"error",text:dbErr.message});}
    else{
      setMsg({type:"success",text:"Photo updated!"});
      onUpdate({...currentUser,avatar_url:publicUrl});
    }
    setUploading(false);
  };

  const changePassword=async()=>{
    if(!pwForm.newPw||!pwForm.confirm){setMsg({type:"error",text:"Fill in all fields"});return;}
    if(pwForm.newPw!==pwForm.confirm){setMsg({type:"error",text:"Passwords don't match"});return;}
    if(pwForm.newPw.length<10){setMsg({type:"error",text:"Password must be at least 10 characters"});return;}
    if(scorePassword(pwForm.newPw)<2){setMsg({type:"error",text:"Password is too weak — add uppercase letters, numbers, or symbols"});return;}
    setSaving(true);setMsg(null);
    const {error}=await supabase.auth.updateUser({password:pwForm.newPw});
    if(error){setMsg({type:"error",text:error.message});}
    else{setMsg({type:"success",text:"Password changed!"});setPwForm({newPw:"",confirm:""});}
    setSaving(false);
  };

  const signOutAll=async()=>{
    await supabase.auth.signOut({scope:"global"});
    window.location.reload();
  };

  const TABS=[
    {id:"profile",label:"👤 Profile"},
    {id:"password",label:"🔑 Password"},
    {id:"history",label:"📋 Login History"},
    {id:"sessions",label:"📱 Sessions"},
  ];

  const INP3={background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:8,padding:"10px 14px",color:"var(--color-text-primary)",fontSize:14,width:"100%"};
  const LB={fontSize:12,color:"var(--color-text-secondary)",fontWeight:600,marginBottom:4,display:"block"};

  return(
    <div style={{maxWidth:640,margin:"0 auto",padding:"24px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div style={{fontSize:20,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.4px"}}>My Profile</div>
        <button onClick={onClose} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"6px 14px",color:"var(--color-text-secondary)",fontSize:13,fontWeight:600}}>← Back</button>
      </div>

      {msg&&<div style={{padding:"10px 14px",borderRadius:8,marginBottom:16,background:msg.type==="error"?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)",border:`1px solid ${msg.type==="error"?"#ef4444":"#22c55e"}`,color:msg.type==="error"?"#ef4444":"#22c55e",fontSize:13}}>{msg.text}</div>}

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,background:"var(--color-bg-card)",borderRadius:10,padding:4}}>
        {TABS.map(tb=>(
          <button key={tb.id} onClick={()=>{setTab(tb.id);setMsg(null);}}
            style={{flex:1,padding:"7px 4px",borderRadius:7,border:"none",background:tab===tb.id?"var(--color-accent)":"transparent",color:tab===tb.id?"#fff":"var(--color-text-secondary)",fontWeight:600,fontSize:12,cursor:"pointer"}}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab==="profile"&&(
        <div style={{background:"var(--color-bg-card)",borderRadius:12,padding:24,border:"1px solid rgba(255,255,255,0.08)"}}>
          {/* Avatar */}
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
            <div style={{position:"relative"}}>
              {currentUser.avatar_url?
                <img src={currentUser.avatar_url} alt="avatar" style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",border:"3px solid var(--color-accent)"}}/>:
                <div style={{width:72,height:72,borderRadius:"50%",background:"var(--color-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:700,color:"#fff"}}>{(currentUser.displayName||"?")[0].toUpperCase()}</div>
              }
            </div>
            <div>
              <label style={{background:"var(--color-accent)",border:"none",borderRadius:8,padding:"7px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-block"}}>
                {uploading?"Uploading...":"📷 Change Photo"}
                <input type="file" accept="image/*" onChange={uploadAvatar} style={{display:"none"}} disabled={uploading}/>
              </label>
              <div style={{fontSize:11,color:"var(--color-text-dim)",marginTop:4}}>Max 2MB · JPG, PNG, GIF</div>
            </div>
          </div>
          {/* Form */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={LB}>Display Name *</label>
              <input style={INP3} value={form.displayName} onChange={e=>setForm(f=>({...f,displayName:e.target.value}))} placeholder="Your full name"/>
            </div>
            <div>
              <label style={LB}>Username <span style={{color:"var(--color-text-muted)"}}>(optional — used for login)</span></label>
              <input style={INP3} value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="e.g. maria_j"/>
            </div>
            <div>
              <label style={LB}>Email</label>
              <input style={{...INP3,opacity:0.5}} value={currentUser.email} disabled/>
            </div>
            <div>
              <label style={LB}>Role</label>
              <input style={{...INP3,opacity:0.5}} value={currentUser.role} disabled/>
            </div>
            <button onClick={saveProfile} disabled={saving} style={{background:"var(--color-accent)",border:"none",borderRadius:8,padding:"10px",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4}}>
              {saving?"Saving...":"Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {tab==="password"&&(
        <div style={{background:"var(--color-bg-card)",borderRadius:12,padding:24,border:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={LB}>New Password</label>
              <input type="password" style={INP3} value={pwForm.newPw} onChange={e=>setPwForm(f=>({...f,newPw:e.target.value}))} placeholder="Min. 10 characters"/>
              <PasswordStrengthMeter password={pwForm.newPw}/>
            </div>
            <div>
              <label style={LB}>Confirm New Password</label>
              <input type="password" style={INP3} value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))} placeholder="Repeat new password"/>
              {pwForm.confirm&&pwForm.newPw&&pwForm.confirm!==pwForm.newPw&&(
                <div style={{fontSize:11,color:"#ef4444",marginTop:5}}>⚠ Passwords do not match</div>
              )}
            </div>
            <button onClick={changePassword} disabled={saving||scorePassword(pwForm.newPw)<2||pwForm.newPw!==pwForm.confirm}
              style={{background:"#6366f1",border:"none",borderRadius:8,padding:"10px",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4,opacity:(saving||scorePassword(pwForm.newPw)<2||pwForm.newPw!==pwForm.confirm)?0.45:1}}>
              {saving?"Changing...":"Change Password"}
            </button>
          </div>
        </div>
      )}

      {/* Login History Tab */}
      {tab==="history"&&(
        <div style={{background:"var(--color-bg-card)",borderRadius:12,padding:24,border:"1px solid rgba(255,255,255,0.08)"}}>
          {loginHistory.length===0?
            <div style={{color:"var(--color-text-muted)",textAlign:"center",padding:"24px 0"}}>No login history yet</div>:
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {loginHistory.map((h,i)=>(
                <div key={i} style={{background:"var(--color-bg-hover)",borderRadius:8,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.08)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{color:"#22c55e",fontSize:13,fontWeight:600}}>✓ Login</span>
                    <span style={{color:"var(--color-text-muted)",fontSize:12}}>{new Date(h.at).toLocaleString()}</span>
                  </div>
                  <div style={{fontSize:12,color:"var(--color-text-dim)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.device}</div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* Sessions Tab */}
      {tab==="sessions"&&(
        <div style={{background:"var(--color-bg-card)",borderRadius:12,padding:24,border:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{background:"var(--color-bg-hover)",borderRadius:8,padding:"14px",border:"1px solid #22c55e",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{color:"#22c55e",fontWeight:600,fontSize:13}}>● Current Session</div>
                <div style={{color:"var(--color-text-dim)",fontSize:12,marginTop:2}}>{navigator.userAgent.slice(0,60)}...</div>
              </div>
              <span style={{background:"rgba(34,197,94,0.1)",border:"1px solid #22c55e",borderRadius:6,padding:"2px 8px",color:"#22c55e",fontSize:11,fontWeight:600}}>Active</span>
            </div>
          </div>
          <button onClick={signOutAll} style={{width:"100%",background:"rgba(239,68,68,0.1)",border:"1px solid #ef4444",borderRadius:8,padding:"10px",color:"#ef4444",fontWeight:700,fontSize:14,cursor:"pointer"}}>
            🚪 Sign Out All Devices
          </button>
          <div style={{fontSize:11,color:"var(--color-text-muted)",textAlign:"center",marginTop:8}}>This will sign you out everywhere immediately</div>
        </div>
      )}
    </div>
  );
}

function ForcePasswordChange({currentUser,onDone}){
  const [pw,setPw]=useState("");
  const [confirm,setConfirm]=useState("");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState(null);
  const score=scorePassword(pw);
  const canSubmit=pw.length>=10&&score>=2&&pw===confirm&&!saving;

  const handle=async()=>{
    if(!canSubmit)return;
    if(pw!==confirm){setError("Passwords don't match");return;}
    setSaving(true);setError(null);
    // Update password AND clear the flag atomically via updateUser
    const {data,error:err}=await supabase.auth.updateUser({
      password:pw,
      data:{force_password_change:false},
    });
    if(err){setError(err.message);setSaving(false);return;}
    // Refresh session so currentUser reflects cleared flag
    const {data:{session}}=await supabase.auth.getSession();
    if(session)onDone(session.user);
    setSaving(false);
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:9998,background:"var(--color-bg-card)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:420}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:"0 8px 20px rgba(99,102,241,0.35)"}}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x={3} y={11} width={18} height={11} rx={2} ry={2}/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div style={{fontSize:22,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.5px",marginBottom:6}}>Set your password</div>
          <div style={{fontSize:13,color:"var(--color-text-dim)",lineHeight:1.6}}>
            Welcome, <strong style={{color:"var(--color-text-secondary)"}}>{currentUser.displayName||currentUser.email}</strong>.<br/>
            Your account was created with a temporary password.<br/>
            Please choose a new password before continuing.
          </div>
        </div>
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,padding:28}}>
          {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,color:"#ef4444",fontSize:13}}>{error}</div>}
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:"var(--color-text-dim)",marginBottom:4,letterSpacing:0.5,textTransform:"uppercase"}}>New Password</label>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
              placeholder="Min. 10 characters"
              style={{width:"100%",padding:"11px 14px",borderRadius:8,border:"1.5px solid rgba(255,255,255,0.1)",background:"var(--color-bg-hover)",color:"var(--color-text-primary)",fontSize:14}}
              onKeyDown={e=>e.key==="Enter"&&document.getElementById("fpc-confirm")?.focus()}/>
            <PasswordStrengthMeter password={pw}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:"var(--color-text-dim)",marginBottom:4,letterSpacing:0.5,textTransform:"uppercase"}}>Confirm Password</label>
            <input id="fpc-confirm" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
              placeholder="Repeat new password"
              style={{width:"100%",padding:"11px 14px",borderRadius:8,border:"1.5px solid "+(confirm&&pw&&confirm!==pw?"#ef4444":"rgba(255,255,255,0.1)"),background:"var(--color-bg-hover)",color:"var(--color-text-primary)",fontSize:14}}
              onKeyDown={e=>e.key==="Enter"&&handle()}/>
            {confirm&&pw&&confirm!==pw&&<div style={{fontSize:11,color:"#ef4444",marginTop:5}}>⚠ Passwords do not match</div>}
          </div>
          <button onClick={handle} disabled={!canSubmit}
            style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:canSubmit?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.08)",color:canSubmit?"#fff":"rgba(240,242,250,0.3)",fontWeight:700,fontSize:15,cursor:canSubmit?"pointer":"not-allowed",boxShadow:canSubmit?"0 4px 14px rgba(99,102,241,0.35)":"none",transition:"background 0.2s"}}>
            {saving?"Setting password…":"Set Password & Continue →"}
          </button>
          <div style={{textAlign:"center",marginTop:14}}>
            <button onClick={async()=>{await supabase.auth.signOut();window.location.reload();}}
              style={{background:"none",border:"none",color:"var(--color-text-muted)",fontSize:12,cursor:"pointer",textDecoration:"underline"}}>
              Sign out instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionTimeoutModal({countdown,onStayLoggedIn,onLogoutNow}){
  const pct=Math.round((countdown/IDLE_WARN_SECS)*100);
  const col=countdown<=10?"#ef4444":countdown<=30?"#f59e0b":"#06b6d4";
  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div style={{background:"var(--color-bg-card)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:"36px 40px",maxWidth:400,width:"90%",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}}>
        {/* Countdown ring */}
        <div style={{position:"relative",width:96,height:96,margin:"0 auto 20px"}}>
          <svg width={96} height={96} style={{transform:"rotate(-90deg)"}}>
            <circle cx={48} cy={48} r={42} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8}/>
            <circle cx={48} cy={48} r={42} fill="none" stroke={col} strokeWidth={8}
              strokeDasharray={2*Math.PI*42}
              strokeDashoffset={2*Math.PI*42*(1-pct/100)}
              strokeLinecap="round"
              style={{transition:"stroke-dashoffset 1s linear, stroke 0.3s"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:26,color:col}}>{countdown}</div>
        </div>
        <div style={{fontSize:20,fontWeight:700,color:"var(--color-text-primary)",marginBottom:8}}>Still there?</div>
        <div style={{fontSize:13,color:"var(--color-text-dim)",marginBottom:28,lineHeight:1.6}}>
          You've been inactive for 30 minutes.<br/>
          You'll be signed out automatically in <strong style={{color:col}}>{countdown} second{countdown!==1?"s":""}</strong>.
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <button onClick={onLogoutNow}
            style={{padding:"10px 20px",borderRadius:9,border:"1px solid #475569",background:"transparent",color:"var(--color-text-secondary)",fontWeight:600,fontSize:13,cursor:"pointer"}}>
            Sign out now
          </button>
          <button onClick={onStayLoggedIn}
            style={{padding:"10px 24px",borderRadius:9,border:"none",background:"#6366f1",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
            Stay logged in
          </button>
        </div>
      </div>
    </div>
  );
}

// ── URL hash routing helpers ───────────────────────────────────────────────
// Hash scheme: #dashboard | #clients | #clients/{id} | #clients/{id}/edit
//              #add | #audit | #reports | #company | #profile
//              #users | #permissions | #incidents | #medications
const ROUTABLE_VIEWS=['audit','reports','company','profile','users','permissions','incidents','medications','add'];
function parseHash(hash){
  const h=(hash||'').replace(/^#\/?/,'');
  const [seg0,seg1,seg2]=h.split('/');
  if(!seg0||seg0==='dashboard')return{view:'dashboard',clientId:null};
  if(seg0==='clients'){
    if(seg1&&seg2==='edit')return{view:'edit',clientId:seg1};
    if(seg1)return{view:'detail',clientId:seg1};
    return{view:'clients',clientId:null};
  }
  if(ROUTABLE_VIEWS.includes(seg0))return{view:seg0,clientId:null};
  return{view:'dashboard',clientId:null};
}
function viewToHash(view,clientId){
  if(view==='detail'&&clientId)return`#clients/${clientId}`;
  if(view==='edit'&&clientId)return`#clients/${clientId}/edit`;
  if(view==='dashboard')return'#dashboard';
  return`#${view}`;
}

export default function App(){
  const [lang,setLang]=useState(()=>localStorage.getItem("cm-lang")||null);
  const [currentUser,setCurrentUser]=useState(null);
  const [authChecked,setAuthChecked]=useState(false);
  const [clients,setClients]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState(null);
  const [view,setView]=useState("dashboard");
  const [selected,setSelected]=useState(null);
  const [search,setSearch]=useState("");
  const [searchMode,setSearchMode]=useState("clients");
  const [statusFilter,setStatusFilter]=useState("Active");
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [deleteConfirm,setDeleteConfirm]=useState(false);
  const [company,setCompany]=useState(null);
  const [companySaving,setCompanySaving]=useState(false);
  const [selectedCompany,setSelectedCompany]=useState(null); // for superadmin switching
  const [searchAllCompanies,setSearchAllCompanies]=useState(false);
  const [companiesMap,setCompaniesMap]=useState({});
  const [bulkMode,setBulkMode]=useState(false);
  const [bulkSelected,setBulkSelected]=useState(new Set());
  const [clientFilter,setClientFilter]=useState("all"); // all|hfr|mfr|lfr|archived
  const [darkMode,setDarkMode]=useState(()=>localStorage.getItem("cm-dark")!=="false");
  const [notifOpen,setNotifOpen]=useState(false);
  const [readNotifIds,setReadNotifIds]=useState(new Set());
  const [showShortcuts,setShowShortcuts]=useState(false);
  const [readmissionFilter,setReadmissionFilter]=useState("All");
  const [apptFilter,setApptFilter]=useState("all");
  const [recentClients,setRecentClients]=useState([]);
  const [emailPrefs,setEmailPrefs]=useState(()=>{try{return JSON.parse(localStorage.getItem("cm-email-prefs")||"{}") ;}catch{return {};}});
  const [appMsg,setAppMsg]=useState(null); // {type:"success"|"error", text:string}
  const showAppMsg=(type,text)=>{setAppMsg({type,text});setTimeout(()=>setAppMsg(null),3200);};
  const [editPresence,setEditPresence]=useState({}); // clientId → [{userId,userName,avatar}]
  // ── Permissions (React context) ──────────────────────────────────────────────
  const [perms,setPerms]=useState(null);
  const refreshPerms=useCallback(async(companyId)=>{
    const p=await loadPermissions(companyId); // also syncs LOADED_PERMS module var
    setPerms(p);
  },[]);
  // ── Session timeout ──────────────────────────────────────────────────────────
  const [idleWarning,setIdleWarning]=useState(false);
  const [idleCountdown,setIdleCountdown]=useState(IDLE_WARN_SECS);
  const lastActivityRef=useRef(Date.now());

  const t=T[lang]||T["en"];
  const selectLang=code=>{localStorage.setItem("cm-lang",code);setLang(code);};

  const activeCompanyKey=selectedCompany||currentUser?.company_id||"default";
  const recentKey=`cm-recent-${activeCompanyKey}`;
  const notifKey=`cm-notifs-${activeCompanyKey}`;

  useEffect(()=>{
    try{setRecentClients(JSON.parse(localStorage.getItem(recentKey)||"[]"));}catch{setRecentClients([]);}
  },[recentKey]);

  useEffect(()=>{
    try{setReadNotifIds(new Set(JSON.parse(localStorage.getItem(notifKey)||"[]")));}catch{setReadNotifIds(new Set());}
  },[notifKey]);

  const trackRecent=useCallback((c)=>{
    if(!c)return;
    setRecentClients(prev=>{
      const next=[{id:c.id,name:c.name,photo_url:c.photo_url||null},...prev.filter(x=>x.id!==c.id)].slice(0,5);
      localStorage.setItem(recentKey,JSON.stringify(next));
      return next;
    });
  },[recentKey]);

  useEffect(()=>{
    document.documentElement.classList.toggle("cm-light",!darkMode);
    localStorage.setItem("cm-dark",String(darkMode));
  },[darkMode]);

  useEffect(()=>{
    if(!currentUser)return;
    const handler=e=>{
      if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.tagName==="SELECT")return;
      if(e.key==="?"||e.key==="."){setShowShortcuts(s=>!s);e.preventDefault();}
      else if(e.key==="Escape"){setShowShortcuts(false);setNotifOpen(false);setSidebarOpen(false);}
      else if(e.key==="d"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){setView("dashboard");setSelected(null);}
      else if(e.key==="n"&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&can(currentUser.role,"add",perms)){setSelected(null);setView("add");}
      // Use setView's functional form to read current view without a stale closure
      else if(e.key==="k"&&!e.ctrlKey&&!e.metaKey){e.preventDefault();setView(v=>{if(v!=="clients"){setSelected(null);setTimeout(()=>document.getElementById("cm-search")?.focus(),80);return"clients";}document.getElementById("cm-search")?.focus();return v;});}
      else if(e.key==="b"&&!e.ctrlKey&&!e.metaKey){setNotifOpen(s=>!s);}
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[currentUser]);

  // ── Inactivity / session timeout ─────────────────────────────────────────────
  useEffect(()=>{
    if(!currentUser)return;
    const resetActivity=()=>{lastActivityRef.current=Date.now();};
    const EVENTS=["mousemove","mousedown","keydown","touchstart","scroll"];
    EVENTS.forEach(ev=>window.addEventListener(ev,resetActivity,{passive:true}));
    // Poll every 20s — lightweight check
    const poll=setInterval(()=>{
      const idle=Date.now()-lastActivityRef.current;
      if(idle>=IDLE_TIMEOUT_MS&&!idleWarning){setIdleWarning(true);setIdleCountdown(IDLE_WARN_SECS);}
    },20000);
    return()=>{
      EVENTS.forEach(ev=>window.removeEventListener(ev,resetActivity));
      clearInterval(poll);
    };
  },[currentUser,idleWarning]);

  // Countdown tick while warning is showing
  useEffect(()=>{
    if(!idleWarning)return;
    if(idleCountdown<=0){handleLogout();return;}
    const t=setTimeout(()=>setIdleCountdown(n=>n-1),1000);
    return()=>clearTimeout(t);
  },[idleWarning,idleCountdown]);

  const stayLoggedIn=useCallback(async()=>{
    lastActivityRef.current=Date.now();
    setIdleWarning(false);
    setIdleCountdown(IDLE_WARN_SECS);
    await supabase.auth.getSession(); // ensure token is fresh
  },[]);

  const ROLE_PRIORITY={superadmin:1,admin:2,power_user:3,user:4,inactive:5};
  const pickTopRole=(roles)=>(roles||[]).slice().sort((a,b)=>(ROLE_PRIORITY[a.role]||9)-(ROLE_PRIORITY[b.role]||9))[0];

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session){
        const {data:roles}=await supabase.from("user_roles").select("*").eq("user_id",session.user.id);
        const rd=pickTopRole(roles);
        setCurrentUser({...session.user,role:rd?.role||"user",displayName:rd?.name||session.user.email.split("@")[0],company_id:rd?.company_id||null,allRoles:roles||[],avatar_url:rd?.avatar_url||null,username:rd?.username||null,force_password_change:session.user.user_metadata?.force_password_change===true});
      }
      setAuthChecked(true);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{if(!session)setCurrentUser(null);});
    return()=>subscription.unsubscribe();
  },[]);

  const refreshCurrentUser=useCallback(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(session){
      const {data:roles}=await supabase.from("user_roles").select("*").eq("user_id",session.user.id);
      const rd=pickTopRole(roles);
      setCurrentUser({...session.user,role:rd?.role||"user",displayName:rd?.name||session.user.email.split("@")[0],company_id:rd?.company_id||null,allRoles:roles||[],avatar_url:rd?.avatar_url||null,username:rd?.username||null,force_password_change:session.user.user_metadata?.force_password_change===true});
    }
  },[]);

  const loadClients=useCallback(async()=>{
    setLoading(true);
    const cid=selectedCompany||currentUser?.company_id;
    const isSuperAdmin=currentUser?.role==="superadmin";
    // Omit heavy clinical JSONB fields from the list load — they are lazy-fetched in detail view
    const LIST_COLS="id,name,date_of_birth,status,photo_url,company_id,archived,diagnoses,medications,allergies,documents,appointments,incidents,intake_checklist,vitals,care_plan,inventory,family_contacts";
    const q=supabase.from("clients").select(LIST_COLS).order("name");
    const {data,error:err}=(isSuperAdmin&&searchAllCompanies)?await q:(cid?await q.eq("company_id",cid):await q);
    if(err)setError(err.message);else setClients((data||[]).map(fromDb));
    // Build company name map for cross-company display
    if(isSuperAdmin){
      const {data:cos}=await supabase.from("companies").select("id,name");
      const m={};(cos||[]).forEach(c=>m[c.id]=c.name);
      setCompaniesMap(m);
    }
    setLoading(false);
  },[currentUser,selectedCompany,searchAllCompanies]);

  // Lazy-fetch full clinical detail for a single client (session_notes + clinical assessments)
  const loadClientDetail=useCallback(async(clientId)=>{
    const {data,error}=await supabase.from("clients").select("*").eq("id",clientId).single();
    if(error||!data)return;
    const full={...fromDb(data),_detailLoaded:true};
    setClients(prev=>prev.map(c=>c.id===clientId?full:c));
    setSelected(prev=>prev?.id===clientId?full:prev);
  },[]);

  const loadCompany=useCallback(async()=>{
    if(!currentUser)return;
    const cid=selectedCompany||currentUser.company_id;
    if(!cid)return;
    const {data}=await supabase.from("companies").select("*").eq("id",cid).single();
    if(data)setCompany(data);
  },[currentUser,selectedCompany]);

  useEffect(()=>{if(currentUser){loadClients();loadCompany();refreshPerms(activeCompanyId);}},[currentUser,selectedCompany,searchAllCompanies,loadClients,loadCompany,refreshPerms]);

  // ── Supabase Realtime — auto-refresh clients when DB changes ──────────────
  useEffect(()=>{
    if(!currentUser)return;
    const channel=supabase.channel("realtime-clients")
      .on("postgres_changes",{event:"*",schema:"public",table:"clients"},()=>{
        loadClients();
      })
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[currentUser,loadClients]);

  // ── Realtime Presence — track who is editing which client ─────────────────
  const presenceChRef=useRef(null);
  useEffect(()=>{
    if(!currentUser)return;
    const ch=supabase.channel("cm-edit-presence",{config:{presence:{key:currentUser.id}}});
    presenceChRef.current=ch;
    ch.on("presence",{event:"sync"},()=>{
      const state=ch.presenceState();
      const map={};
      Object.values(state).forEach(presences=>{
        presences.forEach(p=>{
          if(!p.clientId)return;
          if(!map[p.clientId])map[p.clientId]=[];
          map[p.clientId].push({userId:p.userId,userName:p.userName,avatar:p.avatar||null});
        });
      });
      setEditPresence(map);
    }).subscribe();
    return()=>{supabase.removeChannel(ch);presenceChRef.current=null;};
  },[currentUser]);

  useEffect(()=>{
    const ch=presenceChRef.current;
    if(!ch||!currentUser)return;
    if(view==="edit"&&selected?.id){
      ch.track({userId:currentUser.id,userName:currentUser.name||currentUser.email,avatar:currentUser.avatar_url||null,clientId:selected.id});
    } else {
      ch.untrack();
    }
  },[currentUser,view,selected?.id]);

  // Lazy-load full clinical detail when opening a client detail view
  useEffect(()=>{
    if(view==="detail"&&selected?.id&&!selected._detailLoaded){
      loadClientDetail(selected.id);
    }
  },[view,selected?.id,selected?._detailLoaded,loadClientDetail]);

  // ── URL hash routing ───────────────────────────────────────────────────────
  const initialHashApplied=useRef(false);

  // Write: view+selected → hash (push a history entry on every navigation)
  useEffect(()=>{
    if(!currentUser)return;
    const hash=viewToHash(view,selected?.id);
    if(window.location.hash!==hash)history.pushState(null,'',hash);
  },[view,selected?.id,currentUser]);

  // Read: popstate (back/forward button) → view+selected
  // Also applies the initial URL hash once, after login + clients have loaded
  useEffect(()=>{
    if(!currentUser||loading)return;
    const applyHash=h=>{
      const{view:v,clientId}=parseHash(h);
      setView(v);
      if(clientId){
        const c=clients.find(x=>x.id===clientId);
        setSelected(c||{id:clientId}); // partial obj — lazy-loader fills it in
      }else{
        setSelected(null);
      }
    };
    // One-shot: honour the URL the user arrived at (direct link / page refresh)
    if(!initialHashApplied.current){
      initialHashApplied.current=true;
      const{view:v,clientId}=parseHash(window.location.hash);
      if(v!=='dashboard'||clientId)applyHash(window.location.hash);
    }
    const onPop=()=>applyHash(window.location.hash);
    window.addEventListener('popstate',onPop);
    return()=>window.removeEventListener('popstate',onPop);
  },[currentUser,loading,clients]); // clients in deps so onPop closure has fresh list

  const activeCompanyId=selectedCompany||currentUser?.company_id;

  const logAudit=async(action,clientName,{details="",clientId=null,section=""}={})=>{
    if(!currentUser)return;
    const payload={
      action,
      client_name:clientName||"",
      // performed_by stores display name for human-readable audit views;
      // performed_by_id stores the immutable auth user ID for integrity.
      performed_by:currentUser.displayName||currentUser.email,
      performed_by_id:currentUser.id||null,
      performed_role:currentUser.role||"",
      company_id:activeCompanyId||null,
      details:details||"",
      client_id:clientId||null,
      section:section||"",
      device:navigator.userAgent.slice(0,220),
    };
    const {error}=await supabase.from("audit_log").insert(payload);
    if(error)console.error("Audit insert failed:",error.message);
  };

  const saveClient=async data=>{
    setSaving(true);setError(null);
    const exists=clients.find(c=>c.id===data.id);
    const row={...toDb(data),company_id:activeCompanyId||null};
    const {error:err}=exists?await supabase.from("clients").update(row).eq("id",data.id):await supabase.from("clients").insert(row);
    if(err){setError(err.message);setSaving(false);return;}
    await logAudit(exists?"Edited client":"Added new client",data.name,{clientId:data.id,section:"Client Profile",details:exists?`Updated client record`:`New client added — DOB: ${data.date_of_birth||"—"}, Status: ${data.status||"Active"}`});
    await loadClients();
    setSelected(data);setView("detail");setSaving(false);trackRecent(data);
  };

  const archiveClient=async()=>{
    const {error:err}=await supabase.from("clients").update({archived:true}).eq("id",selected.id);
    if(err){setError(err.message);return;}
    await logAudit("Archived client",selected.name,{clientId:selected.id,section:"Client Profile",details:"Client moved to archived state"});
    await loadClients();
    setSelected(null);setView("clients");setDeleteConfirm(false);
  };

  const restoreClient=async(client)=>{
    const {error:err}=await supabase.from("clients").update({archived:false}).eq("id",client.id);
    if(err){setError(err.message);return;}
    await logAudit("Restored client",client.name,{clientId:client.id,section:"Client Profile",details:"Client restored from archived state"});
    await loadClients();
    setSelected(null);setView("clients");
  };

  const inlineUpdate=async(field,value)=>{
    if(!selected)return;
    if(!can(currentUser?.role,"edit",perms)){setError("You do not have permission to edit client data");return;}
    const{error}=await supabase.from("clients").update({[field]:JSON.stringify(value)}).eq("id",selected.id);
    if(error){setError("Failed to save "+field+": "+error.message);return;}
    setClients(cs=>cs.map(c=>c.id===selected.id?{...c,[field]:value}:c));
    setSelected(s=>({...s,[field]:value}));
  };

  const [bulkArchiveConfirm,setBulkArchiveConfirm]=useState(false);
  const bulkArchive=async()=>{
    const ids=[...bulkSelected];
    const results=await Promise.allSettled(ids.map(id=>supabase.from("clients").update({archived:true}).eq("id",id)));
    const failed=results.filter(r=>r.status==="rejected"||r.value?.error);
    const succeeded=ids.length-failed.length;
    await logAudit("Bulk archived clients","",{section:"Client Profile",details:`${succeeded} client${succeeded!==1?"s":""} archived${failed.length>0?` (${failed.length} failed)`:""}`});
    await loadClients();
    setBulkSelected(new Set());setBulkMode(false);setBulkArchiveConfirm(false);
    if(failed.length)setError(`${failed.length} client${failed.length!==1?"s":""} failed to archive — rest were archived successfully.`);
  };

  const bulkExportCSV=()=>{
    const sel=filtered.filter(c=>bulkSelected.has(c.id));
    const esc=v=>`"${String(v==null?"":v).replace(/"/g,'""')}"`;
    const headers=["Name","Status","Date of Birth","Age","Room/Address","AZV Number","Diagnoses","Medications"];
    const rows=sel.map(c=>[c.name,c.status||"Active",c.date_of_birth||"",calcAge(c.date_of_birth)??(""),c.room_or_address||"",c.azv_number||"",(c.diagnoses||[]).filter(d=>d.value).map(d=>d.value).join("; "),(c.medications||[]).filter(m=>m.name).map(m=>m.name).join("; ")]);
    const csv=[headers,...rows].map(r=>r.map(esc).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="clients-selected.csv";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    logAudit("Exported client CSV (bulk)","",{section:"Clients",details:`Bulk CSV export — ${sel.length} client${sel.length!==1?"s":""} selected`});
  };

  const hardDeleteClient=async()=>{
    const {error:err}=await supabase.from("clients").delete().eq("id",selected.id);
    if(err){setError(err.message);return;}
    await logAudit("Permanently deleted client",selected.name,{section:"Client Profile",details:"Client record permanently removed from system"});
    setClients(c=>c.filter(x=>x.id!==selected.id));
    setSelected(null);setView("dashboard");setDeleteConfirm(false);
    showAppMsg("success","Client permanently deleted");
  };

  const exportCSV=()=>{
    const esc=v=>`"${String(v==null?"":v).replace(/"/g,'""')}"`;
    const headers=["Name","Status","Date of Birth","Age","Room/Address","AZV Number","Diagnoses","Medications","Company"];
    const rows=filtered.map(c=>[
      c.name,
      c.status||"Active",
      c.date_of_birth||"",
      calcAge(c.date_of_birth)??(""),
      c.room_or_address||"",
      c.azv_number||"",
      (c.diagnoses||[]).filter(d=>d.value).map(d=>d.value).join("; "),
      (c.medications||[]).filter(m=>m.name).map(m=>m.name+(m.dosage?" "+m.dosage:"")).join("; "),
      companiesMap[c.company_id]||company?.name||"",
    ]);
    const csv=[headers,...rows].map(r=>r.map(esc).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`clients-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);a.click();
    document.body.removeChild(a);URL.revokeObjectURL(url);
    logAudit("Exported client CSV","",{section:"Clients",details:`CSV export — ${filtered.length} client${filtered.length!==1?"s":""} (filter: ${statusFilter})`});
  };

  const exportPDF=()=>{
    const companyLabel=searchAllCompanies?"All Companies":he(company?.name||"GoldenCare System");
    const rowsHtml=filtered.map(c=>`
      <tr>
        <td>${he(c.name)}</td>
        <td>${he(c.status||"Active")}</td>
        <td>${he(c.date_of_birth||"—")}</td>
        <td>${he(calcAge(c.date_of_birth)??("—"))}</td>
        <td>${he(c.room_or_address||"—")}</td>
        <td>${(c.diagnoses||[]).filter(d=>d.value).map(d=>he(d.value)).join(", ")||"—"}</td>
        <td>${(c.medications||[]).filter(m=>m.name).length}</td>
        ${searchAllCompanies?`<td>${he(companiesMap[c.company_id]||"—")}</td>`:""}
      </tr>`).join("");
    const win=window.open("","_blank");
    if(!win)return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Client List — ${companyLabel}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#000;font-size:12px;padding:24px;}
        h1{font-size:20px;margin-bottom:4px;}
        .meta{color:#666;font-size:11px;margin-bottom:20px;}
        table{width:100%;border-collapse:collapse;}
        th{background:#f3f4f6;padding:7px 10px;text-align:left;border:1px solid #ddd;font-size:11px;font-weight:700;}
        td{padding:6px 10px;border:1px solid #ddd;font-size:11px;}
        tr:nth-child(even){background:#f9fafb;}
        @page{margin:1.5cm;size:A4 landscape;}
      </style>
    </head><body>
      <h1>Client List — ${companyLabel}</h1>
      <div class="meta">Exported ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})} &bull; ${filtered.length} clients &bull; Filter: ${he(statusFilter)}</div>
      <table><thead><tr>
        <th>Name</th><th>Status</th><th>DOB</th><th>Age</th><th>Room/Address</th><th>Diagnoses</th><th>Meds</th>
        ${searchAllCompanies?"<th>Company</th>":""}
      </tr></thead><tbody>${rowsHtml}</tbody></table>
    </body></html>`);
    win.document.close();
    setTimeout(()=>win.print(),400);
    logAudit("Exported client PDF","",{section:"Clients",details:`PDF export — ${filtered.length} client${filtered.length!==1?"s":""} (filter: ${statusFilter})`});
  };

  const handleLogout=async()=>{
    await supabase.auth.signOut();
    // Clear all PHI and session data from localStorage on every logout
    ["cm-dash-note","cm-email-prefs"].forEach(k=>localStorage.removeItem(k));
    Object.keys(localStorage).filter(k=>k.startsWith("cm-recent-")||k.startsWith("cm-notifs-")).forEach(k=>localStorage.removeItem(k));
    setCurrentUser(null);
  };

  const notifications=useMemo(()=>buildNotifications(clients),[clients]);

  const filtered=useMemo(()=>clients.filter(c=>{
    const q=search.toLowerCase();
    const ms=c.name.toLowerCase().includes(q)||(c.room_or_address||"").toLowerCase().includes(q)||(c.azv_number||"").toLowerCase().includes(q)||(searchAllCompanies&&(companiesMap[c.company_id]||"").toLowerCase().includes(q));
    if(statusFilter==="Archived")return ms&&c.archived===true;
    const mst=statusFilter==="All"||(c.status||"Active")===statusFilter;
    return ms&&mst&&!c.archived;
  }),[clients,search,statusFilter,searchAllCompanies,companiesMap]);

  const noteResults=useMemo(()=>search.trim().length>1&&searchMode==="notes"
    ?clients.flatMap(c=>(c.session_notes||[]).filter(n=>n.text&&n.text.toLowerCase().includes(search.toLowerCase())).map(n=>({...n,clientName:c.name,client:c}))).sort((a,b)=>b.date.localeCompare(a.date))
    :[]
  ,[clients,search,searchMode]);

  // ── Sidebar badge counts — memoized so they don't recompute on every keystroke ──
  const activeClientCount=useMemo(()=>clients.filter(c=>!c.archived).length,[clients]);
  const recentIncidentCount=useMemo(()=>{
    const ago=new Date(Date.now()-7*864e5).toISOString().slice(0,10);
    return clients.reduce((s,c)=>s+(c.incidents||[]).filter(i=>i.date&&i.date>=ago).length,0);
  },[clients]);
  const medFlagCount=useMemo(()=>clients.filter(c=>{
    const f=getMedFlags(c);return f.polypharmacy||f.highRisk.length>0;
  }).length,[clients]);
  const missedApptCount=useMemo(()=>{
    const today=tod();
    return clients.filter(c=>!c.archived).reduce((s,c)=>s+(c.appointments||[]).filter(a=>a.date&&(a.status==="No-Show"||(a.status==="Scheduled"&&a.date<today))).length,0);
  },[clients]);

  if(!authChecked)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--color-bg-card)",color:"#6366f1",fontSize:18,fontFamily:"serif"}}>Loading...</div>;
  if(!currentUser)return lang?<Login onLogin={setCurrentUser} t={t}/>:<LangPicker onSelect={selectLang}/>;
  if(!lang)return <LangPicker onSelect={selectLang}/>;
  // Force password change — must complete before accessing any part of the app
  if(currentUser.force_password_change){
    return <ForcePasswordChange currentUser={currentUser} onDone={authUser=>{
      setCurrentUser(u=>({...u,...authUser,force_password_change:false}));
    }}/>;
  }
  if((currentUser.role==="superadmin"||currentUser?.allRoles?.length>1)&&!selectedCompany){
    return <CompanyPicker currentUser={currentUser} onSelect={(cid,role)=>{
      setSelectedCompany(cid);
      setCurrentUser(u=>({...u,role:role||u.role}));
    }} t={t}/>;
  }

  return(
    <PermissionsContext.Provider value={perms}>
    <div style={{minHeight:"100vh",background:"var(--color-bg-base)",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style dangerouslySetInnerHTML={{__html:GCSS}}/>
      {/* ── Session timeout warning overlay ── */}
      {idleWarning&&<SessionTimeoutModal countdown={idleCountdown} onStayLoggedIn={stayLoggedIn} onLogoutNow={handleLogout}/>}
      {appMsg&&(
        <div style={{position:"fixed",top:20,right:24,zIndex:1200,padding:"11px 18px",borderRadius:10,background:appMsg.type==="success"?"#059669":"#dc2626",color:"#fff",fontSize:13,fontWeight:600,boxShadow:"0 4px 24px rgba(0,0,0,0.5)",animation:"slideIn 0.2s ease",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>{appMsg.type==="success"?"✓":"✗"}</span>{appMsg.text}
        </div>
      )}
      <div className="mob-hdr">
        {(view==="detail"||view==="edit"||view==="add"||view==="profile")?(
          <>
            <button onClick={()=>setView(view==="add"||view==="profile"?"dashboard":view==="edit"?"detail":"clients")} aria-label="Go back" style={{background:"rgba(128,128,128,0.12)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"rgba(255,255,255,0.6)",fontSize:16,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
            <span style={{fontSize:14,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"55vw"}}>
              {view==="add"?"New Client":view==="profile"?"My Profile":view==="edit"?(selected?.name||"Edit"):selected?.name||"Client"}
            </span>
            <div style={{width:34}}/>
          </>
        ):(
          <>
            <button onClick={()=>setSidebarOpen(o=>!o)} aria-label="Toggle sidebar" style={{background:"rgba(128,128,128,0.12)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"rgba(255,255,255,0.6)",fontSize:16,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center"}}>☰</button>
            <span style={{fontSize:15,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.3px"}}>GoldenCare</span>
            {can(currentUser.role,"add",perms)&&<button onClick={()=>{setSelected(null);setView("add");setSidebarOpen(false);}} aria-label="Add new client" className="btn-new-client" style={{background:"linear-gradient(135deg,var(--btn-primary-from),var(--btn-primary-to))",border:"none",color:"#fff",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700}}>+ New</button>}
          </>
        )}
      </div>
      <div className={"overlay"+(sidebarOpen?" show":"")} onClick={()=>setSidebarOpen(false)}/>
      <div style={{display:"flex",minHeight:"100vh"}}>
        <div className={"sidebar"+(sidebarOpen?" open":"")} style={{width:224,background:"var(--color-bg-surface)",borderRight:"1px solid var(--color-border)",display:"flex",flexDirection:"column",flexShrink:0}}>

          {/* ── Brand ── */}
          <div style={{padding:"16px 14px 12px",borderBottom:"1px solid var(--color-border)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(145deg,var(--btn-primary-from),var(--btn-primary-to))",boxShadow:"0 0 0 1px var(--btn-primary-shadow),0 8px 20px var(--btn-primary-shadow)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2.5v11M3 7.5h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.3px",lineHeight:1.2}}>GoldenCare System</div>
                <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"var(--color-text-muted)",marginTop:1}}>{SUPABASE_URL.includes("kpwzeawgrqdsezflvjkm")?"staging":"production"}</div>
              </div>
            </div>
            {/* Company chip */}
            {company&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"var(--color-bg-hover)",border:"1px solid var(--color-border)",borderRadius:8}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 6px #34d399",flexShrink:0}}/>
              <span style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{company.name||"Company"}</span>
            </div>}
          </div>

          {/* ── Company logo (optional) ── */}
          {company?.logo_url&&(
            <div style={{padding:"10px 14px",borderBottom:"1px solid var(--color-border)",display:"flex",justifyContent:"center"}}>
              <div style={{background:"#fff",borderRadius:8,padding:"6px 10px",display:"inline-block"}}>
                <img src={company.logo_url} alt={company.name||"Company logo"} style={{maxHeight:40,maxWidth:140,objectFit:"contain",display:"block"}}/>
              </div>
            </div>
          )}

          {/* ── Switch Company ── */}
          {(currentUser?.allRoles||[]).length>1&&(
            <div style={{padding:"8px 14px",borderBottom:"1px solid var(--color-border)"}}>
              <button onClick={()=>{setSelectedCompany(null);setCompany(null);setClients([]);setSelected(null);setView("dashboard");setSearch("");setStatusFilter("Active");setClientFilter("all");setSearchMode("clients");}}
                style={{width:"100%",padding:"6px 10px",borderRadius:8,border:"1px solid var(--color-border)",background:"var(--color-bg-hover)",color:"var(--color-text-secondary)",fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
                ↔ Switch Care Facility
              </button>
            </div>
          )}

          {/* ── Nav ── */}
          <div style={{padding:"8px 8px 4px",flex:"1 1 0",overflowY:"auto"}}>
            {/* MAIN group */}
            <div className="nav-group-label" style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"1.4px",color:"var(--color-text-muted)",padding:"0 8px",margin:"8px 0 4px"}}>Main</div>
            {(()=>{
              const NAV_STYLE=(active)=>({width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:9,border:active?"1px solid var(--color-border-accent)":"1px solid transparent",background:active?"var(--color-bg-active)":"transparent",color:active?"var(--color-accent-light)":"var(--color-text-secondary)",fontWeight:active?600:500,fontSize:13,textAlign:"left",marginBottom:1,cursor:"pointer",transition:"background 120ms ease,color 120ms ease",position:"relative"});
              const ACCENT_BAR=<span style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:"55%",background:"rgba(0,0,0,0.25)",borderRadius:"0 3px 3px 0"}}/>;
              const navBtn=(v,label,icon)=>{
                const active=view===v&&!selected;
                return(
                  <button key={v} onClick={()=>{setView(v);setSelected(null);setSidebarOpen(false);}}
                    className={active?"nav-item nav-active":"nav-item"} style={NAV_STYLE(active)}>
                    {active&&ACCENT_BAR}
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">{icon}</svg>
                    {label}
                  </button>
                );
              };
              const dashBtn=navBtn("dashboard","Dashboard",'<rect x="1" y="1" width="5" height="5" rx="1.5"/><rect x="9" y="1" width="5" height="5" rx="1.5"/><rect x="1" y="9" width="5" height="5" rx="1.5"/><rect x="9" y="9" width="5" height="5" rx="1.5"/>');
              const clientsActive=view==="clients"||view==="detail"||view==="edit";
              const clientsBtn=(
                <button onClick={()=>{setView("clients");setSelected(null);setSidebarOpen(false);}}
                  className={clientsActive?"nav-item nav-active":"nav-item"} style={NAV_STYLE(clientsActive)}>
                  {clientsActive&&ACCENT_BAR}
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="5" cy="5" r="3"/><path d="M1 13c0-2.8 2-5 4-5h2c2 0 4 2.2 4 5"/><circle cx="11.5" cy="5" r="2"/><path d="M13.5 13c0-2.2-1.3-4-3-4.5"/></svg>
                  <span style={{flex:1}}>Clients</span>
                  <span className="nav-count-badge" style={{fontSize:10,fontFamily:"'DM Mono',monospace",background:"var(--color-bg-active)",color:"var(--color-accent-light)",borderRadius:5,padding:"1px 6px",fontWeight:700}}>{activeClientCount}</span>
                </button>
              );
              // Incidents nav
              const incActive=view==="incidents";
              const incBtn=can(currentUser.role,"incidents_view",perms)?(
                <button onClick={()=>{setView("incidents");setSelected(null);setSidebarOpen(false);}}
                  className={incActive?"nav-item nav-active":"nav-item"} style={NAV_STYLE(incActive)}>
                  {incActive&&ACCENT_BAR}
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M7.5 2L2 12h11L7.5 2z"/><line x1="7.5" y1="6" x2="7.5" y2="9"/><circle cx="7.5" cy="10.5" r="0.5" fill="currentColor"/></svg>
                  <span style={{flex:1}}>Incidents</span>
                  {recentIncidentCount>0&&<span style={{fontSize:10,fontFamily:"'DM Mono',monospace",background:"rgba(239,68,68,0.15)",color:"#f87171",borderRadius:5,padding:"1px 6px",fontWeight:700,border:"1px solid rgba(239,68,68,0.2)"}}>{recentIncidentCount}</span>}
                </button>
              ):null;
              // Appointments nav
              const apptActive=view==="appointments";
              const apptBtn=(
                <button onClick={()=>{setView("appointments");setSelected(null);setSidebarOpen(false);}}
                  className={apptActive?"nav-item nav-active":"nav-item"} style={NAV_STYLE(apptActive)}>
                  {apptActive&&ACCENT_BAR}
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="1.5" y="3" width="12" height="10" rx="1.5"/><path d="M5 3V1.5M10 3V1.5"/><line x1="1.5" y1="7" x2="13.5" y2="7"/></svg>
                  <span style={{flex:1}}>Appointments</span>
                  {missedApptCount>0&&<span style={{fontSize:10,fontFamily:"'DM Mono',monospace",background:"rgba(245,158,11,0.15)",color:"#fbbf24",borderRadius:5,padding:"1px 6px",fontWeight:700,border:"1px solid rgba(245,158,11,0.2)"}}>{missedApptCount}</span>}
                </button>
              );
              // Medications nav
              const medActive=view==="medications";
              const medBtn=can(currentUser.role,"medications_view",perms)?(
                <button onClick={()=>{setView("medications");setSelected(null);setSidebarOpen(false);}}
                  className={medActive?"nav-item nav-active":"nav-item"} style={NAV_STYLE(medActive)}>
                  {medActive&&ACCENT_BAR}
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="6" width="11" height="7" rx="1.5"/><path d="M5 6V4a2.5 2.5 0 015 0v2"/><line x1="7.5" y1="8.5" x2="7.5" y2="11"/><line x1="6" y1="9.75" x2="9" y2="9.75"/></svg>
                  <span style={{flex:1}}>Medications</span>
                  {medFlagCount>0&&<span style={{fontSize:10,fontFamily:"'DM Mono',monospace",background:"rgba(245,158,11,0.15)",color:"#fbbf24",borderRadius:5,padding:"1px 6px",fontWeight:700,border:"1px solid rgba(245,158,11,0.2)"}}>{medFlagCount}</span>}
                </button>
              ):null;
              const roomsActive=view==="rooms";
              const roomsBtn=can(currentUser.role,"rooms",perms)?(
                <button onClick={()=>{setView("rooms");setSelected(null);setSidebarOpen(false);}}
                  className={roomsActive?"nav-item nav-active":"nav-item"} style={NAV_STYLE(roomsActive)}>
                  {roomsActive&&ACCENT_BAR}
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="1" y="5" width="13" height="9" rx="1.5"/><path d="M4 5V3.5a3.5 3.5 0 017 0V5"/><line x1="5" y1="9" x2="5" y2="11"/><line x1="10" y1="9" x2="10" y2="11"/></svg>
                  <span style={{flex:1}}>Rooms</span>
                </button>
              ):null;
              return <>{dashBtn}{clientsBtn}{incBtn}{apptBtn}{medBtn}{roomsBtn}</>;
            })()}
            {/* MANAGEMENT group */}
            <div className="nav-group-label" style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"1.4px",color:"var(--color-text-muted)",padding:"0 8px",margin:"10px 0 4px"}}>Management</div>
            {(()=>{
              const NAV_STYLE=(active)=>({width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:9,border:active?"1px solid var(--color-border-accent)":"1px solid transparent",background:active?"var(--color-bg-active)":"transparent",color:active?"var(--color-accent-light)":"var(--color-text-secondary)",fontWeight:active?600:500,fontSize:13,textAlign:"left",marginBottom:1,cursor:"pointer",transition:"background 120ms ease,color 120ms ease",position:"relative"});
              const ACCENT_BAR=<span style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:"55%",background:"rgba(0,0,0,0.25)",borderRadius:"0 3px 3px 0"}}/>;
              const navBtn=(v,label,pathD,guard=true)=>{
                if(!guard)return null;
                const active=view===v;
                return(
                  <button key={v} onClick={()=>{setView(v);setSelected(null);setSidebarOpen(false);}}
                    className={active?"nav-item nav-active":"nav-item"} style={NAV_STYLE(active)}>
                    {active&&ACCENT_BAR}
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" dangerouslySetInnerHTML={{__html:pathD}}/>
                    {label}
                  </button>
                );
              };
              return(<>
                {navBtn("handover","Handovers",'<rect x="1" y="3" width="13" height="10" rx="1.5"/><line x1="4" y1="7" x2="11" y2="7"/><line x1="4" y1="10" x2="8" y2="10"/><circle cx="11" cy="10" r="2" fill="currentColor" stroke="none"/>',can(currentUser.role,"handover",perms))}
                {navBtn("readmission","Readmission Risk",'<path d="M7.5 2a5.5 5.5 0 100 11A5.5 5.5 0 007.5 2z"/><line x1="7.5" y1="5" x2="7.5" y2="7.5"/><line x1="7.5" y1="7.5" x2="9.5" y2="9.5"/><path d="M12.5 12.5l2 2"/>',can(currentUser.role,"readmission",perms))}
                {navBtn("reports","Reports",'<rect x="2" y="1" width="11" height="13" rx="1.5"/><line x1="4.5" y1="5" x2="10.5" y2="5"/><line x1="4.5" y1="8" x2="10.5" y2="8"/><line x1="4.5" y1="11" x2="8" y2="11"/>',can(currentUser.role,"reports",perms))}
                {navBtn("users","Staff / Users",'<circle cx="6" cy="5" r="3"/><path d="M1 13c0-2.8 2.2-5 5-5"/><circle cx="11.5" cy="9" r="2.5"/><line x1="11.5" y1="11.5" x2="11.5" y2="14"/><line x1="10" y1="12.5" x2="13" y2="12.5"/>',can(currentUser.role,"users",perms))}
                {navBtn("audit",t.auditTrail,'<circle cx="7.5" cy="7.5" r="6"/><polyline points="7.5,4.5 7.5,7.5 9.5,9.5"/>',can(currentUser.role,"audit",perms))}
              </>);
            })()}
            {/* ADMIN group — only if at least one admin view accessible */}
            {(can(currentUser.role,"company",perms)||can(currentUser.role,"permissions",perms))&&(()=>{
              const NAV_STYLE=(active)=>({width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:9,border:active?"1px solid var(--color-border-accent)":"1px solid transparent",background:active?"var(--color-bg-active)":"transparent",color:active?"var(--color-accent-light)":"var(--color-text-secondary)",fontWeight:active?600:500,fontSize:13,textAlign:"left",marginBottom:1,cursor:"pointer",transition:"background 120ms ease,color 120ms ease",position:"relative"});
              const ACCENT_BAR=<span style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:"55%",background:"rgba(0,0,0,0.25)",borderRadius:"0 3px 3px 0"}}/>;
              return(
                <>
                  <div className="nav-group-label" style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"1.4px",color:"var(--color-text-muted)",padding:"0 8px",margin:"10px 0 4px"}}>Admin</div>
                  {can(currentUser.role,"company",perms)&&(
                    <button onClick={()=>{setView("company");setSelected(null);setSidebarOpen(false);}}
                      className={view==="company"?"nav-item nav-active":"nav-item"} style={NAV_STYLE(view==="company")}>
                      {view==="company"&&ACCENT_BAR}
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="5" width="11" height="9" rx="1"/><polyline points="5,5 5,2.5 10,2.5 10,5"/><line x1="7.5" y1="8" x2="7.5" y2="11"/><line x1="6" y1="9.5" x2="9" y2="9.5"/></svg>
                      Company
                    </button>
                  )}
                  {can(currentUser.role,"permissions",perms)&&(
                    <button onClick={()=>{setView("permissions");setSelected(null);setSidebarOpen(false);}}
                      className={view==="permissions"?"nav-item nav-active":"nav-item"} style={NAV_STYLE(view==="permissions")}>
                      {view==="permissions"&&ACCENT_BAR}
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="4" y="6" width="7" height="7" rx="1"/><path d="M5.5 6V4.5a2 2 0 014 0V6"/></svg>
                      Permissions
                    </button>
                  )}
                </>
              );
            })()}
          </div>


          {/* ── Footer: user + icon buttons ── */}
          <div className="sidebar-footer" style={{borderTop:"1px solid var(--color-border)",padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
            <div className="sidebar-avatar" onClick={()=>{setView("profile");setSelected(null);setSidebarOpen(false);}}
              style={{width:32,height:32,borderRadius:8,background:currentUser.avatar_url?"transparent":"linear-gradient(135deg,#6366f1,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0,cursor:"pointer",overflow:"hidden"}}>
              {currentUser.avatar_url?<img src={currentUser.avatar_url} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials(currentUser.displayName||"?")}
            </div>
            <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>{setView("profile");setSelected(null);setSidebarOpen(false);}}>
              <div className="sidebar-footer-name" style={{fontSize:11,fontWeight:600,color:"rgba(240,242,250,0.65)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentUser.displayName}</div>
              <div className="sidebar-footer-role" style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"var(--color-text-muted)"}}>{currentUser.role==="superadmin"?"superadmin":currentUser.role==="admin"?"admin":currentUser.role==="power_user"?"power_user":currentUser.role||"user"}</div>
            </div>
            <div style={{display:"flex",gap:3,flexShrink:0}}>
              {(()=>{const unread=notifications.filter(n=>!readNotifIds.has(n.id)).length;return(
                <button onClick={()=>setNotifOpen(o=>!o)} aria-label="Notifications" className="icon-btn-sidebar" style={{position:"relative",width:28,height:28,borderRadius:7,border:"1px solid var(--color-border)",background:"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",touchAction:"manipulation"}}>
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="rgba(240,242,250,0.4)" strokeWidth="1.4" aria-hidden="true"><path d="M7.5 1.5a4 4 0 014 4v3l1 1.5H2.5L3.5 8.5v-3a4 4 0 014-4z"/><line x1="6" y1="12" x2="9" y2="12"/></svg>
                  {unread>0&&<span className="notif-unread-dot" style={{position:"absolute",top:4,right:4,width:5,height:5,borderRadius:"50%",background:"#ef4444",border:"1.5px solid #0c0f1f"}}/>}
                </button>
              );})()}
              <button onClick={()=>setDarkMode(d=>!d)} aria-label="Toggle theme" className="icon-btn-sidebar" style={{width:28,height:28,borderRadius:7,border:"1px solid var(--color-border)",background:"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",touchAction:"manipulation"}}>
                {darkMode
                  ?<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="rgba(240,242,250,0.4)" strokeWidth="1.4" aria-hidden="true"><circle cx="7" cy="7" r="2.5"/><line x1="7" y1="1" x2="7" y2="2.5"/><line x1="7" y1="11.5" x2="7" y2="13"/><line x1="1" y1="7" x2="2.5" y2="7"/><line x1="11.5" y1="7" x2="13" y2="7"/><line x1="2.9" y1="2.9" x2="3.9" y2="3.9"/><line x1="10.1" y1="10.1" x2="11.1" y2="11.1"/><line x1="11.1" y1="2.9" x2="10.1" y2="3.9"/><line x1="3.9" y1="10.1" x2="2.9" y2="11.1"/></svg>
                  :<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="rgba(240,242,250,0.4)" strokeWidth="1.4" aria-hidden="true"><path d="M12 8.5A5.5 5.5 0 015.5 2a5.5 5.5 0 000 11A5.5 5.5 0 0012 8.5z"/></svg>
                }
              </button>
              <button onClick={handleLogout} aria-label="Sign out" title={t.signOut} className="icon-btn-sidebar" style={{width:28,height:28,borderRadius:7,border:"1px solid var(--color-border)",background:"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",touchAction:"manipulation"}}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="rgba(240,242,250,0.4)" strokeWidth="1.4" aria-hidden="true"><path d="M9 1H12a1 1 0 011 1v10a1 1 0 01-1 1H9"/><polyline points="6,10 9,7 6,4"/><line x1="9" y1="7" x2="1" y2="7"/></svg>
              </button>
            </div>
          </div>

          {/* ── Lang + keyboard hint ── */}
          <div style={{padding:"6px 10px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
            <div style={{display:"flex",gap:3}}>
              {LANG_OPTIONS.map(l=>(
                <button key={l.code} onClick={()=>selectLang(l.code)} title={l.label}
                  className={lang===l.code?"lang-btn-active":"lang-btn-inactive"}
                  style={{background:lang===l.code?"rgba(99,102,241,0.18)":"transparent",border:"none",borderRadius:5,padding:"3px 5px",fontSize:10,fontWeight:700,fontFamily:"'DM Mono',monospace",color:lang===l.code?"#a5b4fc":"var(--color-text-muted)",cursor:"pointer"}}>
                  {l.emoji}
                </button>
              ))}
            </div>
            <button onClick={()=>setShowShortcuts(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" style={{background:"transparent",border:"none",borderRadius:5,padding:"3px 6px",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600,color:"rgba(240,242,250,0.18)",cursor:"pointer"}}>⌨</button>
          </div>
        </div>
        <div className="main-pad" style={{flex:1,minWidth:0,overflowY:"auto",background:"var(--color-bg-base)",display:"flex",flexDirection:"column"}}>
          {/* ── Top bar ── */}
          {(()=>{
            const hour=new Date().getHours();
            const greeting=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
            const firstName=(currentUser.displayName||currentUser.email||"").split(" ")[0];
            const activeCount=clients.filter(c=>!c.archived&&(c.status||"Active")==="Active").length;
            const dateStr=new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}).toUpperCase();
            return(
              <div className="main-topbar" style={{background:"var(--color-bg-surface)",borderBottom:"1px solid var(--color-border)",padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,position:"sticky",top:0,zIndex:50}}>
                <div>
                  <div style={{fontSize:17,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.3px"}}>{greeting}, {firstName}.</div>
                  <div className="topbar-meta" style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"var(--color-text-muted)",marginTop:3}}>{dateStr} · {activeCount} ACTIVE CLIENTS{company?.name?" · "+company.name.toUpperCase():""}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <input id="cm-search" aria-label="Search clients" style={{height:34,width:160,padding:"0 12px",background:"rgba(255,255,255,0.04)",border:"1px solid var(--color-border)",borderRadius:8,fontSize:12,color:"var(--color-text-secondary)",fontFamily:"'DM Sans',sans-serif",outline:"none"}} placeholder={t.search||"Search…"} value={search} onChange={e=>{setSearch(e.target.value);if(view!=="clients"&&e.target.value){setView("clients");setSelected(null);}}} onFocus={()=>{if(view!=="clients"){setView("clients");setSelected(null);}}}/>
                  {can(currentUser.role,"add",perms)&&(
                    <button onClick={()=>{setSelected(null);setView("add");setSidebarOpen(false);}} aria-label="Add new client" className="btn-new-client"
                      style={{height:34,padding:"0 16px",background:"linear-gradient(135deg,var(--btn-primary-from),var(--btn-primary-to))",color:"#fff",fontWeight:700,fontSize:12,borderRadius:9,boxShadow:"0 4px 16px var(--btn-primary-shadow)",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                      + {t.newClient.replace("+ ","")}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
          <div style={{flex:1,padding:"24px 28px"}}>
          {error&&<div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:10,padding:"11px 16px",marginBottom:20,color:"#f87171",fontSize:13,display:"flex",alignItems:"center",gap:8}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#f87171" strokeWidth="1.5" aria-hidden="true"><circle cx="7" cy="7" r="6"/><line x1="7" y1="4" x2="7" y2="7.5"/><circle cx="7" cy="10" r="0.5" fill="#f87171"/></svg>
            {error}
          </div>}
          {loading&&view==="dashboard"&&<div style={{color:"var(--color-text-muted)",textAlign:"center",padding:"60px 0",fontFamily:"'DM Mono',monospace",fontSize:13}}>Loading...</div>}
          {!loading&&view==="handover"&&can(currentUser.role,"handover",perms)&&<HandoverNotes supabase={supabase} companyId={activeCompanyId} currentUser={currentUser} clients={clients}/>}
          {!loading&&view==="audit"&&can(currentUser.role,"audit",perms)&&<AuditTrail t={t} companyId={activeCompanyId} currentUser={currentUser}/>}
          {!loading&&view==="reports"&&can(currentUser.role,"reports",perms)&&<ReportsView clients={clients} company={company} currentUser={currentUser} t={t} logAudit={logAudit}/>}
          {!loading&&view==="company"&&can(currentUser.role,"company",perms)&&(
            <CompanyView company={company} onUpdate={updated=>{setCompany(updated);}} currentUser={currentUser} t={t}/>
          )}
          {!loading&&view==="profile"&&(
            <UserProfile
              currentUser={currentUser}
              onUpdate={updated=>setCurrentUser(updated)}
              onClose={()=>setView("dashboard")}
              t={t}
            />
          )}
          {!loading&&view==="users"&&can(currentUser.role,"users",perms)&&(
            <UserManagement currentUser={currentUser} onRoleChange={refreshCurrentUser} activeCompanyId={activeCompanyId} t={t} logAudit={logAudit}/>
          )}
          {!loading&&view==="permissions"&&can(currentUser.role,"permissions",perms)&&(
            <PermissionsPanel activeCompanyId={activeCompanyId} currentUser={currentUser} t={t}/>
          )}
          {!loading&&view!=="audit"&&searchMode==="notes"&&search.trim().length>1?(
            <div>
              <div style={{fontSize:20,color:"var(--color-text-primary)",marginBottom:6,fontWeight:700,letterSpacing:"-0.4px"}}>{t.noteSearch}</div>
              <div style={{color:"var(--color-text-dim)",fontSize:13,marginBottom:20}}>{noteResults.length} {t.noteSearchFor} "{search}"</div>
              {noteResults.length===0?<div style={{color:"var(--color-text-muted)",fontSize:14,textAlign:"center",padding:"40px 0"}}>{t.noNoteResults} "{search}"</div>:(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {noteResults.map((n,i)=>(
                    <div key={`${n.clientName}-${n.date}-${i}`} onClick={()=>{setSelected(n.client);setView("detail");setSearch("");setSearchMode("clients");setSidebarOpen(false);trackRecent(n.client);}}
                      style={{background:"var(--color-bg-card)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"14px 18px",cursor:"pointer"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(n.clientName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{initials(n.clientName)}</div>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,color:"var(--color-text-primary)"}}>{n.clientName}</div>
                          <div style={{fontSize:12,color:"var(--color-text-dim)"}}>{new Date(n.date+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}{n.role&&" - "+n.role}{n.staff_name&&" - "+n.staff_name}</div>
                        </div>
                      </div>
                      <div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.6}}>
                        {(()=>{
                          const text=n.text;
                          const idx=text.toLowerCase().indexOf(search.toLowerCase());
                          if(idx===-1)return text;
                          const start=Math.max(0,idx-60),end=Math.min(text.length,idx+search.length+60);
                          return <>{start>0&&"..."}{text.slice(start,idx)}<mark style={{background:"rgba(245,158,11,0.2)",borderRadius:3,color:"#f59e0b"}}>{text.slice(idx,idx+search.length)}</mark>{text.slice(idx+search.length,end)}{end<text.length&&"..."}</>;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ):!loading&&view==="dashboard"&&(
            <>
              {recentClients.filter(rc=>!clients.find(c=>c.id===rc.id)?.archived).length>0&&(
                <div style={{marginBottom:24}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--color-text-muted)",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>⏱ Recently Viewed</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {recentClients.map(rc=>{
                      const full=clients.find(c=>c.id===rc.id);
                      if(full?.archived)return null;
                      return(
                        <button key={rc.id} onClick={()=>{if(!full)return;setSelected(full);setView("detail");trackRecent(full);}}
                          className="client-row" style={{display:"flex",alignItems:"center",gap:8,background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:10,padding:"7px 12px",cursor:full?"pointer":"not-allowed",maxWidth:180,opacity:full?1:0.5}}>
                          <div style={{width:28,height:28,borderRadius:"50%",background:avatarColor(rc.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0,overflow:"hidden"}}>
                            <ClientPhoto path={rc.photo_url} alt={rc.name} style={{width:"100%",height:"100%",objectFit:"cover"}} fallback={initials(rc.name)}/>
                          </div>
                          <span style={{fontSize:12,fontWeight:600,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{rc.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* ── 3fr/2fr grid: Recent Clients + Active Alerts ── */}
              <div className="g2" style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:12,marginBottom:20}}>
                {/* Recent clients card */}
                <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"0.9px",color:"var(--color-text-muted)"}}>Recently Viewed</div>
                    <button onClick={()=>{setView("clients");setSelected(null);}} style={{background:"none",border:"none",fontSize:11,fontWeight:500,color:"#6366f1",cursor:"pointer",padding:0}}>View all →</button>
                  </div>
                  {recentClients.filter(rc=>!clients.find(c=>c.id===rc.id)?.archived).length===0?<div style={{color:"var(--color-text-muted)",fontSize:12,padding:"12px 0"}}>No recently viewed clients</div>:recentClients.map(rc=>{
                    const full=clients.find(c=>c.id===rc.id);
                    if(full?.archived)return null;
                    const fr=full?calcFallRisk(full):null;
                    const age=full?calcAge(full.date_of_birth):null;
                    const topDiag=full?(full.diagnoses||[]).find(d=>d.value&&d.value.trim()):null;
                    const avc=["rgba(99,102,241,0.2)","rgba(14,165,233,0.2)","rgba(34,197,94,0.2)","rgba(245,158,11,0.2)"];
                    const avtc=["#a5b4fc","#7dd3fc","#6ee7b7","#fbbf24"];
                    let hi=0;for(const ch of(rc.name||""))hi=(hi*31+ch.charCodeAt(0))%4;
                    return(
                      <button key={rc.id} onClick={()=>{if(!full)return;setSelected(full);setView("detail");trackRecent(full);}}
                        className="client-row" style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 9px",borderRadius:9,border:"none",background:"transparent",cursor:full?"pointer":"not-allowed",marginBottom:3,textAlign:"left",opacity:full?1:0.5}}>
                        <div style={{width:36,height:36,borderRadius:10,background:rc.photo_url?"transparent":avc[hi],display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:avtc[hi],flexShrink:0,overflow:"hidden"}}>
                          <ClientPhoto path={rc.photo_url} alt={rc.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:10}} fallback={initials(rc.name)}/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{rc.name}</div>
                          <div style={{fontSize:11,color:"var(--color-text-muted)",fontFamily:"'DM Mono',monospace"}}>{age!==null?age+"y":""}{full?.room_or_address?(age!==null?" · ":"")+full.room_or_address:""}{topDiag?(age!==null||full?.room_or_address?" · ":"")+topDiag.value:""}</div>
                        </div>
                        {fr&&fr.level!=="Low"&&<span style={{fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:4,background:fr.color+"18",color:fr.color,flexShrink:0,fontFamily:"'DM Mono',monospace"}}>{fr.level==="High"?"HFR":"MFR"}</span>}
                      </button>
                    );
                  })}
                </div>
                {/* Active alerts panel */}
                <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}>
                  <div style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"0.9px",color:"var(--color-text-muted)",marginBottom:12}}>Active Alerts</div>
                  {notifications.length===0?<div style={{color:"var(--color-text-muted)",fontSize:12,padding:"12px 0"}}>No active alerts</div>:notifications.slice(0,8).map(n=>{
                    const typeColor=n.type==="fall_risk"?"#ef4444":n.type==="incident"?"#ef4444":n.type==="expiry"?"#f59e0b":n.type==="appointment"?"#f59e0b":"#6366f1";
                    const typeBg=n.type==="fall_risk"||n.type==="incident"?"rgba(239,68,68,0.04)":n.type==="expiry"||n.type==="appointment"?"rgba(245,158,11,0.04)":"rgba(99,102,241,0.04)";
                    const client=clients.find(c=>c.id===n.clientId);
                    return(
                      <div key={n.id} onClick={()=>{if(client){setSelected(client);setView("detail");trackRecent(client);}}} style={{display:"flex",gap:9,padding:"8px 10px",borderRadius:9,marginBottom:4,cursor:client?"pointer":"default",transition:"background 120ms ease",borderLeft:"2px solid "+typeColor,background:typeBg}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:typeColor,marginTop:5,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,color:"var(--color-text-secondary)"}}><span style={{fontWeight:600,color:"var(--color-text-primary)"}}>{n.clientName}</span> — {n.body}</div>
                          <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"var(--color-text-muted)",marginTop:2}}>{n.date||""}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Dashboard clients={clients.filter(c=>!c.archived)} onSelect={c=>{setSelected(c);setView("detail");trackRecent(c);}} t={t} currentUser={currentUser}/>
            </>
          )}
          {!loading&&view==="readmission"&&can(currentUser.role,"readmission",perms)&&(()=>{
            const LEVEL_ORDER={"Very High":0,"High":1,"Moderate":2,"Low":3};
            const activeClts=clients.filter(c=>c.status!=="Archived");
            const scored=activeClts.map(c=>({c,risk:calcReadmissionRisk(c)})).sort((a,b)=>b.risk.score-a.risk.score||(LEVEL_ORDER[a.risk.level.label]||3)-(LEVEL_ORDER[b.risk.level.label]||3));
            const rFilter=readmissionFilter;
            const setRFilter=setReadmissionFilter;
            const filtered=rFilter==="All"?scored:scored.filter(({risk})=>risk.level.label===rFilter);
            const vhCount=scored.filter(({risk})=>risk.level.label==="Very High").length;
            const hCount=scored.filter(({risk})=>risk.level.label==="High").length;
            const cutoff30=new Date();cutoff30.setDate(cutoff30.getDate()-30);
            const cut30s=cutoff30.toISOString().slice(0,10);
            const recentAdmits=activeClts.flatMap(c=>(c.hospitalizations||[]).filter(h=>h.date_admitted>=cut30s).map(h=>({...h,clientName:c.name,client:c}))).sort((a,b)=>b.date_admitted.localeCompare(a.date_admitted));
            const readmits=scored.filter(({risk})=>risk.isReadmission);
            const fmtD=d=>d?new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"present";
            const FILTERS=["All","Very High","High","Moderate","Low"];
            const FCOLS={"Very High":"#ef4444","High":"#f97316","Moderate":"#f59e0b","Low":"#10b981"};
            return(
              <div style={{padding:"24px 20px",maxWidth:1100,margin:"0 auto"}}>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:20,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.3px",marginBottom:4}}>🏥 Readmission Risk Dashboard</div>
                  <div className="readmission-stats" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginTop:10}}>
                    {[["Very High","#ef4444",vhCount],["High","#f97316",hCount],["Admissions (30d)","#6366f1",recentAdmits.length],["Readmissions","#f59e0b",readmits.length]].map(([lbl,col,n])=>(
                      <div key={lbl} style={{background:"var(--color-bg-card)",border:"1px solid "+col+"40",borderRadius:10,padding:"12px 18px",textAlign:"center"}}>
                        <div style={{fontSize:26,fontWeight:800,color:col,fontFamily:"'DM Mono',monospace"}}>{n}</div>
                        <div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:2}}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="readmission-grid" style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:18,alignItems:"start"}}>
                  <div>
                    <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                      {FILTERS.map(f=>(
                        <button key={f} onClick={()=>setRFilter(f)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid "+(rFilter===f?(FCOLS[f]||"var(--color-accent)")+"80":"rgba(255,255,255,0.08)"),background:rFilter===f?(FCOLS[f]||"var(--color-accent)")+"15":"transparent",color:rFilter===f?(FCOLS[f]||"var(--color-accent-light)"):"var(--color-text-secondary)",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                          {f}{f!=="All"&&` (${scored.filter(({risk})=>risk.level.label===f).length})`}
                        </button>
                      ))}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {filtered.map(({c,risk})=>{
                        const age=calcAge(c.date_of_birth);
                        const maxScore=20;
                        const pct=Math.min(100,Math.round(risk.score/maxScore*100));
                        return(
                          <div key={c.id} onClick={()=>{setSelected(c);setView("detail");trackRecent(c);}} style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:10,padding:"12px 14px",cursor:"pointer",display:"flex",gap:12,alignItems:"center"}} className="card-hover">
                            <ClientPhoto path={c.photo_url} alt={c.name} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",flexShrink:0}} fallback={<div style={{width:40,height:40,borderRadius:"50%",background:"var(--color-bg-hover)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"var(--color-text-muted)"}}>{c.name?.[0]}</div>}/>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                                <span style={{fontSize:13,fontWeight:700,color:"var(--color-text-primary)"}}>{c.name}</span>
                                <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20,background:risk.level.bg,border:"1px solid "+risk.level.color+"50",color:risk.level.color}}>{risk.level.label}</span>
                                {risk.isReadmission&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(239,68,68,0.1)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.3)"}}>⚠ Readmission</span>}
                              </div>
                              <div style={{display:"flex",gap:4,marginBottom:6}}>
                                <div style={{flex:1,height:5,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden"}}>
                                  <div style={{height:"100%",width:pct+"%",background:risk.level.color,borderRadius:3,transition:"width 300ms ease"}}/>
                                </div>
                                <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:risk.level.color,fontWeight:700,minWidth:30,textAlign:"right"}}>{risk.score}pt</span>
                              </div>
                              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                {risk.factors.slice(0,4).map((f,i)=><span key={i} style={{fontSize:10,padding:"1px 7px",borderRadius:20,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"var(--color-text-dim)"}}>{f}</span>)}
                                {risk.factors.length>4&&<span style={{fontSize:10,color:"var(--color-text-muted)"}}>+{risk.factors.length-4} more</span>}
                              </div>
                            </div>
                            {age!==null&&<span style={{fontSize:12,color:"var(--color-text-muted)",flexShrink:0}}>{age}y</span>}
                          </div>
                        );
                      })}
                      {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:"var(--color-text-muted)",fontSize:13}}>No clients at {rFilter.toLowerCase()} risk.</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,overflow:"hidden"}}>
                      <div style={{padding:"12px 14px",borderBottom:"1px solid var(--color-border)",fontSize:12,fontWeight:700,color:"var(--color-text-primary)"}}>🏥 Recent Admissions <span style={{fontWeight:400,color:"var(--color-text-muted)"}}>(30 days)</span></div>
                      <div style={{maxHeight:280,overflowY:"auto"}}>
                        {recentAdmits.length===0?<div style={{padding:"16px 14px",fontSize:12,color:"var(--color-text-muted)"}}>No admissions in the last 30 days.</div>:recentAdmits.map((h,i)=>(
                          <div key={h.id||i} onClick={()=>{setSelected(h.client);setView("detail");trackRecent(h.client);}} style={{padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer",display:"flex",flexDirection:"column",gap:2}} className="client-row">
                            <span style={{fontSize:12,fontWeight:600,color:"var(--color-text-primary)"}}>{h.clientName}</span>
                            <span style={{fontSize:11,color:"var(--color-text-dim)"}}>{fmtD(h.date_admitted)}{h.date_discharged?" → "+fmtD(h.date_discharged):" (current)"}</span>
                            {h.reason&&<span style={{fontSize:11,color:"var(--color-text-muted)",fontStyle:"italic"}}>{h.reason}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{background:"var(--color-bg-card)",border:"1px solid "+(readmits.length>0?"rgba(239,68,68,0.3)":"var(--color-border)"),borderRadius:12,overflow:"hidden"}}>
                      <div style={{padding:"12px 14px",borderBottom:"1px solid var(--color-border)",fontSize:12,fontWeight:700,color:readmits.length>0?"#ef4444":"var(--color-text-primary)"}}>⚠ Readmissions <span style={{fontWeight:400,color:"var(--color-text-muted)"}}>(within 30d of discharge)</span></div>
                      <div style={{maxHeight:240,overflowY:"auto"}}>
                        {readmits.length===0?<div style={{padding:"16px 14px",fontSize:12,color:"var(--color-text-muted)"}}>No readmissions detected.</div>:readmits.map(({c})=>(
                          <div key={c.id} onClick={()=>{setSelected(c);setView("detail");trackRecent(c);}} style={{padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer",display:"flex",alignItems:"center",gap:10}} className="client-row">
                            <ClientPhoto path={c.photo_url} alt={c.name} style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",flexShrink:0}} fallback={<div style={{width:32,height:32,borderRadius:"50%",background:"var(--color-bg-hover)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"var(--color-text-muted)"}}>{c.name?.[0]}</div>}/>
                            <div>
                              <div style={{fontSize:12,fontWeight:600,color:"var(--color-text-primary)"}}>{c.name}</div>
                              <div style={{fontSize:11,color:"#ef4444",fontWeight:600}}>Readmitted within 30 days</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          {!loading&&view==="rooms"&&can(currentUser.role,"rooms",perms)&&(()=>{
            const ISOLATION_CFG={
              None:     {bg:"transparent",border:"transparent",color:"var(--color-text-muted)",label:""},
              Contact:  {bg:"rgba(245,158,11,0.12)",border:"rgba(245,158,11,0.35)",color:"#f59e0b",label:"CONTACT"},
              Droplet:  {bg:"rgba(6,182,212,0.12)",border:"rgba(6,182,212,0.35)",color:"#06b6d4",label:"DROPLET"},
              Airborne: {bg:"rgba(239,68,68,0.12)",border:"rgba(239,68,68,0.35)",color:"#ef4444",label:"AIRBORNE"},
            };
            const activeClients2=clients.filter(c=>c.status!=="Archived"&&c.status!=="Discharged"&&c.status!=="Inactive");
            const byRoom=Object.entries(
              activeClients2.reduce((acc,c)=>{const r=(c.room_or_address||"").trim()||"Unassigned";(acc[r]=acc[r]||[]).push(c);return acc;},{})
            ).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}));
            const totalIsolation=activeClients2.filter(c=>c.isolation_type&&c.isolation_type!=="None").length;
            return(
              <div style={{padding:"24px 20px",maxWidth:1100,margin:"0 auto"}}>
                <div style={{marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                  <div>
                    <div style={{fontSize:20,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.3px"}}>🛏 Rooms Board</div>
                    <div style={{fontSize:12,color:"var(--color-text-muted)",marginTop:3}}>{byRoom.length} room{byRoom.length!==1?"s":""} · {activeClients2.length} active client{activeClients2.length!==1?"s":""}{totalIsolation>0?" · "+totalIsolation+" on isolation precautions":""}</div>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {[["Contact","#f59e0b"],["Droplet","#06b6d4"],["Airborne","#ef4444"]].map(([type,col])=>{
                      const n=activeClients2.filter(c=>c.isolation_type===type).length;
                      if(!n)return null;
                      return<span key={type} style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:col+"20",border:"1px solid "+col+"50",color:col}}>🚨 {type}: {n}</span>;
                    })}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
                  {byRoom.map(([room,occupants])=>{
                    const hasIso=occupants.some(c=>c.isolation_type&&c.isolation_type!=="None");
                    const isoTypes=[...new Set(occupants.map(c=>c.isolation_type).filter(t=>t&&t!=="None"))];
                    return(
                      <div key={room} style={{background:"var(--color-bg-card)",border:"1px solid "+(hasIso?"rgba(239,68,68,0.3)":"var(--color-border)"),borderRadius:12,overflow:"hidden"}}>
                        <div style={{padding:"10px 14px",borderBottom:"1px solid var(--color-border)",display:"flex",alignItems:"center",justifyContent:"space-between",background:hasIso?"rgba(239,68,68,0.05)":"var(--color-bg-surface)"}}>
                          <span style={{fontSize:13,fontWeight:700,color:"var(--color-text-primary)",fontFamily:"'DM Mono',monospace"}}>🛏 {room}</span>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                            {isoTypes.map(t=>{const cfg=ISOLATION_CFG[t];return cfg?<span key={t} style={{fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:20,background:cfg.bg,border:"1px solid "+cfg.border,color:cfg.color,letterSpacing:0.4}}>{cfg.label}</span>:null;})}
                            <span style={{fontSize:10,fontWeight:600,color:"var(--color-text-muted)",padding:"2px 7px",borderRadius:20,background:"var(--color-bg-hover)"}}>{occupants.length} client{occupants.length!==1?"s":""}</span>
                          </div>
                        </div>
                        <div style={{padding:8,display:"flex",flexDirection:"column",gap:6}}>
                          {occupants.map(c=>{
                            const age=calcAge(c.date_of_birth);
                            const fr=calcFallRisk(c);
                            const frCol=fr.level==="High"?"#ef4444":fr.level==="Medium"?"#f59e0b":"#10b981";
                            const iso=ISOLATION_CFG[c.isolation_type||"None"];
                            const topDiag=(c.diagnoses||[]).find(d=>d.value);
                            return(
                              <div key={c.id} onClick={()=>{setSelected(c);setView("detail");trackRecent(c);}}
                                style={{display:"flex",gap:10,alignItems:"center",padding:"8px 10px",borderRadius:8,cursor:"pointer",background:"var(--color-bg-hover)",border:"1px solid "+(c.isolation_type&&c.isolation_type!=="None"?iso.border:"transparent"),transition:"background 120ms ease"}}
                                className="card-hover">
                                <ClientPhoto path={c.photo_url} alt={c.name} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",flexShrink:0}} fallback={<div style={{width:36,height:36,borderRadius:"50%",background:"var(--color-bg-hover)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--color-text-muted)"}}>{c.name?.[0]}</div>}/>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:12,fontWeight:700,color:"var(--color-text-primary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                                  <div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:1}}>{age!==null?age+"y":""}{topDiag?(age!==null?" · ":"")+topDiag.value:""}</div>
                                </div>
                                <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:frCol+"20",border:"1px solid "+frCol+"40",color:frCol,flexShrink:0}}>{fr.level} FR</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {!loading&&view==="incidents"&&can(currentUser.role,"incidents_view",perms)&&(()=>{
            const SEVCOLS={Low:"#34d399",Moderate:"#f59e0b",High:"#ef4444",Critical:"#ef4444"};
            const allInc=clients.flatMap(c=>(c.incidents||[]).map(i=>({...i,clientName:c.name,client:c}))).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
            const ago7=new Date(Date.now()-7*864e5).toISOString().slice(0,10);
            const recent=allInc.filter(i=>i.date&&i.date>=ago7);

            // ── Trend data: last 8 weeks ──
            const weeks=Array.from({length:8},(_,i)=>{
              const end=new Date(Date.now()-(i)*7*864e5);
              const start=new Date(Date.now()-(i+1)*7*864e5);
              const endStr=end.toISOString().slice(0,10);
              const startStr=start.toISOString().slice(0,10);
              const label="Wk "+(8-i);
              const count=allInc.filter(inc=>inc.date&&inc.date>=startStr&&inc.date<endStr).length;
              return{label,count,startStr,endStr};
            }).reverse();
            const maxWeek=Math.max(...weeks.map(w=>w.count),1);

            // ── By severity ──
            const bySev=Object.entries(SEVCOLS).map(([sev,col])=>({sev,col,count:allInc.filter(i=>(i.severity||"Low")===sev).length})).filter(s=>s.count>0);

            // ── By type ──
            const typeMap={};allInc.forEach(i=>{const t=i.type||"Other";typeMap[t]=(typeMap[t]||0)+1;});
            const byType=Object.entries(typeMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
            const maxType=Math.max(...byType.map(([,c])=>c),1);

            return(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <div>
                    <div style={{fontSize:20,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.4px"}}>Incidents</div>
                    <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"var(--color-text-muted)",marginTop:2}}>{allInc.length} total · {recent.length} in last 7 days</div>
                  </div>
                </div>

                {/* ── Trend Charts ── */}
                {allInc.length>0&&(
                  <div className="three-col" style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:12,marginBottom:20}}>
                    {/* Weekly bar chart */}
                    <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--color-text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:12}}>Trend — Last 8 Weeks</div>
                      <div style={{display:"flex",alignItems:"flex-end",gap:6,height:80}}>
                        {weeks.map((w,i)=>(
                          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                            <div style={{fontSize:9,fontWeight:700,color:w.count>0?"var(--color-text-secondary)":"transparent",fontFamily:"'DM Mono',monospace"}}>{w.count||""}</div>
                            <div style={{width:"100%",borderRadius:"3px 3px 0 0",background:w.count>0?"var(--color-accent)":"var(--color-border)",height:Math.max(4,(w.count/maxWeek)*64)+"px",transition:"height 0.3s",opacity:i===7?1:0.6+i*0.05}}/>
                            <div style={{fontSize:9,color:"var(--color-text-muted)",fontFamily:"'DM Mono',monospace"}}>{w.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* By severity */}
                    <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--color-text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:12}}>By Severity</div>
                      <div style={{display:"flex",flexDirection:"column",gap:7}}>
                        {bySev.map(({sev,col,count})=>(
                          <div key={sev}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                              <span style={{color:col,fontWeight:600}}>{sev}</span>
                              <span style={{color:"var(--color-text-muted)",fontFamily:"'DM Mono',monospace"}}>{count}</span>
                            </div>
                            <div style={{height:6,borderRadius:3,background:"rgba(128,128,128,0.12)",overflow:"hidden"}}>
                              <div style={{height:"100%",width:(count/allInc.length*100)+"%",background:col,borderRadius:3}}/>
                            </div>
                          </div>
                        ))}
                        {bySev.length===0&&<div style={{fontSize:12,color:"var(--color-text-muted)"}}>No data</div>}
                      </div>
                    </div>

                    {/* By type */}
                    <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,padding:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--color-text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:12}}>By Type</div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {byType.map(([type,count])=>(
                          <div key={type}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}>
                              <span style={{color:"var(--color-text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:90}}>{type}</span>
                              <span style={{color:"var(--color-text-muted)",fontFamily:"'DM Mono',monospace",flexShrink:0}}>{count}</span>
                            </div>
                            <div style={{height:5,borderRadius:3,background:"rgba(128,128,128,0.12)",overflow:"hidden"}}>
                              <div style={{height:"100%",width:(count/maxType*100)+"%",background:"var(--color-accent)",borderRadius:3,opacity:0.7}}/>
                            </div>
                          </div>
                        ))}
                        {byType.length===0&&<div style={{fontSize:12,color:"var(--color-text-muted)"}}>No data</div>}
                      </div>
                    </div>
                  </div>
                )}

                {allInc.length===0?(
                  <div style={{textAlign:"center",padding:"60px 20px",color:"var(--color-text-muted)"}}>
                    <div style={{fontSize:36,marginBottom:12}}>✓</div>
                    <div style={{fontSize:16,fontWeight:600,color:"var(--color-text-secondary)"}}>No incidents recorded</div>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {allInc.map((inc,i)=>{
                      const sc=SEVCOLS[inc.severity]||"#6366f1";
                      return(
                        <div key={i} onClick={()=>{setSelected(inc.client);setView("detail");trackRecent(inc.client);}}
                          style={{display:"flex",gap:12,padding:"12px 16px",background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderLeft:"3px solid "+sc,borderRadius:12,cursor:"pointer",alignItems:"flex-start"}}>
                          <div style={{width:7,height:7,borderRadius:"50%",background:sc,marginTop:5,flexShrink:0}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                              <span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{inc.clientName}</span>
                              <span style={{fontSize:11,fontWeight:600,padding:"1px 8px",borderRadius:20,background:sc+"18",color:sc,border:"1px solid "+sc+"30"}}>{inc.severity||"Unknown"}</span>
                              <span style={{fontSize:11,color:"var(--color-text-dim)"}}>{inc.type||"Incident"}</span>
                            </div>
                            {inc.description&&<div style={{fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.5,marginBottom:4}}>{inc.description.slice(0,200)}{inc.description.length>200?"…":""}</div>}
                            {inc.action_taken&&<div style={{fontSize:11,color:"var(--color-text-muted)"}}>Action: {inc.action_taken.slice(0,120)}</div>}
                          </div>
                          <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"var(--color-text-muted)",flexShrink:0,textAlign:"right"}}>
                            {inc.date?new Date(inc.date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
          {!loading&&view==="appointments"&&(()=>{
            const today=tod();
            const cutoff30=new Date();cutoff30.setDate(cutoff30.getDate()-30);
            const cutoffStr=cutoff30.toISOString().slice(0,10);
            const daysOverdue=dateStr=>{
              if(!dateStr)return 0;
              const d=Math.floor((new Date(today+"T00:00:00")-new Date(dateStr+"T00:00:00"))/(1000*60*60*24));
              return d>0?d:0;
            };
            const allMissed=clients.filter(c=>!c.archived).flatMap(c=>{
              const ma=getMissedAppointments(c.appointments);
              return(c.appointments||[])
                .filter(a=>a.date&&(a.status==="No-Show"||(a.status==="Scheduled"&&a.date<today)))
                .map(a=>({...a,clientName:c.name,client:c,isPattern:ma.pattern,daysOverdue:daysOverdue(a.date)}));
            }).sort((a,b)=>b.daysOverdue-a.daysOverdue);
            const noShows=allMissed.filter(a=>a.status==="No-Show");
            const overdue=allMissed.filter(a=>a.status==="Scheduled");
            const patternClients=[...new Map(allMissed.filter(a=>a.isPattern).map(a=>[a.client.id,a.client])).values()];
            const filtered=apptFilter==="no-show"?noShows:apptFilter==="overdue"?overdue:apptFilter==="pattern"?allMissed.filter(a=>a.isPattern):allMissed;

            const markRescheduled=async(a,e)=>{
              e.stopPropagation();
              const updated=(a.client.appointments||[]).map(ap=>ap.id===a.id?{...ap,status:"Scheduled",date:"",notes:(ap.notes?ap.notes+" | ":"")+"Rescheduled from "+ap.date}:ap);
              await supabase.from("clients").update({appointments:JSON.stringify(updated)}).eq("id",a.client.id);
              setClients(prev=>prev.map(c=>c.id===a.client.id?{...c,appointments:updated}:c));
            };
            const markNoShow=async(a,e)=>{
              e.stopPropagation();
              const updated=(a.client.appointments||[]).map(ap=>ap.id===a.id?{...ap,status:"No-Show"}:ap);
              await supabase.from("clients").update({appointments:JSON.stringify(updated)}).eq("id",a.client.id);
              setClients(prev=>prev.map(c=>c.id===a.client.id?{...c,appointments:updated}:c));
            };

            const renderRow=(a,i)=>{
              const isNoShow=a.status==="No-Show";
              const urgColor=a.daysOverdue>14?"#ef4444":a.daysOverdue>7?"#f59e0b":"#fbbf24";
              return(
                <div key={a.id||i} onClick={()=>{setSelected(a.client);setView("detail");trackRecent(a.client);}}
                  className="dash-row missed-row" style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:9,cursor:"pointer",border:"1px solid var(--color-border)",marginBottom:6,background:"var(--color-bg-card)",position:"relative"}}>
                  {a.isPattern&&<div style={{position:"absolute",top:0,left:0,bottom:0,width:3,borderRadius:"9px 0 0 9px",background:"#ef4444"}}/>}
                  <div style={{width:36,height:36,borderRadius:10,background:isNoShow?"rgba(239,68,68,0.12)":"rgba(245,158,11,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,marginLeft:a.isPattern?4:0}}>
                    {isNoShow?"🚫":"⏰"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:13,fontWeight:700,color:"var(--color-text-primary)"}}>{a.clientName}</span>
                      {a.isPattern&&<span style={{fontSize:9,fontFamily:"'DM Mono',monospace",background:"rgba(239,68,68,0.15)",color:"#f87171",borderRadius:4,padding:"1px 5px",fontWeight:700,border:"1px solid rgba(239,68,68,0.2)"}}>PATTERN</span>}
                    </div>
                    <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:1}}>{a.type||"Appointment"}{a.transport?" · "+a.transport:""}</div>
                    {a.notes&&<div style={{fontSize:11,color:"var(--color-text-dim)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.notes}</div>}
                  </div>
                  <div className="missed-row-actions" style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:isNoShow?"#ef4444":urgColor,fontWeight:700}}>{isNoShow?"NO-SHOW":a.daysOverdue+"d overdue"}</div>
                      <div style={{fontSize:11,color:"var(--color-text-dim)",marginTop:1}}>{a.date}</div>
                    </div>
                    {!isNoShow&&(
                      <button onClick={(e)=>markNoShow(a,e)} title="Mark as No-Show"
                        style={{fontSize:11,padding:"3px 8px",borderRadius:5,border:"1px solid rgba(239,68,68,0.25)",background:"rgba(239,68,68,0.08)",color:"#f87171",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace"}}>
                        No-Show
                      </button>
                    )}
                    <button onClick={(e)=>markRescheduled(a,e)} title="Mark as rescheduled"
                      style={{fontSize:11,padding:"3px 8px",borderRadius:5,border:"1px solid rgba(99,102,241,0.25)",background:"rgba(99,102,241,0.08)",color:"#a5b4fc",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace"}}>
                      Reschedule
                    </button>
                  </div>
                </div>
              );
            };

            return(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <div>
                    <div style={{fontSize:22,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.5px"}}>Missed Appointment Tracker</div>
                    <div style={{fontSize:12,color:"var(--color-text-muted)",marginTop:3}}>Overdue and no-show appointments across all active clients.</div>
                  </div>
                </div>
                {/* Summary stats */}
                <div className="four-col" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
                  {[
                    {label:"Total Missed",val:allMissed.length,color:"var(--color-text-primary)",bg:"var(--color-bg-card)"},
                    {label:"No-Shows",val:noShows.length,color:"#ef4444",bg:"rgba(239,68,68,0.07)"},
                    {label:"Overdue",val:overdue.length,color:"#f59e0b",bg:"rgba(245,158,11,0.07)"},
                    {label:"Pattern Clients",val:patternClients.length,color:"#f87171",bg:"rgba(239,68,68,0.05)"},
                  ].map(s=>(
                    <div key={s.label} style={{background:s.bg,border:"1px solid var(--color-border)",borderRadius:10,padding:"14px 16px"}}>
                      <div style={{fontSize:11,color:"var(--color-text-muted)",marginBottom:4,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.label}</div>
                      <div style={{fontSize:26,fontWeight:700,color:s.color,fontFamily:"'DM Mono',monospace",letterSpacing:"-0.03em"}}>{s.val}</div>
                    </div>
                  ))}
                </div>
                {/* Filter tabs */}
                <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:2}}>
                  {[["all","All",allMissed.length],["no-show","No-Show",noShows.length],["overdue","Overdue",overdue.length],["pattern","Pattern",allMissed.filter(a=>a.isPattern).length]].map(([val,label,count])=>(
                    <button key={val} onClick={()=>setApptFilter(val)}
                      className="filter-pill"
                      style={{padding:"5px 12px",borderRadius:6,border:"1px solid",fontSize:12,fontWeight:500,cursor:"pointer",
                        borderColor:apptFilter===val?"#6366f1":"var(--color-border)",
                        background:apptFilter===val?"rgba(99,102,241,0.12)":"transparent",
                        color:apptFilter===val?"#a5b4fc":"var(--color-text-secondary)"}}>
                      {label} {count>0&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:11,opacity:0.8}}>({count})</span>}
                    </button>
                  ))}
                </div>
                {filtered.length===0?(
                  <div style={{textAlign:"center",padding:"48px 20px",color:"var(--color-text-muted)"}}>
                    <div style={{fontSize:36,marginBottom:10}}>✅</div>
                    <div style={{fontSize:15,fontWeight:600}}>No missed appointments</div>
                    <div style={{fontSize:13,marginTop:4}}>All appointments are on track.</div>
                  </div>
                ):(
                  <>
                    {patternClients.length>0&&apptFilter==="all"&&(
                      <div style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#f87171",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>⚠ Repeated pattern detected</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {patternClients.map(c=>(
                            <button key={c.id} onClick={()=>{setSelected(c);setView("detail");trackRecent(c);}}
                              style={{fontSize:12,padding:"4px 10px",borderRadius:6,border:"1px solid rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.08)",color:"#fca5a5",cursor:"pointer"}}>
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {filtered.map(renderRow)}
                  </>
                )}
              </div>
            );
          })()}
          {!loading&&view==="medications"&&can(currentUser.role,"medications_view",perms)&&(()=>{
            const activeWithFlags=clients.filter(c=>!c.archived).map(c=>({c,flags:getMedFlags(c)}));
            const allMeds=activeWithFlags.flatMap(({c,flags})=>(c.medications||[]).filter(m=>m.name&&m.name.trim()).map(m=>({...m,clientName:c.name,client:c,isHighRisk:flags.highRisk.some(h=>h.name===m.name),polypharmacy:flags.polypharmacy,medCount:flags.medCount})));
            const flaggedClients=activeWithFlags.filter(({flags})=>flags.polypharmacy||flags.highRisk.length>0).map(({c,flags})=>({...c,_flags:flags}));
            const totalMeds=allMeds.length;
            const highRiskCount=allMeds.filter(m=>m.isHighRisk).length;
            return(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                  <div>
                    <div style={{fontSize:20,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.4px"}}>Medications</div>
                    <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"var(--color-text-muted)",marginTop:2}}>{totalMeds} total · {highRiskCount} high-risk · {flaggedClients.length} flagged clients</div>
                  </div>
                </div>
                {/* Flagged clients */}
                {flaggedClients.length>0&&(
                  <div style={{marginBottom:20}}>
                    <div style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"0.9px",color:"var(--color-text-muted)",marginBottom:10}}>⚠ Flagged Clients</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
                      {flaggedClients.map(c=>{
                        const {highRisk,polypharmacy,medCount}=c._flags;
                        return(
                          <div key={c.id} onClick={()=>{setSelected(c);setView("detail");trackRecent(c);}}
                            style={{padding:"12px 14px",background:"var(--color-bg-card)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:12,cursor:"pointer"}}>
                            <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:6}}>{c.name}</div>
                            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                              {polypharmacy&&<span style={{fontSize:11,background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:20,padding:"1px 8px",color:"#f59e0b",fontWeight:600}}>{medCount} meds · Polypharmacy</span>}
                              {highRisk.map(m=><span key={m.name} style={{fontSize:11,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:20,padding:"1px 8px",color:"#ef4444",fontWeight:600}}>{m.name}</span>)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Full medication list */}
                <div style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"0.9px",color:"var(--color-text-muted)",marginBottom:10}}>All Medications</div>
                <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,overflow:"hidden"}}>
                  {allMeds.length===0?<div style={{padding:20,color:"var(--color-text-muted)",fontSize:12}}>No medications recorded</div>:allMeds.map((m,i)=>(
                    <div key={i} onClick={()=>{setSelected(m.client);setView("detail");trackRecent(m.client);}}
                      className="client-row" style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:i<allMeds.length-1?"1px solid var(--color-border)":"none",cursor:"pointer"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:m.isHighRisk?"#ef4444":"#34d399",flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)"}}>{m.name}{m.dosage&&<span style={{fontSize:11,color:"var(--color-text-dim)",fontWeight:400}}> · {m.dosage}</span>}</div>
                        <div style={{fontSize:11,color:"var(--color-text-muted)"}}>{m.clientName}{m.frequency&&" · "+m.frequency}</div>
                      </div>
                      {m.isHighRisk&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:"rgba(239,68,68,0.12)",color:"#f87171",border:"1px solid rgba(239,68,68,0.2)",flexShrink:0}}>HIGH RISK</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {view==="clients"&&(()=>{
            // ── filtered list for clients page ──────────────────────────────────
            const avatarColors=["rgba(99,102,241,0.25)","rgba(14,165,233,0.25)","rgba(34,197,94,0.25)","rgba(245,158,11,0.25)"];
            const avatarTextColors=["#a5b4fc","#7dd3fc","#6ee7b7","#fbbf24"];
            const pageFiltered=clients.filter(c=>{
              const q=search.toLowerCase();
              const ms=c.name.toLowerCase().includes(q)||(c.room_or_address||"").toLowerCase().includes(q)||(c.azv_number||"").toLowerCase().includes(q)||(searchAllCompanies&&(companiesMap[c.company_id]||"").toLowerCase().includes(q));
              if(clientFilter==="archived")return ms&&c.archived===true;
              if(!ms||c.archived)return false;
              const fr=calcFallRisk(c);
              if(clientFilter==="hfr")return fr.level==="High";
              if(clientFilter==="mfr")return fr.level==="Moderate";
              if(clientFilter==="lfr")return fr.level==="Low";
              // "all" — match status filter
              const mst=statusFilter==="All"||(c.status||"Active")===statusFilter;
              return mst;
            });
            const filterPills=[
              {key:"all",label:"All Active",color:"#6366f1"},
              {key:"hfr",label:"High Fall Risk",color:"#ef4444"},
              {key:"mfr",label:"Med Fall Risk",color:"#f59e0b"},
              {key:"lfr",label:"Low Fall Risk",color:"#34d399"},
              {key:"archived",label:"Archived",color:"#f87171"},
            ];
            const now=Date.now();
            return(
              <div>
                {/* ── Page header ── */}
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{fontSize:20,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.4px"}}>Clients</div>
                    <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"var(--color-text-muted)",marginTop:2}}>{pageFiltered.length} {clientFilter==="archived"?"archived":statusFilter==="All"?"total":"active"}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    {/* Search */}
                    <input id="cm-search" aria-label="Search clients" style={{...INP,width:220,height:36,padding:"0 12px",fontSize:13}} placeholder="Search clients…" value={search} onChange={e=>setSearch(e.target.value)}/>
                    {/* Bulk toggle */}
                    <button onClick={()=>{setBulkMode(b=>!b);setBulkSelected(new Set());}}
                      style={{height:36,padding:"0 14px",borderRadius:8,border:"1px solid "+(bulkMode?"rgba(99,102,241,0.4)":"rgba(255,255,255,0.1)"),background:bulkMode?"rgba(99,102,241,0.12)":"transparent",color:bulkMode?"#a5b4fc":"var(--color-text-secondary)",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                      {bulkMode?"✕ Cancel":"☑ Select"}
                    </button>
                    {/* New Client */}
                    {can(currentUser.role,"add",perms)&&(
                      <button onClick={()=>{setSelected(null);setView("add");}}
                        style={{height:36,padding:"0 16px",borderRadius:9,border:"none",background:"linear-gradient(135deg,var(--btn-primary-from),var(--btn-primary-to))",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",boxShadow:"0 4px 14px rgba(99,102,241,0.25)"}}>
                        + {t.newClient.replace("+ ","")}
                      </button>
                    )}
                    {/* Export buttons */}
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={exportCSV} style={{height:36,padding:"0 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-dim)",fontSize:12,fontWeight:600,cursor:"pointer"}}>CSV</button>
                      <button onClick={exportPDF} style={{height:36,padding:"0 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-dim)",fontSize:12,fontWeight:600,cursor:"pointer"}}>PDF</button>
                    </div>
                  </div>
                </div>
                {/* ── Filter pills ── */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                  {filterPills.map(p=>{
                    const act=clientFilter===p.key;
                    return(
                      <button key={p.key} onClick={()=>setClientFilter(p.key)} className="filter-pill"
                        style={{padding:"5px 14px",borderRadius:20,border:act?"1px solid "+p.color+"60":"1px solid var(--color-border)",background:act?p.color+"18":"transparent",color:act?p.color:"var(--color-text-secondary)",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 120ms"}}>
                        {p.label}
                      </button>
                    );
                  })}
                  {/* Status sub-filter shown only on "all" */}
                  {clientFilter==="all"&&(
                    <div style={{display:"flex",gap:4,marginLeft:8}}>
                      {["Active","Inactive","Discharged","All"].map(s=>{
                        const cols={Active:"#34d399",Inactive:"#fbbf24",Discharged:"#818cf8",All:"#6366f1"};
                        const act=statusFilter===s;
                        return(
                          <button key={s} onClick={()=>setStatusFilter(s)} className="filter-pill"
                            style={{padding:"4px 10px",borderRadius:20,border:act?"1px solid "+cols[s]+"60":"1px solid var(--color-border)",background:act?cols[s]+"15":"transparent",color:act?cols[s]:"var(--color-text-muted)",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* ── Skeleton loading ── */}
                {loading&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                    {Array.from({length:6}).map((_,i)=>(
                      <div key={i} style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,padding:18,height:156}}>
                        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14}}>
                          <div className="skeleton" style={{width:44,height:44,borderRadius:12,flexShrink:0}}/>
                          <div style={{flex:1}}>
                            <div className="skeleton" style={{height:12,marginBottom:7,width:"70%"}}/>
                            <div className="skeleton" style={{height:10,width:"45%"}}/>
                          </div>
                        </div>
                        <div className="skeleton" style={{height:10,marginBottom:6,width:"90%"}}/>
                        <div className="skeleton" style={{height:10,width:"60%"}}/>
                      </div>
                    ))}
                  </div>
                )}
                {/* ── Empty state ── */}
                {!loading&&pageFiltered.length===0&&(
                  <div style={{textAlign:"center",padding:"60px 20px",color:"rgba(240,242,250,0.3)"}}>
                    <div style={{fontSize:40,marginBottom:12}}>🔍</div>
                    <div style={{fontSize:16,fontWeight:600,color:"var(--color-text-secondary)",marginBottom:6}}>{search?"No clients match your search":"No clients here"}</div>
                    <div style={{fontSize:13}}>{search?"Try a different search term":"Add your first client to get started"}</div>
                    {can(currentUser.role,"add",perms)&&!search&&(
                      <button onClick={()=>{setSelected(null);setView("add");}} style={{marginTop:20,padding:"10px 20px",borderRadius:9,border:"none",background:"linear-gradient(135deg,var(--btn-primary-from),var(--btn-primary-to))",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                        + {t.newClient.replace("+ ","")}
                      </button>
                    )}
                  </div>
                )}
                {/* ── Card grid ── */}
                {!loading&&pageFiltered.length>0&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                    {pageFiltered.map(c=>{
                      let hi=0;for(const ch of(c.name||""))hi=(hi*31+ch.charCodeAt(0))%avatarColors.length;
                      const avatarBg=avatarColors[hi];
                      const age=calcAge(c.date_of_birth);
                      const fr=calcFallRisk(c);
                      const isChecked=bulkSelected.has(c.id);
                      const meds=(c.medications||[]).length;
                      const thirtyAgo=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
                      const recentInc=(c.incidents||[]).filter(i=>i.date&&i.date>=thirtyAgo).length;
                      const checklist=c.intake_checklist||[];
                      const doneItems=checklist.filter(i=>i.done).length;
                      const pct=checklist.length?Math.round(doneItems/checklist.length*100):null;
                      const allDiags=(c.diagnoses||[]).filter(d=>d.value&&d.value.trim());
                      const diagTags=allDiags.slice(0,3);
                      const diagMore=allDiags.length-3;
                      const frColors={"High":"#ef4444","Moderate":"#f59e0b","Low":"#34d399"};
                      return(
                        <div key={c.id} onClick={()=>{
                          if(bulkMode){
                            setBulkSelected(prev=>{const n=new Set(prev);if(n.has(c.id))n.delete(c.id);else n.add(c.id);return n;});
                          } else {
                            setSelected(c);setView("detail");setDeleteConfirm(false);trackRecent(c);
                          }
                        }}
                          className="client-card" style={{background:"var(--color-bg-card)",border:"1px solid "+(isChecked?"rgba(99,102,241,0.45)":"var(--color-border)"),borderRadius:14,padding:18,cursor:"pointer",position:"relative",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",outline:isChecked?"2px solid rgba(99,102,241,0.3)":"none"}}>
                          {/* Bulk checkbox */}
                          {bulkMode&&(
                            <div role="checkbox" aria-checked={isChecked} aria-label={"Select "+c.name} style={{position:"absolute",top:4,right:4,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <div style={{width:24,height:24,borderRadius:6,border:"2px solid "+(isChecked?"#6366f1":"rgba(255,255,255,0.2)"),background:isChecked?"#6366f1":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",fontWeight:700}}>
                                {isChecked&&"✓"}
                              </div>
                            </div>
                          )}
                          {/* Header: avatar + name + age + room */}
                          <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
                            <div style={{width:44,height:44,borderRadius:12,background:c.photo_url?"transparent":avatarBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:avatarTextColors[hi],flexShrink:0,overflow:"hidden",opacity:c.archived?0.5:1}}>
                              <ClientPhoto path={c.photo_url} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:12}} fallback={initials(c.name)}/>
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                                <span style={{fontWeight:700,fontSize:14,color:c.archived?"var(--color-text-muted)":"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:140}}>{c.name}</span>
                                {c.archived&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:4,background:"rgba(239,68,68,0.15)",color:"#f87171"}}>ARC</span>}
                                {fr.level!=="Low"&&<span style={{fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:4,background:frColors[fr.level]+"18",color:frColors[fr.level]}}>{fr.level==="High"?"HFR":"MFR"}</span>}
                              </div>
                              <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"var(--color-text-dim)",marginTop:2}}>
                                {age!==null&&age+"y"}{c.room_or_address?(age!==null?" · ":"")+c.room_or_address:""}
                              </div>
                            </div>
                          </div>
                          {/* Diagnosis tags */}
                          {diagTags.length>0&&(
                            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
                              {diagTags.map((d,i)=>(
                                <span key={i} style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:"var(--color-bg-active)",border:"1px solid var(--color-border-accent)",color:"var(--color-accent-light)",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.value}</span>
                              ))}
                              {diagMore>0&&<span style={{fontSize:10,padding:"2px 6px",borderRadius:5,background:"var(--color-bg-hover)",color:"var(--color-text-dim)"}}>+{diagMore}</span>}
                            </div>
                          )}
                          {/* Stats mini-row */}
                          <div style={{display:"flex",gap:10,alignItems:"center",fontSize:11,color:"var(--color-text-dim)",fontFamily:"'DM Mono',monospace"}}>
                            <span title="Medications">💊 {meds}</span>
                            <span title="Incidents last 30d">⚠️ {recentInc}</span>
                            {pct!==null&&(
                              <div style={{flex:1,display:"flex",alignItems:"center",gap:5}}>
                                <div style={{flex:1,height:4,borderRadius:2,background:"rgba(128,128,128,0.12)",overflow:"hidden"}}>
                                  <div style={{height:"100%",width:pct+"%",background:pct===100?"#34d399":"var(--color-accent)",borderRadius:2,transition:"width 300ms"}}/>
                                </div>
                                <span style={{fontSize:10}}>{pct}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* ── Bulk action bar (fixed bottom) ── */}
                {bulkMode&&bulkSelected.size>0&&(
                  <div style={{position:"fixed",bottom:"max(24px, env(safe-area-inset-bottom))",left:"50%",transform:"translateX(-50%)",background:"#1a1d36",border:"1px solid rgba(99,102,241,0.35)",borderRadius:14,padding:"12px 20px",display:"flex",alignItems:"center",gap:12,zIndex:300,boxShadow:"0 8px 32px rgba(0,0,0,0.6)"}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#a5b4fc",fontFamily:"'DM Mono',monospace"}}>{bulkSelected.size} selected</span>
                    <button onClick={bulkExportCSV} style={{padding:"8px 16px",borderRadius:8,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.12)",color:"#a5b4fc",fontSize:12,fontWeight:700,cursor:"pointer"}}>Export CSV</button>
                    {can(currentUser.role,"delete",perms)&&clientFilter!=="archived"&&(
                      <button onClick={()=>setBulkArchiveConfirm(true)} style={{padding:"8px 16px",borderRadius:8,border:"1px solid rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.1)",color:"#fbbf24",fontSize:12,fontWeight:700,cursor:"pointer"}}>Archive Selected</button>
                    )}
                    <button onClick={()=>{setBulkMode(false);setBulkSelected(new Set());}} style={{padding:"8px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"var(--color-text-secondary)",fontSize:12,cursor:"pointer"}}>Cancel</button>
                  </div>
                )}
              </div>
            );
          })()}
          {view==="add"&&can(currentUser.role,"add",perms)&&(
            <div>
              <div style={{fontSize:17,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.3px",marginBottom:20}}>{t.newClient}</div>
              <ClientForm client={emptyClient()} onSave={saveClient} onCancel={()=>setView(selected?"detail":"clients")} saving={saving} t={t} currentUser={currentUser} cfSchema={company?.custom_fields_schema} logAudit={logAudit}/>
            </div>
          )}
          {view==="edit"&&selected&&can(currentUser.role,"edit",perms)&&(()=>{
            const editClient=clients.find(c=>c.id===selected.id)||selected;
            if(!editClient.diagnoses)return null; // partial object guard
            const others=(editPresence[selected.id]||[]).filter(p=>p.userId!==currentUser.id);
            return(
            <div>
              <div style={{fontSize:17,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.3px",marginBottom:others.length?12:20}}>Edit — {editClient.name}</div>
              {others.length>0&&(
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:9,background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.3)",marginBottom:18}}>
                  <span style={{fontSize:16}}>⚠️</span>
                  <div style={{fontSize:13,color:"#fbbf24",fontWeight:600}}>
                    {others.map(p=>p.userName).join(", ")} {others.length===1?"is":"are"} also editing this client — saving will overwrite their changes.
                  </div>
                </div>
              )}
              <ClientForm client={editClient} onSave={saveClient} onCancel={()=>setView("detail")} saving={saving} t={t} currentUser={currentUser} cfSchema={company?.custom_fields_schema} logAudit={logAudit}/>
            </div>
            );
          })()}
          {view==="detail"&&selected&&(()=>{
            const fresh=clients.find(c=>c.id===selected.id);
            if(!fresh)return null; // client not loaded yet — wait for clients state
            return(
              <>
                {(()=>{const editors=(editPresence[fresh.id]||[]).filter(p=>p.userId!==currentUser.id);return editors.length>0&&(<div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:9,background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",marginBottom:14}}><span style={{fontSize:15}}>✏️</span><span style={{fontSize:12,color:"#818cf8",fontWeight:600}}>{editors.map(p=>p.userName).join(", ")} {editors.length===1?"is":"are"} currently editing this record</span></div>);})()}
                <ClientDetail client={fresh} onEdit={()=>{setSelected(fresh);setView("edit");}} onDelete={()=>setDeleteConfirm(true)} onRestore={()=>restoreClient(fresh)} onInlineUpdate={inlineUpdate} t={t} currentUser={currentUser} cfSchema={company?.custom_fields_schema} logAudit={logAudit}/>
                {deleteConfirm&&(
                  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
                    <div style={{background:"var(--color-bg-card)",borderRadius:16,padding:32,maxWidth:400,width:"90%",border:"1px solid rgba(255,255,255,0.08)"}}>
                      {fresh.archived?(
                        <>
                          <div style={{fontSize:16,marginBottom:10,color:"var(--color-text-primary)",fontWeight:700,letterSpacing:"-0.2px"}}>🗑️ Permanently Delete</div>
                          <div style={{color:"var(--color-text-dim)",marginBottom:6}}>This will <strong style={{color:"#ef4444"}}>permanently delete</strong> <strong style={{color:"var(--color-text-primary)"}}>{fresh.name}</strong>. This cannot be undone.</div>
                          <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#f87171",marginBottom:20}}>⚠️ All clinical data, notes, and documents will be lost forever.</div>
                          <div style={{display:"flex",gap:10}}>
                            <button onClick={()=>setDeleteConfirm(false)} style={{flex:1,padding:"10px",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-secondary)",fontWeight:600}}>{t.cancel}</button>
                            <button onClick={hardDeleteClient} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:"#ef4444",color:"#fff",fontWeight:700}}>Delete Forever</button>
                          </div>
                        </>
                      ):(
                        <>
                          <div style={{fontSize:16,marginBottom:10,color:"var(--color-text-primary)",fontWeight:700,letterSpacing:"-0.2px"}}>📦 Archive Client</div>
                          <div style={{color:"var(--color-text-dim)",marginBottom:6}}>Archive <strong style={{color:"var(--color-text-primary)"}}>{fresh.name}</strong>? They will be hidden from the active list but all data is preserved.</div>
                          <div style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#a5b4fc",marginBottom:20}}>✓ You can restore this client at any time from the Archived filter.</div>
                          <div style={{display:"flex",gap:10}}>
                            <button onClick={()=>setDeleteConfirm(false)} style={{flex:1,padding:"10px",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-secondary)",fontWeight:600}}>{t.cancel}</button>
                            <button onClick={archiveClient} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:"#f59e0b",color:"#fff",fontWeight:700}}>📦 Archive</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
          </div>{/* end inner padding div */}
        </div>
      </div>

      {/* ═══ BULK ARCHIVE CONFIRM ═══ */}
      {bulkArchiveConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"var(--color-bg-card)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:32,maxWidth:400,width:"100%",boxShadow:"0 24px 60px rgba(0,0,0,0.6)"}}>
            <div style={{fontSize:36,textAlign:"center",marginBottom:12}}>📦</div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.3px",textAlign:"center",marginBottom:10}}>Archive {bulkSelected.size} Client{bulkSelected.size!==1?"s":""}?</div>
            <div style={{fontSize:13,color:"var(--color-text-secondary)",textAlign:"center",lineHeight:1.7,marginBottom:28}}>They will be hidden from the active list. All data is preserved and can be restored from the Archived filter.</div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setBulkArchiveConfirm(false)} style={{padding:"10px 28px",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-secondary)",fontWeight:600,fontSize:14}}>Cancel</button>
              <button onClick={bulkArchive} style={{padding:"10px 28px",borderRadius:9,border:"none",background:"#f59e0b",color:"#fff",fontWeight:700,fontSize:14}}>📦 Archive All</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ NOTIFICATION PANEL ═══ */}
      {notifOpen&&(()=>{
        const notifs=notifications;
        const markAllRead=()=>{
          const all=new Set([...readNotifIds,...notifs.map(n=>n.id)]);
          setReadNotifIds(all);
          localStorage.setItem(notifKey,JSON.stringify([...all]));
        };
        const urgColor={high:"#ef4444",medium:"#f59e0b",low:"#6366f1"};
        const EPREF_LABELS=[["doc_expiry","Document expiry alerts"],["fall_risk","High fall risk alerts"],["incidents","New incident reports"],["appointments","Appointment reminders"]];
        return(
          <div className="notif-panel" style={{position:"fixed",top:0,right:0,width:"min(360px,100vw)",height:"100vh",height:"100dvh",background:"var(--color-bg-card)",borderLeft:"1px solid rgba(255,255,255,0.1)",zIndex:300,display:"flex",flexDirection:"column",boxShadow:"-8px 0 32px rgba(0,0,0,0.4)"}}>
            <div style={{padding:"18px 20px",borderBottom:"1px solid var(--color-border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.2px"}}>🔔 Notifications</div>
                <div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:2}}>{notifs.filter(n=>!readNotifIds.has(n.id)).length} unread · {notifs.length} total</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {notifs.some(n=>!readNotifIds.has(n.id))&&(
                  <button onClick={markAllRead} style={{padding:"5px 10px",borderRadius:7,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-dim)",fontSize:11,fontWeight:600}}>Mark all read</button>
                )}
                <button onClick={()=>setNotifOpen(false)} style={{padding:"5px 10px",borderRadius:7,border:"none",background:"var(--color-bg-hover)",color:"var(--color-text-dim)",fontSize:16,fontWeight:700}}>×</button>
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto"}}>
              {notifs.length===0?(
                <div style={{padding:40,textAlign:"center",color:"var(--color-text-muted)"}}>
                  <div style={{fontSize:32,marginBottom:8}}>✅</div>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-dim)"}}>All clear!</div>
                  <div style={{fontSize:12,marginTop:4}}>No expiring documents, upcoming appointments, or incidents in the last 7 days.</div>
                </div>
              ):notifs.map(n=>{
                const isRead=readNotifIds.has(n.id);
                const markRead=()=>{const s=new Set([...readNotifIds,n.id]);setReadNotifIds(s);localStorage.setItem(notifKey,JSON.stringify([...s]));};
                return(
                  <div key={n.id} onClick={()=>{markRead();if(n.clientId){const c=clients.find(x=>x.id===n.clientId);if(c){setSelected(c);setView("detail");trackRecent(c);setNotifOpen(false);}}}}
                    style={{padding:"14px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)",cursor:n.clientId?"pointer":"default",background:isRead?"transparent":"rgba(99,102,241,0.04)",display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{fontSize:20,flexShrink:0,marginTop:1}}>{n.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:isRead?"transparent":urgColor[n.urgency],flexShrink:0,display:"block"}}/>
                        <span style={{fontSize:12,fontWeight:700,color:isRead?"rgba(240,242,250,0.3)":"var(--color-text-primary)"}}>{n.title}</span>
                      </div>
                      <div style={{fontSize:12,color:"var(--color-text-dim)",lineHeight:1.5}}>{n.body}</div>
                      {n.clientName&&<div style={{fontSize:10,color:"#6366f1",fontWeight:600,marginTop:4}}>→ {n.clientName}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Email alert preferences */}
            <div style={{borderTop:"1px solid var(--color-border)",padding:"14px 20px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--color-text-muted)",letterSpacing:0.5,marginBottom:10}}>📧 EMAIL ALERT PREFERENCES</div>
              {EPREF_LABELS.map(([key,label])=>(
                <label key={key} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,cursor:"pointer"}}>
                  <input type="checkbox" checked={!!emailPrefs[key]} onChange={e=>{const p={...emailPrefs,[key]:e.target.checked};setEmailPrefs(p);localStorage.setItem("cm-email-prefs",JSON.stringify(p));}} style={{accentColor:"#6366f1",width:14,height:14}}/>
                  <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{label}</span>
                </label>
              ))}
              <div style={{fontSize:10,color:"rgba(255,255,255,0.1)",marginTop:6}}>Email delivery requires server configuration</div>
            </div>
          </div>
        );
      })()}
      {notifOpen&&<div onClick={()=>setNotifOpen(false)} style={{position:"fixed",inset:0,zIndex:299}}/>}

      {/* ═══ KEYBOARD SHORTCUTS MODAL ═══ */}
      {showShortcuts&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"var(--color-bg-card)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:32,maxWidth:460,width:"100%",boxShadow:"0 24px 60px rgba(0,0,0,0.5)"}}>
            <div style={{fontSize:16,fontWeight:700,color:"var(--color-text-primary)",marginBottom:4,letterSpacing:"-0.2px"}}>⌨️ Keyboard Shortcuts</div>
            <div style={{fontSize:12,color:"var(--color-text-muted)",marginBottom:20}}>Works when no input is focused</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["d","Dashboard"],["n","New client"],["k","Focus search"],["b","Notifications"],["?","This help"],["Esc","Close panels"]].map(([key,desc])=>(
                <div key={key} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid var(--color-border)"}}>
                  <span className="shortcut-key">{key}</span>
                  <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{desc}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowShortcuts(false)}
              style={{marginTop:20,width:"100%",padding:"10px",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-dim)",fontWeight:600,fontSize:14}}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
    </PermissionsContext.Provider>
  );
}
// cache bust Sat May 23 13:21:22 UTC 2026
