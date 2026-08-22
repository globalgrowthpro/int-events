import { createFileRoute } from "@tanstack/react-router";
import { PortalShell, PageHeading } from "@/components/int/portal-shell";
import { NotificationsList } from "@/components/int/notifications-list";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — INT Events" },
      {
        name: "description",
        content: "Event reminders, pass updates and announcements from Integrated Technics.",
      },
      { property: "og:title", content: "Notifications — INT Events" },
      { property: "og:description", content: "Stay up to date with your INT event activity." },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  return (
    <PortalShell>
      <PageHeading title="Notifications" subtitle="Reminders and updates about your events." />
      <NotificationsList />
    </PortalShell>
  );
}
