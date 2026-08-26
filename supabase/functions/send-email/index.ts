// @ts-nocheck
// INT Events — production email dispatcher (Supabase Edge Function)
// Runs on Supabase infrastructure so email works on the live host,
// not only on the local Vite dev server.
//
// Required function secrets (set in Supabase → Edge Functions → Secrets):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, SMTP_FROM_NAME

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function shell(inner: string, template: any = {}) {
  const primaryColor = template.primaryColor || '#f37021';
  const secondaryColor = template.secondaryColor || '#1e293b';
  const bgColor = template.backgroundColor || '#0b1120';
  const textColor = template.textColor || '#f8fafc';
  const headerText = template.headerText || 'Integrated Technics';
  const headerSubtext = template.headerSubtext || 'التقنيات المتكاملة &bull; Events Gateway';
  const footerText = template.footerText || 'Integrated Technics Events';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /></head>
  <body style="margin:0;padding:0;background:${bgColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${textColor};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bgColor};padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:580px;background:${secondaryColor};border:1px solid ${secondaryColor};border-radius:20px;overflow:hidden;">
          <tr><td style="padding:24px 28px;background:linear-gradient(135deg,${secondaryColor} 0%,${secondaryColor} 60%,${primaryColor} 100%);border-bottom:1px solid ${secondaryColor};">
            <h2 style="margin:0;color:#fff;font-size:18px;font-weight:800;">${headerText}</h2>
            <p style="margin:2px 0 0;color:${primaryColor};font-size:12px;font-weight:600;">${headerSubtext}</p>
          </td></tr>
          <tr><td style="padding:28px;color:#e2e8f0;font-size:14px;line-height:1.6;">${inner}</td></tr>
          <tr><td style="padding:18px 28px;background:#090e1a;border-top:1px solid ${secondaryColor};color:#64748b;font-size:11px;text-align:center;">
            ${footerText}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const kind: "test" | "invitation" = payload.kind === "test" ? "test" : "invitation";

    const host = payload.host || Deno.env.get("SMTP_HOST") || "";
    const port = Number(payload.port || Deno.env.get("SMTP_PORT") || 465);
    const username = payload.username || Deno.env.get("SMTP_USER") || "";
    const password = payload.password || Deno.env.get("SMTP_PASS") || "";
    const fromEmail = payload.from_email || Deno.env.get("SMTP_FROM_EMAIL") || username;
    const fromName = payload.from_name || Deno.env.get("SMTP_FROM_NAME") || "Integrated Technics Events";

    if (!host || !username || !password) {
      return json(
        { success: false, error: "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS as Edge Function secrets." },
        500,
      );
    }

    const to = kind === "test" ? payload.recipient_email : payload.recipient_email;
    if (!to) return json({ success: false, error: "Missing recipient email" }, 400);

    let subject: string;
    let html: string;
    const attachments: { filename: string; content: string; encoding: "base64"; contentType: string; contentID?: string }[] = [];

    if (kind === "test") {
      subject = "INT Events Platform — SMTP Handshake & Delivery Test";
      html = shell(`
        <p style="margin:0 0 16px;color:#10b981;font-size:16px;font-weight:700;">&#10003; Live SMTP Handshake Verified</p>
        <p style="margin:0 0 20px;color:#94a3b8;">Your outgoing SMTP gateway <strong>${host}:${port}</strong> authenticated and dispatched this message successfully.</p>
        <div style="padding:16px;background:#1e293b;border-radius:12px;border-left:4px solid #f37021;font-size:13px;">
          <p style="margin:0 0 6px;"><strong>Sender:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
          <p style="margin:0 0 6px;"><strong>Recipient:</strong> ${to}</p>
          <p style="margin:0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>`);
    } else {
      const recipientName = payload.recipient_name || "Valued Guest";
      const eventId = payload.event_id || "";
      const eventTitle = payload.event_title || "INT Event";
      const eventDate = payload.event_date || "";
      const eventLocation = payload.event_location || "";
      const token = payload.token || `EVT-INV-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const baseDomain = (payload.domain || "https://events.integratedtechnics.com").replace(/\/+$/, "");
      const template = (payload.template_config || {}) as any;
      const primaryColor = template.primaryColor || '#f37021';
      const secondaryColor = template.secondaryColor || '#1e293b';
      const bgColor = template.backgroundColor || '#0b1120';
      const textColor = template.textColor || '#f8fafc';
      const headerText = template.headerText || 'Integrated Technics';
      const headerSubtext = template.headerSubtext || 'التقنيات المتكاملة &bull; Events Gateway';
      const bodyText = (template.bodyText || 'Dear {recipientName},<br/>You are cordially invited to attend this Integrated Technics event.').replace('{recipientName}', recipientName);
      const buttonText = template.buttonText || 'Confirm Attendance';
      const footerText = template.footerText || 'Integrated Technics Events';

      const registerUrl = `${baseDomain}/events/${encodeURIComponent(eventId)}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}&name=${encodeURIComponent(recipientName)}#register`;

      const qrDataUrl: string = await QRCode.toDataURL(
        JSON.stringify({
          pass_id: token,
          attendee: recipientName,
          company: payload.company || "",
          event_id: eventId,
          event_title: eventTitle,
          auth: "INT_OFFICIAL_VERIFIED",
          checkin_url: registerUrl,
        }),
        { width: 260, margin: 1, color: { dark: "#0F172A", light: "#FFFFFF" } },
      );

      attachments.push({
        filename: "pass-qr.png",
        content: qrDataUrl.split(",")[1] ?? "",
        encoding: "base64",
        contentType: "image/png",
        contentID: "passqr",
      });

      subject = `You're invited — ${eventTitle}`;
      html = shell(`
        <p style="margin:0 0 8px;color:${primaryColor};font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">Official Invitation</p>
        <h1 style="margin:0 0 12px;color:#fff;font-size:22px;">${eventTitle}</h1>
        <p style="margin:0 0 18px;color:#94a3b8;">${bodyText}</p>
        <div style="padding:16px;background:${secondaryColor};border-radius:12px;border-left:4px solid ${primaryColor};font-size:13px;">
          ${eventDate ? `<p style="margin:0 0 6px;"><strong>Date:</strong> ${eventDate}</p>` : ""}
          ${eventLocation ? `<p style="margin:0 0 6px;"><strong>Venue:</strong> ${eventLocation}</p>` : ""}
          <p style="margin:0;"><strong>Invitation code:</strong> ${token}</p>
        </div>
        <p style="margin:22px 0;text-align:center;">
          <a href="${registerUrl}" style="display:inline-block;padding:13px 26px;background:${primaryColor};color:#fff;border-radius:10px;font-weight:700;text-decoration:none;">${buttonText}</a>
        </p>
        <p style="text-align:center;margin:0;"><img src="cid:passqr" alt="Invitation QR" width="180" height="180" style="border-radius:12px;background:#fff;padding:8px;" /></p>
        ${payload.custom_note ? `<p style="margin:18px 0 0;color:#94a3b8;">${payload.custom_note}</p>` : ""}`, template);
    }

    const client = new SMTPClient({
      connection: {
        hostname: host,
        port,
        tls: port === 465,
        auth: { username, password },
      },
    });

    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      content: "This message requires an HTML capable email client.",
      html,
      attachments,
    });
    await client.close();

    return json({ success: true, messageId: `INT-${Date.now()}` });
  } catch (err) {
    return json({ success: false, error: (err as Error)?.message || "SMTP transmission error" }, 500);
  }
});
