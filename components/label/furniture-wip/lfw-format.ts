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

export function fmtTanggalPanjang(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function fmtBerat(n: number | null | undefined): string {
  if (n == null) return "-";
  const s = n.toFixed(2);
  return s.endsWith(".00") ? s.slice(0, -3) : s;
}

export function fmtPcs(n: number | null | undefined): string {
  if (n == null) return "-";
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, "");
}

export function formatBlokLokasi(
  blok: string | null | undefined,
  idLokasi: string | number | null | undefined,
): string {
  const blokS = blok == null ? "" : String(blok).trim();
  const lokasiS = idLokasi == null ? "" : String(idLokasi).trim();
  if (!blokS && !lokasiS) return "-";
  return `${blokS}${lokasiS}`;
}

/** "YYYY-MM-DD" untuk input date / body API. */
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

/** Prefix nomor sumber berdasarkan OutputCode / OutputType dari list. */
export function sourceLabel(outputType: string | null, outputCode: string | null): string {
  const t = (outputType ?? "").toUpperCase();
  if (t === "HOTSTAMPING") return "Hot Stamping";
  if (t === "PASANG_KUNCI") return "Pasang Kunci";
  if (t === "BONGKAR_SUSUN") return "Bongkar Susun";
  if (t === "RETUR") return "Retur BJ";
  if (t === "SPANNER") return "Spanner";
  if (t === "INJECT") return "Inject";
  return (outputCode ?? "").trim() || "-";
}
