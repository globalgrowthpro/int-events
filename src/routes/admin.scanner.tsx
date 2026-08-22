import { useState, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  ScanLine,
  XCircle,
  AlertTriangle,
  DoorOpen,
  Sparkles,
  Loader2,
  Camera,
  CameraOff,
  Calendar,
  Clock,
  Building,
  User,
  ShieldCheck,
  Ban,
} from "lucide-react";
import { verifyCheckIn } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/scanner")({
  head: () => ({
    meta: [
      { title: "QR Entrance Scanner & Gate Control — INT Events Admin" },
      {
        name: "description",
        content: "Live badge QR scanner with duplicate prevention, attendee validation, and gate audit logging.",
      },
      { property: "og:title", content: "QR Entrance Scanner — INT Events Admin" },
      { property: "og:description", content: "Live entrance check-in station with duplicate scan prevention." },
    ],
  }),
  component: Scanner,
});

type ScanResult = {
  status: "valid" | "duplicate" | "invalid";
  message: string;
  token: string;
  time: string;
  attendee?: string | undefined;
  company?: string | undefined;
  job_title?: string | undefined;
  event_title?: string | undefined;
  event_date_time?: string | undefined;
  check_in_time?: string | undefined;
  gate: string;
};

export function Scanner() {
  const [token, setToken] = useState("");
  const [gate, setGate] = useState("Main Entrance Gate A");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<ScanResult[]>([]);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Camera handling
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (cameraActive) {
      navigator.mediaDevices?.getUserMedia?.({ video: { facingMode: "environment" } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          toast.error("Camera access not available or blocked in browser permissions.");
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraActive]);

  const handleValidate = async (inputVal?: string) => {
    const rawValue = (inputVal || token).trim();
    if (!rawValue) return;

    setLoading(true);
    try {
      const res = await verifyCheckIn(rawValue, gate);
      const currentTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const newEntry: ScanResult = {
        status: res.status,
        message: res.message || (res.success ? "Checked in successfully" : "Invalid pass"),
        token: rawValue.length > 30 ? "QR Payload (Encoded)" : rawValue,
        time: currentTime,
        attendee: res.attendee_name,
        company: res.company,
        job_title: res.job_title,
        event_title: res.event_title,
        event_date_time: res.event_date_time,
        check_in_time: res.check_in_time,
        gate: res.gate || gate,
      };

      setLastResult(newEntry);
      setLog((prev) => [newEntry, ...prev].slice(0, 15));
      setToken("");

      if (res.status === "valid") {
        toast.success(`Check-In Verified: ${res.attendee_name || "Attendee"}`, {
          description: `${res.event_title || "Event"} · ${res.company || ""} (${gate})`,
        });
      } else if (res.status === "duplicate") {
        toast.warning("Duplicate Scan Blocked", {
          description: res.message || "This attendee is already checked in.",
        });
      } else {
        toast.error("Invalid QR Pass", {
          description: "Pass token was not recognized in the database.",
        });
      }
    } catch {
      toast.error("Check-in verification error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Live QR Check-In Scanner
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Duplicate Protected
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Scans verify account name, event name, date and time with strict duplicate rejection.
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
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
            {/* Viewfinder Target */}
            <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
              {cameraActive ? (
                <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <ScanLine className="mx-auto h-12 w-12 text-primary animate-pulse" />
                  <p className="mt-3 text-sm font-bold text-foreground">Camera Scanning Target</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Point camera at pass QR code or input code manually below
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setCameraActive(!cameraActive)}
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-3 py-1.5 text-xs font-semibold text-foreground backdrop-blur shadow-sm hover:bg-secondary transition-colors"
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="h-3.5 w-3.5 text-destructive" /> Stop Camera
                  </>
                ) : (
                  <>
                    <Camera className="h-3.5 w-3.5 text-primary" /> Enable Camera
                  </>
                )}
              </button>

              <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Live Gate Mode
              </div>
            </div>

            {/* Input form */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Pass Token / Scanned QR Payload
              </label>
              <div className="flex gap-2">
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                  placeholder="e.g. EVT-2026-000248-X7K92 or paste QR string"
                  aria-label="Pass token"
                  className="h-11 flex-1 rounded-xl border border-input bg-background px-3 font-mono text-xs uppercase text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  disabled={loading || !token.trim()}
                  onClick={() => handleValidate()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-tech disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Verify & Check In
                </button>
              </div>
            </div>

            {/* Quick test buttons */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
              <span className="font-semibold text-foreground">Quick Test Pass:</span>
              <button
                type="button"
                onClick={() => {
                  setToken("EVT-2026-000248-X7K92");
                  handleValidate("EVT-2026-000248-X7K92");
                }}
                className="rounded-lg bg-secondary/80 px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Ahmed Mohamed (Pass #1)
              </button>
              <button
                type="button"
                onClick={() => {
                  setToken("EVT-2026-000312-M4P18");
                  handleValidate("EVT-2026-000312-M4P18");
                }}
                className="rounded-lg bg-secondary/80 px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Sarah Klein (Pass #2)
              </button>
            </div>
          </div>

          {/* Real-Time Scan Verdict Card */}
          {lastResult && (
            <div
              className={`rounded-2xl border p-5 shadow-card transition-all ${
                lastResult.status === "valid"
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : lastResult.status === "duplicate"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-destructive/40 bg-destructive/5"
              }`}
            >
              <div className="flex items-center gap-3">
                {lastResult.status === "valid" ? (
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                ) : lastResult.status === "duplicate" ? (
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-white shadow-sm">
                    <Ban className="h-6 w-6" />
                  </div>
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive text-white shadow-sm">
                    <XCircle className="h-6 w-6" />
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                    {lastResult.status === "valid"
                      ? "Check-In Verified · Access Granted"
                      : lastResult.status === "duplicate"
                        ? "Duplicate Scan Rejected"
                        : "Invalid Pass Token"}
                  </h3>
                  <p className="text-xs text-muted-foreground">{lastResult.message}</p>
                </div>
              </div>

              {/* Account, Event, Date and Time Details */}
              {(lastResult.attendee || lastResult.event_title) && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-3 text-xs">
                  <div>
                    <span className="flex items-center gap-1 font-semibold text-muted-foreground uppercase text-[10px]">
                      <User className="h-3 w-3" /> Account Name
                    </span>
                    <p className="mt-0.5 font-bold text-foreground">{lastResult.attendee}</p>
                    <p className="text-[11px] text-muted-foreground">{lastResult.company}</p>
                  </div>

                  <div>
                    <span className="flex items-center gap-1 font-semibold text-muted-foreground uppercase text-[10px]">
                      <Calendar className="h-3 w-3" /> Event Name
                    </span>
                    <p className="mt-0.5 font-bold text-foreground">{lastResult.event_title}</p>
                    <p className="text-[11px] text-muted-foreground">{lastResult.event_date_time}</p>
                  </div>

                  <div>
                    <span className="flex items-center gap-1 font-semibold text-muted-foreground uppercase text-[10px]">
                      <Clock className="h-3 w-3" /> Gate Scan Timestamp
                    </span>
                    <p className="mt-0.5 font-bold text-foreground">{lastResult.time}</p>
                  </div>

                  <div>
                    <span className="flex items-center gap-1 font-semibold text-muted-foreground uppercase text-[10px]">
                      <DoorOpen className="h-3 w-3" /> Station Gate
                    </span>
                    <p className="mt-0.5 font-bold text-foreground">{lastResult.gate}</p>
                  </div>
                </div>
              )}
            </div>
          )}
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
                      {entry.event_title && (
                        <p className="truncate text-[11px] font-medium text-foreground/80">
                          {entry.event_title} · {entry.event_date_time}
                        </p>
                      )}
                      {entry.company && (
                        <p className="truncate text-[11px] text-muted-foreground">{entry.company} ({entry.gate})</p>
                      )}
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
