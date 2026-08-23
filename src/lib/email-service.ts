import { supabase } from "@/lib/supabase";

export interface SmtpTestPayload {
  host?: string | undefined;
  port?: number | undefined;
  encryption?: ("ssl" | "tls" | "none") | undefined;
  username?: string | undefined;
  password?: string | undefined;
  from_email?: string | undefined;
  from_name?: string | undefined;
  recipient_email: string;
}

export interface InvitationEmailPayload {
  recipient_name: string;
  recipient_email: string;
  event_id?: string | undefined;
  event_title: string;
  event_date?: string | undefined;
  event_location?: string | undefined;
  company?: string | null | undefined;
  job_title?: string | null | undefined;
  token?: string | null | undefined;
  domain?: string | undefined;
  custom_note?: string | undefined;
}

type SendResult = {
  success: boolean;
  messageId?: string;
  logs?: string[];
  error?: string;
};

/**
 * The `/api/*` endpoints only exist in the local Vite dev server middleware.
 * On the deployed (static) host they 404 / return index.html, so we fall back
 * to the `send-email` Supabase Edge Function which runs in production.
 */
async function dispatch(
  endpoint: "/api/test-smtp" | "/api/send-invitation",
  kind: "test" | "invitation",
  payload: Record<string, unknown>,
): Promise<SendResult> {
  // 1) Local dev server middleware (only available on localhost).
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success !== false) {
        return { success: true, messageId: data?.messageId, logs: data?.logs };
      }
      if (res.ok === false && res.status >= 400 && res.status < 500 && data?.error) {
        return { success: false, error: data.error, logs: data?.logs };
      }
      // 5xx from the local SMTP middleware — report the real reason.
      if (data?.error) return { success: false, error: data.error, logs: data?.logs };
    }
    // Non-JSON response (SPA fallback HTML on the live host) → use the edge function.
  } catch {
    // Network error / endpoint missing → use the edge function.
  }

  // 2) Production path: Supabase Edge Function.
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: { kind, ...payload },
    });

    if (error) {
      return { success: false, error: error.message || "Email service unavailable" };
    }
    if (data?.success === false) {
      return { success: false, error: data.error || "SMTP transmission error" };
    }
    return { success: true, messageId: data?.messageId };
  } catch (err) {
    return {
      success: false,
      error: (err as Error)?.message || "Email service unreachable",
    };
  }
}

export async function sendLiveTestEmail(payload: SmtpTestPayload): Promise<SendResult> {
  return dispatch("/api/test-smtp", "test", payload as unknown as Record<string, unknown>);
}

export async function sendLiveInvitationEmail(
  payload: InvitationEmailPayload,
): Promise<SendResult> {
  return dispatch(
    "/api/send-invitation",
    "invitation",
    payload as unknown as Record<string, unknown>,
  );
}
