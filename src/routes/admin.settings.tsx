import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — INT Events Admin" },
      {
        name: "description",
        content: "Configure branding, notifications, roles and check-in rules for INT Events.",
      },
      { property: "og:title", content: "Settings — INT Events Admin" },
      { property: "og:description", content: "Platform configuration for INT Events." },
    ],
  }),
  component: Settings,
});

const roles = [
  { role: "Super Admin", access: "Full platform access, settings and user roles" },
  { role: "Event Manager", access: "Create and manage events, attendees and reports" },
  { role: "Check-in Staff", access: "QR scanner and live attendance only" },
  { role: "Viewer", access: "Read-only dashboards and reports" },
];

function Settings() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform configuration for the INT Events ecosystem.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Organization</h2>
          <div className="mt-4 space-y-4">
            <Field label="Organization name" defaultValue="Integrated Technics" />
            <Field label="Support email" defaultValue="events@integratedtechnics.com" />
            <Field label="Default city" defaultValue="Cairo, Egypt" />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Check-in rules</h2>
          <div className="mt-4 space-y-3">
            {[
              "Allow check-in 60 minutes before start",
              "Block duplicate QR scans",
              "Require staff confirmation for walk-ins",
              "Auto-issue certificates after check-out",
            ].map((rule) => (
              <label key={rule} className="flex items-center gap-3 text-sm text-muted-foreground">
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--primary)]" />
                {rule}
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <h2 className="text-base font-semibold text-foreground">Roles & permissions</h2>
          <ul className="mt-4 divide-y divide-border">
            {roles.map((item) => (
              <li key={item.role} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-40 text-sm font-medium text-foreground">{item.role}</span>
                <span className="flex-1 text-sm text-muted-foreground">{item.access}</span>
                <button className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary">
                  Edit
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <button className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-tech">
        Save settings
      </button>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        defaultValue={defaultValue}
        className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
