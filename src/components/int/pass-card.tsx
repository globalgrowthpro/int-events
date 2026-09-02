import type { IntEvent, Registration } from "@/lib/int-data";

/**
 * Official ITS 2026 Badge Pass Card using 2.png branded template.
 * Displays:
 * 1. Event Name
 * 2. Attendee Name
 * 3. Position (Job Title)
 * 4. Organization (Company)
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
  const eventName = event?.title || "Integrated Technics Showcase 2026";
  const attendeeName = registration?.attendee || "Attendee Name";
  const position = registration?.jobTitle || "Security & Technology Leader";
  const organization = registration?.company || "Integrated Technics";

  return (
    <div className={`relative w-full mx-auto overflow-hidden rounded-2xl border border-border/40 shadow-xl bg-white select-none ${compact ? "max-w-[260px]" : "max-w-[290px] sm:max-w-[310px]"}`}>
      {/* Background Graphic Template (2.png) */}
      <img
        src="/2.png?v=2"
        alt="ITS Pass Card Template"
        className="w-full h-auto object-contain block pointer-events-none"
      />

      {/* 1. Top Dynamic Event Name (Transparent overlay on natural card background) */}
      <div className="absolute top-[3.5%] left-[4%] right-[4%] h-[18%] flex items-center justify-center text-center px-3 z-10 pointer-events-none">
        <h1 className="text-sm sm:text-base font-black text-[#111111] uppercase tracking-tight leading-tight line-clamp-3">
          {eventName}
        </h1>
      </div>

      {/* 2. Dynamic Attendee Identity Information */}
      <div className="absolute top-[32%] bottom-[28%] left-[4%] right-[4%] flex flex-col items-center justify-center text-center z-10 pointer-events-none space-y-1">
        {/* Attendee Name */}
        <h2 className="text-lg sm:text-xl font-black text-[#111] tracking-tight uppercase leading-snug drop-shadow-xs px-1 truncate w-full">
          {attendeeName}
        </h2>

        {/* Position (Job Title) */}
        <p className="text-sm sm:text-base font-bold text-[#444] capitalize leading-tight px-1 truncate w-full">
          {position}
        </p>

        {/* Organization */}
        <p className="text-sm sm:text-base font-black text-[#f37021] uppercase tracking-wider leading-tight px-1 pt-0.5 truncate w-full">
          {organization}
        </p>
      </div>

      {/* 3. Bottom Dynamic Event Footer Band (Transparent overlay on natural card footer) */}
      <div className="absolute bottom-0 left-0 right-0 h-[16%] flex flex-col items-center justify-center text-center px-3 z-10 pointer-events-none">
        <p className="text-[11px] sm:text-[12px] font-bold italic text-white leading-tight line-clamp-1">
          {eventName}
        </p>
        <p className="text-[10px] sm:text-[11px] font-semibold italic text-white/95 leading-tight">
          Full Access Ticket
        </p>
      </div>
    </div>
  );
}
