import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Upload, Send, Square, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { sendAccommodationEmail, type AccommodationEmailPayload } from "@/lib/email-service";

export const Route = createFileRoute("/admin/bulk-mail")({
  component: BulkMailPage,
});

type Row = AccommodationEmailPayload & { status: "queued" | "sending" | "sent" | "failed"; error?: string | undefined };

const DELAY_MS = 10_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const empty = { recipient_name: "", recipient_email: "", message: "", building_name: "", room_type: "" };

function BulkMailPage() {
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const stopRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function sendSingle() {
    if (!form.recipient_name.trim() || !EMAIL_RE.test(form.recipient_email.trim())) {
      toast.error("Enter a valid name and email");
      return;
    }
    setSending(true);
    const r = await sendAccommodationEmail({ ...form, recipient_email: form.recipient_email.trim() });
    setSending(false);
    if (r.success) {
      toast.success(`Email sent to ${form.recipient_email}`);
      setForm(empty);
    } else toast.error(r.error || "Failed to send");
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Name", "Email", "Message", "Building Name", "Room Type"],
      ["John Smith", "john@example.com", "Your accommodation has been confirmed.", "Tower A", "Single"],
    ]);
    ws["!cols"] = [{ wch: 22 }, { wch: 28 }, { wch: 50 }, { wch: 18 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recipients");
    XLSX.writeFile(wb, "accommodation-mail-template.xlsx");
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const wb = XLSX.read(await file.arrayBuffer());
    const sheet = wb.Sheets[wb.SheetNames[0]!]!;
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const pick = (o: Record<string, unknown>, ...keys: string[]) => {
      const k = Object.keys(o).find((x) => keys.includes(x.trim().toLowerCase()));
      return k ? String(o[k] ?? "").trim() : "";
    };
    const parsed: Row[] = json
      .map((o) => ({
        recipient_name: pick(o, "name"),
        recipient_email: pick(o, "email"),
        message: pick(o, "message"),
        building_name: pick(o, "building name", "building"),
        room_type: pick(o, "room type", "room"),
        status: "queued" as const,
      }))
      .filter((r) => r.recipient_name || r.recipient_email);
    const valid = parsed.filter((r) => EMAIL_RE.test(r.recipient_email));
    if (valid.length < parsed.length) toast.warning(`${parsed.length - valid.length} rows skipped (invalid email)`);
    if (!valid.length) { toast.error("No valid rows found"); return; }
    setRows(valid);
    toast.success(`${valid.length} recipients imported — sending started`);
    runQueue(valid);
  }

  async function runQueue(list: Row[]) {
    stopRef.current = false;
    setRunning(true);
    for (let i = 0; i < list.length; i++) {
      if (stopRef.current) break;
      if (i > 0) {
        for (let s = DELAY_MS / 1000; s > 0; s--) {
          if (stopRef.current) break;
          setCountdown(s);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setCountdown(0);
        if (stopRef.current) break;
      }
      setRows((rs) => rs.map((r, j) => (j === i ? { ...r, status: "sending" } : r)));
      const { status: _s, ...payload } = list[i]!;
      const res = await sendAccommodationEmail(payload);
      setRows((rs) =>
        rs.map((r, j) => (j === i ? { ...r, status: res.success ? "sent" : "failed", error: res.error } : r)),
      );
    }
    setRunning(false);
    setCountdown(0);
    toast.info(stopRef.current ? "Sending stopped" : "All emails processed");
  }

  const sent = rows.filter((r) => r.status === "sent").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accommodation Mail</h1>
        <p className="text-sm text-muted-foreground">Send accommodation details one by one, or import an Excel sheet.</p>
      </div>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Send single email</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.recipient_name} onChange={set("recipient_name")} maxLength={120} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.recipient_email} onChange={set("recipient_email")} maxLength={255} /></div>
          <div className="space-y-1.5"><Label>Building Name</Label><Input value={form.building_name} onChange={set("building_name")} maxLength={120} /></div>
          <div className="space-y-1.5"><Label>Room Type</Label><Input value={form.room_type} onChange={set("room_type")} maxLength={80} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Message</Label><Textarea rows={4} value={form.message} onChange={set("message")} maxLength={3000} /></div>
        </div>
        <Button onClick={sendSingle} disabled={sending}>
          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Send Email
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Bulk send from Excel</h2>
            <p className="text-xs text-muted-foreground">Emails are sent one after another with a 10-second gap.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Download Template</Button>
            <Button onClick={() => fileRef.current?.click()} disabled={running}><Upload className="mr-2 h-4 w-4" />Import Excel</Button>
            {running && <Button variant="destructive" onClick={() => (stopRef.current = true)}><Square className="mr-2 h-4 w-4" />Stop</Button>}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onImport} />
          </div>
        </div>

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>Total: <b>{rows.length}</b></span>
              <span className="text-primary">Sent: <b>{sent}</b></span>
              <span className="text-destructive">Failed: <b>{failed}</b></span>
              {countdown > 0 && <span className="text-muted-foreground">Next email in {countdown}s…</span>}
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr><th className="p-2">#</th><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Building</th><th className="p-2">Room</th><th className="p-2">Status</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2">{r.recipient_name}</td>
                      <td className="p-2">{r.recipient_email}</td>
                      <td className="p-2">{r.building_name}</td>
                      <td className="p-2">{r.room_type}</td>
                      <td className="p-2">
                        {r.status === "queued" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />Queued</span>}
                        {r.status === "sending" && <span className="inline-flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending</span>}
                        {r.status === "sent" && <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" />Sent</span>}
                        {r.status === "failed" && <span className="inline-flex items-center gap-1 text-destructive" title={r.error}><XCircle className="h-3.5 w-3.5" />Failed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
