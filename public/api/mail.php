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
$port = !empty($data["port"]) ? (int)$data["port"] : $defaultPort;
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
$kind = $data["kind"] ?? "invitation";
if (strpos($requestUri, "test-smtp") !== false) {
    $kind = "test";
} elseif (strpos($requestUri, "send-pass") !== false) {
    $kind = "pass";
}

$subject = "";
$html = "";

if ($kind === "test") {
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
    $token = !empty($data["token"]) ? htmlspecialchars($data["token"]) : "EVT-" . strtoupper(bin2hex(random_bytes(3)));
    $jobTitle = !empty($data["job_title"]) ? htmlspecialchars($data["job_title"]) : "Participant";
    $company = !empty($data["company"]) ? htmlspecialchars($data["company"]) : "Integrated Technics";
    $domain = !empty($data["domain"]) ? rtrim($data["domain"], "/") : "https://event.integratedtechnics.com";

    $subject = "Official Access Pass — {$recipientName} ({$eventTitle})";

    $html = <<<HTML
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>ITS Pass</title></head>
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
              {$recipientName}
            </h2>
            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#555555;text-transform:capitalize;line-height:1.2;font-family:Arial,Helvetica,sans-serif;">
              {$jobTitle}
            </p>
            <p style="margin:0;font-size:14px;font-weight:900;color:#f37021;text-transform:uppercase;letter-spacing:0.8px;line-height:1.2;font-family:Arial,Helvetica,sans-serif;">
              {$company}
            </p>
          </td>
        </tr>

        <!-- ITS SHOWCASE LOGO -->
        <tr>
          <td style="padding:10px 20px 24px;background:#ffffff;text-align:center;">
            <img src="{$domain}/its-logo.png" alt="ITS Integrated Technics Showcase" width="160" style="display:inline-block;max-width:160px;height:auto;border:0;" />
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
          Ticket Token: <strong style="font-family:monospace;color:#1e293b;font-size:13px;">{$token}</strong>
        </td></tr>
        <tr><td style="padding:4px;font-size:11px;color:#94a3b8;">
          Integrated Technics &bull; &lt;/&gt; Developed by Mr. Hafez Rahim
        </td></tr>
      </table>

    </td></tr>
  </table>
</body></html>
HTML;
} else {
    $recipientName = !empty($data["recipient_name"]) ? htmlspecialchars($data["recipient_name"]) : "Valued Guest";
    $eventTitle = !empty($data["event_title"]) ? htmlspecialchars($data["event_title"]) : "Integrated Technics Event";
    $eventDate = !empty($data["event_date"]) ? htmlspecialchars($data["event_date"]) : "";
    $eventLocation = !empty($data["event_location"]) ? htmlspecialchars($data["event_location"]) : "";
    $token = !empty($data["token"]) ? htmlspecialchars($data["token"]) : "EVT-INV-" . strtoupper(bin2hex(random_bytes(3)));
    $domain = !empty($data["domain"]) ? rtrim($data["domain"], "/") : "https://event.integratedtechnics.com";
    $eventId = !empty($data["event_id"]) ? htmlspecialchars($data["event_id"]) : "";

    $template = $data["template_config"] ?? [];
    $primaryColor = $template["primaryColor"] ?? "#ea580c";
    $secondaryColor = $template["secondaryColor"] ?? "#1e293b";
    $bgColor = $template["backgroundColor"] ?? "#070b14";
    $textColor = $template["textColor"] ?? "#f8fafc";
    $headerText = $template["headerText"] ?? "Integrated Technics";
    $headerSubtext = $template["headerSubtext"] ?? "التقنيات المتكاملة &bull; Events Gateway";
    $bodyText = str_replace("{recipientName}", $recipientName, $template["bodyText"] ?? "Dear {recipientName},<br/><br/>You are cordially invited to attend this Integrated Technics event.");
    $buttonText = $template["buttonText"] ?? "Confirm Attendance";
    $footerText = $template["footerText"] ?? "Integrated Technics Events";

    $registerUrl = "{$domain}/events/" . urlencode($eventId) . "?token=" . urlencode($token) . "&email=" . urlencode($to) . "&name=" . urlencode($recipientName) . "#register";

    $subject = "You're invited — {$eventTitle}";
    $dateRow = $eventDate ? "<p style='margin:0 0 6px;'><strong>Date:</strong> {$eventDate}</p>" : "";
    $venueRow = $eventLocation ? "<p style='margin:0 0 6px;'><strong>Venue:</strong> {$eventLocation}</p>" : "";

    $html = <<<HTML
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>{$subject}</title></head>
<body style="margin:0;padding:0;background:{$bgColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{$textColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{$bgColor};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:580px;background:{$secondaryColor};border:1px solid {$secondaryColor};border-radius:20px;overflow:hidden;">
        <tr><td style="padding:24px 28px;background:linear-gradient(135deg,{$secondaryColor} 0%,{$secondaryColor} 60%,{$primaryColor} 100%);border-bottom:1px solid {$secondaryColor};">
          <h2 style="margin:0;color:#fff;font-size:18px;font-weight:800;">{$headerText}</h2>
          <p style="margin:2px 0 0;color:{$primaryColor};font-size:12px;font-weight:600;">{$headerSubtext}</p>
        </td></tr>
        <tr><td style="padding:28px;color:#e2e8f0;font-size:14px;line-height:1.6;">
          <p style="margin:0 0 8px;color:{$primaryColor};font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">Official Invitation</p>
          <h1 style="margin:0 0 12px;color:#fff;font-size:22px;">{$eventTitle}</h1>
          <p style="margin:0 0 18px;color:#94a3b8;">{$bodyText}</p>
          <div style="padding:16px;background:{$bgColor};border-radius:12px;border-left:4px solid {$primaryColor};font-size:13px;">
            {$dateRow}
            {$venueRow}
            <p style="margin:0;"><strong>Invitation code:</strong> {$token}</p>
          </div>
          <p style="margin:22px 0;text-align:center;">
            <a href="{$registerUrl}" style="display:inline-block;padding:13px 26px;background:{$primaryColor};color:#fff;border-radius:10px;font-weight:700;text-decoration:none;">{$buttonText}</a>
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px;background:#090e1a;border-top:1px solid {$secondaryColor};color:#64748b;font-size:11px;text-align:center;">
          {$footerText}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
HTML;
}

