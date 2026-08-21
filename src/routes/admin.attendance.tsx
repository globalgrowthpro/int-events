import { createFileRoute } from "@tanstack/react-router";
import { KpiCard } from "@/components/int/admin-shell";
import { StateBadge } from "@/components/int/status-badge";
import { attendees, events } from "@/lib/int-data";

export const Route = createFileRoute("/admin/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — INT Events Admin" },
      {
        name: "description",
        content: "Live QR check-in monitoring and attendance rates for Integrated Technics events.",
      },
      { property: "og:title", content: "Attendance — INT Events Admin" },
      { property: "og:description", content: "Real-time attendance tracking for INT events." },
    ],
  }),
  component: AdminAttendance,
});

function AdminAttendance() {
  const checkedIn = attendees.filter((a) => a.state === "checked-in");
  const rate = Math.round((checkedIn.length / attendees.length) * 100);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live check-in feed from the QR scanning stations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Expected" value={String(attendees.length)} />
        <KpiCard label="Checked in" value={String(checkedIn.length)} tone="success" />
        <KpiCard label="Attendance rate" value={`${rate}%`} />
        <KpiCard
          label="No shows"
          value={String(attendees.length - checkedIn.length)}
          tone="warning"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card shadow-card lg:col-span-2">
          <h2 className="border-b border-border px-5 py-4 text-base font-semibold text-foreground">
            Live check-in feed
          </h2>
          <ul className="divide-y divide-border">
            {attendees.map((a) => (
              <li key={a.name} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{a.time}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{a.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.company} · {a.event}
                  </p>
                </div>
                <span className="ml-auto">
                  <StateBadge state={a.state} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold text-foreground">By event</h2>
          <ul className="mt-5 space-y-4">
            {events.map((event) => {
              const pct = Math.round((event.checkedIn / Math.max(event.registered, 1)) * 100);
              return (
                <li key={event.id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-foreground">{event.title}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
