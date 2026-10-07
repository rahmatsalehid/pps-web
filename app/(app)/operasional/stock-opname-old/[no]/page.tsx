import type { Metadata } from "next";
import { SoOldDetailWorkspace } from "@/components/operasional/stock-opname-old/so-old-detail-workspace";

export const metadata: Metadata = {
  title: "Detail Stock Opname (Old) — PPS",
};

export default async function StockOpnameOldDetailPage({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  const { no: raw } = await params;
  const noSO = decodeURIComponent(raw);

  return <SoOldDetailWorkspace noSO={noSO} />;
}
