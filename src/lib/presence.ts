import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { useAuth, type SessionUser } from "./auth";

export interface OnlineUserPresence {
  id: string;
  name: string;
  role: string;
  email: string;
  initials: string;
  onlineAt: string;
}

/**
 * Real-time presence tracker using Supabase Realtime Channels
 */
export function useOnlinePresence() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserPresence[]>([]);

  useEffect(() => {
    // Default fallback list if offline or connecting
    const defaultUser: OnlineUserPresence = user
      ? {
          id: user.email,
          name: user.name,
          role: user.role,
          email: user.email,
          initials: user.initials,
          onlineAt: new Date().toISOString(),
        }
      : {
          id: "admin@integratedtechnics.com",
          name: "Hafez Rahim",
          role: "admin",
          email: "admin@integratedtechnics.com",
          initials: "HR",
          onlineAt: new Date().toISOString(),
        };

    const channel = supabase.channel("int-online-presence", {
      config: {
        presence: {
          key: user?.email || "anonymous-admin",
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const usersList: OnlineUserPresence[] = [];

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p && p.name) {
              usersList.push(p as OnlineUserPresence);
            }
          });
        });

        if (usersList.length > 0) {
          // Deduplicate by email/id
          const unique = Array.from(new Map(usersList.map((u) => [u.id || u.email, u])).values());
          setOnlineUsers(unique);
        } else {
          setOnlineUsers([defaultUser]);
        }
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        setOnlineUsers((prev) => {
          const combined = [...prev, ...(newPresences as OnlineUserPresence[])];
          return Array.from(new Map(combined.map((u) => [u.id || u.email, u])).values());
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const leftIds = new Set((leftPresences as OnlineUserPresence[]).map((u) => u.id || u.email));
        setOnlineUsers((prev) => prev.filter((u) => !leftIds.has(u.id || u.email)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(defaultUser);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return onlineUsers.length > 0
    ? onlineUsers
    : [
        {
          id: user?.email || "admin@integratedtechnics.com",
          name: user?.name || "Hafez Rahim",
          role: user?.role || "admin",
          email: user?.email || "admin@integratedtechnics.com",
          initials: user?.initials || "HR",
          onlineAt: new Date().toISOString(),
        },
      ];
}
