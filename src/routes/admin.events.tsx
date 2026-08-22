import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plus,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  Download,
  AlertTriangle,
  X,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  Globe,
  Building2,
  User,
  Clock,
  Trash,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/int/status-badge";
import { events as initialEvents, type IntEvent, type Speaker, type AgendaItem } from "@/lib/int-data";
import { getEvents, createEvent, updateEvent, deleteEvent } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/events")({
  head: () => ({
    meta: [
      { title: "Manage Events (Live Supabase) — INT Events Admin" },
      {
        name: "description",
        content: "Create, edit, search, filter and monitor Integrated Technics events with live Supabase database sync.",
      },
      { property: "og:title", content: "Manage Events — INT Events Admin" },
      { property: "og:description", content: "Event creation and management with live DB sync." },
    ],
  }),
  component: AdminEventsPage,
});

export interface PartnerEntry {
  name: string;
  category?: string;
  logo?: string;
}

type EventFormValues = {
  title: string;
  category: string;
  date: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  city: string;
  venue: string;
  mapUrl: string;
  image: string;
  capacity: number;
  registered: number;
  status: "open" | "upcoming" | "almost-full" | "completed" | "cancelled";
  summary: string;
  partners: string;
  partnerList: PartnerEntry[];
  speakers: Speaker[];
  agenda: AgendaItem[];
};

const defaultFormValues: EventFormValues = {
  title: "",
  category: "Summit",
  date: new Date().toISOString().split("T")[0]!,
  dateLabel: "15 September 2026",
  startTime: "09:00 AM",
  endTime: "05:00 PM",
  city: "Cairo, Egypt",
  venue: "INT Headquarters, Grand Hall",
  mapUrl: "https://maps.google.com/?q=Cairo,Egypt",
  image: "",
  capacity: 250,
  registered: 0,
  status: "open",
  summary: "Comprehensive executive summit focusing on integrated infrastructure and unified security.",
  partners: "Genetec, Axis Communications, Cisco",
  partnerList: [
    { name: "Genetec", category: "Unified Security Partner", logo: "" },
    { name: "Axis Communications", category: "Network Video Sponsor", logo: "" },
  ],
  speakers: [
    { name: "Eng. Karim Nabil", position: "CTO", company: "Integrated Technics", bio: "Leads INT technology strategy." },
  ],
  agenda: [
    { time: "09:00 AM", title: "Registration & Welcome Coffee", detail: "Badge issuance at main entrance" },
    { time: "10:00 AM", title: "Keynote: Next-Gen Infrastructure", detail: "Main Ballroom stage" },
  ],
};

