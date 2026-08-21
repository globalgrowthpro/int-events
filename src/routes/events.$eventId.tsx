import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { PortalShell } from "@/components/int/portal-shell";
import { StatusBadge } from "@/components/int/status-badge";
import { Countdown, parseEventStart } from "@/components/int/countdown";
import { getEvent } from "@/lib/int-data";

export const Route = createFileRoute("/events/$eventId")({
  loader: ({ params }) => {
    const event = getEvent(params.eventId);
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Event not found — INT Events" }, { name: "robots", content: "noindex" }],
      };
    }
    const { event } = loaderData;
    return {
      meta: [
        { title: `${event.title} — INT Events` },
        { name: "description", content: event.summary },
        { property: "og:title", content: event.title },
        { property: "og:description", content: event.summary },
      ],
    };
  },
  component: EventDetail,
});

function EventDetail() {
  const { event } = Route.useLoaderData();
  const seatsLeft = event.capacity - event.registered;
  const pct = Math.round((event.registered / event.capacity) * 100);
  const target = parseEventStart(event.date, event.startTime);
  const isUpcoming = event.status !== "completed" && event.status !== "cancelled";

  return (
    <PortalShell>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="relative aspect-21/9 bg-navy">
          <img
            src={event.image}
            alt={event.title}
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute left-4 top-4">
            <StatusBadge status={event.status} />
          </div>
        </div>
        <div className="p-6 md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {event.category} · {event.code}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {event.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{event.summary}</p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact icon={CalendarDays} label="Date" value={event.dateLabel} />
            <Fact icon={Clock} label="Time" value={`${event.startTime} – ${event.endTime}`} />
            <Fact icon={MapPin} label="Venue" value={`${event.venue}, ${event.city}`} />
            <Fact
              icon={Users}
              label="Capacity"
              value={`${event.registered}/${event.capacity} registered`}
            />
          </dl>

          <div className="mt-6">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {seatsLeft > 0 ? `${seatsLeft} seats remaining` : "This event is fully booked"}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-tech"
            >
              Register for this event
            </Link>
            <Link
              to="/events"
              className="inline-flex h-11 items-center rounded-md border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Back to events
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="About this event">
            {event.description.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </Panel>

          <Panel title="Agenda">
            <ol className="space-y-4">
              {event.agenda.map((item) => (
                <li key={item.time} className="flex gap-4">
                  <span className="w-14 shrink-0 font-mono text-sm font-semibold text-primary">
                    {item.time}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">{item.title}</span>
                    {item.detail && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.detail}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Speakers">
            <div className="grid gap-4 sm:grid-cols-2">
              {event.speakers.map((speaker) => (
                <div key={speaker.name} className="rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold text-foreground">{speaker.name}</p>
                  <p className="text-xs font-medium text-primary">
                    {speaker.position} · {speaker.company}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {speaker.bio}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Partners & exhibitors">
            <ul className="flex flex-wrap gap-2">
              {event.partners.map((partner) => (
                <li
                  key={partner}
                  className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
                >
                  {partner}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Organizer">
            <p className="text-sm font-medium text-foreground">{event.organizer}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Questions? Contact events@integratedtechnics.com
            </p>
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-tech" /> {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-card">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
