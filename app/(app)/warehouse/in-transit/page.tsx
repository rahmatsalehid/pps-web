import type { Metadata } from "next";
import { InTransitWorkspace } from "@/components/warehouse/in-transit/in-transit-workspace";

export const metadata: Metadata = {
  title: "In Transit — PPS",
};

export default function InTransitPage() {
  return <InTransitWorkspace />;
}
