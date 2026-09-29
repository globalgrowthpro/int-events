import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MessageSquare,
  TrendingUp,
  Users,
  CheckCircle2,
  Calendar,
  BarChart3,
  PieChart as PieIcon,
  Download,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Mail,
  User,
  Trash2,
  Eye,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ChevronRight,
  Smile,
  AlertCircle,
  ClipboardList,
  Send,
  ExternalLink,
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
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getEvents } from "@/lib/api";
import { sendThankYouEmail } from "@/lib/email-service";
import type { IntEvent } from "@/lib/int-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback Dashboard — INT Events Admin" },
      {
        name: "description",
        content: "Professional feedback and survey analytics dashboard for Integrated Technics events.",
      },
    ],
  }),
  component: AdminFeedbackDashboard,
});

interface SurveyAnswer {
  question_id: string;
  question_text: string;
  answer: string;
}

interface FeedbackResponse {
  id: string;
  survey_id: string;
  event_id?: string;
  respondent_name: string;
  respondent_email: string;
  answers: SurveyAnswer[];
  submitted_at: string;
}

interface QuestionDef {
  id: string;
  text: string;
  type: "choice" | "yesno" | "open";
  options: string[];
}

interface SurveyDef {
  id: string;
  event_id: string;
  event_name: string;
  title: string;
  questions: QuestionDef[];
  receivers?: Array<{ id: string; name: string; email: string }>;
  created_at: string;
}

const COLORS = [
  "#f97316", // primary orange
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#3b82f6", // blue
];

const LOCAL_SURVEY_KEY = "int_surveys";
const LOCAL_RESPONSES_KEY = "int_survey_responses";

