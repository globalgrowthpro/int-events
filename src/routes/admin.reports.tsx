import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { KpiCard } from "@/components/int/admin-shell";
import { audienceSplit, events, registrationTrend } from "@/lib/int-data";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports — INT Events Admin" },
      {
        name: "description",
        content: "Analytics and exportable reports on registrations, attendance and audiences.",
      },
      { property: "og:title", content: "Reports — INT Events Admin" },
      { property: "og:description", content: "Event analytics and exports for INT management." },
    ],
  }),
  component: Reports,
});

const reports = [
  { icon: FileSpreadsheet, title: "Registration report", detail: "All registrations with company and role" },
  { icon: FileText, title: "Attendance report", detail: "Check-in times and no-shows per event" },
  { icon: FileSpreadsheet, title: "Vendor report", detail: "Exhibitor participation and rep counts" },
  { icon: FileText, title: "Certificate log", detail: "Issued certificates by attendee" },
];

function Reports() {
  const peak = Math.max(...registrationTrend.map((d) => d.registrations));
  const total = events.reduce((s, e) => s + e.registered, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analytics across all Integrated Technics events.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total registrations" value={String(total)} />
        <KpiCard label="Avg. attendance" value="86%" tone="success" />
        <KpiCard label="Certificates issued" value="54" />
        <KpiCard label="Partner companies" value="11" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Weekly registrations</h2>
          <div className="mt-6 flex h-44 items-end gap-3">
            {registrationTrend.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-tech"
                  style={{ height: `${(d.registrations / peak) * 100}%` }}
                />
                <span className="text-[11px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Registrations by event</h2>
          <ul className="mt-5 space-y-4">
            {events.map((event) => (
              <li key={event.id}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-foreground">{event.title}</span>
                  <span className="text-muted-foreground">{event.registered}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(event.registered / 300) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-base font-semibold text-foreground">Exports</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {reports.map((report) => (
            <article
              key={report.title}
              className="rounded-xl border border-border bg-card p-5 shadow-card"
            >
              <report.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">{report.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{report.detail}</p>
              <button className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-secondary">
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-base font-semibold text-foreground">Audience composition</h2>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full">
          {audienceSplit.map((a, i) => (
            <div
              key={a.type}
              className={i === 0 ? "bg-primary" : i === 1 ? "bg-tech" : "bg-sky"}
              style={{
                width: `${(a.count / audienceSplit.reduce((s, x) => s + x.count, 0)) * 100}%`,
              }}
            />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {audienceSplit.map((a) => (
            <li key={a.type}>
              {a.type}: <span className="font-semibold text-foreground">{a.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
