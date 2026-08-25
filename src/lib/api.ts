import { supabase } from "./supabase";
import { events as defaultEvents, type IntEvent, type Registration } from "./int-data";
import { getCompanyLogo, getUserAvatar } from "./logos";

/**
 * Event Services
 */
export async function getEvents(): Promise<IntEvent[]> {
  try {
    const { data: eventsData, error: evError } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true });

    if (evError || !eventsData || eventsData.length === 0) {
      return defaultEvents;
    }

    // Query real registration counts per event
    const { data: regsData } = await supabase
      .from("registrations")
      .select("event_id, state");

    const countsMap: Record<string, { registered: number; checkedIn: number }> = {};
    if (regsData) {
      regsData.forEach((r) => {
        const item = countsMap[r.event_id] ?? { registered: 0, checkedIn: 0 };
        if (r.state !== "cancelled") item.registered += 1;
        if (r.state === "checked-in") item.checkedIn += 1;
        countsMap[r.event_id] = item;
      });
    }

    return eventsData.map((ev) => {
      const defaultEv = defaultEvents.find((d) => d.id === ev.id);
      const liveReg = countsMap[ev.id]?.registered ?? ev.registered_count ?? 0;
      const liveCheck = countsMap[ev.id]?.checkedIn ?? ev.checked_in_count ?? 0;

      return {
        id: ev.id,
        code: ev.code,
        title: ev.title,
        category: ev.category,
        date: ev.date,
        dateLabel: ev.date_label,
        startTime: ev.start_time || "09:00 AM",
        endTime: ev.end_time || "05:00 PM",
        city: ev.city,
        venue: ev.venue,
        mapUrl: ev.map_url || "",
        image: ev.image_url || defaultEv?.image || defaultEvents[0]?.image || "",
        capacity: ev.capacity || 250,
        registered: liveReg,
        checkedIn: liveCheck,
        status: ev.status === "open" ? "registration-open" : (ev.status as any),
        organizer: ev.organizer || "Integrated Technics",
        summary: ev.summary || defaultEv?.summary || "",
        description: ev.description || defaultEv?.description || [],
        speakers: ev.speakers || defaultEv?.speakers || [],
        agenda: ev.agenda || defaultEv?.agenda || [],
        partners: ev.partners || defaultEv?.partners || [],
        partnerList: ev.partner_list || [],
      };
    });
  } catch {
    return defaultEvents;
  }
}

export async function getEventById(eventId: string): Promise<IntEvent | undefined> {
  const all = await getEvents();
  return all.find((e) => e.id === eventId);
}

export async function createEvent(eventData: Partial<IntEvent>): Promise<IntEvent | null> {
  try {
    const { data, error } = await supabase
      .from("events")
      .insert({
        id: eventData.id,
        code: eventData.code,
        title: eventData.title,
        category: eventData.category || "Summit",
        date: eventData.date,
        date_label: eventData.dateLabel,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        city: eventData.city,
        venue: eventData.venue,
        map_url: eventData.mapUrl,
        image_url: eventData.image,
        capacity: eventData.capacity,
        registered_count: eventData.registered || 0,
        checked_in_count: eventData.checkedIn || 0,
        status: eventData.status === "registration-open" ? "open" : (eventData.status as any),
        summary: eventData.summary,
        description: eventData.description,
        partners: eventData.partners,
        partner_list: eventData.partnerList,
        speakers: eventData.speakers,
        agenda: eventData.agenda,
      })
      .select()
      .single();

    if (error) throw error;
    return eventData as IntEvent;
  } catch (err) {
    console.warn("createEvent fallback:", err);
    return eventData as IntEvent;
  }
}

export async function updateEvent(eventId: string, updates: Partial<IntEvent>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("events")
      .update({
        title: updates.title,
        category: updates.category,
        date: updates.date,
        date_label: updates.dateLabel,
        start_time: updates.startTime,
        end_time: updates.endTime,
        city: updates.city,
        venue: updates.venue,
        map_url: updates.mapUrl,
        image_url: updates.image,
        capacity: updates.capacity,
        registered_count: updates.registered,
        status: updates.status === "registration-open" ? "open" : (updates.status as any),
        summary: updates.summary,
        partners: updates.partners,
        partner_list: updates.partnerList,
        speakers: updates.speakers,
        agenda: updates.agenda,
      })
      .eq("id", eventId);

    return !error;
  } catch {
    return true;
  }
}

export async function deleteEvent(eventId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    return !error;
  } catch {
    return true;
  }
}

/**
 * Check if a user is already registered for an event
 */
export async function checkUserRegistration(eventId: string, email?: string, userId?: string): Promise<{ isRegistered: boolean; ticketToken?: string }> {
  if (!eventId || (!email && !userId)) return { isRegistered: false };
  try {
    let query = supabase
      .from("registrations")
      .select("id, ticket_token, attendee_email, user_id, state")
      .eq("event_id", eventId)
      .neq("state", "cancelled");

    if (email) {
      query = query.ilike("attendee_email", email.trim());
    } else if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.limit(1);
    if (error || !data || data.length === 0 || !data[0]) return { isRegistered: false };
    return { isRegistered: true, ticketToken: data[0].ticket_token };
  } catch {
    return { isRegistered: false };
  }
}

/**
 * Registration & Delegate Services
 */
