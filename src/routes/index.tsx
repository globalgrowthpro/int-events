import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, Handshake, Lightbulb, Users } from "lucide-react";
import heroImg from "@/assets/hero-summit.jpg";
import { IntLogo } from "@/components/int/logo";
import { useAuth } from "@/lib/auth";
import { EventCard } from "@/components/int/event-card";
import { events } from "@/lib/int-data";

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <IntLogo />
          <div className="flex items-center gap-2">
            <Link
              to="/events"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:block"
            >
              Events
            </Link>
            {user ? (
              <>
                <button
                  onClick={signOut}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Sign out
                </button>
                <Link
                  to={user.role === "admin" ? "/admin" : "/dashboard"}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-tech"
                >
                  {user.role === "admin" ? "Admin portal" : "My dashboard"}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-tech"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-navy">
        <img
          src={heroImg}
          alt="Integrated Technics technology summit main stage"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-24 md:px-6 md:py-32">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky">
            Integrated Technics
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-navy-foreground md:text-6xl">
            Discover INT Events
          </h1>
          <p className="mt-3 text-lg font-medium tracking-wide text-sky">
            Connect. Discover. Innovate.
          </p>
          <p className="mt-5 max-w-2xl text-base text-navy-foreground/75">
            Join Integrated Technics summits, technology forums, partner sessions and industry
            experiences — register online, receive a digital QR pass and check in at the door in
            seconds.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/events"
              className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-tech"
            >
              Explore Events
            </Link>
            <Link
              to="/register"
              className="inline-flex h-11 items-center rounded-md border border-navy-foreground/25 px-6 text-sm font-semibold text-navy-foreground transition-colors hover:bg-navy-foreground/10"
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
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Why Attend?</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((r) => (
              <div key={r.title} className="rounded-xl border border-border p-6">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground">
                  <r.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{r.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-navy py-10 text-navy-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between md:px-6">
          <IntLogo tone="light" />
          <p className="text-xs text-navy-foreground/60">
            INT Events — an Integrated Technics platform. Prototype by Hafez Rahim.
          </p>
          <Link to="/admin" className="text-xs font-medium text-sky hover:underline">
            Admin Portal
          </Link>
        </div>
      </footer>
    </div>
  );
}
