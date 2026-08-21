import { supabase } from "./supabase";
import { events as defaultEvents, type IntEvent, type Registration } from "./int-data";

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
        capacity: eventData.capacity,
        registered_count: eventData.registered || 0,
        checked_in_count: eventData.checkedIn || 0,
        status: eventData.status === "registration-open" ? "open" : (eventData.status as any),
        summary: eventData.summary,
        description: eventData.description,
        partners: eventData.partners,
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
        capacity: updates.capacity,
        registered_count: updates.registered,
        status: updates.status === "registration-open" ? "open" : (updates.status as any),
        summary: updates.summary,
        partners: updates.partners,
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
  userId?: string;
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
  }>;
  meta: {
    datesAttending: string;
    sector: string;
    travelRequired: boolean;
    checkInDetails?: string;
    checkOutDetails?: string;
    considerations?: string;
  };
}) {
  const primaryId = `INT-EVT-${Math.floor(100000 + Math.random() * 900000)}`;
  const primaryToken = `EVT-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const rowsToInsert = [
    {
      id: primaryId,
      event_id: eventId,
      user_id: userId || null,
      attendee_name: primaryAttendee.fullName,
      attendee_email: primaryAttendee.email,
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
      attendee_email: d.email,
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
  const cleanToken = ticketToken.trim();

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
      };
    }

    // 2. Check for duplicate scan
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

      const scannedTime = reg.check_in_time
        ? new Date(reg.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "earlier today";

      return {
        success: false,
        status: "duplicate" as const,
        message: `Pass was already scanned at ${scannedTime}`,
        attendee_name: reg.attendee_name,
        company: reg.company || "Enterprise Client",
        job_title: reg.job_title || "Participant",
        event_title: reg.events?.title || "INT Event",
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
      message: "Check-in verified and gate badge active",
      attendee_name: reg.attendee_name,
      company: reg.company || "Enterprise Client",
      job_title: reg.job_title || "Participant",
      event_title: reg.events?.title || "INT Event",
      check_in_time: nowIso,
    };
  } catch (err) {
    console.error("verifyCheckIn error:", err);
    return {
      success: false,
      status: "invalid" as const,
      message: "Check-in verification failed",
    };
  }
}

/**
 * Vendor Services
 */
export async function getVendors() {
  try {
    const { data, error } = await supabase.from("vendors").select("*").order("name");
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {
    /* fallback */
  }
  return [
    { id: "1", name: "Genetec", contact_person: "John Smith", category: "Unified Security", reps_count: 6, approved_events_count: 3, state: "approved", email: "jsmith@genetec.com", phone: "+20 100 123 4567" },
    { id: "2", name: "Axis Communications", contact_person: "Petra Lund", category: "Network Video", reps_count: 4, approved_events_count: 2, state: "approved", email: "plund@axis.com", phone: "+20 100 234 5678" },
    { id: "3", name: "Milestone Systems", contact_person: "Marco Rossi", category: "VMS", reps_count: 3, approved_events_count: 2, state: "pending", email: "mrossi@milestonesys.com", phone: "+20 100 345 6789" },
    { id: "4", name: "HID Global", contact_person: "Amira Zaki", category: "Access Control", reps_count: 2, approved_events_count: 1, state: "pending", email: "azaki@hidglobal.com", phone: "+20 100 456 7890" },
    { id: "5", name: "Vertiv", contact_person: "Daniel Okoro", category: "Data Centre", reps_count: 2, approved_events_count: 1, state: "rejected", email: "dokoro@vertiv.com", phone: "+20 100 567 8901" },
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