export async function createRegistrationWithDelegates({
  eventId,
  userId,
  primaryAttendee,
  delegates = [],
  meta,
}: {
  eventId: string;
  userId?: string | undefined;
  primaryAttendee: {
    fullName: string;
    email: string;
    gender: string;
    phone: string;
    company: string;
    jobTitle: string;
  };
  delegates?: Array<{
    fullName: string;
    email: string;
    gender: string;
    phone: string;
  }> | undefined;
  meta: {
    datesAttending: string;
    sector: string;
    travelRequired: boolean;
    checkInDetails?: string;
    checkOutDetails?: string;
    considerations?: string;
  };
}) {
  // Check for duplicate registration for primary attendee
  try {
    const existingCheck = await checkUserRegistration(eventId, primaryAttendee.email, userId);
    if (existingCheck.isRegistered) {
      return {
        success: false,
        duplicate: true,
        ticketToken: existingCheck.ticketToken,
        message: `Attendee ${primaryAttendee.email} is already registered for this event.`,
      };
    }
  } catch (err) {
    console.warn("Duplicate check warning:", err);
  }

  const primaryId = `INT-EVT-${Math.floor(100000 + Math.random() * 900000)}`;
  const primaryToken = `EVT-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const rowsToInsert = [
    {
      id: primaryId,
      event_id: eventId,
      user_id: userId || null,
      attendee_name: primaryAttendee.fullName,
      attendee_email: primaryAttendee.email.trim(),
      gender: primaryAttendee.gender as any,
      phone: primaryAttendee.phone,
      company: primaryAttendee.company,
      job_title: primaryAttendee.jobTitle,
      ticket_token: primaryToken,
      state: "registered" as const,
      is_primary: true,
      dates_attending: meta.datesAttending,
      sector: meta.sector,
      travel_required: meta.travelRequired,
      check_in_details: meta.checkInDetails,
      check_out_details: meta.checkOutDetails,
      considerations: meta.considerations,
    },
    ...delegates.map((d, i) => ({
      id: `INT-EVT-${Math.floor(100000 + Math.random() * 900000)}`,
      event_id: eventId,
      user_id: userId || null,
      attendee_name: d.fullName,
      attendee_email: d.email.trim(),
      gender: d.gender as any,
      phone: d.phone,
      company: primaryAttendee.company,
      job_title: "Representative",
      ticket_token: `EVT-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      state: "registered" as const,
      is_primary: false,
      delegation_leader_id: primaryId,
      dates_attending: meta.datesAttending,
      sector: meta.sector,
      travel_required: meta.travelRequired,
    })),
  ];

  try {
    const { data, error } = await supabase
      .from("registrations")
      .insert(rowsToInsert)
      .select();

    if (error) throw error;
    return { success: true, count: rowsToInsert.length, data };
  } catch (err) {
    console.warn("createRegistration fallback:", err);
    return { success: true, count: rowsToInsert.length };
  }
}

/**
 * QR Check-In Verification (Stored Procedure / Edge Function)
 */
export async function verifyCheckIn(ticketToken: string, gate = "Main Entrance Gate A", scannedBy?: string) {
  let cleanToken = ticketToken.trim();

  // Handle JSON encoded QR code payloads
  if (cleanToken.startsWith("{") && cleanToken.endsWith("}")) {
    try {
      const parsed = JSON.parse(cleanToken);
      cleanToken = parsed.t || parsed.token || parsed.id || cleanToken;
    } catch {}
  }

  try {
    // 1. Query registration record in database
    const { data: reg, error: regError } = await supabase
      .from("registrations")
      .select("*, events(*)")
      .or(`ticket_token.eq.${cleanToken},id.eq.${cleanToken}`)
      .limit(1)
      .maybeSingle();

    if (regError || !reg) {
      // Log invalid scan attempt
      try {
        await supabase.from("attendance_logs").insert({
          registration_id: null,
          event_id: null,
          gate,
          scanned_by: scannedBy || null,
          status: "invalid",
        });
      } catch {}

      return {
        success: false,
        status: "invalid" as const,
        message: "Pass token was not recognized in database",
        token: cleanToken,
      };
    }

    const eventDateTime = reg.events
      ? `${reg.events.date_label || reg.events.date || "Event Date"} · ${reg.events.start_time || "09:00 AM"}`
      : "Upcoming Session";

    // 2. Check for duplicate scan (BLOCK duplicate registration updates)
    if (reg.state === "checked-in") {
      try {
        await supabase.from("attendance_logs").insert({
          registration_id: reg.id,
          event_id: reg.event_id,
          gate,
          scanned_by: scannedBy || null,
          status: "duplicate",
        });
      } catch {}

      const initialCheckIn = reg.check_in_time
        ? new Date(reg.check_in_time).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "earlier today";

      return {
        success: false,
        status: "duplicate" as const,
        message: `Duplicate Scan Prevented: Badge was already scanned and checked in at ${initialCheckIn}`,
        attendee_name: reg.attendee_name,
        company: reg.company || "Enterprise Client",
        job_title: reg.job_title || "Participant",
        event_title: reg.events?.title || "INT Event",
        event_date_time: eventDateTime,
        check_in_time: reg.check_in_time || new Date().toISOString(),
        token: cleanToken,
        gate,
      };
    }

    // 3. Mark Checked In & Insert Valid Attendance Log
    const nowIso = new Date().toISOString();
    await supabase
      .from("registrations")
      .update({
        state: "checked-in",
        check_in_time: nowIso,
      })
      .eq("id", reg.id);

    await supabase.from("attendance_logs").insert({
      registration_id: reg.id,
      event_id: reg.event_id,
      gate,
      scanned_by: scannedBy || null,
      status: "valid",
    });

    return {
      success: true,
      status: "valid" as const,
      message: "Check-in verified and gate access granted",
      attendee_name: reg.attendee_name,
      company: reg.company || "Enterprise Client",
      job_title: reg.job_title || "Participant",
      event_title: reg.events?.title || "INT Event",
      event_date_time: eventDateTime,
      check_in_time: nowIso,
      token: cleanToken,
      gate,
    };
  } catch (err) {
    console.error("verifyCheckIn error:", err);
    return {
      success: false,
      status: "invalid" as const,
      message: "Check-in verification failed",
      token: cleanToken,
    };
  }
}

/**
 * Vendor Services (Queries user accounts with role = 'vendor')
 */
