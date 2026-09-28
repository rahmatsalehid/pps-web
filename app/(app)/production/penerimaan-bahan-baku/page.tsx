import type { Metadata } from "next";
import { PbbWorkspace } from "@/components/production/penerimaan-bahan-baku/pbb-workspace";

export const metadata: Metadata = {
  title: "Penerimaan Bahan Baku • PPS",
};

export default function PenerimaanBahanBakuPage() {
  return <PbbWorkspace />;
}
