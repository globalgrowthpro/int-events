import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PortalShell, PageHeading } from "@/components/int/portal-shell";
import { PassCard } from "@/components/int/pass-card";
import { useAuth } from "@/lib/auth";
import { getEvents } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { type IntEvent, type Registration } from "@/lib/int-data";
import { QrCode, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/passes")({
  head: () => ({
    meta: [
      { title: "My Passes (Live DB) — INT Events" },
      {
        name: "description",
        content: "Your digital QR attendance passes for Integrated Technics events synced with database.",
      },
      { property: "og:title", content: "My Passes — INT Events" },
      { property: "og:description", content: "Show your QR pass at the entrance to check in." },
    ],
  }),
  component: Passes,
});

export function Passes() {
  const { user } = useAuth();
  const [eventsList, setEventsList] = useState<IntEvent[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<Registration[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPasses = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const liveEvents = await getEvents();
      setEventsList(liveEvents);

      const userEmail = user?.email?.toLowerCase() || "";
      const userName = user?.name?.trim().toLowerCase() || "";

      const { data: regsData, error } = await supabase
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && regsData) {
        const mine = regsData.filter(
          (r) =>
            (userEmail && r.attendee_email?.toLowerCase() === userEmail) ||
            (userName && r.attendee_name?.trim().toLowerCase() === userName),
        );

        const mapped: Registration[] = mine.map((r) => ({
          id: r.id,
          eventId: r.event_id,
          attendee: r.attendee_name,
          company: r.company || user?.company || "Enterprise Client",
          role: (r.role || "client") as any,
          token: r.ticket_token,
          state: r.state as any,
          checkInTime: r.check_in_time || undefined,
        }));

        setUserRegistrations(mapped);
      }
      if (showToast) toast.success("Passes synced with database!");
    } catch {
      /* fallback */
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPasses();
  }, [user]);

  return (
    <PortalShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <PageHeading
          title="My Digital Passes"
          subtitle="Present your QR pass at event gates for instant badge check-in."
        />
        <button
          onClick={() => loadPasses(true)}
          disabled={refreshing}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-primary ${refreshing ? "animate-spin" : ""}`} />
          Sync
        </button>
      </div>

      {userRegistrations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <QrCode className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h3 className="mt-4 text-base font-bold text-foreground">No passes issued yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Register for upcoming summits to receive your digital attendance pass.
          </p>
          <Link
            to="/events"
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-tech"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {userRegistrations.map((reg) => {
            const event = eventsList.find((e) => e.id === reg.eventId) || eventsList[0];
            if (!event) return null;
            return <PassCard key={reg.id} registration={reg} event={event} compact />;
          })}
        </div>
      )}
    </PortalShell>
  );
}
