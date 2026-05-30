// ── Shared constants used across components ────────────────────────────────

// ── Subscription plan feature gating ──────────────────────────────────────
export const PLAN_FEATURES = {
  standard:     ["dashboard","clients","appointments","users","company"],
  professional: ["dashboard","clients","appointments","users","company",
                 "medications_view","incidents_view","reports","audit",
                 "handover","clinical"],
  enterprise:   ["dashboard","clients","appointments","users","company",
                 "medications_view","incidents_view","reports","audit",
                 "handover","clinical","readmission","rooms","permissions","custom_fields"],
};

// ── Branding / palette ─────────────────────────────────────────────────────
export const COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6"];
export const PLY    = 5; // polypharmacy threshold

// ── Clinical lists ─────────────────────────────────────────────────────────
export const DIAGNOSES = [
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

export const MEDICATIONS = [
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

export const HIGH_RISK = [
  "Warfarin","Rivaroxaban","Clopidogrel","Digoxin","Insulin Basal","Insulin Rapid",
  "Morphine","Tramadol","Zolpidem","Prednisolone","Furosemide","Spironolactone",
  "Donepezil","Memantine","Levodopa",
];

export const CONTROLLED_SUBSTANCES = [
  "Morphine","Oxycodone","Hydrocodone","Fentanyl","Hydromorphone","Codeine",
  "Tramadol","Methadone","Buprenorphine","Tapentadol",
  "Diazepam","Lorazepam","Alprazolam","Clonazepam","Midazolam","Temazepam","Oxazepam",
  "Zolpidem","Zopiclone","Zaleplon",
  "Methylphenidate","Dextroamphetamine","Lisdexamfetamine",
  "Ketamine","Phenobarbital","Gabapentin","Pregabalin",
];

// ── Fall risk weights ──────────────────────────────────────────────────────
export const FALL_RISK_DIAG={
  "Falls Risk":3,"Parkinson's Disease":2,"Dementia":2,"Alzheimer's Disease":2,
  "Stroke (CVA)":2,"TIA":1,"Vascular Dementia":2,"Epilepsy":2,"Osteoporosis":1,
  "Peripheral Neuropathy":1,"Arthritis (Osteoarthritis)":1,"Arthritis (Rheumatoid)":1,
  "Incontinence":1,
};
export const FALL_RISK_MEDS={
  "Zolpidem":2,"Morphine":2,"Tramadol":2,"Furosemide":1,
  "Insulin Basal":1,"Insulin Rapid":1,"Levodopa":1,"Donepezil":1,"Memantine":1,
};

// ── Drug Interaction Database ─────────────────────────────────────────────
// Each entry: { a: keyword, b: keyword, severity: "high"|"moderate", msg: warning }
// Keyword matching is case-insensitive substring match against medication names.
export const DRUG_INTERACTIONS = [
  // Anticoagulants + NSAIDs / antiplatelets
  { a:"warfarin",      b:"aspirin",       severity:"high",     msg:"Warfarin + Aspirin: Major bleeding risk. Monitor INR closely." },
  { a:"warfarin",      b:"ibuprofen",     severity:"high",     msg:"Warfarin + Ibuprofen: Significantly increased bleeding risk." },
  { a:"warfarin",      b:"naproxen",      severity:"high",     msg:"Warfarin + Naproxen: Significantly increased bleeding risk." },
  { a:"warfarin",      b:"diclofenac",    severity:"high",     msg:"Warfarin + Diclofenac: Major bleeding risk. Avoid combination." },
  { a:"rivaroxaban",   b:"aspirin",       severity:"high",     msg:"Rivaroxaban + Aspirin: Increased major bleeding risk." },
  { a:"clopidogrel",   b:"aspirin",       severity:"moderate", msg:"Dual antiplatelet therapy: Increased bleeding risk — ensure this is intentional." },
  { a:"warfarin",      b:"amiodarone",    severity:"high",     msg:"Warfarin + Amiodarone: Amiodarone markedly increases warfarin effect. Reduce warfarin dose, monitor INR." },
  { a:"warfarin",      b:"fluconazole",   severity:"high",     msg:"Warfarin + Fluconazole: Strong INR elevation. Reduce warfarin dose." },
  { a:"warfarin",      b:"metronidazole", severity:"high",     msg:"Warfarin + Metronidazole: Increases anticoagulant effect. Monitor INR." },
  // Opioids + sedatives
  { a:"morphine",      b:"diazepam",      severity:"high",     msg:"Opioid + Benzodiazepine: Risk of respiratory depression and sedation. Use caution." },
  { a:"morphine",      b:"lorazepam",     severity:"high",     msg:"Opioid + Benzodiazepine: Risk of respiratory depression and sedation." },
  { a:"morphine",      b:"midazolam",     severity:"high",     msg:"Opioid + Benzodiazepine: Risk of respiratory depression and sedation." },
  { a:"tramadol",      b:"diazepam",      severity:"high",     msg:"Tramadol + Benzodiazepine: Additive CNS depression and fall risk." },
  { a:"tramadol",      b:"zolpidem",      severity:"moderate", msg:"Tramadol + Zolpidem: Additive sedation and fall risk." },
  { a:"morphine",      b:"zolpidem",      severity:"moderate", msg:"Opioid + Zolpidem: Additive sedation — monitor closely." },
  // Cardiac
  { a:"digoxin",       b:"amiodarone",    severity:"high",     msg:"Digoxin + Amiodarone: Amiodarone increases digoxin levels — reduce digoxin dose by 50%." },
  { a:"digoxin",       b:"furosemide",    severity:"moderate", msg:"Digoxin + Furosemide: Furosemide-induced hypokalaemia increases digoxin toxicity risk." },
  { a:"digoxin",       b:"verapamil",     severity:"high",     msg:"Digoxin + Verapamil: Verapamil increases digoxin levels and AV block risk." },
  { a:"metoprolol",    b:"verapamil",     severity:"high",     msg:"Beta-blocker + Verapamil: Risk of bradycardia, heart block, and cardiac arrest." },
  { a:"atenolol",      b:"verapamil",     severity:"high",     msg:"Beta-blocker + Verapamil: Risk of bradycardia and AV block." },
  { a:"metoprolol",    b:"diltiazem",     severity:"moderate", msg:"Beta-blocker + Diltiazem: Additive AV node suppression — monitor heart rate." },
  // ACE inhibitors / ARBs + potassium
  { a:"lisinopril",    b:"spironolactone",severity:"moderate", msg:"ACE inhibitor + Spironolactone: Risk of hyperkalaemia. Monitor potassium." },
  { a:"ramipril",      b:"spironolactone",severity:"moderate", msg:"ACE inhibitor + Spironolactone: Risk of hyperkalaemia. Monitor potassium." },
  { a:"perindopril",   b:"spironolactone",severity:"moderate", msg:"ACE inhibitor + Spironolactone: Risk of hyperkalaemia. Monitor potassium." },
  // SSRIs + other serotonergics
  { a:"sertraline",    b:"tramadol",      severity:"high",     msg:"SSRI + Tramadol: Risk of serotonin syndrome (agitation, hyperthermia, tachycardia)." },
  { a:"fluoxetine",    b:"tramadol",      severity:"high",     msg:"SSRI + Tramadol: Risk of serotonin syndrome." },
  { a:"paroxetine",    b:"tramadol",      severity:"high",     msg:"SSRI + Tramadol: Risk of serotonin syndrome." },
  // Statins + interactions
  { a:"simvastatin",   b:"amiodarone",    severity:"high",     msg:"Simvastatin + Amiodarone: Increased risk of myopathy/rhabdomyolysis. Limit simvastatin to 20mg." },
  { a:"simvastatin",   b:"amlodipine",    severity:"moderate", msg:"Simvastatin + Amlodipine: Increased simvastatin exposure — limit dose." },
  // Metformin + renal/contrast concerns
  { a:"metformin",     b:"furosemide",    severity:"moderate", msg:"Metformin + Furosemide: Furosemide may increase metformin levels. Monitor renal function." },
  // NSAIDs + antihypertensives
  { a:"ibuprofen",     b:"lisinopril",    severity:"moderate", msg:"NSAID + ACE inhibitor: NSAIDs reduce antihypertensive effect and increase renal risk." },
  { a:"ibuprofen",     b:"furosemide",    severity:"moderate", msg:"NSAID + Furosemide: NSAIDs reduce diuretic effect and may worsen renal function." },
  { a:"naproxen",      b:"lisinopril",    severity:"moderate", msg:"NSAID + ACE inhibitor: Reduced antihypertensive effect and increased renal risk." },
];

// ── Braden Scale ───────────────────────────────────────────────────────────
export const BRADEN_SUBSCALES=[
  {key:"sensory_perception",label:"Sensory Perception",max:4,options:["Completely Limited","Very Limited","Slightly Limited","No Impairment"]},
  {key:"moisture",          label:"Moisture",           max:4,options:["Constantly Moist","Very Moist","Occasionally Moist","Rarely Moist"]},
  {key:"activity",          label:"Activity",           max:4,options:["Bedfast","Chairfast","Walks Occasionally","Walks Frequently"]},
  {key:"mobility",          label:"Mobility",           max:4,options:["Completely Immobile","Very Limited","Slightly Limited","No Limitation"]},
  {key:"nutrition",         label:"Nutrition",          max:4,options:["Very Poor","Probably Inadequate","Adequate","Excellent"]},
  {key:"friction_shear",    label:"Friction & Shear",  max:3,options:["Problem","Potential Problem","No Apparent Problem"]},
];
export const BRADEN_MAX = 23; // 4+4+4+4+4+3

// ── Cognitive (MMSE) ───────────────────────────────────────────────────────
export const MMSE_DOMAINS=[
  {key:"orientation",  label:"Orientation",            max:10},
  {key:"registration", label:"Registration",            max:3},
  {key:"attention",    label:"Attention & Calculation", max:5},
  {key:"recall",       label:"Recall",                  max:3},
  {key:"language",     label:"Language & Visuospatial", max:9},
];

// ── Continence ─────────────────────────────────────────────────────────────
export const CONTINENCE_TYPES    = ["Urinary Urgency","Urinary Stress","Urinary Overflow","Fecal","Mixed","Other"];
export const CONTINENCE_PRODUCTS = ["None","Pad","Brief / Pull-up","Catheter","Bedpan / Commode","Other"];
export const CONTINENCE_VOLUME   = ["Small","Medium","Large"];
export const CONTINENCE_SKIN     = ["Intact","Redness","Maceration","Breakdown"];

// ── Wound / skin ───────────────────────────────────────────────────────────
export const WOUND_HEALING_COLOR = {
  Improving:"#10b981", Stable:"#06b6d4", Deteriorating:"#ef4444", Healed:"#8b5cf6",
};

// ── ADL ────────────────────────────────────────────────────────────────────
export const ADL_ITEMS       = ["bathing","dressing","toileting","eating","mobility","grooming"];
export const ADL_LEVELS      = ["Independent","Supervised","Assisted","Dependent"];
export const ADL_LEVEL_SCORE = {Independent:0,Supervised:1,Assisted:2,Dependent:3};
export const ADL_LEVEL_COLOR = {Independent:"#10b981",Supervised:"#06b6d4",Assisted:"#f59e0b",Dependent:"#ef4444"};
export const ADL_LABELS      = {bathing:"🛁 Bathing",dressing:"👕 Dressing",toileting:"🚽 Toileting",eating:"🍽️ Eating",mobility:"🚶 Mobility",grooming:"✂️ Grooming"};

// ── Session / idle ─────────────────────────────────────────────────────────
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const IDLE_WARN_SECS  = 60;              // countdown before auto-logout

// ── RBAC ───────────────────────────────────────────────────────────────────
export const DEFAULT_PERMS = {
  superadmin: ["view","add","edit","delete","audit","users","company","permissions","rooms","readmission","medications_view","incidents_view","reports","handover"],
  admin:      ["view","add","edit","delete","audit","company","rooms","readmission","medications_view","incidents_view","reports","handover"],
  power_user: ["view","add","edit","medications_view","incidents_view","reports","handover"],
  user:       ["view","medications_view","incidents_view","handover"],
  inactive:   [],
};

// ── Intake checklist defaults ──────────────────────────────────────────────
export const DEFAULT_INTAKE_ITEMS = [
  {key:"id_docs",            label:"ID documents verified"},
  {key:"insurance",          label:"Insurance / AZV card on file"},
  {key:"medical_history",    label:"Medical history form completed"},
  {key:"emergency_contacts", label:"Emergency contacts recorded"},
  {key:"consent_form",       label:"Consent form signed"},
  {key:"photo",              label:"Profile photo taken"},
  {key:"med_reconciliation", label:"Medication reconciliation done"},
  {key:"allergies_recorded", label:"Allergies reviewed and recorded"},
  {key:"care_plan_initial",  label:"Initial care plan created"},
  {key:"room_assigned",      label:"Room / location assigned"},
];

// ── Password strength levels ───────────────────────────────────────────────
export const PW_LEVELS = [
  {label:"Too short", color:"var(--color-text-muted)", bg:"var(--color-text-muted)"},
  {label:"Weak",      color:"#ef4444",                 bg:"#ef4444"},
  {label:"Fair",      color:"#f59e0b",                 bg:"#f59e0b"},
  {label:"Good",      color:"#06b6d4",                 bg:"#06b6d4"},
  {label:"Strong",    color:"#10b981",                 bg:"#10b981"},
];

// ── Shared inline style objects ────────────────────────────────────────────
export const INP  = {width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.03)",color:"var(--color-text-primary)",fontSize:16};
export const LBL  = {display:"block",fontSize:11,fontWeight:700,color:"var(--color-text-dim)",marginBottom:4,letterSpacing:0.5,textTransform:"uppercase"};
export const ABTN = {background:"none",border:"1.5px dashed rgba(99,102,241,0.4)",borderRadius:8,padding:"10px 14px",color:"#6366f1",fontSize:13,fontWeight:600,touchAction:"manipulation",cursor:"pointer"};
export const IBTN = {background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-text-dim)",fontSize:12,flexShrink:0,touchAction:"manipulation",cursor:"pointer"};

// ── Global CSS (injected via <style dangerouslySetInnerHTML> in App) ────────
export const GCSS = [
  "* { box-sizing: border-box; margin: 0; padding: 0; }",
  "body { font-family: 'DM Sans', system-ui, sans-serif; background: #07091c; color: #f0f2fa; -webkit-font-smoothing: antialiased; }",
  "input, textarea, select { font-family: 'DM Sans', system-ui, sans-serif; }",
  "select option { background: #111427; color: #f0f2fa; }",
  "input:focus, textarea:focus, select:focus { outline: none !important; border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important; }",
  "button { font-family: 'DM Sans', system-ui, sans-serif; cursor: pointer; touch-action: manipulation; }",
  "button:hover { opacity: 0.88; }",
  "a { touch-action: manipulation; }",
  "::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }",
  ".client-row { transition: background 120ms ease !important; }",
  ".client-row:hover { background: rgba(255,255,255,0.04) !important; }",
  ".dash-row { transition: background 120ms ease !important; border-radius: 9px; }",
  ".dash-row:hover { background: rgba(255,255,255,0.04) !important; }",
  ".card-hover { transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }",
  ".card-hover:hover { transform: translateY(-2px) !important; border-color: rgba(255,255,255,0.12) !important; box-shadow: 0 12px 32px rgba(0,0,0,0.4) !important; }",
  ".sidebar { transition: transform 0.25s ease; }",
  "@media (max-width: 768px) {",
  "  .sidebar { position: fixed !important; left: 0; top: 0; height: 100vh; height: 100dvh; z-index: 200; transform: translateX(-100%); }",
  "  .sidebar.open { transform: translateX(0) !important; }",
  "  .main-pad { padding: 16px !important; }",
  "  .g4 { grid-template-columns: 1fr 1fr !important; }",
  "  .g2 { grid-template-columns: 1fr !important; }",
  "  .fg { grid-template-columns: 1fr !important; }",
  "  .mob-hdr { display: flex !important; }",
  "  .main-topbar { display: none !important; }",
  "  .inv-grid { grid-template-columns: 1fr 1fr !important; }",
  "  .notes-filter { grid-template-columns: 1fr 1fr !important; }",
  "  .notif-panel { width: 100vw !important; }",
  "  .three-col { grid-template-columns: 1fr !important; }",
  "  .four-col { grid-template-columns: 1fr 1fr !important; }",
  "  .perms-grid { grid-template-columns: 1fr !important; }",
  "  .nav-item { min-height: 44px !important; }",
  "  .sidebar-footer { padding-bottom: calc(10px + env(safe-area-inset-bottom)) !important; }",
  "  .filter-pill { min-height: 36px !important; padding-left: 14px !important; padding-right: 14px !important; display: inline-flex !important; align-items: center !important; }",
  "  .readmission-grid { grid-template-columns: 1fr !important; }",
  "  .pc-add-form { grid-template-columns: 1fr 1fr !important; }",
  "  .pc-add-form > :last-child { grid-column: 1 / -1 !important; }",
  "  .cf-fields-row { grid-template-columns: 1fr 1fr !important; }",
  "}",
  "@media (prefers-reduced-motion: reduce) {",
  "  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }",
  "}",
  "@media (min-width: 769px) {",
  "  .sidebar { transform: none !important; position: relative !important; }",
  "  .overlay { display: none !important; }",
  "  .mob-hdr { display: none !important; }",
  "}",
  ".mob-hdr { display: none; align-items: center; justify-content: space-between; padding: 12px 20px; padding-top: calc(12px + env(safe-area-inset-top)); background: var(--color-bg-surface); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; z-index: 100; }",
  ".overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 199; }",
  ".overlay.show { display: block; }",
  "@media print {",
  "  body > * { display: none !important; }",
  "  #pz { display: block !important; position: fixed; top: 0; left: 0; width: 100%; padding: 32px; background: #fff; color: #000; }",
  "  .np { display: none !important; }",
  "  .ph { display: block !important; }",
  "  @page { margin: 1.5cm; size: A4; }",
  "}",
  ".ph { display: none; }",
  "html.cm-light { background: var(--color-bg-base); }",
  ".notif-panel { animation: slideIn 0.22s ease; }",
  "@keyframes slideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }",
  ".shortcut-key { display:inline-block; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); border-radius:5px; padding:1px 7px; font-family:'DM Mono',monospace; font-size:12px; color:#a5b4fc; }",
  ".nav-item { position: relative; }",
  "@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }",
  ".skeleton { background: linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size: 800px 100%; animation: shimmer 1.4s infinite; border-radius: 8px; }",
  ".client-card { transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }",
  ".client-card:hover { transform: translateY(-2px) !important; border-color: rgba(255,255,255,0.12) !important; box-shadow: 0 12px 32px rgba(0,0,0,0.4) !important; }",
  ".tab-btn { transition: color 120ms ease, border-color 120ms ease; border: none; background: none; cursor: pointer; }",

  /* ── Light mode green overrides (html.cm-light) ── */
  /* Sidebar surface + borders */
  "html.cm-light .sidebar { background: #f0fdf4 !important; border-right-color: #bbf7d0 !important; }",
  "html.cm-light .sidebar-footer { border-top-color: #bbf7d0 !important; }",
  "html.cm-light .nav-divider { background: #bbf7d0 !important; }",
  /* Topbar green bottom border */
  "html.cm-light .main-topbar { border-bottom-color: #bbf7d0 !important; box-shadow: 0 1px 4px rgba(22,163,74,0.06) !important; }",
  "html.cm-light .mob-hdr { border-bottom-color: #bbf7d0 !important; }",
  /* Nav group labels — visible on white */
  "html.cm-light .nav-group-label { color: #9ca3af !important; }",
  /* Nav hover (inactive only) */
  "html.cm-light .nav-item:not(.nav-active):hover { color: #16a34a !important; background: #dcfce7 !important; }",
  /* Active nav count badge — white frosted pill on green bg */
  "html.cm-light .nav-active .nav-count-badge { background: rgba(255,255,255,0.25) !important; }",
  /* Sidebar footer text */
  "html.cm-light .sidebar-footer-name { color: #374151 !important; }",
  "html.cm-light .sidebar-footer-role { color: #9ca3af !important; }",
  /* Sidebar footer icon buttons */
  "html.cm-light .icon-btn-sidebar { border-color: #e5e7eb !important; background: rgba(0,0,0,0.02) !important; color: #6b7280 !important; }",
  "html.cm-light .icon-btn-sidebar svg { stroke: #6b7280 !important; }",
  "html.cm-light .icon-btn-sidebar:hover { background: #dcfce7 !important; border-color: #bbf7d0 !important; color: #16a34a !important; }",
  /* Sidebar avatar — green gradient */
  "html.cm-light .sidebar-avatar { background: linear-gradient(135deg,#16a34a,#15803d) !important; box-shadow: 0 2px 6px rgba(22,163,74,0.25) !important; }",
  /* Lang row active */
  "html.cm-light .lang-btn-active { background: #dcfce7 !important; color: #16a34a !important; }",
  "html.cm-light .lang-btn-inactive { color: #9ca3af !important; }",
  /* New Client button — green gradient */
  "html.cm-light .btn-new-client { background: linear-gradient(135deg,#16a34a,#15803d) !important; box-shadow: 0 2px 8px rgba(22,163,74,0.3) !important; }",
  /* Topbar search input */
  "html.cm-light #cm-search { background: #f9fafb !important; border-color: #e5e7eb !important; color: #374151 !important; }",
  /* Topbar date/meta text */
  "html.cm-light .topbar-meta { color: #9ca3af !important; }",
  /* Skeleton shimmer for light mode */
  "html.cm-light .skeleton { background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%) !important; background-size: 800px 100% !important; }",
  /* client-card hover for light mode */
  "html.cm-light .client-card:hover { border-color: #bbf7d0 !important; box-shadow: 0 8px 24px rgba(22,163,74,0.10) !important; }",
  "html.cm-light .card-hover:hover { border-color: #d1d5db !important; box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }",
  /* Notification unread dot border matches light bg */
  "html.cm-light .notif-unread-dot { border-color: #f9fafb !important; }",
  "@media (max-width: 600px) { .missed-row { flex-wrap: wrap !important; align-items: flex-start !important; } .missed-row-actions { width: 100% !important; justify-content: flex-end !important; margin-top: 6px !important; } }",
].join("\n");

// ── Translations ───────────────────────────────────────────────────────────
export const LANG_OPTIONS = [
  {code:"en",  label:"English",    emoji:"EN"},
  {code:"pap", label:"Papiamento", emoji:"PAP"},
  {code:"nl",  label:"Nederlands", emoji:"NL"},
  {code:"es",  label:"Espanol",    emoji:"ES"},
];

export const T = {
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
