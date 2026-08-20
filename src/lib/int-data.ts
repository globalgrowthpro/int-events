import securityImg from "@/assets/event-security.jpg";
import forumImg from "@/assets/event-forum.jpg";
import partnerImg from "@/assets/event-partner.jpg";
import workshopImg from "@/assets/event-workshop.jpg";

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

export interface IntEvent {
  id: string;
  code: string;
  title: string;
  category: string;
  date: string;
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
}

export const events: IntEvent[] = [
  {
    id: "security-summit-2026",
    code: "INT-EVT-2026-01",
    title: "INT Security Technology Summit 2026",
    category: "Summit",
    date: "2026-09-15",
    dateLabel: "15 September 2026",
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    city: "Cairo, Egypt",
    venue: "Nile Ritz-Carlton, Grand Ballroom",
    image: securityImg,
    capacity: 300,
    registered: 248,
    checkedIn: 0,
    status: "registration-open",
    organizer: "Integrated Technics",
    summary:
      "A full-day gathering of security, ICT and technology leaders exploring the next generation of integrated protection.",
    description: [
      "The INT Security Technology Summit brings together Integrated Technics clients, government representatives and international technology partners for a full day of keynotes, live demonstrations and technical sessions.",
      "Sessions cover unified video management, access control, cyber-physical convergence, command-and-control platforms and AI-assisted operations across critical infrastructure.",
    ],
    speakers: [
      {
        name: "Eng. Karim Nabil",
        position: "Chief Technology Officer",
        company: "Integrated Technics",
        bio: "Leads INT's technology strategy across security, ICT and smart infrastructure programs for enterprise and government clients.",
      },
      {
        name: "Sarah Klein",
        position: "Director of Solutions",
        company: "Genetec",
        bio: "Specialises in unified security platforms and large-scale command centre deployments across EMEA.",
      },
      {
        name: "Mohamed El Sayed",
        position: "Head of Critical Infrastructure",
        company: "Axis Communications",
        bio: "Focuses on network video, edge analytics and cybersecurity hardening for utilities and transport.",
      },
    ],
    agenda: [
      { time: "09:00", title: "Registration & QR check-in", detail: "Welcome coffee and badge collection" },
      { time: "10:00", title: "Opening remarks", detail: "Integrated Technics leadership" },
      { time: "10:30", title: "Keynote: Converged security", detail: "The shift to unified operations" },
      { time: "11:30", title: "Technology sessions", detail: "Parallel tracks by partner" },
      { time: "13:00", title: "Lunch & networking" },
      { time: "14:00", title: "Live demonstrations", detail: "Command centre and access control labs" },
      { time: "16:30", title: "Closing & certificates" },
    ],
    partners: ["Genetec", "Axis Communications", "Cisco", "Honeywell", "Milestone"],
  },
  {
    id: "technology-forum-2026",
    code: "INT-EVT-2026-02",
    title: "INT Technology & ICT Forum",
    category: "Forum",
    date: "2026-10-20",
    dateLabel: "20 October 2026",
    startTime: "10:00 AM",
    endTime: "04:00 PM",
    city: "Cairo, Egypt",
    venue: "INT Headquarters, Auditorium",
    image: forumImg,
    capacity: 250,
    registered: 195,
    checkedIn: 0,
    status: "upcoming",
    organizer: "Integrated Technics",
    summary:
      "Panel discussions on enterprise networking, data centre modernisation and digital infrastructure.",
    description: [
      "An executive forum for CIOs and infrastructure leaders covering enterprise networking, data centre modernisation and the operational realities of digital transformation.",
    ],
    speakers: [
      {
        name: "Hafez Rahim",
        position: "Platform Lead",
        company: "Integrated Technics",
        bio: "Drives INT's digital platforms and event technology ecosystem.",
      },
      {
        name: "Dina Farouk",
        position: "Enterprise Architect",
        company: "Cisco",
        bio: "Designs converged network and security architectures for regional enterprises.",
      },
    ],
    agenda: [
      { time: "10:00", title: "Registration" },
      { time: "10:30", title: "Opening panel", detail: "Infrastructure priorities for 2027" },
      { time: "12:00", title: "Technical breakouts" },
      { time: "13:30", title: "Lunch" },
      { time: "14:30", title: "Case studies" },
    ],
    partners: ["Cisco", "Schneider Electric", "Vertiv"],
  },
  {
    id: "partner-day-2026",
    code: "INT-EVT-2026-03",
    title: "INT Partner Day",
    category: "Partner Event",
    date: "2026-11-10",
    dateLabel: "10 November 2026",
    startTime: "09:30 AM",
    endTime: "03:00 PM",
    city: "Alexandria, Egypt",
    venue: "Tolip Hotel, Exhibition Hall",
    image: partnerImg,
    capacity: 150,
    registered: 144,
    checkedIn: 0,
    status: "almost-full",
    organizer: "Integrated Technics",
    summary: "Exhibition and roadmap sessions with INT's technology vendors and exhibitors.",
    description: [
      "A dedicated day for INT's vendor and technology partners: exhibition booths, product roadmaps and joint go-to-market planning.",
    ],
    speakers: [
      {
        name: "Laila Mansour",
        position: "Partnerships Director",
        company: "Integrated Technics",
        bio: "Manages INT's vendor ecosystem and channel programs.",
      },
    ],
    agenda: [
      { time: "09:30", title: "Exhibitor setup & check-in" },
      { time: "11:00", title: "Partner roadmaps" },
      { time: "13:00", title: "Networking lunch" },
      { time: "14:00", title: "Exhibition floor" },
    ],
    partners: ["Genetec", "Milestone", "Bosch", "HID Global"],
  },
  {
    id: "smart-infrastructure-workshop",
    code: "INT-EVT-2026-04",
    title: "Smart Infrastructure Technical Workshop",
    category: "Workshop",
    date: "2026-06-04",
    dateLabel: "4 June 2026",
    startTime: "09:00 AM",
    endTime: "02:00 PM",
    city: "Cairo, Egypt",
    venue: "INT Technology Lab",
    image: workshopImg,
    capacity: 60,
    registered: 60,
    checkedIn: 54,
    status: "completed",
    organizer: "Integrated Technics",
    summary: "Hands-on lab covering smart building controls, ELV systems and integration practice.",
    description: [
      "A hands-on technical workshop for engineers covering smart building controls, ELV integration and commissioning best practice.",
    ],
    speakers: [
      {
        name: "Eng. Tarek Adel",
        position: "Senior Systems Engineer",
        company: "Integrated Technics",
        bio: "Delivers integration and commissioning for large smart-building programs.",
      },
    ],
    agenda: [
      { time: "09:00", title: "Check-in" },
      { time: "09:30", title: "Controls fundamentals" },
      { time: "11:30", title: "Integration lab" },
      { time: "13:30", title: "Wrap-up & certificates" },
    ],
    partners: ["Honeywell", "Schneider Electric"],
  },
];

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
  company: string;
  role: AccountRole;
  token: string;
  state: "registered" | "checked-in" | "cancelled";
  checkInTime?: string;
}

export const currentUser = {
  name: "Ahmed Mohamed",
  company: "ABC Corporation",
  role: "client" as AccountRole,
  email: "ahmed.mohamed@abccorp.com",
  initials: "AM",
};

export const myRegistrations: Registration[] = [
  {
    id: "INT-EVT-000248",
    eventId: "security-summit-2026",
    attendee: currentUser.name,
    company: currentUser.company,
    role: "client",
    token: "EVT-2026-000248-X7K92",
    state: "registered",
  },
  {
    id: "INT-EVT-000312",
    eventId: "technology-forum-2026",
    attendee: currentUser.name,
    company: currentUser.company,
    role: "client",
    token: "EVT-2026-000312-M4P18",
    state: "registered",
  },
  {
    id: "INT-EVT-000104",
    eventId: "smart-infrastructure-workshop",
    attendee: currentUser.name,
    company: currentUser.company,
    role: "client",
    token: "EVT-2026-000104-Q9T33",
    state: "checked-in",
    checkInTime: "09:12 AM",
  },
];

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