import { useState, useRef, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PortalShell, PageHeading } from "@/components/int/portal-shell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserAvatar } from "@/lib/logos";
import {
  User,
  Building,
  Mail,
  Phone,
  Briefcase,
  Globe,
  Save,
  CheckCircle2,
  IdCard,
  UploadCloud,
  FileText,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Camera,
  QrCode,
  Calendar,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  BadgeCheck,
  MapPin,
  ExternalLink,
  Shield,
  CreditCard,
  FileCheck,
  Lock,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Account Profile — INT Events" },
      {
        name: "description",
        content: "Manage your INT Events account details, company information, identification and summit credentials.",
      },
      { property: "og:title", content: "Account Profile — INT Events" },
      { property: "og:description", content: "Your INT Events account settings and verification." },
    ],
  }),
  component: Profile,
});

interface IdDoc {
  name: string;
  size?: string;
  type: string;
  uploadedAt: string;
  dataUrl?: string;
}

export function Profile() {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || null);
  const [mobileTab, setMobileTab] = useState<"details" | "id" | "preferences">("id");

  const [formData, setFormData] = useState({
    name: user?.name || "Ahmed Mohamed",
    email: user?.email || "client@intevents.com",
    company: user?.company || "ABC Corporation",
    phone: "+20 100 123 4567",
    jobTitle: "IT Director",
    country: "Egypt",
    city: "Cairo",
    reminders: true,
    smsConfirmation: true,
    newsletter: true,
  });

  // Identification state
  const [docType, setDocType] = useState<"national-id" | "passport">("national-id");
  const [nid, setNid] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [frontDoc, setFrontDoc] = useState<IdDoc | null>(null);
  const [backDoc, setBackDoc] = useState<IdDoc | null>(null);
  const [passportDoc, setPassportDoc] = useState<IdDoc | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Load persisted profile and identification on mount
  useEffect(() => {
    if (user?.avatar_url) {
      setAvatarUrl(user.avatar_url);
    }
    try {
      const stored = localStorage.getItem(`int-profile-id-${user?.email || "default"}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.docType) setDocType(parsed.docType);
        if (parsed.nid) setNid(parsed.nid);
        if (parsed.passportNumber) setPassportNumber(parsed.passportNumber);
        if (parsed.frontDoc) setFrontDoc(parsed.frontDoc);
        if (parsed.backDoc) setBackDoc(parsed.backDoc);
        if (parsed.passportDoc) setPassportDoc(parsed.passportDoc);
        if (parsed.avatarUrl) setAvatarUrl(parsed.avatarUrl);
        if (parsed.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }));
      }
    } catch {
      // ignore
    }

    // Fetch live profile details and identification documents from Supabase
    const fetchDbProfile = async () => {
      try {
        const cleanEmail = user?.email?.toLowerCase();
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .or(`id.eq.${user?.id},email.ilike.${cleanEmail}`)
          .maybeSingle();

        if (data) {
          setFormData((prev) => ({
            ...prev,
            name: data.full_name || prev.name,
            company: data.company || prev.company,
            jobTitle: data.job_title || prev.jobTitle,
            phone: data.phone || prev.phone,
            country: data.country || prev.country,
            city: data.city || prev.city,
          }));

          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url);
          }

          if (data.id_type === "Passport") {
            setDocType("passport");
            if (data.id_number) setPassportNumber(data.id_number);
            if (data.document_url || data.id_doc_name) {
              setPassportDoc({
                name: data.id_doc_name || "Passport_Copy.pdf",
                size: "1.4 MB",
                type: "application/pdf",
                uploadedAt: new Date().toLocaleDateString(),
                dataUrl: data.document_url || undefined,
              });
            }
          } else {
            setDocType("national-id");
            if (data.id_number) setNid(data.id_number);
            if (data.document_url || data.id_doc_name) {
              setFrontDoc({
                name: data.id_doc_name || "National_ID_Front.jpg",
                size: "820 KB",
                type: "image/jpeg",
                uploadedAt: new Date().toLocaleDateString(),
                dataUrl: data.document_url || undefined,
              });
            }
          }
        }
      } catch {
        // ignore
      }
    };

    fetchDbProfile();
  }, [user]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar size must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      toast.success("Profile photo updated! Click Save to apply changes.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: "front" | "back" | "passport") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Document size must be under 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const doc: IdDoc = {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.type,
        uploadedAt: new Date().toLocaleDateString(),
        dataUrl: reader.result as string,
      };

      if (slot === "front") setFrontDoc(doc);
      if (slot === "back") setBackDoc(doc);
      if (slot === "passport") setPassportDoc(doc);

      toast.success(`Attached ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const hasUploadedDocs =
    docType === "national-id" ? Boolean(frontDoc || backDoc) : Boolean(passportDoc);

  const isFullyVerified =
    docType === "national-id"
      ? Boolean(frontDoc && backDoc && nid.length === 14)
      : Boolean(passportDoc && passportNumber.trim().length > 3);

  // Profile completion calculation
  const completionPercentage = useMemo(() => {
    let score = 0;
    const total = 7;
    if (formData.name) score += 1;
    if (formData.email) score += 1;
    if (formData.company) score += 1;
    if (formData.phone) score += 1;
    if (formData.jobTitle) score += 1;
    if (avatarUrl) score += 1;
    if (hasUploadedDocs) score += 1;
    return Math.round((score / total) * 100);
  }, [formData, avatarUrl, hasUploadedDocs]);

  const nidError =
    nid.length === 0
      ? ""
      : !/^[23]/.test(nid)
        ? "National ID must start with 2 or 3."
        : nid.length !== 14
          ? `Must be 14 digits (${nid.length}/14 entered).`
          : "";

  const handleCopyId = () => {
    const intId = `INT-${user?.id ? user.id.slice(0, 8).toUpperCase() : "USR-2026"}`;
    navigator.clipboard.writeText(intId);
    setCopiedId(true);
    toast.success("INT Participant ID copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      localStorage.setItem(
        `int-profile-id-${user?.email || "default"}`,
        JSON.stringify({
          docType,
          nid,
          passportNumber,
          frontDoc,
          backDoc,
          passportDoc,
          avatarUrl,
          formData,
        })
      );
    } catch {
      // ignore
    }

    try {
      if (user?.id) {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: formData.name,
          email: formData.email,
          company: formData.company,
          phone: formData.phone,
          job_title: formData.jobTitle,
          country: formData.country,
          city: formData.city,
          role: user.role || "client",
          avatar_url: avatarUrl,
          id_type: docType === "national-id" ? "National ID" : "Passport",
          id_number: docType === "national-id" ? nid : passportNumber,
          document_url: docType === "national-id" ? (frontDoc?.dataUrl || frontDoc?.name) : (passportDoc?.dataUrl || passportDoc?.name),
          id_doc_name: docType === "national-id" ? frontDoc?.name : passportDoc?.name,
          updated_at: new Date().toISOString(),
        } as any);
      }

      updateUser({
        name: formData.name,
        company: formData.company,
        email: formData.email,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      });

      toast.success("Profile & identification documents saved successfully!");
    } catch {
      updateUser({
        name: formData.name,
        company: formData.company,
        email: formData.email,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      });
      toast.success("Profile updated!");
    } finally {
      setSaving(false);
    }
  };

  const participantId = `INT-${user?.id ? user.id.slice(0, 8).toUpperCase() : "USR-882194"}`;

  return (
    <PortalShell>
      {/* Mobile Top Header & Navigation */}
      <div className="md:hidden mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={avatarUrl || getUserAvatar(formData.name, user?.role, user?.avatar_url)}
                alt={formData.name}
                className="h-13 w-13 rounded-2xl object-cover border-2 border-primary/40 shadow-xs"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-5.5 w-5.5 place-items-center rounded-full bg-primary text-white shadow-xs hover:bg-tech transition-transform active:scale-90"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground flex items-center gap-1.5">
                {formData.name}
              </h1>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {formData.jobTitle || "Attendee"} · {formData.company}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="rounded-full bg-primary/10 px-2 py-0.2 text-[10px] font-bold text-primary">
                  {user?.role || "Client"}
                </span>
                <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-secondary px-1.5 py-0.2 rounded">
                  {participantId}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyId}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary active:scale-95 transition-transform shrink-0"
            title="Copy ID"
          >
            {copiedId ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile Tabs Switcher */}
        <div className="flex rounded-xl border border-border bg-muted/40 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMobileTab("id")}
            className={cn(
              "flex-1 rounded-lg py-2 font-bold transition-all text-center flex items-center justify-center gap-1.5",
              mobileTab === "id"
                ? "bg-card text-foreground shadow-2xs text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <IdCard className="h-4 w-4" /> ID & Pass
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("details")}
            className={cn(
              "flex-1 rounded-lg py-2 font-bold transition-all text-center flex items-center justify-center gap-1.5",
              mobileTab === "details"
                ? "bg-card text-foreground shadow-2xs text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-4 w-4" /> Personal
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("preferences")}
            className={cn(
              "flex-1 rounded-lg py-2 font-bold transition-all text-center flex items-center justify-center gap-1.5",
              mobileTab === "preferences"
                ? "bg-card text-foreground shadow-2xs text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bell className="h-4 w-4" /> Alerts
          </button>
        </div>
      </div>

      {/* Desktop Heading */}
      <div className="hidden md:block">
        <PageHeading
          title="Account Profile & Credentials"
          subtitle="Identity documents, digital security badge and account credentials synced across INT summits."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Identity Sidebar (Desktop) */}
        <aside className="hidden md:block space-y-5 lg:col-span-4 lg:sticky lg:top-20">
          {/* Main Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card flex flex-col items-center text-center">
            {/* Avatar with Camera Overlay */}
            <div className="relative group">
              <img
                src={avatarUrl || getUserAvatar(formData.name, user?.role, user?.avatar_url)}
                alt={formData.name}
                className="h-24 w-24 rounded-full object-cover border-2 border-primary/40 shadow-md"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-tech transition-colors cursor-pointer"
                title="Change profile photo"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <h2 className="mt-4 text-lg font-bold text-foreground">{formData.name}</h2>
            <p className="text-xs text-muted-foreground">{formData.jobTitle || "Attendee"} · {formData.company}</p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                <BadgeCheck className="h-3.5 w-3.5" /> {user?.role || "Client"} Account
              </span>
            </div>

            {/* ID Status Pill */}
            <div className="mt-4 w-full border-t border-border pt-4">
              {isFullyVerified ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="h-4 w-4" /> ID Verified
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
              ) : hasUploadedDocs ? (
                <div className="flex items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/10 p-2.5 text-xs text-sky-600 dark:text-sky-400">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="h-4 w-4" /> ID Uploaded
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 px-2 py-0.5 rounded">
                    Attached
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="h-4 w-4" /> ID Pending Upload
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded">
                    Action Needed
                  </span>
                </div>
              )}
            </div>

            {/* Profile Completion Meter */}
            <div className="mt-4 w-full text-left space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">Profile Completion</span>
                <span className="text-primary">{completionPercentage}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {completionPercentage < 100
                  ? "Upload identification & complete phone to enable express check-in."
                  : "All profile requirements verified for instant gate badge printing."}
              </p>
            </div>
          </div>

          {/* Quick Account Details & Credentials Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Account Credentials
            </h3>

            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 p-2.5">
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Participant ID</p>
                <p className="font-mono text-xs font-bold text-foreground">{participantId}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                title="Copy ID"
              >
                {copiedId ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <Link
                to="/passes"
                className="flex items-center justify-between rounded-lg border border-border/80 bg-secondary/50 p-2.5 font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" /> My Digital Passes
                </span>
                <span className="text-[11px] text-muted-foreground font-semibold">View &rarr;</span>
              </Link>

              <Link
                to="/my-events"
                className="flex items-center justify-between rounded-lg border border-border/80 bg-secondary/50 p-2.5 font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> My Registered Summits
                </span>
                <span className="text-[11px] text-muted-foreground font-semibold">View &rarr;</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Right Column: Main Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-5 lg:col-span-8 pb-20 md:pb-0">
          {/* ========================================================================= */}
          {/* TAB 1: ID & DIGITAL SECURITY PASS (MOBILE + DESKTOP) */}
          {/* ========================================================================= */}
          <div
            className={cn(
              "space-y-3 max-w-full sm:max-w-2xl",
              mobileTab !== "id" ? "hidden md:block" : "block"
            )}
          >
            {/* 1. Mobile Digital VIP Security Pass Badge Card (Compact) */}
            <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-card via-card to-primary/10 p-3 sm:p-4 shadow-md w-full min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/60 pb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <img src="/logo.png" alt="INT" className="h-5 w-5 object-contain bg-white rounded-md p-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[8.5px] font-black uppercase tracking-widest text-primary block truncate">
                      INT SUMMIT 2026
                    </span>
                    <span className="text-[11px] font-bold text-foreground truncate block">Security Credential</span>
                  </div>
                </div>

                {isFullyVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    <ShieldCheck className="h-2.5 w-2.5" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                    <AlertCircle className="h-2.5 w-2.5" /> ID Needed
                  </span>
                )}
              </div>

              {/* Pass Body */}
              <div className="mt-2.5 flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {formData.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {formData.jobTitle || "Delegate"} · {formData.company}
                  </p>
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20 shrink-0">
                      {participantId}
                    </span>
                    <span className="text-[9.5px] font-medium text-muted-foreground uppercase truncate">
                      {docType === "national-id" ? "NID" : "Passport"}: {nid || passportNumber || "Not Set"}
                    </span>
                  </div>
                </div>

                {/* QR Code Action Thumbnail */}
                <Link
                  to="/passes"
                  className="group relative flex flex-col items-center justify-center rounded-lg border border-primary/30 bg-card p-1 shadow-2xs transition-transform active:scale-95 shrink-0"
                >
                  <QrCode className="h-7 w-7 text-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[7.5px] font-bold text-primary uppercase">View</span>
                </Link>
              </div>

              {/* Quick Action Links */}
              <div className="mt-2.5 grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/40">
                <Link
                  to="/passes"
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 py-1.5 px-2 text-[11px] font-bold text-primary transition-colors active:scale-98 text-center"
                >
                  <QrCode className="h-3 w-3" /> VIP QR Pass
                </Link>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card py-1.5 px-2 text-[11px] font-semibold text-foreground hover:bg-secondary active:scale-95 transition-transform"
                >
                  {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedId ? "Copied" : "Copy ID"}</span>
                </button>
              </div>
            </div>

            {/* 2. Identification Document Verification Card (Compact) */}
            <div className="rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm space-y-3 w-full min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border/80 pb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <IdCard className="h-3.5 w-3.5 text-primary shrink-0" />
                  <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-foreground truncate">
                    Government ID Authentication
                  </h3>
                </div>
                <span className="text-[9.5px] text-muted-foreground font-medium shrink-0">Gate Printing</span>
              </div>

              {/* Document Type Selector Cards */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Document Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDocType("national-id")}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-lg border p-2 text-left transition-all cursor-pointer relative overflow-hidden min-w-0",
                      docType === "national-id"
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30 shadow-2xs"
                        : "border-border bg-secondary/30 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <CreditCard className={cn("h-3.5 w-3.5", docType === "national-id" ? "text-primary" : "text-muted-foreground")} />
                      {docType === "national-id" && <CheckCircle2 className="h-3 w-3 text-primary" />}
                    </div>
                    <span className="text-[11px] font-bold text-foreground truncate w-full">National ID</span>
                    <span className="text-[9.5px] text-muted-foreground truncate w-full">14-digit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocType("passport")}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-lg border p-2 text-left transition-all cursor-pointer relative overflow-hidden min-w-0",
                      docType === "passport"
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30 shadow-2xs"
                        : "border-border bg-secondary/30 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Globe className={cn("h-3.5 w-3.5", docType === "passport" ? "text-primary" : "text-muted-foreground")} />
                      {docType === "passport" && <CheckCircle2 className="h-3 w-3 text-primary" />}
                    </div>
                    <span className="text-[11px] font-bold text-foreground truncate w-full">Passport</span>
                    <span className="text-[9.5px] text-muted-foreground truncate w-full">Photo Page</span>
                  </button>
                </div>
              </div>

              {/* ID / Passport Number Input Field */}
              {docType === "national-id" ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-foreground">
                      National ID Number <span className="text-destructive">*</span>
                    </label>
                    <span className={cn("text-[9.5px] font-mono font-bold", nid.length === 14 ? "text-emerald-500" : "text-muted-foreground")}>
                      {nid.length}/14
                    </span>
                  </div>
                  <input
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="e.g. 29001011234567"
                    value={nid}
                    onChange={(e) => setNid(e.target.value.replace(/\D/g, "").slice(0, 14))}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground shadow-2xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                  {nidError ? (
                    <p className="text-[10px] font-semibold text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {nidError}
                    </p>
                  ) : nid.length === 14 ? (
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Valid 14-digit format
                    </p>
                  ) : (
                    <p className="text-[9.5px] text-muted-foreground">
                      14 digits as printed on your National Card.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">
                    Passport Number <span className="text-destructive">*</span>
                  </label>
                  <input
                    placeholder="e.g. A12345678"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground shadow-2xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              )}

              {/* Hidden File Inputs */}
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "front")}
              />
              <input
                ref={backInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "back")}
              />
              <input
                ref={passportInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "passport")}
              />

              {/* Mobile-First Document Photo Upload Cards (Compact) */}
              <div className="space-y-2 pt-0.5">
                <label className="text-[11px] font-bold text-foreground block">
                  Document Copies
                </label>

                {docType === "national-id" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {/* Front Copy Slot */}
                    <div className="rounded-lg border border-border bg-secondary/30 p-2.5 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3 text-primary" /> Front Side
                        </span>
                        {frontDoc ? (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded">
                            Attached
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded">
                            Required
                          </span>
                        )}
                      </div>

                      {frontDoc ? (
                        <div className="rounded-lg border border-border/80 bg-card p-2 text-xs shadow-2xs space-y-1.5">
                          <div className="flex items-center gap-2 overflow-hidden min-w-0">
                            {frontDoc.dataUrl && frontDoc.type.startsWith("image/") ? (
                              <img src={frontDoc.dataUrl} alt="Front ID" className="h-9 w-12 rounded object-cover border border-border shrink-0" />
                            ) : (
                              <div className="grid h-9 w-9 place-items-center rounded bg-primary/10 text-primary shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                            )}
                            <div className="truncate min-w-0">
                              <p className="truncate font-bold text-foreground text-[11px]">{frontDoc.name}</p>
                              <p className="text-[9.5px] text-muted-foreground">{frontDoc.size}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/50">
                            <button
                              type="button"
                              onClick={() => frontInputRef.current?.click()}
                              className="rounded px-2 py-0.5 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setFrontDoc(null)}
                              className="rounded p-1 text-[10px] text-destructive hover:bg-destructive/10 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => frontInputRef.current?.click()}
                          className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-card/60 p-2.5 text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-98 cursor-pointer"
                        >
                          <Camera className="h-4 w-4 text-primary mb-0.5" />
                          <span className="text-[11px] font-bold text-foreground">Upload Front Side</span>
                          <span className="text-[9px] text-muted-foreground">Photo or PDF</span>
                        </button>
                      )}
                    </div>

                    {/* Back Copy Slot */}
                    <div className="rounded-lg border border-border bg-secondary/30 p-2.5 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3 text-primary" /> Back Side
                        </span>
                        {backDoc ? (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded">
                            Attached
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded">
                            Required
                          </span>
                        )}
                      </div>

                      {backDoc ? (
                        <div className="rounded-lg border border-border/80 bg-card p-2 text-xs shadow-2xs space-y-1.5">
                          <div className="flex items-center gap-2 overflow-hidden min-w-0">
                            {backDoc.dataUrl && backDoc.type.startsWith("image/") ? (
                              <img src={backDoc.dataUrl} alt="Back ID" className="h-9 w-12 rounded object-cover border border-border shrink-0" />
                            ) : (
                              <div className="grid h-9 w-9 place-items-center rounded bg-primary/10 text-primary shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                            )}
                            <div className="truncate min-w-0">
                              <p className="truncate font-bold text-foreground text-[11px]">{backDoc.name}</p>
                              <p className="text-[9.5px] text-muted-foreground">{backDoc.size}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/50">
                            <button
                              type="button"
                              onClick={() => backInputRef.current?.click()}
                              className="rounded px-2 py-0.5 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setBackDoc(null)}
                              className="rounded p-1 text-[10px] text-destructive hover:bg-destructive/10 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => backInputRef.current?.click()}
                          className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-card/60 p-2.5 text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-98 cursor-pointer"
                        >
                          <Camera className="h-4 w-4 text-primary mb-0.5" />
                          <span className="text-[11px] font-bold text-foreground">Upload Back Side</span>
                          <span className="text-[9px] text-muted-foreground">Photo or PDF</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Passport Copy Slot */
                  <div className="rounded-lg border border-border bg-secondary/30 p-2.5 space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3 text-primary" /> Passport Info Page
                      </span>
                      {passportDoc ? (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded">
                          Attached
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded">
                          Required
                        </span>
                      )}
                    </div>

                    {passportDoc ? (
                      <div className="rounded-lg border border-border/80 bg-card p-2 text-xs shadow-2xs space-y-1.5">
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                          {passportDoc.dataUrl && passportDoc.type.startsWith("image/") ? (
                            <img src={passportDoc.dataUrl} alt="Passport" className="h-10 w-14 rounded object-cover border border-border shrink-0" />
                          ) : (
                            <div className="grid h-9 w-9 place-items-center rounded bg-primary/10 text-primary shrink-0">
                              <Globe className="h-4 w-4" />
                            </div>
                          )}
                          <div className="truncate min-w-0">
                            <p className="truncate font-bold text-foreground text-[11px]">{passportDoc.name}</p>
                            <p className="text-[9.5px] text-muted-foreground">{passportDoc.size}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/50">
                          <button
                            type="button"
                            onClick={() => passportInputRef.current?.click()}
                            className="rounded px-2 py-0.5 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => setPassportDoc(null)}
                            className="rounded p-1 text-[10px] text-destructive hover:bg-destructive/10 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => passportInputRef.current?.click()}
                        className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-card/60 p-3 text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-98 cursor-pointer"
                      >
                        <UploadCloud className="h-5 w-5 text-primary mb-0.5" />
                        <span className="text-[11px] font-bold text-foreground">Upload Passport Page</span>
                        <span className="text-[9px] text-muted-foreground">Photo or PDF scan</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Security Privacy Notice */}
              <div className="flex items-center gap-1.5 rounded-lg bg-secondary/60 p-2 text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3 text-primary shrink-0" />
                <span>
                  Encrypted & processed strictly for summit accreditation.
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 2: PERSONAL DETAILS (MOBILE + DESKTOP) */}
          {/* ========================================================================= */}
          <div
            className={cn(
              "rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card space-y-4",
              mobileTab !== "details" ? "hidden md:block" : "block"
            )}
          >
            <div className="border-b border-border/80 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Personal & Organization Details
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">Printed on Summit Badges</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ahmed Mohamed"
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@company.com"
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Company / Organization <span className="text-destructive">*</span>
                </label>
                <input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Organization or Enterprise name"
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Phone / Mobile (with country code)
                </label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+20 1X XXX XXXX"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Job Title <span className="text-destructive">*</span>
                </label>
                <input
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="e.g. IT Director / Security Manager"
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  Country
                </label>
                <input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g. Egypt, UAE, Saudi Arabia"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-foreground">
                  City
                </label>
                <input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Cairo, Alexandria, Dubai"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 3: NOTIFICATIONS & PREFERENCES (MOBILE + DESKTOP) */}
          {/* ========================================================================= */}
          <div
            className={cn(
              "rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card space-y-4",
              mobileTab !== "preferences" ? "hidden md:block" : "block"
            )}
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border/80 pb-3">
              Notifications & Preferences
            </h3>

            <div className="space-y-2.5">
              <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3 text-xs font-medium text-foreground cursor-pointer hover:bg-secondary/40 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.reminders}
                  onChange={(e) => setFormData({ ...formData, reminders: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-[var(--primary)]"
                />
                <div>
                  <span className="font-semibold block text-foreground">Email Summit Reminders</span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground">Receive keynote schedules, speaker briefs and logistics prior to event days.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3 text-xs font-medium text-foreground cursor-pointer hover:bg-secondary/40 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.smsConfirmation}
                  onChange={(e) => setFormData({ ...formData, smsConfirmation: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-[var(--primary)]"
                />
                <div>
                  <span className="font-semibold block text-foreground">SMS Gate Check-in Alerts</span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground">Instant SMS confirmation when your QR badge is scanned at entrance gates.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3 text-xs font-medium text-foreground cursor-pointer hover:bg-secondary/40 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.newsletter}
                  onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-[var(--primary)]"
                />
                <div>
                  <span className="font-semibold block text-foreground">INT Security Briefings</span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground">Quarterly industry insights and partner announcements.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-card">
            <button
              type="button"
              onClick={() => {
                toast.info("Form reset to saved defaults.");
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 sm:px-4 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-primary px-5 sm:px-6 text-xs font-bold text-primary-foreground shadow-sm hover:bg-tech transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Profile & Documents"}
            </button>
          </div>
        </form>
      </div>
    </PortalShell>
  );
}

const inputClass =
  "h-10 sm:h-11 w-full rounded-xl border border-input bg-background px-3.5 text-xs sm:text-sm text-foreground shadow-2xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";
