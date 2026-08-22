import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";
import nodemailer from "nodemailer";
import QRCode from "qrcode";

function smtpServerPlugin(): Plugin {
  return {
    name: "smtp-server-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "POST" && req.url === "/api/test-smtp") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", async () => {
            try {
              const data = JSON.parse(body || "{}");
              const host = data.host || "box5517.bluehost.com";
              const port = Number(data.port) || 465;
              const user = data.username || "event@integratedtechnics.com";
              const pass = data.password || "event786@hafez";
              const fromEmail = data.from_email || "event@integratedtechnics.com";
              const fromName = data.from_name || "Integrated Technics Events";
              const to = data.recipient_email || "h.rahim@integratedtechnics.com";

              const transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
                tls: { rejectUnauthorized: false },
              });

              const info = await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to,
                subject: "INT Events Platform — SMTP Handshake & Delivery Test",
                text: `Hello,\n\nThis is an authentic test message sent from Integrated Technics Events Platform via ${host}:${port}.\n\nTimestamp: ${new Date().toISOString()}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
                      <h2 style="margin: 0; color: #0f172a; font-size: 20px;">Integrated Technics Events</h2>
                    </div>
                    <p style="color: #059669; font-weight: bold; font-size: 16px; margin-top: 0;">✓ Real SMTP Mail Delivery Verified</p>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                      This test message confirms that your SMTP gateway is actively authenticating and dispatching emails through <strong>${host}:${port}</strong>.
                    </p>
                    <div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #2563eb;">
                      <p style="margin: 0; font-size: 13px; color: #1e293b;"><strong>Sender:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
                      <p style="margin: 6px 0 0 0; font-size: 13px; color: #1e293b;"><strong>Recipient:</strong> ${to}</p>
                      <p style="margin: 6px 0 0 0; font-size: 13px; color: #1e293b;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                      Integrated Technics Platform &bull; Automated System Verification
                    </p>
                  </div>
                `,
              });

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, messageId: info.messageId, accepted: info.accepted }));
            } catch (err: any) {
              console.error("SMTP Middleware Error:", err);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err?.message || "SMTP transmission error" }));
            }
          });
          return;
        }

        if (req.method === "POST" && req.url === "/api/send-invitation") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", async () => {
            try {
              const data = JSON.parse(body || "{}");
              const host = "box5517.bluehost.com";
              const port = 465;
              const user = "event@integratedtechnics.com";
              const pass = "event786@hafez";
              const fromEmail = "event@integratedtechnics.com";
              const fromName = "Integrated Technics Events";
              const recipientName = data.recipient_name || "Valued Guest";
              const recipientEmail = data.recipient_email;
              const eventId = data.event_id || "security-summit-2026";
              const eventTitle = data.event_title || "INT Security Technology Summit 2026";
              const eventDate = data.event_date || "November 14, 2026 • 09:00 AM";
              const eventLocation = data.event_location || "Royal Maxim Palace Kempinski, Cairo";
              const token = data.token || `EVT-INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
              const baseDomain = data.domain || "https://events.integratedtechnics.com";

              if (!recipientEmail) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing recipient email" }));
                return;
              }

              // Build high-converting direct redirect / registration URL
              const registerUrl = `${baseDomain.replace(/\/+$/, "")}/events/${encodeURIComponent(eventId)}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(recipientEmail)}&name=${encodeURIComponent(recipientName)}#register`;

              // Generate scannable QR Code Data URI for the digital pass card
              const qrPayload = JSON.stringify({
                pass_id: token,
                attendee: recipientName,
                company: data.company || "",
                event_id: eventId,
                event_title: eventTitle,
                auth: "INT_OFFICIAL_VERIFIED",
                checkin_url: registerUrl,
              });

              const qrDataUrl = await QRCode.toDataURL(qrPayload, {
                width: 260,
                margin: 1,
                color: {
                  dark: "#0F172A",
                  light: "#FFFFFF",
                },
              });

              const transporter = nodemailer.createTransport({
                host,
                port,
                secure: true,
                auth: { user, pass },
                tls: { rejectUnauthorized: false },
              });

              const info = await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: recipientEmail,
                subject: `Official VIP Invitation & Digital Pass: ${eventTitle}`,
                text: `Dear ${recipientName},\n\nYou are cordially invited to attend ${eventTitle}.\n\nDate: ${eventDate}\nVenue: ${eventLocation}\nPass Token: ${token}\n\nRegister & Claim Pass: ${registerUrl}\n\nWarm regards,\nIntegrated Technics Events Team`,
                html: `
                  <!DOCTYPE html>
                  <html lang="en">
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Official VIP Invitation — ${eventTitle}</title>
                  </head>
                  <body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1120; padding: 32px 12px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%" style="max-width: 620px; background: #0f172a; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                            
                            <!-- Header Banner -->
                            <tr>
                              <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #0a192f 0%, #172a46 60%, #0284c7 100%); border-bottom: 1px solid #334155;">
                                <table width="100%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td>
                                      <div style="display: inline-block; padding: 5px 14px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 100px; color: #38bdf8; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
                                        ✦ VIP DELEGATION PASS
                                      </div>
                                      <h1 style="margin: 16px 0 4px 0; color: #ffffff; font-size: 24px; font-weight: 800; line-height: 1.2; letter-spacing: -0.5px;">
                                        Integrated Technics
                                      </h1>
                                      <p style="margin: 0; color: #94a3b8; font-size: 13px; font-weight: 500;">
                                        Official Event Invitation & VIP Passholder Registration
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <!-- Salutation -->
                            <tr>
                              <td style="padding: 28px 32px 16px 32px; color: #e2e8f0; font-size: 15px; line-height: 1.6;">
                                <p style="margin: 0 0 10px 0; font-size: 16px;">Dear <strong style="color: #ffffff;">${recipientName}</strong>,</p>
                                <p style="margin: 0; color: #cbd5e1;">
                                  We have the pleasure of cordially inviting you as an honored delegate to attend <strong style="color: #38bdf8;">${eventTitle}</strong>.
                                </p>
                              </td>
                            </tr>

                            <!-- DIGITAL PASS CARD -->
                            <tr>
                              <td style="padding: 8px 32px 24px 32px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%); border: 2px solid #38bdf8; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
                                  
                                  <!-- Card Top Bar -->
                                  <tr>
                                    <td style="padding: 16px 20px; background: rgba(56, 189, 248, 0.08); border-bottom: 1px dashed #334155;">
                                      <table width="100%" cellspacing="0" cellpadding="0">
                                        <tr>
                                          <td>
                                            <span style="font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #38bdf8;">DIGITAL PASS HOLDER</span>
                                            <h2 style="margin: 2px 0 0 0; color: #ffffff; font-size: 16px; font-weight: 700;">${eventTitle}</h2>
                                          </td>
                                          <td align="right" style="vertical-align: middle;">
                                            <span style="display: inline-block; padding: 4px 10px; background: #059669; border-radius: 6px; color: #ffffff; font-size: 10px; font-weight: 800; letter-spacing: 1px;">
                                              CONFIRMED VIP
                                            </span>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>

                                  <!-- Card Body: QR + Info -->
                                  <tr>
                                    <td style="padding: 24px;">
                                      <table width="100%" cellspacing="0" cellpadding="0">
                                        <tr>
                                          <!-- QR Column -->
                                          <td width="150" align="center" style="vertical-align: middle; padding-right: 18px;">
                                            <div style="background: #ffffff; padding: 8px; border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.3); display: inline-block;">
                                              <img src="${qrDataUrl}" alt="Pass QR Code" width="130" height="130" style="display: block; border-radius: 6px;" />
                                            </div>
                                            <span style="display: block; margin-top: 8px; font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #94a3b8; text-transform: uppercase;">
                                              Scan at Gate
                                            </span>
                                          </td>

                                          <!-- Metadata Column -->
                                          <td style="vertical-align: middle;">
                                            <div style="margin-bottom: 10px;">
                                              <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600;">Attendee Name</span>
                                              <div style="color: #ffffff; font-size: 16px; font-weight: 700; margin-top: 2px;">${recipientName}</div>
                                              ${data.job_title ? `<div style="color: #38bdf8; font-size: 12px; font-weight: 500;">${data.job_title}</div>` : ""}
                                            </div>

                                            ${data.company ? `
                                              <div style="margin-bottom: 10px;">
                                                <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600;">Organization</span>
                                                <div style="color: #f1f5f9; font-size: 13px; font-weight: 600; margin-top: 1px;">${data.company}</div>
                                              </div>
                                            ` : ""}

                                            <div>
                                              <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600;">Pass ID / Token</span>
                                              <div style="font-family: 'Courier New', Courier, monospace; color: #38bdf8; font-size: 14px; font-weight: 800; letter-spacing: 1.5px; margin-top: 2px;">
                                                ${token}
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>

                                  <!-- Card Location & Date Footer -->
                                  <tr>
                                    <td style="padding: 12px 20px; background: rgba(15, 23, 42, 0.85); border-top: 1px solid #1e293b; color: #94a3b8; font-size: 11px;">
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

                            <!-- MAIN CALL TO ACTION: DIRECT REGISTRATION LINK -->
                            <tr>
                              <td style="padding: 12px 32px 28px 32px;" align="center">
                                <table cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); box-shadow: 0 10px 20px -3px rgba(37, 99, 235, 0.5);">
                                      <a href="${registerUrl}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; letter-spacing: 0.5px;">
                                        Claim Pass & Confirm Registration &rarr;
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                                <p style="margin: 12px 0 0 0; color: #64748b; font-size: 11px; word-break: break-all;">
                                  Direct Link: <a href="${registerUrl}" style="color: #38bdf8; text-decoration: underline;">${registerUrl}</a>
                                </p>
                              </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                              <td style="padding: 24px 32px; background-color: #090e1a; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">
                                <p style="margin: 0 0 4px 0; color: #94a3b8; font-weight: 600;">
                                  Integrated Technics Event Management
                                </p>
                                <p style="margin: 0 0 10px 0;">
                                  Support & Inquiries: <a href="mailto:events@integratedtechnics.com" style="color: #38bdf8; text-decoration: none;">events@integratedtechnics.com</a>
                                </p>
                                <p style="margin: 0; font-size: 10px; color: #475569;">
                                  &copy; 2026 Integrated Technics. All rights reserved. &bull; <a href="https://odooteams.com" style="color: #475569; text-decoration: none;">Developer: Mr. Hafez Rahim</a>
                                </p>
                              </td>
                            </tr>

                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                  </html>
                `,
              });

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, messageId: info.messageId, accepted: info.accepted }));
            } catch (err: any) {
              console.error("Invitation Email Error:", err);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err?.message || "Failed to send email" }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: false,
    }),
    tailwindcss(),
    react(),
    smtpServerPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 8080,
  },
});
