import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/int/chat-view";

export const Route = createFileRoute("/admin/chat")({
  head: () => ({
    meta: [
      { title: "Chat & Messaging (Admin Moderation) — INT Events" },
      {
        name: "description",
        content: "Admin chat center for connecting with attendees, exhibitors, sponsors and moderating summit conversations.",
      },
      { property: "og:title", content: "Admin Chat — INT Events" },
      { property: "og:description", content: "Direct messaging and conversation moderation in INT Events Admin." },
    ],
  }),
  component: AdminChatRoute,
});

function AdminChatRoute() {
  return <ChatView isAdmin={true} />;
}

