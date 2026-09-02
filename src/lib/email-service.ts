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
  template_config?: Record<string, string> | undefined;
  host?: string | undefined;
  port?: number | undefined;
  username?: string | undefined;
  password?: string | undefined;
  from_name?: string | undefined;
  from_email?: string | undefined;
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
  endpoint: "/api/test-smtp" | "/api/send-invitation" | "/api/send-pass" | "/api/send-confirmation",
  kind: "test" | "invitation" | "pass" | "confirmation",
  payload: Record<string, unknown>,
): Promise<SendResult> {
  const recipient = (payload["recipient_email"] as string) || (payload["to"] as string) || "Unknown recipient";
  console.log(`[EmailService] 📤 Dispatching ${kind} email to: ${recipient}`);

  // 1) Local dev server middleware (only available on localhost).
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, ...payload }),
    });

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success !== false) {
        console.log(`[EmailService] ✅ Email sent via local dev server. Message ID:`, data?.messageId);
        return { success: true, messageId: data?.messageId, logs: data?.logs };
      }
      if (res.ok === false && res.status >= 400 && res.status < 500 && data?.error) {
        console.warn(`[EmailService] ⚠️ Local dev server reported error:`, data.error);
        return { success: false, error: data.error, logs: data?.logs };
      }
      // 5xx from the local SMTP middleware — report the real reason.
      if (data?.error) {
        console.warn(`[EmailService] ⚠️ Local dev server 500:`, data.error);
        return { success: false, error: data.error, logs: data?.logs };
      }
    }
  } catch (err) {
    console.warn(`[EmailService] Local endpoint unavailable, attempting Edge Function fallback:`, err);
  }

  // 2) Production path: Supabase Edge Function.
  try {
    console.log(`[EmailService] Invoking Supabase Edge Function send-email for ${kind}...`);
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: { kind, ...payload },
    });

    if (error) {
      console.error(`[EmailService] ❌ Edge Function error:`, error);
      return { success: false, error: error.message || "Email service unavailable" };
    }
    if (data?.success === false) {
      console.error(`[EmailService] ❌ SMTP transmission error:`, data.error);
      return { success: false, error: data.error || "SMTP transmission error" };
    }
    console.log(`[EmailService] ✅ Email sent via Edge Function. Message ID:`, data?.messageId);
    return { success: true, messageId: data?.messageId };
  } catch (err) {
    console.error(`[EmailService] ❌ Email service unreachable:`, err);
    return {
      success: false,
      error: (err as Error)?.message || "Email service unreachable",
    };
  }
}

export interface PassEmailPayload {
  recipient_name: string;
  recipient_email: string;
  event_id?: string | undefined;
  event_title: string;
  event_date?: string | undefined;
  event_location?: string | undefined;
  company?: string | null | undefined;
  job_title?: string | null | undefined;
  registration_id: string;
  token: string;
  pass_image_base64?: string | undefined;
  template_config?: Record<string, string> | undefined;
  domain?: string | undefined;
  host?: string | undefined;
  port?: number | undefined;
  username?: string | undefined;
  password?: string | undefined;
  from_name?: string | undefined;
  from_email?: string | undefined;
}

/**
 * Approved-registration pass card email.
 * Uses local dev server SMTP middleware on localhost, falls back to
 * the Supabase Edge Function on deployed production host.
 */
