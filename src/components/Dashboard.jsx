import { useState, useEffect, useRef, useMemo } from "react";
import { calcAge, getMedFlags, initials, avatarColor, calcAdlSummary, calcCognitiveSummary, calcPainSummary, calcWoundSummary, calcBradenSummary, calcContinenceSummary, calcNutritionSummary, prefersReducedMotion, daysUntil, daysUntilBirthday, daysSince, checkAbnormalVitals, allergyMedConflicts, getMissedAppointments, expiryBadge } from "../lib/utils.js";
import { COLORS, ADL_ITEMS, ADL_LEVEL_COLOR, WOUND_HEALING_COLOR, BRADEN_MAX } from "../lib/constants.js";

const ADL_LABELS={bathing:"🛁 Bathing",dressing:"👕 Dressing",toileting:"🚽 Toileting",eating:"🍽️ Eating",mobility:"🚶 Mobility",grooming:"✂️ Grooming"};

function TiltCard({icon,label,value,color,glowColor}){
  const ref=useRef(null);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    if(prefersReducedMotion)return;
    const applyTilt=(x,y,deg)=>{
      el.style.transform=`rotateX(${-y*deg}deg) rotateY(${x*deg}deg) translateY(-3px)`;
      el.style.boxShadow="0 20px 40px rgba(0,0,0,0.5)";
    };
    const reset=()=>{el.style.transform="";el.style.boxShadow="0 1px 3px rgba(0,0,0,0.3)";};
    const onMove=e=>{
      const r=el.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-0.5;
      const y=(e.clientY-r.top)/r.height-0.5;
      applyTilt(x,y,10);
    };
    const onTouch=e=>{
      const t=e.touches[0];
      const r=el.getBoundingClientRect();
      const x=(t.clientX-r.left)/r.width-0.5;
      const y=(t.clientY-r.top)/r.height-0.5;
      applyTilt(x,y,8);
    };
    el.addEventListener("mousemove",onMove);
    el.addEventListener("mouseleave",reset);
    el.addEventListener("touchmove",onTouch,{passive:true});
    el.addEventListener("touchend",reset,{passive:true});
    return()=>{
      el.removeEventListener("mousemove",onMove);
      el.removeEventListener("mouseleave",reset);
      el.removeEventListener("touchmove",onTouch);
      el.removeEventListener("touchend",reset);
    };
  },[]);
  return(
    <div ref={ref} style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:"14px 16px",cursor:"pointer",position:"relative",overflow:"hidden",transition:prefersReducedMotion?"none":"transform 180ms ease, box-shadow 180ms ease"}}>
      {/* Ambient glow */}
      <div style={{position:"absolute",width:80,height:80,borderRadius:"50%",top:-20,right:-20,pointerEvents:"none",opacity:0.2,background:`radial-gradient(circle, ${glowColor||color} 0%, transparent 70%)`}}/>
      <div style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"0.7px",color:"var(--color-text-muted)",marginBottom:8}}>{label}</div>
      <div style={{fontSize:28,fontWeight:700,color:"var(--color-text-primary)",fontFamily:"'DM Mono',monospace",letterSpacing:"-1px",lineHeight:1}}>{value}</div>
    </div>
  );
}

