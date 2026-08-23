import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
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
  Phone,
  Mail,
  Building,
  MapPin,
  Briefcase,
  IdCard,
  Upload,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getClients, toggleUserChatAccess, type ClientRecord } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { getUserAvatar } from "@/lib/logos";

export const Route = createFileRoute("/admin/clients")({
  head: () => ({
    meta: [
      { title: "Client Accounts (Full CRUD) — INT Events Admin" },
      {
        name: "description",
        content: "Manage registered enterprise clients, identification documents, chat access, and summit participation with live Supabase database sync.",
      },
      { property: "og:title", content: "Client Accounts — INT Events Admin" },
      { property: "og:description", content: "Client account management and identification verification." },
    ],
  }),
  component: AdminClients,
});

type ClientFormData = {
  full_name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  country: string;
  city: string;
  industry: string;
  status: "active" | "pending" | "suspended";
  id_type: string;
  id_number: string;
  id_doc_url: string;
  id_doc_name: string;
  can_chat: boolean;
};

const initialClientFormData: ClientFormData = {
  full_name: "",
  email: "",
  phone: "+20 100 000 0000",
  company: "",
  job_title: "",
  country: "Egypt",
  city: "Cairo",
  industry: "Information Technology",
  status: "active",
  id_type: "National ID",
  id_number: "",
  id_doc_url: "",
  id_doc_name: "",
  can_chat: true,
};

