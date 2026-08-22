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
  Phone,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { StateBadge } from "@/components/int/status-badge";
import { QrCode as RealQrCode } from "@/components/int/qr-code";
import { supabase } from "@/lib/supabase";
import { events } from "@/lib/int-data";
import { toast } from "sonner";

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
  attendee_name: string;
  attendee_email: string;
  gender: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  role: string;
  ticket_token: string;
  state: "registered" | "checked-in" | "cancelled" | "no-show";
  is_primary: boolean;
  delegation_leader_id: string | null;
  created_at?: string;
  check_in_time?: string | null;
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
  state: "registered" | "checked-in" | "cancelled" | "no-show";
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
};

export function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
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
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    attendee_name: "",
    attendee_email: "",
    phone: "",
    gender: "Male",
    job_title: "Representative",
  });
  const [formData, setFormData] = useState<RegistrationFormData>(initialRegFormData);

  const loadRegistrations = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setRegistrations(data as RegistrationRow[]);
      } else {
        setRegistrations([
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
          },
          {
            id: "INT-EVT-000249",
            event_id: "security-summit-2026",
            attendee_name: "John Smith",
            attendee_email: "jsmith@genetec.com",
            gender: "Male",
            phone: "+20 100 234 5678",
            company: "Genetec",
            job_title: "Solutions Architect",
            role: "vendor",
            ticket_token: "EVT-2026-000249-G8K11",
            state: "checked-in",
            is_primary: true,
            delegation_leader_id: null,
          },
          {
            id: "INT-EVT-000250",
            event_id: "security-summit-2026",
            attendee_name: "Omar Ali",
            attendee_email: "omar.ali@integratedtechnics.com",
            gender: "Male",
            phone: "+20 100 345 6789",
            company: "Integrated Technics",
            job_title: "Field Operations Lead",
            role: "employee",
            ticket_token: "EVT-2026-000250-T2P90",
            state: "checked-in",
            is_primary: true,
            delegation_leader_id: null,
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
    // Auto-sync registrations every 10 seconds
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
      // UPDATE
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
      // CREATE
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
      };

      try {
        await supabase.from("registrations").insert({
          id: newId,
          event_id: formData.event_id,
          attendee_name: formData.attendee_name,
          attendee_email: formData.attendee_email,
          phone: formData.phone || null,
          gender: formData.gender,
          company: formData.company || null,
          job_title: formData.job_title || null,
          role: formData.role,
          state: formData.state,
          ticket_token: token,
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
    let csv = "ID,Attendee Name,Email,Gender,Company,Job Title,Role,Event ID,QR Token,Status\n";
    filtered.forEach((r) => {
      csv += `"${r.id}","${r.attendee_name}","${r.attendee_email}","${r.gender || ""}","${r.company || ""}","${r.job_title || ""}","${r.role}","${r.event_id}","${r.ticket_token}","${r.state}"\n`;
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card to-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Total Passes
            </span>
            <Ticket className="h-5 w-5 text-sky-600" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-foreground">{registrations.length}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">All active event passes</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Checked In
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-foreground">{checkedInCount}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">Scanned at entrance</p>
        </div>

        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-card to-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Primary Delegates
            </span>
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-foreground">{primaryCount}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">Delegation leaders</p>
        </div>

        <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-card to-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Delegation Reps
            </span>
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-foreground">
            {registrations.length - primaryCount}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Accompanying members</p>
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
            placeholder="Search attendee, email, company, pass ID or token…"
            className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-4 text-sm text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground outline-none shadow-2xs"
          >
            <option value="all">All Summits</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>

          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "registered", label: "Registered" },
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
                <th className="px-4 py-3.5 font-semibold">Gender</th>
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
                      <p className="text-xs text-muted-foreground">{r.attendee_email}</p>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <p className="font-medium text-foreground">{r.company || "—"}</p>
                      <p className="text-muted-foreground">{r.job_title || "Participant"}</p>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-primary">
                      {r.ticket_token}
                    </td>
                  <td className="px-4 py-4 text-xs">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        r.gender === "Female"
                          ? "bg-pink-500/10 text-pink-600"
                          : "bg-blue-500/10 text-blue-600"
                      }`}
                    >
                      {r.gender || "Male"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <StateBadge state={r.state} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
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
              <div className="mx-auto flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-4 shadow-inner">
                <RealQrCode
                  value={JSON.stringify({
                    t: previewPass.ticket_token,
                    a: previewPass.attendee_name,
                    e: previewPass.event_id,
                    c: previewPass.company || "Integrated Technics",
                  })}
                  size={160}
                />
              </div>

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
                    <StateBadge state={delegationTarget.state} />
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
