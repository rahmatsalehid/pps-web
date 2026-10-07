import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LAPORAN_REGISTRY } from "@/components/laporan/laporan-catalog";
import { LaporanViewer } from "@/components/laporan/laporan-viewer";

export const metadata: Metadata = {
  title: "Detail Laporan — PPS",
};

export default async function LaporanDetailPage({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  const spec = LAPORAN_REGISTRY[kode];
  if (!spec) notFound();

  return <LaporanViewer spec={spec} />;
}
