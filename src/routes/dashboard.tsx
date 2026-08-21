import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, QrCode, Ticket } from "lucide-react";
import { PortalShell, PageHeading } from "@/components/int/portal-shell";
import { EventCard } from "@/components/int/event-card";
import { PassCard } from "@/components/int/pass-card";
import { Countdown, parseEventStart } from "@/components/int/countdown";
import { currentUser, events, getEvent, myRegistrations, notifications } from "@/lib/int-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — INT Events" },
      {
        name: "description",
        content:
          "Your INT Events dashboard: upcoming registrations, digital passes, certificates and notifications.",
      },
      { property: "og:title", content: "Dashboard — INT Events" },
      { property: "og:description", content: "Track your INT event registrations and passes." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const upcoming = myRegistrations.filter((r) => r.state === "registered");
  const nextReg = upcoming[0];
  const nextEvent = nextReg ? getEvent(nextReg.eventId) : undefined;

  return (
    <PortalShell>
      <PageHeading
        title={`Welcome back, ${currentUser.name.split(" ")[0]}`}
        subtitle={`${currentUser.company} · ${currentUser.role} account`}
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Ticket} label="Registered" value={String(upcoming.length)} />
        <Stat icon={QrCode} label="Active passes" value={String(myRegistrations.length)} />
        <Stat icon={CalendarDays} label="Attended" value="1" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-foreground">Recommended for you</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {events.slice(0, 2).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          <h2 className="mb-4 mt-8 text-base font-semibold text-foreground">Recent activity</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-card">
            {notifications.slice(0, 4).map((n) => (
              <li key={n.title + n.time} className="flex items-start gap-3 p-4">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
                <span className="ml-auto whitespace-nowrap text-[11px] text-muted-foreground">
                  {n.time}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-base font-semibold text-foreground">Your next pass</h2>
          {nextReg && nextEvent ? (
            <>
              <PassCard registration={nextReg} event={nextEvent} compact />
              {nextEvent.status !== "completed" && nextEvent.status !== "cancelled" && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Starts in
                  </p>
                  <Countdown target={parseEventStart(nextEvent.date, nextEvent.startTime)} />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming passes.</p>
          )}
          <Link
            to="/passes"
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border border-border text-sm font-medium text-foreground hover:bg-secondary"
          >
            View all passes
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ticket;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card sm:p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-xl font-semibold text-foreground sm:text-2xl">{value}</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground sm:mt-1.5 sm:text-xs">{label}</p>
    </div>
  );
}
