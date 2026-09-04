import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Save, RefreshCw, Type, Palette, Layout, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendRegistrationConfirmationEmail, sendLiveInvitationEmail, sendPassCardEmail } from "@/lib/email-service";
import { generatePassCardPng } from "@/lib/pass-card-renderer";
import { generateA4PassCardPdf } from "@/lib/pass-card-pdf";
import { uploadPassCardPdf } from "@/lib/pass-storage";

export const Route = createFileRoute("/admin/email-templates")({
  head: () => ({
    meta: [
      { title: "Email Templates — INT Events Admin" },
    ],
  }),
  component: EmailTemplatesPage,
});

export interface EmailTemplateConfig {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  headerText: string;
  headerSubtext: string;
  bodyText: string;
  footerText: string;
  buttonText: string;
  buttonUrl?: string;
  backgroundImageUrl?: string;
  designMode?: 'color' | 'image';
}

export const defaultEmailTemplate: EmailTemplateConfig = {
  logoUrl: "/logo.png",
  primaryColor: "#ea580c", // orange-600
  secondaryColor: "#1e293b", // slate-800
  backgroundColor: "#070b14", // very dark blue
  textColor: "#f8fafc",
  headerText: "Integrated Technics",
  headerSubtext: "التقنيات المتكاملة • Events Gateway",
  bodyText: "It is our pleasure to extend to you an exclusive VIP invitation to attend {eventTitle}. Step into an exclusive technology experience designed to showcase the latest innovations, emerging technologies, and intelligent solutions.",
  footerText: "Integrated Technics Events",
  buttonText: "Register & Book your seat",
  buttonUrl: "",
  backgroundImageUrl: "",
  designMode: "color",
};

export const defaultRegistrationTemplate: EmailTemplateConfig = {
  logoUrl: "/logo.png",
  primaryColor: "#3b82f6", // blue-500
  secondaryColor: "#1e293b", // slate-800
  backgroundColor: "#070b14", // very dark blue
  textColor: "#f8fafc",
  headerText: "Integrated Technics",
  headerSubtext: "التقنيات المتكاملة • Events Gateway",
  bodyText: "Thank you for registering for {eventTitle}, {recipientName}. Your registration is confirmed. We look forward to seeing you at the event.",
  footerText: "Integrated Technics Events",
  buttonText: "View Event Details",
  buttonUrl: "",
  backgroundImageUrl: "",
  designMode: "color",
};

export const defaultBadgeTemplate: EmailTemplateConfig = {
  logoUrl: "/logo.png",
  primaryColor: "#10b981", // emerald-500
  secondaryColor: "#1e293b", // slate-800
  backgroundColor: "#070b14", // very dark blue
  textColor: "#f8fafc",
  headerText: "Integrated Technics",
  headerSubtext: "التقنيات المتكاملة • Events Gateway",
  bodyText: "Your official event badge for {eventTitle} is ready, {recipientName}. Please present your digital pass or the attached badge at the entrance for quick access.",
  footerText: "Integrated Technics Events",
  buttonText: "View Digital Badge",
  buttonUrl: "",
  backgroundImageUrl: "",
  designMode: "color",
};

