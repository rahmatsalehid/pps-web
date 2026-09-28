import type { Metadata } from "next";
import { InjectWorkspace } from "@/components/production/inject/inject-workspace";

export const metadata: Metadata = {
  title: "Proses Inject — PPS",
};

export default function InjectPage() {
  return <InjectWorkspace />;
}
