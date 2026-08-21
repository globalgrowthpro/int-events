import { createFileRoute } from "@tanstack/react-router";
import { PortalShell, PageHeading } from "@/components/int/portal-shell";
import { currentUser } from "@/lib/int-data";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — INT Events" },
      {
        name: "description",
        content: "Manage your INT Events account details, company information and preferences.",
      },
      { property: "og:title", content: "Profile — INT Events" },
      { property: "og:description", content: "Your INT Events account settings." },
    ],
  }),
  component: Profile,
});

function Profile() {
  return (
    <PortalShell>
      <PageHeading title="Profile" subtitle="Account details used on your event passes." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-card">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-navy text-xl font-semibold text-navy-foreground">
            {currentUser.initials}
          </span>
          <p className="mt-4 text-lg font-semibold text-foreground">{currentUser.name}</p>
          <p className="text-sm text-muted-foreground">{currentUser.company}</p>
          <span className="mt-3 inline-flex rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
            {currentUser.role} account
          </span>
        </div>

        <form className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" defaultValue={currentUser.name} />
            <Field label="Email" defaultValue={currentUser.email} type="email" />
            <Field label="Company" defaultValue={currentUser.company} />
            <Field label="Phone" defaultValue="+20 100 123 4567" />
            <Field label="Job title" defaultValue="IT Manager" />
            <Field label="Country" defaultValue="Egypt" />
          </div>

          <fieldset className="space-y-3 border-t border-border pt-5">
            <legend className="text-sm font-semibold text-foreground">Preferences</legend>
            {[
              "Email reminders before events",
              "SMS check-in confirmation",
              "News about new INT events",
            ].map((label) => (
              <label key={label} className="flex items-center gap-3 text-sm text-muted-foreground">
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--primary)]" />
                {label}
              </label>
            ))}
          </fieldset>

          <button
            type="button"
            className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-tech"
          >
            Save changes
          </button>
        </form>
      </div>
    </PortalShell>
  );
}

function Field({
  label,
  defaultValue,
  type = "text",
}: {
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        defaultValue={defaultValue}
        className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
