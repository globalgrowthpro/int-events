import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  QrCode,
  ScanLine,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { IntLogo } from "./logo";
import { useAuth } from "@/lib/auth";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/attendees", label: "Attendees", icon: Users },
  { to: "/admin/vendors", label: "Vendors", icon: Building2 },
  { to: "/admin/attendance", label: "Attendance", icon: ClipboardList },
  { to: "/admin/scanner", label: "QR Scanner", icon: ScanLine },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, ready, signOut } = useAuth();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login", replace: true });
  }, [ready, user, navigate]);

  function handleSignOut() {
    signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <IntLogo tone="light" />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item ? item.exact : false }}
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground",
              }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <p className="text-xs font-medium text-sidebar-foreground">{user?.name ?? "Hafez Rahim"}</p>
          <p className="text-[11px] text-sidebar-foreground/60">
            {user?.role === "admin" ? "Super Admin" : (user?.company ?? "Super Admin")}
          </p>
          <Link
            to="/dashboard"
            className="mt-3 inline-flex items-center gap-2 text-[11px] font-medium text-sky hover:underline"
          >
            <QrCode className="h-3.5 w-3.5" /> Participant portal
          </Link>
          <button
            onClick={handleSignOut}
            className="mt-3 flex w-full items-center gap-2 text-[11px] font-medium text-sidebar-foreground/70 transition-colors hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <div className="flex gap-2 overflow-x-auto border-b border-border bg-card px-4 py-2 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item ? item.exact : false }}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2 lg:hidden">
          <span className="text-xs font-medium text-muted-foreground">
            {user?.name ?? "Admin"}
          </span>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
        <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning";
}) {
  const accent =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning-foreground" : "text-primary";
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${accent}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}