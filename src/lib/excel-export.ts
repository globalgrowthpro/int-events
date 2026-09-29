import * as XLSX from "xlsx";
import { toast } from "sonner";

/**
 * Universal Excel (.xlsx) exporter for INT Events admin pages
 *
 * @param data Array of flat objects representing rows
 * @param filenamePrefix Prefix for the output .xlsx file (e.g. "INT_Registrations")
 * @param sheetName Name of the primary worksheet (default: "Data")
 */
export function exportToExcel(
  data: Record<string, any>[],
  filenamePrefix: string,
  sheetName: string = "Data"
): boolean {
  if (!data || data.length === 0) {
    toast.error("No data available to export.");
    return false;
  }

  try {
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-fit column widths based on headers and sample content
    const sample = data.slice(0, 100);
    const keys = Object.keys(data[0] || {});
    ws["!cols"] = keys.map((key) => {
      let maxLen = key.length;
      for (const row of sample) {
        const val = row[key];
        if (val !== undefined && val !== null) {
          const strLen = String(val).length;
          if (strLen > maxLen) maxLen = strLen;
        }
      }
      return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${filenamePrefix}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast.success(`Exported ${data.length} records to Excel (${fileName})`);
    return true;
  } catch (error) {
    console.error("Export to Excel failed:", error);
    toast.error("Failed to export Excel file.");
    return false;
  }
}
