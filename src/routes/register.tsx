import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Briefcase, Building2, CheckCircle2, IdCard } from "lucide-react";
import { IntLogo } from "@/components/int/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — INT Events" },
      {
        name: "description",
        content: "Register as a client, vendor or Integrated Technics employee to attend INT events.",
      },
      { property: "og:title", content: "Create Account — INT Events" },
      { property: "og:description", content: "Create your INT Events account." },
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

import { PasswordInput } from "@/components/ui/password-input";

function RegisterPage() {
  const [type, setType] = useState<AccountType>("client");
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { user, ready } = useAuth();

  const handleGeneratePassword = (generated: string) => {
    setPassword(generated);
    setConfirmPassword(generated);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 sm:h-16 max-w-5xl items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-2xs hover:bg-secondary hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-primary" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link to="/">
              <IntLogo size="sm" compactOnMobile />
            </Link>
          </div>
          {!user && (
            <Link
              to="/login"
              className="rounded-lg border border-border bg-secondary/80 px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary hover:bg-secondary transition-colors whitespace-nowrap"
            >
              <span className="hidden sm:inline">Already have an account? </span>Sign In
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {ready && user ? (
          <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 text-xl font-semibold">You already have an account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You are signed in as {user.name} ({user.email}). There is no need to register again.
            </p>
            <div className="mt-6 grid gap-3">
              <Button asChild>
                <Link to={user.role === "admin" ? "/admin" : "/dashboard"}>
                  {user.role === "admin" ? "Go to admin portal" : "Go to my dashboard"}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/events">Browse events</Link>
              </Button>
            </div>
          </div>
        ) : done ? (
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pw">Password</Label>
                  </div>
                  <PasswordInput
                    id="pw"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onGenerate={handleGeneratePassword}
                    showGenerateButton
                    placeholder="Enter or generate password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw2">Confirm Password</Label>
                  <PasswordInput
                    id="pw2"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>
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
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
          <Field label="First Name" id="fn" />
          <Field label="Last Name" id="ln" />
          <SelectField label="Gender" id="gen" options={["Male", "Female"]} />
        </div>
        <Field label="Company" id="co" />
        <Field label="Job Title" id="jt" />
        <Field label="Email" id="em" type="email" placeholder="you@company.com" />
        <Field label="Mobile Number" id="mb" type="tel" placeholder="+20 1X XXX XXXX" />
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
          <Field label="Country" id="cn" />
          <Field label="City" id="ct" />
          <SelectField label="Industry" id="ind" options={industries} />
        </div>
        <Field label="LinkedIn (optional)" id="li" full />
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
        <SelectField label="Gender" id="vgen" options={["Male", "Female"]} />
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
          <Field label="Position" id="vpos" />
          <Field label="Email" id="vem" type="email" />
          <Field label="Mobile" id="vmb" type="tel" />
        </div>
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
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
          <Field label="First Name" id="efn" />
          <Field label="Last Name" id="eln" />
          <SelectField label="Gender" id="egen" options={["Male", "Female"]} />
        </div>
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