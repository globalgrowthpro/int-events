// @ts-nocheck
// INT Events — production email dispatcher (Supabase Edge Function)
// Runs on Supabase infrastructure so email works on the live host,
// not only on the local Vite dev server.
//
// Required function secrets (set in Supabase → Edge Functions → Secrets):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, SMTP_FROM_NAME

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
    const kind: "test" | "invitation" | "pass" | "confirmation" =
      payload.kind === "test"
        ? "test"
        : payload.kind === "pass"
          ? "pass"
          : payload.kind === "confirmation"
            ? "confirmation"
            : "invitation";

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
    } else if (kind === "invitation") {
      const recipientName = payload.recipient_name || "Valued Guest";
      const eventId = payload.event_id || "";
      const eventTitle = payload.event_title || "INT Event";
      const eventDate = payload.event_date || "Event Schedule Announced Soon";
      const eventLocation = payload.event_location || "Integrated Technics Operations Center";
      const jobTitle = payload.job_title || "";
      const company = payload.company || "";
      const token = payload.token || `EVT-INV-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const baseDomain = (payload.domain || "https://events.integratedtechnics.com").replace(/\/+$/, "");
      const template = (payload.template_config || {}) as any;
      const primaryColor = template.primaryColor || '#f37021';
      const secondaryColor = template.secondaryColor || '#1e293b';
      const bgColor = template.backgroundColor || '#0b1120';
      const textColor = template.textColor || '#f8fafc';
      const headerText = template.headerText || 'Integrated Technics';
      const rawBody = (template.bodyText || `It is our pleasure to extend to you an exclusive VIP invitation to attend ${eventTitle}. Step into an exclusive technology experience designed to showcase the latest innovations, emerging technologies, and intelligent solutions.`).replace(/{recipientName}/g, recipientName).replace(/{eventTitle}/g, eventTitle);
      const cleanBodyText = rawBody.replace(/^\s*Dear\s+[^,\n]+,\s*/i, '').trim().replace(/\n/g, '<br />');

      const buttonText = template.buttonText || 'Register & Book your seat';
      const footerText = template.footerText || 'Integrated Technics Events';
      const logoUrl = template.logoUrl || `${baseDomain}/logo.png`;

      const registerUrl = `${baseDomain}/events/${encodeURIComponent(eventId)}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}&name=${encodeURIComponent(recipientName)}#register`;

      subject = `Official VIP Invitation: ${eventTitle}`;

      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${textColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${bgColor}; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 640px; background: ${secondaryColor}; border: 1px solid ${secondaryColor}; border-radius: 28px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);">
          
          <!-- Top Brand Banner with Logo -->
          <tr>
            <td style="padding: 32px 36px 26px 36px; background: linear-gradient(135deg, ${secondaryColor} 0%, ${secondaryColor} 50%, ${primaryColor} 120%); border-bottom: 1px solid ${secondaryColor};">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="64" style="vertical-align: middle;">
                    <div style="background: #ffffff; padding: 4px; border-radius: 14px; box-shadow: 0 8px 16px rgba(0,0,0,0.3); display: inline-block;">
                      <img src="${logoUrl}" alt="INT Logo" width="56" height="56" style="display: block; border-radius: 10px; object-fit: contain; width: 56px; height: 56px;" />
                    </div>
                  </td>
                  <td style="padding-left: 16px; vertical-align: middle;">
                    <div style="display: inline-block; padding: 4px 12px; background: ${primaryColor}29; border: 1px solid ${primaryColor}66; border-radius: 100px; color: ${primaryColor}; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
                      ✦ VIP INVITATION
                    </div>
                    <h1 style="margin: 8px 0 2px 0; color: #ffffff; font-size: 22px; font-weight: 900; line-height: 1.2; letter-spacing: -0.5px;">
                      ${headerText}
                    </h1>
                    <p style="margin: 0; color: ${primaryColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                      ${headerSubtext}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Salutation & Welcome Note -->
          <tr>
            <td style="padding: 28px 36px 16px 36px; color: #e2e8f0; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #ffffff;">Dear <strong>${recipientName}</strong>,</p>
              <div style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                ${cleanBodyText}
              </div>
            </td>
          </tr>

          <!-- Event Details Summary Box -->
          <tr>
            <td style="padding: 8px 36px 20px 36px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: ${bgColor}; border: 1px solid ${primaryColor}40; border-radius: 16px; padding: 16px 20px;">
                <tr>
                  <td style="color: #cbd5e1; font-size: 13px;">
                    <table width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td><strong style="color: #ffffff; font-size: 15px;">${eventTitle}</strong></td>
                      </tr>
                      <tr>
                        <td style="padding-top: 10px; color: #94a3b8; font-size: 12px;">
                          <table width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td>📅 ${eventDate}</td>
                              <td align="right">📍 ${eventLocation}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIRECT REGISTRATION BUTTON -->
          <tr>
            <td style="padding: 10px 36px 32px 36px;" align="center">
              <table cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 14px;">
                    <a href="${registerUrl}" style="display: inline-block; padding: 16px 36px; background: ${primaryColor}; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 20px -5px ${primaryColor}80;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Template Footer -->
          <tr>
            <td style="padding: 20px 36px 24px 36px; background-color: #080c16; border-top: 1px solid #1e293b; color: #94a3b8; font-size: 13px; font-weight: 600; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                ${footerText}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    // ---- Approved registration → official ITS pass card ----
    if (kind === "pass") {
      const recipientName = payload.recipient_name || "Valued Guest";
      const eventTitle = payload.event_title || "Integrated Technics Showcase 2026";
      const eventDate = payload.event_date || "";
      const eventLocation = payload.event_location || "";
      const token = payload.token || `EVT-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const regId = payload.registration_id || token;
      const baseDomain = (payload.domain || "https://events.integratedtechnics.com").replace(/\/+$/, "");

      if (payload.pass_image_base64 && payload.pass_image_base64.startsWith("data:image")) {
        const base64Data = payload.pass_image_base64.replace(/^data:image\/\w+;base64,/, "");
        const safeName = recipientName.replace(/[^a-zA-Z0-9_-]/g, "_");
        attachments.push({
          filename: `${safeName}_ITS2026_Pass.png`,
          content: base64Data,
          encoding: "base64",
          contentType: "image/png",
        });
      }

      subject = `Approved — Your ITS 2026 Access Pass (${eventTitle})`;
      html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /></head>
      <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;">
          <tr><td align="center">
            <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:2px solid #cbd5e1;border-radius:14px;overflow:hidden;">
              <tr><td style="padding:28px 26px 8px;text-align:center;">
                <h1 style="margin:0;color:#111;font-size:26px;font-weight:900;text-transform:uppercase;line-height:1.2;">${eventTitle}</h1>
              </td></tr>
              <tr><td style="padding:18px 26px 0;text-align:center;">
                <img src="${baseDomain}/its-logo.png" alt="Integrated Technics Showcase" width="260" style="max-width:260px;height:auto;" />
              </td></tr>
              <tr><td style="padding:22px 26px 0;text-align:center;">
                <p style="margin:0;font-family:monospace;font-size:12px;color:#64748b;letter-spacing:1px;">${token}</p>
              </td></tr>
              <tr><td style="padding:20px 26px 26px;">
                <table role="presentation" width="100%" style="border-top:1px solid #e2e8f0;font-size:13px;color:#111;">
                  <tr><td style="padding:10px 0;"><strong>Attendee</strong></td><td style="padding:10px 0;text-align:right;">${recipientName}</td></tr>
                  <tr><td style="padding:10px 0;"><strong>Company</strong></td><td style="padding:10px 0;text-align:right;">${payload.company || "—"}</td></tr>
                  <tr><td style="padding:10px 0;"><strong>Registration ID</strong></td><td style="padding:10px 0;text-align:right;">${regId}</td></tr>
                  ${eventDate ? `<tr><td style="padding:10px 0;"><strong>Date</strong></td><td style="padding:10px 0;text-align:right;">${eventDate}</td></tr>` : ""}
                  ${eventLocation ? `<tr><td style="padding:10px 0;"><strong>Venue</strong></td><td style="padding:10px 0;text-align:right;">${eventLocation}</td></tr>` : ""}
                </table>
                <p style="margin:16px 0 0;font-size:13px;color:#475569;">Your registration has been <strong style="color:#16a34a;">approved</strong>. Present this pass at the entrance for instant check-in.</p>
              </td></tr>
              <tr><td style="background:#f37021;padding:18px 26px;text-align:center;color:#fff;font-style:italic;font-size:15px;line-height:1.5;">
                Integrated Technics Showcase Event<br/>ITS 2026<br/>Full Access Ticket
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body></html>`;
    }

    // ---- Registration confirmation email ----
    if (kind === "confirmation") {
      const recipientName = payload.recipient_name || "Valued Guest";
      const eventTitle = payload.event_title || "Integrated Technics Event";

      subject = `Registration Received — ${eventTitle}`;
      html = shell(`
        <p style="margin:0 0 16px;font-size:17px;color:#fff;font-weight:700;">Dear ${recipientName},</p>
        <p style="margin:0 0 18px;color:#cbd5e1;font-size:15px;line-height:1.6;">
          Your registration for <strong style="color:#f37021;">${eventTitle}</strong> has been successfully sent, and kindly request to wait for your Badge.
        </p>
        <div style="padding:18px 20px;background:#1e293b;border-radius:14px;border-left:4px solid #f37021;font-size:13px;margin:24px 0 20px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#f37021;text-transform:uppercase;letter-spacing:1px;">For more info:</p>
          <p style="margin:0 0 6px;color:#fff;font-weight:600;font-size:14px;">📞 +201212777570</p>
          <p style="margin:0;color:#f37021;font-weight:600;font-size:14px;">✉️ <a href="mailto:Event@integratedtechnics.com" style="color:#f37021;text-decoration:none;">Event@integratedtechnics.com</a></p>
        </div>
      `);
    }

    // ---- Delivery: correct sender alignment + TLS/STARTTLS fallback ----
    const userDomain = username.includes("@") ? username.split("@")[1] : "";
    const fromDomain = fromEmail.includes("@") ? fromEmail.split("@")[1] : "";
    // Most shared SMTP relays reject a From header that does not belong to the
    // authenticated mailbox — that is the usual cause of "works for our domain
    // but not for gmail/outlook recipients".
    const safeFrom = userDomain && fromDomain && userDomain !== fromDomain ? username : fromEmail;

    const message = {
      from: `${fromName} <${safeFrom}>`,
      to,
      replyTo: fromEmail,
      subject,
      content: "This message requires an HTML capable email client.",
      html,
      attachments,
      headers: {
        "X-Mailer": "INT-Events-Platform",
        "X-Entity-Ref-ID": `INT-${Date.now()}`,
      },
    };

    const attempts: Array<{ port: number; tls: boolean }> = [
      { port, tls: port === 465 },
      // Fallback to the other standard submission path.
      port === 465 ? { port: 587, tls: false } : { port: 465, tls: true },
    ];

    let lastError = "";
    for (const attempt of attempts) {
      try {
        const client = new SMTPClient({
          connection: {
            hostname: host,
            port: attempt.port,
            tls: attempt.tls,
            auth: { username, password },
          },
        });
        await client.send(message);
        await client.close();
        return json({ success: true, messageId: `INT-${Date.now()}`, port: attempt.port });
      } catch (err) {
        lastError = (err as Error)?.message || "SMTP transmission error";
      }
    }

    return json({ success: false, error: lastError || "SMTP transmission error" }, 500);
  } catch (err) {
    return json({ success: false, error: (err as Error)?.message || "SMTP transmission error" }, 500);
  }
});

