import type { Metadata } from "next";
import { BrokerWorkspace } from "@/components/production/broker/broker-workspace";

export const metadata: Metadata = {
  title: "Proses Broker — PPS",
};

export default function BrokerPage() {
  return <BrokerWorkspace />;
}
