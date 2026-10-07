import type { SoOldRow } from "@/services/stock-opname-service";

const MONTHS_EN_TO_ID: Record<string, string> = {
  Jan: "Jan",
  Feb: "Feb",
  Mar: "Mar",
  Apr: "Apr",
  May: "Mei",
  Jun: "Jun",
  Jul: "Jul",
  Aug: "Agu",
  Sep: "Sep",
  Oct: "Okt",
  Nov: "Nov",
  Dec: "Des",
};

export const SO_OLD_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "bahanbaku", label: "Bahan Baku" },
  { value: "washing", label: "Washing" },
  { value: "broker", label: "Broker" },
  { value: "crusher", label: "Crusher" },
  { value: "bonggolan", label: "Bonggolan" },
  { value: "gilingan", label: "Gilingan" },
  { value: "mixer", label: "Mixer" },
  { value: "furniturewip", label: "Furniture WIP" },
  { value: "barangjadi", label: "Barang Jadi" },
  { value: "reject", label: "Reject" },
];

export function soOldFormatTanggal(raw: string): string {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(raw.trim());
  if (!m) return raw;
  const month = MONTHS_EN_TO_ID[m[2][0].toUpperCase() + m[2].slice(1).toLowerCase()];
  return `${m[1]} ${month ?? m[2]} ${m[3]}`;
}

export function soOldLokasiLabel(
  blok: string | null,
  idLokasi: number | null,
): string {
  const b = (blok ?? "").trim();
  if (!b && idLokasi == null) return "-";
  if (b && idLokasi != null) return `${b}${idLokasi}`;
  if (b) return b;
  return idLokasi != null ? String(idLokasi) : "-";
}

export function soOldLokasiHeader(
  blok: string | null,
  idLokasi: number | null,
): string {
  const isAllBlok = !blok || blok === "all";
  const isAllId = idLokasi == null || idLokasi === 0;
  if (isAllBlok && isAllId) return "SEMUA LOKASI";
  if (!isAllBlok && !isAllId) return `${blok!.toUpperCase()}${idLokasi!}`;
  if (!isAllBlok) return blok!.toUpperCase();
  return String(idLokasi).toUpperCase();
}

export function soOldActiveCats(row: SoOldRow): string[] {
  return [
    ...(row.isBahanBaku ? ["Bahan Baku"] : []),
    ...(row.isWashing ? ["Washing"] : []),
    ...(row.isBonggolan ? ["Bonggolan"] : []),
    ...(row.isCrusher ? ["Crusher"] : []),
    ...(row.isBroker ? ["Broker"] : []),
    ...(row.isGilingan ? ["Gilingan"] : []),
    ...(row.isMixer ? ["Mixer"] : []),
    ...(row.isFurnitureWIP ? ["Furniture WIP"] : []),
    ...(row.isBarangJadi ? ["Barang Jadi"] : []),
    ...(row.isReject ? ["Reject"] : []),
  ];
}

export function soOldTypeName(nomorLabel: string): string {
  const kode = nomorLabel.split(".")[0]?.toUpperCase() ?? "";
  switch (kode) {
    case "A":
      return "Bahan Baku";
    case "B":
      return "Washing";
    case "D":
      return "Broker";
    case "F":
      return "Crusher";
    case "M":
      return "Bonggolan";
    case "V":
      return "Gilingan";
    case "H":
      return "Mixer";
    case "BB":
      return "Furniture WIP";
    case "BA":
      return "Barang Jadi";
    case "BF":
      return "Reject";
    default:
      return "Unknown";
  }
}

export function soOldFormatQty(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "0";
  if (value === Math.trunc(value)) return String(Math.trunc(value));
  let text = value.toFixed(2);
  text = text.replace(/0+$/, "");
  text = text.replace(/\.$/, "");
  return text;
}

export function soOldFormatBerat(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

export function soOldShortDate(raw: string | null | undefined): string {
  if (!raw) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  if (!m) return raw;
  return `${parseInt(m[3], 10)}/${parseInt(m[2], 10)}/${m[1]}`;
}
