import { useState, useEffect, useMemo, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Link2,
  Calendar,
  Layers,
  Upload,
  ImagePlus,
  FileImage,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSliders,
  createSlider,
  updateSlider,
  deleteSlider,
  getEvents,
  type SliderItem,
} from "@/lib/api";
import type { IntEvent } from "@/lib/int-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/sliders")({
  head: () => ({
    meta: [
      { title: "Manage Sliders & Banners — INT Events Admin" },
      {
        name: "description",
        content: "Create, edit, reorder, and configure promotional hero banner sliders with live Supabase database sync.",
      },
      { property: "og:title", content: "Manage Sliders — INT Events Admin" },
      { property: "og:description", content: "Hero slider and banner management." },
    ],
  }),
  component: AdminSlidersPage,
});

type SliderFormValues = {
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  event_link: string;
  order_index: number;
  is_active: boolean;
};

const defaultForm: SliderFormValues = {
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  event_link: "",
  order_index: 0,
  is_active: true,
};

const PRESET_IMAGES = [
  {
    name: "Summit Grand Stage",
    url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&auto=format&fit=crop&q=80",
  },
  {
    name: "Keynote & Forum",
    url: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&auto=format&fit=crop&q=80",
  },
  {
    name: "Partner Exhibition",
    url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1600&auto=format&fit=crop&q=80",
  },
  {
    name: "Security Command Centre",
    url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&auto=format&fit=crop&q=80",
  },
];

