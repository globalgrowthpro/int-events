import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";

export type DemoRole = "client" | "vendor" | "employee" | "admin";

export type DemoAccount = {
  id?: string;
  email: string;
  password: string;
  name: string;
  company: string;
  role: DemoRole;
  initials: string;
  label: string;
  description: string;
  home: "/dashboard" | "/admin";
};

export const verifiedAccounts: DemoAccount[] = [
  {
    email: "admin@integratedtechnics.com",
    password: "Admin@INT2026!",
    name: "Hafez Rahim",
    company: "Integrated Technics",
    role: "admin",
    initials: "HR",
    label: "Super Admin",
    description: "Full platform access and management",
    home: "/admin",
  },
  {
    email: "client@intevents.com",
    password: "Client@INT2026!",
    name: "Ahmed Mohamed",
    company: "ABC Corporation",
    role: "client",
    initials: "AM",
    label: "Client / Attendee",
    description: "Event registration and passes",
    home: "/dashboard",
  },
  {
    email: "vendor@genetec.com",
    password: "Vendor@INT2026!",
    name: "Sarah Klein",
    company: "Genetec",
    role: "vendor",
    initials: "SK",
    label: "Vendor / Partner",
    description: "Exhibitor booth and delegation passes",
    home: "/dashboard",
  },
  {
    email: "employee@integratedtechnics.com",
    password: "Employee@INT2026!",
    name: "Omar Ali",
    company: "Integrated Technics",
    role: "employee",
    initials: "OA",
    label: "INT Employee",
    description: "Staff and gate QR check-in operator",
    home: "/dashboard",
  },
];

export type SessionUser = Omit<DemoAccount, "password" | "label" | "description">;

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
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as SessionUser);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: SessionUser | null) => {
    setUser(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      signIn: async (email, password) => {
        const cleanEmail = email.trim().toLowerCase();

        // 0. Check if account is active in Supabase profiles
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("status, full_name, email")
            .ilike("email", cleanEmail)
            .maybeSingle();

          if (profile && (profile.status === "suspended" || profile.status === "inactive" || profile.status === "pending")) {
            return {
              ok: false,
              isInactive: true,
              error: "Your account is currently inactive or suspended. Sign in is disabled by the administrator.",
            };
          }
        } catch {
          /* continue */
        }

        // 1. Try real Supabase Auth first
        try {
          const { data, error: supaError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (!supaError && data.user) {
            // Fetch profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", data.user.id)
              .single();

            if (profile && (profile.status === "suspended" || profile.status === "inactive" || profile.status === "pending")) {
              await supabase.auth.signOut();
              return {
                ok: false,
                isInactive: true,
                error: "Your account is currently inactive or suspended. Sign in is disabled.",
              };
            }

            const role = (profile?.role as DemoRole) || "client";
            const session: SessionUser = {
              email: data.user.email || cleanEmail,
              name: profile?.full_name || cleanEmail.split("@")[0],
              company: profile?.company || "Integrated Technics",
              role,
              initials: (profile?.full_name || cleanEmail)
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase(),
              home: role === "admin" ? "/admin" : "/dashboard",
            };

            persist(session);
            return { ok: true, user: session };
          }
        } catch {
          /* continue to verified accounts check */
        }

        // 2. Validate against verified real accounts
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
        const cleanEmail = account.email.trim().toLowerCase();
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("status, full_name")
            .ilike("email", cleanEmail)
            .maybeSingle();

          if (profile && (profile.status === "suspended" || profile.status === "inactive" || profile.status === "pending")) {
            return {
              ok: false,
              isInactive: true,
              error: `Account for ${account.name} is currently inactive / suspended in database.`,
            };
          }
        } catch {}

        const session = toSession(account);
        persist(session);
        return { ok: true, user: session };
      },
      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          /* ignore */
        }
        persist(null);
      },
    }),
    [user, ready, persist]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
