import { useState } from "react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  User,
  Mail,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  type EventSurvey,
  type EventSurveyQuestion,
  submitSurveyResponse,
} from "@/lib/api";
import { type IntEvent } from "@/lib/int-data";
import { Button } from "@/components/ui/button";

interface EventFeedbackSurveyProps {
  event: IntEvent;
  survey: EventSurvey;
  initialName?: string | undefined;
  initialEmail?: string | undefined;
  isStandalonePage?: boolean | undefined;
}

export function EventFeedbackSurvey({
  event,
  survey,
  initialName = "",
  initialEmail = "",
  isStandalonePage = false,
}: EventFeedbackSurveyProps) {
  const { user } = useAuth();

  // Respondent info: pre-fill if logged in or passed from URL query
  const defaultName = initialName || user?.name || "";
  const defaultEmail = initialEmail || user?.email || "";

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const questions: EventSurveyQuestion[] = survey.questions || [];

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const answeredCount = questions.filter(
    (q) => Boolean(answers[q.id]?.trim())
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      toast.error("Please enter your name");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Check if at least one question is answered
    if (answeredCount === 0) {
      toast.error("Please answer at least one survey question");
      return;
    }

    setSubmitting(true);
    try {
      const formattedAnswers = questions.map((q) => ({
        question_id: q.id,
        question_text: q.text,
        answer: (answers[q.id] || "").trim(),
      }));

      await submitSurveyResponse({
        survey_id: survey.id,
        event_id: event.id,
        respondent_name: trimmedName,
        respondent_email: trimmedEmail,
        answers: formattedAnswers,
      });

      setSubmitted(true);
      toast.success("Thank you! Your feedback has been submitted.");
    } catch (err) {
      console.error("Survey submission error:", err);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 sm:p-12 text-center shadow-card space-y-5 animate-in fade-in-50 duration-300">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">
            Thank you for your feedback!
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your valuable insights for <span className="font-semibold text-foreground">{event.title}</span> have been recorded. Your input directly helps us create even better events.
          </p>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSubmitted(false);
              setAnswers({});
            }}
            className="gap-2 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Submit another response
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      {/* Header Banner */}
      <div className="border-b border-border bg-gradient-to-r from-primary/10 via-background to-background p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Event Feedback
              </span>
              <span className="text-xs text-muted-foreground">
                {questions.length} Question{questions.length === 1 ? "" : "s"}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-foreground">
              {survey.title || "Share Your Feedback"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              We value your opinion on {event.title}. Please provide your name, email, and responses below.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>{answeredCount} of {questions.length} answered</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
        {/* Step 1: Respondent Contact Information */}
        <div className="space-y-4 rounded-xl border border-border bg-background/50 p-5">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </div>
            <h3 className="text-sm font-bold text-foreground">Your Information</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> Full Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g. Hafez Rahim"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" /> Email Address <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                required
                maxLength={120}
                placeholder="e.g. name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Survey Questions */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                2
              </div>
              <h3 className="text-sm font-bold text-foreground">Survey Questions</h3>
            </div>
            <span className="text-xs text-muted-foreground sm:hidden">
              {answeredCount}/{questions.length} answered
            </span>
          </div>

          <div className="space-y-5">
            {questions.map((q, index) => {
              const currentAnswer = answers[q.id] || "";
              const isAnswered = Boolean(currentAnswer.trim());

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border transition-all p-5 space-y-3.5 ${
                    isAnswered
                      ? "border-primary/40 bg-card shadow-2xs"
                      : "border-border bg-background/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                          Question {index + 1}
                        </span>
                        {isAnswered && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Answered
                          </span>
                        )}
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-foreground">
                        {q.text}
                      </p>
                    </div>
                  </div>

                  {/* Multiple Choice Question Type */}
                  {q.type === "choice" && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const selected = currentAnswer === opt;
                        return (
                          <button
                            type="button"
                            key={optIdx}
                            onClick={() => handleSelectOption(q.id, opt)}
                            className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left text-xs sm:text-sm font-medium transition-all ${
                              selected
                                ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
                                : "border-border bg-background hover:bg-muted/60 text-foreground"
                            }`}
                          >
                            <span className="truncate">{opt}</span>
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/50"
                              }`}
                            >
                              {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Yes / No Question Type */}
                  {q.type === "yesno" && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSelectOption(q.id, "Yes")}
                        className={`inline-flex items-center gap-2 rounded-xl border px-6 py-2.5 text-sm font-semibold transition-all ${
                          currentAnswer === "Yes"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-sm"
                            : "border-border bg-background hover:bg-muted/60 text-foreground"
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4" /> Yes
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectOption(q.id, "No")}
                        className={`inline-flex items-center gap-2 rounded-xl border px-6 py-2.5 text-sm font-semibold transition-all ${
                          currentAnswer === "No"
                            ? "border-destructive bg-destructive/10 text-destructive shadow-sm"
                            : "border-border bg-background hover:bg-muted/60 text-foreground"
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4" /> No
                      </button>
                    </div>
                  )}

                  {/* Open Answer Question Type */}
                  {q.type === "open" && (
                    <div className="pt-1">
                      <textarea
                        rows={3}
                        maxLength={1000}
                        placeholder="Write your answer or thoughts here…"
                        value={currentAnswer}
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                        className="w-full rounded-xl border border-border bg-background p-3 text-sm leading-relaxed transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <span>Responses will be submitted securely for this event.</span>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto h-11 px-8 text-sm font-bold gap-2"
          >
            {submitting ? (
              <>Submitting…</>
            ) : (
              <>
                <Send className="h-4 w-4" /> Submit Feedback
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
