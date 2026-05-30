# CareManager — CLAUDE.md

## Project Overview
Full-stack eldercare client management app built with React 19 + Vite.  
Backend: Supabase (auth, Postgres, storage).  
Frontend is split across `src/App.jsx` (~7,300 lines) and extracted components in `src/components/`.

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
- `clients` — JSONB fields: diagnoses, medications, allergies, session_notes, vitals, care_plan, documents, inventory, family_contacts, appointments, incidents, intake_checklist, prn_log, controlled_sub_log, mar_log, preventive_care, custom_fields, adl_logs, pain_assessments, wound_assessments, braden_assessments, cognitive_assessments, continence_logs, nutrition_assessments
- `companies` — logo_url, hours_of_operation (JSONB), mission_statement, custom_fields_schema (JSONB)
- `user_roles` — user_id, company_id, role, name, email, username, avatar_url, login_history (JSONB)
- `permissions` — global role/action permissions
- `company_permissions` — per-company overrides
- `audit_log` — performed_by, action, client_name, company_id, performed_at
- `handover_notes` — company_id, date, shift, summary, outgoing_staff, incoming_staff, key_events (JSONB), action_items (JSONB), signed_off_by, signed_off_at, created_by, created_at

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
- **Recent clients**: tracked in localStorage key `cm-recent` (array of {id, name, photo_url}, max 5). **Never pass a partial localStorage object to ClientForm** — always resolve `clients.find(c=>c.id===rc.id)` first.
- **Dark/light mode**: CSS variable token switching — `html.cm-light` in `index.css` overrides all `--color-*` semantic tokens to light values + sets `filter: none !important`. No filter-invert used. Inline styles use `var(--color-bg-card)`, `var(--color-text-primary)`, `var(--color-text-dim)`, `var(--color-text-muted)`, `var(--color-border)`, `var(--color-bg-surface)`, `var(--color-bg-base)`. Toggled via `darkMode` state + `useEffect` on `document.documentElement`; persisted in `cm-dark` localStorage. **Do NOT reintroduce hardcoded hex for the 8 replaced token colors — use CSS vars.**
- **GCSS**: string array of CSS rules joined with `\n`, injected via `<style dangerouslySetInnerHTML={{__html:GCSS}}/>` in the App return. Primary global CSS mechanism alongside `src/index.css`. CSS vars work inside GCSS strings.
- **CSS token colors** (always use these, never raw hex for the base palette): `var(--color-bg-base)` (#07091c dark), `var(--color-bg-surface)` (#0c0f1f), `var(--color-bg-card)` (#111427), `var(--color-text-primary)` (#f0f2fa), `var(--color-text-secondary)` (0.5 opacity), `var(--color-text-dim)` (0.35 opacity), `var(--color-text-muted)` (0.25 opacity), `var(--color-border)` (rgba(255,255,255,0.07) dark)
- **Keyboard shortcuts**: global `keydown` listener in App; inactive when input/textarea/select is focused
- **PWA**: `public/manifest.json` + `public/sw.js` (stale-while-revalidate for same-origin assets, bypass for Supabase/esm.sh/fonts); SW is `caremanager-v3`; icon PNGs pre-cached
- **Extracted components**: `src/components/Dashboard.jsx` (TiltCard, FlipCard, Dashboard), `src/components/ClinicalComponents.jsx` (ADLTracker, PainAssessment, WoundAssessment, BradenScale, CognitiveScreening, ContinenceLog, NutritionScreening, IncidentReports, IntakeChecklist), `src/components/UserManagement.jsx` (UserManagement, PasswordStrengthMeter), `src/components/AuditTrail.jsx` (AuditTrail)
- **PermissionsContext**: `src/lib/PermissionsContext.jsx` — `PermissionsContext` + `usePermissions()` hook; `perms` state lives in App and is passed via Provider; consumed by any component needing reactive permission checks. `refreshPerms()` reloads from DB.
- **Constants**: `src/lib/constants.js` — `IBTN`, `ABTN`, `INP`, `LBL`, `GCSS`, `ADL_LABELS`, `ADL_ITEMS`, `COLORS`, `BRADEN_MAX`, etc. **All shared style objects and global CSS live here.**
- **React import**: only named hooks imported — `import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from "react"`. Never use `React.Fragment` or `React.*` — use `Fragment` or `<>` shorthand
- **Bulk selection**: React `Set` state, toggled on sidebar client click when `bulkMode` is true
- **User profile**: accessed by clicking the avatar or display name in the sidebar footer → sets `view="profile"`
- **User edit (inline)**: clicking ✏️ on a user row in UserManagement sets `editingUser` state; row cells flip to inputs in-place; saved via `saveUserEdit(userId)`
- **Edit view guard**: IIFE in edit view resolves `clients.find(c=>c.id===selected.id)||selected`; returns `null` if `!editClient.diagnoses` (partial object guard). Detail view also returns `null` if `!fresh`.
- **Adding a JSONB field**: (1) `ALTER TABLE clients ADD COLUMN ... TEXT` on both DBs, (2) add to `fromDb()` with default, (3) add to `toDb()`, (4) add UI.

## Documentation
- `docs/staff-guide.md` — end-user guide: login, navigation, all client sections, notifications, bulk actions
- `docs/admin-guide.md` — admin guide: user management, permissions, audit trail, company settings
- `docs/technical-guide.md` — developer guide: architecture, CSS layers, JSONB pattern, light mode, gotchas, deploy

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

### Clinical Assessments
- [x] ADL tracking (bathing, dressing, toileting, eating — daily checklist with trends)
- [x] Pain assessment (numeric/FACES scale, frequency + effectiveness log)
- [x] Wound & skin assessment (photo-based, measurements, healing timeline)
- [x] Pressure ulcer risk — Braden Scale (auto-score + turning schedule)
- [x] Cognitive screening (MMSE/MoCA with periodic re-assessment alerts)
- [x] Continence monitoring (incontinence log, patterns, product tracking)
- [x] Nutritional risk screening (appetite changes, swallowing flags, dietary alerts)

### Dashboard
- [x] Stats & age distribution chart
- [x] Recent clients strip (last 5 visited, localStorage)
- [x] Quick note widget (auto-saved, localStorage)
- [x] 3fr/2fr grid — Recent Clients card (avatar, age, room, top diagnosis, fall risk pill) + Active Alerts panel (wired to buildNotifications, color-coded by type, click → client detail)

### Client Navigation
- [x] Clients dedicated page — full-page card grid replacing sidebar client list; filter pills (All Active / HFR / MFR / LFR / Archived); status sub-filter; skeleton loading; empty state; bulk action bar (fixed bottom)
- [x] Incidents aggregate view (`view==="incidents"`) — all incidents across clients, sorted by date, severity color-coded, click → client detail
- [x] Medications aggregate view (`view==="medications"`) — flagged clients panel (polypharmacy + high-risk) + full medication list with HIGH RISK badges

### User Management
- [x] Assign existing user to additional companies
- [x] Confirmation dialog before destructive role actions (role change, deactivate, remove from company)
- [x] Staff activity report — 📊 Activity tab: per-staff audit breakdown, date filter, drilldown

### Notifications & UX
- [x] In-app notification center (bell icon, slide-out panel, unread badge)
- [x] Email alert preferences UI (localStorage toggles)
- [x] Light / dark mode — CSS variable token switching (no filter-invert); `html.cm-light` overrides all semantic tokens; ~600 inline hex values replaced with CSS vars
- [x] Keyboard shortcuts (d, n, k, b, ?, Esc) — `k` auto-navigates to Clients page before focusing search
- [x] PWA — installable, service worker, manifest
- [x] Topbar search input (160px) — auto-navigates to Clients page on focus/type
- [x] Session timeout warning (idle detection, countdown, stay-logged-in / logout actions)

### Sidebar
- [x] Incidents nav item (Main group) — red badge showing last-7-day incident count
- [x] Medications nav item (Main group) — amber badge showing flagged client count
- [x] Clients nav item with active client count badge

### Mobile (Tier 1 fixes)
- [x] iOS auto-zoom prevention on inputs (fontSize 16px)
- [x] Touch targets ≥ 44px (IBTN, ABTN, sidebar search)
- [x] Notification panel full-width on mobile
- [x] Responsive grids (.inv-grid, .notes-filter, .three-col, .four-col)
- [x] Duplicate sticky bars on mobile fixed (.main-topbar hidden, mob-hdr shown)

### Mobile (Tier 2 fixes)
- [x] `touch-action: manipulation` on all `button` + `a` elements (GCSS) — eliminates 300ms tap delay
- [x] `@media (prefers-reduced-motion: reduce)` in GCSS — disables all transitions/animations for users who need it
- [x] TiltCard/FlipCard touch equivalents — `touchmove` tilt + `touchend` reset in Dashboard.jsx; guarded by `prefersReducedMotion`
- [x] SearchDrop `touchstart` dismiss — close dropdown on outside touch
- [x] Nav items `min-height: 44px` (GCSS `.nav-item`)
- [x] Sidebar footer icon buttons 28px → 36px (Notifications, Toggle theme, Sign out)
- [x] Filter pills min touch target — `.filter-pill` class (36px min-height on mobile); applied to risk + status filter pills in Clients view
- [x] `env(safe-area-inset-*)` on mob-hdr (top) and sidebar-footer (bottom)
- [x] aria-labels on all IBTN remove buttons (`aria-label="Remove"`)
- [x] SW extended caching — icon-192.png, icon-512.png, apple-touch-icon.png added to PRECACHE; bumped to `caremanager-v3`

### Performance
- [x] `useMemo` for sidebar badge counts (incident, medication, active client counts)
- [x] `useMemo` for `filteredUsers` in UserManagement (dedup + search + tab filter)
- [x] `useMemo` for dashboard flagged medications list + aggregate medications view
- [x] Lazy client detail loading — `loadClients` fetches reduced column set; `loadClientDetail` fetches full row on demand
- [x] AuditTrail server-side pagination (`range()`, page size 100) + server-side filters
- [x] Private `client-photos` Supabase bucket — signed URLs via `ClientPhoto` component (1h TTL, backward-compat with legacy public URLs)
- [x] Non-blocking census PDF generation (`setTimeout(0)` yield before heavy computation)
- [x] Supabase Realtime subscription — client data auto-refreshes on any DB change without manual reload

### PWA
- [x] Icon PNGs generated — `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` (indigo rounded-rect with white "CM" bitmap text)

### Architecture / Code Quality
- [x] LOADED_PERMS → React context (`PermissionsContext`, `usePermissions`, `refreshPerms`) — no prop-drilling for permissions
- [x] Clinical components extracted → `src/components/ClinicalComponents.jsx` (9 components)
- [x] Dashboard components extracted → `src/components/Dashboard.jsx` (TiltCard, FlipCard, Dashboard)
- [x] UserManagement extracted → `src/components/UserManagement.jsx`
- [x] AuditTrail extracted → `src/components/AuditTrail.jsx`
- [x] `ADL_LABELS` centralized in `src/lib/constants.js`
- [x] UTF-8 mojibake fixed in App.jsx (all emoji/Unicode restored after double-encoding corruption)
- [x] AuditTrail stuck-on-loading bug fixed (`AUDIT_PAGE` constant was missing in extracted file)

### Admin
- [x] Audit trail
- [x] Company Settings view
- [x] Permissions panel (global + per-company overrides)

### Documentation
- [x] Staff guide (`docs/staff-guide.md`)
- [x] Admin guide (`docs/admin-guide.md`)
- [x] Technical guide (`docs/technical-guide.md`)

## Migration Scripts
- `migrateClient.js` — migrates a single client + their company between Supabase projects. Searches source DB by client name, fetches company record, prompts for approval, then upserts company + client into target DB.

## Staging Notes
- Staging Vercel project (`eldercare-app1-staging`) has **no env vars set** — falls back to hardcoded staging Supabase (`kpwzeawgrqdsezflvjkm`) in code
- Staging Supabase has test companies ("Test Company", "Test 2") and test clients (test3–test9)
- `p.rasmijn@gmail.com` is `superadmin` on "Test Company" in staging — logs straight to dashboard (single company)
- Staging RLS gotcha: `get_my_role()` uses `LIMIT 1` on user_roles — if a user has multiple rows, the first one's role is used. Keep superadmin row as the only/first row for that user to avoid RLS blocking company reads.
- `ale@ale.com` has a `user_roles` row on "Test 2" company (added via SQL INSERT) — was previously invisible in User Management

## Pending Features

### Security & Auth
- [ ] Password strength indicator on create/edit user (scorePassword() exists in utils.js, UI not wired on create/edit user form)
- [x] Force password change enforcement — fully blocks app access until changed (`force_password_change` flag in user_metadata)
- [ ] Two-factor authentication
- [ ] IP-based login alerts

### Medication Safety
- [x] PRN (as-needed) medication justification log — `PRNLog` component in ClinicalComponents.jsx; `prn_log` JSON field on clients
- [x] Drug interaction checker — `checkDrugInteractions()` in utils.js; 42 rules in constants.js; live warnings in med edit form
- [x] Controlled substance audit trail (witness signatures) — `ControlledSubLog` in ClinicalComponents.jsx; `controlled_sub_log` field on clients

### Communication
- [ ] Secure internal messaging between staff (tied to client records)
- [ ] Family portal — read-only view for family members per client
- [x] Shift handover notes — `HandoverNotes` in ClinicalComponents.jsx; `handover_notes` Supabase table; sign-off workflow; 4 shifts
- [ ] Care team push alerts for critical events (falls, vital anomalies)

### Reports
- [x] Monthly client summary PDF — in `ReportsView` (App.jsx ~2053); full clinical record export via print
- [x] MAR (Medication Administration Record) export — `MARTracker` component + 31-day printable grid; `mar_log` field on clients
- [x] Census report — in `ReportsView`; age bands, fall risk distribution, clinical flags, staff activity

### Analytics
- [x] Readmission / hospitalization risk dashboard — `calcReadmissionRisk()` in utils.js; dedicated `view==="readmission"` (gated by `readmission` permission)
- [x] Preventive care compliance — `PreventiveCare` in ClinicalComponents.jsx; vaccines + screenings with intervals; `preventive_care` field on clients
- [ ] Staff productivity metrics (note timeliness, task completion rates)
- [ ] Incident trend analysis (fall rates, medication errors by shift/season)

### Operations
- [x] Bed & room management (assignments, isolation flags) — `RoomsBoard` view (App.jsx ~3717); gated by `rooms` permission; read-only display
- [ ] Supply inventory forecasting (demand prediction from census + ADL data)
- [ ] Electronic Visit Verification / EVV (GPS check-in for home health visits)
- [ ] Training & certification tracker for staff (CPR, HIPAA — expiry alerts)

### Quality & Compliance
- [x] Root cause analysis workflow on incidents — RCA form embedded in `IncidentReports` (ClinicalComponents.jsx ~962); contributing factors, corrective actions, status tracking
- [ ] Care plan review signatures (patient/family sign-off, reassessment scheduling)
- [ ] Regulatory inspection checklist generator

### Clinical
- [x] Weight trend alert — `calcWeightTrend()` in utils.js; alert banner in VitalsTracker; notification in `buildNotifications()`
- [x] Missed appointment tracker — `getMissedAppointments()` in utils.js; dedicated aggregate view; pattern detection (2+ missed in 30d)

### Company / Admin
- [ ] Staff scheduling
- [x] Custom fields per company — field builder in Company Settings; renders in ClientForm + detail view; `custom_fields_schema` on companies, `custom_fields` on clients
- [ ] Data retention policy
- [ ] Company-wide announcement banner

### Notifications (backend)
- [ ] Actual email delivery (requires edge function + email provider) — email preference toggles exist in UI (localStorage only, cosmetic)
