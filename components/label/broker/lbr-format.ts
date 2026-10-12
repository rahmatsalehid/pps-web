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

export function fmtBerat(n: number | null | undefined): string {
  if (n == null) return "-";
  const s = n.toFixed(2);
  return s.endsWith(".00") ? s.slice(0, -3) : s;
}

export function fmtQc(n: number | null | undefined, digits = 2): string {
  if (n == null) return "-";
  return n.toFixed(digits);
}

export function formatBlokLokasi(
  blok: string | null | undefined,
  idLokasi: string | null | undefined,
): string {
  const hasBlok = blok != null && blok.trim() !== "";
  const hasLokasi = idLokasi != null && idLokasi.trim() !== "";
  if (!hasBlok && !hasLokasi) return "-";
  return `${blok ?? ""}${idLokasi ?? ""}`;
}

export function isDateUsageFilled(v: string | null | undefined): boolean {
  const s = (v ?? "").trim();
  if (!s) return false;
  return s.toLowerCase() !== "null";
}

export function toYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fromYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