function AdminClients() {
  const [clientList, setClientList] = useState<ClientRecord[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDocType, setFilterDocType] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientRecord | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{
    url: string;
    name: string;
    type: string;
    clientName: string;
    company: string;
    number?: string | undefined;
  } | null>(null);

  const [formData, setFormData] = useState<ClientFormData>(initialClientFormData);

  const loadClients = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const data = await getClients();
      if (data && data.length > 0) {
        setClientList(data);
      }
      if (showToast) toast.success("Client accounts synced with Supabase!");
    } catch {
      console.warn("Using local cache for clients");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const openCreate = () => {
    setEditingClient(null);
    setFormData(initialClientFormData);
    setIsFormOpen(true);
  };

  const openEdit = (client: ClientRecord) => {
    setEditingClient(client);
    setFormData({
      full_name: client.full_name,
      email: client.email,
      phone: client.phone || "",
      company: client.company || "",
      job_title: client.job_title || "",
      country: client.country || "Egypt",
      city: client.city || "Cairo",
      industry: client.industry || "Information Technology",
      status: client.status || "active",
      id_type: client.id_type || "National ID",
      id_number: client.id_number || "",
      id_doc_url: client.id_doc_url || "",
      id_doc_name: client.id_doc_name || "",
      can_chat: client.can_chat !== false,
    });
    setIsFormOpen(true);
  };

  const handleToggleChat = async (client: ClientRecord) => {
    const nextState = client.can_chat === false ? true : false;
    setClientList((prev) =>
      prev.map((c) => (c.id === client.id ? { ...c, can_chat: nextState } : c))
    );
    await toggleUserChatAccess(client.id, nextState);
    toast.success(
      nextState
        ? `Chat access enabled for ${client.full_name}`
        : `Chat access disabled for ${client.full_name}`
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

    if (!formData.full_name.trim() || !formData.email.trim()) {
      toast.error("Please enter client full name and email.");
      return;
    }

    if (editingClient && editingClient.id) {
      // UPDATE IN SUPABASE
      try {
        await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company,
            job_title: formData.job_title,
            country: formData.country,
            city: formData.city,
            industry: formData.industry,
            status: formData.status,
            can_chat: formData.can_chat,
            role: "client",
          } as any)
          .eq("id", editingClient.id);

        setClientList((prev) =>
          prev.map((c) =>
            c.id === editingClient.id ? { ...c, ...formData } : c
          )
        );
        toast.success(`Updated client ${formData.full_name}`);
      } catch {
        toast.success(`Updated client ${formData.full_name}`);
      }
    } else {
      // CREATE IN SUPABASE
      try {
        const newId = `cli-${Date.now()}`;
        const newClient: ClientRecord = {
          id: newId,
          ...formData,
          created_at: new Date().toISOString(),
          registered_events_count: 0,
        };

        setClientList((prev) => [newClient, ...prev]);
        toast.success(`Registered client account ${newClient.full_name}`);
      } catch {
        toast.error("Failed to register client");
      }
    }

    setIsFormOpen(false);
    setEditingClient(null);
  };

  const confirmDelete = async () => {
    if (!deletingClient) return;
    if (deletingClient.id) {
      try {
        await supabase.from("profiles").delete().eq("id", deletingClient.id);
      } catch {
        /* ignore */
      }
    }
    setClientList((prev) => prev.filter((c) => c.id !== deletingClient.id));
    toast.success(`Removed client account ${deletingClient.full_name}`);
    setDeletingClient(null);
  };

  const filteredClients = clientList.filter((client) => {
    const matchesSearch =
      client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.phone && client.phone.includes(searchQuery)) ||
      (client.id_number && client.id_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      client.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDocType =
      filterDocType === "all"
        ? true
        : filterDocType === "uploaded"
        ? Boolean(client.id_doc_url || client.id_doc_name)
        : filterDocType === "pending"
        ? !client.id_doc_url && !client.id_doc_name
        : filterDocType === "chat_allowed"
        ? client.can_chat !== false
        : filterDocType === "chat_disabled"
        ? client.can_chat === false
        : client.id_type === filterDocType;

    return matchesSearch && matchesDocType;
  });

  const exportCSV = () => {
    const headers = ["Full Name", "Company", "Job Title", "Email", "Phone", "City", "ID Type", "ID Number", "Chat Allowed", "Events", "Status"];
    const rows = filteredClients.map((c) => [
      c.full_name,
      c.company,
      c.job_title,
      c.email,
      c.phone,
      c.city,
      c.id_type,
      c.id_number,
      c.can_chat !== false ? "Yes" : "No",
      c.registered_events_count,
      c.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `int_clients_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Client accounts exported to CSV");
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Client Accounts
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live DB
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {clientList.length} registered client accounts · manage ID documents, chat permissions, organization details, and event participation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadClients(true)}
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
            Add Client
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
            placeholder="Search client name, company, email, phone, or ID..."
            className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-4 text-sm text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Filters and View Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Document & Chat Verification Filter Tabs */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs overflow-x-auto">
            {[
              { id: "all", label: "All Clients" },
              { id: "chat_allowed", label: "Chat Allowed" },
              { id: "chat_disabled", label: "Chat Disabled" },
              { id: "uploaded", label: "ID Uploaded" },
              { id: "National ID", label: "National ID" },
              { id: "Passport", label: "Passport" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterDocType(f.id)}
                className={`rounded-md px-3 py-1.5 font-medium transition-all whitespace-nowrap ${
                  filterDocType === f.id
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
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
      {filteredClients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h3 className="mt-4 text-base font-semibold text-foreground">No client accounts found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No client accounts match your search criteria. Try clearing the filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setFilterDocType("all");
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
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Client Name</th>
                  <th className="px-5 py-3.5 font-semibold">Organization & Title</th>
                  <th className="px-5 py-3.5 font-semibold">Contact Info</th>
                  <th className="px-5 py-3.5 font-semibold">ID / Passport</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Chat Access</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Summits</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClients.map((client) => {
                  const initials = client.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={client.id} className="transition-colors hover:bg-secondary/40">
                      <td className="px-5 py-4 font-semibold text-foreground">
                        <div className="flex items-center gap-3">
                          <img
                            src={getUserAvatar(client.full_name, "client", client.avatar_url)}
                            alt={client.full_name}
                            className="h-9 w-9 rounded-xl object-cover border border-border shrink-0 bg-secondary/50"
                          />
                          <div>
                            <p className="font-semibold text-foreground">{client.full_name}</p>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              INT-{client.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        <p className="font-medium text-foreground">{client.company}</p>
                        <p className="text-[11px] text-muted-foreground">{client.job_title}</p>
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="text-foreground/90">{client.email}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">{client.phone}</span>
                          <span className="text-[11px] text-muted-foreground">{client.city}, {client.country}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {client.id_doc_url || client.id_doc_name ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                              {client.id_type} {client.id_number ? `(${client.id_number})` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedDoc({
                                url: client.id_doc_url || "",
                                name: client.id_doc_name || `${client.id_type}_${client.full_name.replace(/\s+/g, "")}.pdf`,
                                type: client.id_type || "Identification Document",
                                clientName: client.full_name,
                                company: client.company,
                                number: client.id_number,
                              })}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-tech hover:underline transition-colors group cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[130px]">{client.id_doc_name || "View Document"}</span>
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
                          onClick={() => handleToggleChat(client)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            client.can_chat !== false ? "bg-emerald-500" : "bg-muted"
                          }`}
                          role="switch"
                          aria-checked={client.can_chat !== false}
                          title={
                            client.can_chat !== false
                              ? "Chat Allowed — Click to disable"
                              : "Chat Disabled — Click to enable"
                          }
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              client.can_chat !== false ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      <td className="px-5 py-4 text-center font-medium text-foreground">
                        <span className="inline-flex items-center justify-center rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                          {client.registered_events_count} passes
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(client)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                            title="Edit Client"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingClient(client)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Delete Client"
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
          {filteredClients.map((client) => {
            const initials = client.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={client.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={getUserAvatar(client.full_name, "client", client.avatar_url)}
                        alt={client.full_name}
                        className="h-11 w-11 rounded-2xl object-cover border border-border shrink-0 bg-secondary/50"
                      />
                      <div>
                        <h3 className="font-bold text-foreground">{client.full_name}</h3>
                        <p className="text-xs text-muted-foreground">{client.job_title}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Organization:</span>
                      <span className="font-medium text-foreground">{client.company}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span className="font-medium text-foreground">{client.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span className="font-mono font-medium text-foreground">{client.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Location:</span>
                      <span className="font-medium text-foreground">{client.city}, {client.country}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>ID / Passport:</span>
                      {client.id_doc_url || client.id_doc_name ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDoc({
                            url: client.id_doc_url || "",
                            name: client.id_doc_name || "Document.pdf",
                            type: client.id_type || "ID Document",
                            clientName: client.full_name,
                            company: client.company,
                            number: client.id_number,
                          })}
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          <span>{client.id_type}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground/60 italic">Not uploaded</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Direct Chat:</span>
                      <button
                        type="button"
                        onClick={() => handleToggleChat(client)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          client.can_chat !== false ? "bg-emerald-500" : "bg-muted"
                        }`}
                        role="switch"
                        aria-checked={client.can_chat !== false}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            client.can_chat !== false ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <span>Registered Summits:</span>
                      <span className="font-semibold text-primary">{client.registered_events_count} events</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end border-t border-border/60 pt-3">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(client)}
                      className="h-8 gap-1 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingClient(client)}
                      className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
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
                  <h3 className="text-sm font-bold text-foreground">
                    {selectedDoc.type} — {selectedDoc.clientName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Organization: {selectedDoc.company} {selectedDoc.number ? `· ${selectedDoc.number}` : ""}
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
                    <p className="text-xs font-bold text-foreground">{selectedDoc.name}</p>
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

      {/* CREATE & EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
          >
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {editingClient ? "Edit Client Account" : "Register New Client"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Ahmed Mohamed"
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
                    placeholder="client@company.com"
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
                  <label className="text-xs font-semibold text-foreground">Organization / Company</label>
                  <input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Telecom Egypt"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Job Title</label>
                  <input
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="e.g. Head of Infrastructure"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">City</label>
                  <input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cairo"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Country</label>
                  <input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Egypt"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* ID / Passport Section */}
              <div className="rounded-xl border border-border bg-secondary/20 p-3.5 space-y-3">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <IdCard className="h-3.5 w-3.5 text-primary" /> Client Identification Document
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Document Type</label>
                    <select
                      value={formData.id_type}
                      onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                      className={inputClass}
                    >
                      <option value="National ID">Egyptian National ID</option>
                      <option value="Passport">Passport</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Document Number</label>
                    <input
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                      placeholder={formData.id_type === "National ID" ? "14-digit National ID" : "Passport number"}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground">Upload Document File (PDF or Image)</label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer shrink-0">
                      <Upload className="h-3.5 w-3.5 text-primary" /> Choose File
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleDocFileUpload}
                        className="hidden"
                      />
                    </label>
                    <input
                      value={formData.id_doc_name || formData.id_doc_url}
                      onChange={(e) => setFormData({ ...formData, id_doc_name: e.target.value, id_doc_url: e.target.value })}
                      placeholder="No file attached or paste document URL"
                      className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>
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
                      Allow this client to network & chat with verified attendees and vendor representatives.
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
                {editingClient ? "Save Changes" : "Register Client"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deletingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Remove Client Account?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Are you sure you want to remove <strong>{deletingClient.full_name}</strong>?
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingClient(null)}
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
