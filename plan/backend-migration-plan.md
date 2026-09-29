# Backend Migration Plan: Supabase to Self-Hosted Backend

## Target Environment & Compatibility
- **Runtimes Supported**: PHP 8.2+ (Already verified on your machine: PHP 8.2.12 + Composer 2.8.2)
- **Deployment Targets**: cPanel, Hostinger hPanel, Windows IIS, Apache, Nginx
- **Database Engine**: PostgreSQL or MySQL / MariaDB (both supported seamlessly via Eloquent ORM)
- **Realtime Solution**: Laravel Reverb / Pusher-protocol WebSockets with Laravel Echo (direct replacement for Supabase Realtime Channels & Presence)

---

## 1. Architectural Blueprint

```
┌─────────────────────────────────────────────────────────────┐
│                 React 19 + Vite Frontend                    │
│             (TanStack Router + TanStack Query)              │
└──────────────┬───────────────────────────────┬──────────────┘
               │ HTTPS (REST API)              │ WSS (WebSockets)
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Laravel 11+ API                         │
│  ├── Laravel Sanctum (Token Auth / Session)                 │
│  ├── Laravel Reverb / Soketi (Realtime Server)              │
│  ├── Eloquent ORM (PostgreSQL & MySQL ready)                │
│  ├── Built-in Mails & Queues (SMTP & Invitations)           │
│  └── Storage API (Local disk / S3 / cPanel public_html)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 PostgreSQL / MySQL Database                 │
│         (Imported from supabase/schema.sql)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Supabase Feature Mapping

| Supabase Feature | Replacement in Laravel Backend | Frontend Bridge |
|---|---|---|
| `supabase.auth.*` | **Laravel Sanctum** (`/api/login`, `/api/register`, `/api/user`) | Standard Bearer token or HttpOnly Cookie |
| Realtime Presence (`supabase.channel().track()`) | **Laravel Echo + Reverb / Pusher Protocol** | `window.Echo.join('presence-channel')` |
| Realtime DB Changes (`postgres_changes`) | **Laravel Broadcast Events** (`event(new EventUpdated($event))`) | `window.Echo.channel('events').listen(...)` |
| Storage Bucket (`id_documents`) | **Laravel Storage Controller** (`Storage::disk('public')->put()`) | Direct file upload endpoint `/api/upload` |
| Edge Functions (`send-email`) | **Laravel Mailables** (`Mail::to()->queue()`) | Native background queue with retry logic |
| RLS Policies | **Laravel Policies & FormRequest Validation** | Enforced at controller & model layer |

---

## 3. Implementation Phases

### Phase 1: Laravel Backend Project Setup
1. Initialize backend directory (e.g. `backend/` inside the repo or alongside it).
2. Configure database connection (`.env` supporting both PostgreSQL and MySQL).
3. Generate migrations mirroring tables from [`supabase/schema.sql`](file:///D:/int/int-events-V2/supabase/schema.sql):
   - `users` / `profiles`
   - `events`
   - `registrations`
   - `vendors`
   - `attendance_logs`
   - `certificates`
   - `notifications`
   - `invitations`
   - `smtp_settings`
   - `messages` (Chat)
4. Setup Sanctum for API token authentication.

### Phase 2: Controllers & Realtime Broadcasting
1. Create API controllers:
   - `AuthController` (Sign in, Sign out, Profile)
   - `EventController` (CRUD, status, capacity tracking)
   - `RegistrationController` (Ticket generation, duplicate prevention, QR pass lookup)
   - `AttendanceController` (QR check-in, scanner logs)
   - `NotificationController` & `ChatController` (with Broadcast Events)
   - `EmailController` (SMTP settings test, batch invitation sender)
2. Setup **Laravel Reverb** for real-time presence and push notifications.

### Phase 3: Frontend Client Bridge
1. Create an API client in frontend (`src/lib/api-client.ts`) using standard `fetch` or `axios`.
2. Replace [`supabase.ts`](file:///D:/int/int-events-V2/src/lib/supabase.ts) calls in [`auth.tsx`](file:///D:/int/int-events-V2/src/lib/auth.tsx), [`api.ts`](file:///D:/int/int-events-V2/src/lib/api.ts), and [`notifications.tsx`](file:///D:/int/int-events-V2/src/lib/notifications.tsx).
3. Connect [`presence.tsx`](file:///D:/int/int-events-V2/src/lib/presence.tsx) to Laravel Echo.

### Phase 4: Deployment Configurations (cPanel / hPanel / IIS)
1. Provide `.htaccess` optimized for Apache (cPanel & Hostinger hPanel).
2. Provide `web.config` for Microsoft IIS on Windows Server.
3. Add a deployment script for production builds.
