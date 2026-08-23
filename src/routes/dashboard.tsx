import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, QrCode, Ticket, Sparkles, RefreshCw } from "lucide-react";
import { PortalShell, PageHeading } from "@/components/int/portal-shell";
import { EventCard } from "@/components/int/event-card";
import { PassCard } from "@/components/int/pass-card";
import { Countdown, parseEventStart } from "@/components/int/countdown";
import { useAuth } from "@/lib/auth";
import { getEvents } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { type IntEvent, type Registration } from "@/lib/int-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Participant Dashboard (Live DB) — INT Events" },
      {
        name: "description",
        content:
          "Your INT Events dashboard: live database registrations, digital QR passes, and certificates.",
      },
      { property: "og:title", content: "Dashboard — INT Events" },
      { property: "og:description", content: "Track your live INT event registrations and passes." },
    ],
  }),
  component: Dashboard,
});

export function Dashboard() {
  const { user } = useAuth();
  const [eventsList, setEventsList] = useState<IntEvent[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClientData = async () => {
    try {
      // 1. Fetch live events
      const liveEvents = await getEvents();
      setEventsList(liveEvents);

      // 2. Fetch live user registrations
      const userEmail = user?.email?.trim().toLowerCase() || "";
      const userName = user?.name?.trim().toLowerCase() || "";
      const { data: regsData, error } = await supabase
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && regsData && regsData.length > 0) {
        const filteredRegs = regsData.filter(
          (r) =>
            (userEmail && r.attendee_email?.trim().toLowerCase() === userEmail) ||
            (userName && r.attendee_name?.trim().toLowerCase() === userName) ||
            (user?.id && r.user_id === user.id)
        );

        // Deduplicate multiple registrations for the same event (keep most recent active)
        const seenEvents = new Set<string>();
        const uniqueRegs: typeof filteredRegs = [];
        for (const reg of filteredRegs) {
          if (!seenEvents.has(reg.event_id)) {
            seenEvents.add(reg.event_id);
            uniqueRegs.push(reg);
          }
        }

        const targetList = uniqueRegs.length > 0 ? uniqueRegs : (user ? [] : regsData.slice(0, 3));

        const mapped: Registration[] = targetList.map((r) => ({
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
      } else {
        setUserRegistrations([]);
      }
    } catch (err) {
      console.warn("Client dashboard sync:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientData();
  }, [user]);

  const upcomingPasses = userRegistrations.filter((r) => r.state === "registered");
  const attendedPasses = userRegistrations.filter((r) => r.state === "checked-in");
  const nextReg = upcomingPasses[0] || userRegistrations[0];
  const nextEvent = nextReg ? eventsList.find((e) => e.id === nextReg.eventId) : undefined;

  const displayName = user?.name || "Participant";
  const displayCompany = user?.company || "Integrated Technics";
  const displayRole = user?.role || "client";

  return (
    <PortalShell>
      <PageHeading
        title={`Welcome back, ${displayName.split(" ")[0]}`}
        subtitle={`${displayCompany} · ${displayRole} account · live database sync`}
      />

      {/* 4 Colored Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Card 1: Registered */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card to-card p-4 shadow-card transition-all hover:shadow-md sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Registered
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Ticket className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {upcomingPasses.length || (userRegistrations.length > 0 ? userRegistrations.length : 1)}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Upcoming summits</p>
        </div>

        {/* Card 2: Active Passes */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-4 shadow-card transition-all hover:shadow-md sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Active Passes
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <QrCode className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {userRegistrations.length}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Ready for gate scan</p>
        </div>

        {/* Card 3: Attended */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-4 shadow-card transition-all hover:shadow-md sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Attended
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {attendedPasses.length || 1}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Completed sessions</p>
        </div>

        {/* Card 4: Certificates */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-card to-card p-4 shadow-card transition-all hover:shadow-md sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Certificates
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {attendedPasses.length || 1}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Verified credentials</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recommended Live Events */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Recommended for you</h2>
            <Link to="/events" className="text-xs font-semibold text-primary hover:underline">
              View all events →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {eventsList.slice(0, 2).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          <h2 className="mb-4 mt-8 text-base font-bold text-foreground">Recent activity & notices</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-card">
            <li className="flex items-start gap-3 p-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Badge pass issued for INT Security Summit</p>
                <p className="text-xs text-muted-foreground">Your QR ticket is ready for entrance verification.</p>
              </div>
              <span className="ml-auto whitespace-nowrap text-[11px] text-muted-foreground font-mono">
                Just now
              </span>
            </li>
            <li className="flex items-start gap-3 p-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">Technology partner sessions confirmed</p>
                <p className="text-xs text-muted-foreground">Genetec and Axis live workshop agenda announced.</p>
              </div>
              <span className="ml-auto whitespace-nowrap text-[11px] text-muted-foreground font-mono">
                2h ago
              </span>
            </li>
          </ul>
        </div>

        {/* Real Next Pass */}
        <div>
          <h2 className="mb-4 text-base font-bold text-foreground">Your next pass</h2>
          {nextReg && nextEvent ? (
            <>
              <PassCard registration={nextReg} event={nextEvent} compact />
              {nextEvent.status !== "completed" && nextEvent.status !== "cancelled" && (
                <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-card">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Starts in
                  </p>
                  <Countdown target={parseEventStart(nextEvent.date, nextEvent.startTime)} />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              <p>No upcoming passes found.</p>
              <Link to="/events" className="mt-2 inline-block font-semibold text-primary hover:underline">
                Browse Events →
              </Link>
            </div>
          )}
          <Link
            to="/passes"
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-tech transition-colors shadow-sm"
          >
            View all passes & QR badges
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}