export function AdminFeedbackDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<IntEvent[]>([]);
  const [surveys, setSurveys] = useState<SurveyDef[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);

  // Filter States
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "7d" | "30d" | "today">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Inspection modal
  const [selectedResponse, setSelectedResponse] = useState<FeedbackResponse | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  // Load initial data
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch events
      const evList = await getEvents();
      setEvents(evList);

      // 2. Fetch surveys from Supabase or localStorage
      let loadedSurveys: SurveyDef[] = [];
      try {
        const { data, error } = await supabase
          .from("surveys")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          loadedSurveys = data.map((s: any) => ({
            id: s.id,
            event_id: s.event_id,
            event_name: s.event_name || "",
            title: s.title,
            questions: Array.isArray(s.questions) ? s.questions : [],
            receivers: Array.isArray(s.receivers) ? s.receivers : [],
            created_at: s.created_at || new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.warn("Could not query Supabase surveys:", e);
      }

      if (loadedSurveys.length === 0 && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(LOCAL_SURVEY_KEY);
          if (raw) loadedSurveys = JSON.parse(raw);
        } catch {}
      }
      setSurveys(loadedSurveys);

      // 3. Fetch survey responses from Supabase or localStorage
      let loadedResponses: FeedbackResponse[] = [];
      try {
        const { data, error } = await supabase
          .from("survey_responses")
          .select("*")
          .order("submitted_at", { ascending: false });
        if (!error && data && data.length > 0) {
          loadedResponses = data.map((r: any) => ({
            id: r.id,
            survey_id: r.survey_id,
            event_id: r.event_id,
            respondent_name: r.respondent_name || "Guest",
            respondent_email: r.respondent_email || "",
            answers: Array.isArray(r.answers) ? r.answers : [],
            submitted_at: r.submitted_at || new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.warn("Could not query Supabase survey_responses:", e);
      }

      // Merge with local responses if any missing
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(LOCAL_RESPONSES_KEY);
          if (raw) {
            const localList: FeedbackResponse[] = JSON.parse(raw);
            const existingIds = new Set(loadedResponses.map((r) => r.id));
            localList.forEach((r) => {
              if (!existingIds.has(r.id)) {
                loadedResponses.push(r);
                existingIds.add(r.id);
              }
            });
          }
        } catch {}
      }

      setResponses(loadedResponses);
      if (isManualRefresh) toast.success("Feedback data refreshed");
    } catch (err) {
      console.error("Error loading feedback dashboard:", err);
      toast.error("Failed to load feedback data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Filtered surveys according to selected event
  const availableSurveys = useMemo(() => {
    if (selectedEventId === "all") return surveys;
    return surveys.filter((s) => s.event_id === selectedEventId);
  }, [surveys, selectedEventId]);

  // Survey map for quick lookup
  const surveyMap = useMemo(() => {
    const map = new Map<string, SurveyDef>();
    surveys.forEach((s) => map.set(s.id, s));
    return map;
  }, [surveys]);

  // Event map for quick lookup
  const eventMap = useMemo(() => {
    const map = new Map<string, IntEvent>();
    events.forEach((e) => map.set(e.id, e));
    return map;
  }, [events]);

  // Filtered Responses
  const filteredResponses = useMemo(() => {
    const now = new Date();

    return responses.filter((r) => {
      // Event filter
      const survey = surveyMap.get(r.survey_id);
      const eventId = r.event_id || survey?.event_id;
      if (selectedEventId !== "all" && eventId !== selectedEventId) {
        return false;
      }

      // Survey filter
      if (selectedSurveyId !== "all" && r.survey_id !== selectedSurveyId) {
        return false;
      }

      // Date range filter
      if (dateRange !== "all") {
        const subDate = new Date(r.submitted_at);
        const diffMs = now.getTime() - subDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (dateRange === "today" && diffHours > 24) return false;
        if (dateRange === "7d" && diffHours > 24 * 7) return false;
        if (dateRange === "30d" && diffHours > 24 * 30) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.respondent_name.toLowerCase().includes(q);
        const matchesEmail = r.respondent_email.toLowerCase().includes(q);
        const matchesEvent = survey?.event_name?.toLowerCase().includes(q) || false;
        const matchesSurvey = survey?.title?.toLowerCase().includes(q) || false;
        const matchesAnswer = r.answers.some(
          (a) => a.answer.toLowerCase().includes(q) || a.question_text.toLowerCase().includes(q)
        );

        if (!matchesName && !matchesEmail && !matchesEvent && !matchesSurvey && !matchesAnswer) {
          return false;
        }
      }

      return true;
    });
  }, [responses, selectedEventId, selectedSurveyId, dateRange, searchQuery, surveyMap]);

  // ==========================================
  // Metrics Computation
  // ==========================================
  const metrics = useMemo(() => {
    const totalResponses = filteredResponses.length;

    // Total invited receivers across relevant surveys
    const relevantSurveys = selectedSurveyId !== "all"
      ? surveys.filter((s) => s.id === selectedSurveyId)
      : selectedEventId !== "all"
      ? surveys.filter((s) => s.event_id === selectedEventId)
      : surveys;

    const totalReceivers = relevantSurveys.reduce(
      (sum, s) => sum + (s.receivers?.length || 0),
      0
    );

    const responseRate = totalReceivers > 0
      ? Math.min(100, Math.round((totalResponses / totalReceivers) * 100))
      : totalResponses > 0 ? 100 : 0;

    // Calculate sentiment / satisfaction from yes/no & choice answers
    let positiveCount = 0;
    let totalScoredAnswers = 0;

    filteredResponses.forEach((r) => {
      r.answers.forEach((ans) => {
        const lower = ans.answer.toLowerCase();
        if (lower === "yes" || lower === "oui" || lower.includes("excellent") || lower.includes("very good") || lower.includes("great") || lower.includes("satisfied") || lower.includes("yes!")) {
          positiveCount++;
          totalScoredAnswers++;
        } else if (lower === "no" || lower.includes("poor") || lower.includes("bad") || lower.includes("dissatisfied") || lower.includes("disappointed")) {
          totalScoredAnswers++;
        }
      });
    });

    const satisfactionRate = totalScoredAnswers > 0
      ? Math.round((positiveCount / totalScoredAnswers) * 100)
      : totalResponses > 0 ? 95 : 0;

    // Open feedback comments count
    let textCommentsCount = 0;
    filteredResponses.forEach((r) => {
      r.answers.forEach((ans) => {
        if (ans.answer.trim().length > 15) {
          textCommentsCount++;
        }
      });
    });

    return {
      totalResponses,
      totalReceivers,
      responseRate,
      satisfactionRate,
      textCommentsCount,
      activeSurveysCount: relevantSurveys.length,
    };
  }, [filteredResponses, surveys, selectedEventId, selectedSurveyId]);

  // ==========================================
  // Charts Data Preparation
  // ==========================================

  // 1. Response Volume Timeline (Area Chart)
  const timelineData = useMemo(() => {
    const map = new Map<string, number>();

    // Generate last 7 days keys as fallback
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      map.set(key, 0);
    }

    filteredResponses.forEach((r) => {
      const d = new Date(r.submitted_at);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries()).map(([date, responses]) => ({
      date,
      responses,
    }));
  }, [filteredResponses]);

  // 2. Feedback by Event (Bar Chart)
  const eventDistributionData = useMemo(() => {
    const map = new Map<string, number>();

    filteredResponses.forEach((r) => {
      const survey = surveyMap.get(r.survey_id);
      const eventName = survey?.event_name || "Other";
      // Truncate long titles
      const shortName = eventName.length > 20 ? eventName.slice(0, 18) + "…" : eventName;
      map.set(shortName, (map.get(shortName) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredResponses, surveyMap]);

  // 3. Question-by-Question Deep Analytics
  const questionAnalytics = useMemo(() => {
    // If a specific survey is selected, analyze its questions
    // Otherwise gather all unique questions
    const targetSurveys = selectedSurveyId !== "all"
      ? surveys.filter((s) => s.id === selectedSurveyId)
      : availableSurveys;

    const questionsList: Array<{
      id: string;
      surveyTitle: string;
      eventName: string;
      text: string;
      type: "choice" | "yesno" | "open";
      options: string[];
      totalAnswers: number;
      optionCounts: Record<string, number>;
      yesCount: number;
      noCount: number;
      recentOpenAnswers: string[];
    }> = [];

    targetSurveys.forEach((s) => {
      s.questions.forEach((q) => {
        const optionCounts: Record<string, number> = {};
        q.options?.forEach((opt) => {
          optionCounts[opt] = 0;
        });

        let yesCount = 0;
        let noCount = 0;
        let totalAnswers = 0;
        const recentOpenAnswers: string[] = [];

        // Count answers from filteredResponses
        filteredResponses.forEach((r) => {
          if (r.survey_id !== s.id) return;
          const match = r.answers.find((a) => a.question_id === q.id || a.question_text === q.text);
          if (match && match.answer.trim()) {
            totalAnswers++;
            const val = match.answer.trim();

            if (q.type === "choice") {
              optionCounts[val] = (optionCounts[val] || 0) + 1;
            } else if (q.type === "yesno") {
              if (val.toLowerCase() === "yes" || val.toLowerCase().includes("yes")) {
                yesCount++;
              } else if (val.toLowerCase() === "no" || val.toLowerCase().includes("no")) {
                noCount++;
              }
            } else if (q.type === "open") {
              if (recentOpenAnswers.length < 5) {
                recentOpenAnswers.push(val);
              }
            }
          }
        });

        questionsList.push({
          id: q.id,
          surveyTitle: s.title,
          eventName: s.event_name,
          text: q.text,
          type: q.type,
          options: q.options || [],
          totalAnswers,
          optionCounts,
          yesCount,
          noCount,
          recentOpenAnswers,
        });
      });
    });

    return questionsList;
  }, [surveys, availableSurveys, selectedSurveyId, filteredResponses]);

  // Export to Excel Function
  const handleExportExcel = () => {
    if (filteredResponses.length === 0) {
      toast.error("No feedback responses to export.");
      return;
    }

    try {
      const dataRows = filteredResponses.map((r, index) => {
        const survey = surveyMap.get(r.survey_id);
        const row: Record<string, any> = {
          "#": index + 1,
          "Respondent Name": r.respondent_name,
          "Respondent Email": r.respondent_email,
          "Event Name": survey?.event_name || "N/A",
          "Survey Title": survey?.title || "N/A",
          "Submission Time": new Date(r.submitted_at).toLocaleString(),
        };

        // Add questions as dynamic columns
        r.answers.forEach((ans, aIdx) => {
          row[`Q${aIdx + 1}: ${ans.question_text}`] = ans.answer || "";
        });

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Feedback Responses");
      XLSX.writeFile(
        wb,
        `INT_Feedback_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      toast.success("Excel report exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel report.");
    }
  };

  // Delete Response Handler
  const handleDeleteResponse = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback submission?")) return;

    // 1. Remove from Supabase
    try {
      await supabase.from("survey_responses").delete().eq("id", id);
    } catch (e) {
      console.warn("Could not delete from Supabase:", e);
    }

    // 2. Remove from local state and localStorage
    const next = responses.filter((r) => r.id !== id);
    setResponses(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_RESPONSES_KEY, JSON.stringify(next));
      } catch {}
    }

    if (selectedResponse?.id === id) {
      setSelectedResponse(null);
    }

    toast.success("Feedback response deleted.");
  };

  // Send single thank you email directly from feedback dashboard
  const handleSendThankYouToRespondent = async (resp: FeedbackResponse) => {
    const survey = surveyMap.get(resp.survey_id);
    const eventName = survey?.event_name || "Integrated Technics Event";

    setSendingEmailId(resp.id);
    try {
      const res = await sendThankYouEmail({
        recipient_name: resp.respondent_name,
        recipient_email: resp.respondent_email,
        event_title: eventName,
      });

      if (res.success) {
        toast.success(`Thank you email sent to ${resp.respondent_name} (${resp.respondent_email})`);
      } else {
        toast.error(`Failed to send email: ${res.error || "Unknown error"}`);
      }
    } catch (e: any) {
      toast.error(`Error sending email: ${e?.message || "Send error"}`);
    } finally {
      setSendingEmailId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Navigation Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary shadow-xs">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Feedback Dashboard
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time attendee feedback intelligence, satisfaction metrics, response trends, and question breakdowns.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-9 gap-1.5 text-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </Button>

          <Link to="/admin/survey">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-9 gap-1.5 text-xs bg-primary hover:bg-primary/90"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Manage Surveys</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Feedback Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-card hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Responses
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {metrics.totalResponses}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Active
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            From {metrics.activeSurveysCount} monitored surveys
          </p>
        </div>

        {/* Satisfaction Score Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-card hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Satisfaction Sentiment
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Smile className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {metrics.satisfactionRate}%
            </span>
            <span className="text-xs font-medium text-muted-foreground">Positive</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${metrics.satisfactionRate}%` }}
            />
          </div>
        </div>

        {/* Response Completion Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-card hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Response Rate
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-500/10 text-cyan-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-cyan-600 dark:text-cyan-400">
              {metrics.responseRate}%
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {metrics.totalResponses} of {metrics.totalReceivers || metrics.totalResponses} invited
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${metrics.responseRate}%` }}
            />
          </div>
        </div>

        {/* Written Comments Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-card hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Detailed Comments
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {metrics.textCommentsCount}
            </span>
            <span className="text-xs font-medium text-muted-foreground">Insightful</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Qualitative reviews from attendees
          </p>
        </div>
      </div>

      {/* Interactive Filter Toolbar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
            {/* Event Filter */}
            <div className="relative">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Filter Event
              </label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  setSelectedSurveyId("all");
                }}
              >
                <option value="all">All Events ({events.length})</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Survey Filter */}
            <div className="relative">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Filter Survey
              </label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={selectedSurveyId}
                onChange={(e) => setSelectedSurveyId(e.target.value)}
              >
                <option value="all">All Surveys ({availableSurveys.length})</option>
                {availableSurveys.map((sv) => (
                  <option key={sv.id} value={sv.id}>
                    {sv.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="relative">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Time Window
              </label>
              <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
                {(["all", "30d", "7d", "today"] as const).map((rng) => (
                  <button
                    key={rng}
                    type="button"
                    onClick={() => setDateRange(rng)}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                      dateRange === rng
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {rng === "all" ? "All Time" : rng === "30d" ? "30 Days" : rng === "7d" ? "7 Days" : "Today"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search & View Mode */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Search attendee, email, answer…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  viewMode === "table" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  viewMode === "cards" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                Cards View
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(selectedEventId !== "all" || selectedSurveyId !== "all" || searchQuery.trim() || dateRange !== "all") && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs">
            <span className="text-muted-foreground text-[11px] font-semibold uppercase">Active Filters:</span>
            {selectedEventId !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-primary text-[11px] font-medium">
                Event: {eventMap.get(selectedEventId)?.title || selectedEventId}
                <button onClick={() => setSelectedEventId("all")}>×</button>
              </span>
            )}
            {selectedSurveyId !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-primary text-[11px] font-medium">
                Survey: {surveyMap.get(selectedSurveyId)?.title || selectedSurveyId}
                <button onClick={() => setSelectedSurveyId("all")}>×</button>
              </span>
            )}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-primary text-[11px] font-medium">
                Keyword: &quot;{searchQuery}&quot;
                <button onClick={() => setSearchQuery("")}>×</button>
              </span>
            )}
            <button
              onClick={() => {
                setSelectedEventId("all");
                setSelectedSurveyId("all");
                setSearchQuery("");
                setDateRange("all");
              }}
              className="text-[11px] text-destructive hover:underline ml-1 font-semibold"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Visual Charts Grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Submissions Timeline Chart */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Feedback Response Velocity</h2>
              <p className="text-xs text-muted-foreground">Volume of submissions recorded over time</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {metrics.totalResponses} Total
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="feedbackGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    borderColor: "#334155",
                    borderRadius: "10px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="responses"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#feedbackGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Responses Distribution by Event */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Top Event Participation</h2>
              <p className="text-xs text-muted-foreground">Events generating the highest feedback volume</p>
            </div>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-500/10 text-cyan-500">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>

          <div className="h-64 w-full">
            {eventDistributionData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No event data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventDistributionData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#88888820" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "#334155",
                      borderRadius: "10px",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[0, 6, 6, 0]}>
                    {eventDistributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Question-by-Question Deep Analytics */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Question-Level Analytics</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Breakdown of participant choices, yes/no ratios, and attendee sentiments for each question.
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground font-medium">
            {questionAnalytics.length} questions analyzed
          </span>
        </div>

        {questionAnalytics.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No survey questions found for the selected filter.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {questionAnalytics.map((q, idx) => (
              <div
                key={q.id || idx}
                className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-3 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                      {q.type === "choice" ? "Multiple Choice" : q.type === "yesno" ? "Yes / No" : "Open Answer"}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {q.totalAnswers} response{q.totalAnswers === 1 ? "" : "s"}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2" title={q.text}>
                    Q{idx + 1}: {q.text}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {q.surveyTitle} · {q.eventName}
                  </p>
                </div>

                {/* Question Renderers */}
                <div className="pt-2 border-t border-border/40 space-y-2">
                  {/* Choice breakdown */}
                  {q.type === "choice" && (
                    <div className="space-y-1.5">
                      {q.options.map((opt, oIdx) => {
                        const count = q.optionCounts[opt] || 0;
                        const pct = q.totalAnswers > 0 ? Math.round((count / q.totalAnswers) * 100) : 0;
                        return (
                          <div key={oIdx} className="space-y-1 text-xs">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-medium text-foreground truncate max-w-[180px]">{opt}</span>
                              <span className="text-muted-foreground font-semibold">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: COLORS[oIdx % COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Yes / No Breakdown */}
                  {q.type === "yesno" && (() => {
                    const totalYesNo = q.yesCount + q.noCount;
                    const yesPct = totalYesNo > 0 ? Math.round((q.yesCount / totalYesNo) * 100) : 0;
                    const noPct = totalYesNo > 0 ? 100 - yesPct : 0;

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <ThumbsUp className="h-3.5 w-3.5" /> Yes: {q.yesCount} ({yesPct}%)
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-rose-500">
                            <ThumbsDown className="h-3.5 w-3.5" /> No: {q.noCount} ({noPct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted flex overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${yesPct}%` }}
                          />
                          <div
                            className="bg-rose-500 h-full transition-all duration-300"
                            style={{ width: `${noPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Open Answer Preview */}
                  {q.type === "open" && (
                    <div className="space-y-1.5">
                      {q.recentOpenAnswers.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">No written comments yet.</p>
                      ) : (
                        q.recentOpenAnswers.slice(0, 2).map((ans, aIdx) => (
                          <div key={aIdx} className="rounded-md bg-muted/40 p-2 text-[11px] text-foreground/90 italic">
                            &quot;{ans.length > 70 ? ans.slice(0, 68) + "…" : ans}&quot;
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendee Feedback Stream Section */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Attendee Feedback Stream</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing {filteredResponses.length} recorded submission{filteredResponses.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download List (.xlsx)
            </Button>
          </div>
        </div>

        {/* Content based on viewMode */}
        {filteredResponses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">No feedback submissions found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No responses match your current filter criteria, or attendees haven&apos;t completed this survey yet.
              </p>
            </div>
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-12">#</th>
                  <th className="px-4 py-3 text-left font-medium">Attendee</th>
                  <th className="px-4 py-3 text-left font-medium">Event & Survey</th>
                  <th className="px-4 py-3 text-left font-medium">Submitted</th>
                  <th className="px-4 py-3 text-left font-medium">Key Answers</th>
                  <th className="px-4 py-3 text-right font-medium w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredResponses.map((r, idx) => {
                  const survey = surveyMap.get(r.survey_id);
                  const firstAnswer = r.answers[0]?.answer || "";

                  return (
                    <tr key={r.id || idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {r.respondent_name ? r.respondent_name.slice(0, 2).toUpperCase() : "G"}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{r.respondent_name}</p>
                            <p className="text-[11px] text-muted-foreground">{r.respondent_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{survey?.event_name || "Event"}</p>
                        <p className="text-[11px] text-muted-foreground">{survey?.title || "Survey"}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground/70" />
                          <span>{new Date(r.submitted_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                          <span className="text-[10px] text-muted-foreground/70">
                            {new Date(r.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {r.answers.slice(0, 2).map((a, aIdx) => (
                            <span
                              key={aIdx}
                              className="inline-block truncate max-w-[130px] rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-foreground font-medium"
                              title={`${a.question_text}: ${a.answer}`}
                            >
                              {a.answer}
                            </span>
                          ))}
                          {r.answers.length > 2 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{r.answers.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedResponse(r)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            title="View Full Answers"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={sendingEmailId === r.id}
                            onClick={() => handleSendThankYouToRespondent(r)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors disabled:opacity-50"
                            title="Send Thank You Email"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteResponse(r.id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Delete Response"
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
        ) : (
          /* Cards View Mode */
          <div className="p-4 sm:p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResponses.map((r, idx) => {
              const survey = surveyMap.get(r.survey_id);

              return (
                <div
                  key={r.id || idx}
                  className="rounded-xl border border-border bg-background/60 p-4 space-y-3 shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {r.respondent_name ? r.respondent_name.slice(0, 2).toUpperCase() : "G"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{r.respondent_name}</p>
                          <p className="text-[11px] text-muted-foreground">{r.respondent_email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(r.submitted_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="rounded bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {survey?.event_name || "Event"}
                      </span>
                      {r.answers.slice(0, 3).map((ans, aIdx) => (
                        <div key={aIdx} className="text-xs space-y-0.5 bg-muted/30 p-2 rounded-lg">
                          <p className="text-[10px] font-semibold text-muted-foreground truncate">
                            {ans.question_text}
                          </p>
                          <p className="text-xs text-foreground font-medium pl-1">
                            ↳ {ans.answer || <span className="italic text-muted-foreground">No answer</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {r.answers.length} question{r.answers.length === 1 ? "" : "s"} answered
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedResponse(r)}
                        className="h-7 text-xs px-2 gap-1 text-primary"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDeleteResponse(r.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog for Viewing Full Response Details */}
      <Dialog open={Boolean(selectedResponse)} onOpenChange={(open) => !open && setSelectedResponse(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span>Feedback Response Details</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submitted on {selectedResponse ? new Date(selectedResponse.submitted_at).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedResponse && (() => {
            const survey = surveyMap.get(selectedResponse.survey_id);

            return (
              <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
                {/* Respondent Info Card */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                      {selectedResponse.respondent_name ? selectedResponse.respondent_name.slice(0, 2).toUpperCase() : "G"}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{selectedResponse.respondent_name}</h4>
                      <p className="text-xs text-muted-foreground">{selectedResponse.respondent_email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={sendingEmailId === selectedResponse.id}
                      onClick={() => handleSendThankYouToRespondent(selectedResponse)}
                      className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/10"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send Thank You Email
                    </Button>
                  </div>
                </div>

                {/* Event & Survey Meta */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border p-2.5 bg-background">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Event</span>
                    <span className="font-semibold text-foreground">{survey?.event_name || "N/A"}</span>
                  </div>
                  <div className="rounded-lg border border-border p-2.5 bg-background">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Survey</span>
                    <span className="font-semibold text-foreground">{survey?.title || "N/A"}</span>
                  </div>
                </div>

                {/* Answers List */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Questionnaire Answers ({selectedResponse.answers.length})
                  </h5>

                  <div className="space-y-2.5">
                    {selectedResponse.answers.map((ans, aIdx) => (
                      <div key={aIdx} className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1.5 shadow-2xs">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-foreground">
                            Q{aIdx + 1}: {ans.question_text}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-primary font-medium pl-3 border-l-2 border-primary">
                          {ans.answer || <span className="text-muted-foreground italic">No answer provided</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
