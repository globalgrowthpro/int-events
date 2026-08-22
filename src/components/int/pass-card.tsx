import { QrCode } from "./qr-code";
import { CheckCircle2 } from "lucide-react";
import type { IntEvent, Registration } from "@/lib/int-data";

function partnerInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function PassCard({
  registration,
  event,
  compact = false,
}: {
  registration: Registration;
  event: IntEvent;
  compact?: boolean;
}) {
  const partner = event.partners[0];

  const qrPayload = JSON.stringify({
    t: registration.token,
    a: registration.attendee,
    e: event.title,
    d: event.dateLabel,
    tm: event.startTime,
    c: registration.company,
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
      <div className="bg-navy px-5 py-4 text-navy-foreground">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Integrated Technics"
              className="h-9 w-9 rounded-md bg-white object-contain p-0.5"
            />
            <span className="leading-none">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-navy-foreground/60">
                Integrated Technics
              </span>
              <span className="mt-1 block text-sm font-semibold uppercase tracking-[0.14em]">
                Event Attendance Pass
              </span>
            </span>
          </div>
          {partner && (
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15 text-[11px] font-bold tracking-wide text-navy-foreground ring-1 ring-white/20">
                {partnerInitials(partner)}
              </span>
              <span className="max-w-[88px] text-[9px] font-medium uppercase tracking-[0.12em] text-navy-foreground/70">
                {partner}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-base font-semibold text-foreground">{event.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {event.dateLabel} · {event.city}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-4 border-y border-border py-4 text-sm">
          <Field label="Attendee" value={registration.attendee} />
          <Field label="Company" value={registration.company} />
          <Field label="Role" value={registration.role} />
          <Field label="Registration ID" value={registration.id} />
        </dl>

        {/* Structured QR Payload containing Account Name, Event Name, Date and Time */}
        <div className="mt-5 flex flex-col items-center">
          <div className="rounded-lg border border-border bg-card p-3 shadow-inner">
            <QrCode value={qrPayload} size={compact ? 132 : 184} />
          </div>
          <p className="mt-3 text-xs font-semibold text-muted-foreground">Scan at gate for instant check-in</p>
          <p className="mt-1 font-mono text-[11px] tracking-wider text-muted-foreground">
            {registration.token}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {registration.state === "checked-in"
              ? `Checked in · ${registration.checkInTime || "Verified"}`
              : "Registered"}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium capitalize text-foreground">{value}</dd>
    </div>
  );
}