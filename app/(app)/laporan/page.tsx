import type { Metadata } from "next";
import { LaporanHub } from "@/components/laporan/laporan-hub";

export const metadata: Metadata = {
  title: "Laporan — PPS",
};

export default function LaporanPage() {
  return <LaporanHub />;
}
