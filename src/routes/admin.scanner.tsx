import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  ScanLine,
  XCircle,
  AlertTriangle,
  DoorOpen,
  Sparkles,
  Loader2,
} from "lucide-react";
import { verifyCheckIn } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/scanner")({
  head: () => ({
    meta: [
      { title: "QR Entrance Scanner — INT Events Admin" },
      {
        name: "description",
        content: "Scan attendee QR passes to check them in to Integrated Technics events with live Supabase verification.",
      },
      { property: "og:title", content: "QR Entrance Scanner — INT Events Admin" },
      { property: "og:description", content: "Live entrance check-in station for INT events." },
    ],
  }),
  component: Scanner,
});

type Result = {
  status: "valid" | "duplicate" | "invalid";
  message: string;
  token: string;
  time: string;
  attendee?: string;
  company?: string;
};

function Scanner() {
  const [token, setToken] = useState("");
  const [gate, setGate] = useState("Main Entrance Gate A");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<Result[]>([]);

  const handleValidate = async () => {
    const value = token.trim().toUpperCase();
    if (!value) return;

    setLoading(true);
    try {
      const res = await verifyCheckIn(value, gate);
      const newEntry: Result = {
        status: res.status,
        message: res.message || (res.success ? "Checked in successfully" : "Invalid pass"),
        token: value,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        attendee: res.attendee_name,
        company: res.company,
      };

      if (res.status === "valid") {
        toast.success(`Check-in Confirmed: ${res.attendee_name || "Attendee"}`, {
          description: `${res.company || "Company"} · Verified at ${gate}`,
        });
      } else if (res.status === "duplicate") {
        toast.warning("Duplicate Badge Scan", {
          description: res.message || "This badge has already been scanned.",
        });
      } else {
        toast.error("Invalid QR Token", {
          description: "Pass token was not recognized in the system database.",
        });
      }

      setLog((prev) => [newEntry, ...prev].slice(0, 10));
      setToken("");
    } catch {
      toast.error("Check-in verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Live QR Check-In Scanner
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fast badge verification connected directly to Supabase gate database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs">
            <DoorOpen className="h-4 w-4 text-primary" />
            <select
              value={gate}
              onChange={(e) => setGate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
            >
              <option>Main Entrance Gate A</option>
              <option>VIP & Speaker Entrance</option>
              <option>Partner & Exhibitor Gate</option>
              <option>Staff & Crew Gate</option>
            </select>
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner Input Station */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
            <div className="text-center p-4">
              <ScanLine className="mx-auto h-12 w-12 text-primary animate-pulse" />
              <p className="mt-3 text-sm font-bold text-foreground">Camera Scanning Target</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Align the badge QR code in front of the lens or use manual entry below
              </p>
            </div>
            <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Live Gate Mode
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Pass Token / QR Data String
            </label>
            <div className="flex gap-2">
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                placeholder="e.g. EVT-2026-000248-X7K92"
                aria-label="Pass token"
                className="h-11 flex-1 rounded-xl border border-input bg-background px-3 font-mono text-sm uppercase text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                disabled={loading || !token.trim()}
                onClick={handleValidate}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-tech disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Verify & Check In
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
            <span>Quick Test Tokens:</span>
            <button
              type="button"
              onClick={() => setToken("EVT-2026-000248-X7K92")}
              className="rounded-md bg-secondary px-2 py-1 font-mono text-[11px] font-semibold text-foreground hover:bg-muted"
            >
              EVT-2026-000248-X7K92
            </button>
            <button
              type="button"
              onClick={() => setToken("EVT-2026-000312-M4P18")}
              className="rounded-md bg-secondary px-2 py-1 font-mono text-[11px] font-semibold text-foreground hover:bg-muted"
            >
              EVT-2026-000312-M4P18
            </button>
          </div>
        </section>

        {/* Scan Results & Session Audit Log */}
        <section className="rounded-2xl border border-border bg-card shadow-card flex flex-col justify-between overflow-hidden">
          <div className="border-b border-border bg-muted/20 px-5 py-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Live Scan Session Log</h2>
            <span className="text-xs text-muted-foreground">{log.length} scans this session</span>
          </div>

          <div className="p-4 flex-1">
            {log.length === 0 ? (
              <div className="grid h-48 place-items-center text-center text-xs text-muted-foreground">
                No badge scans recorded in this session. Ready for scanning.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {log.map((entry, index) => (
                  <li key={entry.token + index} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    {entry.status === "valid" ? (
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : entry.status === "duplicate" ? (
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/10 text-destructive shrink-0">
                        <XCircle className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-foreground">
                          {entry.attendee || entry.message}
                        </p>
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          {entry.time}
                        </span>
                      </div>
                      {entry.company && (
                        <p className="truncate text-[11px] text-muted-foreground">{entry.company}</p>
                      )}
                      <p className="font-mono text-[10px] text-muted-foreground">{entry.token}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
