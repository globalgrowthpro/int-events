import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";
import nodemailer from "nodemailer";

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
              const eventTitle = data.event_title || "INT Security Technology Summit 2026";
              const token = data.token || `EVT-INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

              if (!recipientEmail) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing recipient email" }));
                return;
              }

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
                subject: `Official Invitation: ${eventTitle}`,
                text: `Dear ${recipientName},\n\nYou are cordially invited to attend ${eventTitle} hosted by Integrated Technics.\n\nYour Pass Token: ${token}\n\nWe look forward to welcoming you.\n\nIntegrated Technics Events Team`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <div style="margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px;">
                      <h2 style="margin: 0; color: #0f172a; font-size: 22px;">Integrated Technics</h2>
                      <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Official Event Invitation</p>
                    </div>

                    <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
                      Dear <strong>${recipientName}</strong>,
                    </p>
                    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                      You are cordially invited to participate in <strong>${eventTitle}</strong> hosted by Integrated Technics.
                    </p>

                    <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-radius: 12px; border: 1px solid #bbf7d0;">
                      <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #15803d; font-weight: bold;">
                        Digital Attendance Pass
                      </p>
                      <p style="margin: 8px 0 0 0; font-family: monospace; font-size: 20px; font-weight: bold; color: #166534; letter-spacing: 2px;">
                        ${token}
                      </p>
                      ${data.company ? `<p style="margin: 6px 0 0 0; font-size: 12px; color: #166534;">Organization: <strong>${data.company}</strong></p>` : ""}
                    </div>

                    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                      Please present this pass token upon arrival at the reception desk to claim your official badge.
                    </p>

                    <div style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 12px; color: #64748b;">
                      <p style="margin: 0;">Warm regards,</p>
                      <p style="margin: 4px 0 0 0; font-weight: bold; color: #0f172a;">Integrated Technics Event Management</p>
                      <p style="margin: 4px 0 0 0;"><a href="https://integratedtechnics.com" style="color: #2563eb; text-decoration: none;">integratedtechnics.com</a> &bull; events@integratedtechnics.com</p>
                    </div>
                  </div>
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
