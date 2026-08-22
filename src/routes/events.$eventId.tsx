import { useState, useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  CalendarDays,
  MapPin,
  Users,
  ExternalLink,
  Building,
  Clock,
  Sparkles,
  Award,
  Globe,
  Share2,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { RegistrationDialog } from "@/components/int/registration-dialog";
import { PortalShell } from "@/components/int/portal-shell";
import { StatusBadge } from "@/components/int/status-badge";
import { Countdown, parseEventStart } from "@/components/int/countdown";
import { getEvent, type IntEvent } from "@/lib/int-data";
import { getEventById } from "@/lib/api";
import { toDdMmYyyy } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/events/$eventId")({
  loader: async ({ params }) => {
    try {
      const realEvent = await getEventById(params.eventId);
      if (realEvent) return { event: realEvent };
    } catch {}

    const fallback = getEvent(params.eventId);
    if (!fallback) throw notFound();
    return { event: fallback };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Event not found — INT Events" }, { name: "robots", content: "noindex" }],
      };
    }
    const { event } = loaderData;
    return {
      meta: [
        { title: `${event.title} — INT Events` },
        { name: "description", content: event.summary ? event.summary.replace(/<[^>]*>?/gm, "").slice(0, 160) : "" },
        { property: "og:title", content: event.title },
        { property: "og:description", content: event.summary ? event.summary.replace(/<[^>]*>?/gm, "").slice(0, 160) : "" },
      ],
    };
  },
  component: EventDetail,
});

