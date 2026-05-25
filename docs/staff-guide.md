# CareManager — Staff Guide

## Getting Started

### Logging In
1. Open CareManager in your browser.
2. Select your **company** from the dropdown (if you belong to more than one).
3. Enter your **username** (or email address) and **password**, then click **Sign In**.
4. If your administrator has required a password change, you will be prompted before reaching the dashboard.

### Changing Your Language
A language picker appears on the login screen. Supported languages: **English**, **Papiamento**, **Nederlands**, **Español**. Your selection is remembered for your next visit.

### Your Profile
Click your **avatar** or **display name** in the bottom-left sidebar footer to open your profile. From here you can review your account details. Contact your administrator if you need to change your name, email, or role.

---

## The Interface

### Sidebar Navigation
The left sidebar is divided into three groups:

| Group | Items |
|---|---|
| **Main** | Dashboard, Clients |
| **Management** | Reports, Audit Trail |
| **Admin** | User Management, Company Settings, Permissions *(visible based on your role)* |

The currently active page is highlighted with a coloured left bar.

At the bottom of the sidebar:
- **Bell icon** — opens the notification panel
- **Sun/Moon icon** — toggles light / dark mode
- **Sign Out** button

### Keyboard Shortcuts
| Key | Action |
|---|---|
| `d` | Go to Dashboard |
| `n` | New Client |
| `k` | Focus the search bar |
| `b` | Open / close notifications |
| `?` | Show shortcut reference |
| `Esc` | Close open panels / modals |

Shortcuts are inactive while typing in an input, textarea, or select field.

---

## Dashboard

The dashboard gives you an at-a-glance overview of your caseload.

- **Stat cards** — total active clients, average age, high fall-risk count, documents expiring soon
- **Age distribution chart** — bar chart of clients grouped by decade
- **Recently Viewed** — the last 5 clients you opened, shown as clickable chips for quick access
- **Quick Note** — a scratch-pad widget that auto-saves to your browser; use it for shift reminders or temporary notes

---

## Working with Clients

### Finding a Client
Use the **search bar** at the top of the Clients list (or press `k`). Results filter as you type by name, diagnosis, or any text in the client record.

### Client List
Each row shows the client photo, name, primary diagnoses, fall-risk badge, and status. Click a row to open the **Client Detail** view.

### Creating a New Client
Click **+ New Client** (top-right of the topbar, or press `n`). Fill in the required fields:
- **Full Name** *(required)*
- Date of birth, gender, address, emergency contact
- Photo upload (optional)

Click **Save** to create the record. The client appears in the list immediately.

### Editing a Client
Open the client detail, then click **Edit**. All sections become editable. Click **Save** when done or **Cancel** to discard changes.

---

## Client Detail Sections

### Diagnoses
Add ICD-style diagnoses using the input field. Each diagnosis appears as a removable tag. Certain diagnoses automatically contribute to the **Fall Risk Score**.

### Medications
Add medications with name, dose, and frequency. The system flags **polypharmacy** (5+ medications). Certain medications (e.g., sedatives, diuretics) raise the fall-risk score automatically.

### Allergies
Free-text allergy tags. Always keep this list current — it appears on the Emergency Card.

### Session Notes
Record dated notes with a timestamp. Filter notes by date range or keyword. Notes are displayed newest-first.

### Vitals
Log blood pressure, heart rate, temperature, weight, and oxygen saturation. A **sparkline chart** shows trends over time for each vital sign.

### Care Plan
A rich-text area for the client's active care plan. Saved with every full edit.

### Documents
Upload and track documents (e.g., ID, insurance, consents). Each document has an **expiry date** — the notification system will alert staff when documents are expiring within 30 days.

### Inventory
Track personal belongings or medical supplies assigned to the client.

### Family Contacts
Add family members or emergency contacts with name, relationship, phone, and email. Mark one contact as **Primary**. The primary contact appears on the Emergency Card.

### Appointments
Log upcoming and past appointments:
- Type (medical, therapy, transport, social, other)
- Date & time
- Status (scheduled, completed, cancelled, no-show)
- Transport required flag
- Notes

Upcoming appointments within 7 days trigger a notification.

### Incidents
Record adverse events (falls, medication errors, behavioural events, etc.):
- Incident type and date
- Severity (low / medium / high / critical)
- Description, witnesses, immediate action taken, follow-up required

High-severity incidents within the past 7 days trigger a notification.

### Fall Risk Score
Automatically calculated from:
- Age (75+ adds points, 85+ adds more)
- Fall-risk diagnoses (Parkinson's, osteoporosis, dementia, etc.)
- Fall-risk medications (benzodiazepines, diuretics, antihypertensives, etc.)
- Polypharmacy (5+ medications)

The score badge appears on the sidebar client card and in the detail header. **Low / Medium / High / Very High** levels correspond to score ranges.

### Intake Checklist
A structured onboarding checklist for new clients. Click each item to mark it complete — the system stamps your name and the date. A progress bar shows overall completion.

### Clinical Assessments
*(Available to users with edit permission)*

| Assessment | What it tracks |
|---|---|
| **ADL** | Daily living activities (bathing, dressing, toileting, eating) — daily checklist with trends |
| **Pain Assessment** | Numeric / FACES scale, frequency, effectiveness log |
| **Wound & Skin** | Photo-based wound tracking, measurements, healing timeline |
| **Braden Scale** | Pressure ulcer risk — auto-scored, generates turning schedule |
| **Cognitive Screening** | MMSE/MoCA scores, periodic reassessment alerts |
| **Continence** | Incontinence log, patterns, product tracking |
| **Nutritional Risk** | Appetite changes, swallowing flags, dietary alerts |

### Emergency Card
Click **Emergency Card** in the detail header to generate a printable one-page card showing name, photo, diagnoses, medications, allergies, and primary family contact.

---

## Notifications

Click the **bell icon** in the sidebar footer to open the notification panel. Notifications are generated automatically for:

- Documents expiring within **30 days**
- Appointments within the next **7 days**
- Clients with **High or Very High** fall risk
- **High-severity incidents** in the past 7 days

Unread notifications show a red badge count on the bell. Click **Mark all read** to clear the badge.

### Email Alert Preferences
Inside the notification panel, toggle which alert types you want to receive by email. These preferences are saved to your browser.

> Note: Email delivery requires backend configuration by your administrator.

---

## Bulk Actions

Enable **Bulk Mode** by clicking the checkbox icon in the client list toolbar. Click client rows to select them (highlighted). With clients selected you can:
- **Archive** — marks selected clients as inactive
- **Export** — downloads a CSV of the selected clients

---

## Tips & Best Practices

- **Log session notes promptly** — dated notes are legally significant and support continuity of care.
- **Keep medications current** — the fall-risk score and polypharmacy flag depend on an accurate medication list.
- **Upload document scans before expiry** — the system alerts at 30 days but uploading earlier prevents gaps.
- **Use the Quick Note widget** for temporary reminders; it is browser-local and not saved to the client record.
- **Check notifications at the start of each shift** to catch expiring documents and upcoming appointments.
