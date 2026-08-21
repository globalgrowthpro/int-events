import { createFileRoute } from "@tanstack/react-router";
import { StateBadge } from "@/components/int/status-badge";
import { vendors } from "@/lib/int-data";

export const Route = createFileRoute("/admin/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors — INT Events Admin" },
      {
        name: "description",
        content: "Approve and manage vendor and exhibitor participation in INT events.",
      },
      { property: "og:title", content: "Vendors — INT Events Admin" },
      { property: "og:description", content: "Vendor and exhibitor management for INT events." },
    ],
  }),
  component: AdminVendors,
});

function AdminVendors() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Vendors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Technology partners and exhibitors participating in INT events.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vendors.map((vendor) => (
          <article
            key={vendor.name}
            className="rounded-xl border border-border bg-card p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{vendor.name}</h2>
                <p className="text-xs text-muted-foreground">{vendor.category}</p>
              </div>
              <StateBadge state={vendor.state} />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
              <Metric label="Contact" value={vendor.contact.split(" ")[0] ?? vendor.contact} />
              <Metric label="Reps" value={String(vendor.reps)} />
              <Metric label="Events" value={String(vendor.events)} />
            </dl>
            {vendor.state === "pending" && (
              <div className="mt-4 flex gap-2">
                <button className="h-9 flex-1 rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:bg-tech">
                  Approve
                </button>
                <button className="h-9 flex-1 rounded-md border border-border text-xs font-semibold text-foreground hover:bg-secondary">
                  Reject
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
