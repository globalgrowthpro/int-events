import { useState, useMemo } from "react";
import { type AgendaItem } from "@/lib/int-data";
import { 
  Clock, 
  MapPin, 
  User, 
  Utensils, 
  Coffee, 
  Sparkles, 
  Users, 
  Presentation,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgendaTimelineProps {
  agenda: AgendaItem[];
  startDate?: string | undefined; // event.date
  endDate?: string | undefined;   // event.endDate
  agendaUrl?: string | undefined; // event.agendaUrl
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  keynote: { icon: Award, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  session: { icon: Presentation, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200" },
  workshop: { icon: Layers, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  break: { icon: Coffee, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-200" },
  dining: { icon: Utensils, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  networking: { icon: Users, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  registration: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  general: { icon: Clock, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" }
};

// Fallback logic to determine category if type isn't set but title implies it
function inferType(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("keynote") || lower.includes("showcase")) return "keynote";
  if (lower.includes("lunch") || lower.includes("dinner") || lower.includes("breakfast") || lower.includes("dining")) return "dining";
  if (lower.includes("break")) return "break";
  if (lower.includes("networking") || lower.includes("engagement") || lower.includes("meet")) return "networking";
  if (lower.includes("arrival") || lower.includes("check-in") || lower.includes("registration")) return "registration";
  if (lower.includes("workshop") || lower.includes("demo")) return "workshop";
  return "session"; // default
}

export function AgendaTimeline({ agenda, startDate, endDate, agendaUrl }: AgendaTimelineProps) {
  // Extract unique days
  const uniqueDays = useMemo(() => {
    const days = new Set<string>();
    agenda.forEach(item => {
      if (item.day) {
        days.add(item.day.toString());
      }
    });
    
    // If no days explicitly defined but we have start/end dates, 
    // or we just default to "Day 1" if empty.
    const sorted = Array.from(days).sort();
    if (sorted.length === 0) return ["All Days"];
    return [...sorted, "All Days"];
  }, [agenda]);

  const [activeDay, setActiveDay] = useState<string>(uniqueDays[0] || "All Days");

  const filteredAgenda = useMemo(() => {
    if (activeDay === "All Days") return agenda;
    return agenda.filter(item => item.day?.toString() === activeDay || (!item.day && activeDay === "Day 1"));
  }, [agenda, activeDay]);

  if (!agenda || agenda.length === 0) return null;

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Header Controls: Day Selector & Download Button */}
      {(uniqueDays.length > 1 || agendaUrl) && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          {/* Day Selector Tabs */}
          {uniqueDays.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {uniqueDays.map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 border",
                    activeDay === day 
                      ? "bg-primary text-primary-foreground border-primary shadow-md" 
                      : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          ) : (
            <div /> // Empty div for flex space-between alignment if only download button exists
          )}

          {/* Download Agenda Button */}
          {agendaUrl && (
            <a
              href={agendaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-all duration-200 hover:bg-primary/20 hover:border-primary/50 shrink-0"
            >
              <Download className="w-4 h-4" />
              Download Agenda
            </a>
          )}
        </div>
      )}

      {/* Timeline Container */}
      <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        {filteredAgenda.map((item, idx) => {
          const itemTypeKey = item.type || inferType(item.title);
          const config = TYPE_CONFIG[itemTypeKey] || TYPE_CONFIG["general"]!;
          const Icon = config.icon;

          return (
            <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              
              {/* Timeline Icon Marker */}
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10 transition-transform duration-300 group-hover:scale-110",
                config.bg, config.color, config.border
              )}>
                <Icon className="w-4 h-4" />
              </div>
              
              {/* Card Container */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 hover:border-primary/40 group-hover:-translate-y-1">
                
                {/* Header Row: Time & Type Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5" />
                    {item.time}
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                    config.bg, config.color, config.border
                  )}>
                    {itemTypeKey}
                  </div>
                </div>

                {/* Title & Detail */}
                <h4 className="text-base sm:text-lg font-bold text-foreground mb-1.5 leading-tight">
                  {item.title}
                </h4>
                
                {item.detail && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3 group-hover:line-clamp-none transition-all">
                    {item.detail}
                  </p>
                )}

                {/* Metadata Row: Location, Speaker, Day */}
                {(item.location || item.speaker || (item.day && activeDay === "All Days")) && (
                  <div className="flex flex-wrap gap-3 pt-3 border-t border-border/60">
                    {item.location && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-primary/70" />
                        {item.location}
                      </div>
                    )}
                    {item.speaker && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <User className="w-3.5 h-3.5 text-primary/70" />
                        {item.speaker}
                      </div>
                    )}
                    {item.day && activeDay === "All Days" && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 text-primary/70" />
                        {item.day}
                      </div>
                    )}
                  </div>
                )}
                
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
