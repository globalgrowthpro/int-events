import { createFileRoute } from "@tanstack/react-router";
import { NotificationsList } from "@/components/int/notifications-list";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Admin Notifications — INT Events" },
      {
        name: "description",
        content: "Operational alerts on registrations, capacity, vendors and check-ins.",
      },
      { property: "og:title", content: "Admin Notifications — INT Events" },
      { property: "og:description", content: "Operational alerts for INT event operations." },
    ],
  }),
  component: AdminNotifications,
});

function AdminNotifications() {
  return (
    <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Operational alerts across registrations, capacity, vendors and attendance.
          </p>
        </header>
        <NotificationsList />
    </div>
  );
}
