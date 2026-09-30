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

export function stockKg(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

export function stockPcs(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(Math.round(value));
}

export function stockAmountText(value: number, unit: "kg" | "pcs"): string {
  return unit === "kg" ? `${stockKg(value)} kg` : `${stockPcs(value)} PCS`;
}

export function stockLabelCount(count: number): string {
  return `${count} Label`;
}

export function stockFormatDate(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return "-";
  const month = MONTHS_SHORT[parseInt(m[2], 10) - 1] ?? m[2];
  return `${parseInt(m[3], 10)} ${month} ${m[1]}`;
}