export function AdminEventsPage() {
  const [eventsList, setEventsList] = useState<IntEvent[]>(initialEvents);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [refreshing, setRefreshing] = useState(false);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<"details" | "location" | "media" | "partners" | "agenda">("details");
  const [editingEvent, setEditingEvent] = useState<IntEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<IntEvent | null>(null);
  const [formData, setFormData] = useState<EventFormValues>(defaultFormValues);

  // Load real events from Supabase
  const loadEvents = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const realEvents = await getEvents();
      if (realEvents && realEvents.length > 0) {
        setEventsList(realEvents);
      }
      if (showToast) {
        toast.success("Events synced with Supabase database!");
      }
    } catch {
      console.warn("Could not sync events with Supabase, using local cache");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Filtered list
  const filteredEvents = useMemo(() => {
    return eventsList.filter((ev) => {
      const matchesSearch =
        ev.title.toLowerCase().includes(search.toLowerCase()) ||
        ev.code.toLowerCase().includes(search.toLowerCase()) ||
        ev.city.toLowerCase().includes(search.toLowerCase()) ||
        ev.venue.toLowerCase().includes(search.toLowerCase()) ||
        ev.category.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" && (ev.status === "registration-open" || ev.status === "almost-full")) ||
        ev.status === statusFilter ||
        (statusFilter === "open" && (ev.status as any) === "open");

      return matchesSearch && matchesStatus;
    });
  }, [eventsList, search, statusFilter]);

  // Open Create Dialog
  const openCreateDialog = () => {
    setFormData({
      ...defaultFormValues,
      date: new Date().toISOString().split("T")[0]!,
      partnerList: [
        { name: "Genetec", category: "Unified Security Partner", logo: "" },
        { name: "Axis Communications", category: "Network Video Sponsor", logo: "" },
      ],
      speakers: [
        { name: "Eng. Karim Nabil", position: "CTO", company: "Integrated Technics", bio: "Leads INT technology strategy." },
      ],
      agenda: [
        { time: "09:00 AM", title: "Registration & Welcome Coffee", detail: "Badge issuance at main entrance" },
        { time: "10:00 AM", title: "Keynote: Next-Gen Infrastructure", detail: "Main Ballroom stage" },
      ],
    });
    setEditingEvent(null);
    setActiveFormTab("details");
    setIsCreateOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (ev: IntEvent) => {
    setEditingEvent(ev);
    setFormData({
      title: ev.title,
      category: ev.category,
      date: ev.date,
      dateLabel: ev.dateLabel,
      startTime: ev.startTime || "09:00 AM",
      endTime: ev.endTime || "05:00 PM",
      city: ev.city,
      venue: ev.venue,
      mapUrl: ev.mapUrl || "",
      image: ev.image || "",
      capacity: ev.capacity,
      registered: ev.registered,
      status: ev.status === "registration-open" ? "open" : (ev.status as any),
      summary: ev.summary || "",
      partners: ev.partners ? ev.partners.join(", ") : "",
      partnerList: ev.partnerList && ev.partnerList.length > 0
        ? ev.partnerList
        : (ev.partners || []).map((p) => ({ name: p, category: "Partner Sponsor", logo: "" })),
      speakers: ev.speakers || [],
      agenda: ev.agenda || [],
    });
    setActiveFormTab("details");
    setIsCreateOpen(true);
  };

  // Handle Image Upload File
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, image: reader.result as string }));
        toast.success("Event banner uploaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Partner Logo Upload
  const handlePartnerLogoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => {
          const updated = [...prev.partnerList];
          if (updated[index]) {
            updated[index] = { ...updated[index]!, logo: reader.result as string };
          }
          return { ...prev, partnerList: updated };
        });
        toast.success("Partner logo uploaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Add new Partner
  const handleAddPartner = () => {
    setFormData((prev) => ({
      ...prev,
      partnerList: [...prev.partnerList, { name: "", category: "Exhibitor Partner", logo: "" }],
    }));
  };

  // Remove Partner
  const handleRemovePartner = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      partnerList: prev.partnerList.filter((_, i) => i !== index),
    }));
  };

  // Add Speaker
  const handleAddSpeaker = () => {
    setFormData((prev) => ({
      ...prev,
      speakers: [...prev.speakers, { name: "", position: "", company: "", bio: "" }],
    }));
  };

  // Remove Speaker
  const handleRemoveSpeaker = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      speakers: prev.speakers.filter((_, i) => i !== index),
    }));
  };

  // Add Agenda Item
  const handleAddAgenda = () => {
    setFormData((prev) => ({
      ...prev,
      agenda: [...prev.agenda, { time: "11:00 AM", title: "", detail: "" }],
    }));
  };

  // Remove Agenda Item
  const handleRemoveAgenda = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      agenda: prev.agenda.filter((_, i) => i !== index),
    }));
  };

  // Handle Save (Create or Update)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter an event title");
      return;
    }

    const partnerNames = formData.partnerList.map((p) => p.name.trim()).filter(Boolean);

    if (editingEvent) {
      // UPDATE in Supabase & Local State
      const updatedEvent: Partial<IntEvent> = {
        title: formData.title,
        category: formData.category,
        date: formData.date,
        dateLabel: formData.dateLabel || formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        city: formData.city,
        venue: formData.venue,
        mapUrl: formData.mapUrl,
        image: formData.image,
        capacity: Number(formData.capacity),
        registered: Number(formData.registered),
        status: formData.status === "open" ? "registration-open" : (formData.status as any),
        summary: formData.summary,
        partners: partnerNames.length > 0 ? partnerNames : formData.partners.split(",").map((p) => p.trim()).filter(Boolean),
        partnerList: formData.partnerList,
        speakers: formData.speakers,
        agenda: formData.agenda,
      };

      await updateEvent(editingEvent.id, updatedEvent);

      setEventsList((prev) =>
        prev.map((ev) => (ev.id === editingEvent.id ? { ...ev, ...updatedEvent } : ev))
      );
      toast.success(`Event "${formData.title}" updated in database!`);
    } else {
      // CREATE in Supabase & Local State
      const nextNum = eventsList.length + 1;
      const newId = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const newEvent: IntEvent = {
        id: newId || `event-${Date.now()}`,
        code: `INT-EVT-2026-${String(nextNum).padStart(2, "0")}`,
        title: formData.title,
        category: formData.category,
        date: formData.date,
        dateLabel: formData.dateLabel || formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        city: formData.city,
        venue: formData.venue,
        mapUrl: formData.mapUrl,
        image: formData.image,
        capacity: Number(formData.capacity),
        registered: Number(formData.registered),
        checkedIn: 0,
        status: formData.status === "open" ? "registration-open" : (formData.status as any),
        organizer: "Integrated Technics",
        summary: formData.summary,
        description: [formData.summary],
        partners: partnerNames.length > 0 ? partnerNames : formData.partners.split(",").map((p) => p.trim()).filter(Boolean),
        partnerList: formData.partnerList,
        speakers: formData.speakers,
        agenda: formData.agenda,
      };

      await createEvent(newEvent);
      setEventsList((prev) => [newEvent, ...prev]);
      toast.success(`New event "${newEvent.title}" saved to Supabase!`);
    }

    setIsCreateOpen(false);
    setEditingEvent(null);
  };

  // Handle Delete
  const confirmDelete = async () => {
    if (!deletingEvent) return;
    await deleteEvent(deletingEvent.id);
    setEventsList((prev) => prev.filter((ev) => ev.id !== deletingEvent.id));
    toast.success(`Event "${deletingEvent.title}" removed from database.`);
    setDeletingEvent(null);
  };

  // Handle Duplicate
  const handleDuplicate = async (ev: IntEvent) => {
    const dup: IntEvent = {
      ...ev,
      id: `${ev.id}-copy-${Date.now()}`,
      code: `INT-EVT-2026-${String(eventsList.length + 1).padStart(2, "0")}`,
      title: `${ev.title} (Copy)`,
      registered: 0,
      checkedIn: 0,
      status: "upcoming",
    };
    await createEvent(dup);
    setEventsList((prev) => [dup, ...prev]);
    toast.success(`Duplicated "${ev.title}" to database!`);
  };

  // Export Events to CSV
  const handleExportCsv = () => {
    let csv = "Code,Title,Category,Date,Venue,City,Capacity,Registered,Status\n";
    filteredEvents.forEach((ev) => {
      csv += `"${ev.code}","${ev.title}","${ev.category}","${ev.dateLabel}","${ev.venue}","${ev.city}",${ev.capacity},${ev.registered},"${ev.status}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `int-events-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Exported events list to CSV!");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Event Management
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live DB
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {eventsList.length} total events · real-time Supabase sync, capacity controls, map links, and partner logos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadEvents(true)}
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
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            Export CSV
          </button>
          <button
            onClick={openCreateDialog}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-tech transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>
      </div>

      {/* Filter and View Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events by title, code, venue, city..."
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            {["all", "open", "upcoming", "completed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-3 py-1.5 font-medium capitalize transition-all ${
                  statusFilter === st
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st === "all" ? "All Statuses" : st === "open" ? "Registration Open" : st}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`rounded p-1.5 transition-colors ${viewMode === "table" ? "bg-secondary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Table View"
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded p-1.5 transition-colors ${viewMode === "grid" ? "bg-secondary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Event</th>
                  <th className="px-4 py-3.5 font-semibold">Category</th>
                  <th className="px-4 py-3.5 font-semibold">Date & Time</th>
                  <th className="px-4 py-3.5 font-semibold">Venue & Map</th>
                  <th className="px-4 py-3.5 font-semibold">Capacity</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEvents.map((ev) => {
                  const percent = Math.min(100, Math.round((ev.registered / ev.capacity) * 100)) || 0;
                  return (
                    <tr key={ev.id} className="transition-colors hover:bg-secondary/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {ev.image ? (
                            <img src={ev.image} alt={ev.title} className="h-10 w-14 rounded-md object-cover border border-border shrink-0" />
                          ) : (
                            <div className="grid h-10 w-14 place-items-center rounded-md bg-secondary text-muted-foreground shrink-0 border border-border">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-foreground text-xs sm:text-sm line-clamp-1">{ev.title}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{ev.code}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-xs font-semibold text-foreground">
                          {ev.category}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs">
                        <p className="font-semibold text-foreground">{ev.dateLabel}</p>
                        <p className="text-muted-foreground">{ev.startTime} - {ev.endTime}</p>
                      </td>

                      <td className="px-4 py-4 text-xs">
                        <p className="font-semibold text-foreground line-clamp-1">{ev.venue}</p>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span>{ev.city}</span>
                          {ev.mapUrl && (
                            <a
                              href={ev.mapUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-0.5"
                              title="Open on Google Maps"
                            >
                              <MapPin className="h-3 w-3" /> Map
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="w-32 space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono font-medium text-foreground">
                            <span>{ev.registered}/{ev.capacity}</span>
                            <span className="text-[10px] text-muted-foreground">{percent}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={`h-full transition-all ${
                                percent > 90 ? "bg-destructive" : percent > 60 ? "bg-amber-500" : "bg-primary"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={ev.status} />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to="/events/$eventId"
                            params={{ eventId: ev.id }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            title="View Public Page"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDuplicate(ev)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            title="Duplicate Event"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditDialog(ev)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            title="Edit Event"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingEvent(ev)}
                            className="rounded-lg p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Delete Event"
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
        /* GRID VIEW */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((ev) => (
            <div key={ev.id} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all">
              <div>
                {ev.image ? (
                  <img src={ev.image} alt={ev.title} className="h-36 w-full rounded-xl object-cover mb-4 border border-border" />
                ) : (
                  <div className="h-36 w-full rounded-xl bg-secondary flex items-center justify-center mb-4 text-muted-foreground">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">{ev.category}</span>
                  <StatusBadge status={ev.status} />
                </div>
                <h3 className="font-bold text-foreground text-base line-clamp-1">{ev.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ev.summary}</p>
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground border-t border-border pt-3">
                  <p className="flex items-center gap-1.5 font-medium text-foreground">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> {ev.dateLabel} · {ev.startTime}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {ev.venue}, {ev.city}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
                <span className="font-mono text-xs font-semibold text-foreground">
                  {ev.registered}/{ev.capacity} Seats
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditDialog(ev)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDuplicate(ev)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeletingEvent(ev)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE & EDIT MODAL DIALOG WITH MULTI-TAB CONTROLS */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-elevated overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <header className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {editingEvent ? "Edit Summit Parameters" : "Create New Summit / Event"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {editingEvent ? `Configuring ${editingEvent.code}` : "Set up title, location map, partner logos, and agenda"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Modal Tab Navigation */}
            <div className="flex border-b border-border bg-muted/40 px-6 text-xs font-semibold overflow-x-auto">
              {[
                { id: "details", label: "1. Overview & Capacity" },
                { id: "location", label: "2. Date, Venue & Map" },
                { id: "media", label: "3. Banner Image" },
                { id: "partners", label: `4. Partners (${formData.partnerList.length})` },
                { id: "agenda", label: "5. Speakers & Agenda" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFormTab(tab.id as any)}
                  className={`py-3 px-3 border-b-2 font-medium transition-all whitespace-nowrap ${
                    activeFormTab === tab.id
                      ? "border-primary text-primary font-bold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveEvent} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* TAB 1: DETAILS */}
              {activeFormTab === "details" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Event Title <span className="text-destructive">*</span>
                    </label>
                    <input
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. INT Security Technology Summit 2026"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Event Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className={inputClass}
                      >
                        <option value="Summit">Summit</option>
                        <option value="Forum">Forum</option>
                        <option value="Partner Day">Partner Day</option>
                        <option value="Technical Workshop">Technical Workshop</option>
                        <option value="Executive Roundtable">Executive Roundtable</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value as EventFormValues["status"] })
                        }
                        className={inputClass}
                      >
                        <option value="open">Registration Open</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="almost-full">Almost Full</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Total Capacity Seats <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Current Registered</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.registered}
                        onChange={(e) => setFormData({ ...formData, registered: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Summary & Objectives</label>
                    <textarea
                      rows={3}
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      placeholder="Overview of the event, key themes, and attendee value..."
                      className={textareaClass}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: DATE, LOCATION & MAP URL */}
              {activeFormTab === "location" && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Event Date <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Date Display Label</label>
                      <input
                        value={formData.dateLabel}
                        onChange={(e) => setFormData({ ...formData, dateLabel: e.target.value })}
                        placeholder="e.g. 15 September 2026"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Start Time</label>
                      <input
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        placeholder="09:00 AM"
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">End Time</label>
                      <input
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        placeholder="05:00 PM"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">City & Country</label>
                      <input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Cairo, Egypt"
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Venue Name & Hall</label>
                      <input
                        value={formData.venue}
                        onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                        placeholder="e.g. Nile Ritz-Carlton, Grand Ballroom"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Google Maps URL Field */}
                  <div className="space-y-1.5 rounded-xl border border-border bg-secondary/20 p-3.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" /> Venue Location Map URL (Google Maps)
                      </span>
                      {formData.mapUrl && (
                        <a
                          href={formData.mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          Preview Map Link <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </label>
                    <input
                      value={formData.mapUrl}
                      onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                      placeholder="https://maps.google.com/?q=Nile+Ritz+Carlton+Cairo"
                      className={inputClass}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Attendees will be able to click this link directly from their digital passes and event details.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: BANNER IMAGE UPLOAD */}
              {activeFormTab === "media" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Event Hero Banner Image</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">Upload image file:</label>
                        <label className="flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed border-border bg-secondary/30 hover:bg-secondary/60 cursor-pointer transition-colors p-4 text-center">
                          <Upload className="h-6 w-6 text-primary mb-1" />
                          <span className="text-xs font-semibold text-foreground">Choose Banner Image</span>
                          <span className="text-[10px] text-muted-foreground">PNG, JPG or WebP</span>
                          <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                        </label>
                      </div>

                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">Or paste image URL:</label>
                        <input
                          value={formData.image}
                          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                          placeholder="https://images.unsplash.com/..."
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  {formData.image && (
                    <div className="rounded-xl border border-border bg-card p-3 shadow-inner space-y-1.5">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-primary" /> Banner Live Preview
                      </span>
                      <img
                        src={formData.image}
                        alt="Event Banner"
                        className="h-44 w-full rounded-lg object-cover border border-border"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PARTNERS & EXHIBITORS (WITH LOGOS) */}
              {activeFormTab === "partners" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Participating Partners & Exhibitor Logos
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Upload logos and define tiers for each sponsoring company.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPartner}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add Partner
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.partnerList.map((partner, index) => (
                      <div key={index} className="rounded-xl border border-border bg-card p-3.5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Partner #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePartner(index)}
                            className="text-destructive hover:text-destructive/80 p-1"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">Company Name</label>
                            <input
                              value={partner.name}
                              onChange={(e) => {
                                const updated = [...formData.partnerList];
                                if (updated[index]) updated[index] = { ...updated[index]!, name: e.target.value };
                                setFormData({ ...formData, partnerList: updated });
                              }}
                              placeholder="e.g. Genetec"
                              className={inputClass}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">Category / Sponsor Tier</label>
                            <input
                              value={partner.category || ""}
                              onChange={(e) => {
                                const updated = [...formData.partnerList];
                                if (updated[index]) updated[index] = { ...updated[index]!, category: e.target.value };
                                setFormData({ ...formData, partnerList: updated });
                              }}
                              placeholder="e.g. Platinum Partner"
                              className={inputClass}
                            />
                          </div>
                        </div>

                        {/* Logo upload row */}
                        <div className="flex items-center gap-3 pt-1 border-t border-border/60">
                          {partner.logo ? (
                            <img src={partner.logo} alt={partner.name} className="h-10 w-16 object-contain rounded bg-white p-1 border border-border" />
                          ) : (
                            <div className="grid h-10 w-16 place-items-center rounded bg-secondary text-muted-foreground text-[10px] font-mono border border-border">
                              No Logo
                            </div>
                          )}

                          <label className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer">
                            <Upload className="h-3 w-3 text-primary" /> Upload Logo
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePartnerLogoUpload(index, e)}
                              className="hidden"
                            />
                          </label>

                          <input
                            value={partner.logo || ""}
                            onChange={(e) => {
                              const updated = [...formData.partnerList];
                              if (updated[index]) updated[index] = { ...updated[index]!, logo: e.target.value };
                              setFormData({ ...formData, partnerList: updated });
                            }}
                            placeholder="or paste logo URL"
                            className="h-8 flex-1 rounded-lg border border-input bg-background px-2 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: SPEAKERS & AGENDA */}
              {activeFormTab === "agenda" && (
                <div className="space-y-6">
                  {/* Speakers Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Keynote Speakers ({formData.speakers.length})
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddSpeaker}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                      >
                        <Plus className="h-3 w-3" /> Add Speaker
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formData.speakers.map((sp, idx) => (
                        <div key={idx} className="flex gap-2 items-center rounded-xl border border-border bg-card p-3">
                          <input
                            value={sp.name}
                            onChange={(e) => {
                              const updated = [...formData.speakers];
                              if (updated[idx]) updated[idx] = { ...updated[idx]!, name: e.target.value };
                              setFormData({ ...formData, speakers: updated });
                            }}
                            placeholder="Speaker Name"
                            className="h-8 flex-1 rounded-lg border border-input bg-background px-2 text-xs"
                          />
                          <input
                            value={sp.position}
                            onChange={(e) => {
                              const updated = [...formData.speakers];
                              if (updated[idx]) updated[idx] = { ...updated[idx]!, position: e.target.value };
                              setFormData({ ...formData, speakers: updated });
                            }}
                            placeholder="Job Title"
                            className="h-8 flex-1 rounded-lg border border-input bg-background px-2 text-xs"
                          />
                          <input
                            value={sp.company}
                            onChange={(e) => {
                              const updated = [...formData.speakers];
                              if (updated[idx]) updated[idx] = { ...updated[idx]!, company: e.target.value };
                              setFormData({ ...formData, speakers: updated });
                            }}
                            placeholder="Company"
                            className="h-8 flex-1 rounded-lg border border-input bg-background px-2 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSpeaker(idx)}
                            className="text-destructive p-1"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Agenda Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Agenda Timeline ({formData.agenda.length})
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddAgenda}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                      >
                        <Plus className="h-3 w-3" /> Add Timeline Item
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formData.agenda.map((ag, idx) => (
                        <div key={idx} className="flex gap-2 items-center rounded-xl border border-border bg-card p-3">
                          <input
                            value={ag.time}
                            onChange={(e) => {
                              const updated = [...formData.agenda];
                              if (updated[idx]) updated[idx] = { ...updated[idx]!, time: e.target.value };
                              setFormData({ ...formData, agenda: updated });
                            }}
                            placeholder="09:00 AM"
                            className="h-8 w-28 rounded-lg border border-input bg-background px-2 text-xs font-mono"
                          />
                          <input
                            value={ag.title}
                            onChange={(e) => {
                              const updated = [...formData.agenda];
                              if (updated[idx]) updated[idx] = { ...updated[idx]!, title: e.target.value };
                              setFormData({ ...formData, agenda: updated });
                            }}
                            placeholder="Session Title / Keynote"
                            className="h-8 flex-1 rounded-lg border border-input bg-background px-2 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveAgenda(idx)}
                            className="text-destructive p-1"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-6 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-tech transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {editingEvent ? "Save Event Changes" : "Create & Publish Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <div className="flex items-center gap-3 text-destructive">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-foreground">Remove Event</h2>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{deletingEvent.title}</span>? This will permanently remove the event from Supabase database.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-destructive px-5 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 shadow-sm transition-colors"
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

const textareaClass =
  "w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground shadow-2xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";
