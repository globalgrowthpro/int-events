import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, Handshake, Lightbulb, Users } from "lucide-react";
import heroImg from "@/assets/hero-summit.jpg";
import { IntLogo } from "@/components/int/logo";
import { useAuth } from "@/lib/auth";
import { EventCard } from "@/components/int/event-card";
import { events } from "@/lib/int-data";
import { PWAInstallButton } from "@/components/int/pwa-install-prompt";
import { WhyAttendSlider } from "@/components/int/why-attend-slider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "INT Events — Integrated Technics Event Platform" },
      {
        name: "description",
        content:
          "Discover, register and check in to Integrated Technics technology and security events with digital QR attendance passes.",
      },
      { property: "og:title", content: "INT Events — Integrated Technics Event Platform" },
      {
        property: "og:description",
        content:
          "Connect. Discover. Innovate. Browse INT summits, forums and partner days and get your digital event pass.",
      },
    ],
  }),
  component: Landing,
});

const reasons = [
  { icon: Cpu, title: "Technology", body: "Discover emerging security, ICT and smart-infrastructure technologies." },
  { icon: Users, title: "Networking", body: "Connect with industry leaders, government bodies and enterprise teams." },
  { icon: Lightbulb, title: "Innovation", body: "Explore new integrated solutions through live demonstrations." },
  { icon: Handshake, title: "Partnership", body: "Meet INT's technology vendors, exhibitors and global partners." },
];

function Landing() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <header className="sticky top-0 z-30 w-full border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex min-h-[4.25rem] max-w-7xl items-center justify-between px-3 sm:px-6 py-2">
          <IntLogo size="sm" compactOnMobile={true} />

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link
              to="/events"
              className="hidden xs:inline-flex rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Events
            </Link>

            <PWAInstallButton variant="outline" size="sm" className="hidden md:inline-flex text-xs gap-1.5" />

            {user ? (
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
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  to="/login"
                  className="rounded-lg border border-border px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-primary px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-tech whitespace-nowrap"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="relative isolate w-full overflow-hidden bg-navy">
        <img
          src={heroImg}
          alt="Integrated Technics technology summit main stage"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24 md:px-6 md:py-32">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-sky">
            Integrated Technics
          </p>
          <h1 className="mt-3 sm:mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-navy-foreground sm:text-5xl md:text-6xl">
            Discover INT Events
          </h1>
          <p className="mt-2.5 sm:mt-3 text-base sm:text-lg font-medium tracking-wide text-sky">
            Connect. Discover. Innovate.
          </p>
          <p className="mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base text-navy-foreground/75 leading-relaxed">
            Join Integrated Technics summits, technology forums, partner sessions and industry
            experiences — register online, receive a digital QR pass and check in at the door in
            seconds.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-wrap gap-2.5 sm:gap-3">
            <Link
              to="/events"
              className="inline-flex h-10 sm:h-11 items-center rounded-xl bg-primary px-5 sm:px-6 text-xs sm:text-sm font-bold text-primary-foreground transition-colors hover:bg-tech shadow-md"
            >
              Explore Events
            </Link>
            <Link
              to="/register"
              className="inline-flex h-10 sm:h-11 items-center rounded-xl border border-navy-foreground/25 px-5 sm:px-6 text-xs sm:text-sm font-bold text-navy-foreground transition-colors hover:bg-navy-foreground/10"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Upcoming Events</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Curated technology and security gatherings hosted by Integrated Technics.
            </p>
          </div>
          <Link to="/events" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events
            .filter((e) => e.status !== "completed")
            .map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16 md:px-6">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Why Attend?</h2>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Key benefits and opportunities for participants, partners, and exhibitors.
              </p>
            </div>
          </div>
          <WhyAttendSlider items={reasons} />
        </div>
      </section>

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
          <div className="flex items-center justify-center gap-4 md:justify-end">
            <Link
              to="/admin"
              className="text-xs font-semibold text-sky-400 hover:text-white transition-colors bg-white/5 border border-white/10 rounded-lg px-3.5 py-1.5 hover:bg-white/10"
            >
              Admin Portal &rarr;
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
