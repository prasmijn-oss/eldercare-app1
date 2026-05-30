# CareManager — Admin Guide

## Role Hierarchy

```
superadmin  →  admin  →  power_user  →  user  →  inactive
```

Each role inherits the permissions of all roles below it. `superadmin` has unrestricted access across all companies.

---

## User Management

Navigate to **User Management** in the sidebar (visible to `admin` and above).

### Viewing Users
The user table lists all staff for your company with their name, email, username, role, and last login. Use the search/filter controls to narrow the list.

### Creating a User
Click **+ Add User**. Fill in:
- Full name, email address, username
- Initial role
- Temporary password (the user should change it on first login)

The new user receives access to the current company immediately.

### Editing a User (Inline)
Click the **✏️ pencil icon** on any user row. The row cells become editable inputs in place. Update the fields and click **Save** (✔) or **Cancel** (✗).

### Changing Roles
Click the role badge on the user row and select a new role from the dropdown. A **confirmation dialog** appears before any destructive role change (downgrade, deactivation, or removal).

### Deactivating a User
Set the user's role to `inactive`. They will no longer be able to sign in. Their audit history is preserved.

### Assigning a User to Another Company
Click **+ Assign to Company** and select a company from the list. The user will be able to switch between companies after their next login.

### Removing a User from a Company
Click the **Remove** button on the user row. A confirmation dialog appears. This removes the user from the company but does not delete their account.

---

## Staff Activity Report

Open the **📊 Activity** tab inside User Management.

- Shows a per-staff breakdown of actions recorded in the audit log
- **Date range filter** — narrow to any period
- Click a staff member row to **expand** their action breakdown and the recent clients they accessed
- Useful for reviewing productivity, spotting unusual access patterns, or producing shift reports

---

## Permissions Panel

Navigate to **Permissions** in the sidebar (visible to `superadmin` and `admin`).

Two layers of permissions are available:

### Global Permissions
Default allow/deny rules for each role + action combination. Changes here apply across all companies unless overridden.

### Company Permissions
Per-company overrides that take precedence over global rules. Useful when one company needs tighter or looser access for a specific action.

#### Common Actions
| Action | Description |
|---|---|
| `view` | View client records |
| `edit` | Edit client records |
| `create` | Create new clients |
| `archive` | Archive / deactivate clients |
| `export` | Export client data |
| `manage_users` | Access User Management |
| `manage_company` | Access Company Settings |
| `view_audit` | Access Audit Trail |
| `manage_permissions` | Access Permissions Panel |

---

## Company Settings

Navigate to **Company Settings** in the sidebar.

Editable fields:
- **Company name**
- **Logo** — upload a PNG/JPG; displayed in the header and on printed documents
- **Mission statement** — shown on the company profile
- **Hours of operation** — per-day open/close times (stored as structured JSON)

Save changes with the **Save** button. Changes take effect immediately for all users in the company.

---

## Audit Trail

Navigate to **Audit Trail** in the sidebar.

Every write action in the system is recorded with:
- **Who** performed the action (`performed_by`)
- **What** was done (`action` — e.g., `create_client`, `edit_client`, `archive_client`, `role_change`)
- **Which client** was affected (`client_name`)
- **When** it happened (`performed_at`)

### Filtering
Filter by date range, user, or action type. Results are sorted newest-first.

### Retention
Audit records are never deleted. They are stored in the `audit_log` table in Supabase.

---

## Managing Multiple Companies

If your organisation manages multiple companies (e.g., different care facilities), each company has its own:
- Client list
- User roster
- Company settings
- Permission overrides

A user may belong to multiple companies. They choose which company to work in via the **company picker** on the login screen or the **Switch Company** button in the sidebar footer (appears only when the user belongs to 2+ companies).

`superadmin` users can see and manage all companies.

---

## Notifications for Admins

The notification system surfaces the following automatically for your client base:
- Documents expiring within 30 days
- Upcoming appointments (7-day window)
- High / Very High fall-risk clients
- High-severity incidents in the past 7 days

No additional configuration is required. Notifications are generated client-side on each page load.

### Email Alerts
The email alert preferences UI (notification panel → toggles) is present in the interface. Actual email delivery requires an edge function and email provider to be configured in Supabase. Contact your technical administrator to enable this.

---

## Bulk Client Actions

From the client list, enable **Bulk Mode** (checkbox icon in the toolbar). Select multiple clients, then:
- **Archive** — marks selected clients inactive (reversible)
- **Export** — downloads a CSV with key fields for all selected clients

Bulk actions are limited by the acting user's permissions.

---

## Security Recommendations

- Assign the **lowest role** that allows each staff member to do their job.
- Review the **Staff Activity Report** weekly for unusual access patterns.
- **Deactivate** departing staff immediately by setting their role to `inactive`.
- Periodically audit the **Permissions Panel** to confirm no unintended overrides are in place.
- Remind staff to use strong, unique passwords (a password strength indicator is on the roadmap).

---

## Pending Admin Features (Roadmap)

- Staff scheduling module
- Custom fields per company
- Data retention / purge policy controls
- Company-wide announcement banner
- Force password change enforcement (backend)
- Two-factor authentication
- IP-based login alerts
- Actual email delivery (backend)
