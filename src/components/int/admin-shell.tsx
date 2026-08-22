import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  ScanLine,
  LogOut,
  Settings,
  Users,
  Bell,
  Ticket,
  UserCog,
} from "lucide-react";
import { IntLogo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { useAuth } from "@/lib/auth";
import { DeveloperCredit } from "./developer-credit";
import { PWAInstallButton } from "./pwa-install-prompt";
import { HeaderUpcomingCountdown } from "./header-countdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/registrations", label: "Registrations", icon: Ticket },
  { to: "/admin/accounts", label: "Accounts", icon: UserCog },
  { to: "/admin/attendees", label: "Attendees", icon: Users },
  { to: "/admin/vendors", label: "Vendors", icon: Building2 },
  { to: "/admin/attendance", label: "Attendance", icon: ClipboardList },
  { to: "/admin/scanner", label: "QR Scanner", icon: ScanLine },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
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

  const initials = user?.initials ?? "AD";
  const name = user?.name ?? "Super Admin";
  const email = user?.email ?? "admin@integrated-technics.com";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <IntLogo tone="light" size="sm" subtitle="Admin Panel" />
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
        {/* Sticky Sidebar Footer */}
        <div className="sticky bottom-0 z-20 mt-auto shrink-0 border-t border-sidebar-border bg-sidebar/95 p-4 backdrop-blur space-y-3">
          <DeveloperCredit className="w-full text-sidebar-foreground" />
          <div className="mb-3">
            <PWAInstallButton
              variant="outline"
              className="w-full justify-center border-sidebar-border bg-sidebar-accent/40 text-xs text-sidebar-foreground hover:bg-sidebar-accent"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-8 w-8 border border-sidebar-border shrink-0">
                <AvatarFallback className="bg-sidebar-accent text-[11px] font-bold text-sidebar-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-sidebar-foreground">{name}</p>
                <p className="truncate text-[10px] text-sidebar-foreground/60">Super Admin</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-lg p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors shrink-0"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-1.5 px-3 sm:gap-3 sm:px-6">
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <Link to="/admin" className="lg:hidden">
                <IntLogo size="sm" subtitle="Admin Panel" />
              </Link>
              <div className="hidden lg:flex items-center">
                <HeaderUpcomingCountdown />
              </div>
            </div>

            {/* Mobile / Tablet Countdown */}
            <div className="flex shrink-0 items-center lg:hidden">
              <HeaderUpcomingCountdown />
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <NotificationBell />

              {/* User Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border py-0.5 pl-0.5 pr-0.5 sm:pr-2.5 transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarImage src="" alt={name} />
                    <AvatarFallback className="bg-navy text-[11px] font-bold text-navy-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-xs font-semibold sm:block">{name}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="p-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarFallback className="bg-navy text-xs font-bold text-navy-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">{email}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" /> Admin Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Scrollbar */}
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