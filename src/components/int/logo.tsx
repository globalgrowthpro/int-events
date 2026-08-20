import { cn } from "@/lib/utils";

export function IntLogo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
        <span className="text-[13px] font-bold tracking-tight">INT</span>
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block text-[15px] font-semibold tracking-tight",
            tone === "light" ? "text-navy-foreground" : "text-foreground",
          )}
        >
          INT Events
        </span>
        <span
          className={cn(
            "mt-1 block text-[10px] font-medium uppercase tracking-[0.18em]",
            tone === "light" ? "text-navy-foreground/60" : "text-muted-foreground",
          )}
        >
          Integrated Technics
        </span>
      </span>
    </span>
  );
}