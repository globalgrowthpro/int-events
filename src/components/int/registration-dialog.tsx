import { useState } from "react";
import { X, Users, User, Ticket, Building, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { createRegistrationWithDelegates, uploadIdentityDocument } from "@/lib/api";
import { sendRegistrationConfirmationEmail } from "@/lib/email-service";
import type { IntEvent } from "@/lib/int-data";

type Props = {
  event: IntEvent;
  open: boolean;
  onClose: () => void;
};

interface IdentityDocs {
  type: "national-id" | "passport";
  idNumber?: string;
  front?: File | null;
  back?: File | null;
  passport?: File | null;
}

const emptyId = (): IdentityDocs => ({ type: "national-id" });

const idSummary = (id: IdentityDocs) =>
  id.type === "national-id"
    ? `National ID (front: ${id.front?.name ?? "missing"}, back: ${id.back?.name ?? "missing"})`
    : `Passport (${id.passport?.name ?? "missing"})`;

interface Representative {
  prefix: string;
  fullName: string;
  gender: string;
  email: string;
  mobile: string;
  identity: IdentityDocs;
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
  const [primaryId, setPrimaryId] = useState<IdentityDocs>(emptyId());

  if (!open) return null;

  const handleRepCountChange = (count: number) => {
    setRepCount(count);
    const additionalNeeded = Math.max(0, count - 1);
    setReps((prev) => {
      const next = [...prev];
      while (next.length < additionalNeeded) {
        next.push({ prefix: "", fullName: "", gender: "Male", email: "", mobile: "", identity: emptyId() });
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

  const handleRepIdentityChange = (index: number, identity: IdentityDocs) => {
    setReps((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], identity };
      return next;
    });
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
    // Upload primary attendee identity documents
    let primaryDocUrl: string | null = null;
    let primaryDocName: string | null = null;
    let frontUrl: string | null = null;
    let backUrl: string | null = null;
    let passportUrl: string | null = null;

    if (primaryId.type === "national-id") {
      if (primaryId.front) {
        const res = await uploadIdentityDocument(primaryId.front, "attendees/national_id");
        if (res) {
          frontUrl = res.url;
          primaryDocUrl = res.url;
          primaryDocName = res.name;
        }
      }
      if (primaryId.back) {
        const res = await uploadIdentityDocument(primaryId.back, "attendees/national_id");
        if (res) {
          backUrl = res.url;
          if (!primaryDocUrl) {
            primaryDocUrl = res.url;
            primaryDocName = res.name;
          }
        }
      }
    } else if (primaryId.type === "passport") {
      if (primaryId.passport) {
        const res = await uploadIdentityDocument(primaryId.passport, "attendees/passport");
        if (res) {
          passportUrl = res.url;
          primaryDocUrl = res.url;
          primaryDocName = res.name;
        }
      }
    }

    const primaryAttendee = {
      fullName: (formData.get("fullName") as string) || user?.name || "Attendee",
      email: (formData.get("email") as string) || user?.email || "attendee@example.com",
      gender: (formData.get("gender") as string) || "Male",
      phone: (formData.get("mobile") as string || formData.get("phone") as string) || "",
      company: (formData.get("organization") as string || formData.get("company") as string) || user?.company || "Company",
      jobTitle: (formData.get("jobTitle") as string) || "Director",
      id_type: primaryId.type === "passport" ? "Passport" : "National ID",
      id_number: primaryId.idNumber || (formData.get("primary-idNumber") as string) || null,
      document_url: primaryDocUrl,
      id_doc_name: primaryDocName,
      national_id_front_url: frontUrl,
      national_id_back_url: backUrl,
      passport_url: passportUrl,
    };

    const userConsiderations = (formData.get("considerations") as string) || "";
    const combinedConsiderations = [
      `ID: ${idSummary(primaryId)}`,
      userConsiderations,
    ].filter(Boolean).join(" | ");

    const meta = {
      datesAttending: (formData.get("dates") as string || formData.get("datesAttending") as string) || "All days",
      sector: (formData.get("sector") as string) || "Enterprise",
      travelRequired: false,
      checkInDetails: (formData.get("checkIn") as string || formData.get("checkInDetails") as string) || "",
      checkOutDetails: (formData.get("checkOut") as string || formData.get("checkOutDetails") as string) || "",
      considerations: combinedConsiderations,
    };

    // Upload delegates identity documents in parallel
    const delegates = await Promise.all(
      reps.map(async (r, i) => {
        let repDocUrl: string | null = null;
        let repDocName: string | null = null;
        let repFrontUrl: string | null = null;
        let repBackUrl: string | null = null;
        let repPassUrl: string | null = null;

        if (r.identity.type === "national-id") {
          if (r.identity.front) {
            const res = await uploadIdentityDocument(r.identity.front, "delegates/national_id");
            if (res) {
              repFrontUrl = res.url;
              repDocUrl = res.url;
              repDocName = res.name;
            }
          }
          if (r.identity.back) {
            const res = await uploadIdentityDocument(r.identity.back, "delegates/national_id");
            if (res) {
              repBackUrl = res.url;
              if (!repDocUrl) {
                repDocUrl = res.url;
                repDocName = res.name;
              }
            }
          }
        } else if (r.identity.type === "passport") {
          if (r.identity.passport) {
            const res = await uploadIdentityDocument(r.identity.passport, "delegates/passport");
            if (res) {
              repPassUrl = res.url;
              repDocUrl = res.url;
              repDocName = res.name;
            }
          }
        }

        return {
          fullName: r.fullName || "Representative",
          email: r.email || primaryAttendee.email,
          gender: r.gender,
          phone: r.mobile,
          id_type: r.identity.type === "passport" ? "Passport" : "National ID",
          id_number: r.identity.idNumber || (formData.get(`rep-${i}-idNumber`) as string) || null,
          document_url: repDocUrl,
          id_doc_name: repDocName,
          national_id_front_url: repFrontUrl,
          national_id_back_url: repBackUrl,
          passport_url: repPassUrl,
        };
      })
    );

    const result = await createRegistrationWithDelegates({
      eventId: event.id,
      userId: user?.id,
      primaryAttendee,
      delegates,
      meta,
    });

    if (result.duplicate) {
      setSubmitting(false);
      toast.error("Already Registered", {
        description: `You (${primaryAttendee.email}) are already registered for this event. Check My Passes to view your badge.`,
      });
      onClose();
      return;
    }

    // Send automated registration confirmation email to primary attendee & delegates
    try {
      await sendRegistrationConfirmationEmail({
        recipient_name: primaryAttendee.fullName,
        recipient_email: primaryAttendee.email,
        event_title: event.title,
        event_id: event.id,
        company: primaryAttendee.company,
      });

      for (const delegate of delegates) {
        if (delegate.email && delegate.email.trim() && delegate.email !== primaryAttendee.email) {
          await sendRegistrationConfirmationEmail({
            recipient_name: delegate.fullName,
            recipient_email: delegate.email,
            event_title: event.title,
            event_id: event.id,
            company: primaryAttendee.company,
          });
        }
      }
    } catch (err) {
      console.warn("Could not dispatch confirmation email:", err);
    }

    setSubmitting(false);

    toast.success("Request submitted — confirmation email sent", {
      description: `A confirmation email was sent to ${primaryAttendee.email}. Once approved, your official ITS pass card will be emailed to you.`,
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

            <IdentityUpload
              idPrefix="primary"
              value={primaryId}
              onChange={setPrimaryId}
            />
          </div>


          {/* Section 2: Attendance & Event Settings */}
          <div className="rounded-xl border border-border/80 bg-background/80 p-4 sm:p-5 shadow-xs">
            <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Attendance & Event Settings
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                      <Field label="Prefix (Title)">
                        <select
                          value={rep.prefix}
                          onChange={(e) => handleRepPrefixChange(idx, e.target.value)}
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

                    <IdentityUpload
                      idPrefix={`rep-${idx}`}
                      value={rep.identity}
                      onChange={(v) => handleRepIdentityChange(idx, v)}
                    />
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
              <Field label="Estimated Check-in Time">
                <input
                  name="checkIn"
                  placeholder="Expected arrival time / flight"
                  className={inputClass}
                />
              </Field>

              <Field label="Estimated Check-out Time">
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

function IdentityUpload({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: IdentityDocs;
  onChange: (v: IdentityDocs) => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
        Identification Document
      </p>

      <div className="mb-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name={`${idPrefix}-idType`}
            checked={value.type === "national-id"}
            onChange={() => onChange({ type: "national-id" })}
            className="h-4 w-4 accent-primary"
          />
          National ID
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name={`${idPrefix}-idType`}
            checked={value.type === "passport"}
            onChange={() => onChange({ type: "passport" })}
            className="h-4 w-4 accent-primary"
          />
          Passport
        </label>
      </div>

      {value.type === "national-id" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="National ID — Front side" required>
            <input
              type="file"
              required
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              onChange={(e) => onChange({ ...value, front: e.target.files?.[0] ?? null })}
              className={fileClass}
            />
          </Field>
          <Field label="National ID — Back side" required>
            <input
              type="file"
              required
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              onChange={(e) => onChange({ ...value, back: e.target.files?.[0] ?? null })}
              className={fileClass}
            />
          </Field>
        </div>
      ) : (
        <Field label="Passport copy" required>
          <input
            type="file"
            required
            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
            onChange={(e) => onChange({ ...value, passport: e.target.files?.[0] ?? null })}
            className={fileClass}
          />
        </Field>
      )}

      <p className="mt-2 text-[11px] text-muted-foreground">
        Accepted formats: JPG, PNG, WebP or PDF.
      </p>
    </div>
  );
}

const fileClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-2xs outline-none file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary focus:border-primary focus:ring-2 focus:ring-primary/20";
