import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Users } from "lucide-react";
import type { IntEvent } from "@/lib/int-data";
import { StatusBadge } from "./status-badge";
import { Countdown, parseEventStart } from "./countdown";

export function EventCard({ event }: { event: IntEvent }) {
  const seatsLeft = event.capacity - event.registered;
  const isUpcoming = event.status !== "completed" && event.status !== "cancelled";
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-elevated">
      <div className="relative aspect-16/9 overflow-hidden bg-navy">
        <img
          src={event.image}
          alt={event.title}
          loading="lazy"
          width={1200}
          height={800}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3">
          <StatusBadge status={event.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          {event.category}
        </p>
        <h3 className="mt-2 text-lg font-semibold leading-snug text-foreground">{event.title}</h3>
        <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-tech" />
            <span>
              {event.dateLabel} · {event.startTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-tech" />
            <span>{event.city}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-tech" />
            <span>
              {event.registered}/{event.capacity} registered
              {seatsLeft > 0 ? ` · ${seatsLeft} seats left` : " · full"}
            </span>
          </div>
        </dl>
        {isUpcoming && (
          <div className="mt-4">
            <Countdown target={parseEventStart(event.date, event.startTime)} size="sm" />
          </div>
        )}
        <Link
          to="/events/$eventId"
          params={{ eventId: event.id }}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-tech"
        >
          View Event
        </Link>
      </div>
    </article>
  );
}