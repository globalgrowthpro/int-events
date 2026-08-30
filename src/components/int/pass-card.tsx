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
        src="/2.png"
        alt="ITS 2026 Pass Card Template"
        className="w-full h-auto object-contain block pointer-events-none"
      />

      {/* Dynamic Overlay Fields (Centered in the open middle area of 2.png, shifted slightly higher) */}
      <div className="absolute inset-0 flex flex-col justify-between px-4 text-center pointer-events-none">
        {/* Top Space preserved for pre-printed 'INTEGRATED TECHNICS SHOWCASE 2026' title */}
        <div className="pt-[15%] pointer-events-none" />

        {/* Center Region: Dynamic Attendee Identity Information */}
        <div className="my-auto py-1 space-y-1 z-10">
          {/* Attendee Name (Larger & Prominent) */}
          <h2 className="text-xl sm:text-2xl font-black text-[#111] tracking-tight uppercase leading-snug drop-shadow-xs px-1 truncate">
            {attendeeName}
          </h2>

          {/* Position */}
          <p className="text-xs sm:text-sm font-semibold text-[#444] capitalize leading-tight px-1 truncate">
            {position}
          </p>

          {/* Organization */}
          <p className="text-xs sm:text-sm font-black text-[#f37021] uppercase tracking-wider leading-tight px-1 pt-0.5 truncate">
            {organization}
          </p>
        </div>

        {/* Bottom Region: Space preserved for the pre-printed iTS logo & orange footer */}
        <div className="pb-[38%] pointer-events-none" />
      </div>
    </div>
  );
}
