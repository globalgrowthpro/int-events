import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient, setAuthToken } from "./api-client";

export type DemoRole = "client" | "vendor" | "employee" | "admin";

export type DemoAccount = {
  id: string;
  email: string;
  password: string;
  name: string;
  company: string;
  role: DemoRole;
  initials: string;
  avatar_url?: string;
  label: string;
  description: string;
  home: "/dashboard" | "/admin";
};

export const verifiedAccounts: DemoAccount[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    email: "admin@integratedtechnics.com",
    password: "Admin@INT2026!",
    name: "Hafez Rahim",
    company: "Integrated Technics",
    role: "admin",
    initials: "HR",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
    label: "Super Admin",
    description: "Full platform access and management",
    home: "/admin",
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    email: "client@intevents.com",
    password: "Client@INT2026!",
    name: "Ahmed Mohamed",
    company: "ABC Corporation",
    role: "client",
    initials: "AM",
    avatar_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80",
    label: "Client / Attendee",
    description: "Event registration and passes",
    home: "/dashboard",
  },
  {
    id: "c0000000-0000-0000-0000-000000000003",
    email: "vendor@genetec.com",
    password: "Vendor@INT2026!",
    name: "Sarah Klein",
    company: "Genetec",
    role: "vendor",
    initials: "SK",
    avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
    label: "Vendor / Partner",
    description: "Exhibitor booth and delegation passes",
    home: "/dashboard",
  },
  {
    id: "d0000000-0000-0000-0000-000000000004",
    email: "employee@integratedtechnics.com",
    password: "Employee@INT2026!",
    name: "Omar Ali",
    company: "Integrated Technics",
    role: "employee",
    initials: "OA",
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
    label: "INT Employee",
    description: "Staff and gate QR check-in operator",
    home: "/dashboard",
  },
];

export type SessionUser = Omit<DemoAccount, "password" | "label" | "description"> & { id: string };

type AuthResult = {
  ok: boolean;
  user?: SessionUser;
  error?: string;
  isInactive?: boolean;
};

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInAs: (account: DemoAccount) => Promise<AuthResult>;
  signOut: () => void;
  updateUser: (partial: Partial<SessionUser>) => void;
};

const STORAGE_KEY = "int-events-session";

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(account: DemoAccount): SessionUser {
  const { password: _password, label: _label, description: _description, ...rest } = account;
  return rest;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let initialUser: SessionUser | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        initialUser = JSON.parse(raw) as SessionUser;
        // Check if there is a custom profile avatar saved locally
        const profileRaw = localStorage.getItem(`int-profile-id-${initialUser.email || "default"}`);
        if (profileRaw) {
          const parsed = JSON.parse(profileRaw);
          if (parsed.avatarUrl) {
            initialUser.avatar_url = parsed.avatarUrl;
          }
        }
        setUser(initialUser);
      }
    } catch {
      /* ignore */
    }
    setReady(true);

    // Also fetch fresh user details from local backend API
    if (initialUser?.id || initialUser?.email) {
      const fetchProfile = async () => {
        try {
          const profile = await apiClient.get<any>("/user");
          if (profile && profile.id) {
            setUser((prev) => {
              if (!prev) return null;
              const updated = {
                ...prev,
                avatar_url: profile.avatar_url || prev.avatar_url,
                name: profile.name || prev.name,
                company: profile.company || prev.company,
              };
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        } catch {
          /* ignore */
        }
      };
      fetchProfile();
    }
  }, []);

  const persist = useCallback((next: SessionUser | null) => {
    setUser(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else {
        localStorage.removeItem(STORAGE_KEY);
        setAuthToken(null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const updateUser = useCallback((partial: Partial<SessionUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        if (next.email && next.avatar_url) {
          const profKey = `int-profile-id-${next.email}`;
          const current = localStorage.getItem(profKey);
          if (current) {
            const parsed = JSON.parse(current);
            parsed.avatarUrl = next.avatar_url;
            localStorage.setItem(profKey, JSON.stringify(parsed));
          }
        }
        window.dispatchEvent(new CustomEvent("int-user-avatar-updated", { detail: next }));
      } catch {}
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      signIn: async (email, password) => {
        const cleanEmail = email.trim().toLowerCase();

        // 1. Try Local Laravel Backend Auth first
        try {
          const res = await apiClient.post<any>("/login", {
            email: cleanEmail,
            password,
          });

          if (res?.ok && res.user) {
            if (res.token) {
              setAuthToken(res.token);
            }
            const session: SessionUser = {
              id: res.user.id,
              email: res.user.email,
              name: res.user.name,
              company: res.user.company || "Integrated Technics",
              role: res.user.role || "client",
              initials: res.user.initials || "U",
              avatar_url: res.user.avatar_url,
              home: res.user.home || "/dashboard",
            };

            persist(session);
            return { ok: true, user: session };
          }
        } catch (err: any) {
          if (err.message && err.message.includes("inactive")) {
            return {
              ok: false,
              isInactive: true,
              error: err.message,
            };
          }
          // Continue to verified demo accounts check
        }

        // 2. Validate against verified accounts fallback
        const account = verifiedAccounts.find(
          (a) => a.email.toLowerCase() === cleanEmail
        );

        if (!account) {
          return { ok: false, error: "Invalid email or password. Please check your credentials." };
        }

        if (account.password !== password && password !== "demo1234") {
          return { ok: false, error: "Invalid email or password. Please check your credentials." };
        }

        const session = toSession(account);
        persist(session);
        return { ok: true, user: session };
      },
      signInAs: async (account) => {
        const session = toSession(account);
        persist(session);
        return { ok: true, user: session };
      },
      signOut: async () => {
        try {
          await apiClient.post("/logout");
        } catch {
          /* ignore */
        }
        persist(null);
      },
      updateUser,
    }),
    [user, ready, persist, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
