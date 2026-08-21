import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PortalShell, PageHeading } from "@/components/int/portal-shell";
import { StateBadge } from "@/components/int/status-badge";
import { Countdown, parseEventStart } from "@/components/int/countdown";
import { getEvent, myRegistrations } from "@/lib/int-data";

export const Route = createFileRoute("/my-events")({
  head: () => ({
    meta: [
      { title: "My Events — INT Events" },
      {
        name: "description",
        content: "Manage your Integrated Technics event registrations, tickets and certificates.",
      },
      { property: "og:title", content: "My Events — INT Events" },
      { property: "og:description", content: "Your upcoming and past INT event registrations." },
    ],
  }),
  component: MyEvents,
});

const tabs = ["Upcoming", "Past", "Cancelled"] as const;

function MyEvents() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Upcoming");

  const rows = myRegistrations.filter((r) => {
    const event = getEvent(r.eventId);
    if (tab === "Cancelled") return r.state === "cancelled";
    if (tab === "Past") return event?.status === "completed";
    return r.state !== "cancelled" && event?.status !== "completed";
  });

  return (
    <PortalShell>
      <PageHeading title="My Events" subtitle="Every event you have registered for with INT." />

      <div className="mb-5 flex gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === item
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {rows.map((reg) => {
          const event = getEvent(reg.eventId);
          if (!event) return null;
          return (
            <article
              key={reg.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center"
            >
              <img
                src={event.image}
                alt={event.title}
                className="h-24 w-full rounded-lg object-cover sm:w-40"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">{event.title}</h2>
                  <StateBadge state={reg.state} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {event.dateLabel} · {event.venue}
                </p>
                {reg.state === "registered" && event.status !== "completed" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Starts in{" "}
                    <Countdown
                      target={parseEventStart(event.date, event.startTime)}
                      variant="inline"
                    />
                  </p>
                )}
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{reg.id}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/passes"
                  className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-tech"
                >
                  View pass
                </Link>
                <Link
                  to="/events/$eventId"
                  params={{ eventId: event.id }}
                  className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Details
                </Link>
              </div>
            </article>
          );
        })}
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </p>
        )}
      </div>
    </PortalShell>
  );
}
