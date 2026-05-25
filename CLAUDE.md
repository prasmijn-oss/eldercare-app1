# CareManager — CLAUDE.md

## Project Overview
Full-stack eldercare client management app built with React 19 + Vite.  
Backend: Supabase (auth, Postgres, storage).  
Entire frontend lives in **`src/App.jsx`** (single-file architecture, ~6500+ lines).

## Tech Stack
- React 19, Vite 8
- Supabase JS (loaded via ESM CDN: `https://esm.sh/@supabase/supabase-js@2.49.0`)
- Inline CSS styles (no UI library)
- Deployed via Vercel (two projects: prod + staging)

## Supabase Projects
| Environment | Project ID | URL |
|---|---|---|
| **Production** | `arwvosghwecyzpqartrh` | `https://arwvosghwecyzpqartrh.supabase.co` |
| **Staging** | `kpwzeawgrqdsezflvjkm` | `https://kpwzeawgrqdsezflvjkm.supabase.co` |

Supabase credentials are read from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars (set in Vercel per project). Fallback defaults point to staging.

## Vercel Projects
| Branch | Vercel Project |
|---|---|
| `main` | `eldercare-app1` |
| `staging` | `eldercare-app1-staging` |

## Database Schema (public)
- `clients` — JSONB fields: diagnoses, medications, allergies, session_notes, vitals, care_plan, documents, inventory, family_contacts, appointments, incidents, intake_checklist
- `companies` — logo_url, hours_of_operation (JSONB), mission_statement, etc.
- `user_roles` — user_id, company_id, role, name, email, username, avatar_url, login_history (JSONB)
- `permissions` — global role/action permissions
- `company_permissions` — per-company overrides
- `audit_log` — performed_by, action, client_name, company_id, performed_at

## RBAC Roles
`superadmin` > `admin` > `power_user` > `user` > `inactive`

## Deploy Workflow
After each feature on **staging**, merge into **main** and push to remote:
```
git checkout main && git merge staging && git push origin main && git checkout staging
```

## Key Patterns
- **JSONB-as-TEXT**: complex fields stored as JSON strings, parsed via `fromDb()` using helper `p(val, default)`
- **Inline save**: `inlineUpdate(field, value)` saves a single JSON field without full edit flow
- **Fall risk**: `calcFallRisk(client)` — weighted score from age, diagnoses (FALL_RISK_DIAG), medications (FALL_RISK_MEDS), polypharmacy
- **Notifications**: `buildNotifications(clients)` — client-side, scans expiring docs / upcoming appointments / high fall risk / recent incidents
- **Recent clients**: tracked in localStorage key `cm-recent` (array of {id, name, photo_url}, max 5)
- **Dark/light mode**: `html.cm-light { filter: invert(1) hue-rotate(180deg) }` in GCSS; images/video get double-invert `filter: invert(1) hue-rotate(180deg)` to restore correct colours; toggled via `darkMode` state + `useEffect` on `document.documentElement`; persisted in `cm-dark` localStorage. **Do NOT add `filter: none` to `html.cm-light` in index.css — it breaks the toggle.**
- **GCSS**: string array of CSS rules joined with `\n`, injected via `<style dangerouslySetInnerHTML={{__html:GCSS}}/>` in the App return. Primary global CSS mechanism alongside `src/index.css`.
- **Keyboard shortcuts**: global `keydown` listener in App; inactive when input/textarea/select is focused
- **PWA**: `public/manifest.json` + `public/sw.js` (cache-first for static assets); registered in `index.html`
- **React import**: only named hooks imported — `import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from "react"`. Never use `React.Fragment` or `React.*` — use `Fragment` or `<>` shorthand
- **Bulk selection**: React `Set` state, toggled on sidebar client click when `bulkMode` is true
- **User profile**: accessed by clicking the avatar or display name in the sidebar footer → sets `view="profile"`
- **User edit (inline)**: clicking ✏️ on a user row in UserManagement sets `editingUser` state; row cells flip to inputs in-place; saved via `saveUserEdit(userId)`

## Completed Features

### Visual / Theme
- [x] **Full UI redesign** — DM Sans + DM Mono typography; three-layer token system (Primitive → Semantic → Component) in `src/index.css`; dark palette `#07091c` base / `#0c0f1f` surface / `#111427` cards
- [x] **Flat design** — all neumorphic inset/extruded shadows removed; resting `0 1px 3px rgba(0,0,0,0.3)`, hover `0 12px 32px rgba(0,0,0,0.4)`
- [x] New sidebar — grouped nav (Main / Management / Admin), SVG stroke icons, 3px left accent bar for active state, user footer with avatar + bell + theme toggle + sign-out
- [x] Sticky topbar — personalized greeting, DM Mono date + active client count, gradient New Client button
- [x] TiltCard — mouse-tracked 3D rotation on dashboard stat cards; ambient glow `radial-gradient` overlay; flat shadows
- [x] FlipCard row — 3 cards (Medications, Intake Progress, Incidents) hover-to-flip with gradient back face
- [x] Login / LangPicker / ForcePasswordChange — gradient logo mark SVG, gradient CTA buttons, `#07091c` page background
- [x] `.client-row` + `.dash-row` CSS hover tint (no translateX); `.card-hover` lift utility

