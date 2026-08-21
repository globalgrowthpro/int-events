import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { IntLogo } from "@/components/int/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { demoAccounts, useAuth, type DemoAccount } from "@/lib/auth";
import heroImg from "@/assets/hero-summit.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — INT Events" },
      {
        name: "description",
        content:
          "Sign in to your INT Events account to register for Integrated Technics events, view passes and check in.",
      },
      { property: "og:title", content: "Sign in — INT Events" },
      { property: "og:description", content: "Sign in to your INT Events account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInAs } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = signIn(email, password);
    if (!result.ok || !result.user) {
      setError(result.error ?? "Unable to sign in.");
      return;
    }
    setError(null);
    navigate({ to: result.user.home, replace: true });
  }

  function useDemo(account: DemoAccount) {
    const session = signInAs(account);
    navigate({ to: session.home, replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-navy lg:block">
        <img
          src={heroImg}
          alt="INT summit stage"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link to="/">
            <IntLogo tone="light" />
          </Link>
          <div>
            <h2 className="text-3xl font-semibold text-navy-foreground">
              Connect. Discover. Innovate.
            </h2>
            <p className="mt-3 max-w-md text-sm text-navy-foreground/70">
              One platform for INT clients, vendors and employees — from registration to QR
              check-in and attendance certificates.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Link to="/">
              <IntLogo />
            </Link>
          </div>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight lg:mt-0">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to browse and register for INT events.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-border" /> Remember me
              </label>
              <button type="button" className="font-medium text-primary hover:underline">
                Forgot password?
              </button>
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-border bg-secondary/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Demo accounts
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Password for all demo accounts: <span className="font-mono">demo1234</span>
            </p>
            <div className="mt-3 space-y-2">
              {demoAccounts.map((account) => (
                <div
                  key={account.email}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-navy text-[11px] font-semibold text-navy-foreground">
                    {account.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {account.label}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{account.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => {
                        setEmail(account.email);
                        setPassword(account.password);
                        setError(null);
                      }}
                    >
                      Fill
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => useDemo(account)}
                    >
                      Use
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
