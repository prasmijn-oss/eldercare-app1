# CareManager — Technical Guide

## Architecture Overview

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8 |
| Backend | Supabase (Postgres, Auth, Storage, RLS) |
| Styling | Inline styles + GCSS string array + `src/index.css` tokens |
| Deployment | Vercel (two projects: prod + staging) |
| Supabase client | `@supabase/supabase-js@2.49.0` loaded via ESM CDN (`esm.sh`) |

The entire frontend is a **single-file React app**: `src/App.jsx` (~6 500 lines). There is intentionally no component directory — every component is defined as a function inside `App.jsx`.

---

## Supabase Projects

| Environment | Project ID | URL |
|---|---|---|
| **Production** | `arwvosghwecyzpqartrh` | `https://arwvosghwecyzpqartrh.supabase.co` |
| **Staging** | `kpwzeawgrqdsezflvjkm` | `https://kpwzeawgrqdsezflvjkm.supabase.co` |

Credentials come from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` Vercel env vars. The staging Vercel project has **no env vars set** — it falls back to the hardcoded staging Supabase constants in `App.jsx`.

---

## Vercel Projects & Deploy Workflow

| Git Branch | Vercel Project |
|---|---|
| `staging` | `eldercare-app1-staging` |
| `main` | `eldercare-app1` (production) |

### Standard Deploy After a Feature

1. Develop and test on `staging` branch.
2. Push to `origin/staging` → triggers Vercel staging deploy automatically.
3. When approved, merge to `main` and push:

```bash
git checkout main
git merge staging
git push origin main
git checkout staging
```

> **CRITICAL**: Never push directly to `main` without merging from `staging` first.

---

## Database Schema

### `clients` table
Primary client record. Complex fields are stored as **JSONB-as-TEXT** (serialised JSON strings):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `company_id` | uuid FK | |
| `name` | text | |
| `dob` | text | |
| `gender` | text | |
| `photo_url` | text | Supabase Storage URL |
| `diagnoses` | text | JSON array |
| `medications` | text | JSON array |
| `allergies` | text | JSON array |
| `session_notes` | text | JSON array |
| `vitals` | text | JSON array |
| `care_plan` | text | plain text |
| `documents` | text | JSON array |
| `inventory` | text | JSON array |
| `family_contacts` | text | JSON array |
| `appointments` | text | JSON array |
| `incidents` | text | JSON array |
| `intake_checklist` | text | JSON array |
| `status` | text | `active` \| `inactive` |

### `companies`
`id`, `name`, `logo_url`, `hours_of_operation` (JSONB), `mission_statement`

### `user_roles`
`user_id`, `company_id`, `role`, `name`, `email`, `username`, `avatar_url`, `login_history` (JSONB)

### `permissions`
Global role/action allow-deny matrix.

### `company_permissions`
Per-company overrides; take precedence over `permissions`.

### `audit_log`
`id`, `performed_by`, `action`, `client_name`, `company_id`, `performed_at`

---

## RBAC

```
superadmin > admin > power_user > user > inactive
```

```js
// Permission check (simplified)
function can(role, action) {
  // 1. Check company_permissions for an override
  // 2. Fall back to permissions table
  // Returns boolean
}
```

RLS in Supabase uses a `get_my_role()` SQL function that returns the role for the authenticated user in the current company. **Important gotcha**: `get_my_role()` uses `LIMIT 1` on `user_roles` — if a user has multiple rows for the same company, the first row's role is used. Keep the superadmin row as the only/first row to avoid RLS blocking company reads.

---

## CSS Architecture

Three distinct layers:

### 1. `src/index.css` — Design Tokens + Reset
```
Primitive tokens   →  --primitive-indigo-500: #6366f1
Semantic tokens    →  --color-bg-card: #111427
Component tokens   →  --comp-card-radius: 14px
```
Also contains the global CSS reset and `html.cm-light` semantic token overrides for light mode.

**Do NOT add `filter: none` or `filter: none !important` to `html.cm-light` in `index.css`** — it silently kills the light/dark toggle. See Light Mode section below.

### 2. GCSS — Global Utility Classes (inside `App.jsx`)
A `const GCSS = [...]` string array joined and injected via:
```jsx
<style dangerouslySetInnerHTML={{__html: GCSS.join('\n')}} />
```
Contains: `.client-row`, `.dash-row`, `.card-hover`, `.nav-item`, media queries, animations, light mode filter rule, and all other utility classes.

**GCSS is the source of truth for global CSS behaviours** — `index.css` is tokens + reset only.

### 3. Inline `style={{}}` props
Most component-level styles are inline. CSS variable overrides defined in `index.css` or `html.cm-light` **do NOT affect inline styles** — this is a fundamental browser limitation. The filter-invert light mode mechanism exists precisely to work around this.

---

## Light / Dark Mode

```js
// State
const [darkMode, setDarkMode] = useState(
  localStorage.getItem('cm-dark') !== 'false'
);