export async function sendPassCardEmail(payload: PassEmailPayload): Promise<SendResult> {
  let templateConfig;
  try {
    const { data } = await supabase
      .from("email_templates")
      .select("config")
      .eq("id", "badge")
      .maybeSingle();

    if (data?.config) {
      templateConfig = data.config;
    } else {
      const saved = typeof window !== "undefined" ? localStorage.getItem("int_email_template_badge") : null;
      if (saved) templateConfig = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error parsing badge template config", e);
  }

  let smtpConfig: any = null;
  try {
    const { data } = await supabase
      .from("smtp_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      smtpConfig = data;
    }
  } catch {
    /* ignore */
  }

  const finalPayload = {
    ...payload,
    template_config: payload.template_config || templateConfig,
    domain: typeof window !== "undefined" ? window.location.origin : undefined,
    host: payload.host || smtpConfig?.host,
    port: payload.port || smtpConfig?.port,
    username: payload.username || smtpConfig?.username,
    password: payload.password || smtpConfig?.password_encrypted || smtpConfig?.password,
    from_name: payload.from_name || smtpConfig?.from_name,
    from_email: payload.from_email || smtpConfig?.from_email,
  };

  return dispatch(
    "/api/send-pass",
    "pass",
    finalPayload as unknown as Record<string, unknown>,
  );
}

export async function sendLiveTestEmail(payload: SmtpTestPayload): Promise<SendResult> {
  return dispatch("/api/test-smtp", "test", payload as unknown as Record<string, unknown>);
}

export async function sendLiveInvitationEmail(
  payload: InvitationEmailPayload,
): Promise<SendResult> {
  let templateConfig;
  try {
    const { data } = await supabase
      .from("email_templates")
      .select("config")
      .eq("id", "default")
      .maybeSingle();

    if (data?.config) {
      templateConfig = data.config;
    } else {
      const saved = typeof window !== "undefined" ? localStorage.getItem("int_email_template") : null;
      if (saved) templateConfig = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error parsing template config", e);
  }
  
  let smtpConfig: any = null;
  try {
    const { data } = await supabase
      .from("smtp_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      smtpConfig = data;
    }
  } catch {
    /* ignore */
  }

  const finalPayload = {
    ...payload,
    template_config: payload.template_config || templateConfig,
    domain: typeof window !== "undefined" ? window.location.origin : undefined,
    host: payload.host || smtpConfig?.host,
    port: payload.port || smtpConfig?.port,
    username: payload.username || smtpConfig?.username,
    password: payload.password || smtpConfig?.password_encrypted || smtpConfig?.password,
    from_name: payload.from_name || smtpConfig?.from_name,
    from_email: payload.from_email || smtpConfig?.from_email,
  };

  return dispatch(
    "/api/send-invitation",
    "invitation",
    finalPayload as unknown as Record<string, unknown>,
  );
}

export interface RegistrationConfirmationPayload {
  recipient_name: string;
  recipient_email: string;
  event_title: string;
  event_id?: string | undefined;
  company?: string | null | undefined;
  template_config?: Record<string, string> | undefined;
  host?: string | undefined;
  port?: number | undefined;
  username?: string | undefined;
  password?: string | undefined;
  from_name?: string | undefined;
  from_email?: string | undefined;
}

export async function sendRegistrationConfirmationEmail(
  payload: RegistrationConfirmationPayload,
): Promise<SendResult> {
  let templateConfig;
  try {
    const { data } = await supabase
      .from("email_templates")
      .select("config")
      .eq("id", "registration")
      .maybeSingle();

    if (data?.config) {
      templateConfig = data.config;
    } else {
      const saved = typeof window !== "undefined" ? localStorage.getItem("int_email_template_registration") : null;
      if (saved) templateConfig = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error parsing registration template config", e);
  }

  let smtpConfig: any = null;
  try {
    const { data } = await supabase
      .from("smtp_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      smtpConfig = data;
    }
  } catch {
    /* ignore */
  }

  const finalPayload = {
    ...payload,
    template_config: payload.template_config || templateConfig,
    domain: typeof window !== "undefined" ? window.location.origin : undefined,
    host: payload.host || smtpConfig?.host,
    port: payload.port || smtpConfig?.port,
    username: payload.username || smtpConfig?.username,
    password: payload.password || smtpConfig?.password_encrypted || smtpConfig?.password,
    from_name: payload.from_name || smtpConfig?.from_name,
    from_email: payload.from_email || smtpConfig?.from_email,
  };

  return dispatch(
    "/api/send-confirmation",
    "confirmation",
    finalPayload as unknown as Record<string, unknown>,
  );
}

