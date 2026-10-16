const fmtNum = (n: number): string => {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.00$/, "");
};

export function fmtPcs(n: number | null | undefined): string {
  if (n == null) return "-";
  return fmtNum(n);
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