function FlipCard({frontIcon,frontLabel,backValue,backSub,backGradient}){
  const [flipped,setFlipped]=useState(false);
  return(
    <div style={{height:116,perspective:"600px"}} onMouseEnter={()=>!prefersReducedMotion&&setFlipped(true)} onMouseLeave={()=>setFlipped(false)} onClick={()=>setFlipped(f=>!f)}>
      <div style={{position:"relative",width:"100%",height:"100%",transformStyle:"preserve-3d",transition:prefersReducedMotion?"none":"transform 0.35s cubic-bezier(0.4,0,0.2,1)",transform:flipped?"rotateY(180deg)":"rotateY(0deg)"}}>
        <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,overflow:"hidden"}}>
          <div style={{fontSize:26}}>{frontIcon}</div>
          <div style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-muted)",letterSpacing:"0.9px",textTransform:"uppercase"}}>{frontLabel}</div>
        </div>
        <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",background:backGradient,border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 8px 24px rgba(0,0,0,0.3)",borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,transform:"rotateY(180deg)"}}>
          <div style={{fontSize:32,fontWeight:700,color:"#fff",lineHeight:1,fontFamily:"'DM Mono',monospace"}}>{backValue}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",textAlign:"center",padding:"0 16px",lineHeight:1.5}}>{backSub}</div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({clients,onSelect,t,currentUser}){
  const total=clients.length;
  const totalMeds=clients.reduce((s,c)=>s+(c.medications||[]).filter(m=>m.name&&m.name.trim()).length,0);
  const totalAllergies=clients.reduce((s,c)=>s+(c.allergies||[]).filter(a=>a.value&&a.value.trim()).length,0);
  const totalDiag=clients.reduce((s,c)=>s+(c.diagnoses||[]).filter(d=>d.value&&d.value.trim()).length,0);
  const allergyClients=clients.filter(c=>(c.allergies||[]).some(a=>a.value&&a.value.trim()));
  const flagged=useMemo(()=>clients.reduce((acc,c)=>{const f=getMedFlags(c);if(f.polypharmacy||f.highRisk.length>0)acc.push({...c,_flags:f});return acc;},[]),[clients]);
  // Doc expiry — expanded to 90 days
  const expiring=clients.flatMap(c=>(c.documents||[]).filter(d=>d.expiry&&daysUntil(d.expiry)!==null&&daysUntil(d.expiry)<=90).map(d=>({...d,clientName:c.name,days:daysUntil(d.expiry),client:c}))).sort((a,b)=>a.days-b.days);
  // Birthdays in next 30 days
  const birthdays=clients.filter(c=>c.date_of_birth).map(c=>({...c,bDays:daysUntilBirthday(c.date_of_birth)})).filter(c=>c.bDays!==null&&c.bDays<=30).sort((a,b)=>a.bDays-b.bDays);
  // Abnormal vitals — most recent vital per client
  const abnormalVitals=clients.flatMap(c=>{
    const sorted=[...(c.vitals||[])].sort((a,b)=>b.date.localeCompare(a.date));
    const latest=sorted[0];
    if(!latest)return[];
    const flags=checkAbnormalVitals(latest);
    return flags.length>0?[{client:c,clientName:c.name,date:latest.date,flags}]:[];
  });
  // Allergy ↔ medication conflicts
  const allergyMedAlerts=clients.map(c=>({client:c,clientName:c.name,conflicts:allergyMedConflicts(c)})).filter(x=>x.conflicts.length>0);
  // Care plan staleness — items not reviewed in 90+ days
  const STALE_DAYS=90;
  const stalePlans=clients.filter(c=>{
    const plans=(c.care_plan||[]).filter(p=>p.goal||p.plan);
    if(plans.length===0)return false;
    return plans.some(p=>daysSince(p.reviewed||p.created)>STALE_DAYS);
  }).map(c=>{
    const plans=(c.care_plan||[]).filter(p=>p.goal||p.plan);
    const stalest=plans.reduce((max,p)=>Math.max(max,daysSince(p.reviewed||p.created)),0);
    return{...c,stalestDays:stalest};
  });
  const rn=clients.flatMap(c=>(c.session_notes||[]).filter(n=>n.text&&n.text.trim()).map(n=>({...n,clientName:c.name,client:c}))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const ag={"60-69":0,"70-79":0,"80-89":0,"90+":0,"Unknown":0};
  clients.forEach(c=>{const a=c.date_of_birth?calcAge(c.date_of_birth):null;if(a===null)ag["Unknown"]++;else if(a<70)ag["60-69"]++;else if(a<80)ag["70-79"]++;else if(a<90)ag["80-89"]++;else ag["90+"]++;});
  const sc={Active:clients.filter(c=>(c.status||"Active")==="Active").length,Inactive:clients.filter(c=>c.status==="Inactive").length,Discharged:clients.filter(c=>c.status==="Discharged").length};
  // Flip card data
  const _now7=new Date();_now7.setDate(_now7.getDate()-7);
  const incidentLast7=clients.reduce((s,c)=>s+(c.incidents||[]).filter(inc=>inc.date&&new Date(inc.date)>=_now7).length,0);
  const intakeItems=clients.flatMap(c=>c.intake_checklist||[]);
  const intakeDone=intakeItems.filter(i=>i.done).length;
  const intakeTotal=intakeItems.length;
  const intakePct=intakeTotal>0?Math.round(intakeDone/intakeTotal*100):0;
  const highRiskMedsCount=clients.reduce((s,c)=>s+getMedFlags(c).highRisk.length,0);
  return(
    <div>
      {/* ── Stat cards ── */}
      <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14,perspective:"800px"}}>
        <TiltCard label={t.totalClients} value={total} color="#6366f1" glowColor="#6366f1"/>
        <TiltCard label={t.totalMeds} value={totalMeds} color="#0ea5e9" glowColor="#0ea5e9"/>
        <TiltCard label={t.allergyAlerts} value={totalAllergies} color="#34d399" glowColor="#34d399"/>
        <TiltCard label={t.diagnosesLogged} value={totalDiag} color="#fbbf24" glowColor="#fbbf24"/>
      </div>
      {/* ── Status pills ── */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        {Object.entries(sc).map(([s,c])=>{const cols={Active:"#34d399",Inactive:"#fbbf24",Discharged:"#818cf8"};const col=cols[s];return <span key={s} style={{fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace",padding:"3px 12px",borderRadius:20,background:col+"18",color:col,border:"1px solid "+col+"30"}}>{s}: {c}</span>;})}
      </div>
      {/* ── Flip cards ── */}
      <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <FlipCard frontIcon="💊" frontLabel="Med Flags" backValue={highRiskMedsCount} backSub="High-risk medication flags" backGradient="linear-gradient(135deg,#7f1d1d,#dc2626)"/>
        <FlipCard frontIcon="📋" frontLabel="Intake" backValue={intakePct+"%"} backSub={intakeDone+" of "+intakeTotal+" items completed"} backGradient="linear-gradient(135deg,#064e3b,#10b981)"/>
        <FlipCard frontIcon="⚠" frontLabel="Incidents" backValue={incidentLast7} backSub="Incidents in the last 7 days" backGradient="linear-gradient(135deg,#78350f,#f59e0b)"/>
      </div>
      <div className="g2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16}}>
          <div style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"0.9px",color:"var(--color-text-muted)",marginBottom:12}}>Allergy Alerts</div>
          {allergyClients.length===0?<div style={{color:"var(--color-text-muted)",fontSize:12}}>{t.noAllergies}</div>:allergyClients.map(c=>(
            <div key={c.id} onClick={()=>onSelect(c)} className="dash-row" style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:9,cursor:"pointer",marginBottom:4,borderLeft:"2px solid rgba(245,158,11,0.4)",background:"rgba(245,158,11,0.04)"}}>
              <div style={{width:30,height:30,borderRadius:9,background:"rgba(245,158,11,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fbbf24",flexShrink:0}}>{initials(c.name)}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:12,color:"var(--color-text-primary)"}}>{c.name}</div><div style={{fontSize:11,color:"#fbbf24",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(c.allergies||[]).filter(a=>a.value&&a.value.trim()).map(a=>a.value).join(", ")}</div></div>
            </div>
          ))}
        </div>
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16}}>
          <div style={{fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"0.9px",color:"var(--color-text-muted)",marginBottom:12}}>Age Distribution</div>
          {total===0?<div style={{color:"var(--color-text-muted)",fontSize:12}}>{t.noClients}</div>:Object.entries(ag).filter(([,v])=>v>0).map(([group,count])=>(
            <div key={group} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--color-text-dim)",marginBottom:4,fontFamily:"'DM Mono',monospace"}}>
                <span>{group} {t.years}</span><span>{count}</span>
              </div>
              <div style={{height:5,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:(count/total*100)+"%",background:"linear-gradient(90deg,#6366f1,#818cf8)",borderRadius:3}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      {expiring.length>0&&(
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontWeight:700,color:"#f59e0b",fontSize:13,marginBottom:14}}>DOCUMENT EXPIRY ALERTS</div>
          {expiring.map((d,i)=>{const badge=expiryBadge(d.days);return(
            <div key={i} onClick={()=>onSelect(d.client)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(d.clientName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{initials(d.clientName)}</div>
              <div style={{flex:1}}><span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{d.clientName}</span><span style={{fontSize:12,color:"var(--color-text-dim)"}}> - {d.name}</span></div>
              {badge&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:badge.bg,color:badge.color,whiteSpace:"nowrap"}}>{d.days<0?"Expired":d.days+"d left"}</span>}
            </div>
          );})}
        </div>
      )}
      {flagged.length>0&&(
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontWeight:700,color:"#ef4444",fontSize:13,marginBottom:14}}>MEDICATION FLAGS</div>
          {flagged.map(c=>{const {highRisk,polypharmacy,medCount}=c._flags;return(
            <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{initials(c.name)}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:4}}>{c.name}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {polypharmacy&&<span style={{fontSize:11,background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:20,padding:"1px 8px",color:"#f59e0b",fontWeight:600}}>{medCount} {t.polypharmacy}</span>}
                  {highRisk.map(m=><span key={m.name} style={{fontSize:11,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:20,padding:"1px 8px",color:"#ef4444",fontWeight:600}}>{t.highRisk} {m.name}</span>)}
                </div>
              </div>
            </div>
          );})}
        </div>
      )}
      {/* ── Birthdays ── */}
      {birthdays.length>0&&(
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontWeight:700,color:"#ec4899",fontSize:13,marginBottom:14}}>🎂 UPCOMING BIRTHDAYS</div>
          {birthdays.map(c=>{
            const thisWeek=c.bDays<=7;
            const age=calcAge(c.date_of_birth);
            return(
              <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
                <div style={{flex:1}}>
                  <span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{c.name}</span>
                  <span style={{fontSize:12,color:"var(--color-text-dim)",marginLeft:8}}>turns {age!==null?age+1:""}</span>
                </div>
                <span style={{fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:20,background:thisWeek?"rgba(236,72,153,0.2)":"rgba(236,72,153,0.08)",color:"#ec4899",whiteSpace:"nowrap"}}>
                  {c.bDays===0?"Today 🎉":c.bDays===1?"Tomorrow":thisWeek?"in "+c.bDays+" days":"in "+c.bDays+" days"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Abnormal Vitals ── */}
      {abnormalVitals.length>0&&(
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontWeight:700,color:"#ef4444",fontSize:13,marginBottom:14}}>🩺 ABNORMAL VITALS</div>
          {abnormalVitals.map(({client:c,clientName,date,flags})=>(
            <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 12px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(clientName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(clientName)}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:4}}>{clientName} <span style={{fontSize:11,color:"var(--color-text-muted)",fontWeight:400}}>— recorded {new Date(date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span></div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {flags.map((f,i)=>(
                    <span key={i} style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:f.sev==="high"?"rgba(239,68,68,0.15)":"rgba(245,158,11,0.15)",color:f.sev==="high"?"#f87171":"#fbbf24",border:"1px solid "+(f.sev==="high"?"rgba(239,68,68,0.3)":"rgba(245,158,11,0.3)")}}>
                      {f.sev==="high"?"↑":"↓"} {f.label} — {f.note}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Allergy ↔ Med Conflicts ── */}
      {allergyMedAlerts.length>0&&(
        <div style={{background:"var(--color-bg-card)",border:"1px solid #ef4444",borderRadius:12,padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,color:"#ef4444",fontSize:13,marginBottom:4}}>⚠️ ALLERGY — MEDICATION CONFLICTS</div>
          <div style={{fontSize:11,color:"var(--color-text-dim)",marginBottom:12}}>A prescribed medication matches a known allergy. Review immediately.</div>
          {allergyMedAlerts.map(({client:c,clientName,conflicts})=>(
            <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(clientName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(clientName)}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:6}}>{clientName}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {conflicts.map((m,i)=>(
                    <span key={i} style={{fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:20,background:"rgba(239,68,68,0.15)",color:"#f87171",border:"1px solid rgba(239,68,68,0.3)"}}>
                      💊 {m.name}{m.dosage?" "+m.dosage:""}
                    </span>
                  ))}
                </div>
              </div>
              <span style={{fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:20,background:"#ef4444",color:"#fff",flexShrink:0}}>CONFLICT</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Missed Appointments ── */}
      {(()=>{
        const missedClients=clients.filter(c=>!c.archived).map(c=>({...c,ma:getMissedAppointments(c.appointments)})).filter(({ma})=>ma.pattern||ma.overdue.length>0||ma.noShows.length>0).sort((a,b)=>(b.ma.pattern?1:0)-(a.ma.pattern?1:0)||(b.ma.recentMissed.length-a.ma.recentMissed.length));
        if(missedClients.length===0)return null;
        return(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,color:"#f59e0b",fontSize:13,marginBottom:4}}>📅 MISSED APPOINTMENT TRACKER</div>
            <div style={{fontSize:11,color:"var(--color-text-dim)",marginBottom:12}}>Clients with No-Show records or overdue scheduled appointments.</div>
            {missedClients.map(({ma,...c})=>(
              <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8,borderLeft:"3px solid "+(ma.pattern?"#ef4444":"#f59e0b")}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:4}}>{c.name}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {ma.noShows.length>0&&<span style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,background:"rgba(239,68,68,0.12)",color:"#f87171",border:"1px solid rgba(239,68,68,0.25)"}}>No-Shows: {ma.noShows.length}</span>}
                    {ma.overdue.length>0&&<span style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,background:"rgba(245,158,11,0.12)",color:"#fbbf24",border:"1px solid rgba(245,158,11,0.25)"}}>Overdue: {ma.overdue.length}</span>}
                    {ma.pattern&&<span style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,background:"rgba(239,68,68,0.18)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.4)"}}>⚠ Pattern</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── ADL Dependency ── */}
      {(()=>{
        const adlClients=clients.filter(c=>!c.archived).map(c=>({...c,adlSum:calcAdlSummary(c.adl_logs)})).filter(({adlSum})=>adlSum&&adlSum.dep.label!=="Low").sort((a,b)=>(b.adlSum.score-a.adlSum.score));
        if(adlClients.length===0)return null;
        return(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:4}}>🧍 ADL DEPENDENCY</div>
            <div style={{fontSize:11,color:"var(--color-text-dim)",marginBottom:12}}>Clients with Moderate or High ADL dependency based on latest assessment.</div>
            {adlClients.map(({adlSum,...c})=>(
              <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8,borderLeft:"3px solid "+adlSum.dep.color}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:3}}>{c.name}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {ADL_ITEMS.map(k=>{const lvl=adlSum.latest.items?.[k]||"Independent";return lvl!=="Independent"?<span key={k} style={{fontSize:11,padding:"1px 7px",borderRadius:12,background:ADL_LEVEL_COLOR[lvl]+"18",color:ADL_LEVEL_COLOR[lvl],border:"1px solid "+ADL_LEVEL_COLOR[lvl]+"35"}}>{ADL_LABELS[k].split(" ")[0]} {lvl}</span>:null;})}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:adlSum.dep.color}}>{adlSum.dep.label}</div>
                  <div style={{fontSize:11,color:"var(--color-text-dim)"}}>{adlSum.score}/18{adlSum.trend&&adlSum.trend!=="stable"?<span style={{color:adlSum.trend==="declining"?"#f87171":"#10b981"}}> {adlSum.trend==="declining"?"↓":"↑"}</span>:""}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Pain Alerts ── */}
      {(()=>{
        const painClients=clients.filter(c=>!c.archived).map(c=>({...c,painSum:calcPainSummary(c.pain_assessments)})).filter(({painSum})=>painSum&&(painSum.latestScore>=4||painSum.persistent)).sort((a,b)=>b.painSum.latestScore-a.painSum.latestScore);
        if(painClients.length===0)return null;
        return(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,color:"#f59e0b",fontSize:13,marginBottom:4}}>🩹 PAIN ALERTS</div>
            <div style={{fontSize:11,color:"var(--color-text-dim)",marginBottom:12}}>Clients with recent pain score ≥4/10 or persistent moderate-to-severe pain.</div>
            {painClients.map(({painSum,...c})=>(
              <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8,borderLeft:"3px solid "+painSum.level.color}}>
                <span style={{fontSize:22,flexShrink:0}}>{painSum.latestScore>=7?"😣":painSum.latestScore>=4?"😐":"😊"}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:3}}>{c.name}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {painSum.latest.location&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>📍 {painSum.latest.location}</span>}
                    {painSum.latest.character&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>〰 {painSum.latest.character}</span>}
                    {painSum.persistent&&<span style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,background:"rgba(245,158,11,0.15)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.3)"}}>Persistent</span>}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:800,fontSize:18,color:painSum.level.color}}>{painSum.latestScore}/10</div>
                  <div style={{fontSize:11,color:painSum.level.color}}>{painSum.level.label}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Wound Alerts ── */}
      {(()=>{
        const woundClients=clients.filter(c=>!c.archived).map(c=>({...c,ws:calcWoundSummary(c.wound_assessments)})).filter(({ws})=>ws&&ws.activeSites.length>0).sort((a,b)=>b.ws.deteriorating.length-a.ws.deteriorating.length||b.ws.highStage.length-a.ws.highStage.length||b.ws.activeSites.length-a.ws.activeSites.length);
        if(woundClients.length===0)return null;
        return(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:4}}>🩺 WOUND & SKIN ALERTS</div>
            <div style={{fontSize:11,color:"var(--color-text-dim)",marginBottom:12}}>Clients with active wounds. Deteriorating or high-stage cases shown first.</div>
            {woundClients.map(({ws,...c})=>(
              <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8,borderLeft:"3px solid "+(ws.deteriorating.length>0?"#ef4444":ws.highStage.length>0?"#f59e0b":"#06b6d4")}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:4}}>{c.name}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {ws.activeSites.map(w=>{
                      const hc=WOUND_HEALING_COLOR[w.healing_status]||"rgba(240,242,250,0.3)";
                      return<span key={w.site} style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,background:hc+"18",color:hc,border:"1px solid "+hc+"35"}}>{w.site}{w.stage&&w.stage!=="N/A"?" "+w.stage:""} · {w.healing_status}</span>;
                    })}
                    {ws.healedCount>0&&<span style={{fontSize:11,color:"#8b5cf6"}}>+{ws.healedCount} healed</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Braden Risk ── */}
      {(()=>{
        const bradenClients=clients.filter(c=>!c.archived).map(c=>({...c,bs:calcBradenSummary(c.braden_assessments)})).filter(({bs})=>bs&&bs.score<=14).sort((a,b)=>a.bs.score-b.bs.score);
        if(bradenClients.length===0)return null;
        return(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,color:"#8b5cf6",fontSize:13,marginBottom:4}}>🛏 BRADEN SCALE — PRESSURE ULCER RISK</div>
            <div style={{fontSize:11,color:"var(--color-text-dim)",marginBottom:12}}>Clients scored ≤14 (Moderate to Very High Risk). Lowest score shown first.</div>
            {bradenClients.map(({bs,...c})=>(
              <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8,borderLeft:"3px solid "+bs.risk.color}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:3}}>{c.name}</div>
                  <div style={{fontSize:11,color:"var(--color-text-muted)"}}>🔄 {bs.latest.turning_schedule||bs.risk.turning}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:800,fontSize:18,color:bs.risk.color}}>{bs.score}<span style={{fontSize:11,fontWeight:400,color:"var(--color-text-muted)"}}>/{BRADEN_MAX}</span></div>
                  <div style={{fontSize:11,color:bs.risk.color,fontWeight:600}}>{bs.risk.label}</div>
                  {bs.trend&&<div style={{fontSize:10,color:bs.trend==="improving"?"#10b981":bs.trend==="declining"?"#ef4444":"rgba(240,242,250,0.3)"}}>{bs.trend==="improving"?"↑":bs.trend==="declining"?"↓":"→"} {bs.trend}</div>}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Cognitive Screening ── */}
      {(()=>{
        const cogClients=clients.filter(c=>!c.archived).map(c=>({...c,cog:calcCognitiveSummary(c.cognitive_assessments)})).filter(({cog})=>cog&&(cog.level.label==="Moderate Impairment"||cog.level.label==="Severe Impairment"||cog.trend==="declining")).sort((a,b)=>a.cog.score-b.cog.score);
        if(cogClients.length===0)return null;
        return(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,color:"#a78bfa",fontSize:13,marginBottom:4}}>🧠 COGNITIVE SCREENING</div>
            <div style={{fontSize:11,color:"var(--color-text-dim)",marginBottom:12}}>Clients with Moderate/Severe impairment or declining trend. Lowest score first.</div>
            {cogClients.map(({cog,...c})=>(
              <div key={c.id} onClick={()=>onSelect(c)} className="dash-row" style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8,borderLeft:"3px solid "+cog.level.color}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:3}}>{c.name}</div>
                  <div style={{fontSize:11,color:"var(--color-text-muted)"}}>{cog.latest.test_type||"MMSE"} · {cog.daysSince}d ago{cog.dueReassess?" · ⚠️ Reassessment overdue":""}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:800,fontSize:18,color:cog.level.color}}>{cog.score}<span style={{fontSize:11,fontWeight:400,color:"var(--color-text-muted)"}}>/30</span></div>
                  <div style={{fontSize:11,color:cog.level.color,fontWeight:600}}>{cog.level.label}</div>
                  {cog.trend&&<div style={{fontSize:10,color:cog.trend==="improving"?"#10b981":cog.trend==="declining"?"#ef4444":"rgba(240,242,250,0.3)"}}>{cog.trend==="improving"?"↑":cog.trend==="declining"?"↓":"→"} {cog.trend}</div>}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Continence Monitoring ── */}
      {(()=>{
        const contClients=clients.filter(c=>!c.archived).map(c=>({...c,cont:calcContinenceSummary(c.continence_logs)})).filter(({cont})=>cont&&(cont.skinIssue||cont.highFrequency||cont.recentCount>=2)).sort((a,b)=>(b.cont.skinIssue?1:0)-(a.cont.skinIssue?1:0)||(Number(b.cont.avgPerDay)-Number(a.cont.avgPerDay)));
        if(contClients.length===0)return null;
        return(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:4}}>💧 CONTINENCE MONITORING</div>
            <div style={{fontSize:11,color:"var(--color-text-dim)",marginBottom:12}}>Clients with ≥2 episodes in last 7 days, high frequency, or skin breakdown. Skin issues shown first.</div>
            {contClients.map(({cont,...c})=>(
              <div key={c.id} onClick={()=>onSelect(c)} className="dash-row" style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8,borderLeft:"3px solid "+(cont.skinIssue?"#ef4444":cont.highFrequency?"#f59e0b":"#06b6d4")}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:3}}>{c.name}</div>
                  <div style={{fontSize:11,color:"var(--color-text-muted)"}}>{cont.mostCommonType||"Mixed"} · {cont.recentCount} ep in 7d</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:800,fontSize:18,color:cont.highFrequency?"#ef4444":"#06b6d4"}}>{cont.avgPerDay}<span style={{fontSize:11,fontWeight:400,color:"var(--color-text-muted)"}}>/day</span></div>
                  {cont.skinIssue&&<div style={{fontSize:11,fontWeight:700,color:"#ef4444"}}>⚠️ Skin issue</div>}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Nutritional Risk ── */}
      {(()=>{
        const nutrClients=clients.filter(c=>!c.archived).map(c=>({...c,nutr:calcNutritionSummary(c.nutrition_assessments)})).filter(({nutr})=>nutr&&nutr.score>=1).sort((a,b)=>b.nutr.score-a.nutr.score);
        if(nutrClients.length===0)return null;
        return(
          <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,color:"#10b981",fontSize:13,marginBottom:4}}>🥗 NUTRITIONAL RISK (MUST)</div>
            <div style={{fontSize:11,color:"var(--color-text-dim)",marginBottom:12}}>Clients with MUST score ≥1. Highest risk shown first.</div>
            {nutrClients.map(({nutr,...c})=>(
              <div key={c.id} onClick={()=>onSelect(c)} className="dash-row" style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8,borderLeft:"3px solid "+nutr.risk.color}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)",marginBottom:3}}>{c.name}</div>
                  <div style={{fontSize:11,color:"var(--color-text-muted)"}}>{nutr.risk.action}{nutr.latest.swallowing_difficulty?" · ⚠️ Dysphagia":""}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:800,fontSize:18,color:nutr.risk.color}}>{nutr.score}<span style={{fontSize:11,fontWeight:400,color:"var(--color-text-muted)"}}> MUST</span></div>
                  <div style={{fontSize:11,color:nutr.risk.color,fontWeight:600}}>{nutr.risk.label}</div>
                  {nutr.trend&&<div style={{fontSize:10,color:nutr.trend==="improving"?"#10b981":nutr.trend==="worsening"?"#ef4444":"rgba(240,242,250,0.3)"}}>{nutr.trend==="improving"?"↑":nutr.trend==="worsening"?"↓":"→"} {nutr.trend}</div>}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Care Plan Staleness ── */}
      {stalePlans.length>0&&(
        <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontWeight:700,color:"#8b5cf6",fontSize:13,marginBottom:4}}>📋 CARE PLAN REVIEW OVERDUE</div>
          <div style={{fontSize:11,color:"var(--color-text-dim)",marginBottom:12}}>Care plan items not reviewed in 90+ days.</div>
          {stalePlans.map(c=>(
            <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{c.name}</div></div>
              <span style={{fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:20,background:"rgba(139,92,246,0.15)",color:"#a78bfa",whiteSpace:"nowrap"}}>{c.stalestDays}d since review</span>
            </div>
          ))}
        </div>
      )}

      <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,padding:16}}>
        <div style={{fontWeight:700,color:"#7c3aed",fontSize:13,marginBottom:14}}>RECENT SESSION NOTES</div>
        {rn.length===0?<div style={{color:"var(--color-text-muted)",fontSize:13}}>{t.noNotes}</div>:rn.map((n,i)=>(
          <div key={i} onClick={()=>onSelect(n.client)} style={{display:"flex",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,cursor:"pointer",marginBottom:8}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:avatarColor(n.clientName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(n.clientName)}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                <span style={{fontWeight:700,fontSize:13,color:"var(--color-text-primary)"}}>{n.clientName}</span>
                {(n.role||n.staff_name)&&<span style={{fontSize:11,background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:20,padding:"1px 7px",color:"#7c3aed",fontWeight:600}}>{n.role}{n.role&&n.staff_name&&" - "}{n.staff_name}</span>}
                <span style={{fontSize:11,color:"var(--color-text-muted)",marginLeft:"auto"}}>{new Date(n.date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
              </div>
              <div style={{fontSize:13,color:"var(--color-text-dim)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{n.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const AUDIT_PAGE=100;
export { TiltCard, FlipCard, Dashboard };
