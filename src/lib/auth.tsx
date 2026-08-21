import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DemoRole = "client" | "vendor" | "employee" | "admin";

export type DemoAccount = {
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

export const demoAccounts: DemoAccount[] = [
  {
    email: "client@intevents.com",
    password: "demo1234",
    name: "Ahmed Mohamed",
    company: "ABC Corporation",
    role: "client",
    initials: "AM",
    label: "Client",
    description: "Registered attendee with passes and event history",
    home: "/dashboard",
  },
  {
    email: "vendor@intevents.com",
    password: "demo1234",
    name: "Sara Khalil",
    company: "NexaTech Systems",
    role: "vendor",
    initials: "SK",
    label: "Vendor / Partner",
    description: "Exhibiting partner account",
    home: "/dashboard",
  },
  {
    email: "employee@intevents.com",
    password: "demo1234",
    name: "Omar Fathy",
    company: "Integrated Technics",
    role: "employee",
    initials: "OF",
    label: "INT Employee",
    description: "Internal staff attendee account",
    home: "/dashboard",
  },
  {
    email: "admin@intevents.com",
    password: "demo1234",
    name: "Hafez Rahim",
    company: "Integrated Technics",
    role: "admin",
    initials: "HR",
    label: "Administrator",
    description: "Full access to the admin portal and scanner",
    home: "/admin",
  },
];

export type SessionUser = Omit<DemoAccount, "password" | "label" | "description">;

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => { ok: boolean; user?: SessionUser; error?: string };
  signInAs: (account: DemoAccount) => SessionUser;
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
      /* ignore corrupted session */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: SessionUser | null) => {
    setUser(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      signIn: (email, password) => {
        const account = demoAccounts.find(
          (a) => a.email.toLowerCase() === email.trim().toLowerCase(),
        );
        if (!account) return { ok: false, error: "No demo account found for that email." };
        if (account.password !== password) return { ok: false, error: "Incorrect password." };
        const session = toSession(account);
        persist(session);
        return { ok: true, user: session };
      },
      signInAs: (account) => {
        const session = toSession(account);
        persist(session);
        return session;
      },
      signOut: () => persist(null),
    }),
    [user, ready, persist],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
