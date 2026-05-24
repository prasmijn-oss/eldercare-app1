# CareManager — CLAUDE.md

## Project Overview
Full-stack eldercare client management app built with React 19 + Vite.  
Backend: Supabase (auth, Postgres, storage).  
Entire frontend lives in **`src/App.jsx`** (single-file architecture, ~2700+ lines).

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
- `clients` — JSONB fields: diagnoses, medications, allergies, session_notes, vitals, care_plan, documents, inventory
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

## Completed Features
- [x] Multi-language UI (EN, Papiamento, NL, ES)
- [x] Client CRUD with photo upload
- [x] RBAC with DB-driven permissions
- [x] Diagnoses, medications (polypharmacy flags), allergies
- [x] Session notes with filters
- [x] Vitals tracking with sparkline charts
- [x] Care plans, document expiry tracking, inventory
- [x] Audit trail
- [x] Emergency card + PDF export
- [x] Dashboard with stats & age distribution
- [x] Username login (stored in user_roles.username; login form accepts email or username)
- [x] Multi-company support (user_roles supports multiple rows per user_id)
- [x] Company picker on login for multi-company users
- [x] Switch Company button in sidebar (visible when user has 2+ companies)
- [x] User Management: assign existing user to additional companies

## Migration Scripts
- `migrateClient.js` — migrates a single client + their company between Supabase projects. Created 2026-05-24. Searches source DB by client name, fetches company record, prompts for approval, then upserts company + client into target DB.
