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

export function fmtTanggal(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** 12.00 → "12", 12.50 → "12.50" (gaya ringkasan tablet). */
export function fmtKgShort(n: number): string {
  const s = n.toFixed(2);
  return s.endsWith(".00") ? s.slice(0, -3) : s;
}

export function fmtKg(n: number): string {
  return n.toFixed(2);
}

export function isTrue(v: boolean | number | null | undefined): boolean {
  return v === true || v === 1;
}

export function isDetailUsed(dateUsage: string | null | undefined): boolean {
  return dateUsage != null && dateUsage !== "";
}
