import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ScanLine, XCircle } from "lucide-react";
import { myRegistrations } from "@/lib/int-data";

export const Route = createFileRoute("/admin/scanner")({
  head: () => ({
    meta: [
      { title: "QR Scanner — INT Events Admin" },
      {
        name: "description",
        content: "Scan attendee QR passes to check them in to Integrated Technics events.",
      },
      { property: "og:title", content: "QR Scanner — INT Events Admin" },
      { property: "og:description", content: "Entrance check-in station for INT events." },
    ],
  }),
  component: Scanner,
});

type Result = { ok: boolean; message: string; token: string };

function Scanner() {
  const [token, setToken] = useState("");
  const [log, setLog] = useState<Result[]>([]);

  const validate = () => {
    const value = token.trim().toUpperCase();
    if (!value) return;
    const match = myRegistrations.find((r) => r.token === value);
    const result: Result = match
      ? { ok: true, message: `${match.attendee} · ${match.company} checked in`, token: value }
      : { ok: false, message: "Pass not recognised — verify at the help desk", token: value };
    setLog([result, ...log].slice(0, 8));
    setToken("");
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">QR Scanner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Point the camera at an attendee pass, or type the pass token manually.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-border bg-navy/5">
            <div className="text-center">
              <ScanLine className="mx-auto h-12 w-12 text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">Camera scanning area</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Align the QR code inside the frame
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && validate()}
              placeholder="EVT-2026-000248-X7K92"
              aria-label="Pass token"
              className="h-11 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={validate}
              className="h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-tech"
            >
              Check in
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Try EVT-2026-000248-X7K92 for a valid pass.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-card">
          <h2 className="border-b border-border px-5 py-4 text-base font-semibold text-foreground">
            Scan results
          </h2>
          {log.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No scans yet in this session.</p>
          ) : (
            <ul className="divide-y divide-border">
              {log.map((entry, index) => (
                <li key={entry.token + index} className="flex items-start gap-3 px-5 py-4">
                  {entry.ok ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{entry.message}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{entry.token}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
