import type { Metadata } from "next";
import { StampingWorkspace } from "@/components/production/stamping/stamping-workspace";

export const metadata: Metadata = {
  title: "Proses Stamping — PPS",
};

export default function StampingPage() {
  return <StampingWorkspace />;
}
