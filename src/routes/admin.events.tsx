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
} from "lucide-react";
import { StatusBadge } from "@/components/int/status-badge";
import { events as initialEvents, type IntEvent } from "@/lib/int-data";
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

type EventFormValues = {
  title: string;
  category: string;
  date: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  city: string;
  venue: string;
  capacity: number;
  registered: number;
  status: "open" | "upcoming" | "almost-full" | "completed" | "cancelled";
  summary: string;
  partners: string;
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
  capacity: 250,
  registered: 0,
  status: "open",
  summary: "Comprehensive executive summit focusing on integrated infrastructure and unified security.",
  partners: "Genetec, Axis Communications, Cisco",
};

export function AdminEventsPage() {
  const [eventsList, setEventsList] = useState<IntEvent[]>(initialEvents);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [refreshing, setRefreshing] = useState(false);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
    });
    setEditingEvent(null);
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
      capacity: ev.capacity,
      registered: ev.registered,
      status: ev.status === "registration-open" ? "open" : (ev.status as any),
      summary: ev.summary || "",
      partners: ev.partners ? ev.partners.join(", ") : "",
    });
    setIsCreateOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter an event title");
      return;
    }

    if (editingEvent) {
      // UPDATE in Supabase & Local State
      const updatedEvent: Partial<IntEvent> = {
        title: formData.title,
        category: formData.category,
        date: formData.date,
        dateLabel: formData.dateLabel,
        startTime: formData.startTime,
        endTime: formData.endTime,
        city: formData.city,
        venue: formData.venue,
        capacity: Number(formData.capacity),
        registered: Number(formData.registered),
        status: formData.status === "open" ? "registration-open" : (formData.status as any),
        summary: formData.summary,
        partners: formData.partners
          ? formData.partners.split(",").map((p) => p.trim())
          : [],
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
        dateLabel: formData.dateLabel,
        startTime: formData.startTime,
        endTime: formData.endTime,
        city: formData.city,
        venue: formData.venue,
        image: "",
        capacity: Number(formData.capacity),
        registered: Number(formData.registered),
        checkedIn: 0,
        status: formData.status === "open" ? "registration-open" : (formData.status as any),
        organizer: "Integrated Technics",
        summary: formData.summary,
        description: [formData.summary],
        partners: formData.partners
          ? formData.partners.split(",").map((p) => p.trim())
          : ["Genetec", "Axis Communications"],
        speakers: [
          {
            name: "Hafez Rahim",
            position: "Platform Lead",
            company: "Integrated Technics",
            bio: "Leads INT event platform operations.",
          },
        ],
        agenda: [
          { time: "09:00", title: "Registration & QR Check-in" },
          { time: "10:00", title: "Opening Keynote" },
          { time: "12:30", title: "Technology Tracks & Live Labs" },
          { time: "04:30", title: "Certificates & Closing" },
        ],
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
            {eventsList.length} total events · real-time Supabase sync, capacity controls and CRUD.
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
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button
            onClick={openCreateDialog}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-tech"
          >
            <Plus className="h-4 w-4" /> Create Event
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events by title, code, city, or venue…"
            className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-4 text-sm text-foreground shadow-2xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Filters & View Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Status Tabs */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "open", label: "Open" },
              { id: "upcoming", label: "Upcoming" },
              { id: "almost-full", label: "Almost Full" },
              { id: "completed", label: "Completed" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium transition-all ${
                  statusFilter === tab.id
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
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
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-all ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No events found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No events match your current search or filter criteria.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="mt-4 inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Event</th>
                  <th className="px-4 py-3.5 font-semibold">Category</th>
                  <th className="px-4 py-3.5 font-semibold">Date & Time</th>
                  <th className="px-4 py-3.5 font-semibold">Location</th>
                  <th className="px-4 py-3.5 font-semibold">Capacity & Reg.</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEvents.map((event) => {
                  const fillPct = Math.min(100, Math.round((event.registered / event.capacity) * 100));
                  return (
                    <tr key={event.id} className="transition-colors hover:bg-secondary/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {event.image ? (
                            <img
                              src={event.image}
                              alt=""
                              className="h-10 w-14 rounded-lg object-cover shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="grid h-10 w-12 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                              <Calendar className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate max-w-[240px]">
                              {event.title}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {event.code}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs font-medium text-foreground">
                        <span className="rounded-md bg-secondary px-2 py-1">
                          {event.category}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">{event.dateLabel}</p>
                        <p className="text-[11px]">{event.startTime || "09:00 AM"}</p>
                      </td>

                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground truncate max-w-[140px]">{event.city}</p>
                        <p className="text-[11px] truncate max-w-[140px]">{event.venue}</p>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-semibold text-foreground">
                            {event.registered} / {event.capacity}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{fillPct}%</span>
                        </div>
                        <div className="mt-1.5 h-2 w-28 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all ${
                              fillPct >= 90
                                ? "bg-amber-500"
                                : fillPct >= 100
                                ? "bg-destructive"
                                : "bg-primary"
                            }`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={event.status} />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to="/events/$eventId"
                            params={{ eventId: event.id }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            title="View Public Page"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDuplicate(event)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            title="Duplicate Event"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditDialog(event)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                            title="Edit Event"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingEvent(event)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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
        /* GRID CARDS VIEW */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => {
            const fillPct = Math.min(100, Math.round((event.registered / event.capacity) * 100));
            return (
              <div
                key={event.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  {event.image ? (
                    <div className="relative h-40 w-full overflow-hidden bg-muted">
                      <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
                      <div className="absolute left-3 top-3">
                        <StatusBadge status={event.status} />
                      </div>
                      <span className="absolute right-3 top-3 rounded-md bg-navy/80 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                        {event.code}
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-28 items-center justify-between bg-gradient-to-br from-primary/10 to-primary/5 p-4 border-b border-border">
                      <StatusBadge status={event.status} />
                      <span className="font-mono text-xs text-muted-foreground">{event.code}</span>
                    </div>
                  )}

                  <div className="p-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      {event.category}
                    </span>
                    <h3 className="mt-1 text-base font-bold text-foreground line-clamp-1">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {event.summary || "No description provided."}
                    </p>

                    <div className="mt-4 space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{event.dateLabel} · {event.startTime || "09:00 AM"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{event.venue}, {event.city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{event.registered} / {event.capacity} Registered ({fillPct}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3">
                  <Link
                    to="/events/$eventId"
                    params={{ eventId: event.id }}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Public Page <ExternalLink className="h-3 w-3" />
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(event)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEditDialog(event)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingEvent(event)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE & EDIT MODAL DIALOG */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/60 p-3 backdrop-blur-sm sm:p-6">
          <form
            onSubmit={handleSaveEvent}
            className="my-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {editingEvent ? "Edit Event" : "Create New Event"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {editingEvent ? `Modifying ${editingEvent.code}` : "Fill in the event parameters and capacity."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5 sm:p-6 text-sm">
              <div className="space-y-1.5">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Summit">Summit</option>
                    <option value="Forum">Forum</option>
                    <option value="Partner Day">Partner Day</option>
                    <option value="Technical Workshop">Technical Workshop</option>
                    <option value="Webinar">Webinar</option>
                  </select>
                </div>

                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Date (YYYY-MM-DD) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Start Time</label>
                  <input
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    placeholder="09:00 AM"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">City & Country</label>
                  <input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cairo, Egypt"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Venue Location</label>
                  <input
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="e.g. Four Seasons Nile Plaza"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Capacity <span className="text-destructive">*</span>
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

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Registered Count</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.registered}
                    onChange={(e) => setFormData({ ...formData, registered: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Event Summary & Overview</label>
                <textarea
                  rows={2}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Key topics, agenda highlights and target audience…"
                  className={textareaClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Participating Partners (comma-separated)</label>
                <input
                  value={formData.partners}
                  onChange={(e) => setFormData({ ...formData, partners: e.target.value })}
                  placeholder="Genetec, Axis Communications, Cisco, Honeywell"
                  className={inputClass}
                />
              </div>
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-tech"
              >
                <CheckCircle2 className="h-4 w-4" />
                {editingEvent ? "Save Changes" : "Create Event"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Event?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Are you sure you want to delete <strong>{deletingEvent.title}</strong> ({deletingEvent.code})? This action will remove all registrations and badge passes associated with this event.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex h-9 items-center rounded-lg bg-destructive px-4 text-xs font-semibold text-destructive-foreground shadow-sm hover:bg-destructive/90"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-2xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";
const textareaClass =
  "w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-2xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";
