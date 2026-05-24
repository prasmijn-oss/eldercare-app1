import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kpwzeawgrqdsezflvjkm.supabase.co";
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwd3plYXdncnFkc2V6Zmx2amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Mzc1MzIsImV4cCI6MjA5NTExMzUzMn0.-fvmwgZqwyddWyq1IJ4vcHvsTVMpPmhI72p4hyCtC6E";
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || "";

const supabase = createClient(SUPABASE_URL, ANON_KEY);
const supabaseAdmin = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : supabase;
const GCSS = [
  "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');",
  "* { box-sizing: border-box; margin: 0; padding: 0; }",
  "body { font-family: Inter, sans-serif; background: #1c1f2e; color: #cdd5e0; }",
  "input, textarea, select { font-family: inherit; }",
  "input:focus, textarea:focus, select:focus { outline: none; border-color: #7dd3fc !important; box-shadow: 0 0 0 3px rgba(125,211,252,0.12); }",
  "button { font-family: inherit; cursor: pointer; } button:hover { opacity: 0.88; }",
  "::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #2a2e42; border-radius: 3px; }",
  ".client-row { transition: transform 0.2s ease, box-shadow 0.2s ease !important; }",
  ".client-row:hover { transform: translateX(4px) !important; box-shadow: 4px 4px 12px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.04) !important; }",
  ".dash-row { transition: transform 0.18s ease, box-shadow 0.18s ease !important; }",
  ".dash-row:hover { transform: translateX(3px) !important; box-shadow: 3px 3px 10px rgba(0,0,0,0.55) !important; }",
  ".sidebar { transition: transform 0.25s ease; }",
  "@media (max-width: 768px) {",
  "  .sidebar { position: fixed !important; left: 0; top: 0; height: 100vh; z-index: 200; transform: translateX(-100%); }",
  "  .sidebar.open { transform: translateX(0) !important; }",
  "  .main-pad { padding: 16px !important; }",
  "  .g4 { grid-template-columns: 1fr 1fr !important; }",
  "  .g2 { grid-template-columns: 1fr !important; }",
  "  .fg { grid-template-columns: 1fr !important; }",
  "  .mob-hdr { display: flex !important; }",
  "}",
  "@media (min-width: 769px) {",
  "  .sidebar { transform: none !important; position: relative !important; }",
  "  .overlay { display: none !important; }",
  "  .mob-hdr { display: none !important; }",
  "}",
  ".mob-hdr { display: none; align-items: center; justify-content: space-between; padding: 14px 20px; background: #1a1d2b; border-bottom: 1px solid rgba(255,255,255,0.05); position: sticky; top: 0; z-index: 100; }",
  ".overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 199; }",
  ".overlay.show { display: block; }",
  "@media print {",
  "  body > * { display: none !important; }",
  "  #pz { display: block !important; position: fixed; top: 0; left: 0; width: 100%; padding: 32px; background: #fff; color: #000; }",
  "  .np { display: none !important; }",
  "  .ph { display: block !important; }",
  "  @page { margin: 1.5cm; size: A4; }",
  "}",
  ".ph { display: none; }",
  "html.cm-light { filter: invert(1) hue-rotate(180deg); }",
  "html.cm-light img { filter: invert(1) hue-rotate(180deg); }",
  ".notif-panel { animation: slideIn 0.22s ease; }",
  "@keyframes slideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }",
  ".shortcut-key { display:inline-block; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); border-radius:5px; padding:1px 7px; font-family:monospace; font-size:12px; color:#a5b4fc; }",
].join("\n");

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
    (c.incidents||[]).forEach(inc=>{
      if(!inc.date)return;
      const days=Math.ceil((now-new Date(inc.date))/86400000);
      if(days<=7)notifs.push({id:`inc-${c.id}-${inc.id}`,type:"incident",urgency:inc.severity==="Severe"?"high":inc.severity==="Moderate"?"medium":"low",icon:"⚠️",title:`${inc.type||"Incident"} reported`,body:`${c.name} — ${inc.severity||""} ${days===0?"today":days===1?"yesterday":days+"d ago"}`,clientId:c.id,clientName:c.name});
    });
  });
  const ord={high:0,medium:1,low:2};
  return notifs.sort((a,b)=>ord[a.urgency]-ord[b.urgency]);
}

const T = {
  en: {
    appName:"CareManager",dashboard:"Dashboard",auditTrail:"Audit Trail",
    newClient:"+ New Client",search:"Search...",searchNotes:"Search notes...",
    allStatus:"All",active:"Active",inactive:"Inactive",discharged:"Discharged",
    personalInfo:"Personal Information",diagnoses:"Diagnoses",medications:"Medications",
    allergies:"Allergies",notes:"Session Notes",vitals:"Vitals",carePlan:"Care Plan",
    documents:"Documents",inventory:"Inventory",
    fullName:"Full Name",dob:"Date of Birth",phone:"Phone",address:"Room / Address",
    azv:"AZV #",emergency:"Emergency Contact",emergPhone:"Emergency Phone",
    drCas:"Dr. di Cas",drSpec:"Specialist",status:"Status",photoTitle:"Profile Photo",
    save:"Save",saving:"Saving...",cancel:"Cancel",edit:"Edit",delete:"Delete",
    print:"Print",exportPDF:"Export PDF",emergCard:"Emergency Card",
    addDiagnosis:"+ Add Diagnosis",addMed:"+ Add Medication",addNote:"+ Add Note",
    addGoal:"+ Add Goal",addDoc:"+ Add Document",addItem:"+ Add Item",add:"+ Add",
    searchDiag:"Search or type a diagnosis...",searchMed:"Search or type medication...",
    medName:"Medication Name",dosage:"Dosage",frequency:"Frequency",whenToGive:"When to give",
    morning:"Morning",afternoon:"Afternoon",evening:"Evening",night:"Night",
    date:"Date",role:"Role",staffName:"Name",notePlaceholder:"Session notes...",
    selectRole:"Select role...",nurse:"Nurse",doctor:"Doctor",physio:"Physiotherapist",
    careAssist:"Care Assistant",other:"Other",
    deleteTitle:"Delete Client?",deleteMsg:"This will permanently remove",
    confirmDelete:"Delete",signOut:"Sign out",superAdmin:"Super Admin",staff:"Staff",
    noClients:"No clients yet",noResults:"No results",welcome:"Welcome back",
    totalClients:"Total Clients",totalMeds:"Total Medications",
    allergyAlerts:"Allergy Alerts",diagnosesLogged:"Diagnoses Logged",
    medFlags:"Medication Flags",docExpiry:"Document Expiry Alerts",
    recentNotes:"Recent Session Notes",ageDist:"Age Distribution",
    polypharmacy:"medications - polypharmacy risk",highRisk:"High-risk:",
    noAllergies:"No allergy records",noNotes:"No session notes yet",
    logVitals:"+ Log Vitals",bloodPressure:"Blood Pressure (mmHg)",
    heartRate:"Heart Rate (bpm)",weight:"Weight (kg)",temperature:"Temperature (C)",
    bloodSugar:"Blood Sugar (mmol-L)",oxygenSat:"O2 Saturation (%)",
    vitalNotes:"Notes",noVitals:"No vitals logged yet",
    goalLabel:"Care Goal",planLabel:"Care Plan",goalStatus:"Status",
    created:"Created",reviewed:"Last Reviewed",
    inProgress:"In Progress",achieved:"Achieved",onHold:"On Hold",discontinued:"Discontinued",
    noGoals:"No care goals yet",docName:"Document Name",expiry:"Expiry Date",
    docNotes:"Notes",noDocs:"No documents tracked",itemName:"Item Name",
    description:"Description",condition:"Condition",value:"Value (AWG)",
    location:"Location in Facility",noItems:"No items logged",
    excellent:"Excellent",good:"Good",fair:"Fair",poor:"Poor",
    filterStaff:"Filter by staff",filterAction:"Filter by action",filterDate:"Filter by date",
    allStaff:"All staff",allActions:"All actions",exportAudit:"Export PDF",
    noAudit:"No audit records",loadingAudit:"Loading...",
    noteSearch:"Note Search Results",noteSearchFor:"results for",noNoteResults:"No notes for",
    years:"years",synced:"synced",records:"records",
    knownAllergies:"No known allergies",notProvided:"Not provided",
    medSchedule:"Daily Medication Schedule",
    uploadPhoto:"Upload Photo",changePhoto:"Change Photo",uploading:"Uploading...",
    signIn:"Sign In",email:"Email",password:"Password",signingIn:"Signing in...",
    clients:"clients",selectLang:"Select your language",
  },
  pap: {
    appName:"CareManager",dashboard:"Dashboard",auditTrail:"Registro di Accion",
    newClient:"+ Cliente Nobo",search:"Busca...",searchNotes:"Busca notanan...",
    allStatus:"Tur",active:"Activo",inactive:"Inactivo",discharged:"Bishita Kaba",
    personalInfo:"Informacion Personal",diagnoses:"Diagnosticonan",medications:"Medicamentonan",
    allergies:"Alergienan",notes:"Notanan di Sesion",vitals:"Signonan Vital",carePlan:"Plan di Kuido",
    documents:"Documentonan",inventory:"Inventario",
    fullName:"Nomber Completo",dob:"Fecha di Nacemento",phone:"Telefon",address:"Camber - Adres",
    azv:"AZV #",emergency:"Contacto di Emergencia",emergPhone:"Telefon di Emergencia",
    drCas:"Dr. di Cas",drSpec:"Especialista",status:"Estado",photoTitle:"Foto di Perfil",
    save:"Garda",saving:"Guardando...",cancel:"Kansela",edit:"Edita",delete:"Bora",
    print:"Imprime",exportPDF:"Exporta PDF",emergCard:"Tarheta di Emergencia",
    addDiagnosis:"+ Agrega Diagnostico",addMed:"+ Agrega Medicamento",addNote:"+ Agrega Nota",
    addGoal:"+ Agrega Meta",addDoc:"+ Agrega Documento",addItem:"+ Agrega Item",add:"+ Agrega",
    searchDiag:"Busca of tipa un diagnostico...",searchMed:"Busca of tipa medicamento...",
    medName:"Nomber di Medicamento",dosage:"Dosis",frequency:"Frecuencia",whenToGive:"Ora pa duna",
    morning:"Mainta",afternoon:"Merdia",evening:"Atardi",night:"Anochi",
    date:"Fecha",role:"Rol",staffName:"Nomber",notePlaceholder:"Notanan di sesion...",
    selectRole:"Selecta rol...",nurse:"Enfermero-a",doctor:"Dokter",physio:"Fisioterapeuta",
    careAssist:"Asistente di Kuido",other:"Otro",
    deleteTitle:"Bora Cliente?",deleteMsg:"Esaki lo bora permanentemente",
    confirmDelete:"Bora",signOut:"Sali",superAdmin:"Super Admin",staff:"Personal",
    noClients:"Ningun cliente ainda",noResults:"Ningun resultado",welcome:"Bon bini bek",
    totalClients:"Total Clientenan",totalMeds:"Total Medicamentonan",
    allergyAlerts:"Alertanan di Alergia",diagnosesLogged:"Diagnosticonan Registra",
    medFlags:"Senalnan di Medicamento",docExpiry:"Documentonan cu ta Vense",
    recentNotes:"Notanan di Sesion Reciente",ageDist:"Distribucion di Edad",
    polypharmacy:"medicamentonan - riesgo di polifarmacia",highRisk:"Riesgo halto:",
    noAllergies:"Ningun alergia registra",noNotes:"Ningun nota di sesion ainda",
    logVitals:"+ Registra Signonan Vital",bloodPressure:"Presion di Sanger (mmHg)",
    heartRate:"Puls (bpm)",weight:"Peso (kg)",temperature:"Temperatura (C)",
    bloodSugar:"Suker na Sanger (mmol-L)",oxygenSat:"Saturacion di O2 (%)",
    vitalNotes:"Notanan",noVitals:"Ningun vital registra ainda",
    goalLabel:"Meta di Kuido",planLabel:"Plan di Kuido",goalStatus:"Estado",
    created:"Crea na",reviewed:"Ultimo Revision",
    inProgress:"Na Progreso",achieved:"Logra",onHold:"Para",discontinued:"Para Definitivamente",
    noGoals:"Ningun meta di kuido ainda",docName:"Nomber di Documento",expiry:"Fecha di Vensimento",
    docNotes:"Notanan",noDocs:"Ningun documento registra",itemName:"Nomber di Item",
    description:"Descripcion",condition:"Condicion",value:"Valor (AWG)",
    location:"Luga den Fasilidad",noItems:"Ningun item registra",
    excellent:"Excelente",good:"Bon",fair:"Regular",poor:"Malo",
    filterStaff:"Filtra pa personal",filterAction:"Filtra pa accion",filterDate:"Filtra pa fecha",
    allStaff:"Tur personal",allActions:"Tur accionnan",exportAudit:"Exporta PDF",
    noAudit:"Ningun registro di accion",loadingAudit:"Cargando...",
    noteSearch:"Resultado di Busqueda",noteSearchFor:"resultado pa",noNoteResults:"Ningun nota pa",
    years:"anja",synced:"sincronisa",records:"registronan",
    knownAllergies:"Ningun alergia conoci",notProvided:"No provee",
    medSchedule:"Orario di Medicamento Diario",
    uploadPhoto:"Upload Foto",changePhoto:"Cambia Foto",uploading:"Uploadando...",
    signIn:"Drenta",email:"Email",password:"Password",signingIn:"Drentando...",
    clients:"clientenan",selectLang:"Selecta bo idioma",
  },
  nl: {
    appName:"CareManager",dashboard:"Dashboard",auditTrail:"Auditlogboek",
    newClient:"+ Nieuwe Client",search:"Zoeken...",searchNotes:"Notities zoeken...",
    allStatus:"Alle",active:"Actief",inactive:"Inactief",discharged:"Ontslagen",
    personalInfo:"Persoonlijke Informatie",diagnoses:"Diagnoses",medications:"Medicijnen",
    allergies:"Allergien",notes:"Sessienotities",vitals:"Vitale functies",carePlan:"Zorgplan",
    documents:"Documenten",inventory:"Inventaris",
    fullName:"Volledige naam",dob:"Geboortedatum",phone:"Telefoon",address:"Kamer - Adres",
    azv:"AZV #",emergency:"Noodcontact",emergPhone:"Noodtelefoon",
    drCas:"Huisarts",drSpec:"Specialist",status:"Status",photoTitle:"Profielfoto",
    save:"Opslaan",saving:"Opslaan...",cancel:"Annuleren",edit:"Bewerken",delete:"Verwijderen",
    print:"Afdrukken",exportPDF:"PDF exporteren",emergCard:"Noodkaart",
    addDiagnosis:"+ Diagnose toevoegen",addMed:"+ Medicijn toevoegen",addNote:"+ Notitie toevoegen",
    addGoal:"+ Doel toevoegen",addDoc:"+ Document toevoegen",addItem:"+ Item toevoegen",add:"+ Toevoegen",
    searchDiag:"Zoek of typ een diagnose...",searchMed:"Zoek of typ medicijn...",
    medName:"Medicijnnaam",dosage:"Dosering",frequency:"Frequentie",whenToGive:"Wanneer geven",
    morning:"Ochtend",afternoon:"Middag",evening:"Avond",night:"Nacht",
    date:"Datum",role:"Rol",staffName:"Naam",notePlaceholder:"Sessienotities...",
    selectRole:"Selecteer rol...",nurse:"Verpleegkundige",doctor:"Arts",physio:"Fysiotherapeut",
    careAssist:"Zorgassistent",other:"Overig",
    deleteTitle:"Client verwijderen?",deleteMsg:"Dit verwijdert permanent",
    confirmDelete:"Verwijderen",signOut:"Uitloggen",superAdmin:"Super Admin",staff:"Personeel",
    noClients:"Nog geen clients",noResults:"Geen resultaten",welcome:"Welkom terug",
    totalClients:"Totaal Clients",totalMeds:"Totaal Medicijnen",
    allergyAlerts:"Allergie Waarschuwingen",diagnosesLogged:"Diagnoses Geregistreerd",
    medFlags:"Medicatiemeldingen",docExpiry:"Documentvervaldatum Waarschuwingen",
    recentNotes:"Recente Sessienotities",ageDist:"Leeftijdsverdeling",
    polypharmacy:"medicijnen - polyfarmacie risico",highRisk:"Hoog risico:",
    noAllergies:"Geen allergie records",noNotes:"Nog geen sessienotities",
    logVitals:"+ Vitale functies registreren",bloodPressure:"Bloeddruk (mmHg)",
    heartRate:"Hartslag (bpm)",weight:"Gewicht (kg)",temperature:"Temperatuur (C)",
    bloodSugar:"Bloedsuiker (mmol-L)",oxygenSat:"O2-Saturatie (%)",
    vitalNotes:"Notities",noVitals:"Nog geen vitale functies",
    goalLabel:"Zorgdoel",planLabel:"Zorgplan",goalStatus:"Status",
    created:"Aangemaakt",reviewed:"Laatste beoordeling",
    inProgress:"In uitvoering",achieved:"Bereikt",onHold:"In de wacht",discontinued:"Gestopt",
    noGoals:"Nog geen zorgdoelen",docName:"Documentnaam",expiry:"Vervaldatum",
    docNotes:"Notities",noDocs:"Geen documenten",itemName:"Itemnaam",
    description:"Beschrijving",condition:"Staat",value:"Waarde (AWG)",
    location:"Locatie in faciliteit",noItems:"Geen items",
    excellent:"Uitstekend",good:"Goed",fair:"Redelijk",poor:"Slecht",
    filterStaff:"Filter op personeel",filterAction:"Filter op actie",filterDate:"Filter op datum",
    allStaff:"Al het personeel",allActions:"Alle acties",exportAudit:"PDF exporteren",
    noAudit:"Geen auditrecords",loadingAudit:"Laden...",
    noteSearch:"Zoekresultaten notities",noteSearchFor:"resultaten voor",noNoteResults:"Geen notities voor",
    years:"jaar",synced:"gesynchroniseerd",records:"records",
    knownAllergies:"Geen bekende allergien",notProvided:"Niet opgegeven",
    medSchedule:"Dagelijks Medicatieschema",
    uploadPhoto:"Foto uploaden",changePhoto:"Foto wijzigen",uploading:"Uploaden...",
    signIn:"Inloggen",email:"E-mail",password:"Wachtwoord",signingIn:"Inloggen...",
    clients:"clients",selectLang:"Selecteer uw taal",
  },
  es: {
    appName:"CareManager",dashboard:"Panel",auditTrail:"Registro de Auditoria",
    newClient:"+ Nuevo Cliente",search:"Buscar...",searchNotes:"Buscar notas...",
    allStatus:"Todos",active:"Activo",inactive:"Inactivo",discharged:"Dado de alta",
    personalInfo:"Informacion Personal",diagnoses:"Diagnosticos",medications:"Medicamentos",
    allergies:"Alergias",notes:"Notas de Sesion",vitals:"Signos Vitales",carePlan:"Plan de Cuidado",
    documents:"Documentos",inventory:"Inventario",
    fullName:"Nombre Completo",dob:"Fecha de Nacimiento",phone:"Telefono",address:"Habitacion - Direccion",
    azv:"AZV #",emergency:"Contacto de Emergencia",emergPhone:"Telefono de Emergencia",
    drCas:"Medico de Cabecera",drSpec:"Especialista",status:"Estado",photoTitle:"Foto de Perfil",
    save:"Guardar",saving:"Guardando...",cancel:"Cancelar",edit:"Editar",delete:"Eliminar",
    print:"Imprimir",exportPDF:"Exportar PDF",emergCard:"Tarjeta de Emergencia",
    addDiagnosis:"+ Agregar Diagnostico",addMed:"+ Agregar Medicamento",addNote:"+ Agregar Nota",
    addGoal:"+ Agregar Meta",addDoc:"+ Agregar Documento",addItem:"+ Agregar Item",add:"+ Agregar",
    searchDiag:"Buscar o escribir un diagnostico...",searchMed:"Buscar o escribir medicamento...",
    medName:"Nombre del Medicamento",dosage:"Dosis",frequency:"Frecuencia",whenToGive:"Cuando dar",
    morning:"Manana",afternoon:"Tarde",evening:"Noche",night:"Madrugada",
    date:"Fecha",role:"Rol",staffName:"Nombre",notePlaceholder:"Notas de sesion...",
    selectRole:"Seleccionar rol...",nurse:"Enfermero-a",doctor:"Medico",physio:"Fisioterapeuta",
    careAssist:"Auxiliar de Cuidado",other:"Otro",
    deleteTitle:"Eliminar Cliente?",deleteMsg:"Esto eliminara permanentemente a",
    confirmDelete:"Eliminar",signOut:"Cerrar sesion",superAdmin:"Super Admin",staff:"Personal",
    noClients:"Aun no hay clientes",noResults:"Sin resultados",welcome:"Bienvenido de nuevo",
    totalClients:"Total Clientes",totalMeds:"Total Medicamentos",
    allergyAlerts:"Alertas de Alergia",diagnosesLogged:"Diagnosticos Registrados",
    medFlags:"Alertas de Medicamentos",docExpiry:"Alertas de Vencimiento",
    recentNotes:"Notas de Sesion Recientes",ageDist:"Distribucion de Edades",
    polypharmacy:"medicamentos - riesgo de polifarmacia",highRisk:"Alto riesgo:",
    noAllergies:"Sin registros de alergia",noNotes:"Aun no hay notas",
    logVitals:"+ Registrar Signos Vitales",bloodPressure:"Presion Arterial (mmHg)",
    heartRate:"Frecuencia Cardiaca (bpm)",weight:"Peso (kg)",temperature:"Temperatura (C)",
    bloodSugar:"Glucosa en Sangre (mmol-L)",oxygenSat:"Saturacion O2 (%)",
    vitalNotes:"Notas",noVitals:"Aun no hay signos vitales",
    goalLabel:"Meta de Cuidado",planLabel:"Plan de Cuidado",goalStatus:"Estado",
    created:"Creado",reviewed:"Ultima Revision",
    inProgress:"En Progreso",achieved:"Logrado",onHold:"En Pausa",discontinued:"Discontinuado",
    noGoals:"Aun no hay metas",docName:"Nombre del Documento",expiry:"Fecha de Vencimiento",
    docNotes:"Notas",noDocs:"Sin documentos",itemName:"Nombre del Articulo",
    description:"Descripcion",condition:"Condicion",value:"Valor (AWG)",
    location:"Ubicacion en la Instalacion",noItems:"Sin articulos",
    excellent:"Excelente",good:"Bueno",fair:"Regular",poor:"Malo",
    filterStaff:"Filtrar por personal",filterAction:"Filtrar por accion",filterDate:"Filtrar por fecha",
    allStaff:"Todo el personal",allActions:"Todas las acciones",exportAudit:"Exportar PDF",
    noAudit:"No se encontraron registros",loadingAudit:"Cargando...",
    noteSearch:"Resultados de Busqueda",noteSearchFor:"resultados para",noNoteResults:"No se encontraron notas para",
    years:"anos",synced:"sincronizado",records:"registros",
    knownAllergies:"Sin alergias conocidas",notProvided:"No proporcionado",
    medSchedule:"Horario Diario de Medicamentos",
    uploadPhoto:"Subir Foto",changePhoto:"Cambiar Foto",uploading:"Subiendo...",
    signIn:"Iniciar sesion",email:"Correo",password:"Contrasena",signingIn:"Iniciando...",
    clients:"clientes",selectLang:"Selecciona tu idioma",
  },
};

