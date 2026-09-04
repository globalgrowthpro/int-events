/**
 * Utility for rendering high-resolution Pass Card badges onto an HTML Canvas and exporting as PNG.
 */

export interface PassCardRenderOptions {
  attendee_name: string;
  job_title?: string | null;
  company?: string | null;
  event_title?: string | null;
  template_src?: string;
}

/**
 * Canvas text wrapping helper
 */
export function drawCanvasWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = (text || "").split(" ");
  let line = "";
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

/**
 * Splits a full name into 1 or 2 lines based on width and character count.
 * If the name is short (<= 20 chars) and fits, returns 1 line.
 * If it exceeds width or has more than 20 chars, splits into 2 balanced lines.
 */
export function splitAttendeeName(
  ctx: CanvasRenderingContext2D,
  name: string,
  maxWidth: number
): string[] {
  const clean = (name || "Valued Guest").trim().replace(/\s+/g, " ").toUpperCase();
  const textWidth = ctx.measureText(clean).width;

  // Single line if short and fits comfortably
  if (clean.length <= 20 && textWidth <= maxWidth) {
    return [clean];
  }

  const words = clean.split(" ").filter(Boolean);
  if (words.length <= 1) {
    return [clean];
  }

  // Find the word boundary that yields the most balanced two lines
  let bestIndex = 1;
  let minDiff = Infinity;

  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(" ");
    const line2 = words.slice(i).join(" ");
    const w1 = ctx.measureText(line1).width;
    const w2 = ctx.measureText(line2).width;

    // Penalty if either line exceeds maxWidth
    const penalty = (w1 > maxWidth ? 1500 : 0) + (w2 > maxWidth ? 1500 : 0);
    const diff = Math.abs(w1 - w2) + penalty;

    if (diff < minDiff) {
      minDiff = diff;
      bestIndex = i;
    }
  }

  return [words.slice(0, bestIndex).join(" "), words.slice(bestIndex).join(" ")];
}

/**
 * Generates a high-resolution base64 PNG data URL of the Pass Card badge.
 */
export function generatePassCardPng(options: PassCardRenderOptions): Promise<string> {
  const {
    attendee_name,
    job_title = "Participant",
    company = "Integrated Technics",
    event_title = "INTEGRATED TECHNICS SHOWCASE EVENT ITS2026",
    template_src = "/2.png",
  } = options;

  const upperEventTitle = (event_title || "INTEGRATED TECHNICS SHOWCASE EVENT ITS2026").toUpperCase();

  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      return resolve("");
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${template_src}?v=${Date.now()}`;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width || 1200;
        canvas.height = img.height || 1697;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve("");

        // 1. Draw background template image (2.png)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;

        // 2. Draw DYNAMIC EVENT TITLE directly on the natural card background
        ctx.textAlign = "center";
        ctx.fillStyle = "#000000";
        const topFontSize =
          upperEventTitle.length > 35
            ? Math.round(canvas.width * 0.048)
            : Math.round(canvas.width * 0.056);
        ctx.font = `bold ${topFontSize}px Arial, sans-serif`;
        drawCanvasWrappedText(
          ctx,
          upperEventTitle,
          centerX,
          canvas.height * 0.125,
          canvas.width * 0.88,
          topFontSize * 1.25
        );

        // 3. Dynamic Attendee Info (Handles Long Names Wrapped into 2 Lines)
        const maxNameWidth = canvas.width * 0.78;
        let nameFontSize = Math.round(canvas.width * 0.062);
        ctx.font = `bold ${nameFontSize}px Arial, sans-serif`;

        let nameLines = splitAttendeeName(ctx, attendee_name, maxNameWidth);

        // If it requires 2 lines, adjust font size slightly so both lines fit comfortably
        if (nameLines.length > 1) {
          nameFontSize = Math.round(canvas.width * 0.052);
          ctx.font = `bold ${nameFontSize}px Arial, sans-serif`;
          nameLines = splitAttendeeName(ctx, attendee_name, maxNameWidth);

          // If still overflowing maxWidth, reduce font slightly until it fits nicely
          while (
            nameLines.some((l) => ctx.measureText(l).width > maxNameWidth) &&
            nameFontSize > 24
          ) {
            nameFontSize -= 2;
            ctx.font = `bold ${nameFontSize}px Arial, sans-serif`;
          }
        }

        ctx.fillStyle = "#111111";
        ctx.textAlign = "center";

        let jobTitleY = 0;

        if (nameLines.length === 1) {
          const centerY = canvas.height * 0.41;
          ctx.fillText(nameLines[0] || "", centerX, centerY);
          jobTitleY = centerY + canvas.height * 0.058;
        } else {
          // 2-line layout
          const lineSpacing = nameFontSize * 1.18;
          const startY = canvas.height * 0.38;
          ctx.fillText(nameLines[0] || "", centerX, startY);
          ctx.fillText(nameLines[1] || "", centerX, startY + lineSpacing);
          jobTitleY = startY + lineSpacing + canvas.height * 0.052;
        }

        // Position (Job Title)
        ctx.fillStyle = "#444444";
        const jobTitleFontSize = Math.round(canvas.width * 0.054);
        ctx.font = `bold ${jobTitleFontSize}px Arial, sans-serif`;
        ctx.fillText(job_title || "Participant", centerX, jobTitleY);

        // Organization (Bold Brand Orange Uppercase)
        ctx.fillStyle = "#f37021";
        const companyFontSize = Math.round(canvas.width * 0.056);
        ctx.font = `bold ${companyFontSize}px Arial, sans-serif`;
        ctx.fillText(
          (company || "Integrated Technics").toUpperCase(),
          centerX,
          jobTitleY + canvas.height * 0.058
        );

        // 4. Bottom Orange Footer Band (Dynamic Event Title)
        ctx.fillStyle = "#f37021";
        ctx.fillRect(0, canvas.height * 0.84, canvas.width, canvas.height * 0.16);

        ctx.fillStyle = "#ffffff";
        ctx.font = `italic 700 ${Math.round(canvas.width * 0.036)}px Georgia, serif, Arial`;
        drawCanvasWrappedText(
          ctx,
          event_title || "Integrated Technics Showcase Event",
          centerX,
          canvas.height * 0.892,
          canvas.width * 0.9,
          canvas.width * 0.044
        );

        ctx.font = `italic 800 ${Math.round(canvas.width * 0.04)}px Georgia, serif, Arial`;
        ctx.fillText("Full Access Ticket", centerX, canvas.height * 0.95);

        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch (err) {
        console.warn("Pass card canvas rendering error:", err);
        resolve("");
      }
    };

    img.onerror = () => {
      console.warn("Failed to load pass card template image:", template_src);
      resolve("");
    };
  });
}
