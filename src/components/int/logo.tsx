import { cn } from "@/lib/utils";
import logoAsset from "@/assets/int-logo.png.asset.json";

export function IntLogo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <img
        src={logoAsset.url}
        alt="Integrated Technics"
        width={40}
        height={40}
        className="h-9 w-9 rounded-md bg-card object-contain p-0.5"
      />
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
