import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const SUPABASE_URL = "https://kpwzeawgrqdsezflvjkm.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwd3plYXdncnFkc2V6Zmx2amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Mzc1MzIsImV4cCI6MjA5NTExMzUzMn0.-fvmwgZqwyddWyq1IJ4vcHvsTVMpPmhI72p4hyCtC6E";
const SERVICE_KEY = "";

const supabase = createClient(SUPABASE_URL, ANON_KEY);
const supabaseAdmin = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : supabase;
const GCSS = [
  "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');",
  "* { box-sizing: border-box; margin: 0; padding: 0; }",
  "body { font-family: Inter, sans-serif; background: #0f172a; color: #e2e8f0; }",
  "input, textarea, select { font-family: inherit; }",
  "input:focus, textarea:focus, select:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }",
  "button { font-family: inherit; cursor: pointer; } button:hover { opacity: 0.88; }",
  "::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }",
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
  ".mob-hdr { display: none; align-items: center; justify-content: space-between; padding: 14px 20px; background: #1e293b; border-bottom: 1px solid #334155; position: sticky; top: 0; z-index: 100; }",
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
].join("\n");

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

function emptyClient(){return{
  id:uid(),name:"",date_of_birth:"",phone:"",room_or_address:"",
  emergency_contact:"",emergency_phone:"",azv_number:"",dr_di_cas:"",
  dr_specialista:"",photo_url:"",status:"Active",
  diagnoses:[{id:uid(),value:""}],
  medications:[{id:uid(),name:"",dosage:"",frequency:"",timing:{morning:false,afternoon:false,evening:false,night:false}}],
  allergies:[{id:uid(),value:""}],
  session_notes:[{id:uid(),date:tod(),role:"",staff_name:"",text:""}],
  vitals:[],care_plan:[],documents:[],inventory:[],
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
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#1e293b",border:"1px solid #334155",borderRadius:8,zIndex:999,boxShadow:"0 8px 24px rgba(0,0,0,0.4)",maxHeight:220,overflowY:"auto"}}>
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
    <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,marginBottom:16,overflow:"visible"}}>
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

