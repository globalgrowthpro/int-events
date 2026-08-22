import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  Home,
  QrCode,
  Bell,
  User,
  ScanLine,
  Mail,
  Users,
  Settings,
  Sparkles,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

function triggerHaptic() {
  if (typeof window !== "undefined" && "navigator" in window && "vibrate" in navigator) {
    try {
      navigator.vibrate(8);
    } catch {
      /* ignore */
    }
  }
}

export function MobileBottomNav({ variant }: { variant?: "public" | "portal" | "admin" }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const mode = variant || (user?.role === "admin" ? "admin" : user ? "portal" : "public");

  if (mode === "admin") {
    const adminTabs = [
      { to: "/admin", label: "Overview", icon: Home, exact: true },
      { to: "/admin/events", label: "Events", icon: CalendarDays },
      {
        to: "/admin/scan",
        label: "Gate Scan",
        icon: ScanLine,
        isCenterAction: true,
      },
      { to: "/admin/invitations", label: "Invites", icon: Mail },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ];

    return (
      <div className="fixed inset-x-0 bottom-0 z-50 block md:hidden pointer-events-none">
        <nav className="pointer-events-auto mx-auto border-t border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-around">
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.exact
                ? currentPath === tab.to
                : currentPath.startsWith(tab.to);

              if (tab.isCenterAction) {
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    onClick={triggerHaptic}
                    className="group relative -top-3 flex flex-col items-center justify-center"
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-all duration-200 active:scale-90",
                        isActive
                          ? "bg-gradient-to-tr from-[#F37021] to-[#D95D14] text-white ring-4 ring-primary/25 scale-105"
                          : "bg-primary text-primary-foreground hover:bg-tech"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span
                      className={cn(
                        "mt-1 text-[10px] font-bold tracking-tight",
                        isActive ? "text-primary font-extrabold" : "text-muted-foreground"
                      )}
                    >
                      {tab.label}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  onClick={triggerHaptic}
                  className="relative flex flex-1 flex-col items-center justify-center py-1 text-center transition-all duration-150 active:scale-95"
                >
                  <div className="relative">
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-transform duration-200",
                        isActive ? "text-primary scale-110" : "text-muted-foreground"
                      )}
                    />
                    {tab.label === "Invites" && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-1 text-[10px] font-semibold tracking-tight transition-colors",
                      isActive ? "text-primary font-bold" : "text-muted-foreground"
                    )}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 h-0.5 w-4 rounded-full bg-primary animate-in fade-in zoom-in-50" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  if (mode === "portal") {
    const portalTabs = [
      { to: "/dashboard", label: "Home", icon: Home, exact: true },
      { to: "/events", label: "Events", icon: CalendarDays },
      {
        to: "/passes",
        label: "VIP Pass",
        icon: QrCode,
        isCenterAction: true,
      },
      { to: "/notifications", label: "Alerts", icon: Bell, badge: unreadCount },
      { to: "/profile", label: "Profile", icon: User },
    ];

    return (
      <div className="fixed inset-x-0 bottom-0 z-50 block md:hidden pointer-events-none">
        <nav className="pointer-events-auto mx-auto border-t border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-around">
            {portalTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.exact
                ? currentPath === tab.to
                : currentPath.startsWith(tab.to);

              if (tab.isCenterAction) {
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    onClick={triggerHaptic}
                    className="group relative -top-3 flex flex-col items-center justify-center"
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-all duration-200 active:scale-90",
                        isActive
                          ? "bg-gradient-to-tr from-[#F37021] to-[#D95D14] text-white ring-4 ring-primary/25 scale-105"
                          : "bg-primary text-primary-foreground hover:bg-tech"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span
                      className={cn(
                        "mt-1 text-[10px] font-bold tracking-tight",
                        isActive ? "text-primary font-extrabold" : "text-muted-foreground"
                      )}
                    >
                      {tab.label}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  onClick={triggerHaptic}
                  className="relative flex flex-1 flex-col items-center justify-center py-1 text-center transition-all duration-150 active:scale-95"
                >
                  <div className="relative">
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-transform duration-200",
                        isActive ? "text-primary scale-110" : "text-muted-foreground"
                      )}
                    />
                    {tab.badge && tab.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-xs">
                        {tab.badge > 9 ? "9+" : tab.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-1 text-[10px] font-semibold tracking-tight transition-colors",
                      isActive ? "text-primary font-bold" : "text-muted-foreground"
                    )}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 h-0.5 w-4 rounded-full bg-primary animate-in fade-in zoom-in-50" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  // Public / Guest Tabs
  const publicTabs = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/events", label: "Events", icon: CalendarDays },
    {
      to: "/register",
      label: "Register",
      icon: Sparkles,
      isCenterAction: true,
    },
    { to: "/login", label: "Sign In", icon: LogIn },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 block md:hidden pointer-events-none">
      <nav className="pointer-events-auto mx-auto border-t border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl px-3 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around">
          {publicTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.exact
              ? currentPath === tab.to
              : currentPath.startsWith(tab.to);

            if (tab.isCenterAction) {
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  onClick={triggerHaptic}
                  className="group relative -top-3 flex flex-col items-center justify-center"
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-all duration-200 active:scale-90",
                      isActive
                        ? "bg-gradient-to-tr from-[#F37021] to-[#D95D14] text-white ring-4 ring-primary/25 scale-105"
                        : "bg-primary text-primary-foreground hover:bg-tech"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={cn(
                      "mt-1 text-[10px] font-bold tracking-tight",
                      isActive ? "text-primary font-extrabold" : "text-muted-foreground"
                    )}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.to}
                to={tab.to}
                onClick={triggerHaptic}
                className="relative flex flex-1 flex-col items-center justify-center py-1 text-center transition-all duration-150 active:scale-95"
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive ? "text-primary scale-110" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "mt-1 text-[10px] font-semibold tracking-tight transition-colors",
                    isActive ? "text-primary font-bold" : "text-muted-foreground"
                  )}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 h-0.5 w-4 rounded-full bg-primary animate-in fade-in zoom-in-50" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