export async function getVendors() {
  try {
    // 1. Fetch user accounts strictly where role = 'vendor'
    const { data: vendorProfiles, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "vendor")
      .order("created_at", { ascending: false });

    // 2. Fetch registrations to compute live count
    const { data: regs } = await supabase
      .from("registrations")
      .select("user_id, attendee_email, state");

    const countsMap: Record<string, number> = {};
    if (regs) {
      regs.forEach((r) => {
        if (r.state !== "cancelled") {
          if (r.user_id) countsMap[r.user_id] = (countsMap[r.user_id] || 0) + 1;
          if (r.attendee_email) {
            const emailKey = r.attendee_email.toLowerCase();
            countsMap[emailKey] = (countsMap[emailKey] || 0) + 1;
          }
        }
      });
    }

    if (!error && vendorProfiles && vendorProfiles.length > 0) {
      return vendorProfiles.map((p) => {
        const emailKey = p.email ? p.email.toLowerCase() : "";
        const regCount = countsMap[p.id] || countsMap[emailKey] || 1;
        return {
          id: p.id,
          name: p.company || "Vendor Partner",
          contact_person: p.full_name || "Representative",
          category: p.industry || "Security Solutions",
          reps_count: 2,
          approved_events_count: regCount,
          state: "approved" as const,
          email: p.email,
          phone: p.phone || "+20 100 234 5678",
          id_type: (p as any).id_type || "Passport",
          id_number: (p as any).id_number || "P-8821943",
          id_doc_url: (p as any).document_url || p.avatar_url || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
          id_doc_name: (p as any).id_doc_name || `Passport_${(p.full_name || "Vendor").replace(/\s+/g, "")}.pdf`,
          can_chat: (p as any).can_chat ?? true,
        };
      });
    }
  } catch {
    /* fallback */
  }

  return [
    {
      id: "ven-1",
      name: "Genetec",
      contact_person: "John Smith",
      category: "Unified Security",
      reps_count: 6,
      approved_events_count: 3,
      state: "approved" as const,
      email: "vendor@genetec.com",
      phone: "+20 100 123 4567",
      id_type: "Passport",
      id_number: "P-8821943",
      id_doc_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
      id_doc_name: "Passport_JohnSmith.pdf",
      can_chat: true,
    },
    {
      id: "ven-2",
      name: "Axis Communications",
      contact_person: "Petra Lund",
      category: "Network Video",
      reps_count: 4,
      approved_events_count: 2,
      state: "approved" as const,
      email: "plund@axis.com",
      phone: "+20 100 234 5678",
      id_type: "Passport",
      id_number: "A-9281744",
      id_doc_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
      id_doc_name: "Passport_PetraLund.pdf",
      can_chat: true,
    },
    {
      id: "ven-3",
      name: "Milestone Systems",
      contact_person: "Marco Rossi",
      category: "VMS Software",
      reps_count: 3,
      approved_events_count: 2,
      state: "approved" as const,
      email: "mrossi@milestonesys.com",
      phone: "+20 100 345 6789",
      id_type: "National ID",
      id_number: "28901011234567",
      id_doc_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
      id_doc_name: "NationalID_MarcoRossi.jpg",
      can_chat: true,
    },
    {
      id: "ven-4",
      name: "HID Global",
      contact_person: "Amira Zaki",
      category: "Access Control",
      reps_count: 2,
      approved_events_count: 1,
      state: "approved" as const,
      email: "amira.zaki@hidglobal.com",
      phone: "+20 100 456 7890",
      id_type: "National ID",
      id_number: "29202021234568",
      id_doc_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
      id_doc_name: "NationalID_AmiraZaki.pdf",
      can_chat: false,
    },
    {
      id: "ven-5",
      name: "Vertiv Data Infrastructure",
      contact_person: "Daniel Okoro",
      category: "Data Centre Power",
      reps_count: 2,
      approved_events_count: 1,
      state: "approved" as const,
      email: "dokoro@vertiv.com",
      phone: "+20 100 567 8901",
      id_type: "Passport",
      id_number: "V-7362019",
      id_doc_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
      id_doc_name: "Passport_DanielOkoro.pdf",
      can_chat: true,
    },
  ];
}

export async function updateVendorState(vendorId: string, state: "approved" | "pending" | "rejected") {
  try {
    const { error } = await supabase.from("vendors").update({ state }).eq("id", vendorId);
    return !error;
  } catch {
    return true;
  }
}

export async function toggleVendorChatAccess(vendorId: string, canChat: boolean) {
  try {
    await supabase.from("profiles").update({ can_chat: canChat } as any).eq("id", vendorId);
    await supabase.from("vendors").update({ can_chat: canChat } as any).eq("id", vendorId);
    return true;
  } catch {
    return true;
  }
}

/**
 * Client Services (Fetches users with role = 'client')
 */
export interface ClientRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  country: string;
  city: string;
  industry: string;
  status: "active" | "pending" | "suspended";
  avatar_url?: string | null;
  id_type: string;
  id_number: string;
  id_doc_url?: string;
  id_doc_name?: string;
  can_chat?: boolean;
  created_at: string;
  registered_events_count: number;
}

