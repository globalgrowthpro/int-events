import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Users,
  Award,
  Building2,
  CheckCircle2,
  Calendar,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  Filter,
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
import { toast } from "sonner";
import { events } from "@/lib/int-data";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Analytics & Reports — INT Events Admin" },
      {
        name: "description",
        content:
          "Visual analytics, interactive diagrams, pie charts, and exportable reports across Integrated Technics events.",
      },
      { property: "og:title", content: "Analytics & Reports — INT Events Admin" },
      {
        property: "og:description",
        content: "Comprehensive event analytics and diagrams for INT leadership.",
      },
    ],
  }),
  component: ReportsPage,
});

// Color palettes for diagrams
const AUDIENCE_COLORS = ["#0284c7", "#8b5cf6", "#f59e0b", "#10b981"];
const SECTOR_COLORS = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
const GENDER_COLORS = ["#3b82f6", "#ec4899"];

const weeklyData = [
  { day: "Mon", registrations: 42, checkIns: 38, inquiries: 18 },
  { day: "Tue", registrations: 68, checkIns: 59, inquiries: 24 },
  { day: "Wed", registrations: 55, checkIns: 50, inquiries: 20 },
  { day: "Thu", registrations: 91, checkIns: 84, inquiries: 35 },
  { day: "Fri", registrations: 74, checkIns: 69, inquiries: 29 },
  { day: "Sat", registrations: 33, checkIns: 30, inquiries: 12 },
  { day: "Sun", registrations: 47, checkIns: 42, inquiries: 16 },
];

const audienceData = [
  { name: "Enterprise Clients", value: 742, percent: 59 },
  { name: "Partner Vendors", value: 268, percent: 21 },
  { name: "INT Employees", value: 188, percent: 15 },
  { name: "VIP Delegates", value: 50, percent: 5 },
];

const sectorData = [
  { name: "Banking & Finance", value: 348 },
  { name: "Government & Defence", value: 295 },
  { name: "Oil & Gas / Energy", value: 224 },
  { name: "Telecom & Cloud", value: 178 },
  { name: "Healthcare & Education", value: 125 },
  { name: "Systems Integrators", value: 78 },
];

const genderData = [
  { name: "Male", value: 810 },
  { name: "Female", value: 438 },
];

const eventComparisonData = events.map((ev) => ({
  name: ev.title.replace("INT ", "").replace(" 2026", ""),
  capacity: ev.capacity,
  registered: ev.registered,
  attended: Math.round(ev.registered * 0.86),
}));

