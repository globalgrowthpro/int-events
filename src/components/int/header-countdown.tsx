import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { getEvents } from "@/lib/api";
import { type IntEvent } from "@/lib/int-data";
import { parseEventStart, diffParts, FlipUnit } from "./countdown";

export function HeaderUpcomingCountdown({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<number>(Date.now());
  const [events, setEvents] = useState<IntEvent[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    getEvents()
      .then((data) => {
        if (active) setEvents(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);


  // Find closest upcoming event
  const nextEvent: { event: IntEvent; startTimestamp: number } | null = useMemo(() => {
    const upcoming = events
      .map((ev) => ({
        event: ev,
        startTimestamp: parseEventStart(ev.date, ev.startTime),
      }))
      .filter((ev) => ev.startTimestamp > now)
      .sort((a, b) => a.startTimestamp - b.startTimestamp);

    return (
      upcoming[0] ||
      (events[0]
        ? {
            event: events[0],
            startTimestamp: parseEventStart(events[0].date, events[0].startTime),
          }
        : null)
    );
  }, [now]);

  if (!nextEvent) return null;

  const d = diffParts(nextEvent.startTimestamp, now);

  const units: Array<[string, string]> = [
    [String(d.days).padStart(2, "0"), "Days"],
    [String(d.hours).padStart(2, "0"), "Hrs"],
    [String(d.minutes).padStart(2, "0"), "Mins"],
    [String(d.seconds).padStart(2, "0"), "Secs"],
  ];

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: nextEvent.event.id }}
      className={`group relative flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/95 px-2.5 py-1.5 shadow-2xs transition-all hover:border-primary/50 hover:bg-accent/40 sm:px-3 sm:py-1.5 sm:shadow-sm ${className}`}
      title={`Upcoming: ${nextEvent.event.title} (${nextEvent.event.dateLabel})`}
    >
      {/* Expanded Title & Status indicator */}
      <div className="hidden sm:flex items-center gap-2 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        </span>
        <div className="leading-tight min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Next Event</p>
          <p className="max-w-[140px] md:max-w-[260px] lg:max-w-[340px] truncate text-xs font-bold text-foreground">
            {nextEvent.event.title}
          </p>
        </div>
      </div>

      {/* Countdown Flip Units on Right Side */}
      <div className="flex shrink-0 items-center gap-1">
        <div className="flex items-center gap-0.5 rounded-lg bg-[#121212] p-1 shadow-inner sm:gap-1">
          {units.map(([val, lbl]) => (
            <FlipUnit key={lbl} value={val} label={lbl} size="xs" />
          ))}
        </div>
        <ArrowRight className="hidden h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary sm:block" />
      </div>
    </Link>
  );
}
