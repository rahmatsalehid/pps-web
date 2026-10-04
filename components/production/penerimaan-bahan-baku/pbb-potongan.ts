import type { PbbPotongan } from "@/services/penerimaan-bahan-baku-service";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const fmt = (n: number) =>
  n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Berat tersimpan = berat timbangan × (1 − potongan%), seperti form VB. */
export function applyPotongan(beratAct: number, rule: PbbPotongan): number {
  let percent: number;
  if (rule.mode === "tetap") {
    percent = rule.percent;
  } else {
    const lower = Math.min(rule.lower, rule.upper);
    const upper = Math.max(rule.lower, rule.upper);
    percent = (Math.floor(Math.random() * (upper - lower + 1)) + lower) / 10;
  }
  return round2(beratAct * (1 - percent / 100));
}
