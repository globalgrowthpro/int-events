import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  Plus,
  Trash2,
  Pencil,
  X,
  Upload,
  Download,
  Users,
  Mail,
  User,
  Search,
  FileSpreadsheet,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  StopCircle,
  BarChart3,
  ExternalLink,
  Copy,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { getEvents } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { sendThankYouEmail } from "@/lib/email-service";
import { exportToExcel } from "@/lib/excel-export";
import type { IntEvent } from "@/lib/int-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/survey")({
  head: () => ({
    meta: [
      { title: "Surveys — INT Events Admin" },
      { name: "description", content: "Create event surveys with multiple choice, yes/no and open questions." },
    ],
  }),
  component: AdminSurveyPage,
});

type QType = "choice" | "yesno" | "open";
type Question = { id: string; text: string; type: QType; options: string[]; required?: boolean };
export type SurveyReceiver = {
  id: string;
  name: string;
  email: string;
  status?: "pending" | "sending" | "sent" | "failed";
  sent_at?: string | null;
  error?: string | null;
};
export type Survey = {
  id: string;
  event_id: string;
  event_name: string;
  title: string;
  questions: Question[];
  receivers: SurveyReceiver[];
  created_at: string;
};

const KEY = "int_surveys";
const load = (): Survey[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map((s: any) => ({
      ...s,
      receivers: Array.isArray(s.receivers) ? s.receivers : [],
    }));
  } catch {
    return [];
  }
};
const save = (s: Survey[]) => localStorage.setItem(KEY, JSON.stringify(s));
const uid = () => Math.random().toString(36).slice(2, 10);
const TYPE_LABEL: Record<QType, string> = { choice: "Multiple choice", yesno: "Yes / No", open: "Open answer" };

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

function downloadReceiversTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Name", "Email"],
    ["Hafez Rahim", "hafez.rahim@example.com"],
    ["Sarah Connor", "sarah.connor@example.com"],
    ["Ahmed Ali", "ahmed.ali@example.com"],
  ]);
  ws["!cols"] = [{ wch: 25 }, { wch: 35 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Survey Receivers");
  XLSX.writeFile(wb, "survey-receivers-template.xlsx");
}

function parseSpreadsheet(data: ArrayBuffer): Array<{ name: string; email: string }> {
  const wb = XLSX.read(data, { type: "array" });
  if (!wb.SheetNames.length) return [];

  let targetSheet: XLSX.WorkSheet | null = null;
  for (const name of wb.SheetNames) {
    const s = wb.Sheets[name];
    if (s && s["!ref"]) {
      targetSheet = s;
      break;
    }
  }
  if (!targetSheet) targetSheet = wb.Sheets[wb.SheetNames[0]!]!;
  if (!targetSheet) return [];

  const matrix: unknown[][] = XLSX.utils.sheet_to_json(targetSheet, { header: 1, defval: "" });
  if (!matrix || matrix.length === 0) return [];

  const isNameCol = (h: string) =>
    /^(name|full[\s_]?name|guest|guest[\s_]?name|attendee|recipient|client|person|الاسم|اسم|الاسم[\s_]?بالكامل|الاسم[\s_]?الكامل|اسم[\s_]?الضيف|الضيف|المستلم|المشارك)$/i.test(h) ||
    /(name|guest|attendee|اسم|الضيف|المشارك)/i.test(h);

  const isEmailCol = (h: string) =>
    /^(email|e[\-_]?mail|mail|email[\s_]?address|e[\-_]?mail[\s_]?address|البريد|البريد[\s_]?(الإلكتروني|الالكتروني)|الايميل|الإيميل)$/i.test(h) ||
    /(email|e[\-_]?mail|mail|بريد|ايميل)/i.test(h);

  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const row = matrix[r] || [];
    const hasHeaderMatch = row.some((cell) => {
      const txt = String(cell ?? "").trim().toLowerCase();
      return isNameCol(txt) || isEmailCol(txt);
    });
    if (hasHeaderMatch) {
      headerRowIndex = r;
      break;
    }
  }

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  let headers: string[] = [];
  let dataRows: unknown[][] = [];

  if (headerRowIndex >= 0) {
    headers = (matrix[headerRowIndex] || []).map((c) => String(c ?? "").trim());
    dataRows = matrix.slice(headerRowIndex + 1);
  } else {
    headers = (matrix[0] || []).map((_, i) => `Col_${i}`);
    dataRows = matrix;
  }

  const nameColIdx = headers.findIndex((h) => isNameCol(h.toLowerCase()));
  const emailColIdx = headers.findIndex((h) => isEmailCol(h.toLowerCase()));

  const parsed: Array<{ name: string; email: string }> = [];

  for (const row of dataRows) {
    if (!row || !row.length) continue;

    let rawEmail = "";
    let rawName = "";

    if (emailColIdx >= 0) {
      rawEmail = String(row[emailColIdx] ?? "").trim();
    }
    if (nameColIdx >= 0) {
      rawName = String(row[nameColIdx] ?? "").trim();
    }

    if (!rawEmail || !emailRegex.test(rawEmail)) {
      for (let c = 0; c < row.length; c++) {
        if (c === nameColIdx) continue;
        const cellVal = String(row[c] ?? "").trim();
        const match = cellVal.match(emailRegex);
        if (match) {
          rawEmail = match[0];
          break;
        }
      }
    }

    if (!rawName) {
      for (let c = 0; c < row.length; c++) {
        if (c === emailColIdx) continue;
        const cellVal = String(row[c] ?? "").trim();
        if (cellVal && !emailRegex.test(cellVal) && cellVal.length > 1) {
          rawName = cellVal;
          break;
        }
      }
    }

    const emailMatch = rawEmail.match(emailRegex);
    if (!emailMatch) continue;
    const email = emailMatch[0].toLowerCase().trim();
    const fallbackName = email.split("@")[0] || "Guest";
    parsed.push({
      name: rawName.slice(0, 150).trim() || fallbackName,
      email,
    });
  }

  return parsed;
}

