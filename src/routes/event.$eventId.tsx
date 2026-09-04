import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { SiteShell } from "@/components/int/site-shell";
import { EventDetailContent } from "@/components/int/event-detail";
import { getEventById } from "@/lib/api";

export const Route = createFileRoute("/event/$eventId")({
  loader: async ({ params }) => {
    let realEvent;
    try {
      realEvent = await getEventById(params.eventId);
    } catch {}

    if (realEvent) {
      if (params.eventId !== realEvent.id) {
        throw redirect({
          to: "/event/$eventId",
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
