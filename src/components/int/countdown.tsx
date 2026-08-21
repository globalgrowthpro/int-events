import { useEffect, useState } from "react";

export function diffParts(target: number, now: number) {
  const total = Math.max(0, target - now);
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
  const st = startTime ?? "";
  const m = st.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i) as
    | [string, string, string, string]
    | null;
  if (!m) return base.setHours(9, 0, 0, 0);
  let h = parseInt(m[1], 10) % 12;
  if (/PM/i.test(m[3])) h += 12;
  base.setHours(h, parseInt(m[2], 10), 0, 0);
  return base.getTime();
}

export type CountdownSize = "xs" | "sm" | "md";

export const countdownSizing: Record<CountdownSize, { box: string; digit: string; label: string; gap: string }> = {
  xs: {
    box: "h-[22px] min-w-[20px] px-0.5 rounded-[3px] sm:h-7 sm:min-w-[25px] sm:px-1 sm:rounded",
    digit: "text-[10px] sm:text-xs",
    label: "mt-0.5 text-[6px] sm:text-[7px]",
    gap: "gap-0.5 sm:gap-1",
  },
  sm: {
    box: "h-12 rounded-md",
    digit: "text-xl",
    label: "mt-1.5 text-[9px]",
    gap: "gap-1.5",
  },
  md: {
    box: "h-[68px] rounded-lg",
    digit: "text-3xl",
    label: "mt-2 text-[10px]",
    gap: "gap-2.5",
  },
};

export function FlipUnit({ value, label, size }: { value: string; label: string; size: CountdownSize }) {
  const s = countdownSizing[size];
  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative flex w-full items-center justify-center overflow-hidden border border-black/60 bg-gradient-to-b from-[#3c3c3c] to-[#1c1c1c] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_3px_rgba(0,0,0,0.35)] ${s.box}`}
      >
        <span
          className={`font-mono font-bold tabular-nums leading-none tracking-tight text-[#e8e8e8] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] ${s.digit}`}
        >
          {value}
        </span>
      </div>
      <span
        className={`font-semibold uppercase tracking-[0.06em] sm:tracking-[0.14em] text-warning ${s.label}`}
      >
        {label}
      </span>
    </div>
  );
}

export function Countdown({
  target,
  variant = "card",
  size = "md",
}: {
  target: number;
  variant?: "card" | "inline";
  size?: CountdownSize;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const s = countdownSizing[size];
  const units: Array<[string, string]> =
    now === null
      ? [
          ["--", "Days"],
          ["--", "Hours"],
          ["--", "Minutes"],
          ["--", "Seconds"],
        ]
      : (() => {
          const d = diffParts(target, now);
          return [
            [String(d.days).padStart(2, "0"), "Days"],
            [String(d.hours).padStart(2, "0"), "Hours"],
            [String(d.minutes).padStart(2, "0"), "Minutes"],
            [String(d.seconds).padStart(2, "0"), "Seconds"],
          ];
        })();

  if (now !== null && now >= target) {
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

  if (variant === "inline") {
    const [d, h, m, sec] = units;
    return (
      <span className="font-mono text-xs font-semibold text-primary">
        {d![0]}d {h![0]}h {m![0]}m {sec![0]}s
      </span>
    );
  }

  return (
    <div className={`grid grid-cols-4 rounded-xl bg-[#141414] p-2.5 ${s.gap}`}>
      {units.map(([value, label]) => (
        <FlipUnit key={label} value={value} label={label} size={size} />
      ))}
    </div>
  );
}
