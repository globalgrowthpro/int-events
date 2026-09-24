import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Upload, Send, Square, Loader2, CheckCircle2, XCircle, Clock, ChevronDown, RefreshCw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { sendAccommodationEmail, type AccommodationEmailPayload } from "@/lib/email-service";
import { cleanWhatsAppNumber, buildAccommodationWhatsAppMessage, getWhatsAppWebUrl } from "@/lib/whatsapp-service";

export const Route = createFileRoute("/admin/bulk-mail")({
  component: BulkMailPage,
});

type Row = AccommodationEmailPayload & {
  id?: string;
  recipient_phone?: string | undefined;
  channel?: "email" | "whatsapp" | undefined;
  status: "queued" | "sending" | "sent" | "failed";
  error?: string | undefined;
  created_at?: string | undefined;
};

const DELAY_MS = 10_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const empty = { recipient_name: "", recipient_email: "", recipient_phone: "", message: "", building_name: "", room_type: "" };

function BulkMailPage() {
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [isSingleOpen, setIsSingleOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem("int_accommodation_emails");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [running, setRunning] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const stopRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("accommodation_emails")
        .select("id, recipient_name, recipient_email, recipient_phone, channel, building_name, room_type, message, status, error, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      if (data) {
        const formatted: Row[] = data.map((d: any) => ({
          id: d.id,
          recipient_name: d.recipient_name,
          recipient_email: d.recipient_email,
          recipient_phone: d.recipient_phone || "",
          channel: d.channel || "email",
          building_name: d.building_name || "",
          room_type: d.room_type || "",
          message: d.message || "",
          status: d.status,
          error: d.error || undefined,
          created_at: d.created_at,
        }));
        setRows(formatted);
        try {
          localStorage.setItem("int_accommodation_emails", JSON.stringify(formatted.slice(0, 100)));
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      console.warn("Could not load accommodation emails history:", e);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function sendSingle() {
    if (!form.recipient_name.trim() || !EMAIL_RE.test(form.recipient_email.trim())) {
      toast.error("Enter a valid name and email");
      return;
    }
    setSending(true);
    const payload = { ...form, recipient_email: form.recipient_email.trim() };
    const r = await sendAccommodationEmail(payload);
    setSending(false);
    const newStatus = r.success ? "sent" : "failed";
    const nowIso = new Date().toISOString();

    setRows((rs) => [
      { ...payload, status: newStatus, error: r.error, created_at: nowIso },
      ...rs,
    ]);

    // Save to database
    try {
      await supabase.from("accommodation_emails").insert({
        recipient_name: payload.recipient_name,
        recipient_email: payload.recipient_email,
        building_name: payload.building_name,
        room_type: payload.room_type,
        message: payload.message,
        status: newStatus,
        error: r.error || null,
        sent_at: r.success ? nowIso : null,
      });
    } catch (err) {
      console.error("Error saving accommodation email to DB:", err);
    }

    if (r.success) {
      toast.success(`Email sent to ${payload.recipient_email}`);
      setForm(empty);
    } else toast.error(r.error || "Failed to send");
  }

  function sendSingleWhatsApp() {
    if (!form.recipient_name.trim()) {
      toast.error("Enter a recipient name");
      return;
    }
    const cleanPhone = cleanWhatsAppNumber(form.recipient_phone);
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error("Enter a valid phone number with country code (e.g. 201001234567)");
      return;
    }

    const msgText = buildAccommodationWhatsAppMessage({
      recipient_name: form.recipient_name,
      recipient_phone: cleanPhone,
      building_name: form.building_name,
      room_type: form.room_type,
      message: form.message,
    });

    const url = getWhatsAppWebUrl(cleanPhone, msgText);
    window.open(url, "_blank");

    const nowIso = new Date().toISOString();
    setRows((rs) => [
      { ...form, recipient_phone: cleanPhone, channel: "whatsapp", status: "sent", created_at: nowIso },
      ...rs,
    ]);

    // Save to database
    supabase
      .from("accommodation_emails")
      .insert({
        recipient_name: form.recipient_name,
        recipient_email: form.recipient_email || `${form.recipient_name.toLowerCase().replace(/\s+/g, "")}@whatsapp.guest`,
        recipient_phone: cleanPhone,
        channel: "whatsapp",
        building_name: form.building_name,
        room_type: form.room_type,
        message: form.message,
        status: "sent",
        sent_at: nowIso,
      })
      .then(({ error }) => {
        if (error) console.error("Error logging whatsapp send:", error);
      });

    toast.success(`Opening WhatsApp Web for ${cleanPhone}…`);
  }

  function openRowInWhatsApp(r: Row) {
    const cleanPhone = cleanWhatsAppNumber(r.recipient_phone || "");
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error("No valid phone number for this contact");
      return;
    }
    const msgText = buildAccommodationWhatsAppMessage({
      recipient_name: r.recipient_name,
      recipient_phone: cleanPhone,
      building_name: r.building_name,
      room_type: r.room_type,
      message: r.message,
    });
    const url = getWhatsAppWebUrl(cleanPhone, msgText);
    window.open(url, "_blank");
    toast.success(`Opening WhatsApp Web for ${r.recipient_name}…`);
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Name", "Phone", "Email", "Message", "Building Name", "Room Type"],
      ["Hafez Rahim", "201001234567", "hafez@example.com", "Your accommodation has been confirmed.", "Tower A", "Single"],
    ]);
    ws["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 28 }, { wch: 50 }, { wch: 18 }, { wch: 14 }];
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
        recipient_phone: cleanWhatsAppNumber(pick(o, "phone", "mobile", "whatsapp", "tel")),
        recipient_email: pick(o, "email"),
        message: pick(o, "message"),
        building_name: pick(o, "building name", "building"),
        room_type: pick(o, "room type", "room"),
        status: "queued" as const,
      }))
      .filter((r) => r.recipient_name || r.recipient_email || r.recipient_phone);
    const valid = parsed.filter((r) => EMAIL_RE.test(r.recipient_email) || (r.recipient_phone && r.recipient_phone.length >= 8));
    if (valid.length < parsed.length) toast.warning(`${parsed.length - valid.length} rows skipped (invalid email/phone)`);
    if (!valid.length) { toast.error("No valid rows found"); return; }
    setRows(valid);
    toast.success(`${valid.length} recipients imported — sending started`);
    runQueue(valid);
  }

  async function runWhatsAppQueue(list: Row[]) {
    stopRef.current = false;
    setRunning(true);
    for (let i = 0; i < list.length; i++) {
      if (stopRef.current) break;
      const r = list[i]!;
      const cleanPhone = cleanWhatsAppNumber(r.recipient_phone || "");
      if (!cleanPhone || cleanPhone.length < 8) {
        setRows((rs) => rs.map((item, j) => (j === i ? { ...item, status: "failed", error: "Missing/invalid phone" } : item)));
        continue;
      }
      if (i > 0) {
        for (let s = 5; s > 0; s--) {
          if (stopRef.current) break;
          setCountdown(s);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        setCountdown(0);
        if (stopRef.current) break;
      }
      setRows((rs) => rs.map((item, j) => (j === i ? { ...item, status: "sending" } : item)));
      const msgText = buildAccommodationWhatsAppMessage({
        recipient_name: r.recipient_name,
        recipient_phone: cleanPhone,
        building_name: r.building_name,
        room_type: r.room_type,
        message: r.message,
      });
      const url = getWhatsAppWebUrl(cleanPhone, msgText);
      window.open(url, "_blank");
      const sentTime = new Date().toISOString();
      setRows((rs) =>
        rs.map((item, j) => (j === i ? { ...item, status: "sent", channel: "whatsapp", created_at: sentTime } : item)),
      );

      try {
        await supabase.from("accommodation_emails").insert({
          recipient_name: r.recipient_name,
          recipient_email: r.recipient_email || `${r.recipient_name.toLowerCase().replace(/\s+/g, "")}@whatsapp.guest`,
          recipient_phone: cleanPhone,
          channel: "whatsapp",
          building_name: r.building_name,
          room_type: r.room_type,
          message: r.message,
          status: "sent",
          sent_at: sentTime,
        });
      } catch (err) {
        console.error("Error logging bulk whatsapp result to DB:", err);
      }
    }
    setRunning(false);
    setCountdown(0);
    toast.info(stopRef.current ? "WhatsApp sending stopped" : "All WhatsApp messages opened");
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
      const resStatus = res.success ? "sent" : "failed";
      const sentTime = new Date().toISOString();

      setRows((rs) =>
        rs.map((r, j) => (j === i ? { ...r, status: resStatus, error: res.error, created_at: sentTime } : r)),
      );

      // Save to database
      try {
        await supabase.from("accommodation_emails").insert({
          recipient_name: payload.recipient_name,
          recipient_email: payload.recipient_email,
          building_name: payload.building_name,
          room_type: payload.room_type,
          message: payload.message,
          status: resStatus,
          error: res.error || null,
          sent_at: res.success ? sentTime : null,
        });
      } catch (err) {
        console.error("Error saving bulk email result to DB:", err);
      }
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

      <Collapsible
        open={isSingleOpen}
        onOpenChange={setIsSingleOpen}
        className="rounded-2xl border bg-card p-6"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between text-left transition-colors"
          >
            <div>
              <h2 className="font-semibold">Send single email</h2>
              <p className="text-xs text-muted-foreground">Send accommodation details to an individual recipient</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>{isSingleOpen ? "Collapse" : "Expand"}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isSingleOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.recipient_name} onChange={set("recipient_name")} maxLength={120} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.recipient_email} onChange={set("recipient_email")} maxLength={255} /></div>
            <div className="space-y-1.5"><Label>WhatsApp / Mobile Number</Label><Input type="tel" placeholder="e.g. 201001234567" value={form.recipient_phone} onChange={set("recipient_phone")} maxLength={30} /></div>
            <div className="space-y-1.5"><Label>Building Name</Label><Input value={form.building_name} onChange={set("building_name")} maxLength={120} /></div>
            <div className="space-y-1.5"><Label>Room Type</Label><Input value={form.room_type} onChange={set("room_type")} maxLength={80} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Message</Label><Textarea rows={4} value={form.message} onChange={set("message")} maxLength={3000} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={sendSingle} disabled={sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Email
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
              onClick={sendSingleWhatsApp}
            >
              <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
              Send via WhatsApp Web
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Bulk send from Excel</h2>
            <p className="text-xs text-muted-foreground">Emails are sent one after another with a 10-second gap.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="icon" onClick={fetchHistory} disabled={loadingHistory} title="Refresh records">
              <RefreshCw className={`h-4 w-4 ${loadingHistory ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Download Template</Button>
            <Button onClick={() => fileRef.current?.click()} disabled={running}><Upload className="mr-2 h-4 w-4" />Import Excel</Button>
            {rows.some((r) => r.recipient_phone) && (
              <Button
                variant="outline"
                className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                onClick={() => runWhatsAppQueue(rows)}
                disabled={running}
              >
                <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
                Run WhatsApp Queue
              </Button>
            )}
            {running && <Button variant="destructive" onClick={() => (stopRef.current = true)}><Square className="mr-2 h-4 w-4" />Stop</Button>}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onImport} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <span>Total: <b>{rows.length}</b></span>
          <span className="text-primary">Sent: <b>{sent}</b></span>
          <span className="text-destructive">Failed: <b>{failed}</b></span>
          {countdown > 0 && <span className="text-muted-foreground">Next in {countdown}s…</span>}
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">Name</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Email</th>
                <th className="p-2">Building</th>
                <th className="p-2">Room</th>
                <th className="p-2">Channel</th>
                <th className="p-2">Status</th>
                <th className="p-2">Date</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr className="border-t">
                  <td className="p-4 text-center text-muted-foreground" colSpan={10}>
                    {loadingHistory ? "Loading emails..." : "No emails yet — send one above or import an Excel sheet."}
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.id || i} className="border-t">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2 font-medium">{r.recipient_name}</td>
                  <td className="p-2 font-mono text-xs">{r.recipient_phone || "—"}</td>
                  <td className="p-2">{r.recipient_email}</td>
                  <td className="p-2">{r.building_name || "—"}</td>
                  <td className="p-2">{r.room_type || "—"}</td>
                  <td className="p-2">
                    {r.channel === "whatsapp" ? (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-[10px] gap-1">
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Email</Badge>
                    )}
                  </td>
                  <td className="p-2">
                    {r.status === "queued" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />Queued</span>}
                    {r.status === "sending" && <span className="inline-flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending</span>}
                    {r.status === "sent" && <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" />Sent</span>}
                    {r.status === "failed" && <span className="inline-flex items-center gap-1 text-destructive" title={r.error}><XCircle className="h-3.5 w-3.5" />Failed</span>}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                    {r.created_at
                      ? new Date(r.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="p-2 text-right">
                    {r.recipient_phone ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                        onClick={() => openRowInWhatsApp(r)}
                        title="Open chat in WhatsApp Web"
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        Chat
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
