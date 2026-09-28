import type { Metadata } from "next";
import { PasangKunciWorkspace } from "@/components/production/pasang-kunci/pasang-kunci-workspace";

export const metadata: Metadata = {
  title: "Proses Pasang Kunci — PPS",
};

export default function PasangKunciPage() {
  return <PasangKunciWorkspace />;
}
