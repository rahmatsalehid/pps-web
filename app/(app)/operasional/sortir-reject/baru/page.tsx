import type { Metadata } from "next";
import { SortirRejectCreateWorkspace } from "@/components/operasional/sortir-reject/sortir-reject-create-workspace";

export const metadata: Metadata = {
  title: "Buat Sortir Reject — PPS",
};

export default function SortirRejectCreatePage() {
  return <SortirRejectCreateWorkspace />;
}
