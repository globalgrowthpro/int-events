import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { StatusBadge } from "@/components/int/status-badge";
import { events } from "@/lib/int-data";

export const Route = createFileRoute("/admin/events")({
  head: () => ({
    meta: [
      { title: "Manage Events — INT Events Admin" },
      {
        name: "description",
        content: "Create, edit and monitor Integrated Technics events, capacity and registrations.",
      },
      { property: "og:title", content: "Manage Events — INT Events Admin" },
      { property: "og:description", content: "Event creation and management for INT staff." },
    ],
  }),
  component: AdminEvents,
});

function AdminEvents() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {events.length} events · capacity and registration overview
          </p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-tech">
          <Plus className="h-4 w-4" /> Create event
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">Event</th>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Venue</th>
              <th className="px-5 py-3 font-semibold">Capacity</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-secondary/50">
                <td className="px-5 py-4">
                  <p className="font-medium text-foreground">{event.title}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{event.code}</p>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{event.dateLabel}</td>
                <td className="px-5 py-4 text-muted-foreground">{event.city}</td>
                <td className="px-5 py-4">
                  <p className="text-foreground">
                    {event.registered}/{event.capacity}
                  </p>
                  <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(event.registered / event.capacity) * 100}%` }}
                    />
                  </div>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={event.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
