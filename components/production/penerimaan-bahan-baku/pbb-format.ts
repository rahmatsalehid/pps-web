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

/** Parse "YYYY-MM-DD" / ISO menjadi Date lokal (tanpa geser timezone). */
function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Selisih hari (hari ini - tanggal), 0 = hari ini, >0 = sudah lewat. */
function daysSince(raw: string | null): number | null {
  const d = parseDate(raw);
  if (!d) return null;
  const now = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - start.getTime()) / 86_400_000);
}

/** "2025-01-15" → "15 Jan 2025" */
export function formatTanggalShort(raw: string | null): string {
  const d = parseDate(raw);
  if (!d) return "-";
  const month = MONTHS_SHORT[d.getMonth()] ?? "";
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

/** yyyy-mm-dd tanggal hari ini. */
export function todayISO(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

/** Qty ala tablet `_fmtKg`: 2 desimal, trailing ".00" dibuang. */
export function fmtQty(v: number): string {
  const s = v.toFixed(2);
  return s.endsWith(".00") ? s.slice(0, s.length - 3) : s;
}

export type PbbCardStatus = "active" | "pending" | "inactive";

/** Ala `_statusOf`: tanggal null → inactive, hari ini → active, lewat → pending. */
export function pbbCardStatusOf(tgl: string | null): PbbCardStatus {
  const diff = daysSince(tgl);
  if (diff == null) return "inactive";
  return diff <= 0 ? "active" : "pending";
}

/** "Hari ini" / "sudah N hari" */
export function pbbDaysText(tgl: string | null): string | null {
  const diff = daysSince(tgl);
  if (diff == null) return null;
  return diff <= 0 ? "Hari ini" : `sudah ${diff} hari`;
}

/** Warna band baris riwayat: complete / current / pending. */
export function pbbRowStatus(
  isComplete: boolean,
  tgl: string | null,
): "complete" | "current" | "pending" {
  if (isComplete) return "complete";
  const diff = daysSince(tgl);
  if (diff == null) return "current";
  return diff <= 0 ? "current" : "pending";
}
