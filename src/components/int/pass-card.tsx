import { QrCode } from "./qr-code";
import { CheckCircle2 } from "lucide-react";
import type { IntEvent, Registration } from "@/lib/int-data";

/**
 * Official ITS 2026 ticket-style attendance pass.
 * White card with a dotted brand pattern, big event title, the ITS
 * showcase logo, the QR payload and an orange access band at the bottom.
 */
export function PassCard({
  registration,
  event,
  compact = false,
}: {
  registration: Registration;
  event: IntEvent;
  compact?: boolean;
}) {
  const qrPayload = JSON.stringify({
    t: registration.token,
    a: registration.attendee,
    e: event.title,
    d: event.dateLabel,
    tm: event.startTime,
    c: registration.company,
  });

  return (
    <div className="overflow-hidden rounded-xl border-2 border-muted-foreground/25 bg-white shadow-elevated">
      <div className="relative px-5 pb-6 pt-7 text-center sm:px-7">
        {/* Brand dot pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(243,112,33,.16) 0 9px, transparent 10px), radial-gradient(circle at 75% 75%, rgba(100,100,100,.13) 0 9px, transparent 10px)",
            backgroundSize: "72px 72px",
          }}
        />

        <div className="relative">
          <h3 className="text-xl font-black uppercase leading-tight tracking-tight text-[#111] sm:text-2xl">
            {event.title}
          </h3>

          <div className="mt-5 flex justify-center">
            <img
              src="/its-logo.png"
              alt="Integrated Technics Showcase"
              className={compact ? "h-14 object-contain" : "h-20 object-contain"}
            />
          </div>

          <div className="mx-auto mt-6 w-fit rounded-xl border border-muted-foreground/20 bg-white p-3 shadow-sm">
            <QrCode value={qrPayload} size={compact ? 128 : 172} />
          </div>
          <p className="mt-2 font-mono text-[11px] tracking-wider text-muted-foreground">
            {registration.token}
          </p>

          <dl className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-4 border-t border-muted-foreground/20 pt-4 text-left text-sm">
            <Field label="Attendee" value={registration.attendee} />
            <Field label="Company" value={registration.company} />
            <Field label="Role" value={registration.role} />
            <Field label="Registration ID" value={registration.id} />
            <Field label="Date" value={event.dateLabel} />
            <Field label="Venue" value={event.city} />
          </dl>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {registration.state === "checked-in"
              ? `Checked in · ${registration.checkInTime || "Verified"}`
              : "Approved · Registered"}
          </div>
        </div>
      </div>

      <div className="bg-[#f37021] px-5 py-4 text-center italic text-white">
        <p className="text-sm font-semibold leading-snug sm:text-base">
          Integrated Technics Showcase Event
          <br />
          ITS 2026
          <br />
          Full Access Ticket
        </p>
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
      <dd className="mt-1 font-medium capitalize text-[#111]">{value}</dd>
    </div>
  );
}
