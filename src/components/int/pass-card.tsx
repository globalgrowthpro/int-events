import { QrCode } from "./qr-code";
import { CheckCircle2 } from "lucide-react";
import type { IntEvent, Registration } from "@/lib/int-data";

export function PassCard({
  registration,
  event,
  compact = false,
}: {
  registration: Registration;
  event: IntEvent;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
      <div className="bg-navy px-5 py-4 text-navy-foreground">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-navy-foreground/60">
          Integrated Technics
        </p>
        <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em]">
          Event Attendance Pass
        </p>
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

        <div className="mt-5 flex flex-col items-center">
          <div className="rounded-lg border border-border bg-card p-3">
            <QrCode value={registration.token} size={compact ? 132 : 184} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Scan this QR code at event entrance</p>
          <p className="mt-1 font-mono text-[11px] tracking-wider text-muted-foreground">
            {registration.token}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {registration.state === "checked-in"
              ? `Checked in · ${registration.checkInTime}`
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