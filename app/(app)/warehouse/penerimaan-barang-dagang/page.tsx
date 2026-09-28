import type { Metadata } from "next";
import { PbdWorkspace } from "@/components/warehouse/penerimaan-barang-dagang/pbd-workspace";

export const metadata: Metadata = {
  title: "Penerimaan Barang Dagang — PPS",
};

export default function PenerimaanBarangDagangPage() {
  return <PbdWorkspace />;
}
