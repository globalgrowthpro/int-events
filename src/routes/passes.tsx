import { createFileRoute } from "@tanstack/react-router";
import { PortalShell, PageHeading } from "@/components/int/portal-shell";
import { PassCard } from "@/components/int/pass-card";
import { getEvent, myRegistrations } from "@/lib/int-data";

export const Route = createFileRoute("/passes")({
  head: () => ({
    meta: [
      { title: "My Passes — INT Events" },
      {
        name: "description",
        content: "Your digital QR attendance passes for Integrated Technics events.",
      },
      { property: "og:title", content: "My Passes — INT Events" },
      { property: "og:description", content: "Show your QR pass at the entrance to check in." },
    ],
  }),
  component: Passes,
});

function Passes() {
  return (
    <PortalShell>
      <PageHeading
        title="My Passes"
        subtitle="Present the QR code at the entrance — scanning marks your attendance instantly."
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {myRegistrations.map((reg) => {
          const event = getEvent(reg.eventId);
          if (!event) return null;
          return <PassCard key={reg.id} registration={reg} event={event} compact />;
        })}
      </div>
    </PortalShell>
  );
}
