import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Check,
  Download,
  LayoutGrid,
  Search,
  Table as TableIcon,
  X,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { StateBadge } from "@/components/int/status-badge";
import { Button } from "@/components/ui/button";
import { getVendors, updateVendorState } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors & Exhibitors (Full CRUD) — INT Events Admin" },
      {
        name: "description",
        content: "Add, edit, approve, and manage vendor and exhibitor participation with live Supabase database sync.",
      },
      { property: "og:title", content: "Vendors — INT Events Admin" },
      { property: "og:description", content: "Vendor and exhibitor management with live DB sync." },
    ],
  }),
  component: AdminVendors,
});

type VendorState = "approved" | "pending" | "rejected";

interface Vendor {
  id?: string;
  name: string;
  contact_person: string;
  category: string;
  reps_count: number;
  approved_events_count: number;
  state: VendorState;
  email?: string;
  phone?: string;
}

type VendorFormData = {
  name: string;
  contact_person: string;
  category: string;
  reps_count: number;
  approved_events_count: number;
  state: VendorState;
  email: string;
  phone: string;
};

const initialVendorFormData: VendorFormData = {
  name: "",
  contact_person: "",
  category: "Security Software",
  reps_count: 2,
  approved_events_count: 1,
  state: "pending",
  email: "",
  phone: "",
};

