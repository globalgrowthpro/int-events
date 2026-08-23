import { Link } from "@tanstack/react-router";
import { BellOff, CheckCheck, Info, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, toneClasses, type NotificationTone } from "@/lib/notifications";
import { toneIcons } from "./notification-bell";

export function NotificationsList() {
  const { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll, restore } =
    useNotifications();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={clearAll}>
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={restore}>
            <RotateCcw className="h-3.5 w-3.5" /> Restore
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <BellOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">No notifications</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New alerts will appear here as activity happens.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {notifications.map((n) => {
            const Icon = (n.tone && toneIcons[n.tone as NotificationTone]) ? toneIcons[n.tone as NotificationTone] : Info;
            const toneClass = (n.tone && toneClasses[n.tone as NotificationTone]) ? toneClasses[n.tone as NotificationTone] : "text-primary";
            return (
              <li
                key={n.id}
                className={`group flex items-start gap-4 p-5 transition-colors ${
                  n.read ? "" : "bg-primary/5"
                }`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${toneClass}`} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {n.title}
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="text-xs text-muted-foreground">{n.time}</span>
                    {n.link && (
                      <Link
                        to={n.link}
                        onClick={() => markRead(n.id)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        View details
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
                <button
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(n.id)}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