function AdminSurveyPage() {
  const [events, setEvents] = useState<IntEvent[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [receivers, setReceivers] = useState<SurveyReceiver[]>([]);

  // Manual receiver input in form
  const [formReceiverName, setFormReceiverName] = useState("");
  const [formReceiverEmail, setFormReceiverEmail] = useState("");
  const [formReceiverSearch, setFormReceiverSearch] = useState("");
  const formFileInputRef = useRef<HTMLInputElement | null>(null);

  // Dialog state for managing receivers of any survey from table
  const [activeSurveyReceivers, setActiveSurveyReceivers] = useState<Survey | null>(null);
  const [modalReceiverName, setModalReceiverName] = useState("");
  const [modalReceiverEmail, setModalReceiverEmail] = useState("");
  const [modalSearch, setModalSearch] = useState("");
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  // Responses viewer state
  const [responsesMap, setResponsesMap] = useState<Record<string, number>>({});
  const [activeSurveyResponses, setActiveSurveyResponses] = useState<Survey | null>(null);
  const [surveyResponsesList, setSurveyResponsesList] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Email sending state
  const [activeSendingSurvey, setActiveSendingSurvey] = useState<Survey | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [singleSendingId, setSingleSendingId] = useState<string | null>(null);
  const [sendModalSearch, setSendModalSearch] = useState("");
  const stopBulkSendingRef = useRef(false);

  useEffect(() => {
    // 1. Initial load from local cache for instant UI
    setSurveys(load());

    // 2. Fetch latest surveys from Supabase if table exists
    const fetchSurveys = async () => {
      try {
        const { data, error } = await supabase
          .from("surveys")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          const mapped: Survey[] = data.map((s: any) => ({
            id: s.id,
            event_id: s.event_id,
            event_name: s.event_name || "",
            title: s.title,
            questions: Array.isArray(s.questions) ? s.questions : [],
            receivers: Array.isArray(s.receivers) ? s.receivers : [],
            created_at: s.created_at || new Date().toISOString(),
          }));
          setSurveys(mapped);
          save(mapped);
        }
      } catch (err) {
        console.warn("Could not query Supabase surveys table (using local data):", err);
      }
    };
    void fetchSurveys();

    // 3. Fetch responses count
    const fetchResponsesCount = async () => {
      const counts: Record<string, number> = {};
      try {
        const { data } = await supabase.from("survey_responses").select("survey_id");
        if (data) {
          data.forEach((r: any) => {
            counts[r.survey_id] = (counts[r.survey_id] || 0) + 1;
          });
        }
      } catch { }
      try {
        const local = JSON.parse(localStorage.getItem("int_survey_responses") || "[]");
        if (Array.isArray(local)) {
          local.forEach((r: any) => {
            if (!counts[r.survey_id]) {
              counts[r.survey_id] = (counts[r.survey_id] || 0) + 1;
            }
          });
        }
      } catch { }
      setResponsesMap(counts);
    };
    void fetchResponsesCount();

    // 4. Fetch events
    const fetchLight = async (attempt = 0): Promise<void> => {
      const { data, error } = await supabase.from("events").select("id, title").order("date", { ascending: true });
      if (!error && data) { setEvents(data as unknown as IntEvent[]); return; }
      if (attempt < 2) return fetchLight(attempt + 1);
      const full = await getEvents().catch(() => []);
      setEvents(full);
      if (!full.length) toast.error("Couldn't load events. Please refresh.");
    };
    void fetchLight();
  }, []);

  const handleOpenResponses = async (s: Survey) => {
    setActiveSurveyResponses(s);
    setLoadingResponses(true);
    let list: any[] = [];
    try {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", s.id)
        .order("submitted_at", { ascending: false });
      if (!error && data) {
        list = data;
      }
    } catch { }

    try {
      const local = JSON.parse(localStorage.getItem("int_survey_responses") || "[]");
      if (Array.isArray(local)) {
        const localMatches = local.filter((r: any) => r.survey_id === s.id);
        const existingIds = new Set(list.map((r: any) => r.id));
        localMatches.forEach((r: any) => {
          if (!existingIds.has(r.id)) list.push(r);
        });
      }
    } catch { }

    setSurveyResponsesList(list);
    setLoadingResponses(false);
  };

  function reset() {
    setEditingId(null);
    setEventId("");
    setTitle("");
    setQuestions([]);
    setReceivers([]);
    setFormReceiverName("");
    setFormReceiverEmail("");
    setFormReceiverSearch("");
  }

  function addQuestion(type: QType) {
    setQuestions((q) => [
      ...q,
      {
        id: uid(),
        text: "",
        type,
        options: type === "choice" ? ["", ""] : [],
        required: true,
      },
    ]);
  }
  const updateQ = (id: string, patch: Partial<Question>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  function handleAddReceiverToForm() {
    const trimmedEmail = formReceiverEmail.trim().toLowerCase();
    const trimmedName = formReceiverName.trim();
    if (!trimmedEmail) {
      toast.error("Please enter a receiver email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (receivers.some((r) => r.email.toLowerCase() === trimmedEmail)) {
      toast.error("A receiver with this email is already added");
      return;
    }
    const fallbackName = trimmedEmail.split("@")[0] || "Guest";
    setReceivers((prev) => [
      ...prev,
      {
        id: uid(),
        name: trimmedName || fallbackName,
        email: trimmedEmail,
      },
    ]);
    setFormReceiverName("");
    setFormReceiverEmail("");
    toast.success("Receiver added");
  }

  function handleImportExcelToForm(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const parsed = parseSpreadsheet(buffer);
        if (!parsed.length) {
          toast.error("No valid receivers found. Ensure file contains Name and Email columns.");
          return;
        }

        const existingEmails = new Set(receivers.map((r) => r.email.toLowerCase()));
        let newCount = 0;
        let dupCount = 0;

        const toAdd: SurveyReceiver[] = [];
        for (const item of parsed) {
          const lower = item.email.toLowerCase();
          if (existingEmails.has(lower)) {
            dupCount++;
            continue;
          }
          existingEmails.add(lower);
          toAdd.push({
            id: uid(),
            name: item.name,
            email: lower,
          });
          newCount++;
        }

        setReceivers((prev) => [...prev, ...toAdd]);
        if (newCount > 0) {
          toast.success(
            `Imported ${newCount} receiver${newCount === 1 ? "" : "s"} from Excel${dupCount > 0 ? ` (${dupCount} duplicate${dupCount === 1 ? "" : "s"} skipped)` : ""}`
          );
        } else {
          toast.info(`All ${dupCount} receivers in the file were already in the list.`);
        }
      } catch (err) {
        console.error("Error parsing excel file:", err);
        toast.error("Failed to parse file. Please use .xlsx, .xls, or .csv format.");
      } finally {
        if (formFileInputRef.current) formFileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleSave(): void {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) { toast.error("Please select an event"); return; }
    if (!questions.length) { toast.error("Add at least one question"); return; }
    for (const q of questions) {
      if (!q.text.trim()) { toast.error("Every question needs text"); return; }
      if (q.type === "choice" && q.options.filter((o) => o.trim()).length < 2) { toast.error("Multiple choice questions need at least 2 options"); return; }
    }
    const cleanQuestions = questions.map((q) => ({
      ...q,
      text: q.text.trim().slice(0, 500),
      options: q.options.map((o) => o.trim()).filter(Boolean),
    }));

    const cleanReceivers: SurveyReceiver[] = receivers.map((r) => {
      const fallbackName = r.email.split("@")[0] || "Guest";
      return {
        id: r.id || uid(),
        name: r.name.trim().slice(0, 150) || fallbackName,
        email: r.email.trim().toLowerCase(),
      };
    });

    const survey: Survey = {
      id: editingId ?? uid(),
      event_id: ev.id,
      event_name: ev.title,
      title: title.trim().slice(0, 150) || `${ev.title} Survey`,
      questions: cleanQuestions,
      receivers: cleanReceivers,
      created_at: editingId ? surveys.find((s) => s.id === editingId)?.created_at ?? new Date().toISOString() : new Date().toISOString(),
    };
    const next = editingId ? surveys.map((s) => (s.id === editingId ? survey : s)) : [survey, ...surveys];
    setSurveys(next);
    save(next);
    reset();
    toast.success(editingId ? "Survey updated" : "Survey created");

    // Persist to Supabase if table is configured
    void (async () => {
      try {
        await supabase.from("surveys").upsert({
          id: survey.id,
          event_id: survey.event_id,
          event_name: survey.event_name,
          title: survey.title,
          questions: survey.questions,
          receivers: survey.receivers,
          created_at: survey.created_at,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("Could not upsert survey to Supabase:", e);
      }
    })();
  }

  function edit(s: Survey) {
    setEditingId(s.id);
    setEventId(s.event_id);
    setTitle(s.title);
    setQuestions(s.questions);
    setReceivers(s.receivers || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remove(id: string) {
    if (!confirm("Delete this survey?")) return;
    const next = surveys.filter((s) => s.id !== id);
    setSurveys(next);
    save(next);
    if (editingId === id) reset();
    if (activeSurveyReceivers?.id === id) setActiveSurveyReceivers(null);

    // Delete from Supabase
    void (async () => {
      try {
        await supabase.from("surveys").delete().eq("id", id);
      } catch (e) {
        console.warn("Could not delete survey from Supabase:", e);
      }
    })();
  }

  // Active survey receivers modal handlers
  function updateSurveyReceiversDirectly(surveyId: string, updatedReceivers: SurveyReceiver[]) {
    const next = surveys.map((s) => (s.id === surveyId ? { ...s, receivers: updatedReceivers } : s));
    setSurveys(next);
    save(next);
    if (activeSurveyReceivers && activeSurveyReceivers.id === surveyId) {
      setActiveSurveyReceivers({ ...activeSurveyReceivers, receivers: updatedReceivers });
    }
    if (activeSendingSurvey && activeSendingSurvey.id === surveyId) {
      setActiveSendingSurvey({ ...activeSendingSurvey, receivers: updatedReceivers });
    }
    if (editingId === surveyId) {
      setReceivers(updatedReceivers);
    }

    // Update receivers in Supabase
    void (async () => {
      try {
        await supabase.from("surveys").update({
          receivers: updatedReceivers,
          updated_at: new Date().toISOString(),
        }).eq("id", surveyId);
      } catch (e) {
        console.warn("Could not update receivers in Supabase:", e);
      }
    })();
  }

  function handleAddReceiverToActiveSurvey() {
    if (!activeSurveyReceivers) return;
    const trimmedEmail = modalReceiverEmail.trim().toLowerCase();
    const trimmedName = modalReceiverName.trim();
    if (!trimmedEmail) {
      toast.error("Please enter a receiver email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    const currentReceivers = activeSurveyReceivers.receivers || [];
    if (currentReceivers.some((r) => r.email.toLowerCase() === trimmedEmail)) {
      toast.error("A receiver with this email is already added");
      return;
    }
    const fallbackName = trimmedEmail.split("@")[0] || "Guest";
    const updated: SurveyReceiver[] = [
      ...currentReceivers,
      {
        id: uid(),
        name: trimmedName || fallbackName,
        email: trimmedEmail,
      },
    ];
    updateSurveyReceiversDirectly(activeSurveyReceivers.id, updated);
    setModalReceiverName("");
    setModalReceiverEmail("");
    toast.success("Receiver added to survey");
  }

  function handleImportExcelToActiveSurvey(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activeSurveyReceivers) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const parsed = parseSpreadsheet(buffer);
        if (!parsed.length) {
          toast.error("No valid receivers found. Ensure file contains Name and Email columns.");
          return;
        }

        const currentReceivers = activeSurveyReceivers.receivers || [];
        const existingEmails = new Set(currentReceivers.map((r) => r.email.toLowerCase()));
        let newCount = 0;
        let dupCount = 0;

        const toAdd: SurveyReceiver[] = [];
        for (const item of parsed) {
          const lower = item.email.toLowerCase();
          if (existingEmails.has(lower)) {
            dupCount++;
            continue;
          }
          existingEmails.add(lower);
          toAdd.push({
            id: uid(),
            name: item.name,
            email: lower,
          });
          newCount++;
        }

        const updated = [...currentReceivers, ...toAdd];
        updateSurveyReceiversDirectly(activeSurveyReceivers.id, updated);

        if (newCount > 0) {
          toast.success(
            `Imported ${newCount} receiver${newCount === 1 ? "" : "s"} to survey${dupCount > 0 ? ` (${dupCount} duplicate${dupCount === 1 ? "" : "s"} skipped)` : ""}`
          );
        } else {
          toast.info(`All ${dupCount} receivers in the file were already in the survey.`);
        }
      } catch (err) {
        console.error("Error parsing excel file:", err);
        toast.error("Failed to parse file. Please use .xlsx, .xls, or .csv format.");
      } finally {
        if (modalFileInputRef.current) modalFileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleRemoveReceiverFromActiveSurvey(receiverId: string) {
    if (!activeSurveyReceivers) return;
    const updated = (activeSurveyReceivers.receivers || []).filter((r) => r.id !== receiverId);
  }

  // --- Export to Excel Handlers ---
  function handleExportSurveys() {
    if (surveys.length === 0) {
      toast.error("No surveys available to export.");
      return;
    }
    const rows = surveys.map((s, idx) => ({
      "#": idx + 1,
      "Event Name": s.event_name,
      "Event ID": s.event_id,
      "Survey Title": s.title,
      "Total Questions": s.questions?.length || 0,
      "Multiple Choice Qs": s.questions?.filter((q) => q.type === "choice").length || 0,
      "Yes/No Qs": s.questions?.filter((q) => q.type === "yesno").length || 0,
      "Open Answer Qs": s.questions?.filter((q) => q.type === "open").length || 0,
      "Total Receivers": s.receivers?.length || 0,
      "Responses Received": responsesMap[s.id] || 0,
      "Created At": s.created_at ? new Date(s.created_at).toLocaleString() : "",
    }));
    exportToExcel(rows, "INT_Surveys_List", "Surveys");
  }

  function handleExportSurveyResponses() {
    if (!activeSurveyResponses || surveyResponsesList.length === 0) {
      toast.error("No responses available to export.");
      return;
    }
    const rows = surveyResponsesList.map((resp, idx) => {
      const row: Record<string, any> = {
        "#": idx + 1,
        "Respondent Name": resp.respondent_name || "Guest",
        "Respondent Email": resp.respondent_email || "",
        "Event": activeSurveyResponses.event_name,
        "Survey": activeSurveyResponses.title,
        "Submitted At": resp.submitted_at ? new Date(resp.submitted_at).toLocaleString() : "",
      };
      if (Array.isArray(resp.answers)) {
        resp.answers.forEach((ans: any, aIdx: number) => {
          row[`Q${aIdx + 1}: ${ans.question_text || "Question"}`] = ans.answer || "";
        });
      }
      return row;
    });
    const cleanTitle = (activeSurveyResponses.title || "Survey").replace(/[^a-zA-Z0-9]+/g, "_");
    exportToExcel(rows, `INT_Responses_${cleanTitle}`, "Responses");
  }

  function handleExportReceivers() {
    if (!activeSurveyReceivers || !activeSurveyReceivers.receivers?.length) {
      toast.error("No receivers in this survey to export.");
      return;
    }
    const rows = activeSurveyReceivers.receivers.map((r, idx) => ({
      "#": idx + 1,
      "Recipient Name": r.name,
      "Email Address": r.email,
      "Dispatch Status": r.status || "pending",
      "Sent At": r.sent_at ? new Date(r.sent_at).toLocaleString() : "",
      "Survey Title": activeSurveyReceivers.title,
      "Event Name": activeSurveyReceivers.event_name,
    }));
    const cleanTitle = (activeSurveyReceivers.title || "Survey").replace(/[^a-zA-Z0-9]+/g, "_");
    exportToExcel(rows, `INT_Receivers_${cleanTitle}`, "Receivers");
  }

  // --- Thank You Email Sending Handlers ---
  function handleOpenSendModal(survey: Survey) {
    if (!survey.receivers || survey.receivers.length === 0) {
      toast.error("This survey has no receivers yet. Add receivers before sending emails.");
      setActiveSurveyReceivers(survey);
      return;
    }
    setActiveSendingSurvey(survey);
    setSendModalSearch("");
  }

  async function handleSendSingleThankYou(survey: Survey, receiver: SurveyReceiver) {
    if (isBulkSending) {
      toast.warning("Please wait for bulk sending to complete or stop it first.");
      return;
    }
    setSingleSendingId(receiver.id);

    // Mark as sending
    const updatedReceivers = (survey.receivers || []).map((r) =>
      r.id === receiver.id ? { ...r, status: "sending" as const } : r
    );
    updateSurveyReceiversDirectly(survey.id, updatedReceivers);

    try {
      const res = await sendThankYouEmail({
        recipient_name: receiver.name,
        recipient_email: receiver.email,
        event_title: survey.event_name,
      });

      if (res.success) {
        toast.success(`Thank You email sent to ${receiver.name} (${receiver.email})`);
        const finalReceivers = (survey.receivers || []).map((r) =>
          r.id === receiver.id
            ? { ...r, status: "sent" as const, sent_at: new Date().toISOString(), error: null }
            : r
        );
        updateSurveyReceiversDirectly(survey.id, finalReceivers);
      } else {
        toast.error(`Failed to send to ${receiver.email}: ${res.error || "Unknown error"}`);
        const finalReceivers = (survey.receivers || []).map((r) =>
          r.id === receiver.id
            ? { ...r, status: "failed" as const, error: res.error || "Failed to send" }
            : r
        );
        updateSurveyReceiversDirectly(survey.id, finalReceivers);
      }
    } catch (err: any) {
      console.error("Error sending thank you email:", err);
      toast.error(`Error sending to ${receiver.email}: ${err?.message || "Unknown error"}`);
      const finalReceivers = (survey.receivers || []).map((r) =>
        r.id === receiver.id
          ? { ...r, status: "failed" as const, error: err?.message || "Send error" }
          : r
      );
      updateSurveyReceiversDirectly(survey.id, finalReceivers);
    } finally {
      setSingleSendingId(null);
    }
  }

  async function handleBulkSendThankYou(survey: Survey, mode: "all" | "pending" = "pending") {
    const currentReceivers = survey.receivers || [];
    const targetReceivers = mode === "all"
      ? currentReceivers
      : currentReceivers.filter((r) => r.status !== "sent");

    if (targetReceivers.length === 0) {
      toast.info("All receivers have already been sent emails! Click 'Send to All' if you wish to re-send.");
      return;
    }

    setIsBulkSending(true);
    stopBulkSendingRef.current = false;

    let successCount = 0;
    let failCount = 0;
    let workingReceivers = [...currentReceivers];

    toast.info(`Starting bulk dispatch of Thank You emails to ${targetReceivers.length} recipient${targetReceivers.length === 1 ? "" : "s"}...`);

    for (let i = 0; i < targetReceivers.length; i++) {
      if (stopBulkSendingRef.current) {
        toast.warning(`Bulk sending cancelled after ${i} emails (${successCount} sent, ${failCount} failed).`);
        break;
      }

      const target = targetReceivers[i];
      if (!target) continue;

      // Mark sending in state and UI
      workingReceivers = workingReceivers.map((r) =>
        r.id === target.id ? { ...r, status: "sending" as const } : r
      );
      updateSurveyReceiversDirectly(survey.id, workingReceivers);

      try {
        const res = await sendThankYouEmail({
          recipient_name: target.name,
          recipient_email: target.email,
          event_title: survey.event_name,
        });

        if (res.success) {
          successCount++;
          workingReceivers = workingReceivers.map((r) =>
            r.id === target.id
              ? { ...r, status: "sent" as const, sent_at: new Date().toISOString(), error: null }
              : r
          );
        } else {
          failCount++;
          workingReceivers = workingReceivers.map((r) =>
            r.id === target.id
              ? { ...r, status: "failed" as const, error: res.error || "Failed to send" }
              : r
          );
        }
      } catch (err: any) {
        failCount++;
        workingReceivers = workingReceivers.map((r) =>
          r.id === target.id
            ? { ...r, status: "failed" as const, error: err?.message || "Send error" }
            : r
        );
      }

      updateSurveyReceiversDirectly(survey.id, workingReceivers);

      // Polite pause between dispatches (600ms) to avoid server/rate limits
      if (i < targetReceivers.length - 1 && !stopBulkSendingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    setIsBulkSending(false);

    if (!stopBulkSendingRef.current) {
      if (failCount === 0) {
        toast.success(`Completed! Successfully sent ${successCount} Thank You email${successCount === 1 ? "" : "s"}.`);
      } else {
        toast.warning(`Bulk dispatch finished: ${successCount} sent, ${failCount} failed.`);
      }
    }
  }

  function handleStopBulkSending() {
    stopBulkSendingRef.current = true;
    toast.info("Stopping bulk send queue...");
  }

  function handleResetReceiverStatuses(surveyId: string) {
    if (!confirm("Reset sending statuses for all receivers back to pending?")) return;
    const survey = surveys.find((s) => s.id === surveyId);
    if (!survey) return;
    const resetReceivers: SurveyReceiver[] = (survey.receivers || []).map((r) => ({
      ...r,
      status: "pending",
      sent_at: null,
      error: null,
    }));
    updateSurveyReceiversDirectly(surveyId, resetReceivers);
    toast.success("Statuses reset to pending.");
  }

  // Filtered views for receivers lists
  const filteredFormReceivers = receivers.filter((r) => {
    if (!formReceiverSearch.trim()) return true;
    const query = formReceiverSearch.toLowerCase();
    return r.name.toLowerCase().includes(query) || r.email.toLowerCase().includes(query);
  });

  const filteredModalReceivers = (activeSurveyReceivers?.receivers || []).filter((r) => {
    if (!modalSearch.trim()) return true;
    const query = modalSearch.toLowerCase();
    return r.name.toLowerCase().includes(query) || r.email.toLowerCase().includes(query);
  });

  const filteredSendModalReceivers = (activeSendingSurvey?.receivers || []).filter((r) => {
    if (!sendModalSearch.trim()) return true;
    const query = sendModalSearch.toLowerCase();
    return r.name.toLowerCase().includes(query) || r.email.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Survey</h1>
            <p className="text-xs text-muted-foreground">
              Build surveys for each event, specify questions, and manage recipients (Name, Email) with Excel import.
            </p>
          </div>
        </div>

        <Link to="/admin/feedback">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs border-primary/20 text-primary hover:bg-primary/10"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Open Feedback Dashboard</span>
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium">
            Event name
            <select className={inputCls} value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">Select an event…</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium">
            Survey title (optional)
            <input
              className={inputCls}
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Post-event feedback"
            />
          </label>
        </div>

        {/* Receivers Management Section */}
        <div className="rounded-xl border border-border bg-background/50 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Survey Receivers</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {receivers.length} recipient{receivers.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add recipients (Name, Email) individually or import them directly from an Excel sheet (.xlsx, .csv).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={downloadReceiversTemplate}
              >
                <Download className="h-3.5 w-3.5" />
                Download Template
              </Button>

              <input
                ref={formFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportExcelToForm}
              />
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => formFileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                Import from Excel
              </Button>
            </div>
          </div>

          {/* Add Receiver Inputs */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Add Receiver Manually
            </span>
            <div className="grid gap-2 sm:grid-cols-5">
              <div className="sm:col-span-2 relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  className={`${inputCls} pl-8`}
                  placeholder="Receiver Name (e.g. Hafez Rahim)"
                  value={formReceiverName}
                  onChange={(e) => setFormReceiverName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddReceiverToForm()}
                />
              </div>
              <div className="sm:col-span-2 relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  className={`${inputCls} pl-8`}
                  placeholder="Receiver Email (e.g. hafez@example.com)"
                  value={formReceiverEmail}
                  onChange={(e) => setFormReceiverEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddReceiverToForm()}
                />
              </div>
              <div className="sm:col-span-1 flex items-center">
                <Button
                  type="button"
                  size="sm"
                  className="w-full h-9 text-xs gap-1"
                  onClick={handleAddReceiverToForm}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </div>

          {/* Receivers Table Preview */}
          {receivers.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    className={`${inputCls} pl-8 py-1.5 text-xs`}
                    placeholder="Search by name or email…"
                    value={formReceiverSearch}
                    onChange={(e) => setFormReceiverSearch(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-8"
                  onClick={() => {
                    if (confirm("Remove all receivers from this survey?")) {
                      setReceivers([]);
                    }
                  }}
                >
                  Clear all ({receivers.length})
                </Button>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-border bg-card">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground sticky top-0 border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium w-12">#</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Email</th>
                      <th className="px-3 py-2 text-right font-medium w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredFormReceivers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                          No receivers matching &quot;{formReceiverSearch}&quot;
                        </td>
                      </tr>
                    ) : (
                      filteredFormReceivers.map((r, i) => (
                        <tr key={r.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{r.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => setReceivers((prev) => prev.filter((x) => x.id !== r.id))}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Remove receiver"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <FileSpreadsheet className="mx-auto h-7 w-7 text-muted-foreground/60 mb-1.5" />
              <p className="text-xs font-medium text-foreground">No receivers added yet</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Upload an Excel sheet (.xlsx) with Name & Email columns or add receivers manually above.
              </p>
            </div>
          )}
        </div>

        {/* Survey Questions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Questions ({questions.length})</span>
          </div>

          {questions.map((q, i) => (
            <div key={q.id} className="rounded-lg border border-border bg-background p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Q{i + 1} · {TYPE_LABEL[q.type]}
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none ml-2">
                    <input
                      type="checkbox"
                      checked={q.required !== false}
                      onChange={(e) => updateQ(q.id, { required: e.target.checked })}
                      className="rounded border-border h-3.5 w-3.5 text-primary focus:ring-primary/20"
                    />
                    <span className={q.required !== false ? "font-semibold text-foreground" : ""}>Required</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                    value={q.type}
                    onChange={(e) => {
                      const t = e.target.value as QType;
                      updateQ(q.id, {
                        type: t,
                        options: t === "choice" ? (q.options.length ? q.options : ["", ""]) : [],
                      });
                    }}
                  >
                    <option value="choice">Multiple choice</option>
                    <option value="yesno">Yes / No</option>
                    <option value="open">Open answer</option>
                  </select>
                  <button
                    onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <input
                className={inputCls}
                maxLength={500}
                value={q.text}
                onChange={(e) => updateQ(q.id, { text: e.target.value })}
                placeholder="Question text"
              />
              {q.type === "choice" && (
                <div className="space-y-2 pl-2">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-muted-foreground" />
                      <input
                        className={inputCls}
                        maxLength={200}
                        value={o}
                        placeholder={`Option ${oi + 1}`}
                        onChange={(e) =>
                          updateQ(q.id, {
                            options: q.options.map((x, xi) => (xi === oi ? e.target.value : x)),
                          })
                        }
                      />
                      {q.options.length > 2 && (
                        <button
                          onClick={() => updateQ(q.id, { options: q.options.filter((_, xi) => xi !== oi) })}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => updateQ(q.id, { options: [...q.options, ""] })}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    + Add option
                  </button>
                </div>
              )}
              {q.type === "yesno" && (
                <div className="flex gap-4 pl-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border border-muted-foreground" />
                    Yes
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border border-muted-foreground" />
                    No
                  </span>
                </div>
              )}
              {q.type === "open" && (
                <div className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                  Participant writes a free-text answer
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => addQuestion("choice")}>
            <Plus className="h-4 w-4" /> Multiple choice
          </Button>
          <Button variant="outline" size="sm" onClick={() => addQuestion("yesno")}>
            <Plus className="h-4 w-4" /> Yes / No
          </Button>
          <Button variant="outline" size="sm" onClick={() => addQuestion("open")}>
            <Plus className="h-4 w-4" /> Open answer
          </Button>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          {editingId && (
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave}>{editingId ? "Update survey" : "Save survey"}</Button>
        </div>
      </div>

      {/* Surveys List Table */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <div>
            <h3 className="font-semibold text-sm">Configured Surveys</h3>
            <p className="text-xs text-muted-foreground">Manage your event surveys, receivers, and responses</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleExportSurveys}
            disabled={surveys.length === 0}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Export Excel
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Survey</th>
              <th className="px-4 py-3">Questions</th>
              <th className="px-4 py-3">Receivers (Name, Email)</th>
              <th className="px-4 py-3">Feedback Responses</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {surveys.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No surveys yet.
                </td>
              </tr>
            )}
            {surveys.map((s) => {
              const recCount = s.receivers?.length || 0;
              return (
                <tr key={s.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.event_name}</td>
                  <td className="px-4 py-3">{s.title}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {s.questions.length} total · {s.questions.filter((q) => q.type === "choice").length} choice ·{" "}
                    {s.questions.filter((q) => q.type === "yesno").length} yes/no ·{" "}
                    {s.questions.filter((q) => q.type === "open").length} open
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setActiveSurveyReceivers(s)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${recCount > 0
                          ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                          : "bg-muted/50 text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                        }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>{recCount} receiver{recCount === 1 ? "" : "s"}</span>
                      {recCount === 0 && <span className="text-[10px] text-primary font-semibold ml-1">+ Add</span>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleOpenResponses(s)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${(responsesMap[s.id] || 0) > 0
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                          : "bg-muted/50 text-muted-foreground border border-border hover:bg-muted"
                        }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{responsesMap[s.id] || 0} response{(responsesMap[s.id] || 0) === 1 ? "" : "s"}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to="/event/$eventId/$surveyId"
                        params={{ eventId: s.event_id, surveyId: s.id }}
                        target="_blank"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Open individual survey page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/event/${s.event_id}/${s.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Survey public link copied to clipboard!");
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Copy survey public link"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenSendModal(s)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-2xs border border-primary/20 hover:border-primary"
                        title="Bulk send Thank You emails to survey receivers"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Send</span>
                      </button>
                      <button
                        onClick={() => edit(s)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Edit survey"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(s.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Delete survey"
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

      {/* Dialog for Managing Receivers of a specific survey directly from the table */}
      <Dialog
        open={Boolean(activeSurveyReceivers)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveSurveyReceivers(null);
            setModalReceiverName("");
            setModalReceiverEmail("");
            setModalSearch("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Receivers for &quot;{activeSurveyReceivers?.title}&quot;</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Event: <span className="font-semibold text-foreground">{activeSurveyReceivers?.event_name}</span> ·{" "}
              {activeSurveyReceivers?.receivers?.length || 0} total recipients
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">Import, download template, or dispatch emails:</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    if (!activeSurveyReceivers?.receivers?.length) {
                      toast.error("Add at least one receiver first.");
                      return;
                    }
                    const s = activeSurveyReceivers;
                    setActiveSurveyReceivers(null);
                    handleOpenSendModal(s);
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                  Bulk Send Emails
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={downloadReceiversTemplate}
                >
                  <Download className="h-3.5 w-3.5" />
                  Template (.xlsx)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleExportReceivers}
                  disabled={!activeSurveyReceivers?.receivers?.length}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Export (.xlsx)
                </Button>
                <input
                  ref={modalFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleImportExcelToActiveSurvey}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => modalFileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import Excel
                </Button>
              </div>
            </div>

            {/* Manual Add inside Dialog */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Add Receiver
              </span>
              <div className="grid gap-2 sm:grid-cols-5">
                <div className="sm:col-span-2 relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    className={`${inputCls} pl-8 text-xs`}
                    placeholder="Name (e.g. Hafez Rahim)"
                    value={modalReceiverName}
                    onChange={(e) => setModalReceiverName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddReceiverToActiveSurvey()}
                  />
                </div>
                <div className="sm:col-span-2 relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    className={`${inputCls} pl-8 text-xs`}
                    placeholder="Email (e.g. hafez@example.com)"
                    value={modalReceiverEmail}
                    onChange={(e) => setModalReceiverEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddReceiverToActiveSurvey()}
                  />
                </div>
                <div className="sm:col-span-1">
                  <Button
                    type="button"
                    size="sm"
                    className="w-full h-9 text-xs"
                    onClick={handleAddReceiverToActiveSurvey}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Receivers Table inside Dialog */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    className={`${inputCls} pl-8 py-1 text-xs`}
                    placeholder="Search name or email…"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                </div>
                {activeSurveyReceivers?.receivers && activeSurveyReceivers.receivers.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-8"
                    onClick={() => {
                      if (confirm("Remove all receivers from this survey?")) {
                        updateSurveyReceiversDirectly(activeSurveyReceivers.id, []);
                      }
                    }}
                  >
                    Clear all ({activeSurveyReceivers.receivers.length})
                  </Button>
                )}
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-muted-foreground sticky top-0 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium w-10">#</th>
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        <th className="px-3 py-2 text-left font-medium">Email</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-right font-medium w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredModalReceivers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                            {activeSurveyReceivers?.receivers?.length
                              ? `No receivers matching "${modalSearch}"`
                              : "No receivers assigned to this survey yet."}
                          </td>
                        </tr>
                      ) : (
                        filteredModalReceivers.map((r, i) => (
                          <tr key={r.id} className="hover:bg-muted/30">
                            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-2 font-medium">{r.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                            <td className="px-3 py-2">
                              {r.status === "sent" ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full"
                                  title={r.sent_at ? `Sent on ${new Date(r.sent_at).toLocaleString()}` : "Sent"}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Sent
                                </span>
                              ) : r.status === "sending" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Sending
                                </span>
                              ) : r.status === "failed" ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full"
                                  title={r.error || "Failed to send"}
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  Failed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  disabled={isBulkSending || singleSendingId === r.id}
                                  onClick={() => activeSurveyReceivers && handleSendSingleThankYou(activeSurveyReceivers, r)}
                                  className="rounded p-1 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                                  title="Send Thank You email"
                                >
                                  {singleSendingId === r.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Send className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveReceiverFromActiveSurvey(r.id)}
                                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  title="Remove receiver"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for Viewing Feedback Responses */}
      <Dialog
        open={Boolean(activeSurveyResponses)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveSurveyResponses(null);
            setSurveyResponsesList([]);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
                <span>Feedback Responses — &quot;{activeSurveyResponses?.title}&quot;</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Event: <span className="font-semibold text-foreground">{activeSurveyResponses?.event_name}</span> ·{" "}
                {surveyResponsesList.length} feedback submission{surveyResponsesList.length === 1 ? "" : "s"}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 shrink-0"
              onClick={handleExportSurveyResponses}
              disabled={surveyResponsesList.length === 0}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Export Excel
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {loadingResponses ? (
              <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                Loading responses…
              </div>
            ) : surveyResponsesList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm font-semibold text-foreground">No feedback responses received yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When attendees visit the event page and submit the Feedback tab, their answers will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {surveyResponsesList.map((resp, idx) => (
                  <div key={resp.id || idx} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {resp.respondent_name ? resp.respondent_name.slice(0, 2).toUpperCase() : "G"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{resp.respondent_name || "Anonymous Guest"}</p>
                          <p className="text-[11px] text-muted-foreground">{resp.respondent_email}</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {resp.submitted_at ? new Date(resp.submitted_at).toLocaleString() : "Recently"}
                      </span>
                    </div>

                    {/* Answers list */}
                    <div className="space-y-2.5 pt-1">
                      {Array.isArray(resp.answers) && resp.answers.map((ans: any, aIdx: number) => (
                        <div key={aIdx} className="rounded-lg bg-muted/40 p-2.5 space-y-1 text-xs">
                          <p className="font-semibold text-foreground/90">
                            Q{aIdx + 1}: {ans.question_text}
                          </p>
                          <p className="text-primary font-medium pl-1">
                            ↳ {ans.answer || <span className="text-muted-foreground italic">No answer provided</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for Bulk Sending Thank You Emails */}
      <Dialog
        open={Boolean(activeSendingSurvey)}
        onOpenChange={(open) => {
          if (!open) {
            if (isBulkSending) {
              toast.warning("Bulk email dispatch is in progress. Please stop it before closing.");
              return;
            }
            setActiveSendingSurvey(null);
            setSendModalSearch("");
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Send className="h-4 w-4" />
              </div>
              <span>Bulk Send Thank You Emails</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Event: <span className="font-semibold text-foreground">{activeSendingSurvey?.event_name}</span> ·{" "}
              Survey: <span className="font-semibold text-foreground">{activeSendingSurvey?.title}</span>
            </DialogDescription>
          </DialogHeader>

          {activeSendingSurvey && (() => {
            const surveyReceivers = activeSendingSurvey.receivers || [];
            const total = surveyReceivers.length;
            const sentCount = surveyReceivers.filter((r) => r.status === "sent").length;
            const failedCount = surveyReceivers.filter((r) => r.status === "failed").length;
            const sendingCount = surveyReceivers.filter((r) => r.status === "sending").length;
            const pendingCount = total - sentCount - failedCount - sendingCount;
            const progressPct = total > 0 ? Math.round((sentCount / total) * 100) : 0;

            return (
              <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
                {/* Notice banner */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-primary">
                    <span>✦ Using Template: Thank You Template (<code>thankyou</code>)</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Personalized thank you emails will be dispatched directly to each attendee using the configured Thank You email template and your active SMTP server.
                  </p>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg border border-border bg-card p-2.5">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-foreground">{total}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                    <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Sent</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{sentCount}</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                    <p className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">Pending</p>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{pendingCount + sendingCount}</p>
                  </div>
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
                    <p className="text-[10px] uppercase font-semibold text-destructive">Failed</p>
                    <p className="text-lg font-bold text-destructive">{failedCount}</p>
                  </div>
                </div>

                {/* Progress bar */}
                {(isBulkSending || sentCount > 0) && (
                  <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span>Dispatch Progress</span>
                      <span>{sentCount} of {total} sent ({progressPct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions & Filter toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      className={`${inputCls} pl-8 py-1 text-xs`}
                      placeholder="Search recipient name or email…"
                      value={sendModalSearch}
                      onChange={(e) => setSendModalSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isBulkSending ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={handleStopBulkSending}
                      >
                        <StopCircle className="h-3.5 w-3.5" />
                        Stop Sending
                      </Button>
                    ) : (
                      <>
                        {(sentCount > 0 || failedCount > 0) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => handleResetReceiverStatuses(activeSendingSurvey.id)}
                            title="Reset all statuses to pending"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset Statuses
                          </Button>
                        )}
                        {pendingCount > 0 && pendingCount < total && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => handleBulkSendThankYou(activeSendingSurvey, "pending")}
                          >
                            <Send className="h-3.5 w-3.5" />
                            Send to Pending ({pendingCount})
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90"
                          onClick={() => handleBulkSendThankYou(activeSendingSurvey, "all")}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Send to All ({total})
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Receivers list */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 text-muted-foreground sticky top-0 border-b border-border">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium w-10">#</th>
                          <th className="px-3 py-2 text-left font-medium">Recipient</th>
                          <th className="px-3 py-2 text-left font-medium">Email</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                          <th className="px-3 py-2 text-right font-medium w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredSendModalReceivers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                              {surveyReceivers.length === 0
                                ? "No receivers added to this survey."
                                : `No receivers match "${sendModalSearch}"`}
                            </td>
                          </tr>
                        ) : (
                          filteredSendModalReceivers.map((r, i) => (
                            <tr key={r.id} className="hover:bg-muted/30">
                              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-2 font-medium">{r.name}</td>
                              <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                              <td className="px-3 py-2">
                                {r.status === "sent" ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full"
                                    title={r.sent_at ? `Sent on ${new Date(r.sent_at).toLocaleString()}` : "Sent successfully"}
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Sent
                                    {r.sent_at && (
                                      <span className="text-[10px] opacity-75">
                                        · {new Date(r.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </span>
                                ) : r.status === "sending" ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Sending…
                                  </span>
                                ) : r.status === "failed" ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full"
                                    title={r.error || "Failed to send"}
                                  >
                                    <AlertCircle className="h-3 w-3" />
                                    Failed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    <Clock className="h-3 w-3" />
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={isBulkSending || singleSendingId === r.id}
                                  onClick={() => handleSendSingleThankYou(activeSendingSurvey, r)}
                                  className="h-7 text-xs px-2 gap-1 text-primary hover:bg-primary/10 disabled:opacity-50"
                                  title={r.status === "sent" ? "Resend Thank You email" : "Send Thank You email"}
                                >
                                  {singleSendingId === r.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Send className="h-3 w-3" />
                                  )}
                                  <span>{r.status === "sent" ? "Resend" : "Send"}</span>
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
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
