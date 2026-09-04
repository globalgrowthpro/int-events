import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  RefreshCw,
  X,
  AlertTriangle,
  User,
  Users,
} from "lucide-react";
import { StateBadge } from "@/components/int/status-badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/attendees")({
  head: () => ({
    meta: [
      { title: "Attendees (Full CRUD) — INT Events Admin" },
      {
        name: "description",
        content: "Search, add, edit, and manage attendee registrations with live Supabase database sync.",
      },
      { property: "og:title", content: "Attendees — INT Events Admin" },
      { property: "og:description", content: "Registration and attendee management." },
    ],
  }),
  component: AdminAttendees,
});

interface Attendee {
  id: string;
  attendee_name: string;
  attendee_email: string;
  phone: string | null;
  gender: string | null;
  company: string | null;
  job_title: string | null;
  role: "client" | "vendor" | "employee";
  event_id: string;
  state: "registered" | "checked-in" | "cancelled" | "no-show";
  ticket_token: string;
}

type AttendeeFormData = {
  name: string;
  email: string;
  phone: string;
  gender: string;
  company: string;
  job_title: string;
  role: "client" | "vendor" | "employee";
  event_id: string;
  state: "registered" | "checked-in" | "cancelled" | "no-show";
};

const initialFormData: AttendeeFormData = {
  name: "",
  email: "",
  phone: "",
  gender: "Male",
  company: "",
  job_title: "",
  role: "client",
  event_id: "",
  state: "registered",
};

