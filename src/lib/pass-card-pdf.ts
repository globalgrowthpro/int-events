import { jsPDF } from "jspdf";

export interface A4PassCardPdfOptions {
  attendeeName?: string;
  quadrant?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  showCutGuides?: boolean;
  marginMm?: number; // Margin within the 105 x 148.5 mm quadrant box
}

export interface GeneratedA4PdfResult {
  doc: jsPDF;
  blob: Blob;
  dataUri: string;
  download: (filename?: string) => void;
}

/**
 * Standard A4 Dimensions in Millimeters
 */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const QUADRANT_WIDTH_MM = 105; // A4_WIDTH_MM / 2
export const QUADRANT_HEIGHT_MM = 148.5; // A4_HEIGHT_MM / 2

/**
 * Generates an A4 PDF document divided into 4 card quadrants,
 * with exactly 1 quadrant filled by the badge PNG image,
 * and the other 3 quadrants left empty.
 */
export function generateA4PassCardPdf(
  pngDataUrl: string,
  options: A4PassCardPdfOptions = {}
): GeneratedA4PdfResult {
  const {
    attendeeName = "Attendee",
    quadrant = "top-left",
    showCutGuides = true,
    marginMm = 0,
  } = options;

  // Create A4 portrait document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Calculate coordinates for the selected quadrant
  let targetX = 0;
  let targetY = 0;

  switch (quadrant) {
    case "top-left":
      targetX = 0;
      targetY = 0;
      break;
    case "top-right":
      targetX = QUADRANT_WIDTH_MM;
      targetY = 0;
      break;
    case "bottom-left":
      targetX = 0;
      targetY = QUADRANT_HEIGHT_MM;
      break;
    case "bottom-right":
      targetX = QUADRANT_WIDTH_MM;
      targetY = QUADRANT_HEIGHT_MM;
      break;
  }

  // Card dimensions within quadrant
  const cardX = targetX + marginMm;
  const cardY = targetY + marginMm;
  const cardWidth = QUADRANT_WIDTH_MM - marginMm * 2;
  const cardHeight = QUADRANT_HEIGHT_MM - marginMm * 2;

  // 1. Draw the pass card image into the single quadrant
  if (pngDataUrl) {
    const isJpeg = pngDataUrl.startsWith("data:image/jpeg");
    doc.addImage(
      pngDataUrl,
      isJpeg ? "JPEG" : "PNG",
      cardX,
      cardY,
      cardWidth,
      cardHeight,
      undefined,
      "FAST"
    );
  }

  // 2. Draw subtle dashed cutting / folding guidelines
  if (showCutGuides) {
    doc.setDrawColor(180, 185, 195); // Light slate/gray
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([3, 2], 0);

    // Vertical divider line (x = 105 mm)
    doc.line(QUADRANT_WIDTH_MM, 0, QUADRANT_WIDTH_MM, A4_HEIGHT_MM);

    // Horizontal divider line (y = 148.5 mm)
    doc.line(0, QUADRANT_HEIGHT_MM, A4_WIDTH_MM, QUADRANT_HEIGHT_MM);

    // Small corner crop / trim marks along sheet borders
    doc.setDrawColor(210, 215, 225);
    doc.setLineDashPattern([], 0); // Solid
    doc.setLineWidth(0.2);

    // Subtle guide text on empty quadrants
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(170, 175, 185);

    // Label on right quadrant
    if (quadrant === "top-left") {
      doc.text(
        "A4 Badge Sheet (4 Cards Layout) • Cut along dashed lines",
        QUADRANT_WIDTH_MM + 12,
        20
      );
    }
  }

  const blob = doc.output("blob");
  const dataUri = doc.output("datauristring");

  const download = (filename?: string) => {
    const cleanName = attendeeName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const safeFilename = filename || `ITS2026-Pass-A4-${cleanName}.pdf`;
    doc.save(safeFilename);
  };

  return {
    doc,
    blob,
    dataUri,
    download,
  };
}
