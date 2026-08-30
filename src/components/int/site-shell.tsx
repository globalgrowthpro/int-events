import { Link } from "@tanstack/react-router";
import { IntLogo } from "@/components/int/logo";
import { useAuth } from "@/lib/auth";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <header className="sticky top-0 z-30 w-full border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex min-h-[4.25rem] max-w-7xl items-center justify-between px-3 sm:px-6 py-2">
          <Link to="/" aria-label="INT Events home">
            <IntLogo size="sm" compactOnMobile={true} />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {user && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={signOut}
                  className="rounded-lg border border-border px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Sign out
                </button>
                <Link
                  to={user.role === "admin" ? "/admin" : "/dashboard"}
                  className="rounded-lg bg-primary px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-tech whitespace-nowrap"
                >
                  {user.role === "admin" ? "Admin" : "Dashboard"}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-3 py-8 sm:px-6">{children}</main>

      <footer className="bg-navy py-12 text-navy-foreground border-t border-navy-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center text-center gap-6 px-4 md:flex-row md:items-center md:justify-between md:text-left md:px-6">
          <div className="flex justify-center md:justify-start">
            <IntLogo tone="light" size="md" />
          </div>
          <p className="text-xs text-navy-foreground/70 max-w-md md:max-w-none leading-relaxed">
            INT Events — an Integrated Technics platform. Developed by{" "}
            <a
              href="https://odooteams.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-primary font-semibold transition-colors underline decoration-white/30 underline-offset-4"
            >
              &lt;/&gt; Mr. Hafez Rahim
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