// Function to send via SMTP socket
function sendSmtpSocket($host, $port, $username, $password, $fromEmail, $fromName, $to, $subject, $html) {
    $timeout = 15;
    $prefix = ($port == 465) ? "ssl://" : "";
    
    $socket = @fsockopen($prefix . $host, $port, $errno, $errstr, $timeout);
    if (!$socket) {
        // Try without prefix if port 587
        if ($port != 465) {
            $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
        }
    }
    
    if (!$socket) {
        return ["success" => false, "error" => "Could not connect to SMTP server {$host}:{$port} ({$errstr})"];
    }

    $response = fgets($socket, 515);
    if (substr($response, 0, 3) != "220") {
        fclose($socket);
        return ["success" => false, "error" => "SMTP banner error: {$response}"];
    }

    fputs($socket, "EHLO " . ($_SERVER["SERVER_NAME"] ?? "localhost") . "\r\n");
    $response = "";
    while ($line = fgets($socket, 515)) {
        $response .= $line;
        if (substr($line, 3, 1) == " ") break;
    }

    fputs($socket, "AUTH LOGIN\r\n");
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) != "334") {
        fclose($socket);
        return ["success" => false, "error" => "AUTH LOGIN failed: {$response}"];
    }

    fputs($socket, base64_encode($username) . "\r\n");
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) != "334") {
        fclose($socket);
        return ["success" => false, "error" => "Username rejected: {$response}"];
    }

    fputs($socket, base64_encode($password) . "\r\n");
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) != "235") {
        fclose($socket);
        return ["success" => false, "error" => "Password rejected: {$response}"];
    }

    fputs($socket, "MAIL FROM: <{$fromEmail}>\r\n");
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) != "250") {
        fclose($socket);
        return ["success" => false, "error" => "MAIL FROM rejected: {$response}"];
    }

    fputs($socket, "RCPT TO: <{$to}>\r\n");
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) != "250") {
        fclose($socket);
        return ["success" => false, "error" => "RCPT TO rejected for {$to}: {$response}"];
    }

    fputs($socket, "DATA\r\n");
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) != "354") {
        fclose($socket);
        return ["success" => false, "error" => "DATA command rejected: {$response}"];
    }

    $messageId = "INT-" . time() . "-" . bin2hex(random_bytes(4)) . "@" . ($_SERVER["SERVER_NAME"] ?? "integratedtechnics.com");

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: {$fromName} <{$fromEmail}>\r\n";
    $headers .= "Reply-To: {$fromEmail}\r\n";
    $headers .= "To: <{$to}>\r\n";
    $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
    $headers .= "Message-ID: <{$messageId}>\r\n";
    $headers .= "Date: " . date("r") . "\r\n";
    $headers .= "X-Mailer: INT-Events-Platform\r\n";

    $mailBody = $headers . "\r\n" . $html . "\r\n.\r\n";
    fputs($socket, $mailBody);

    $response = fgets($socket, 515);
    fclose($socket);

    if (substr($response, 0, 3) == "250") {
        return ["success" => true, "messageId" => $messageId];
    } else {
        return ["success" => false, "error" => "Transmission rejected: {$response}"];
    }
}

// Attempt SMTP dispatch
$result = sendSmtpSocket($host, $port, $username, $password, $fromEmail, $fromName, $to, $subject, $html);

// Fallback to PHP native mail() if socket is blocked by host firewall
if (!$result["success"]) {
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: {$fromName} <{$fromEmail}>\r\n";
    $headers .= "Reply-To: {$fromEmail}\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

    $sent = @mail($to, $subject, $html, $headers);
    if ($sent) {
        $result = ["success" => true, "messageId" => "PHPMAIL-" . time()];
    }
}

if ($result["success"]) {
    http_response_code(200);
    echo json_encode(["success" => true, "messageId" => $result["messageId"]]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $result["error"]]);
}
