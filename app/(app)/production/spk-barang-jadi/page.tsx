import type { Metadata } from "next";
import { SpkWorkspace } from "@/components/production/spk-barang-jadi/spk-workspace";

export const metadata: Metadata = {
  title: "SPK Produksi Barang Jadi — PPS",
};

export default function SpkBarangJadiPage() {
  return <SpkWorkspace />;
}
