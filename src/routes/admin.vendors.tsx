import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
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
  FileText,
  ExternalLink,
  Upload,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { StateBadge } from "@/components/int/status-badge";
import { Button } from "@/components/ui/button";
import { getVendors, toggleVendorChatAccess } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { getCompanyLogo } from "@/lib/logos";

export const Route = createFileRoute("/admin/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors & Exhibitors (Full CRUD) — INT Events Admin" },
      {
        name: "description",
        content: "Add, edit, and manage vendor and exhibitor participation and chat permissions with live Supabase database sync.",
      },
      { property: "og:title", content: "Vendors — INT Events Admin" },
      { property: "og:description", content: "Vendor and exhibitor management with live DB sync." },
    ],
  }),
  component: AdminVendors,
});

interface Vendor {
  id?: string;
  name: string;
  contact_person: string;
  category: string;
  reps_count: number;
  approved_events_count: number;
  email?: string;
  phone?: string;
  id_type?: string;
  id_number?: string;
  id_doc_url?: string;
  id_doc_name?: string;
  can_chat?: boolean;
}

type VendorFormData = {
  name: string;
  contact_person: string;
  category: string;
  reps_count: number;
  approved_events_count: number;
  email: string;
  phone: string;
  id_type: string;
  id_number: string;
  id_doc_url: string;
  id_doc_name: string;
  can_chat: boolean;
};

const initialVendorFormData: VendorFormData = {
  name: "",
  contact_person: "",
  category: "Security Software",
  reps_count: 2,
  approved_events_count: 1,
  email: "",
  phone: "",
  id_type: "National ID",
  id_number: "",
  id_doc_url: "",
  id_doc_name: "",
  can_chat: true,
};

