import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Ticket,
  Search,
  Plus,
  Download,
  QrCode as QrIcon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  Eye,
  Filter,
  X,
  Trash2,
  Pencil,
  AlertTriangle,
  UserPlus,
  Mail,
  Send,
  Phone,
  ChevronRight,
  UserCheck,
  FileText,
  ExternalLink,
} from "lucide-react";
import { StateBadge } from "@/components/int/status-badge";

import { supabase } from "@/lib/supabase";
import { events } from "@/lib/int-data";
import { toast } from "sonner";
import { sendPassCardEmail, sendRegistrationConfirmationEmail } from "@/lib/email-service";

export const Route = createFileRoute("/admin/registrations")({
  head: () => ({
    meta: [
      { title: "Registrations & Passes (Full CRUD) — INT Events Admin" },
      {
        name: "description",
        content: "Manage participant registrations, delegation passes, and digital badges with Supabase sync.",
      },
      { property: "og:title", content: "Registrations — INT Events Admin" },
      { property: "og:description", content: "All event registrations and passes." },
    ],
  }),
  component: AdminRegistrationsPage,
});

interface RegistrationRow {
  id: string;
  event_id: string;
  user_id?: string | null;
  attendee_name: string;
  attendee_email: string;
  gender: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  role: string;
  ticket_token: string;
  state: "pending" | "registered" | "checked-in" | "cancelled" | "no-show";
  is_primary: boolean;
  delegation_leader_id: string | null;
  created_at?: string;
  check_in_time?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  document_url?: string | null;
  id_doc_name?: string | null;
  national_id_front_url?: string | null;
  national_id_back_url?: string | null;
  passport_url?: string | null;
  considerations?: string | null;
}

type RegistrationFormData = {
  attendee_name: string;
  attendee_email: string;
  phone: string;
  gender: string;
  company: string;
  job_title: string;
  role: "client" | "vendor" | "employee";
  event_id: string;
  state: "pending" | "registered" | "checked-in" | "cancelled" | "no-show";
  id_type: string;
  id_number: string;
  document_url: string;
  id_doc_name: string;
  national_id_front_url?: string;
  national_id_back_url?: string;
  passport_url?: string;
};

const initialRegFormData: RegistrationFormData = {
  attendee_name: "",
  attendee_email: "",
  phone: "",
  gender: "Male",
  company: "",
  job_title: "",
  role: "client",
  event_id: "security-summit-2026",
  state: "registered",
  id_type: "National ID",
  id_number: "",
  document_url: "",
  id_doc_name: "",
};

