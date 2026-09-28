import type { Metadata } from "next";
import { WashingWorkspace } from "@/components/production/washing/washing-workspace";

export const metadata: Metadata = {
  title: "Proses Washing — PPS",
};

export default function WashingPage() {
  return <WashingWorkspace />;
}
