import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, RefreshCw } from "lucide-react";
import { PortalShell, PageHeading } from "@/components/int/portal-shell";
import { EventCard } from "@/components/int/event-card";
import { getEvents } from "@/lib/api";
import { type IntEvent } from "@/lib/int-data";
import { toast } from "sonner";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Discover Events — INT Events" },
      {
        name: "description",
        content:
          "Browse Integrated Technics summits, forums, partner days and technical workshops open for registration with real-time seat availability.",
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
const statusTabs = [
  { key: "all", label: "All events" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
] as const;
type StatusKey = (typeof statusTabs)[number]["key"];

function EventsPage() {
  const [eventsList, setEventsList] = useState<IntEvent[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState<StatusKey>("all");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const data = await getEvents();
      setEventsList(data);
      if (showToast) toast.success("Live events and seat counts synced!");
    } catch {
      /* fallback */
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = eventsList.filter(
    (event) =>
      (status === "all" ||
        (status === "completed"
          ? event.status === "completed"
          : event.status !== "completed" && event.status !== "cancelled")) &&
      (category === "All" || event.category === category) &&
      (event.title.toLowerCase().includes(query.toLowerCase()) ||
        event.city.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <PortalShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <PageHeading
          title="Discover Events"
          subtitle="Technology, security and partner experiences hosted by Integrated Technics with live seat availability."
        />
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-primary ${refreshing ? "animate-spin" : ""}`} />
          Sync
        </button>
      </div>

      <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
              status === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No events match your search.
        </p>
      )}
    </PortalShell>
  );
}
