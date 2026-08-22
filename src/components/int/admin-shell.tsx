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
  Mail,
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
import { MobileBottomNav } from "./mobile-bottom-nav";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/registrations", label: "Registrations", icon: ClipboardList },
  { to: "/admin/invitations", label: "Invitations", icon: Mail },
  { to: "/admin/attendees", label: "Attendees", icon: Users },
  { to: "/admin/scanner", label: "Gate Scanner", icon: ScanLine },
  { to: "/admin/vendors", label: "Vendors & Partners", icon: Building2 },
  { to: "/admin/accounts", label: "Accounts & Roles", icon: UserCog },
  { to: "/admin/reports", label: "Analytics & Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, ready, signOut } = useAuth();

  useEffect(() => {
    if (ready && (!user || user.role !== "admin")) {
      navigate({ to: "/login", replace: true });
    }
  }, [ready, user, navigate]);

  function handleSignOut() {
    signOut();
    navigate({ to: "/login", replace: true });
  }

  const name = user?.name ?? "Hafez Rahim";
  const email = user?.email ?? "admin@integratedtechnics.com";
  const initials = user?.initials ?? "HR";

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card text-foreground lg:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <IntLogo tone="light" size="sm" subtitle="Admin Panel" />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item ? item.exact : false }}
              activeProps={{ className: "bg-primary text-primary-foreground font-semibold" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        {/* Sticky Sidebar Footer */}
        <div className="sticky bottom-0 z-20 mt-auto shrink-0 border-t border-border bg-card/95 p-4 backdrop-blur space-y-3">
          <DeveloperCredit className="w-full text-foreground" />
          <div>
            <PWAInstallButton variant="outline" className="w-full justify-center text-xs gap-2" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-8 w-8 border border-border shrink-0">
                <AvatarImage src="" alt={name} />
                <AvatarFallback className="bg-navy text-xs font-bold text-navy-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{name}</p>
                <p className="truncate text-[10px] text-muted-foreground">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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
                <IntLogo size="sm" compactOnMobile />
              </Link>
              <div className="hidden lg:flex items-center">
                <HeaderUpcomingCountdown />
              </div>
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
                    <Link to="/dashboard" className="cursor-pointer">
                      <Ticket className="mr-2 h-4 w-4" /> Participant Portal
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" /> System Settings
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

        {/* Mobile Sub-Navigation Pill Bar */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-border bg-card/60 backdrop-blur px-3 py-2 lg:hidden no-scrollbar">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item ? item.exact : false }}
              activeProps={{ className: "bg-primary text-primary-foreground font-semibold shadow-xs" }}
              className="whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 md:px-8">{children}</main>
      </div>

      {/* Native Mobile Bottom Navigation Bar */}
      <MobileBottomNav variant="admin" />
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