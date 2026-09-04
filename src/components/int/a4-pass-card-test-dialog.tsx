import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Download,
  Printer,
  Scissors,
  Eye,
  Sparkles,
  X,
  Maximize2,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Send,
} from "lucide-react";
import { generatePassCardPng } from "@/lib/pass-card-renderer";
import {
  generateA4PassCardPdf,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
  QUADRANT_WIDTH_MM,
  QUADRANT_HEIGHT_MM,
} from "@/lib/pass-card-pdf";
import { Button } from "@/components/ui/button";

export interface A4PassCardTestAttendee {
  id?: string;
  attendee_name: string;
  attendee_email?: string | null;
  job_title?: string | null;
  company?: string | null;
  event_title?: string | null;
}

interface A4PassCardTestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  attendee: A4PassCardTestAttendee | null;
  onSendEmail?: (pdfDataUri: string, attendee: A4PassCardTestAttendee) => Promise<void>;
}

export function A4PassCardTestDialog({
  isOpen,
  onClose,
  attendee,
  onSendEmail,
}: A4PassCardTestDialogProps) {
  const [quadrant, setQuadrant] = useState<
    "top-left" | "top-right" | "bottom-left" | "bottom-right"
  >("top-left");
  const [showCutGuides, setShowCutGuides] = useState(true);
  const [pngDataUrl, setPngDataUrl] = useState<string>("");
  const [pdfDataUri, setPdfDataUri] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [previewMode, setPreviewMode] = useState<"sheet" | "pdf">("sheet");

  // Sample fallback attendee if none provided
  const currentAttendee: A4PassCardTestAttendee = useMemo(() => {
    if (attendee) return attendee;
    return {
      attendee_name: "MR HAFEZ RAHIM",
      job_title: "Developer",
      company: "INTEGRATED TECHNICS",
      event_title: "INTEGRATED TECHNICS SHOWCASE EVENT ITS2026",
    };
  }, [attendee]);

  // Generate PNG & PDF whenever attendee or options change
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsGenerating(true);

    generatePassCardPng({
      attendee_name: currentAttendee.attendee_name,
      job_title: currentAttendee.job_title || "Participant",
      company: currentAttendee.company || "Integrated Technics",
      event_title: currentAttendee.event_title || "INTEGRATED TECHNICS SHOWCASE EVENT ITS2026",
    })
      .then((png) => {
        if (cancelled) return;
        setPngDataUrl(png);

        if (png) {
          const pdfResult = generateA4PassCardPdf(png, {
            attendeeName: currentAttendee.attendee_name,
            quadrant,
            showCutGuides,
          });
          setPdfDataUri(pdfResult.dataUri);
        }
      })
      .catch((err) => console.error("Error generating pass card preview:", err))
      .finally(() => {
        if (!cancelled) setIsGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentAttendee, quadrant, showCutGuides]);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    if (!pngDataUrl) return;
    const pdfResult = generateA4PassCardPdf(pngDataUrl, {
      attendeeName: currentAttendee.attendee_name,
      quadrant,
      showCutGuides,
    });
    pdfResult.download();
  };

  const handlePrint = () => {
    if (!pdfDataUri) return;
    const printWindow = window.open(pdfDataUri, "_blank");
    if (printWindow) {
      printWindow.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between border-b border-border bg-muted/40 px-5 py-3.5 gap-2">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  A4 Pass Card Sheet Test & Preview
                </h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                  4 Cards Layout • 1 Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                A4 (210 × 297 mm) divided into 4 cards (105 × 148.5 mm each). 1 card filled, 3 left blank.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border bg-background p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPreviewMode("sheet")}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  previewMode === "sheet"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                A4 Sheet View
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("pdf")}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  previewMode === "pdf"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Real PDF Embed
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Controls sidebar */}
            <div className="lg:col-span-4 space-y-4">
              {/* Attendee Info Summary */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Badge Recipient Details
                </span>
                <div className="rounded-lg bg-secondary/50 p-3 space-y-1 text-xs">
                  <p className="font-bold text-foreground text-sm">
                    {currentAttendee.attendee_name}
                  </p>
                  <p className="text-muted-foreground">{currentAttendee.job_title || "Participant"}</p>
                  <p className="font-semibold text-primary">{currentAttendee.company || "Integrated Technics"}</p>
                  <p className="text-[11px] text-muted-foreground/80 pt-1 border-t border-border/50">
                    {currentAttendee.event_title || "Integrated Technics Showcase 2026"}
                  </p>
                </div>
              </div>

              {/* Layout Options */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  A4 Quadrant Position
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuadrant("top-left")}
                    className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                      quadrant === "top-left"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    1. Top-Left (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuadrant("top-right")}
                    className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                      quadrant === "top-right"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    2. Top-Right
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuadrant("bottom-left")}
                    className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                      quadrant === "bottom-left"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    3. Bottom-Left
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuadrant("bottom-right")}
                    className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                      quadrant === "bottom-right"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    4. Bottom-Right
                  </button>
                </div>

                {/* Cut Lines Toggle */}
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                    <Scissors className="h-4 w-4 text-primary" />
                    <span>Dashed Cutting Lines</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={showCutGuides}
                    onChange={(e) => setShowCutGuides(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20 accent-primary"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={handleDownloadPdf}
                  disabled={!pdfDataUri || isGenerating}
                  className="w-full gap-2 font-bold shadow-sm"
                >
                  <Download className="h-4 w-4" /> Download A4 Test PDF
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  disabled={!pdfDataUri || isGenerating}
                  className="w-full gap-2 font-medium"
                >
                  <Printer className="h-4 w-4" /> Open / Print PDF Sheet
                </Button>

                {onSendEmail && currentAttendee.attendee_email && (
                  <Button
                    onClick={async () => {
                      if (!pdfDataUri) return;
                      setIsSendingEmail(true);
                      try {
                        await onSendEmail(pdfDataUri, currentAttendee);
                      } finally {
                        setIsSendingEmail(false);
                      }
                    }}
                    disabled={!pdfDataUri || isGenerating || isSendingEmail}
                    variant="default"
                    className="w-full gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <Send className={`h-4 w-4 ${isSendingEmail ? "animate-pulse" : ""}`} />
                    {isSendingEmail ? "Sending..." : `Send to ${currentAttendee.attendee_email}`}
                  </Button>
                )}
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sky-600 dark:text-sky-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ready for Badge Pouches
                </div>
                <p>
                  Prints edge-to-edge on standard A4 paper (210 × 297 mm). Cut along the center guidelines to get 4 standard 105 × 148.5 mm badge cards.
                </p>
              </div>
            </div>

            {/* Interactive Sheet Previewer */}
            <div className="lg:col-span-8 flex flex-col items-center justify-center">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-semibold">Generating A4 PDF sheet...</p>
                </div>
              ) : previewMode === "pdf" && pdfDataUri ? (
                <div className="w-full h-[620px] rounded-2xl overflow-hidden border border-border bg-white shadow-xl">
                  <iframe
                    src={pdfDataUri}
                    title="A4 Pass Card PDF Preview"
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                /* Interactive A4 Sheet Simulator (Exact 210 x 297 mm Aspect Ratio: 1 : 1.414) */
                <div className="flex flex-col items-center w-full max-w-[460px]">
                  <div className="mb-2 flex items-center justify-between w-full text-[11px] text-muted-foreground px-1">
                    <span className="font-mono font-semibold">A4 Sheet: 210mm × 297mm</span>
                    <span className="flex items-center gap-1">
                      <Scissors className="h-3 w-3 text-primary" /> 4 Cards (105×148.5mm)
                    </span>
                  </div>

                  <div
                    className="relative w-full aspect-[210/297] rounded-md bg-white border border-slate-300 shadow-2xl overflow-hidden text-slate-800 select-none"
                    style={{
                      boxShadow: "0 20px 40px -15px rgba(0,0,0,0.3)",
                    }}
                  >
                    {/* Top-Left Quadrant */}
                    <div
                      className={`absolute top-0 left-0 w-1/2 h-1/2 flex items-center justify-center overflow-hidden transition-all ${
                        quadrant === "top-left"
                          ? "bg-white"
                          : "bg-slate-50/70 border-r border-b border-dashed border-slate-300"
                      }`}
                    >
                      {quadrant === "top-left" && pngDataUrl ? (
                        <img
                          src={pngDataUrl}
                          alt="Badge Top Left"
                          className="w-full h-full object-fill pointer-events-none"
                        />
                      ) : (
                        <div className="text-center p-3 text-slate-400">
                          <p className="text-[11px] font-bold uppercase tracking-wider">Card 1</p>
                          <p className="text-[9px] mt-0.5 italic">Empty Quadrant</p>
                        </div>
                      )}
                    </div>

                    {/* Top-Right Quadrant */}
                    <div
                      className={`absolute top-0 right-0 w-1/2 h-1/2 flex items-center justify-center overflow-hidden transition-all ${
                        quadrant === "top-right"
                          ? "bg-white"
                          : "bg-slate-50/70 border-l border-b border-dashed border-slate-300"
                      }`}
                    >
                      {quadrant === "top-right" && pngDataUrl ? (
                        <img
                          src={pngDataUrl}
                          alt="Badge Top Right"
                          className="w-full h-full object-fill pointer-events-none"
                        />
                      ) : (
                        <div className="text-center p-3 text-slate-400">
                          <p className="text-[11px] font-bold uppercase tracking-wider">Card 2</p>
                          <p className="text-[9px] mt-0.5 italic">Empty Quadrant</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom-Left Quadrant */}
                    <div
                      className={`absolute bottom-0 left-0 w-1/2 h-1/2 flex items-center justify-center overflow-hidden transition-all ${
                        quadrant === "bottom-left"
                          ? "bg-white"
                          : "bg-slate-50/70 border-r border-t border-dashed border-slate-300"
                      }`}
                    >
                      {quadrant === "bottom-left" && pngDataUrl ? (
                        <img
                          src={pngDataUrl}
                          alt="Badge Bottom Left"
                          className="w-full h-full object-fill pointer-events-none"
                        />
                      ) : (
                        <div className="text-center p-3 text-slate-400">
                          <p className="text-[11px] font-bold uppercase tracking-wider">Card 3</p>
                          <p className="text-[9px] mt-0.5 italic">Empty Quadrant</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom-Right Quadrant */}
                    <div
                      className={`absolute bottom-0 right-0 w-1/2 h-1/2 flex items-center justify-center overflow-hidden transition-all ${
                        quadrant === "bottom-right"
                          ? "bg-white"
                          : "bg-slate-50/70 border-l border-t border-dashed border-slate-300"
                      }`}
                    >
                      {quadrant === "bottom-right" && pngDataUrl ? (
                        <img
                          src={pngDataUrl}
                          alt="Badge Bottom Right"
                          className="w-full h-full object-fill pointer-events-none"
                        />
                      ) : (
                        <div className="text-center p-3 text-slate-400">
                          <p className="text-[11px] font-bold uppercase tracking-wider">Card 4</p>
                          <p className="text-[9px] mt-0.5 italic">Empty Quadrant</p>
                        </div>
                      )}
                    </div>

                    {/* Center Dashed Cutting Guides Overlay */}
                    {showCutGuides && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Vertical Centerline */}
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 border-r border-dashed border-slate-400/80" />
                        {/* Horizontal Centerline */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0 border-b border-dashed border-slate-400/80" />

                        {/* Scissor icon center marker */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1 border border-slate-300 shadow-xs">
                          <Scissors className="h-3 w-3 text-slate-600" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-border bg-muted/40 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            {onSendEmail
              ? "Verify the layout, then click \"Send via Email\" to dispatch the A4 PDF directly to the attendee."
              : "Test and verify this A4 PDF layout. Once satisfied, use the Send button in the table to dispatch."}
          </p>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Test View
          </Button>
        </footer>
      </div>
    </div>
  );
}