function ClientForm({client,onSave,onCancel,saving,t}){
  const [d,setD]=useState(()=>JSON.parse(JSON.stringify(client)));
  const s=(f,v)=>setD(prev=>({...prev,[f]:v}));
  const valid=d.name.trim().length>0;
  const scols={Active:"#10b981",Inactive:"#f59e0b",Discharged:"#8b5cf6"};
  return(
    <div style={{paddingBottom:40}}>
      <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,marginBottom:16,overflow:"hidden"}}>
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
      <div style={{background:"#1e293b",borderRadius:16,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",border:"1px solid #334155"}}>
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

function ClientDetail({client,onEdit,onDelete,t,currentUser}){
  const role=currentUser?.role||"user";
  const canEdit=can(role,"edit");
  const canDelete=can(role,"delete");
  const [showEmerg,setShowEmerg]=useState(false);
  const age=calcAge(client.date_of_birth);
  const color=avatarColor(client.name);
  const {highRisk,polypharmacy,medCount}=getMedFlags(client);
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
        <button onClick={doExport} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#6366f1",color:"#fff",fontWeight:600,fontSize:13}}>Export PDF</button>
        <button onClick={()=>setShowEmerg(true)} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontWeight:600,fontSize:13}}>Emergency Card</button>
        <button onClick={doPrint} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontWeight:600,fontSize:13}}>Print</button>
        {canEdit&&<button onClick={onEdit} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #6366f1",background:"rgba(99,102,241,0.1)",color:"#6366f1",fontWeight:600,fontSize:13}}>{t.edit}</button>}
        {canDelete&&<button onClick={onDelete} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #ef4444",background:"rgba(239,68,68,0.1)",color:"#ef4444",fontWeight:600,fontSize:13}}>{t.delete}</button>}
        {!canEdit&&<span style={{fontSize:12,color:"#475569",alignSelf:"center",fontStyle:"italic"}}>View only</span>}
      </div>
      <div id="pz">
        <div className="ph" style={{textAlign:"center",borderBottom:"2px solid #6366f1",paddingBottom:12,marginBottom:20}}>
          <div style={{fontSize:22,fontWeight:700,color:"#1e293b",fontFamily:"serif"}}>CareManager - Client Profile</div>
          <div style={{fontSize:11,color:"#64748b",marginTop:4}}>Printed on {new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
        </div>
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:18,padding:20}}>
            <div style={{width:72,height:72,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:800,color:"#fff",flexShrink:0,overflow:"hidden"}}>
              {client.photo_url?<img src={client.photo_url} alt={client.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials(client.name)}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
                <span style={{fontFamily:"Playfair Display,serif",fontSize:24,fontWeight:700,color:"#f1f5f9"}}>{client.name}</span>
                <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,background:sc+"20",color:sc,border:"1px solid "+sc+"40"}}>{client.status||t.active}</span>
              </div>
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
          <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#f59e0b",fontSize:13,marginBottom:10}}>ALLERGIES</div>
            {fa.map(a=><span key={a.id} style={{display:"inline-block",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:20,padding:"3px 10px",fontSize:12,color:"#f59e0b",fontWeight:600,margin:2}}>{a.value}</span>)}
          </div>
        )}
        {fd.length>0&&(
          <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#06b6d4",fontSize:13,marginBottom:10}}>DIAGNOSES</div>
            {fd.map(d=><span key={d.id} style={{display:"inline-block",background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:20,padding:"3px 10px",fontSize:12,color:"#06b6d4",fontWeight:600,margin:2}}>{d.value}</span>)}
          </div>
        )}
        {fm.length>0&&(()=>{
          const sched=TSLOTS.map(slot=>({...slot,meds:fm.filter(m=>m.timing&&m.timing[slot.key])})).filter(s=>s.meds.length>0);
          const labs={morning:t.morning,afternoon:t.afternoon,evening:t.evening,night:t.night};
          return(
            <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:"16px 18px",marginBottom:14}}>
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
          <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:"16px 18px",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:700,color:"#10b981",fontSize:13}}>INVENTORY</div>
              <div style={{fontSize:12,color:"#64748b"}}>{(client.inventory||[]).length} items{(client.inventory||[]).reduce((s,i)=>s+(parseFloat(i.value)||0),0)>0&&" - AWG "+(client.inventory||[]).reduce((s,i)=>s+(parseFloat(i.value)||0),0).toFixed(2)}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {(client.inventory||[]).map(item=>{
                const cc={Excellent:"#10b981",Good:"#06b6d4",Fair:"#f59e0b",Poor:"#ef4444"};
                const c=cc[item.condition]||"#64748b";
                return(
                  <div key={item.id} style={{background:"#0f172a",borderRadius:8,overflow:"hidden",border:"1px solid #334155"}}>
                    {item.photo_url?<img src={item.photo_url} alt={item.name} style={{width:"100%",height:90,objectFit:"cover",display:"block"}}/>:<div style={{width:"100%",height:90,background:"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"#475569"}}>+</div>}
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
          <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:"16px 18px",marginBottom:14}}>
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
          <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:"16px 18px",marginBottom:14}}>
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
          <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:"16px 18px",marginBottom:14}}>
            <VitalsTracker vitals={client.vitals||[]} onChange={()=>{}} t={t}/>
          </div>
        )}
        {fn.length>0&&(
          <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:"16px 18px",marginBottom:14}}>
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
      {showEmerg&&<EmergCard client={client} onClose={()=>setShowEmerg(false)} t={t}/>}
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
  const expiring=clients.flatMap(c=>(c.documents||[]).filter(d=>d.expiry&&daysUntil(d.expiry)!==null&&daysUntil(d.expiry)<=60).map(d=>({...d,clientName:c.name,days:daysUntil(d.expiry),client:c})));
  const rn=clients.flatMap(c=>(c.session_notes||[]).filter(n=>n.text&&n.text.trim()).map(n=>({...n,clientName:c.name,client:c}))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const ag={"60-69":0,"70-79":0,"80-89":0,"90+":0,"Unknown":0};
  clients.forEach(c=>{const a=c.date_of_birth?calcAge(c.date_of_birth):null;if(a===null)ag["Unknown"]++;else if(a<70)ag["60-69"]++;else if(a<80)ag["70-79"]++;else if(a<90)ag["80-89"]++;else ag["90+"]++;});
  const sc={Active:clients.filter(c=>(c.status||"Active")==="Active").length,Inactive:clients.filter(c=>c.status==="Inactive").length,Discharged:clients.filter(c=>c.status==="Discharged").length};
  const scard=(icon,label,value,color)=>(
    <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:"20px 24px",display:"flex",alignItems:"center",gap:16}}>
      <div style={{width:48,height:48,borderRadius:12,background:color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{icon}</div>
      <div><div style={{fontSize:28,fontWeight:800,color:"#f1f5f9",lineHeight:1}}>{value}</div><div style={{fontSize:13,color:"#64748b",marginTop:4}}>{label}</div></div>
    </div>
  );
  return(
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:28,fontWeight:700,color:"#f1f5f9",marginBottom:4}}>{t.welcome}, {currentUser.displayName}!</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
          {Object.entries(sc).map(([s,c])=>{const cols={Active:"#10b981",Inactive:"#f59e0b",Discharged:"#8b5cf6"};const col=cols[s];return <span key={s} style={{fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:20,background:col+"20",color:col,border:"1px solid "+col+"40"}}>{s}: {c}</span>;})}
        </div>
      </div>
      <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
        {scard("👥",t.totalClients,total,"#6366f1")}
        {scard("💊",t.totalMeds,totalMeds,"#ef4444")}
        {scard("⚠️",t.allergyAlerts,totalAllergies,"#f59e0b")}
        {scard("🩺",t.diagnosesLogged,totalDiag,"#06b6d4")}
      </div>
      <div className="g2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20}}>
          <div style={{fontWeight:700,color:"#f59e0b",fontSize:13,marginBottom:14}}>ALLERGY ALERTS</div>
          {allergyClients.length===0?<div style={{color:"#475569",fontSize:13}}>{t.noAllergies}</div>:allergyClients.map(c=>(
            <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#0f172a",borderRadius:8,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(c.name)}</div>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:"#f1f5f9"}}>{c.name}</div><div style={{fontSize:12,color:"#f59e0b"}}>{(c.allergies||[]).filter(a=>a.value&&a.value.trim()).map(a=>a.value).join(", ")}</div></div>
            </div>
          ))}
        </div>
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20}}>
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
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,color:"#f59e0b",fontSize:13,marginBottom:14}}>DOCUMENT EXPIRY ALERTS</div>
          {expiring.map((d,i)=>{const badge=expiryBadge(d.days);return(
            <div key={i} onClick={()=>onSelect(d.client)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"#0f172a",borderRadius:8,cursor:"pointer",marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(d.clientName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{initials(d.clientName)}</div>
              <div style={{flex:1}}><span style={{fontWeight:700,fontSize:13,color:"#f1f5f9"}}>{d.clientName}</span><span style={{fontSize:12,color:"#64748b"}}> - {d.name}</span></div>
              {badge&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:badge.bg,color:badge.color,whiteSpace:"nowrap"}}>{d.days<0?"Expired":d.days+"d left"}</span>}
            </div>
          );})}
        </div>
      )}
      {flagged.length>0&&(
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,color:"#ef4444",fontSize:13,marginBottom:14}}>MEDICATION FLAGS</div>
          {flagged.map(c=>{const {highRisk,polypharmacy,medCount}=getMedFlags(c);return(
            <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#0f172a",borderRadius:8,cursor:"pointer",marginBottom:8}}>
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
      <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20}}>
        <div style={{fontWeight:700,color:"#7c3aed",fontSize:13,marginBottom:14}}>RECENT SESSION NOTES</div>
        {rn.length===0?<div style={{color:"#475569",fontSize:13}}>{t.noNotes}</div>:rn.map((n,i)=>(
          <div key={i} onClick={()=>onSelect(n.client)} style={{display:"flex",gap:12,padding:"10px 14px",background:"#0f172a",borderRadius:8,cursor:"pointer",marginBottom:8}}>
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

function AuditTrail({t,companyId}){
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [fS,setFS]=useState("");
  const [fA,setFA]=useState("");
  const [fD,setFD]=useState("");
  useEffect(()=>{
    const q=supabase.from("audit_log").select("*").order("performed_at",{ascending:false}).limit(500);
    (companyId?q.eq("company_id",companyId):q).then(({data})=>{setLogs(data||[]);setLoading(false);});
  },[companyId]);
  const sl=[...new Set(logs.map(l=>l.performed_by))].filter(Boolean);
  const al=[...new Set(logs.map(l=>l.action))].filter(Boolean);
  const filtered=logs.filter(l=>(!fS||l.performed_by===fS)&&(!fA||l.action===fA)&&(!fD||(l.performed_at&&l.performed_at.startsWith(fD))));
  const doExport=()=>{
    const rows=filtered.map(l=>"<tr><td>"+new Date(l.performed_at).toLocaleString("en-US")+"</td><td>"+(l.performed_by||"-")+"</td><td>"+(l.action||"-")+"</td><td>"+(l.client_name||"-")+"</td></tr>").join("");
    const style="body{font-family:Arial,sans-serif;padding:24px}h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f8f9fa;padding:8px;text-align:left;border-bottom:2px solid #dee2e6}td{padding:7px 8px;border-bottom:1px solid #f0f0f0}";
    const html="<!DOCTYPE html><html><head><title>Audit Trail</title><style>"+style+"</style></head><body><h1>Audit Trail</h1><p style='color:#6c757d;font-size:12px'>Exported "+new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})+" - "+filtered.length+" records</p><table><thead><tr><th>Date and Time</th><th>Staff</th><th>Action</th><th>Client</th></tr></thead><tbody>"+rows+"</tbody></table></body></html>";
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
      <div style={{color:"#64748b",fontSize:13,marginBottom:20}}>{filtered.length} {t.records}</div>
      <div className="fg" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
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
        <div><label style={LBL}>{t.filterDate}</label><input type="date" style={INP} value={fD} onChange={e=>setFD(e.target.value)}/></div>
      </div>
      <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,overflow:"hidden"}}>
        {loading?<div style={{padding:"40px",textAlign:"center",color:"#475569"}}>{t.loadingAudit}</div>
          :filtered.length===0?<div style={{padding:"40px",textAlign:"center",color:"#475569"}}>{t.noAudit}</div>
            :<table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{borderBottom:"1px solid #334155"}}>
                  {["Date","Staff","Action","Client"].map(h=><th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6366f1",letterSpacing:0.5}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l,i)=>(
                  <tr key={l.id} style={{borderBottom:"1px solid #1e293b",background:i%2===0?"transparent":"rgba(255,255,255,0.02)"}}>
                    <td style={{padding:"10px 16px",fontSize:12,color:"#64748b",whiteSpace:"nowrap"}}>{new Date(l.performed_at).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"})}</td>
                    <td style={{padding:"10px 16px",fontSize:13,fontWeight:600,color:"#f1f5f9"}}>{l.performed_by||"-"}</td>
                    <td style={{padding:"10px 16px",fontSize:13,color:"#6366f1"}}>{l.action||"-"}</td>
                    <td style={{padding:"10px 16px",fontSize:13,color:"#94a3b8"}}>{l.client_name||"-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>}
      </div>
    </div>
  );
}

function LangPicker({onSelect}){
  return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#1e293b",borderRadius:20,padding:"48px 40px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",maxWidth:420,width:"90%",border:"1px solid #334155",textAlign:"center"}}>
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
    const {data,error:err}=await supabase.auth.signInWithPassword({email,password});
    if(err){setError(err.message);setLoading(false);return;}
    const {data:roles}=await supabase.from("user_roles").select("*").eq("user_id",data.user.id);
    const rd=roles?.[0];
    onLogin({...data.user,role:rd?.role||"staff",displayName:rd?.name||email.split("@")[0],company_id:rd?.company_id||null,allRoles:roles||[]});
    setLoading(false);
  };
  return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#1e293b",borderRadius:20,padding:"48px 40px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",maxWidth:420,width:"90%",border:"1px solid #334155"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🔐</div>
          <div style={{fontFamily:"Playfair Display,serif",fontSize:26,fontWeight:700,color:"#f1f5f9",marginBottom:4}}>CareManager</div>
          <div style={{fontSize:13,color:"#64748b"}}>{t.signIn}</div>
        </div>
        {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,color:"#ef4444",fontSize:13}}>{error}</div>}
        <div style={{marginBottom:14}}><label style={LBL}>{t.email}</label><input type="email" style={INP} placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>
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
            <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20}}>
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
            <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20}}>
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
            <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20}}>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:15,color:"#f1f5f9",marginBottom:14,fontWeight:700}}>👤 Director / Contact</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {fld("Director Name","director_name","text","e.g. Maria Johnson")}
                {fld("Director Contact","director_contact","email","director@company.aw")}
              </div>
            </div>
          </div>
        )}
        {tab==="hours"&&(
          <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20}}>
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
          <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20}}>
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

