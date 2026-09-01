import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Save, RefreshCw, Type, Palette, Layout } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

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
};

export function getEmailTemplate(): EmailTemplateConfig {
  if (typeof window === "undefined") return defaultEmailTemplate;
  try {
    const saved = localStorage.getItem("int_email_template");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to parse email template", e);
  }
  return defaultEmailTemplate;
}

export function saveEmailTemplate(config: EmailTemplateConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem("int_email_template", JSON.stringify(config));
}

function EmailTemplatesPage() {
  const [config, setConfig] = useState<EmailTemplateConfig>(defaultEmailTemplate);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const { data, error } = await supabase
          .from("email_templates")
          .select("config")
          .eq("id", "default")
          .maybeSingle();
        if (data?.config) {
          setConfig(data.config as EmailTemplateConfig);
        } else {
          setConfig(getEmailTemplate()); // fallback to local storage
        }
      } catch (err) {
        setConfig(getEmailTemplate());
      }
    };
    loadFromDb();
  }, []);

  const handleChange = (key: keyof EmailTemplateConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save to localStorage for immediate client-side preview in other tabs if needed
      saveEmailTemplate(config);
      
      // 2. Save to Supabase DB for global availability
      const { error } = await supabase
        .from("email_templates")
        .upsert({ id: "default", config });

      if (error) throw error;
      
      toast.success("Email template saved successfully. It will be used for future invitations.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save template to database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset to the default template?")) {
      setConfig(defaultEmailTemplate);
      saveEmailTemplate(defaultEmailTemplate);
      
      try {
        await supabase
          .from("email_templates")
          .upsert({ id: "default", config: defaultEmailTemplate });
        toast.info("Template reset to defaults.");
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="p-6 pb-24 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Template Builder</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Customize the VIP invitation email appearance and content.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor Settings */}
        <div className="space-y-6">
          {/* Colors */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold border-b border-border pb-3">
              <Palette className="h-5 w-5 text-primary" />
              Colors & Branding
            </div>
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
          </div>

          {/* Typography & Content */}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Button Text</label>
                <input
                  type="text"
                  value={config.buttonText}
                  onChange={(e) => handleChange("buttonText", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
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
          </div>
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
                  <p style={{ margin: '0 0 8px', color: config.primaryColor, fontSize: '12px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>Official Invitation</p>
                  <h1 style={{ margin: '0 0 12px', color: '#fff', fontSize: '22px' }}>Event Title Here</h1>
                  
                  <div style={{ whiteSpace: 'pre-wrap', marginBottom: '18px', color: '#94a3b8' }}>
                    {config.bodyText.replace('{recipientName}', 'John Doe')}
                  </div>

                  <div style={{ padding: '16px', background: '#1e293b', borderRadius: '12px', borderLeft: `4px solid ${config.primaryColor}`, fontSize: '13px' }}>
                    <p style={{ margin: '0 0 6px' }}><strong>Date:</strong> November 14, 2026</p>
                    <p style={{ margin: '0 0 6px' }}><strong>Venue:</strong> Royal Maxim Palace Kempinski</p>
                    <p style={{ margin: 0 }}><strong>Invitation code:</strong> EVT-INV-XXXXXX</p>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
