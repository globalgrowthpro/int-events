import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Images, ImagePlus, Plus, Trash2, Pencil, X, RefreshCw, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import {
  getEvents,
  getGalleries,
  createGallery,
  updateGallery,
  deleteGallery,
  GALLERY_MAX_IMAGES,
  GALLERY_MAX_IMAGE_BYTES,
  GALLERY_ACCEPTED_TYPES,
  type EventGallery,
} from "@/lib/api";
import type { IntEvent } from "@/lib/int-data";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/int/rich-text-editor";

export const Route = createFileRoute("/admin/gallery")({
  head: () => ({
    meta: [
      { title: "Event Gallery Manager — INT Events Admin" },
      {
        name: "description",
        content:
          "Publish post-event photo galleries and result summaries for each INT event, shown on the public event details page.",
      },
      { property: "og:title", content: "Event Gallery Manager — INT Events Admin" },
      { property: "og:description", content: "Post-event photo galleries and result highlights." },
    ],
  }),
  component: AdminGalleryPage,
});

type GalleryForm = {
  event_id: string;
  title: string;
  results: string;
  images: string[];
  is_published: boolean;
};

const emptyForm: GalleryForm = {
  event_id: "",
  title: "",
  results: "",
  images: [],
  is_published: true,
};

function AdminGalleryPage() {
  const [galleries, setGalleries] = useState<EventGallery[]>([]);
  const [eventsList, setEventsList] = useState<IntEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventGallery | null>(null);
  const [form, setForm] = useState<GalleryForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const [g, e] = await Promise.all([getGalleries(), getEvents()]);
    setGalleries(g);
    setEventsList(e);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const eventTitle = useMemo(() => {
    const map = new Map(eventsList.map((e) => [e.id, e.title]));
    return (id: string) => map.get(id) ?? id;
  }, [eventsList]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(gallery: EventGallery) {
    setEditing(gallery);
    setForm({
      event_id: gallery.event_id,
      title: gallery.title ?? "",
      results: gallery.results ?? "",
      images: gallery.images ?? [],
      is_published: gallery.is_published !== false,
    });
    setFormOpen(true);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    const room = GALLERY_MAX_IMAGES - form.images.length;

    if (room <= 0) {
      toast.error(`Maximum ${GALLERY_MAX_IMAGES} images per gallery.`);
      return;
    }

    const accepted: File[] = [];
    for (const file of incoming) {
      if (!GALLERY_ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" rejected — only PNG, JPG, JPEG or WebP allowed.`);
        continue;
      }
      if (file.size > GALLERY_MAX_IMAGE_BYTES) {
        toast.error(`"${file.name}" is larger than 1 MB.`);
        continue;
      }
      if (accepted.length >= room) {
        toast.error(`Only ${GALLERY_MAX_IMAGES} images allowed — extra files skipped.`);
        break;
      }
      accepted.push(file);
    }

    accepted.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setForm((prev) =>
          prev.images.length >= GALLERY_MAX_IMAGES ? prev : { ...prev, images: [...prev.images, dataUrl] },
        );
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.event_id) {
      toast.error("Please select an event.");
      return;
    }
    if (form.images.length === 0) {
      toast.error("Please add at least one image.");
      return;
    }

    setSubmitting(true);
    const payload = {
      event_id: form.event_id,
      title: form.title.trim() || null,
      results: form.results.trim() || null,
      images: form.images,
      is_published: form.is_published,
    };

    if (editing) {
      const ok = await updateGallery(editing.id, payload);
      toast[ok ? "success" : "error"](ok ? "Gallery updated." : "Could not update gallery.");
    } else {
      const created = await createGallery(payload);
      toast[created ? "success" : "error"](created ? "Gallery published." : "Could not create gallery.");
    }

    setSubmitting(false);
    setFormOpen(false);
    setForm(emptyForm);
    setEditing(null);
    load();
  }

  async function handleDelete(gallery: EventGallery) {
    if (!window.confirm("Delete this gallery and its images?")) return;
    const ok = await deleteGallery(gallery.id);
    toast[ok ? "success" : "error"](ok ? "Gallery deleted." : "Could not delete gallery.");
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            <Images className="h-5 w-5 text-primary" /> Event Gallery
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish post-event results and photo albums. Galleries appear on the event details page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add gallery
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading galleries…
        </div>
      ) : galleries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Images className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">No galleries yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a gallery to showcase the outcome and photos of a completed event.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {galleries.map((gallery) => (
            <article key={gallery.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <CalendarDays className="h-3.5 w-3.5" /> {eventTitle(gallery.event_id)}
                  </p>
                  <h2 className="mt-1 truncate text-base font-bold text-foreground">
                    {gallery.title || "Event highlights"}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {gallery.images.length} image{gallery.images.length === 1 ? "" : "s"} ·{" "}
                    {gallery.is_published ? "Published" : "Hidden"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(gallery)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDelete(gallery)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>

              {gallery.results && (
                <div
                  className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground [&_p]:mb-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-4"
                  dangerouslySetInnerHTML={{ __html: gallery.results }}
                />
              )}

              <div className="mt-4 grid grid-cols-5 gap-2">
                {gallery.images.slice(0, 5).map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox(src)}
                    className="aspect-square overflow-hidden rounded-lg border border-border"
                  >
                    <img src={src} alt={`Gallery image ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add / edit dialog */}
      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-card"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editing ? "Edit gallery" : "Add gallery"}</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="gallery-event" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Event
                </label>
                <select
                  id="gallery-event"
                  value={form.event_id}
                  onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Select an event…</option>
                  {eventsList.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="gallery-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Gallery title (optional)
                </label>
                <input
                  id="gallery-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Summit 2026 highlights"
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                />
              </div>

              <div>
                <label htmlFor="gallery-results" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Details about the result of the event
                </label>
                <RichTextEditor
                  id="gallery-results"
                  value={form.results}
                  onChange={(html) => setForm({ ...form, results: html })}
                  placeholder="Attendance achieved, key outcomes, signed partnerships, media coverage…"
                  minHeight="160px"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Images</span>
                  <span className="text-[11px] text-muted-foreground">
                    {form.images.length}/{GALLERY_MAX_IMAGES} · PNG, JPG, JPEG, WebP · max 1 MB each
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={form.images.length >= GALLERY_MAX_IMAGES}
                  className="mt-2 flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-background py-6 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 disabled:opacity-50"
                >
                  <ImagePlus className="h-6 w-6 text-primary" />
                  Select images
                  <span className="text-xs font-normal text-muted-foreground">
                    Up to {GALLERY_MAX_IMAGES} images, 1 MB each
                  </span>
                </button>

                {form.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {form.images.map((src, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                        <img src={src} alt={`Selected ${i + 1}`} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          aria-label="Remove image"
                          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white hover:bg-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                Publish on the event details page
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : editing ? "Save changes" : "Publish gallery"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          <img src={lightbox} alt="Gallery preview" className="max-h-[85vh] max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