function EventDetail() {
  const { event: initialEvent } = Route.useLoaderData();
  const { eventId } = Route.useParams();
  const [event, setEvent] = useState<IntEvent>(initialEvent);
  const [formOpen, setFormOpen] = useState(false);

  // Client-side real-time sync with Supabase
  useEffect(() => {
    let isMounted = true;
    getEventById(eventId)
      .then((live) => {
        if (live && isMounted) {
          setEvent(live);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  const seatsLeft = Math.max(0, event.capacity - event.registered);
  const pct = Math.min(100, Math.round((event.registered / event.capacity) * 100)) || 0;
  const target = parseEventStart(event.date, event.startTime);
  const isUpcoming = event.status !== "completed" && event.status !== "cancelled";

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: event.title,
          text: event.summary ? event.summary.replace(/<[^>]*>?/gm, "") : "",
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Event link copied to clipboard!");
    }
  };

  return (
    <PortalShell>
      {/* Top Header Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {/* Banner Hero Image */}
        <div className="relative aspect-21/9 bg-navy overflow-hidden">
          {event.image ? (
            <img
              src={event.image}
              alt={event.title}
              className="h-full w-full object-cover opacity-90 transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-navy via-tech/20 to-navy grid place-items-center">
              <CalendarDays className="h-16 w-16 text-white/30" />
            </div>
          )}

          {/* Bottom Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute left-4 top-4 flex items-center gap-2 z-10">
            <StatusBadge status={event.status} />
            <span className="rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white">
              {event.code}
            </span>
          </div>

          <button
            onClick={handleShare}
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black/60 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>

          {/* Countdown Timer on Image Bottom Center */}
          {isUpcoming && (
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 px-4 sm:px-6 py-2 shadow-2xl">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-white/90 mb-1 flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-primary animate-pulse" /> Summit Starts In
              </span>
              <Countdown target={target} size="sm" />
            </div>
          )}
        </div>

        {/* Title & Key Quick Facts (Clean Hero Layout) */}
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              {event.category}
            </span>
            <span className="text-xs text-muted-foreground">· Organized by {event.organizer}</span>
          </div>

          <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {event.title}
          </h1>

          {/* Quick Fact Cards (Immediate Top Placement) */}
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Fact
              icon={CalendarDays}
              label="Date & Time"
              value={`${event.dateLabel || toDdMmYyyy(event.date)}`}
              subValue={`${event.startTime} – ${event.endTime}`}
            />
            <Fact
              icon={MapPin}
              label="Venue & Location"
              value={`${event.venue}`}
              subValue={`${event.city}`}
              link={event.mapUrl}
            />
            <Fact
              icon={Users}
              label="Capacity & Seats"
              value={`${event.registered} / ${event.capacity} Registered`}
              subValue={seatsLeft > 0 ? `${seatsLeft} seats remaining` : "Fully Booked"}
            />
          </dl>

          {/* Registration Capacity Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
              <span>Registration Status</span>
              <span>{pct}% filled</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct > 90 ? "bg-destructive" : pct > 60 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Call to Action Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={event.status === "completed" || event.status === "cancelled"}
              onClick={() => setFormOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-tech disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Register for this Summit
            </button>

            {event.mapUrl && (
              <a
                href={event.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <MapPin className="h-4 w-4 text-primary" />
                View on Google Maps <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            )}

            <Link
              to="/events"
              className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Back to all events
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Summary & Objectives (Moved down), Agenda, Speakers, Partners */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Summary & Objectives Panel (Rich Text Formatted) */}
          <Panel title="Summary & Objectives" icon={FileText}>
            {event.summary ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: event.summary }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Detailed event objectives will be published shortly.</p>
            )}

            {/* Additional description paragraphs if any */}
            {event.description && event.description.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                {event.description.map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </Panel>

          {/* Agenda & Schedule Timeline */}
          {event.agenda && event.agenda.length > 0 && (
            <Panel title="Agenda & Schedule Timeline" icon={Clock}>
              <ol className="space-y-4 divide-y divide-border">
                {event.agenda.map((item, idx) => (
                  <li key={idx} className="flex gap-4 pt-3.5 first:pt-0">
                    <span className="w-24 shrink-0 font-mono text-xs font-bold text-primary bg-primary/10 py-1 px-2.5 rounded-lg text-center h-fit">
                      {item.time}
                    </span>
                    <div className="flex-1">
                      <span className="block text-sm font-bold text-foreground">{item.title}</span>
                      {item.detail && (
                        <span className="mt-0.5 block text-xs text-muted-foreground leading-relaxed">
                          {item.detail}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {/* Keynote Speakers */}
          {event.speakers && event.speakers.length > 0 && (
            <Panel title="Featured Keynote Speakers" icon={Award}>
              <div className="grid gap-4 sm:grid-cols-2">
                {event.speakers.map((speaker, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-1.5">
                    <p className="text-sm font-bold text-foreground">{speaker.name}</p>
                    <p className="text-xs font-semibold text-primary">
                      {speaker.position} · {speaker.company}
                    </p>
                    {speaker.bio && (
                      <p className="text-xs leading-relaxed text-muted-foreground pt-1.5 border-t border-border/60">
                        {speaker.bio}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Right Sidebar: Partners & Exhibitors with Logos, Venue, Organizer */}
        <div className="space-y-6">
          {/* Partners & Exhibitors with Logos */}
          <Panel title="Partners & Exhibitors" icon={Building}>
            {event.partnerList && event.partnerList.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                {event.partnerList.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-3 text-center shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    {p.logo ? (
                      <img
                        src={p.logo}
                        alt={p.name}
                        className="h-10 w-full object-contain mb-1.5 bg-white p-1 rounded"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary font-bold text-xs mb-1.5">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-bold text-foreground line-clamp-1">{p.name}</span>
                    {p.category && (
                      <span className="text-[10px] text-muted-foreground line-clamp-1">{p.category}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : event.partners && event.partners.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {event.partners.map((partner) => (
                  <li
                    key={partner}
                    className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
                  >
                    {partner}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Partner lineup announcing soon.</p>
            )}
          </Panel>

          {/* Venue & Map Link Card */}
          <Panel title="Event Location & Venue" icon={MapPin}>
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground">{event.venue}</p>
              <p className="text-xs text-muted-foreground">{event.city}</p>
              {event.mapUrl && (
                <a
                  href={event.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5" /> Open on Google Maps <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Panel>

          {/* Organizer Info */}
          <Panel title="Organizer & Inquiries" icon={Globe}>
            <p className="text-sm font-bold text-foreground">{event.organizer}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Questions or corporate delegation requests? Contact{" "}
              <a
                href="mailto:events@integratedtechnics.com"
                className="font-medium text-primary hover:underline"
              >
                events@integratedtechnics.com
              </a>
            </p>
          </Panel>
        </div>
      </div>

      <RegistrationDialog event={event} open={formOpen} onClose={() => setFormOpen(false)} />
    </PortalShell>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  subValue,
  link,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  subValue?: string | undefined;
  link?: string | undefined;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
      <dt className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" /> {label}
        </span>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
          >
            Map <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </dt>
      <dd className="mt-1.5 text-sm font-bold text-foreground">{value}</dd>
      {subValue && <dd className="text-xs text-muted-foreground">{subValue}</dd>}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="mb-4 text-base font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
