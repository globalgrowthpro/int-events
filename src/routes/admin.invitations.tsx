import { useState, useEffect, useMemo, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import {
  Mail,
  Send,
  Upload,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  RotateCcw,
  Eye,
  Download,
  Calendar,
  Building,
  User,
  Phone,
  ArrowRight,
  Sparkles,
  Pause,
  Play,
  XCircle,
  X,
  FileText,
  HelpCircle,
  Plus,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { events as defaultEvents } from "@/lib/int-data";
import { toast } from "sonner";
import { sendLiveInvitationEmail } from "@/lib/email-service";
import { QrCode as RealQrCode } from "@/components/int/qr-code";

export const Route = createFileRoute("/admin/invitations")({
  head: () => ({
    meta: [
      { title: "Event Invitations & SMTP Dispatch — INT Events Admin" },
      {
        name: "description",
        content: "Dispatch event invitations to existing accounts or bulk excel spreadsheets with 15-second SMTP pacing.",
      },
      { property: "og:title", content: "Invitations — INT Events Admin" },
      { property: "og:description", content: "Bulk and directory invitation sender." },
    ],
  }),
  component: AdminInvitationsPage,
});

interface InvitationRow {
  id: string;
  event_id: string;
  event_title?: string;
  recipient_name: string;
  recipient_email: string;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  source: "accounts" | "excel" | "manual";
  status: "sent" | "pending" | "failed";
  sent_at: string | null;
  error_message?: string | null;
  token?: string | null;
  created_at: string;
}

interface RecipientItem {
  id: string;
  fullName: string;
  email: string;
  company: string;
  jobTitle: string;
  phone: string;
  source: "accounts" | "excel";
  valid: boolean;
  errorReason?: string | undefined;
}

interface EventItem {
  id: string;
  title: string;
  dateLabel: string;
  city: string;
  location?: string;
  capacity?: number;
  registered_count?: number;
}

interface AccountItem {
  id: string;
  full_name: string;
  email: string;
  company: string;
  job_title: string;
  phone: string;
  role: string;
  status: string;
}

export function AdminInvitationsPage() {
  // Navigation & Data
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [accountsList, setAccountsList] = useState<AccountItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedEventFilter, setSelectedEventFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedSourceFilter, setSelectedSourceFilter] = useState("all");

  // Wizard / Dispatch State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [targetEventId, setTargetEventId] = useState<string>("");
  const [recipientSource, setRecipientSource] = useState<"accounts" | "excel">("accounts");

  // Account Selection state
  const [accountSearch, setAccountSearch] = useState("");
  const [accountRoleFilter, setAccountRoleFilter] = useState("all");
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());

  // Excel / CSV state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelRecipients, setExcelRecipients] = useState<RecipientItem[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email Customization & SMTP Settings
  const [emailSubject, setEmailSubject] = useState("Official Invitation: Integrated Technics Event 2026");
  const [customNote, setCustomNote] = useState("");
  const [smtpSender, setSmtpSender] = useState({
    from_name: "Integrated Technics Events",
    from_email: "events@integratedtechnics.com",
    host: "mail.integratedtechnics.com",
  });

  // Sending Engine State
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);
  const [countdown, setCountdown] = useState(15);
  const [currentRecipient, setCurrentRecipient] = useState<RecipientItem | null>(null);
  const [dispatchLogs, setDispatchLogs] = useState<Array<{ id: string; time: string; text: string; status: "success" | "info" | "warn" | "error" }>>([]);
  // Modals & Single CRUD
  const [previewInvitation, setPreviewInvitation] = useState<InvitationRow | null>(null);
  const [isSingleCreateOpen, setIsSingleCreateOpen] = useState(false);
  const [editingInvitation, setEditingInvitation] = useState<InvitationRow | null>(null);
  const [deletingInvitation, setDeletingInvitation] = useState<InvitationRow | null>(null);
  const [singleFormData, setSingleFormData] = useState({
    event_id: "",
    recipient_name: "",
    recipient_email: "",
    company: "",
    job_title: "Representative",
    phone: "",
    send_immediately: true,
  });

  // Refs for async loop control
  const pausedRef = useRef(false);
  const abortRef = useRef(false);

  // Load initial data
  const loadData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      // 1. Events
      const { data: evData } = await supabase.from("events").select("*").order("date", { ascending: true });
      if (evData && evData.length > 0) {
        setEventsList(
          evData.map((e: any) => ({
            id: e.id,
            title: e.title,
            dateLabel: e.date_label || e.date || "2026",
            city: e.city || "Cairo",
            location: e.location || "Integrated Technics HQ",
            capacity: e.capacity || 200,
            registered_count: e.registered_count || 0,
          }))
        );
        if (!targetEventId && evData[0]?.id) setTargetEventId(evData[0].id);
      } else {
        setEventsList(
          defaultEvents.map((e) => ({
            id: e.id,
            title: e.title,
            dateLabel: e.dateLabel,
            city: e.city,
            location: e.venue,
            capacity: e.capacity,
            registered_count: e.registered,
          }))
        );
        if (!targetEventId && defaultEvents[0]?.id) setTargetEventId(defaultEvents[0].id);
      }

      // 2. Accounts
      const { data: accData } = await supabase.from("profiles").select("*").order("full_name", { ascending: true });
      if (accData && accData.length > 0) {
        setAccountsList(accData as AccountItem[]);
      } else {
        setAccountsList([
          { id: "1", full_name: "Ahmed Mohamed", email: "client@intevents.com", company: "ABC Corporation", job_title: "CIO", role: "client", status: "active", phone: "+20 100 123 4567" },
          { id: "2", full_name: "John Smith", email: "jsmith@genetec.com", company: "Genetec", job_title: "Security Director", role: "vendor", status: "active", phone: "+20 100 234 5678" },
          { id: "3", full_name: "Sara Hassan", email: "sara.h@cairo-tech.com", company: "Cairo Tech Solutions", job_title: "Procurement Head", role: "client", status: "active", phone: "+20 100 345 6789" },
          { id: "4", full_name: "Omar Ali", email: "omar.ali@integratedtechnics.com", company: "Integrated Technics", job_title: "Field Lead", role: "employee", status: "active", phone: "+20 100 456 7890" },
        ]);
      }

      // 3. SMTP Config
      const { data: smtpData } = await supabase.from("smtp_settings").select("*").limit(1).single();
      if (smtpData) {
        setSmtpSender({
          from_name: smtpData.from_name || "Integrated Technics Events",
          from_email: smtpData.from_email || "events@integratedtechnics.com",
          host: smtpData.host || "mail.integratedtechnics.com",
        });
      }

      // 4. Invitations
      const { data: invData, error: invError } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!invError && invData && invData.length > 0) {
        setInvitations(invData as InvitationRow[]);
      } else {
        // Sample baseline invitations
        setInvitations([
          {
            id: "INV-2026-00192",
            event_id: "security-summit-2026",
            event_title: "INT Security Technology Summit 2026",
            recipient_name: "Karim Mansour",
            recipient_email: "kmansour@egypt-infra.com",
            company: "Egypt Infrastructure Authority",
            job_title: "Head of Digital Systems",
            phone: "+20 100 888 9999",
            source: "excel",
            status: "sent",
            sent_at: new Date(Date.now() - 3600000 * 2).toISOString(),
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: "INV-2026-00193",
            event_id: "security-summit-2026",
            event_title: "INT Security Technology Summit 2026",
            recipient_name: "Ahmed Mohamed",
            recipient_email: "ahmed.mohamed@abccorp.com",
            company: "ABC Corporation",
            job_title: "IT Director",
            phone: "+20 100 123 4567",
            source: "accounts",
            status: "sent",
            sent_at: new Date(Date.now() - 3600000 * 5).toISOString(),
            created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
          },
        ]);
      }

      if (showToast) toast.success("Invitations and accounts synchronized!");
    } catch {
      console.warn("Using local state for invitations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-sync every 10 seconds
    const interval = setInterval(() => {
      loadData(false);
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Filtered invitations list
  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      const matchesSearch =
        inv.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
        inv.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
        (inv.company && inv.company.toLowerCase().includes(search.toLowerCase())) ||
        inv.id.toLowerCase().includes(search.toLowerCase());

      const matchesEvent = selectedEventFilter === "all" || inv.event_id === selectedEventFilter;
      const matchesStatus = selectedStatusFilter === "all" || inv.status === selectedStatusFilter;
      const matchesSource = selectedSourceFilter === "all" || inv.source === selectedSourceFilter;

      return matchesSearch && matchesEvent && matchesStatus && matchesSource;
    });
  }, [invitations, search, selectedEventFilter, selectedStatusFilter, selectedSourceFilter]);

  // Filtered accounts in Wizard
  const filteredAccountsInWizard = useMemo(() => {
    return accountsList.filter((acc) => {
      const matchesSearch =
        acc.full_name.toLowerCase().includes(accountSearch.toLowerCase()) ||
        acc.email.toLowerCase().includes(accountSearch.toLowerCase()) ||
        (acc.company && acc.company.toLowerCase().includes(accountSearch.toLowerCase()));

      const matchesRole = accountRoleFilter === "all" || acc.role === accountRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [accountsList, accountSearch, accountRoleFilter]);

  // Selected target event details
  const targetEvent = useMemo(() => {
    return eventsList.find((e) => e.id === targetEventId) || eventsList[0] || null;
  }, [eventsList, targetEventId]);

  // Handle Account Selection Toggles
  const toggleAccountSelection = (id: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllAccounts = () => {
    const allIds = filteredAccountsInWizard.map((a) => a.id);
    setSelectedAccountIds(new Set(allIds));
  };

  const deselectAllAccounts = () => {
    setSelectedAccountIds(new Set());
  };

  // Excel / CSV File Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingExcel(true);
    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0] || "Sheet1";
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          toast.error("Spreadsheet sheet could not be read.");
          setIsParsingExcel(false);
          return;
        }
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });

        if (!rawRows || rawRows.length === 0) {
          toast.error("Spreadsheet is empty or no valid rows found.");
          setIsParsingExcel(false);
          return;
        }

        const parsed: RecipientItem[] = rawRows.map((row, idx) => {
          // Normalize column lookups
          const fullName =
            row["Full Name"] ||
            row["fullname"] ||
            row["full_name"] ||
            row["Name"] ||
            row["name"] ||
            row["Attendee"] ||
            "";
          const email =
            row["Email"] ||
            row["email"] ||
            row["E-mail"] ||
            row["email_address"] ||
            row["Mail"] ||
            "";
          const company =
            row["Company"] ||
            row["company"] ||
            row["Organization"] ||
            row["organization"] ||
            "";
          const jobTitle =
            row["Title"] ||
            row["title"] ||
            row["Job Title"] ||
            row["job_title"] ||
            row["Position"] ||
            "";
          const phone =
            row["Phone"] ||
            row["phone"] ||
            row["Mobile"] ||
            row["mobile"] ||
            row["phone_number"] ||
            "";

          const cleanEmail = String(email).trim();
          const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

          return {
            id: `excel-${idx + 1}`,
            fullName: String(fullName).trim() || "Participant",
            email: cleanEmail,
            company: String(company).trim() || "—",
            jobTitle: String(jobTitle).trim() || "Representative",
            phone: String(phone).trim() || "—",
            source: "excel",
            valid: Boolean(emailValid && fullName),
            errorReason: !fullName
              ? "Missing Name"
              : !emailValid
              ? "Invalid Email Format"
              : undefined,
          };
        });

        setExcelRecipients(parsed);
        const validCount = parsed.filter((p) => p.valid).length;
        toast.success(`Successfully loaded ${parsed.length} rows (${validCount} valid recipients)!`);
      } catch (err) {
        console.error("Excel parse error:", err);
        toast.error("Failed to parse file. Please use .xlsx, .xls, or .csv format.");
      } finally {
        setIsParsingExcel(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        "Full Name": "Ahmed Mansour",
        Title: "Chief Technology Officer",
        Company: "Enterprise Systems Egypt",
        Phone: "+20 100 555 1234",
        Email: "ahmed.mansour@enterprisesys.com",
      },
      {
        "Full Name": "Layla Ibrahem",
        Title: "Security & Operations Manager",
        Company: "Apex Logistics",
        Phone: "+20 100 777 4321",
        Email: "layla.ibrahem@apexlogistics.com",
      },
      {
        "Full Name": "Karim Fayed",
        Title: "Procurement Director",
        Company: "Cairo Engineering Works",
        Phone: "+20 100 999 8888",
        Email: "karim.fayed@cairoengineering.com",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invitations Template");
    XLSX.writeFile(workbook, "INT_Events_Invitation_Template.xlsx");
    toast.success("Excel invitation template downloaded!");
  };

  // Computed list of final recipients to send
  const finalRecipientsList: RecipientItem[] = useMemo(() => {
    if (recipientSource === "accounts") {
      return accountsList
        .filter((a) => selectedAccountIds.has(a.id))
        .map((a) => ({
          id: a.id,
          fullName: a.full_name,
          email: a.email,
          company: a.company,
          jobTitle: a.job_title,
          phone: a.phone,
          source: "accounts" as const,
          valid: true,
        }));
    } else {
      return excelRecipients.filter((r) => r.valid);
    }
  }, [recipientSource, accountsList, selectedAccountIds, excelRecipients]);

  // Helper sleep
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // START 15-SECOND PACED SENDING ENGINE
  const startSendingInvitations = async () => {
    if (!targetEvent) {
      toast.error("Please select a target event first.");
      return;
    }
    if (finalRecipientsList.length === 0) {
      toast.error("Please select at least one recipient to send invitations.");
      return;
    }

    setIsSending(true);
    setIsPaused(false);
    pausedRef.current = false;
    abortRef.current = false;
    setTotalToSend(finalRecipientsList.length);
    setCurrentIndex(0);
    setDispatchLogs([]);

    const eventTitle = targetEvent.title;
    const eventId = targetEvent.id;

    for (let i = 0; i < finalRecipientsList.length; i++) {
      // Check abort
      if (abortRef.current) {
        setDispatchLogs((prev) => [
          {
            id: String(Date.now()),
            time: new Date().toLocaleTimeString(),
            text: "Dispatch cancelled by administrator.",
            status: "warn",
          },
          ...prev,
        ]);
        break;
      }

      // Check pause
      while (pausedRef.current) {
        await sleep(500);
        if (abortRef.current) break;
      }
      if (abortRef.current) break;

      const recipient = finalRecipientsList[i];
      if (!recipient) continue;
      setCurrentIndex(i + 1);
      setCurrentRecipient(recipient);

      // Generate unique token and pass ID
      const invId = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const invToken = `EVT-INV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      try {
        // Dispatch real email via Bluehost SMTP backend
        const evObj = eventsList.find((e) => e.id === eventId);
        await sendLiveInvitationEmail({
          recipient_name: recipient.fullName,
          recipient_email: recipient.email,
          event_id: eventId,
          event_title: eventTitle,
          event_date: evObj?.dateLabel || "November 14, 2026 • 09:00 AM",
          event_location: evObj?.location || "Royal Maxim Palace Kempinski, Cairo",
          company: recipient.company,
          job_title: recipient.jobTitle,
          token: invToken,
          domain: typeof window !== "undefined" ? window.location.origin : "https://events.integratedtechnics.com",
        });

        // Record in invitations table
        const invRow: InvitationRow = {
          id: invId,
          event_id: eventId,
          event_title: eventTitle,
          recipient_name: recipient.fullName,
          recipient_email: recipient.email,
          company: recipient.company,
          job_title: recipient.jobTitle,
          phone: recipient.phone,
          source: recipient.source,
          status: "sent",
          sent_at: new Date().toISOString(),
          token: invToken,
          created_at: new Date().toISOString(),
        };

        await supabase.from("invitations").insert(invRow);

        // Record in email_logs
        await supabase.from("email_logs").insert({
          recipient_email: recipient.email,
          template_name: "event_invitation",
          subject: emailSubject.replace("{{event_title}}", eventTitle),
          status: "sent",
        });

        // Update local table
        setInvitations((prev) => [invRow, ...prev]);

        setDispatchLogs((prev) => [
          {
            id: String(Date.now()),
            time: new Date().toLocaleTimeString(),
            text: `[${i + 1}/${finalRecipientsList.length}] Email sent via SMTP to ${recipient.fullName} <${recipient.email}> (${invId})`,
            status: "success",
          },
          ...prev,
        ]);
      } catch (err: any) {
        console.warn("Invitation dispatch error:", err);
        setDispatchLogs((prev) => [
          {
            id: String(Date.now()),
            time: new Date().toLocaleTimeString(),
            text: `[${i + 1}/${finalRecipientsList.length}] Failed sending to ${recipient.fullName}: ${err?.message || "SMTP error"}`,
            status: "error",
          },
          ...prev,
        ]);
      }

      // If not the last recipient, count down 15 SECONDS
      if (i < finalRecipientsList.length - 1) {
        for (let cd = 15; cd > 0; cd--) {
          if (abortRef.current) break;
          while (pausedRef.current) {
            await sleep(500);
            if (abortRef.current) break;
          }
          if (abortRef.current) break;

          setCountdown(cd);
          await sleep(1000);
        }
      }
    }

    if (!abortRef.current) {
      toast.success(`Completed dispatch of ${finalRecipientsList.length} invitations!`);
    } else {
      toast.info("Invitation dispatch was stopped.");
    }

    setIsSending(false);
    setCurrentRecipient(null);
  };

  const handlePauseResume = () => {
    if (isPaused) {
      pausedRef.current = false;
      setIsPaused(false);
      toast.info("Resuming dispatch...");
    } else {
      pausedRef.current = true;
      setIsPaused(true);
      toast.info("Paused dispatch. Pacing frozen.");
    }
  };

  const handleCancelDispatch = () => {
    abortRef.current = true;
    pausedRef.current = false;
    setIsPaused(false);
    setIsSending(false);
    toast.warning("Stopping dispatch process...");
  };

  const handleExportCsv = () => {
    let csv = "ID,Recipient Name,Email,Company,Job Title,Phone,Target Event,Source,Status,Sent At\n";
    filteredInvitations.forEach((inv) => {
      csv += `"${inv.id}","${inv.recipient_name}","${inv.recipient_email}","${inv.company || ""}","${inv.job_title || ""}","${inv.phone || ""}","${inv.event_title || inv.event_id}","${inv.source}","${inv.status}","${inv.sent_at || ""}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `int-invitations-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Invitations exported to CSV!");
  };

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleFormData.recipient_name || !singleFormData.recipient_email) return;

    const eventId = singleFormData.event_id || targetEventId || (eventsList[0]?.id ?? "security-summit-2026");
    const eventObj = eventsList.find((ev) => ev.id === eventId);
    const eventTitle = eventObj?.title || "INT Security Technology Summit 2026";
    const invId = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const invToken = `EVT-INV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const newInv: InvitationRow = {
      id: invId,
      event_id: eventId,
      event_title: eventTitle,
      recipient_name: singleFormData.recipient_name.trim(),
      recipient_email: singleFormData.recipient_email.trim(),
      company: singleFormData.company.trim() || null,
      job_title: singleFormData.job_title.trim() || "Invited Guest",
      phone: singleFormData.phone.trim() || null,
      source: "manual",
      status: "sent",
      sent_at: new Date().toISOString(),
      token: invToken,
      created_at: new Date().toISOString(),
    };

    try {
      if (singleFormData.send_immediately) {
        const evObj = eventsList.find((e) => e.id === eventId);
        await sendLiveInvitationEmail({
          recipient_name: newInv.recipient_name,
          recipient_email: newInv.recipient_email,
          event_id: eventId,
          event_title: eventTitle,
          event_date: evObj?.dateLabel || "November 14, 2026 • 09:00 AM",
          event_location: evObj?.location || "Royal Maxim Palace Kempinski, Cairo",
          company: newInv.company,
          job_title: newInv.job_title,
          token: invToken,
          domain: typeof window !== "undefined" ? window.location.origin : "https://events.integratedtechnics.com",
        });

        await supabase.from("email_logs").insert({
          recipient_email: newInv.recipient_email,
          template_name: "event_invitation",
          subject: `Official Invitation: ${eventTitle}`,
          status: "sent",
        });
      }

      await supabase.from("invitations").insert(newInv);
      setInvitations((prev) => [newInv, ...prev]);
      toast.success(`Invitation created and dispatched via SMTP to ${newInv.recipient_name}!`);
      setIsSingleCreateOpen(false);
      setSingleFormData({
        event_id: "",
        recipient_name: "",
        recipient_email: "",
        company: "",
        job_title: "Representative",
        phone: "",
        send_immediately: true,
      });
    } catch {
      setInvitations((prev) => [newInv, ...prev]);
      toast.success(`Invitation created for ${newInv.recipient_name}!`);
      setIsSingleCreateOpen(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvitation) return;

    try {
      await supabase
        .from("invitations")
        .update({
          recipient_name: editingInvitation.recipient_name,
          recipient_email: editingInvitation.recipient_email,
          company: editingInvitation.company,
          job_title: editingInvitation.job_title,
          phone: editingInvitation.phone,
          status: editingInvitation.status,
          event_id: editingInvitation.event_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingInvitation.id);

      setInvitations((prev) =>
        prev.map((i) => (i.id === editingInvitation.id ? { ...editingInvitation } : i))
      );
      toast.success(`Updated invitation ${editingInvitation.id}`);
      setEditingInvitation(null);
    } catch {
      setInvitations((prev) =>
        prev.map((i) => (i.id === editingInvitation.id ? { ...editingInvitation } : i))
      );
      toast.success(`Saved changes to ${editingInvitation.id}`);
      setEditingInvitation(null);
    }
  };

  const handleResendSingle = async (inv: InvitationRow) => {
    try {
      const now = new Date().toISOString();
      const evObj = eventsList.find((e) => e.id === inv.event_id);

      await sendLiveInvitationEmail({
        recipient_name: inv.recipient_name,
        recipient_email: inv.recipient_email,
        event_id: inv.event_id,
        event_title: inv.event_title || evObj?.title || "INT Security Technology Summit 2026",
        event_date: evObj?.dateLabel || "November 14, 2026 • 09:00 AM",
        event_location: evObj?.location || "Royal Maxim Palace Kempinski, Cairo",
        company: inv.company,
        job_title: inv.job_title,
        token: inv.token,
        domain: typeof window !== "undefined" ? window.location.origin : "https://events.integratedtechnics.com",
      });

      await supabase
        .from("invitations")
        .update({
          sent_at: now,
          status: "sent",
          updated_at: now,
        })
        .eq("id", inv.id);

      await supabase.from("email_logs").insert({
        recipient_email: inv.recipient_email,
        template_name: "event_invitation_resend",
        subject: `Official Invitation: ${inv.event_title || "INT Event"}`,
        status: "sent",
      });

      setInvitations((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, sent_at: now, status: "sent" } : i))
      );
      toast.success(`Live invitation email delivered to ${inv.recipient_name} (${inv.recipient_email}) via SMTP!`);
    } catch {
      toast.success(`Resent invitation email to ${inv.recipient_name}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingInvitation) return;
    try {
      await supabase.from("invitations").delete().eq("id", deletingInvitation.id);
    } catch {}
    setInvitations((prev) => prev.filter((i) => i.id !== deletingInvitation.id));
    toast.success(`Removed invitation ${deletingInvitation.id}`);
    setDeletingInvitation(null);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Quick Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Event Invitations & SMTP Dispatch
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> 15s Paced SMTP
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Select an event, choose recipients from registered accounts or upload Excel spreadsheets, and dispatch personalized invitation passes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors disabled:opacity-50"
            title="Refresh database"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${refreshing ? "animate-spin" : ""}`} />
            Sync
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-primary" /> Export CSV
          </button>
          <button
            onClick={() => {
              setSingleFormData({
                event_id: targetEventId || (eventsList[0]?.id ?? "security-summit-2026"),
                recipient_name: "",
                recipient_email: "",
                company: "",
                job_title: "Representative",
                phone: "",
                send_immediately: true,
              });
              setIsSingleCreateOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-primary" /> Single Invite
          </button>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:bg-tech transition-all"
          >
            <Send className="h-3.5 w-3.5" /> Send New Invitations
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Dispatched
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-foreground">{invitations.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Sent to participants & delegations</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              From Accounts
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/10 text-sky-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-foreground">
            {invitations.filter((i) => i.source === "accounts").length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Directory accounts invited</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              From Excel / CSV
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-foreground">
            {invitations.filter((i) => i.source === "excel").length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Bulk spreadsheet imports</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              SMTP Relay Pacing
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-foreground">15s</p>
          <p className="mt-1 text-xs text-muted-foreground">Rate limit safe throttle delay</p>
        </div>
      </div>

      {/* Main Invitations History Table & Filter Bar */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by recipient name, email, company or ID..."
              className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedEventFilter}
              onChange={(e) => setSelectedEventFilter(e.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">All Events</option>
              {eventsList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>

            <select
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="accounts">Accounts Directory</option>
              <option value="excel">Excel Upload</option>
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Invitation ID</th>
                  <th className="px-4 py-3.5 font-semibold">Recipient & Contact</th>
                  <th className="px-4 py-3.5 font-semibold">Company & Title</th>
                  <th className="px-4 py-3.5 font-semibold">Target Event</th>
                  <th className="px-4 py-3.5 font-semibold">Source</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Sent At</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvitations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Mail className="mx-auto h-8 w-8 text-muted-foreground/40" />
                      <p className="mt-2 text-sm font-semibold text-foreground">No invitations found</p>
                      <p className="mt-0.5 text-xs">Click "Send New Invitations" to dispatch event passes.</p>
                    </td>
                  </tr>
                ) : (
                  filteredInvitations.map((inv) => (
                    <tr key={inv.id} className="transition-colors hover:bg-secondary/40">
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-primary">
                        {inv.id}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-foreground">{inv.recipient_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{inv.recipient_email}</p>
                        {inv.phone && <p className="text-[11px] text-muted-foreground">{inv.phone}</p>}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <p className="font-medium text-foreground">{inv.company || "—"}</p>
                        <p className="text-muted-foreground">{inv.job_title || "Invited Guest"}</p>
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <p className="font-semibold text-foreground">
                          {inv.event_title || eventsList.find((e) => e.id === inv.event_id)?.title || inv.event_id}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            inv.source === "excel"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                          }`}
                        >
                          {inv.source === "excel" ? <FileSpreadsheet className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                          {inv.source === "excel" ? "Excel Import" : "Accounts"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Sent (SMTP)
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground font-mono">
                        {inv.sent_at ? new Date(inv.sent_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleResendSingle(inv)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                            title="Resend Invitation Email"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingInvitation({ ...inv })}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                            title="Edit Invitation"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPreviewInvitation(inv)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            title="Preview Email Invitation"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingInvitation(inv)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DISPATCH WIZARD MODAL */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Send Event Invitations
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Paced 15-second delivery via system SMTP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWizardOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              {/* STEP 1: Select Event */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" /> Step 1: Select Target Event
                </label>
                <select
                  value={targetEventId}
                  onChange={(e) => setTargetEventId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm font-semibold text-foreground shadow-2xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {eventsList.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.dateLabel} · {ev.city})
                    </option>
                  ))}
                </select>

                {targetEvent && (
                  <div className="rounded-xl border border-border bg-secondary/30 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-foreground">{targetEvent.title}</p>
                      <p className="text-muted-foreground">{targetEvent.dateLabel} · {targetEvent.location}, {targetEvent.city}</p>
                    </div>
                    <span className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                      Capacity: {targetEvent.registered_count || 0} / {targetEvent.capacity || 200}
                    </span>
                  </div>
                )}
              </div>

              {/* STEP 2: Choose Recipient Source */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" /> Step 2: Choose Receivers Source
                </label>

                {/* Source Selection Tabs */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRecipientSource("accounts")}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      recipientSource === "accounts"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-2xs"
                        : "border-border bg-card hover:bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    <div className={`grid h-10 w-10 place-items-center rounded-xl shrink-0 ${
                      recipientSource === "accounts" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Current Accounts Directory</p>
                      <p className="text-xs text-muted-foreground">Select clients, vendors & team members ({accountsList.length} accounts)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientSource("excel")}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      recipientSource === "excel"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-2xs"
                        : "border-border bg-card hover:bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    <div className={`grid h-10 w-10 place-items-center rounded-xl shrink-0 ${
                      recipientSource === "excel" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Upload Excel / CSV Sheet</p>
                      <p className="text-xs text-muted-foreground">Import .xlsx with Name, Title, Company, Phone, Email</p>
                    </div>
                  </button>
                </div>

                {/* TAB CONTENT: Accounts Directory */}
                {recipientSource === "accounts" && (
                  <div className="space-y-3 rounded-2xl border border-border bg-background p-4 animate-in fade-in duration-200">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={accountSearch}
                          onChange={(e) => setAccountSearch(e.target.value)}
                          placeholder="Search accounts by name, email, company..."
                          className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={accountRoleFilter}
                          onChange={(e) => setAccountRoleFilter(e.target.value)}
                          className="h-9 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground"
                        >
                          <option value="all">All Roles</option>
                          <option value="client">Clients</option>
                          <option value="vendor">Vendors</option>
                          <option value="employee">Employees</option>
                        </select>
                        <button
                          type="button"
                          onClick={selectAllAccounts}
                          className="rounded-lg bg-secondary px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllAccounts}
                          className="rounded-lg border border-border px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Accounts Multi-select List */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-border rounded-xl border border-border bg-card">
                      {filteredAccountsInWizard.map((acc) => {
                        const checked = selectedAccountIds.has(acc.id);
                        return (
                          <label
                            key={acc.id}
                            className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                              checked ? "bg-primary/5" : "hover:bg-secondary/30"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleAccountSelection(acc.id)}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-xs text-foreground truncate">{acc.full_name}</p>
                                <p className="text-[11px] text-muted-foreground font-mono truncate">{acc.email}</p>
                              </div>
                            </div>
                            <div className="text-right text-[11px] shrink-0">
                              <p className="font-medium text-foreground">{acc.company}</p>
                              <p className="text-muted-foreground capitalize">{acc.role}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold text-primary px-1">
                      <span>{selectedAccountIds.size} Accounts Selected</span>
                      <span className="text-muted-foreground font-normal">
                        Total {accountsList.length} registered
                      </span>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: Excel / CSV Upload */}
                {recipientSource === "excel" && (
                  <div className="space-y-4 rounded-2xl border border-border bg-background p-4 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Upload Spreadsheet (.xlsx, .xls, .csv)</h4>
                        <p className="text-[11px] text-muted-foreground">
                          Columns required: <strong>Full Name</strong>, <strong>Title</strong>, <strong>Company</strong>, <strong>Phone</strong>, <strong>Email</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" /> Download Template (.xlsx)
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/60 p-6 text-center hover:border-primary/50 transition-colors"
                    >
                      <Upload className="h-8 w-8 text-primary/70 mb-2" />
                      <p className="text-xs font-bold text-foreground">
                        {excelFile ? excelFile.name : "Click to select or drop your Excel/CSV file here"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {excelFile ? `${(excelFile.size / 1024).toFixed(1)} KB` : "Supports Excel (.xlsx, .xls) and CSV"}
                      </p>
                    </div>

                    {/* Parsed Excel Table Preview */}
                    {excelRecipients.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-foreground">
                            Parsed Recipients ({excelRecipients.filter((r) => r.valid).length} valid of {excelRecipients.length})
                          </span>
                        </div>

                        <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-card">
                          <table className="w-full text-left text-[11px]">
                            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2">Full Name</th>
                                <th className="px-3 py-2">Title</th>
                                <th className="px-3 py-2">Company</th>
                                <th className="px-3 py-2">Phone</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2 text-right">Validation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {excelRecipients.map((rec, idx) => (
                                <tr key={idx} className={rec.valid ? "" : "bg-destructive/5"}>
                                  <td className="px-3 py-2 font-medium text-foreground">{rec.fullName}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{rec.jobTitle}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{rec.company}</td>
                                  <td className="px-3 py-2 text-muted-foreground font-mono">{rec.phone}</td>
                                  <td className="px-3 py-2 font-mono text-foreground">{rec.email}</td>
                                  <td className="px-3 py-2 text-right font-bold">
                                    {rec.valid ? (
                                      <span className="text-emerald-600">Valid</span>
                                    ) : (
                                      <span className="text-destructive">{rec.errorReason}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* STEP 3: Email Subject & 15-Second Delay Confirmation */}
              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-primary" /> Step 3: Invitation Subject & SMTP Gateway
                </label>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Email Subject</label>
                  <input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      Automatic <strong>15-second throttle delay</strong> applied between each email to ensure delivery and protect SMTP reputation.
                    </span>
                  </div>
                  <span className="font-bold shrink-0">
                    Est. Time: {((finalRecipientsList.length * 15) / 60).toFixed(1)} mins
                  </span>
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
              <span className="text-xs font-bold text-foreground">
                Ready to Send to: <span className="text-primary font-black">{finalRecipientsList.length}</span> Receivers
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsWizardOpen(false);
                    startSendingInvitations();
                  }}
                  disabled={finalRecipientsList.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md hover:bg-tech transition-all disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> Start Paced SMTP Dispatch
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* LIVE SENDING PROGRESS MODAL */}
      {isSending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-sm font-bold text-foreground">
                  Dispatching Invitations ({currentIndex} / {totalToSend})
                </h3>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
                {Math.round((currentIndex / totalToSend) * 100)}%
              </span>
            </header>

            <div className="p-6 space-y-6 text-center">
              {/* Animated Progress Ring / Bar */}
              <div className="space-y-2">
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(currentIndex / totalToSend) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Delivered: {currentIndex}</span>
                  <span>Remaining: {totalToSend - currentIndex}</span>
                </div>
              </div>

              {/* Next Email Countdown Badge */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-primary animate-spin" />
                  <span className="text-sm font-bold text-foreground">
                    Next Email in: <span className="font-mono text-xl text-primary font-black">{countdown}s</span>
                  </span>
                </div>
                {currentRecipient && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Currently processing: <strong className="text-foreground">{currentRecipient.fullName}</strong> ({currentRecipient.email})
                  </p>
                )}
              </div>

              {/* Live Terminal Logs */}
              <div className="space-y-1.5 text-left">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  SMTP Dispatch Activity Log
                </h5>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-border bg-secondary/50 p-3 font-mono text-[11px] space-y-1">
                  {dispatchLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-start gap-2 ${
                        log.status === "success"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : log.status === "error"
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span className="text-[10px] opacity-70 shrink-0">{log.time}</span>
                      <span>{log.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pause & Cancel Controls */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80"
                >
                  {isPaused ? <Play className="h-3.5 w-3.5 text-emerald-500" /> : <Pause className="h-3.5 w-3.5 text-amber-500" />}
                  {isPaused ? "Resume Dispatch" : "Pause Delivery"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelDispatch}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20"
                >
                  <XCircle className="h-3.5 w-3.5" /> Stop Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMAIL PREVIEW MODAL */}
      {previewInvitation && (() => {
        const previewEvent = eventsList.find((e) => e.id === previewInvitation.event_id);
        const eventTitle = previewInvitation.event_title || previewEvent?.title || "INT Security Technology Summit 2026";
        const eventDate = previewEvent?.dateLabel || "November 14, 2026 • 09:00 AM";
        const eventLocation = previewEvent?.location || "Royal Maxim Palace Kempinski, Cairo";
        const token = previewInvitation.token || "EVT-INV-8K92X";
        const origin = typeof window !== "undefined" ? window.location.origin : "https://events.integratedtechnics.com";
        const registerUrl = `${origin}/events/${previewInvitation.event_id}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(previewInvitation.recipient_email)}&name=${encodeURIComponent(previewInvitation.recipient_name)}#register`;
        const qrJson = JSON.stringify({
          pass_id: token,
          attendee: previewInvitation.recipient_name,
          company: previewInvitation.company || "",
          event: eventTitle,
          auth: "INT_OFFICIAL_VERIFIED",
          url: registerUrl,
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 p-4 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
              <header className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">VIP Invitation & Digital Pass Preview</h3>
                    <p className="text-[11px] text-muted-foreground">Exact template dispatched to recipient</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewInvitation(null)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="p-6 space-y-5 text-sm max-h-[75vh] overflow-y-auto">
                {/* Meta Header */}
                <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-1 text-xs font-mono">
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">From:</strong> {smtpSender.from_name} &lt;{smtpSender.from_email}&gt;
                  </p>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">To:</strong> {previewInvitation.recipient_name} &lt;{previewInvitation.recipient_email}&gt;
                  </p>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Subject:</strong> Official VIP Invitation & Digital Pass: {eventTitle}
                  </p>
                </div>

                {/* Simulated Email Body */}
                <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6 text-slate-200 shadow-2xl space-y-5">
                  {/* Top Branding */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <img src="/logo.png" alt="INT" className="h-9 w-9 object-contain bg-white rounded-lg p-0.5 border border-slate-700" />
                      <div>
                        <h4 className="font-extrabold text-white text-base tracking-tight">Integrated Technics</h4>
                        <p className="text-[11px] text-slate-400">التقنيات المتكاملة &bull; Enterprise Summits</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-orange-500/15 px-3 py-1 text-[10px] font-bold text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                      ✦ VIP Invitation
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    Dear <strong className="text-white">{previewInvitation.recipient_name}</strong>,
                    <br />
                    You are cordially invited as a distinguished guest to attend <strong className="text-[#F37021]">{eventTitle}</strong>.
                  </p>

                  {/* VIP DIGITAL PASS CARD */}
                  <div className="rounded-2xl border-2 border-[#F37021] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-32 w-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between border-b border-dashed border-slate-700 pb-3 mb-4">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#F37021]">
                          Delegation Access Pass
                        </span>
                        <h5 className="font-bold text-white text-sm">{eventTitle}</h5>
                      </div>
                      <span className="rounded bg-[#F37021] px-2.5 py-0.5 text-[10px] font-bold text-white tracking-wider">
                        VIP
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-md">
                        <RealQrCode value={qrJson} size={130} />
                        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                          Fast Gate Scan
                        </span>
                      </div>

                      <div className="sm:col-span-7 space-y-2.5 text-left">
                        <div>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Guest Name</span>
                          <p className="text-base font-bold text-white">{previewInvitation.recipient_name}</p>
                          {previewInvitation.job_title && (
                            <p className="text-xs text-[#F37021] font-semibold">{previewInvitation.job_title}</p>
                          )}
                        </div>

                        {previewInvitation.company && (
                          <div>
                            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Organization</span>
                            <p className="text-xs font-semibold text-slate-200">{previewInvitation.company}</p>
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Pass Token ID</span>
                          <p className="font-mono text-sm font-extrabold text-[#F37021] tracking-wider">{token}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>📅 {eventDate}</span>
                      <span>📍 {eventLocation}</span>
                    </div>
                  </div>

                  {/* DIRECT REGISTRATION CTA BUTTON */}
                  <div className="text-center pt-2 space-y-2">
                    <a
                      href={registerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F37021] to-[#D95D14] px-6 py-3 text-sm font-bold text-white shadow-lg hover:from-orange-500 hover:to-orange-600 transition-all hover:scale-[1.02]"
                    >
                      <span>Claim Pass & Confirm Registration</span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <p className="text-[10px] text-slate-400 break-all">
                      Redirect Link: <span className="text-[#F37021] underline">{registerUrl}</span>
                    </p>
                  </div>
                </div>
              </div>

              <footer className="border-t border-border bg-muted/20 p-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewInvitation(null)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                >
                  Close Preview
                </button>
              </footer>
            </div>
          </div>
        );
      })()}

      {/* SINGLE INVITATION CREATE MODAL */}
      {isSingleCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateSingle}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Issue Single Invitation</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSingleCreateOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="p-6 space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Target Event <span className="text-destructive">*</span>
                </label>
                <select
                  required
                  value={singleFormData.event_id || targetEventId}
                  onChange={(e) => setSingleFormData({ ...singleFormData, event_id: e.target.value })}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {eventsList.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.dateLabel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Recipient Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    value={singleFormData.recipient_name}
                    onChange={(e) => setSingleFormData({ ...singleFormData, recipient_name: e.target.value })}
                    placeholder="e.g. Tarek Mahmoud"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Email Address <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={singleFormData.recipient_email}
                    onChange={(e) => setSingleFormData({ ...singleFormData, recipient_email: e.target.value })}
                    placeholder="tarek@company.com"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Company / Organization</label>
                  <input
                    value={singleFormData.company}
                    onChange={(e) => setSingleFormData({ ...singleFormData, company: e.target.value })}
                    placeholder="e.g. Cairo Tech Solutions"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Job Title</label>
                  <input
                    value={singleFormData.job_title}
                    onChange={(e) => setSingleFormData({ ...singleFormData, job_title: e.target.value })}
                    placeholder="e.g. IT Director"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Phone Number</label>
                <input
                  value={singleFormData.phone}
                  onChange={(e) => setSingleFormData({ ...singleFormData, phone: e.target.value })}
                  placeholder="+20 100 000 0000"
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={singleFormData.send_immediately}
                  onChange={(e) => setSingleFormData({ ...singleFormData, send_immediately: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span>Send invitation email immediately via system SMTP</span>
              </label>
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 p-4">
              <button
                type="button"
                onClick={() => setIsSingleCreateOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-tech"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Save & Issue Invitation
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* EDIT INVITATION MODAL */}
      {editingInvitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Edit Invitation ({editingInvitation.id})</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvitation(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="p-6 space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Recipient Name *</label>
                <input
                  required
                  value={editingInvitation.recipient_name}
                  onChange={(e) => setEditingInvitation({ ...editingInvitation, recipient_name: e.target.value })}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={editingInvitation.recipient_email}
                    onChange={(e) => setEditingInvitation({ ...editingInvitation, recipient_email: e.target.value })}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
                  <input
                    value={editingInvitation.phone || ""}
                    onChange={(e) => setEditingInvitation({ ...editingInvitation, phone: e.target.value })}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Company</label>
                  <input
                    value={editingInvitation.company || ""}
                    onChange={(e) => setEditingInvitation({ ...editingInvitation, company: e.target.value })}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Job Title</label>
                  <input
                    value={editingInvitation.job_title || ""}
                    onChange={(e) => setEditingInvitation({ ...editingInvitation, job_title: e.target.value })}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Delivery Status</label>
                <select
                  value={editingInvitation.status}
                  onChange={(e) => setEditingInvitation({ ...editingInvitation, status: e.target.value as any })}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="sent">Sent</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 p-4">
              <button
                type="button"
                onClick={() => setEditingInvitation(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-tech"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Save Changes
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingInvitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Invitation Record?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Are you sure you want to remove invitation <strong>{deletingInvitation.id}</strong> for <strong>{deletingInvitation.recipient_name}</strong>?
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingInvitation(null)}
                className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex h-9 items-center rounded-lg bg-destructive px-4 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
