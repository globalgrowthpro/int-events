import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckSquare,
  FileText,
  Home,
  LogOut,
  Mail,
  ScanLine,
  Settings,
  Ticket,
  Users,
  Building2,
  BellRing,
  MessageSquare,
  UserCog,
  Layers,
  Images,
  Menu,
  X,
  ChevronRight,
  Shield,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { IntLogo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { useAuth } from "@/lib/auth";
import { DeveloperCredit } from "./developer-credit";
import { PWAInstallButton } from "./pwa-install-prompt";
import { HeaderUpcomingCountdown } from "./header-countdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatar } from "@/lib/logos";
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
  { to: "/admin", label: "Dashboard", icon: Home, exact: true },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/vendors", label: "Vendors", icon: Building2 },
  { to: "/admin/accounts", label: "Accounts", icon: UserCog },
  { to: "/admin/invitations", label: "Invitations & Badges", icon: Mail },
  { to: "/admin/registrations", label: "Registrations", icon: FileText },
  { to: "/admin/pass-cards", label: "Pass Cards", icon: CreditCard },
  { to: "/admin/attendance", label: "Attendance", icon: CheckSquare },
  { to: "/admin/scanner", label: "Scanner", icon: ScanLine },
  { to: "/admin/chat", label: "Chat Support", icon: MessageSquare },
  { to: "/admin/notifications", label: "Reminders & Alerts", icon: BellRing },
  { to: "/admin/sliders", label: "Sliders & Banners", icon: Layers },
  { to: "/admin/gallery", label: "Gallery", icon: Images },
  { to: "/admin/reports", label: "Reports & Analytics", icon: FileText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/email-templates", label: "Email Templates", icon: Mail },
] as const;

export function AdminShell({
  children,
  fullWidth = false,
}: {
  children: ReactNode;
  fullWidth?: boolean;
}) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const isFullWidth = fullWidth || routerState.location.pathname.startsWith("/admin/chat");
  const { user, ready, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className={isFullWidth ? "h-screen overflow-hidden flex flex-col bg-background" : "min-h-screen bg-background pb-20 lg:pb-0"}>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card text-foreground lg:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <IntLogo size="md" subtitle="Admin Panel" />
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

      <div className={isFullWidth ? "lg:pl-64 flex flex-col flex-1 h-full min-h-0 overflow-hidden" : "lg:pl-64"}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex h-16 w-full items-center justify-between gap-1.5 px-4 sm:gap-3 sm:px-6">
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              {/* Mobile Hamburger Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-foreground lg:hidden hover:bg-secondary transition-colors"
                aria-label="Open Navigation Menu"
              >
                <Menu className="h-4 w-4" />
              </button>

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
                    <AvatarImage src={getUserAvatar(name, user?.role, user?.avatar_url)} alt={name} />
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
                        <AvatarImage src={getUserAvatar(name, user?.role, user?.avatar_url)} alt={name} />
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

        {/* Mobile Horizontal Quick-Scroll Ribbon */}
        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border bg-card/75 backdrop-blur px-3 py-2 lg:hidden no-scrollbar">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item ? item.exact : false }}
              activeProps={{ className: "bg-primary text-primary-foreground font-semibold shadow-xs" }}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <main className={isFullWidth ? "flex-1 min-h-0 w-full overflow-hidden p-0 flex flex-col" : "w-full p-4 sm:p-6"}>
          {children}
        </main>
      </div>

      {/* Full Sliding Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-4/5 max-w-xs flex-1 flex-col bg-card shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex h-16 items-center justify-between border-b border-border px-4 bg-muted/20">
              <IntLogo size="sm" subtitle="Admin Control" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation List */}
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Management Modules
              </span>
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    activeOptions={{ exact: "exact" in item ? item.exact : false }}
                    activeProps={{ className: "bg-primary text-primary-foreground font-semibold shadow-xs" }}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            <div className="border-t border-border p-4 bg-muted/10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-8 w-8 border border-border shrink-0">
                    <AvatarImage src={getUserAvatar(name, user?.role, user?.avatar_url)} alt={name} />
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
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Native Mobile Bottom Navigation Bar */}
      {!isFullWidth && <MobileBottomNav variant="admin" />}
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
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-semibold tracking-tight ${accent}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}