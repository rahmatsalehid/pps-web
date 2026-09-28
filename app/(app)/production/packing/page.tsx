import type { Metadata } from "next";
import { PackingWorkspace } from "@/components/production/packing/packing-workspace";

export const metadata: Metadata = {
  title: "Proses Packing — PPS",
};

export default function PackingPage() {
  return <PackingWorkspace />;
}
