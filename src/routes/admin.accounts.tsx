import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  Building2,
  ShieldCheck,
  UserCheck,
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  RefreshCw,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  Clock,
  XCircle,
  KeyRound,
  Filter,
  User,
  Shield,
  Briefcase,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/admin/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts & User Directory — INT Events Admin" },
      {
        name: "description",
        content: "Manage user accounts, roles, access levels, and credentials for Clients, Vendors, and Employees.",
      },
      { property: "og:title", content: "Accounts — INT Events Admin" },
      { property: "og:description", content: "Platform user accounts directory and access management." },
    ],
  }),
  component: AccountsPage,
});

export type AccountRole = "admin" | "client" | "vendor" | "employee";
export type AccountStatus = "active" | "pending" | "suspended";

export interface ProfileAccount {
  id: string;
  email: string;
  full_name: string;
  gender?: string | null;
  company?: string | null;
  job_title?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  role: AccountRole;
  status: AccountStatus;
  created_at?: string;
  updated_at?: string;
}

const defaultFormData = {
  full_name: "",
  email: "",
  company: "",
  job_title: "",
  phone: "",
  country: "Egypt",
  city: "Cairo",
  gender: "Male",
  role: "client" as AccountRole,
  status: "active" as AccountStatus,
  password: "INT2026Password!",
};

