import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Upload, Send, Square, Loader2, CheckCircle2, XCircle, Clock, ChevronDown, RefreshCw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { sendAccommodationEmail, type AccommodationEmailPayload } from "@/lib/email-service";
import { cleanWhatsAppNumber, buildAccommodationWhatsAppMessage, getWhatsAppWebUrl } from "@/lib/whatsapp-service";
import { PaginationControl } from "@/components/int/pagination-control";

export const Route = createFileRoute("/admin/bulk-mail")({
  component: BulkMailPage,
});

type Row = AccommodationEmailPayload & {
  id?: string;
  recipient_phone?: string | undefined;
  channel?: "email" | "whatsapp" | "both" | undefined;
  status: "queued" | "sending" | "sent" | "failed";
  error?: string | undefined;
  created_at?: string | undefined;
};

const DELAY_MS = 6_000;
const PAGE_SIZE = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const empty = { recipient_name: "", recipient_email: "", recipient_phone: "", message: "", building_name: "", room_type: "" };

function BulkMailPage() {
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [isSingleOpen, setIsSingleOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<Row[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem("int_accommodation_emails");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [running, setRunning] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const stopRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("accommodation_emails")
        .select("id, recipient_name, recipient_email, recipient_phone, channel, building_name, room_type, message, status, error, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      if (data) {
        const formatted: Row[] = data.map((d: any) => ({
          id: d.id,
          recipient_name: d.recipient_name,
          recipient_email: d.recipient_email,
          recipient_phone: d.recipient_phone || "",
          channel: (d.channel as "email" | "whatsapp" | "both") || "email",
          building_name: d.building_name || "",
          room_type: d.room_type || "",
          message: d.message || "",
          status: d.status,
          error: d.error || undefined,
          created_at: d.created_at,
        }));
        setRows(formatted);
        setCurrentPage(1);
        try {
          localStorage.setItem("int_accommodation_emails", JSON.stringify(formatted.slice(0, 500)));
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      console.warn("Could not load accommodation emails history:", e);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function sendSingleAuto() {
    const rawEmail = form.recipient_email.trim();
    const hasEmail = Boolean(rawEmail && EMAIL_RE.test(rawEmail));
    const cleanPhone = cleanWhatsAppNumber(form.recipient_phone);
    const hasPhone = Boolean(cleanPhone && cleanPhone.length >= 8);

    if (!hasEmail && !hasPhone) {
      toast.error("Please enter a valid Email or WhatsApp/Mobile number");
      return;
    }

    const name = form.recipient_name.trim() || (hasEmail ? rawEmail.split("@")[0] : `Guest ${cleanPhone.slice(-4)}`) || "Guest";
    setSending(true);

    let emailSent = false;
    let emailErr: string | undefined;

    // 1. Send Email if provided
    if (hasEmail) {
      const payload = {
        recipient_name: name,
        recipient_email: rawEmail,
        building_name: form.building_name,
        room_type: form.room_type,
        message: form.message,
      };
      const r = await sendAccommodationEmail(payload);
      emailSent = r.success;
      if (!r.success) emailErr = r.error;
    }

    // 2. Open WhatsApp if provided
    if (hasPhone) {
      const msgText = buildAccommodationWhatsAppMessage({
        recipient_name: name,
        recipient_phone: cleanPhone,
        building_name: form.building_name,
        room_type: form.room_type,
        message: form.message,
      });
      const url = getWhatsAppWebUrl(cleanPhone, msgText);
      window.open(url, "_blank");
    }

    setSending(false);
    const nowIso = new Date().toISOString();
    const channel: "email" | "whatsapp" | "both" = hasEmail && hasPhone ? "both" : hasPhone ? "whatsapp" : "email";
    const status = hasEmail ? (emailSent ? "sent" : "failed") : "sent";

    const newRow: Row = {
      recipient_name: name,
      recipient_email: rawEmail,
      recipient_phone: cleanPhone,
      building_name: form.building_name,
      room_type: form.room_type,
      message: form.message,
      channel,
      status,
      error: emailErr,
      created_at: nowIso,
    };

    setRows((rs) => [newRow, ...rs]);

    // Save to database
    try {
      await supabase.from("accommodation_emails").insert({
        recipient_name: name,
        recipient_email: rawEmail || `${name.toLowerCase().replace(/[^a-z0-9]/g, "") || "user"}@whatsapp.guest`,
        recipient_phone: cleanPhone || null,
        channel,
        building_name: form.building_name || null,
        room_type: form.room_type || null,
        message: form.message || null,
        status,
        error: emailErr || null,
        sent_at: status === "sent" ? nowIso : null,
      });
    } catch (err) {
      console.error("Error saving accommodation send to DB:", err);
    }

    if (hasEmail && hasPhone) {
      if (emailSent) {
        toast.success(`Email sent & WhatsApp opened for ${name}`);
        setForm(empty);
      } else {
        toast.warning(`WhatsApp opened, but email failed: ${emailErr || "Unknown error"}`);
      }
    } else if (hasEmail) {
      if (emailSent) {
        toast.success(`Email sent to ${rawEmail}`);
        setForm(empty);
      } else {
        toast.error(emailErr || "Failed to send email");
      }
    } else {
      toast.success(`Opening WhatsApp Web for ${cleanPhone}…`);
      setForm(empty);
    }
  }

  async function sendSingleEmailOnly() {
    const rawEmail = form.recipient_email.trim();
    if (!EMAIL_RE.test(rawEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    const name = form.recipient_name.trim() || rawEmail.split("@")[0] || "Guest";
    setSending(true);
    const payload = {
      recipient_name: name,
      recipient_email: rawEmail,
      building_name: form.building_name,
      room_type: form.room_type,
      message: form.message,
    };
    const r = await sendAccommodationEmail(payload);
    setSending(false);
    const newStatus = r.success ? "sent" : "failed";
    const nowIso = new Date().toISOString();

    setRows((rs) => [
      { ...payload, channel: "email", status: newStatus, error: r.error, created_at: nowIso },
      ...rs,
    ]);

    try {
      await supabase.from("accommodation_emails").insert({
        recipient_name: name,
        recipient_email: rawEmail,
        recipient_phone: form.recipient_phone ? cleanWhatsAppNumber(form.recipient_phone) : null,
        channel: "email",
        building_name: payload.building_name,
        room_type: payload.room_type,
        message: payload.message,
        status: newStatus,
        error: r.error || null,
        sent_at: r.success ? nowIso : null,
      });
    } catch (err) {
      console.error("Error saving accommodation email to DB:", err);
    }

    if (r.success) {
      toast.success(`Email sent to ${rawEmail}`);
      setForm(empty);
    } else {
      toast.error(r.error || "Failed to send");
    }
  }

  function sendSingleWhatsAppOnly() {
    const cleanPhone = cleanWhatsAppNumber(form.recipient_phone);
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error("Enter a valid phone number with country code (e.g. 201001234567)");
      return;
    }
    const name = form.recipient_name.trim() || `Guest ${cleanPhone.slice(-4)}`;

    const msgText = buildAccommodationWhatsAppMessage({
      recipient_name: name,
      recipient_phone: cleanPhone,
      building_name: form.building_name,
      room_type: form.room_type,
      message: form.message,
    });

    const url = getWhatsAppWebUrl(cleanPhone, msgText);
    window.open(url, "_blank");

    const nowIso = new Date().toISOString();
    setRows((rs) => [
      { ...form, recipient_name: name, recipient_phone: cleanPhone, channel: "whatsapp", status: "sent", created_at: nowIso },
      ...rs,
    ]);

    supabase
      .from("accommodation_emails")
      .insert({
        recipient_name: name,
        recipient_email: form.recipient_email || `${name.toLowerCase().replace(/[^a-z0-9]/g, "") || "guest"}@whatsapp.guest`,
        recipient_phone: cleanPhone,
        channel: "whatsapp",
        building_name: form.building_name,
        room_type: form.room_type,
        message: form.message,
        status: "sent",
        sent_at: nowIso,
      })
      .then(({ error }) => {
        if (error) console.error("Error logging whatsapp send:", error);
      });

    toast.success(`Opening WhatsApp Web for ${cleanPhone}…`);
    setForm(empty);
  }

  function openRowInWhatsApp(r: Row, index?: number) {
    const cleanPhone = cleanWhatsAppNumber(r.recipient_phone || "");
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error("No valid phone number for this contact");
      return;
    }
    const msgText = buildAccommodationWhatsAppMessage({
      recipient_name: r.recipient_name,
      recipient_phone: cleanPhone,
      building_name: r.building_name,
      room_type: r.room_type,
      message: r.message,
    });
    const url = getWhatsAppWebUrl(cleanPhone, msgText);
    window.open(url, "_blank");
    toast.success(`Opening WhatsApp Web for ${r.recipient_name || cleanPhone}…`);

    const sentTime = new Date().toISOString();
    if (typeof index === "number") {
      setRows((rs) =>
        rs.map((item, j) =>
          j === index
            ? { ...item, status: "sent", channel: item.recipient_email ? "both" : "whatsapp", created_at: sentTime }
            : item,
        ),
      );
    }

    supabase
      .from("accommodation_emails")
      .insert({
        recipient_name: r.recipient_name || "Guest",
        recipient_email: r.recipient_email || `${(r.recipient_name || "guest").toLowerCase().replace(/[^a-z0-9]/g, "") || "user"}@whatsapp.guest`,
        recipient_phone: cleanPhone,
        channel: r.recipient_email ? "both" : "whatsapp",
        building_name: r.building_name || null,
        room_type: r.room_type || null,
        message: r.message || null,
        status: "sent",
        sent_at: sentTime,
      })
      .then(({ error }) => {
        if (error) console.error("Error logging whatsapp send to DB:", error);
      });
  }

  async function sendRowEmail(r: Row, index: number) {
    const rawEmail = (r.recipient_email || "").trim();
    if (!rawEmail || !EMAIL_RE.test(rawEmail)) {
      toast.error("No valid email address for this recipient");
      return;
    }
    setRows((rs) => rs.map((item, j) => (j === index ? { ...item, status: "sending" } : item)));
    const res = await sendAccommodationEmail({
      recipient_name: r.recipient_name || "Guest",
      recipient_email: rawEmail,
      building_name: r.building_name || "",
      room_type: r.room_type || "",
      message: r.message || "",
    });
    const resStatus = res.success ? "sent" : "failed";
    const sentTime = new Date().toISOString();
    setRows((rs) =>
      rs.map((item, j) =>
        j === index ? { ...item, status: resStatus, error: res.error, created_at: sentTime } : item,
      ),
    );

    if (res.success) {
      toast.success(`Email sent to ${rawEmail}`);
    } else {
      toast.error(res.error || "Failed to send email");
    }

    try {
      await supabase.from("accommodation_emails").insert({
        recipient_name: r.recipient_name || "Guest",
        recipient_email: rawEmail,
        recipient_phone: r.recipient_phone ? cleanWhatsAppNumber(r.recipient_phone) : null,
        channel: r.recipient_phone ? "both" : "email",
        building_name: r.building_name || null,
        room_type: r.room_type || null,
        message: r.message || null,
        status: resStatus,
        error: res.error || null,
        sent_at: res.success ? sentTime : null,
      });
    } catch (err) {
      console.error("Error saving email result to DB:", err);
    }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Name", "Phone", "Email", "Building Name", "Room Type", "Message"],
      ["Hafez Rahim", "201001234567", "hafez@example.com", "Tower A", "Single", "Your accommodation has been confirmed."],
      ["Guest With Phone Only", "201011112222", "", "Tower B", "Double", "Accommodation details sent via WhatsApp."],
      ["Guest With Email Only", "", "guest@example.com", "Tower C", "Suite", "Accommodation details sent via Email."],
    ]);
    ws["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recipients");
    XLSX.writeFile(wb, "accommodation-recipients-template.xlsx");
  }

  function parseSpreadsheet(data: ArrayBuffer): Row[] {
    const wb = XLSX.read(data, { type: "array" });
    if (!wb.SheetNames.length) return [];

    let targetSheet: XLSX.WorkSheet | null = null;
    for (const name of wb.SheetNames) {
      const s = wb.Sheets[name];
      if (s && s["!ref"]) {
        targetSheet = s;
        break;
      }
    }
    if (!targetSheet) targetSheet = wb.Sheets[wb.SheetNames[0]!]!;
    if (!targetSheet) return [];

    const matrix: unknown[][] = XLSX.utils.sheet_to_json(targetSheet, { header: 1, defval: "" });
    if (!matrix || matrix.length === 0) return [];

    const isNameCol = (h: string) =>
      /^(name|full[\s_]?name|guest|guest[\s_]?name|attendee|recipient|client|person|الاسم|اسم|الاسم[\s_]?بالكامل|الاسم[\s_]?الكامل|اسم[\s_]?الضيف|الضيف|المستلم|المشارك)$/i.test(h) ||
      /(name|guest|attendee|اسم|الضيف|المشارك)/i.test(h);

    const isEmailCol = (h: string) =>
      /^(email|e[\-_]?mail|mail|email[\s_]?address|e[\-_]?mail[\s_]?address|البريد|البريد[\s_]?(الإلكتروني|الالكتروني)|الايميل|الإيميل)$/i.test(h) ||
      /(email|e[\-_]?mail|mail|بريد|ايميل)/i.test(h);

    const isPhoneCol = (h: string) =>
      /^(phone|phone[\s_]?number|mobile|mobile[\s_]?number|whatsapp|whats[\s_]?app|whats|tel|telephone|cell|contact|contact[\s_]?number|الهاتف|رقم[\s_]?الهاتف|الموبايل|رقم[\s_]?الموبايل|الواتس|الواتساب|رقم[\s_]?الواتساب|الجوال|رقم[\s_]?الجوال|تليفون|رقم[\s_]?التليفون)$/i.test(h) ||
      /(phone|mobile|whatsapp|whats|tel|cell|هاتف|موبايل|جوال|واتس|تليفون)/i.test(h);

    const isBuildingCol = (h: string) =>
      /^(building|building[\s_]?name|hotel|hotel[\s_]?name|accommodation|place|residence|tower|المبنى|اسم[\s_]?المبنى|الفندق|اسم[\s_]?الفندق|السكن|مكان[\s_]?(السكن|الإقامة|الاقامة))$/i.test(h) ||
      /(building|hotel|tower|residence|accommodation|مبنى|فندق|سكن|اقامة)/i.test(h);

    const isRoomCol = (h: string) =>
      /^(room|room[\s_]?type|room[\s_]?no|room[\s_]?number|suite|الغرفة|نوع[\s_]?الغرفة|رقم[\s_]?الغرفة|جناح)$/i.test(h) ||
      /(room|suite|غرفة|جناح)/i.test(h);

    const isMessageCol = (h: string) =>
      /^(message|notes|note|details|description|remarks|body|comments|رسالة|الرسالة|ملاحظات|ملاحظة|التفاصيل|تفاصيل)$/i.test(h) ||
      /(message|note|remark|body|comment|detail|رسالة|ملاحظ)/i.test(h);

    let headerRowIndex = -1;
    for (let r = 0; r < Math.min(matrix.length, 10); r++) {
      const row = matrix[r] || [];
      const hasHeaderMatch = row.some((cell) => {
        const txt = String(cell ?? "").trim().toLowerCase();
        return isNameCol(txt) || isEmailCol(txt) || isPhoneCol(txt) || isBuildingCol(txt) || isRoomCol(txt) || isMessageCol(txt);
      });
      if (hasHeaderMatch) {
        headerRowIndex = r;
        break;
      }
    }

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

    let headers: string[] = [];
    let dataRows: unknown[][] = [];

    if (headerRowIndex >= 0) {
      headers = (matrix[headerRowIndex] || []).map((c) => String(c ?? "").trim());
      dataRows = matrix.slice(headerRowIndex + 1);
    } else {
      headers = (matrix[0] || []).map((_, i) => `Col_${i}`);
      dataRows = matrix;
    }

    const nameColIdx = headers.findIndex((h) => isNameCol(h.toLowerCase()));
    const emailColIdx = headers.findIndex((h) => isEmailCol(h.toLowerCase()));
    const phoneColIdx = headers.findIndex((h) => isPhoneCol(h.toLowerCase()));
    const buildingColIdx = headers.findIndex((h) => isBuildingCol(h.toLowerCase()));
    const roomColIdx = headers.findIndex((h) => isRoomCol(h.toLowerCase()));
    const messageColIdx = headers.findIndex((h) => isMessageCol(h.toLowerCase()));

    const parsed: Row[] = [];

    for (const row of dataRows) {
      if (!row || !row.length) continue;
      if (row.every((c) => String(c ?? "").trim() === "")) continue;

      let name = nameColIdx >= 0 ? String(row[nameColIdx] ?? "").trim() : "";
      let email = emailColIdx >= 0 ? String(row[emailColIdx] ?? "").trim() : "";
      let rawPhone = phoneColIdx >= 0 ? String(row[phoneColIdx] ?? "").trim() : "";
      const building = buildingColIdx >= 0 ? String(row[buildingColIdx] ?? "").trim() : "";
      const room = roomColIdx >= 0 ? String(row[roomColIdx] ?? "").trim() : "";
      const message = messageColIdx >= 0 ? String(row[messageColIdx] ?? "").trim() : "";

      // Extract email from string or other cells if not found
      if (!email || !emailRegex.test(email)) {
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] ?? "").trim();
          const m = val.match(emailRegex);
          if (m) {
            email = m[0];
            break;
          }
        }
      } else {
        const m = email.match(emailRegex);
        if (m) email = m[0];
      }

      // Extract phone from string or other cells if not found
      let cleanPhone = cleanWhatsAppNumber(rawPhone);
      if (!cleanPhone || cleanPhone.length < 8) {
        for (let c = 0; c < row.length; c++) {
          if (c === emailColIdx) continue;
          const val = String(row[c] ?? "").trim();
          if (val.includes("@") || val.length > 30) continue;
          const testClean = cleanWhatsAppNumber(val);
          if (testClean && testClean.length >= 8 && testClean.length <= 15) {
            cleanPhone = testClean;
            break;
          }
        }
      }

      // Name fallback
      if (!name) {
        for (let c = 0; c < row.length; c++) {
          if (c === emailColIdx || c === phoneColIdx || c === buildingColIdx || c === roomColIdx || c === messageColIdx) continue;
          const val = String(row[c] ?? "").trim();
          if (val && !val.includes("@") && isNaN(Number(val)) && val.length < 50) {
            name = val;
            break;
          }
        }
        if (!name) {
          if (email) {
            const userPart = email.split("@")[0] || "";
            name = userPart.replace(/[._-]+/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Guest";
          } else if (cleanPhone) {
            name = `Guest (${cleanPhone.slice(-4)})`;
          } else {
            name = "Guest";
          }
        }
      }

      const hasValidEmail = Boolean(email && emailRegex.test(email));
      const hasValidPhone = Boolean(cleanPhone && cleanPhone.length >= 8);

      // Just focus on what exists: must have at least email or phone
      if (!hasValidEmail && !hasValidPhone) {
        continue;
      }

      const channel: "email" | "whatsapp" | "both" = hasValidEmail && hasValidPhone ? "both" : hasValidPhone ? "whatsapp" : "email";

      parsed.push({
        recipient_name: name,
        recipient_email: email,
        recipient_phone: cleanPhone,
        building_name: building,
        room_type: room,
        message: message,
        channel: channel,
        status: "queued",
      });
    }

    return parsed;
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const valid = parseSpreadsheet(buffer);

      if (!valid.length) {
        toast.error("No valid rows found (must contain at least Email or Phone)");
        return;
      }

      setRows(valid);
      setCurrentPage(1);
      const emailCount = valid.filter((r) => r.recipient_email && EMAIL_RE.test(r.recipient_email)).length;
      const phoneCount = valid.filter((r) => r.recipient_phone && r.recipient_phone.length >= 8).length;
      toast.success(`${valid.length} recipients imported (${emailCount} with Email, ${phoneCount} with WhatsApp) — sending started`);
      runUnifiedQueue(valid);
    } catch (err: any) {
      console.error("Error reading spreadsheet:", err);
      toast.error(`Failed to read spreadsheet: ${err?.message || "Invalid file"}`);
    }
  }

  // Unified queue: sends to email if email exists, sends to WhatsApp if phone exists, sends to both if both exist
  async function runUnifiedQueue(list: Row[]) {
    stopRef.current = false;
    setRunning(true);
    for (let i = 0; i < list.length; i++) {
      if (stopRef.current) break;
      const r = list[i]!;

      const cleanPhone = cleanWhatsAppNumber(r.recipient_phone || "");
      const hasPhone = Boolean(cleanPhone && cleanPhone.length >= 8);
      const hasEmail = Boolean(r.recipient_email && EMAIL_RE.test(r.recipient_email.trim()));

      if (!hasEmail && !hasPhone) {
        setRows((rs) =>
          rs.map((item, j) =>
            j === i ? { ...item, status: "failed", error: "Missing valid email and phone" } : item,
          ),
        );
        continue;
      }

      if (i > 0) {
        const waitSec = hasEmail ? 5 : 3;
        for (let s = waitSec; s > 0; s--) {
          if (stopRef.current) break;
          setCountdown(s);
          await new Promise((res) => setTimeout(res, 1000));
        }
        setCountdown(0);
        if (stopRef.current) break;
      }

      setRows((rs) => rs.map((item, j) => (j === i ? { ...item, status: "sending" } : item)));

      let emailSuccess = false;
      let emailError: string | undefined;

      // 1. Send Email if email was provided
      if (hasEmail) {
        try {
          const res = await sendAccommodationEmail({
            recipient_name: r.recipient_name || "Guest",
            recipient_email: r.recipient_email.trim(),
            building_name: r.building_name || "",
            room_type: r.room_type || "",
            message: r.message || "",
          });
          emailSuccess = res.success;
          if (!res.success) emailError = res.error || "Email failed";
        } catch (err: any) {
          emailSuccess = false;
          emailError = err?.message || "Email send failed";
        }
      }

      // 2. Send WhatsApp if phone was provided
      let whatsappSuccess = false;
      if (hasPhone) {
        try {
          const msgText = buildAccommodationWhatsAppMessage({
            recipient_name: r.recipient_name || "Guest",
            recipient_phone: cleanPhone,
            building_name: r.building_name,
            room_type: r.room_type,
            message: r.message,
          });
          const url = getWhatsAppWebUrl(cleanPhone, msgText);
          window.open(url, "_blank");
          whatsappSuccess = true;
        } catch (err) {
          console.error("WhatsApp window.open error:", err);
        }
      }

      const overallStatus =
        (hasEmail ? emailSuccess : true) && (hasPhone ? whatsappSuccess : true)
          ? "sent"
          : hasEmail && !emailSuccess
          ? "failed"
          : "sent";

      const channelDetermined: "email" | "whatsapp" | "both" =
        hasEmail && hasPhone ? "both" : hasPhone ? "whatsapp" : "email";

      const sentTime = new Date().toISOString();

      setRows((rs) =>
        rs.map((item, j) =>
          j === i
            ? {
                ...item,
                recipient_phone: cleanPhone || item.recipient_phone,
                channel: channelDetermined,
                status: overallStatus,
                error: emailError,
                created_at: sentTime,
              }
            : item,
        ),
      );

      // Save to database
      try {
        await supabase.from("accommodation_emails").insert({
          recipient_name: r.recipient_name || "Guest",
          recipient_email:
            r.recipient_email ||
            `${(r.recipient_name || "guest").toLowerCase().replace(/[^a-z0-9]/g, "") || "user"}@whatsapp.guest`,
          recipient_phone: cleanPhone || null,
          channel: channelDetermined,
          building_name: r.building_name || null,
          room_type: r.room_type || null,
          message: r.message || null,
          status: overallStatus,
          error: emailError || null,
          sent_at: overallStatus === "sent" ? sentTime : null,
        });
      } catch (err) {
        console.error("Error saving bulk queue result to DB:", err);
      }
    }

    setRunning(false);
    setCountdown(0);
    toast.info(stopRef.current ? "Sending stopped" : "All messages processed");
  }

  async function runWhatsAppQueue(list: Row[]) {
    stopRef.current = false;
    setRunning(true);
    for (let i = 0; i < list.length; i++) {
      if (stopRef.current) break;
      const r = list[i]!;
      const cleanPhone = cleanWhatsAppNumber(r.recipient_phone || "");
      if (!cleanPhone || cleanPhone.length < 8) {
        continue;
      }
      if (i > 0) {
        for (let s = 4; s > 0; s--) {
          if (stopRef.current) break;
          setCountdown(s);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        setCountdown(0);
        if (stopRef.current) break;
      }
      setRows((rs) => rs.map((item, j) => (j === i ? { ...item, status: "sending" } : item)));
      const msgText = buildAccommodationWhatsAppMessage({
        recipient_name: r.recipient_name || "Guest",
        recipient_phone: cleanPhone,
        building_name: r.building_name,
        room_type: r.room_type,
        message: r.message,
      });
      const url = getWhatsAppWebUrl(cleanPhone, msgText);
      window.open(url, "_blank");
      const sentTime = new Date().toISOString();
      setRows((rs) =>
        rs.map((item, j) => (j === i ? { ...item, status: "sent", channel: item.recipient_email ? "both" : "whatsapp", created_at: sentTime } : item)),
      );

      try {
        await supabase.from("accommodation_emails").insert({
          recipient_name: r.recipient_name || "Guest",
          recipient_email: r.recipient_email || `${(r.recipient_name || "guest").toLowerCase().replace(/[^a-z0-9]/g, "") || "user"}@whatsapp.guest`,
          recipient_phone: cleanPhone,
          channel: r.recipient_email ? "both" : "whatsapp",
          building_name: r.building_name || null,
          room_type: r.room_type || null,
          message: r.message || null,
          status: "sent",
          sent_at: sentTime,
        });
      } catch (err) {
        console.error("Error logging bulk whatsapp result to DB:", err);
      }
    }
    setRunning(false);
    setCountdown(0);
    toast.info(stopRef.current ? "WhatsApp sending stopped" : "All WhatsApp messages opened");
  }

  async function runEmailQueue(list: Row[]) {
    stopRef.current = false;
    setRunning(true);
    for (let i = 0; i < list.length; i++) {
      if (stopRef.current) break;
      const r = list[i]!;
      const rawEmail = (r.recipient_email || "").trim();
      if (!rawEmail || !EMAIL_RE.test(rawEmail)) {
        continue;
      }
      if (i > 0) {
        for (let s = 5; s > 0; s--) {
          if (stopRef.current) break;
          setCountdown(s);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        setCountdown(0);
        if (stopRef.current) break;
      }
      setRows((rs) => rs.map((item, j) => (j === i ? { ...item, status: "sending" } : item)));
      const res = await sendAccommodationEmail({
        recipient_name: r.recipient_name || "Guest",
        recipient_email: rawEmail,
        building_name: r.building_name || "",
        room_type: r.room_type || "",
        message: r.message || "",
      });
      const resStatus = res.success ? "sent" : "failed";
      const sentTime = new Date().toISOString();

      setRows((rs) =>
        rs.map((item, j) => (j === i ? { ...item, status: resStatus, error: res.error, created_at: sentTime } : item)),
      );

      try {
        await supabase.from("accommodation_emails").insert({
          recipient_name: r.recipient_name || "Guest",
          recipient_email: rawEmail,
          recipient_phone: r.recipient_phone ? cleanWhatsAppNumber(r.recipient_phone) : null,
          building_name: r.building_name || null,
          room_type: r.room_type || null,
          message: r.message || null,
          channel: r.recipient_phone ? "both" : "email",
          status: resStatus,
          error: res.error || null,
          sent_at: res.success ? sentTime : null,
        });
      } catch (err) {
        console.error("Error saving bulk email result to DB:", err);
      }
    }
    setRunning(false);
    setCountdown(0);
    toast.info(stopRef.current ? "Sending stopped" : "All emails processed");
  }

  const sent = rows.filter((r) => r.status === "sent").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accommodation Dispatch</h1>
        <p className="text-sm text-muted-foreground">
          Send accommodation details via Email, WhatsApp, or both — individually or bulk imported from Excel.
        </p>
      </div>

      <Collapsible
        open={isSingleOpen}
        onOpenChange={setIsSingleOpen}
        className="rounded-2xl border bg-card p-6"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between text-left transition-colors"
          >
            <div>
              <h2 className="font-semibold">Send single recipient</h2>
              <p className="text-xs text-muted-foreground">Send accommodation details to an individual guest via Email, WhatsApp, or both</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>{isSingleOpen ? "Collapse" : "Expand"}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isSingleOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.recipient_name} onChange={set("recipient_name")} maxLength={120} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="guest@example.com" value={form.recipient_email} onChange={set("recipient_email")} maxLength={255} /></div>
            <div className="space-y-1.5"><Label>WhatsApp / Mobile Number</Label><Input type="tel" placeholder="e.g. 201001234567" value={form.recipient_phone} onChange={set("recipient_phone")} maxLength={30} /></div>
            <div className="space-y-1.5"><Label>Building Name</Label><Input value={form.building_name} onChange={set("building_name")} maxLength={120} /></div>
            <div className="space-y-1.5"><Label>Room Type</Label><Input value={form.room_type} onChange={set("room_type")} maxLength={80} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Message</Label><Textarea rows={4} value={form.message} onChange={set("message")} maxLength={3000} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={sendSingleAuto} disabled={sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {form.recipient_email.trim() && form.recipient_phone.trim()
                ? "Send Email & WhatsApp"
                : form.recipient_phone.trim()
                ? "Send via WhatsApp Web"
                : "Send Email"}
            </Button>
            {form.recipient_email.trim() && form.recipient_phone.trim() && (
              <>
                <Button variant="outline" onClick={sendSingleEmailOnly} disabled={sending}>
                  <Send className="mr-2 h-4 w-4" />
                  Email Only
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                  onClick={sendSingleWhatsAppOnly}
                  disabled={sending}
                >
                  <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
                  WhatsApp Only
                </Button>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Bulk Dispatch from Excel</h2>
            <p className="text-xs text-muted-foreground">Focuses on what exists: sends Email if email is provided, WhatsApp if phone is provided, or both.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchHistory} disabled={loadingHistory} title="Refresh records">
              <RefreshCw className={`h-4 w-4 ${loadingHistory ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Download Template</Button>
            <Button onClick={() => fileRef.current?.click()} disabled={running}><Upload className="mr-2 h-4 w-4" />Import Excel</Button>
            {rows.length > 0 && (
              <>
                <Button
                  onClick={() => runUnifiedQueue(rows)}
                  disabled={running}
                  className="bg-primary hover:bg-primary/90"
                  title="Sends Email if email provided, WhatsApp if phone provided"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send All (Smart)
                </Button>
                {rows.some((r) => r.recipient_phone && cleanWhatsAppNumber(r.recipient_phone).length >= 8) && (
                  <Button
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                    onClick={() => runWhatsAppQueue(rows)}
                    disabled={running}
                  >
                    <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
                    WhatsApp Queue
                  </Button>
                )}
                {rows.some((r) => r.recipient_email && EMAIL_RE.test(r.recipient_email)) && (
                  <Button
                    variant="outline"
                    onClick={() => runEmailQueue(rows)}
                    disabled={running}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Email Queue
                  </Button>
                )}
              </>
            )}
            {running && <Button variant="destructive" onClick={() => (stopRef.current = true)}><Square className="mr-2 h-4 w-4" />Stop</Button>}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onImport} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <span>Total: <b>{rows.length}</b></span>
          <span className="text-primary">Sent: <b>{sent}</b></span>
          <span className="text-destructive">Failed: <b>{failed}</b></span>
          {countdown > 0 && <span className="text-muted-foreground animate-pulse font-medium">Next recipient in {countdown}s…</span>}
        </div>
        {(() => {
          const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
          const safeCurrentPage = Math.min(currentPage, totalPages);
          const paginatedRows = rows.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

          return (
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Phone</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Building</th>
                      <th className="p-2">Room</th>
                      <th className="p-2">Channel</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Date</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr className="border-t">
                        <td className="p-4 text-center text-muted-foreground" colSpan={10}>
                          {loadingHistory ? "Loading accommodation records..." : "No records yet — send one above or import an Excel sheet."}
                        </td>
                      </tr>
                    )}
                    {paginatedRows.map((r, pageIdx) => {
                      const i = (safeCurrentPage - 1) * PAGE_SIZE + pageIdx;
                      const hasP = Boolean(r.recipient_phone && cleanWhatsAppNumber(r.recipient_phone).length >= 8);
                      const hasE = Boolean(r.recipient_email && EMAIL_RE.test(r.recipient_email));
                      return (
                        <tr key={r.id || i} className="border-t">
                          <td className="p-2">{i + 1}</td>
                          <td className="p-2 font-medium">{r.recipient_name}</td>
                          <td className="p-2 font-mono text-xs">{r.recipient_phone || "—"}</td>
                          <td className="p-2">{r.recipient_email || "—"}</td>
                          <td className="p-2">{r.building_name || "—"}</td>
                          <td className="p-2">{r.room_type || "—"}</td>
                          <td className="p-2">
                            {r.channel === "both" || (hasE && hasP) ? (
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-[10px]">Email</Badge>
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-[10px] gap-1">
                                  <MessageCircle className="h-3 w-3" /> WhatsApp
                                </Badge>
                              </div>
                            ) : r.channel === "whatsapp" || (!hasE && hasP) ? (
                              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-[10px] gap-1">
                                <MessageCircle className="h-3 w-3" /> WhatsApp
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Email</Badge>
                            )}
                          </td>
                          <td className="p-2">
                            {r.status === "queued" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />Queued</span>}
                            {r.status === "sending" && <span className="inline-flex items-center gap-1 text-primary"><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending</span>}
                            {r.status === "sent" && <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" />Sent</span>}
                            {r.status === "failed" && <span className="inline-flex items-center gap-1 text-destructive" title={r.error}><XCircle className="h-3.5 w-3.5" />Failed</span>}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                            {r.created_at
                              ? new Date(r.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {hasP && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                  onClick={() => openRowInWhatsApp(r, i)}
                                  title="Open chat in WhatsApp Web"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 mr-1" />
                                  WhatsApp
                                </Button>
                              )}
                              {hasE && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 hover:bg-muted"
                                  onClick={() => sendRowEmail(r, i)}
                                  title="Send email"
                                >
                                  <Send className="h-3.5 w-3.5 mr-1" />
                                  Email
                                </Button>
                              )}
                              {!hasP && !hasE && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {rows.length > 0 && (
                <PaginationControl
                  currentPage={safeCurrentPage}
                  totalItems={rows.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                  itemLabel="recipients"
                  alwaysShowSummary={true}
                />
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
