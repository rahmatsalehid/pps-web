import type { Metadata } from "next";
import { PbpWorkspace } from "@/components/bahan-pendukung/penerimaan/pbp-workspace";

export const metadata: Metadata = {
  title: "Penerimaan Bahan Pendukung — PPS",
};

export default function PenerimaanBahanPendukungPage() {
  return <PbpWorkspace />;
}
