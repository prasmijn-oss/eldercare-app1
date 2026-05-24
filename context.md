# CareManager — Context & Change Log

## Current Status (2026-05-24)

### Recently Completed
- **Username login** ✅ — Login form accepts email OR username. Username stored in `user_roles.username`. Lookup: if input has no `@`, query `user_roles.eq("username", input)` to resolve email, then sign in normally. Username can be set/changed in My Profile.
- **Multi-company UI** ✅ — "Add Existing User to Company" form in UserManagement now correctly filters users by the target company (not globally), preventing false "already assigned" exclusions.
- **Switch Company button** ✅ — Moved outside the `company?.logo_url` conditional block so it renders for all users with 2+ company assignments regardless of whether a logo is set.
- **Env-var driven Supabase config** ✅ — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are read from Vite env vars; hard-coded staging values serve as fallback.
- **Audit trail** ✅ — Working on staging & production (schema includes `audit_log` table with RLS policies).

### Migration Scripts
**`migrateClient.js`** (created 2026-05-24)
- Source: production DB (`arwvosghwecyzpqartrh`)
- Target: staging DB (`kpwzeawgrqdsezflvjkm`)
- Searches for client by name (default: "Jacobo Hill")
- Fetches associated company record
- Prints preview of what will be migrated
- Prompts for `yes` confirmation before writing
- Upserts company first (FK safety), then client

Note: At the time of creation, "Jacobo Hill" was found in **production** (not staging). The script migrates prod → staging. Swap `SOURCE_*` / `TARGET_*` constants to reverse direction.

### Known Issues / Pending
- Profile page only accessible to `admin` and `superadmin` (other roles cannot view their own profile)
- No email verification flow for newly created users
- `SERVICE_KEY` is empty — admin-level Supabase operations use the anon key (edge function `create-user` handles privileged user creation)

## Architecture Notes
- Single-file frontend: all components in `src/App.jsx`
- No React Router — view state managed via `useState("dashboard")`
- Supabase auth session restored on mount via `getSession()`
- `LOADED_PERMS` is a module-level cache populated on login via `loadPermissions(companyId)`
