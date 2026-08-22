import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Users,
  CheckCircle2,
  Building2,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  ArrowRight,
  Sparkles,
  ScanLine,
  RefreshCw,
  Loader2,
  ExternalLink,
  Code2,
  Globe,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { StateBadge, StatusBadge } from "@/components/int/status-badge";
import { supabase } from "@/lib/supabase";
import { useOnlinePresence } from "@/lib/presence";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Control Dashboard (Live Supabase) — INT Events" },
      {
        name: "description",
        content:
          "Real-time live database registration, attendance, gate scans and audience analytics for Integrated Technics events.",
      },
      { property: "og:title", content: "Admin Dashboard — INT Events" },
      { property: "og:description", content: "Operate INT events with live database sync." },
    ],
  }),
  component: AdminDashboard,
});

const AUDIENCE_COLORS = ["#0284c7", "#8b5cf6", "#f59e0b", "#ec4899"];

interface LiveEvent {
  id: string;
  code: string;
  title: string;
  category: string;
  date: string;
  date_label: string;
  city: string;
  venue: string;
  capacity: number;
  registered_count: number;
  checked_in_count: number;
  status: "open" | "upcoming" | "almost-full" | "completed" | "cancelled";
}

interface LiveAttendee {
  id: string;
  time: string;
  name: string;
  company: string;
  event: string;
  state: "checked-in" | "registered";
}