const LANG_OPTIONS = [
  {code:"en",label:"English",emoji:"EN"},
  {code:"pap",label:"Papiamento",emoji:"PAP"},
  {code:"nl",label:"Nederlands",emoji:"NL"},
  {code:"es",label:"Espanol",emoji:"ES"},
];

const DIAGNOSES = [
  "Alzheimer's Disease","Anemia","Anxiety Disorder","Arthritis (Osteoarthritis)",
  "Arthritis (Rheumatoid)","Atrial Fibrillation","Benign Prostatic Hyperplasia",
  "Cancer","Cataracts","Chronic Kidney Disease","Chronic Pain","COPD",
  "Coronary Artery Disease","Deep Vein Thrombosis","Dementia","Depression",
  "Diabetes Type 1","Diabetes Type 2","Dyslipidemia","Edema","Epilepsy","Falls Risk",
  "Gout","Heart Failure","Hypertension","Hypothyroidism","Incontinence",
  "Insomnia","Malnutrition","Macular Degeneration","Obesity","Osteoporosis",
  "Parkinson's Disease","Peripheral Artery Disease","Peripheral Neuropathy",
  "Pressure Ulcer Risk","Pulmonary Embolism","Renal Failure","Stroke (CVA)",
  "TIA","Vascular Dementia",
];

const MEDICATIONS = [
  "Amlodipine","Amoxicillin","Aspirin","Atenolol","Atorvastatin","Azithromycin",
  "Bisoprolol","Calcium Carbonate","Carvedilol","Clopidogrel","Colchicine",
  "Digoxin","Donepezil","Doxazosin","Enalapril","Escitalopram","Famotidine",
  "Finasteride","Furosemide","Gabapentin","Glipizide","Hydrochlorothiazide",
  "Ibuprofen","Insulin Basal","Insulin Rapid","Lactulose","Levodopa",
  "Levothyroxine","Lisinopril","Losartan","Memantine","Metformin","Metoprolol",
  "Mirtazapine","Morphine","Naproxen","Nifedipine","Omeprazole","Paracetamol",
  "Pantoprazole","Perindopril","Prednisolone","Ramipril","Rivaroxaban",
  "Salbutamol","Sertraline","Simvastatin","Spironolactone","Tamsulosin",
  "Tiotropium","Tramadol","Valsartan","Vitamin B12","Vitamin D3","Warfarin","Zolpidem",
];

const HIGH_RISK = [
  "Warfarin","Rivaroxaban","Clopidogrel","Digoxin","Insulin Basal","Insulin Rapid",
  "Morphine","Tramadol","Zolpidem","Prednisolone","Furosemide","Spironolactone",
  "Donepezil","Memantine","Levodopa",
];

const PLY = 5;
const COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6"];

function getMedFlags(c) {
  const meds = (c.medications||[]).filter(m=>m.name&&m.name.trim());
  const highRisk = meds.filter(m=>HIGH_RISK.some(h=>m.name.toLowerCase().includes(h.toLowerCase())));
  return {highRisk,polypharmacy:meds.length>=PLY,medCount:meds.length};
}
function calcAge(dob){if(!dob)return null;return Math.floor((Date.now()-new Date(dob).getTime())/(365.25*24*3600*1000));}
function initials(n){if(!n)return "?";return n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();}
function avatarColor(n){if(!n)return COLORS[0];let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%COLORS.length;return COLORS[h];}
function daysUntil(d){if(!d)return null;return Math.ceil((new Date(d)-new Date())/(1000*60*60*24));}
function daysSince(d){if(!d)return Infinity;return Math.floor((Date.now()-new Date(d+"T00:00:00").getTime())/(1000*60*60*24));}
function daysUntilBirthday(dob){
  if(!dob)return null;
  const today=new Date();today.setHours(0,0,0,0);
  const[,m,day]=dob.split("-").map(Number);
  let next=new Date(today.getFullYear(),m-1,day);
  if(next<today)next=new Date(today.getFullYear()+1,m-1,day);
  return Math.ceil((next-today)/(1000*60*60*24));
}
function checkAbnormalVitals(v){
  const flags=[];
  const sys=parseFloat(v.bp_systolic),dia=parseFloat(v.bp_diastolic);
  const hr=parseFloat(v.heart_rate),glucose=parseFloat(v.blood_sugar);
  const o2=parseFloat(v.oxygen_sat),temp=parseFloat(v.temperature);
  if(!isNaN(sys)){
    if(sys>160)flags.push({label:`BP ${sys}/${isNaN(dia)?'?':dia} mmHg`,note:"Hypertension",sev:"high"});
    else if(sys<90)flags.push({label:`BP ${sys}/${isNaN(dia)?'?':dia} mmHg`,note:"Hypotension",sev:"low"});
  }
  if(!isNaN(hr)){
    if(hr>100)flags.push({label:`HR ${hr} bpm`,note:"Tachycardia",sev:"high"});
    else if(hr<50)flags.push({label:`HR ${hr} bpm`,note:"Bradycardia",sev:"low"});
  }
  if(!isNaN(glucose)){
    if(glucose>180)flags.push({label:`Glucose ${glucose}`,note:"Hyperglycemia",sev:"high"});
    else if(glucose<70)flags.push({label:`Glucose ${glucose}`,note:"Hypoglycemia",sev:"low"});
  }
  if(!isNaN(o2)&&o2<92)flags.push({label:`O₂ ${o2}%`,note:"Low oxygen sat.",sev:"low"});
  if(!isNaN(temp)){
    if(temp>38.5)flags.push({label:`Temp ${temp}°C`,note:"Fever",sev:"high"});
    else if(temp<36.0)flags.push({label:`Temp ${temp}°C`,note:"Hypothermia",sev:"low"});
  }
  return flags;
}
function allergyMedConflicts(c){
  const allergies=(c.allergies||[]).filter(a=>a.value&&a.value.trim()).map(a=>a.value.toLowerCase().trim());
  const meds=(c.medications||[]).filter(m=>m.name&&m.name.trim());
  return meds.filter(m=>{
    const mn=m.name.toLowerCase().trim();
    return allergies.some(a=>mn.includes(a)||a.includes(mn));
  });
}
const FALL_RISK_DIAG={"Falls Risk":3,"Parkinson's Disease":2,"Dementia":2,"Alzheimer's Disease":2,"Stroke (CVA)":2,"TIA":1,"Vascular Dementia":2,"Epilepsy":2,"Osteoporosis":1,"Peripheral Neuropathy":1,"Arthritis (Osteoarthritis)":1,"Arthritis (Rheumatoid)":1,"Incontinence":1};
const FALL_RISK_MEDS={"Zolpidem":2,"Morphine":2,"Tramadol":2,"Furosemide":1,"Insulin Basal":1,"Insulin Rapid":1,"Levodopa":1,"Donepezil":1,"Memantine":1};
function calcFallRisk(client){
  const factors=[];let score=0;
  const age=calcAge(client.date_of_birth);
  if(age!==null){if(age>=85){score+=3;factors.push("Age "+age+" (85+)");}else if(age>=76){score+=2;factors.push("Age "+age+" (76-85)");}else if(age>=65){score+=1;factors.push("Age "+age+" (65-75)");}}
  const diags=(client.diagnoses||[]).filter(d=>d.value).map(d=>d.value.toLowerCase());
  for(const[k,pts]of Object.entries(FALL_RISK_DIAG)){if(diags.some(d=>d.includes(k.toLowerCase()))){score+=pts;factors.push(k);}}
  const meds=(client.medications||[]).filter(m=>m.name).map(m=>m.name.toLowerCase());
  for(const[k,pts]of Object.entries(FALL_RISK_MEDS)){if(meds.some(m=>m.includes(k.toLowerCase()))){score+=pts;factors.push(k);}}
  if(meds.length>=5){score+=1;factors.push("Polypharmacy ("+meds.length+" meds)");}
  const level=score>=6?"High":score>=3?"Moderate":"Low";
  const color=score>=6?"#ef4444":score>=3?"#f59e0b":"#10b981";
  return{score,level,color,factors};
}
function expiryBadge(d){
  if(d===null)return null;
  if(d<0)return{label:"EXPIRED",color:"#ef4444",bg:"rgba(239,68,68,0.1)"};
  if(d<=30)return{label:"EXPIRES SOON",color:"#ef4444",bg:"rgba(239,68,68,0.1)"};
  if(d<=60)return{label:"EXPIRING",color:"#f59e0b",bg:"rgba(245,158,11,0.1)"};
  return{label:"VALID",color:"#10b981",bg:"rgba(16,185,129,0.1)"};
}
const uid=()=>crypto.randomUUID();
const tod=()=>new Date().toISOString().slice(0,10);

// RBAC permission helper
const DEFAULT_PERMS={
  superadmin:["view","add","edit","delete","audit","users","company","permissions"],
  admin:     ["view","add","edit","delete","audit","company"],
  power_user:["view","add","edit"],
  user:      ["view"],
  inactive:  [],
};

// Global permissions cache - loaded from DB on login
let LOADED_PERMS=null;

function can(role,action){
  if(LOADED_PERMS){
    const rolePerms=LOADED_PERMS[role]||[];
    return rolePerms.includes(action);
  }
  return(DEFAULT_PERMS[role]||[]).includes(action);
}

async function loadPermissions(companyId){
  try{
    // Load global permissions
    const {data:global}=await supabase.from("permissions").select("role,action,allowed");
    // Load company overrides if companyId provided
    const {data:company}=companyId
      ?await supabase.from("company_permissions").select("role,action,allowed").eq("company_id",companyId)
      :{data:[]};

    // Build permissions map
    const perms={};
    (global||[]).forEach(({role,action,allowed})=>{
      if(!perms[role])perms[role]=[];
      if(allowed&&!perms[role].includes(action))perms[role].push(action);
    });
    // Apply company overrides
    (company||[]).forEach(({role,action,allowed})=>{
      if(!perms[role])perms[role]=[];
      if(allowed&&!perms[role].includes(action)){perms[role].push(action);}
      else if(!allowed){perms[role]=perms[role].filter(a=>a!==action);}
    });
    LOADED_PERMS=perms;
  }catch(e){
    console.error("Failed to load permissions",e);
    LOADED_PERMS=null;
  }
}

const DEFAULT_INTAKE_ITEMS=[
  {key:"id_docs",label:"ID documents verified"},
  {key:"insurance",label:"Insurance / AZV card on file"},
  {key:"medical_history",label:"Medical history form completed"},
  {key:"emergency_contacts",label:"Emergency contacts recorded"},
  {key:"consent_form",label:"Consent form signed"},
  {key:"photo",label:"Profile photo taken"},
  {key:"med_reconciliation",label:"Medication reconciliation done"},
  {key:"allergies_recorded",label:"Allergies reviewed and recorded"},
  {key:"care_plan_initial",label:"Initial care plan created"},
  {key:"room_assigned",label:"Room / location assigned"},
];
function emptyClient(){return{
  id:uid(),name:"",date_of_birth:"",phone:"",room_or_address:"",
  emergency_contact:"",emergency_phone:"",azv_number:"",dr_di_cas:"",
  dr_specialista:"",photo_url:"",status:"Active",
  diagnoses:[{id:uid(),value:""}],
  medications:[{id:uid(),name:"",dosage:"",frequency:"",timing:{morning:false,afternoon:false,evening:false,night:false}}],
  allergies:[{id:uid(),value:""}],
  session_notes:[{id:uid(),date:tod(),role:"",staff_name:"",text:""}],
  vitals:[],care_plan:[],documents:[],inventory:[],
  family_contacts:[],appointments:[],incidents:[],
  intake_checklist:DEFAULT_INTAKE_ITEMS.map(i=>({id:uid(),key:i.key,label:i.label,done:false,completed_by:"",completed_at:""})),
};}

function toDb(d){return{
  id:d.id,name:d.name,date_of_birth:d.date_of_birth||null,
  phone:d.phone,room_or_address:d.room_or_address,
  emergency_contact:d.emergency_contact,emergency_phone:d.emergency_phone,
  azv_number:d.azv_number,dr_di_cas:d.dr_di_cas,dr_specialista:d.dr_specialista,
  photo_url:d.photo_url||null,status:d.status||"Active",
  diagnoses:JSON.stringify(d.diagnoses),allergies:JSON.stringify(d.allergies),
  medications:JSON.stringify(d.medications),session_notes:JSON.stringify(d.session_notes),
  vitals:JSON.stringify(d.vitals||[]),care_plan:JSON.stringify(d.care_plan||[]),
  documents:JSON.stringify(d.documents||[]),inventory:JSON.stringify(d.inventory||[]),
  family_contacts:JSON.stringify(d.family_contacts||[]),
  appointments:JSON.stringify(d.appointments||[]),
  incidents:JSON.stringify(d.incidents||[]),
  intake_checklist:JSON.stringify(d.intake_checklist||[]),
};}

function fromDb(row){
  const p=(v,fb)=>{try{return v?JSON.parse(v):fb;}catch{return fb;}};
  return{
    ...row,
    diagnoses:p(row.diagnoses,[{id:uid(),value:""}]),
    allergies:p(row.allergies,[{id:uid(),value:""}]),
    medications:p(row.medications,[{id:uid(),name:"",dosage:"",frequency:"",timing:{}}]),
    session_notes:p(row.session_notes,[{id:uid(),date:tod(),role:"",staff_name:"",text:""}]),
    vitals:p(row.vitals,[]),care_plan:p(row.care_plan,[]),
    documents:p(row.documents,[]),inventory:p(row.inventory,[]),
    family_contacts:p(row.family_contacts,[]),
    appointments:p(row.appointments,[]),
    incidents:p(row.incidents,[]),
    intake_checklist:p(row.intake_checklist,[]),
  };
}

