import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, Building2, CheckCircle2, IdCard } from "lucide-react";
import { IntLogo } from "@/components/int/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — INT Events" },
      {
        name: "description",
        content: "Register as a client, vendor or Integrated Technics employee to attend INT events.",
      },
      { property: "og:title", content: "Create Account — INT Events" },
      { property: "og:description", content: "Register as a client, vendor or INT employee." },
    ],
  }),
  component: RegisterPage,
});

type AccountType = "client" | "vendor" | "employee";

const types: { id: AccountType; title: string; body: string; icon: typeof IdCard }[] = [
  { id: "client", title: "Client", body: "Register to attend INT events and technology sessions.", icon: IdCard },
  { id: "vendor", title: "Vendor", body: "Join events as a technology partner, vendor or exhibitor.", icon: Building2 },
  { id: "employee", title: "Employee", body: "Access and register for INT corporate events.", icon: Briefcase },
];

const industries = [
  "Banking",
  "Government",
  "Oil & Gas",
  "Telecom",
  "Real Estate",
  "Hospitality",
  "Manufacturing",
  "Education",
];

function RegisterPage() {
  const [type, setType] = useState<AccountType>("client");
  const [done, setDone] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/">
            <IntLogo />
          </Link>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">
            Already have an account?
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {done ? (
          <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 text-xl font-semibold">Verify your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a verification link to your email. Confirm it to activate your INT Events
              account
              {type === "vendor" ? " — vendor accounts are then reviewed by an administrator." : "."}
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/dashboard">Continue to dashboard</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Select Account Type</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Admin accounts are created by an authorised administrator and cannot be registered
              publicly.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={cn(
                    "rounded-xl border p-5 text-left transition-colors",
                    type === t.id
                      ? "border-primary bg-accent/50 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <t.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 font-semibold">{t.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
                </button>
              ))}
            </div>

            <form
              className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card"
              onSubmit={(e) => {
                e.preventDefault();
                setDone(true);
              }}
            >
              {type === "client" && <ClientFields />}
              {type === "vendor" && <VendorFields />}
              {type === "employee" && <EmployeeFields />}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Password" id="pw" type="password" />
                <Field label="Confirm Password" id="pw2" type="password" />
              </div>

              <Button type="submit" className="mt-6 w-full sm:w-auto">
                Create Account
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  id,
  type = "text",
  placeholder,
  full,
}: {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <div className={cn("space-y-2", full && "sm:col-span-2")}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} placeholder={placeholder} />
    </div>
  );
}

function SelectField({ label, id, options }: { label: string; id: string; options: string[] }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        defaultValue=""
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function ClientFields() {
  return (
    <>
      <Section title="Personal Information">
        <Field label="First Name" id="fn" />
        <Field label="Last Name" id="ln" />
        <Field label="Company" id="co" />
        <Field label="Job Title" id="jt" />
        <Field label="Email" id="em" type="email" placeholder="you@company.com" />
        <Field label="Mobile Number" id="mb" type="tel" placeholder="+20 1X XXX XXXX" />
        <Field label="Country" id="cn" />
        <Field label="City" id="ct" />
        <SelectField label="Industry" id="ind" options={industries} />
        <Field label="LinkedIn (optional)" id="li" />
      </Section>
      <Section title="Areas of Interest (optional)">
        <div className="sm:col-span-2">
          <Textarea placeholder="Video surveillance, access control, ICT infrastructure…" />
        </div>
      </Section>
    </>
  );
}

function VendorFields() {
  return (
    <>
      <Section title="Company Information">
        <Field label="Company Name" id="vco" />
        <Field label="Website" id="vweb" placeholder="https://" />
        <Field label="Country" id="vcn" />
        <Field label="City" id="vct" />
        <Field label="Address" id="vad" full />
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vlogo">Company Logo</Label>
          <Input id="vlogo" type="file" />
        </div>
      </Section>
      <Section title="Contact Information">
        <Field label="Contact Person" id="vcp" />
        <Field label="Position" id="vpos" />
        <Field label="Email" id="vem" type="email" />
        <Field label="Mobile" id="vmb" type="tel" />
      </Section>
      <Section title="Business Information">
        <SelectField
          label="Vendor Category"
          id="vcat"
          options={["Unified Security", "Network Video", "Access Control", "ICT", "Data Centre", "Other"]}
        />
        <Field label="Number of Representatives" id="vreps" type="number" />
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vprod">Products, Solutions & Areas of Expertise</Label>
          <Textarea id="vprod" placeholder="Describe your product portfolio and expertise" />
        </div>
        <SelectField label="Existing Partnership with INT" id="vpart" options={["Yes", "No"]} />
      </Section>
      <p className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
        Vendor accounts require administrator approval. Your status will be{" "}
        <strong>Pending Approval</strong> until reviewed.
      </p>
    </>
  );
}

function EmployeeFields() {
  return (
    <>
      <Section title="Employee Information">
        <Field label="First Name" id="efn" />
        <Field label="Last Name" id="eln" />
        <Field
          label="Corporate Email"
          id="eem"
          type="email"
          placeholder="employee@integratedtechnics.com"
        />
        <Field label="Mobile Number" id="emb" type="tel" />
        <Field label="Department" id="edep" />
        <Field label="Job Title" id="ejt" />
      </Section>
      <p className="rounded-md border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
        Accounts using an <strong>@integratedtechnics.com</strong> address are automatically
        identified as INT employees after email verification.
      </p>
    </>
  );
}