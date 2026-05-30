import { useState, useEffect, useCallback, useMemo } from "react";
import { Fragment } from "react";
import { supabase, supabaseAdmin } from "../lib/supabase.js";
import { can, he, uid, tod, initials, avatarColor, scorePassword } from "../lib/utils.js";
import { INP, LBL, ABTN, IBTN, PW_LEVELS } from "../lib/constants.js";

function PasswordStrengthMeter({password}){
  if(!password)return null;
  const score=scorePassword(password);
  const level=PW_LEVELS[score];
  const checks=[
    {ok:password.length>=10, label:"10+ characters"},
    {ok:/[A-Z]/.test(password), label:"Uppercase letter"},
    {ok:/[0-9]/.test(password), label:"Number"},
    {ok:/[^A-Za-z0-9]/.test(password), label:"Symbol"},
  ];
  return(
    <div style={{marginTop:8}}>
      {/* Segmented bar */}
      <div style={{display:"flex",gap:3,marginBottom:6}}>
        {[1,2,3,4].map(i=>(
          <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=score?level.bg:"rgba(255,255,255,0.06)",transition:"background 0.25s"}}/>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{fontSize:11,fontWeight:700,color:level.color}}>{level.label}</span>
        <div style={{display:"flex",gap:8}}>
          {checks.map(c=>(
            <span key={c.label} style={{fontSize:10,color:c.ok?"#10b981":"var(--color-text-muted)",fontWeight:c.ok?700:400}}>
              {c.ok?"✓":"·"} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserManagement({currentUser,onRoleChange,activeCompanyId,t,logAudit}){
  const [users,setUsers]=useState([]);
  const [companies,setCompanies]=useState([]);
  const [allAuthUsers,setAllAuthUsers]=useState([]);
  const [allUserRoles,setAllUserRoles]=useState([]);
  const [loading,setLoading]=useState(true);
  const [mainTab,setMainTab]=useState("users");
  const [showUserForm,setShowUserForm]=useState(false);
  const [showExistingForm,setShowExistingForm]=useState(false);
  const [showCompanyForm,setShowCompanyForm]=useState(false);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [userTab,setUserTab]=useState("all");
  const [search,setSearch]=useState("");
  const [expandedUser,setExpandedUser]=useState(null);
  const [editingUser,setEditingUser]=useState(null);
  const [roleDropdown,setRoleDropdown]=useState(null); // {userId, rect}
  const [editForm,setEditForm]=useState({name:"",email:"",username:""});
  const [deleteConfirmUser,setDeleteConfirmUser]=useState(null);
  const [pendingAction,setPendingAction]=useState(null);
  const [userForm,setUserForm]=useState({name:"",email:"",password:"",username:"",role:"user",company_ids:activeCompanyId?[activeCompanyId]:[]});
  const [existingForm,setExistingForm]=useState({user_id:"",name:"",role:"user",company_ids:activeCompanyId?[activeCompanyId]:[]});
  const [companyForm,setCompanyForm]=useState({name:"",address:"",phone:"",email:"",website:"",mission_statement:""});
  const [activityData,setActivityData]=useState([]);
  const [activityLoading,setActivityLoading]=useState(false);
  const [activityDateFrom,setActivityDateFrom]=useState("");
  const [activityDateTo,setActivityDateTo]=useState("");
  const [expandedStaff,setExpandedStaff]=useState(null);
  const [showArchived,setShowArchived]=useState(false);
  const [archiveConfirmCompany,setArchiveConfirmCompany]=useState(null);
  const [deleteConfirmCompany,setDeleteConfirmCompany]=useState(null);
  const [deleteCompanyInput,setDeleteCompanyInput]=useState("");

  const showToast=(type,msg)=>{setToast({type,msg});setTimeout(()=>setToast(null),3500);};

  const [companyStats,setCompanyStats]=useState({});

  const loadData=async()=>{
    setLoading(true);
    const uq=supabase.from("user_roles").select("*").order("name");
    const {data:ud}=activeCompanyId?await uq.eq("company_id",activeCompanyId):await uq;
    setUsers(ud||[]);
    const {data:cd}=await supabase.from("companies").select("*").order("name");
    setCompanies(cd||[]);
    // Load ALL users across all companies for existing user picker + stats
    const {data:au}=await supabase.from("user_roles").select("user_id,name,company_id,role,email").order("name");
    setAllUserRoles(au||[]);
    const seen=new Set();
    const unique=(au||[]).filter(u=>{if(seen.has(u.user_id))return false;seen.add(u.user_id);return true;});
    setAllAuthUsers(unique);
    // Load client counts per company
    const {data:clientRows}=await supabase.from("clients").select("company_id,archived");
    // Load last audit activity per company (most recent 1000 entries)
    const {data:auditRows}=await supabase.from("audit_log").select("company_id,performed_at").order("performed_at",{ascending:false}).limit(1000);
    // Build stats map
    const stats={};
    (cd||[]).forEach(c=>{stats[c.id]={clients:0,archivedClients:0,users:0,lastActivity:null};});
    (clientRows||[]).forEach(r=>{
      if(!stats[r.company_id])stats[r.company_id]={clients:0,archivedClients:0,users:0,lastActivity:null};
      if(r.archived)stats[r.company_id].archivedClients++;
      else stats[r.company_id].clients++;
    });
    // Unique users per company
    const userSets={};
    (au||[]).forEach(r=>{
      if(!userSets[r.company_id])userSets[r.company_id]=new Set();
      userSets[r.company_id].add(r.user_id);
    });
    Object.entries(userSets).forEach(([cid,s])=>{if(stats[cid])stats[cid].users=s.size;});
    // Last activity (first entry per company since sorted desc)
    (auditRows||[]).forEach(r=>{
      if(stats[r.company_id]&&!stats[r.company_id].lastActivity)stats[r.company_id].lastActivity=r.performed_at;
    });
    setCompanyStats(stats);
    setLoading(false);
  };

  useEffect(()=>{loadData();},[activeCompanyId]);
  useEffect(()=>{
    if(!roleDropdown)return;
    const handler=()=>setRoleDropdown(null);
    document.addEventListener("click",handler,true);
    return()=>document.removeEventListener("click",handler,true);
  },[roleDropdown]);

  const loadActivity=async(from,to)=>{
    setActivityLoading(true);
    let q=supabase.from("audit_log").select("performed_by,action,client_name,performed_at").order("performed_at",{ascending:false}).limit(500);
    if(activeCompanyId)q=q.eq("company_id",activeCompanyId);
    if(from)q=q.gte("performed_at",from+"T00:00:00");
    if(to)q=q.lte("performed_at",to+"T23:59:59");
    const{data}=await q;
    const map={};
    (data||[]).forEach(row=>{
      const key=row.performed_by||"Unknown";
      if(!map[key])map[key]={name:key,count:0,lastAt:null,actions:{},recentClients:[]};
      const st=map[key];
      st.count++;
      if(!st.lastAt||row.performed_at>st.lastAt)st.lastAt=row.performed_at;
      st.actions[row.action]=(st.actions[row.action]||0)+1;
      if(row.client_name&&st.recentClients.length<5&&!st.recentClients.includes(row.client_name))st.recentClients.push(row.client_name);
    });
    setActivityData(Object.values(map).sort((a,b)=>b.count-a.count));
    setActivityLoading(false);
  };

  useEffect(()=>{if(mainTab==="activity")loadActivity(activityDateFrom,activityDateTo);},[mainTab,activeCompanyId,activityDateFrom,activityDateTo]);

  const onChangeUser=e=>setUserForm(p=>({...p,[e.target.name]:e.target.value}));
  const onChangeExisting=e=>setExistingForm(p=>({...p,[e.target.name]:e.target.value}));
  const onToggleCompany=id=>setExistingForm(p=>({...p,company_ids:p.company_ids.includes(id)?p.company_ids.filter(x=>x!==id):[...p.company_ids,id]}));
  const onToggleUserCompany=id=>setUserForm(p=>({...p,company_ids:p.company_ids.includes(id)?p.company_ids.filter(x=>x!==id):[...p.company_ids,id]}));
  const onChangeCompany=e=>setCompanyForm(p=>({...p,[e.target.name]:e.target.value}));

  const addExistingUser=async e=>{
    e.preventDefault();
    if(!existingForm.user_id||!existingForm.role||existingForm.company_ids.length===0){
      showToast("error","Select a user, role, and at least one company");return;
    }
    setSaving(true);
    const selectedUser=allAuthUsers.find(u=>u.user_id===existingForm.user_id);
    let failed=false;
    for(const company_id of existingForm.company_ids){
      if(allUserRoles.find(x=>x.user_id===existingForm.user_id&&x.company_id===company_id))continue;
      const {error}=await supabase.from("user_roles").insert({
        user_id:existingForm.user_id,
        name:selectedUser?.name||existingForm.name,
        role:existingForm.role,
        company_id,
      });
      if(error&&error.code!=="23505"){failed=true;showToast("error","Failed: "+error.message);}
    }
    if(!failed){
      showToast("success","User added to selected companies!");
      setExistingForm({user_id:"",name:"",role:"user",company_ids:activeCompanyId?[activeCompanyId]:[]});
      setShowExistingForm(false);
      await loadData();
    }
    setSaving(false);
  };

  const createUser=async e=>{
    e.preventDefault();
    if(!userForm.name||!userForm.email||!userForm.password||!userForm.role||userForm.company_ids.length===0){
      showToast("error","All fields are required — select at least one company");return;
    }
    if(userForm.password.length<10){showToast("error","Temporary password must be at least 10 characters");return;}
    if(scorePassword(userForm.password)<2){showToast("error","Temporary password is too weak — add uppercase letters, numbers, or symbols");return;}
    setSaving(true);
    try{
      // Pre-flight duplicate checks (fast, before hitting the edge function)
      const {data:existingEmail}=await supabase.from("user_roles").select("user_id").eq("email",userForm.email.toLowerCase().trim()).limit(1).maybeSingle();
      if(existingEmail){showToast("error","A user with this email already exists");setSaving(false);return;}
      if(userForm.username.trim()){
        const {data:existingUsername}=await supabase.from("user_roles").select("user_id").eq("username",userForm.username.toLowerCase().trim()).limit(1).maybeSingle();
        if(existingUsername){showToast("error","This username is already taken");setSaving(false);return;}
      }
      // Call the Edge Function — it creates the auth user AND inserts all user_roles rows
      const {data:{session}}=await supabase.auth.getSession();
      const res=await fetch(`${SUPABASE_URL}/functions/v1/create-user`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${session.access_token}`,
          "apikey":ANON_KEY,
        },
        body:JSON.stringify({
          email:userForm.email,
          password:userForm.password,
          name:userForm.name,
          role:userForm.role,
          username:userForm.username.trim()||null,
          company_ids:userForm.company_ids,
        }),
      });
      const result=await res.json();
      if(!res.ok)throw new Error(result.error||"Failed to create user");
      if(result.anyFailed)showToast("warning","User created but some company assignments failed");
      else showToast("success","User created successfully!");
      setUserForm({name:"",email:"",password:"",username:"",role:"user",company_ids:activeCompanyId?[activeCompanyId]:[]});
      setShowUserForm(false);
      await loadData();
    }catch(err){
      showToast("error",err.message||"Failed to create user");
    }
    setSaving(false);
  };

  const createCompany=async e=>{
    e.preventDefault();
    if(!companyForm.name){showToast("error","Company name is required");return;}
    setSaving(true);
    // Duplicate name check (case-insensitive)
    const {data:existing}=await supabase.from("companies").select("id").ilike("name",companyForm.name.trim()).limit(1).maybeSingle();
    if(existing){showToast("error","A company with this name already exists");setSaving(false);return;}
    const {data,error}=await supabase.from("companies").insert({
      ...companyForm,
      hours_of_operation:{monday:"8:00 AM - 5:00 PM",tuesday:"8:00 AM - 5:00 PM",wednesday:"8:00 AM - 5:00 PM",thursday:"8:00 AM - 5:00 PM",friday:"8:00 AM - 5:00 PM",saturday:"10:00 AM - 2:00 PM",sunday:"Closed"},
    }).select().single();
    if(error){showToast("error","Failed to create company: "+error.message);}
    else{
      showToast("success","Company created! You can now assign users to it.");
      setCompanyForm({name:"",address:"",phone:"",email:"",website:"",mission_statement:""});
      setShowCompanyForm(false);
      await loadData();
    }
    setSaving(false);
  };

  const archiveCompany=async(company)=>{
    setSaving(true);
    const {error}=await supabase.from("companies").update({archived_at:new Date().toISOString()}).eq("id",company.id);
    if(error){showToast("error","Failed to archive: "+error.message);setSaving(false);return;}
    setArchiveConfirmCompany(null);
    showToast("success",`"${company.name}" archived`);
    await logAudit("Company archived",company.name,{section:"User Management",details:`Company "${company.name}" archived`});
    await loadData();
    setSaving(false);
  };

  const unarchiveCompany=async(company)=>{
    setSaving(true);
    const {error}=await supabase.from("companies").update({archived_at:null}).eq("id",company.id);
    if(error){showToast("error","Failed to restore: "+error.message);setSaving(false);return;}
    showToast("success",`"${company.name}" restored`);
    await loadData();
    setSaving(false);
  };

  const deleteCompany=async(company)=>{
    const st=companyStats[company.id]||{clients:0,archivedClients:0,users:0};
    if((st.clients+st.archivedClients)>0||st.users>0){
      showToast("error","Remove all clients and users before deleting");setSaving(false);return;
    }
    setSaving(true);
    const {error}=await supabase.from("companies").delete().eq("id",company.id);
    if(error){showToast("error","Failed to delete: "+error.message);setSaving(false);return;}
    setDeleteConfirmCompany(null);setDeleteCompanyInput("");
    showToast("success",`"${company.name}" permanently deleted`);
    await logAudit("Company deleted",company.name,{section:"User Management",details:`Company "${company.name}" permanently deleted`});
    await loadData();
    setSaving(false);
  };

  // Helper: call manage-user edge function
  const callManageUser=async(action,targetUserId)=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)return{ok:false,error:"No session"};
    const res=await fetch(`${SUPABASE_URL}/functions/v1/manage-user`,{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`,"apikey":ANON_KEY},
      body:JSON.stringify({action,targetUserId}),
    });
    const json=await res.json();
    return res.ok?{ok:true}:{ok:false,error:json.error||"Edge function error"};
  };

  const updateRole=async(userId,newRole)=>{
    const target=users.find(x=>x.user_id===userId);
    const oldRole=target?.role||"unknown";
    // Role elevation ceiling: only superadmin can grant superadmin
    if(newRole==="superadmin"&&currentUser.role!=="superadmin"){
      showToast("error","Only a superadmin can grant superadmin role");return;
    }
    // Update all rows for this user so role is consistent across companies
    const {error}=await supabase.from("user_roles").update({role:newRole}).eq("user_id",userId);
    if(error){showToast("error","Failed to update role");return;}
    setUsers(u=>u.map(x=>x.user_id===userId?{...x,role:newRole}:x));
    showToast("success","Role updated");
    await logAudit("Role changed",target?.name||target?.email||userId,{section:"User Management",details:`Role changed from "${oldRole.replace(/_/g," ")}" → "${newRole.replace(/_/g," ")}" for ${target?.name||target?.email||userId} (all companies)`});
    // If reactivating (old role was inactive), unban in auth
    if(oldRole==="inactive"&&newRole!=="inactive"){
      await callManageUser("unban",userId);
    }
    if(userId===currentUser.id&&onRoleChange)await onRoleChange();
  };

  const deactivateUser=async(userId)=>{
    const target=users.find(x=>x.user_id===userId);
    // Prevent acting on equal or higher role (admin cannot deactivate admin/superadmin)
    const RORD={superadmin:1,admin:2,power_user:3,nurse:4,care_assistant:5,user:6,inactive:7};
    if((RORD[target?.role]??9)<=(RORD[currentUser.role]??9)&&currentUser.role!=="superadmin"){
      showToast("error","You cannot deactivate a user with an equal or higher role");return;
    }
    const {error}=await supabase.from("user_roles").update({role:"inactive"}).eq("user_id",userId);
    if(error){showToast("error","Failed to deactivate");return;}
    setUsers(u=>u.map(x=>x.user_id===userId?{...x,role:"inactive"}:x));
    // Ban in auth so existing sessions are invalidated
    const {ok,error:banErr}=await callManageUser("ban",userId);
    if(!ok)console.warn("Auth ban failed (user_roles updated):",banErr);
    showToast("success","User deactivated and session revoked");
    await logAudit("User deactivated",target?.name||target?.email||userId,{section:"User Management",details:`Account deactivated and auth session revoked`});
  };

  const removeFromCompany=async(userId,companyId)=>{
    const userRows=allUserRoles.filter(r=>r.user_id===userId);
    if(userRows.length<=1){showToast("error","Cannot remove — user must belong to at least one company");return;}
    const target=users.find(x=>x.user_id===userId);
    const {error}=await supabase.from("user_roles").delete().eq("user_id",userId).eq("company_id",companyId);
    if(error){showToast("error","Failed: "+error.message);return;}
    showToast("success","Removed from company");
    await logAudit("User removed from company",target?.name||target?.email||userId,{section:"User Management",details:`Removed from company ID ${companyId}`});
    await loadData();
  };

  const addToCompany=async(userId,companyId)=>{
    const existingRows=allUserRoles.filter(r=>r.user_id===userId);
    // Use top role so the new company row matches the user's global role
    const RORDER={superadmin:1,admin:2,power_user:3,nurse:4,care_assistant:5,user:6,inactive:7};
    const topRow=existingRows.slice().sort((a,b)=>(RORDER[a.role]??9)-(RORDER[b.role]??9))[0];
    const emailRow=existingRows.find(r=>r.email)||topRow;
    const {error}=await supabase.from("user_roles").insert({
      user_id:userId,
      name:topRow?.name||"",
      email:emailRow?.email||"",
      role:topRow?.role||"user",
      company_id:companyId,
      username:null,
    });
    if(error){showToast("error","Failed: "+error.message);return;}
    showToast("success","Added to company");
    setExpandedUser(null);
    await loadData();
  };

  const startEditUser=(u)=>{
    setEditingUser(u.user_id);
    setEditForm({name:u.name||"",email:u.email||"",username:u.username||""});
    setDeleteConfirmUser(null);
    setExpandedUser(null);
  };

  const saveUserEdit=async(userId)=>{
    if(!editForm.name.trim()||!editForm.email.trim()){showToast("error","Name and email are required");return;}
    setSaving(true);
    // Duplicate email check (exclude current user)
    const {data:existingEmail}=await supabase.from("user_roles").select("user_id").eq("email",editForm.email.toLowerCase().trim()).neq("user_id",userId).limit(1).maybeSingle();
    if(existingEmail){showToast("error","Email already in use by another user");setSaving(false);return;}
    // Duplicate username check (if provided, exclude current user)
    if(editForm.username.trim()){
      const {data:existingUsername}=await supabase.from("user_roles").select("user_id").eq("username",editForm.username.toLowerCase().trim()).neq("user_id",userId).limit(1).maybeSingle();
      if(existingUsername){showToast("error","Username already taken");setSaving(false);return;}
    }
    const {error}=await supabase.from("user_roles").update({
      name:editForm.name.trim(),
      email:editForm.email.toLowerCase().trim(),
      username:editForm.username.toLowerCase().trim()||null,
    }).eq("user_id",userId);
    if(error){showToast("error","Failed to save: "+error.message);setSaving(false);return;}
    showToast("success","User updated");
    setEditingUser(null);
    await loadData();
    setSaving(false);
  };

  const deleteUser=async(userId)=>{
    // Only superadmin can delete users
    if(currentUser.role!=="superadmin"){showToast("error","Only superadmins can permanently delete users");return;}
    setSaving(true);
    // Snapshot user_roles rows BEFORE deletion so we can roll back if auth deletion fails
    const {data:snapshot}=await supabase.from("user_roles").select("*").eq("user_id",userId);
    // Delete user_roles rows
    const {error}=await supabase.from("user_roles").delete().eq("user_id",userId);
    if(error){showToast("error","Failed to delete: "+error.message);setSaving(false);return;}
    // Delete the auth.users record via Edge Function
    const {ok,error:authErr}=await callManageUser("delete",userId);
    if(!ok){
      // Rollback: re-insert the user_roles rows so the user isn't left in a broken state
      if(snapshot?.length){
        await supabase.from("user_roles").insert(snapshot);
      }
      showToast("error","Deletion failed — account restored. Try again or contact support.");
      console.error("Auth user deletion failed, user_roles rolled back:",authErr);
      setSaving(false);
      return;
    }
    showToast("success","User permanently deleted");
    setDeleteConfirmUser(null);
    await loadData();
    setSaving(false);
  };

  const fmtLastLogin=(loginHistory)=>{
    try{
      const arr=typeof loginHistory==="string"?JSON.parse(loginHistory):loginHistory;
      if(!arr||!arr.length)return"—";
      const d=new Date(arr[0].at);
      return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    }catch{return"—";}
  };

  const roleColor={superadmin:"#f59e0b",admin:"#6366f1",power_user:"#06b6d4",nurse:"#8b5cf6",care_assistant:"#ec4899",user:"#10b981",inactive:"#64748b"};
  const roleBg={superadmin:"rgba(245,158,11,0.12)",admin:"rgba(99,102,241,0.12)",power_user:"rgba(6,182,212,0.12)",nurse:"rgba(139,92,246,0.12)",care_assistant:"rgba(236,72,153,0.12)",user:"rgba(16,185,129,0.12)",inactive:"rgba(100,116,139,0.12)"};
  const companyName=id=>companies.find(c=>c.id===id)?.name||"—";


  const filteredUsers=useMemo(()=>{
    const seen=new Set();
    return users.filter(u=>{
      const matchTab=userTab==="all"||(userTab==="active"&&u.role!=="inactive")||(userTab==="inactive"&&u.role==="inactive");
      const matchSearch=!search||u.name?.toLowerCase().includes(search.toLowerCase())||u.email?.toLowerCase().includes(search.toLowerCase());
      if(!matchTab||!matchSearch)return false;
      if(seen.has(u.user_id))return false;
      seen.add(u.user_id);
      return true;
    });
  },[users,userTab,search]);

  const INP2={...INP,marginBottom:0};

  return(
    <div style={{maxWidth:1050}}>
      {roleDropdown&&(()=>{
        const ROLE_OPTS=[{v:"care_assistant",l:"Care Assistant"},{v:"user",l:"User"},{v:"nurse",l:"Nurse"},{v:"power_user",l:"Power User"},{v:"admin",l:"Admin"},...(currentUser.role==="superadmin"?[{v:"superadmin",l:"Super Admin"}]:[]),{v:"inactive",l:"Inactive"}];
        const u=filteredUsers.find(x=>x.user_id===roleDropdown.userId);
        if(!u)return null;
        return(
          <div style={{position:"fixed",top:roleDropdown.rect.bottom+4,left:roleDropdown.rect.left,zIndex:9999,background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.5)",minWidth:150,overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
            {ROLE_OPTS.map(opt=>(
              <div key={opt.v} onClick={()=>{
                setRoleDropdown(null);
                if(opt.v===u.role)return;
                if(opt.v==="superadmin"&&currentUser.role!=="superadmin"){showToast("error","Only a superadmin can grant the superadmin role");return;}
                setPendingAction({type:"role_change",userId:u.user_id,userName:u.name||u.email,meta:{newRole:opt.v,oldRole:u.role}});
              }}
                style={{padding:"9px 14px",fontSize:12,fontWeight:opt.v===u.role?700:400,color:opt.v===u.role?(roleColor[opt.v]||"var(--color-text-primary)"):"var(--color-text-secondary)",background:opt.v===u.role?(roleBg[opt.v]||"transparent"):"transparent",cursor:"pointer",borderBottom:"1px solid var(--color-border)"}}>
                {opt.l}
              </div>
            ))}
          </div>
        );
      })()}
      {toast&&(
        <div style={{position:"fixed",top:24,right:24,zIndex:999,padding:"12px 20px",borderRadius:10,background:toast.type==="success"?"#059669":toast.type==="warning"?"#b45309":"#dc2626",color:"#fff",fontSize:14,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>
          {toast.type==="success"?"✓ ":toast.type==="warning"?"⚠ ":"✗ "}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.5px"}}>👥 User Management</div>
          <div style={{fontSize:13,color:"var(--color-text-dim)",marginTop:4}}>{users.length} users · {companies.length} companies</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {mainTab==="users"&&(
            <>
              <button onClick={()=>{setShowExistingForm(s=>!s);setShowUserForm(false);setShowCompanyForm(false);}}
                style={{padding:"10px 20px",borderRadius:10,border:"1px solid #6366f1",background:"transparent",color:"var(--color-accent)",fontWeight:700,fontSize:14}}>
                {showExistingForm?"Cancel":"+ Existing User"}
              </button>
              <button onClick={()=>{setShowUserForm(s=>!s);setShowExistingForm(false);setShowCompanyForm(false);}}
                style={{padding:"10px 20px",borderRadius:10,border:"none",background:"var(--color-accent)",color:"#fff",fontWeight:700,fontSize:14}}>
                {showUserForm?"Cancel":"+ New User"}
              </button>
            </>
          )}
          {mainTab==="companies"&&(
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>setShowArchived(s=>!s)}
                style={{padding:"10px 16px",borderRadius:10,border:"1px solid "+(showArchived?"#f59e0b":"rgba(255,255,255,0.1)"),background:showArchived?"rgba(245,158,11,0.12)":"transparent",color:showArchived?"#f59e0b":"var(--color-text-muted)",fontWeight:600,fontSize:13}}>
                {showArchived?"Hide Archived":"Show Archived"}
              </button>
              {currentUser?.role==="superadmin"&&(
                <button onClick={()=>{setShowCompanyForm(s=>!s);setShowUserForm(false);setShowExistingForm(false);}}
                  style={{padding:"10px 20px",borderRadius:10,border:"none",background:"#10b981",color:"#fff",fontWeight:700,fontSize:14}}>
                  {showCompanyForm?"Cancel":"+ New Company"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--color-border)",marginBottom:20}}>
        {[["users","👥 Users"],["companies","🏢 Companies"],["activity","📊 Activity"]].map(([id,label])=>(
          <button key={id} onClick={()=>{setMainTab(id);setShowUserForm(false);setShowCompanyForm(false);setSearch("");}}
            style={{padding:"9px 20px",border:"none",borderBottom:mainTab===id?"2px solid #6366f1":"2px solid transparent",background:"transparent",color:mainTab===id?"var(--color-accent)":"var(--color-text-muted)",fontWeight:600,fontSize:14,cursor:"pointer",marginBottom:-1}}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════ USERS TAB ═══════════════ */}
      {mainTab==="users"&&(
        <>
          {/* Add Existing User Form */}
          {showExistingForm&&(
            <div style={{background:"var(--color-bg-card)",border:"1px solid #6366f1",borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontSize:14,color:"var(--color-text-primary)",fontWeight:700,marginBottom:6,letterSpacing:"-0.2px"}}>Add Existing User to Company</div>
              <div style={{fontSize:12,color:"var(--color-text-dim)",marginBottom:16}}>For users who already have an account — give them access to this company.</div>
              <form onSubmit={addExistingUser}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={LBL}>Select User *</label>
                    <select name="user_id" value={existingForm.user_id} onChange={onChangeExisting} style={{...INP,marginBottom:0,cursor:"pointer"}}>
                      <option value="">Select existing user...</option>
                      {allAuthUsers
                        .filter(u=>{
                          if(!activeCompanyId)return true;
                          return!allUserRoles.find(x=>x.user_id===u.user_id&&x.company_id===activeCompanyId);
                        })
                        .map(u=><option key={u.user_id} value={u.user_id}>{u.name||u.email||u.user_id}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Role *</label>
                    <select name="role" value={existingForm.role} onChange={onChangeExisting} style={{...INP,marginBottom:0,cursor:"pointer"}}>
                      <option value="care_assistant">Care Assistant</option>
                      <option value="user">User</option>
                      <option value="nurse">Nurse</option>
                      <option value="power_user">Power User</option>
                      <option value="admin">Admin</option>
                      {currentUser.role==="superadmin"&&<option value="superadmin">Super Admin</option>}
                    </select>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={LBL}>Companies * (select one or more)</label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,background:"rgba(255,255,255,0.03)",borderRadius:8,padding:12,border:"1px solid rgba(255,255,255,0.08)"}}>
                      {companies.filter(c=>!c.archived_at).map(c=>(
                        <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--color-text-primary)",cursor:"pointer"}}>
                          <input type="checkbox" checked={existingForm.company_ids.includes(c.id)} onChange={()=>onToggleCompany(c.id)} style={{accentColor:"var(--color-accent)",width:15,height:15}}/>
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={saving}
                  style={{padding:"10px 24px",borderRadius:9,border:"none",background:saving?"rgba(255,255,255,0.1)":"var(--color-accent)",color:saving?"var(--color-text-muted)":"#fff",fontWeight:700,fontSize:14}}>
                  {saving?"Adding...":"Add to Company"}
                </button>
              </form>
            </div>
          )}

          {/* Create New User Form */}
          {showUserForm&&(
            <div style={{background:"var(--color-bg-card)",border:"1px solid #6366f1",borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontSize:14,color:"var(--color-text-primary)",fontWeight:700,marginBottom:16,letterSpacing:"-0.2px"}}>Create New User</div>
              <form onSubmit={createUser}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div><label style={LBL}>Full Name *</label><input name="name" value={userForm.name} onChange={onChangeUser} placeholder="e.g. Maria Johnson" style={INP2}/></div>
                  <div><label style={LBL}>Email *</label><input name="email" type="email" value={userForm.email} onChange={onChangeUser} placeholder="user@company.aw" style={INP2}/></div>
                  <div><label style={LBL}>Temporary Password *</label><input name="password" type="password" value={userForm.password} onChange={onChangeUser} placeholder="Min. 10 characters" style={INP2}/><PasswordStrengthMeter password={userForm.password}/></div>
                  <div><label style={LBL}>Username <span style={{color:"var(--color-text-muted)",fontWeight:400}}>(optional)</span></label><input name="username" value={userForm.username} onChange={onChangeUser} placeholder="e.g. maria.j" style={INP2}/></div>
                  <div><label style={LBL}>Role *</label>
                    <select name="role" value={userForm.role} onChange={onChangeUser} style={{...INP2,cursor:"pointer"}}>
                      <option value="care_assistant">Care Assistant</option>
                      <option value="user">User</option>
                      <option value="nurse">Nurse</option>
                      <option value="power_user">Power User</option>
                      <option value="admin">Admin</option>
                      {currentUser.role==="superadmin"&&<option value="superadmin">Super Admin</option>}
                    </select>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={LBL}>Companies * (select one or more)</label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,background:"rgba(255,255,255,0.03)",borderRadius:8,padding:12,border:"1px solid rgba(255,255,255,0.08)"}}>
                      {companies.filter(c=>!c.archived_at).map(c=>(
                        <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--color-text-primary)",cursor:"pointer"}}>
                          <input type="checkbox" checked={userForm.company_ids.includes(c.id)} onChange={()=>onToggleUserCompany(c.id)} style={{accentColor:"var(--color-accent)",width:15,height:15}}/>
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#f59e0b"}}>
                  ⚠️ User will be required to change their password on first login.
                </div>
                <button type="submit" disabled={saving}
                  style={{padding:"10px 24px",borderRadius:9,border:"none",background:saving?"rgba(255,255,255,0.1)":"#10b981",color:saving?"var(--color-text-muted)":"#fff",fontWeight:700,fontSize:14}}>
                  {saving?"Creating...":"Create User"}
                </button>
              </form>
            </div>
          )}

          {/* User filter tabs + search */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--color-border)"}}>
              {[["all","All"],["active","Active"],["inactive","Inactive"]].map(([id,label])=>(
                <button key={id} onClick={()=>setUserTab(id)}
                  style={{padding:"7px 16px",border:"none",borderBottom:userTab===id?"2px solid #6366f1":"2px solid transparent",background:"transparent",color:userTab===id?"var(--color-accent)":"var(--color-text-muted)",fontWeight:600,fontSize:13,cursor:"pointer",marginBottom:-1}}>
                  {label}
                </button>
              ))}
            </div>
            <input style={{...INP2,width:200}} placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>

          {/* User List */}
          {loading?<div style={{color:"var(--color-text-muted)",textAlign:"center",padding:"40px 0"}}>Loading...</div>:(
            <div style={{background:"var(--color-bg-card)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,overflowX:"auto"}}>
              {filteredUsers.length===0?(
                <div style={{color:"var(--color-text-muted)",textAlign:"center",padding:"40px 0"}}>No users found</div>
              ):(
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid var(--color-border)"}}>
                      {[["Name",160],["Email",160],["Role",110],["Companies",null],["Actions",180]].map(([h,minW])=>(
                        <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--color-accent)",letterSpacing:0.5,minWidth:minW||undefined,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u,i)=>{
                      const isEditing=editingUser===u.user_id;
                      const isDeleteConfirm=deleteConfirmUser===u.user_id;
                      const isMe=u.user_id===currentUser.id;
                      const rowBg=isEditing?"rgba(99,102,241,0.06)":isDeleteConfirm?"rgba(220,38,38,0.06)":i%2===0?"transparent":"rgba(255,255,255,0.02)";
                      return(
                      <tr key={u.user_id} style={{borderBottom:"1px solid rgba(255,255,255,0.05)",background:rowBg}}>
                        {/* Name / Username / Last Login cell */}
                        <td style={{padding:"10px 16px",fontWeight:600,color:"var(--color-text-primary)",fontSize:13}}>
                          {isEditing?(
                            <div style={{display:"flex",flexDirection:"column",gap:4}}>
                              <input value={editForm.name} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}
                                placeholder="Full name" style={{background:"rgba(255,255,255,0.03)",border:"1px solid #6366f1",borderRadius:6,padding:"4px 8px",color:"var(--color-text-primary)",fontSize:12,width:140}}/>
                              <input value={editForm.username} onChange={e=>setEditForm(p=>({...p,username:e.target.value}))}
                                placeholder="username (optional)" style={{background:"rgba(255,255,255,0.03)",border:"1px solid var(--color-border)",borderRadius:6,padding:"4px 8px",color:"var(--color-text-secondary)",fontSize:11,width:140}}/>
                            </div>
                          ):(
                            <div>
                              <div>{u.name||"—"}</div>
                              {u.username&&<div style={{fontSize:11,color:"var(--color-text-muted)",fontWeight:400}}>@{u.username}</div>}
                              <div style={{fontSize:10,color:"rgba(255,255,255,0.1)",fontWeight:400,marginTop:2}}>🕐 {fmtLastLogin(u.login_history)}</div>
                            </div>
                          )}
                        </td>
                        {/* Email cell */}
                        <td style={{padding:"10px 16px",color:"var(--color-text-dim)",fontSize:13}}>
                          {isEditing?(
                            <input value={editForm.email} onChange={e=>setEditForm(p=>({...p,email:e.target.value}))}
                              placeholder="Email" style={{background:"rgba(255,255,255,0.03)",border:"1px solid #6366f1",borderRadius:6,padding:"4px 8px",color:"var(--color-text-primary)",fontSize:12,width:160}}/>
                          ):(u.email||"—")}
                        </td>
                        {/* Role cell */}
                        <td style={{padding:"10px 16px"}}>
                          {(()=>{
                            const ROLE_OPTS=[{v:"care_assistant",l:"Care Assistant"},{v:"user",l:"User"},{v:"nurse",l:"Nurse"},{v:"power_user",l:"Power User"},{v:"admin",l:"Admin"},...(currentUser.role==="superadmin"?[{v:"superadmin",l:"Super Admin"}]:[]),{v:"inactive",l:"Inactive"}];
                            const RORD={superadmin:1,admin:2,power_user:3,nurse:4,care_assistant:5,user:6,inactive:7};
                            const canChange=!isMe&&(currentUser.role==="superadmin"||(RORD[u.role]??9)>(RORD[currentUser.role]??9));
                            const roleLabel=u.role==="superadmin"?"Super Admin":u.role==="power_user"?"Power User":u.role==="care_assistant"?"Care Assistant":(u.role||"").charAt(0).toUpperCase()+(u.role||"").slice(1);
                            return(
                              <div style={{display:"inline-block"}}>
                                <div onClick={e=>{if(!canChange)return;e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();setRoleDropdown(p=>p?.userId===u.user_id?null:{userId:u.user_id,rect:r});}}
                                  style={{background:roleBg[u.role]||"transparent",color:roleColor[u.role]||"var(--color-text-muted)",border:"1px solid "+(roleColor[u.role]||"rgba(255,255,255,0.1)"),borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,whiteSpace:"nowrap",cursor:canChange?"pointer":"default",userSelect:"none",display:"flex",alignItems:"center",gap:4}}>
                                  {roleLabel}{canChange&&<span style={{fontSize:9,opacity:0.6}}>▾</span>}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        {/* Companies cell */}
                        <td style={{padding:"10px 16px"}}>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                            {allUserRoles.filter(r=>r.user_id===u.user_id).map(r=>(
                              <span key={r.company_id} style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:12,padding:"2px 8px",fontSize:11,color:"#a5b4fc",whiteSpace:"nowrap"}}>
                                {companyName(r.company_id)}
                                {!isMe&&(
                                  <span onClick={()=>setPendingAction({type:"remove_company",userId:u.user_id,userName:u.name||u.email,meta:{companyId:r.company_id,companyName:companyName(r.company_id)}})}
                                    style={{cursor:"pointer",color:"var(--color-text-dim)",fontWeight:700,fontSize:13,lineHeight:1,marginLeft:2}} title="Remove from company">×</span>
                                )}
                              </span>
                            ))}
                            {companies.filter(c=>!c.archived_at&&!allUserRoles.find(r=>r.user_id===u.user_id&&r.company_id===c.id)).length>0&&(
                              expandedUser===u.user_id
                                ? companies.filter(c=>!c.archived_at&&!allUserRoles.find(r=>r.user_id===u.user_id&&r.company_id===c.id)).map(c=>(
                                    <span key={c.id} onClick={()=>addToCompany(u.user_id,c.id)}
                                      style={{display:"inline-flex",alignItems:"center",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.35)",borderRadius:12,padding:"2px 8px",fontSize:11,color:"#10b981",cursor:"pointer",whiteSpace:"nowrap"}}>
                                      + {companyName(c.id)}
                                    </span>
                                  ))
                                : <span onClick={()=>setExpandedUser(u.user_id)}
                                    style={{display:"inline-flex",alignItems:"center",background:"transparent",border:"1px dashed #475569",borderRadius:12,padding:"2px 8px",fontSize:11,color:"var(--color-text-muted)",cursor:"pointer",whiteSpace:"nowrap"}}>
                                    + add
                                  </span>
                            )}
                          </div>
                        </td>
                        {/* Actions cell */}
                        <td style={{padding:"10px 16px",whiteSpace:"nowrap"}}>
                          {isEditing?(
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={()=>saveUserEdit(u.user_id)} disabled={saving}
                                style={{padding:"4px 11px",borderRadius:7,border:"none",background:"var(--color-accent)",color:"#fff",fontSize:11,fontWeight:700}}>
                                {saving?"…":"Save"}
                              </button>
                              <button onClick={()=>setEditingUser(null)}
                                style={{padding:"4px 11px",borderRadius:7,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-dim)",fontSize:11,fontWeight:600}}>
                                Cancel
                              </button>
                            </div>
                          ):isDeleteConfirm?(
                            <div style={{display:"flex",gap:6,alignItems:"center"}}>
                              <span style={{fontSize:11,color:"#f87171",fontWeight:600}}>Delete?</span>
                              <button onClick={()=>deleteUser(u.user_id)} disabled={saving}
                                style={{padding:"4px 11px",borderRadius:7,border:"none",background:"#dc2626",color:"#fff",fontSize:11,fontWeight:700}}>
                                {saving?"…":"Yes"}
                              </button>
                              <button onClick={()=>setDeleteConfirmUser(null)}
                                style={{padding:"4px 11px",borderRadius:7,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-dim)",fontSize:11,fontWeight:600}}>
                                No
                              </button>
                            </div>
                          ):(
                            <div style={{display:"flex",gap:6,alignItems:"center"}}>
                              {!isMe&&(
                                <>
                                  <button onClick={()=>startEditUser(u)} title="Edit user"
                                    style={{padding:"4px 9px",borderRadius:7,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-secondary)",fontSize:12}}>
                                    ✏️
                                  </button>
                                  {currentUser.role==="superadmin"&&(
                                    <button onClick={()=>{setDeleteConfirmUser(u.user_id);setEditingUser(null);setExpandedUser(null);}} title="Delete user (superadmin only)"
                                      style={{padding:"4px 9px",borderRadius:7,border:"1px solid rgba(220,38,38,0.3)",background:"transparent",color:"#f87171",fontSize:12}}>
                                      🗑️
                                    </button>
                                  )}
                                  {(()=>{
                                    const RORD={superadmin:1,admin:2,power_user:3,nurse:4,care_assistant:5,user:6,inactive:7};
                                    const canDeactivate=u.role!=="inactive"&&(currentUser.role==="superadmin"||(RORD[u.role]??9)>(RORD[currentUser.role]??9));
                                    return canDeactivate?(
                                      <button onClick={()=>setPendingAction({type:"deactivate",userId:u.user_id,userName:u.name||u.email,meta:{}})}
                                        style={{padding:"4px 12px",borderRadius:7,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-dim)",fontSize:11,fontWeight:600}}>
                                        Deactivate
                                      </button>
                                    ):null;
                                  })()}
                                </>
                              )}
                              {isMe&&<span style={{fontSize:11,color:"var(--color-text-muted)",fontStyle:"italic"}}>You</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );})}

                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════ ACTIVITY TAB ═══════════════ */}
      {mainTab==="activity"&&(
        <div>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <label style={{fontSize:12,color:"var(--color-text-dim)",fontWeight:600}}>From</label>
              <input type="date" value={activityDateFrom} onChange={e=>setActivityDateFrom(e.target.value)}
                style={{...INP2,width:150}}/>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <label style={{fontSize:12,color:"var(--color-text-dim)",fontWeight:600}}>To</label>
              <input type="date" value={activityDateTo} onChange={e=>setActivityDateTo(e.target.value)}
                style={{...INP2,width:150}}/>
            </div>
            <button onClick={()=>loadActivity(activityDateFrom,activityDateTo)}
              style={{padding:"8px 18px",borderRadius:8,border:"none",background:"var(--color-accent)",color:"#fff",fontWeight:700,fontSize:13}}>Apply</button>
            {(activityDateFrom||activityDateTo)&&(
              <button onClick={()=>{setActivityDateFrom("");setActivityDateTo("");loadActivity("","");}}
                style={{padding:"8px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-dim)",fontSize:13,fontWeight:600}}>Clear</button>
            )}
            <button onClick={()=>loadActivity(activityDateFrom,activityDateTo)}
              style={{padding:"8px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-muted)",fontSize:13}}>↻ Refresh</button>
          </div>
          {activityLoading?(
            <div style={{color:"var(--color-text-muted)",textAlign:"center",padding:"40px 0"}}>Loading activity...</div>
          ):activityData.length===0?(
            <div style={{color:"var(--color-text-muted)",textAlign:"center",padding:"40px 0"}}>No activity recorded in this period.</div>
          ):(
            <div style={{background:"var(--color-bg-card)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:"1px solid var(--color-border)"}}>
                    {[["Staff Member",200],["Total Actions",130],["Last Active",170],["Top Action",null]].map(([h,minW])=>(
                      <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--color-accent)",letterSpacing:0.5,minWidth:minW||undefined,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                    <th style={{padding:"12px 16px",width:30}}></th>
                  </tr>
                </thead>
                <tbody>
                  {activityData.map((s,i)=>{
                    const isExpanded=expandedStaff===s.name;
                    const topAction=Object.entries(s.actions).sort((a,b)=>b[1]-a[1])[0];
                    const lastDate=s.lastAt?new Date(s.lastAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—";
                    return(
                      <Fragment key={s.name}>
                        <tr style={{borderBottom:"1px solid #1e293b",background:isExpanded?"rgba(99,102,241,0.06)":i%2===0?"transparent":"rgba(255,255,255,0.02)",cursor:"pointer"}}
                          onClick={()=>setExpandedStaff(isExpanded?null:s.name)}>
                          <td style={{padding:"12px 16px",fontWeight:600,color:"var(--color-text-primary)",fontSize:13}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:34,height:34,borderRadius:"50%",background:"rgba(99,102,241,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#a5b4fc",flexShrink:0}}>
                                {(s.name||"?").charAt(0).toUpperCase()}
                              </div>
                              <span>{s.name||"Unknown"}</span>
                            </div>
                          </td>
                          <td style={{padding:"12px 16px"}}>
                            <span style={{background:"rgba(99,102,241,0.15)",color:"#a5b4fc",border:"1px solid rgba(99,102,241,0.3)",borderRadius:20,padding:"3px 14px",fontSize:13,fontWeight:700}}>{s.count}</span>
                          </td>
                          <td style={{padding:"12px 16px",color:"var(--color-text-dim)",fontSize:12}}>{lastDate}</td>
                          <td style={{padding:"12px 16px"}}>
                            {topAction&&(
                              <span style={{background:"rgba(16,185,129,0.1)",color:"#10b981",border:"1px solid rgba(16,185,129,0.25)",borderRadius:12,padding:"3px 10px",fontSize:11,fontWeight:600}}>
                                {topAction[0]} · {topAction[1]}×
                              </span>
                            )}
                          </td>
                          <td style={{padding:"12px 16px",color:"var(--color-text-muted)",fontSize:12,textAlign:"right"}}>{isExpanded?"▲":"▼"}</td>
                        </tr>
                        {isExpanded&&(
                          <tr style={{background:"rgba(99,102,241,0.04)",borderBottom:"1px solid var(--color-border)"}}>
                            <td colSpan={5} style={{padding:"12px 20px 16px"}}>
                              <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                                <div style={{flex:1,minWidth:200}}>
                                  <div style={{fontSize:11,fontWeight:700,color:"var(--color-accent)",letterSpacing:0.5,marginBottom:8}}>ACTION BREAKDOWN</div>
                                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                                    {Object.entries(s.actions).sort((a,b)=>b[1]-a[1]).map(([action,count])=>(
                                      <span key={action} style={{background:"rgba(255,255,255,0.03)",border:"1px solid var(--color-border)",borderRadius:8,padding:"4px 10px",fontSize:12,color:"var(--color-text-secondary)"}}>
                                        <span style={{color:"var(--color-text-primary)",fontWeight:700}}>{count}×</span> {action}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {s.recentClients.length>0&&(
                                  <div style={{minWidth:180}}>
                                    <div style={{fontSize:11,fontWeight:700,color:"var(--color-accent)",letterSpacing:0.5,marginBottom:8}}>RECENT CLIENTS</div>
                                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                      {s.recentClients.map(c=>(
                                        <span key={c} style={{fontSize:12,color:"var(--color-text-secondary)"}}>• {c}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ COMPANIES TAB ═══════════════ */}
      {mainTab==="companies"&&(
        <>
          {/* Create Company Form */}
          {showCompanyForm&&(
            <div style={{background:"var(--color-bg-card)",border:"1px solid #10b981",borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontSize:14,color:"var(--color-text-primary)",fontWeight:700,marginBottom:16,letterSpacing:"-0.2px"}}>Create New Company</div>
              <form onSubmit={createCompany}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div><label style={LBL}>Company Name *</label><input name="name" value={companyForm.name} onChange={onChangeCompany} placeholder="e.g. Sunrise Care Center" style={INP2}/></div>
                  <div><label style={LBL}>Email</label><input name="email" type="email" value={companyForm.email} onChange={onChangeCompany} placeholder="info@company.aw" style={INP2}/></div>
                  <div><label style={LBL}>Phone</label><input name="phone" value={companyForm.phone} onChange={onChangeCompany} placeholder="+297-..." style={INP2}/></div>
                  <div><label style={LBL}>Website</label><input name="website" value={companyForm.website} onChange={onChangeCompany} placeholder="www.company.aw" style={INP2}/></div>
                  <div style={{gridColumn:"1/-1"}}><label style={LBL}>Address</label><input name="address" value={companyForm.address} onChange={onChangeCompany} placeholder="Oranjestad, Aruba" style={INP2}/></div>
                  <div style={{gridColumn:"1/-1"}}><label style={LBL}>Mission Statement</label><textarea name="mission_statement" value={companyForm.mission_statement} onChange={onChangeCompany} placeholder="e.g. Providing compassionate care..." rows={2} style={{...INP2,resize:"vertical"}}/></div>
                </div>
                <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#10b981"}}>
                  ✓ Default hours of operation will be set automatically. You can update them in Company Settings.
                </div>
                <button type="submit" disabled={saving}
                  style={{padding:"10px 24px",borderRadius:9,border:"none",background:saving?"rgba(255,255,255,0.1)":"#10b981",color:saving?"var(--color-text-muted)":"#fff",fontWeight:700,fontSize:14}}>
                  {saving?"Creating...":"Create Company"}
                </button>
              </form>
            </div>
          )}

          {/* Company List */}
          {loading?<div style={{color:"var(--color-text-muted)",textAlign:"center",padding:"40px 0"}}>Loading...</div>:(()=>{
            const visibleCompanies=companies.filter(c=>showArchived?true:!c.archived_at);
            return(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {visibleCompanies.length===0?(
                  <div style={{color:"var(--color-text-muted)",textAlign:"center",padding:"40px 0"}}>
                    {showArchived?"No archived companies.":" No companies yet. Create your first one."}
                  </div>
                ):visibleCompanies.map((c)=>{
                  const st=companyStats[c.id]||{clients:0,archivedClients:0,users:0,lastActivity:null};
                  const lastAct=st.lastActivity?new Date(st.lastActivity).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"No activity";
                  const isArchived=!!c.archived_at;
                  const isSuperAdmin=currentUser?.role==="superadmin";
                  return(
                    <div key={c.id} style={{background:"var(--color-bg-card)",border:"1px solid var(--color-border)",borderRadius:14,padding:16,opacity:isArchived?0.72:1,border:isArchived?"1px solid rgba(245,158,11,0.25)":"1px solid transparent"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                        <div style={{flex:1,minWidth:200}}>
                          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                            {c.logo_url&&(
                              <div style={{background:"#fff",borderRadius:8,padding:"4px 6px",flexShrink:0}}>
                                <img src={c.logo_url} alt={c.name} style={{height:32,maxWidth:80,objectFit:"contain",display:"block"}}/>
                              </div>
                            )}
                            <div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <div style={{fontSize:15,fontWeight:700,color:isArchived?"rgba(240,242,250,0.4)":"var(--color-text-primary)",letterSpacing:"-0.2px"}}>{c.name}</div>
                                {isArchived&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(245,158,11,0.15)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.3)"}}>ARCHIVED</span>}
                              </div>
                              {c.mission_statement&&<div style={{fontSize:11,color:"var(--color-text-dim)",fontStyle:"italic",marginTop:2}}>"{c.mission_statement}"</div>}
                            </div>
                          </div>
                          <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:8}}>
                            {c.address&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>📍 {c.address}</span>}
                            {c.phone&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>📞 {c.phone}</span>}
                            {c.email&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>✉️ {c.email}</span>}
                            {c.website&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>🌐 {c.website}</span>}
                          </div>
                          {/* Superadmin action buttons */}
                          {isSuperAdmin&&(
                            <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
                              {isArchived?(
                                <>
                                  <button onClick={()=>unarchiveCompany(c)} disabled={saving}
                                    style={{padding:"5px 14px",borderRadius:8,border:"1px solid #10b981",background:"rgba(16,185,129,0.1)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                                    ↩ Restore
                                  </button>
                                  <button onClick={()=>{setDeleteConfirmCompany(c);setDeleteCompanyInput("");}}
                                    style={{padding:"5px 14px",borderRadius:8,border:"1px solid rgba(239,68,68,0.4)",background:"rgba(239,68,68,0.08)",color:"#f87171",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                                    🗑 Delete Permanently
                                  </button>
                                </>
                              ):(
                                <button onClick={()=>setArchiveConfirmCompany(c)}
                                  style={{padding:"5px 14px",borderRadius:8,border:"1px solid rgba(245,158,11,0.4)",background:"rgba(245,158,11,0.08)",color:"#f59e0b",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                                  📦 Archive
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Stats */}
                        <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap"}}>
                          <div style={{textAlign:"center",background:"rgba(16,185,129,0.1)",borderRadius:10,padding:"10px 16px",minWidth:64}}>
                            <div style={{fontSize:22,fontWeight:700,color:"#10b981"}}>{st.clients}</div>
                            <div style={{fontSize:10,color:"var(--color-text-dim)",fontWeight:600}}>CLIENTS</div>
                            {st.archivedClients>0&&<div style={{fontSize:9,color:"var(--color-text-muted)",marginTop:2}}>{st.archivedClients} archived</div>}
                          </div>
                          <div style={{textAlign:"center",background:"rgba(99,102,241,0.12)",borderRadius:10,padding:"10px 16px",minWidth:64}}>
                            <div style={{fontSize:22,fontWeight:700,color:"#6366f1"}}>{st.users}</div>
                            <div style={{fontSize:10,color:"var(--color-text-dim)",fontWeight:600}}>USERS</div>
                          </div>
                          <div style={{textAlign:"center",background:"rgba(71,85,105,0.2)",borderRadius:10,padding:"10px 16px",minWidth:80}}>
                            <div style={{fontSize:11,fontWeight:700,color:"var(--color-text-secondary)",lineHeight:1.3}}>{lastAct}</div>
                            <div style={{fontSize:10,color:"var(--color-text-dim)",fontWeight:600,marginTop:4}}>LAST ACTIVITY</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Archive Company Confirmation ── */}
          {archiveConfirmCompany&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
              <div style={{background:"var(--color-bg-card)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:36,maxWidth:420,width:"100%",boxShadow:"0 24px 60px rgba(0,0,0,0.6)"}}>
                <div style={{fontSize:36,textAlign:"center",marginBottom:12}}>📦</div>
                <div style={{fontSize:16,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.3px",textAlign:"center",marginBottom:10}}>Archive Company</div>
                <div style={{fontSize:13,color:"var(--color-text-secondary)",textAlign:"center",lineHeight:1.7,marginBottom:28}}>
                  Archive <strong style={{color:"var(--color-text-primary)"}}>{archiveConfirmCompany.name}</strong>? It will be hidden from the company picker and all active lists. No data is deleted. You can restore it at any time.
                </div>
                <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                  <button onClick={()=>setArchiveConfirmCompany(null)}
                    style={{padding:"10px 28px",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-secondary)",fontWeight:600,fontSize:14,cursor:"pointer"}}>
                    Cancel
                  </button>
                  <button disabled={saving} onClick={()=>archiveCompany(archiveConfirmCompany)}
                    style={{padding:"10px 28px",borderRadius:9,border:"none",background:"#f59e0b",color:"#000",fontWeight:700,fontSize:14,cursor:"pointer",opacity:saving?0.6:1}}>
                    {saving?"Archiving…":"Archive"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Delete Company Confirmation (type to confirm) ── */}
          {deleteConfirmCompany&&(()=>{
            const st=companyStats[deleteConfirmCompany.id]||{clients:0,archivedClients:0,users:0};
            const totalClients=(st.clients||0)+(st.archivedClients||0);
            const hasData=totalClients>0||st.users>0;
            const confirmWord=deleteConfirmCompany.name;
            const canConfirm=!hasData&&deleteCompanyInput===confirmWord;
            return(
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.80)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
                <div style={{background:"var(--color-bg-card)",border:"1px solid #ef4444",borderRadius:16,padding:36,maxWidth:460,width:"100%",boxShadow:"0 24px 60px rgba(0,0,0,0.6)"}}>
                  <div style={{fontSize:36,textAlign:"center",marginBottom:12}}>🗑</div>
                  <div style={{fontSize:16,fontWeight:700,color:"#ef4444",textAlign:"center",marginBottom:10,letterSpacing:"-0.2px"}}>Delete Company Permanently</div>
                  {hasData?(
                    <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"14px 16px",marginBottom:20,fontSize:13,color:"#fca5a5",textAlign:"center",lineHeight:1.6}}>
                      ⛔ Cannot delete — <strong>{deleteConfirmCompany.name}</strong> still has{totalClients>0?` ${totalClients} client${totalClients!==1?"s":""}`:""}{totalClients>0&&st.users>0?" and":""}{st.users>0?` ${st.users} user${st.users!==1?"s":""}`:""} assigned. Remove them first.
                    </div>
                  ):(
                    <div style={{fontSize:13,color:"var(--color-text-secondary)",textAlign:"center",lineHeight:1.7,marginBottom:20}}>
                      This action <strong style={{color:"var(--color-text-primary)"}}>cannot be undone</strong>. All company settings and history will be permanently removed.<br/><br/>
                      Type <strong style={{color:"var(--color-text-primary)",fontFamily:"monospace"}}>{confirmWord}</strong> to confirm:
                    </div>
                  )}
                  {!hasData&&(
                    <input
                      value={deleteCompanyInput}
                      onChange={e=>setDeleteCompanyInput(e.target.value)}
                      placeholder={`Type "${confirmWord}" to confirm`}
                      style={{width:"100%",padding:"10px 14px",borderRadius:9,border:"1px solid "+(canConfirm?"#ef4444":"rgba(255,255,255,0.1)"),background:"#161927",color:"var(--color-text-primary)",fontSize:14,marginBottom:20,outline:"none"}}
                    />
                  )}
                  <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                    <button onClick={()=>{setDeleteConfirmCompany(null);setDeleteCompanyInput("");}}
                      style={{padding:"10px 28px",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-secondary)",fontWeight:600,fontSize:14,cursor:"pointer"}}>
                      Cancel
                    </button>
                    <button disabled={saving||!canConfirm} onClick={()=>deleteCompany(deleteConfirmCompany)}
                      style={{padding:"10px 28px",borderRadius:9,border:"none",background:canConfirm?"#dc2626":"rgba(255,255,255,0.1)",color:canConfirm?"#fff":"var(--color-text-muted)",fontWeight:700,fontSize:14,cursor:canConfirm?"pointer":"not-allowed",opacity:saving?0.6:1}}>
                      {saving?"Deleting…":"Delete Permanently"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* ═══════════════ CONFIRM ACTION MODAL ═══════════════ */}
      {pendingAction&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"var(--color-bg-card)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:36,maxWidth:420,width:"100%",boxShadow:"0 24px 60px rgba(0,0,0,0.6)"}}>
            <div style={{fontSize:36,textAlign:"center",marginBottom:12}}>
              {pendingAction.type==="deactivate"?"🔒":pendingAction.type==="role_change"?"🔄":"🏢"}
            </div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--color-text-primary)",letterSpacing:"-0.3px",textAlign:"center",marginBottom:10}}>
              {pendingAction.type==="deactivate"&&"Deactivate User"}
              {pendingAction.type==="role_change"&&"Change Role"}
              {pendingAction.type==="remove_company"&&"Remove from Company"}
            </div>
            <div style={{fontSize:13,color:"var(--color-text-secondary)",textAlign:"center",lineHeight:1.7,marginBottom:28}}>
              {pendingAction.type==="deactivate"&&<>Deactivate <strong style={{color:"var(--color-text-primary)"}}>{pendingAction.userName}</strong>? They will be unable to log in. Their data and history are preserved.</>}
              {pendingAction.type==="role_change"&&<>Change <strong style={{color:"var(--color-text-primary)"}}>{pendingAction.userName}</strong>'s role from <span style={{color:roleColor[pendingAction.meta.oldRole]||"var(--color-text-secondary)",fontWeight:700}}>{pendingAction.meta.oldRole.replace(/_/g," ")}</span> → <span style={{color:roleColor[pendingAction.meta.newRole]||"var(--color-text-secondary)",fontWeight:700}}>{pendingAction.meta.newRole.replace(/_/g," ")}</span>. Access changes take effect immediately.</>}
              {pendingAction.type==="remove_company"&&<>Remove <strong style={{color:"var(--color-text-primary)"}}>{pendingAction.userName}</strong> from <strong style={{color:"var(--color-text-primary)"}}>{pendingAction.meta.companyName}</strong>? They will lose access to all clients in that company.</>}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setPendingAction(null)}
                style={{padding:"10px 28px",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"var(--color-text-secondary)",fontWeight:600,fontSize:14,cursor:"pointer"}}>
                Cancel
              </button>
              <button disabled={saving} onClick={async()=>{
                  const{type,userId,meta}=pendingAction;
                  setPendingAction(null);
                  if(type==="deactivate")await deactivateUser(userId);
                  else if(type==="role_change")await updateRole(userId,meta.newRole);
                  else if(type==="remove_company")await removeFromCompany(userId,meta.companyId);
                }}
                style={{padding:"10px 28px",borderRadius:9,border:"none",background:pendingAction.type==="role_change"?"var(--color-accent)":"#dc2626",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",opacity:saving?0.6:1}}>
                {saving?"Working…":"Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export { PasswordStrengthMeter, UserManagement };
