import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/int/site-shell";
import { getEventById, getEvents, getSurveyById, getSurveyForEvent, type EventSurvey } from "@/lib/api";
import { type IntEvent } from "@/lib/int-data";
import { EventFeedbackSurvey } from "@/components/int/event-feedback-survey";
import { ArrowLeft, Sparkles, Calendar, MapPin, ClipboardCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/event/$eventId/$surveyId")({
  validateSearch: (search: Record<string, unknown>): { name?: string | undefined; email?: string | undefined } => ({
    name: typeof search["name"] === "string" ? search["name"] : undefined,
    email: typeof search["email"] === "string" ? search["email"] : undefined,
  }),
  loader: async ({ params }) => {
    const isDirectSurveyId = Boolean(params.surveyId && params.surveyId !== "survey");

    // Parallelize event and direct survey resolution
    const [realEvent, directSurvey] = await Promise.all([
      getEventById(params.eventId),
      isDirectSurveyId ? getSurveyById(params.surveyId) : Promise.resolve(null),
    ]);

    if (!realEvent) {
      throw notFound();
    }

    let survey = directSurvey;
    if (!survey) {
      survey = await getSurveyForEvent(realEvent.id, realEvent);
    }

    return { event: realEvent, survey };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Survey Not Found — INT Events" }, { name: "robots", content: "noindex" }],
      };
    }
    const { event, survey } = loaderData;
    const sTitle = survey?.title || `${event.title} Feedback Survey`;
    return {
      meta: [
        { title: `${sTitle} — ${event.title} — INT Events` },
        { name: "description", content: `Share your official feedback for ${event.title}.` },
        { property: "og:title", content: `${sTitle} — ${event.title}` },
      ],
    };
  },
  component: StandaloneSurveyPage,
});

function StandaloneSurveyPage() {
  const { event, survey } = Route.useLoaderData();
  const search = Route.useSearch();

  const locationText = [event.venue, event.city].filter(Boolean).join(", ");

  return (
    <SiteShell>
      <div className="w-full space-y-8 py-2">
          
          {/* Top Navigation */}
          <div className="flex items-center justify-between">
            <Link
              to="/event/$eventId"
              params={{ eventId: event.id }}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Event Details</span>
            </Link>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span>Official Feedback Survey</span>
            </div>
          </div>

          {/* Header Card */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-md p-6 sm:p-8 shadow-xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-primary font-medium">
                  <Sparkles className="h-3.5 w-3.5" />
                  {event.title}
                </span>
                {event.date && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {event.date}
                    </span>
                  </>
                )}
                {locationText && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {locationText}
                    </span>
                  </>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {survey?.title || `${event.title} — Feedback & Experience Survey`}
                </h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
                  Thank you for being part of {event.title}. Please take a moment to share your valuable impressions and suggestions to help us elevate our future experiences.
                </p>
              </div>

              {search.email && (
                <div className="flex items-center gap-2 pt-2 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Responding as <strong className="text-foreground">{search.name || search.email}</strong> ({search.email})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Survey Questionnaire Component */}
          {survey && Array.isArray(survey.questions) && survey.questions.length > 0 ? (
            <div className="bg-card/40 border border-border rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-lg">
              <EventFeedbackSurvey
                event={event}
                survey={survey}
                initialName={search.name}
                initialEmail={search.email}
                isStandalonePage={true}
              />
            </div>
          ) : (
            <div className="bg-card/40 border border-border rounded-2xl p-8 backdrop-blur-sm shadow-lg text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold">Feedback Survey Not Yet Active</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Questions for this event feedback survey have not been published yet. Please check back shortly or return to the main event page.
              </p>
              <div className="pt-2">
                <Link
                  to="/event/$eventId"
                  params={{ eventId: event.id }}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-tech transition-colors"
                >
                  Return to Event Details
                </Link>
              </div>
            </div>
          )}

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground pt-4">
            Integrated Technics Events &bull; Continuous Experience & Quality Assurance
          </p>

        </div>
    </SiteShell>
  );
}
