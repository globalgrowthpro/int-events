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
export function cleanWhatsAppNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-\(\)\+\.]/g, "").trim();

  // Remove leading 00 international prefix
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }

  // Handle Egypt mobile numbers starting with 01 (e.g. 010, 011, 012, 015)
  if (/^01[0125]\d{8}$/.test(cleaned)) {
    cleaned = "20" + cleaned.substring(1);
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
