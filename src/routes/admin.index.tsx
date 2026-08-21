import { createFileRoute, Link } from "@tanstack/react-router";
import { KpiCard } from "@/components/int/admin-shell";
import { StateBadge, StatusBadge } from "@/components/int/status-badge";
import { attendees, audienceSplit, events, registrationTrend } from "@/lib/int-data";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — INT Events" },
      {
        name: "description",
        content:
          "Live registration, attendance and audience analytics for Integrated Technics events.",
      },
      { property: "og:title", content: "Admin Dashboard — INT Events" },
      { property: "og:description", content: "Operate INT events from one control centre." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const totalRegistered = events.reduce((sum, e) => sum + e.registered, 0);
  const peak = Math.max(...registrationTrend.map((d) => d.registrations));
  const audienceTotal = audienceSplit.reduce((s, a) => s + a.count, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of every INT event, registration and check-in.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total events" value={String(events.length)} hint="2 open for registration" />
        <KpiCard label="Registrations" value={String(totalRegistered)} hint="+91 this week" />
        <KpiCard label="Checked in today" value="128" tone="success" hint="52% of expected" />
        <KpiCard label="Pending vendors" value="2" tone="warning" hint="Awaiting approval" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <h2 className="text-base font-semibold text-foreground">Registrations this week</h2>
          <div className="mt-6 flex h-48 items-end gap-3">
            {registrationTrend.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {d.registrations}
                </span>
                <div
                  className="w-full rounded-t-md bg-primary/85"
                  style={{ height: `${(d.registrations / peak) * 100}%` }}
                />
                <span className="text-[11px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Audience split</h2>
          <ul className="mt-5 space-y-4">
            {audienceSplit.map((a) => (
              <li key={a.type}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">{a.type}</span>
                  <span className="text-muted-foreground">{a.count}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-tech"
                    style={{ width: `${(a.count / audienceTotal) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Upcoming events</h2>
            <Link to="/admin/events" className="text-xs font-semibold text-primary hover:underline">
              Manage
            </Link>
          </div>
          <ul className="space-y-4">
            {events.slice(0, 3).map((event) => (
              <li key={event.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.dateLabel} · {event.registered}/{event.capacity}
                  </p>
                </div>
                <StatusBadge status={event.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Live check-ins</h2>
            <Link
              to="/admin/attendance"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="space-y-3">
            {attendees.slice(0, 5).map((a) => (
              <li key={a.name} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{a.time}</span>
                <span className="truncate font-medium text-foreground">{a.name}</span>
                <span className="ml-auto">
                  <StateBadge state={a.state} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
