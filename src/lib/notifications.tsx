import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";

export type NotificationTone = "info" | "success" | "warning" | "critical";
export type NotificationAudience = "participant" | "admin";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: NotificationTone;
  audience: NotificationAudience;
  link?: string;
};

const participantSeed: AppNotification[] = [
  {
    id: "p1",
    title: "Event Reminder",
    body: "INT Security Technology Summit starts tomorrow at 09:00 AM.",
    time: "2h ago",
    tone: "info",
    audience: "participant",
    link: "/my-events",
  },
  {
    id: "p2",
    title: "QR Pass Generated",
    body: "Your pass INT-EVT-000312 for INT Technology & ICT Forum is ready.",
    time: "1d ago",
    tone: "success",
    audience: "participant",
    link: "/passes",
  },
  {
    id: "p3",
    title: "Registration Confirmed",
    body: "You are registered for INT Security Technology Summit 2026.",
    time: "3d ago",
    tone: "success",
    audience: "participant",
    link: "/my-events",
  },
  {
    id: "p4",
    title: "Location Update",
    body: "Partner Day moves to Tolip Hotel, Exhibition Hall.",
    time: "5d ago",
    tone: "warning",
    audience: "participant",
    link: "/events",
  },
  {
    id: "p5",
    title: "Agenda Published",
    body: "The full agenda for Smart Infrastructure Technical Workshop is now available.",
    time: "2w ago",
    tone: "info",
    audience: "participant",
    link: "/events",
  },
];

const adminSeed: AppNotification[] = [
  {
    id: "a1",
    title: "Capacity Alert",
    body: "INT Security Technology Summit is at 92% capacity (460 / 500).",
    time: "25m ago",
    tone: "critical",
    audience: "admin",
    link: "/admin/events",
  },
  {
    id: "a2",
    title: "New Registrations",
    body: "18 new registrations received in the last hour.",
    time: "1h ago",
    tone: "info",
    audience: "admin",
    link: "/admin/registrations",
  },
  {
    id: "a3",
    title: "Vendor Approval Pending",
    body: "Milestone Systems and HID Global are waiting for approval.",
    time: "4h ago",
    tone: "warning",
    audience: "admin",
    link: "/admin/vendors",
  },
  {
    id: "a4",
    title: "Check-in Activity",
    body: "312 attendees checked in today via QR scanner.",
    time: "1d ago",
    tone: "success",
    audience: "admin",
    link: "/admin/attendance",
  },
  {
    id: "a5",
    title: "Report Ready",
    body: "Weekly registration report is ready to export.",
    time: "2d ago",
    tone: "info",
    audience: "admin",
    link: "/admin/reports",
  },
];

export const allNotifications = [...participantSeed, ...adminSeed];

type State = { read: string[]; dismissed: string[] };
const EMPTY: State = { read: [], dismissed: [] };
const KEY = "int-notifications-state";

function load(): Record<string, State> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, State>;
  } catch {
    return {};
  }
}

type Ctx = {
  audience: NotificationAudience;
  notifications: (AppNotification & { read: boolean })[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  restore: () => void;
};

const NotificationsContext = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const audience: NotificationAudience = user?.role === "admin" ? "admin" : "participant";
  const [store, setStore] = useState<Record<string, State>>({});

  useEffect(() => {
    setStore(load());
  }, []);

  const persist = useCallback((next: Record<string, State>) => {
    setStore(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const state = store[audience] ?? EMPTY;

  const source = audience === "admin" ? adminSeed : participantSeed;

  const notifications = useMemo(
    () =>
      source
        .filter((n) => !state.dismissed.includes(n.id))
        .map((n) => ({ ...n, read: state.read.includes(n.id) })),
    [source, state],
  );

  const update = useCallback(
    (patch: (s: State) => State) => {
      persist({ ...store, [audience]: patch(store[audience] ?? EMPTY) });
    },
    [audience, persist, store],
  );

  const value: Ctx = {
    audience,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markRead: (id) =>
      update((s) => ({ ...s, read: s.read.includes(id) ? s.read : [...s.read, id] })),
    markAllRead: () => update((s) => ({ ...s, read: source.map((n) => n.id) })),
    dismiss: (id) =>
      update((s) => ({
        read: s.read.includes(id) ? s.read : [...s.read, id],
        dismissed: [...s.dismissed, id],
      })),
    clearAll: () => update(() => ({ read: source.map((n) => n.id), dismissed: source.map((n) => n.id) })),
    restore: () => update(() => EMPTY),
  };

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}

export const toneClasses: Record<NotificationTone, string> = {
  info: "text-primary",
  success: "text-success",
  warning: "text-warning-foreground",
  critical: "text-destructive",
};