function UserManagement({currentUser,onRoleChange,activeCompanyId,t}){
  const [users,setUsers]=useState([]);
  const [companies,setCompanies]=useState([]);
  const [allAuthUsers,setAllAuthUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [mainTab,setMainTab]=useState("users");
  const [showUserForm,setShowUserForm]=useState(false);
  const [showExistingForm,setShowExistingForm]=useState(false);
  const [showCompanyForm,setShowCompanyForm]=useState(false);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [userTab,setUserTab]=useState("all");
  const [search,setSearch]=useState("");
  const [userForm,setUserForm]=useState({name:"",email:"",password:"",role:"user",company_id:activeCompanyId||""});
  const [existingForm,setExistingForm]=useState({user_id:"",name:"",role:"user",company_id:activeCompanyId||""});
  const [companyForm,setCompanyForm]=useState({name:"",address:"",phone:"",email:"",website:"",mission_statement:""});

  const showToast=(type,msg)=>{setToast({type,msg});setTimeout(()=>setToast(null),3500);};

  const loadData=async()=>{
    setLoading(true);
    const uq=supabase.from("user_roles").select("*").order("name");
    const {data:ud}=activeCompanyId?await uq.eq("company_id",activeCompanyId):await uq;
    setUsers(ud||[]);
    const {data:cd}=await supabase.from("companies").select("*").order("name");
    setCompanies(cd||[]);
    // Load ALL users across all companies for existing user picker
    const {data:au}=await supabase.from("user_roles").select("user_id,name").order("name");
    // Deduplicate by user_id
    const seen=new Set();
    const unique=(au||[]).filter(u=>{if(seen.has(u.user_id))return false;seen.add(u.user_id);return true;});
    setAllAuthUsers(unique);
    setLoading(false);
  };

  useEffect(()=>{loadData();},[activeCompanyId]);

  const onChangeUser=e=>setUserForm(p=>({...p,[e.target.name]:e.target.value}));
  const onChangeExisting=e=>setExistingForm(p=>({...p,[e.target.name]:e.target.value}));
  const onChangeCompany=e=>setCompanyForm(p=>({...p,[e.target.name]:e.target.value}));

  const addExistingUser=async e=>{
    e.preventDefault();
    if(!existingForm.user_id||!existingForm.role||!existingForm.company_id){
      showToast("error","All fields are required");return;
    }
    setSaving(true);
    const selectedUser=allAuthUsers.find(u=>u.user_id===existingForm.user_id);
    const {error}=await supabase.from("user_roles").insert({
      user_id:existingForm.user_id,
      name:selectedUser?.name||existingForm.name,
      role:existingForm.role,
      company_id:existingForm.company_id,
    });
    if(error){
      if(error.code==="23505"){showToast("error","This user is already in that company");}
      else{showToast("error","Failed: "+error.message);}
    } else {
      showToast("success","User added to company successfully!");
      setExistingForm({user_id:"",name:"",role:"user",company_id:activeCompanyId||""});
      setShowExistingForm(false);
      await loadData();
    }
    setSaving(false);
  };

  const createUser=async e=>{
    e.preventDefault();
    if(!userForm.name||!userForm.email||!userForm.password||!userForm.role||!userForm.company_id){
      showToast("error","All fields are required");return;
    }
    setSaving(true);
    try{
      // Create auth user via Admin API
      const {data:newUser,error:createErr}=await supabaseAdmin.auth.admin.createUser({
        email:userForm.email,
        password:userForm.password,
        email_confirm:true,
        user_metadata:{display_name:userForm.name},
      });
      if(createErr)throw new Error(createErr.message);
      // Insert into user_roles
      const {error:roleErr}=await supabaseAdmin.from("user_roles").insert({
        user_id:newUser.user.id,
        name:userForm.name,
        role:userForm.role,
        company_id:userForm.company_id,
      });
      if(roleErr)throw new Error(roleErr.message);
      showToast("success","User created successfully!");
      setUserForm({name:"",email:"",password:"",role:"user",company_id:activeCompanyId||""});
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
    const {error}=await supabase.from("user_roles").update({role:newRole}).eq("user_id",userId);
    if(error){showToast("error","Failed to update role");return;}
    setUsers(u=>u.map(x=>x.user_id===userId?{...x,role:newRole}:x));
    showToast("success","Role updated");
    if(userId===currentUser.id&&onRoleChange)await onRoleChange();
  };

  const deactivateUser=async(userId)=>{
    const {error}=await supabase.from("user_roles").update({role:"inactive"}).eq("user_id",userId);
    if(error){showToast("error","Failed to deactivate");return;}
    setUsers(u=>u.map(x=>x.user_id===userId?{...x,role:"inactive"}:x));
    showToast("success","User deactivated");
  };

  const roleColor={superadmin:"#f59e0b",admin:"#6366f1",power_user:"#06b6d4",user:"#10b981",inactive:"#475569"};
  const roleBg={superadmin:"rgba(245,158,11,0.1)",admin:"rgba(99,102,241,0.1)",power_user:"rgba(6,182,212,0.1)",user:"rgba(16,185,129,0.1)",inactive:"rgba(71,85,105,0.1)"};
  const companyName=id=>companies.find(c=>c.id===id)?.name||"—";
  const userCountForCompany=id=>users.filter(u=>u.company_id===id).length;

  const filteredUsers=users.filter(u=>{
    const matchTab=userTab==="all"||(userTab==="active"&&u.role!=="inactive")||(userTab==="inactive"&&u.role==="inactive");
    const matchSearch=!search||u.name?.toLowerCase().includes(search.toLowerCase())||u.email?.toLowerCase().includes(search.toLowerCase());
    return matchTab&&matchSearch;
  });

  const INP2={...INP,marginBottom:0};

  return(
    <div style={{maxWidth:900}}>
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
        {[["users","👥 Users"],["companies","🏢 Companies"]].map(([id,label])=>(
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
            <div style={{background:"#1e293b",border:"1px solid #6366f1",borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:16,color:"#f1f5f9",fontWeight:700,marginBottom:6}}>Add Existing User to Company</div>
              <div style={{fontSize:12,color:"#64748b",marginBottom:16}}>For users who already have an account — give them access to this company.</div>
              <form onSubmit={addExistingUser}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={LBL}>Select User *</label>
                    <select name="user_id" value={existingForm.user_id} onChange={onChangeExisting} style={{...INP,marginBottom:0,cursor:"pointer"}}>
                      <option value="">Select existing user...</option>
                      {allAuthUsers
                        .filter(u=>!users.find(x=>x.user_id===u.user_id))
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
                  <div>
                    <label style={LBL}>Company *</label>
                    {activeCompanyId?(
                      <input style={{...INP,marginBottom:0,opacity:0.7}} value={companies.find(c=>c.id===activeCompanyId)?.name||""} disabled/>
                    ):(
                      <select name="company_id" value={existingForm.company_id} onChange={onChangeExisting} style={{...INP,marginBottom:0,cursor:"pointer"}}>
                        <option value="">Select company...</option>
                        {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
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
            <div style={{background:"#1e293b",border:"1px solid #6366f1",borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:16,color:"#f1f5f9",fontWeight:700,marginBottom:16}}>Create New User</div>
              <form onSubmit={createUser}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div><label style={LBL}>Full Name *</label><input name="name" value={userForm.name} onChange={onChangeUser} placeholder="e.g. Maria Johnson" style={INP2}/></div>
                  <div><label style={LBL}>Email *</label><input name="email" type="email" value={userForm.email} onChange={onChangeUser} placeholder="user@company.aw" style={INP2}/></div>
                  <div><label style={LBL}>Temporary Password *</label><input name="password" type="password" value={userForm.password} onChange={onChangeUser} placeholder="Min. 8 characters" style={INP2}/></div>
                  <div><label style={LBL}>Role *</label>
                    <select name="role" value={userForm.role} onChange={onChangeUser} style={{...INP2,cursor:"pointer"}}>
                      <option value="user">User</option>
                      <option value="power_user">Power User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>
                  <div style={{gridColumn:"1/-1"}}><label style={LBL}>Company *</label>
                    {activeCompanyId?(
                      <input style={{...INP2,opacity:0.7}} value={companies.find(c=>c.id===activeCompanyId)?.name||""} disabled/>
                    ):(
                      <select name="company_id" value={userForm.company_id} onChange={onChangeUser} style={{...INP2,cursor:"pointer"}}>
                        <option value="">Select company...</option>
                        {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
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
            <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,overflow:"hidden"}}>
              {filteredUsers.length===0?(
                <div style={{color:"#475569",textAlign:"center",padding:"40px 0"}}>No users found</div>
              ):(
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #334155"}}>
                      {["Name","Email","Role","Company","Actions"].map(h=>(
                        <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6366f1",letterSpacing:0.5}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u,i)=>(
                      <tr key={u.user_id} style={{borderBottom:"1px solid #1e293b",background:i%2===0?"transparent":"rgba(255,255,255,0.02)"}}>
                        <td style={{padding:"12px 16px",fontWeight:600,color:"#f1f5f9",fontSize:13}}>{u.name||"—"}</td>
                        <td style={{padding:"12px 16px",color:"#64748b",fontSize:13}}>{u.email||"—"}</td>
                        <td style={{padding:"12px 16px"}}>
                          <select value={u.role} onChange={e=>updateRole(u.user_id,e.target.value)}
                            style={{background:roleBg[u.role]||"transparent",color:roleColor[u.role]||"#64748b",border:"1px solid "+(roleColor[u.role]||"#334155"),borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            <option value="user">User</option>
                            <option value="power_user">Power User</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        <td style={{padding:"12px 16px",color:"#94a3b8",fontSize:13}}>{companyName(u.company_id)}</td>
                        <td style={{padding:"12px 16px"}}>
                          {u.role!=="inactive"&&u.user_id!==currentUser.id&&(
                            <button onClick={()=>deactivateUser(u.user_id)}
                              style={{padding:"4px 12px",borderRadius:7,border:"1px solid #334155",background:"transparent",color:"#64748b",fontSize:11,fontWeight:600}}>
                              Deactivate
                            </button>
                          )}
                          {u.user_id===currentUser.id&&<span style={{fontSize:11,color:"#475569",fontStyle:"italic"}}>You</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════ COMPANIES TAB ═══════════════ */}
      {mainTab==="companies"&&(
        <>
          {/* Create Company Form */}
          {showCompanyForm&&(
            <div style={{background:"#1e293b",border:"1px solid #10b981",borderRadius:12,padding:20,marginBottom:20}}>
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
              ):companies.map((c,i)=>{
                const uCount=userCountForCompany(c.id);
                return(
                  <div key={c.id} style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{flex:1}}>
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
                      <div style={{display:"flex",gap:8,flexShrink:0,marginLeft:16}}>
                        <div style={{textAlign:"center",background:"rgba(99,102,241,0.1)",borderRadius:10,padding:"8px 16px"}}>
                          <div style={{fontSize:20,fontWeight:700,color:"#6366f1"}}>{uCount}</div>
                          <div style={{fontSize:10,color:"#64748b",fontWeight:600}}>USERS</div>
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
                  style={{display:"flex",alignItems:"center",gap:16,padding:"20px 24px",borderRadius:16,border:"1px solid #334155",background:"#1e293b",cursor:"pointer",textAlign:"left",width:"100%"}}>
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
        const parts=key.split("_");
        const role=parts[1];
        const action=parts.slice(2).join("_");
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
        <div style={{padding:20,background:"#1e293b",borderRadius:12,color:"#64748b",textAlign:"center"}}>
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
                    <th style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6366f1",letterSpacing:0.5,background:"#1e293b",borderRadius:"8px 0 0 0"}}>ACTION</th>
                    {ROLES.map(role=>(
                      <th key={role} style={{padding:"12px 16px",textAlign:"center",fontSize:11,fontWeight:700,color:ROLE_COLORS[role],letterSpacing:0.5,background:"#1e293b"}}>
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
                <div key={role} style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,overflow:"hidden"}}>
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

  const t=T[lang]||T["en"];
  const selectLang=code=>{localStorage.setItem("cm-lang",code);setLang(code);};

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session){
        const {data:roles}=await supabase.from("user_roles").select("*").eq("user_id",session.user.id);
        const rd=roles?.[0];
        setCurrentUser({...session.user,role:rd?.role||"staff",displayName:rd?.name||session.user.email.split("@")[0],company_id:rd?.company_id||null,allRoles:roles||[]});
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
      setCurrentUser({...session.user,role:rd?.role||"staff",displayName:rd?.name||session.user.email.split("@")[0],company_id:rd?.company_id||null,allRoles:roles||[]});
    }
  },[]);

  const loadClients=useCallback(async()=>{
    setLoading(true);
    const cid=selectedCompany||currentUser?.company_id;
    const q=supabase.from("clients").select("*").order("name");
    const {data,error:err}=cid?await q.eq("company_id",cid):await q;
    if(err)setError(err.message);else setClients((data||[]).map(fromDb));
    setLoading(false);
  },[currentUser,selectedCompany]);

  const loadCompany=useCallback(async()=>{
    if(!currentUser)return;
    const cid=selectedCompany||currentUser.company_id;
    if(!cid)return;
    const {data}=await supabase.from("companies").select("*").eq("id",cid).single();
    if(data)setCompany(data);
  },[currentUser,selectedCompany]);

  useEffect(()=>{if(currentUser){loadClients();loadCompany();loadPermissions(activeCompanyId);}},[currentUser,selectedCompany,loadClients,loadCompany]);

  const activeCompanyId=selectedCompany||currentUser?.company_id;

  const logAudit=async(action,clientName)=>{
    if(!currentUser)return;
    await supabase.from("audit_log").insert({
      action,client_name:clientName||"",
      performed_by:currentUser.displayName||currentUser.email,
      company_id:activeCompanyId||null,
    });
  };

  const saveClient=async data=>{
    setSaving(true);setError(null);
    const exists=clients.find(c=>c.id===data.id);
    const row={...toDb(data),company_id:activeCompanyId||null};
    const {error:err}=exists?await supabase.from("clients").update(row).eq("id",data.id):await supabase.from("clients").insert(row);
    if(err){setError(err.message);setSaving(false);return;}
    await logAudit(exists?"Edited client":"Added new client",data.name);
    await loadClients();
    setSelected(data);setView("detail");setSaving(false);
  };

  const deleteClient=async()=>{
    const {error:err}=await supabase.from("clients").delete().eq("id",selected.id);
    if(err){setError(err.message);return;}
    await logAudit("Deleted client",selected.name);
    setClients(c=>c.filter(x=>x.id!==selected.id));
    setSelected(null);setView("dashboard");setDeleteConfirm(false);
  };

  const handleLogout=async()=>{await supabase.auth.signOut();setCurrentUser(null);};

  const filtered=clients.filter(c=>{
    const q=search.toLowerCase();
    const ms=c.name.toLowerCase().includes(q)||(c.room_or_address||"").toLowerCase().includes(q)||(c.azv_number||"").toLowerCase().includes(q);
    const mst=statusFilter==="All"||(c.status||"Active")===statusFilter;
    return ms&&mst;
  });

  const noteResults=search.trim().length>1&&searchMode==="notes"
    ?clients.flatMap(c=>(c.session_notes||[]).filter(n=>n.text&&n.text.toLowerCase().includes(search.toLowerCase())).map(n=>({...n,clientName:c.name,client:c}))).sort((a,b)=>b.date.localeCompare(a.date))
    :[];

  if(!authChecked)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0f172a",color:"#6366f1",fontSize:18,fontFamily:"serif"}}>Loading...</div>;
  if(!currentUser)return lang?<Login onLogin={setCurrentUser} t={t}/>:<LangPicker onSelect={selectLang}/>;
  if(!lang)return <LangPicker onSelect={selectLang}/>;
  if(currentUser.role==="superadmin"&&!selectedCompany||currentUser?.allRoles?.length>1&&!selectedCompany){
    return <CompanyPicker currentUser={currentUser} onSelect={(cid,role)=>{
      setSelectedCompany(cid);
      setCurrentUser(u=>({...u,role:role||u.role}));
    }} t={t}/>;
  }

  return(
    <div style={{minHeight:"100vh",background:"#0f172a",fontFamily:"Inter,Helvetica Neue,sans-serif"}}>
      <style dangerouslySetInnerHTML={{__html:GCSS}}/>
      <div className="mob-hdr">
        <button onClick={()=>setSidebarOpen(o=>!o)} style={{background:"none",border:"none",color:"#94a3b8",fontSize:22}}>=</button>
        <span style={{fontFamily:"Playfair Display,serif",fontSize:16,fontWeight:700,color:"#f1f5f9"}}>CareManager</span>
        {can(currentUser.role,"add")&&<button onClick={()=>{setSelected(null);setView("add");setSidebarOpen(false);}} style={{background:"#6366f1",border:"none",color:"#fff",borderRadius:8,padding:"6px 12px",fontSize:13,fontWeight:700}}>+</button>}
      </div>
      <div className={"overlay"+(sidebarOpen?" show":"")} onClick={()=>setSidebarOpen(false)}/>
      <div style={{display:"flex",minHeight:"100vh"}}>
        <div className={"sidebar"+(sidebarOpen?" open":"")} style={{width:280,background:"#1e293b",borderRight:"1px solid #334155",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"20px 20px 14px",borderBottom:"1px solid #334155"}}>
            <div style={{fontFamily:"Playfair Display,serif",fontSize:20,fontWeight:700,color:"#f1f5f9",marginBottom:2}}>CareManager</div>
            <div style={{fontSize:11,color:"#475569",letterSpacing:0.5,textTransform:"uppercase",marginBottom:12}}>Elder Care Platform</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#f1f5f9"}}>{currentUser.displayName}</div>
                <div style={{fontSize:11,color:currentUser.role==="superadmin"?"#f59e0b":"#64748b"}}>{currentUser.role==="superadmin"?"Super Admin":"Staff"}</div>
              </div>
              <button onClick={handleLogout} style={{background:"none",border:"1px solid #334155",borderRadius:7,padding:"4px 10px",color:"#64748b",fontSize:11,fontWeight:600}}>{t.signOut}</button>
            </div>
          </div>
          {company?.logo_url&&(
            <div style={{padding:"14px 20px 10px",borderBottom:"1px solid #1e293b",textAlign:"center",background:"#1e293b"}}>
              <div style={{background:"#fff",borderRadius:12,padding:"10px 12px",display:"inline-block",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
                <img src={company.logo_url} alt={company.name||"Company logo"} style={{maxHeight:72,maxWidth:200,objectFit:"contain",display:"block"}}/>
              </div>
              {company.name&&<div style={{fontSize:11,color:"#64748b",marginTop:8,fontWeight:600,letterSpacing:0.3}}>{company.name}</div>}
              {company.mission_statement&&<div style={{fontSize:10,color:"#475569",marginTop:2,fontStyle:"italic",lineHeight:1.4,padding:"0 4px"}}>"{company.mission_statement}"</div>}
              {(currentUser?.allRoles||[]).length>1&&(
                <button onClick={()=>{setSelectedCompany(null);setCompany(null);setClients([]);setSelected(null);setView("dashboard");}}
                  style={{marginTop:8,padding:"4px 12px",borderRadius:20,border:"1px solid #334155",background:"transparent",color:"#64748b",fontSize:11,fontWeight:600}}>
                  Switch Company
                </button>
              )}
            </div>
          )}
          <div style={{padding:"12px 12px 6px"}}>
            <button onClick={()=>{setView("dashboard");setSelected(null);setSidebarOpen(false);}}
              style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",background:view==="dashboard"?"rgba(99,102,241,0.15)":"transparent",color:view==="dashboard"?"#6366f1":"#64748b",fontWeight:600,fontSize:13,textAlign:"left",marginBottom:2}}>
              Dashboard
            </button>
            {can(currentUser.role,"audit")&&(
              <button onClick={()=>{setView("audit");setSelected(null);setSidebarOpen(false);}}
                style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",background:view==="audit"?"rgba(99,102,241,0.15)":"transparent",color:view==="audit"?"#6366f1":"#64748b",fontWeight:600,fontSize:13,textAlign:"left",marginBottom:2}}>
                {t.auditTrail}
              </button>
            )}
            {can(currentUser.role,"company")&&(
              <button onClick={()=>{setView("company");setSelected(null);setSidebarOpen(false);}}
                style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",background:view==="company"?"rgba(99,102,241,0.15)":"transparent",color:view==="company"?"#6366f1":"#64748b",fontWeight:600,fontSize:13,textAlign:"left",marginBottom:2}}>
                🏢 Company Settings
              </button>
            )}
            {can(currentUser.role,"users")&&(
              <button onClick={()=>{setView("users");setSelected(null);setSidebarOpen(false);}}
                style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",background:view==="users"?"rgba(99,102,241,0.15)":"transparent",color:view==="users"?"#6366f1":"#64748b",fontWeight:600,fontSize:13,textAlign:"left",marginBottom:2}}>
                👥 User Management
              </button>
            )}
            {can(currentUser.role,"permissions")&&(
              <button onClick={()=>{setView("permissions");setSelected(null);setSidebarOpen(false);}}
                style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",background:view==="permissions"?"rgba(99,102,241,0.15)":"transparent",color:view==="permissions"?"#6366f1":"#64748b",fontWeight:600,fontSize:13,textAlign:"left",marginBottom:2}}>
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
            <input style={{...INP,background:"#0f172a",borderColor:"#1e293b"}} placeholder={searchMode==="notes"?t.searchNotes:t.search} value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div style={{padding:"0 12px 8px",display:"flex",gap:4}}>
            {["Active","Inactive","Discharged","All"].map(s=>{
              const cols={Active:"#10b981",Inactive:"#f59e0b",Discharged:"#8b5cf6",All:"#6366f1"};
              const active=statusFilter===s;
              return(
                <button key={s} onClick={()=>setStatusFilter(s)}
                  style={{flex:1,padding:"4px 2px",borderRadius:7,border:"none",background:active?cols[s]+"20":"#0f172a",color:active?cols[s]:"#475569",fontSize:10,fontWeight:700}}>
                  {s==="Active"?"Act":s==="Inactive"?"Inac":s==="Discharged"?"Disc":"All"}
                </button>
              );
            })}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"0 8px"}}>
            {filtered.length===0&&<div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"24px 10px"}}>{clients.length===0?t.noClients:t.noResults}</div>}
            {filtered.map(c=>{
              const isActive=selected?.id===c.id&&view!=="add";
              const color=avatarColor(c.name);
              const age=calcAge(c.date_of_birth);
              const scols={Active:"#10b981",Inactive:"#f59e0b",Discharged:"#8b5cf6"};
              return(
                <button key={c.id} onClick={()=>{setSelected(c);setView("detail");setDeleteConfirm(false);setSidebarOpen(false);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 8px",borderRadius:10,border:"none",background:isActive?"rgba(99,102,241,0.12)":"transparent",cursor:"pointer",marginBottom:2,textAlign:"left"}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0,overflow:"hidden",border:isActive?"2px solid #6366f1":"2px solid transparent"}}>
                    {c.photo_url?<img src={c.photo_url} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials(c.name)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{color:"#e2e8f0",fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                      {(c.status||"Active")!=="Active"&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:10,background:(scols[c.status]||"#64748b")+"20",color:scols[c.status]||"#64748b",flexShrink:0}}>{c.status}</span>}
                    </div>
                    <div style={{color:"#475569",fontSize:11}}>{age!==null?"Age "+age:""}{c.room_or_address?(age!==null?" - ":"")+c.room_or_address:""}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{padding:12}}>
            {can(currentUser.role,"add")&&(
              <button onClick={()=>{setSelected(null);setView("add");setSidebarOpen(false);}}
                style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:"#6366f1",color:"#fff",fontWeight:700,fontSize:14}}>
                {t.newClient}
              </button>
            )}
          </div>
          <div style={{padding:"0 12px 8px",display:"flex",justifyContent:"center",gap:4}}>
            {LANG_OPTIONS.map(l=>(
              <button key={l.code} onClick={()=>selectLang(l.code)} title={l.label}
                style={{background:lang===l.code?"rgba(99,102,241,0.2)":"transparent",border:"none",borderRadius:6,padding:"4px 6px",fontSize:11,fontWeight:800,color:lang===l.code?"#6366f1":"#475569"}}>
                {l.emoji}
              </button>
            ))}
          </div>
          <div style={{padding:"0 12px 16px",color:"#334155",fontSize:11,textAlign:"center"}}>
            {clients.length} {t.clients} - {t.synced}
          </div>
        </div>
        <div className="main-pad" style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
          {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:"12px 16px",marginBottom:20,color:"#ef4444",fontSize:14}}>{error}</div>}
          {loading&&view==="dashboard"&&<div style={{color:"#475569",textAlign:"center",padding:"60px 0"}}>Loading...</div>}
          {!loading&&view==="audit"&&currentUser.role==="superadmin"&&<AuditTrail t={t} companyId={currentUser.company_id}/>}
          {!loading&&view==="company"&&currentUser.role==="superadmin"&&(
            <CompanyView company={company} onUpdate={updated=>{setCompany(updated);}} currentUser={currentUser} t={t}/>
          )}
          {!loading&&view==="users"&&can(currentUser.role,"users")&&(
            <UserManagement currentUser={currentUser} onRoleChange={refreshCurrentUser} activeCompanyId={activeCompanyId} t={t}/>
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
                    <div key={i} onClick={()=>{setSelected(n.client);setView("detail");setSearch("");setSearchMode("clients");setSidebarOpen(false);}}
                      style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:"14px 18px",cursor:"pointer"}}>
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
          ):!loading&&view==="dashboard"&&<Dashboard clients={clients} onSelect={c=>{setSelected(c);setView("detail");}} t={t} currentUser={currentUser}/>}
          {view==="add"&&can(currentUser.role,"add")&&(
            <div>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:26,color:"#f1f5f9",marginBottom:24}}>{t.newClient}</div>
              <ClientForm client={emptyClient()} onSave={saveClient} onCancel={()=>setView(selected?"detail":"dashboard")} saving={saving} t={t}/>
            </div>
          )}
          {view==="edit"&&selected&&can(currentUser.role,"edit")&&(
            <div>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:26,color:"#f1f5f9",marginBottom:24}}>Edit - {selected.name}</div>
              <ClientForm client={selected} onSave={saveClient} onCancel={()=>setView("detail")} saving={saving} t={t}/>
            </div>
          )}
          {view==="detail"&&selected&&(()=>{
            const fresh=clients.find(c=>c.id===selected.id)||selected;
            return(
              <>
                <ClientDetail client={fresh} onEdit={()=>{setSelected(fresh);setView("edit");}} onDelete={()=>setDeleteConfirm(true)} t={t} currentUser={currentUser}/>
                {deleteConfirm&&(
                  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
                    <div style={{background:"#1e293b",borderRadius:16,padding:32,maxWidth:380,width:"90%",border:"1px solid #334155"}}>
                      <div style={{fontFamily:"Playfair Display,serif",fontSize:20,marginBottom:10,color:"#f1f5f9"}}>{t.deleteTitle}</div>
                      <div style={{color:"#64748b",marginBottom:24}}>{t.deleteMsg} <strong style={{color:"#f1f5f9"}}>{fresh.name}</strong>.</div>
                      <div style={{display:"flex",gap:10}}>
                        <button onClick={()=>setDeleteConfirm(false)} style={{flex:1,padding:"10px",borderRadius:9,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontWeight:600}}>{t.cancel}</button>
                        <button onClick={deleteClient} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:"#ef4444",color:"#fff",fontWeight:700}}>{t.confirmDelete}</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
// cache bust Sat May 23 13:21:22 UTC 2026