export function getEmailTemplate(id: string = "default"): EmailTemplateConfig {
  const getDefaults = () => {
    if (id === "registration") return defaultRegistrationTemplate;
    if (id === "badge") return defaultBadgeTemplate;
    return defaultEmailTemplate;
  };
  
  if (typeof window === "undefined") return getDefaults();
  try {
    const saved = localStorage.getItem(`int_email_template_${id}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to parse email template", e);
  }
  return getDefaults();
}

export function saveEmailTemplate(id: string, config: EmailTemplateConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`int_email_template_${id}`, JSON.stringify(config));
}

function EmailTemplatesPage() {
  const [activeTemplateId, setActiveTemplateId] = useState<"default" | "registration" | "badge">("default");
  const [config, setConfig] = useState<EmailTemplateConfig>(defaultEmailTemplate);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const { data, error } = await supabase
          .from("email_templates")
          .select("config")
          .eq("id", activeTemplateId)
          .maybeSingle();
        if (data?.config) {
          setConfig(data.config as EmailTemplateConfig);
        } else {
          setConfig(getEmailTemplate(activeTemplateId)); // fallback to local storage
        }
      } catch (err) {
        setConfig(getEmailTemplate(activeTemplateId));
      }
    };
    loadFromDb();
  }, [activeTemplateId]);

  const handleChange = (key: keyof EmailTemplateConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save to localStorage for immediate client-side preview in other tabs if needed
      saveEmailTemplate(activeTemplateId, config);
      
      // 2. Save to Supabase DB for global availability
      const { error } = await supabase
        .from("email_templates")
        .upsert({ id: activeTemplateId, config });

      if (error) throw error;
      
      const typeName = activeTemplateId === "default" ? "Invitation" : activeTemplateId === "registration" ? "Registration" : "Badge";
      toast.success(`${typeName} template saved successfully.`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save template to database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset to the default template?")) {
      const defaultConf = activeTemplateId === "default" ? defaultEmailTemplate : activeTemplateId === "registration" ? defaultRegistrationTemplate : defaultBadgeTemplate;
      setConfig(defaultConf);
      saveEmailTemplate(activeTemplateId, defaultConf);
      
      try {
        await supabase
          .from("email_templates")
          .upsert({ id: activeTemplateId, config: defaultConf });
        toast.info("Template reset to defaults.");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSendTestEmail = async () => {
    const testEmail = window.prompt("Enter recipient email address for test message:", "event@integratedtechnics.com");
    if (!testEmail || !testEmail.trim()) return;

    setIsSendingTest(true);
    const toastId = toast.loading(`Sending test ${activeTemplateId} email to ${testEmail.trim()}...`);

    try {
      let res;
      if (activeTemplateId === "registration") {
        res = await sendRegistrationConfirmationEmail({
          recipient_name: "Valued Guest (Test)",
          recipient_email: testEmail.trim(),
          event_title: "Integrated Technics Showcase Event 2026",
          template_config: config as any,
        });
      } else if (activeTemplateId === "badge") {
        let passImageBase64: string | undefined = undefined;
        let passPdfBase64: string | undefined = undefined;
        let passPdfUrl: string | undefined = undefined;
        try {
          passImageBase64 = await generatePassCardPng({
            attendee_name: "MR. VALUED GUEST",
            job_title: "Executive Director",
            company: "Integrated Technics",
            event_title: "Integrated Technics Showcase Event 2026",
          });
          if (passImageBase64) {
            const pdfRes = generateA4PassCardPdf(passImageBase64, {
              attendeeName: "MR. VALUED GUEST",
              quadrant: "top-left",
              showCutGuides: true,
            });
            passPdfBase64 = pdfRes.dataUri;

            const uploadedUrl = await uploadPassCardPdf(pdfRes.blob, {
              eventId: "test-event",
              registrationId: "test-reg-id",
              attendeeName: "Valued Guest (Test)",
            });
            if (uploadedUrl) passPdfUrl = uploadedUrl;
          }
        } catch (err) {
          console.warn("Test badge pass card generation error:", err);
        }

        res = await sendPassCardEmail({
          registration_id: "test-reg-id",
          token: "TEST-BADGE-TOKEN",
          recipient_name: "Valued Guest (Test)",
          recipient_email: testEmail.trim(),
          event_title: "Integrated Technics Showcase Event 2026",
          event_date: "November 14, 2026",
          event_location: "Royal Maxim Palace Kempinski",
          job_title: "Executive Director",
          company: "Integrated Technics",
          template_config: config as any,
          pass_image_base64: passImageBase64 || undefined,
          pass_pdf_base64: passPdfBase64 || undefined,
          pass_pdf_url: passPdfUrl || undefined,
        });
      } else {
        res = await sendLiveInvitationEmail({
          recipient_name: "Valued Guest (Test)",
          recipient_email: testEmail.trim(),
          event_title: "Integrated Technics Showcase Event 2026",
          event_date: "November 14, 2026",
          event_location: "Royal Maxim Palace Kempinski",
          template_config: config as any,
        });
      }

      if (res.success) {
        toast.success(`Test email sent successfully to ${testEmail.trim()}`, { id: toastId });
      } else {
        toast.error(res.error || "Failed to send test email", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send test email", { id: toastId });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="p-6 pb-24 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Template Builder</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Customize the appearance and content of your automated emails.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleSendTestEmail}
            disabled={isSendingTest}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Send className="h-4 w-4 text-primary" />
            {isSendingTest ? "Sending Test..." : "Send Test Email"}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>

      <Tabs value={activeTemplateId} onValueChange={(v) => setActiveTemplateId(v as any)} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="default">Invitation Template</TabsTrigger>
          <TabsTrigger value="registration">Registration Template</TabsTrigger>
          <TabsTrigger value="badge">Badge Template</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTemplateId} className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Editor Settings */}
        <div className="space-y-6">
          {/* Colors */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold border-b border-border pb-3">
              <Palette className="h-5 w-5 text-primary" />
              Colors & Branding
            </div>

            {/*
            <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit">
              <button
                onClick={() => handleChange("designMode", "color")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${config.designMode !== 'image' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Colored Brand
              </button>
              <button
                onClick={() => handleChange("designMode", "image")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${config.designMode === 'image' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Image Background
              </button>
            </div>
            */}

            {true ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => handleChange("primaryColor", e.target.value)}
                    className="h-10 w-12 rounded cursor-pointer bg-background border border-input"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => handleChange("primaryColor", e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Secondary / Accent</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.secondaryColor}
                    onChange={(e) => handleChange("secondaryColor", e.target.value)}
                    className="h-10 w-12 rounded cursor-pointer bg-background border border-input"
                  />
                  <input
                    type="text"
                    value={config.secondaryColor}
                    onChange={(e) => handleChange("secondaryColor", e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Background Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.backgroundColor}
                    onChange={(e) => handleChange("backgroundColor", e.target.value)}
                    className="h-10 w-12 rounded cursor-pointer bg-background border border-input"
                  />
                  <input
                    type="text"
                    value={config.backgroundColor}
                    onChange={(e) => handleChange("backgroundColor", e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.textColor}
                    onChange={(e) => handleChange("textColor", e.target.value)}
                    className="h-10 w-12 rounded cursor-pointer bg-background border border-input"
                  />
                  <input
                    type="text"
                    value={config.textColor}
                    onChange={(e) => handleChange("textColor", e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Logo URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.logoUrl}
                  onChange={(e) => handleChange("logoUrl", e.target.value)}
                  placeholder="https://example.com/logo.png or /logo.png"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
                <p className="text-xs text-muted-foreground mt-1">Use a full external URL to ensure it loads in email clients.</p>
              </div>
            </>
            ) : (
            <div className="pt-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Background Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.backgroundImageUrl || ""}
                  onChange={(e) => handleChange("backgroundImageUrl", e.target.value)}
                  placeholder="https://example.com/bg.png"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Image to display in the email background.</p>
            </div>
            )}
          </div>

          {/* Typography & Content */}
          {true && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold border-b border-border pb-3">
                <Type className="h-5 w-5 text-primary" />
                Content & Text
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Header Title</label>
                <input
                  type="text"
                  value={config.headerText}
                  onChange={(e) => handleChange("headerText", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Header Subtitle</label>
              <input
                type="text"
                value={config.headerSubtext}
                onChange={(e) => handleChange("headerSubtext", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex justify-between">
                <span>Body Content</span>
                <span className="text-xs text-primary font-normal">Use {"{recipientName}"} for dynamic name</span>
              </label>
              <textarea
                rows={4}
                value={config.bodyText}
                onChange={(e) => handleChange("bodyText", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Button Text</label>
                  <input
                    type="text"
                    value={config.buttonText}
                    onChange={(e) => handleChange("buttonText", e.target.value)}
                    placeholder="e.g. View Event Details"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Button URL (Redirect Link)</label>
                  <input
                    type="url"
                    value={config.buttonUrl || ""}
                    onChange={(e) => handleChange("buttonUrl", e.target.value)}
                    placeholder={
                      activeTemplateId === "registration"
                        ? "https://events.integratedtechnics.com or leave blank for default"
                        : activeTemplateId === "badge"
                        ? "https://events.integratedtechnics.com/my-passes"
                        : "https://events.integratedtechnics.com/register/..."
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">URL opened when recipient clicks button (leave empty for default event link).</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Footer Text</label>
                <input
                  type="text"
                  value={config.footerText}
                  onChange={(e) => handleChange("footerText", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
            <Layout className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Live HTML Preview</h3>
          </div>
          <div className="flex-1 bg-neutral-900 overflow-y-auto p-4 flex justify-center items-start min-h-[600px]">
            <div 
              style={{
                width: '100%',
                maxWidth: '580px',
                backgroundColor: config.backgroundColor,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                color: config.textColor,
                padding: '32px 12px',
                boxSizing: 'border-box'
              }}
            >
              {false ? (
                config.backgroundImageUrl ? (
                  <div 
                    style={{ 
                      width: '100%', 
                      aspectRatio: '3/4',
                      backgroundImage: `url(${config.backgroundImageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: '20px', 
                      border: '1px solid #1e293b',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      padding: '24px'
                    }}
                  >
                    <div style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(8px)',
                      padding: '24px',
                      borderRadius: '16px',
                      color: '#fff',
                      textAlign: 'center',
                      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
                    }}>
                      <h2 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 700 }}>John Doe</h2>
                      <p style={{ margin: '0 0 4px', fontSize: '16px', color: '#e2e8f0' }}>Senior Executive</p>
                      <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Integrated Technics</p>
                      
                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)', margin: '16px 0' }}></div>
                      
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: config.primaryColor || '#38bdf8' }}>
                        {config.headerText || 'Event Title Here'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', border: '2px dashed #334155', borderRadius: '20px' }}>
                    Please enter an image URL to see the preview.
                  </div>
                )
              ) : (
                <div style={{
                  backgroundColor: config.secondaryColor,
                  border: '1px solid #1e293b',
                  borderRadius: '20px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '24px 28px',
                    background: `linear-gradient(135deg, ${config.secondaryColor} 0%, #1e293b 60%, ${config.primaryColor} 100%)`,
                  borderBottom: '1px solid #334155'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {config.logoUrl && (
                      <img src={config.logoUrl} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', background: '#fff', borderRadius: '10px', padding: 4 }} />
                    )}
                    <div>
                      <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 800 }}>{config.headerText}</h2>
                      <p style={{ margin: '2px 0 0', color: config.primaryColor, fontSize: '12px', fontWeight: 600 }}>{config.headerSubtext}</p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '28px', fontSize: '14px', lineHeight: 1.6 }}>
                  <p style={{ margin: '0 0 8px', color: config.primaryColor, fontSize: '12px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>
                    {activeTemplateId === "default" ? "Official Invitation" : activeTemplateId === "registration" ? "Registration Confirmation" : "Event Badge"}
                  </p>
                  <h1 style={{ margin: '0 0 12px', color: '#fff', fontSize: '22px' }}>Event Title Here</h1>
                  
                  <div style={{ whiteSpace: 'pre-wrap', marginBottom: '18px', color: '#94a3b8' }}>
                    {config.bodyText.replace('{recipientName}', 'John Doe')}
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', borderLeft: `4px solid ${config.primaryColor}`, fontSize: '13px' }}>
                    <p style={{ margin: '0 0 6px' }}><strong>Date:</strong> November 14, 2026</p>
                    <p style={{ margin: '0 0 6px' }}><strong>Venue:</strong> Royal Maxim Palace Kempinski</p>
                    {activeTemplateId === "default" ? (
                      <p style={{ margin: 0 }}><strong>Invitation code:</strong> EVT-INV-XXXXXX</p>
                    ) : activeTemplateId === "registration" ? (
                      <p style={{ margin: 0 }}><strong>Ticket ID:</strong> TKT-REG-XXXXXX</p>
                    ) : (
                      <p style={{ margin: 0 }}><strong>Badge ID:</strong> BDG-XXXXXX</p>
                    )}
                  </div>

                  <p style={{ margin: '22px 0 0', textAlign: 'center' }}>
                    <a href="#" onClick={e => e.preventDefault()} style={{ display: 'inline-block', padding: '13px 26px', background: config.primaryColor, color: '#fff', borderRadius: '10px', fontWeight: 700, textDecoration: 'none' }}>
                      {config.buttonText}
                    </a>
                  </p>
                </div>

                  <div style={{ padding: '18px 28px', background: '#090e1a', borderTop: '1px solid #1e293b', color: '#64748b', fontSize: '11px', textAlign: 'center' }}>
                    {config.footerText}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TabsContent>
  </Tabs>
</div>
);
}
