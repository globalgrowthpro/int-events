import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteShell } from "@/components/int/site-shell";
import { EventDetailContent } from "@/components/int/event-detail";
import { getEvent } from "@/lib/int-data";
import { getEventById } from "@/lib/api";

export const Route = createFileRoute("/event/$eventId")({
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
  component: PublicEventDetail,
});

function PublicEventDetail() {
  const { event } = Route.useLoaderData();
  const { eventId } = Route.useParams();

  return (
    <SiteShell>
      <EventDetailContent event={event} eventId={eventId} backTo="/" backLabel="Back to home" />
    </SiteShell>
  );
}