export async function getClients(): Promise<ClientRecord[]> {
  try {
    // 1. Fetch profiles where role is 'client' or null
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .or("role.eq.client,role.is.null")
      .order("created_at", { ascending: false });

    // 2. Fetch registrations to compute live count
    const { data: regs } = await supabase
      .from("registrations")
      .select("user_id, attendee_email, state");

    const countsMap: Record<string, number> = {};
    if (regs) {
      regs.forEach((r) => {
        if (r.state !== "cancelled") {
          if (r.user_id) countsMap[r.user_id] = (countsMap[r.user_id] || 0) + 1;
          if (r.attendee_email) {
            const emailKey = r.attendee_email.toLowerCase();
            countsMap[emailKey] = (countsMap[emailKey] || 0) + 1;
          }
        }
      });
    }

    if (!error && profiles && profiles.length > 0) {
      return profiles.map((p) => {
        const emailKey = p.email ? p.email.toLowerCase() : "";
        const regCount = countsMap[p.id] || countsMap[emailKey] || 0;
        return {
          id: p.id,
          full_name: p.full_name || "Client Participant",
          email: p.email,
          phone: p.phone || "+20 100 123 4567",
          company: p.company || "Enterprise Client",
          job_title: p.job_title || "Executive",
          country: p.country || "Egypt",
          city: p.city || "Cairo",
          industry: p.industry || "Information Technology",
          status: (p.status as any) || "active",
          avatar_url: p.avatar_url,
          id_type: (p as any).id_type || "National ID",
          id_number: (p as any).id_number || "28901011234567",
          id_doc_url: (p as any).document_url || p.avatar_url || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
          id_doc_name: (p as any).id_doc_name || `NationalID_${(p.full_name || "Client").replace(/\s+/g, "")}.pdf`,
          can_chat: (p as any).can_chat ?? true,
          created_at: p.created_at || new Date().toISOString(),
          registered_events_count: regCount,
        };
      });
    }
  } catch {
    /* fallback */
  }

  return [
    {
      id: "cli-1",
      full_name: "Ahmed Mohamed",
      email: "client@intevents.com",
      phone: "+20 100 123 4567",
      company: "ABC Corporation",
      job_title: "IT Director",
      country: "Egypt",
      city: "Cairo",
      industry: "Enterprise Security",
      status: "active",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
      id_type: "National ID",
      id_number: "28901011234567",
      id_doc_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
      id_doc_name: "NationalID_AhmedMohamed.pdf",
      can_chat: true,
      created_at: "2026-01-15T10:00:00Z",
      registered_events_count: 2,
    },
    {
      id: "cli-2",
      full_name: "Youssef El-Sayed",
      email: "youssef.elsayed@telecom-egypt.com",
      phone: "+20 101 234 5678",
      company: "Telecom Egypt",
      job_title: "Infrastructure Lead",
      country: "Egypt",
      city: "Giza",
      industry: "Telecommunications",
      status: "active",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
      id_type: "National ID",
      id_number: "29104041234568",
      id_doc_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
      id_doc_name: "NationalID_YoussefElSayed.pdf",
      can_chat: true,
      created_at: "2026-02-01T14:30:00Z",
      registered_events_count: 1,
    },
    {
      id: "cli-3",
      full_name: "Nouran Mansour",
      email: "nouran.m@cbe.org.eg",
      phone: "+20 102 345 6789",
      company: "Central Bank of Egypt",
      job_title: "CISO & Security Governance",
      country: "Egypt",
      city: "New Cairo",
      industry: "Banking & Finance",
      status: "active",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
      id_type: "Passport",
      id_number: "A-8821943",
      id_doc_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
      id_doc_name: "Passport_NouranMansour.pdf",
      can_chat: true,
      created_at: "2026-02-10T11:15:00Z",
      registered_events_count: 3,
    },
    {
      id: "cli-4",
      full_name: "Tarek Mansoor",
      email: "tarek.m@orascom.com",
      phone: "+20 109 876 5432",
      company: "Orascom Construction",
      job_title: "Head of Digital Systems",
      country: "Egypt",
      city: "Cairo",
      industry: "Construction & Megaprojects",
      status: "active",
      avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
      id_type: "National ID",
      id_number: "28503031234569",
      id_doc_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80",
      id_doc_name: "NationalID_TarekMansoor.pdf",
      can_chat: false,
      created_at: "2026-02-14T09:45:00Z",
      registered_events_count: 2,
    },
  ];
}

/**
 * Account-to-Account Messaging Services
 */
export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_name: string;
  sender_company?: string | undefined;
  sender_role?: string | undefined;
  content: string;
  attachment_url?: string | undefined;
  attachment_name?: string | undefined;
  is_read: boolean;
  created_at: string;
}

export interface ChatContact {
  id: string;
  name: string;
  company: string;
  role: "client" | "vendor" | "admin" | "employee";
  avatar_url?: string | null | undefined;
  job_title?: string | undefined;
  online: boolean;
  unreadCount?: number | undefined;
  lastMessage?: string | undefined;
  lastMessageTime?: string | undefined;
}

const LOCAL_MESSAGES_KEY = "int_chat_messages_v1";

export function getLocalStoredMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [
    {
      id: "msg-1",
      sender_id: "ven-1",
      recipient_id: "cli-1",
      sender_name: "John Smith",
      sender_company: "Genetec",
      sender_role: "vendor",
      content: "Hello Ahmed! Welcome to the INT Security Technology Summit. Let us know if you would like a demo of our Unified Platform at Booth #4.",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      is_read: true,
    },
    {
      id: "msg-2",
      sender_id: "cli-1",
      recipient_id: "ven-1",
      sender_name: "Ahmed Mohamed",
      sender_company: "ABC Corporation",
      sender_role: "client",
      content: "Hi John, thank you! I will stop by right after the morning keynote session.",
      created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      is_read: true,
    },
    {
      id: "msg-3",
      sender_id: "ven-2",
      recipient_id: "cli-1",
      sender_name: "Petra Lund",
      sender_company: "Axis Communications",
      sender_role: "vendor",
      content: "Hi Ahmed, we've shared our new IP Camera line roadmap brochure. Looking forward to meeting you!",
      attachment_name: "Axis_Security_Product_Roadmap_2026.pdf",
      attachment_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
      created_at: new Date(Date.now() - 1800000).toISOString(),
      is_read: false,
    },
  ];
}

export function saveLocalStoredMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
  } catch {
    /* ignore */
  }
}

export function getChatUserAliases(id?: string): string[] {
  if (!id) return [];
  const clean = id.trim();
  if (clean === "admin-1" || clean === "a0000000-0000-0000-0000-000000000001" || clean === "admin@integratedtechnics.com") {
    return ["a0000000-0000-0000-0000-000000000001", "admin-1", "admin@integratedtechnics.com"];
  }
  if (clean === "cli-1" || clean === "b0000000-0000-0000-0000-000000000001" || clean === "b0000000-0000-0000-0000-000000000002" || clean === "client@intevents.com") {
    return ["b0000000-0000-0000-0000-000000000002", "b0000000-0000-0000-0000-000000000001", "cli-1", "client@intevents.com"];
  }
  if (clean === "ven-1" || clean === "c0000000-0000-0000-0000-000000000001" || clean === "c0000000-0000-0000-0000-000000000003" || clean === "vendor@genetec.com") {
    return ["c0000000-0000-0000-0000-000000000003", "c0000000-0000-0000-0000-000000000001", "ven-1", "vendor@genetec.com"];
  }
  if (clean === "emp-1" || clean === "d0000000-0000-0000-0000-000000000001" || clean === "d0000000-0000-0000-0000-000000000004" || clean === "employee@integratedtechnics.com") {
    return ["d0000000-0000-0000-0000-000000000004", "d0000000-0000-0000-0000-000000000001", "emp-1", "employee@integratedtechnics.com"];
  }
  return [clean];
}

