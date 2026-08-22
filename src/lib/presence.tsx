import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

export interface OnlineUserPresence {
  id: string;
  name: string;
  role: string;
  email: string;
  initials: string;
  onlineAt: string;
}

const DEFAULT_USERS: OnlineUserPresence[] = [
  {
    id: "admin@integratedtechnics.com",
    name: "Hafez Rahim",
    role: "admin",
    email: "admin@integratedtechnics.com",
    initials: "HR",
    onlineAt: new Date().toISOString(),
  },
];

const PresenceContext = createContext<OnlineUserPresence[]>(DEFAULT_USERS);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserPresence[]>(DEFAULT_USERS);

  useEffect(() => {
    let channel: any = null;

    try {
      const activeUser: OnlineUserPresence = user
        ? {
            id: user.email,
            name: user.name,
            role: user.role,
            email: user.email,
            initials: user.initials,
            onlineAt: new Date().toISOString(),
          }
        : DEFAULT_USERS[0]!;

      // Check if channel already exists to prevent duplicate subscriptions
      const existingChannels = supabase.getChannels();
      const existing = existingChannels.find((c) => c.topic === "realtime:int-online-presence");
      channel = existing || supabase.channel("int-online-presence", {
        config: {
          presence: {
            key: user?.email || "admin-session",
          },
        },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          try {
            const state = channel.presenceState();
            const usersList: OnlineUserPresence[] = [];

            Object.values(state).forEach((presences: any) => {
              if (Array.isArray(presences)) {
                presences.forEach((p: any) => {
                  if (p && p.name) {
                    usersList.push(p as OnlineUserPresence);
                  }
                });
              }
            });

            if (usersList.length > 0) {
              const unique = Array.from(
                new Map(usersList.map((u) => [u.id || u.email, u])).values()
              );
              setOnlineUsers(unique);
            } else {
              setOnlineUsers([activeUser]);
            }
          } catch {
            setOnlineUsers([activeUser]);
          }
        })
        .on("presence", { event: "join" }, ({ newPresences }: { newPresences?: any[] }) => {
          try {
            const incoming = ((newPresences || []) as unknown as OnlineUserPresence[]).filter(
              (p) => p && p.name
            );
            setOnlineUsers((prev) => {
              const combined = [...prev, ...incoming];
              return Array.from(new Map(combined.map((u) => [u.id || u.email, u])).values());
            });
          } catch {}
        })
        .on("presence", { event: "leave" }, ({ leftPresences }: { leftPresences?: any[] }) => {
          try {
            const leftIds = new Set(
              ((leftPresences || []) as unknown as OnlineUserPresence[]).map((u) => u.id || u.email)
            );
            setOnlineUsers((prev) => prev.filter((u) => !leftIds.has(u.id || u.email)));
          } catch {}
        });

      channel.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          try {
            await channel.track(activeUser);
          } catch {}
        }
      });
    } catch {
      // Fallback
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [user]);

  return (
    <PresenceContext.Provider value={onlineUsers.length > 0 ? onlineUsers : DEFAULT_USERS}>
      {children}
    </PresenceContext.Provider>
  );
}

export function useOnlinePresence(): OnlineUserPresence[] {
  const ctx = useContext(PresenceContext);
  return ctx || DEFAULT_USERS;
}