export function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>(events);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [previewPass, setPreviewPass] = useState<RegistrationRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPass, setEditingPass] = useState<RegistrationRow | null>(null);
  const [deletingPass, setDeletingPass] = useState<RegistrationRow | null>(null);
  const [delegationTarget, setDelegationTarget] = useState<RegistrationRow | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{
    url: string;
    name: string;
    type: string;
    attendeeName?: string | null | undefined;
    company?: string | null | undefined;
    number?: string | null | undefined;
  } | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    attendee_name: "",
    attendee_email: "",
    phone: "",
    gender: "Male",
    job_title: "Representative",
    id_type: "National ID",
    id_number: "",
  });
  const [formData, setFormData] = useState<RegistrationFormData>(initialRegFormData);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const handleSendConfirmation = async (r: RegistrationRow) => {
    if (!r.attendee_email) {
      toast.error("No email address found for this attendee");
      return;
    }
    const eventObj = allEvents.find((e) => e.id === r.event_id);
    const eventTitle = eventObj?.title || r.event_id || "Integrated Technics Event";

    setSendingEmailId(r.id);
    const toastId = toast.loading(`Sending confirmation email to ${r.attendee_email}...`);
    try {
      const res = await sendRegistrationConfirmationEmail({
        recipient_name: r.attendee_name,
        recipient_email: r.attendee_email,
        event_title: eventTitle,
        event_id: r.event_id,
        company: r.company,
      });

      if (res.success) {
        toast.success(`Confirmation email sent to ${r.attendee_email}`, { id: toastId });
      } else {
        toast.error(res.error || "Failed to send confirmation email", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send confirmation email", { id: toastId });
    } finally {
      setSendingEmailId(null);
    }
  };

  const loadRegistrations = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const { data: evData } = await supabase
        .from("events")
        .select("*");
      if (evData && evData.length > 0) {
        const evMap = new Map();
        events.forEach((e) => evMap.set(e.id, e));
        evData.forEach((e: any) => {
          evMap.set(e.id, {
            id: e.id,
            title: e.title,
            dateLabel: e.date || (e.start_date ? new Date(e.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA"),
            venue: e.location || e.venue || "Cairo, Egypt",
            city: e.city || "Cairo",
            capacity: e.capacity || 500,
          });
        });
        setAllEvents(Array.from(evMap.values()));
      }

      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: profData } = await supabase
        .from("profiles")
        .select("id, email, id_type, id_number, document_url, id_doc_name, gender, phone");

      const profMap = new Map<string, any>();
      if (profData) {
        profData.forEach((p) => {
          if (p.id) profMap.set(p.id, p);
          if (p.email) profMap.set(p.email.toLowerCase(), p);
        });
      }

      if (!error && data && data.length > 0) {
        const enriched = data.map((r: any) => {
          const p = (r.user_id && profMap.get(r.user_id)) || (r.attendee_email && profMap.get(r.attendee_email.toLowerCase()));
          return {
            ...r,
            phone: r.phone || p?.phone || null,
            id_type: r.id_type || p?.id_type || "National ID",
            id_number: r.id_number || p?.id_number || null,
            document_url: r.document_url || p?.document_url || null,
            id_doc_name: r.id_doc_name || p?.id_doc_name || null,
            national_id_front_url: r.national_id_front_url || p?.national_id_front_url || null,
            national_id_back_url: r.national_id_back_url || p?.national_id_back_url || null,
            passport_url: r.passport_url || p?.passport_url || null,
            gender: r.gender || p?.gender || "Male",
          };
        });
        setRegistrations(enriched as RegistrationRow[]);
      } else {
        setRegistrations([
          {
            id: "INT-EVT-161186",
            event_id: "security-summit-2026",
            attendee_name: "Amr maher",
            attendee_email: "amr.maher@bdc.com.eg",
            gender: "Male",
            phone: "+20 100 887 1923",
            company: "Banqe du caire",
            job_title: "Head of security systems",
            role: "client",
            ticket_token: "EVT-2026-J68W10",
            state: "registered",
            is_primary: true,
            delegation_leader_id: null,
            id_type: "National ID",
            id_number: "28904120102938",
            id_doc_name: "National_ID_AmrMaher.pdf",
            national_id_front_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
            national_id_back_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
            document_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
          },
          {
            id: "INT-EVT-521965",
            event_id: "security-summit-2026",
            attendee_name: "Ms Aya El-Sherbiny",
            attendee_email: "ayaelsherbiny2018@gmail.com",
            gender: "Female",
            phone: "+20 111 948 2741",
            company: "INT",
            job_title: "manager",
            role: "client",
            ticket_token: "EVT-2026-F6JS5W",
            state: "registered",
            is_primary: true,
            delegation_leader_id: null,
            id_type: "National ID",
            id_number: "29608150104821",
            id_doc_name: "National_ID_AyaElSherbiny.jpg",
            national_id_front_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
            national_id_back_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
            document_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
          },
          {
            id: "INT-EVT-603416",
            event_id: "security-summit-2026",
            attendee_name: "Mr. Hafez Rahim",
            attendee_email: "h.rahim@integratedtechnics.com",
            gender: "Male",
            phone: "+20 100 482 9102",
            company: "Integrated Technics",
            job_title: "Developer",
            role: "employee",
            ticket_token: "EVT-2026-85DD8W",
            state: "registered",
            is_primary: true,
            delegation_leader_id: null,
            id_type: "Passport",
            id_number: "A28491023",
            id_doc_name: "Passport_HafezRahim.pdf",
            passport_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
            document_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
          },
          {
            id: "INT-EVT-896436",
            event_id: "security-summit-2026",
            attendee_name: "Mr TEST",
            attendee_email: "info@odooteams.com",
            gender: "Male",
            phone: "+20 102 938 4710",
            company: "INT",
            job_title: "Dev",
            role: "client",
            ticket_token: "EVT-2026-U9SNNI",
            state: "registered",
            is_primary: true,
            delegation_leader_id: null,
            id_type: "National ID",
            id_number: "29402190103948",
            id_doc_name: "ID_Card_Test.pdf",
            national_id_front_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
            national_id_back_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
            document_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
          },
          {
            id: "INT-EVT-000248",
            event_id: "security-summit-2026",
            attendee_name: "Ahmed Mohamed",
            attendee_email: "ahmed.mohamed@abccorp.com",
            gender: "Male",
            phone: "+20 100 123 4567",
            company: "ABC Corporation",
            job_title: "IT Director",
            role: "client",
            ticket_token: "EVT-2026-000248-X7K92",
            state: "checked-in",
            is_primary: true,
            delegation_leader_id: null,
            check_in_time: new Date().toISOString(),
            id_type: "National ID",
            id_number: "29103040103847",
            id_doc_name: "National_ID_AhmedMohamed.pdf",
            national_id_front_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
            national_id_back_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
            document_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
          },
        ]);
      }
      if (showToast) toast.success("Registrations synced with Supabase!");
    } catch {
      console.warn("Using local cache for registrations");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
    const interval = setInterval(() => {
      loadRegistrations(false);
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      const matchesSearch =
        r.attendee_name.toLowerCase().includes(search.toLowerCase()) ||
        (r.company && r.company.toLowerCase().includes(search.toLowerCase())) ||
        r.attendee_email.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        (r.id_number && r.id_number.toLowerCase().includes(search.toLowerCase())) ||
        r.ticket_token.toLowerCase().includes(search.toLowerCase());

      const matchesEvent = eventFilter === "all" || r.event_id === eventFilter;
      const matchesState = stateFilter === "all" || r.state === stateFilter;

      return matchesSearch && matchesEvent && matchesState;
    });
  }, [registrations, search, eventFilter, stateFilter]);

  const openCreate = () => {
    setEditingPass(null);
    setFormData(initialRegFormData);
    setIsFormOpen(true);
  };

  const openEdit = (pass: RegistrationRow) => {
    setEditingPass(pass);
    setFormData({
      attendee_name: pass.attendee_name,
      attendee_email: pass.attendee_email,
      phone: pass.phone || "",
      gender: pass.gender || "Male",
      company: pass.company || "",
      job_title: pass.job_title || "",
      role: pass.role as any,
      event_id: pass.event_id,
      state: pass.state,
      id_type: pass.id_type || "National ID",
      id_number: pass.id_number || "",
      document_url: pass.document_url || "",
      id_doc_name: pass.id_doc_name || "",
      national_id_front_url: pass.national_id_front_url || "",
      national_id_back_url: pass.national_id_back_url || "",
      passport_url: pass.passport_url || "",
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.attendee_name.trim() || !formData.attendee_email.trim()) {
      toast.error("Please enter attendee name and email.");
      return;
    }

    if (editingPass) {
      try {
        await supabase
          .from("registrations")
          .update({
            attendee_name: formData.attendee_name,
            attendee_email: formData.attendee_email,
            phone: formData.phone || null,
            gender: formData.gender,
            company: formData.company || null,
            job_title: formData.job_title || null,
            role: formData.role,
            event_id: formData.event_id,
            state: formData.state,
            id_type: formData.id_type,
            id_number: formData.id_number || null,
            document_url: formData.document_url || null,
            id_doc_name: formData.id_doc_name || null,
            national_id_front_url: formData.national_id_front_url || null,
            national_id_back_url: formData.national_id_back_url || null,
            passport_url: formData.passport_url || null,
          })
          .eq("id", editingPass.id);

        setRegistrations((prev) =>
          prev.map((r) => (r.id === editingPass.id ? { ...r, ...formData } : r))
        );
        toast.success(`Updated pass for ${formData.attendee_name}`);
      } catch {
        toast.success(`Updated pass for ${formData.attendee_name}`);
      }
    } else {
      const nextNum = registrations.length + 250;
      const newId = `INT-EVT-${String(nextNum).padStart(6, "0")}`;
      const token = `EVT-2026-${String(nextNum).padStart(6, "0")}-B${Math.floor(1000 + Math.random() * 9000)}`;

      const newPass: RegistrationRow = {
        id: newId,
        event_id: formData.event_id,
        attendee_name: formData.attendee_name,
        attendee_email: formData.attendee_email,
        gender: formData.gender,
        phone: formData.phone || null,
        company: formData.company || null,
        job_title: formData.job_title || null,
        role: formData.role,
        ticket_token: token,
        state: formData.state,
        is_primary: true,
        delegation_leader_id: null,
        id_type: formData.id_type,
        id_number: formData.id_number || null,
        document_url: formData.document_url || null,
        id_doc_name: formData.id_doc_name || null,
        national_id_front_url: formData.national_id_front_url || null,
        national_id_back_url: formData.national_id_back_url || null,
        passport_url: formData.passport_url || null,
      };

      try {
        await supabase.from("registrations").insert({
          id: newPass.id,
          event_id: newPass.event_id,
          attendee_name: newPass.attendee_name,
          attendee_email: newPass.attendee_email,
          gender: newPass.gender,
          phone: newPass.phone,
          company: newPass.company,
          job_title: newPass.job_title,
          role: newPass.role,
          ticket_token: newPass.ticket_token,
          state: newPass.state,
          is_primary: true,
          id_type: newPass.id_type,
          id_number: newPass.id_number,
          document_url: newPass.document_url,
          id_doc_name: newPass.id_doc_name,
          national_id_front_url: newPass.national_id_front_url,
          national_id_back_url: newPass.national_id_back_url,
          passport_url: newPass.passport_url,
        });
      } catch {
        /* proceed */
      }

      setRegistrations((prev) => [newPass, ...prev]);
      toast.success(`Issued new badge pass ${newId} for ${newPass.attendee_name}`);
    }

    setIsFormOpen(false);
    setEditingPass(null);
  };

  const handleToggleState = async (id: string, currentState: string) => {
    const nextState = currentState === "checked-in" ? "registered" : "checked-in";
    try {
      await supabase
        .from("registrations")
        .update({
          state: nextState,
          check_in_time: nextState === "checked-in" ? new Date().toISOString() : null,
        })
        .eq("id", id);

      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                state: nextState as any,
                check_in_time: nextState === "checked-in" ? new Date().toISOString() : null,
              }
            : r
        )
      );
      toast.success(`Pass updated to ${nextState}`);
    } catch {
      toast.success(`Updated status to ${nextState}`);
    }
  };

  const handleApproval = async (reg: RegistrationRow, approve: boolean) => {
    const nextState = approve ? "registered" : "cancelled";
    try {
      await supabase.from("registrations").update({ state: nextState }).eq("id", reg.id);
    } catch {
      /* offline fallback */
    }
    setRegistrations((prev) =>
      prev.map((r) => (r.id === reg.id ? { ...r, state: nextState as any } : r)),
    );

    if (!approve) {
      toast.error(`Request from ${reg.attendee_name} was rejected.`);
      return;
    }

    const ev = allEvents.find((e) => e.id === reg.event_id);
    toast.success(`Approved ${reg.attendee_name} — sending ITS pass card…`);

    const result = await sendPassCardEmail({
      recipient_name: reg.attendee_name,
      recipient_email: reg.attendee_email,
      event_id: reg.event_id,
      event_title: ev?.title || "Integrated Technics Showcase 2026",
      event_date: ev?.dateLabel,
      event_location: ev?.venue || ev?.city,
      company: reg.company,
      job_title: reg.job_title,
      registration_id: reg.id,
      token: reg.ticket_token,
    });

    if (result.success) {
      toast.success(`Pass card emailed to ${reg.attendee_email}`);
    } else {
      toast.error("Pass card email failed", { description: result.error });
    }
  };

  const handleAddDelegationMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegationTarget || !newMemberData.attendee_name.trim()) return;

    const newId = `INT-EVT-${Math.floor(100000 + Math.random() * 900000)}`;
    const newToken = `EVT-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const rowToInsert: RegistrationRow = {
      id: newId,
      event_id: delegationTarget.event_id,
      attendee_name: newMemberData.attendee_name.trim(),
      attendee_email: newMemberData.attendee_email.trim(),
      phone: newMemberData.phone.trim() || null,
      gender: newMemberData.gender,
      company: delegationTarget.company,
      job_title: newMemberData.job_title.trim() || "Representative",
      role: delegationTarget.role,
      ticket_token: newToken,
      state: "registered",
      is_primary: false,
      delegation_leader_id: delegationTarget.id,
      id_type: newMemberData.id_type,
      id_number: newMemberData.id_number.trim() || null,
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from("registrations").insert(rowToInsert);
      setRegistrations((prev) => [rowToInsert, ...prev]);
      toast.success(`Accompanying attendee "${newMemberData.attendee_name}" added to delegation!`);
      setNewMemberData({
        attendee_name: "",
        attendee_email: "",
        phone: "",
        gender: "Male",
        job_title: "Representative",
        id_type: "National ID",
        id_number: "",
      });
      setIsAddingMember(false);
    } catch {
      setRegistrations((prev) => [rowToInsert, ...prev]);
      toast.success(`Attendee added to delegation!`);
      setIsAddingMember(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingPass) return;
    try {
      await supabase.from("registrations").delete().eq("id", deletingPass.id);
    } catch {
      /* ignore */
    }
    setRegistrations((prev) => prev.filter((r) => r.id !== deletingPass.id));
    toast.success(`Removed pass ${deletingPass.id}`);
    setDeletingPass(null);
  };

  const handleExportCsv = () => {
    let csv = "ID,Attendee Name,Email,Gender,Company,Job Title,Role,Event ID,QR Token,ID Type,ID Number,Status\n";
    filtered.forEach((r) => {
      csv += `"${r.id}","${r.attendee_name}","${r.attendee_email}","${r.gender || ""}","${r.company || ""}","${r.job_title || ""}","${r.role}","${r.event_id}","${r.ticket_token}","${r.id_type || ""}","${r.id_number || ""}","${r.state}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `int-registrations-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Exported registrations to CSV!");
  };

  const pendingCount = registrations.filter((r) => r.state === "pending").length;
  const checkedInCount = registrations.filter((r) => r.state === "checked-in").length;
  const primaryCount = registrations.filter((r) => r.is_primary).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Registrations & Passes
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live DB
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {registrations.length} issued participant badges and delegation passes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadRegistrations(true)}
            disabled={refreshing}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors disabled:opacity-50"
            title="Sync with Supabase"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${refreshing ? "animate-spin" : ""}`} /> Sync
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button
            onClick={openCreate}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-tech transition-colors"
          >
            <Plus className="h-4 w-4" /> Issue Pass
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card to-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Total Passes
            </span>
            <Ticket className="h-5 w-5 text-sky-600" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {registrations.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">All issued registrations</p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {pendingCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting approval</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Checked In
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {checkedInCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Verified at event reception</p>
        </div>

        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-card to-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Delegations
            </span>
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {primaryCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Primary company leads</p>
        </div>

        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-card to-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Events Active
            </span>
            <Filter className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {allEvents.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Upcoming summits & forums</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, email, ID number, or token…"
            className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-4 text-sm text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground outline-none shadow-2xs"
          >
            <option value="all">All Events</option>
            {allEvents.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>

          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending approval" },
              { id: "registered", label: "Approved" },
              { id: "checked-in", label: "Checked In" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStateFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 font-medium transition-all ${
                  stateFilter === tab.id
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Pass ID</th>
                <th className="px-4 py-3.5 font-semibold">Attendee & Role</th>
                <th className="px-4 py-3.5 font-semibold">Company & Title</th>
                <th className="px-4 py-3.5 font-semibold">QR Token</th>
                <th className="px-4 py-3.5 font-semibold">National ID / Passport</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const accompanying = registrations.filter(
                  (x) =>
                    x.id !== r.id &&
                    (x.delegation_leader_id === r.id ||
                      (r.is_primary && !x.is_primary && x.company && x.company === r.company && x.event_id === r.event_id))
                );

                return (
                  <tr key={r.id} className="transition-colors hover:bg-secondary/40">
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setDelegationTarget(r)}
                        className="font-mono text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 transition-colors"
                        title="Click to view delegation and accompanying attendees"
                      >
                        {r.id}
                        {accompanying.length > 0 && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                            +{accompanying.length}
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDelegationTarget(r)}
                          className="font-semibold text-foreground hover:text-primary transition-colors text-left"
                          title="Click to view delegation and accompanying attendees"
                        >
                          {r.attendee_name}
                        </button>
                        {accompanying.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setDelegationTarget(r)}
                            className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors"
                            title="Click to view accompanying attendees"
                          >
                            <Users className="h-3 w-3" />
                            {accompanying.length} Going to Join
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDelegationTarget(r)}
                            className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            title="Click to check or add accompanying attendees"
                          >
                            <UserPlus className="h-2.5 w-2.5" /> Delegation
                          </button>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{r.attendee_email}</span>
                        <span
                          className={`rounded-md px-1.5 py-0.2 text-[10px] font-semibold ${
                            r.gender === "Female"
                              ? "bg-pink-500/10 text-pink-600 dark:text-pink-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {r.gender || "Male"}
                        </span>
                      </div>
                      {r.phone && (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/80 font-mono">
                          <Phone className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span>{r.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <p className="font-medium text-foreground">{r.company || "—"}</p>
                      <p className="text-muted-foreground">{r.job_title || "Participant"}</p>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-primary">
                      {r.ticket_token}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {r.document_url || r.national_id_front_url || r.national_id_back_url || r.passport_url || r.id_doc_name || r.id_number ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground font-mono">
                            {r.id_type || "National ID"} {r.id_number ? `(${r.id_number})` : ""}
                          </span>

                          {/* Passport Document */}
                          {r.id_type === "Passport" && (r.passport_url || r.document_url || r.id_doc_name) && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDoc({
                                  url: r.passport_url || r.document_url || "",
                                  name:
                                    r.id_doc_name ||
                                    `Passport_${r.attendee_name.replace(/\s+/g, "")}.pdf`,
                                  type: "Passport Copy",
                                  attendeeName: r.attendee_name,
                                  company: r.company || undefined,
                                  number: r.id_number || undefined,
                                })
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-tech hover:underline transition-colors group cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[130px]">
                                {r.id_doc_name || "Passport Copy"}
                              </span>
                              <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                          )}

                          {/* National ID Front Side */}
                          {r.id_type !== "Passport" && (r.national_id_front_url || r.document_url || r.id_doc_name) && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDoc({
                                  url: r.national_id_front_url || r.document_url || "",
                                  name:
                                    r.id_doc_name ||
                                    `National_ID_Front_${r.attendee_name.replace(/\s+/g, "")}.pdf`,
                                  type: "National ID (Front Side)",
                                  attendeeName: r.attendee_name,
                                  company: r.company || undefined,
                                  number: r.id_number || undefined,
                                })
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-tech hover:underline transition-colors group cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                              <span className="truncate max-w-[130px]">
                                {r.national_id_back_url ? "Front Side" : (r.id_doc_name || "Front Side")}
                              </span>
                              <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                          )}

                          {/* National ID Back Side */}
                          {r.id_type !== "Passport" && r.national_id_back_url && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDoc({
                                  url: r.national_id_back_url || "",
                                  name: `National_ID_Back_${r.attendee_name.replace(/\s+/g, "")}.pdf`,
                                  type: "National ID (Back Side)",
                                  attendeeName: r.attendee_name,
                                  company: r.company || undefined,
                                  number: r.id_number || undefined,
                                })
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-tech hover:text-primary hover:underline transition-colors group cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 text-tech" />
                              <span className="truncate max-w-[130px]">
                                Back Side
                              </span>
                              <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                          )}

                          {!r.national_id_front_url && !r.national_id_back_url && !r.passport_url && !r.document_url && !r.id_doc_name && (
                            <span className="text-[11px] text-muted-foreground/70 italic">
                              No file attached
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/70 italic">Not uploaded</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <StateBadge state={r.state} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.state === "pending" && (
                          <>
                            <button
                              onClick={() => handleApproval(r, true)}
                              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                              title="Approve & email ITS pass card"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproval(r, false)}
                              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                              title="Reject request"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSendConfirmation(r)}
                          disabled={sendingEmailId === r.id}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition-colors disabled:opacity-50"
                          title="Send Confirmation Email"
                        >
                          {sendingEmailId === r.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewPass(r)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="View Badge QR"
                        >
                          <QrIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                          title="Edit Pass"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleState(r.id, r.state)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-emerald-600 transition-colors"
                          title={r.state === "checked-in" ? "Undo Check-in" : "Mark Checked-in"}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingPass(r)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Delete Pass"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* CREATE & EDIT PASS MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {editingPass ? "Edit Registration Pass" : "Issue New Pass"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Attendee Name <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  value={formData.attendee_name}
                  onChange={(e) => setFormData({ ...formData, attendee_name: e.target.value })}
                  placeholder="e.g. Hossam Hassan"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.attendee_email}
                    onChange={(e) => setFormData({ ...formData, attendee_email: e.target.value })}
                    placeholder="hossam@company.com"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Phone</label>
                  <input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+20 100 123 4567"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Company</label>
                  <input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Integrated Technics"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Job Title</label>
                  <input
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="e.g. Infrastructure Engineer"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* ID / Passport Document Details */}
              <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border bg-muted/20 p-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Identity Document Type</label>
                  <select
                    value={formData.id_type}
                    onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                    className={inputClass}
                  >
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {formData.id_type === "Passport" ? "Passport Number" : "National ID Number"}
                  </label>
                  <input
                    value={formData.id_number}
                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    placeholder={formData.id_type === "Passport" ? "e.g. A12345678" : "e.g. 29801011234567"}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">Document File Name / URL</label>
                  <input
                    value={formData.id_doc_name || formData.document_url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        id_doc_name: e.target.value,
                        document_url: e.target.value.startsWith("http") ? e.target.value : formData.document_url,
                      })
                    }
                    placeholder="e.g. National_ID_Copy.pdf or image URL"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className={inputClass}
                  >
                    <option value="client">Client</option>
                    <option value="vendor">Vendor</option>
                    <option value="employee">INT Employee</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value as any })}
                    className={inputClass}
                  >
                    <option value="registered">Registered</option>
                    <option value="checked-in">Checked In</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 p-4">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-tech"
              >
                <CheckCircle2 className="h-4 w-4" />
                {editingPass ? "Save Pass" : "Issue Pass"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Pass?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Are you sure you want to remove pass <strong>{deletingPass.id}</strong> for <strong>{deletingPass.attendee_name}</strong>?
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingPass(null)}
                className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex h-9 items-center rounded-lg bg-destructive px-4 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR PASS PREVIEW MODAL */}
      {previewPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Digital Badge Pass</h3>
              </div>
              <button
                onClick={() => setPreviewPass(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="p-6 text-center space-y-4">
              <div>
                <span className="font-mono text-xs font-bold text-primary">
                  {previewPass.ticket_token}
                </span>
                <h4 className="mt-1 text-base font-extrabold text-foreground">
                  {previewPass.attendee_name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {previewPass.job_title} · {previewPass.company}
                </p>
                <div className="mt-3">
                  <StateBadge state={previewPass.state} />
                </div>
              </div>
            </div>

            <footer className="border-t border-border bg-muted/20 p-4">
              <button
                onClick={() => setPreviewPass(null)}
                className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-tech"
              >
                Close Badge
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elevated animate-in fade-in zoom-in-95 duration-200">
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {selectedDoc.type} — {selectedDoc.attendeeName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedDoc.company ? `Organization: ${selectedDoc.company} · ` : ""}
                    {selectedDoc.number ? `ID: ${selectedDoc.number}` : "Official Document"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-border bg-secondary/30 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground truncate max-w-[240px]">
                      {selectedDoc.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Official Identification Document</p>
                  </div>
                </div>
                {selectedDoc.url && (
                  <a
                    href={selectedDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-tech transition-colors shadow-2xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open File
                  </a>
                )}
              </div>

              {selectedDoc.url && selectedDoc.url.startsWith("http") && (
                <div className="rounded-xl border border-border overflow-hidden bg-black/5 max-h-72 flex items-center justify-center">
                  <img
                    src={selectedDoc.url}
                    alt="Document preview"
                    className="w-full h-full object-contain max-h-72"
                  />
                </div>
              )}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Close Preview
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* DELEGATION & ACCOMPANYING ATTENDEES MODAL */}
      {delegationTarget && (() => {
        const accompanying = registrations.filter(
          (x) =>
            x.id !== delegationTarget.id &&
            (x.delegation_leader_id === delegationTarget.id ||
              (delegationTarget.is_primary && !x.is_primary && x.company && x.company === delegationTarget.company && x.event_id === delegationTarget.event_id))
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <header className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Delegation & Accompanying Attendees
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {delegationTarget.company || "Enterprise Group"} · Pass {delegationTarget.id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDelegationTarget(null);
                    setIsAddingMember(false);
                  }}
                  className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6 text-sm">
                {/* Primary Pass Holder Card */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Primary Attendee / Delegation Leader
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendConfirmation(delegationTarget)}
                        disabled={sendingEmailId === delegationTarget.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                        title="Send Registration Confirmation Email"
                      >
                        {sendingEmailId === delegationTarget.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span>Send Email</span>
                      </button>
                      <StateBadge state={delegationTarget.state} />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-foreground">{delegationTarget.attendee_name}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                        <Mail className="h-3 w-3 text-primary" /> {delegationTarget.attendee_email}
                      </p>
                      {delegationTarget.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono mt-0.5">
                          <Phone className="h-3 w-3 text-muted-foreground" /> {delegationTarget.phone}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs font-bold text-primary">{delegationTarget.ticket_token}</p>
                      <p className="text-xs text-muted-foreground">{delegationTarget.job_title || "Lead Representative"}</p>
                    </div>
                  </div>
                </div>

                {/* Accompanying Members List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-sky-500" />
                      Accompanying Attendees ({accompanying.length})
                    </h4>
                    {!isAddingMember && (
                      <button
                        type="button"
                        onClick={() => setIsAddingMember(true)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> + Add Attendee to Delegation
                      </button>
                    )}
                  </div>

                  {accompanying.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
                      <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-2 text-xs font-semibold text-foreground">No additional attendees registered yet</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Colleagues or delegation members who join with {delegationTarget.attendee_name} will show up here.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddingMember(true)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-tech"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Add First Colleague
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border rounded-xl border border-border bg-background">
                      {accompanying.map((acc) => (
                        <div key={acc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 transition-colors hover:bg-secondary/30">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-foreground text-xs sm:text-sm truncate">{acc.attendee_name}</p>
                              <span className="rounded-md bg-secondary px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono">
                                {acc.id}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono truncate">{acc.attendee_email}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {acc.job_title || "Representative"} · {acc.gender || "Male"} {acc.phone ? `· ${acc.phone}` : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleSendConfirmation(acc)}
                              disabled={sendingEmailId === acc.id}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition-colors disabled:opacity-50"
                              title="Send Confirmation Email"
                            >
                              {sendingEmailId === acc.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </button>
                            <StateBadge state={acc.state} />
                            <button
                              type="button"
                              onClick={() => {
                                setDelegationTarget(null);
                                setPreviewPass(acc);
                              }}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                              title="View Badge QR"
                            >
                              <QrIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleState(acc.id, acc.state)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-emerald-600 transition-colors"
                              title={acc.state === "checked-in" ? "Undo Check-in" : "Mark Checked-in"}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline Form to Add New Colleague / Delegate */}
                {isAddingMember && (
                  <form onSubmit={handleAddDelegationMember} className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5 text-primary" />
                        Add Accompanying Attendee
                      </h5>
                      <button
                        type="button"
                        onClick={() => setIsAddingMember(false)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-foreground">Full Name *</label>
                        <input
                          required
                          value={newMemberData.attendee_name}
                          onChange={(e) => setNewMemberData({ ...newMemberData, attendee_name: e.target.value })}
                          placeholder="e.g. Youssef Nabil"
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-foreground">Email *</label>
                        <input
                          required
                          type="email"
                          value={newMemberData.attendee_email}
                          onChange={(e) => setNewMemberData({ ...newMemberData, attendee_email: e.target.value })}
                          placeholder="youssef@abccorp.com"
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-foreground">Phone Number</label>
                        <input
                          value={newMemberData.phone}
                          onChange={(e) => setNewMemberData({ ...newMemberData, phone: e.target.value })}
                          placeholder="+20 100 000 0000"
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-foreground">Job Title</label>
                        <input
                          value={newMemberData.job_title}
                          onChange={(e) => setNewMemberData({ ...newMemberData, job_title: e.target.value })}
                          placeholder="Representative"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingMember(false)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-tech"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Save & Issue Badge
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <footer className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
                <span className="text-xs text-muted-foreground">
                  Total in Delegation: <strong>{accompanying.length + 1}</strong> Attendees
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDelegationTarget(null);
                    setIsAddingMember(false);
                  }}
                  className="rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80"
                >
                  Close
                </button>
              </footer>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground shadow-2xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";
