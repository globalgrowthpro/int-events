import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  Home,
  LogOut,
  MessageSquare,
  QrCode,
  Search,
  Shield,
  Ticket,
  User,
} from "lucide-react";
import { IntLogo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { useAuth } from "@/lib/auth";
import { DeveloperCredit } from "./developer-credit";
import { currentUser } from "@/lib/int-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HeaderUpcomingCountdown } from "./header-countdown";
import { PWAInstallButton } from "./pwa-install-prompt";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { getUserAvatar } from "@/lib/logos";
import { SystemCreditButton } from "./system-credit-dialog";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/my-events", label: "My Events", icon: Ticket },
  { to: "/passes", label: "My Passes", icon: QrCode },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function PortalShell({
  children,
  fullWidth = false,
}: {
  children: ReactNode;
  fullWidth?: boolean;
}) {
  const navigate = useNavigate();
  const { user, ready, signOut } = useAuth();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login", replace: true });
  }, [ready, user, navigate]);

  function handleSignOut() {
    signOut();
    navigate({ to: "/login", replace: true });
  }

  const profile = {
    name: user?.name ?? currentUser.name,
    email: user?.email ?? currentUser.email,
    company: user?.company ?? currentUser.company,
    role: user?.role ?? currentUser.role,
    initials: user?.initials ?? currentUser.initials,
  };

  return (
    <div className={fullWidth ? "h-screen overflow-hidden flex flex-col bg-background" : "min-h-screen bg-background pb-20 md:pb-0"}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card text-foreground md:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <IntLogo subtitle="Participant Portal" />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/dashboard" }}
              activeProps={{ className: "bg-primary text-primary-foreground font-semibold" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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
                <AvatarImage src={getUserAvatar(profile.name, profile.role, user?.avatar_url)} alt={profile.name} />
                <AvatarFallback className="bg-navy text-xs font-bold text-navy-foreground">
                  {profile.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{profile.name}</p>
                <p className="truncate text-[10px] text-muted-foreground capitalize">{profile.role}</p>
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

      <div className={fullWidth ? "md:pl-64 flex flex-col flex-1 h-full min-h-0 overflow-hidden" : "md:pl-64"}>
        <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-1.5 px-3 sm:gap-3 sm:px-6">
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <Link to="/dashboard" className="md:hidden">
                <IntLogo size="sm" compactOnMobile />
              </Link>
              <div className="hidden md:flex items-center">
                <HeaderUpcomingCountdown />
              </div>
            </div>

            {/* Mobile / Tablet Countdown */}
            <div className="flex shrink-0 items-center md:hidden">
              <HeaderUpcomingCountdown />
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <PWAInstallButton variant="outline" size="sm" className="hidden lg:inline-flex text-xs gap-1.5" />

              <SystemCreditButton />

              <NotificationBell />

              {/* User Avatar & Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border py-0.5 pl-0.5 pr-0.5 sm:pr-2.5 transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarImage src={getUserAvatar(profile.name, profile.role, user?.avatar_url)} alt={profile.name} />
                    <AvatarFallback className="bg-navy text-[11px] font-bold text-navy-foreground">
                      {profile.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-xs font-semibold sm:block">{profile.name}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="p-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarImage src={getUserAvatar(profile.name, profile.role, user?.avatar_url)} alt={profile.name} />
                        <AvatarFallback className="bg-navy text-xs font-bold text-navy-foreground">
                          {profile.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{profile.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" /> Profile & Pass
                    </Link>
                  </DropdownMenuItem>
                  {profile.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer text-primary">
                        <Shield className="mr-2 h-4 w-4" /> Switch to Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className={fullWidth ? "flex-1 min-h-0 w-full overflow-hidden p-0 flex flex-col" : "mx-auto max-w-7xl px-2 py-3 sm:py-8 sm:px-6 md:px-8 w-full max-w-full overflow-x-hidden"}>
          {children}
          {!fullWidth && (
            <div className="mt-12 flex justify-center border-t border-border/40 pt-6 md:hidden">
              <DeveloperCredit />
            </div>
          )}
        </main>
      </div>

      {!fullWidth && <MobileBottomNav variant="portal" />}
    </div>
  );
}

export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