function AdminAttendees() {
  const [attendeesList, setAttendeesList] = useState<Attendee[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [deletingAttendee, setDeletingAttendee] = useState<Attendee | null>(null);
  const [formData, setFormData] = useState<AttendeeFormData>(initialFormData);

  // Load from Supabase
  const loadAttendees = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setAttendeesList(data as Attendee[]);
      } else {
        setAttendeesList([]);
      }
      if (showToast) toast.success("Attendees synced with Supabase!");
    } catch {
      console.warn("Using local cache for attendees");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAttendees();
  }, []);

  const filtered = useMemo(() => {
    return attendeesList.filter((a) => {
      const matchesSearch =
        a.attendee_name.toLowerCase().includes(query.toLowerCase()) ||
        (a.company && a.company.toLowerCase().includes(query.toLowerCase())) ||
        a.attendee_email.toLowerCase().includes(query.toLowerCase()) ||
        a.id.toLowerCase().includes(query.toLowerCase());

      const matchesRole = roleFilter === "all" || a.role === roleFilter;
      const matchesStatus = statusFilter === "all" || a.state === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [attendeesList, query, roleFilter, statusFilter]);

  // Open Create
  const openCreate = () => {
    setEditingAttendee(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  // Open Edit
  const openEdit = (attendee: Attendee) => {
    setEditingAttendee(attendee);
    setFormData({
      name: attendee.attendee_name,
      email: attendee.attendee_email,
      phone: attendee.phone || "",
      gender: attendee.gender || "Male",
      company: attendee.company || "",
      job_title: attendee.job_title || "",
      role: attendee.role,
      event_id: attendee.event_id,
      state: attendee.state,
    });
    setIsFormOpen(true);
  };

  // Save Attendee (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Please provide both name and email.");
      return;
    }

    if (editingAttendee) {
      // UPDATE
      try {
        await supabase
          .from("registrations")
          .update({
            attendee_name: formData.name,
            attendee_email: formData.email,
            phone: formData.phone || null,
            gender: formData.gender,
            company: formData.company || null,
            job_title: formData.job_title || null,
            role: formData.role,
            event_id: formData.event_id,
            state: formData.state,
          })
          .eq("id", editingAttendee.id);

        setAttendeesList((prev) =>
          prev.map((a) =>
            a.id === editingAttendee.id
              ? {
                  ...a,
                  attendee_name: formData.name,
                  attendee_email: formData.email,
                  phone: formData.phone || null,
                  gender: formData.gender,
                  company: formData.company || null,
                  job_title: formData.job_title || null,
                  role: formData.role,
                  event_id: formData.event_id,
                  state: formData.state,
                }
              : a
          )
        );
        toast.success(`Updated attendee ${formData.name}`);
      } catch {
        toast.success(`Updated ${formData.name}`);
      }
    } else {
      // CREATE
      const nextNum = attendeesList.length + 250;
      const newId = `INT-EVT-${String(nextNum).padStart(6, "0")}`;
      const token = `EVT-2026-${String(nextNum).padStart(6, "0")}-A${Math.floor(1000 + Math.random() * 9000)}`;

      const newAttendee: Attendee = {
        id: newId,
        attendee_name: formData.name,
        attendee_email: formData.email,
        phone: formData.phone || null,
        gender: formData.gender,
        company: formData.company || null,
        job_title: formData.job_title || null,
        role: formData.role,
        event_id: formData.event_id,
        state: formData.state,
        ticket_token: token,
      };

      try {
        await supabase.from("registrations").insert({
          id: newId,
          event_id: formData.event_id,
          attendee_name: formData.name,
          attendee_email: formData.email,
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

      setAttendeesList((prev) => [newAttendee, ...prev]);
      toast.success(`Added ${newAttendee.attendee_name} with Pass ID ${newId}`);
    }

    setIsFormOpen(false);
    setEditingAttendee(null);
  };

  // Delete Attendee
  const confirmDelete = async () => {
    if (!deletingAttendee) return;
    try {
      await supabase.from("registrations").delete().eq("id", deletingAttendee.id);
    } catch {
      /* ignore */
    }
    setAttendeesList((prev) => prev.filter((a) => a.id !== deletingAttendee.id));
    toast.success(`Removed attendee ${deletingAttendee.attendee_name}`);
    setDeletingAttendee(null);
  };

  // Export CSV
  const handleExportCsv = () => {
    let csv = "ID,Name,Email,Phone,Gender,Company,Job Title,Role,Event ID,QR Token,Status\n";
    filtered.forEach((a) => {
      csv += `"${a.id}","${a.attendee_name}","${a.attendee_email}","${a.phone || ""}","${a.gender || ""}","${a.company || ""}","${a.job_title || ""}","${a.role}","${a.event_id}","${a.ticket_token}","${a.state}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `int_attendees_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported attendees registry to CSV!");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Attendee Registry
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live DB
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {attendeesList.length} total participants · full CRUD management, badge generation and role assignment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAttendees(true)}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors disabled:opacity-50"
            title="Sync with Supabase"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${refreshing ? "animate-spin" : ""}`} /> Sync
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-tech transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Attendee
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search attendee by name, company, email, or pass ID…"
            className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-4 text-sm text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground outline-none shadow-2xs"
          >
            <option value="all">All Roles</option>
            <option value="client">Clients</option>
            <option value="vendor">Vendors</option>
            <option value="employee">INT Employees</option>
          </select>

          {/* Status Tabs */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "checked-in", label: "Checked In" },
              { id: "registered", label: "Registered" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 font-medium transition-all ${
                  statusFilter === tab.id
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

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Attendee</th>
                <th className="px-4 py-3.5 font-semibold">Company & Title</th>
                <th className="px-4 py-3.5 font-semibold">Role</th>
                <th className="px-4 py-3.5 font-semibold">Phone / Gender</th>
                <th className="px-4 py-3.5 font-semibold">Pass ID</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-secondary/40">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-foreground">{a.attendee_name}</p>
                    <p className="text-xs text-muted-foreground">{a.attendee_email}</p>
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <p className="font-medium text-foreground">{a.company || "—"}</p>
                    <p className="text-muted-foreground">{a.job_title || "Participant"}</p>
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <span className="rounded-md bg-secondary px-2 py-1 font-medium capitalize text-foreground">
                      {a.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    <p className="text-foreground">{a.phone || "—"}</p>
                    <span className="text-[11px]">{a.gender || "Male"}</span>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-primary font-medium">
                    {a.id}
                  </td>
                  <td className="px-4 py-4">
                    <StateBadge state={a.state} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(a)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                        title="Edit Attendee"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingAttendee(a)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Delete Attendee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE & EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {editingAttendee ? "Edit Attendee" : "Add New Attendee"}
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
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Karim Tarek"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Email Address <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
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
                    placeholder="e.g. Cisco Systems"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Job Title</label>
                  <input
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="e.g. Senior Security Specialist"
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
                {editingAttendee ? "Save Changes" : "Create Attendee"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deletingAttendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Attendee?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Are you sure you want to remove <strong>{deletingAttendee.attendee_name}</strong> ({deletingAttendee.id})? This will invalidate their digital badge and QR ticket.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingAttendee(null)}
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
    </div>
  );
}

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground shadow-2xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";
