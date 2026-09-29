import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/events/$eventId/$surveyId")({
  validateSearch: (search: Record<string, unknown>): { name?: string | undefined; email?: string | undefined } => ({
    name: typeof search["name"] === "string" ? search["name"] : undefined,
    email: typeof search["email"] === "string" ? search["email"] : undefined,
  }),
  loader: ({ params, location }) => {
    throw redirect({
      to: "/event/$eventId/$surveyId",
      params: {
        eventId: params.eventId,
        surveyId: params.surveyId,
      },
      search: (location.search || {}) as { name?: string | undefined; email?: string | undefined },
      replace: true,
    });
  },
  component: () => null,
});