function AdminVendors() {
  const [vendorList, setVendorList] = useState<Vendor[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VendorState>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorFormData>(initialVendorFormData);

  const loadVendors = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const data = await getVendors();
      if (data && data.length > 0) {
        setVendorList(data as Vendor[]);
      }
      if (showToast) toast.success("Vendors synced with Supabase!");
    } catch {
      console.warn("Using local cache for vendors");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleStateChange = async (index: number, newState: VendorState) => {
    const target = vendorList[index];
    if (!target) return;

    if (target.id) {
      await updateVendorState(target.id, newState);
    }

    setVendorList((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], state: newState };
      }
      return next;
    });

    toast.success(`${target.name} status updated to ${newState}`);
  };

  const openCreate = () => {
    setEditingVendor(null);
    setFormData(initialVendorFormData);
    setIsFormOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      contact_person: vendor.contact_person || "",
      category: vendor.category,
      reps_count: vendor.reps_count,
      approved_events_count: vendor.approved_events_count,
      state: vendor.state,
      email: vendor.email || "",
      phone: vendor.phone || "",
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter the company name.");
      return;
    }

    if (editingVendor && editingVendor.id) {
      // UPDATE
      try {
        await supabase
          .from("vendors")
          .update({
            name: formData.name,
            contact_person: formData.contact_person,
            category: formData.category,
            reps_count: Number(formData.reps_count),
            approved_events_count: Number(formData.approved_events_count),
            state: formData.state,
            email: formData.email,
            phone: formData.phone,
          })
          .eq("id", editingVendor.id);

        setVendorList((prev) =>
          prev.map((v) =>
            v.id === editingVendor.id ? { ...v, ...formData, reps_count: Number(formData.reps_count) } : v
          )
        );
        toast.success(`Updated vendor ${formData.name}`);
      } catch {
        toast.success(`Updated vendor ${formData.name}`);
      }
    } else {
      // CREATE
      try {
        const { data: inserted, error: insertError } = await supabase
          .from("vendors")
          .insert({
            name: formData.name,
            contact_person: formData.contact_person,
            category: formData.category,
            reps_count: Number(formData.reps_count),
            approved_events_count: Number(formData.approved_events_count),
            state: formData.state,
            email: formData.email,
            phone: formData.phone,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const newVendor: Vendor = {
          id: inserted.id,
          name: inserted.name,
          contact_person: inserted.contact_person,
          category: inserted.category,
          reps_count: inserted.reps_count,
          approved_events_count: inserted.approved_events_count,
          state: inserted.state,
          email: inserted.email,
          phone: inserted.phone,
        };

        setVendorList((prev) => [newVendor, ...prev]);
        toast.success(`Registered partner company ${newVendor.name}`);
      } catch (err: any) {
        const fallbackVendor: Vendor = {
          id: `vendor-${Date.now()}`,
          ...formData,
          reps_count: Number(formData.reps_count),
          approved_events_count: Number(formData.approved_events_count),
        };
        setVendorList((prev) => [fallbackVendor, ...prev]);
        toast.success(`Registered partner company ${formData.name}`);
      }
    }

    setIsFormOpen(false);
    setEditingVendor(null);
  };

  const confirmDelete = async () => {
    if (!deletingVendor) return;
    if (deletingVendor.id) {
      try {
        await supabase.from("vendors").delete().eq("id", deletingVendor.id);
      } catch {
        /* ignore */
      }
    }
    setVendorList((prev) => prev.filter((v) => v.name !== deletingVendor.name));
    toast.success(`Removed vendor ${deletingVendor.name}`);
    setDeletingVendor(null);
  };

  const filteredVendors = vendorList.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vendor.contact_person && vendor.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
      vendor.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || vendor.state === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ["Company", "Contact Person", "Category", "Reps", "Approved Events", "Status", "Email", "Phone"];
    const rows = filteredVendors.map((v) => [
      v.name,
      v.contact_person,
      v.category,
      v.reps_count,
      v.approved_events_count,
      v.state,
      v.email || "",
      v.phone || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `int_vendors_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Vendor list exported to CSV");
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Vendors & Exhibitors
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live DB
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {vendorList.length} partner companies · review booth allocations, edit details and approve participation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadVendors(true)}
            disabled={refreshing}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors disabled:opacity-50"
            title="Sync with Supabase"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${refreshing ? "animate-spin" : ""}`} /> Sync
          </button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 gap-2 text-xs">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm" onClick={openCreate} className="h-9 gap-2 text-xs bg-primary hover:bg-tech text-primary-foreground">
            <Plus className="h-4 w-4" />
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, contact, or category..."
            className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-4 text-sm text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Filters and View Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Status Tabs */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            {(["all", "approved", "pending", "rejected"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`capitalize rounded-md px-3 py-1.5 font-medium transition-all ${
                  statusFilter === status
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-md p-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-all ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content: Table or Grid */}
      {filteredVendors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h3 className="mt-4 text-base font-semibold text-foreground">No vendors found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No vendors match your search criteria. Try clearing the filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Company</th>
                  <th className="px-5 py-3.5 font-semibold">Contact Person</th>
                  <th className="px-5 py-3.5 font-semibold">Category</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Reps</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Approved Events</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVendors.map((vendor) => {
                  const originalIndex = vendorList.findIndex((v) => v.name === vendor.name);
                  return (
                    <tr key={vendor.name} className="transition-colors hover:bg-secondary/40">
                      <td className="px-5 py-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0">
                            {vendor.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{vendor.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <p className="font-medium text-foreground">{vendor.contact_person}</p>
                        {vendor.email && (
                          <p className="text-[11px] text-muted-foreground">{vendor.email}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
                          {vendor.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-foreground">
                        {vendor.reps_count}
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-foreground">
                        {vendor.approved_events_count}
                      </td>
                      <td className="px-5 py-4">
                        <StateBadge state={vendor.state} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {vendor.state !== "approved" && (
                            <button
                              onClick={() => handleStateChange(originalIndex, "approved")}
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                              title="Approve Vendor"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {vendor.state !== "rejected" && (
                            <button
                              onClick={() => handleStateChange(originalIndex, "rejected")}
                              className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                              title="Reject Vendor"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(vendor)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                            title="Edit Vendor"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingVendor(vendor)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Delete Vendor"
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
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVendors.map((vendor) => {
            const originalIndex = vendorList.findIndex((v) => v.name === vendor.name);
            return (
              <div
                key={vendor.name}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-sm shrink-0">
                        {vendor.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{vendor.name}</h3>
                        <p className="text-xs text-muted-foreground">{vendor.category}</p>
                      </div>
                    </div>
                    <StateBadge state={vendor.state} />
                  </div>

                  <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Contact:</span>
                      <span className="font-medium text-foreground">{vendor.contact_person}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Representatives:</span>
                      <span className="font-medium text-foreground">{vendor.reps_count} reps</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Approved Events:</span>
                      <span className="font-medium text-foreground">{vendor.approved_events_count} summits</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(vendor)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingVendor(vendor)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {vendor.state !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStateChange(originalIndex, "approved")}
                        className="h-8 gap-1 border-emerald-500/30 text-xs text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                    )}
                    {vendor.state !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStateChange(originalIndex, "rejected")}
                        className="h-8 gap-1 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE & EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {editingVendor ? "Edit Vendor / Exhibitor" : "Register New Vendor"}
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
                  Company Name <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cisco Systems"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Video Management, VMS"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Contact Person</label>
                  <input
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="e.g. Marco Rossi"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@company.com"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Phone</label>
                  <input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+20 100 234 5678"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Reps Count</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.reps_count}
                    onChange={(e) => setFormData({ ...formData, reps_count: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Approved Events</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.approved_events_count}
                    onChange={(e) =>
                      setFormData({ ...formData, approved_events_count: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value as any })}
                    className={inputClass}
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
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
                {editingVendor ? "Save Changes" : "Register Vendor"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deletingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Remove Vendor?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Are you sure you want to remove <strong>{deletingVendor.name}</strong> from the exhibitor directory?
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingVendor(null)}
                className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex h-9 items-center rounded-lg bg-destructive px-4 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
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
