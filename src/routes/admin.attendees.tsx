import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Search } from "lucide-react";
import { StateBadge } from "@/components/int/status-badge";
import { attendees } from "@/lib/int-data";

export const Route = createFileRoute("/admin/attendees")({
  head: () => ({
    meta: [
      { title: "Attendees — INT Events Admin" },
      {
        name: "description",
        content: "Search and export the attendee registry across all Integrated Technics events.",
      },
      { property: "og:title", content: "Attendees — INT Events Admin" },
      { property: "og:description", content: "Registration management for INT events." },
    ],
  }),
  component: AdminAttendees,
});

function AdminAttendees() {
  const [query, setQuery] = useState("");
  const rows = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.company.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Attendees</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All registrations across clients, vendors and employees.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search attendees"
            placeholder="Search by name or company"
            className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-secondary">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">Attendee</th>
              <th className="px-5 py-3 font-semibold">Company</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Event</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((a) => (
              <tr key={a.name} className="hover:bg-secondary/50">
                <td className="px-5 py-3.5 font-medium text-foreground">{a.name}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{a.company}</td>
                <td className="px-5 py-3.5 capitalize text-muted-foreground">{a.role}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{a.event}</td>
                <td className="px-5 py-3.5">
                  <StateBadge state={a.state} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
