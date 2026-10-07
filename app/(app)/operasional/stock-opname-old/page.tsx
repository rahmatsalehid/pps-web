import type { Metadata } from "next";
import { SoOldListWorkspace } from "@/components/operasional/stock-opname-old/so-old-list-workspace";

export const metadata: Metadata = {
  title: "Stock Opname (Old) — PPS",
};

export default function StockOpnameOldPage() {
  return <SoOldListWorkspace />;
}
