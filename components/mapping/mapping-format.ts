export function formatCellNum(val: number): string {
  if (Number.isInteger(val)) return String(val);
  return val.toFixed(1);
}

export function lokasiUomText(
  namaUOM: string,
  totalBerat: number,
  totalQty: number,
  suffix: string,
): string | null {
  const uom = namaUOM.toUpperCase();
  if (uom === "KG" || totalBerat > 0) {
    return `${formatCellNum(totalBerat)}${suffix}`;
  }
  if (uom === "PCS" || totalQty > 0) {
    return `${totalQty}${suffix}`;
  }
  return null;
}
