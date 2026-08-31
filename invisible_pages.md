# Invisible Pages (Hidden Features for Current Version)

This document tracks the admin pages and features that have been hidden from the Admin Sidebar for the current release. **No code or database schema has been deleted.** All page routes, components, and logic remain 100% intact and functional.

---

## 1. List of Hidden Pages

| # | Feature / Page | Route Path | Component File Path | Icon Used | Purpose |
|---|----------------|------------|----------------------|-----------|---------|
| 1 | **Clients** | `/admin/clients` | `src/routes/admin.clients.tsx` | `Users` | Corporate clients and company directory management |
| 2 | **Vendors** | `/admin/vendors` | `src/routes/admin.vendors.tsx` | `Building2` | Sponsoring vendors, booth allocations, and partner tiers |
| 3 | **Accounts** | `/admin/accounts` | `src/routes/admin.accounts.tsx` | `UserCog` | User roles, credential control, and staff accounts |
| 4 | **Scanner** | `/admin/scanner` | `src/routes/admin.scanner.tsx` | `ScanLine` | Gate QR scanner for instant on-site check-in |
| 5 | **Chat** | `/admin/chat` | `src/routes/admin.chat.tsx` | `MessageSquare` | Real-time live attendee and delegate chat support |
| 6 | **Reports** | `/admin/reports` | `src/routes/admin.reports.tsx` | `FileText` | Analytics, attendance charts, and exportable reports |

---

## 2. How to Re-Enable / Revert Any Hidden Page

All navigation definitions are stored in [`src/components/int/admin-shell.tsx`](./src/components/int/admin-shell.tsx) within the `nav` array (around lines 45–70).

### Step-by-Step Instructions to Restore:

1. Open `src/components/int/admin-shell.tsx`.
2. Locate the `nav` array definition:
```typescript
const nav = [
  { to: "/admin", label: "Dashboard", icon: Home, exact: true },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/invitations", label: "Invitations & Badges", icon: Mail },
  { to: "/admin/registrations", label: "Registrations", icon: FileText },
  { to: "/admin/pass-cards", label: "Pass Cards", icon: CreditCard },
  { to: "/admin/attendance", label: "Attendance", icon: CheckSquare },
  { to: "/admin/notifications", label: "Reminders & Alerts", icon: BellRing },
  { to: "/admin/sliders", label: "Sliders & Banners", icon: Layers },
  { to: "/admin/gallery", label: "Gallery", icon: Images },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/email-templates", label: "Email Templates", icon: Mail },

  /*
   * =========================================================================
   * INVISIBLE PAGES FOR CURRENT RELEASE (Documented in invisible_pages.md)
   * All route files and logic are fully preserved. To re-enable any page,
   * simply uncomment its entry below:
   * =========================================================================
   * { to: "/admin/clients", label: "Clients", icon: Users },
   * { to: "/admin/vendors", label: "Vendors", icon: Building2 },
   * { to: "/admin/accounts", label: "Accounts", icon: UserCog },
   * { to: "/admin/scanner", label: "Scanner", icon: ScanLine },
   * { to: "/admin/chat", label: "Chat Support", icon: MessageSquare },
   * { to: "/admin/reports", label: "Reports & Analytics", icon: FileText },
   */
] as const;
```
3. To restore any page (for example, **Scanner** and **Reports**), move them back into the active list:
```typescript
  { to: "/admin/scanner", label: "Scanner", icon: ScanLine },
  { to: "/admin/reports", label: "Reports & Analytics", icon: FileText },
```
4. Save the file and run `npm run build`. The link will instantly reappear in the sidebar.

---

## 3. Direct URL Access
During internal testing or admin preview, authorized administrators can still navigate to any of these pages directly via their URLs:
- `https://event.integratedtechnics.com/admin/clients`
- `https://event.integratedtechnics.com/admin/vendors`
- `https://event.integratedtechnics.com/admin/accounts`
- `https://event.integratedtechnics.com/admin/scanner`
- `https://event.integratedtechnics.com/admin/chat`
- `https://event.integratedtechnics.com/admin/reports`
