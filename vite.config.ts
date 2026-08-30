import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import QRCode from "qrcode";

// SMTP credentials come from environment variables only — never commit them.
// Define them in a local `.env` file (see `.env.example`) or the host's env config.
const SMTP = {
  host: process.env["SMTP_HOST"] || "",
  port: Number(process.env["SMTP_PORT"] || 465),
  user: process.env["SMTP_USER"] || "",
  pass: process.env["SMTP_PASS"] || "",
  fromEmail: process.env["SMTP_FROM_EMAIL"] || process.env["SMTP_USER"] || "",
  fromName: process.env["SMTP_FROM_NAME"] || "Integrated Technics Events",
};

const smtpConfigError =
  "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in your environment (.env).";


function smtpServerPlugin(): Plugin {
  return {
    name: "smtp-server-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Set Enterprise Security Headers on all HTTP responses
        res.setHeader("X-Frame-Options", "SAMEORIGIN");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-XSS-Protection", "1; mode=block");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=(), usb=()");

        if (req.method === "POST" && req.url === "/api/test-smtp") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", async () => {
            try {
              const data = JSON.parse(body || "{}");
              const host = data.host || SMTP.host;
              const port = Number(data.port) || SMTP.port;
              const user = data.username || SMTP.user;
              const pass = data.password || SMTP.pass;
              const fromEmail = data.from_email || SMTP.fromEmail || user;
              const fromName = data.from_name || SMTP.fromName;
              const to = data.recipient_email;

              if (!host || !user || !pass) {
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: smtpConfigError }));
                return;
              }
              if (!to) {
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: "Missing recipient email" }));
                return;
              }


              const logoPath = path.resolve("public/logo.png");
              const hasLogo = fs.existsSync(logoPath);

              const transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
                tls: { rejectUnauthorized: false },
              });

              const attachments: any[] = [];
              if (hasLogo) {
                attachments.push({
                  filename: "logo.png",
                  path: logoPath,
                  cid: "intlogo",
                });
              }

              const info = await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to,
                subject: "INT Events Platform — SMTP Handshake & Delivery Test",
                text: `Hello,\n\nThis is an authentic test message sent from Integrated Technics Events Platform via ${host}:${port}.\n\nTimestamp: ${new Date().toISOString()}`,
                attachments,
                html: `
                  <!DOCTYPE html>
                  <html lang="en">
                  <head>
                    <meta charset="utf-8">
                    <title>SMTP Verification</title>
                  </head>
                  <body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1120; padding: 32px 12px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%" style="max-width: 580px; background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                            <tr>
                              <td style="padding: 24px 28px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #ea580c 100%); border-bottom: 1px solid #334155;">
                                <table width="100%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td width="48" style="vertical-align: middle;">
                                      ${hasLogo ? `<img src="cid:intlogo" alt="INT Logo" width="44" height="44" style="display: block; border-radius: 10px; background: #ffffff; padding: 2px;" />` : ""}
                                    </td>
                                    <td style="padding-left: 14px; vertical-align: middle;">
                                      <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800;">Integrated Technics</h2>
                                      <p style="margin: 2px 0 0 0; color: #f37021; font-size: 12px; font-weight: 600;">التقنيات المتكاملة &bull; Events Gateway</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 28px; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
                                <p style="margin: 0 0 16px 0; color: #10b981; font-size: 16px; font-weight: 700;">✓ Live SMTP Handshake Verified</p>
                                <p style="margin: 0 0 20px 0; color: #94a3b8;">
                                  This email confirms that your outgoing Bluehost SMTP gateway is actively authenticating and dispatching production messages through <strong>${host}:${port}</strong>.
                                </p>
                                <div style="padding: 16px; background-color: #1e293b; border-radius: 12px; border-left: 4px solid #f37021; font-size: 13px;">
                                  <p style="margin: 0 0 6px 0; color: #e2e8f0;"><strong>Sender:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
                                  <p style="margin: 0 0 6px 0; color: #e2e8f0;"><strong>Recipient:</strong> ${to}</p>
                                  <p style="margin: 0; color: #e2e8f0;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 18px 28px; background-color: #090e1a; border-top: 1px solid #1e293b; color: #64748b; font-size: 11px; text-align: center;">
                                Integrated Technics Events &bull; Developer: <a href="https://odooteams.com" style="color: #f37021; text-decoration: none;">Mr. Hafez Rahim</a>
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
              const host = data.host || SMTP.host;
              const port = Number(data.port) || SMTP.port;
              const user = data.username || SMTP.user;
              const pass = data.password || SMTP.pass;
              const fromEmail = data.from_email || SMTP.fromEmail || user;
              const fromName = data.from_name || SMTP.fromName;
              const recipientName = data.recipient_name || "Valued Guest";
              const recipientEmail = data.recipient_email;

              if (!host || !user || !pass) {
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: smtpConfigError }));
                return;
              }

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

              const logoPath = path.resolve("public/logo.png");
              const hasLogo = fs.existsSync(logoPath);

              const transporter = nodemailer.createTransport({
                host,
                port,
                secure: true,
                auth: { user, pass },
                tls: { rejectUnauthorized: false },
              });

              const attachments: any[] = [];
              if (hasLogo) {
                attachments.push({
                  filename: "logo.png",
                  path: logoPath,
                  cid: "intlogo",
                });
              }

              const template = (data.template_config || {}) as any;
              const primaryColor = template.primaryColor || '#f37021';
              const secondaryColor = template.secondaryColor || '#1e293b';
              const bgColor = template.backgroundColor || '#070b14';
              const textColor = template.textColor || '#f8fafc';
              const headerText = template.headerText || 'Integrated Technics';
              const headerSubtext = template.headerSubtext || 'التقنيات المتكاملة &bull; Enterprise Technology Summits';
              const bodyText = (template.bodyText || 'On behalf of the Executive Committee of <strong>Integrated Technics</strong>, we have the distinct honor of cordially inviting you as our distinguished delegate to attend <strong style="color: ' + primaryColor + ';">${eventTitle}</strong>.').replace('{recipientName}', recipientName);
              const footerText = template.footerText || 'Integrated Technics Events';
              const buttonText = template.buttonText || 'Confirm Attendance';
              const finalLogoUrl = template.logoUrl || (hasLogo ? "cid:intlogo" : null);

              const info = await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: recipientEmail,
                subject: `Official VIP Invitation & Digital Pass: ${eventTitle}`,
                text: `Dear ${recipientName},\n\nYou are cordially invited to attend ${eventTitle}.\n\nDate: ${eventDate}\nVenue: ${eventLocation}\nPass Token: ${token}\n\nRegister & Claim Pass: ${registerUrl}\n\nWarm regards,\nIntegrated Technics Events Team`,
                attachments,
                html: `
                  <!DOCTYPE html>
                  <html lang="en">
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Official VIP Invitation — ${eventTitle}</title>
                  </head>
                  <body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${textColor};">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${bgColor}; padding: 32px 12px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%" style="max-width: 640px; background: ${secondaryColor}; border: 1px solid ${secondaryColor}; border-radius: 28px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);">
                            
                            <!-- Top Brand Banner with Embedded CID Logo -->
                            <tr>
                              <td style="padding: 32px 36px 26px 36px; background: linear-gradient(135deg, ${secondaryColor} 0%, ${secondaryColor} 50%, ${primaryColor} 120%); border-bottom: 1px solid ${secondaryColor};">
                                <table width="100%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td width="64" style="vertical-align: middle;">
                                      <div style="background: #ffffff; padding: 4px; border-radius: 14px; box-shadow: 0 8px 16px rgba(0,0,0,0.3); display: inline-block;">
                                        ${finalLogoUrl ? `<img src="${finalLogoUrl}" alt="Logo" width="56" height="56" style="display: block; border-radius: 10px; object-fit: contain;" />` : `<div style="width: 56px; height: 56px; background: ${primaryColor}; border-radius: 10px; text-align: center; line-height: 56px; color: #fff; font-weight: bold; font-size: 20px;">INT</div>`}
                                      </div>
                                    </td>
                                    <td style="padding-left: 16px; vertical-align: middle;">
                                      <div style="display: inline-block; padding: 4px 12px; background: ${primaryColor}29; border: 1px solid ${primaryColor}66; border-radius: 100px; color: ${primaryColor}; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
                                        ✦ VIP OFFICIAL INVITATION
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
                                <p style="margin: 0 0 10px 0; font-size: 16px;">Dear <strong style="color: #ffffff;">${recipientName}</strong>,</p>
                                <p style="margin: 0; color: ${textColor}80;">
                                  ${footerText}
                                </p>
                              </td>
                            </tr>

                            <!-- ULTRA-LUXURY DIGITAL PASS CARD -->
                            <tr>
                              <td style="padding: 8px 36px 24px 36px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, ${secondaryColor} 0%, ${bgColor} 100%); border: 2px solid ${primaryColor}; border-radius: 22px; overflow: hidden; box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.5);">
                                  
                                  <!-- Card Top Bar -->
                                  <tr>
                                    <td style="padding: 16px 22px; background: ${primaryColor}1e; border-bottom: 1px dashed ${primaryColor}66;">
                                      <table width="100%" cellspacing="0" cellpadding="0">
                                        <tr>
                                          <td>
                                            <span style="font-size: 9px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: ${primaryColor};">DELEGATION ACCESS PASS</span>
                                            <h2 style="margin: 2px 0 0 0; color: #ffffff; font-size: 16px; font-weight: 800;">${eventTitle}</h2>
                                          </td>
                                          <td align="right" style="vertical-align: middle;">
                                            <span style="display: inline-block; padding: 4px 12px; background: ${primaryColor}; border-radius: 6px; color: #ffffff; font-size: 10px; font-weight: 900; letter-spacing: 1px;">
                                              CONFIRMED VIP
                                            </span>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>

                                  <!-- Card Body: QR + Attendee Info -->
                                  <tr>
                                    <td style="padding: 24px;">
                                      <table width="100%" cellspacing="0" cellpadding="0">
                                        <tr>
                                          <!-- QR Code Column -->
                                          <td width="150" align="center" style="vertical-align: middle; padding-right: 20px;">
                                            <div style="background: #ffffff; padding: 8px; border-radius: 14px; box-shadow: 0 10px 20px rgba(0,0,0,0.4); display: inline-block;">
                                              <img src="${qrDataUrl}" alt="Digital Pass QR Code" width="130" height="130" style="display: block; border-radius: 6px;" />
                                            </div>
                                            <span style="display: block; margin-top: 8px; font-size: 9px; font-weight: 800; letter-spacing: 1px; color: #94a3b8; text-transform: uppercase;">
                                              Scan at Gate
                                            </span>
                                          </td>

                                          <!-- Attendee Metadata Column -->
                                          <td style="vertical-align: middle;">
                                            <div style="margin-bottom: 12px;">
                                              <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 700;">Delegate Name</span>
                                              <div style="color: #ffffff; font-size: 17px; font-weight: 800; margin-top: 2px;">${recipientName}</div>
                                              ${data.job_title ? `<div style="color: ${primaryColor}; font-size: 12px; font-weight: 700; margin-top: 1px;">${data.job_title}</div>` : ""}
                                            </div>

                                            ${data.company ? `
                                              <div style="margin-bottom: 12px;">
                                                <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 700;">Organization</span>
                                                <div style="color: #f1f5f9; font-size: 13px; font-weight: 600; margin-top: 1px;">${data.company}</div>
                                              </div>
                                            ` : ""}

                                            <div>
                                              <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 700;">Digital Pass Serial</span>
                                              <div style="font-family: 'Courier New', Courier, monospace; color: ${primaryColor}; font-size: 15px; font-weight: 900; letter-spacing: 2px; margin-top: 2px;">
                                                ${token}
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>

                                  <!-- Card Footer: Schedule & Location -->
                                  <tr>
                                    <td style="padding: 12px 22px; background: rgba(10, 16, 28, 0.9); border-top: 1px solid #1e293b; color: #94a3b8; font-size: 11px;">
                                      <table width="100%" cellspacing="0" cellpadding="0">
                                        <tr>
                                          <td><strong style="color: #e2e8f0;">📅 Date:</strong> ${eventDate}</td>
                                          <td align="right"><strong style="color: #e2e8f0;">📍 Venue:</strong> ${eventLocation}</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <!-- VIP DELEGATION PERKS -->
                            <tr>
                              <td style="padding: 0 36px 20px 36px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #131b2c; border: 1px solid #1e293b; border-radius: 16px; padding: 16px 20px;">
                                  <tr>
                                    <td style="color: #cbd5e1; font-size: 12px; line-height: 1.6;">
                                      <span style="display: block; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: ${primaryColor}; margin-bottom: 8px;">
                                        VIP Delegation Benefits Included:
                                      </span>
                                      &bull; Priority Fast-Track Gate Entry with Scannable Pass<br />
                                      &bull; Reserved Executive Keynote & Summit Seating<br />
                                      &bull; Executive Networking Lounge & Refreshment Access<br />
                                      &bull; Verified Digital Attendance Certificate & Materials Kit
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <!-- CALL TO ACTION: DIRECT PASS ACTIVATION & REGISTRATION -->
                            <tr>
                              <td style="padding: 8px 36px 32px 36px;" align="center">
                                <table cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td align="center" style="border-radius: 14px;">
                                      <a href="${registerUrl}" style="display: inline-block; padding: 18px 36px; background: ${primaryColor}; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 20px -5px ${primaryColor}80;">
                                        ${buttonText}
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                                <p style="margin: 14px 0 0 0; color: #64748b; font-size: 11px; word-break: break-all;">
                                  Direct Link: <a href="${registerUrl}" style="color: ${primaryColor}; text-decoration: underline;">${registerUrl}</a>
                                </p>
                              </td>
                            </tr>

                            <!-- Enterprise Footer -->
                            <tr>
                              <td style="padding: 26px 36px; background-color: #080c16; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">
                                <p style="margin: 0 0 4px 0; color: #94a3b8; font-weight: 700;">
                                  Integrated Technics &bull; Event Operations & Protocol
                                </p>
                                <p style="margin: 0 0 10px 0;">
                                  For delegation adjustments or inquiries, contact <a href="mailto:events@integratedtechnics.com" style="color: #f37021; text-decoration: none; font-weight: 600;">events@integratedtechnics.com</a>
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

        if (req.method === "POST" && req.url === "/api/send-pass") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", async () => {
            try {
              const data = JSON.parse(body || "{}");
              const host = data.host || SMTP.host;
              const port = Number(data.port) || SMTP.port;
              const user = data.username || SMTP.user;
              const pass = data.password || SMTP.pass;
              const fromEmail = data.from_email || SMTP.fromEmail || user;
              const fromName = data.from_name || SMTP.fromName;
              const recipientName = data.recipient_name || "Valued Guest";
              const recipientEmail = data.recipient_email;

              if (!host || !user || !pass) {
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: smtpConfigError }));
                return;
              }

              if (!recipientEmail) {
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: "Missing recipient email" }));
                return;
              }

              const eventTitle = data.event_title || "Integrated Technics Showcase 2026";
              const token = data.token || `EVT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
              const jobTitle = data.job_title || "Participant";
              const company = data.company || "Integrated Technics";
              const passImageBase64 = data.pass_image_base64;

              const transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
                tls: { rejectUnauthorized: false },
              });

              const attachments: any[] = [];
              const safeName = recipientName.replace(/[^a-zA-Z0-9_-]/g, "_");

              if (passImageBase64 && passImageBase64.startsWith("data:image")) {
                const base64Data = passImageBase64.replace(/^data:image\/\w+;base64,/, "");
                attachments.push({
                  filename: `${safeName}_ITS2026_Pass.png`,
                  content: Buffer.from(base64Data, "base64"),
                });
              }

              const domain = data.domain || "https://event.integratedtechnics.com";
              const logoPath = path.resolve("public/its-logo.png");
              if (fs.existsSync(logoPath)) {
                attachments.push({
                  filename: "its-logo.png",
                  path: logoPath,
                  cid: "itslogo",
                });
              }

              const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /></head>
              <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#f1f5f9;">
                  <tr><td align="center">
                    <!-- PASS CARD CONTAINER -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:360px;background:#ffffff;border:2px solid #cbd5e1;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.12);text-align:center;">
                      
                      <!-- TOP HEADER -->
                      <tr>
                        <td style="padding:28px 20px 14px;background:#ffffff;text-align:center;">
                          <h1 style="margin:0;font-size:19px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-0.4px;line-height:1.2;font-family:Arial,Helvetica,sans-serif;">
                            INTEGRATED TECHNICS<br/>SHOWCASE 2026
                          </h1>
                        </td>
                      </tr>

                      <!-- CENTER ATTENDEE INFO -->
                      <tr>
                        <td style="padding:20px 20px 22px;background:#ffffff;text-align:center;">
                          <h2 style="margin:0 0 6px;font-size:22px;font-weight:900;color:#111111;text-transform:uppercase;letter-spacing:-0.3px;line-height:1.2;font-family:Arial,Helvetica,sans-serif;">
                            ${recipientName}
                          </h2>
                          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#555555;text-transform:capitalize;line-height:1.2;font-family:Arial,Helvetica,sans-serif;">
                            ${jobTitle}
                          </p>
                          <p style="margin:0;font-size:14px;font-weight:900;color:#f37021;text-transform:uppercase;letter-spacing:0.8px;line-height:1.2;font-family:Arial,Helvetica,sans-serif;">
                            ${company}
                          </p>
                        </td>
                      </tr>

                      <!-- ITS SHOWCASE LOGO -->
                      <tr>
                        <td style="padding:10px 20px 24px;background:#ffffff;text-align:center;">
                          <img src="cid:itslogo" alt="ITS Integrated Technics Showcase" width="160" style="display:inline-block;max-width:160px;height:auto;border:0;" />
                        </td>
                      </tr>

                      <!-- ORANGE FOOTER BAND -->
                      <tr>
                        <td style="background:#f37021;padding:16px 20px;text-align:center;">
                          <p style="margin:0;font-style:italic;font-size:13px;font-weight:700;line-height:1.4;color:#ffffff;font-family:Georgia,serif,Arial;">
                            Integrated Technics Showcase Event<br/>ITS 2026<br/>Full Access Ticket
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- TOKEN & INSTRUCTIONS BELOW CARD -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:360px;margin-top:16px;text-align:center;">
                      <tr><td style="padding:8px;font-size:12px;color:#64748b;">
                        Ticket Token: <strong style="font-family:monospace;color:#1e293b;font-size:13px;">${token}</strong>
                      </td></tr>
                      <tr><td style="padding:4px;font-size:11px;color:#94a3b8;">
                        Integrated Technics &bull; &lt;/&gt; Developed by Mr. Hafez Rahim
                      </td></tr>
                    </table>

                  </td></tr>
                </table>
              </body></html>`;

              const info = await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: recipientEmail,
                subject: `Official Access Pass — ${recipientName} (${eventTitle})`,
                html,
                attachments,
              });

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, messageId: info.messageId, accepted: info.accepted }));
            } catch (err: any) {
              console.error("Pass Email Error:", err);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err?.message || "Failed to send pass email" }));
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
  appType: "spa",
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
  preview: {
    port: 8080,
  },
});
