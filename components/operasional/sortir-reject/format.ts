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

/** Format angka id_ID (ribuan koma), membatasi maksimal [maxFrac] desimal. */
export function formatNum(value: number, maxFrac = 3): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("id-ID", {
    maximumFractionDigits: maxFrac,
  });
}

export function formatKg(value: number): string {
  return `${formatNum(value, 3)} kg`;
}

export function formatPcs(value: number): string {
  return `${Math.round(value).toLocaleString("id-ID")} pcs`;
}

/** "2025-01-15T00:00:00" → "15 Jan 2025" (tanpa bergantung timezone). */
export function formatTanggal(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const month = MONTHS_SHORT[parseInt(m[2], 10) - 1] ?? m[2];
    return `${parseInt(m[3], 10)} ${month} ${m[1]}`;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";
  const month = MONTHS_SHORT[d.getMonth()] ?? "";
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}
