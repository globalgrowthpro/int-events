import { Link } from "@tanstack/react-router";
import { AlertTriangle, Bell, BellRing, CheckCheck, CheckCircle2, Info, MessageSquare, X } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, toneClasses, type NotificationTone } from "@/lib/notifications";

export const toneIcons: Record<NotificationTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: BellRing,
  chat: MessageSquare,
};

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, dismiss, audience } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const allHref = audience === "admin" ? "/admin/notifications" : "/notifications";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          className="relative grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:h-9 sm:w-9"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No notifications right now.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = (n.tone && toneIcons[n.tone as NotificationTone]) ? toneIcons[n.tone as NotificationTone] : Info;
                const toneClass = (n.tone && toneClasses[n.tone as NotificationTone]) ? toneClasses[n.tone as NotificationTone] : "text-primary";
                return (
                  <li
                    key={n.id}
                    className={`group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50 ${
                      n.read ? "" : "bg-primary/5"
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toneClass}`} />
                    <Link
                      to={n.link ?? allHref}
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                      }}
                      className="min-w-0 flex-1"
                    >
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        {n.title}
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{n.time}</p>
                    </Link>
                    <button
                      aria-label="Dismiss notification"
                      onClick={() => dismiss(n.id)}
                      className="mt-0.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t border-border p-2">
          <Link
            to={allHref}
            onClick={() => setOpen(false)}
            className="block rounded-md py-2 text-center text-xs font-semibold text-primary hover:bg-accent"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