### Core / Auth
- [x] Multi-language UI (EN, Papiamento, NL, ES)
- [x] Username login (user_roles.username; accepts email or username)
- [x] Multi-company support + company picker on login
- [x] Switch Company button in sidebar (2+ companies)
- [x] RBAC with DB-driven permissions (`can(role, action)`)

### Client Management
- [x] Client CRUD with photo upload
- [x] Diagnoses, medications (polypharmacy flags), allergies
- [x] Session notes with filters
- [x] Vitals tracking with sparkline charts
- [x] Care plans, document expiry tracking, inventory
- [x] Emergency card + PDF export
- [x] Bulk actions — archive/export multiple clients
- [x] Family contacts module (multiple contacts, relationship labels)
- [x] Appointment / transport log (type, status, transport, notes)
- [x] Fall risk score (auto-calculated from diagnoses + meds + age)
- [x] Incident reports (falls, behavioral events, severity levels)
- [x] Client intake checklist / onboarding workflow (progress bar, auto-stamp)

### Dashboard
- [x] Stats & age distribution chart
- [x] Recent clients strip (last 5 visited, localStorage)
- [x] Quick note widget (auto-saved, localStorage)

### User Management
- [x] Assign existing user to additional companies
- [x] Confirmation dialog before destructive role actions (role change, deactivate, remove from company)
- [x] Staff activity report — 📊 Activity tab: per-staff audit breakdown, date filter, drilldown

### Notifications & UX
- [x] In-app notification center (bell icon, slide-out panel, unread badge)
- [x] Email alert preferences UI (localStorage toggles)
- [x] Light / dark mode toggle (☀️/🌙, persisted)
- [x] Keyboard shortcuts (d, n, k, b, ?, Esc)
- [x] PWA — installable, service worker, manifest

### Admin
- [x] Audit trail
- [x] Company Settings view
- [x] Permissions panel (global + per-company overrides)

## Migration Scripts
- `migrateClient.js` — migrates a single client + their company between Supabase projects. Searches source DB by client name, fetches company record, prompts for approval, then upserts company + client into target DB.

## Staging Notes
- Staging Vercel project (`eldercare-app1-staging`) has **no env vars set** — falls back to hardcoded staging Supabase (`kpwzeawgrqdsezflvjkm`) in code
- Staging Supabase has test companies ("Test Company", "Test 2") and test clients (test3–test9)
- `p.rasmijn@gmail.com` is `superadmin` on "Test Company" in staging — logs straight to dashboard (single company)
- Staging RLS gotcha: `get_my_role()` uses `LIMIT 1` on user_roles — if a user has multiple rows, the first one's role is used. Keep superadmin row as the only/first row for that user to avoid RLS blocking company reads.
- Full UI redesign is on `staging` branch — **not yet merged to `main`**

## Pending Features

### Security & Auth
- [ ] Password strength indicator on create/edit user
- [ ] Session timeout warning
- [ ] Force password change enforcement (currently only a UI note)
- [ ] Two-factor authentication
- [ ] IP-based login alerts

### Reports
- [ ] Monthly client summary PDF
- [ ] MAR (Medication Administration Record) export
- [ ] Census report

### Clinical
- [ ] Weight trend alert (flag rapid gain/loss from vitals history)
- [ ] Missed appointment tracker

### Company / Admin
- [ ] Staff scheduling
- [ ] Custom fields per company
- [ ] Data retention policy
- [ ] Company-wide announcement banner

### Notifications (backend)
- [ ] Actual email delivery (requires edge function + email provider)

### Clinical Assessments
- [x] ADL tracking (bathing, dressing, toileting, eating — daily checklist with trends)
- [x] Pain assessment (numeric/FACES scale, frequency + effectiveness log)
- [x] Wound & skin assessment (photo-based, measurements, healing timeline)
- [x] Pressure ulcer risk — Braden Scale (auto-score + turning schedule)
- [x] Cognitive screening (MMSE/MoCA with periodic re-assessment alerts)
- [x] Continence monitoring (incontinence log, patterns, product tracking)
- [x] Nutritional risk screening (appetite changes, swallowing flags, dietary alerts)

### Medication Safety
- [ ] PRN (as-needed) medication justification log
- [ ] Drug interaction checker (flag conflicts when adding new meds)
- [ ] Controlled substance audit trail (witness signatures)

### Communication
- [ ] Secure internal messaging between staff (tied to client records)
- [ ] Family portal — read-only view for family members per client
- [ ] Shift handover notes (structured template, sign-off verification)
- [ ] Care team push alerts for critical events (falls, vital anomalies)

### Analytics
- [ ] Readmission / hospitalization risk dashboard
- [ ] Preventive care compliance (vaccines, screenings — scheduled vs. completed)
- [ ] Staff productivity metrics (note timeliness, task completion rates)
- [ ] Incident trend analysis (fall rates, medication errors by shift/season)

### Operations
- [ ] Bed & room management (assignments, isolation flags, clean schedules)
- [ ] Supply inventory forecasting (demand prediction from census + ADL data)
- [ ] Electronic Visit Verification / EVV (GPS check-in for home health visits)
- [ ] Training & certification tracker for staff (CPR, HIPAA — expiry alerts)

### Quality & Compliance
- [ ] Root cause analysis workflow on incidents (corrective action tracking)
- [ ] Care plan review signatures (patient/family sign-off, reassessment scheduling)
- [ ] Regulatory inspection checklist generator
