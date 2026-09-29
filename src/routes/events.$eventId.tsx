import { createFileRoute, notFound, redirect, Outlet, useChildMatches } from "@tanstack/react-router";
import { PortalShell } from "@/components/int/portal-shell";
import { EventDetailContent } from "@/components/int/event-detail";
import { getEventById } from "@/lib/api";

export const Route = createFileRoute("/events/$eventId")({
  loader: async ({ params, location }) => {
    let realEvent;
    try {
      realEvent = await getEventById(params.eventId);
    } catch {}

    if (realEvent) {
      const isDirectEventPath =
        location.pathname.replace(/\/+$/, "") === `/events/${params.eventId}`;
      if (isDirectEventPath && params.eventId !== realEvent.id) {
        throw redirect({
          to: "/events/$eventId",
          params: { eventId: realEvent.id },
          replace: true,
        });
      }
      return { event: realEvent };
    }

    throw notFound();
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
  const childMatches = useChildMatches();
  if (childMatches && childMatches.length > 0) {
    return <Outlet />;
  }

  const { event } = Route.useLoaderData();
  const { eventId } = Route.useParams();

  return (
    <PortalShell allowGuest>
      <EventDetailContent event={event} eventId={eventId} backTo="/events" backLabel="Back to all events" />
    </PortalShell>
  );
}