// Effect — applies class to <html>
useEffect(() => {
  document.documentElement.classList.toggle('cm-light', !darkMode);
  localStorage.setItem('cm-dark', darkMode);
}, [darkMode]);
```

### How the invert works
In GCSS:
```css
html.cm-light { filter: invert(1) hue-rotate(180deg); background: #f4f5f7; }
html.cm-light img, html.cm-light video, html.cm-light svg image {
  filter: invert(1) hue-rotate(180deg);
}
```
The page-level invert flips all colours to light. Images/video are double-inverted to restore their correct appearance. All inline styles invert automatically — no per-component changes needed.

In `src/index.css`:
```css
html.cm-light img, html.cm-light video { filter: invert(1) hue-rotate(180deg); }
```

---

## JSONB-as-TEXT Pattern

Complex fields are stored as JSON strings in Postgres `text` columns (not native `jsonb`). Two helpers manage the round-trip:

```js
// Parse a field from DB, return defaultVal if null/invalid
function p(val, defaultVal) {
  if (!val) return defaultVal;
  try { return JSON.parse(val); } catch { return defaultVal; }
}

// Parse all JSONB fields on a raw DB row
function fromDb(row) {
  return {
    ...row,
    diagnoses:        p(row.diagnoses, []),
    medications:      p(row.medications, []),
    allergies:        p(row.allergies, []),
    session_notes:    p(row.session_notes, []),
    vitals:           p(row.vitals, []),
    documents:        p(row.documents, []),
    inventory:        p(row.inventory, []),
    family_contacts:  p(row.family_contacts, []),
    appointments:     p(row.appointments, []),
    incidents:        p(row.incidents, []),
    intake_checklist: p(row.intake_checklist, []),
  };
}

// Serialise before writing to DB
function toDb(client) {
  return {
    ...client,
    diagnoses:        JSON.stringify(client.diagnoses || []),
    medications:      JSON.stringify(client.medications || []),
    // ... all JSONB fields
  };
}
```

Always call `fromDb(row)` when reading from Supabase. Always call `toDb(client)` before upsert.

---

## Inline Save

```js
async function inlineUpdate(field, value) {
  const payload = { [field]: JSON.stringify(value) };
  await supabase.from('clients').update(payload).eq('id', selected.id);
  // Update both clients[] state and selected state without full reload
  setClients(prev => prev.map(c => c.id === selected.id ? {...c, [field]: value} : c));
  setSelected(prev => ({...prev, [field]: value}));
}
```

Use `inlineUpdate` when a single field can be saved without going through the full `ClientForm` flow (e.g., toggling an intake checklist item, adding an appointment inline).

---

## Fall Risk Score

```js
const FALL_RISK_DIAG = {
  "parkinson": 3, "dementia": 3, "alzheimer": 3,
  "osteoporosis": 2, "stroke": 2, "epilepsy": 2,
  "hypotension": 2, "arthritis": 1, "diabetes": 1, ...
};

const FALL_RISK_MEDS = {
  "benzodiazepine": 3, "sedative": 3, "hypnotic": 3,
  "diuretic": 2, "antihypertensive": 2, "antidepressant": 1, ...
};

function calcFallRisk(client) {
  let score = 0;
  // Age bracket
  const age = getAge(client.dob);
  if (age >= 85) score += 3;
  else if (age >= 75) score += 2;
  else if (age >= 65) score += 1;
  // Diagnoses
  (client.diagnoses || []).forEach(d => {
    const key = Object.keys(FALL_RISK_DIAG).find(k => d.toLowerCase().includes(k));
    if (key) score += FALL_RISK_DIAG[key];
  });
  // Medications
  (client.medications || []).forEach(m => {
    const key = Object.keys(FALL_RISK_MEDS).find(k => m.name?.toLowerCase().includes(k));
    if (key) score += FALL_RISK_MEDS[key];
  });
  // Polypharmacy
  if ((client.medications || []).length >= 5) score += 2;

  if (score >= 10) return {level:"Very High", color:"#ef4444", score};
  if (score >= 6)  return {level:"High",     color:"#f59e0b", score};
  if (score >= 3)  return {level:"Medium",   color:"#6366f1", score};
  return              {level:"Low",      color:"#10b981", score};
}
```

---

## Notifications

```js
function buildNotifications(clients) {
  const notes = [];
  const now = new Date();
  clients.forEach(c => {
    // Expiring documents (< 30 days)
    (c.documents || []).forEach(doc => {
      if (doc.expiry) {
        const days = Math.ceil((new Date(doc.expiry) - now) / 86400000);
        if (days >= 0 && days <= 30) notes.push({...});
      }
    });
    // Upcoming appointments (< 7 days)
    (c.appointments || []).forEach(appt => { ... });
    // High fall risk
    const risk = calcFallRisk(c);
    if (risk.level === "High" || risk.level === "Very High") notes.push({...});
    // Recent high-severity incidents
    (c.incidents || []).forEach(inc => { ... });
  });
  return notes;
}
```

Notifications are **client-side only** — no server push. They are regenerated on each page load from the current `clients` state.

---

## Recent Clients

```js
function trackRecent(client) {
  const slim = { id: client.id, name: client.name, photo_url: client.photo_url };
  const prev = JSON.parse(localStorage.getItem('cm-recent') || '[]');
  const next = [slim, ...prev.filter(r => r.id !== client.id)].slice(0, 5);
  localStorage.setItem('cm-recent', JSON.stringify(next));
}
```

**Critical**: Only `{id, name, photo_url}` is stored — not the full client object. The dashboard chip resolves the full record at render time:

```jsx
const full = clients.find(c => c.id === rc.id);
// Only navigate if full object is loaded:
onClick={() => { if (!full) return; setSelected(full); setView("detail"); trackRecent(full); }}
```

Never pass a partial (localStorage) client object directly to `ClientForm` — it will crash on `undefined.map()`.

---

## React Patterns

### Import
```js
import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from "react";
```
Never use `React.Fragment` or `React.*`. Use `Fragment` (imported) or `<>` shorthand. Use `<Fragment key={...}>` in `.map()` calls that need a `key` — `<>` cannot carry a `key` prop.

### Component Pattern
All components are plain functions defined at module scope:
```js
function ClientForm({ client, onSave, onCancel, saving, t, currentUser }) { ... }
```

### Supabase Client
Initialised once at the top of `App.jsx`:
```js
const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.0");
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## PWA

| File | Purpose |
|---|---|
| `public/manifest.json` | App name, icons, theme colour, display mode |
| `public/sw.js` | Cache-first service worker; skips `supabase.co` and `esm.sh` URLs |
| `index.html` | `<link rel="manifest">` + service worker registration script |

The app is installable on desktop and mobile via the browser's "Add to Home Screen" / "Install" prompt.

---

## Migration Script

`migrateClient.js` — Node.js script to move a single client + company between Supabase projects.

```
node migrateClient.js
```

It will:
1. Search the source DB for the client by name
2. Fetch the associated company record
3. Prompt for confirmation
4. Upsert company + client into the target DB

Useful when promoting test data from staging to production or vice versa.

---

## Known Gotchas

### Light mode filter killed by `index.css`
If `html.cm-light { filter: none !important }` is added to `index.css`, the GCSS invert filter is overridden and light mode breaks silently. **Never add `filter: none` to `html.cm-light` in `index.css`.**

### Inline styles ignore CSS variable overrides
`index.css` token changes (e.g., `--color-bg-card: #fff` under `html.cm-light`) have no effect on `style={{background: "#111427"}}` inline props. The filter-invert approach is the only scalable light mode mechanism for this architecture.

### Partial client objects from localStorage
`cm-recent` stores only `{id, name, photo_url}`. If this partial object is passed to `ClientForm` or any component that calls `.map()` on `client.diagnoses`, it will throw. Always resolve `clients.find(c => c.id === rc.id)` first.

### Supabase RLS + multiple user_roles rows
`get_my_role()` uses `LIMIT 1`. If a user has two rows in `user_roles` for the same company, the first one is used. Keep the intended role as the first (lowest `id`) row.

### GCSS string array
GCSS is joined with `\n` and injected into a `<style>` tag. Syntax errors in any GCSS string will silently fail to apply styles for the entire block. Validate with `npm run build` after any GCSS change.

### Ternary color strings in inline styles
Global `replace_all` on `color:"#hex"` misses colors inside ternary expressions: `color: cond ? "#hex" : "#hex2"`. Always do a separate grep pass for the quoted hex string `"#hex"` when doing palette sweeps.

---

## Development Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build (validates no syntax errors)
npm run build
```

Environment variables for local development (create `.env.local`):
```
VITE_SUPABASE_URL=https://kpwzeawgrqdsezflvjkm.supabase.co
VITE_SUPABASE_ANON_KEY=<staging anon key>
```

---

## Adding a New JSONB Field

1. Add the column to both staging and production Supabase via the SQL editor:
   ```sql
   ALTER TABLE clients ADD COLUMN my_field TEXT;
   ```
2. Add the field to `fromDb()` with a default:
   ```js
   my_field: p(row.my_field, []),
   ```
3. Add the field to `toDb()`:
   ```js
   my_field: JSON.stringify(client.my_field || []),
   ```
4. Add UI in `ClientForm` and any relevant detail section.
5. If the field should trigger notifications, update `buildNotifications()`.

---

## Roadmap (Technical Items)

- Edge function + email provider integration for actual email delivery
- Drug interaction checker API integration
- Family portal — read-only Supabase RLS policy + separate login flow
- EVV GPS check-in — browser Geolocation API + `check_ins` table
- Staff scheduling — `shifts` table + calendar UI
- Two-factor authentication — Supabase Auth TOTP support
