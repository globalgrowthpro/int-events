import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { getEvents } from "@/lib/api";
import type { IntEvent } from "@/lib/int-data";
import { Button } from "@/components/ui/button";

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
type Question = { id: string; text: string; type: QType; options: string[] };
type Survey = { id: string; event_id: string; event_name: string; title: string; questions: Question[]; created_at: string };

const KEY = "int_surveys";
const load = (): Survey[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};
const save = (s: Survey[]) => localStorage.setItem(KEY, JSON.stringify(s));
const uid = () => Math.random().toString(36).slice(2, 10);
const TYPE_LABEL: Record<QType, string> = { choice: "Multiple choice", yesno: "Yes / No", open: "Open answer" };

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

function AdminSurveyPage() {
  const [events, setEvents] = useState<IntEvent[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    setSurveys(load());
    getEvents().then(setEvents).catch(() => setEvents([]));
  }, []);

  function reset() {
    setEditingId(null); setEventId(""); setTitle(""); setQuestions([]);
  }

  function addQuestion(type: QType) {
    setQuestions((q) => [...q, { id: uid(), text: "", type, options: type === "choice" ? ["", ""] : [] }]);
  }
  const updateQ = (id: string, patch: Partial<Question>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  function handleSave(): void {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return toast.error("Please select an event");
    if (!questions.length) return toast.error("Add at least one question");
    for (const q of questions) {
      if (!q.text.trim()) return toast.error("Every question needs text");
      if (q.type === "choice" && q.options.filter((o) => o.trim()).length < 2)
        return toast.error("Multiple choice questions need at least 2 options");
    }
    const clean = questions.map((q) => ({ ...q, text: q.text.trim().slice(0, 500), options: q.options.map((o) => o.trim()).filter(Boolean) }));
    const survey: Survey = {
      id: editingId ?? uid(), event_id: ev.id, event_name: ev.title,
      title: title.trim().slice(0, 150) || `${ev.title} Survey`, questions: clean,
      created_at: editingId ? surveys.find((s) => s.id === editingId)?.created_at ?? new Date().toISOString() : new Date().toISOString(),
    };
    const next = editingId ? surveys.map((s) => (s.id === editingId ? survey : s)) : [survey, ...surveys];
    setSurveys(next); save(next); reset();
    toast.success(editingId ? "Survey updated" : "Survey created");
  }

  function edit(s: Survey) {
    setEditingId(s.id); setEventId(s.event_id); setTitle(s.title); setQuestions(s.questions);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function remove(id: string) {
    if (!confirm("Delete this survey?")) return;
    const next = surveys.filter((s) => s.id !== id);
    setSurveys(next); save(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-semibold">Survey</h1>
          <p className="text-xs text-muted-foreground">Build surveys for each event with multiple choice, yes/no and open questions.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium">
            Event name
            <select className={inputCls} value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">Select an event…</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium">
            Survey title (optional)
            <input className={inputCls} maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Post-event feedback" />
          </label>
        </div>

        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-lg border border-border bg-background p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Q{i + 1} · {TYPE_LABEL[q.type]}</span>
                <div className="flex items-center gap-2">
                  <select className="rounded-md border border-border bg-card px-2 py-1 text-xs" value={q.type}
                    onChange={(e) => { const t = e.target.value as QType; updateQ(q.id, { type: t, options: t === "choice" ? (q.options.length ? q.options : ["", ""]) : [] }); }}>
                    <option value="choice">Multiple choice</option>
                    <option value="yesno">Yes / No</option>
                    <option value="open">Open answer</option>
                  </select>
                  <button onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <input className={inputCls} maxLength={500} value={q.text} onChange={(e) => updateQ(q.id, { text: e.target.value })} placeholder="Question text" />
              {q.type === "choice" && (
                <div className="space-y-2 pl-2">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-muted-foreground" />
                      <input className={inputCls} maxLength={200} value={o} placeholder={`Option ${oi + 1}`}
                        onChange={(e) => updateQ(q.id, { options: q.options.map((x, xi) => (xi === oi ? e.target.value : x)) })} />
                      {q.options.length > 2 && (
                        <button onClick={() => updateQ(q.id, { options: q.options.filter((_, xi) => xi !== oi) })} className="p-1 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => updateQ(q.id, { options: [...q.options, ""] })} className="text-xs font-medium text-primary hover:underline">+ Add option</button>
                </div>
              )}
              {q.type === "yesno" && (
                <div className="flex gap-4 pl-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-muted-foreground" />Yes</span>
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-muted-foreground" />No</span>
                </div>
              )}
              {q.type === "open" && <div className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">Participant writes a free-text answer</div>}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => addQuestion("choice")}><Plus className="h-4 w-4" /> Multiple choice</Button>
          <Button variant="outline" size="sm" onClick={() => addQuestion("yesno")}><Plus className="h-4 w-4" /> Yes / No</Button>
          <Button variant="outline" size="sm" onClick={() => addQuestion("open")}><Plus className="h-4 w-4" /> Open answer</Button>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          {editingId && <Button variant="ghost" onClick={reset}>Cancel</Button>}
          <Button onClick={handleSave}>{editingId ? "Update survey" : "Save survey"}</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Survey</th><th className="px-4 py-3">Questions</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {surveys.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">No surveys yet.</td></tr>}
            {surveys.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{s.event_name}</td>
                <td className="px-4 py-3">{s.title}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {s.questions.length} total · {s.questions.filter((q) => q.type === "choice").length} choice · {s.questions.filter((q) => q.type === "yesno").length} yes/no · {s.questions.filter((q) => q.type === "open").length} open
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => edit(s)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(s.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
