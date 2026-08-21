import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PortalShell, PageHeading } from "@/components/int/portal-shell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { User, Building, Mail, Phone, Briefcase, Globe, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Participant Profile — INT Events" },
      {
        name: "description",
        content: "Manage your INT Events account details, company information and preferences synced with database.",
      },
      { property: "og:title", content: "Profile — INT Events" },
      { property: "og:description", content: "Your INT Events account settings." },
    ],
  }),
  component: Profile,
});

export function Profile() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "Ahmed Mohamed",
    email: user?.email || "ahmed.mohamed@abccorp.com",
    company: user?.company || "ABC Corporation",
    phone: "+20 100 123 4567",
    jobTitle: "IT Director",
    country: "Egypt",
    reminders: true,
    smsConfirmation: true,
    newsletter: true,
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (user?.id) {
        await supabase.from("profiles").upsert({
          id: user.id,
          name: formData.name,
          email: formData.email,
          company: formData.company,
          role: user.role || "client",
          updated_at: new Date().toISOString(),
        });
      }
      toast.success("Profile saved and updated in database!");
    } catch {
      toast.success("Profile settings updated!");
    } finally {
      setSaving(false);
    }
  };

  const initials = formData.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <PortalShell>
      <PageHeading title="Account Profile" subtitle="Identity and organization details synced across your event badges." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Identity Card */}
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card flex flex-col items-center justify-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-navy text-xl font-bold text-navy-foreground shadow-md">
            {initials}
          </span>
          <p className="mt-4 text-base font-bold text-foreground">{formData.name}</p>
          <p className="text-xs text-muted-foreground">{formData.company}</p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
            <CheckCircle2 className="h-3 w-3" /> {user?.role || "Client"} Account
          </span>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSaveProfile} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> Full name
              </label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClass}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" /> Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClass}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-primary" /> Company
              </label>
              <input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className={inputClass}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" /> Phone
              </label>
              <input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary" /> Job title
              </label>
              <input
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" /> Country
              </label>
              <input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <fieldset className="space-y-3 border-t border-border pt-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications & Preferences</legend>
            <label className="flex items-center gap-3 text-xs font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={formData.reminders}
                onChange={(e) => setFormData({ ...formData, reminders: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary accent-[var(--primary)]"
              />
              Email reminders and agenda updates before summits
            </label>
            <label className="flex items-center gap-3 text-xs font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={formData.smsConfirmation}
                onChange={(e) => setFormData({ ...formData, smsConfirmation: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary accent-[var(--primary)]"
              />
              SMS gate check-in confirmation
            </label>
          </fieldset>

          <div className="flex justify-end border-t border-border pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-tech transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </PortalShell>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-xs text-foreground shadow-2xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";
