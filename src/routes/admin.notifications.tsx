import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  BellRing,
  Send,
  Plus,
  Clock,
  Mail,
  Smartphone,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  Edit,
  Sparkles,
  Users,
  Calendar,
  Layers,
  Search,
  Filter,
  Eye,
  X,
  Volume2,
  Zap,
  Info,
  Check,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  ArrowRight,
  Timer,
  Radio,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getScheduledReminders,
  createScheduledReminder,
  updateScheduledReminder,
  deleteScheduledReminder,
  triggerSendReminderNow,
  getEvents,
  type ScheduledReminder,
} from "@/lib/api";
import { events, type IntEvent } from "@/lib/int-data";
import { NotificationsList } from "@/components/int/notifications-list";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Automated Reminders & Push Hub — INT Events Admin" },
      {
        name: "description",
        content: "Schedule automated countdown alerts (+days, +hours, event started), web push notifications, and broadcast emails.",
      },
      { property: "og:title", content: "Automated Reminders & Push Hub — INT Events Admin" },
      { property: "og:description", content: "Schedule omnichannel automated reminders and browser push notifications." },
    ],
  }),
  component: AdminNotifications,
});

type ReminderFormData = {
  title: string;
  message: string;
  reminder_type: ScheduledReminder["reminder_type"];
  event_id: string;
  target_audience: ScheduledReminder["target_audience"];
  timing_mode: ScheduledReminder["timing_mode"];
  scheduled_time: string;
  relative_offset: string;
  send_email: boolean;
  send_browser_push: boolean;
  send_in_app: boolean;
  recipient_count: number;
};

// 3-Stage Lifecycle Pipeline Configuration Type
type LifecycleStageConfig = {
  enabled: boolean;
  title: string;
  message: string;
  send_email: boolean;
  send_browser_push: boolean;
  send_in_app: boolean;
};

type EventLifecycleState = {
  daysStage: LifecycleStageConfig & { days: number };
  hoursStage: LifecycleStageConfig & { hours: number };
  startedStage: LifecycleStageConfig;
};

const TEMPLATE_PRESETS = [
  {
    name: "24h Summit Countdown",
    type: "event_countdown" as const,
    offset: "24h_before",
    title: "Summit Starts in 24 Hours: Access Your Digital Pass",
    message: "Welcome to {event_title}! Please ensure your digital pass and QR code are ready for fast-track entry at Gate 3, {venue}.",
  },
  {
    name: "National ID Verification & Badge",
    type: "badge_ready" as const,
    offset: "48h_before",
    title: "Badge Printing & National ID Verification Reminder",
    message: "To receive your official summit laminate badge, please make sure your National ID or Passport is verified in your account profile.",
  },
  {
    name: "Keynote / Speaker Alert",
    type: "speaker_alert" as const,
    offset: "1h_before",
    title: "Keynote Announcement: AI in Video Surveillance",
    message: "Live Keynote with Genetec and Cisco leadership starting in Hall A. Reserved seats available for registered enterprise delegates.",
  },
  {
    name: "Venue Location & Directions",
    type: "venue_directions" as const,
    offset: "2h_before",
    title: "Venue Arrival & Free VIP Parking Information",
    message: "Complimentary VIP parking is available at Gate 2 of {venue}. Show your INT Digital Pass on your mobile device at security.",
  },
  {
    name: "VIP / Sponsor Exclusive Invite",
    type: "vip_invitation" as const,
    offset: "at_start",
    title: "Exclusive Executive Lounge Invitation",
    message: "You are invited to the Private Executive Networking Lounge on Level 2. Enjoy premium refreshments and partner briefings.",
  },
];

