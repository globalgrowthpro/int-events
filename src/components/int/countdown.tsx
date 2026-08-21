import { useEffect, useState } from "react";

function diffParts(target: number) {
  const total = Math.max(0, target - Date.now());
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total % 86_400_000) / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1_000);
  return { total, days, hours, minutes, seconds };
}

/**
 * Parses an INT event date ("2026-09-15") and start time ("09:00 AM")
 * into a timestamp. Falls back to date-only at 09:00 local if parsing fails.
 */
export function parseEventStart(date: string, startTime?: string): number {
  const base = new Date(`${date}T00:00:00`);
  if (!startTime) return base.setHours(9, 0, 0, 0);
  const m = startTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return base.setHours(9, 0, 0, 0);
  let h = parseInt(m[1], 10) % 12;
  if (/PM/i.test(m[3])) h += 12;
  base.setHours(h, parseInt(m[2], 10), 0, 0);
  return base.getTime();
}

export function Countdown({
  target,
  variant = "card",
}: {
  target: number;
  variant?: "card" | "inline";
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now >= target) {
    return (
      <div
        className={
          variant === "card"
            ? "rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-center text-sm font-semibold text-success"
            : "text-xs font-semibold text-success"
        }
      >
        This event has started
      </div>
    );
  }

  const { days, hours, minutes, seconds } = diffParts(target);
  const units = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ];

  if (variant === "inline") {
    return (
      <span className="font-mono text-xs font-semibold text-primary">
        {days}d {hours}h {minutes}m {seconds}s
      </span>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {units.map((u) => (
        <div
          key={u.label}
          className="rounded-lg border border-border bg-secondary px-2 py-3 text-center"
        >
          <div className="font-mono text-2xl font-bold tabular-nums text-primary">
            {String(u.value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {u.label}
          </div>
        </div>
      ))}
    </div>
  );
}
