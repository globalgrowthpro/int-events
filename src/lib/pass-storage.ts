import { supabase } from "@/lib/supabase";

export interface UploadPassPdfOptions {
  eventId?: string | undefined;
  registrationId?: string | undefined;
  attendeeName?: string | undefined;
}

/**
 * Uploads an A4 Pass Card PDF to Supabase Storage (bucket: 'pass-cards')
 * and returns the public download URL.
 * Also persists the URL to the registrations table if registrationId is provided.
 */
export async function uploadPassCardPdf(
  input: Blob | string,
  opts: UploadPassPdfOptions = {}
): Promise<string | null> {
  try {
    let blob: Blob;
    if (typeof input === "string") {
      const rawBase64 = input.includes("base64,") ? input.split("base64,")[1] : input;
      const binary = atob(rawBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: "application/pdf" });
    } else {
      blob = input;
    }

    const safeName = (opts.attendeeName || "Attendee").replace(/[^a-zA-Z0-9_-]/g, "_");
    const eventFolder = (opts.eventId || "general").replace(/[^a-zA-Z0-9_-]/g, "_");
    const regFolder = (opts.registrationId || "reg").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = `${eventFolder}/${regFolder}/${safeName}_Pass_A4.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("pass-cards")
      .upload(filePath, blob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.warn("[PassStorage] Upload failed:", uploadError);
      return null;
    }

    const { data } = supabase.storage.from("pass-cards").getPublicUrl(filePath);
    const publicUrl = data?.publicUrl;

    if (publicUrl && opts.registrationId) {
      try {
        await (supabase
          .from("registrations") as any)
          .update({ pass_pdf_url: publicUrl })
          .eq("id", opts.registrationId);
      } catch (dbErr) {
        console.warn("[PassStorage] Could not update registration row:", dbErr);
      }
    }

    return publicUrl || null;
  } catch (err) {
    console.error("[PassStorage] Unexpected error during PDF upload:", err);
    return null;
  }
}