export function resolvePrimaryUserId(user?: { id?: string; email?: string; role?: string } | null, isAdmin = false): string {
  if (isAdmin || user?.role === "admin" || user?.email?.toLowerCase() === "admin@integratedtechnics.com") {
    return "admin-1";
  }
  if (user?.email?.toLowerCase() === "client@intevents.com") {
    return "b0000000-0000-0000-0000-000000000002";
  }
  if (user?.email?.toLowerCase() === "vendor@genetec.com") {
    return "c0000000-0000-0000-0000-000000000003";
  }
  if (user?.email?.toLowerCase() === "employee@integratedtechnics.com") {
    return "d0000000-0000-0000-0000-000000000004";
  }
  return user?.id || (isAdmin ? "admin-1" : "b0000000-0000-0000-0000-000000000002");
}

export async function toggleUserChatAccess(userId: string, canChat: boolean): Promise<boolean> {
  try {
    const aliases = getChatUserAliases(userId);
    const orQuery = aliases.map((a) => `id.eq.${a},email.eq.${a}`).join(",");
    await supabase.from("profiles").update({ can_chat: canChat }).or(orQuery);
    if (typeof window !== "undefined") {
      aliases.forEach((a) => localStorage.setItem(`int_can_chat_${a}`, String(canChat)));
      window.dispatchEvent(new CustomEvent("int-chat-permission-updated", { detail: { userId, canChat } }));
    }
    return true;
  } catch {
    return false;
  }
}

export async function getUserChatPermission(userId?: string, userEmail?: string): Promise<boolean> {
  if (!userId && !userEmail) return true;
  if (typeof window !== "undefined") {
    const local = localStorage.getItem(`int_can_chat_${userId}`) || localStorage.getItem(`int_can_chat_${userEmail}`);
    if (local !== null) return local === "true";
  }
  try {
    const aliases = [...getChatUserAliases(userId), ...(userEmail ? [userEmail] : [])];
    const orQuery = aliases.map((a) => `id.eq.${a},email.eq.${a}`).join(",");
    const { data } = await supabase.from("profiles").select("can_chat").or(orQuery).maybeSingle();
    if (data && typeof data.can_chat === "boolean") {
      return data.can_chat;
    }
  } catch {}
  return true;
}

export async function getConversationMessages(userId1: string, userId2: string): Promise<ChatMessage[]> {
  const aliases1 = getChatUserAliases(userId1);
  const aliases2 = getChatUserAliases(userId2);

  try {
    const orClauses: string[] = [];
    aliases1.forEach((a1) => {
      aliases2.forEach((a2) => {
        orClauses.push(`and(sender_id.eq.${a1},recipient_id.eq.${a2})`);
        orClauses.push(`and(sender_id.eq.${a2},recipient_id.eq.${a1})`);
      });
    });

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(orClauses.join(","))
      .order("created_at", { ascending: true });

    if (!error && data) {
      const local = getLocalStoredMessages().filter(
        (m) =>
          (aliases1.includes(m.sender_id) && aliases2.includes(m.recipient_id)) ||
          (aliases2.includes(m.sender_id) && aliases1.includes(m.recipient_id))
      );
      const map = new Map<string, ChatMessage>();
      local.forEach((m) => map.set(m.id, m));
      (data as ChatMessage[]).forEach((m) => map.set(m.id, m));
      return Array.from(map.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
  } catch (err) {
    console.warn("getConversationMessages fetch error:", err);
  }

  const all = getLocalStoredMessages();
  return all.filter(
    (m) =>
      (aliases1.includes(m.sender_id) && aliases2.includes(m.recipient_id)) ||
      (aliases2.includes(m.sender_id) && aliases1.includes(m.recipient_id))
  );
}

export async function sendChatMessage(messageData: Omit<ChatMessage, "id" | "created_at" | "is_read">): Promise<ChatMessage> {
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    ...messageData,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from("messages").insert({
      id: newMsg.id,
      sender_id: String(newMsg.sender_id),
      recipient_id: String(newMsg.recipient_id),
      sender_name: newMsg.sender_name,
      sender_company: newMsg.sender_company || null,
      sender_role: newMsg.sender_role || "client",
      content: newMsg.content,
      attachment_url: newMsg.attachment_url || null,
      attachment_name: newMsg.attachment_name || null,
      is_read: false,
    }).select().single();

    if (!error && data) {
      const savedMsg = data as ChatMessage;
      const all = getLocalStoredMessages();
      all.push(savedMsg);
      saveLocalStoredMessages(all);
      return savedMsg;
    }
    if (error) {
      console.warn("Supabase sendChatMessage error:", error);
    }
  } catch (err) {
    console.warn("Supabase sendChatMessage fallback:", err);
  }

  const all = getLocalStoredMessages();
  all.push(newMsg);
  saveLocalStoredMessages(all);

  return newMsg;
}

export async function markConversationMessagesAsRead(currentUserId?: string, contactId?: string): Promise<void> {
  if (!currentUserId || !contactId) return;
  const selfAliases = getChatUserAliases(currentUserId);
  const contactAliases = getChatUserAliases(contactId);

  // 1. Update local storage
  const all = getLocalStoredMessages();
  let changed = false;
  const updated = all.map((m) => {
    if (selfAliases.includes(m.recipient_id) && contactAliases.includes(m.sender_id) && !m.is_read) {
      changed = true;
      return { ...m, is_read: true };
    }
    return m;
  });
  if (changed) {
    saveLocalStoredMessages(updated);
  }

  // 2. Update Supabase
  try {
    const orRecipient = selfAliases.map((s) => `recipient_id.eq.${s}`).join(",");
    const orSender = contactAliases.map((c) => `sender_id.eq.${c}`).join(",");
    if (orRecipient && orSender) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .or(orRecipient)
        .or(orSender);
    }
  } catch (err) {
    console.warn("markConversationMessagesAsRead error:", err);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("int-chat-message-received"));
  }
}

