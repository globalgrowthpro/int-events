import { useState } from "react";
import { X, Users, User, Ticket, Building, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { createRegistrationWithDelegates } from "@/lib/api";
import type { IntEvent } from "@/lib/int-data";

type Props = {
  event: IntEvent;
  open: boolean;
  onClose: () => void;
};

interface Representative {
  prefix: string;
  fullName: string;
  gender: string;
  email: string;
  mobile: string;
}

const PREFIXES = [
  "Mr",
  "Mrs",
  "Ms",
  "Dr",
  "Eng",
  "Prof",
  "Assoc. Prof",
  "Capt",
  "Lt. Col",
  "Col",
  "Gen",
  "Sheikh",
  "Sir",
];

const stripPrefix = (name: string) =>
  name
    .replace(
      new RegExp(
        `^(${PREFIXES.map((p) => p.replace(/\./g, "\\.")).join("|")})\\s+`,
        "i"
      ),
      ""
    )
    .trim();

const applyPrefix = (prefix: string, name: string) => {
  const bare = stripPrefix(name);
  return prefix ? `${prefix} ${bare}`.trim() : bare;
};

const sectors = [
  "Government",
  "Banking & Finance",
  "Oil & Gas",
  "Healthcare",
  "Education",
  "Hospitality",
  "Industrial & Manufacturing",
  "Systems Integrator",
  "Other",
];

export function RegistrationDialog({ event, open, onClose }: Props) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [repCount, setRepCount] = useState<number>(1);
  const [reps, setReps] = useState<Representative[]>([]);
  const [primaryPrefix, setPrimaryPrefix] = useState("");
  const [primaryName, setPrimaryName] = useState(user?.name ?? "");

  const [willingToTravel, setWillingToTravel] = useState<string>("Yes");
  const [transportationType, setTransportationType] = useState<string>("");

  if (!open) return null;

  const handleRepCountChange = (count: number) => {
    setRepCount(count);
    const additionalNeeded = Math.max(0, count - 1);
    setReps((prev) => {
      const next = [...prev];
      while (next.length < additionalNeeded) {
        next.push({ prefix: "", fullName: "", gender: "Male", email: "", mobile: "" });
      }
      return next.slice(0, additionalNeeded);
    });
  };

  const handleRepFieldChange = (
    index: number,
    field: keyof Representative,
    value: string
  ) => {
    setReps((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handlePrimaryPrefixChange = (prefix: string) => {
    setPrimaryPrefix(prefix);
    setPrimaryName((prev) => applyPrefix(prefix, prev));
  };

  const handleRepPrefixChange = (index: number, prefix: string) => {
    setReps((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          prefix,
          fullName: applyPrefix(prefix, next[index].fullName),
        };
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const primaryAttendee = {
      fullName: (formData.get("fullName") as string) || user?.name || "Attendee",
      email: (formData.get("email") as string) || user?.email || "attendee@example.com",
      gender: (formData.get("gender") as string) || "Male",
      phone: (formData.get("mobile") as string || formData.get("phone") as string) || "",
      company: (formData.get("organization") as string || formData.get("company") as string) || user?.company || "Company",
      jobTitle: (formData.get("jobTitle") as string) || "Director",
    };

    const isTravel = (formData.get("travel") as string) === "Yes" || willingToTravel === "Yes";
    const transportChoice = isTravel ? ((formData.get("transportationType") as string) || transportationType) : "";

    const userConsiderations = (formData.get("considerations") as string) || "";
    const combinedConsiderations = [
      transportChoice ? `Transportation: ${transportChoice}` : "",
      userConsiderations,
    ].filter(Boolean).join(" | ");

    const meta = {
      datesAttending: (formData.get("dates") as string || formData.get("datesAttending") as string) || "All days",
      sector: (formData.get("sector") as string) || "Enterprise",
      travelRequired: isTravel,
      checkInDetails: (formData.get("checkIn") as string || formData.get("checkInDetails") as string) || "",
      checkOutDetails: (formData.get("checkOut") as string || formData.get("checkOutDetails") as string) || "",
      considerations: combinedConsiderations,
    };

    const delegates = reps.map((r) => ({
      fullName: r.fullName || "Representative",
      email: r.email || primaryAttendee.email,
      gender: r.gender,
      phone: r.mobile,
    }));

    const result = await createRegistrationWithDelegates({
      eventId: event.id,
      userId: user?.id,
      primaryAttendee,
      delegates,
      meta,
    });

    setSubmitting(false);

    if (result.duplicate) {
      toast.error("Already Registered", {
        description: `You (${primaryAttendee.email}) are already registered for this event. Check My Passes to view your badge.`,
      });
      onClose();
      return;
    }

    toast.success("Registration confirmed!", {
      description: `${repCount} ticket(s) reserved for ${event.title}. Passes are ready in My Passes.`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/60 p-3 backdrop-blur-sm sm:p-6">
      <form
        onSubmit={handleSubmit}
        className="my-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Event Registration
              </h2>
              <p className="text-xs text-muted-foreground">
                {event.title} · {event.dateLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close registration form"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[75vh] space-y-6 overflow-y-auto p-5 sm:p-6">
          {/* Section 1: Primary Attendee Personal Information */}
          <div className="rounded-xl border border-border/80 bg-background/80 p-4 sm:p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  Primary Attendee (Ticket #1)
                </h3>
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                Full Access Badge
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prefix (Title)">
                <select
                  name="prefix"
                  value={primaryPrefix}
                  onChange={(e) => handlePrimaryPrefixChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">No prefix</option>
                  {PREFIXES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Full Name (as it should be on badge)" required>
                <input
                  name="fullName"
                  required
                  value={primaryName}
                  onChange={(e) => setPrimaryName(e.target.value)}
                  placeholder="e.g. Dr. Ahmed Mohamed"
                  className={inputClass}
                />
              </Field>

              <Field label="Gender" required>
                <select name="gender" required defaultValue="Male" className={inputClass}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </Field>

              <Field label="Email" required>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={user?.email ?? ""}
                  placeholder="you@company.com"
                  className={inputClass}
                />
              </Field>

              <Field
                label="Mobile Number (with country code, e.g. +20)"
                required
              >
                <input
                  name="mobile"
                  required
                  placeholder="+20 1X XXX XXXX"
                  className={inputClass}
                />
              </Field>

              <Field label="Organization" required>
                <input
                  name="organization"
                  required
                  defaultValue={user?.company ?? ""}
                  placeholder="Company or Organization"
                  className={inputClass}
                />
              </Field>

              <Field label="Job Title" required>
                <input
                  name="jobTitle"
                  required
                  placeholder="e.g. IT Director / Security Manager"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          {/* Section 2: Number of Representatives & Event Options */}
          <div className="rounded-xl border border-border/80 bg-background/80 p-4 sm:p-5 shadow-xs">
            <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Delegation & Attendance Settings
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Number of Representatives who intended to attend" required>
                <select
                  value={repCount}
                  onChange={(e) => handleRepCountChange(parseInt(e.target.value, 10))}
                  className={inputClass}
                >
                  <option value={1}>1 (Primary Attendee only)</option>
                  <option value={2}>2 Representatives (+1 additional)</option>
                  <option value={3}>3 Representatives (+2 additional)</option>
                  <option value={4}>4 Representatives (+3 additional)</option>
                  <option value={5}>5 Representatives (+4 additional)</option>
                </select>
              </Field>

              <Field label="Dates to attend" required>
                <select name="dates" required defaultValue="All days" className={inputClass}>
                  <option value="All days">All days</option>
                  <option value="Day 1 only">Day 1 only</option>
                  <option value="Day 2 only">Day 2 only</option>
                </select>
              </Field>

              <Field label="Sector" required>
                <select name="sector" required defaultValue={sectors[0]} className={inputClass}>
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Are you willing to travel?" required>
                <select
                  name="travel"
                  required
                  value={willingToTravel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWillingToTravel(val);
                    if (val === "No") {
                      setTransportationType("");
                    }
                  }}
                  className={inputClass}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </Field>

              {willingToTravel === "Yes" && (
                <Field label="Transportation Requirement" required>
                  <select
                    name="transportationType"
                    required
                    value={transportationType}
                    onChange={(e) => setTransportationType(e.target.value)}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select transportation option...
                    </option>
                    <option value="I Use my own transportation">
                      1 - I Use my own transportation
                    </option>
                    <option value="I need transportation">
                      2 - I need transportation
                    </option>
                  </select>
                </Field>
              )}
            </div>
          </div>

          {/* Section 3: Additional Representatives (Dynamically shown when repCount >= 2) */}
          {repCount > 1 && (
            <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 border-b border-primary/20 pb-3">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                  Additional Representatives ({reps.length})
                </h3>
              </div>

              {reps.map((rep, idx) => {
                const ticketNum = idx + 2;
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-border bg-card p-4 shadow-xs"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                          {ticketNum}
                        </span>
                        Representative #{ticketNum} Badge Details
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Ticket #{ticketNum}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Full Name (as it should be on badge)" required>
                        <input
                          required
                          value={rep.fullName}
                          onChange={(e) =>
                            handleRepFieldChange(idx, "fullName", e.target.value)
                          }
                          placeholder={`Representative #${ticketNum} full name`}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Gender" required>
                        <select
                          required
                          value={rep.gender}
                          onChange={(e) =>
                            handleRepFieldChange(idx, "gender", e.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </Field>

                      <Field label="Email" required>
                        <input
                          type="email"
                          required
                          value={rep.email}
                          onChange={(e) =>
                            handleRepFieldChange(idx, "email", e.target.value)
                          }
                          placeholder="rep@company.com"
                          className={inputClass}
                        />
                      </Field>

                      <Field
                        label="Mobile Number (with country code)"
                        required
                      >
                        <input
                          required
                          value={rep.mobile}
                          onChange={(e) =>
                            handleRepFieldChange(idx, "mobile", e.target.value)
                          }
                          placeholder="+20 1X XXX XXXX"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section 4: Logistics & Notes */}
          <div className="rounded-xl border border-border/80 bg-background/80 p-4 sm:p-5 shadow-xs">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              Logistics & Additional Notes (Optional)
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Check-in Details">
                <input
                  name="checkIn"
                  placeholder="Expected arrival time / flight"
                  className={inputClass}
                />
              </Field>

              <Field label="Check-out Details">
                <input
                  name="checkOut"
                  placeholder="Expected departure time"
                  className={inputClass}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Special Considerations or Requests">
                  <textarea
                    name="considerations"
                    rows={2}
                    placeholder="Dietary requirements, accessibility assistance, special requests…"
                    className={textareaClass}
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-4 sm:px-6">
          <div className="text-xs text-muted-foreground">
            Total Tickets: <span className="font-bold text-foreground">{repCount}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-tech disabled:opacity-60"
            >
              {submitting ? "Confirming…" : `Confirm Registration (${repCount})`}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-2xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";
const textareaClass =
  "w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-2xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
