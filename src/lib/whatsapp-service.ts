/**
 * WhatsApp Helper Utilities for INT Events
 * Formats international phone numbers, builds rich markdown messages,
 * and generates WhatsApp Web direct links.
 */

export interface WhatsAppAccommodationPayload {
  recipient_name: string;
  recipient_phone: string;
  building_name?: string | undefined;
  room_type?: string | undefined;
  message?: string | undefined;
}

/**
 * Normalizes phone numbers for WhatsApp.
 * - Strips whitespace, dashes, plus signs, brackets.
 * - If an Egyptian local number starts with '01', converts to '201...'.
 * - Ensures no leading '+' or '00'.
 */
export function cleanWhatsAppNumber(phone: unknown): string {
  if (phone === null || phone === undefined) return "";
  let str = String(phone).trim();
  if (!str) return "";

  // Convert Eastern Arabic and Persian numerals to ASCII digits
  str = str
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));

  // Strip trailing .0 from Excel float numbers e.g. 201012345678.0
  str = str.replace(/\.0+$/, "");

  // Remove non-digit characters
  let cleaned = str.replace(/\D/g, "");

  // Remove leading 00 international prefix
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }

  // Handle Egypt mobile numbers:
  // Starts with 010, 011, 012, 015 (11 digits: e.g. 01012345678 -> 201012345678)
  if (/^01[0125]\d{8}$/.test(cleaned)) {
    cleaned = "20" + cleaned.substring(1);
  }
  // Starts with 10, 11, 12, 15 (10 digits: leading zero lost in Excel -> 201012345678)
  else if (/^1[0125]\d{8}$/.test(cleaned)) {
    cleaned = "20" + cleaned;
  }
  // Handle Saudi mobile numbers:
  // Starts with 05 (10 digits: e.g. 0512345678 -> 966512345678)
  else if (/^05\d{8}$/.test(cleaned)) {
    cleaned = "966" + cleaned.substring(1);
  }
  // Starts with 5 (9 digits: e.g. 512345678 -> 966512345678)
  else if (/^5\d{8}$/.test(cleaned)) {
    cleaned = "966" + cleaned;
  }

  return cleaned;
}

/**
 * Formats a clean, readable WhatsApp message with bolding and emojis.
 */
export function buildAccommodationWhatsAppMessage(payload: WhatsAppAccommodationPayload): string {
  const parts: string[] = [
    `🏨 *Integrated Technics — Accommodation Details -Integrated Technics Showcase Event ITS2026*`,
    ``,
    `Dear *${payload.recipient_name.trim()}*,`,
    `We are pleased to inform you of your accommodation details:`
  ];

  if (payload.building_name?.trim()) {
    parts.push(`📍 *Building:* ${payload.building_name.trim()}`);
  }

  if (payload.room_type?.trim()) {
    parts.push(`🛏️ *Room Type:* ${payload.room_type.trim()}`);
  }

  if (payload.message?.trim()) {
    parts.push(``);
    parts.push(payload.message.trim());
  }

  parts.push(``);
  parts.push(`Best regards,`);
  parts.push(`*Integrated Technics Events Team*`);

  return parts.join("\n");
}

/**
 * Generates the web.whatsapp.com URL with pre-filled message text.
 */
export function getWhatsAppWebUrl(phone: string, text: string): string {
  const cleanPhone = cleanWhatsAppNumber(phone);
  const encoded = encodeURIComponent(text);
  return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
}

/**
 * Fallback to wa.me (works well on both mobile apps and desktop).
 */
export function getWaMeUrl(phone: string, text: string): string {
  const cleanPhone = cleanWhatsAppNumber(phone);
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}
