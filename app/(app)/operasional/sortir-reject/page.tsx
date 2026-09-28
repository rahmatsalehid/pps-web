import type { Metadata } from "next";
import { SortirRejectWorkspace } from "@/components/operasional/sortir-reject/sortir-reject-workspace";

export const metadata: Metadata = {
  title: "Sortir Reject — PPS",
};

export default function SortirRejectPage() {
  return <SortirRejectWorkspace />;
}