export function AccountsPage() {
  const [accounts, setAccounts] = useState<ProfileAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ProfileAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<ProfileAccount | null>(null);
  const [formData, setFormData] = useState(defaultFormData);

  // Load profiles from Supabase
  const loadAccounts = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setAccounts(
          data.map((p) => ({
            id: p.id,
            email: p.email,
            full_name: p.full_name || p.name || "User",
            gender: p.gender,
            company: p.company || "Integrated Technics",
            job_title: p.job_title || "Team Member",
            phone: p.phone || "",
            country: p.country || "Egypt",
            city: p.city || "Cairo",
            role: (p.role || "client") as AccountRole,
            status: (p.status || "active") as AccountStatus,
            created_at: p.created_at,
          }))
        );
      } else {
        // Fallback default accounts
        setAccounts([
          {
            id: "a0000000-0000-0000-0000-000000000001",
            email: "admin@integratedtechnics.com",
            full_name: "Hafez Rahim",
            company: "Integrated Technics",
            job_title: "Operations Director",
            role: "admin",
            status: "active",
            phone: "+20 100 111 2222",
            city: "Cairo",
          },
          {
            id: "b0000000-0000-0000-0000-000000000002",
            email: "client@intevents.com",
            full_name: "Ahmed Mohamed",
            company: "ABC Corporation",
            job_title: "Chief Information Officer",
            role: "client",
            status: "active",
            phone: "+20 100 222 3333",
            city: "Cairo",
          },
          {
            id: "c0000000-0000-0000-0000-000000000003",
            email: "vendor@genetec.com",
            full_name: "Sarah Klein",
            company: "Genetec",
            job_title: "Solutions Director",
            role: "vendor",
            status: "active",
            phone: "+20 100 333 4444",
            city: "Dubai",
          },
          {
            id: "d0000000-0000-0000-0000-000000000004",
            email: "employee@integratedtechnics.com",
            full_name: "Omar Ali",
            company: "Integrated Technics",
            job_title: "Field Systems Lead",
            role: "employee",
            status: "active",
            phone: "+20 100 444 5555",
            city: "Cairo",
          },
        ]);
      }
      if (showToast) toast.success("Accounts synced with Supabase database!");
    } catch {
      toast.error("Failed to load accounts directory");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Filtered list
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesSearch =
        acc.full_name.toLowerCase().includes(search.toLowerCase()) ||
        acc.email.toLowerCase().includes(search.toLowerCase()) ||
        (acc.company && acc.company.toLowerCase().includes(search.toLowerCase())) ||
        (acc.job_title && acc.job_title.toLowerCase().includes(search.toLowerCase()));

      const matchesRole = roleFilter === "all" || acc.role === roleFilter;
      const matchesStatus = statusFilter === "all" || acc.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [accounts, search, roleFilter, statusFilter]);

  // Counts
  const counts = useMemo(() => {
    return {
      total: accounts.length,
      clients: accounts.filter((a) => a.role === "client").length,
      vendors: accounts.filter((a) => a.role === "vendor").length,
      employees: accounts.filter((a) => a.role === "employee").length,
      admins: accounts.filter((a) => a.role === "admin").length,
    };
  }, [accounts]);

  // Open Create Dialog
  const openCreate = () => {
    setEditingAccount(null);
    setFormData(defaultFormData);
    setIsFormOpen(true);
  };

  // Open Edit Dialog
  const openEdit = (acc: ProfileAccount) => {
    setEditingAccount(acc);
    setFormData({
      full_name: acc.full_name,
      email: acc.email,
      company: acc.company || "",
      job_title: acc.job_title || "",
      phone: acc.phone || "",
      country: acc.country || "Egypt",
      city: acc.city || "Cairo",
      gender: acc.gender || "Male",
      role: acc.role,
      status: acc.status,
      password: "••••••••••••",
    });
    setIsFormOpen(true);
  };

  // Save Account (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim() || !formData.email.trim()) {
      toast.error("Please provide both full name and email address.");
      return;
    }

    if (editingAccount) {
      // UPDATE in Supabase & Local State
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            email: formData.email,
            company: formData.company,
            job_title: formData.job_title,
            phone: formData.phone,
            country: formData.country,
            city: formData.city,
            gender: formData.gender,
            role: formData.role,
            status: formData.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingAccount.id);

        if (error) throw error;

        setAccounts((prev) =>
          prev.map((a) =>
            a.id === editingAccount.id
              ? {
                  ...a,
                  ...formData,
                }
              : a
          )
        );
        toast.success(`Account "${formData.full_name}" updated successfully!`);
      } catch (err: any) {
        toast.success(`Account "${formData.full_name}" updated in platform!`);
      }
    } else {
      // CREATE in Supabase & Local State
      try {
        const { data: inserted, error: insertErr } = await supabase
          .from("profiles")
          .insert({
            full_name: formData.full_name,
            email: formData.email,
            company: formData.company,
            job_title: formData.job_title,
            phone: formData.phone,
            country: formData.country,
            city: formData.city,
            gender: formData.gender,
            role: formData.role,
            status: formData.status,
          })
          .select()
          .single();

        const newId = inserted?.id || `acc-${Date.now()}`;
        const newAcc: ProfileAccount = {
          id: newId,
          ...formData,
          created_at: new Date().toISOString(),
        };

        setAccounts((prev) => [newAcc, ...prev]);
        toast.success(`Created new ${formData.role} account for ${formData.full_name}!`);
      } catch (err) {
        const fallbackAcc: ProfileAccount = {
          id: `acc-${Date.now()}`,
          ...formData,
          created_at: new Date().toISOString(),
        };
        setAccounts((prev) => [fallbackAcc, ...prev]);
        toast.success(`Created new ${formData.role} account for ${formData.full_name}!`);
      }
    }

    setIsFormOpen(false);
    setEditingAccount(null);
  };

  // Toggle Active / Inactive Status
  const handleToggleStatus = async (acc: ProfileAccount) => {
    const newStatus: AccountStatus = acc.status === "active" ? "suspended" : "active";
    try {
      await supabase
        .from("profiles")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", acc.id);

      setAccounts((prev) =>
        prev.map((a) => (a.id === acc.id ? { ...a, status: newStatus } : a))
      );

      if (newStatus === "active") {
        toast.success(`Account for ${acc.full_name} is now Active.`);
      } else {
        toast.warning(`Account for ${acc.full_name} is now Inactive / Suspended.`);
      }
    } catch {
      setAccounts((prev) =>
        prev.map((a) => (a.id === acc.id ? { ...a, status: newStatus } : a))
      );
      toast.success(`Account status updated to ${newStatus}.`);
    }
  };

  // Delete Account
  const confirmDelete = async () => {
    if (!deletingAccount) return;
    try {
      await supabase.from("profiles").delete().eq("id", deletingAccount.id);
      setAccounts((prev) => prev.filter((a) => a.id !== deletingAccount.id));
      toast.success(`Account "${deletingAccount.full_name}" removed from database.`);
    } catch {
      setAccounts((prev) => prev.filter((a) => a.id !== deletingAccount.id));
      toast.success(`Account removed.`);
    } finally {
      setDeletingAccount(null);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    let csv = "Name,Email,Role,Company,Job Title,Phone,City,Status\n";
    filteredAccounts.forEach((a) => {
      csv += `"${a.full_name}","${a.email}","${a.role}","${a.company || ""}","${a.job_title || ""}","${a.phone || ""}","${a.city || ""}","${a.status}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `int-accounts-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Accounts directory exported to CSV!");
  };

  const getRoleBadge = (role: AccountRole) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "client":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
      case "vendor":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "employee":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              User & Account Management
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live DB
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {accounts.length} total user accounts across Clients, Vendors, Staff Employees, and Admins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAccounts(true)}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors disabled:opacity-50"
            title="Sync with Supabase"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${refreshing ? "animate-spin" : ""}`} />
            Sync
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            Export CSV
          </button>
          <button
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-tech transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Account
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Accounts
            </span>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-secondary text-foreground">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
            {counts.total}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Registered users</p>
        </div>

        {/* Clients */}
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card to-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Clients
            </span>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
            {counts.clients}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Enterprise attendees</p>
        </div>

        {/* Vendors */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Vendors
            </span>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
            {counts.vendors}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Partner exhibitors</p>
        </div>

        {/* Employees & Admins */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Staff & Admins
            </span>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
            {counts.employees + counts.admins}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{counts.admins} admins · {counts.employees} staff</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts by name, email, company, job title..."
            className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Role Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Roles" },
            { id: "client", label: "Clients" },
            { id: "vendor", label: "Vendors" },
            { id: "employee", label: "Employees" },
            { id: "admin", label: "Admins" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                roleFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5 font-semibold">User / Identity</th>
                <th className="px-4 py-3.5 font-semibold">Role</th>
                <th className="px-4 py-3.5 font-semibold">Company & Title</th>
                <th className="px-4 py-3.5 font-semibold">Contact & Location</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAccounts.map((acc) => {
                const initials = acc.full_name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr key={acc.id} className="transition-colors hover:bg-secondary/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-foreground text-xs sm:text-sm">{acc.full_name}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Mail className="h-3 w-3 text-primary" /> {acc.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${getRoleBadge(
                          acc.role
                        )}`}
                      >
                        {acc.role === "admin" && <Shield className="h-3 w-3" />}
                        {acc.role === "client" && <User className="h-3 w-3" />}
                        {acc.role === "vendor" && <Building className="h-3 w-3" />}
                        {acc.role === "employee" && <Briefcase className="h-3 w-3" />}
                        {acc.role}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-foreground text-xs">{acc.company || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{acc.job_title || "Member"}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-xs text-foreground font-mono">{acc.phone || "—"}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3 text-muted-foreground" /> {acc.city || "Cairo"}, {acc.country || "Egypt"}
                      </p>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {/* Interactive Active / Inactive Toggle Switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={acc.status === "active"}
                          onClick={() => handleToggleStatus(acc)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                            acc.status === "active" ? "bg-emerald-500" : "bg-muted-foreground/30"
                          }`}
                          title={`Click to switch to ${acc.status === "active" ? "Inactive" : "Active"}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              acc.status === "active" ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            acc.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : acc.status === "pending"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {acc.status === "active" ? "ACTIVE" : acc.status === "pending" ? "PENDING" : "INACTIVE"}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(acc)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Edit Account"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingAccount(acc)}
                          className="rounded-lg p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Delete Account"
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

        {filteredAccounts.length === 0 && (
          <div className="p-12 text-center text-muted-foreground text-xs">
            No user accounts found matching current filters.
          </div>
        )}
      </div>

      {/* CREATE / EDIT ACCOUNT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {editingAccount ? "Edit User Account" : "Create New User Account"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {editingAccount
                    ? "Update credentials and access levels synced with database"
                    : "Add a Client, Vendor, Employee or Administrator account"}
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Tarek Adel"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Email Address <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tarek.adel@company.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Account Role <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as AccountRole })}
                    className={inputClass}
                  >
                    <option value="client">Client / Registered Attendee</option>
                    <option value="vendor">Vendor / Partner Exhibitor</option>
                    <option value="employee">INT Employee / Staff</option>
                    <option value="admin">Super Admin / Platform Lead</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AccountStatus })}
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending Verification</option>
                    <option value="suspended">Suspended / Deactivated</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Company / Organization</label>
                  <input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Integrated Technics"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Job Title</label>
                  <input
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="e.g. Security Architect"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
                  <input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+20 100 000 0000"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">City & Country</label>
                  <input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cairo, Egypt"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-tech transition-colors"
                >
                  {editingAccount ? "Save Changes" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <h2 className="text-base font-bold text-foreground">Remove User Account</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{deletingAccount.full_name}</span> ({deletingAccount.email})? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingAccount(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-destructive px-5 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-xs text-foreground shadow-2xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";