export function ReportsPage() {
  const [trendView, setTrendView] = useState<"area" | "bar">("area");
  const [timeRange, setTimeRange] = useState("This Quarter");

  const handleDownloadCsv = (type: string, filename: string) => {
    let csvContent = "";
    if (type === "registrations") {
      csvContent =
        "Registration ID,Full Name,Company,Role,Gender,Event,Status,Date\n" +
        "INT-EVT-000248,Ahmed Mohamed,ABC Corporation,Client,Male,INT Security Technology Summit 2026,Registered,2026-08-20\n" +
        "INT-EVT-000249,Sarah Klein,Genetec,Vendor,Female,INT Security Technology Summit 2026,Registered,2026-08-20\n" +
        "INT-EVT-000250,Omar Ali,Integrated Technics,Employee,Male,INT Security Technology Summit 2026,Confirmed,2026-08-19\n" +
        "INT-EVT-000251,Nour Hassan,Egypt Telecom,Client,Female,INT Security Technology Summit 2026,Registered,2026-08-18\n" +
        "INT-EVT-000252,Marco Rossi,Milestone,Vendor,Male,INT Partner Day,Registered,2026-08-18\n";
    } else if (type === "attendance") {
      csvContent =
        "Badge ID,Attendee Name,Company,Event,Check-in Time,Gate,Status\n" +
        "TCK-9012,Ahmed Mohamed,ABC Corporation,Security Summit,09:12 AM,Main Gate A,Present\n" +
        "TCK-9013,Sarah Klein,Genetec,Security Summit,09:20 AM,VIP Gate,Present\n" +
        "TCK-9014,Omar Ali,Integrated Technics,Security Summit,08:45 AM,Staff Gate,Present\n" +
        "TCK-9015,Nour Hassan,Egypt Telecom,Security Summit,09:35 AM,Main Gate B,Present\n";
    } else if (type === "vendors") {
      csvContent =
        "Vendor Name,Contact Person,Category,Reps Count,Approved Events,Status\n" +
        "Genetec,John Smith,Unified Security,6,3,Approved\n" +
        "Axis Communications,Petra Lund,Network Video,4,2,Approved\n" +
        "Milestone Systems,Marco Rossi,VMS,3,2,Pending\n" +
        "HID Global,Amira Zaki,Access Control,2,1,Pending\n";
    } else {
      csvContent =
        "Certificate ID,Recipient Name,Company,Event,Issue Date,Status\n" +
        "CRT-2026-0104,Ahmed Mohamed,ABC Corporation,Smart Infrastructure Workshop,2026-08-20,Delivered\n" +
        "CRT-2026-0105,Dina Farouk,Cisco,Smart Infrastructure Workshop,2026-08-20,Delivered\n" +
        "CRT-2026-0106,Hassan Mostafa,Orange,Smart Infrastructure Workshop,2026-08-20,Delivered\n";
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filename}.csv successfully!`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header & Range Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Analytics & Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visual diagrams, audience distribution, and exportable data across all INT events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-2xs">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
            >
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Quarter</option>
              <option>All Time</option>
            </select>
          </span>

          <button
            onClick={() => handleDownloadCsv("registrations", "int-events-all-data")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-tech"
          >
            <Download className="h-3.5 w-3.5" /> Export All Data
          </button>
        </div>
      </div>

      {/* 1. Modern Colored Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Registrations */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card to-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Total Registrations
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">1,248</span>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="mr-0.5 h-3 w-3" /> +18.4%
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Active participants across 4 summits</p>
          <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-sky-500/10 blur-xl" />
        </div>

        {/* Card 2: Attendance Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Avg. Attendance Rate
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">86.4%</span>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="mr-0.5 h-3 w-3" /> +4.2% vs target
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">High on-site badge scan conversion</p>
          <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl" />
        </div>

        {/* Card 3: Partner Vendors */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-card to-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Partner Vendors
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">34</span>
            <span className="inline-flex items-center text-xs font-semibold text-violet-600 dark:text-violet-400">
              +6 new exhibitors
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Genetec, Axis, Cisco, Honeywell & more</p>
          <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-violet-500/10 blur-xl" />
        </div>

        {/* Card 4: Certificates Issued */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Certificates Issued
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">482</span>
            <span className="inline-flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400">
              98% verified
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Digital verifiable workshop credentials</p>
          <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-amber-500/10 blur-xl" />
        </div>
      </div>

      {/* 2. Main Diagrams: Weekly Trend & Event Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Trend Diagram */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Registration & Check-In Velocity
              </h2>
              <p className="text-xs text-muted-foreground">
                Daily activity tracking over the last 7 days.
              </p>
            </div>
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTrendView("area")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                  trendView === "area"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Area
              </button>
              <button
                type="button"
                onClick={() => setTrendView("bar")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                  trendView === "bar"
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
              {trendView === "area" ? (
                <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="checkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                  <XAxis dataKey="day" stroke="#888888" fontSize={11} />
                  <YAxis stroke="#888888" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="registrations"
                    name="Registrations"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#regGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="checkIns"
                    name="Check-Ins"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#checkGrad)"
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                </AreaChart>
              ) : (
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                  <XAxis dataKey="day" stroke="#888888" fontSize={11} />
                  <YAxis stroke="#888888" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="registrations" name="Registrations" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="checkIns" name="Check-Ins" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        {/* Event Capacity vs Registered vs Attended Bar Diagram */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Event Capacity vs Actual Attendance
            </h2>
            <p className="text-xs text-muted-foreground">
              Capacity allocation and participant turnouts across summits.
            </p>
          </div>

          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                <XAxis dataKey="name" stroke="#888888" fontSize={10} interval={0} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="capacity" name="Capacity" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="registered" name="Registered" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="attended" name="Attended" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* 3. Pie Charts: Audience Composition, Industry Sectors, & Gender Breakdown */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Pie Chart 1: Audience Split */}
        <section className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              Audience Composition
            </h2>
            <p className="text-xs text-muted-foreground">
              Participant segment ratios by account type.
            </p>
          </div>

          <div className="my-3 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={audienceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {audienceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={AUDIENCE_COLORS[index % AUDIENCE_COLORS.length]} />
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

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
            {audienceData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: AUDIENCE_COLORS[idx % AUDIENCE_COLORS.length] }}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">{item.value} ({item.percent}%)</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pie Chart 2: Industry Sector Breakdown */}
        <section className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-cyan-600" />
              Industry & Sector Breakdown
            </h2>
            <p className="text-xs text-muted-foreground">
              Attendee representation by business vertical.
            </p>
          </div>

          <div className="my-3 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`sector-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
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

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
            {sectorData.slice(0, 4).map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">{item.value} attendees</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pie Chart 3: Gender & Demographics */}
        <section className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card md:col-span-2 xl:col-span-1">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-pink-600" />
              Gender Demographics
            </h2>
            <p className="text-xs text-muted-foreground">
              Attendee gender distribution on badge registrations.
            </p>
          </div>

          <div className="my-3 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`gender-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
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

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
            <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 p-2">
              <span className="h-3 w-3 shrink-0 rounded-full bg-blue-500" />
              <div>
                <p className="text-xs font-semibold text-foreground">Male</p>
                <p className="text-[11px] text-muted-foreground">810 (65%)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-pink-500/10 p-2">
              <span className="h-3 w-3 shrink-0 rounded-full bg-pink-500" />
              <div>
                <p className="text-xs font-semibold text-foreground">Female</p>
                <p className="text-[11px] text-muted-foreground">438 (35%)</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 4. Exportable Data Center */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground">Exportable Data Center</h2>
          <p className="text-xs text-muted-foreground">
            Download filtered datasets in CSV format for executive reporting and audit logs.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40">
            <div>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/10 text-sky-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-foreground">Registration Report</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                All registered participants with company, badge role, gender and registration timestamp.
              </p>
            </div>
            <button
              onClick={() => handleDownloadCsv("registrations", "int-registrations-report")}
              className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV
            </button>
          </article>

          <article className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40">
            <div>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-foreground">Attendance & Check-in</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Scanned QR check-in times, gate locations, and attendance validation status per summit.
              </p>
            </div>
            <button
              onClick={() => handleDownloadCsv("attendance", "int-attendance-report")}
              className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV
            </button>
          </article>

          <article className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40">
            <div>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/10 text-violet-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-foreground">Vendor & Exhibitor Log</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Exhibitor participation list, booth representative allocations, and review status.
              </p>
            </div>
            <button
              onClick={() => handleDownloadCsv("vendors", "int-vendors-report")}
              className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV
            </button>
          </article>

          <article className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40">
            <div>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-foreground">Certificate Log</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Issued attendance certificates, unique verification hashes, and download dates.
              </p>
            </div>
            <button
              onClick={() => handleDownloadCsv("certificates", "int-certificates-log")}
              className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}
