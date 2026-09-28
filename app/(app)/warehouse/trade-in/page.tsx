import type { Metadata } from "next";
import { TradeInWorkspace } from "@/components/warehouse/trade-in/trade-in-workspace";

export const metadata: Metadata = {
  title: "Penerimaan Trade In — PPS",
};

export default function TradeInPage() {
  return <TradeInWorkspace />;
}
