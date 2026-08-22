import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { IntLogo } from "@/components/int/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import heroImg from "@/assets/hero-summit.jpg";
import { PasswordInput } from "@/components/ui/password-input";
import { AlertCircle, Clock, ShieldAlert, Loader2 } from "lucide-react";

import { toast } from "sonner";

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

const MAX_ATTEMPTS = 4;
const LOCKOUT_DURATION_SECONDS = 60; // 1 minute lockout

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Rate Limiting States
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const saved = sessionStorage.getItem("int_login_attempts");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [lockoutRemaining, setLockoutRemaining] = useState<number>(() => {
    const lockoutUntil = sessionStorage.getItem("int_login_lockout_until");
    if (lockoutUntil) {
      const remaining = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          sessionStorage.removeItem("int_login_lockout_until");
          sessionStorage.removeItem("int_login_attempts");
          setFailedAttempts(0);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const isLocked = lockoutRemaining > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isLocked) return;

    if (!email.trim() || !password) {
      setError("Please enter both email address and password.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await signIn(email, password);

    if (!result.ok || !result.user) {
      if (result.isInactive) {
        toast.error("Account Inactive or Suspended", {
          description: result.error || "This account is deactivated. Sign in is disabled.",
        });
        setError(result.error || "Your account is currently inactive or suspended.");
        setSubmitting(false);
        return;
      }

      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      sessionStorage.setItem("int_login_attempts", newAttempts.toString());

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockoutEnd = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
        sessionStorage.setItem("int_login_lockout_until", lockoutEnd.toString());
        setLockoutRemaining(LOCKOUT_DURATION_SECONDS);
        setError(`Too many failed attempts (${newAttempts}/${MAX_ATTEMPTS}). Account temporarily locked for 60 seconds.`);
      } else {
        const remainingTries = MAX_ATTEMPTS - newAttempts;
        setError(
          `${result.error ?? "Invalid email or password."} (${remainingTries} ${
            remainingTries === 1 ? "attempt" : "attempts"
          } left before cooldown)`
        );
      }
      setSubmitting(false);
      return;
    }

    // Success: reset attempts
    sessionStorage.removeItem("int_login_attempts");
    sessionStorage.removeItem("int_login_lockout_until");
    setFailedAttempts(0);
    setSubmitting(false);
    navigate({ to: result.user.home, replace: true });
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
            <IntLogo tone="light" size="lg" />
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
              <IntLogo size="md" />
            </Link>
          </div>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight lg:mt-0">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with your verified INT Events credentials.
          </p>

          {/* Rate Limit Lockout Banner */}
          {isLocked && (
            <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-destructive">Account Login Temporarily Cooldown</p>
                  <p className="mt-1 text-muted-foreground">
                    4 consecutive invalid attempts detected. For security protection, please wait before trying again.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-destructive/20 px-3 py-1 font-mono font-bold text-destructive">
                    <Clock className="h-3.5 w-3.5" />
                    Cooldown: {lockoutRemaining}s
                  </div>
                </div>
              </div>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                disabled={isLocked || submitting}
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                disabled={isLocked || submitting}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && !isLocked && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isLocked}
                  className="h-4 w-4 rounded border-border text-primary"
                />{" "}
                Remember me
              </label>
              <button
                type="button"
                disabled={isLocked}
                className="font-medium text-primary hover:underline disabled:opacity-50 text-xs"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLocked || submitting}
              className="w-full h-11 text-sm font-semibold gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                </>
              ) : isLocked ? (
                `Locked (${lockoutRemaining}s)`
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
