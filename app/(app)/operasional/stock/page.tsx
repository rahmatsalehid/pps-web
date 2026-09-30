import type { Metadata } from "next";
import { StockWorkspace } from "@/components/operasional/stock/stock-workspace";

export const metadata: Metadata = {
  title: "Stock — PPS",
};

export default function StockPage() {
  return <StockWorkspace />;
}
