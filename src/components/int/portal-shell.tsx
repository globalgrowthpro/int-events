import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CalendarDays, Home, QrCode, Search, Ticket, User } from "lucide-react";
import { IntLogo } from "./logo";
import { currentUser } from "@/lib/int-data";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/events", label: "Discover Events", icon: CalendarDays },
  { to: "/my-events", label: "My Events", icon: Ticket },
  { to: "/passes", label: "My Passes", icon: QrCode },
  { to: "/notifications", label: "Notifications", icon: Bell },
] as const;

export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:px-6">
          <Link to="/dashboard">
            <IntLogo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="hidden h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground sm:grid"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            </Link>
            <div className="flex items-center gap-2 rounded-md border border-border py-1 pl-1 pr-3">
              <span className="grid h-7 w-7 place-items-center rounded bg-navy text-[11px] font-semibold text-navy-foreground">
                {currentUser.initials}
              </span>
              <span className="hidden text-sm font-medium sm:block">{currentUser.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">{children}</main>

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