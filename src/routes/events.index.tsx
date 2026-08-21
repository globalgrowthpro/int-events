import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PortalShell, PageHeading } from "@/components/int/portal-shell";
import { EventCard } from "@/components/int/event-card";
import { events } from "@/lib/int-data";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Discover Events — INT Events" },
      {
        name: "description",
        content:
          "Browse Integrated Technics summits, forums, partner days and technical workshops open for registration.",
      },
      { property: "og:title", content: "Discover Events — INT Events" },
      {
        property: "og:description",
        content: "Browse INT technology and security events and register online.",
      },
    ],
  }),
  component: EventsPage,
});

const categories = ["All", "Summit", "Forum", "Partner Event", "Workshop"];

function EventsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = events.filter(
    (event) =>
      (category === "All" || event.category === category) &&
      (event.title.toLowerCase().includes(query.toLowerCase()) ||
        event.city.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <PortalShell>
      <PageHeading
        title="Discover Events"
        subtitle="Technology, security and partner experiences hosted by Integrated Technics."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events or cities"
            aria-label="Search events"
            className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                category === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No events match your search.
        </p>
      )}
    </PortalShell>
  );
}
