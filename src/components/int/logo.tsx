import { cn } from "@/lib/utils";

export function IntLogo({
  className,
  tone = "dark",
  size = "md",
  subtitle,
  badge,
  compactOnMobile = false,
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
      img: "h-7 w-7 sm:h-8 sm:w-8 p-0.5 rounded-md",
      title: "text-xs sm:text-sm font-bold",
      sub: "text-[8px] sm:text-[9px] tracking-[0.12em] font-medium",
      gap: "gap-2",
    },
    md: {
      img: "h-9 w-9 sm:h-10 sm:w-10 p-1 rounded-xl shadow-2xs border border-border/40",
      title: "text-sm sm:text-base font-extrabold tracking-tight",
      sub: "text-[9px] sm:text-[9.5px] tracking-[0.16em] font-semibold",
      gap: "gap-2.5",
    },
    lg: {
      img: "h-12 w-12 sm:h-14 sm:w-14 p-1.5 rounded-2xl shadow-md border border-border/40",
      title: "text-xl sm:text-2xl font-black",
      sub: "text-xs sm:text-sm tracking-[0.2em] font-bold",
      gap: "gap-3.5",
    },
    xl: {
      img: "h-16 w-16 sm:h-20 sm:w-20 p-2 rounded-3xl shadow-xl border border-border/40",
      title: "text-2xl sm:text-3xl md:text-4xl font-black",
      sub: "text-xs sm:text-sm md:text-base tracking-[0.22em] font-bold",
      gap: "gap-4",
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
            tone === "light" ? "text-sky-400 font-semibold" : "text-muted-foreground"
          )}
        >
          {displaySubtitle}
        </span>
      </span>
    </span>
  );
}
