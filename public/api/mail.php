<?php
/**
 * INT Events — Production Email Dispatcher for hPanel / Apache / PHP Hosting
 * Handles /api/test-smtp, /api/send-invitation, /api/send-pass
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Authorization, X-Client-Info, Apikey, Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(200);
  echo json_encode(["status" => "ok"]);
  exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["success" => false, "error" => "Method not allowed"]);
  exit;
}

$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true) ?: [];

// Default Bluehost credentials if not provided
$defaultHost = "box5517.bluehost.com";
$defaultPort = 465;
$defaultUser = "event@integratedtechnics.com";
$defaultPass = "event786@hafez";

$host = !empty($data["host"]) ? $data["host"] : $defaultHost;
$port = !empty($data["port"]) ? (int) $data["port"] : $defaultPort;
$username = !empty($data["username"]) ? $data["username"] : $defaultUser;
$password = !empty($data["password"]) ? $data["password"] : $defaultPass;
$fromEmail = !empty($data["from_email"]) ? $data["from_email"] : (!empty($data["username"]) ? $data["username"] : $defaultUser);
$fromName = !empty($data["from_name"]) ? $data["from_name"] : "Integrated Technics Events";
$to = !empty($data["recipient_email"]) ? trim($data["recipient_email"]) : "";

if (empty($to)) {
  http_response_code(400);
  echo json_encode(["success" => false, "error" => "Missing recipient email"]);
  exit;
}

$requestUri = $_SERVER["REQUEST_URI"] ?? "";
$redirectUrl = $_SERVER["REDIRECT_URL"] ?? "";

$kind = !empty($data["kind"]) ? $data["kind"] : (!empty($data["type"]) ? $data["type"] : "");

if (empty($kind)) {
  if (strpos($requestUri, "send-confirmation") !== false || strpos($redirectUrl, "send-confirmation") !== false) {
    $kind = "confirmation";
  } elseif (strpos($requestUri, "test-smtp") !== false || strpos($redirectUrl, "test-smtp") !== false) {
    $kind = "test";
  } elseif (strpos($requestUri, "send-pass") !== false || strpos($redirectUrl, "send-pass") !== false) {
    $kind = "pass";
  } else {
    $kind = "invitation";
  }
}

$subject = "";
$html = "";

if ($kind === "confirmation") {
  $recipientName = !empty($data["recipient_name"]) ? htmlspecialchars($data["recipient_name"]) : "Valued Guest";
  $eventTitle = !empty($data["event_title"]) ? htmlspecialchars($data["event_title"]) : "Integrated Technics Showcase Event";
  $eventDate = !empty($data["event_date"]) ? htmlspecialchars($data["event_date"]) : "Event Schedule Announced Soon";
  $eventLocation = !empty($data["event_location"]) ? htmlspecialchars($data["event_location"]) : "Integrated Technics Operations Center";
  $token = !empty($data["token"]) ? htmlspecialchars($data["token"]) : "REG-" . strtoupper(bin2hex(random_bytes(3)));
  $domain = !empty($data["domain"]) ? rtrim($data["domain"], "/") : "https://events.integratedtechnics.com";

  $template = $data["template_config"] ?? [];
  $primaryColor = !empty($template["primaryColor"]) ? $template["primaryColor"] : "#ea580c";
  $secondaryColor = !empty($template["secondaryColor"]) ? $template["secondaryColor"] : "#1e293b";
  $bgColor = !empty($template["backgroundColor"]) ? $template["backgroundColor"] : "#070b14";
  $textColor = !empty($template["textColor"]) ? $template["textColor"] : "#f8fafc";
  $headerText = !empty($template["headerText"]) ? $template["headerText"] : "Integrated Technics";
  $headerSubtext = !empty($template["headerSubtext"]) ? $template["headerSubtext"] : "التقنيات المتكاملة &bull; Events Gateway";
  $footerText = !empty($template["footerText"]) ? $template["footerText"] : "Integrated Technics Events &bull; Official Registration Confirmation";

  $rawBody = !empty($template["bodyText"]) ? $template["bodyText"] : "Thank you for registering for {eventTitle}, {recipientName}. Your registration is confirmed. We look forward to seeing you at the event.";
  $rawBody = str_replace("{recipientName}", $recipientName, $rawBody);
  $rawBody = str_replace("{eventTitle}", $eventTitle, $rawBody);
  $cleanBodyText = preg_replace('/^\s*Dear\s+[^,\n]+,\s*/i', '', $rawBody);
  $cleanBodyText = nl2br(trim($cleanBodyText));

  $logoUrl = !empty($template["logoUrl"]) && $template["logoUrl"] !== "/logo.png" ? $template["logoUrl"] : "{$domain}/logo.png";
  if (strpos($logoUrl, "http") !== 0) {
    $logoUrl = "{$domain}/" . ltrim($logoUrl, "/");
  }

  $buttonText = !empty($template["buttonText"]) ? $template["buttonText"] : "View Event Details";
  $buttonUrl = !empty($template["buttonUrl"]) ? $template["buttonUrl"] : "{$domain}/#events";

  $subject = "Registration Received — {$eventTitle}";

  $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: {$bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: {$textColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: {$bgColor}; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 640px; background: {$secondaryColor}; border: 1px solid {$secondaryColor}; border-radius: 28px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);">
          
          <!-- Top Brand Banner with Logo -->
          <tr>
            <td style="padding: 32px 36px 26px 36px; background: linear-gradient(135deg, {$secondaryColor} 0%, {$secondaryColor} 50%, {$primaryColor} 120%); border-bottom: 1px solid {$secondaryColor};">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="64" style="vertical-align: middle;">
                    <div style="background: #ffffff; padding: 4px; border-radius: 14px; box-shadow: 0 8px 16px rgba(0,0,0,0.3); display: inline-block;">
                      <img src="{$logoUrl}" alt="INT Logo" width="56" height="56" style="display: block; border-radius: 10px; object-fit: contain; width: 56px; height: 56px;" />
                    </div>
                  </td>
                  <td style="padding-left: 16px; vertical-align: middle;">
                    <div style="display: inline-block; padding: 4px 12px; background: {$primaryColor}29; border: 1px solid {$primaryColor}66; border-radius: 100px; color: {$primaryColor}; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
                      ✦ REGISTRATION CONFIRMED
                    </div>
                    <h1 style="margin: 8px 0 2px 0; color: #ffffff; font-size: 22px; font-weight: 900; line-height: 1.2; letter-spacing: -0.5px;">
                      {$headerText}
                    </h1>
                    <p style="margin: 0; color: {$primaryColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                      {$headerSubtext}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Salutation & Body Content -->
          <tr>
            <td style="padding: 28px 36px 16px 36px; color: #e2e8f0; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #ffffff;">Dear <strong>{$recipientName}</strong>,</p>
              <div style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                {$cleanBodyText}
              </div>

              <div style="margin: 20px 0 16px; padding: 18px 20px; background-color: {$bgColor}; border: 1px solid {$primaryColor}40; border-radius: 14px; border-left: 4px solid {$primaryColor};">
                <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: {$primaryColor};">For Inquiries & Support:</p>
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #ffffff; font-weight: 600;">
                  📞 <span style="color: #ffffff; text-decoration: none;">+201212777570</span>
                </p>
                <p style="margin: 0; font-size: 13px; color: {$primaryColor}; font-weight: 600;">
                  ✉️ <a href="mailto:Event@integratedtechnics.com" style="color: {$primaryColor}; text-decoration: none;">Event@integratedtechnics.com</a>
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
                    <a href="{$buttonUrl}" style="display: inline-block; padding: 16px 36px; background: {$primaryColor}; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 20px -5px {$primaryColor}80;">
                      {$buttonText}
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
                {$footerText}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;

} elseif ($kind === "test") {
  $subject = "INT Events Platform — SMTP Handshake & Delivery Test";
  $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>SMTP Test</title></head>
<body style="margin:0;padding:0;background:#0b1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:580px;background:#0f172a;border:1px solid #1e293b;border-radius:20px;overflow:hidden;">
        <tr><td style="padding:24px 28px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#ea580c 100%);border-bottom:1px solid #334155;">
          <h2 style="margin:0;color:#ffffff;font-size:18px;font-weight:800;">Integrated Technics</h2>
          <p style="margin:2px 0 0;color:#f37021;font-size:12px;font-weight:600;">التقنيات المتكاملة &bull; Events Gateway</p>
        </td></tr>
        <tr><td style="padding:28px;color:#e2e8f0;font-size:14px;line-height:1.6;">
          <p style="margin:0 0 16px;color:#10b981;font-size:16px;font-weight:700;">&#10003; Live SMTP Handshake Verified</p>
          <p style="margin:0 0 20px;color:#94a3b8;">Your outgoing SMTP gateway <strong>{$host}:{$port}</strong> authenticated and dispatched this message successfully.</p>
          <div style="padding:16px;background:#1e293b;border-radius:12px;border-left:4px solid #f37021;font-size:13px;">
            <p style="margin:0 0 6px;"><strong>Sender:</strong> {$fromName} &lt;{$fromEmail}&gt;</p>
            <p style="margin:0 0 6px;"><strong>Recipient:</strong> {$to}</p>
            <p style="margin:0;"><strong>Timestamp:</strong> {$data['timestamp']}</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
HTML;
} elseif ($kind === "pass") {
  $recipientName = !empty($data["recipient_name"]) ? htmlspecialchars($data["recipient_name"]) : "Valued Guest";
  $eventTitle = !empty($data["event_title"]) ? htmlspecialchars($data["event_title"]) : "Integrated Technics Showcase 2026";
  $eventDate = !empty($data["event_date"]) ? htmlspecialchars($data["event_date"]) : "Event Schedule Announced Soon";
  $eventLocation = !empty($data["event_location"]) ? htmlspecialchars($data["event_location"]) : "Integrated Technics Operations Center";
  $token = !empty($data["token"]) ? htmlspecialchars($data["token"]) : "EVT-" . strtoupper(bin2hex(random_bytes(3)));
  $jobTitle = !empty($data["job_title"]) ? htmlspecialchars($data["job_title"]) : "Participant";
  $company = !empty($data["company"]) ? htmlspecialchars($data["company"]) : "Integrated Technics";
  $domain = !empty($data["domain"]) ? rtrim($data["domain"], "/") : "https://events.integratedtechnics.com";
  $eventId = !empty($data["event_id"]) ? htmlspecialchars($data["event_id"]) : "";

  $template = $data["template_config"] ?? [];
  $primaryColor = !empty($template["primaryColor"]) ? $template["primaryColor"] : "#10b981";
  $secondaryColor = !empty($template["secondaryColor"]) ? $template["secondaryColor"] : "#1e293b";
  $bgColor = !empty($template["backgroundColor"]) ? $template["backgroundColor"] : "#070b14";
  $textColor = !empty($template["textColor"]) ? $template["textColor"] : "#f8fafc";
  $headerText = !empty($template["headerText"]) ? $template["headerText"] : "Integrated Technics";
  $headerSubtext = !empty($template["headerSubtext"]) ? $template["headerSubtext"] : "التقنيات المتكاملة &bull; Events Gateway";
  $footerText = !empty($template["footerText"]) ? $template["footerText"] : "Integrated Technics Events &bull; Official Digital Pass";
  $buttonText = !empty($template["buttonText"]) ? $template["buttonText"] : "View Your Digital Badge";

  $rawBody = !empty($template["bodyText"]) ? $template["bodyText"] : "Your official event badge and access pass for {eventTitle} is ready, {recipientName}. Please present your digital pass or the attached badge at the entrance for quick access.";
  if (strpos($rawBody, "{eventTitle}") === false && strpos($rawBody, $eventTitle) === false) {
    $rawBody = str_replace("Your event badge is ready", "Your official event badge for {$eventTitle} is ready", $rawBody);
  }
  $rawBody = str_replace("{recipientName}", $recipientName, $rawBody);
  $rawBody = str_replace("{eventTitle}", $eventTitle, $rawBody);
  $cleanBodyText = preg_replace('/^\s*Dear\s+[^,\n]+,\s*/i', '', $rawBody);
  $cleanBodyText = nl2br(trim($cleanBodyText));

  $logoUrl = !empty($template["logoUrl"]) && $template["logoUrl"] !== "/logo.png" ? $template["logoUrl"] : "{$domain}/logo.png";
  if (strpos($logoUrl, "http") !== 0) {
    $logoUrl = "{$domain}/" . ltrim($logoUrl, "/");
  }

  $passPdfUrl = !empty($data["pass_pdf_url"]) ? htmlspecialchars($data["pass_pdf_url"]) : "";
  $myPassesUrl = !empty($template["buttonUrl"]) ? $template["buttonUrl"] : "{$domain}/my-passes";
  $subject = "Official Access Pass — {$recipientName} ({$eventTitle})";

  $downloadButtonHtml = "";
  $badgeButtonPadding = "16px 36px";
  $badgeButtonBg = $primaryColor;
  $badgeButtonBorder = "";
  $badgeButtonShadow = "box-shadow: 0 10px 20px -5px {$primaryColor}80;";
  $badgeHint = "📎 Your printable badge image is also attached to this email.";

  if (!empty($passPdfUrl)) {
    $downloadButtonHtml = '<table cellspacing="0" cellpadding="0" style="margin-bottom: 12px;"><tr><td align="center" style="border-radius: 14px;"><a href="' . $passPdfUrl . '" target="_blank" download style="display: inline-block; padding: 16px 36px; background: ' . $primaryColor . '; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 20px -5px ' . $primaryColor . '80;">📥 Download Official A4 Pass Card (PDF)</a></td></tr></table>';
    $badgeButtonPadding = "13px 30px";
    $badgeButtonBg = "transparent";
    $badgeButtonBorder = "border: 1px solid #475569;";
    $badgeButtonShadow = "";
    $badgeHint = "📄 Click above to view and download your official high-resolution A4 Pass Card (PDF).";
  }

  $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: {$bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: {$textColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: {$bgColor}; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 640px; background: {$secondaryColor}; border: 1px solid {$secondaryColor}; border-radius: 28px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);">
          
          <!-- Top Brand Banner with Logo -->
          <tr>
            <td style="padding: 32px 36px 26px 36px; background: linear-gradient(135deg, {$secondaryColor} 0%, {$secondaryColor} 50%, {$primaryColor} 120%); border-bottom: 1px solid {$secondaryColor};">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="64" style="vertical-align: middle;">
                    <div style="background: #ffffff; padding: 4px; border-radius: 14px; box-shadow: 0 8px 16px rgba(0,0,0,0.3); display: inline-block;">
                      <img src="{$logoUrl}" alt="INT Logo" width="56" height="56" style="display: block; border-radius: 10px; object-fit: contain; width: 56px; height: 56px;" />
                    </div>
                  </td>
                  <td style="padding-left: 16px; vertical-align: middle;">
                    <div style="display: inline-block; padding: 4px 12px; background: {$primaryColor}29; border: 1px solid {$primaryColor}66; border-radius: 100px; color: {$primaryColor}; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
                      ✦ OFFICIAL EVENT BADGE • DIGITAL PASS
                    </div>
                    <h1 style="margin: 8px 0 2px 0; color: #ffffff; font-size: 22px; font-weight: 900; line-height: 1.2; letter-spacing: -0.5px;">
                      {$headerText}
                    </h1>
                    <p style="margin: 0; color: {$primaryColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                      {$headerSubtext}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Salutation & Welcome Note -->
          <tr>
            <td style="padding: 28px 36px 16px 36px; color: #e2e8f0; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #ffffff;">Dear <strong>{$recipientName}</strong>,</p>
              <div style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                {$cleanBodyText}
              </div>
            </td>
          </tr>

          <!-- BADGE PASS DETAILS CARD -->
          <tr>
            <td style="padding: 8px 36px 20px 36px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: {$bgColor}; border: 1px solid {$primaryColor}40; border-radius: 18px; padding: 20px 24px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: {$primaryColor}; font-weight: 800; margin-bottom: 6px;">
                      Event Access Pass
                    </div>
                    <div style="color: #ffffff; font-size: 18px; font-weight: 800; margin-bottom: 14px;">
                      {$eventTitle}
                    </div>

                    <table width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #334155; padding-top: 14px;">
                      <tr>
                        <td style="padding: 4px 0; color: #94a3b8; font-size: 13px;">Delegate Name:</td>
                        <td align="right" style="padding: 4px 0; color: #ffffff; font-weight: 700; font-size: 14px;">{$recipientName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #94a3b8; font-size: 13px;">Designation &amp; Org:</td>
                        <td align="right" style="padding: 4px 0; color: #cbd5e1; font-size: 13px;">{$jobTitle} &bull; {$company}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #94a3b8; font-size: 13px;">Pass Token:</td>
                        <td align="right" style="padding: 4px 0; font-family: monospace; color: {$primaryColor}; font-weight: 800; font-size: 14px; letter-spacing: 1px;">{$token}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #94a3b8; font-size: 13px;">Date &amp; Venue:</td>
                        <td align="right" style="padding: 4px 0; color: #94a3b8; font-size: 12px;">{$eventDate} &bull; {$eventLocation}</td>
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
              {$downloadButtonHtml}
              <table cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 14px;">
                    <a href="{$myPassesUrl}" style="display: inline-block; padding: {$badgeButtonPadding}; background: {$badgeButtonBg}; color: #ffffff; {$badgeButtonBorder} font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; {$badgeButtonShadow}">
                      {$buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 14px 0 0 0; color: #94a3b8; font-size: 12px;">
                {$badgeHint}
              </p>
            </td>
          </tr>

          <!-- Template Footer -->
          <tr>
            <td style="padding: 20px 36px 24px 36px; background-color: #080c16; border-top: 1px solid #1e293b; color: #94a3b8; font-size: 13px; font-weight: 600; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                {$footerText}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
} else {
  $recipientName = !empty($data["recipient_name"]) ? htmlspecialchars($data["recipient_name"]) : "Valued Guest";
  $eventTitle = !empty($data["event_title"]) ? htmlspecialchars($data["event_title"]) : "Integrated Technics Event";
  $eventDate = !empty($data["event_date"]) ? htmlspecialchars($data["event_date"]) : "Event Schedule Announced Soon";
  $eventLocation = !empty($data["event_location"]) ? htmlspecialchars($data["event_location"]) : "Integrated Technics Operations Center";
  $token = !empty($data["token"]) ? htmlspecialchars($data["token"]) : "EVT-INV-" . strtoupper(bin2hex(random_bytes(3)));
  $domain = !empty($data["domain"]) ? rtrim($data["domain"], "/") : "https://event.integratedtechnics.com";
  $eventId = !empty($data["event_id"]) ? htmlspecialchars($data["event_id"]) : "";

  $template = $data["template_config"] ?? [];
  $primaryColor = $template["primaryColor"] ?? "#f37021";
  $secondaryColor = $template["secondaryColor"] ?? "#1e293b";
  $bgColor = $template["backgroundColor"] ?? "#070b14";
  $textColor = $template["textColor"] ?? "#f8fafc";
  $headerText = $template["headerText"] ?? "Integrated Technics";
  $rawBody = $template["bodyText"] ?? "It is our pleasure to extend to you an exclusive VIP invitation to attend {$eventTitle}. Step into an exclusive technology experience designed to showcase the latest innovations, emerging technologies, and intelligent solutions.";
  $rawBody = str_replace("{recipientName}", $recipientName, $rawBody);
  $rawBody = str_replace("{eventTitle}", $eventTitle, $rawBody);
  $cleanBodyText = preg_replace('/^\s*Dear\s+[^,\n]+,\s*/i', '', $rawBody);
  $cleanBodyText = nl2br(trim($cleanBodyText));

  $buttonText = $template["buttonText"] ?? "Register & Book your seat";
  $footerText = $template["footerText"] ?? "Integrated Technics Events";
  $logoUrl = !empty($template["logoUrl"]) ? $template["logoUrl"] : "{$domain}/logo.png";

  $registerUrl = !empty($template["buttonUrl"]) ? $template["buttonUrl"] : "{$domain}/events/" . urlencode($eventId) . "?token=" . urlencode($token) . "&email=" . urlencode($to) . "&name=" . urlencode($recipientName) . "#register";

  $subject = "Official VIP Invitation: {$eventTitle}";

  $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: {$bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: {$textColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: {$bgColor}; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 640px; background: {$secondaryColor}; border: 1px solid {$secondaryColor}; border-radius: 28px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);">
          
          <!-- Top Brand Banner with Logo -->
          <tr>
            <td style="padding: 32px 36px 26px 36px; background: linear-gradient(135deg, {$secondaryColor} 0%, {$secondaryColor} 50%, {$primaryColor} 120%); border-bottom: 1px solid {$secondaryColor};">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="64" style="vertical-align: middle;">
                    <div style="background: #ffffff; padding: 4px; border-radius: 14px; box-shadow: 0 8px 16px rgba(0,0,0,0.3); display: inline-block;">
                      <img src="{$logoUrl}" alt="INT Logo" width="56" height="56" style="display: block; border-radius: 10px; object-fit: contain; width: 56px; height: 56px;" />
                    </div>
                  </td>
                  <td style="padding-left: 16px; vertical-align: middle;">
                    <div style="display: inline-block; padding: 4px 12px; background: {$primaryColor}29; border: 1px solid {$primaryColor}66; border-radius: 100px; color: {$primaryColor}; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
                      ✦ VIP INVITATION
                    </div>
                    <h1 style="margin: 8px 0 2px 0; color: #ffffff; font-size: 22px; font-weight: 900; line-height: 1.2; letter-spacing: -0.5px;">
                      {$headerText}
                    </h1>
                    <p style="margin: 0; color: {$primaryColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                      {$headerSubtext}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Salutation & Welcome Note -->
          <tr>
            <td style="padding: 28px 36px 16px 36px; color: #e2e8f0; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #ffffff;">Dear <strong>{$recipientName}</strong>,</p>
              <div style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                {$cleanBodyText}
              </div>
            </td>
          </tr>

          <!-- Event Details Summary Box -->
          <tr>
            <td style="padding: 8px 36px 20px 36px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: {$bgColor}; border: 1px solid {$primaryColor}40; border-radius: 16px; padding: 16px 20px;">
                <tr>
                  <td style="color: #cbd5e1; font-size: 13px;">
                    <table width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td><strong style="color: #ffffff; font-size: 15px;">{$eventTitle}</strong></td>
                      </tr>
                      <tr>
                        <td style="padding-top: 10px; color: #94a3b8; font-size: 12px;">
                          <table width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td>📅 {$eventDate}</td>
                              <td align="right">📍 {$eventLocation}</td>
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
                    <a href="{$registerUrl}" style="display: inline-block; padding: 16px 36px; background: {$primaryColor}; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 20px -5px {$primaryColor}80;">
                      {$buttonText}
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
                {$footerText}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
}

// RFC 5321 compliant SMTP response reader
function readSmtpResponse($socket, &$logs)
{
  $response = "";
  while (!feof($socket)) {
    $line = fgets($socket, 515);
    if ($line === false)
      break;
    $response .= $line;
    $logs[] = "< " . trim($line);
    if (strlen($line) >= 4 && substr($line, 3, 1) === " ") {
      break;
    }
  }
  return $response;
}

function sendSmtpSocket($host, $port, $username, $password, $fromEmail, $fromName, $to, $subject, $html, $attachments = [])
{
  $timeout = 15;
  $logs = [];
  $context = stream_context_create([
    "ssl" => [
      "verify_peer" => false,
      "verify_peer_name" => false,
      "allow_self_signed" => true,
    ],
  ]);

  $hostsToTry = array_unique(array_filter([$host, "box5517.bluehost.com", "localhost", "127.0.0.1"]));
  $socket = null;
  $connectedHost = "";

  foreach ($hostsToTry as $targetHost) {
    $prefix = ($port == 465) ? "ssl://" : "";
    $target = $prefix . $targetHost . ":" . $port;
    $logs[] = "Connecting to {$target}...";

    $socket = @stream_socket_client($target, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);
    if ($socket) {
      $connectedHost = $target;
      $logs[] = "Connected to {$target}";
      break;
    }

    if ($port != 465) {
      $tcpTarget = "tcp://" . $targetHost . ":" . $port;
      $logs[] = "Trying direct TCP to {$tcpTarget}...";
      $socket = @stream_socket_client($tcpTarget, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);
      if ($socket) {
        $connectedHost = $tcpTarget;
        $logs[] = "Connected to {$tcpTarget}";
        break;
      }
    }
    $logs[] = "Failed connecting to {$targetHost}:{$port} ({$errstr})";
  }

  if (!$socket) {
    return ["success" => false, "error" => "Could not connect to SMTP server ({$host}:{$port})", "logs" => $logs];
  }

  stream_set_timeout($socket, 15);

  $banner = readSmtpResponse($socket, $logs);
  if (substr($banner, 0, 3) !== "220") {
    fclose($socket);
    return ["success" => false, "error" => "SMTP banner error: " . trim($banner), "logs" => $logs];
  }

  $serverName = !empty($_SERVER["SERVER_NAME"]) ? $_SERVER["SERVER_NAME"] : "integratedtechnics.com";
  $logs[] = "> EHLO {$serverName}";
  fputs($socket, "EHLO {$serverName}\r\n");
  $ehloResp = readSmtpResponse($socket, $logs);

  $logs[] = "> AUTH LOGIN";
  fputs($socket, "AUTH LOGIN\r\n");
  $authResp = readSmtpResponse($socket, $logs);
  if (substr($authResp, 0, 3) !== "334") {
    fclose($socket);
    return ["success" => false, "error" => "AUTH LOGIN rejected: " . trim($authResp), "logs" => $logs];
  }

  $logs[] = "> [USERNAME]";
  fputs($socket, base64_encode($username) . "\r\n");
  $userResp = readSmtpResponse($socket, $logs);
  if (substr($userResp, 0, 3) !== "334") {
    fclose($socket);
    return ["success" => false, "error" => "Username rejected: " . trim($userResp), "logs" => $logs];
  }

  $logs[] = "> [PASSWORD]";
  fputs($socket, base64_encode($password) . "\r\n");
  $passResp = readSmtpResponse($socket, $logs);
  if (substr($passResp, 0, 3) !== "235") {
    fclose($socket);
    return ["success" => false, "error" => "Password rejected: " . trim($passResp), "logs" => $logs];
  }

  $logs[] = "> MAIL FROM: <{$fromEmail}>";
  fputs($socket, "MAIL FROM: <{$fromEmail}>\r\n");
  $mailFromResp = readSmtpResponse($socket, $logs);
  if (substr($mailFromResp, 0, 3) !== "250") {
    fclose($socket);
    return ["success" => false, "error" => "MAIL FROM rejected: " . trim($mailFromResp), "logs" => $logs];
  }

  $logs[] = "> RCPT TO: <{$to}>";
  fputs($socket, "RCPT TO: <{$to}>\r\n");
  $rcptResp = readSmtpResponse($socket, $logs);
  if (substr($rcptResp, 0, 3) !== "250") {
    fclose($socket);
    return ["success" => false, "error" => "RCPT TO rejected for {$to}: " . trim($rcptResp), "logs" => $logs];
  }

  $logs[] = "> DATA";
  fputs($socket, "DATA\r\n");
  $dataResp = readSmtpResponse($socket, $logs);
  if (substr($dataResp, 0, 3) !== "354") {
    fclose($socket);
    return ["success" => false, "error" => "DATA rejected: " . trim($dataResp), "logs" => $logs];
  }

  $messageId = "INT-" . time() . "-" . bin2hex(random_bytes(4)) . "@" . $serverName;

  $headers = "MIME-Version: 1.0\r\n";
  $headers .= "From: {$fromName} <{$fromEmail}>\r\n";
  $headers .= "Reply-To: {$fromEmail}\r\n";
  $headers .= "To: <{$to}>\r\n";
  $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
  $headers .= "Message-ID: <{$messageId}>\r\n";
  $headers .= "Date: " . date("r") . "\r\n";
  $headers .= "X-Mailer: INT-Events-Platform (cPanel Bluehost)\r\n";

  if (!empty($attachments)) {
    $boundary = "----=_NextPart_" . md5(uniqid((string)time(), true));
    $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";

    $mailBody = $headers . "\r\n";
    $mailBody .= "--{$boundary}\r\n";
    $mailBody .= "Content-Type: text/html; charset=UTF-8\r\n";
    $mailBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $mailBody .= $html . "\r\n\r\n";

    foreach ($attachments as $att) {
      $mailBody .= "--{$boundary}\r\n";
      $mailBody .= "Content-Type: {$att['type']}; name=\"{$att['filename']}\"\r\n";
      $mailBody .= "Content-Disposition: attachment; filename=\"{$att['filename']}\"\r\n";
      $mailBody .= "Content-Transfer-Encoding: base64\r\n\r\n";
      $mailBody .= chunk_split($att['data']) . "\r\n";
    }
    $mailBody .= "--{$boundary}--\r\n";
    $mailBody .= ".\r\n";
  } else {
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $mailBody = $headers . "\r\n" . $html . "\r\n.\r\n";
  }

  fputs($socket, $mailBody);
  $sendResp = readSmtpResponse($socket, $logs);

  fputs($socket, "QUIT\r\n");
  fclose($socket);

  if (substr($sendResp, 0, 3) === "250") {
    return ["success" => true, "messageId" => $messageId, "logs" => $logs];
  } else {
    return ["success" => false, "error" => "Message transmission rejected: " . trim($sendResp), "logs" => $logs];
  }
}

// Prepare attachments if pass_image_base64 is present
$attachments = [];
$passImageBase64 = !empty($data["pass_image_base64"]) ? $data["pass_image_base64"] : "";
if ($kind === "pass" && !empty($passImageBase64)) {
  $rawBase64 = preg_replace('/^data:image\/\w+;base64,/', '', $passImageBase64);
  $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $recipientName ?? 'Attendee');
  $attachments[] = [
    "filename" => "{$safeName}_ITS2026_Pass.png",
    "type" => "image/png",
    "data" => $rawBase64,
  ];
}

// Attempt Authenticated SMTP dispatch
$result = sendSmtpSocket($host, $port, $username, $password, $fromEmail, $fromName, $to, $subject, $html, $attachments);

if ($result["success"]) {
  http_response_code(200);
  echo json_encode(["success" => true, "messageId" => $result["messageId"], "logs" => $result["logs"] ?? []]);
} else {
  http_response_code(500);
  echo json_encode(["success" => false, "error" => $result["error"], "logs" => $result["logs"] ?? []]);
}
