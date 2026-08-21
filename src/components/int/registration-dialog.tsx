import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { IntEvent } from "@/lib/int-data";

type Props = {
  event: IntEvent;
  open: boolean;
  onClose: () => void;
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
  if (!open) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      toast.success("Registration confirmed", {
        description: `Ticket #1 · ${event.title}. Your digital pass is ready in Passes.`,
      });
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/60 p-3 backdrop-blur-sm sm:p-6">
      <form
        onSubmit={handleSubmit}
        className="my-4 w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-elevated"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-xl font-semibold text-foreground">Attendees</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close registration form"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-5 py-5 sm:px-6">
          <p className="text-sm text-muted-foreground">
            <span className="text-base font-semibold text-foreground">Ticket #1</span> —
            Registration for {event.title} · Full Access Ticket
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="First Name and Last Name (as it should be on the badge)" required>
              <input
                name="fullName"
                required
                defaultValue={user?.name ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Email" required>
              <input
                name="email"
                type="email"
                required
                defaultValue={user?.email ?? ""}
                className={inputClass}
              />
            </Field>
            <Field
              label="Mobile number (please ensure you add the country code, for Egypt +20)"
              required
            >
              <input name="mobile" required placeholder="+20" className={inputClass} />
            </Field>
            <Field label="Organization" required>
              <input
                name="organization"
                required
                defaultValue={user?.company ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Job Title" required>
              <textarea name="jobTitle" required rows={2} className={textareaClass} />
            </Field>
            <Field label="Number of Representatives who intended to attend" required>
              <textarea name="reps" required rows={2} className={textareaClass} />
            </Field>
            <Field label="Dates to attend" required>
              <select name="dates" required defaultValue="" className={inputClass}>
                <option value="" disabled />
                <option>Day 1 only</option>
                <option>Day 2 only</option>
                <option>All days</option>
              </select>
            </Field>
            <Field label="Check-in Details" required>
              <textarea name="checkIn" required rows={2} className={textareaClass} />
            </Field>
            <Field label="Check-out Details" required>
              <textarea name="checkOut" required rows={2} className={textareaClass} />
            </Field>
            <Field label="Are you willing to travel?" required>
              <select name="travel" required defaultValue="" className={inputClass}>
                <option value="" disabled />
                <option>Yes</option>
                <option>No</option>
              </select>
            </Field>
            <Field label="Do you have any considerations for us? Please share it here!" required>
              <textarea name="considerations" required rows={2} className={textareaClass} />
            </Field>
            <Field label="Sector" required>
              <select name="sector" required defaultValue="" className={inputClass}>
                <option value="" disabled />
                {sectors.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="If Other, please specify">
              <textarea name="other" rows={2} className={textareaClass} />
            </Field>
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-border bg-secondary/50 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-md bg-warning px-5 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center rounded-md bg-navy px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-tech disabled:opacity-60"
          >
            {submitting ? "Confirming…" : "Confirm Registration"}
          </button>
        </footer>
      </form>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";
const textareaClass =
  "w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary";

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
