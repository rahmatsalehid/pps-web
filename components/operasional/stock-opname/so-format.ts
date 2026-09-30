import type { SoStatus } from "@/services/stock-opname-v2-service";

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

const MONTHS_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const SO_STATUS_META: Record<
  SoStatus,
  { label: string; color: string }
> = {
  not_started: { label: "Belum Mulai", color: "#6B7280" },
  in_progress: { label: "Sedang Berjalan", color: "#1E6FD9" },
  completed: { label: "Selesai", color: "#0A7349" },
};

export function soFormatQty(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value === Math.trunc(value)) return String(Math.trunc(value));
  let text = value.toFixed(2);
  text = text.replace(/0+$/, "");
  text = text.replace(/\.$/, "");
  return text;
}

export function soMonthName(month: number): string {
  return MONTHS_LONG[month - 1] ?? String(month);
}

export function soWeightUnit(categoryCode: string): "kg" | "pcs" {
  return categoryCode === "furniturewip" ? "pcs" : "kg";
}

export function soQtyText(
  raw: unknown,
  unit: "kg" | "pcs",
): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return `${soFormatQty(raw)} ${unit}`;
  return `${String(raw)} ${unit}`;
}

export function soFormatDate(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const month = MONTHS_SHORT[parseInt(m[2], 10) - 1] ?? m[2];
  return `${parseInt(m[3], 10)} ${month} ${m[1]}`;
}

export function soFormatDateTime(
  raw: string | null | undefined,
): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(s);
  if (!m) return soFormatDate(s);
  const date = soFormatDate(s);
  if (!date) return null;
  return `${date}, ${m[4]}:${m[5]}`;
}
