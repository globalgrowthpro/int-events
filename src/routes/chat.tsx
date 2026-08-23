import { createFileRoute } from "@tanstack/react-router";
import { PortalShell } from "@/components/int/portal-shell";
import { ChatView } from "@/components/int/chat-view";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — INT Events" },
      {
        name: "description",
        content: "Direct messaging with attendees, exhibitors and sponsors attending INT summits.",
      },
      { property: "og:title", content: "Chat — INT Events" },
      { property: "og:description", content: "Real-time account-to-account networking chat." },
    ],
  }),
  component: ChatRoute,
});

function ChatRoute() {
  return (
    <PortalShell fullWidth={true}>
      <ChatView isAdmin={false} />
    </PortalShell>
  );
}