function AdminNotifications() {
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"lifecycle" | "reminders" | "feed">("lifecycle");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Events list
  const [eventsList, setEventsList] = useState<IntEvent[]>(events);
  const [selectedLifecycleEventId, setSelectedLifecycleEventId] = useState<string>(events[0]?.id || "security-summit-2026");

  // Browser push permission status
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ScheduledReminder | null>(null);
  const [previewTab, setPreviewTab] = useState<"push" | "email" | "in_app">("push");
  const [isQuickBlastOpen, setIsQuickBlastOpen] = useState(false);
  const [quickBlastText, setQuickBlastText] = useState("");
  const [quickBlastTitle, setQuickBlastTitle] = useState("");

  // Lifecycle Sequence State
  const [lifecycleState, setLifecycleState] = useState<EventLifecycleState>({
    daysStage: {
      enabled: true,
      days: 3,
      title: "Upcoming: {event_title} Starts in {days} Days",
      message: "The summit starts in {days} days at {venue}. Access your digital pass and review your personalized keynote agenda.",
      send_email: true,
      send_browser_push: true,
      send_in_app: true,
    },
    hoursStage: {
      enabled: true,
      hours: 2,
      title: "Doors Open in {hours} Hours: {venue} Fast-Track Access",
      message: "Doors open in {hours} hours at {venue}. Have your QR Pass open on your screen for fast-track entry at Gate 3.",
      send_email: true,
      send_browser_push: true,
      send_in_app: true,
    },
    startedStage: {
      enabled: true,
      title: "🚀 {event_title} is Now LIVE!",
      message: "Welcome to {event_title}! The opening keynote with Genetec & Cisco leadership has started in Hall A. Live Q&A and networking lounges are open.",
      send_email: true,
      send_browser_push: true,
      send_in_app: true,
    },
  });

  // Form State
  const [formData, setFormData] = useState<ReminderFormData>({
    title: "Summit Starts in 24 Hours: Access Your Digital Pass",
    message: "Welcome to {event_title}! Please ensure your digital pass and QR code are ready for fast-track entry at Gate 3, {venue}.",
    reminder_type: "event_countdown",
    event_id: events[0]?.id || "security-summit-2026",
    target_audience: "registered_event",
    timing_mode: "event_relative",
    scheduled_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    relative_offset: "24h_before",
    send_email: true,
    send_browser_push: true,
    send_in_app: true,
    recipient_count: 240,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [remData, evData] = await Promise.all([getScheduledReminders(), getEvents()]);
      setReminders(remData);
      if (evData && evData.length > 0) setEventsList(evData);
    } catch {
      toast.error("Failed to load scheduled reminders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Request browser push notification permission
  const handleRequestPushPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications are not supported on this device.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === "granted") {
        toast.success("Browser Push Notifications Enabled!");
        new Notification("INT Events Push Service", {
          body: "Push alerts successfully connected. You will receive live event reminders here.",
          icon: "/pwa-192x192.png",
        });
      } else {
        toast.info("Browser notifications permission was not granted.");
      }
    } catch {
      toast.error("Failed to request notification permission");
    }
  };

  const handleOpenCreateModal = () => {
    setEditingReminder(null);
    setFormData({
      title: "Summit Starts in 24 Hours: Access Your Digital Pass",
      message: "Welcome to {event_title}! Please ensure your digital pass and QR code are ready for fast-track entry at Gate 3, {venue}.",
      reminder_type: "event_countdown",
      event_id: eventsList[0]?.id || "security-summit-2026",
      target_audience: "registered_event",
      timing_mode: "event_relative",
      scheduled_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      relative_offset: "24h_before",
      send_email: true,
      send_browser_push: true,
      send_in_app: true,
      recipient_count: 320,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rem: ScheduledReminder) => {
    setEditingReminder(rem);
    setFormData({
      title: rem.title,
      message: rem.message,
      reminder_type: rem.reminder_type,
      event_id: rem.event_id || eventsList[0]?.id || "",
      target_audience: rem.target_audience,
      timing_mode: rem.timing_mode,
      scheduled_time: rem.scheduled_time ? new Date(rem.scheduled_time).toISOString().slice(0, 16) : new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      relative_offset: rem.relative_offset || "24h_before",
      send_email: rem.send_email,
      send_browser_push: rem.send_browser_push,
      send_in_app: rem.send_in_app,
      recipient_count: rem.recipient_count,
    });
    setIsModalOpen(true);
  };

  const handleApplyTemplate = (preset: typeof TEMPLATE_PRESETS[0]) => {
    setFormData((prev) => ({
      ...prev,
      title: preset.title,
      message: preset.message,
      reminder_type: preset.type,
      relative_offset: preset.offset,
      timing_mode: "event_relative",
    }));
    toast.success(`Applied template: ${preset.name}`);
  };

  const handleInsertVariable = (varKey: string) => {
    setFormData((prev) => ({
      ...prev,
      message: prev.message + ` {${varKey}}`,
    }));
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Please enter both title and reminder message text.");
      return;
    }

    if (!formData.send_email && !formData.send_browser_push && !formData.send_in_app) {
      toast.error("Please select at least one dispatch channel (In-App, Push, or Email).");
      return;
    }

    if (editingReminder) {
      await updateScheduledReminder(editingReminder.id, {
        ...formData,
        event_id: formData.event_id || null,
        scheduled_time: formData.timing_mode === "scheduled" ? new Date(formData.scheduled_time).toISOString() : null,
      });
      toast.success("Updated scheduled reminder!");
    } else {
      await createScheduledReminder({
        ...formData,
        event_id: formData.event_id || null,
        scheduled_time: formData.timing_mode === "scheduled" ? new Date(formData.scheduled_time).toISOString() : null,
        status: "scheduled",
        delivered_count: 0,
      });
      toast.success("Created new automated reminder!");
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleSendNow = async (rem: ScheduledReminder) => {
    const res = await triggerSendReminderNow(rem);
    if (res.success) {
      toast.success(`Dispatched ${rem.title} to ${res.delivered} recipients across In-App, Push, and Email!`);
      loadData();
    } else {
      toast.error("Failed to send reminder");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this reminder campaign?")) {
      await deleteScheduledReminder(id);
      toast.success("Reminder campaign removed");
      loadData();
    }
  };

  const handleToggleStatus = async (rem: ScheduledReminder) => {
    const nextStatus = rem.status === "scheduled" ? "draft" : "scheduled";
    await updateScheduledReminder(rem.id, { status: nextStatus });
    toast.success(nextStatus === "scheduled" ? "Reminder active & scheduled" : "Reminder paused");
    loadData();
  };

  const handleQuickBlastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBlastTitle.trim() || !quickBlastText.trim()) {
      toast.error("Please enter a title and message for the blast.");
      return;
    }

    const blastReminder: Omit<ScheduledReminder, "id" | "created_at" | "updated_at"> = {
      title: quickBlastTitle.trim(),
      message: quickBlastText.trim(),
      reminder_type: "custom_broadcast",
      event_id: null,
      target_audience: "all_attendees",
      timing_mode: "immediate",
      send_email: true,
      send_browser_push: true,
      send_in_app: true,
      status: "sent",
      recipient_count: 500,
      delivered_count: 498,
    };

    const created = await createScheduledReminder(blastReminder);
    await triggerSendReminderNow(created);

    toast.success("Instant Broadcast successfully blasted to all attendees!");
    setIsQuickBlastOpen(false);
    setQuickBlastTitle("");
    setQuickBlastText("");
    loadData();
  };

  // Lifecycle Stage Trigger Test
  const handleTestLifecycleStage = async (stageKey: "days" | "hours" | "started") => {
    const currentEv = eventsList.find((e) => e.id === selectedLifecycleEventId) || eventsList[0];
    const venueName = currentEv?.venue || currentEv?.city || "Cairo ICT Centre";
    const eventTitle = currentEv?.title || "INT Security Technology Summit 2026";

    let title = "";
    let body = "";
    let stageName = "";

    if (stageKey === "days") {
      stageName = `+${lifecycleState.daysStage.days} Days Countdown`;
      title = lifecycleState.daysStage.title
        .replace(/{event_title}/g, eventTitle)
        .replace(/{days}/g, String(lifecycleState.daysStage.days));
      body = lifecycleState.daysStage.message
        .replace(/{event_title}/g, eventTitle)
        .replace(/{venue}/g, venueName)
        .replace(/{days}/g, String(lifecycleState.daysStage.days));
    } else if (stageKey === "hours") {
      stageName = `+${lifecycleState.hoursStage.hours} Hours Countdown`;
      title = lifecycleState.hoursStage.title
        .replace(/{event_title}/g, eventTitle)
        .replace(/{venue}/g, venueName)
        .replace(/{hours}/g, String(lifecycleState.hoursStage.hours));
      body = lifecycleState.hoursStage.message
        .replace(/{event_title}/g, eventTitle)
        .replace(/{venue}/g, venueName)
        .replace(/{hours}/g, String(lifecycleState.hoursStage.hours));
    } else {
      stageName = "Event Started / Live Broadcast";
      title = lifecycleState.startedStage.title.replace(/{event_title}/g, eventTitle);
      body = lifecycleState.startedStage.message
        .replace(/{event_title}/g, eventTitle)
        .replace(/{venue}/g, venueName);
    }

    const testReminder: Omit<ScheduledReminder, "id" | "created_at" | "updated_at"> = {
      title,
      message: body,
      reminder_type: stageKey === "started" ? "event_started" : "event_countdown",
      event_id: selectedLifecycleEventId,
      target_audience: "registered_event",
      timing_mode: "immediate",
      send_email: true,
      send_browser_push: true,
      send_in_app: true,
      status: "sent",
      recipient_count: currentEv?.registered || 248,
      delivered_count: currentEv?.registered || 248,
    };

    const created = await createScheduledReminder(testReminder);
    await triggerSendReminderNow(created);

    toast.success(`Dispatched [${stageName}] alert across Web Push, In-App, and Email!`);
    loadData();
  };

  // Save full 3-Stage Pipeline to DB
  const handleSaveFullLifecyclePipeline = async () => {
    const currentEv = eventsList.find((e) => e.id === selectedLifecycleEventId) || eventsList[0];
    const venueName = currentEv?.venue || currentEv?.city || "Cairo ICT Centre";
    const eventTitle = currentEv?.title || "INT Security Technology Summit 2026";

    // 1. Create Days-before reminder
    if (lifecycleState.daysStage.enabled) {
      await createScheduledReminder({
        title: lifecycleState.daysStage.title
          .replace(/{event_title}/g, eventTitle)
          .replace(/{days}/g, String(lifecycleState.daysStage.days)),
        message: lifecycleState.daysStage.message
          .replace(/{event_title}/g, eventTitle)
          .replace(/{venue}/g, venueName)
          .replace(/{days}/g, String(lifecycleState.daysStage.days)),
        reminder_type: "event_countdown",
        event_id: selectedLifecycleEventId,
        target_audience: "registered_event",
        timing_mode: "event_relative",
        relative_offset: `${lifecycleState.daysStage.days}d_before`,
        lifecycle_stage: "days_before",
        offset_value: lifecycleState.daysStage.days,
        offset_unit: "days",
        send_email: lifecycleState.daysStage.send_email,
        send_browser_push: lifecycleState.daysStage.send_browser_push,
        send_in_app: lifecycleState.daysStage.send_in_app,
        status: "scheduled",
        recipient_count: currentEv?.registered || 248,
        delivered_count: 0,
      });
    }

    // 2. Create Hours-before reminder
    if (lifecycleState.hoursStage.enabled) {
      await createScheduledReminder({
        title: lifecycleState.hoursStage.title
          .replace(/{event_title}/g, eventTitle)
          .replace(/{venue}/g, venueName)
          .replace(/{hours}/g, String(lifecycleState.hoursStage.hours)),
        message: lifecycleState.hoursStage.message
          .replace(/{event_title}/g, eventTitle)
          .replace(/{venue}/g, venueName)
          .replace(/{hours}/g, String(lifecycleState.hoursStage.hours)),
        reminder_type: "event_countdown",
        event_id: selectedLifecycleEventId,
        target_audience: "registered_event",
        timing_mode: "event_relative",
        relative_offset: `${lifecycleState.hoursStage.hours}h_before`,
        lifecycle_stage: "hours_before",
        offset_value: lifecycleState.hoursStage.hours,
        offset_unit: "hours",
        send_email: lifecycleState.hoursStage.send_email,
        send_browser_push: lifecycleState.hoursStage.send_browser_push,
        send_in_app: lifecycleState.hoursStage.send_in_app,
        status: "scheduled",
        recipient_count: currentEv?.registered || 248,
        delivered_count: 0,
      });
    }

    // 3. Create Event-started reminder
    if (lifecycleState.startedStage.enabled) {
      await createScheduledReminder({
        title: lifecycleState.startedStage.title.replace(/{event_title}/g, eventTitle),
        message: lifecycleState.startedStage.message
          .replace(/{event_title}/g, eventTitle)
          .replace(/{venue}/g, venueName),
        reminder_type: "event_started",
        event_id: selectedLifecycleEventId,
        target_audience: "registered_event",
        timing_mode: "event_relative",
        relative_offset: "at_start",
        lifecycle_stage: "event_started",
        send_email: lifecycleState.startedStage.send_email,
        send_browser_push: lifecycleState.startedStage.send_browser_push,
        send_in_app: lifecycleState.startedStage.send_in_app,
        status: "scheduled",
        recipient_count: currentEv?.registered || 248,
        delivered_count: 0,
      });
    }

    toast.success(`Activated 3-Stage Lifecycle Reminders for ${eventTitle}!`);
    loadData();
    setActiveTab("reminders");
  };

  // Filter reminders
  const filteredReminders = reminders.filter((rem) => {
    const matchesSearch =
      rem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rem.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || rem.reminder_type === typeFilter;
    const matchesStatus = statusFilter === "all" || rem.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalDelivered = reminders.reduce((acc, r) => acc + (r.delivered_count || 0), 0);
  const totalScheduled = reminders.filter((r) => r.status === "scheduled").length;

  const selectedEvent = eventsList.find((e) => e.id === formData.event_id);
  const venueString = selectedEvent ? (selectedEvent.venue || selectedEvent.city || "Cairo ICT Centre") : "Cairo ICT Centre";
  const dateString = selectedEvent ? (selectedEvent.dateLabel || selectedEvent.date || "September 15, 2026") : "September 15, 2026";
  const formattedPreviewMessage = (formData.message || "")
    .replace(/{event_title}/g, selectedEvent?.title || "INT Security Technology Summit 2026")
    .replace(/{venue}/g, venueString)
    .replace(/{date}/g, dateString)
    .replace(/{name}/g, "Ahmed Mohamed")
    .replace(/{badge_id}/g, "INT-B890124");

  const currentLifecycleEvent = eventsList.find((e) => e.id === selectedLifecycleEventId) || eventsList[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                Automated Reminders & Push Hub
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Schedule omnichannel event countdown alerts (+Days, +Hours, Event Started), web push, and broadcast emails.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {pushPermission !== "granted" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestPushPermission}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10 text-xs"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Enable Browser Push</span>
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Web Push Active</span>
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsQuickBlastOpen(true)}
            className="gap-1.5 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 text-xs"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Instant Blast</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-tech text-xs shadow-md"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Custom Reminder</span>
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Campaigns</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">{reminders.length}</p>
          <span className="text-[11px] text-muted-foreground">Automated & manual rules</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Scheduled & Active</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-500">{totalScheduled}</p>
          <span className="text-[11px] text-muted-foreground">Queued for automated delivery</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Delivered</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/10 text-sky-500">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-sky-500">{totalDelivered.toLocaleString()}</p>
          <span className="text-[11px] text-muted-foreground">Push, Email & In-App views</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Dispatch Channels</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
              <Volume2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-foreground">
              📧 Email
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-foreground">
              🔔 Push
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-foreground">
              💬 In-App
            </span>
          </div>
          <span className="mt-1 block text-[11px] text-muted-foreground">Omnichannel synchronization</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("lifecycle")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "lifecycle"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Timer className="h-4 w-4" />
          <span>⚡ Lifecycle Automation (+Days / +Hours / Started)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reminders")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "reminders"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Scheduled Reminders Queue ({reminders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("feed")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "feed"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Operational Alerts Feed</span>
        </button>
      </div>

      {/* TAB 1: 3-Stage Event Lifecycle Automation Studio */}
      {activeTab === "lifecycle" && (
        <div className="space-y-6">
          {/* Target Event Selection Banner */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary mb-1">
                  <Sparkles className="h-3.5 w-3.5" /> 3-Stage Event Lifecycle Automation
                </span>
                <h2 className="text-xl font-bold text-foreground">Select Summit & Configure Automated Triggers</h2>
                <p className="text-xs text-muted-foreground">
                  The system will automatically calculate timing triggers (+X days, +X hours, and live start) for all attendees.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-muted-foreground shrink-0">Event:</label>
                <select
                  value={selectedLifecycleEventId}
                  onChange={(e) => setSelectedLifecycleEventId(e.target.value)}
                  className="rounded-xl border border-input bg-secondary/40 px-3.5 py-2 text-xs font-bold text-foreground outline-none focus:border-primary min-w-[260px]"
                >
                  {eventsList.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.dateLabel || ev.date})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Event Summary Pill Grid */}
            {currentLifecycleEvent && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/60 pt-4 text-xs">
                <div className="rounded-xl bg-secondary/30 p-3 border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">Event Date:</span>
                  <span className="font-bold text-foreground">{currentLifecycleEvent.dateLabel || currentLifecycleEvent.date}</span>
                </div>
                <div className="rounded-xl bg-secondary/30 p-3 border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">Timing:</span>
                  <span className="font-bold text-foreground">{currentLifecycleEvent.startTime || "09:00 AM"} - {currentLifecycleEvent.endTime || "05:00 PM"}</span>
                </div>
                <div className="rounded-xl bg-secondary/30 p-3 border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">Venue:</span>
                  <span className="font-bold text-foreground truncate block">{currentLifecycleEvent.venue || currentLifecycleEvent.city}</span>
                </div>
                <div className="rounded-xl bg-secondary/30 p-3 border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">Target Audience:</span>
                  <span className="font-mono font-bold text-primary">{currentLifecycleEvent.registered || 248} Registered Delegates</span>
                </div>
              </div>
            )}
          </div>

          {/* 3-Stage Pipeline Cards */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* STAGE 1: Days Before */}
            <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-card hover:border-primary/40 transition-all space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                      1
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">Stage 1: Days Before</h3>
                      <span className="text-[10px] text-muted-foreground">Digital Pass & ID Verification</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lifecycleState.daysStage.enabled}
                      onChange={(e) =>
                        setLifecycleState((prev) => ({
                          ...prev,
                          daysStage: { ...prev.daysStage, enabled: e.target.checked },
                        }))
                      }
                      className="rounded text-primary"
                    />
                    <span className="font-bold text-xs">Active</span>
                  </label>
                </div>

                {/* Timing Slider / Input */}
                <div className="mt-4 rounded-2xl bg-secondary/30 p-3.5 border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Trigger Timing:</span>
                    <span className="font-mono font-bold text-primary text-xs bg-primary/10 px-2 py-0.5 rounded-md">
                      +{lifecycleState.daysStage.days} Days Before
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[7, 3, 2, 1].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          setLifecycleState((prev) => ({
                            ...prev,
                            daysStage: { ...prev.daysStage, days: d },
                          }))
                        }
                        className={`flex-1 rounded-lg py-1 text-[11px] font-bold border transition-all ${
                          lifecycleState.daysStage.days === d
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:text-foreground"
                        }`}
                      >
                        {d} Days
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject & Body */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Subject / Headline:
                    </label>
                    <input
                      type="text"
                      value={lifecycleState.daysStage.title}
                      onChange={(e) =>
                        setLifecycleState((prev) => ({
                          ...prev,
                          daysStage: { ...prev.daysStage, title: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-input bg-secondary/30 px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Reminder Message:
                    </label>
                    <textarea
                      rows={3}
                      value={lifecycleState.daysStage.message}
                      onChange={(e) =>
                        setLifecycleState((prev) => ({
                          ...prev,
                          daysStage: { ...prev.daysStage, message: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-input bg-secondary/30 p-2.5 text-xs text-foreground outline-none focus:border-primary resize-none leading-relaxed"
                    />
                  </div>

                  {/* Channels */}
                  <div className="flex items-center gap-3 pt-1 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lifecycleState.daysStage.send_email}
                        onChange={(e) =>
                          setLifecycleState((prev) => ({
                            ...prev,
                            daysStage: { ...prev.daysStage, send_email: e.target.checked },
                          }))
                        }
                        className="rounded text-primary"
                      />
                      <span>📧 Email</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lifecycleState.daysStage.send_browser_push}
                        onChange={(e) =>
                          setLifecycleState((prev) => ({
                            ...prev,
                            daysStage: { ...prev.daysStage, send_browser_push: e.target.checked },
                          }))
                        }
                        className="rounded text-primary"
                      />
                      <span>🔔 Push</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lifecycleState.daysStage.send_in_app}
                        onChange={(e) =>
                          setLifecycleState((prev) => ({
                            ...prev,
                            daysStage: { ...prev.daysStage, send_in_app: e.target.checked },
                          }))
                        }
                        className="rounded text-primary"
                      />
                      <span>💬 In-App</span>
                    </label>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestLifecycleStage("days")}
                className="w-full gap-1.5 border-primary/40 text-primary hover:bg-primary/10 text-xs h-9"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Test & Dispatch Stage 1 Now</span>
              </Button>
            </div>

            {/* STAGE 2: Hours Before */}
            <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-card hover:border-primary/40 transition-all space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-500 font-black text-xs">
                      2
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">Stage 2: Hours Before</h3>
                      <span className="text-[10px] text-muted-foreground">Venue, Parking & Fast-Track Entry</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lifecycleState.hoursStage.enabled}
                      onChange={(e) =>
                        setLifecycleState((prev) => ({
                          ...prev,
                          hoursStage: { ...prev.hoursStage, enabled: e.target.checked },
                        }))
                      }
                      className="rounded text-amber-500"
                    />
                    <span className="font-bold text-xs">Active</span>
                  </label>
                </div>

                {/* Timing Slider / Input */}
                <div className="mt-4 rounded-2xl bg-secondary/30 p-3.5 border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Trigger Timing:</span>
                    <span className="font-mono font-bold text-amber-500 text-xs bg-amber-500/10 px-2 py-0.5 rounded-md">
                      +{lifecycleState.hoursStage.hours} Hours Before
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[6, 3, 2, 1].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() =>
                          setLifecycleState((prev) => ({
                            ...prev,
                            hoursStage: { ...prev.hoursStage, hours: h },
                          }))
                        }
                        className={`flex-1 rounded-lg py-1 text-[11px] font-bold border transition-all ${
                          lifecycleState.hoursStage.hours === h
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-card text-muted-foreground border-border hover:text-foreground"
                        }`}
                      >
                        {h} Hours
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject & Body */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Subject / Headline:
                    </label>
                    <input
                      type="text"
                      value={lifecycleState.hoursStage.title}
                      onChange={(e) =>
                        setLifecycleState((prev) => ({
                          ...prev,
                          hoursStage: { ...prev.hoursStage, title: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-input bg-secondary/30 px-3 py-1.5 text-xs text-foreground outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Reminder Message:
                    </label>
                    <textarea
                      rows={3}
                      value={lifecycleState.hoursStage.message}
                      onChange={(e) =>
                        setLifecycleState((prev) => ({
                          ...prev,
                          hoursStage: { ...prev.hoursStage, message: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-input bg-secondary/30 p-2.5 text-xs text-foreground outline-none focus:border-amber-500 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Channels */}
                  <div className="flex items-center gap-3 pt-1 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lifecycleState.hoursStage.send_email}
                        onChange={(e) =>
                          setLifecycleState((prev) => ({
                            ...prev,
                            hoursStage: { ...prev.hoursStage, send_email: e.target.checked },
                          }))
                        }
                        className="rounded text-amber-500"
                      />
                      <span>📧 Email</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lifecycleState.hoursStage.send_browser_push}
                        onChange={(e) =>
                          setLifecycleState((prev) => ({
                            ...prev,
                            hoursStage: { ...prev.hoursStage, send_browser_push: e.target.checked },
                          }))
                        }
                        className="rounded text-amber-500"
                      />
                      <span>🔔 Push</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lifecycleState.hoursStage.send_in_app}
                        onChange={(e) =>
                          setLifecycleState((prev) => ({
                            ...prev,
                            hoursStage: { ...prev.hoursStage, send_in_app: e.target.checked },
                          }))
                        }
                        className="rounded text-amber-500"
                      />
                      <span>💬 In-App</span>
                    </label>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestLifecycleStage("hours")}
                className="w-full gap-1.5 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 text-xs h-9"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Test & Dispatch Stage 2 Now</span>
              </Button>
            </div>

            {/* STAGE 3: Event Started */}
            <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-card hover:border-emerald-500/40 transition-all space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-xs">
                      3
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">Stage 3: Event Started</h3>
                      <span className="text-[10px] text-muted-foreground">Live Keynote & Doors Open Alert</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lifecycleState.startedStage.enabled}
                      onChange={(e) =>
                        setLifecycleState((prev) => ({
                          ...prev,
                          startedStage: { ...prev.startedStage, enabled: e.target.checked },
                        }))
                      }
                      className="rounded text-emerald-500"
                    />
                    <span className="font-bold text-xs">Active</span>
                  </label>
                </div>

                {/* Timing Slider / Input */}
                <div className="mt-4 rounded-2xl bg-secondary/30 p-3.5 border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Trigger Timing:</span>
                    <span className="font-mono font-bold text-emerald-500 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      🚀 At Event Official Start
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Dispatched automatically when the official start time arrives or triggered manually.
                  </p>
                </div>

                {/* Subject & Body */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Subject / Headline:
                    </label>
                    <input
                      type="text"
                      value={lifecycleState.startedStage.title}
                      onChange={(e) =>
                        setLifecycleState((prev) => ({
                          ...prev,
                          startedStage: { ...prev.startedStage, title: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-input bg-secondary/30 px-3 py-1.5 text-xs text-foreground outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Broadcast Message:
                    </label>
                    <textarea
                      rows={3}
                      value={lifecycleState.startedStage.message}
                      onChange={(e) =>
                        setLifecycleState((prev) => ({
                          ...prev,
                          startedStage: { ...prev.startedStage, message: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-input bg-secondary/30 p-2.5 text-xs text-foreground outline-none focus:border-emerald-500 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Channels */}
                  <div className="flex items-center gap-3 pt-1 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lifecycleState.startedStage.send_email}
                        onChange={(e) =>
                          setLifecycleState((prev) => ({
                            ...prev,
                            startedStage: { ...prev.startedStage, send_email: e.target.checked },
                          }))
                        }
                        className="rounded text-emerald-500"
                      />
                      <span>📧 Email</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lifecycleState.startedStage.send_browser_push}
                        onChange={(e) =>
                          setLifecycleState((prev) => ({
                            ...prev,
                            startedStage: { ...prev.startedStage, send_browser_push: e.target.checked },
                          }))
                        }
                        className="rounded text-emerald-500"
                      />
                      <span>🔔 Push</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lifecycleState.startedStage.send_in_app}
                        onChange={(e) =>
                          setLifecycleState((prev) => ({
                            ...prev,
                            startedStage: { ...prev.startedStage, send_in_app: e.target.checked },
                          }))
                        }
                        className="rounded text-emerald-500"
                      />
                      <span>💬 In-App</span>
                    </label>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestLifecycleStage("started")}
                className="w-full gap-1.5 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 text-xs h-9 font-bold"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>Broadcast Event Started Now</span>
              </Button>
            </div>
          </div>

          {/* Master Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-primary/30 bg-primary/5 p-6 shadow-md">
            <div>
              <h3 className="font-bold text-foreground text-sm">Save & Activate 3-Stage Lifecycle Sequence</h3>
              <p className="text-xs text-muted-foreground">
                This will queue all 3 automated reminder stages for {currentLifecycleEvent?.title || "the selected event"}.
              </p>
            </div>

            <Button
              onClick={handleSaveFullLifecyclePipeline}
              className="bg-primary text-primary-foreground hover:bg-tech font-bold gap-2 text-xs h-10 px-6 shadow-md cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Schedule 3-Stage Pipeline</span>
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: Scheduled Reminders Queue */}
      {activeTab === "reminders" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-3.5 rounded-2xl border border-border">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reminders by title or text..."
                className="w-full rounded-xl border border-input bg-secondary/40 pl-9 pr-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-input bg-secondary/40 px-3 py-1.5 text-xs text-foreground outline-none"
              >
                <option value="all">All Reminder Types</option>
                <option value="event_countdown">Event Countdown</option>
                <option value="event_started">Event Started</option>
                <option value="badge_ready">Badge & ID Verification</option>
                <option value="speaker_alert">Speaker & Keynote Alert</option>
                <option value="venue_directions">Venue & Parking Directions</option>
                <option value="vip_invitation">VIP Invitation</option>
                <option value="custom_broadcast">Custom Broadcast</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-input bg-secondary/40 px-3 py-1.5 text-xs text-foreground outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="sent">Sent / Delivered</option>
                <option value="draft">Draft / Paused</option>
              </select>
            </div>
          </div>

          {/* Reminders List */}
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">Loading reminders...</div>
          ) : filteredReminders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
                <BellRing className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-foreground">No reminder campaigns in queue</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Create an automated lifecycle sequence (+days, +hours, started) or 1-click broadcast.
              </p>
              <Button size="sm" onClick={() => setActiveTab("lifecycle")} className="mt-2 text-xs">
                <Timer className="h-3.5 w-3.5 mr-1" />
                Configure Lifecycle Pipeline
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredReminders.map((rem) => {
                const eventObj = eventsList.find((e) => e.id === rem.event_id);
                return (
                  <div
                    key={rem.id}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-elevated hover:border-primary/30"
                  >
                    <div>
                      {/* Header Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            rem.reminder_type === "event_started"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : rem.reminder_type === "badge_ready"
                              ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                              : rem.reminder_type === "venue_directions"
                              ? "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                              : rem.reminder_type === "vip_invitation"
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-primary/10 text-primary border border-primary/20"
                          }`}
                        >
                          <Sparkles className="h-3 w-3" />
                          {rem.reminder_type.replace(/_/g, " ")}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            rem.status === "sent"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : rem.status === "scheduled"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {rem.status === "sent" ? (
                            <>
                              <CheckCircle2 className="h-2.5 w-2.5" /> Sent
                            </>
                          ) : rem.status === "scheduled" ? (
                            <>
                              <Clock className="h-2.5 w-2.5" /> Scheduled
                            </>
                          ) : (
                            <>
                              <Pause className="h-2.5 w-2.5" /> Paused
                            </>
                          )}
                        </span>
                      </div>

                      {/* Title & Body */}
                      <h3 className="mt-3 font-bold text-foreground text-sm leading-snug line-clamp-2">
                        {rem.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {rem.message}
                      </p>

                      {/* Metadata */}
                      <div className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> Audience:
                          </span>
                          <span className="font-medium text-foreground truncate max-w-[170px]">
                            {rem.target_audience === "registered_event"
                              ? eventObj?.title || "Registered Summit"
                              : rem.target_audience.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Trigger:
                          </span>
                          <span className="font-medium text-foreground font-mono">
                            {rem.relative_offset
                              ? rem.relative_offset.replace(/_/g, " ")
                              : rem.timing_mode === "event_relative"
                              ? "Relative to Event"
                              : rem.scheduled_time
                              ? new Date(rem.scheduled_time).toLocaleDateString()
                              : "Immediate"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Channels:</span>
                          <div className="flex items-center gap-1.5">
                            {rem.send_email && <span title="Email Enabled">📧</span>}
                            {rem.send_browser_push && <span title="Web Push Enabled">🔔</span>}
                            {rem.send_in_app && <span title="In-App Alert Enabled">💬</span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Delivered:</span>
                          <span className="font-mono font-bold text-foreground">
                            {rem.delivered_count} / {rem.recipient_count}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendNow(rem)}
                        className="flex-1 gap-1 border-primary/40 text-primary hover:bg-primary/10 text-xs h-8"
                      >
                        <Send className="h-3 w-3" />
                        <span>Send Now</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(rem)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title={rem.status === "scheduled" ? "Pause Reminder" : "Resume Reminder"}
                      >
                        {rem.status === "scheduled" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditModal(rem)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title="Edit Reminder"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(rem.id)}
                        className="h-8 w-8 p-0 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                        title="Delete Reminder"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Operational Alerts Feed */}
      {activeTab === "feed" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <NotificationsList />
        </div>
      )}

      {/* MODAL 1: Create / Edit Custom Automated Reminder Studio */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-border bg-card shadow-elevated overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BellRing className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-base">
                    {editingReminder ? "Edit Automated Reminder Rule" : "Schedule New Automated Reminder"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Set up timing triggers, target recipients, and push / email templates.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: Two-Column Studio Layout */}
            <form onSubmit={handleSaveReminder} className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-6 lg:grid-cols-12">
                {/* Left Form Controls (7 cols) */}
                <div className="space-y-4 lg:col-span-7">
                  {/* Template Presets Picker */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span>Quick Template Presets:</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyTemplate(preset)}
                          className="rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary/40 hover:bg-secondary transition-all cursor-pointer"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Reminder Title & Subject <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Summit Starts in 24 Hours: Access Your Digital Pass"
                      className="w-full rounded-xl border border-input bg-secondary/30 px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>

                  {/* Reminder Type & Linked Event */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        Reminder Type
                      </label>
                      <select
                        value={formData.reminder_type}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            reminder_type: e.target.value as ScheduledReminder["reminder_type"],
                          }))
                        }
                        className="w-full rounded-xl border border-input bg-secondary/30 px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      >
                        <option value="event_countdown">Event Countdown (+Days/+Hours)</option>
                        <option value="event_started">Event Started / Live Now</option>
                        <option value="badge_ready">Badge & ID Ready</option>
                        <option value="speaker_alert">Speaker / Keynote Alert</option>
                        <option value="venue_directions">Venue & Directions</option>
                        <option value="vip_invitation">VIP Invitation</option>
                        <option value="custom_broadcast">Custom Broadcast</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        Associated Event
                      </label>
                      <select
                        value={formData.event_id}
                        onChange={(e) => setFormData((prev) => ({ ...prev, event_id: e.target.value }))}
                        className="w-full rounded-xl border border-input bg-secondary/30 px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      >
                        <option value="">Platform-wide (All Events)</option>
                        {eventsList.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Target Audience & Estimated Recipients */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        Target Audience
                      </label>
                      <select
                        value={formData.target_audience}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            target_audience: e.target.value as ScheduledReminder["target_audience"],
                          }))
                        }
                        className="w-full rounded-xl border border-input bg-secondary/30 px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      >
                        <option value="all_attendees">All Registered Attendees</option>
                        <option value="registered_event">Registrants of Selected Event</option>
                        <option value="clients_only">Enterprise Clients Only</option>
                        <option value="vendors_only">Exhibitors & Sponsors Only</option>
                        <option value="unverified_attendees">Unverified ID Attendees</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        Estimated Recipients
                      </label>
                      <input
                        type="number"
                        value={formData.recipient_count}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, recipient_count: parseInt(e.target.value) || 0 }))
                        }
                        className="w-full rounded-xl border border-input bg-secondary/30 px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary font-mono"
                      />
                    </div>
                  </div>

                  {/* Timing & Trigger Options */}
                  <div className="rounded-2xl border border-border bg-secondary/20 p-3.5 space-y-3">
                    <label className="block text-xs font-bold text-foreground">
                      Timing & Automated Trigger Mode
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, timing_mode: "event_relative" }))}
                        className={`rounded-xl p-2 text-xs font-semibold border transition-all ${
                          formData.timing_mode === "event_relative"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Relative to Event
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, timing_mode: "scheduled" }))}
                        className={`rounded-xl p-2 text-xs font-semibold border transition-all ${
                          formData.timing_mode === "scheduled"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Specific Date & Time
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, timing_mode: "immediate" }))}
                        className={`rounded-xl p-2 text-xs font-semibold border transition-all ${
                          formData.timing_mode === "immediate"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Immediate Blast
                      </button>
                    </div>

                    {formData.timing_mode === "event_relative" && (
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                          Offset Trigger Timing
                        </label>
                        <select
                          value={formData.relative_offset}
                          onChange={(e) => setFormData((prev) => ({ ...prev, relative_offset: e.target.value }))}
                          className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="7d_before">+7 Days Before Summit</option>
                          <option value="3d_before">+3 Days Before Summit</option>
                          <option value="48h_before">+48 Hours Before Summit</option>
                          <option value="24h_before">+24 Hours (1 Day) Before Summit</option>
                          <option value="6h_before">+6 Hours Before Doors Open</option>
                          <option value="2h_before">+2 Hours Before Keynote</option>
                          <option value="1h_before">+1 Hour Before Doors Open</option>
                          <option value="at_start">🚀 At Event Official Start (Live Now)</option>
                          <option value="post_event">Post-Event Survey (2h After)</option>
                        </select>
                      </div>
                    )}

                    {formData.timing_mode === "scheduled" && (
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                          Scheduled Delivery Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.scheduled_time}
                          onChange={(e) => setFormData((prev) => ({ ...prev, scheduled_time: e.target.value }))}
                          className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                        />
                      </div>
                    )}
                  </div>

                  {/* Dispatch Channels Multi-Select */}
                  <div className="rounded-2xl border border-border bg-secondary/20 p-3.5 space-y-2.5">
                    <label className="block text-xs font-bold text-foreground">
                      Omnichannel Dispatch Selection
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.send_in_app}
                          onChange={(e) => setFormData((prev) => ({ ...prev, send_in_app: e.target.checked }))}
                          className="rounded text-primary"
                        />
                        <span>💬 In-App Bell</span>
                      </label>

                      <label className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.send_browser_push}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, send_browser_push: e.target.checked }))
                          }
                          className="rounded text-primary"
                        />
                        <span>🔔 Web Push</span>
                      </label>

                      <label className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.send_email}
                          onChange={(e) => setFormData((prev) => ({ ...prev, send_email: e.target.checked }))}
                          className="rounded text-primary"
                        />
                        <span>📧 Email Alert</span>
                      </label>
                    </div>
                  </div>

                  {/* Message Body & Variable Tags */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">
                        Message & Template Content <span className="text-primary">*</span>
                      </label>
                      <span className="text-[10px] text-muted-foreground">
                        {formData.message.length} characters
                      </span>
                    </div>

                    <div className="mb-2 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-semibold text-muted-foreground mr-1">Variables:</span>
                      {["name", "event_title", "venue", "date", "badge_id"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleInsertVariable(v)}
                          className="rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] font-mono text-primary hover:bg-primary/10 transition-colors"
                        >
                          +{`{${v}}`}
                        </button>
                      ))}
                    </div>

                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="Write reminder copy here with placeholders..."
                      className="w-full rounded-xl border border-input bg-secondary/30 p-3 text-xs text-foreground outline-none focus:border-primary resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Right Column: Live Omnichannel Preview (5 cols) */}
                <div className="space-y-4 lg:col-span-5 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-primary" /> Live Omnichannel Preview
                    </span>
                    <div className="flex items-center gap-1 rounded-lg bg-secondary/60 p-0.5">
                      <button
                        type="button"
                        onClick={() => setPreviewTab("push")}
                        className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-all ${
                          previewTab === "push" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        }`}
                      >
                        Push
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab("in_app")}
                        className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-all ${
                          previewTab === "in_app" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        }`}
                      >
                        In-App
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab("email")}
                        className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-all ${
                          previewTab === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        }`}
                      >
                        Email
                      </button>
                    </div>
                  </div>

                  {/* Preview Canvas */}
                  <div className="flex-1 rounded-2xl border border-border bg-secondary/30 p-4 flex flex-col justify-center">
                    {previewTab === "push" && (
                      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-elevated space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="grid h-6 w-6 place-items-center rounded-lg bg-primary text-primary-foreground text-[10px] font-bold">
                              INT
                            </div>
                            <span className="text-xs font-bold text-foreground">INT Events Platform</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">Just now</span>
                        </div>
                        <p className="text-xs font-bold text-foreground">{formData.title || "Reminder Title"}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {formattedPreviewMessage || "Your reminder body text will appear here."}
                        </p>
                        <div className="mt-2 flex gap-2 pt-2 border-t border-border/50">
                          <span className="text-[10px] font-semibold text-primary">Open Pass</span>
                          <span className="text-[10px] text-muted-foreground">Dismiss</span>
                        </div>
                      </div>
                    )}

                    {previewTab === "in_app" && (
                      <div className="rounded-2xl border border-primary/30 bg-card p-4 shadow-md space-y-2 animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 place-items-center rounded-xl bg-primary/10 text-primary">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground block">
                              {formData.title || "Notification"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">2m ago · Event Alert</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pl-9">
                          {formattedPreviewMessage || "Your notification message preview..."}
                        </p>
                      </div>
                    )}

                    {previewTab === "email" && (
                      <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated space-y-3 text-xs animate-in fade-in">
                        <div className="border-b border-border pb-2 flex items-center justify-between text-muted-foreground text-[11px]">
                          <span>From: reminders@intevents.com</span>
                          <span>To: Ahmed Mohamed</span>
                        </div>
                        <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                          <h4 className="font-bold text-foreground text-sm mb-1">{formData.title}</h4>
                          <p className="text-muted-foreground leading-relaxed">{formattedPreviewMessage}</p>
                          <div className="mt-3">
                            <span className="inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs">
                              View Event Pass & QR Code
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-tech">
                  {editingReminder ? "Save Changes" : "Save & Schedule Reminder"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Instant Broadcast Quick Blast */}
      {isQuickBlastOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 bg-card p-6 shadow-elevated space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Instant Broadcast Blast</h3>
                  <p className="text-[11px] text-muted-foreground">Send immediate push, in-app & email to all attendees</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickBlastOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuickBlastSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Urgent Headline / Subject
                </label>
                <input
                  type="text"
                  required
                  value={quickBlastTitle}
                  onChange={(e) => setQuickBlastTitle(e.target.value)}
                  placeholder="e.g. Keynote Hall Change: Moved to Auditorium A"
                  className="w-full rounded-xl border border-input bg-secondary/30 px-3 py-2 text-xs text-foreground outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Broadcast Message
                </label>
                <textarea
                  required
                  rows={3}
                  value={quickBlastText}
                  onChange={(e) => setQuickBlastText(e.target.value)}
                  placeholder="Type message to broadcast immediately to all connected devices..."
                  className="w-full rounded-xl border border-input bg-secondary/30 p-3 text-xs text-foreground outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
                ⚡ This will instantly trigger Web Push Notifications, in-app notification badges, and dispatch email alerts to all registered participants.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickBlastOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-amber-500 text-white hover:bg-amber-600 font-bold gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Send Blast Now</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
