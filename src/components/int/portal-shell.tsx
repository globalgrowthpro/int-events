import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  Home,
  LogOut,
  QrCode,
  Search,
  Shield,
  Ticket,
  User,
} from "lucide-react";
import { IntLogo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { useAuth } from "@/lib/auth";
import { useOnlinePresence } from "@/lib/presence";
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

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/my-events", label: "My Events", icon: Ticket },
  { to: "/passes", label: "My Passes", icon: QrCode },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function PortalShell({ children }: { children: ReactNode }) {
  useOnlinePresence();
  const navigate = useNavigate();
  const { user, ready, signOut } = useAuth();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login", replace: true });
  }, [ready, user, navigate]);

  const profile = user ?? currentUser;

  function handleSignOut() {
    signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link to="/dashboard">
            <IntLogo size="sm" subtitle="Participant Portal" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        {/* Sticky Sidebar Footer */}
        <div className="sticky bottom-0 z-20 mt-auto shrink-0 border-t border-border bg-card/95 p-4 backdrop-blur">
          <div className="mb-3">
            <PWAInstallButton variant="outline" className="w-full justify-center text-xs gap-2" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-8 w-8 border border-border shrink-0">
                <AvatarImage src="" alt={profile.name} />
                <AvatarFallback className="bg-navy text-[11px] font-bold text-navy-foreground">
                  {profile.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{profile.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{profile.company}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-1.5 px-3 sm:gap-3 sm:px-6">
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <Link to="/dashboard" className="md:hidden">
                <IntLogo size="sm" subtitle="Participant Portal" />
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

              <button
                className="hidden h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground sm:grid"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>

              <NotificationBell />

              {/* User Avatar & Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border py-0.5 pl-0.5 pr-0.5 sm:pr-2.5 transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarImage src="" alt={profile.name} />
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
                      <User className="mr-2 h-4 w-4" /> Profile & QR Pass
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-events" className="cursor-pointer">
                      <Ticket className="mr-2 h-4 w-4" /> My Registrations
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" /> Admin Portal
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

        <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card md:hidden">
        {[
          { to: "/dashboard", label: "Home", icon: Home },
          { to: "/events", label: "Events", icon: CalendarDays },
          { to: "/passes", label: "Passes", icon: QrCode },
          { to: "/notifications", label: "Alerts", icon: Bell },
          { to: "/profile", label: "Profile", icon: User },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{ className: "text-primary" }}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
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
