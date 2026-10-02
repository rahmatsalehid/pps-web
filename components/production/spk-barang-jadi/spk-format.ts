export type SpkStatus =
  | "STOCK HABIS"
  | "PERLU PRODUKSI"
  | "MENDEKATI MINIMUM"
  | "STOCK AMAN";

export type SpkStatusMeta = { label: string; color: string };

export const SPK_STATUS_META: Record<SpkStatus, SpkStatusMeta> = {
  "STOCK HABIS": { label: "Stock Habis", color: "#DC2626" },
  "PERLU PRODUKSI": { label: "Perlu Produksi", color: "#1E6FD9" },
  "MENDEKATI MINIMUM": { label: "Mendekati Minimum", color: "#B45309" },
  "STOCK AMAN": { label: "Stock Aman", color: "#0A7349" },
};

export const SPK_STATUS_FALLBACK: SpkStatusMeta = {
  label: "-",
  color: "#9CA3AF",
};

export function spkStatusMeta(status: string): SpkStatusMeta {
  return (
    SPK_STATUS_META[status as SpkStatus] ?? {
      label: status || SPK_STATUS_FALLBACK.label,
      color: SPK_STATUS_FALLBACK.color,
    }
  );
}

export const SPK_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Semua Status" },
  { value: "PERLU PRODUKSI", label: "Perlu Produksi" },
  { value: "STOCK HABIS", label: "Stock Habis" },
  { value: "MENDEKATI MINIMUM", label: "Mendekati Minimum" },
  { value: "STOCK AMAN", label: "Stock Aman" },
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function spkFormatNumber(value: number): string {
  if (!Number.isFinite(value)) return "-";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

export function spkFormatDate(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  const month = MONTHS_SHORT[parseInt(m[2], 10) - 1] ?? m[2];
  return `${parseInt(m[3], 10)} ${month} ${m[1]}`;
}

export function spkIsMpqMultiple(qty: number, mpq: number): boolean {
  if (!(mpq > 0)) return true;
  if (!Number.isFinite(qty)) return false;
  const remainder = qty % mpq;
  return Math.abs(remainder) < 1e-9 || Math.abs(remainder - mpq) < 1e-9;
}
