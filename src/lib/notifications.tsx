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
import { supabase } from "./supabase";
import { getChatUserAliases, getLocalStoredMessages, type ChatMessage } from "./api";

export type NotificationTone = "info" | "success" | "warning" | "critical" | "chat";
export type NotificationAudience = "participant" | "admin";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: NotificationTone;
  audience: NotificationAudience;
  link?: string;
  sender_id?: string;
  created_at?: string;
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
];

type State = { read: string[]; dismissed: string[] };
const EMPTY: State = { read: [], dismissed: [] };
const KEY = "int-notifications-state-v2";

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
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<Ctx | null>(null);

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return "Just now";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "Recently";
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const audience: NotificationAudience = user?.role === "admin" ? "admin" : "participant";
  const [store, setStore] = useState<Record<string, State>>({});
  const [liveChatNotifs, setLiveChatNotifs] = useState<AppNotification[]>([]);
  const [dbBroadcasts, setDbBroadcasts] = useState<AppNotification[]>([]);

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

  // 1. Load Chat Messages as notifications
  const loadChatNotifications = useCallback(async () => {
    if (!user) return;
    const currentUserId = user.id;
    const aliases = getChatUserAliases(currentUserId) || [];
    if (aliases.length === 0) return;
    const orQuery = aliases.map((a) => `recipient_id.eq.${a}`).join(",");

    const notifs: AppNotification[] = [];

    // Local messages check
    const localMsgs = getLocalStoredMessages().filter(
      (m) => aliases.includes(m.recipient_id) && !aliases.includes(m.sender_id)
    );

    localMsgs.forEach((m) => {
      notifs.push({
        id: `chat-${m.id}`,
        title: `💬 Chat from ${m.sender_name}`,
        body: m.content || "Attached a document",
        time: formatTimeAgo(m.created_at),
        tone: "chat",
        audience,
        link: audience === "admin" ? "/admin/chat" : "/chat",
        sender_id: m.sender_id,
        created_at: m.created_at,
      });
    });

    // Supabase DB messages check
    if (orQuery) {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(orQuery)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!error && data) {
          data.forEach((m: ChatMessage) => {
            if (!aliases.includes(m.sender_id)) {
              const existingIdx = notifs.findIndex((n) => n.id === `chat-${m.id}`);
              const item: AppNotification = {
                id: `chat-${m.id}`,
                title: `💬 Chat from ${m.sender_name}`,
                body: m.content || "Attached a document",
                time: formatTimeAgo(m.created_at),
                tone: "chat",
                audience,
                link: audience === "admin" ? "/admin/chat" : "/chat",
                sender_id: m.sender_id,
                created_at: m.created_at,
              };
              if (existingIdx >= 0) {
                notifs[existingIdx] = item;
              } else {
                notifs.push(item);
              }
            }
          });
        }
      } catch {
        /* ignore */
      }
    }

    setLiveChatNotifs(notifs);
  }, [user, audience]);

  // 2. Load DB Broadcast notifications
  const loadDbBroadcasts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        const mapped: AppNotification[] = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          body: d.body,
          time: formatTimeAgo(d.created_at),
          tone: (d.tone as NotificationTone) || "info",
          audience: "participant",
          link: d.link || (audience === "admin" ? "/admin/notifications" : "/notifications"),
          created_at: d.created_at,
        }));
        setDbBroadcasts(mapped);
      }
    } catch {
      /* ignore */
    }
  }, [audience]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadChatNotifications(), loadDbBroadcasts()]);
  }, [loadChatNotifications, loadDbBroadcasts]);

  // Initial fetch and Realtime sync
  useEffect(() => {
    refreshAll();

    // Supabase realtime channel
    const channel = supabase
      .channel("realtime-notifications-and-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        loadChatNotifications();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        loadDbBroadcasts();
      })
      .subscribe();

    // Custom window events
    const handleCustomBroadcast = () => {
      refreshAll();
    };

    window.addEventListener("int-new-broadcast-notification", handleCustomBroadcast);
    window.addEventListener("int-chat-message-received", handleCustomBroadcast);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("int-new-broadcast-notification", handleCustomBroadcast);
      window.removeEventListener("int-chat-message-received", handleCustomBroadcast);
    };
  }, [refreshAll, loadChatNotifications, loadDbBroadcasts]);

  const seed = audience === "admin" ? adminSeed : participantSeed;
  const combinedRaw = useMemo(() => {
    return [...liveChatNotifs, ...dbBroadcasts, ...seed];
  }, [liveChatNotifs, dbBroadcasts, seed]);

  const notifications = useMemo(
    () =>
      combinedRaw
        .filter((n) => !state.dismissed.includes(n.id))
        .map((n) => ({ ...n, read: state.read.includes(n.id) })),
    [combinedRaw, state],
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
    markAllRead: () => update((s) => ({ ...s, read: combinedRaw.map((n) => n.id) })),
    dismiss: (id) =>
      update((s) => ({
        read: s.read.includes(id) ? s.read : [...s.read, id],
        dismissed: [...s.dismissed, id],
      })),
    clearAll: () => update(() => ({ read: combinedRaw.map((n) => n.id), dismissed: combinedRaw.map((n) => n.id) })),
    restore: () => update(() => EMPTY),
    refresh: refreshAll,
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
  success: "text-emerald-500",
  warning: "text-amber-500",
  critical: "text-destructive",
  chat: "text-sky-500",
};