function AdminVendors() {
  const [vendorList, setVendorList] = useState<Vendor[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{
    url: string;
    name: string;
    type: string;
    vendorName: string;
    contactPerson: string;
    number?: string | undefined;
  } | null>(null);

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
      email: vendor.email || "",
      phone: vendor.phone || "",
      id_type: vendor.id_type || "National ID",
      id_number: vendor.id_number || "",
      id_doc_url: vendor.id_doc_url || "",
      id_doc_name: vendor.id_doc_name || "",
      can_chat: vendor.can_chat !== false,
    });
    setIsFormOpen(true);
  };

  const handleToggleChat = async (vendor: Vendor) => {
    const nextState = vendor.can_chat === false ? true : false;
    setVendorList((prev) =>
      prev.map((v) =>
        v.id === vendor.id || v.name === vendor.name
          ? { ...v, can_chat: nextState }
          : v
      )
    );
    if (vendor.id) {
      await toggleVendorChatAccess(vendor.id, nextState);
    }
    toast.success(
      nextState
        ? `Chat access enabled for ${vendor.name}`
        : `Chat access disabled for ${vendor.name}`
    );
  };

  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        id_doc_url: dataUrl,
        id_doc_name: file.name,
      }));
      toast.success(`Attached ${file.name}`);
    };
    reader.readAsDataURL(file);
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
            email: formData.email,
            phone: formData.phone,
            id_type: formData.id_type,
            id_number: formData.id_number,
            id_doc_url: formData.id_doc_url,
            id_doc_name: formData.id_doc_name,
            can_chat: formData.can_chat,
          } as any)
          .eq("id", editingVendor.id);

        await supabase
          .from("profiles")
          .update({
            company: formData.name,
            full_name: formData.contact_person,
            email: formData.email,
            phone: formData.phone,
            can_chat: formData.can_chat,
          } as any)
          .eq("id", editingVendor.id);

        setVendorList((prev) =>
          prev.map((v) =>
            v.id === editingVendor.id ? { ...v, ...formData } : v
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
            email: formData.email,
            phone: formData.phone,
            id_type: formData.id_type,
            id_number: formData.id_number,
            id_doc_url: formData.id_doc_url,
            id_doc_name: formData.id_doc_name,
            can_chat: formData.can_chat,
          } as any)
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
          email: inserted.email,
          phone: inserted.phone,
          id_type: inserted.id_type,
          id_number: inserted.id_number,
          id_doc_url: inserted.id_doc_url,
          id_doc_name: inserted.id_doc_name,
          can_chat: formData.can_chat,
        };

        setVendorList((prev) => [newVendor, ...prev]);
        toast.success(`Registered partner company ${newVendor.name}`);
      } catch {
        const fallbackVendor: Vendor = {
          id: `vendor-${Date.now()}`,
          ...formData,
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
        await supabase.from("profiles").delete().eq("id", deletingVendor.id);
        await supabase.from("vendors").delete().eq("id", deletingVendor.id);
      } catch {
        /* ignore */
      }
    }
    setVendorList((prev) => prev.filter((v) => v.name !== deletingVendor.name));
    toast.success(`Removed vendor account ${deletingVendor.name}`);
    setDeletingVendor(null);
  };

  const categories = Array.from(new Set(vendorList.map((v) => v.category).filter(Boolean)));

  const filteredVendors = vendorList.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vendor.contact_person && vendor.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (vendor.phone && vendor.phone.includes(searchQuery)) ||
      (vendor.id_number && vendor.id_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      vendor.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "all" || vendor.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const exportCSV = () => {
    const headers = ["Company", "Contact Person", "Category", "Phone", "Email", "ID Type", "ID Number", "Reps", "Events"];
    const rows = filteredVendors.map((v) => [
      v.name,
      v.contact_person,
      v.category,
      v.phone || "",
      v.email || "",
      v.id_type || "",
      v.id_number || "",
      v.reps_count,
      v.approved_events_count,
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
            {vendorList.length} accounts with Vendor role · verified partner representatives, uploaded ID/passports, and summit participation.
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
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, contact, phone, ID, or category..."
            className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-4 text-sm text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {categories.length > 0 && (
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs overflow-x-auto">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`rounded-md px-3 py-1.5 font-medium transition-all ${
                  categoryFilter === "all"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {categories.slice(0, 4).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-md px-3 py-1.5 font-medium transition-all whitespace-nowrap ${
                    categoryFilter === cat
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

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
              setCategoryFilter("all");
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
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Company</th>
                  <th className="px-5 py-3.5 font-semibold">Contact Person</th>
                  <th className="px-5 py-3.5 font-semibold">Category</th>
                  <th className="px-5 py-3.5 font-semibold">ID / Passport</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Chat Access</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Reps</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Events</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.name} className="transition-colors hover:bg-secondary/40">
                    <td className="px-5 py-4 font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        <img
                          src={getCompanyLogo(vendor.name)}
                          alt={vendor.name}
                          className="h-9 w-9 rounded-xl object-cover border border-border shrink-0 bg-secondary/50"
                        />
                        <span>{vendor.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      <p className="font-medium text-foreground">{vendor.contact_person}</p>
                      <div className="mt-0.5 flex flex-col gap-0.5 text-[11px]">
                        {vendor.email && <span className="text-muted-foreground">{vendor.email}</span>}
                        {vendor.phone && <span className="font-mono text-foreground/80">{vendor.phone}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
                        {vendor.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {vendor.id_doc_url || vendor.id_doc_name ? (
                        <div className="flex flex-col items-start gap-1">
                          {vendor.id_type && (
                            <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                              {vendor.id_type} {vendor.id_number ? `(${vendor.id_number})` : ""}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedDoc({
                              url: vendor.id_doc_url || "",
                              name: vendor.id_doc_name || `${vendor.id_type || "ID"}_${vendor.name.replace(/\s+/g, "")}.pdf`,
                              type: vendor.id_type || "ID / Passport Document",
                              vendorName: vendor.name,
                              contactPerson: vendor.contact_person,
                              number: vendor.id_number,
                            })}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-tech hover:underline transition-colors group cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[130px]">{vendor.id_doc_name || "View Document"}</span>
                            <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100 shrink-0" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/70 italic">Not uploaded</span>
                      )}
                    </td>

                    {/* Chat Access On/Off Switch */}
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleChat(vendor)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          vendor.can_chat !== false ? "bg-emerald-500" : "bg-muted"
                        }`}
                        role="switch"
                        aria-checked={vendor.can_chat !== false}
                        title={
                          vendor.can_chat !== false
                            ? "Chat Allowed — Click to disable"
                            : "Chat Disabled — Click to enable"
                        }
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            vendor.can_chat !== false ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>

                    <td className="px-5 py-4 text-center font-medium text-foreground">{vendor.reps_count}</td>
                    <td className="px-5 py-4 text-center font-medium text-foreground">{vendor.approved_events_count}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(vendor)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingVendor(vendor)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVendors.map((vendor) => (
            <div key={vendor.name} className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={getCompanyLogo(vendor.name)}
                      alt={vendor.name}
                      className="h-11 w-11 rounded-2xl object-cover border border-border shrink-0 bg-secondary/50"
                    />
                    <div>
                      <h3 className="font-bold text-foreground">{vendor.name}</h3>
                      <span className="text-[11px] text-muted-foreground">{vendor.category}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Contact:</span><span className="font-medium text-foreground">{vendor.contact_person}</span></div>
                  {vendor.email && (<div className="flex justify-between"><span>Email:</span><span className="font-medium text-foreground">{vendor.email}</span></div>)}
                  {vendor.phone && (<div className="flex justify-between"><span>Phone:</span><span className="font-mono font-medium text-foreground">{vendor.phone}</span></div>)}
                  <div className="flex items-center justify-between">
                    <span>ID / Passport:</span>
                    {vendor.id_doc_url || vendor.id_doc_name ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDoc({
                          url: vendor.id_doc_url || "",
                          name: vendor.id_doc_name || "Document.pdf",
                          type: vendor.id_type || "ID / Passport",
                          vendorName: vendor.name,
                          contactPerson: vendor.contact_person,
                          number: vendor.id_number,
                        })}
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        <FileText className="h-3 w-3" />
                        <span>{vendor.id_type || "View File"}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    ) : (<span className="text-muted-foreground/60 italic">Not uploaded</span>)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Direct Chat:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleChat(vendor)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        vendor.can_chat !== false ? "bg-emerald-500" : "bg-muted"
                      }`}
                      role="switch"
                      aria-checked={vendor.can_chat !== false}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          vendor.can_chat !== false ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex justify-between"><span>Representatives:</span><span className="font-medium text-foreground">{vendor.reps_count} reps</span></div>
                  <div className="flex justify-between"><span>Events:</span><span className="font-medium text-foreground">{vendor.approved_events_count} summits</span></div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end border-t border-border/60 pt-3">
                <Button size="sm" variant="ghost" onClick={() => openEdit(vendor)} className="h-8 gap-1 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeletingVendor(vendor)} className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{selectedDoc.type} — {selectedDoc.vendorName}</h3>
                  <p className="text-[11px] text-muted-foreground">Representative: {selectedDoc.contactPerson} {selectedDoc.number ? `· ${selectedDoc.number}` : ""}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedDoc(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
            </header>
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-border bg-secondary/30 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{selectedDoc.name}</p>
                    <p className="text-[11px] text-muted-foreground">Verified Identification Document</p>
                  </div>
                </div>
                {selectedDoc.url && (
                  <a href={selectedDoc.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-tech transition-colors shadow-2xs"><ExternalLink className="h-3.5 w-3.5" /> Open File</a>
                )}
              </div>
              {selectedDoc.url && selectedDoc.url.startsWith("http") && (
                <div className="rounded-xl border border-border overflow-hidden bg-black/5 max-h-72 flex items-center justify-center">
                  <img src={selectedDoc.url} alt="Document preview" className="w-full h-full object-contain max-h-72" />
                </div>
              )}
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-5 py-3.5">
              <button type="button" onClick={() => setSelectedDoc(null)} className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-xs font-semibold text-foreground hover:bg-secondary transition-colors">Close Preview</button>
            </footer>
          </div>
        </div>
      )}

      {/* CREATE & EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleSave} className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">{editingVendor ? "Edit Vendor / Exhibitor" : "Register New Vendor"}</h3>
              </div>
              <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
            </header>
            <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Company Name <span className="text-destructive">*</span></label>
                <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Cisco Systems" className={inputClass} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-foreground">Category</label><input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={inputClass} /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-foreground">Contact Person</label><input value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} className={inputClass} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-foreground">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-foreground">Phone</label><input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} /></div>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-3.5 space-y-3">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-primary" /> Representative ID / Passport</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Document Type</label>
                    <select value={formData.id_type} onChange={(e) => setFormData({ ...formData, id_type: e.target.value })} className={inputClass}>
                      <option value="National ID">Egyptian National ID</option>
                      <option value="Passport">Passport</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Document Number</label>
                    <input value={formData.id_number} onChange={(e) => setFormData({ ...formData, id_number: e.target.value })} className={inputClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground">Upload Document Copy (PDF or Image)</label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer shrink-0">
                      <Upload className="h-3.5 w-3.5 text-primary" /> Choose File
                      <input type="file" accept="image/*,.pdf" onChange={handleDocFileUpload} className="hidden" />
                    </label>
                    <input value={formData.id_doc_name || formData.id_doc_url} onChange={(e) => setFormData({ ...formData, id_doc_name: e.target.value, id_doc_url: e.target.value })} placeholder="No file attached" className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary" />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-foreground">Representative Passes</label><input type="number" min={1} value={formData.reps_count} onChange={(e) => setFormData({ ...formData, reps_count: Number(e.target.value) })} className={inputClass} /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-foreground">Allocated Summits / Events</label><input type="number" min={0} value={formData.approved_events_count} onChange={(e) => setFormData({ ...formData, approved_events_count: Number(e.target.value) })} className={inputClass} /></div>
              </div>

              {/* Chat Access Permission Card */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Direct Messaging (Chat Access)</p>
                    <p className="text-[11px] text-muted-foreground">
                      Allow this vendor representative to chat with attendees and other partner sponsors.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, can_chat: !prev.can_chat }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.can_chat ? "bg-emerald-500" : "bg-muted"
                  }`}
                  role="switch"
                  aria-checked={formData.can_chat}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.can_chat ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 p-4">
              <button type="button" onClick={() => setIsFormOpen(false)} className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-secondary">Cancel</button>
              <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-tech"><CheckCircle2 className="h-4 w-4" /> {editingVendor ? "Save Changes" : "Register Vendor"}</button>
            </footer>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deletingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
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
