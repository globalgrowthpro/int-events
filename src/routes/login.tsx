import { createFileRoute, Link } from "@tanstack/react-router";
import { IntLogo } from "@/components/int/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-summit.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — INT Events" },
      { name: "description", content: "Sign in to your INT Events account to register for Integrated Technics events." },
      { property: "og:title", content: "Login — INT Events" },
      { property: "og:description", content: "Sign in to your INT Events account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-navy lg:block">
        <img
          src={heroImg}
          alt="INT summit stage"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <IntLogo tone="light" />
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
            <IntLogo />
          </div>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight lg:mt-0">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to browse and register for INT events.
          </p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-border" /> Remember me
              </label>
              <button type="button" className="font-medium text-primary hover:underline">
                Forgot password?
              </button>
            </div>
            <Button asChild className="w-full">
              <Link to="/dashboard">Login</Link>
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create Account
            </Link>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            INT staff?{" "}
            <Link to="/admin" className="font-medium text-primary hover:underline">
              Admin portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}