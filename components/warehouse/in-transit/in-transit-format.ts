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

export type ItStatusMeta = { label: string; color: string };

export const IT_STATUS_META: Record<string, ItStatusMeta> = {
  RECEIVED: { label: "Diterima", color: "#4CAF50" },
  SHIPPED: { label: "Siap Terima", color: "#1E6FD9" },
  PARTIAL: { label: "Sebagian", color: "#F59E0B" },
};

export const IT_STATUS_FALLBACK: ItStatusMeta = {
  label: "Belum Diisi",
  color: "#9CA3AF",
};

export function itStatusMeta(fulfillStatus: string): ItStatusMeta {
  return IT_STATUS_META[fulfillStatus] ?? IT_STATUS_FALLBACK;
}

export function itReceivedCount(
  scanCount: number,
  inTransitCount: number,
): number {
  return Math.min(Math.max(scanCount - inTransitCount, 0), scanCount);
}

export function itFormatDate(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  const month = MONTHS_SHORT[parseInt(m[2], 10) - 1] ?? m[2];
  return `${parseInt(m[3], 10)} ${month} ${m[1]}`;
}

export function itKategoriPrefix(kodeKategori: string): string {
  return kodeKategori === "furniturewip" ? "BB" : "BA";
}

export function itLokasiLabel(blok: string, idLokasi: number | null): string {
  if (!blok || idLokasi == null) return "";
  return `${blok}${idLokasi}`;
}