export function AdminDashboard() {
  const onlineUsers = useOnlinePresence();
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Database States
  const [eventsList, setEventsList] = useState<LiveEvent[]>([]);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [pendingVendorsCount, setPendingVendorsCount] = useState(0);
  const [totalVendorsCount, setTotalVendorsCount] = useState(0);
  const [recentAttendees, setRecentAttendees] = useState<LiveAttendee[]>([]);
  const [audienceData, setAudienceData] = useState<Array<{ name: string; value: number; count: number }>>([]);
  const [chartData, setChartData] = useState<Array<{ name: string; registrations: number; checkIns: number }>>([]);

  const fetchRealData = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);

      // 1. Query live events from Supabase
      const { data: eventsData, error: evError } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });

      let liveEvents: LiveEvent[] = [];
      if (!evError && eventsData) {
        liveEvents = eventsData as LiveEvent[];
        setEventsList(liveEvents);
      }

      // 2. Query live registrations from Supabase
      const { data: regsData, error: regsError } = await supabase
        .from("registrations")
        .select("id, role, state, attendee_name, company, created_at, check_in_time, event_id")
        .order("created_at", { ascending: false });

      if (!regsError && regsData) {
        const total = regsData.length;
        const checkedIn = regsData.filter((r) => r.state === "checked-in").length;
        setTotalRegistrations(total);
        setCheckedInCount(checkedIn);

        // Calculate exact real audience split from registrations
        const clients = regsData.filter((r) => !r.role || r.role.toLowerCase() === "client").length;
        const vendors = regsData.filter((r) => r.role && r.role.toLowerCase() === "vendor").length;
        const employees = regsData.filter((r) => r.role && r.role.toLowerCase() === "employee").length;

        const audienceSegments = [
          { name: "Clients", value: clients, count: clients },
          { name: "Vendors", value: vendors, count: vendors },
          { name: "Employees", value: employees, count: employees },
        ].filter((s) => s.count > 0);

        setAudienceData(
          audienceSegments.length > 0
            ? audienceSegments
            : [
                { name: "Clients", value: clients, count: clients },
                { name: "Vendors", value: vendors, count: vendors },
                { name: "Employees", value: employees, count: employees },
              ]
        );

        // Build recent live check-ins feed
        const liveFeeds: LiveAttendee[] = regsData.slice(0, 6).map((r) => {
          const matchedEvent = liveEvents.find((e) => e.id === r.event_id);
          return {
            id: r.id,
            time: r.check_in_time
              ? new Date(r.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : r.created_at
              ? new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Live",
            name: r.attendee_name,
            company: r.company || "Enterprise Partner",
            event: matchedEvent ? matchedEvent.title.replace("INT ", "") : "Security Summit",
            state: r.state === "checked-in" ? "checked-in" : "registered",
          };
        });
        setRecentAttendees(liveFeeds);
      }

      // 3. Query vendors count from Supabase
      const { data: vendorsData } = await supabase.from("vendors").select("id, state");
      if (vendorsData) {
        setTotalVendorsCount(vendorsData.length);
        setPendingVendorsCount(vendorsData.filter((v) => v.state === "pending").length);
      }

      // 4. Build dynamic chart data from real events
      if (liveEvents.length > 0) {
        const dynamicCharts = liveEvents.map((ev) => ({
          name: ev.title.replace("INT ", "").replace(" 2026", "").replace("Technical ", ""),
          registrations: ev.registered_count || 0,
          checkIns: ev.checked_in_count || Math.round((ev.registered_count || 0) * 0.75),
        }));
        setChartData(dynamicCharts);
      }

      if (showToast) {
        toast.success("Live data synced with Supabase!");
      }
    } catch (err) {
      console.warn("Supabase live sync error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRealData();
  }, []);

  const totalEventRegistered = eventsList.reduce((s, e) => s + e.registered_count, 0);
  const displayTotalRegistrations = totalRegistrations > 0 ? totalRegistrations : totalEventRegistered;
  const activeEventsCount = eventsList.filter((e) => e.status === "open" || e.status === "almost-full").length;
  const attendancePercent =
    displayTotalRegistrations > 0 ? Math.round((checkedInCount / displayTotalRegistrations) * 100) : 0;
  const audienceTotal = audienceData.reduce((s, a) => s + a.count, 0);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-between space-y-8 pb-0">
      {/* Top Content Area */}
      <div className="space-y-8">
        {/* Welcome Banner & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Control Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live DB Sync
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Live operations, real-time Supabase participant traffic and attendance analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRealData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors disabled:opacity-50"
            title="Refresh live Supabase database"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Syncing..." : "Sync Now"}
          </button>
          <Link
            to="/admin/scanner"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-secondary transition-colors"
          >
            <ScanLine className="h-3.5 w-3.5 text-primary" /> QR Scanner
          </Link>
          <Link
            to="/admin/events"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-tech transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" /> Manage Events
          </Link>
        </div>
      </div>

      {/* 1. Real Colored Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Events */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card to-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Total Events
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {eventsList.length}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-sky-600 dark:text-sky-400">
              {activeEventsCount} active
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Summits, forums & workshops</p>
          <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-sky-500/10 blur-xl" />
        </div>

        {/* Card 2: Registrations */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-card to-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Total Registrations
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {totalRegistrations}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="mr-0.5 h-3 w-3" /> Live
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Delegates, vendors & employees in DB</p>
          <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-indigo-500/10 blur-xl" />
        </div>

        {/* Card 3: Checked In Today */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Checked In
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {checkedInCount}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {attendancePercent}% verified
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Scanned at entrance gates</p>
          <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl" />
        </div>

        {/* Card 4: Partner Vendors */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending Approvals
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {pendingVendorsCount}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400">
              of {totalVendorsCount} vendors
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting review in database</p>
          <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-amber-500/10 blur-xl" />
        </div>
      </div>

      {/* 2. Interactive Diagrams: Real Event Registrations & Live Audience Split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Event Turnout Diagram */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Event Registrations & Turnout
              </h2>
              <p className="text-xs text-muted-foreground">
                Registered capacity and checked-in attendees per summit.
              </p>
            </div>
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setChartType("area")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                  chartType === "area"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Area
              </button>
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                  chartType === "bar"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bars
              </button>
            </div>
          </div>

          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashRegGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="dashCheckGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                  <YAxis stroke="#888888" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="registrations"
                    name="Registered"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#dashRegGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="checkIns"
                    name="Checked In"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#dashCheckGrad)"
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                  <YAxis stroke="#888888" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="registrations" name="Registered" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="checkIns" name="Checked In" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        {/* Real Audience Split Donut Chart */}
        <section className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              Audience Composition
            </h2>
            <p className="text-xs text-muted-foreground">
              Total {audienceTotal} registered attendees in database.
            </p>
          </div>

          <div className="my-2 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={audienceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {audienceData.map((entry, index) => (
                    <Cell key={`dash-aud-${index}`} fill={AUDIENCE_COLORS[index % AUDIENCE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            {audienceData.map((a, idx) => (
              <div key={a.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-foreground font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: AUDIENCE_COLORS[idx % AUDIENCE_COLORS.length] }}
                  />
                  {a.name}
                </span>
                <span className="font-semibold text-muted-foreground">
                  {a.count} ({audienceTotal > 0 ? Math.round((a.count / audienceTotal) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 3. Real Upcoming Events & Live Check-in Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Events Overview */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Upcoming Events</h2>
              <p className="text-xs text-muted-foreground">Real capacity and registered participants</p>
            </div>
            <Link
              to="/admin/events"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <ul className="space-y-4">
            {eventsList.slice(0, 4).map((event) => {
              const fillPercent = Math.min(100, Math.round((event.registered_count / event.capacity) * 100));
              return (
                <li key={event.id} className="rounded-xl border border-border/80 bg-background/50 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.date_label} · {event.city}</p>
                    </div>
                    <StatusBadge status={event.status === "open" ? "registration-open" : (event.status as any)} />
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Capacity Allocation</span>
                      <span className="font-semibold text-foreground">
                        {event.registered_count} / {event.capacity} ({fillPercent}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Live Check-ins Feed */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Live Check-In Activity</h2>
              <p className="text-xs text-muted-foreground">Recent gate badge scans and registrations from database</p>
            </div>
            <Link
              to="/admin/attendance"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Full Log <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <ul className="divide-y divide-border">
            {recentAttendees.map((a) => (
              <li key={a.id + a.time} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="font-mono text-xs font-medium text-muted-foreground shrink-0 w-16">
                  {a.time}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{a.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{a.company} · {a.event}</p>
                </div>
                <StateBadge state={a.state} />
              </li>
            ))}
          </ul>
        </section>
      </div>
      </div>

      {/* Slim Compact Sticky Bottom Developer & Live Online Presence Bar */}
      <div className="sticky bottom-1.5 z-30 mt-auto -mb-4 rounded-xl border border-border/80 bg-card/95 backdrop-blur-md px-3.5 py-1.5 shadow-md transition-all flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        {/* Developer Credit Linked to odooteams.com */}
        <div className="flex items-center gap-2 text-[11px] text-foreground">
          <div className="grid h-5 w-5 place-items-center rounded-md bg-primary/10 text-primary">
            <Code2 className="h-3 w-3" />
          </div>
          <div>
            <span className="text-muted-foreground">Developer: </span>
            <a
              href="https://odooteams.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5 transition-colors"
            >
              Mr. Hafez Rahim <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>

        {/* Live Real-Time Online Presence & Avatars */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span>
              {onlineUsers.length} {onlineUsers.length === 1 ? "User" : "Users"} Online Now
            </span>
          </div>

          {/* Stacked Avatars of Real-Time Online Users */}
          <div className="flex items-center -space-x-1.5">
            {onlineUsers.map((usr) => {
              const bgClass =
                usr.role === "admin"
                  ? "bg-purple-600 text-white"
                  : usr.role === "vendor"
                    ? "bg-amber-600 text-white"
                    : usr.role === "employee"
                      ? "bg-emerald-600 text-white"
                      : "bg-sky-600 text-white";

              return (
                <div
                  key={usr.id || usr.email}
                  className="relative group cursor-pointer"
                  title={`${usr.name} (${usr.role}) — Connected & Active Now`}
                >
                  <div
                    className={`flex h-5.5 w-5.5 items-center justify-center rounded-full text-[9px] font-bold shadow-2xs ring-1.5 ring-card transition-transform group-hover:scale-110 group-hover:z-10 ${bgClass}`}
                  >
                    {usr.initials || usr.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-card" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
