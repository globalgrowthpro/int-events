import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CreditCard,
  Search,
  Mail,
  Eye,
  Send,
  CheckCircle2,
  Clock,
  RefreshCw,
  Filter,
  Phone,
  Calendar,
  X,
  Sparkles,
  Printer,
  Download,
  Copy,
  Check,
  AlertCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { events, type IntEvent, type Registration } from "@/lib/int-data";
import { sendPassCardEmail } from "@/lib/email-service";
import { PassCard } from "@/components/int/pass-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/pass-cards")({
  head: () => ({
    meta: [
      { title: "Pass Cards Management — INT Events Admin" },
      {
        name: "description",
        content: "Track attendee digital pass card delivery status, dispatch email pass cards, and preview ITS 2026 digital badges.",
      },
    ],
  }),
  component: AdminPassCardsPage,
});

export interface AttendeePassRow {
  id: string;
  event_id: string;
  attendee_name: string;
  attendee_email: string;
  phone: string | null;
  gender?: string | null;
  company: string | null;
  job_title: string | null;
  role: string;
  ticket_token: string;
  state: "pending" | "registered" | "checked-in" | "cancelled" | "no-show";
  created_at?: string;
  check_in_time?: string | null;
}

type CardDeliveryStatus = "sent" | "waiting";

const STORAGE_KEY = "int_pass_card_delivery_statuses";

function getStoredStatuses(): Record<string, CardDeliveryStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredStatuses(statuses: Record<string, CardDeliveryStatus>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch {
    /* ignore */
  }
}

