# CareManager — Context & Change Log

## Current Status (2026-05-24)

### Recently Completed (this session)

**Client Management**
- **Bulk actions** ✅ — Checkbox mode in sidebar (`bulkMode` state + `Set` for selection). Bulk archive and CSV export. Fall risk badge (e.g. "HFR") shown on each sidebar card.
- **Family contacts** ✅ — `FamilyContacts` component; multiple contacts per client with RELATIONSHIPS dropdown, set-primary, collapsible cards. Stored in `clients.family_contacts` (TEXT/JSON).
- **Appointment / transport log** ✅ — `AppointmentLog` component; APPT_TYPES, APPT_STATUSES, transport type, notes, inline edit/delete. Stored in `clients.appointments`.
- **Fall risk score** ✅ — `calcFallRisk(client)` computes weighted score from age brackets, FALL_RISK_DIAG map, FALL_RISK_MEDS map, polypharmacy flag. Badge in sidebar + expandable factors in detail header.
- **Incident reports** ✅ — `IncidentReports` component; INCIDENT_TYPES, severity (Minor/Moderate/Severe), description, witnesses, action taken, follow-up. Stored in `clients.incidents`.
- **Intake checklist** ✅ — `IntakeChecklist` component; DEFAULT_INTAKE_ITEMS (10 items), progress bar, click-to-toggle with auto-stamp of `completed_by` / `completed_at`. Inline-saves via `onInlineUpdate`. Stored in `clients.intake_checklist`.

**User Management**
- **Confirmation dialogs** ✅ — `pendingAction` state `{type, userId, userName, meta}` intercepts role change, deactivate, remove-from-company. Modal shows context-specific warning. Role select is controlled (`value={u.role}`) so cancel snaps back automatically.
- **Staff activity report** ✅ — 📊 Activity tab in `UserManagement`. Queries `audit_log` grouped by `performed_by`. Date-range filter. Table: name, total actions, last active, top action. Expandable row: action breakdown chips + recent clients list. Uses `<Fragment key={...}>` (not `<>`) for keyed rows in `<tbody>`.

**Notifications & UX**
- **Notification center** ✅ — `buildNotifications(clients)` scans: expiring docs (≤30d), upcoming appointments (≤7d), high fall risk, incidents (≤7d). Bell icon in sidebar header with red unread badge. Slide-out panel (`.notif-panel` with CSS animation). Click notification → navigate to client. Mark-all-read. Read IDs in `cm-read-notifs` localStorage.
- **Email alert preferences** ✅ — Toggle checkboxes in notification panel footer. Stored in `cm-email-prefs` localStorage. UI only; actual delivery requires edge function + email provider.
- **Recent clients strip** ✅ — `trackRecent(client)` called at every `setView("detail")` site (4 locations). Max 5, stored in `cm-recent` localStorage. Shown as avatar pill row at top of dashboard.
- **Quick note widget** ✅ — Textarea on dashboard, auto-saves on every keystroke to `cm-dash-note` localStorage. Clear button. Personal to browser/user.
- **Light/dark mode** ✅ — `darkMode` state (default true). `useEffect` toggles `html.cm-light` class. CSS: `html.cm-light { filter: invert(1) hue-rotate(180deg) }` + `html.cm-light img { filter: invert(1) hue-rotate(180deg) }` (double-invert restores photos). Toggle button ☀️/🌙 in sidebar header. Persisted in `cm-dark` localStorage.
- **Keyboard shortcuts** ✅ — Global `keydown` listener in App `useEffect`. Inactive when `INPUT/TEXTAREA/SELECT` focused. Keys: `d`=dashboard, `n`=new client, `k`=focus `#cm-search`, `b`=notifications, `?`=shortcuts modal, `Esc`=close panels.
- **PWA** ✅ — `public/manifest.json` (name, theme_color, icon, standalone), `public/sw.js` (cache-first, skips supabase/esm.sh hostnames), registered in `index.html` via inline script. Apple mobile meta tags added.

### DB Columns Added This Session
All on `clients` table, both staging (`kpwzeawgrqdsezflvjkm`) and production (`arwvosghwecyzpqartrh`):
```sql
ALTER TABLE clients ADD COLUMN family_contacts TEXT;
ALTER TABLE clients ADD COLUMN appointments TEXT;
ALTER TABLE clients ADD COLUMN incidents TEXT;
ALTER TABLE clients ADD COLUMN intake_checklist TEXT;
```

### Migration Scripts
**`migrateClient.js`** (created 2026-05-24)
- Source: production DB (`arwvosghwecyzpqartrh`)
- Target: staging DB (`kpwzeawgrqdsezflvjkm`)
- Searches for client by name, fetches associated company, previews, prompts confirmation, upserts company then client.
- Swap `SOURCE_*` / `TARGET_*` constants to reverse direction.

### Known Issues / Pending
- Profile page only accessible to `admin` and `superadmin`
- No email verification flow for newly created users
- `SERVICE_KEY` is empty — privileged user creation goes through edge function `create-user`
- Email alert preferences are UI-only; no actual delivery wired up
- Light mode uses CSS filter (functional but color-shifts brand palette) — full theme refactor would require replacing all inline hex colors with CSS variables

## Architecture Notes
- Single-file frontend: all components in `src/App.jsx` (~4341 lines)
- No React Router — view state managed via `useState("dashboard")`
- React import: named hooks only — `import { useState, useEffect, useCallback, useRef, Fragment } from "react"`. Never use `React.*`.
- `Fragment` (not `<>`) required when a `key` prop is needed inside `.map()` in JSX
- Supabase auth session restored on mount via `getSession()`
- `LOADED_PERMS` — module-level cache populated on login via `loadPermissions(companyId)`
- `fromDb()` / `toDb()` — parse/serialize all JSONB client fields; new fields must be added to both
- `inlineUpdate(field, value)` — saves one field to DB + updates `clients` state + `selected` state without full reload; used by IntakeChecklist in ClientDetail
- `buildNotifications(clients)` — pure function, no DB query, generates alerts from existing client data
- Dark/light: `html.cm-light` class on `document.documentElement`; images get `filter: invert(1) hue-rotate(180deg)` to cancel out the parent filter