export function AdminSlidersPage() {
  const [sliders, setSliders] = useState<SliderItem[]>([]);
  const [eventsList, setEventsList] = useState<IntEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<SliderItem | null>(null);
  const [deletingSlide, setDeletingSlide] = useState<SliderItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<SliderFormValues>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WebP)");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image size should be under 8MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setFormData((prev) => ({ ...prev, image_url: dataUrl }));
      toast.success(`Image "${file.name}" uploaded successfully!`);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [slidesData, evData] = await Promise.all([getSliders(), getEvents()]);
      setSliders(slidesData);
      setEventsList(evData);
    } catch (err) {
      console.warn("Failed to load sliders:", err);
      toast.error("Failed to load sliders from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSliders = useMemo(() => {
    return sliders.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.subtitle && s.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && s.is_active) ||
        (filterStatus === "inactive" && !s.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [sliders, searchQuery, filterStatus]);

  const openCreateModal = () => {
    setFormData({
      ...defaultForm,
      order_index: sliders.length + 1,
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (slide: SliderItem) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title,
      subtitle: slide.subtitle || "",
      description: slide.description || "",
      image_url: slide.image_url,
      event_link: slide.event_link || "",
      order_index: slide.order_index,
      is_active: slide.is_active,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Slide title is required");
      return;
    }
    if (!formData.image_url.trim()) {
      toast.error("Image URL is required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingSlide) {
        // Update
        const ok = await updateSlider(editingSlide.id, {
          title: formData.title.trim(),
          subtitle: formData.subtitle.trim() || null,
          description: formData.description.trim() || null,
          image_url: formData.image_url.trim(),
          event_link: formData.event_link.trim() || null,
          order_index: Number(formData.order_index),
          is_active: formData.is_active,
        });

        if (ok) {
          toast.success("Slider updated successfully!");
          setSliders((prev) =>
            prev.map((s) =>
              s.id === editingSlide.id
                ? {
                    ...s,
                    title: formData.title.trim(),
                    subtitle: formData.subtitle.trim() || null,
                    description: formData.description.trim() || null,
                    image_url: formData.image_url.trim(),
                    event_link: formData.event_link.trim() || null,
                    order_index: Number(formData.order_index),
                    is_active: formData.is_active,
                  }
                : s
            )
          );
          setEditingSlide(null);
        }
      } else {
        // Create
        const created = await createSlider({
          title: formData.title.trim(),
          subtitle: formData.subtitle.trim() || null,
          description: formData.description.trim() || null,
          image_url: formData.image_url.trim(),
          event_link: formData.event_link.trim() || null,
          order_index: Number(formData.order_index),
          is_active: formData.is_active,
        });

        if (created) {
          toast.success("New banner slide created!");
          setSliders((prev) => [...prev, created].sort((a, b) => a.order_index - b.order_index));
          setIsCreateOpen(false);
        }
      }
    } catch {
      toast.error("An error occurred while saving the slider");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (slide: SliderItem) => {
    const newStatus = !slide.is_active;
    const ok = await updateSlider(slide.id, { is_active: newStatus });
    if (ok) {
      toast.success(newStatus ? "Slide activated" : "Slide deactivated");
      setSliders((prev) =>
        prev.map((s) => (s.id === slide.id ? { ...s, is_active: newStatus } : s))
      );
    }
  };

  const handleDelete = async () => {
    if (!deletingSlide) return;
    setSubmitting(true);
    try {
      const ok = await deleteSlider(deletingSlide.id);
      if (ok) {
        toast.success("Slide deleted successfully");
        setSliders((prev) => prev.filter((s) => s.id !== deletingSlide.id));
        setDeletingSlide(null);
      }
    } catch {
      toast.error("Failed to delete slide");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sliders.length) return;

    const newSliders = [...sliders];
    const current = newSliders[index]!;
    const target = newSliders[targetIndex]!;

    const tempOrder = current.order_index;
    current.order_index = target.order_index;
    target.order_index = tempOrder;

    newSliders[index] = target;
    newSliders[targetIndex] = current;

    setSliders(newSliders);

    // Update in database
    await Promise.all([
      updateSlider(current.id, { order_index: current.order_index }),
      updateSlider(target.id, { order_index: target.order_index }),
    ]);

    toast.success("Slide order updated");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Sliders & Promotional Banners
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {sliders.length} Slides
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage hero carousel slides, summit announcements and banner links on the landing page.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={openCreateModal}
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-tech text-xs font-semibold shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            Add New Slide
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search slide title, subtitle, description..."
            className="h-9 w-full rounded-xl border border-input bg-secondary/30 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            {(
              [
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "inactive", label: "Inactive" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setFilterStatus(s.id)}
                className={`rounded-md px-3 py-1 font-medium transition-all ${
                  filterStatus === s.id
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sliders Grid List */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-xs text-muted-foreground shadow-card">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin opacity-50 mb-2" />
          Loading slides from Supabase...
        </div>
      ) : filteredSliders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground shadow-card">
          <ImageIcon className="mx-auto h-10 w-10 opacity-30 mb-2" />
          <p className="text-sm font-semibold text-foreground">No slides found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery ? "Try a different search query." : "Add your first promotional hero slide above."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSliders.map((slide, idx) => (
            <div
              key={slide.id}
              className={`group flex flex-col justify-between overflow-hidden rounded-2xl border bg-card transition-all shadow-card hover:border-primary/40 ${
                slide.is_active ? "border-border" : "border-border/60 opacity-70 bg-muted/20"
              }`}
            >
              {/* Image Preview Banner */}
              <div className="relative aspect-video w-full overflow-hidden bg-navy">
                <img
                  src={slide.image_url}
                  alt={slide.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&auto=format&fit=crop&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Badges on Top */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                  <span className="rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white">
                    #{slide.order_index || idx + 1}
                  </span>

                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                      slide.is_active
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-zinc-500/20 text-zinc-300 border border-zinc-500/40"
                    }`}
                  >
                    {slide.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Subtitle Badge at bottom of preview */}
                {slide.subtitle && (
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 truncate text-[11px] font-semibold text-sky">
                    {slide.subtitle}
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold tracking-tight text-foreground line-clamp-2">
                    {slide.title}
                  </h3>
                  {slide.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {slide.description}
                    </p>
                  )}
                </div>

                {/* Event Link Pill */}
                {slide.event_link ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-lg truncate">
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{slide.event_link}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground/60 italic">
                    No custom link (links to /events)
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-3.5 py-2.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveOrder(idx, "up")}
                    disabled={idx === 0}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveOrder(idx, "down")}
                    disabled={idx === sliders.length - 1}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(slide)}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                    title={slide.is_active ? "Deactivate" : "Activate"}
                  >
                    {slide.is_active ? <Eye className="h-3.5 w-3.5 text-emerald-500" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(slide)}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingSlide(slide)}
                    className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create / Edit Slide */}
      {(isCreateOpen || editingSlide) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-4xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ImagePlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {editingSlide ? "Edit Promotional Slide" : "Create New Promotional Slide"}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Configure high-resolution hero banners, titles, links, and live visibility.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingSlide(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left Column: Slide Content Details */}
                <div className="space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">
                      Slide Title <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. INT Security Technology Summit 2026"
                      className="h-9 w-full rounded-xl border border-input bg-secondary/30 px-3 text-xs text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Subtitle / Location Tag</label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="e.g. Cairo, Egypt · September 15, 2026"
                      className="h-9 w-full rounded-xl border border-input bg-secondary/30 px-3 text-xs text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Description & Key Highlights</label>
                    <textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief summary explaining what attendees and sponsors can experience..."
                      className="w-full rounded-xl border border-input bg-secondary/30 p-3 text-xs text-foreground outline-none focus:border-primary leading-relaxed resize-none transition-colors"
                    />
                  </div>

                  {/* Event Link Selector / Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-foreground">Action Button Event Link (Optional)</label>
                      {formData.event_link && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, event_link: "" })}
                          className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          Clear link
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* Pick from events dropdown */}
                      <div className="relative">
                        <select
                          value={eventsList.some((e) => `/event/${e.id}` === formData.event_link) ? formData.event_link : ""}
                          onChange={(e) => {
                            if (e.target.value) setFormData({ ...formData, event_link: e.target.value });
                          }}
                          className="h-9 w-full rounded-xl border border-input bg-secondary/40 px-3 text-xs text-foreground outline-none focus:border-primary cursor-pointer transition-colors"
                        >
                          <option value="">🔗 Select from existing events...</option>
                          {eventsList.map((ev) => (
                            <option key={ev.id} value={`/event/${ev.id}`}>
                              {ev.title} ({ev.city})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Custom link input */}
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.event_link}
                          onChange={(e) => setFormData({ ...formData, event_link: e.target.value })}
                          placeholder="Or type custom path e.g. /events or /event/my-event"
                          className="h-9 w-full rounded-xl border border-input bg-secondary/20 px-3 text-xs text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Order Index & Active Switch */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground">Order Index</label>
                      <input
                        type="number"
                        min={1}
                        value={formData.order_index}
                        onChange={(e) => setFormData({ ...formData, order_index: Number(e.target.value) })}
                        className="h-9 w-full rounded-xl border border-input bg-secondary/30 px-3 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex flex-col justify-center space-y-1.5">
                      <span className="font-semibold text-foreground">Slide Visibility</span>
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="h-4 w-4 rounded accent-primary cursor-pointer"
                        />
                        <span className="text-xs font-medium text-foreground">Active on Landing</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right Column: Upload & Media Studio */}
                <div className="space-y-4 rounded-2xl border border-border bg-secondary/20 p-4">
                  <div>
                    <span className="font-semibold text-foreground flex items-center justify-between">
                      <span>Banner Background Image <span className="text-destructive">*</span></span>
                      {formData.image_url && (
                        <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Image Selected
                        </span>
                      )}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Upload from your device or paste a high-resolution banner image link.
                    </p>
                  </div>

                  {/* Drag & Drop Upload Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 sm:p-5 text-center transition-all cursor-pointer ${
                      isDragging
                        ? "border-primary bg-primary/10 scale-[1.01]"
                        : "border-border hover:border-primary/60 hover:bg-secondary/50 bg-card/60"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform mb-2">
                      <Upload className="h-5 w-5" />
                    </div>

                    <p className="text-xs font-bold text-foreground">
                      Click to upload <span className="font-normal text-muted-foreground">or drag & drop</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      PNG, JPG, WebP or AVIF (recommended 1920×1080, max 8MB)
                    </p>
                  </div>

                  {/* Or Paste URL */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-foreground">Or Paste Image URL</label>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="h-9 w-full rounded-xl border border-input bg-card px-3 text-xs text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Preset Grid Cards */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground">Quick Curated Presets:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PRESET_IMAGES.map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: preset.url })}
                          className={`flex items-center gap-1.5 rounded-xl border p-2 text-left text-[11px] font-medium transition-all cursor-pointer shadow-2xs ${
                            formData.image_url === preset.url
                              ? "border-primary bg-primary/10 text-primary font-semibold"
                              : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary"
                          }`}
                        >
                          <ImageIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Hero Banner Preview Box */}
                  {formData.image_url ? (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Live Carousel Banner Preview:
                      </p>
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border bg-navy shadow-md">
                        <img
                          src={formData.image_url}
                          alt="Banner Preview"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&auto=format&fit=crop&q=80";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/50 to-transparent" />

                        <div className="absolute bottom-3 left-3 right-3 text-white space-y-1">
                          {formData.subtitle && (
                            <span className="inline-block rounded-full bg-sky/20 border border-sky/40 px-2 py-0.5 text-[9px] font-bold text-sky">
                              {formData.subtitle}
                            </span>
                          )}
                          <p className="text-xs sm:text-sm font-bold line-clamp-1">
                            {formData.title || "Preview Slide Title"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingSlide(null);
                  }}
                  className="h-9 px-4 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="h-9 px-5 bg-primary text-primary-foreground hover:bg-tech text-xs font-semibold shadow-2xs"
                >
                  {submitting ? "Saving..." : editingSlide ? "Save Changes" : "Create Slide"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingSlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-destructive/10">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Slide?</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs">
              <p className="font-semibold text-foreground">{deletingSlide.title}</p>
              {deletingSlide.subtitle && <p className="text-muted-foreground">{deletingSlide.subtitle}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingSlide(null)}
                disabled={submitting}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={submitting}
                className="h-9 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
              >
                {submitting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
