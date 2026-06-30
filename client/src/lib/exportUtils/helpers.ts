/**
 * 共用 helpers：CSV escaping、下載工具、題型標籤對照
 */

export const TYPE_LABELS: Record<string, string> = {
  single_choice: "單選題",
  picture_choice: "圖片選擇題",
  matching: "連線題",
  fill_blank: "填充題",
};

export function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCSVRows(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCSV).join(",")).join("\n");
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}