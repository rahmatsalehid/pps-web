import type { Metadata } from "next";
import { CrusherWorkspace } from "@/components/production/crusher/crusher-workspace";

export const metadata: Metadata = {
  title: "Proses Crusher — PPS",
};

export default function CrusherPage() {
  return <CrusherWorkspace />;
}
