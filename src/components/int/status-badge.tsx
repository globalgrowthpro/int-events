import { cn } from "@/lib/utils";
import { statusLabels, type EventStatus } from "@/lib/int-data";

const dot: Record<EventStatus, string> = {
  "registration-open": "bg-success",
  upcoming: "bg-tech",
  "almost-full": "bg-warning",
  "registration-closed": "bg-destructive",
  completed: "bg-muted-foreground",
  cancelled: "bg-destructive",
};

export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[status])} />
      {statusLabels[status]}
    </span>
  );
}

export function StateBadge({ state }: { state: string }) {
  const tone =
    state === "checked-in" || state === "approved"
      ? "bg-success/10 text-success border-success/20"
      : state === "cancelled" || state === "rejected"
        ? "bg-destructive/10 text-destructive border-destructive/20"
        : state === "pending"
          ? "bg-warning/15 text-warning-foreground border-warning/30"
          : "bg-primary/10 text-primary border-primary/20";
  const label = state.replace("-", " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize",
        tone,
      )}
    >
      {label}
    </span>
  );
}