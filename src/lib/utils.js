// ── Pure utility functions shared across the app ───────────────────────────
import { supabase } from "./supabase.js";
import {
  COLORS, PLY, HIGH_RISK,
  FALL_RISK_DIAG, FALL_RISK_MEDS,
  BRADEN_SUBSCALES,
  ADL_ITEMS, ADL_LEVEL_SCORE,
  DEFAULT_PERMS, DEFAULT_INTAKE_ITEMS,
  PW_LEVELS,
} from "./constants.js";

// ── HTML-escape (used in report/PDF generators to prevent XSS) ────────────
export const he = v =>
  String(v == null ? "" : v)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");

// ── Tiny helpers ───────────────────────────────────────────────────────────
export const uid = () => crypto.randomUUID();
export const tod = () => new Date().toISOString().slice(0, 10);

export const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Date / age helpers ─────────────────────────────────────────────────────
export function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}
export function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
}
export function daysSince(d) {
  if (!d) return Infinity;
  return Math.floor((Date.now() - new Date(d + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24));
}
export function daysUntilBirthday(dob) {
  if (!dob) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [, m, day] = dob.split("-").map(Number);
  let next = new Date(today.getFullYear(), m - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, day);
  return Math.ceil((next - today) / (1000 * 60 * 60 * 24));
}

// ── String / avatar helpers ────────────────────────────────────────────────
export function initials(n) {
  if (!n) return "?";
  return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
export function avatarColor(n) {
  if (!n) return COLORS[0];
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) % COLORS.length;
  return COLORS[h];
}

// ── Clinical flag helpers ──────────────────────────────────────────────────
export function getMedFlags(c) {
  const meds = (c.medications || []).filter(m => m.name && m.name.trim());
  const highRisk = meds.filter(m =>
    HIGH_RISK.some(h => m.name.toLowerCase().includes(h.toLowerCase()))
  );
  return { highRisk, polypharmacy: meds.length >= PLY, medCount: meds.length };
}

export function calcFallRisk(client) {
  const factors = []; let score = 0;
  const age = calcAge(client.date_of_birth);
  if (age !== null) {
    if (age >= 85)      { score += 3; factors.push("Age " + age + " (85+)"); }
    else if (age >= 76) { score += 2; factors.push("Age " + age + " (76-85)"); }
    else if (age >= 65) { score += 1; factors.push("Age " + age + " (65-75)"); }
  }
  const diags = (client.diagnoses || []).filter(d => d.value).map(d => d.value.toLowerCase());
  for (const [k, pts] of Object.entries(FALL_RISK_DIAG)) {
    if (diags.some(d => d.includes(k.toLowerCase()))) { score += pts; factors.push(k); }
  }
  const meds = (client.medications || []).filter(m => m.name).map(m => m.name.toLowerCase());
  for (const [k, pts] of Object.entries(FALL_RISK_MEDS)) {
    if (meds.some(m => m.includes(k.toLowerCase()))) { score += pts; factors.push(k); }
  }
  if (meds.length >= 5) { score += 1; factors.push("Polypharmacy (" + meds.length + " meds)"); }
  const level = score >= 6 ? "High" : score >= 3 ? "Moderate" : "Low";
  const color = score >= 6 ? "#ef4444" : score >= 3 ? "#f59e0b" : "#10b981";
  return { score, level, color, factors };
}

export function calcWeightTrend(vitals) {
  const pts = [...(vitals || [])]
    .filter(v => v.weight !== "" && v.weight != null && !isNaN(parseFloat(v.weight)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(v => ({ date: v.date, kg: parseFloat(v.weight) }));
  if (pts.length < 2) return null;
  const latest = pts[pts.length - 1];
  let bestFlag = null;
  for (let i = pts.length - 2; i >= 0; i--) {
    const ref = pts[i];
    const daysDiff = Math.ceil(
      (new Date(latest.date + "T00:00:00") - new Date(ref.date + "T00:00:00")) / 86400000
    );
    if (daysDiff > 90) break;
    const kgDiff = latest.kg - ref.kg;
    const absKg = Math.abs(kgDiff);
    let severity = null;
    if (daysDiff <= 7 && absKg >= 2)  severity = "high";
    else if (daysDiff <= 30 && absKg >= 5) severity = "high";
    else if (daysDiff <= 7 && absKg >= 1)  severity = "medium";
    else if (daysDiff <= 30 && absKg >= 3) severity = "medium";
    if (!severity) continue;
    const candidate = {
      direction: kgDiff > 0 ? "gain" : "loss",
      amount: Math.round(absKg * 10) / 10,
      days: daysDiff, severity,
      fromKg: ref.kg, toKg: latest.kg, fromDate: ref.date, toDate: latest.date,
    };
    if (!bestFlag ||
        (severity === "high" && bestFlag.severity !== "high") ||
        (severity === bestFlag.severity && absKg > bestFlag.amount)) {
      bestFlag = candidate;
    }
  }
  return bestFlag;
}

export function getMissedAppointments(appointments) {
  const today = tod();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const noShows = (appointments || []).filter(a => a.status === "No-Show");
  const overdue = (appointments || []).filter(a => a.status === "Scheduled" && a.date && a.date < today);
  const recentMissed = [...noShows, ...overdue].filter(a => a.date && a.date >= cutoffStr);
  return { noShows, overdue, recentMissed, pattern: recentMissed.length >= 2 };
}

export function checkAbnormalVitals(v) {
  const flags = [];
  const sys = parseFloat(v.bp_systolic), dia = parseFloat(v.bp_diastolic);
  const hr = parseFloat(v.heart_rate), glucose = parseFloat(v.blood_sugar);
  const o2 = parseFloat(v.oxygen_sat), temp = parseFloat(v.temperature);
  if (!isNaN(sys)) {
    if (sys > 160) flags.push({ label: `BP ${sys}/${isNaN(dia) ? "?" : dia} mmHg`, note: "Hypertension", sev: "high" });
    else if (sys < 90) flags.push({ label: `BP ${sys}/${isNaN(dia) ? "?" : dia} mmHg`, note: "Hypotension", sev: "low" });
  }
  if (!isNaN(hr)) {
    if (hr > 100) flags.push({ label: `HR ${hr} bpm`, note: "Tachycardia", sev: "high" });
    else if (hr < 50) flags.push({ label: `HR ${hr} bpm`, note: "Bradycardia", sev: "low" });
  }
  if (!isNaN(glucose)) {
    if (glucose > 180) flags.push({ label: `Glucose ${glucose}`, note: "Hyperglycemia", sev: "high" });
    else if (glucose < 70) flags.push({ label: `Glucose ${glucose}`, note: "Hypoglycemia", sev: "low" });
  }
  if (!isNaN(o2) && o2 < 92) flags.push({ label: `O₂ ${o2}%`, note: "Low oxygen sat.", sev: "low" });
  if (!isNaN(temp)) {
    if (temp > 38.5) flags.push({ label: `Temp ${temp}°C`, note: "Fever", sev: "high" });
    else if (temp < 36.0) flags.push({ label: `Temp ${temp}°C`, note: "Hypothermia", sev: "low" });
  }
  return flags;
}

export function allergyMedConflicts(c) {
  const allergies = (c.allergies || []).filter(a => a.value && a.value.trim()).map(a => a.value.toLowerCase().trim());
  const meds = (c.medications || []).filter(m => m.name && m.name.trim());
  return meds.filter(m => {
    const mn = m.name.toLowerCase().trim();
    return allergies.some(a => mn.includes(a) || a.includes(mn));
  });
}

export function expiryBadge(d) {
  if (d === null) return null;
  if (d < 0)   return { label: "EXPIRED",      color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
  if (d <= 30) return { label: "EXPIRES SOON", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
  if (d <= 60) return { label: "EXPIRING",     color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
  return              { label: "VALID",         color: "#10b981", bg: "rgba(16,185,129,0.1)" };
}

// ── ADL helpers ────────────────────────────────────────────────────────────
export function adlScore(items) {
  return ADL_ITEMS.reduce((s, k) => s + (ADL_LEVEL_SCORE[items?.[k]] ?? 0), 0);
}
export function adlDepLevel(score) {
  if (score <= 6)  return { label: "Low",      color: "#10b981" };
  if (score <= 12) return { label: "Moderate", color: "#f59e0b" };
  return                   { label: "High",     color: "#ef4444" };
}
export function calcAdlSummary(adlLogs) {
  if (!adlLogs || adlLogs.length === 0) return null;
  const sorted = [...adlLogs].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  const score = adlScore(latest.items);
  const dep = adlDepLevel(score);
  let trend = null;
  if (sorted.length >= 2) {
    const prev = adlScore(sorted[1].items);
    trend = score < prev ? "improving" : score > prev ? "declining" : "stable";
  }
  return { latest, score, dep, trend, count: sorted.length };
}

// ── Pain helpers ───────────────────────────────────────────────────────────
export function painLevel(score) {
  const n = Number(score);
  if (n <= 3) return { label: "Mild",     color: "#10b981" };
  if (n <= 6) return { label: "Moderate", color: "#f59e0b" };
  return              { label: "Severe",   color: "#ef4444" };
}
export function calcPainSummary(assessments) {
  if (!assessments || assessments.length === 0) return null;
  const sorted = [...assessments].sort((a, b) =>
    b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || "")
  );
  const latest = sorted[0];
  const latestScore = Number(latest.score ?? 0);
  const level = painLevel(latestScore);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recentModerate = sorted.filter(a => a.date >= cutoffStr && Number(a.score ?? 0) >= 4);
  return { latest, latestScore, level, persistent: recentModerate.length >= 3, recentModerateCount: recentModerate.length, count: sorted.length };
}

// ── Wound helpers ──────────────────────────────────────────────────────────
export function calcWoundSummary(assessments) {
  if (!assessments || assessments.length === 0) return null;
  const bySite = {};
  assessments.forEach(a => {
    const site = a.site || "Unknown";
    if (!bySite[site] || a.date > bySite[site].date) bySite[site] = a;
  });
  const activeSites = Object.values(bySite).filter(a => a.healing_status !== "Healed");
  const healedCount = Object.values(bySite).length - activeSites.length;
  const deteriorating = activeSites.filter(a => a.healing_status === "Deteriorating");
  const highStage = activeSites.filter(a => /Stage\s*(III|IV|3|4)/i.test(a.stage || ""));
  return { activeSites, healedCount, deteriorating, highStage, totalSites: Object.keys(bySite).length };
}

// ── Braden helpers ─────────────────────────────────────────────────────────
export function bradenRisk(score) {
  if (score <= 9)  return { label: "Very High Risk", color: "#dc2626", turning: "Every 1-2 hours" };
  if (score <= 12) return { label: "High Risk",      color: "#ef4444", turning: "Every 2 hours" };
  if (score <= 14) return { label: "Moderate Risk",  color: "#f59e0b", turning: "Every 2-3 hours" };
  if (score <= 18) return { label: "Mild Risk",      color: "#06b6d4", turning: "Every 4 hours" };
  return                   { label: "No Risk",        color: "#10b981", turning: "Routine repositioning" };
}
export function bradenScore(entry) {
  return BRADEN_SUBSCALES.reduce((s, sub) => s + (Number(entry[sub.key] ?? sub.max)), 0);
}
export function calcBradenSummary(assessments) {
  if (!assessments || assessments.length === 0) return null;
  const sorted = [...assessments].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  const score = bradenScore(latest);
  const risk = bradenRisk(score);
  let trend = null;
  if (sorted.length >= 2) {
    const prev = bradenScore(sorted[1]);
    trend = score > prev ? "improving" : score < prev ? "declining" : "stable";
  }
  return { latest, score, risk, trend, count: sorted.length };
}

// ── Cognitive helpers ──────────────────────────────────────────────────────
export function cognitiveLevel(testType, score) {
  const n = Number(score);
  if (testType === "MoCA") {
    if (n >= 26) return { label: "Normal",              color: "#10b981" };
    if (n >= 18) return { label: "Mild Impairment",     color: "#f59e0b" };
    if (n >= 10) return { label: "Moderate Impairment", color: "#ef4444" };
    return               { label: "Severe Impairment",  color: "#dc2626" };
  }
  if (n >= 25) return { label: "Normal / Borderline",  color: "#10b981" };
  if (n >= 20) return { label: "Mild Impairment",      color: "#f59e0b" };
  if (n >= 10) return { label: "Moderate Impairment",  color: "#ef4444" };
  return               { label: "Severe Impairment",   color: "#dc2626" };
}
export function calcCognitiveSummary(assessments) {
  if (!assessments || assessments.length === 0) return null;
  const sorted = [...assessments].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  const score = Number(latest.score ?? 0);
  const level = cognitiveLevel(latest.test_type || "MMSE", score);
  let trend = null;
  if (sorted.length >= 2) {
    const prev = Number(sorted[1].score ?? 0);
    trend = score > prev ? "improving" : score < prev ? "declining" : "stable";
  }
  const daysSinceAssess = Math.floor((new Date() - new Date(latest.date + "T00:00:00")) / 86400000);
  return { latest, score, level, trend, count: sorted.length, daysSince: daysSinceAssess, dueReassess: daysSinceAssess >= 180 };
}

// ── Continence helpers ─────────────────────────────────────────────────────
export function calcContinenceSummary(logs) {
  if (!logs || logs.length === 0) return null;
  const sorted = [...logs].sort((a, b) =>
    b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || "")
  );
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = sorted.filter(l => l.date >= cutoffStr);
  const dayMap = {}; recent.forEach(l => { dayMap[l.date] = (dayMap[l.date] || 0) + 1; });
  const days = Object.keys(dayMap).length;
  const avgPerDay = days > 0 ? (recent.length / days).toFixed(1) : 0;
  const typeCount = {}; recent.forEach(l => { typeCount[l.type || "Other"] = (typeCount[l.type || "Other"] || 0) + 1; });
  const mostCommonType = Object.keys(typeCount).sort((a, b) => typeCount[b] - typeCount[a])[0] || null;
  const skinIssue = recent.some(l => l.skin_condition === "Breakdown" || l.skin_condition === "Maceration");
  return { sorted, recent, total: logs.length, recentCount: recent.length, avgPerDay, mostCommonType, skinIssue, highFrequency: Number(avgPerDay) >= 4, days };
}

// ── Nutrition / MUST helpers ───────────────────────────────────────────────
export function mustRisk(score) {
  const n = Number(score);
  if (n === 0) return { label: "Low Risk",    color: "#10b981", action: "Routine care — repeat screening weekly" };
  if (n === 1) return { label: "Medium Risk", color: "#f59e0b", action: "Observe — document 3-day dietary intake" };
  return               { label: "High Risk",  color: "#ef4444", action: "Treat — refer to dietitian" };
}
export function mustScore(entry) {
  return (Number(entry.bmi_score ?? 0)) + (Number(entry.weight_loss_score ?? 0)) + (entry.acute_illness ? 2 : 0);
}
export function calcNutritionSummary(assessments) {
  if (!assessments || assessments.length === 0) return null;
  const sorted = [...assessments].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  const score = mustScore(latest);
  const risk = mustRisk(score);
  let trend = null;
  if (sorted.length >= 2) {
    const prev = mustScore(sorted[1]);
    trend = score < prev ? "improving" : score > prev ? "worsening" : "stable";
  }
  return { latest, score, risk, trend, count: sorted.length };
}

// ── Password scoring ───────────────────────────────────────────────────────
export function scorePassword(pw) {
  if (!pw || pw.length < 6) return 0;
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (/(.)\1{3,}/.test(pw)) score = Math.max(1, score - 1);
  return Math.min(4, score);
}

// ── RBAC ───────────────────────────────────────────────────────────────────
// Module-level fallback cache — kept for any non-React callers.
// React components should use PermissionsContext (see App.jsx) so that
// permission changes trigger re-renders.
export let LOADED_PERMS = null;

// perms param is optional — pass the React context value to get reactive behaviour;
// omit (or pass null) to fall back to the module-level cache or DEFAULT_PERMS.
export function can(role, action, perms = LOADED_PERMS) {
  if (perms) return (perms[role] || []).includes(action);
  return (DEFAULT_PERMS[role] || []).includes(action);
}

// Fetches permissions from DB, updates the module-level cache, and returns
// the built perms object so callers can store it in React state.
export async function loadPermissions(companyId) {
  try {
    const { data: global } = await supabase.from("permissions").select("role,action,allowed");
    const { data: company } = companyId
      ? await supabase.from("company_permissions").select("role,action,allowed").eq("company_id", companyId)
      : { data: [] };
    const perms = {};
    (global || []).forEach(({ role, action, allowed }) => {
      if (!perms[role]) perms[role] = [];
      if (allowed && !perms[role].includes(action)) perms[role].push(action);
    });
    (company || []).forEach(({ role, action, allowed }) => {
      if (!perms[role]) perms[role] = [];
      if (allowed && !perms[role].includes(action)) { perms[role].push(action); }
      else if (!allowed) { perms[role] = perms[role].filter(a => a !== action); }
    });
    LOADED_PERMS = perms; // keep module var in sync as fallback
    return perms;
  } catch (e) {
    console.error("Failed to load permissions", e);
    LOADED_PERMS = null;
    return null;
  }
}

// ── DB serialisation ───────────────────────────────────────────────────────
export function toDb(d) {
  return {
    id: d.id, name: d.name, date_of_birth: d.date_of_birth || null,
    phone: d.phone, room_or_address: d.room_or_address,
    emergency_contact: d.emergency_contact, emergency_phone: d.emergency_phone,
    azv_number: d.azv_number, dr_di_cas: d.dr_di_cas, dr_specialista: d.dr_specialista,
    photo_url: d.photo_url || null, status: d.status || "Active",
    diagnoses:              JSON.stringify(d.diagnoses),
    allergies:              JSON.stringify(d.allergies),
    medications:            JSON.stringify(d.medications),
    session_notes:          JSON.stringify(d.session_notes),
    vitals:                 JSON.stringify(d.vitals || []),
    care_plan:              JSON.stringify(d.care_plan || []),
    documents:              JSON.stringify(d.documents || []),
    inventory:              JSON.stringify(d.inventory || []),
    family_contacts:        JSON.stringify(d.family_contacts || []),
    appointments:           JSON.stringify(d.appointments || []),
    incidents:              JSON.stringify(d.incidents || []),
    intake_checklist:       JSON.stringify(d.intake_checklist || []),
    adl_logs:               JSON.stringify(d.adl_logs || []),
    pain_assessments:       JSON.stringify(d.pain_assessments || []),
    wound_assessments:      JSON.stringify(d.wound_assessments || []),
    braden_assessments:     JSON.stringify(d.braden_assessments || []),
    cognitive_assessments:  JSON.stringify(d.cognitive_assessments || []),
    continence_logs:        JSON.stringify(d.continence_logs || []),
    nutrition_assessments:  JSON.stringify(d.nutrition_assessments || []),
    mar_log:                JSON.stringify(d.mar_log || []),
  };
}

export function fromDb(row) {
  const p = (v, fb) => { try { return v ? JSON.parse(v) : fb; } catch { return fb; } };
  return {
    ...row,
    diagnoses:             p(row.diagnoses,             [{ id: uid(), value: "" }]),
    allergies:             p(row.allergies,             [{ id: uid(), value: "" }]),
    medications:           p(row.medications,           [{ id: uid(), name: "", dosage: "", frequency: "", timing: {} }]),
    session_notes:         p(row.session_notes,         [{ id: uid(), date: tod(), role: "", staff_name: "", text: "" }]),
    vitals:                p(row.vitals,                []),
    care_plan:             p(row.care_plan,             []),
    documents:             p(row.documents,             []),
    inventory:             p(row.inventory,             []),
    family_contacts:       p(row.family_contacts,       []),
    appointments:          p(row.appointments,          []),
    incidents:             p(row.incidents,             []),
    intake_checklist:      p(row.intake_checklist,      []),
    adl_logs:              p(row.adl_logs,              []),
    pain_assessments:      p(row.pain_assessments,      []),
    wound_assessments:     p(row.wound_assessments,     []),
    braden_assessments:    p(row.braden_assessments,    []),
    cognitive_assessments: p(row.cognitive_assessments, []),
    continence_logs:       p(row.continence_logs,       []),
    nutrition_assessments: p(row.nutrition_assessments, []),
    mar_log:               p(row.mar_log,               []),
  };
}

export function emptyClient() {
  return {
    id: uid(), name: "", date_of_birth: "", phone: "", room_or_address: "",
    emergency_contact: "", emergency_phone: "", azv_number: "", dr_di_cas: "",
    dr_specialista: "", photo_url: "", status: "Active",
    diagnoses:   [{ id: uid(), value: "" }],
    medications: [{ id: uid(), name: "", dosage: "", frequency: "", timing: { morning: false, afternoon: false, evening: false, night: false } }],
    allergies:   [{ id: uid(), value: "" }],
    session_notes: [{ id: uid(), date: tod(), role: "", staff_name: "", text: "" }],
    vitals: [], care_plan: [], documents: [], inventory: [],
    family_contacts: [], appointments: [], incidents: [],
    intake_checklist: DEFAULT_INTAKE_ITEMS.map(i => ({
      id: uid(), key: i.key, label: i.label, done: false, completed_by: "", completed_at: "",
    })),
  };
}
