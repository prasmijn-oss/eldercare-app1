import { useState, useEffect, useCallback, useMemo } from "react";
import { Fragment } from "react";
import { supabase } from "../lib/supabase.js";
import { can, he, uid, tod } from "../lib/utils.js";
import { INP, LBL, ABTN, IBTN } from "../lib/constants.js";

const AUDIT_PAGE=100;

function AuditTrail({t,companyId,currentUser}){
  const [logs,setLogs]=useState([]);
  const [companies,setCompanies]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false);
  const [hasMore,setHasMore]=useState(false);
  const [page,setPage]=useState(0);
  const [fS,setFS]=useState("");
  const [fA,setFA]=useState("");
  const [fCo,setFCo]=useState("");
  const [fSec,setFSec]=useState("");
  const [fFrom,setFFrom]=useState("");
  const [fTo,setFTo]=useState("");
  const [expandedRow,setExpandedRow]=useState(null);

  const fetchLogs=useCallback(async(pageNum,append=false)=>{
    if(pageNum===0)setLoading(true);else setLoadingMore(true);
    const isSA=currentUser?.role==="superadmin";
    let q=supabase.from("audit_log").select("*").order("performed_at",{ascending:false})
      .range(pageNum*AUDIT_PAGE,(pageNum+1)*AUDIT_PAGE-1);
    if(!isSA&&companyId)q=q.eq("company_id",companyId);
    if(fS)q=q.eq("performed_by",fS);
    if(fA)q=q.eq("action",fA);
    if(fCo)q=q.eq("company_id",fCo);
    if(fSec)q=q.eq("section",fSec);
    if(fFrom)q=q.gte("performed_at",fFrom+"T00:00:00");
    if(fTo)q=q.lte("performed_at",fTo+"T23:59:59");
    const {data}=await q;
    const rows=data||[];
    setLogs(prev=>append?[...prev,...rows]:rows);
    setHasMore(rows.length===AUDIT_PAGE);
    if(pageNum===0)setLoading(false);else setLoadingMore(false);
  },[companyId,currentUser,fS,fA,fCo,fSec,fFrom,fTo]);

  useEffect(()=>{
    setPage(0);
    fetchLogs(0,false);
    supabase.from("companies").select("id,name").order("name").then(({data})=>setCompanies(data||[]));
  },[fetchLogs]);

  const loadMore=()=>{const next=page+1;setPage(next);fetchLogs(next,true);};

  const coName=id=>companies.find(c=>c.id===id)?.name||"—";
  // Derive filter options from loaded rows (server already applied server-side filters)
  const sl=[...new Set(logs.map(l=>l.performed_by))].filter(Boolean).sort();
  const al=[...new Set(logs.map(l=>l.action))].filter(Boolean).sort();
  const secList=[...new Set(logs.map(l=>l.section))].filter(Boolean).sort();
  const coIds=[...new Set(logs.map(l=>l.company_id))].filter(Boolean);
  const filterCos=companies.filter(c=>coIds.includes(c.id));
  const filtered=logs; // filtering now done server-side

  const hasFilter=fS||fA||fCo||fSec||fFrom||fTo;
  const clearFilters=()=>{setFS("");setFA("");setFCo("");setFSec("");setFFrom("");setFTo("");};

  // Section badge colours
  const sectionColor={
    "Client Profile":"#34d399","User Management":"#f59e0b","Appointments":"#60a5fa",
    "Incidents":"#f87171","Medications":"#a78bfa","Documents":"#fb923c",
    "Vitals":"#2dd4bf","Notes":"var(--color-text-secondary)","Intake":"#fbbf24",
  };
  const secColor=s=>sectionColor[s]||"rgba(240,242,250,0.3)";

  // Role label color
  const roleColor={superadmin:"#f59e0b",admin:"#a78bfa",power_user:"#34d399",user:"rgba(240,242,250,0.3)",inactive:"#ef4444"};

  const doExport=()=>{
    const rows=filtered.map(l=>"<tr><td>"+new Date(l.performed_at).toLocaleString("en-US")+"</td><td>"+(l.performed_by||"-")+(l.performed_role?" ("+l.performed_role+")":"")+"</td><td>"+(l.section?l.section+" — ":"")+(l.action||"-")+"</td><td>"+(l.details||"-")+"</td><td>"+(l.client_name||"-")+"</td><td>"+coName(l.company_id)+"</td></tr>").join("");
    const style="body{font-family:Arial,sans-serif;padding:24px}h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f8f9fa;padding:8px;text-align:left;border-bottom:2px solid #dee2e6}td{padding:7px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top}";
    const html="<!DOCTYPE html><html><head><title>Audit Trail</title><style>"+style+"</style></head><body><h1>Audit Trail</h1><p style='color:#6c757d;font-size:12px'>Exported "+new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})+" — "+filtered.length+" records"+(fFrom||fTo?" — "+(fFrom||"start")+" → "+(fTo||"now"):"")+"</p><table><thead><tr><th>Date & Time</th><th>Staff</th><th>Action</th><th>Details</th><th>Client</th><th>Company</th></tr></thead><tbody>"+rows+"</tbody></table></body></html>";
    const blob=new Blob([html],{type:"text/html"});
    const url=URL.createObjectURL(blob);
    const w=window.open(url,"_blank");
    if(w){w.onload=()=>{setTimeout(()=>w.print(),500);};}
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  };

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div style={{fontSize:22,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.5px"}}>{t.auditTrail}</div>
        <button onClick={doExport} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#6366f1",color:"#fff",fontWeight:600,fontSize:13}}>{t.exportAudit}</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <div style={{color:"var(--color-text-dim)",fontSize:13}}>{filtered.length} {t.records}</div>
        {hasFilter&&<button onClick={clearFilters} style={{padding:"3px 10px",borderRadius:6,border:"1px solid var(--color-border)",background:"transparent",color:"#f59e0b",fontSize:11,fontWeight:700}}>✕ Clear filters</button>}
      </div>

      {/* Filters — row 1: staff / action / section / company */}
      <div className="fg four-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:10}}>
        <div><label style={LBL}>{t.filterStaff}</label>
          <select style={{...INP,cursor:"pointer"}} value={fS} onChange={e=>setFS(e.target.value)}>
            <option value="">{t.allStaff}</option>
            {sl.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div><label style={LBL}>{t.filterAction}</label>
          <select style={{...INP,cursor:"pointer"}} value={fA} onChange={e=>setFA(e.target.value)}>
            <option value="">{t.allActions}</option>
            {al.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div><label style={LBL}>Section</label>
          <select style={{...INP,cursor:"pointer"}} value={fSec} onChange={e=>setFSec(e.target.value)}>
            <option value="">All Sections</option>
            {secList.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div><label style={LBL}>Company</label>
          <select style={{...INP,cursor:"pointer"}} value={fCo} onChange={e=>setFCo(e.target.value)}>
            <option value="">All Companies</option>
            {filterCos.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Filters — row 2: date range */}
      <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        <div><label style={LBL}>From Date</label>
          <input type="date" style={INP} value={fFrom} onChange={e=>setFFrom(e.target.value)}/>
        </div>
        <div><label style={LBL}>To Date</label>
          <input type="date" style={INP} value={fTo} onChange={e=>setFTo(e.target.value)}/>
        </div>
      </div>

      {/* Active date range badge */}
      {(fFrom||fTo)&&(
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:8,padding:"6px 12px",marginBottom:16,fontSize:12,color:"#a5b4fc"}}>
          📅 {fFrom||"start"} → {fTo||"today"}
          <span style={{color:"#6366f1",cursor:"pointer",fontWeight:700}} onClick={()=>{setFFrom("");setFTo("");}}>×</span>
        </div>
      )}

      <div style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:12,overflow:"hidden"}}>
        {loading
          ?<div style={{padding:"40px",textAlign:"center",color:"var(--color-text-muted)"}}>{t.loadingAudit}</div>
          :filtered.length===0
            ?<div style={{padding:"40px",textAlign:"center",color:"var(--color-text-muted)"}}>{t.noAudit}</div>
            :<div style={{overflow:"auto",maxHeight:"65vh",WebkitOverflowScrolling:"touch"}}>
              <table style={{borderCollapse:"collapse",minWidth:820,width:"100%"}}>
                <thead style={{position:"sticky",top:0,zIndex:2}}>
                  <tr style={{background:"var(--color-bg-surface)",borderBottom:"1px solid var(--color-border)"}}>
                    {["Date & Time","Staff","Action & Details","Client","Company"].map(h=>(
                      <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--color-accent)",letterSpacing:0.5,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l,i)=>{
                    const isExpanded=expandedRow===l.id;
                    const hasDevice=!!l.device;
                    return(
                      <Fragment key={l.id}>
                        <tr style={{borderBottom:isExpanded?"none":"1px solid var(--color-border)",background:i%2===0?"transparent":"var(--color-bg-hover)",cursor:hasDevice?"pointer":"default"}}
                          onClick={()=>hasDevice&&setExpandedRow(isExpanded?null:l.id)}>
                          <td style={{padding:"10px 16px",fontSize:12,color:"var(--color-text-dim)",whiteSpace:"nowrap",verticalAlign:"top"}}>
                            {new Date(l.performed_at).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                          </td>
                          <td style={{padding:"10px 16px",verticalAlign:"top",whiteSpace:"nowrap"}}>
                            <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)"}}>{l.performed_by||"—"}</div>
                            {l.performed_role&&<div style={{fontSize:11,color:roleColor[l.performed_role]||"rgba(240,242,250,0.3)",marginTop:2,fontWeight:600,textTransform:"capitalize"}}>{l.performed_role.replace(/_/g," ")}</div>}
                          </td>
                          <td style={{padding:"10px 16px",verticalAlign:"top",minWidth:260,maxWidth:360}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:l.details?4:0}}>
                              <span style={{background:"rgba(99,102,241,0.12)",color:"#a5b4fc",borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{l.action||"—"}</span>
                              {l.section&&<span style={{background:"rgba(0,0,0,0.25)",color:secColor(l.section),border:"1px solid "+secColor(l.section)+"44",borderRadius:5,padding:"1px 7px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{l.section}</span>}
                              {hasDevice&&<span style={{fontSize:10,color:"var(--color-text-muted)",marginLeft:"auto"}}>▾</span>}
                            </div>
                            {l.details&&<div style={{fontSize:12,color:"var(--color-text-dim)",lineHeight:1.5,marginTop:2}}>{l.details}</div>}
                          </td>
                          <td style={{padding:"10px 16px",fontSize:13,color:"var(--color-text-secondary)",verticalAlign:"top",whiteSpace:"nowrap"}}>{l.client_name||"—"}</td>
                          <td style={{padding:"10px 16px",fontSize:12,color:"var(--color-text-muted)",verticalAlign:"top",whiteSpace:"nowrap"}}>{coName(l.company_id)}</td>
                        </tr>
                        {isExpanded&&hasDevice&&(
                          <tr style={{borderBottom:"1px solid var(--color-border)",background:"rgba(99,102,241,0.04)"}}>
                            <td colSpan={5} style={{padding:"6px 16px 10px 48px"}}>
                              <div style={{fontSize:11,color:"var(--color-text-muted)",display:"flex",alignItems:"flex-start",gap:8}}>
                                <span style={{color:"var(--color-text-muted)",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>🖥 Device:</span>
                                <span style={{wordBreak:"break-all",lineHeight:1.6}}>{l.device}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              {hasMore&&<div style={{textAlign:"center",padding:"16px"}}>
                <button onClick={loadMore} disabled={loadingMore} style={{padding:"8px 24px",borderRadius:8,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.08)",color:"#a5b4fc",fontWeight:600,fontSize:13,cursor:"pointer"}}>
                  {loadingMore?"Loading…":"Load more"}
                </button>
              </div>}
            </div>}
      </div>
    </div>
  );
}
export { AuditTrail };
