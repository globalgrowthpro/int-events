import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BellRing, CheckCircle2, Info } from "lucide-react";
import { PortalShell, PageHeading } from "@/components/int/portal-shell";
import { notifications } from "@/lib/int-data";

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

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle } as const;

function Notifications() {
  return (
    <PortalShell>
      <PageHeading title="Notifications" subtitle="Reminders and updates about your events." />
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {notifications.map((n) => {
          const Icon = icons[n.tone as keyof typeof icons] ?? BellRing;
          const tone =
            n.tone === "success"
              ? "text-success"
              : n.tone === "warning"
                ? "text-warning-foreground"
                : "text-primary";
          return (
            <li key={n.title + n.time} className="flex items-start gap-4 p-5">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
              </div>
              <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                {n.time}
              </span>
            </li>
          );
        })}
      </ul>
    </PortalShell>
  );
}
