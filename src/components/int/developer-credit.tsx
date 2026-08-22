import { Code2, ExternalLink } from "lucide-react";

export function DeveloperCredit({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[11px] text-foreground ${className}`}
    >
      <div className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Code2 className="h-3 w-3" />
      </div>
      <div className="leading-tight">
        <span className="text-muted-foreground">Developer: </span>
        <a
          href="https://odooteams.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5 transition-colors"
        >
          Mr. Hafez Rahim <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>
    </div>
  );
}
