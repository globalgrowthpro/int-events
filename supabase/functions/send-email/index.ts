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

function shell(inner: string, template: any = {}, baseDomain: string = "https://events.integratedtechnics.com") {
  const primaryColor = template.primaryColor || '#f37021';
  const secondaryColor = template.secondaryColor || '#1e293b';
  const bgColor = template.backgroundColor || '#0b1120';
  const textColor = template.textColor || '#f8fafc';
  const headerText = template.headerText || 'Integrated Technics';
  const headerSubtext = template.headerSubtext || 'التقنيات المتكاملة &bull; Events Gateway';
  const footerText = template.footerText || 'Integrated Technics Events';

  let logoUrl = template.logoUrl;
  if (!logoUrl || logoUrl === "/logo.png") {
    logoUrl = `${baseDomain}/logo.png`;
  } else if (logoUrl.startsWith("/")) {
    logoUrl = `${baseDomain}${logoUrl}`;
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /></head>
  <body style="margin:0;padding:0;background:${bgColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${textColor};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bgColor};padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:580px;background:${secondaryColor};border:1px solid ${secondaryColor};border-radius:20px;overflow:hidden;">
          <tr><td style="padding:24px 28px;background:linear-gradient(135deg,${secondaryColor} 0%,${secondaryColor} 60%,${primaryColor} 100%);border-bottom:1px solid ${secondaryColor};">
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="56" style="vertical-align: middle;">
                  <div style="background: #ffffff; padding: 2px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    <img src="${logoUrl}" alt="Logo" width="48" height="48" style="display: block; border-radius: 10px; object-fit: contain; width: 48px; height: 48px;" />
                  </div>
                </td>
                <td style="padding-left: 14px; vertical-align: middle;">
                  <h2 style="margin:0;color:#fff;font-size:18px;font-weight:800;">${headerText}</h2>
                  <p style="margin:2px 0 0;color:${primaryColor};font-size:12px;font-weight:600;">${headerSubtext}</p>
                </td>
              </tr>
            </table>
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
      let logoUrl = template.logoUrl;
      if (!logoUrl || logoUrl === "/logo.png") {
        logoUrl = `${baseDomain}/logo.png`;
      } else if (logoUrl.startsWith("/")) {
        logoUrl = `${baseDomain}${logoUrl}`;
      }

      const registerUrl = template.buttonUrl || `${baseDomain}/events/${encodeURIComponent(eventId)}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}&name=${encodeURIComponent(recipientName)}#register`;

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
      const eventDate = payload.event_date || "Event Schedule Announced Soon";
      const eventLocation = payload.event_location || "Integrated Technics Operations Center";
      const token = payload.token || `EVT-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const jobTitle = payload.job_title || "Participant";
      const company = payload.company || "Integrated Technics";
      const baseDomain = (payload.domain || "https://events.integratedtechnics.com").replace(/\/+$/, "");
      const template = payload.template_config || {};
      const passPdfUrl = payload.pass_pdf_url;
      const myPassesUrl = template.buttonUrl || `${baseDomain}/my-passes`;

      const primaryColor = template.primaryColor || '#10b981';
      const secondaryColor = template.secondaryColor || '#1e293b';
      const bgColor = template.backgroundColor || '#070b14';
      const textColor = template.textColor || '#f8fafc';
      const headerText = template.headerText || 'Integrated Technics';
      const headerSubtext = template.headerSubtext || 'التقنيات المتكاملة &bull; Events Gateway';
      const footerText = template.footerText || 'Integrated Technics Events &bull; Official Digital Pass';
      const buttonText = template.buttonText || 'View Your Digital Badge';

      let logoUrl = template.logoUrl;
      if (!logoUrl || logoUrl === "/logo.png") {
        logoUrl = `${baseDomain}/logo.png`;
      } else if (logoUrl.startsWith("/")) {
        logoUrl = `${baseDomain}${logoUrl}`;
      }

      let rawBody = template.bodyText || `Your official event badge and access pass for ${eventTitle} is ready, ${recipientName}. Please present your digital pass or the attached badge at the entrance for quick access.`;
      if (!rawBody.includes('{eventTitle}') && !rawBody.includes(eventTitle)) {
        rawBody = rawBody.replace('Your event badge is ready', `Your official event badge for ${eventTitle} is ready`);
      }
      const cleanBodyText = rawBody.replace(/{recipientName}/g, recipientName).replace(/{eventTitle}/g, eventTitle).replace(/^\s*Dear\s+[^,\n]+,\s*/i, '').trim().replace(/\n/g, '<br />');

      if (payload.pass_pdf_base64) {
        const base64Data = payload.pass_pdf_base64.includes("base64,")
          ? payload.pass_pdf_base64.split("base64,")[1]
          : payload.pass_pdf_base64;
        
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const safeName = recipientName.replace(/[^a-zA-Z0-9_-]/g, "_");
        attachments.push({
          filename: `${safeName}_ITS2026_Pass_A4.pdf`,
          content: bytes,
          contentType: "application/pdf",
        });
      } else if (payload.pass_image_base64 && payload.pass_image_base64.startsWith("data:image")) {
        const base64Data = payload.pass_image_base64.includes("base64,")
          ? payload.pass_image_base64.split("base64,")[1]
          : payload.pass_image_base64;
        
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const safeName = recipientName.replace(/[^a-zA-Z0-9_-]/g, "_");
        attachments.push({
          filename: `${safeName}_ITS2026_Pass.png`,
          content: bytes,
          contentType: "image/png",
        });
      }

      subject = `Official Access Pass — ${recipientName} (${eventTitle})`;
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
                      ✦ OFFICIAL EVENT BADGE • DIGITAL PASS
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

          <!-- BADGE PASS DETAILS CARD -->
          <tr>
            <td style="padding: 8px 36px 20px 36px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: ${bgColor}; border: 1px solid ${primaryColor}40; border-radius: 18px; padding: 20px 24px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: ${primaryColor}; font-weight: 800; margin-bottom: 6px;">
                      Event Access Pass
                    </div>
                    <div style="color: #ffffff; font-size: 18px; font-weight: 800; margin-bottom: 14px;">
                      ${eventTitle}
                    </div>

                    <table width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #334155; padding-top: 14px;">
                      <tr>
                        <td style="padding: 4px 0; color: #94a3b8; font-size: 13px;">Delegate Name:</td>
                        <td align="right" style="padding: 4px 0; color: #ffffff; font-weight: 700; font-size: 14px;">${recipientName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #94a3b8; font-size: 13px;">Designation &amp; Org:</td>
                        <td align="right" style="padding: 4px 0; color: #cbd5e1; font-size: 13px;">${jobTitle} &bull; ${company}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #94a3b8; font-size: 13px;">Pass Token:</td>
                        <td align="right" style="padding: 4px 0; font-family: monospace; color: ${primaryColor}; font-weight: 800; font-size: 14px; letter-spacing: 1px;">${token}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #94a3b8; font-size: 13px;">Date &amp; Venue:</td>
                        <td align="right" style="padding: 4px 0; color: #94a3b8; font-size: 12px;">${eventDate} &bull; ${eventLocation}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CALL TO ACTION BUTTON -->
          <tr>
            <td style="padding: 10px 36px 28px 36px;" align="center">
              ${passPdfUrl ? `
              <table cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td align="center" style="border-radius: 14px;">
                    <a href="${passPdfUrl}" target="_blank" download style="display: inline-block; padding: 16px 36px; background: ${primaryColor}; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 20px -5px ${primaryColor}80;">
                      📥 Download Official A4 Pass Card (PDF)
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              <table cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 14px;">
                    <a href="${myPassesUrl}" style="display: inline-block; padding: ${passPdfUrl ? '13px 30px' : '16px 36px'}; background: ${passPdfUrl ? 'transparent' : primaryColor}; color: #ffffff; ${passPdfUrl ? 'border: 1px solid #475569;' : ''} font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; ${passPdfUrl ? '' : `box-shadow: 0 10px 20px -5px ${primaryColor}80;`}">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 14px 0 0 0; color: #94a3b8; font-size: 12px;">
                ${passPdfUrl ? '📄 Click above to view and download your official high-resolution A4 Pass Card (PDF).' : '📎 Your printable badge image is also attached to this email.'}
              </p>
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


    // ---- Registration confirmation email ----
    if (kind === "confirmation") {
      const recipientName = payload.recipient_name || "Valued Guest";
      const eventTitle = payload.event_title || "Integrated Technics Showcase Event";
      const baseDomain = (payload.domain || "https://events.integratedtechnics.com").replace(/\/+$/, "");
      const template = (payload.template_config || {}) as any;
      const primaryColor = template.primaryColor || '#ea580c';
      const secondaryColor = template.secondaryColor || '#1e293b';
      const bgColor = template.backgroundColor || '#070b14';
      const textColor = template.textColor || '#f8fafc';
      const headerText = template.headerText || 'Integrated Technics';
      const headerSubtext = template.headerSubtext || 'التقنيات المتكاملة &bull; Events Gateway';
      const footerText = template.footerText || 'Integrated Technics Events &bull; Official Registration Confirmation';
      const buttonText = template.buttonText || "View Event Details";
      const buttonUrl = template.buttonUrl || `${baseDomain}/#events`;

      let logoUrl = template.logoUrl;
      if (!logoUrl || logoUrl === "/logo.png") {
        logoUrl = `${baseDomain}/logo.png`;
      } else if (logoUrl.startsWith("/")) {
        logoUrl = `${baseDomain}${logoUrl}`;
      }

      let rawBody = template.bodyText || 'Thank you for registering for {eventTitle}, {recipientName}. Your registration is confirmed. We look forward to seeing you at the event.';
      const cleanBodyText = rawBody
        .replace(/{recipientName}/g, recipientName)
        .replace(/{eventTitle}/g, eventTitle)
        .replace(/^\s*Dear\s+[^,\n]+,\s*/i, '')
        .trim()
        .replace(/\n/g, '<br />');

      subject = `Registration Received — ${eventTitle}`;
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
                      ✦ REGISTRATION CONFIRMED
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

          <!-- Salutation & Body Content -->
          <tr>
            <td style="padding: 28px 36px 16px 36px; color: #e2e8f0; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #ffffff;">Dear <strong>${recipientName}</strong>,</p>
              <div style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                ${cleanBodyText}
              </div>

              <div style="margin: 20px 0 16px; padding: 18px 20px; background-color: ${bgColor}; border: 1px solid ${primaryColor}40; border-radius: 14px; border-left: 4px solid ${primaryColor};">
                <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: ${primaryColor};">For Inquiries & Support:</p>
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #ffffff; font-weight: 600;">
                  📞 <span style="color: #ffffff; text-decoration: none;">+201212777570</span>
                </p>
                <p style="margin: 0; font-size: 13px; color: ${primaryColor}; font-weight: 600;">
                  ✉️ <a href="mailto:Event@integratedtechnics.com" style="color: ${primaryColor}; text-decoration: none;">Event@integratedtechnics.com</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- ACTION BUTTON -->
          <tr>
            <td style="padding: 6px 36px 32px 36px;" align="center">
              <table cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 14px;">
                    <a href="${buttonUrl}" style="display: inline-block; padding: 16px 36px; background: ${primaryColor}; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 20px -5px ${primaryColor}80;">
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

