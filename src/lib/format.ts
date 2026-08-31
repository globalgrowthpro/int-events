export function toDdMmYyyy(iso: string): string {
  if (!iso) return "";
  const clean = iso.includes("T") ? iso.split("T")[0]! : iso;
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0]!.length === 4) {
      // yyyy-mm-dd -> dd-mm-yyyy
      return `${parts[2]!.padStart(2, "0")}-${parts[1]!.padStart(2, "0")}-${parts[0]}`;
    }
    if (parts[2]!.length === 4) {
      // dd-mm-yyyy
      return `${parts[0]!.padStart(2, "0")}-${parts[1]!.padStart(2, "0")}-${parts[2]}`;
    }
  }
  try {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {}
  return iso;
}