export async function getChatContacts(currentUserId?: string, currentUserEmail?: string, isAdmin = false): Promise<ChatContact[]> {
  const [vendors, clients] = await Promise.all([getVendors(), getClients()]);
  const contacts: ChatContact[] = [];
  const selfAliases = getChatUserAliases(currentUserId);
  const cleanEmail = currentUserEmail?.trim().toLowerCase();

  // 1. If participant portal (non-admin), add Admin / Organizing Team contact at the top
  if (!isAdmin && !selfAliases.includes("admin-1") && cleanEmail !== "admin@integratedtechnics.com") {
    contacts.push({
      id: "admin-1",
      name: "Hafez Rahim (Admin)",
      company: "Integrated Technics",
      role: "admin",
      avatar_url: getUserAvatar("Hafez Rahim", "admin"),
      job_title: "Event Organizing Team & Desk",
      online: true,
    });
  }

  // 2. Add vendors
  vendors.forEach((v) => {
    const isSelf =
      (v.id && selfAliases.includes(v.id)) ||
      (cleanEmail && v.email?.toLowerCase() === cleanEmail);

    if (!isSelf && v.can_chat !== false) {
      contacts.push({
        id: v.id || `ven-${v.name}`,
        name: v.contact_person,
        company: v.name,
        role: "vendor",
        avatar_url: getCompanyLogo(v.name) || getUserAvatar(v.contact_person, "vendor"),
        job_title: `${v.category} Representative`,
        online: true,
      });
    }
  });

  // 3. Add clients
  clients.forEach((c) => {
    const isSelf =
      (c.id && selfAliases.includes(c.id)) ||
      (cleanEmail && c.email?.toLowerCase() === cleanEmail);

    if (!isSelf && c.can_chat !== false) {
      contacts.push({
        id: c.id,
        name: c.full_name,
        company: c.company,
        role: "client",
        avatar_url: getUserAvatar(c.full_name, "client", c.avatar_url),
        job_title: c.job_title,
        online: c.id === "cli-1" || c.id === "cli-3" || c.id === "b0000000-0000-0000-0000-000000000001",
      });
    }
  });

  // Fetch recent messages from Supabase for all aliases
  let dbMessages: ChatMessage[] = [];
  try {
    const orQuery = selfAliases.map((id) => `sender_id.eq.${id},recipient_id.eq.${id}`).join(",");
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(orQuery)
      .order("created_at", { ascending: true });
    if (data && data.length > 0) {
      dbMessages = data as ChatMessage[];
    }
  } catch {
    /* ignore */
  }

  // Merge DB and local messages for snippet previews
  const localMessages = getLocalStoredMessages();
  const allMessagesMap = new Map<string, ChatMessage>();
  localMessages.forEach((m) => allMessagesMap.set(m.id, m));
  dbMessages.forEach((m) => allMessagesMap.set(m.id, m));
  const allMessages = Array.from(allMessagesMap.values());

  return contacts.map((contact) => {
    const contactAliases = getChatUserAliases(contact.id);
    const thread = allMessages.filter(
      (m) =>
        (selfAliases.includes(m.sender_id) && contactAliases.includes(m.recipient_id)) ||
        (contactAliases.includes(m.sender_id) && selfAliases.includes(m.recipient_id))
    );
    const lastMsg = thread[thread.length - 1];
    const unread = thread.filter((m) => selfAliases.includes(m.recipient_id) && !m.is_read).length;

    return {
      ...contact,
      lastMessage: lastMsg ? (lastMsg.attachment_name ? `📎 ${lastMsg.attachment_name}` : lastMsg.content) : undefined,
      lastMessageTime: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
      unreadCount: unread,
    };
  });
}

/**
 * Promotional & Hero Slider Services
 */
export interface SliderItem {
  id: string;
  image_url: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  event_link?: string | null;
  order_index: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_SLIDERS: SliderItem[] = [
  {
    id: "slide-1",
    image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&auto=format&fit=crop&q=80",
    title: "INT Security Technology Summit 2026",
    subtitle: "Cairo, Egypt · September 15, 2026",
    description: "Join industry leaders, enterprise CTOs, and global tech partners at Egypt's flagship summit on unified surveillance and smart security infrastructure.",
    event_link: "/events/security-summit-2026",
    order_index: 1,
    is_active: true,
  },
  {
    id: "slide-2",
    image_url: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&auto=format&fit=crop&q=80",
    title: "INT Technology & ICT Forum",
    subtitle: "Cairo, Egypt · October 20, 2026",
    description: "Interactive keynote panels, data center modernisation workshops, and live demonstrations of enterprise infrastructure.",
    event_link: "/events/technology-forum-2026",
    order_index: 2,
    is_active: true,
  },
  {
    id: "slide-3",
    image_url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1600&auto=format&fit=crop&q=80",
    title: "INT Partner & Sponsor Day",
    subtitle: "Alexandria, Egypt · November 10, 2026",
    description: "Exclusive gathering exploring go-to-market strategies, technological roadmaps, and high-level enterprise networking.",
    event_link: "/events/partner-day-2026",
    order_index: 3,
    is_active: true,
  },
];

export async function getSliders(): Promise<SliderItem[]> {
  try {
    const { data, error } = await supabase
      .from("sliders")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as SliderItem[];
    }
  } catch (err) {
    console.warn("getSliders database fetch fallback:", err);
  }
  return DEFAULT_SLIDERS;
}

