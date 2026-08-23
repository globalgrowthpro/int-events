import { cn } from "@/lib/utils";

export function IntLogo({
  className,
  tone = "dark",
  size = "md",
  subtitle,
  badge,
  compactOnMobile = true,
}: {
  className?: string;
  tone?: "dark" | "light";
  size?: "sm" | "md" | "lg" | "xl";
  subtitle?: string;
  badge?: string;
  compactOnMobile?: boolean;
}) {
  const sizeStyles = {
    sm: {
      img: "h-9 w-9 sm:h-10 sm:w-10 p-0.5 rounded-xl shadow-2xs border border-border/40",
      title: "text-sm sm:text-base font-extrabold tracking-tight",
      sub: "text-[9px] sm:text-[10px] tracking-[0.14em] font-semibold",
      gap: "gap-2.5",
    },
    md: {
      img: "h-11 w-11 sm:h-12 sm:w-12 p-1 rounded-xl shadow-xs border border-border/40",
      title: "text-base sm:text-lg font-extrabold tracking-tight",
      sub: "text-[10px] sm:text-[11px] tracking-[0.16em] font-bold",
      gap: "gap-3",
    },
    lg: {
      img: "h-14 w-14 sm:h-16 sm:w-16 p-1.5 rounded-2xl shadow-md border border-border/40",
      title: "text-2xl sm:text-3xl font-black tracking-tight",
      sub: "text-xs sm:text-sm tracking-[0.2em] font-bold",
      gap: "gap-3.5",
    },
    xl: {
      img: "h-20 w-20 sm:h-24 sm:w-24 p-2 rounded-3xl shadow-xl border border-border/40",
      title: "text-3xl sm:text-4xl md:text-5xl font-black tracking-tight",
      sub: "text-sm sm:text-base tracking-[0.22em] font-bold",
      gap: "gap-4.5",
    },
  }[size];

  const displaySubtitle = subtitle || "Integrated Technics";

  return (
    <span className={cn("flex shrink-0 items-center", sizeStyles.gap, className)}>
      <img
        src="/logo.png"
        alt="Integrated Technics"
        className={cn(
          "shrink-0 bg-white object-contain border border-white/30 transition-transform duration-200 hover:scale-105",
          sizeStyles.img
        )}
      />
      <span className="leading-tight">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "block tracking-tight whitespace-nowrap",
              sizeStyles.title,
              tone === "light" ? "text-white" : "text-foreground"
            )}
          >
            INT Events
          </span>
          {badge && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                tone === "light"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                  : "bg-primary/10 text-primary border border-primary/20"
              )}
            >
              {badge}
            </span>
          )}
        </span>
        <span
          className={cn(
            "uppercase whitespace-nowrap block",
            sizeStyles.sub,
            compactOnMobile ? "hidden sm:block" : "block",
            tone === "light" ? "text-sky-300 font-semibold" : "text-primary font-bold"
          )}
        >
          {displaySubtitle}
        </span>
      </span>
    </span>
  );
}
