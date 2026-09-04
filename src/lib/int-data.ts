export type EventStatus =
  | "registration-open"
  | "upcoming"
  | "almost-full"
  | "registration-closed"
  | "completed"
  | "cancelled";

export type AccountRole = "client" | "vendor" | "employee" | "admin";

export interface Speaker {
  name: string;
  position: string;
  company: string;
  bio: string;
}

export interface AgendaItem {
  time: string;
  title: string;
  detail?: string;
}

export function formatEventDateRange(startDate?: string, endDate?: string, fallbackLabel?: string): string {
  if (!startDate) return fallbackLabel || "TBD";
  
  const toDdMm = (iso?: string) => {
    if (!iso) return "";
    const clean = iso.includes("T") ? iso.split("T")[0]! : iso;
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0]!.length === 4) {
        return `${parts[2]!.padStart(2, "0")}-${parts[1]!.padStart(2, "0")}-${parts[0]}`;
      }
      if (parts[2]!.length === 4) {
        return `${parts[0]!.padStart(2, "0")}-${parts[1]!.padStart(2, "0")}-${parts[2]}`;
      }
    }
    try {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      }
    } catch {}
    return iso;
  };

  const startFmt = toDdMm(startDate);
  if (!endDate || endDate === startDate) {
    return startFmt;
  }
  const endFmt = toDdMm(endDate);
  return `${startFmt} – ${endFmt}`;
}

export interface IntEvent {
  id: string;
  code: string;
  title: string;
  category: string;
  date: string;
  endDate?: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  city: string;
  venue: string;
  image: string;
  capacity: number;
  registered: number;
  checkedIn: number;
  status: EventStatus;
  organizer: string;
  summary: string;
  description: string[];
  speakers: Speaker[];
  agenda: AgendaItem[];
  partners: string[];
  mapUrl?: string;
  partnerList?: Array<{ name: string; logo?: string; category?: string }>;
  maxDelegatesPerCompany?: number;
  registrationDeadline?: string;
}

export const events: IntEvent[] = [];

export function getEvent(id: string) {
  return events.find((e) => e.id === id);
}

export const statusLabels: Record<EventStatus, string> = {
  "registration-open": "Registration Open",
  upcoming: "Upcoming",
  "almost-full": "Almost Full",
  "registration-closed": "Registration Closed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export interface Registration {
  id: string;
  eventId: string;
  attendee: string;
  gender?: string | null | undefined;
  jobTitle?: string | null | undefined;
  company: string;
  role: AccountRole;
  token: string;
  state: "registered" | "checked-in" | "cancelled";
  checkInTime?: string | undefined;
}

export const currentUser = {
  name: "Ahmed Mohamed",
  company: "ABC Corporation",
  role: "client" as AccountRole,
  email: "ahmed.mohamed@abccorp.com",
  gender: "Male",
  initials: "AM",
};

export const myRegistrations: Registration[] = [];

export const attendees = [
  { time: "09:41", name: "Ahmed Mohamed", company: "ABC Corporation", role: "client", event: "Security Summit", state: "checked-in" },
  { time: "09:42", name: "John Smith", company: "Genetec", role: "vendor", event: "Security Summit", state: "checked-in" },
  { time: "09:43", name: "Omar Ali", company: "Integrated Technics", role: "employee", event: "Security Summit", state: "checked-in" },
  { time: "09:47", name: "Nour Hassan", company: "Egypt Telecom", role: "client", event: "Security Summit", state: "checked-in" },
  { time: "—", name: "Sara Adel", company: "Delta Bank", role: "client", event: "Security Summit", state: "registered" },
  { time: "—", name: "Marco Rossi", company: "Milestone", role: "vendor", event: "Partner Day", state: "registered" },
  { time: "09:51", name: "Yasmin Fouad", company: "Integrated Technics", role: "employee", event: "Security Summit", state: "checked-in" },
  { time: "—", name: "Khaled Samir", company: "GreenGas", role: "client", event: "Technology Forum", state: "registered" },
] as const;

export const vendors = [
  { name: "Genetec", contact: "John Smith", category: "Unified Security", reps: 6, events: 3, state: "approved" },
  { name: "Axis Communications", contact: "Petra Lund", category: "Network Video", reps: 4, events: 2, state: "approved" },
  { name: "Milestone Systems", contact: "Marco Rossi", category: "VMS", reps: 3, events: 2, state: "pending" },
  { name: "HID Global", contact: "Amira Zaki", category: "Access Control", reps: 2, events: 1, state: "pending" },
  { name: "Vertiv", contact: "Daniel Okoro", category: "Data Centre", reps: 2, events: 1, state: "rejected" },
];

export const notifications = [
  { title: "Event Reminder", body: "INT Security Technology Summit starts tomorrow at 09:00 AM.", time: "2h ago", tone: "info" },
  { title: "QR Pass Generated", body: "Your pass INT-EVT-000312 for INT Technology & ICT Forum is ready.", time: "1d ago", tone: "success" },
  { title: "Registration Confirmed", body: "You are registered for INT Security Technology Summit 2026.", time: "3d ago", tone: "success" },
  { title: "Location Update", body: "Partner Day moves to Tolip Hotel, Exhibition Hall.", time: "5d ago", tone: "warning" },
  { title: "Certificate Available", body: "Download your certificate for Smart Infrastructure Technical Workshop.", time: "2w ago", tone: "info" },
];

export const registrationTrend = [
  { day: "Mon", registrations: 42 },
  { day: "Tue", registrations: 68 },
  { day: "Wed", registrations: 55 },
  { day: "Thu", registrations: 91 },
  { day: "Fri", registrations: 74 },
  { day: "Sat", registrations: 33 },
  { day: "Sun", registrations: 47 },
];

export const audienceSplit = [
  { type: "Clients", count: 742 },
  { type: "Vendors", count: 268 },
  { type: "Employees", count: 238 },
];