const INP={width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #334155",background:"#0f172a",color:"#e2e8f0",fontSize:14};
const LBL={display:"block",fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,letterSpacing:0.5,textTransform:"uppercase"};
const ABTN={background:"none",border:"1.5px dashed #334155",borderRadius:8,padding:"7px 14px",color:"#6366f1",fontSize:13,fontWeight:600};
const IBTN={background:"none",border:"1px solid #334155",borderRadius:6,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b",fontSize:12,flexShrink:0};

function SearchDrop({value,onChange,options,placeholder}){
  const [q,setQ]=useState(value||"");
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  const filtered=options.filter(o=>o.toLowerCase().includes(q.toLowerCase())).slice(0,8);
  useEffect(()=>{setQ(value||"");},[value]);
  useEffect(()=>{
    const fn=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",fn);
    return()=>document.removeEventListener("mousedown",fn);
  },[]);
  const pick=opt=>{onChange(opt);setQ(opt);setOpen(false);};
  return(
    <div ref={ref} style={{position:"relative"}}>
      <input style={{...INP,paddingRight:28}} placeholder={placeholder} value={q}
        onChange={e=>{setQ(e.target.value);onChange(e.target.value);setOpen(true);}}
        onFocus={()=>setOpen(true)}/>
      <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",color:"#475569",fontSize:10,pointerEvents:"none"}}>v</span>
      {open&&filtered.length>0&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#1c1f2e",border:"1px solid #334155",borderRadius:8,zIndex:999,boxShadow:"0 8px 24px rgba(0,0,0,0.4)",maxHeight:220,overflowY:"auto"}}>
          {filtered.map(opt=>(
            <div key={opt} onMouseDown={()=>pick(opt)}
              style={{padding:"9px 12px",cursor:"pointer",fontSize:13,color:"#cbd5e1",borderBottom:"1px solid #0f172a"}}>
              {opt}
            </div>
          ))}
          {q&&!options.includes(q)&&(
            <div onMouseDown={()=>pick(q)} style={{padding:"9px 12px",cursor:"pointer",fontSize:13,color:"#6366f1",fontWeight:600,borderTop:"1px solid #334155"}}>
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
    <div style={{background:"#1c1f2e",border:"1px solid #334155",borderRadius:12,marginBottom:16,overflow:"visible"}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"14px 18px",background:"none",border:"none",borderBottom:open?"1px solid #334155":"none"}}>
        <span style={{fontSize:18}}>{icon}</span>
        <span style={{fontFamily:"Playfair Display,serif",fontSize:15,fontWeight:700,color:"#f1f5f9",flex:1,textAlign:"left"}}>{title}</span>
        <span style={{color:accent||"#6366f1",fontSize:12}}>{open?"^":"v"}</span>
      </button>
      {open&&<div style={{padding:"16px 18px"}}>{children}</div>}
    </div>
  );
}

function PhotoUp({value,onChange,clientId,t}){
  const [loading,setLoading]=useState(false);
  const ref=useRef(null);
  const handle=async e=>{
    const file=e.target.files[0];if(!file)return;
    setLoading(true);
    const ext=file.name.split(".").pop();
    const path=clientId+"."+ext;
    const {error}=await supabase.storage.from("client-photos").upload(path,file,{upsert:true});
    if(error){alert("Upload failed: "+error.message);setLoading(false);return;}
    const {data}=supabase.storage.from("client-photos").getPublicUrl(path);
    onChange(data.publicUrl+"?t="+Date.now());
    setLoading(false);
  };
  return(
    <div style={{display:"flex",alignItems:"center",gap:20,padding:"16px 18px",borderBottom:"1px solid #334155"}}>
      <div onClick={()=>ref.current&&ref.current.click()}
        style={{width:80,height:80,borderRadius:"50%",background:value?"transparent":"#0f172a",border:"2px dashed #334155",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",flexShrink:0}}>
        {value?<img src={value} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:28}}>+</span>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={handle}/>
      <div>
        <div style={{fontSize:14,fontWeight:600,color:"#f1f5f9",marginBottom:4}}>{t.photoTitle}</div>
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
          {items.length>1&&<button style={IBTN} onClick={()=>rm(item.id)}>x</button>}
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
      {items.map(item=>(
        <div key={item.id} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:10,padding:12}}>
          <div style={{marginBottom:8}}>
            <label style={LBL}>{t.medName}</label>
            <SearchDrop value={item.name} onChange={v=>upd(item.id,"name",v)} options={MEDICATIONS} placeholder={t.searchMed}/>
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
                    style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid "+(active?slot.color:"#334155"),background:active?slot.color+"20":"transparent",color:active?slot.color:"#64748b",fontSize:12,fontWeight:600}}>
                    {labs[slot.key]}
                  </button>
                );
              })}
            </div>
          </div>
          {items.length>1&&<button style={{...IBTN,marginTop:8}} onClick={()=>rm(item.id)}>x</button>}
        </div>
      ))}
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
          {items.length>1&&<button style={IBTN} onClick={()=>rm(item.id)}>x</button>}
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
      <div style={{background:"#0f172a",border:"1px solid #334155",borderRadius:10,padding:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
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
                style={{padding:"9px 12px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#64748b",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>
                Clear
              </button>
            )}
          </div>
        </div>
        {hasFilter&&(
          <div style={{marginTop:8,fontSize:12,color:"#64748b"}}>
            {filtered.length} of {items.length} note{items.length!==1?"s":""}
          </div>
        )}
      </div>

      {/* Notes */}
      {filtered.length===0?(
        <div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"20px 0"}}>
          {hasFilter?"No notes match your filters":t.noNotes}
        </div>
      ):filtered.map(item=>(
        <div key={item.id} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:10,padding:12}}>
          <div className="fg" style={{display:"grid",gridTemplateColumns:"160px 1fr 1fr auto",gap:8,alignItems:"center",marginBottom:10}}>
            <div><label style={LBL}>{t.date}</label><input type="date" style={INP} value={item.date} onChange={e=>upd(item.id,"date",e.target.value)}/></div>
            <div><label style={LBL}>{t.role}</label>
              <select style={{...INP,cursor:"pointer"}} value={item.role||""} onChange={e=>upd(item.id,"role",e.target.value)}>
                <option value="">{t.selectRole}</option>
                {roles.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div><label style={LBL}>{t.staffName}</label><input style={INP} placeholder={t.staffName} value={item.staff_name||""} onChange={e=>upd(item.id,"staff_name",e.target.value)}/></div>
            {items.length>1&&<div style={{paddingTop:18}}><button style={IBTN} onClick={()=>rm(item.id)}>x</button></div>}
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
      <text x={pd} y={H} fontSize="9" fill="#64748b">{vals[0]}{unit}</text>
      <text x={W-pd} y={H} fontSize="9" fill="#64748b" textAnchor="end">{vals[vals.length-1]}{unit}</text>
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
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"#64748b"}}>{vitals.length} entries</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#6366f1"}} onClick={openForm}>{t.logVitals}</button>
      </div>
      {vitals.length>=2&&(
        <div style={{background:"#0f172a",border:"1px solid #334155",borderRadius:10,padding:12,marginBottom:12}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {metrics.map(m=>(
              <button key={m.key} onClick={()=>setMetric(m.key)}
                style={{padding:"3px 10px",borderRadius:20,border:"1.5px solid "+(metric===m.key?m.color:"#334155"),background:metric===m.key?m.color+"20":"transparent",color:metric===m.key?m.color:"#64748b",fontSize:11,fontWeight:600}}>
                {m.label}
              </button>
            ))}
          </div>
          {(()=>{const m=metrics.find(x=>x.key===metric);const d=chartData.map(v=>v[metric]).filter(v=>v!==""&&v!==undefined);return <VChart data={d} color={m.color} unit={m.unit}/>;})()}
        </div>
      )}
      {showForm&&(
        <div style={{background:"#0f172a",border:"1px solid #6366f1",borderRadius:10,padding:14,marginBottom:12}}>
          <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>{t.date}</label><input type="date" style={INP} value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
            <div><label style={LBL}>{t.bloodPressure}</label>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input style={INP} placeholder="Sys" value={entry.bp_systolic} onChange={e=>setEntry(v=>({...v,bp_systolic:e.target.value}))}/>
                <span style={{color:"#64748b"}}>/</span>
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
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#6366f1",color:"#fff",fontWeight:600}} onClick={save}>{t.save}</button>
          </div>
        </div>
      )}
      {sorted.length===0?<div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"20px 0"}}>{t.noVitals}</div>:(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {sorted.map(v=>(
            <div key={v.id} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"10px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontWeight:600,fontSize:13,color:"#f1f5f9"}}>{new Date(v.date+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</span>
                <button onClick={()=>rm(v.id)} style={{background:"none",border:"none",color:"#475569",fontSize:12}}>x</button>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {v.bp_systolic&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(239,68,68,0.1)",color:"#ef4444",fontWeight:600}}>BP {v.bp_systolic}/{v.bp_diastolic} mmHg</span>}
                {v.heart_rate&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(236,72,153,0.1)",color:"#ec4899",fontWeight:600}}>{v.heart_rate} bpm</span>}
                {v.weight&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(16,185,129,0.1)",color:"#10b981",fontWeight:600}}>{v.weight} kg</span>}
                {v.temperature&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(245,158,11,0.1)",color:"#f59e0b",fontWeight:600}}>{v.temperature}C</span>}
                {v.blood_sugar&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(139,92,246,0.1)",color:"#8b5cf6",fontWeight:600}}>{v.blood_sugar} mmol</span>}
                {v.oxygen_sat&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(6,182,212,0.1)",color:"#06b6d4",fontWeight:600}}>{v.oxygen_sat}% O2</span>}
              </div>
              {v.notes&&<div style={{fontSize:12,color:"#64748b",marginTop:6,fontStyle:"italic"}}>{v.notes}</div>}
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
  {value:"discontinued",color:"#64748b"},
];

function CarePlan({items,onChange,t}){
  const add=()=>onChange([...items,{id:uid(),goal:"",plan:"",status:"inProgress",created:tod(),reviewed:""}]);
  const upd=(id,f,v)=>onChange(items.map(i=>i.id===id?{...i,[f]:v}:i));
  const rm=id=>onChange(items.filter(i=>i.id!==id));
  const slab={inProgress:t.inProgress,achieved:t.achieved,onHold:t.onHold,discontinued:t.discontinued};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {items.length===0&&<div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"16px 0"}}>{t.noGoals}</div>}
      {items.map(item=>{
        const gs=GSTATUSES.find(s=>s.value===item.status)||GSTATUSES[0];
        return(
          <div key={item.id} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:10,padding:12,borderLeft:"3px solid "+gs.color}}>
            <div style={{marginBottom:8}}><label style={LBL}>{t.goalLabel}</label><input style={INP} placeholder={t.goalLabel+"..."} value={item.goal} onChange={e=>upd(item.id,"goal",e.target.value)}/></div>
            <div style={{marginBottom:8}}><label style={LBL}>{t.planLabel}</label><textarea style={{...INP,height:64,resize:"vertical"}} placeholder={t.planLabel+"..."} value={item.plan} onChange={e=>upd(item.id,"plan",e.target.value)}/></div>
            <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
              <div><label style={LBL}>{t.goalStatus}</label>
                <select style={{...INP,color:gs.color,borderColor:gs.color,cursor:"pointer"}} value={item.status} onChange={e=>upd(item.id,"status",e.target.value)}>
                  {GSTATUSES.map(s=><option key={s.value} value={s.value}>{slab[s.value]}</option>)}
                </select>
              </div>
              <div><label style={LBL}>{t.created}</label><input type="date" style={INP} value={item.created} onChange={e=>upd(item.id,"created",e.target.value)}/></div>
              <div><label style={LBL}>{t.reviewed}</label><input type="date" style={INP} value={item.reviewed||""} onChange={e=>upd(item.id,"reviewed",e.target.value)}/></div>
              <div style={{paddingBottom:1}}><button style={IBTN} onClick={()=>rm(item.id)}>x</button></div>
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
      {items.length===0&&<div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"16px 0"}}>{t.noDocs}</div>}
      {items.map(item=>{
        const days=daysUntil(item.expiry);
        const badge=expiryBadge(days);
        return(
          <div key={item.id} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:10,padding:12,display:"flex",gap:10,alignItems:"center",borderLeft:badge?"3px solid "+badge.color:"3px solid #334155"}}>
            <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,flex:1}}>
              <div><label style={LBL}>{t.docName}</label><input style={INP} placeholder="e.g. AZV Card..." value={item.name} onChange={e=>upd(item.id,"name",e.target.value)}/></div>
              <div><label style={LBL}>{t.expiry}</label><input type="date" style={INP} value={item.expiry||""} onChange={e=>upd(item.id,"expiry",e.target.value)}/></div>
              <div><label style={LBL}>{t.docNotes}</label><input style={INP} placeholder="..." value={item.notes||""} onChange={e=>upd(item.id,"notes",e.target.value)}/></div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center",flexShrink:0}}>
              {badge&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:badge.bg,color:badge.color,whiteSpace:"nowrap"}}>{badge.label}{days!==null&&" "+(days<0?Math.abs(days)+"d ago":days+"d")}</span>}
              <button style={IBTN} onClick={()=>rm(item.id)}>x</button>
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
  const color=cc[item.condition]||"#64748b";
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
    <div style={{background:"#0f172a",border:"1px solid #334155",borderRadius:10,overflow:"hidden"}}>
      <div onClick={()=>ref.current&&ref.current.click()}
        style={{width:"100%",height:120,background:item.photo_url?"transparent":"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",borderBottom:"1px solid #334155",position:"relative"}}>
        {item.photo_url?<img src={item.photo_url} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{textAlign:"center",color:"#475569"}}><div style={{fontSize:28}}>+</div><div style={{fontSize:11,marginTop:4}}>Add photo</div></div>}
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
        <button onClick={onDel} style={{background:"none",border:"1px solid #334155",borderRadius:6,padding:"3px 10px",color:"#64748b",fontSize:11}}>Remove</button>
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
        <span style={{fontSize:13,color:"#64748b"}}>{items.length} items{total>0?" - AWG "+total.toFixed(2):""}</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#6366f1"}} onClick={add}>{t.addItem}</button>
      </div>
      {items.length===0&&<div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"24px 0"}}>{t.noItems}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
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
      {items.length===0&&<div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"16px 0"}}>No family contacts added yet</div>}
      {items.map(item=>(
        <div key={item.id} style={{background:"#0f172a",border:"1px solid "+(item.is_primary?"rgba(99,102,241,0.4)":"#334155"),borderRadius:10,overflow:"hidden"}}>
          <div onClick={()=>setExpanded(expanded===item.id?null:item.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(item.name||"?"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(item.name||"?")}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,color:"#f1f5f9"}}>{item.name||"New Contact"}</div>
              <div style={{fontSize:11,color:"#64748b"}}>{item.relationship}{item.phone?" · "+item.phone:""}</div>
            </div>
            {item.is_primary&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(99,102,241,0.15)",color:"#a5b4fc"}}>Primary</span>}
            <span style={{color:"#475569",fontSize:12}}>{expanded===item.id?"^":"v"}</span>
          </div>
          {expanded===item.id&&(
            <div style={{padding:"12px 14px",borderTop:"1px solid #334155",display:"flex",flexDirection:"column",gap:10}}>
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
                <button onClick={()=>rm(item.id)} style={{background:"none",border:"1px solid #334155",borderRadius:6,padding:"4px 12px",color:"#ef4444",fontSize:11,fontWeight:600}}>Remove</button>
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
const APPT_STATUS_COLORS={Scheduled:"#6366f1",Completed:"#10b981",Cancelled:"#64748b","No-Show":"#f59e0b"};
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
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"#64748b"}}>{items.length} appointment{items.length!==1?"s":""}</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#6366f1"}} onClick={openNew}>+ Log Appointment</button>
      </div>
      {showForm&&entry&&(
        <div style={{background:"#0f172a",border:"1px solid #6366f1",borderRadius:10,padding:14,marginBottom:12}}>
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
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#e2e8f0",fontWeight:600,cursor:"pointer",marginBottom:6}}>
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
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#6366f1",color:"#fff",fontWeight:600}} onClick={save}>Save</button>
          </div>
        </div>
      )}
      {sorted.length===0&&!showForm&&<div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"20px 0"}}>No appointments logged yet</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map(item=>{
          const sc=APPT_STATUS_COLORS[item.status]||"#64748b";
          return(
            <div key={item.id} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:9,padding:"10px 14px",borderLeft:"3px solid "+sc}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:13,color:"#f1f5f9"}}>{new Date(item.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}{item.time&&" at "+item.time}</span>
                  <span style={{fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20,background:sc+"20",color:sc}}>{item.status}</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>openEdit(item)} style={{background:"none",border:"1px solid #334155",borderRadius:5,padding:"2px 8px",color:"#6366f1",fontSize:11}}>Edit</button>
                  <button onClick={()=>rm(item.id)} style={{background:"none",border:"none",color:"#475569",fontSize:12}}>x</button>
                </div>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:"#64748b"}}>📋 {item.type}</span>
                {item.provider&&<span style={{fontSize:12,color:"#94a3b8"}}>👨‍⚕️ {item.provider}</span>}
                {item.location&&<span style={{fontSize:12,color:"#94a3b8"}}>📍 {item.location}</span>}
                {item.transport_needed&&<span style={{fontSize:11,fontWeight:600,color:"#f59e0b"}}>🚗 {item.transport_type}</span>}
              </div>
              {item.notes&&<div style={{fontSize:12,color:"#475569",marginTop:4,fontStyle:"italic"}}>{item.notes}</div>}
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
        <span style={{fontSize:13,color:"#64748b"}}>{items.length} incident{items.length!==1?"s":""}</span>
        <button style={{...ABTN,borderStyle:"solid",borderColor:"#ef4444",color:"#ef4444"}} onClick={openNew}>+ Log Incident</button>
      </div>
      {showForm&&entry&&(
        <div style={{background:"#0f172a",border:"1px solid #ef4444",borderRadius:10,padding:14,marginBottom:12}}>
          <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LBL}>Date</label><input type="date" style={INP} value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
            <div><label style={LBL}>Time</label><input type="time" style={INP} value={entry.time} onChange={e=>setEntry(v=>({...v,time:e.target.value}))}/></div>
            <div><label style={LBL}>Incident Type</label>
              <select style={{...INP,cursor:"pointer"}} value={entry.type} onChange={e=>setEntry(v=>({...v,type:e.target.value}))}>
                {INCIDENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Severity</label>
              <select style={{...INP,cursor:"pointer",color:INCIDENT_SEV_COLORS[entry.severity]||"#e2e8f0",borderColor:INCIDENT_SEV_COLORS[entry.severity]||"#334155"}} value={entry.severity} onChange={e=>setEntry(v=>({...v,severity:e.target.value}))}>
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
            <label style={{fontSize:13,color:"#e2e8f0",fontWeight:600}}>Follow-up required</label>
            {entry.follow_up_required&&<input type="date" style={{...INP,flex:1}} value={entry.follow_up_date} onChange={e=>setEntry(v=>({...v,follow_up_date:e.target.value}))}/>}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{...ABTN,borderStyle:"solid"}} onClick={()=>{setShowForm(false);setEntry(null);}}>Cancel</button>
            <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontWeight:600}} onClick={save}>Save Incident</button>
          </div>
        </div>
      )}
      {sorted.length===0&&!showForm&&<div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"20px 0"}}>No incidents recorded</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map(item=>{
          const sc=INCIDENT_SEV_COLORS[item.severity]||"#f59e0b";
          return(
            <div key={item.id} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:9,padding:"12px 14px",borderLeft:"4px solid "+sc}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:13,color:"#f1f5f9"}}>{item.type}</span>
                    <span style={{fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:20,background:sc+"20",color:sc,border:"1px solid "+sc+"40"}}>{item.severity}</span>
                  </div>
                  <span style={{fontSize:11,color:"#64748b"}}>{new Date(item.date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}{item.time&&" at "+item.time}</span>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>openEdit(item)} style={{background:"none",border:"1px solid #334155",borderRadius:5,padding:"2px 8px",color:"#6366f1",fontSize:11}}>Edit</button>
                  <button onClick={()=>rm(item.id)} style={{background:"none",border:"none",color:"#475569",fontSize:12}}>x</button>
                </div>
              </div>
              {item.description&&<div style={{fontSize:13,color:"#94a3b8",lineHeight:1.5,marginBottom:6}}>{item.description}</div>}
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                {item.action_taken&&<span style={{fontSize:11,color:"#64748b"}}>✓ {item.action_taken}</span>}
                {item.reported_by&&<span style={{fontSize:11,color:"#475569"}}>By: {item.reported_by}</span>}
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
        <div style={{flex:1,height:8,background:"#0f172a",borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:pct+"%",background:pct===100?"#10b981":"#6366f1",borderRadius:4,transition:"width 0.3s"}}/>
        </div>
        <span style={{fontSize:12,fontWeight:700,color:pct===100?"#10b981":"#94a3b8",whiteSpace:"nowrap"}}>{doneCount}/{full.length}{pct===100?" ✓ Complete":""}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {full.map(item=>(
          <div key={item.key} onClick={()=>toggle(item.key)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:9,border:"1px solid "+(item.done?"rgba(16,185,129,0.3)":"#334155"),background:item.done?"rgba(16,185,129,0.05)":"#0f172a",cursor:"pointer"}}>
            <div style={{width:20,height:20,borderRadius:5,border:"2px solid "+(item.done?"#10b981":"#475569"),background:item.done?"#10b981":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,color:"#fff",fontWeight:700}}>
              {item.done?"✓":""}
            </div>
            <span style={{flex:1,fontSize:13,color:item.done?"#10b981":"#e2e8f0",fontWeight:item.done?600:400}}>{item.label}</span>
            {item.done&&item.completed_by&&<span style={{fontSize:10,color:"#475569",whiteSpace:"nowrap"}}>{item.completed_by}{item.completed_at?" · "+item.completed_at:""}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientForm({client,onSave,onCancel,saving,t,currentUser}){
  const [d,setD]=useState(()=>JSON.parse(JSON.stringify(client)));
  const s=(f,v)=>setD(prev=>({...prev,[f]:v}));
  const valid=d.name.trim().length>0;
  const scols={Active:"#10b981",Inactive:"#f59e0b",Discharged:"#8b5cf6"};
  return(
    <div style={{paddingBottom:40}}>
      <div style={{background:"#1c1f2e",border:"1px solid #334155",borderRadius:12,marginBottom:16,overflow:"hidden"}}>
        <PhotoUp value={d.photo_url} onChange={v=>s("photo_url",v)} clientId={d.id} t={t}/>
        <Sec icon="👤" title={t.personalInfo} defaultOpen={true}>
          <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[[t.fullName+" *","name","text"],[t.dob,"date_of_birth","date"],[t.phone,"phone","tel"],[t.address,"room_or_address","text"],[t.azv,"azv_number","text"],[t.emergency,"emergency_contact","text"],[t.emergPhone,"emergency_phone","tel"],[t.drCas,"dr_di_cas","text"]].map(([label,field,type])=>(
              <div key={field}><label style={LBL}>{label}</label><input type={type} style={INP} value={d[field]||""} onChange={e=>s(field,e.target.value)}/></div>
            ))}
            <div><label style={LBL}>{t.drSpec}</label><input style={INP} value={d.dr_specialista||""} onChange={e=>s("dr_specialista",e.target.value)}/></div>
            <div><label style={LBL}>{t.status}</label>
              <select style={{...INP,cursor:"pointer",color:scols[d.status]||"#e2e8f0",borderColor:scols[d.status]||"#334155"}} value={d.status||"Active"} onChange={e=>s("status",e.target.value)}>
                <option value="Active">{t.active}</option>
                <option value="Inactive">{t.inactive}</option>
                <option value="Discharged">{t.discharged}</option>
              </select>
            </div>
          </div>
        </Sec>
      </div>
      <Sec icon="🩺" title={t.diagnoses} accent="#06b6d4"><DiagList items={d.diagnoses} onChange={v=>s("diagnoses",v)} t={t}/></Sec>
      <Sec icon="💊" title={t.medications} accent="#ef4444"><MedList items={d.medications} onChange={v=>s("medications",v)} t={t}/></Sec>
      <Sec icon="⚠️" title={t.allergies} accent="#f59e0b"><TagList items={d.allergies} onChange={v=>s("allergies",v)} placeholder="e.g. Penicillin..." addLabel={t.add}/></Sec>
      <Sec icon="📦" title={t.inventory} accent="#10b981" defaultOpen={false}><Inventory items={d.inventory||[]} onChange={v=>s("inventory",v)} t={t}/></Sec>
      <Sec icon="📄" title={t.documents} accent="#06b6d4" defaultOpen={false}><DocTracker items={d.documents||[]} onChange={v=>s("documents",v)} t={t}/></Sec>
      <Sec icon="📋" title={t.carePlan} accent="#8b5cf6" defaultOpen={false}><CarePlan items={d.care_plan||[]} onChange={v=>s("care_plan",v)} t={t}/></Sec>
      <Sec icon="📊" title={t.vitals} accent="#6366f1" defaultOpen={false}><VitalsTracker vitals={d.vitals||[]} onChange={v=>s("vitals",v)} t={t}/></Sec>
      <Sec icon="📝" title={t.notes} accent="#7c3aed"><NotesList items={d.session_notes} onChange={v=>s("session_notes",v)} t={t}/></Sec>
      <Sec icon="👨‍👩‍👧" title="Family Contacts" accent="#ec4899" defaultOpen={false}><FamilyContacts items={d.family_contacts||[]} onChange={v=>s("family_contacts",v)}/></Sec>
      <Sec icon="📅" title="Appointments & Transport" accent="#06b6d4" defaultOpen={false}><AppointmentLog items={d.appointments||[]} onChange={v=>s("appointments",v)}/></Sec>
      <Sec icon="⚠️" title="Incident Reports" accent="#ef4444" defaultOpen={false}><IncidentReports items={d.incidents||[]} onChange={v=>s("incidents",v)} currentUser={currentUser}/></Sec>
      <Sec icon="✅" title="Intake Checklist" accent="#10b981" defaultOpen={false}><IntakeChecklist items={d.intake_checklist||[]} onChange={v=>s("intake_checklist",v)} currentUser={currentUser}/></Sec>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:8}}>
        <button onClick={onCancel} style={{padding:"10px 20px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontWeight:600}}>{t.cancel}</button>
        <button onClick={()=>valid&&!saving&&onSave(d)} disabled={!valid||saving}
          style={{padding:"10px 24px",borderRadius:8,border:"none",background:valid&&!saving?"#6366f1":"#334155",color:valid&&!saving?"#fff":"#64748b",fontWeight:700,fontSize:15}}>
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
      +"<div style='text-align:center;font-size:10px;color:#999;margin-top:16px;border-top:1px solid #eee;padding-top:10px'>CareManager - Printed "+new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})+"</div>"
      +"</body></html>";
    const blob=new Blob([h],{type:"text/html"});
    const url=URL.createObjectURL(blob);
    const w=window.open(url,"_blank");
    if(w){w.onload=()=>{setTimeout(()=>w.print(),400);};}
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:16}}>
      <div style={{background:"#1c1f2e",borderRadius:16,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",border:"1px solid #334155"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid #334155"}}>
          <span style={{fontWeight:700,color:"#ef4444",fontSize:16}}>Emergency Card</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={printCard} style={{padding:"7px 14px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontWeight:700,fontSize:12}}>Print</button>
            <button onClick={onClose} style={{padding:"7px 14px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontSize:12}}>Close</button>
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
            {fa.length===0?<span style={{color:"#64748b",fontSize:13}}>{t.knownAllergies}</span>:fa.map(a=><span key={a.id} style={{display:"inline-block",background:"rgba(239,68,68,0.15)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.3)",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700,margin:2}}>{a.value}</span>)}
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
              {client.emergency_contact?<><div style={{fontWeight:700,color:"#f1f5f9"}}>{client.emergency_contact}</div>{client.emergency_phone&&<div style={{fontSize:13,color:"#94a3b8"}}>{client.emergency_phone}</div>}</>:<div style={{color:"#64748b"}}>{t.notProvided}</div>}
            </div>
            <div style={{background:"rgba(6,182,212,0.1)",border:"2px solid rgba(6,182,212,0.3)",borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#06b6d4",marginBottom:6}}>DOCTORS</div>
              {client.dr_di_cas&&<div style={{fontSize:13,color:"#cbd5e1"}}><strong>GP:</strong> {client.dr_di_cas}</div>}
              {client.dr_specialista&&<div style={{fontSize:13,color:"#cbd5e1"}}><strong>Spec:</strong> {client.dr_specialista}</div>}
              {!client.dr_di_cas&&!client.dr_specialista&&<div style={{color:"#64748b"}}>{t.notProvided}</div>}
            </div>
          </div>
          {fm.length>0&&(
            <div style={{background:"rgba(16,185,129,0.1)",border:"2px solid rgba(16,185,129,0.3)",borderRadius:10,padding:"12px 16px"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#10b981",marginBottom:8}}>ALL MEDICATIONS</div>
              {fm.map(m=><div key={m.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(16,185,129,0.15)",fontSize:13}}><strong style={{color:"#f1f5f9"}}>{m.name}</strong><span style={{color:"#94a3b8"}}>{m.dosage} {m.frequency}</span></div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientDetail({client,onEdit,onDelete,onRestore,onInlineUpdate,t,currentUser}){
  const role=currentUser?.role||"user";
  const canEdit=can(role,"edit");
  const canDelete=can(role,"delete");
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
    rows.push("<hr style='margin-top:24px;border:none;border-top:1px solid #e5e7eb'><p style='text-align:center;font-size:10px;color:#9ca3af'>CareManager - Exported "+new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})+"</p>");
    const html="<!DOCTYPE html><html><head><title>"+client.name+" - CareManager</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#374151;font-size:13px}@page{margin:1.5cm;size:A4}</style></head><body>"+rows.join("")+"</body></html>";
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
            {onRestore&&<button onClick={onRestore} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#10b981",color:"#fff",fontWeight:600,fontSize:13}}>♻️ Restore</button>}
            {canDelete&&<button onClick={onDelete} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #ef4444",background:"rgba(239,68,68,0.1)",color:"#ef4444",fontWeight:600,fontSize:13}}>🗑️ Delete Permanently</button>}
          </>
        ):(
          <>
            <button onClick={doExport} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#6366f1",color:"#fff",fontWeight:600,fontSize:13}}>Export PDF</button>
            <button onClick={()=>setShowEmerg(true)} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontWeight:600,fontSize:13}}>Emergency Card</button>
            <button onClick={doPrint} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontWeight:600,fontSize:13}}>Print</button>
            {canEdit&&<button onClick={onEdit} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #6366f1",background:"rgba(99,102,241,0.1)",color:"#6366f1",fontWeight:600,fontSize:13}}>{t.edit}</button>}
            {canDelete&&<button onClick={onDelete} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #f59e0b",background:"rgba(245,158,11,0.1)",color:"#f59e0b",fontWeight:600,fontSize:13}}>📦 Archive</button>}
            {!canEdit&&<span style={{fontSize:12,color:"#475569",alignSelf:"center",fontStyle:"italic"}}>View only</span>}
          </>
        )}
      </div>
      <div id="pz">
        <div className="ph" style={{textAlign:"center",borderBottom:"2px solid #6366f1",paddingBottom:12,marginBottom:20}}>
          <div style={{fontSize:22,fontWeight:700,color:"#1e293b",fontFamily:"serif"}}>CareManager - Client Profile</div>
          <div style={{fontSize:11,color:"#64748b",marginTop:4}}>Printed on {new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
        </div>
        <div style={{background:"#1c1f2e",border:"1px solid #334155",borderRadius:12,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:18,padding:20}}>
            <div style={{width:72,height:72,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:800,color:"#fff",flexShrink:0,overflow:"hidden"}}>
              {client.photo_url?<img src={client.photo_url} alt={client.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials(client.name)}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
                <span style={{fontFamily:"Playfair Display,serif",fontSize:24,fontWeight:700,color:"#f1f5f9"}}>{client.name}</span>
                <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,background:sc+"20",color:sc,border:"1px solid "+sc+"40"}}>{client.status||t.active}</span>
                <button onClick={()=>setShowFallFactors(f=>!f)} title={fallRisk.factors.join(", ")||"No risk factors"}
                  style={{fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:20,background:fallRisk.color+"20",color:fallRisk.color,border:"1px solid "+fallRisk.color+"40",cursor:"pointer"}}>
                  🚶 Fall Risk: {fallRisk.level} ({fallRisk.score})
                </button>
                {(()=>{const ic=client.intake_checklist||[];const done=ic.filter(i=>i.done).length;const total=DEFAULT_INTAKE_ITEMS.length;const pct=total>0?Math.round(done/total*100):0;return<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:pct===100?"rgba(16,185,129,0.2)":"rgba(99,102,241,0.1)",color:pct===100?"#10b981":"#a5b4fc",border:"1px solid "+(pct===100?"rgba(16,185,129,0.3)":"rgba(99,102,241,0.2)")}}>✅ Intake {pct}%</span>;})()}
              </div>
              {showFallFactors&&fallRisk.factors.length>0&&(
                <div style={{background:fallRisk.color+"10",border:"1px solid "+fallRisk.color+"30",borderRadius:8,padding:"8px 12px",marginBottom:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                  {fallRisk.factors.map((f,i)=><span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:fallRisk.color+"20",color:fallRisk.color,fontWeight:600}}>{f}</span>)}
                </div>
              )}
              {client.date_of_birth&&<div style={{fontSize:14,color:"#94a3b8",marginBottom:4}}>{new Date(client.date_of_birth+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}{age!==null&&" - Age "+age}{client.room_or_address&&" - "+client.room_or_address}</div>}
              <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
                {client.azv_number&&<span style={{fontSize:13,color:"#64748b"}}>ID: {client.azv_number}</span>}
                {client.phone&&<span style={{fontSize:13,color:"#64748b"}}>Ph: {client.phone}</span>}
                {client.emergency_contact&&<span style={{fontSize:13,color:"#64748b"}}>SOS: {client.emergency_contact}{client.emergency_phone&&" - "+client.emergency_phone}</span>}
                {client.dr_di_cas&&<span style={{fontSize:13,color:"#64748b"}}>Dr: {client.dr_di_cas}{client.dr_specialista&&" - "+client.dr_specialista}</span>}
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
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#f59e0b",fontSize:13,marginBottom:10}}>ALLERGIES</div>
            {fa.map(a=><span key={a.id} style={{display:"inline-block",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:20,padding:"3px 10px",fontSize:12,color:"#f59e0b",fontWeight:600,margin:2}}>{a.value}</span>)}
          </div>
        )}
        {fd.length>0&&(
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:10}}>DIAGNOSES</div>
            {fd.map(d=><span key={d.id} style={{display:"inline-block",background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:20,padding:"3px 10px",fontSize:12,color:"#06b6d4",fontWeight:600,margin:2}}>{d.value}</span>)}
          </div>
        )}
        {fm.length>0&&(()=>{
          const sched=TSLOTS.map(slot=>({...slot,meds:fm.filter(m=>m.timing&&m.timing[slot.key])})).filter(s=>s.meds.length>0);
          const labs={morning:t.morning,afternoon:t.afternoon,evening:t.evening,night:t.night};
          return(
            <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
              <div style={{fontWeight:700,color:"#ef4444",fontSize:13,marginBottom:12}}>MEDICATIONS</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:sched.length>0?16:0}}>
                {fm.map(m=><div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#0f172a",borderRadius:8}}>
                  <span style={{fontWeight:700,color:"#f1f5f9",flex:2}}>{m.name}</span>
                  {m.dosage&&<span style={{color:"#94a3b8",flex:1}}>{m.dosage}</span>}
                  {m.frequency&&<span style={{color:"#64748b",flex:1,fontSize:12}}>{m.frequency}</span>}
                </div>)}
              </div>
              {sched.length>0&&(
                <div>
                  <div style={{fontWeight:600,color:"#6366f1",fontSize:12,marginBottom:8}}>{t.medSchedule}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                    {sched.map(slot=>(
                      <div key={slot.key} style={{background:slot.color+"10",border:"1px solid "+slot.color+"30",borderRadius:8,padding:"8px 10px"}}>
                        <div style={{fontWeight:700,fontSize:11,color:slot.color,marginBottom:6}}>{labs[slot.key]}</div>
                        {slot.meds.map(m=><div key={m.id} style={{fontSize:12,color:"#cbd5e1"}}>{m.name}{m.dosage&&" - "+m.dosage}</div>)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {(client.inventory||[]).length>0&&(
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:700,color:"#10b981",fontSize:13}}>INVENTORY</div>
              <div style={{fontSize:12,color:"#64748b"}}>{(client.inventory||[]).length} items{(client.inventory||[]).reduce((s,i)=>s+(parseFloat(i.value)||0),0)>0&&" - AWG "+(client.inventory||[]).reduce((s,i)=>s+(parseFloat(i.value)||0),0).toFixed(2)}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {(client.inventory||[]).map(item=>{
                const cc={Excellent:"#10b981",Good:"#06b6d4",Fair:"#f59e0b",Poor:"#ef4444"};
                const c=cc[item.condition]||"#64748b";
                return(
                  <div key={item.id} style={{background:"#161929",boxShadow:"inset 3px 3px 7px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.03)",borderRadius:10,overflow:"hidden",border:"1px solid #334155"}}>
                    {item.photo_url?<img src={item.photo_url} alt={item.name} style={{width:"100%",height:90,objectFit:"cover",display:"block"}}/>:<div style={{width:"100%",height:90,background:"#1c1f2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"#475569"}}>+</div>}
                    <div style={{padding:"8px 10px"}}>
                      <div style={{fontWeight:700,fontSize:12,color:"#f1f5f9",marginBottom:4}}>{item.name||"Item"}</div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {item.condition&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:20,background:c+"15",color:c,fontWeight:700}}>{item.condition}</span>}
                        {item.value&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:20,background:"rgba(16,185,129,0.1)",color:"#10b981",fontWeight:700}}>AWG {item.value}</span>}
                      </div>
                      {item.location&&<div style={{fontSize:10,color:"#64748b",marginTop:4}}>{item.location}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {(client.documents||[]).length>0&&(
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:12}}>DOCUMENTS</div>
            {(client.documents||[]).map(doc=>{
              const days=daysUntil(doc.expiry);
              const badge=expiryBadge(days);
              return(
                <div key={doc.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1e293b"}}>
                  <div>
                    <span style={{fontWeight:600,fontSize:13,color:"#f1f5f9"}}>{doc.name}</span>
                    {doc.expiry&&<span style={{fontSize:12,color:"#64748b",marginLeft:8}}>Exp: {new Date(doc.expiry+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}</span>}
                  </div>
                  {badge&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:badge.bg,color:badge.color}}>{badge.label} {days!==null&&(days<0?Math.abs(days)+"d ago":days+"d")}</span>}
                </div>
              );
            })}
          </div>
        )}
        {(client.care_plan||[]).length>0&&(
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#8b5cf6",fontSize:13,marginBottom:12}}>CARE PLAN</div>
            {(client.care_plan||[]).map(item=>{
              const gs=GSTATUSES.find(s=>s.value===item.status)||GSTATUSES[0];
              return(
                <div key={item.id} style={{borderLeft:"3px solid "+gs.color,paddingLeft:12,marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontWeight:700,color:"#f1f5f9"}}>{item.goal}</span>
                    <span style={{fontSize:11,padding:"2px 7px",borderRadius:20,background:gs.color+"20",color:gs.color,fontWeight:700}}>{item.status}</span>
                  </div>
                  {item.plan&&<div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>{item.plan}</div>}
                </div>
              );
            })}
          </div>
        )}
        {(client.vitals||[]).length>0&&(
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <VitalsTracker vitals={client.vitals||[]} onChange={()=>{}} t={t}/>
          </div>
        )}
        {fn.length>0&&(
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#7c3aed",fontSize:13,marginBottom:12}}>SESSION NOTES</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {fn.map(n=>(
                <div key={n.id} style={{borderLeft:"3px solid rgba(124,58,237,0.4)",paddingLeft:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,color:"#7c3aed",fontWeight:700}}>{new Date(n.date+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</span>
                    {(n.role||n.staff_name)&&<span style={{fontSize:11,background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:20,padding:"2px 8px",color:"#7c3aed",fontWeight:600}}>{n.role}{n.role&&n.staff_name&&" - "}{n.staff_name}</span>}
                  </div>
                  <div style={{color:"#cbd5e1",fontSize:14,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{n.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
        {/* Family Contacts */}
        {(client.family_contacts||[]).length>0&&(
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#ec4899",fontSize:13,marginBottom:12}}>👨‍👩‍👧 FAMILY CONTACTS</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {(client.family_contacts||[]).map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:"#0f172a",borderRadius:8}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name||"?"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name||"?")}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13,color:"#f1f5f9"}}>{c.name}{c.is_primary&&<span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,background:"rgba(99,102,241,0.15)",color:"#a5b4fc",marginLeft:6}}>Primary</span>}</div>
                    <div style={{fontSize:11,color:"#64748b"}}>{c.relationship}{c.phone?" · "+c.phone:""}{c.email?" · "+c.email:""}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Appointments */}
        {(client.appointments||[]).length>0&&(
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:12}}>📅 APPOINTMENTS</div>
            <AppointmentLog items={client.appointments||[]} onChange={onInlineUpdate?v=>onInlineUpdate("appointments",v):()=>{}}/>
          </div>
        )}
        {/* Incidents */}
        {(client.incidents||[]).length>0&&(
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#ef4444",fontSize:13,marginBottom:12}}>⚠️ INCIDENT REPORTS</div>
            <IncidentReports items={client.incidents||[]} onChange={onInlineUpdate?v=>onInlineUpdate("incidents",v):()=>{}} currentUser={currentUser}/>
          </div>
        )}
        {/* Intake Checklist */}
        {(()=>{const ic=client.intake_checklist||[];return(
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#10b981",fontSize:13,marginBottom:12}}>✅ INTAKE CHECKLIST</div>
            <IntakeChecklist items={ic} onChange={onInlineUpdate?v=>onInlineUpdate("intake_checklist",v):()=>{}} currentUser={currentUser}/>
          </div>
        );})()}
      {showEmerg&&<EmergCard client={client} onClose={()=>setShowEmerg(false)} t={t}/>}
    </div>
  );
}

function TiltCard({icon,label,value,color}){
  const ref=useRef(null);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    const base="6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)";
    const hot="10px 10px 20px rgba(0,0,0,0.6), -4px -4px 10px rgba(255,255,255,0.05)";
    const onMove=e=>{
      const r=el.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-0.5;
      const y=(e.clientY-r.top)/r.height-0.5;
      el.style.transform=`rotateX(${-y*18}deg) rotateY(${x*18}deg) translateZ(24px) scale(1.04)`;
      el.style.boxShadow=hot;
    };
    const onLeave=()=>{el.style.transform="";el.style.boxShadow=base;};
    el.addEventListener("mousemove",onMove);
    el.addEventListener("mouseleave",onLeave);
    return()=>{el.removeEventListener("mousemove",onMove);el.removeEventListener("mouseleave",onLeave);};
  },[]);
  return(
    <div ref={ref} style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:18,padding:"20px 24px",display:"flex",alignItems:"center",gap:16,transition:"transform 0.15s ease, box-shadow 0.15s ease",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:"50%",background:"linear-gradient(180deg,rgba(255,255,255,0.06),transparent)",pointerEvents:"none",borderRadius:"inherit"}}/>
      <div style={{width:48,height:48,borderRadius:12,background:color+"25",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,boxShadow:"3px 3px 8px rgba(0,0,0,0.5), -1px -1px 4px rgba(255,255,255,0.04)"}}>{icon}</div>
      <div>
        <div style={{fontSize:28,fontWeight:800,color:"#cdd5e0",lineHeight:1}}>{value}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.35)",marginTop:4}}>{label}</div>
      </div>
    </div>
  );
}

function FlipCard({frontIcon,frontLabel,backValue,backSub,backGradient}){
  const [flipped,setFlipped]=useState(false);
  return(
    <div style={{height:130,perspective:"600px"}} onMouseEnter={()=>setFlipped(true)} onMouseLeave={()=>setFlipped(false)}>
      <div style={{position:"relative",width:"100%",height:"100%",transformStyle:"preserve-3d",transition:"transform 0.45s cubic-bezier(0.4,0,0.2,1)",transform:flipped?"rotateY(180deg)":"rotateY(0deg)"}}>
        <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:18,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:"50%",background:"linear-gradient(180deg,rgba(255,255,255,0.06),transparent)",pointerEvents:"none"}}/>
          <div style={{fontSize:32}}>{frontIcon}</div>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.35)",letterSpacing:0.5,textTransform:"uppercase"}}>{frontLabel}</div>
        </div>
        <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",background:backGradient,boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:18,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,transform:"rotateY(180deg)"}}>
          <div style={{fontSize:36,fontWeight:800,color:"#fff",lineHeight:1}}>{backValue}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.72)",textAlign:"center",padding:"0 16px",lineHeight:1.5}}>{backSub}</div>
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
  const flagged=clients.filter(c=>{const f=getMedFlags(c);return f.polypharmacy||f.highRisk.length>0;});
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
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:28,fontWeight:700,color:"#f1f5f9",marginBottom:4}}>{t.welcome}, {currentUser.displayName}!</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
          {Object.entries(sc).map(([s,c])=>{const cols={Active:"#10b981",Inactive:"#f59e0b",Discharged:"#8b5cf6"};const col=cols[s];return <span key={s} style={{fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:20,background:col+"20",color:col,border:"1px solid "+col+"40"}}>{s}: {c}</span>;})}
        </div>
      </div>
      <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20,perspective:"800px"}}>
        <TiltCard icon="👥" label={t.totalClients} value={total} color="#6366f1"/>
        <TiltCard icon="💊" label={t.totalMeds} value={totalMeds} color="#ef4444"/>
        <TiltCard icon="⚠️" label={t.allergyAlerts} value={totalAllergies} color="#f59e0b"/>
        <TiltCard icon="🩺" label={t.diagnosesLogged} value={totalDiag} color="#06b6d4"/>
      </div>
      <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
        <FlipCard frontIcon="💊" frontLabel="Medications" backValue={highRiskMedsCount} backSub="High-risk medication flags across all clients" backGradient="linear-gradient(135deg,#7f1d1d,#ef4444)"/>
        <FlipCard frontIcon="📋" frontLabel="Intake Progress" backValue={intakePct+"%"} backSub={intakeDone+" of "+intakeTotal+" intake items completed"} backGradient="linear-gradient(135deg,#065f46,#10b981)"/>
        <FlipCard frontIcon="⚠️" frontLabel="Incidents" backValue={incidentLast7} backSub="Incidents reported in the last 7 days" backGradient="linear-gradient(135deg,#78350f,#f59e0b)"/>
      </div>
      <div className="g2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20}}>
          <div style={{fontWeight:700,color:"#f59e0b",fontSize:13,marginBottom:14}}>ALLERGY ALERTS</div>
          {allergyClients.length===0?<div style={{color:"#475569",fontSize:13}}>{t.noAllergies}</div>:allergyClients.map(c=>(
            <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#161929",boxShadow:"inset 3px 3px 7px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.03)",borderRadius:10,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:"#f1f5f9"}}>{c.name}</div><div style={{fontSize:12,color:"#f59e0b"}}>{(c.allergies||[]).filter(a=>a.value&&a.value.trim()).map(a=>a.value).join(", ")}</div></div>
            </div>
          ))}
        </div>
        <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20}}>
          <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:14}}>AGE DISTRIBUTION</div>
          {total===0?<div style={{color:"#475569",fontSize:13}}>{t.noClients}</div>:Object.entries(ag).filter(([,v])=>v>0).map(([group,count])=>(
            <div key={group} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748b",marginBottom:4}}>
                <span>{group} {t.years}</span><span>{count}</span>
              </div>
              <div style={{height:6,background:"#0f172a",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:(count/total*100)+"%",background:"#6366f1",borderRadius:3}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      {expiring.length>0&&(
        <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,color:"#f59e0b",fontSize:13,marginBottom:14}}>DOCUMENT EXPIRY ALERTS</div>
          {expiring.map((d,i)=>{const badge=expiryBadge(d.days);return(
            <div key={i} onClick={()=>onSelect(d.client)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"#161929",boxShadow:"inset 3px 3px 7px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.03)",borderRadius:10,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(d.clientName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{initials(d.clientName)}</div>
              <div style={{flex:1}}><span style={{fontWeight:700,fontSize:13,color:"#f1f5f9"}}>{d.clientName}</span><span style={{fontSize:12,color:"#64748b"}}> - {d.name}</span></div>
              {badge&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:badge.bg,color:badge.color,whiteSpace:"nowrap"}}>{d.days<0?"Expired":d.days+"d left"}</span>}
            </div>
          );})}
        </div>
      )}
      {flagged.length>0&&(
        <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,color:"#ef4444",fontSize:13,marginBottom:14}}>MEDICATION FLAGS</div>
          {flagged.map(c=>{const {highRisk,polypharmacy,medCount}=getMedFlags(c);return(
            <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#161929",boxShadow:"inset 3px 3px 7px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.03)",borderRadius:10,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{initials(c.name)}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:"#f1f5f9",marginBottom:4}}>{c.name}</div>
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
        <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,color:"#ec4899",fontSize:13,marginBottom:14}}>🎂 UPCOMING BIRTHDAYS</div>
          {birthdays.map(c=>{
            const thisWeek=c.bDays<=7;
            const age=calcAge(c.date_of_birth);
            return(
              <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"#161929",boxShadow:"inset 3px 3px 7px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.03)",borderRadius:10,cursor:"pointer",marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
                <div style={{flex:1}}>
                  <span style={{fontWeight:700,fontSize:13,color:"#f1f5f9"}}>{c.name}</span>
                  <span style={{fontSize:12,color:"#64748b",marginLeft:8}}>turns {age!==null?age+1:""}</span>
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
        <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,color:"#ef4444",fontSize:13,marginBottom:14}}>🩺 ABNORMAL VITALS</div>
          {abnormalVitals.map(({client:c,clientName,date,flags})=>(
            <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 12px",background:"#161929",boxShadow:"inset 3px 3px 7px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.03)",borderRadius:10,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(clientName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(clientName)}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:"#f1f5f9",marginBottom:4}}>{clientName} <span style={{fontSize:11,color:"#475569",fontWeight:400}}>— recorded {new Date(date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span></div>
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
        <div style={{background:"#1c1f2e",border:"1px solid #ef4444",borderRadius:12,padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,color:"#ef4444",fontSize:13,marginBottom:4}}>⚠️ ALLERGY — MEDICATION CONFLICTS</div>
          <div style={{fontSize:11,color:"#64748b",marginBottom:12}}>A prescribed medication matches a known allergy. Review immediately.</div>
          {allergyMedAlerts.map(({client:c,clientName,conflicts})=>(
            <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(clientName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(clientName)}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:"#f1f5f9",marginBottom:6}}>{clientName}</div>
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

      {/* ── Care Plan Staleness ── */}
      {stalePlans.length>0&&(
        <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,color:"#8b5cf6",fontSize:13,marginBottom:4}}>📋 CARE PLAN REVIEW OVERDUE</div>
          <div style={{fontSize:11,color:"#64748b",marginBottom:12}}>Care plan items not reviewed in 90+ days.</div>
          {stalePlans.map(c=>(
            <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"#161929",boxShadow:"inset 3px 3px 7px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.03)",borderRadius:10,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:"#f1f5f9"}}>{c.name}</div></div>
              <span style={{fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:20,background:"rgba(139,92,246,0.15)",color:"#a78bfa",whiteSpace:"nowrap"}}>{c.stalestDays}d since review</span>
            </div>
          ))}
        </div>
      )}

      <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20}}>
        <div style={{fontWeight:700,color:"#7c3aed",fontSize:13,marginBottom:14}}>RECENT SESSION NOTES</div>
        {rn.length===0?<div style={{color:"#475569",fontSize:13}}>{t.noNotes}</div>:rn.map((n,i)=>(
          <div key={i} onClick={()=>onSelect(n.client)} style={{display:"flex",gap:12,padding:"10px 14px",background:"#161929",boxShadow:"inset 3px 3px 7px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.03)",borderRadius:10,cursor:"pointer",marginBottom:8}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:avatarColor(n.clientName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(n.clientName)}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                <span style={{fontWeight:700,fontSize:13,color:"#f1f5f9"}}>{n.clientName}</span>
                {(n.role||n.staff_name)&&<span style={{fontSize:11,background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:20,padding:"1px 7px",color:"#7c3aed",fontWeight:600}}>{n.role}{n.role&&n.staff_name&&" - "}{n.staff_name}</span>}
                <span style={{fontSize:11,color:"#475569",marginLeft:"auto"}}>{new Date(n.date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
              </div>
              <div style={{fontSize:13,color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{n.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTrail({t,companyId,currentUser}){
  const [logs,setLogs]=useState([]);
  const [companies,setCompanies]=useState([]);
  const [loading,setLoading]=useState(true);
  const [fS,setFS]=useState("");
  const [fA,setFA]=useState("");
  const [fCo,setFCo]=useState("");
  const [fSec,setFSec]=useState("");
  const [fFrom,setFFrom]=useState("");
  const [fTo,setFTo]=useState("");
  const [expandedRow,setExpandedRow]=useState(null);

  useEffect(()=>{
    setLoading(true);
    const isSA=currentUser?.role==="superadmin";
    const q=supabase.from("audit_log").select("*").order("performed_at",{ascending:false}).limit(1000);
    ((!isSA)&&companyId?q.eq("company_id",companyId):q).then(({data})=>{
      setLogs(data||[]);setLoading(false);
    });
    supabase.from("companies").select("id,name").order("name").then(({data})=>setCompanies(data||[]));
  },[companyId,currentUser]);

  const coName=id=>companies.find(c=>c.id===id)?.name||"—";
  const sl=[...new Set(logs.map(l=>l.performed_by))].filter(Boolean).sort();
  const al=[...new Set(logs.map(l=>l.action))].filter(Boolean).sort();
  const secList=[...new Set(logs.map(l=>l.section))].filter(Boolean).sort();
  const coIds=[...new Set(logs.map(l=>l.company_id))].filter(Boolean);
  const filterCos=companies.filter(c=>coIds.includes(c.id));

  const filtered=logs.filter(l=>{
    if(fS&&l.performed_by!==fS)return false;
    if(fA&&l.action!==fA)return false;
    if(fCo&&l.company_id!==fCo)return false;
    if(fSec&&l.section!==fSec)return false;
    const d=l.performed_at?l.performed_at.slice(0,10):"";
    if(fFrom&&d<fFrom)return false;
    if(fTo&&d>fTo)return false;
    return true;
  });

  const hasFilter=fS||fA||fCo||fSec||fFrom||fTo;
  const clearFilters=()=>{setFS("");setFA("");setFCo("");setFSec("");setFFrom("");setFTo("");};

  // Section badge colours
  const sectionColor={
    "Client Profile":"#34d399","User Management":"#f59e0b","Appointments":"#60a5fa",
    "Incidents":"#f87171","Medications":"#a78bfa","Documents":"#fb923c",
    "Vitals":"#2dd4bf","Notes":"#94a3b8","Intake":"#fbbf24",
  };
  const secColor=s=>sectionColor[s]||"#64748b";

  // Role label color
  const roleColor={superadmin:"#f59e0b",admin:"#a78bfa",power_user:"#34d399",user:"#64748b",inactive:"#ef4444"};

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
        <div style={{fontFamily:"Playfair Display,serif",fontSize:26,fontWeight:700,color:"#f1f5f9"}}>{t.auditTrail}</div>
        <button onClick={doExport} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#6366f1",color:"#fff",fontWeight:600,fontSize:13}}>{t.exportAudit}</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <div style={{color:"#64748b",fontSize:13}}>{filtered.length} {t.records}</div>
        {hasFilter&&<button onClick={clearFilters} style={{padding:"3px 10px",borderRadius:6,border:"1px solid #334155",background:"transparent",color:"#f59e0b",fontSize:11,fontWeight:700}}>✕ Clear filters</button>}
      </div>

      {/* Filters — row 1: staff / action / section / company */}
      <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:10}}>
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

      <div style={{background:"#1c1f2e",border:"1px solid #334155",borderRadius:12,overflowX:"auto"}}>
        {loading
          ?<div style={{padding:"40px",textAlign:"center",color:"#475569"}}>{t.loadingAudit}</div>
          :filtered.length===0
            ?<div style={{padding:"40px",textAlign:"center",color:"#475569"}}>{t.noAudit}</div>
            :<table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
              <thead>
                <tr style={{borderBottom:"1px solid #334155"}}>
                  {["Date & Time","Staff","Action & Details","Client","Company"].map(h=>(
                    <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6366f1",letterSpacing:0.5,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l,i)=>{
                  const isExpanded=expandedRow===l.id;
                  const hasDevice=!!l.device;
                  return(
                    <Fragment key={l.id}>
                      <tr style={{borderBottom:isExpanded?"none":"1px solid #1e293b",background:i%2===0?"transparent":"rgba(255,255,255,0.02)",cursor:hasDevice?"pointer":"default"}}
                        onClick={()=>hasDevice&&setExpandedRow(isExpanded?null:l.id)}>
                        <td style={{padding:"10px 16px",fontSize:12,color:"#64748b",whiteSpace:"nowrap",verticalAlign:"top"}}>
                          {new Date(l.performed_at).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                        </td>
                        <td style={{padding:"10px 16px",verticalAlign:"top"}}>
                          <div style={{fontSize:13,fontWeight:600,color:"#f1f5f9"}}>{l.performed_by||"—"}</div>
                          {l.performed_role&&<div style={{fontSize:11,color:roleColor[l.performed_role]||"#64748b",marginTop:2,fontWeight:600,textTransform:"capitalize"}}>{l.performed_role.replace(/_/g," ")}</div>}
                        </td>
                        <td style={{padding:"10px 16px",verticalAlign:"top",maxWidth:340}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:l.details?4:0}}>
                            <span style={{background:"rgba(99,102,241,0.12)",color:"#a5b4fc",borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{l.action||"—"}</span>
                            {l.section&&<span style={{background:"rgba(0,0,0,0.25)",color:secColor(l.section),border:"1px solid "+secColor(l.section)+"44",borderRadius:5,padding:"1px 7px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{l.section}</span>}
                            {hasDevice&&<span style={{fontSize:10,color:"#334155",marginLeft:"auto"}}>▾</span>}
                          </div>
                          {l.details&&<div style={{fontSize:12,color:"#64748b",lineHeight:1.5,marginTop:2}}>{l.details}</div>}
                        </td>
                        <td style={{padding:"10px 16px",fontSize:13,color:"#94a3b8",verticalAlign:"top"}}>{l.client_name||"—"}</td>
                        <td style={{padding:"10px 16px",fontSize:12,color:"#475569",verticalAlign:"top"}}>{coName(l.company_id)}</td>
                      </tr>
                      {isExpanded&&hasDevice&&(
                        <tr style={{borderBottom:"1px solid #1e293b",background:"rgba(99,102,241,0.04)"}}>
                          <td colSpan={5} style={{padding:"6px 16px 10px 48px"}}>
                            <div style={{fontSize:11,color:"#475569",display:"flex",alignItems:"flex-start",gap:8}}>
                              <span style={{color:"#334155",fontWeight:700,whiteSpace:"nowrap"}}>🖥 Device:</span>
                              <span style={{wordBreak:"break-all",lineHeight:1.6}}>{l.device}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>}
      </div>
    </div>
  );
}

function LangPicker({onSelect}){
  return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#1c1f2e",borderRadius:20,padding:"48px 40px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",maxWidth:420,width:"90%",border:"1px solid #334155",textAlign:"center"}}>
        <div style={{fontSize:52,marginBottom:16}}>+</div>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:28,fontWeight:700,color:"#f1f5f9",marginBottom:6}}>CareManager</div>
        <div style={{fontSize:13,color:"#64748b",marginBottom:32}}>Select your language / Selecta bo idioma</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {LANG_OPTIONS.map(l=>(
            <button key={l.code} onClick={()=>onSelect(l.code)}
              style={{display:"flex",alignItems:"center",gap:16,padding:"14px 18px",borderRadius:12,border:"1px solid #334155",background:"#0f172a",color:"#e2e8f0",fontSize:16,fontWeight:600}}>
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
    onLogin({...data.user,role:rd?.role||"staff",displayName:rd?.name||loginEmail.split("@")[0],company_id:rd?.company_id||null,allRoles:roles||[],avatar_url:rd?.avatar_url||null,username:rd?.username||null});
    setLoading(false);
  };
  return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#1c1f2e",borderRadius:20,padding:"48px 40px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",maxWidth:420,width:"90%",border:"1px solid #334155"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🔐</div>
          <div style={{fontFamily:"Playfair Display,serif",fontSize:26,fontWeight:700,color:"#f1f5f9",marginBottom:4}}>CareManager</div>
          <div style={{fontSize:13,color:"#64748b"}}>{t.signIn}</div>
        </div>
        {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,color:"#ef4444",fontSize:13}}>{error}</div>}
        <div style={{marginBottom:14}}><label style={LBL}>Email or Username</label><input type="text" style={INP} placeholder="your@email.com or username" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>
        <div style={{marginBottom:24}}><label style={LBL}>{t.password}</label><input type="password" style={INP} placeholder="..." value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>
        <button onClick={handle} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:loading?"#334155":"#6366f1",color:loading?"#64748b":"#fff",fontWeight:700,fontSize:15}}>
          {loading?t.signingIn:t.signIn}
        </button>
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

  const TABS=[{id:"info",label:"Company Info"},{id:"hours",label:"Hours"},{id:"emergency",label:"Emergency"}];
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
          <div style={{fontFamily:"Playfair Display,serif",fontSize:24,color:"#f1f5f9",fontWeight:700}}>{form.name||"Company Settings"}</div>
          {form.mission_statement&&<div style={{color:"#64748b",fontSize:13,marginTop:4,fontStyle:"italic"}}>"{form.mission_statement}"</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:2,marginBottom:24,borderBottom:"1px solid #334155"}}>
        {TABS.map(tab_=>(<button key={tab_.id} onClick={()=>setTab(tab_.id)}
          style={{padding:"8px 16px",border:"none",borderBottom:tab===tab_.id?"2px solid #6366f1":"2px solid transparent",background:"transparent",color:tab===tab_.id?"#6366f1":"#64748b",fontWeight:600,fontSize:13,cursor:"pointer",marginBottom:-1}}>
          {tab_.label}</button>))}
      </div>
      <form onSubmit={onSave}>
        {tab==="info"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20}}>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:15,color:"#f1f5f9",marginBottom:14,fontWeight:700}}>🖼 Company Logo</div>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <div style={{width:120,height:120,border:"2px dashed #334155",borderRadius:12,background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                  {logoPreview
                    ?<div style={{background:"#fff",width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:8}}><img src={logoPreview} alt="preview" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/></div>
                    :<span style={{color:"#475569",fontSize:12}}>No logo</span>}
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onLogoSelect} style={{display:"none"}}/>
                  <button type="button" onClick={()=>fileRef.current?.click()}
                    style={{padding:"8px 16px",borderRadius:8,border:"1px solid #6366f1",background:"rgba(99,102,241,0.1)",color:"#6366f1",fontSize:13,fontWeight:600,marginBottom:8,display:"block"}}>
                    {uploading?"Uploading...":"Choose Logo"}
                  </button>
                  <div style={{fontSize:11,color:"#475569"}}>PNG or JPG · Max 5MB</div>
                  <div style={{fontSize:11,color:"#475569"}}>Will appear in sidebar</div>
                </div>
              </div>
            </div>
            <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20}}>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:15,color:"#f1f5f9",marginBottom:14,fontWeight:700}}>🏢 Basic Information</div>
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
            <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20}}>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:15,color:"#f1f5f9",marginBottom:14,fontWeight:700}}>👤 Director / Contact</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {fld("Director Name","director_name","text","e.g. Maria Johnson")}
                {fld("Director Contact","director_contact","email","director@company.aw")}
              </div>
            </div>
          </div>
        )}
        {tab==="hours"&&(
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20}}>
            <div style={{fontFamily:"Playfair Display,serif",fontSize:15,color:"#f1f5f9",marginBottom:16,fontWeight:700}}>🕐 Hours of Operation</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {DAYS.map(day=>(
                <div key={day} style={{display:"flex",alignItems:"center",gap:12}}>
                  <label style={{width:90,fontSize:13,fontWeight:600,color:"#94a3b8",textTransform:"capitalize",flexShrink:0}}>{day}</label>
                  <input type="text" value={form.hours_of_operation[day]||""} onChange={e=>onHour(day,e.target.value)}
                    placeholder='e.g. 8:00 AM - 5:00 PM or Closed' style={{...inp,flex:1}}/>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==="emergency"&&(
          <div style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20}}>
            <div style={{fontFamily:"Playfair Display,serif",fontSize:15,color:"#f1f5f9",marginBottom:14,fontWeight:700}}>🚨 Emergency Contact</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {fld("Emergency Contact Name","emergency_contact","text","e.g. Emergency Hotline")}
              {fld("Emergency Phone","emergency_phone","tel","+297-999-8888")}
            </div>
          </div>
        )}
        <div style={{marginTop:20}}>
          <button type="submit" disabled={saving||uploading}
            style={{padding:"11px 28px",borderRadius:10,border:"none",background:saving?"#334155":"#10b981",color:saving?"#64748b":"#fff",fontWeight:700,fontSize:14}}>
            {saving?"Saving...":"Save Company Information"}
          </button>
        </div>
      </form>
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
    const {data:au}=await supabase.from("user_roles").select("user_id,name,company_id").order("name");
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

  const loadActivity=async(from,to)=>{
    setActivityLoading(true);
    let q=supabase.from("audit_log").select("performed_by,action,client_name,performed_at").order("performed_at",{ascending:false}).limit(3000);
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

  useEffect(()=>{if(mainTab==="activity")loadActivity(activityDateFrom,activityDateTo);},[mainTab,activeCompanyId]);

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
    setSaving(true);
    try{
      // Duplicate email check
      const {data:existingEmail}=await supabase.from("user_roles").select("user_id").eq("email",userForm.email.toLowerCase().trim()).limit(1).maybeSingle();
      if(existingEmail){showToast("error","A user with this email already exists");setSaving(false);return;}
      // Duplicate username check (if provided)
      if(userForm.username.trim()){
        const {data:existingUsername}=await supabase.from("user_roles").select("user_id").eq("username",userForm.username.toLowerCase().trim()).limit(1).maybeSingle();
        if(existingUsername){showToast("error","This username is already taken");setSaving(false);return;}
      }
      const {data:{session}}=await supabase.auth.getSession();
      // Step 1: Create the auth user via edge function (pass first company so edge fn is happy)
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
          company_id:userForm.company_ids[0],
        }),
      });
      const result=await res.json();
      if(!res.ok)throw new Error(result.error||"Failed to create user");
      const newUserId=result.user_id;
      // Step 2: Wipe the single user_roles row the edge function inserted
      await supabase.from("user_roles").delete().eq("user_id",newUserId);
      // Step 3: Insert one row per selected company.
      // Username must only go on the FIRST row — user_roles has a UNIQUE(username) constraint
      // so inserting the same username on rows 2+ would fail with a unique violation.
      let firstRow=true;
      let anyFailed=false;
      for(const company_id of userForm.company_ids){
        const {error:roleErr}=await supabase.from("user_roles").insert({
          user_id:newUserId,
          name:userForm.name,
          email:userForm.email.toLowerCase().trim(),
          username:firstRow?(userForm.username.toLowerCase().trim()||null):null,
          role:userForm.role,
          company_id,
        });
        if(roleErr){console.error("Failed inserting role for company",company_id,":",roleErr.message);anyFailed=true;}
        firstRow=false;
      }
      if(anyFailed)showToast("warning","User created but some company assignments failed — check console");
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

  const updateRole=async(userId,newRole)=>{
    const target=users.find(x=>x.user_id===userId);
    const oldRole=target?.role||"unknown";
    const {error}=await supabase.from("user_roles").update({role:newRole}).eq("user_id",userId);
    if(error){showToast("error","Failed to update role");return;}
    setUsers(u=>u.map(x=>x.user_id===userId?{...x,role:newRole}:x));
    showToast("success","Role updated");
    await logAudit("Role changed",target?.name||target?.email||userId,{section:"User Management",details:`Role changed from "${oldRole.replace(/_/g," ")}" → "${newRole.replace(/_/g," ")}" for ${target?.name||target?.email||userId}`});
    if(userId===currentUser.id&&onRoleChange)await onRoleChange();
  };

  const deactivateUser=async(userId)=>{
    const target=users.find(x=>x.user_id===userId);
    const {error}=await supabase.from("user_roles").update({role:"inactive"}).eq("user_id",userId);
    if(error){showToast("error","Failed to deactivate");return;}
    setUsers(u=>u.map(x=>x.user_id===userId?{...x,role:"inactive"}:x));
    showToast("success","User deactivated");
    await logAudit("User deactivated",target?.name||target?.email||userId,{section:"User Management",details:`Account deactivated — user can no longer log in`});
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
    const u=allUserRoles.find(r=>r.user_id===userId);
    const {error}=await supabase.from("user_roles").insert({
      user_id:userId,name:u?.name||"",email:u?.email||"",role:u?.role||"user",company_id:companyId,
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
    setSaving(true);
    const {error}=await supabase.from("user_roles").delete().eq("user_id",userId);
    if(error){showToast("error","Failed to delete: "+error.message);setSaving(false);return;}
    showToast("success","User removed from all companies");
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

  const roleColor={superadmin:"#f59e0b",admin:"#6366f1",power_user:"#06b6d4",user:"#10b981",inactive:"#475569"};
  const roleBg={superadmin:"rgba(245,158,11,0.1)",admin:"rgba(99,102,241,0.1)",power_user:"rgba(6,182,212,0.1)",user:"rgba(16,185,129,0.1)",inactive:"rgba(71,85,105,0.1)"};
  const companyName=id=>companies.find(c=>c.id===id)?.name||"—";


  const seenUserIds=new Set();
  const filteredUsers=users.filter(u=>{
    const matchTab=userTab==="all"||(userTab==="active"&&u.role!=="inactive")||(userTab==="inactive"&&u.role==="inactive");
    const matchSearch=!search||u.name?.toLowerCase().includes(search.toLowerCase())||u.email?.toLowerCase().includes(search.toLowerCase());
    if(!matchTab||!matchSearch)return false;
    if(seenUserIds.has(u.user_id))return false;
    seenUserIds.add(u.user_id);
    return true;
  });

  const INP2={...INP,marginBottom:0};

  return(
    <div style={{maxWidth:1050}}>
      {toast&&(
        <div style={{position:"fixed",top:24,right:24,zIndex:999,padding:"12px 20px",borderRadius:10,background:toast.type==="success"?"#059669":"#dc2626",color:"#fff",fontSize:14,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>
          {toast.type==="success"?"✓ ":"✗ "}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <div style={{fontFamily:"Playfair Display,serif",fontSize:26,fontWeight:700,color:"#f1f5f9"}}>👥 User Management</div>
          <div style={{fontSize:13,color:"#64748b",marginTop:4}}>{users.length} users · {companies.length} companies</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {mainTab==="users"&&(
            <>
              <button onClick={()=>{setShowExistingForm(s=>!s);setShowUserForm(false);setShowCompanyForm(false);}}
                style={{padding:"10px 20px",borderRadius:10,border:"1px solid #6366f1",background:"transparent",color:"#6366f1",fontWeight:700,fontSize:14}}>
                {showExistingForm?"Cancel":"+ Existing User"}
              </button>
              <button onClick={()=>{setShowUserForm(s=>!s);setShowExistingForm(false);setShowCompanyForm(false);}}
                style={{padding:"10px 20px",borderRadius:10,border:"none",background:"#6366f1",color:"#fff",fontWeight:700,fontSize:14}}>
                {showUserForm?"Cancel":"+ New User"}
              </button>
            </>
          )}
          {mainTab==="companies"&&(
            <button onClick={()=>{setShowCompanyForm(s=>!s);setShowUserForm(false);setShowExistingForm(false);}}
              style={{padding:"10px 20px",borderRadius:10,border:"none",background:"#10b981",color:"#fff",fontWeight:700,fontSize:14}}>
              {showCompanyForm?"Cancel":"+ New Company"}
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{display:"flex",gap:2,borderBottom:"1px solid #334155",marginBottom:20}}>
        {[["users","👥 Users"],["companies","🏢 Companies"],["activity","📊 Activity"]].map(([id,label])=>(
          <button key={id} onClick={()=>{setMainTab(id);setShowUserForm(false);setShowCompanyForm(false);setSearch("");}}
            style={{padding:"9px 20px",border:"none",borderBottom:mainTab===id?"2px solid #6366f1":"2px solid transparent",background:"transparent",color:mainTab===id?"#6366f1":"#64748b",fontWeight:600,fontSize:14,cursor:"pointer",marginBottom:-1}}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════ USERS TAB ═══════════════ */}
      {mainTab==="users"&&(
        <>
          {/* Add Existing User Form */}
          {showExistingForm&&(
            <div style={{background:"#1c1f2e",border:"1px solid #6366f1",borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:16,color:"#f1f5f9",fontWeight:700,marginBottom:6}}>Add Existing User to Company</div>
              <div style={{fontSize:12,color:"#64748b",marginBottom:16}}>For users who already have an account — give them access to this company.</div>
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
                      <option value="user">User</option>
                      <option value="power_user">Power User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={LBL}>Companies * (select one or more)</label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,background:"#0f172a",borderRadius:8,padding:12,border:"1px solid #334155"}}>
                      {companies.map(c=>(
                        <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#e2e8f0",cursor:"pointer"}}>
                          <input type="checkbox" checked={existingForm.company_ids.includes(c.id)} onChange={()=>onToggleCompany(c.id)} style={{accentColor:"#6366f1",width:15,height:15}}/>
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={saving}
                  style={{padding:"10px 24px",borderRadius:9,border:"none",background:saving?"#334155":"#6366f1",color:saving?"#64748b":"#fff",fontWeight:700,fontSize:14}}>
                  {saving?"Adding...":"Add to Company"}
                </button>
              </form>
            </div>
          )}

          {/* Create New User Form */}
          {showUserForm&&(
            <div style={{background:"#1c1f2e",border:"1px solid #6366f1",borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:16,color:"#f1f5f9",fontWeight:700,marginBottom:16}}>Create New User</div>
              <form onSubmit={createUser}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div><label style={LBL}>Full Name *</label><input name="name" value={userForm.name} onChange={onChangeUser} placeholder="e.g. Maria Johnson" style={INP2}/></div>
                  <div><label style={LBL}>Email *</label><input name="email" type="email" value={userForm.email} onChange={onChangeUser} placeholder="user@company.aw" style={INP2}/></div>
                  <div><label style={LBL}>Temporary Password *</label><input name="password" type="password" value={userForm.password} onChange={onChangeUser} placeholder="Min. 8 characters" style={INP2}/></div>
                  <div><label style={LBL}>Username <span style={{color:"#475569",fontWeight:400}}>(optional)</span></label><input name="username" value={userForm.username} onChange={onChangeUser} placeholder="e.g. maria.j" style={INP2}/></div>
                  <div><label style={LBL}>Role *</label>
                    <select name="role" value={userForm.role} onChange={onChangeUser} style={{...INP2,cursor:"pointer"}}>
                      <option value="user">User</option>
                      <option value="power_user">Power User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={LBL}>Companies * (select one or more)</label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,background:"#0f172a",borderRadius:8,padding:12,border:"1px solid #334155"}}>
                      {companies.map(c=>(
                        <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#e2e8f0",cursor:"pointer"}}>
                          <input type="checkbox" checked={userForm.company_ids.includes(c.id)} onChange={()=>onToggleUserCompany(c.id)} style={{accentColor:"#6366f1",width:15,height:15}}/>
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
                  style={{padding:"10px 24px",borderRadius:9,border:"none",background:saving?"#334155":"#10b981",color:saving?"#64748b":"#fff",fontWeight:700,fontSize:14}}>
                  {saving?"Creating...":"Create User"}
                </button>
              </form>
            </div>
          )}

          {/* User filter tabs + search */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{display:"flex",gap:2,borderBottom:"1px solid #334155"}}>
              {[["all","All"],["active","Active"],["inactive","Inactive"]].map(([id,label])=>(
                <button key={id} onClick={()=>setUserTab(id)}
                  style={{padding:"7px 16px",border:"none",borderBottom:userTab===id?"2px solid #6366f1":"2px solid transparent",background:"transparent",color:userTab===id?"#6366f1":"#64748b",fontWeight:600,fontSize:13,cursor:"pointer",marginBottom:-1}}>
                  {label}
                </button>
              ))}
            </div>
            <input style={{...INP2,width:200}} placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>

          {/* User List */}
          {loading?<div style={{color:"#475569",textAlign:"center",padding:"40px 0"}}>Loading...</div>:(
            <div style={{background:"#1c1f2e",border:"1px solid #334155",borderRadius:12,overflowX:"auto"}}>
              {filteredUsers.length===0?(
                <div style={{color:"#475569",textAlign:"center",padding:"40px 0"}}>No users found</div>
              ):(
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #334155"}}>
                      {[["Name",160],["Email",160],["Role",110],["Companies",null],["Actions",180]].map(([h,minW])=>(
                        <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6366f1",letterSpacing:0.5,minWidth:minW||undefined,whiteSpace:"nowrap"}}>{h}</th>
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
                      <tr key={u.user_id} style={{borderBottom:"1px solid #1e293b",background:rowBg}}>
                        {/* Name / Username / Last Login cell */}
                        <td style={{padding:"10px 16px",fontWeight:600,color:"#f1f5f9",fontSize:13}}>
                          {isEditing?(
                            <div style={{display:"flex",flexDirection:"column",gap:4}}>
                              <input value={editForm.name} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}
                                placeholder="Full name" style={{background:"#0f172a",border:"1px solid #6366f1",borderRadius:6,padding:"4px 8px",color:"#f1f5f9",fontSize:12,width:140}}/>
                              <input value={editForm.username} onChange={e=>setEditForm(p=>({...p,username:e.target.value}))}
                                placeholder="username (optional)" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"4px 8px",color:"#94a3b8",fontSize:11,width:140}}/>
                            </div>
                          ):(
                            <div>
                              <div>{u.name||"—"}</div>
                              {u.username&&<div style={{fontSize:11,color:"#475569",fontWeight:400}}>@{u.username}</div>}
                              <div style={{fontSize:10,color:"#334155",fontWeight:400,marginTop:2}}>🕐 {fmtLastLogin(u.login_history)}</div>
                            </div>
                          )}
                        </td>
                        {/* Email cell */}
                        <td style={{padding:"10px 16px",color:"#64748b",fontSize:13}}>
                          {isEditing?(
                            <input value={editForm.email} onChange={e=>setEditForm(p=>({...p,email:e.target.value}))}
                              placeholder="Email" style={{background:"#0f172a",border:"1px solid #6366f1",borderRadius:6,padding:"4px 8px",color:"#f1f5f9",fontSize:12,width:160}}/>
                          ):(u.email||"—")}
                        </td>
                        {/* Role cell */}
                        <td style={{padding:"10px 16px"}}>
                          <select value={u.role} onChange={e=>{const nr=e.target.value;if(nr===u.role)return;setPendingAction({type:"role_change",userId:u.user_id,userName:u.name||u.email,meta:{newRole:nr,oldRole:u.role}});}}
                            style={{background:roleBg[u.role]||"transparent",color:roleColor[u.role]||"#64748b",border:"1px solid "+(roleColor[u.role]||"#334155"),borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            <option value="user">User</option>
                            <option value="power_user">Power User</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        {/* Companies cell */}
                        <td style={{padding:"10px 16px"}}>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                            {allUserRoles.filter(r=>r.user_id===u.user_id).map(r=>(
                              <span key={r.company_id} style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:12,padding:"2px 8px",fontSize:11,color:"#a5b4fc",whiteSpace:"nowrap"}}>
                                {companyName(r.company_id)}
                                {!isMe&&(
                                  <span onClick={()=>setPendingAction({type:"remove_company",userId:u.user_id,userName:u.name||u.email,meta:{companyId:r.company_id,companyName:companyName(r.company_id)}})}
                                    style={{cursor:"pointer",color:"#64748b",fontWeight:700,fontSize:13,lineHeight:1,marginLeft:2}} title="Remove from company">×</span>
                                )}
                              </span>
                            ))}
                            {companies.filter(c=>!allUserRoles.find(r=>r.user_id===u.user_id&&r.company_id===c.id)).length>0&&(
                              expandedUser===u.user_id
                                ? companies.filter(c=>!allUserRoles.find(r=>r.user_id===u.user_id&&r.company_id===c.id)).map(c=>(
                                    <span key={c.id} onClick={()=>addToCompany(u.user_id,c.id)}
                                      style={{display:"inline-flex",alignItems:"center",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.35)",borderRadius:12,padding:"2px 8px",fontSize:11,color:"#10b981",cursor:"pointer",whiteSpace:"nowrap"}}>
                                      + {companyName(c.id)}
                                    </span>
                                  ))
                                : <span onClick={()=>setExpandedUser(u.user_id)}
                                    style={{display:"inline-flex",alignItems:"center",background:"transparent",border:"1px dashed #475569",borderRadius:12,padding:"2px 8px",fontSize:11,color:"#475569",cursor:"pointer",whiteSpace:"nowrap"}}>
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
                                style={{padding:"4px 11px",borderRadius:7,border:"none",background:"#6366f1",color:"#fff",fontSize:11,fontWeight:700}}>
                                {saving?"…":"Save"}
                              </button>
                              <button onClick={()=>setEditingUser(null)}
                                style={{padding:"4px 11px",borderRadius:7,border:"1px solid #334155",background:"transparent",color:"#64748b",fontSize:11,fontWeight:600}}>
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
                                style={{padding:"4px 11px",borderRadius:7,border:"1px solid #334155",background:"transparent",color:"#64748b",fontSize:11,fontWeight:600}}>
                                No
                              </button>
                            </div>
                          ):(
                            <div style={{display:"flex",gap:6,alignItems:"center"}}>
                              {!isMe&&(
                                <>
                                  <button onClick={()=>startEditUser(u)} title="Edit user"
                                    style={{padding:"4px 9px",borderRadius:7,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontSize:12}}>
                                    ✏️
                                  </button>
                                  <button onClick={()=>{setDeleteConfirmUser(u.user_id);setEditingUser(null);setExpandedUser(null);}} title="Delete user"
                                    style={{padding:"4px 9px",borderRadius:7,border:"1px solid rgba(220,38,38,0.3)",background:"transparent",color:"#f87171",fontSize:12}}>
                                    🗑️
                                  </button>
                                  {u.role!=="inactive"&&(
                                    <button onClick={()=>setPendingAction({type:"deactivate",userId:u.user_id,userName:u.name||u.email,meta:{}})}
                                      style={{padding:"4px 12px",borderRadius:7,border:"1px solid #334155",background:"transparent",color:"#64748b",fontSize:11,fontWeight:600}}>
                                      Deactivate
                                    </button>
                                  )}
                                </>
                              )}
                              {isMe&&<span style={{fontSize:11,color:"#475569",fontStyle:"italic"}}>You</span>}
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
              <label style={{fontSize:12,color:"#64748b",fontWeight:600}}>From</label>
              <input type="date" value={activityDateFrom} onChange={e=>setActivityDateFrom(e.target.value)}
                style={{...INP2,width:150}}/>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <label style={{fontSize:12,color:"#64748b",fontWeight:600}}>To</label>
              <input type="date" value={activityDateTo} onChange={e=>setActivityDateTo(e.target.value)}
                style={{...INP2,width:150}}/>
            </div>
            <button onClick={()=>loadActivity(activityDateFrom,activityDateTo)}
              style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#6366f1",color:"#fff",fontWeight:700,fontSize:13}}>Apply</button>
            {(activityDateFrom||activityDateTo)&&(
              <button onClick={()=>{setActivityDateFrom("");setActivityDateTo("");loadActivity("","");}}
                style={{padding:"8px 14px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#64748b",fontSize:13,fontWeight:600}}>Clear</button>
            )}
            <button onClick={()=>loadActivity(activityDateFrom,activityDateTo)}
              style={{padding:"8px 14px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#475569",fontSize:13}}>↻ Refresh</button>
          </div>
          {activityLoading?(
            <div style={{color:"#475569",textAlign:"center",padding:"40px 0"}}>Loading activity...</div>
          ):activityData.length===0?(
            <div style={{color:"#475569",textAlign:"center",padding:"40px 0"}}>No activity recorded in this period.</div>
          ):(
            <div style={{background:"#1c1f2e",border:"1px solid #334155",borderRadius:12,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:"1px solid #334155"}}>
                    {[["Staff Member",200],["Total Actions",130],["Last Active",170],["Top Action",null]].map(([h,minW])=>(
                      <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6366f1",letterSpacing:0.5,minWidth:minW||undefined,whiteSpace:"nowrap"}}>{h}</th>
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
                          <td style={{padding:"12px 16px",fontWeight:600,color:"#f1f5f9",fontSize:13}}>
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
                          <td style={{padding:"12px 16px",color:"#64748b",fontSize:12}}>{lastDate}</td>
                          <td style={{padding:"12px 16px"}}>
                            {topAction&&(
                              <span style={{background:"rgba(16,185,129,0.1)",color:"#10b981",border:"1px solid rgba(16,185,129,0.25)",borderRadius:12,padding:"3px 10px",fontSize:11,fontWeight:600}}>
                                {topAction[0]} · {topAction[1]}×
                              </span>
                            )}
                          </td>
                          <td style={{padding:"12px 16px",color:"#475569",fontSize:12,textAlign:"right"}}>{isExpanded?"▲":"▼"}</td>
                        </tr>
                        {isExpanded&&(
                          <tr style={{background:"rgba(99,102,241,0.04)",borderBottom:"1px solid #334155"}}>
                            <td colSpan={5} style={{padding:"12px 20px 16px"}}>
                              <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                                <div style={{flex:1,minWidth:200}}>
                                  <div style={{fontSize:11,fontWeight:700,color:"#6366f1",letterSpacing:0.5,marginBottom:8}}>ACTION BREAKDOWN</div>
                                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                                    {Object.entries(s.actions).sort((a,b)=>b[1]-a[1]).map(([action,count])=>(
                                      <span key={action} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"4px 10px",fontSize:12,color:"#94a3b8"}}>
                                        <span style={{color:"#f1f5f9",fontWeight:700}}>{count}×</span> {action}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {s.recentClients.length>0&&(
                                  <div style={{minWidth:180}}>
                                    <div style={{fontSize:11,fontWeight:700,color:"#6366f1",letterSpacing:0.5,marginBottom:8}}>RECENT CLIENTS</div>
                                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                      {s.recentClients.map(c=>(
                                        <span key={c} style={{fontSize:12,color:"#94a3b8"}}>• {c}</span>
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
            <div style={{background:"#1c1f2e",border:"1px solid #10b981",borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:16,color:"#f1f5f9",fontWeight:700,marginBottom:16}}>Create New Company</div>
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
                  style={{padding:"10px 24px",borderRadius:9,border:"none",background:saving?"#334155":"#10b981",color:saving?"#64748b":"#fff",fontWeight:700,fontSize:14}}>
                  {saving?"Creating...":"Create Company"}
                </button>
              </form>
            </div>
          )}

          {/* Company List */}
          {loading?<div style={{color:"#475569",textAlign:"center",padding:"40px 0"}}>Loading...</div>:(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {companies.length===0?(
                <div style={{color:"#475569",textAlign:"center",padding:"40px 0"}}>No companies yet. Create your first one.</div>
              ):companies.map((c)=>{
                const st=companyStats[c.id]||{clients:0,archivedClients:0,users:0,lastActivity:null};
                const lastAct=st.lastActivity?new Date(st.lastActivity).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"No activity";
                return(
                  <div key={c.id} style={{background:"#1c1f2e",boxShadow:"6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)",borderRadius:16,padding:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                      <div style={{flex:1,minWidth:200}}>
                        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                          {c.logo_url&&(
                            <div style={{background:"#fff",borderRadius:8,padding:"4px 6px",flexShrink:0}}>
                              <img src={c.logo_url} alt={c.name} style={{height:32,maxWidth:80,objectFit:"contain",display:"block"}}/>
                            </div>
                          )}
                          <div>
                            <div style={{fontFamily:"Playfair Display,serif",fontSize:17,fontWeight:700,color:"#f1f5f9"}}>{c.name}</div>
                            {c.mission_statement&&<div style={{fontSize:11,color:"#64748b",fontStyle:"italic",marginTop:2}}>"{c.mission_statement}"</div>}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:8}}>
                          {c.address&&<span style={{fontSize:12,color:"#94a3b8"}}>📍 {c.address}</span>}
                          {c.phone&&<span style={{fontSize:12,color:"#94a3b8"}}>📞 {c.phone}</span>}
                          {c.email&&<span style={{fontSize:12,color:"#94a3b8"}}>✉️ {c.email}</span>}
                          {c.website&&<span style={{fontSize:12,color:"#94a3b8"}}>🌐 {c.website}</span>}
                        </div>
                      </div>
                      {/* Stats */}
                      <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap"}}>
                        <div style={{textAlign:"center",background:"rgba(16,185,129,0.1)",borderRadius:10,padding:"10px 16px",minWidth:64}}>
                          <div style={{fontSize:22,fontWeight:700,color:"#10b981"}}>{st.clients}</div>
                          <div style={{fontSize:10,color:"#64748b",fontWeight:600}}>CLIENTS</div>
                          {st.archivedClients>0&&<div style={{fontSize:9,color:"#475569",marginTop:2}}>{st.archivedClients} archived</div>}
                        </div>
                        <div style={{textAlign:"center",background:"rgba(99,102,241,0.1)",borderRadius:10,padding:"10px 16px",minWidth:64}}>
                          <div style={{fontSize:22,fontWeight:700,color:"#6366f1"}}>{st.users}</div>
                          <div style={{fontSize:10,color:"#64748b",fontWeight:600}}>USERS</div>
                        </div>
                        <div style={{textAlign:"center",background:"rgba(71,85,105,0.2)",borderRadius:10,padding:"10px 16px",minWidth:80}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",lineHeight:1.3}}>{lastAct}</div>
                          <div style={{fontSize:10,color:"#64748b",fontWeight:600,marginTop:4}}>LAST ACTIVITY</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════════ CONFIRM ACTION MODAL ═══════════════ */}
      {pendingAction&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#1c1f2e",border:"1px solid #334155",borderRadius:16,padding:36,maxWidth:420,width:"100%",boxShadow:"0 24px 60px rgba(0,0,0,0.6)"}}>
            <div style={{fontSize:36,textAlign:"center",marginBottom:12}}>
              {pendingAction.type==="deactivate"?"🔒":pendingAction.type==="role_change"?"🔄":"🏢"}
            </div>
            <div style={{fontFamily:"Playfair Display,serif",fontSize:18,fontWeight:700,color:"#f1f5f9",textAlign:"center",marginBottom:10}}>
              {pendingAction.type==="deactivate"&&"Deactivate User"}
              {pendingAction.type==="role_change"&&"Change Role"}
              {pendingAction.type==="remove_company"&&"Remove from Company"}
            </div>
            <div style={{fontSize:13,color:"#94a3b8",textAlign:"center",lineHeight:1.7,marginBottom:28}}>
              {pendingAction.type==="deactivate"&&<>Deactivate <strong style={{color:"#f1f5f9"}}>{pendingAction.userName}</strong>? They will be unable to log in. Their data and history are preserved.</>}
              {pendingAction.type==="role_change"&&<>Change <strong style={{color:"#f1f5f9"}}>{pendingAction.userName}</strong>'s role from <span style={{color:roleColor[pendingAction.meta.oldRole]||"#94a3b8",fontWeight:700}}>{pendingAction.meta.oldRole.replace(/_/g," ")}</span> → <span style={{color:roleColor[pendingAction.meta.newRole]||"#94a3b8",fontWeight:700}}>{pendingAction.meta.newRole.replace(/_/g," ")}</span>. Access changes take effect immediately.</>}
              {pendingAction.type==="remove_company"&&<>Remove <strong style={{color:"#f1f5f9"}}>{pendingAction.userName}</strong> from <strong style={{color:"#f1f5f9"}}>{pendingAction.meta.companyName}</strong>? They will lose access to all clients in that company.</>}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setPendingAction(null)}
                style={{padding:"10px 28px",borderRadius:9,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontWeight:600,fontSize:14,cursor:"pointer"}}>
                Cancel
              </button>
              <button disabled={saving} onClick={async()=>{
                  const{type,userId,meta}=pendingAction;
                  setPendingAction(null);
                  if(type==="deactivate")await deactivateUser(userId);
                  else if(type==="role_change")await updateRole(userId,meta.newRole);
                  else if(type==="remove_company")await removeFromCompany(userId,meta.companyId);
                }}
                style={{padding:"10px 28px",borderRadius:9,border:"none",background:pendingAction.type==="role_change"?"#6366f1":"#dc2626",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",opacity:saving?0.6:1}}>
                {saving?"Working…":"Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
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
      supabase.from("companies").select("*").order("name")
        .then(({data})=>{setCompanies(data||[]);setLoading(false);});
    } else {
      // Load only companies this user belongs to
      const companyIds=(currentUser?.allRoles||[]).map(r=>r.company_id).filter(Boolean);
      if(companyIds.length===0){setLoading(false);return;}
      supabase.from("companies").select("*").in("id",companyIds).order("name")
        .then(({data})=>{setCompanies(data||[]);setLoading(false);});
    }
  },[currentUser]);

  const handleSelect=(companyId)=>{
    // Find the role for this specific company
    const roleForCompany=currentUser?.allRoles?.find(r=>r.company_id===companyId);
    onSelect(companyId, roleForCompany?.role||"user");
  };

  return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{maxWidth:600,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🏢</div>
          <div style={{fontFamily:"Playfair Display,serif",fontSize:28,fontWeight:700,color:"#f1f5f9",marginBottom:6}}>Select Company</div>
          <div style={{fontSize:13,color:"#64748b"}}>Choose which company to manage</div>
        </div>
        {loading?(
          <div style={{textAlign:"center",color:"#475569",padding:"40px 0"}}>Loading companies...</div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {companies.map(c=>{
              const roleForCompany=currentUser?.allRoles?.find(r=>r.company_id===c.id);
              const roleColors={superadmin:"#f59e0b",admin:"#6366f1",power_user:"#06b6d4",user:"#10b981"};
              const rc=roleColors[roleForCompany?.role]||"#64748b";
              return(
                <button key={c.id} onClick={()=>handleSelect(c.id)}
                  style={{display:"flex",alignItems:"center",gap:16,padding:"20px 24px",borderRadius:16,border:"1px solid #334155",background:"#1c1f2e",cursor:"pointer",textAlign:"left",width:"100%"}}>
                  {c.logo_url?(
                    <div style={{background:"#fff",borderRadius:10,padding:"6px 8px",flexShrink:0}}>
                      <img src={c.logo_url} alt={c.name} style={{height:48,maxWidth:120,objectFit:"contain",display:"block"}}/>
                    </div>
                  ):(
                    <div style={{width:64,height:64,borderRadius:12,background:"rgba(99,102,241,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🏥</div>
                  )}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"Playfair Display,serif",fontSize:18,fontWeight:700,color:"#f1f5f9",marginBottom:4}}>{c.name}</div>
                    {c.mission_statement&&<div style={{fontSize:12,color:"#64748b",fontStyle:"italic",marginBottom:6}}>"{c.mission_statement}"</div>}
                    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                      {c.address&&<span style={{fontSize:11,color:"#475569"}}>📍 {c.address}</span>}
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
  {key:"view",label:"View Clients",desc:"Can view client profiles"},
  {key:"add",label:"Add Clients",desc:"Can create new clients"},
  {key:"edit",label:"Edit Clients",desc:"Can edit client information"},
  {key:"delete",label:"Delete Clients",desc:"Can permanently delete clients"},
  {key:"audit",label:"Audit Trail",desc:"Can view audit logs"},
  {key:"company",label:"Company Settings",desc:"Can edit company information"},
  {key:"users",label:"User Management",desc:"Can manage users"},
  {key:"permissions",label:"Permissions Panel",desc:"Can edit role permissions"},
];
const ROLES=["superadmin","admin","power_user","user"];
const ROLE_LABELS={superadmin:"Super Admin",admin:"Admin",power_user:"Power User",user:"User"};
const ROLE_COLORS={superadmin:"#f59e0b",admin:"#6366f1",power_user:"#06b6d4",user:"#10b981"};

function PermissionsPanel({activeCompanyId,currentUser,t}){
  const [globalPerms,setGlobalPerms]=useState([]);
  const [companyPerms,setCompanyPerms]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [viewMode,setViewMode]=useState("grid"); // "grid" | "table"
  const [tab,setTab]=useState("global"); // "global" | "company"
  const [applyMode,setApplyMode]=useState("now"); // "now" | "next_login"
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
    try{
      for(const [key,allowed] of Object.entries(pendingChanges)){
        const isCompany=key.startsWith("c_");
        const withoutPrefix=key.slice(2);
        const ROLES=["superadmin","admin","power_user","user","inactive"];
        const matchedRole=ROLES.find(r=>withoutPrefix.startsWith(r+"_"));
        const role=matchedRole||withoutPrefix.split("_")[0];
        const action=withoutPrefix.slice(role.length+1);
        if(isCompany&&activeCompanyId){
          await supabase.from("company_permissions").upsert({company_id:activeCompanyId,role,action,allowed,updated_at:new Date().toISOString()},{onConflict:"company_id,role,action"});
        } else {
          await supabase.from("permissions").update({allowed,updated_at:new Date().toISOString()}).eq("role",role).eq("action",action);
        }
      }
      // Reload permissions cache
      if(applyMode==="now")await loadPermissions(activeCompanyId);
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

  return(
    <div style={{maxWidth:900}}>
      {toast&&(
        <div style={{position:"fixed",top:24,right:24,zIndex:999,padding:"12px 20px",borderRadius:10,background:toast.type==="success"?"#059669":"#dc2626",color:"#fff",fontSize:14,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>
          {toast.type==="success"?"✓ ":"✗ "}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <div style={{fontFamily:"Playfair Display,serif",fontSize:26,fontWeight:700,color:"#f1f5f9"}}>🔐 Permissions</div>
          <div style={{fontSize:13,color:"#64748b",marginTop:4}}>Control what each role can do</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
          {/* View toggle */}
          <div style={{display:"flex",border:"1px solid #334155",borderRadius:8,overflow:"hidden"}}>
            {[["grid","⊞ Grid"],["table","☰ Table"]].map(([id,label])=>(
              <button key={id} onClick={()=>setViewMode(id)}
                style={{padding:"7px 14px",border:"none",background:viewMode===id?"#6366f1":"transparent",color:viewMode===id?"#fff":"#64748b",fontWeight:600,fontSize:12}}>
                {label}
              </button>
            ))}
          </div>
          {/* Apply mode */}
          <select value={applyMode} onChange={e=>setApplyMode(e.target.value)}
            style={{...INP,marginBottom:0,fontSize:12,padding:"7px 12px",width:"auto"}}>
            <option value="now">Apply immediately</option>
            <option value="next_login">Apply on next login</option>
          </select>
          {/* Save */}
          <button onClick={saveChanges} disabled={saving||!hasPending}
            style={{padding:"8px 20px",borderRadius:8,border:"none",background:hasPending?"#10b981":"#334155",color:hasPending?"#fff":"#64748b",fontWeight:700,fontSize:13}}>
            {saving?"Saving...":`Save${hasPending?` (${Object.keys(pendingChanges).length})`:""}` }
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:2,borderBottom:"1px solid #334155",marginBottom:20}}>
        {[["global","🌐 Global Defaults"],["company","🏢 Company Override"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:"9px 20px",border:"none",borderBottom:tab===id?"2px solid #6366f1":"2px solid transparent",background:"transparent",color:tab===id?"#6366f1":"#64748b",fontWeight:600,fontSize:13,cursor:"pointer",marginBottom:-1}}>
            {label}
          </button>
        ))}
      </div>

      {tab==="company"&&!activeCompanyId&&(
        <div style={{padding:20,background:"#1c1f2e",borderRadius:12,color:"#64748b",textAlign:"center"}}>
          Select a company first to manage company-specific overrides.
        </div>
      )}

      {loading?<div style={{color:"#475569",textAlign:"center",padding:"40px 0"}}>Loading permissions...</div>:(

        <>
          {/* Pending changes banner */}
          {hasPending&&(
            <div style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:10,padding:"10px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,color:"#f59e0b",fontWeight:600}}>⚠️ {Object.keys(pendingChanges).length} unsaved change{Object.keys(pendingChanges).length!==1?"s":""}</span>
              <button onClick={()=>setPendingChanges({})} style={{border:"none",background:"transparent",color:"#64748b",fontSize:12,fontWeight:600}}>Discard</button>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode==="grid"&&(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
                <thead>
                  <tr>
                    <th style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6366f1",letterSpacing:0.5,background:"#1c1f2e",borderRadius:"8px 0 0 0"}}>ACTION</th>
                    {ROLES.map(role=>(
                      <th key={role} style={{padding:"12px 16px",textAlign:"center",fontSize:11,fontWeight:700,color:ROLE_COLORS[role],letterSpacing:0.5,background:"#1c1f2e"}}>
                        {ROLE_LABELS[role].toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ACTIONS.map((action,i)=>(
                    <tr key={action.key} style={{background:i%2===0?"#0f172a":"#1e293b"}}>
                      <td style={{padding:"14px 16px"}}>
                        <div style={{fontWeight:600,color:"#f1f5f9",fontSize:13}}>{action.label}</div>
                        <div style={{fontSize:11,color:"#475569",marginTop:2}}>{action.desc}</div>
                      </td>
                      {ROLES.map(role=>{
                        const val=getPermValue(role,action.key,isCompanyTab&&!!activeCompanyId);
                        const key=`${isCompanyTab?"c":"g"}_${role}_${action.key}`;
                        const isPending=pendingChanges[key]!==undefined;
                        const isLocked=role==="superadmin"&&action.key==="view";
                        return(
                          <td key={role} style={{padding:"14px 16px",textAlign:"center"}}>
                            <button
                              disabled={isLocked}
                              onClick={()=>!isLocked&&togglePerm(role,action.key,isCompanyTab&&!!activeCompanyId)}
                              style={{
                                width:44,height:24,borderRadius:12,border:"none",
                                background:val?"#10b981":"#334155",
                                position:"relative",cursor:isLocked?"not-allowed":"pointer",
                                transition:"background 0.2s",
                                boxShadow:isPending?"0 0 0 2px #f59e0b":"none",
                              }}>
                              <span style={{
                                position:"absolute",top:2,left:val?22:2,
                                width:20,height:20,borderRadius:"50%",
                                background:"#fff",transition:"left 0.2s",
                                boxShadow:"0 1px 3px rgba(0,0,0,0.3)",
                              }}/>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode==="table"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {ROLES.map(role=>(
                <div key={role} style={{background:"#1c1f2e",border:"1px solid #334155",borderRadius:12,overflow:"hidden"}}>
                  <div style={{padding:"12px 16px",borderBottom:"1px solid #334155",display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontWeight:700,color:ROLE_COLORS[role],fontSize:14}}>{ROLE_LABELS[role]}</span>
                    <span style={{fontSize:11,color:"#475569"}}>
                      {ACTIONS.filter(a=>getPermValue(role,a.key,isCompanyTab&&!!activeCompanyId)).length} of {ACTIONS.length} permissions enabled
                    </span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                    {ACTIONS.map((action,i)=>{
                      const val=getPermValue(role,action.key,isCompanyTab&&!!activeCompanyId);
                      const key=`${isCompanyTab?"c":"g"}_${role}_${action.key}`;
                      const isPending=pendingChanges[key]!==undefined;
                      const isLocked=role==="superadmin"&&action.key==="view";
                      return(
                        <div key={action.key}
                          style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:i<ACTIONS.length-2?"1px solid #0f172a":"none",background:isPending?"rgba(245,158,11,0.05)":"transparent"}}>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:val?"#f1f5f9":"#475569"}}>{action.label}</div>
                            <div style={{fontSize:11,color:"#475569"}}>{action.desc}</div>
                          </div>
                          <input type="checkbox" checked={val} disabled={isLocked}
                            onChange={()=>!isLocked&&togglePerm(role,action.key,isCompanyTab&&!!activeCompanyId)}
                            style={{width:16,height:16,cursor:isLocked?"not-allowed":"pointer",accentColor:"#10b981"}}/>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


function UserProfile({currentUser,onUpdate,onClose,t}){
  const [tab,setTab]=useState("profile"); // profile | password | history | sessions
  const [form,setForm]=useState({displayName:currentUser.displayName||"",username:currentUser.username||""});
  const [pwForm,setPwForm]=useState({current:"",newPw:"",confirm:""});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState(null);
  const [uploading,setUploading]=useState(false);
  const [loginHistory,setLoginHistory]=useState([]);
  const [sessions,setSessions]=useState([]);

  useEffect(()=>{loadHistory();},[]);

  const loadHistory=async()=>{
    const {data}=await supabase.from("user_roles").select("login_history").eq("user_id",currentUser.id).eq("company_id",currentUser.company_id).single();
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
    }).eq("user_id",currentUser.id).eq("company_id",currentUser.company_id);
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
    if(pwForm.newPw.length<8){setMsg({type:"error",text:"Password must be at least 8 characters"});return;}
    setSaving(true);setMsg(null);
    const {error}=await supabase.auth.updateUser({password:pwForm.newPw});
    if(error){setMsg({type:"error",text:error.message});}
    else{setMsg({type:"success",text:"Password changed!"});setPwForm({current:"",newPw:"",confirm:""});}
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

  const INP3={background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"10px 14px",color:"#f1f5f9",fontSize:14,width:"100%"};
  const LB={fontSize:12,color:"#94a3b8",fontWeight:600,marginBottom:4,display:"block"};

  return(
    <div style={{maxWidth:640,margin:"0 auto",padding:"24px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:22,fontWeight:700,color:"#f1f5f9"}}>My Profile</div>
        <button onClick={onClose} style={{background:"none",border:"1px solid #334155",borderRadius:8,padding:"6px 14px",color:"#94a3b8",fontSize:13,fontWeight:600}}>← Back</button>
      </div>

      {msg&&<div style={{padding:"10px 14px",borderRadius:8,marginBottom:16,background:msg.type==="error"?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)",border:`1px solid ${msg.type==="error"?"#ef4444":"#22c55e"}`,color:msg.type==="error"?"#ef4444":"#22c55e",fontSize:13}}>{msg.text}</div>}

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,background:"#1c1f2e",borderRadius:10,padding:4}}>
        {TABS.map(tb=>(
          <button key={tb.id} onClick={()=>{setTab(tb.id);setMsg(null);}}
            style={{flex:1,padding:"7px 4px",borderRadius:7,border:"none",background:tab===tb.id?"#6366f1":"transparent",color:tab===tb.id?"#fff":"#64748b",fontWeight:600,fontSize:12,cursor:"pointer"}}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab==="profile"&&(
        <div style={{background:"#1c1f2e",borderRadius:12,padding:24,border:"1px solid #334155"}}>
          {/* Avatar */}
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
            <div style={{position:"relative"}}>
              {currentUser.avatar_url?
                <img src={currentUser.avatar_url} alt="avatar" style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",border:"3px solid #6366f1"}}/>:
                <div style={{width:72,height:72,borderRadius:"50%",background:"#6366f1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:700,color:"#fff"}}>{(currentUser.displayName||"?")[0].toUpperCase()}</div>
              }
            </div>
            <div>
              <label style={{background:"#6366f1",border:"none",borderRadius:8,padding:"7px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-block"}}>
                {uploading?"Uploading...":"📷 Change Photo"}
                <input type="file" accept="image/*" onChange={uploadAvatar} style={{display:"none"}} disabled={uploading}/>
              </label>
              <div style={{fontSize:11,color:"#64748b",marginTop:4}}>Max 2MB · JPG, PNG, GIF</div>
            </div>
          </div>
          {/* Form */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={LB}>Display Name *</label>
              <input style={INP3} value={form.displayName} onChange={e=>setForm(f=>({...f,displayName:e.target.value}))} placeholder="Your full name"/>
            </div>
            <div>
              <label style={LB}>Username <span style={{color:"#475569"}}>(optional — used for login)</span></label>
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
            <button onClick={saveProfile} disabled={saving} style={{background:"#6366f1",border:"none",borderRadius:8,padding:"10px",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4}}>
              {saving?"Saving...":"Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {tab==="password"&&(
        <div style={{background:"#1c1f2e",borderRadius:12,padding:24,border:"1px solid #334155"}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={LB}>New Password</label>
              <input type="password" style={INP3} value={pwForm.newPw} onChange={e=>setPwForm(f=>({...f,newPw:e.target.value}))} placeholder="Min. 8 characters"/>
            </div>
            <div>
              <label style={LB}>Confirm New Password</label>
              <input type="password" style={INP3} value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))} placeholder="Repeat new password"/>
            </div>
            <button onClick={changePassword} disabled={saving} style={{background:"#6366f1",border:"none",borderRadius:8,padding:"10px",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4}}>
              {saving?"Changing...":"Change Password"}
            </button>
          </div>
        </div>
      )}

      {/* Login History Tab */}
      {tab==="history"&&(
        <div style={{background:"#1c1f2e",borderRadius:12,padding:24,border:"1px solid #334155"}}>
          {loginHistory.length===0?
            <div style={{color:"#475569",textAlign:"center",padding:"24px 0"}}>No login history yet</div>:
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {loginHistory.map((h,i)=>(
                <div key={i} style={{background:"#0f172a",borderRadius:8,padding:"12px 14px",border:"1px solid #334155"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{color:"#22c55e",fontSize:13,fontWeight:600}}>✓ Login</span>
                    <span style={{color:"#475569",fontSize:12}}>{new Date(h.at).toLocaleString()}</span>
                  </div>
                  <div style={{fontSize:12,color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.device}</div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* Sessions Tab */}
      {tab==="sessions"&&(
        <div style={{background:"#1c1f2e",borderRadius:12,padding:24,border:"1px solid #334155"}}>
          <div style={{background:"#0f172a",borderRadius:8,padding:"14px",border:"1px solid #22c55e",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{color:"#22c55e",fontWeight:600,fontSize:13}}>● Current Session</div>
                <div style={{color:"#64748b",fontSize:12,marginTop:2}}>{navigator.userAgent.slice(0,60)}...</div>
              </div>
              <span style={{background:"rgba(34,197,94,0.1)",border:"1px solid #22c55e",borderRadius:6,padding:"2px 8px",color:"#22c55e",fontSize:11,fontWeight:600}}>Active</span>
            </div>
          </div>
          <button onClick={signOutAll} style={{width:"100%",background:"rgba(239,68,68,0.1)",border:"1px solid #ef4444",borderRadius:8,padding:"10px",color:"#ef4444",fontWeight:700,fontSize:14,cursor:"pointer"}}>
            🚪 Sign Out All Devices
          </button>
          <div style={{fontSize:11,color:"#475569",textAlign:"center",marginTop:8}}>This will sign you out everywhere immediately</div>
        </div>
      )}
    </div>
  );
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
  const [darkMode,setDarkMode]=useState(()=>localStorage.getItem("cm-dark")!=="false");
  const [notifOpen,setNotifOpen]=useState(false);
  const [readNotifIds,setReadNotifIds]=useState(()=>{try{return new Set(JSON.parse(localStorage.getItem("cm-read-notifs")||"[]"));}catch{return new Set();}});
  const [showShortcuts,setShowShortcuts]=useState(false);
  const [recentClients,setRecentClients]=useState(()=>{try{return JSON.parse(localStorage.getItem("cm-recent")||"[]");}catch{return [];}});
  const [dashNote,setDashNote]=useState(()=>localStorage.getItem("cm-dash-note")||"");
  const [emailPrefs,setEmailPrefs]=useState(()=>{try{return JSON.parse(localStorage.getItem("cm-email-prefs")||"{}") ;}catch{return {};}});

  const t=T[lang]||T["en"];
  const selectLang=code=>{localStorage.setItem("cm-lang",code);setLang(code);};

  const trackRecent=useCallback((c)=>{
    if(!c)return;
    setRecentClients(prev=>{
      const next=[{id:c.id,name:c.name,photo_url:c.photo_url||null},...prev.filter(x=>x.id!==c.id)].slice(0,5);
      localStorage.setItem("cm-recent",JSON.stringify(next));
      return next;
    });
  },[]);

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
      else if(e.key==="n"&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&can(currentUser.role,"add")){setSelected(null);setView("add");}
      else if(e.key==="k"&&!e.ctrlKey&&!e.metaKey){e.preventDefault();document.getElementById("cm-search")?.focus();}
      else if(e.key==="b"&&!e.ctrlKey&&!e.metaKey){setNotifOpen(s=>!s);}
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[currentUser]);

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session){
        const {data:roles}=await supabase.from("user_roles").select("*").eq("user_id",session.user.id);
        const rd=roles?.[0];
        setCurrentUser({...session.user,role:rd?.role||"staff",displayName:rd?.name||session.user.email.split("@")[0],company_id:rd?.company_id||null,allRoles:roles||[],avatar_url:rd?.avatar_url||null,username:rd?.username||null});
      }
      setAuthChecked(true);
    });
    supabase.auth.onAuthStateChange(async(event,session)=>{if(!session)setCurrentUser(null);});
  },[]);

  const refreshCurrentUser=useCallback(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(session){
      const {data:roles}=await supabase.from("user_roles").select("*").eq("user_id",session.user.id);
      const rd=roles?.[0];
      setCurrentUser({...session.user,role:rd?.role||"staff",displayName:rd?.name||session.user.email.split("@")[0],company_id:rd?.company_id||null,allRoles:roles||[],avatar_url:rd?.avatar_url||null,username:rd?.username||null});
    }
  },[]);

  const loadClients=useCallback(async()=>{
    setLoading(true);
    const cid=selectedCompany||currentUser?.company_id;
    const isSuperAdmin=currentUser?.role==="superadmin";
    const q=supabase.from("clients").select("*").order("name");
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

  const loadCompany=useCallback(async()=>{
    if(!currentUser)return;
    const cid=selectedCompany||currentUser.company_id;
    if(!cid)return;
    const {data}=await supabase.from("companies").select("*").eq("id",cid).single();
    if(data)setCompany(data);
  },[currentUser,selectedCompany]);

  useEffect(()=>{if(currentUser){loadClients();loadCompany();loadPermissions(activeCompanyId);}},[currentUser,selectedCompany,searchAllCompanies,loadClients,loadCompany]);

  const activeCompanyId=selectedCompany||currentUser?.company_id;

  const logAudit=async(action,clientName,{details="",clientId=null,section=""}={})=>{
    if(!currentUser)return;
    const payload={
      action,
      client_name:clientName||"",
      performed_by:currentUser.displayName||currentUser.email,
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
    setSelected(null);setView("dashboard");setDeleteConfirm(false);
  };

  const restoreClient=async(client)=>{
    const {error:err}=await supabase.from("clients").update({archived:false}).eq("id",client.id);
    if(err){setError(err.message);return;}
    await logAudit("Restored client",client.name,{clientId:client.id,section:"Client Profile",details:"Client restored from archived state"});
    await loadClients();
    setSelected(null);setView("dashboard");
  };

  const inlineUpdate=async(field,value)=>{
    if(!selected)return;
    const{error}=await supabase.from("clients").update({[field]:JSON.stringify(value)}).eq("id",selected.id);
    if(!error){
      setClients(cs=>cs.map(c=>c.id===selected.id?{...c,[field]:value}:c));
      setSelected(s=>({...s,[field]:value}));
    }
  };

  const bulkArchive=async()=>{
    const ids=[...bulkSelected];
    await Promise.all(ids.map(id=>supabase.from("clients").update({archived:true}).eq("id",id)));
    await loadClients();setBulkSelected(new Set());setBulkMode(false);
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
  };

  const hardDeleteClient=async()=>{
    const {error:err}=await supabase.from("clients").delete().eq("id",selected.id);
    if(err){setError(err.message);return;}
    await logAudit("Permanently deleted client",selected.name,{section:"Client Profile",details:"Client record permanently removed from system"});
    setClients(c=>c.filter(x=>x.id!==selected.id));
    setSelected(null);setView("dashboard");setDeleteConfirm(false);
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
  };

  const exportPDF=()=>{
    const companyLabel=searchAllCompanies?"All Companies":(company?.name||"CareManager");
    const rowsHtml=filtered.map(c=>`
      <tr>
        <td>${c.name}</td>
        <td>${c.status||"Active"}</td>
        <td>${c.date_of_birth||"—"}</td>
        <td>${calcAge(c.date_of_birth)??("—")}</td>
        <td>${c.room_or_address||"—"}</td>
        <td>${(c.diagnoses||[]).filter(d=>d.value).map(d=>d.value).join(", ")||"—"}</td>
        <td>${(c.medications||[]).filter(m=>m.name).length}</td>
        ${searchAllCompanies?`<td>${companiesMap[c.company_id]||"—"}</td>`:""}
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
      <div class="meta">Exported ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})} &bull; ${filtered.length} clients &bull; Filter: ${statusFilter}</div>
      <table><thead><tr>
        <th>Name</th><th>Status</th><th>DOB</th><th>Age</th><th>Room/Address</th><th>Diagnoses</th><th>Meds</th>
        ${searchAllCompanies?"<th>Company</th>":""}
      </tr></thead><tbody>${rowsHtml}</tbody></table>
    </body></html>`);
    win.document.close();
    setTimeout(()=>win.print(),400);
  };

  const handleLogout=async()=>{await supabase.auth.signOut();setCurrentUser(null);};

  const filtered=clients.filter(c=>{
    const q=search.toLowerCase();
    const ms=c.name.toLowerCase().includes(q)||(c.room_or_address||"").toLowerCase().includes(q)||(c.azv_number||"").toLowerCase().includes(q)||(searchAllCompanies&&(companiesMap[c.company_id]||"").toLowerCase().includes(q));
    if(statusFilter==="Archived")return ms&&c.archived===true;
    const mst=statusFilter==="All"||(c.status||"Active")===statusFilter;
    return ms&&mst&&!c.archived;
  });

  const noteResults=search.trim().length>1&&searchMode==="notes"
    ?clients.flatMap(c=>(c.session_notes||[]).filter(n=>n.text&&n.text.toLowerCase().includes(search.toLowerCase())).map(n=>({...n,clientName:c.name,client:c}))).sort((a,b)=>b.date.localeCompare(a.date))
    :[];

  if(!authChecked)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#1c1f2e",color:"#6366f1",fontSize:18,fontFamily:"serif"}}>Loading...</div>;
  if(!currentUser)return lang?<Login onLogin={setCurrentUser} t={t}/>:<LangPicker onSelect={selectLang}/>;
  if(!lang)return <LangPicker onSelect={selectLang}/>;
  if(currentUser.role==="superadmin"&&!selectedCompany||currentUser?.allRoles?.length>1&&!selectedCompany){
    return <CompanyPicker currentUser={currentUser} onSelect={(cid,role)=>{
      setSelectedCompany(cid);
      setCurrentUser(u=>({...u,role:role||u.role}));
    }} t={t}/>;
  }

  return(
    <div style={{minHeight:"100vh",background:"#1c1f2e",fontFamily:"Inter,Helvetica Neue,sans-serif"}}>
      <style dangerouslySetInnerHTML={{__html:GCSS}}/>
      <div className="mob-hdr">
        <button onClick={()=>setSidebarOpen(o=>!o)} style={{background:"none",border:"none",color:"#94a3b8",fontSize:22}}>=</button>
        <span style={{fontFamily:"Playfair Display,serif",fontSize:16,fontWeight:700,color:"#f1f5f9"}}>CareManager</span>
        {can(currentUser.role,"add")&&<button onClick={()=>{setSelected(null);setView("add");setSidebarOpen(false);}} style={{background:"#6366f1",border:"none",color:"#fff",borderRadius:8,padding:"6px 12px",fontSize:13,fontWeight:700}}>+</button>}
      </div>
      <div className={"overlay"+(sidebarOpen?" show":"")} onClick={()=>setSidebarOpen(false)}/>
      <div style={{display:"flex",minHeight:"100vh"}}>
        <div className={"sidebar"+(sidebarOpen?" open":"")} style={{width:280,background:"#1a1d2b",boxShadow:"6px 0 18px rgba(0,0,0,0.45)",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"20px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontFamily:"Playfair Display,serif",fontSize:20,fontWeight:700,color:"#f1f5f9",marginBottom:2}}>CareManager</div>
            <div style={{fontSize:11,color:"#475569",letterSpacing:0.5,textTransform:"uppercase",marginBottom:12}}>Elder Care Platform</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div onClick={()=>{if(["admin","superadmin"].includes(currentUser.role)){setView("profile");setSelected(null);setSidebarOpen(false);}}} style={{cursor:["admin","superadmin"].includes(currentUser.role)?"pointer":"default",display:"flex",alignItems:"center",gap:8}}>
                {currentUser.avatar_url?<img src={currentUser.avatar_url} alt="avatar" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",border:"2px solid #6366f1"}}/>:<div style={{width:32,height:32,borderRadius:"50%",background:"#6366f1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff"}}>{(currentUser.displayName||"?")[0].toUpperCase()}</div>}
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#f1f5f9"}}>{currentUser.displayName}</div>
                  <div style={{fontSize:11,color:currentUser.role==="superadmin"?"#f59e0b":currentUser.role==="admin"?"#a78bfa":currentUser.role==="power_user"?"#34d399":"#64748b"}}>{currentUser.role==="superadmin"?"Super Admin":currentUser.role==="admin"?"Admin":currentUser.role==="power_user"?"Power User":currentUser.role==="inactive"?"Inactive":"Staff"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {(()=>{const notifs=buildNotifications(clients);const unread=notifs.filter(n=>!readNotifIds.has(n.id)).length;return(
                  <button onClick={()=>setNotifOpen(o=>!o)} title="Notifications (b)" style={{position:"relative",background:"none",border:"1px solid #334155",borderRadius:7,padding:"4px 9px",color:"#64748b",fontSize:14}}>
                    🔔{unread>0&&<span style={{position:"absolute",top:-5,right:-5,background:"#ef4444",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{unread>9?"9+":unread}</span>}
                  </button>
                );})()}
                <button onClick={()=>setDarkMode(d=>!d)} title="Toggle light/dark" style={{background:"none",border:"1px solid #334155",borderRadius:7,padding:"4px 9px",color:"#64748b",fontSize:14}}>{darkMode?"☀️":"🌙"}</button>
                <button onClick={handleLogout} style={{background:"none",border:"1px solid #334155",borderRadius:7,padding:"4px 10px",color:"#64748b",fontSize:11,fontWeight:600}}>{t.signOut}</button>
              </div>
            </div>
          </div>
          {company?.logo_url&&(
            <div style={{padding:"14px 20px 10px",borderBottom:"1px solid #1e293b",textAlign:"center",background:"#1c1f2e"}}>
              <div style={{background:"#fff",borderRadius:12,padding:"10px 12px",display:"inline-block",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
                <img src={company.logo_url} alt={company.name||"Company logo"} style={{maxHeight:72,maxWidth:200,objectFit:"contain",display:"block"}}/>
              </div>
              {company.name&&<div style={{fontSize:11,color:"#64748b",marginTop:8,fontWeight:600,letterSpacing:0.3}}>{company.name}</div>}
              {company.mission_statement&&<div style={{fontSize:10,color:"#475569",marginTop:2,fontStyle:"italic",lineHeight:1.4,padding:"0 4px"}}>"{company.mission_statement}"</div>}
            </div>
          )}
          {(currentUser?.allRoles||[]).length>1&&(
            <div style={{padding:"8px 20px",borderBottom:"1px solid #334155",textAlign:"center"}}>
              <button onClick={()=>{setSelectedCompany(null);setCompany(null);setClients([]);setSelected(null);setView("dashboard");}}
                style={{padding:"5px 0",borderRadius:20,border:"1px solid #334155",background:"transparent",color:"#64748b",fontSize:11,fontWeight:600,width:"100%"}}>
                🔄 Switch Company
              </button>
            </div>
          )}
          <div style={{padding:"12px 12px 6px"}}>
            <button onClick={()=>{setView("dashboard");setSelected(null);setSidebarOpen(false);}}
              style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",background:view==="dashboard"?"rgba(99,102,241,0.15)":"transparent",boxShadow:view==="dashboard"?"inset 3px 3px 7px rgba(0,0,0,0.4), inset -1px -1px 4px rgba(255,255,255,0.03)":"none",color:view==="dashboard"?"#7dd3fc":"#64748b",fontWeight:600,fontSize:13,textAlign:"left",marginBottom:2}}>
              Dashboard
            </button>
            {can(currentUser.role,"audit")&&(
              <button onClick={()=>{setView("audit");setSelected(null);setSidebarOpen(false);}}
                style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",background:view==="audit"?"rgba(99,102,241,0.15)":"transparent",boxShadow:view==="audit"?"inset 3px 3px 7px rgba(0,0,0,0.4), inset -1px -1px 4px rgba(255,255,255,0.03)":"none",color:view==="audit"?"#7dd3fc":"#64748b",fontWeight:600,fontSize:13,textAlign:"left",marginBottom:2}}>
                {t.auditTrail}
              </button>
            )}
            {can(currentUser.role,"company")&&(
              <button onClick={()=>{setView("company");setSelected(null);setSidebarOpen(false);}}
                style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",background:view==="company"?"rgba(99,102,241,0.15)":"transparent",boxShadow:view==="company"?"inset 3px 3px 7px rgba(0,0,0,0.4), inset -1px -1px 4px rgba(255,255,255,0.03)":"none",color:view==="company"?"#7dd3fc":"#64748b",fontWeight:600,fontSize:13,textAlign:"left",marginBottom:2}}>
                🏢 Company Settings
              </button>
            )}
            {can(currentUser.role,"users")&&(
              <button onClick={()=>{setView("users");setSelected(null);setSidebarOpen(false);}}
                style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",background:view==="users"?"rgba(99,102,241,0.15)":"transparent",boxShadow:view==="users"?"inset 3px 3px 7px rgba(0,0,0,0.4), inset -1px -1px 4px rgba(255,255,255,0.03)":"none",color:view==="users"?"#7dd3fc":"#64748b",fontWeight:600,fontSize:13,textAlign:"left",marginBottom:2}}>
                👥 User Management
              </button>
            )}
            {can(currentUser.role,"permissions")&&(
              <button onClick={()=>{setView("permissions");setSelected(null);setSidebarOpen(false);}}
                style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",background:view==="permissions"?"rgba(99,102,241,0.15)":"transparent",boxShadow:view==="permissions"?"inset 3px 3px 7px rgba(0,0,0,0.4), inset -1px -1px 4px rgba(255,255,255,0.03)":"none",color:view==="permissions"?"#7dd3fc":"#64748b",fontWeight:600,fontSize:13,textAlign:"left",marginBottom:2}}>
                🔐 Permissions
              </button>
            )}
          </div>
          <div style={{padding:"0 12px 8px"}}>
            <div style={{display:"flex",gap:4,marginBottom:6}}>
              {[["clients","Clients"],["notes","Notes"]].map(([mode,label])=>(
                <button key={mode} onClick={()=>{setSearchMode(mode);setSearch("");}}
                  style={{flex:1,padding:"5px",borderRadius:7,border:"none",background:searchMode===mode?"rgba(99,102,241,0.15)":"#0f172a",color:searchMode===mode?"#6366f1":"#475569",fontSize:11,fontWeight:700}}>
                  {label}
                </button>
              ))}
            </div>
            <input id="cm-search" style={{...INP,background:"#0f172a",borderColor:"#1e293b"}} placeholder={searchMode==="notes"?t.searchNotes:t.search} value={search} onChange={e=>setSearch(e.target.value)}/>
            {currentUser?.role==="superadmin"&&(
              <button onClick={()=>{setSearchAllCompanies(s=>!s);setSearch("");}}
                style={{width:"100%",marginTop:6,padding:"5px",borderRadius:7,border:"1px solid "+(searchAllCompanies?"#6366f1":"#334155"),background:searchAllCompanies?"rgba(99,102,241,0.12)":"transparent",color:searchAllCompanies?"#6366f1":"#475569",fontSize:10,fontWeight:700}}>
                🌐 {searchAllCompanies?"All Companies (on)":"Search All Companies"}
              </button>
            )}
          </div>
          <div style={{padding:"0 12px 4px",display:"flex",gap:3,flexWrap:"wrap"}}>
            {["Active","Inactive","Discharged","All","Archived"].map(s=>{
              const cols={Active:"#10b981",Inactive:"#f59e0b",Discharged:"#8b5cf6",All:"#6366f1",Archived:"#ef4444"};
              const active=statusFilter===s;
              return(
                <button key={s} onClick={()=>setStatusFilter(s)}
                  style={{flex:1,padding:"4px 2px",borderRadius:7,border:"none",background:active?cols[s]+"20":"#0f172a",color:active?cols[s]:"#475569",fontSize:10,fontWeight:700,minWidth:0}}>
                  {s==="Active"?"Act":s==="Inactive"?"Inac":s==="Discharged"?"Disc":s==="Archived"?"Arc":"All"}
                </button>
              );
            })}
          </div>
          <div style={{padding:"2px 12px 4px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:10,color:"#475569",fontWeight:600}}>{filtered.length} clients</span>
            <button onClick={()=>{setBulkMode(b=>!b);setBulkSelected(new Set());}}
              style={{background:bulkMode?"rgba(99,102,241,0.15)":"none",border:"1px solid "+(bulkMode?"#6366f1":"#334155"),borderRadius:6,padding:"2px 8px",color:bulkMode?"#6366f1":"#475569",fontSize:10,fontWeight:700}}>
              {bulkMode?"✕ Cancel":"☑ Select"}
            </button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"0 8px"}}>
            {filtered.length===0&&<div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"24px 10px"}}>{clients.length===0?t.noClients:t.noResults}</div>}
            {filtered.map(c=>{
              const isActive=selected?.id===c.id&&view!=="add";
              const color=avatarColor(c.name);
              const age=calcAge(c.date_of_birth);
              const scols={Active:"#10b981",Inactive:"#f59e0b",Discharged:"#8b5cf6"};
              const isChecked=bulkSelected.has(c.id);
              const fr=calcFallRisk(c);
              return(
                <button key={c.id} onClick={()=>{
                  if(bulkMode){
                    setBulkSelected(prev=>{const n=new Set(prev);if(n.has(c.id))n.delete(c.id);else n.add(c.id);return n;});
                  } else {
                    setSelected(c);setView("detail");setDeleteConfirm(false);setSidebarOpen(false);trackRecent(c);
                  }
                }}
                  className="client-row" style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 8px",borderRadius:10,border:"none",background:isChecked?"rgba(99,102,241,0.15)":isActive?"rgba(99,102,241,0.12)":c.archived?"rgba(239,68,68,0.04)":"transparent",cursor:"pointer",marginBottom:2,textAlign:"left"}}>
                  {bulkMode&&(
                    <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(isChecked?"#6366f1":"#475569"),background:isChecked?"#6366f1":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,color:"#fff",fontWeight:700}}>{isChecked?"✓":""}</div>
                  )}
                  <div style={{width:36,height:36,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0,overflow:"hidden",border:isActive?"2px solid #6366f1":"2px solid transparent",opacity:c.archived?0.5:1}}>
                    {c.photo_url?<img src={c.photo_url} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials(c.name)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{color:c.archived?"#64748b":"#e2e8f0",fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                      {c.archived&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:10,background:"rgba(239,68,68,0.15)",color:"#f87171",flexShrink:0}}>Arc</span>}
                      {!c.archived&&(c.status||"Active")!=="Active"&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:10,background:(scols[c.status]||"#64748b")+"20",color:scols[c.status]||"#64748b",flexShrink:0}}>{c.status}</span>}
                      {fr.level!=="Low"&&<span style={{fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:10,background:fr.color+"20",color:fr.color,flexShrink:0}}>{fr.level[0]}FR</span>}
                    </div>
                    <div style={{color:"#475569",fontSize:11}}>{age!==null?"Age "+age:""}{c.room_or_address?(age!==null?" - ":"")+c.room_or_address:""}</div>
                    {searchAllCompanies&&companiesMap[c.company_id]&&<div style={{color:"#6366f1",fontSize:10,fontWeight:600}}>{companiesMap[c.company_id]}</div>}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{padding:12}}>
            {bulkMode&&bulkSelected.size>0&&(
              <div style={{marginBottom:8,display:"flex",flexDirection:"column",gap:6}}>
                <div style={{fontSize:12,color:"#a5b4fc",fontWeight:700,textAlign:"center"}}>{bulkSelected.size} client{bulkSelected.size!==1?"s":""} selected</div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={bulkExportCSV}
                    style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #6366f1",background:"rgba(99,102,241,0.1)",color:"#6366f1",fontSize:11,fontWeight:700}}>
                    ⬇ Export
                  </button>
                  {can(currentUser.role,"delete")&&statusFilter!=="Archived"&&(
                    <button onClick={bulkArchive}
                      style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #f59e0b",background:"rgba(245,158,11,0.1)",color:"#f59e0b",fontSize:11,fontWeight:700}}>
                      📦 Archive
                    </button>
                  )}
                </div>
              </div>
            )}
            {!bulkMode&&can(currentUser.role,"add")&&(
              <button onClick={()=>{setSelected(null);setView("add");setSidebarOpen(false);}}
                style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:"#6366f1",color:"#fff",fontWeight:700,fontSize:14}}>
                {t.newClient}
              </button>
            )}
            {!bulkMode&&filtered.length>0&&(
              <div style={{display:"flex",gap:6,marginTop:8}}>
                <button onClick={exportCSV}
                  style={{flex:1,padding:"7px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#64748b",fontSize:11,fontWeight:700}}>
                  ⬇ CSV
                </button>
                <button onClick={exportPDF}
                  style={{flex:1,padding:"7px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#64748b",fontSize:11,fontWeight:700}}>
                  🖨 PDF
                </button>
              </div>
            )}
          </div>
          <div style={{padding:"0 12px 8px",display:"flex",justifyContent:"center",gap:4,flexWrap:"wrap"}}>
            {LANG_OPTIONS.map(l=>(
              <button key={l.code} onClick={()=>selectLang(l.code)} title={l.label}
                style={{background:lang===l.code?"rgba(99,102,241,0.2)":"transparent",border:"none",borderRadius:6,padding:"4px 6px",fontSize:11,fontWeight:800,color:lang===l.code?"#6366f1":"#475569"}}>
                {l.emoji}
              </button>
            ))}
            <button onClick={()=>setShowShortcuts(true)} title="Keyboard shortcuts (?)" style={{background:"transparent",border:"none",borderRadius:6,padding:"4px 6px",fontSize:11,fontWeight:800,color:"#334155"}}>⌨️</button>
          </div>
          <div style={{padding:"0 12px 16px",color:"#334155",fontSize:11,textAlign:"center"}}>
            {clients.length} {t.clients} - {t.synced}
          </div>
        </div>
        <div className="main-pad" style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
          {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:"12px 16px",marginBottom:20,color:"#ef4444",fontSize:14}}>{error}</div>}
          {loading&&view==="dashboard"&&<div style={{color:"#475569",textAlign:"center",padding:"60px 0"}}>Loading...</div>}
          {!loading&&view==="audit"&&currentUser.role==="superadmin"&&<AuditTrail t={t} companyId={activeCompanyId} currentUser={currentUser}/>}
          {!loading&&view==="company"&&currentUser.role==="superadmin"&&(
            <CompanyView company={company} onUpdate={updated=>{setCompany(updated);}} currentUser={currentUser} t={t}/>
          )}
          {!loading&&view==="profile"&&["admin","superadmin"].includes(currentUser.role)&&(
            <UserProfile
              currentUser={currentUser}
              onUpdate={updated=>setCurrentUser(updated)}
              onClose={()=>setView("dashboard")}
              t={t}
            />
          )}
          {!loading&&view==="users"&&can(currentUser.role,"users")&&(
            <UserManagement currentUser={currentUser} onRoleChange={refreshCurrentUser} activeCompanyId={activeCompanyId} t={t} logAudit={logAudit}/>
          )}
          {!loading&&view==="permissions"&&can(currentUser.role,"permissions")&&(
            <PermissionsPanel activeCompanyId={activeCompanyId} currentUser={currentUser} t={t}/>
          )}
          {!loading&&view!=="audit"&&searchMode==="notes"&&search.trim().length>1?(
            <div>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:24,color:"#f1f5f9",marginBottom:6}}>{t.noteSearch}</div>
              <div style={{color:"#64748b",fontSize:13,marginBottom:20}}>{noteResults.length} {t.noteSearchFor} "{search}"</div>
              {noteResults.length===0?<div style={{color:"#475569",fontSize:14,textAlign:"center",padding:"40px 0"}}>{t.noNoteResults} "{search}"</div>:(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {noteResults.map((n,i)=>(
                    <div key={i} onClick={()=>{setSelected(n.client);setView("detail");setSearch("");setSearchMode("clients");setSidebarOpen(false);trackRecent(n.client);}}
                      style={{background:"#1c1f2e",border:"1px solid #334155",borderRadius:12,padding:"14px 18px",cursor:"pointer"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(n.clientName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{initials(n.clientName)}</div>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,color:"#f1f5f9"}}>{n.clientName}</div>
                          <div style={{fontSize:12,color:"#64748b"}}>{new Date(n.date+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}{n.role&&" - "+n.role}{n.staff_name&&" - "+n.staff_name}</div>
                        </div>
                      </div>
                      <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>
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
              {recentClients.length>0&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#475569",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>⏱ Recently Viewed</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {recentClients.map(rc=>{
                      const full=clients.find(c=>c.id===rc.id);
                      return(
                        <button key={rc.id} onClick={()=>{const c=full||rc;setSelected(c);setView("detail");trackRecent(c);}}
                          className="client-row" style={{display:"flex",alignItems:"center",gap:8,background:"#1c1f2e",boxShadow:"4px 4px 10px rgba(0,0,0,0.45), -2px -2px 6px rgba(255,255,255,0.03)",borderRadius:10,padding:"7px 12px",cursor:"pointer",maxWidth:180,border:"none"}}>
                          <div style={{width:28,height:28,borderRadius:"50%",background:avatarColor(rc.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0,overflow:"hidden"}}>
                            {rc.photo_url?<img src={rc.photo_url} alt={rc.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials(rc.name)}
                          </div>
                          <span style={{fontSize:12,fontWeight:600,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{rc.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:700,color:"#475569",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>📝 Quick Note</div>
                <div style={{background:"#1c1f2e",border:"1px solid #334155",borderRadius:10,overflow:"hidden"}}>
                  <textarea value={dashNote} onChange={e=>{setDashNote(e.target.value);localStorage.setItem("cm-dash-note",e.target.value);}}
                    placeholder="Jot a reminder, task, or note... (auto-saved)"
                    rows={3}
                    style={{width:"100%",background:"transparent",border:"none",padding:"12px 14px",color:"#e2e8f0",fontSize:13,resize:"vertical",fontFamily:"Inter,sans-serif",lineHeight:1.6}}/>
                  <div style={{padding:"4px 14px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:10,color:"#334155"}}>Auto-saved · personal to this browser</span>
                    {dashNote&&<button onClick={()=>{setDashNote("");localStorage.removeItem("cm-dash-note");}} style={{background:"none",border:"none",color:"#475569",fontSize:10,cursor:"pointer",fontWeight:600}}>Clear</button>}
                  </div>
                </div>
              </div>
              <Dashboard clients={clients} onSelect={c=>{setSelected(c);setView("detail");trackRecent(c);}} t={t} currentUser={currentUser}/>
            </>
          )}
          {view==="add"&&can(currentUser.role,"add")&&(
            <div>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:26,color:"#f1f5f9",marginBottom:24}}>{t.newClient}</div>
              <ClientForm client={emptyClient()} onSave={saveClient} onCancel={()=>setView(selected?"detail":"dashboard")} saving={saving} t={t} currentUser={currentUser}/>
            </div>
          )}
          {view==="edit"&&selected&&can(currentUser.role,"edit")&&(
            <div>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:26,color:"#f1f5f9",marginBottom:24}}>Edit - {selected.name}</div>
              <ClientForm client={selected} onSave={saveClient} onCancel={()=>setView("detail")} saving={saving} t={t} currentUser={currentUser}/>
            </div>
          )}
          {view==="detail"&&selected&&(()=>{
            const fresh=clients.find(c=>c.id===selected.id)||selected;
            return(
              <>
                <ClientDetail client={fresh} onEdit={()=>{setSelected(fresh);setView("edit");}} onDelete={()=>setDeleteConfirm(true)} onRestore={()=>restoreClient(fresh)} onInlineUpdate={inlineUpdate} t={t} currentUser={currentUser}/>
                {deleteConfirm&&(
                  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
                    <div style={{background:"#1c1f2e",borderRadius:16,padding:32,maxWidth:400,width:"90%",border:"1px solid #334155"}}>
                      {fresh.archived?(
                        <>
                          <div style={{fontFamily:"Playfair Display,serif",fontSize:20,marginBottom:10,color:"#f1f5f9"}}>🗑️ Permanently Delete</div>
                          <div style={{color:"#64748b",marginBottom:6}}>This will <strong style={{color:"#ef4444"}}>permanently delete</strong> <strong style={{color:"#f1f5f9"}}>{fresh.name}</strong>. This cannot be undone.</div>
                          <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#f87171",marginBottom:20}}>⚠️ All clinical data, notes, and documents will be lost forever.</div>
                          <div style={{display:"flex",gap:10}}>
                            <button onClick={()=>setDeleteConfirm(false)} style={{flex:1,padding:"10px",borderRadius:9,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontWeight:600}}>{t.cancel}</button>
                            <button onClick={hardDeleteClient} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:"#ef4444",color:"#fff",fontWeight:700}}>Delete Forever</button>
                          </div>
                        </>
                      ):(
                        <>
                          <div style={{fontFamily:"Playfair Display,serif",fontSize:20,marginBottom:10,color:"#f1f5f9"}}>📦 Archive Client</div>
                          <div style={{color:"#64748b",marginBottom:6}}>Archive <strong style={{color:"#f1f5f9"}}>{fresh.name}</strong>? They will be hidden from the active list but all data is preserved.</div>
                          <div style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#a5b4fc",marginBottom:20}}>✓ You can restore this client at any time from the Archived filter.</div>
                          <div style={{display:"flex",gap:10}}>
                            <button onClick={()=>setDeleteConfirm(false)} style={{flex:1,padding:"10px",borderRadius:9,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontWeight:600}}>{t.cancel}</button>
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
        </div>
      </div>

      {/* ═══ NOTIFICATION PANEL ═══ */}
      {notifOpen&&(()=>{
        const notifs=buildNotifications(clients);
        const markAllRead=()=>{
          const all=new Set([...readNotifIds,...notifs.map(n=>n.id)]);
          setReadNotifIds(all);
          localStorage.setItem("cm-read-notifs",JSON.stringify([...all]));
        };
        const urgColor={high:"#ef4444",medium:"#f59e0b",low:"#6366f1"};
        const EPREF_LABELS=[["doc_expiry","Document expiry alerts"],["fall_risk","High fall risk alerts"],["incidents","New incident reports"],["appointments","Appointment reminders"]];
        return(
          <div className="notif-panel" style={{position:"fixed",top:0,right:0,width:360,height:"100vh",background:"#1c1f2e",borderLeft:"1px solid #334155",zIndex:300,display:"flex",flexDirection:"column",boxShadow:"-8px 0 32px rgba(0,0,0,0.4)"}}>
            <div style={{padding:"18px 20px",borderBottom:"1px solid #334155",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontFamily:"Playfair Display,serif",fontSize:17,fontWeight:700,color:"#f1f5f9"}}>🔔 Notifications</div>
                <div style={{fontSize:11,color:"#475569",marginTop:2}}>{notifs.filter(n=>!readNotifIds.has(n.id)).length} unread · {notifs.length} total</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {notifs.some(n=>!readNotifIds.has(n.id))&&(
                  <button onClick={markAllRead} style={{padding:"5px 10px",borderRadius:7,border:"1px solid #334155",background:"transparent",color:"#64748b",fontSize:11,fontWeight:600}}>Mark all read</button>
                )}
                <button onClick={()=>setNotifOpen(false)} style={{padding:"5px 10px",borderRadius:7,border:"none",background:"#0f172a",color:"#64748b",fontSize:16,fontWeight:700}}>×</button>
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto"}}>
              {notifs.length===0?(
                <div style={{padding:40,textAlign:"center",color:"#475569"}}>
                  <div style={{fontSize:32,marginBottom:8}}>✅</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#64748b"}}>All clear!</div>
                  <div style={{fontSize:12,marginTop:4}}>No expiring documents, upcoming appointments, or incidents in the last 7 days.</div>
                </div>
              ):notifs.map(n=>{
                const isRead=readNotifIds.has(n.id);
                const markRead=()=>{const s=new Set([...readNotifIds,n.id]);setReadNotifIds(s);localStorage.setItem("cm-read-notifs",JSON.stringify([...s]));};
                return(
                  <div key={n.id} onClick={()=>{markRead();if(n.clientId){const c=clients.find(x=>x.id===n.clientId);if(c){setSelected(c);setView("detail");trackRecent(c);setNotifOpen(false);}}}}
                    style={{padding:"14px 20px",borderBottom:"1px solid #1a2540",cursor:n.clientId?"pointer":"default",background:isRead?"transparent":"rgba(99,102,241,0.04)",display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{fontSize:20,flexShrink:0,marginTop:1}}>{n.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:isRead?"transparent":urgColor[n.urgency],flexShrink:0,display:"block"}}/>
                        <span style={{fontSize:12,fontWeight:700,color:isRead?"#475569":"#e2e8f0"}}>{n.title}</span>
                      </div>
                      <div style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{n.body}</div>
                      {n.clientName&&<div style={{fontSize:10,color:"#6366f1",fontWeight:600,marginTop:4}}>→ {n.clientName}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Email alert preferences */}
            <div style={{borderTop:"1px solid #334155",padding:"14px 20px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#475569",letterSpacing:0.5,marginBottom:10}}>📧 EMAIL ALERT PREFERENCES</div>
              {EPREF_LABELS.map(([key,label])=>(
                <label key={key} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,cursor:"pointer"}}>
                  <input type="checkbox" checked={!!emailPrefs[key]} onChange={e=>{const p={...emailPrefs,[key]:e.target.checked};setEmailPrefs(p);localStorage.setItem("cm-email-prefs",JSON.stringify(p));}} style={{accentColor:"#6366f1",width:14,height:14}}/>
                  <span style={{fontSize:12,color:"#94a3b8"}}>{label}</span>
                </label>
              ))}
              <div style={{fontSize:10,color:"#334155",marginTop:6}}>Email delivery requires server configuration</div>
            </div>
          </div>
        );
      })()}
      {notifOpen&&<div onClick={()=>setNotifOpen(false)} style={{position:"fixed",inset:0,zIndex:299}}/>}

      {/* ═══ KEYBOARD SHORTCUTS MODAL ═══ */}
      {showShortcuts&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#1c1f2e",border:"1px solid #334155",borderRadius:16,padding:32,maxWidth:460,width:"100%",boxShadow:"0 24px 60px rgba(0,0,0,0.5)"}}>
            <div style={{fontFamily:"Playfair Display,serif",fontSize:20,fontWeight:700,color:"#f1f5f9",marginBottom:4}}>⌨️ Keyboard Shortcuts</div>
            <div style={{fontSize:12,color:"#475569",marginBottom:20}}>Works when no input is focused</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["d","Dashboard"],["n","New client"],["k","Focus search"],["b","Notifications"],["?","This help"],["Esc","Close panels"]].map(([key,desc])=>(
                <div key={key} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid #1a2540"}}>
                  <span className="shortcut-key">{key}</span>
                  <span style={{fontSize:13,color:"#94a3b8"}}>{desc}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowShortcuts(false)}
              style={{marginTop:20,width:"100%",padding:"10px",borderRadius:9,border:"1px solid #334155",background:"transparent",color:"#64748b",fontWeight:600,fontSize:14}}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// cache bust Sat May 23 13:21:22 UTC 2026