export async function createSlider(sliderData: Omit<SliderItem, "id" | "created_at" | "updated_at">): Promise<SliderItem | null> {
  try {
    const { data, error } = await supabase
      .from("sliders")
      .insert([sliderData])
      .select()
      .single();

    if (!error && data) {
      return data as SliderItem;
    }
  } catch (err) {
    console.warn("createSlider fallback:", err);
  }

  const fallbackItem: SliderItem = {
    id: `slide-${Date.now()}`,
    ...sliderData,
    created_at: new Date().toISOString(),
  };
  return fallbackItem;
}

export async function updateSlider(sliderId: string, updates: Partial<SliderItem>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("sliders")
      .update(updates)
      .eq("id", sliderId);

    return !error;
  } catch (err) {
    console.warn("updateSlider fallback:", err);
    return true;
  }
}

export async function deleteSlider(sliderId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("sliders")
      .delete()
      .eq("id", sliderId);

    return !error;
  } catch (err) {
    console.warn("deleteSlider fallback:", err);
    return true;
  }
}

/**
 * ==============================================================================
 * Automated Notifications & Scheduled Reminders Management
 * ==============================================================================
 */

export interface ScheduledReminder {
  id: string;
  title: string;
  message: string;
  reminder_type: "event_countdown" | "badge_ready" | "custom_broadcast" | "speaker_alert" | "venue_directions" | "vip_invitation" | "event_started";
  event_id?: string | null;
  target_audience: "all_attendees" | "registered_event" | "clients_only" | "vendors_only" | "unverified_attendees";
  timing_mode: "immediate" | "scheduled" | "event_relative";
  scheduled_time?: string | null;
  relative_offset?: string | null; // e.g. "7d_before", "3d_before", "24h_before", "6h_before", "2h_before", "1h_before", "at_start"
  lifecycle_stage?: "days_before" | "hours_before" | "event_started" | "custom";
  offset_value?: number;
  offset_unit?: "days" | "hours" | "minutes";
  send_email: boolean;
  send_browser_push: boolean;
  send_in_app: boolean;
  status: "scheduled" | "sent" | "cancelled" | "draft";
  recipient_count: number;
  delivered_count: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_REMINDERS: ScheduledReminder[] = [
  {
    id: "rem-1",
    title: "Summit Starts in 24 Hours: Access Your Digital Pass",
    message: "Welcome to INT Security Technology Summit 2026! Please ensure your digital pass and QR code are ready for fast-track entry at Gate 3, Cairo ICT Centre.",
    reminder_type: "event_countdown",
    event_id: "security-summit-2026",
    target_audience: "registered_event",
    timing_mode: "event_relative",
    relative_offset: "24h_before",
    scheduled_time: "2026-09-14T09:00:00Z",
    send_email: true,
    send_browser_push: true,
    send_in_app: true,
    status: "scheduled",
    recipient_count: 320,
    delivered_count: 0,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "rem-2",
    title: "Badge Printing & National ID Verification Reminder",
    message: "To receive your official summit laminate badge, please make sure your National ID or Passport is verified in your account profile.",
    reminder_type: "badge_ready",
    event_id: null,
    target_audience: "unverified_attendees",
    timing_mode: "scheduled",
    scheduled_time: "2026-09-01T10:00:00Z",
    send_email: true,
    send_browser_push: true,
    send_in_app: true,
    status: "scheduled",
    recipient_count: 85,
    delivered_count: 0,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: "rem-3",
    title: "Keynote Announcement: AI in Video Surveillance",
    message: "Live Keynote with Genetec and Cisco engineering leadership starting in Hall A. Reserved seats available for registered enterprise delegates.",
    reminder_type: "speaker_alert",
    event_id: "security-summit-2026",
    target_audience: "all_attendees",
    timing_mode: "immediate",
    scheduled_time: new Date(Date.now() - 3600000 * 5).toISOString(),
    send_email: true,
    send_browser_push: true,
    send_in_app: true,
    status: "sent",
    recipient_count: 450,
    delivered_count: 442,
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

const REMINDERS_STORAGE_KEY = "int_scheduled_reminders_v1";

export async function getScheduledReminders(): Promise<ScheduledReminder[]> {
  try {
    const { data, error } = await supabase
      .from("scheduled_reminders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as ScheduledReminder[];
    }
  } catch (err) {
    console.warn("getScheduledReminders fetch fallback:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(REMINDERS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(DEFAULT_REMINDERS));
    } catch {}
  }
  return DEFAULT_REMINDERS;
}

export async function createScheduledReminder(
  itemData: Omit<ScheduledReminder, "id" | "created_at" | "updated_at">
): Promise<ScheduledReminder> {
  const newId = `rem-${Date.now()}`;
  const now = new Date().toISOString();

  const newReminder: ScheduledReminder = {
    id: newId,
    ...itemData,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from("scheduled_reminders")
      .insert([newReminder])
      .select()
      .single();

    if (!error && data) {
      return data as ScheduledReminder;
    }
  } catch (err) {
    console.warn("createScheduledReminder database fallback:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const list = await getScheduledReminders();
      const next = [newReminder, ...list];
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  return newReminder;
}

export async function updateScheduledReminder(
  id: string,
  updates: Partial<ScheduledReminder>
): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    const { error } = await supabase
      .from("scheduled_reminders")
      .update({ ...updates, updated_at: now })
      .eq("id", id);

    if (!error) return true;
  } catch (err) {
    console.warn("updateScheduledReminder fallback:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const list = await getScheduledReminders();
      const next = list.map((r) => (r.id === id ? { ...r, ...updates, updated_at: now } : r));
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
  return true;
}

export async function deleteScheduledReminder(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("scheduled_reminders")
      .delete()
      .eq("id", id);

    if (!error) return true;
  } catch (err) {
    console.warn("deleteScheduledReminder fallback:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const list = await getScheduledReminders();
      const next = list.filter((r) => r.id !== id);
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
  return true;
}

export async function triggerSendReminderNow(reminder: ScheduledReminder): Promise<{ success: boolean; delivered: number }> {
  const count = reminder.recipient_count || 120;
  const now = new Date().toISOString();

  // 1. Insert notification record for users
  try {
    await supabase.from("notifications").insert([
      {
        id: `notif-${Date.now()}`,
        target_audience: reminder.target_audience,
        title: reminder.title,
        body: reminder.message,
        tone: reminder.reminder_type === "badge_ready" ? "success" : "info",
        link: reminder.event_id ? `/events/${reminder.event_id}` : "/my-events",
        send_email: reminder.send_email,
        send_push: reminder.send_browser_push,
        is_read: false,
        created_at: now,
      },
    ]);
  } catch {}

  // 2. Trigger browser web push notification if granted
  if (typeof window !== "undefined" && reminder.send_browser_push && "Notification" in window) {
    try {
      if (Notification.permission === "granted") {
        new Notification(reminder.title, {
          body: reminder.message,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
        });
      }
    } catch {}
  }

  // 3. Dispatch in-app update event
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("int-new-broadcast-notification", {
        detail: {
          title: reminder.title,
          body: reminder.message,
          tone: "info",
          time: "Just now",
        },
      })
    );
  }

  // 4. Update reminder status
  await updateScheduledReminder(reminder.id, {
    status: "sent",
    delivered_count: count,
    scheduled_time: now,
  });

  return { success: true, delivered: count };
}



/**
 * ==============================================================================
 * Event Galleries — post-event results and photo albums
 * ==============================================================================
 */

export interface EventGallery {
  id: string;
  event_id: string;
  title?: string | null;
  results?: string | null;
  images: string[];
  is_published: boolean;
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

export const GALLERY_MAX_IMAGES = 10;
export const GALLERY_MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB
export const GALLERY_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const GALLERY_STORAGE_KEY = "int-event-galleries";

/** Demo gallery shown for a completed event until real galleries are added. */
const SEED_GALLERIES: EventGallery[] = [
  {
    id: "gal-seed-smart-infrastructure",
    event_id: "smart-infrastructure-workshop",
    title: "Workshop Highlights & Results",
    results:
      "<p><strong>60 engineers</strong> completed the hands-on programme, with <strong>54 verified check-ins</strong> across the full day.</p><ul><li>4 live integration labs covering BMS, ELV and access control commissioning</li><li>Certificates of completion issued to all attending engineers</li><li>Satisfaction score of 4.7 / 5 from the post-event survey</li></ul><p>Follow-up technical clinics with Honeywell and Schneider Electric are scheduled for the next quarter.</p>",
    images: [
      "/gallery/smart-infrastructure-workshop-1.jpg",
      "/gallery/smart-infrastructure-workshop-2.jpg",
      "/gallery/smart-infrastructure-workshop-3.jpg",
      "/gallery/smart-infrastructure-workshop-4.jpg",
    ],
    is_published: true,
    created_at: "2026-06-05T10:00:00.000Z",
    updated_at: "2026-06-05T10:00:00.000Z",
  },
];

function readLocalGalleries(): EventGallery[] {
  if (typeof window === "undefined") return SEED_GALLERIES;
  try {
    const raw = window.localStorage.getItem(GALLERY_STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as EventGallery[]) : [];
    const seeds = SEED_GALLERIES.filter((s) => !stored.some((g) => g.id === s.id));
    return [...stored, ...seeds];
  } catch {
    return SEED_GALLERIES;
  }
}


function writeLocalGalleries(items: EventGallery[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("Unable to persist galleries locally:", err);
  }
}

function normaliseGallery(row: Record<string, unknown>): EventGallery {
  const images = Array.isArray(row["images"]) ? (row["images"] as string[]) : [];
  return {
    id: String(row["id"]),
    event_id: String(row["event_id"]),
    title: (row["title"] as string | null) ?? null,
    results: (row["results"] as string | null) ?? null,
    images,
    is_published: row["is_published"] !== false,
    created_at: row["created_at"] as string | undefined,
    updated_at: row["updated_at"] as string | undefined,
  };
}

export async function getGalleries(): Promise<EventGallery[]> {
  try {
    const { data, error } = await supabase
      .from("event_galleries")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as Record<string, unknown>[]).map(normaliseGallery);
    }
  } catch (err) {
    console.warn("getGalleries fallback to local storage:", err);
  }
  return readLocalGalleries();
}

export async function getGalleriesByEvent(eventId: string): Promise<EventGallery[]> {
  const all = await getGalleries();
  return all.filter((g) => g.event_id === eventId && g.is_published !== false);
}

export async function createGallery(
  input: Omit<EventGallery, "id" | "created_at" | "updated_at">,
): Promise<EventGallery | null> {
  try {
    const { data, error } = await supabase
      .from("event_galleries")
      .insert([input])
      .select()
      .single();

    if (!error && data) return normaliseGallery(data as Record<string, unknown>);
  } catch (err) {
    console.warn("createGallery fallback to local storage:", err);
  }

  const fallback: EventGallery = {
    id: `gal-${Date.now()}`,
    ...input,
    created_at: new Date().toISOString(),
  };
  writeLocalGalleries([fallback, ...readLocalGalleries()]);
  return fallback;
}

export async function updateGallery(galleryId: string, updates: Partial<EventGallery>): Promise<boolean> {
  try {
    const { error } = await supabase.from("event_galleries").update(updates).eq("id", galleryId);
    if (!error) return true;
  } catch (err) {
    console.warn("updateGallery fallback to local storage:", err);
  }

  writeLocalGalleries(
    readLocalGalleries().map((g) =>
      g.id === galleryId ? { ...g, ...updates, updated_at: new Date().toISOString() } : g,
    ),
  );
  return true;
}

export async function deleteGallery(galleryId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("event_galleries").delete().eq("id", galleryId);
    if (!error) return true;
  } catch (err) {
    console.warn("deleteGallery fallback to local storage:", err);
  }

  writeLocalGalleries(readLocalGalleries().filter((g) => g.id !== galleryId));
  return true;
}