export function AdminPassCardsPage() {
  const [rows, setRows] = useState<AttendeePassRow[]>([]);
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, CardDeliveryStatus>>(getStoredStatuses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "waiting">("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [batchSending, setBatchSending] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<AttendeePassRow | null>(null);

  // Load registrations & delivery statuses from Supabase
  const loadData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      // 1. Load registrations
      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });

      // 2. Load sent email logs to dynamically mark delivered passes
      const { data: logs } = await supabase
        .from("email_logs")
        .select("recipient_email, status")
        .eq("status", "sent");

      const dbStatuses: Record<string, CardDeliveryStatus> = { ...getStoredStatuses() };
      if (logs && logs.length > 0) {
        logs.forEach((log) => {
          if (log.recipient_email) {
            dbStatuses[log.recipient_email.toLowerCase().trim()] = "sent";
          }
        });
      }
      setDeliveryStatuses(dbStatuses);
      saveStoredStatuses(dbStatuses);

      if (!error && data && data.length > 0) {
        setRows(data as AttendeePassRow[]);
        if (showToast) toast.success(`Loaded ${data.length} pass records from database.`);
      } else {
        // Fallback demo attendee passes
        const fallbackRows: AttendeePassRow[] = [
          {
            id: "REG-2026-001",
            event_id: "security-summit-2026",
            attendee_name: "Eng. Tarek Mansour",
            attendee_email: "tarek.mansour@telecom.eg",
            phone: "+20 100 458 9123",
            company: "Telecom Egypt",
            job_title: "Chief Information Security Officer",
            role: "client",
            ticket_token: "ITS-PASS-884920",
            state: "registered",
            created_at: new Date().toISOString(),
          },
          {
            id: "REG-2026-002",
            event_id: "security-summit-2026",
            attendee_name: "Dr. Sarah Al-Husseini",
            attendee_email: "sarah.husseini@nbe.com.eg",
            phone: "+20 111 884 1002",
            company: "National Bank of Egypt",
            job_title: "VP of Enterprise Infrastructure",
            role: "client",
            ticket_token: "ITS-PASS-991204",
            state: "checked-in",
            created_at: new Date().toISOString(),
          },
          {
            id: "REG-2026-003",
            event_id: "cloud-forum-2026",
            attendee_name: "Ahmed Mostafa",
            attendee_email: "a.mostafa@vodafone.com",
            phone: "+20 122 345 6789",
            company: "Vodafone Egypt",
            job_title: "Lead Cloud Architect",
            role: "client",
            ticket_token: "ITS-PASS-471029",
            state: "registered",
            created_at: new Date().toISOString(),
          },
          {
            id: "REG-2026-004",
            event_id: "security-summit-2026",
            attendee_name: "Mariam Youssef",
            attendee_email: "mariam.y@cib.com.eg",
            phone: "+20 109 876 5432",
            company: "CIB Egypt",
            job_title: "Head of Network Security",
            role: "client",
            ticket_token: "ITS-PASS-662810",
            state: "registered",
            created_at: new Date().toISOString(),
          },
          {
            id: "REG-2026-005",
            event_id: "ai-vision-2026",
            attendee_name: "Karim Abdelrahman",
            attendee_email: "karim.abdelrahman@orange.com",
            phone: "+20 114 556 7890",
            company: "Orange Business",
            job_title: "Principal AI Consultant",
            role: "vendor",
            ticket_token: "ITS-PASS-331908",
            state: "registered",
            created_at: new Date().toISOString(),
          },
          {
            id: "REG-2026-006",
            event_id: "infra-expo-2026",
            attendee_name: "Nouran El-Sayed",
            attendee_email: "nouran.elsayed@banquemisr.com",
            phone: "+20 102 334 5566",
            company: "Banque Misr",
            job_title: "IT Operations Director",
            role: "client",
            ticket_token: "ITS-PASS-774192",
            state: "registered",
            created_at: new Date().toISOString(),
          },
        ];
        setRows(fallbackRows);
        if (showToast) toast.info("Loaded demo pass card records.");
      }
    } catch {
      toast.error("Failed to connect to database. Displaying local cache.");
    } finally {
      if (showToast) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatus = (row: AttendeePassRow): CardDeliveryStatus => {
    const emailKey = row.attendee_email?.toLowerCase().trim();
    return (
      deliveryStatuses[row.id] ||
      deliveryStatuses[row.ticket_token] ||
      (emailKey ? deliveryStatuses[emailKey] : undefined) ||
      "waiting"
    );
  };

  const updateStatus = async (row: AttendeePassRow, status: CardDeliveryStatus) => {
    const emailKey = row.attendee_email?.toLowerCase().trim();
    const updated: Record<string, CardDeliveryStatus> = {
      ...deliveryStatuses,
      [row.id]: status,
      [row.ticket_token]: status,
    };
    if (emailKey) {
      updated[emailKey] = status;
    }
    setDeliveryStatuses(updated);
    saveStoredStatuses(updated);

    if (status === "sent") {
      try {
        await supabase.from("email_logs").insert({
          recipient_email: row.attendee_email.trim(),
          template_name: "pass_card",
          subject: `Approved — Your ITS 2026 Access Pass (${row.attendee_name})`,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      } catch {
        /* ignore */
      }
    }
  };

  // Dispatch Pass Card Email
  const handleSendPass = async (row: AttendeePassRow) => {
    setSendingId(row.id);
    const ev = events.find((e) => e.id === row.event_id) || events[0];

    try {
      toast.loading(`Sending pass card to ${row.attendee_email}...`, { id: `send-${row.id}` });
      
      const passImageBase64 = await generatePassCardDataUrl(row);

      const result = await sendPassCardEmail({
        recipient_name: row.attendee_name,
        recipient_email: row.attendee_email,
        event_id: row.event_id,
        event_title: ev?.title || "Integrated Technics Showcase 2026",
        event_date: ev?.dateLabel || "November 2026",
        event_location: ev?.venue || ev?.city || "Cairo, Egypt",
        company: row.company,
        job_title: row.job_title,
        registration_id: row.id,
        token: row.ticket_token,
        pass_image_base64: passImageBase64 || undefined,
      });

      if (result.success) {
        await updateStatus(row, "sent");
        toast.success(`Pass card delivered to ${row.attendee_name}`, {
          id: `send-${row.id}`,
          description: `Sent to ${row.attendee_email}`,
        });
      } else {
        toast.error(`Failed to send pass card: ${result.error || "SMTP delivery error"}`, {
          id: `send-${row.id}`,
        });
      }
    } catch (err: any) {
      toast.error(`Delivery error: ${err.message || "Unknown error"}`, { id: `send-${row.id}` });
    } finally {
      setSendingId(null);
    }
  };

  // Batch Send Waiting Passes
  const handleBatchSendWaiting = async () => {
    const waitingRows = rows.filter((r) => getStatus(r) === "waiting");
    if (waitingRows.length === 0) {
      toast.info("All attendees already have their pass cards sent.");
      return;
    }

    const confirmSend = window.confirm(
      `Are you sure you want to dispatch pass cards to all ${waitingRows.length} waiting attendees?`,
    );
    if (!confirmSend) return;

    setBatchSending(true);
    let sentCount = 0;
    let failCount = 0;

    for (const row of waitingRows) {
      const ev = events.find((e) => e.id === row.event_id) || events[0];
      try {
        const passImageBase64 = await generatePassCardDataUrl(row);

        const res = await sendPassCardEmail({
          recipient_name: row.attendee_name,
          recipient_email: row.attendee_email,
          event_id: row.event_id,
          event_title: ev?.title || "Integrated Technics Showcase 2026",
          event_date: ev?.dateLabel,
          event_location: ev?.venue || ev?.city,
          company: row.company,
          job_title: row.job_title,
          registration_id: row.id,
          token: row.ticket_token,
          pass_image_base64: passImageBase64 || undefined,
        });

        if (res.success) {
          updateStatus(row, "sent");
          sentCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setBatchSending(false);
    toast.success(`Batch delivery completed: ${sentCount} sent, ${failCount} failed.`);
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const status = getStatus(row);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (eventFilter !== "all" && row.event_id !== eventFilter) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        row.attendee_name.toLowerCase().includes(q) ||
        row.attendee_email.toLowerCase().includes(q) ||
        (row.phone && row.phone.toLowerCase().includes(q)) ||
        (row.company && row.company.toLowerCase().includes(q)) ||
        row.ticket_token.toLowerCase().includes(q)
      );
    });
  }, [rows, deliveryStatuses, search, statusFilter, eventFilter]);

  // Statistics
  const totalCount = rows.length;
  const sentCount = rows.filter((r) => getStatus(r) === "sent").length;
  const waitingCount = totalCount - sentCount;
  const deliveryRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  // Convert row to Registration object for <PassCard />
  const getPassCardProps = (row: AttendeePassRow): { registration: Registration; event: IntEvent } => {
    const ev = (events.find((e) => e.id === row.event_id) || events[0]) as IntEvent;

    const reg: Registration = {
      id: row.id,
      eventId: row.event_id,
      attendee: row.attendee_name,
      gender: row.gender || "Male",
      jobTitle: row.job_title || "Participant",
      role: (row.role as "client" | "vendor" | "employee" | "admin") || "client",
      company: row.company || "Enterprise Partner",
      token: row.ticket_token,
      state: row.state === "checked-in" ? "checked-in" : "registered",
      checkInTime: row.check_in_time || undefined,
    };

    return { registration: reg, event: ev };
  };

  // Generate high-resolution base64 PNG data URL of the Pass Card
  const generatePassCardDataUrl = (row: AttendeePassRow | null): Promise<string> => {
    if (!row) return Promise.resolve("");
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "/2.png";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width || 1200;
          canvas.height = img.height || 1697;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve("");

          // Draw background template image (2.png)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const centerX = canvas.width / 2;
          const centerY = canvas.height * 0.42; // Shifted slightly higher up

          // 1. Attendee Name (Bold Black Uppercase - Larger)
          ctx.textAlign = "center";
          ctx.fillStyle = "#111111";
          ctx.font = `900 ${Math.round(canvas.width * 0.062)}px "Inter", "Segoe UI", Arial, sans-serif`;
          ctx.fillText((row.attendee_name || "Valued Guest").toUpperCase(), centerX, centerY);

          // 2. Position (Job Title)
          ctx.fillStyle = "#444444";
          ctx.font = `800 ${Math.round(canvas.width * 0.058)}px "Inter", "Segoe UI", Arial, sans-serif`;
          ctx.fillText(row.job_title || "Participant", centerX, centerY + canvas.height * 0.058);

          // 3. Organization (Bold Brand Orange Uppercase)
          ctx.fillStyle = "#f37021";
          ctx.font = `900 ${Math.round(canvas.width * 0.060)}px "Inter", "Segoe UI", Arial, sans-serif`;
          ctx.fillText((row.company || "Integrated Technics").toUpperCase(), centerX, centerY + canvas.height * 0.118);

          resolve(canvas.toDataURL("image/png"));
        } catch (err) {
          console.warn("Canvas pass card generation error:", err);
          resolve("");
        }
      };
      img.onerror = () => resolve("");
    });
  };

  // Download High-Resolution PNG Pass Card
  const handleDownloadPng = async (row: AttendeePassRow | null) => {
    if (!row) return;
    const toastId = toast.loading("Generating PNG pass card...");
    try {
      const dataUrl = await generatePassCardDataUrl(row);
      if (!dataUrl) {
        toast.error("Failed to generate pass card image", { id: toastId });
        return;
      }
      const link = document.createElement("a");
      const safeName = row.attendee_name.replace(/[^a-zA-Z0-9_-]/g, "_");
      link.download = `${safeName}_ITS2026_Pass.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Pass Card downloaded as PNG!", { id: toastId });
    } catch (err: any) {
      toast.error(`Download failed: ${err.message}`, { id: toastId });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Pass Cards</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage attendee digital access cards, track delivery status, and dispatch passes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="h-9 gap-2 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleBatchSendWaiting}
            disabled={batchSending || waitingCount === 0}
            className="h-9 gap-2 bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary/90"
          >
            <Send className={`h-3.5 w-3.5 ${batchSending ? "animate-pulse" : ""}`} />
            {batchSending ? "Dispatching..." : `Send All Waiting (${waitingCount})`}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Passes</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{totalCount}</p>
          <p className="text-[11px] text-muted-foreground">Registered participants</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Passes Sent</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{sentCount}</p>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">Delivered to email</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Waiting Delivery</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">{waitingCount}</p>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">Awaiting pass email dispatch</p>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Delivery Rate</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">{deliveryRate}%</p>
          <p className="text-[11px] text-muted-foreground">{sentCount} of {totalCount} fulfilled</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by full name, email, phone, company, or pass code..."
              className="w-full h-10 pl-9 pr-8 text-xs sm:text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-xl border border-border bg-muted/40 p-1">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({rows.length})
              </button>
              <button
                onClick={() => setStatusFilter("sent")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === "sent"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                Sent ({sentCount})
              </button>
              <button
                onClick={() => setStatusFilter("waiting")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === "waiting"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="h-3 w-3" />
                Waiting ({waitingCount})
              </button>
            </div>

            {/* Event Filter */}
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="h-10 text-xs bg-background border border-input rounded-xl px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Events</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pass Cards Table */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Full Name</th>
                <th className="py-3.5 px-4 sm:px-6">Email & Phone</th>
                <th className="py-3.5 px-4 sm:px-6">Event & Code</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Card Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CreditCard className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No pass cards found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search query or status filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const status = getStatus(row);
                  const isSending = sendingId === row.id;
                  const ev = events.find((e) => e.id === row.event_id);

                  return (
                    <tr key={row.id} className="hover:bg-accent/40 transition-colors">
                      {/* Full Name */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-xs border border-primary/20 shadow-xs">
                            {row.attendee_name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{row.attendee_name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {row.company || "Direct Attendee"} {row.job_title ? `• ${row.job_title}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email & Phone */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <a
                              href={`mailto:${row.attendee_email}`}
                              className="text-foreground hover:text-primary transition-colors truncate max-w-[220px]"
                              title={row.attendee_email}
                            >
                              {row.attendee_email}
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Phone className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span>
                              {row.phone && row.phone.trim() ? (
                                <a
                                  href={`tel:${row.phone}`}
                                  className="hover:text-foreground transition-colors font-medium"
                                >
                                  {row.phone}
                                </a>
                              ) : (
                                "—"
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Event & Pass Token */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-secondary text-[11px] font-medium text-foreground truncate max-w-[170px]">
                            {ev?.title || "Integrated Technics Showcase"}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {row.ticket_token}
                            </span>
                            <button
                              onClick={() => copyToClipboard(row.ticket_token, row.id)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title="Copy Pass Token"
                            >
                              {copiedToken === row.id ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Card Status - Interactive Dynamic Toggle */}
                      <td className="py-3.5 px-4 sm:px-6 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const next = status === "sent" ? "waiting" : "sent";
                            updateStatus(row, next);
                            toast.success(
                              `Card status marked as ${next === "sent" ? "Send" : "Waiting"} for ${row.attendee_name}`
                            );
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
                            status === "sent"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                          }`}
                          title="Click to toggle status between Send and Waiting"
                        >
                          {status === "sent" ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Send</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5" />
                              <span>Waiting</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send / Resend Email Button */}
                          <Button
                            size="sm"
                            variant={status === "sent" ? "outline" : "default"}
                            onClick={() => handleSendPass(row)}
                            disabled={isSending}
                            className={`h-8 gap-1.5 px-2.5 text-xs font-semibold ${
                              status === "sent"
                                ? "text-muted-foreground hover:text-foreground"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                            title={status === "sent" ? "Resend Pass Card Email" : "Send Pass Card Email"}
                          >
                            <Send className={`h-3.5 w-3.5 ${isSending ? "animate-spin" : ""}`} />
                            <span className="hidden md:inline">
                              {isSending ? "Sending..." : status === "sent" ? "Resend" : "Send"}
                            </span>
                          </Button>

                          {/* View Pass Card Modal Button */}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setPreviewItem(row)}
                            className="h-8 gap-1.5 px-2.5 text-xs font-medium hover:bg-accent"
                            title="View Official Digital Pass Card"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">View</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Pass Card Dialog Modal */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden border-border bg-card">
          <DialogHeader className="p-3 border-b border-border/80 bg-muted/20">
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <DialogTitle className="text-base font-bold text-foreground">
                  Official Digital Pass Card
                </DialogTitle>
              </div>
              {previewItem && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    getStatus(previewItem) === "sent"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {getStatus(previewItem) === "sent" ? "Delivered" : "Waiting Delivery"}
                </span>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Ticket token: <span className="font-mono font-semibold">{previewItem?.ticket_token}</span>
            </DialogDescription>
          </DialogHeader>

          {previewItem && (
            <div className="p-3.5 space-y-3">
              {/* Pass Card Component */}
              <div className="shadow-lg rounded-xl overflow-hidden ring-1 ring-border">
                {(() => {
                  const { registration, event } = getPassCardProps(previewItem);
                  return <PassCard registration={registration} event={event} />;
                })()}
              </div>

              {/* Modal Actions */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 px-2 font-medium"
                  onClick={() => handleDownloadPng(previewItem)}
                  title="Download Badge as High-Res PNG Image"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>PNG</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 px-2 font-medium"
                  onClick={() => {
                    window.print();
                  }}
                  title="Print Official Badge Pass"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </Button>

                <Button
                  size="sm"
                  className="text-xs gap-1.5 px-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold truncate"
                  onClick={() => {
                    handleSendPass(previewItem);
                  }}
                  disabled={sendingId === previewItem.id}
                  title={getStatus(previewItem) === "sent" ? "Resend Pass Email" : "Send Pass Email"}
                >
                  <Send className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{getStatus(previewItem) === "sent" ? "Resend" : "Send"}</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
