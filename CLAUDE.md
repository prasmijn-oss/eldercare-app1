# CareManager — CLAUDE.md

## Project Overview
Full-stack eldercare client management app built with React 19 + Vite.  
Backend: Supabase (auth, Postgres, storage).  
Entire frontend lives in **`src/App.jsx`** (single-file architecture, ~4341 lines).

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
- **Dark/light mode**: CSS `filter: invert(1) hue-rotate(180deg)` toggled via `html.cm-light` class; images double-inverted
- **Keyboard shortcuts**: global `keydown` listener in App; inactive when input/textarea/select is focused
- **PWA**: `public/manifest.json` + `public/sw.js` (cache-first for static assets); registered in `index.html`
- **React import**: only named hooks imported — `import { useState, useEffect, useCallback, useRef, Fragment } from "react"`. Never use `React.Fragment` or `React.*` — use `Fragment` or `<>` shorthand
- **Bulk selection**: React `Set` state, toggled on sidebar client click when `bulkMode` is true

## Completed Features

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
